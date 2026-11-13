"""Bounded graded-grid coupled release; no measured velocity input."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import time
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
for folder in ('mixture-axial-v75', 'electrical-v82', 'meridional-v86'):
    sys.path.insert(0, str(HERE.parent / folder))
from flow import Flow
from transport82 import profile
from diffusion86 import Diffusion, M_AR
from electro86 import Electro

BASELINE = 'f328e73864378179280f14495fa0963613b9954ddce576dabe91c052f4ea6d74'
TIMES = (0., 1e-6, 2e-6, 4e-6)
JOBS = ((1, .1), (2, .1), (4, .1), (2, .2), (2, .05))
SOURCE_FILES = ('coupled-v99/campaign99.py', 'coupled-v99/PROTOCOL.md',
    'mixture-axial-v75/flow.py', 'meridional-v86/diffusion86.py',
    'meridional-v86/electro86.py', 'electrical-v82/transport82.py',
    'flow-v81/transport.py', 'flow-v81/argon-viscosity-source.json',
    'boundary-v84/results/predictions.json')


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def sources():
    return {'scientific/' + name: sha((HERE.parent / name).read_bytes()) for name in SOURCE_FILES}


def mesh(n):
    if type(n) is not int or n not in (1, 2, 4):
        raise ValueError('Declared refinement is 1, 2 or 4')
    def edges(cuts, counts):
        return np.r_[np.concatenate([np.linspace(a, b, count*n, endpoint=False)
            for a, b, count in zip(cuts[:-1], cuts[1:], counts)]), cuts[-1]]
    return edges([0., .004, .056, .06], [4, 8, 4]), edges([0., .06, .08, .232, .24], [4, 4, 12, 4])


def step_size(flow, q, cfl, remaining, cap=1e-7):
    if isinstance(cfl, (bool, np.bool_)) or not np.isfinite(cfl) or not 0 < cfl <= .2:
        raise ValueError('Actual acoustic CFL must lie in (0,.2]')
    unit = flow.stable_dt(q, .5)/.5
    return min(cap, remaining, cfl*unit), unit


def initialize(scenario, manifest, n):
    r, z = mesh(n)
    f = Flow(r, z, [M_AR, M_AR])
    c = profile(scenario['shape'], f.mean_r, scenario['electronTemperatureEV'],
                scenario['partition'], scenario['leadingWeakIonization'])
    diffusion = Diffusion(f, manifest['viscosityPaS'])
    electro = Electro(f, c['pedersenSM'], c['hallSM'], c['sigmaParallelSM'],
        manifest['magneticT'], manifest['branchCurrentA'], manifest['cathodeRadiusM'], .07, manifest['anodeWidthM'])
    omega, _ = electro.steady_torsion(diffusion)
    q = f.state(M_AR*(c['neutralDensityM3']+c['impliedElectronDensityM3']), c['heavyTemperatureK'], .5, omega)
    return f, diffusion, electro, q


def evolve(scenario, manifest, n, cfl):
    f, diffusion, electro, q = initialize(scenario, manifest, n)
    initial = q.sum(axis=(1, 2)); snapshots, history = [], []
    elapsed = electrical = external_angular = wall_angular = hydro_angular = 0.
    cathode_moment = sum(p['amp']*f.mean_r[p['cell'] % f.nr]**2
                          for p in electro.ports if p['kind'] == 'cathode')
    torque = .5*electro.B*(electro.current*f.r[-1]**2-cathode_moment)
    disk_torque = .5*electro.B*electro.current*(f.r[-1]**2-manifest['cathodeRadiusM']**2/2)
    wall_dofs = np.intersect1d(diffusion.velocity.nodal_dofs[2], diffusion.fixed)
    for target in TIMES:
        while elapsed < target:
            dt, unit = step_size(f, q, cfl, target-elapsed)
            angular_before = float(q[3].sum())
            q, _ = f.advance_with_receipt(q, dt)
            hydro_angular += float(q[3].sum())-angular_before
            q, em = electro.advance(q, dt)
            q, viscous = diffusion.advance(q, dt)
            wall_angular += dt*float((diffusion.stiffness@viscous['velocityTrace'])[wall_dofs].sum())
            external_angular += dt*torque
            electrical += em['externalWorkJ']
            elapsed += dt
            p = f.primitive(q); total = q.sum(axis=(1, 2))
            escale = max(abs(total[4]-initial[4]), abs(electrical), initial[4])
            lscale = max(abs(initial[3]), abs(external_angular), abs(wall_angular), np.finfo(float).tiny)
            history.append(dict(timeS=float(elapsed), dtS=float(dt), unitCflStableDtS=float(unit), cflBound=cfl,
                massRelativeDrift=float(abs(total[0]-initial[0])/initial[0]),
                speciesRelativeDrift=float(abs(total[5]-initial[5])/initial[5]),
                energyRelativeDefect=float(abs(total[4]-initial[4]-electrical)/escale),
                angularRelativeDefect=float(abs(total[3]-initial[3]-external_angular-wall_angular)/lscale),
                externalAngularImpulseKgM2S=external_angular, wallAngularImpulseKgM2S=wall_angular,
                hydroAngularDefectKgM2S=hydro_angular, chargeRelativeResidual=em['chargeResidualA']/abs(electro.current),
                electricalWorkJ=electrical, ohmicJ=float(sum(em['jouleByCellJ'])),
                emNumericalHeatJ=float(sum(em['BEdefectByCellJ'])),
                viscousHeatJ=float(np.sum(viscous['viscousHeatJ'])),
                viscousNumericalHeatJ=float(np.sum(viscous['numericalHeatJ'])),
                maximumTemperatureK=float(p['temperatureK'].max()), minimumTemperatureK=float(p['temperatureK'].min()),
                maximumTotalMach=float(np.max(np.sqrt(p['vrMPS']**2+p['vzMPS']**2+f.mean_r2*p['omegaRadS']**2)/p['soundMPS']))))
        p = f.primitive(q)
        snapshots.append(dict(timeS=target, q=q.tolist(), **{k:v.tolist() for k,v in p.items()}))
        print('CLOCK', n, cfl, target, len(history), float(p['temperatureK'].max()), flush=True)
    return dict(radialEdgesM=f.r.tolist(), axialEdgesM=f.z.tolist(), snapshots=snapshots, history=history,
        cfl=cfl, discreteTorqueNm=torque, continuumDiskTorqueNm=disk_torque,
        relativeTorqueFootprintError=abs(torque-disk_torque)/abs(disk_torque),
        conditionalRelease=True, thermalSteadyState=False, experimentalQualification=False,
        prescribedCurrent=True, absoluteCurrentPrediction=False)


def main():
    directory = Path(sys.argv[1]); directory.mkdir(parents=True, exist_ok=False)
    baseline = (HERE.parent/'boundary-v84/results/predictions.json').read_bytes()
    if sha(baseline) != BASELINE:
        raise ValueError('Frozen baseline changed')
    old = json.loads(baseline); scenario = old['scenarios'][0]
    output = dict(manifest=old['manifest'], scenario=scenario, timesS=TIMES, sourceSHA256=sources(),
        baselinePredictionSHA256=BASELINE, targetVelocityRead=False, currentFitted=False, velocityFitted=False,
        conditionalRelease=True, experimentalQualification=False, cases=[])
    (directory/'fields').mkdir()
    for n, cfl in JOBS:
        label = f'n{n}-cfl{cfl:g}'; started = time.monotonic()
        row = dict(label=label, refinement=n, nr=16*n, nz=24*n, cfl=cfl, maxDtS=1e-7, anodeCenterM=.07)
        print('START', label, flush=True)
        try:
            state = evolve(scenario, old['manifest'], n, cfl)
            payload = json.dumps(state, separators=(',', ':'), allow_nan=False).encode()
            packed = gzip.compress(payload, mtime=0); name = 'fields/'+label+'.json.gz'
            (directory/name).write_bytes(packed)
            row.update(completed=True, stepCount=len(state['history']),
                maximumTemperatureK=max(h['maximumTemperatureK'] for h in state['history']),
                fieldPacket=dict(path=name, sha256=sha(packed), rawSHA256=sha(payload)))
        except (ValueError, ArithmeticError) as exc:
            row.update(completed=False, error=type(exc).__name__+': '+str(exc))
        output['cases'].append(row)
        (directory/'predictions.json').write_text(json.dumps(output, indent=2, allow_nan=False)+'\n')
        print('END', label, row.get('stepCount', row.get('error')), round(time.monotonic()-started, 2), flush=True)
    if sources() != output['sourceSHA256']:
        raise ValueError('Producer inputs changed during execution')
    print('SEALED', sha((directory/'predictions.json').read_bytes()), flush=True)


if __name__ == '__main__':
    main()
