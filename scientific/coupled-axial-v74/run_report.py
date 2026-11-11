"""Frozen-manifest coupled trajectories and raw, reproducible refinement evidence."""
import argparse
import hashlib
import json
from pathlib import Path
import time
import numpy as np
from bridge import Bridge
from thermal import Thermal
from coupled import Stepper
from independent_check import check_case

HERE = Path(__file__).resolve().parent


def setup(manifest, n, nz=None):
    if manifest['outerVoltageProfile'] != 'sin(pi*z/L)':
        raise ValueError('This verification study requires the compatible sinusoidal voltage boundary')
    nz = n if nz is None else nz
    s = np.linspace(0., 1., n+1)
    r = manifest['radiusM']*np.sin(np.pi*s/2)
    z = manifest['lengthM']*(1-np.cos(np.pi*np.linspace(0., 1., nz+1)))/2
    wall = np.linspace(r[-1], r[-1]+manifest['linerThicknessM'], max(2, n//3)+1)
    electrical = dict(radialEdgesM=r.tolist(), axialEdgesM=z.tolist(),
        sigmaPerpSM=[manifest['sigmaPerpSM']]*n*nz, sigmaParallelSM=[manifest['sigmaParallelSM']]*n*nz,
        magneticT=manifest['magneticT'], innerVoltageV=[None]*nz,
        outerVoltageV=(manifest['outerVoltageV']*np.sin(np.pi*(z[:-1]+z[1:])/(2*z[-1]))).tolist(),
        lowerVoltageV=[0.]*n, upperVoltageV=[0.]*n)
    return dict(r=r.tolist(), z=z.tolist(), wall=wall.tolist(), rho=[manifest['densityKgM3']]*n*nz,
        electrical=electrical, walls=dict(outer=0., lower=0., upper=0.),
        contactH=manifest['contactH'], coolingH=manifest['coolingH'], bathK=manifest['bathK'])


def trajectory(manifest, n, nt, tight=False, nz=None):
    nz = n if nz is None else nz
    if isinstance(nt, bool) or not isinstance(nt, int) or nt < 1:
        raise ValueError('Need a positive integer timestep count')
    dt = max(manifest['timesS'])/nt
    scheduled = {round(tout/dt): tout for tout in manifest['timesS']}
    if any(tout <= 0 or abs(tout/dt-round(tout/dt)) > 64*np.finfo(float).eps*nt
           for tout in manifest['timesS']) or len(scheduled) != len(manifest['timesS']):
        raise ValueError('Every scheduled physical output time must lie on a distinct timestep')
    c = setup(manifest, n, nz)
    start = time.monotonic()
    with Bridge(c['electrical']) as bridge:
        thermal = Thermal(c['r'], c['z'], c['wall'], c['rho'], bridge,
            contact_h=c['contactH'], cooling_h=c['coolingH'], bath_k=c['bathK'],
            nonlinear_rtol=1e-11 if tight is True or tight == 'thermal' else 1e-9)
        advance = Stepper(thermal, bridge, c['walls'])
        t = np.full(thermal.count, float(manifest['initialGasK']))
        t[thermal.solid_indices] = manifest['initialLinerK']
        w = np.full(n*nz, float(manifest['initialOmegaRadS']))
        cases, checks, max_score, max_energy, sums = [], [], 0., 0., dict(electrodeJ=0., bathJ=0., numericalLossJ=0.)
        for index in range(1, nt+1):
            result = advance.step(t, w, dt, rtol=2e-12 if tight is True or tight == 'linear' else 2e-11)
            max_score = max(max_score, result['residualScore'])
            max_energy = max(max_energy, abs(result['totalEnergyResidualJ']))
            sums['electrodeJ'] += dt*result['mechanical']['current']['electrodePowerW']
            sums['bathJ'] += dt*result['bathOutW']
            sums['numericalLossJ'] += result['mechanical']['numericalLossJ']
            result.pop('payload')
            new_t = np.array(result['temperatureK'])
            props = thermal.properties(new_t)
            case = dict(setup=c, oldTemperatureK=t.tolist(), oldOmegaRadS=w.tolist(),
                initialGasK=manifest['initialGasK'], initialLinerK=manifest['initialLinerK'],
                dtS=dt, timeS=index*dt, props=props, oldProps=thermal.properties(t), result=result)
            try:
                metrics = check_case(case)
            except Exception:
                failure = HERE/f'failed-{n}-{nz}-{nt}-{tight}-{index}.json'
                failure.write_text(json.dumps(case, default=serial, allow_nan=False, indent=2)+'\n')
                raise
            checks.append(dict(step=index, timeS=index*dt, metrics=metrics))
            if index in scheduled:
                _, links, _ = thermal.coefficients(props)
                gas_set, solid_set = set(thermal.gas_indices), set(thermal.solid_indices)
                case['interfaceIntoGasW'] = sum(g*(new_t[b]-new_t[a]) for a, b, g in links if a in gas_set and b in solid_set)
                case['timeS'] = scheduled[index]
                cases.append(case)
                print(f'n={n} nz={nz} nt={nt} tight={tight} t={scheduled[index]} iter={result["iterations"]}', flush=True)
            t, w = np.asarray(result['temperatureK']), np.asarray(result['mechanical']['omegaRadS'])
        return dict(n=n, nz=nz, nt=nt, tight=tight, cases=cases, independentStepChecks=checks, maxResidualScore=max_score,
                    maxEnergyResidualJ=max_energy, integrals=sums, wallSeconds=time.monotonic()-start)


def serial(value):
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        return value.item()
    raise TypeError(type(value).__name__)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--only', help='nr:nz:nt or nr:nz:nt:tight for incremental raw runs')
    args = parser.parse_args()
    manifest = json.loads((HERE/'manifest.json').read_text())
    requests = {(n, n, nt, False) for series in ('joint', 'spatial', 'temporal') for n, nt in manifest[series]}
    requests.update((*level, False) for series in ('radial', 'axial') for level in manifest[series])
    requests.update((*manifest[key], False) for key in ('referenceSmallerDt', 'referenceSpatial'))
    n, nt = manifest['tighterTolerance']
    requests.update((n, n, nt, mode) for mode in [True, *manifest['independentTolerances']])
    if args.only:
        raw = args.only.split(':')
        if len(raw) not in (3, 4) or len(raw) == 4 and raw[3] not in ('tight', 'linear', 'thermal'):
            parser.error('--only requires nr:nz:nt[:tight|linear|thermal]')
        mode = False if len(raw) == 3 else True if raw[3] == 'tight' else raw[3]
        requests = {(int(raw[0]), int(raw[1]), int(raw[2]), mode)}
    report = dict(manifest=manifest, cases=[], failures=[], sourceHashes={
        f.name: hashlib.sha256(f.read_bytes()).hexdigest()
        for f in HERE.iterdir() if f.suffix in ('.py', '.ts', '.md', '.json')})
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # Exercise the previously failing fine-grid precision before cheaper cases.
    for n, nz, nt, tight in sorted(requests, key=lambda v: (*v[:3], str(v[3])), reverse=True):
        try:
            report['cases'].append(trajectory(manifest, n, nt, tight, nz))
        except Exception as error:
            report['failures'].append(dict(n=n, nz=nz, nt=nt, tight=tight, error=repr(error)))
            print(f'FAILED n={n} nz={nz} nt={nt}: {error!r}', flush=True)
        args.output.write_text(json.dumps(report, default=serial, allow_nan=False, indent=2)+'\n')
    if report['failures']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
