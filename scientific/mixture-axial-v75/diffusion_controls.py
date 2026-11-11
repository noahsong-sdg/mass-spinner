"""Frozen diffusion-only analytical controls; run only inside safe-dev.

These authored controls are not an independently implemented PDE solver.
Identical tagged species isolate Fick diffusion; binary rotating equilibrium
tests the consistency of pressure barodiffusion, without a second body drift.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import numpy as np
from flow import Flow, KB
from controls import rotating_initial
import diffusion

U, RADIUS, LENGTH, TIME = 1.66053906892e-27, .06, .14, 4e-4
MESHES = (6, 12, 24, 48, 96)


def model(n, masses):
    return Flow(np.linspace(0., RADIUS, n+1), np.linspace(0., LENGTH, n+1), masses)


def tagged(n):
    flow = model(n, [40*U, 40*U])
    k = math.pi/LENGTH
    z, dz = (flow.z[:-1]+flow.z[1:])/2, np.diff(flow.z)
    cosine = np.cos(k*z)*np.sinc(k*dz/(2*math.pi))
    initial = flow.state(.001, 350., .5+.1*cosine[:, None], 0.)
    q, elapsed, steps = initial.copy(), 0., 0
    while elapsed < TIME:
        dt = min(diffusion.stable_dt(flow, q, cfl=.2), TIME-elapsed)
        q = diffusion.advance(flow, q, dt)
        elapsed += dt
        steps += 1
    pressure = .001*KB*350./(40*U)
    d = float(diffusion.argon_diffusivity(350., pressure))
    exact = .5+.1*cosine[:, None]*math.exp(-d*k*k*TIME)
    error = flow.primitive(q)['massFraction']-exact
    rms = float(np.sqrt(np.sum(flow.volume*error**2)/np.sum(flow.volume))/.1)
    before, after = initial.sum(axis=(1, 2)), q.sum(axis=(1, 2))
    ledger = {name: float(abs(after[i]-before[i])/max(abs(before[i]), 1e-300))
              for name, i in (('mass', 0), ('angularMomentum', 3), ('energy', 4), ('speciesMass', 5))}
    return dict(n=n, steps=steps, diffusivityM2S=d, normalizedRms=rms, relativeLedgerResidual=ledger)


def rotating(n):
    flow = model(n, [36*U, 40*U])
    q = rotating_initial(flow)
    p = flow.primitive(q)
    derivative = diffusion.rate(flow, q)
    mean_rho = float(q[0].sum()/flow.volume.sum())
    axis_pressure = KB*350.*(.0004/(36*U)+.0006/(40*U))
    d = float(diffusion.argon_diffusivity(350., axis_pressure))
    # A density-rate norm avoids an artificially vanishing cell-mass norm
    # as the grid is refined. The reference is a physical diffusion timescale.
    residual = float(np.max(abs(derivative[5]/flow.volume))/(mean_rho*d/RADIUS**2))
    stopped = flow.state(p['densityKgM3'], p['temperatureK'], p['massFraction'], 0.)
    radial, axial = diffusion.fluxes(flow, q)
    sr, sz = diffusion.fluxes(flow, stopped)
    radial_flux_density = abs(radial[0, :, 1:]-sr[0, :, 1:])/flow.radial_area[:, 1:]
    axial_flux_density = abs(axial[0]-sz[0])/flow.axial_area
    reference = mean_rho*d/min(np.diff(flow.r).min(), np.diff(flow.z).min())
    invariance = float(max(radial_flux_density.max(), axial_flux_density.max())/reference)
    return dict(n=n, normalizedMaxSpeciesDensityRate=residual,
                rotationInvariantNormalizedFlux=invariance, diffusivityAxisM2S=d)


def run():
    result = dict(schemaVersion=1, meshes=list(MESHES), timeS=TIME,
                  tagged=[tagged(n) for n in MESHES], rotating=[rotating(n) for n in MESHES],
                  experimentalQualified=False, liveQualified=False)
    gates = []
    for series, field, limit in (('tagged', 'normalizedRms', .02),
                                  ('rotating', 'normalizedMaxSpeciesDensityRate', .05)):
        values = [row[field] for row in result[series]]
        decreasing = max(values) < .002 or all(b <= a+1e-12 for a, b in zip(values, values[1:]))
        gates.extend([dict(name=series+':finest', passed=values[-1] < limit, value=values[-1]),
                      dict(name=series+':decreasing', passed=decreasing, values=values)])
    for row in result['tagged']:
        gates.append(dict(name=f'tagged:{row["n"]}:closedLedgers',
                          passed=max(row['relativeLedgerResidual'].values()) < 1e-10))
    for row in result['rotating']:
        gates.append(dict(name=f'rotating:{row["n"]}:noExtraRotationForce',
                          passed=bool(row['rotationInvariantNormalizedFlux'] < 512*np.finfo(float).eps)))
    result.update(gates=gates, passed=all(g['passed'] for g in gates))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = run()
    here = Path(__file__).resolve().parent
    result['sourceHashes'] = {name: hashlib.sha256((here/name).read_bytes()).hexdigest()
                              for name in ('diffusion_controls.py', 'diffusion.py', 'flow.py', 'controls.py')}
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(json.dumps(dict(passed=result['passed'], gates=result['gates'])))
    raise SystemExit(0 if result['passed'] else 1)
