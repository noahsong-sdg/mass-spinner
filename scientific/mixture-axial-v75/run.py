"""Frozen-manifest coupled mixture study. Execute only inside safe-dev."""
import argparse
import hashlib
import json
import platform
from importlib.metadata import version
from pathlib import Path
import time
import traceback
import numpy as np
from flow import Flow
from coupling import Coupled
from independent import check_hydro, check_diffusion, check_magnetic
from mixcheck import check_source

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
U = 1.66053906892e-27


def serial(value):
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        return value.item()
    raise TypeError(type(value).__name__)


def hashes():
    files = [*HERE.glob('*.py'), HERE/'manifest.json', HERE/'PROTOCOL.md', HERE/'requirements.txt',
             ROOT/'package.json', ROOT/'package-lock.json']
    files += [HERE.parent/'coupled-axial-v74'/name for name in
              ('bridge.py', 'bridge.ts', 'coupled.py', 'thermal.py', 'independent_check.py')]
    files += [HERE.parent/'axial-v73/torsion.py']
    files += [ROOT/'src'/name for name in ('fuel-current.ts', 'fuel-neutral-transport.ts', 'fuel-thermal.ts', 'fuel-momentum.ts')]
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}


def initial_integrals(flow, m, order=12):
    """Project the continuum fields, including full kinetic energy, onto cells."""
    nodes, weights = np.polynomial.legendre.leggauss(order)
    r, z = flow.r, flow.z
    rp = (r[:-1, None]+r[1:, None]+np.diff(r)[:, None]*nodes)/2
    zp = (z[:-1, None]+z[1:, None]+np.diff(z)[:, None]*nodes)/2
    rr, zz = rp[None, :, None, :]/r[-1], zp[:, None, :, None]/z[-1]
    dv = (np.pi/2*np.diff(z)[:, None, None, None]*np.diff(r)[None, :, None, None]
          *rp[None, :, None, :]*weights[None, None, :, None]*weights[None, None, None, :])
    pattern = np.cos(np.pi*rr)*np.cos(np.pi*zz)
    rho, y = m['densityKgM3']*(1+.04*pattern), .5+.06*pattern
    temperature = m['initialGasK']+2*np.cos(np.pi*zz)*(1-rr*rr)
    omega = m['initialOmegaRadS']*(1-rr*rr)*np.sin(np.pi*zz)**2
    ur, uz = 2*np.sin(np.pi*rr)*np.cos(np.pi*zz), np.cos(np.pi*rr)*np.sin(np.pi*zz)
    internal = 1.5*1.380649e-23*rho*temperature*(y/flow.masses[0]+(1-y)/flow.masses[1])
    fields = (rho, rho*ur, rho*uz, rho*omega*(rr*r[-1])**2,
              internal+.5*rho*(ur*ur+uz*uz+(rr*r[-1]*omega)**2), rho*y)
    return np.array([np.sum(dv*v, axis=(-2, -1)) for v in fields])


def configuration(m, nr, nz):
    r, z = np.linspace(0, m['radiusM'], nr+1), np.linspace(0, m['lengthM'], nz+1)
    if m.get('radialBeta', 0):
        beta = m['radialBeta']
        r = r[-1]*(1+np.tanh(beta*(2*r/r[-1]-1))/np.tanh(beta))/2
    if m.get('axialBeta', 0):
        beta = m['axialBeta']
        z = z[-1]*(1+np.tanh(beta*(2*z/z[-1]-1))/np.tanh(beta))/2
    wall = np.linspace(r[-1], r[-1]+m['linerThicknessM'], max(2, nr//3)+1)
    flow = Flow(r, z, np.asarray(m['massesU'])*U)
    c = dict(r=r.tolist(), z=z.tolist(), wall=wall.tolist(), masses=flow.masses.tolist(),
             contactH=m['contactH'], coolingH=m['coolingH'], bathK=m['bathK'],
             walls=dict(outer=0., lower=0., upper=0.))
    c['electrical'] = dict(radialEdgesM=r.tolist(), axialEdgesM=z.tolist(),
        sigmaPerpSM=[m['sigmaPerpSM']]*nr*nz, sigmaParallelSM=[m['sigmaParallelSM']]*nr*nz,
        magneticT=m['magneticT'], innerVoltageV=[None]*nz,
        outerVoltageV=(m['outerVoltageV']*np.sin(np.pi*(z[:-1]+z[1:])/(2*z[-1]))).tolist(),
        lowerVoltageV=[0.]*nr, upperVoltageV=[0.]*nr)
    q = initial_integrals(flow, m)
    return flow, c, q, np.full((len(wall)-1)*nz, float(m['initialLinerK']))


def endpoint(flow, setup, q, wall, source, time_s):
    p = flow.primitive(q)
    current, mechanical = source['mechanical']['current'], source['mechanical']
    rr, zz = np.meshgrid(flow.mean_r, (flow.z[:-1]+flow.z[1:])/2)
    obs = dict(currentA=sum(abs(v) for v in current['boundaryCurrentsA'])/2,
        jouleW=current['jouleW'], shearW=mechanical['shearHeatW'], gasPeakK=float(p['temperatureK'].max()),
        wallPeakK=float(np.max(wall)), meridionalKineticJ=float(np.sum(.5*(q[1]**2+q[2]**2)/q[0])),
        lightRadialMomentM=float(np.sum(q[5]*rr)/np.sum(q[5])),
        heavyRadialMomentM=float(np.sum((q[0]-q[5])*rr)/np.sum(q[0]-q[5])),
        lightAxialMomentM=float(np.sum(q[5]*zz)/np.sum(q[5])),
        heavyAxialMomentM=float(np.sum((q[0]-q[5])*zz)/np.sum(q[0]-q[5])))
    obs.update({'torque_'+key: value for key, value in mechanical['boundaryTorqueNm'].items()})
    # Azimuthal current is local and divergence-free, additional to r/z solve.
    sigma = np.asarray(setup['electrical']['sigmaPerpSM']).reshape(flow.nz, flow.nr)
    obs['radialMotionalJouleW'] = float(np.sum(sigma*setup['electrical']['magneticT']**2*p['vrMPS']**2*flow.volume))
    return dict(timeS=time_s, q=q, solidK=wall.copy(), observables=obs)


def trajectory(m, nr, nz, nt, mode='base'):
    dt = max(m['timesS'])/nt
    scheduled = {round(t/dt): t for t in m['timesS']}
    if len(scheduled) != len(m['timesS']) or any(abs(t/dt-round(t/dt)) > 64*np.finfo(float).eps*nt for t in m['timesS']):
        raise ValueError('Output physical times must align with steps')
    flow, c, q, wall = configuration(m, nr, nz)
    first_q, first_wall = q.copy(), wall.copy()
    checks, cases = [], []
    totals = dict(electrodeJ=0., wallWorkJ=0., bathJ=0., numericalLossJ=0., radialMotionalJouleJ=0.)
    start = time.monotonic()
    with Coupled(flow, c['wall'], c['electrical'], q, c['contactH'], c['coolingH'], c['bathK'],
                 walls=c['walls'], thermal_rtol=1e-11 if mode in ('thermal', 'both') else 1e-9,
                 linear_rtol=2e-12 if mode in ('linear', 'both') else 2e-11) as model:
        for index in range(1, nt+1):
            step_checks, transport_audits = {}, []
            def audit(kind, old, new, step_dt, *extra):
                if kind == 'hydro':
                    metrics = check_hydro(c, old, new, step_dt)
                elif kind == 'diffusion':
                    metrics = check_diffusion(c, old, new, step_dt)
                elif kind == 'magnetic':
                    metrics = check_magnetic(c, old, new, step_dt, *extra)
                else:
                    metrics = check_source(c, old, new, step_dt, *extra)
                if kind in ('hydro', 'diffusion'):
                    transport_audits.append(dict(kind=kind, dtS=step_dt, metrics=metrics))
                step_checks[kind] = metrics
            try:
                q, wall, result = model.step(q, wall, dt, audit=audit,
                    transport_cfl=.15 if mode == 'transport' else .3)
            except Exception:
                (HERE/f'failed-{nr}-{nz}-{nt}-{mode}-{index}.json').write_text(
                    json.dumps(dict(setup=c, q=q, wall=wall, dtS=dt, step=index, checks=step_checks,
                                    traceback=traceback.format_exc()), default=serial, indent=2, allow_nan=False)+'\n')
                raise
            checks.append(dict(step=index, timeS=index*dt, checks=step_checks, transportAudits=transport_audits))
            for key in ('electrodeJ', 'wallWorkJ', 'bathJ', 'numericalLossJ'):
                totals[key] += step_checks['source'][key]
            totals['radialMotionalJouleJ'] += result['magnetic']['jouleJ']
            if index in scheduled:
                cases.append(endpoint(flow, c, q, wall, result['source'], scheduled[index]))
                print(f'{nr}x{nz}/{nt} {mode} t={scheduled[index]:g} iter={result["source"]["iterations"]}', flush=True)
    return dict(nr=nr, nz=nz, nt=nt, mode=mode, setup=c, initialQ=first_q,
                initialSolidK=first_wall, cases=cases, stepChecks=checks, integrals=totals,
                wallSeconds=time.monotonic()-start)


def requests(m):
    result = {(*v, 'base') for series in ('joint', 'spatial', 'temporal', 'radial', 'axial') for v in m[series]}
    result.update((*m[key], 'base') for key in ('referenceSmallerDt', 'referenceSpatial'))
    result.update((*m['tighterTolerance'], mode) for mode in m['independentTolerances'])
    if 'referenceTransportCfl' in m:
        result.add((*m['referenceTransportCfl'], 'transport'))
    return sorted(result, key=lambda row: (row[0]*row[1], row[2], row[3]))


def admit_checkpoint(saved, expected):
    if (any(saved[k] != expected[k] for k in ('manifest', 'sourceHashes', 'preRunRuntime'))
            or saved['failures']):
        raise ValueError('Checkpoint source, manifest, runtime or failure mismatch')
    keys = [(t['nr'], t['nz'], t['nt'], t['mode']) for t in saved['cases']]
    if len(keys) != len(set(keys)) or not set(keys) <= set(requests(expected['manifest'])):
        raise ValueError('Checkpoint duplicate or unexpected trajectory')
    return keys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--only', help='nr:nz:nt[:base|linear|thermal|both] pilot')
    parser.add_argument('--resume', action='store_true', help='Continue an identical source/manifest checkpoint')
    args = parser.parse_args()
    m = json.loads((HERE/'manifest.json').read_text())
    runs = requests(m)
    if args.only:
        parts = args.only.split(':')
        runs = [(*map(int, parts[:3]), parts[3] if len(parts) == 4 else 'base')]
    report = dict(manifest=m, sourceHashes=hashes(), cases=[], failures=[],
                  preRunRuntime=dict(python=platform.python_version(), numpy=version('numpy'),
                                     scipy=version('scipy'), fipy=version('fipy')),
                  experimentalQualified=False, liveQualified=False)
    if args.resume:
        saved = json.loads(args.output.read_text())
        keys = admit_checkpoint(saved, report)
        report = saved
        runs = [key for key in runs if key not in keys]
    for nr, nz, nt, mode in runs:
        try:
            report['cases'].append(trajectory(m, nr, nz, nt, mode))
        except Exception as error:
            report['failures'].append(dict(nr=nr, nz=nz, nt=nt, mode=mode, error=repr(error)))
            print(f'FAILED {nr}x{nz}/{nt} {mode}: {error!r}', flush=True)
        args.output.write_text(json.dumps(report, default=serial, indent=2, allow_nan=False)+'\n')
    return 1 if report['failures'] else 0


if __name__ == '__main__':
    raise SystemExit(main())
