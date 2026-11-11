"""Frozen analytical Euler controls; execute only inside safe-dev.

Linear acoustic errors include the O(epsilon) linearization discrepancy.
Rotating equilibrium is a continuum control, not a discrete well-balanced
claim. No physical coefficient or gate is adjusted after seeing results.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import numpy as np
from flow import Flow, KB, GAMMA

U = 1.66053906892e-27
MASSES = [36*U, 40*U]
MESHES = (6, 12, 24, 48, 96)
RADIUS, LENGTH, TIME, EPSILON = .06, .14, 40e-6, 1e-5
# Temperature rise if wall-speed rotational energy per particle became heat.
# Fixed across meshes; not the 350 K background or a measured heat load.
ROTATIONAL_T_SCALE = max(1., (900*RADIUS)**2/(3*KB*(.4/MASSES[0]+.6/MASSES[1])))


def model(n):
    return Flow(np.linspace(0, RADIUS, n+1), np.linspace(0, LENGTH, n+1), MASSES)


def rms(flow, values):
    return float(np.sqrt(np.sum(flow.volume*values**2)/np.sum(flow.volume)))


def acoustic_initial(flow):
    rho0, t0, y = .001, 350., .4
    sound = math.sqrt(GAMMA*KB*t0*(y/MASSES[0]+(1-y)/MASSES[1]))
    p0 = rho0*sound**2/GAMMA
    k = math.pi/LENGTH
    z = (flow.z[:-1]+flow.z[1:])/2
    factor = np.sinc(k*np.diff(flow.z)/(2*math.pi))
    cosine, sine = factor*np.cos(k*z), factor*np.sin(k*z)
    rho = rho0*(1+EPSILON/GAMMA*cosine[:, None])
    pressure = p0*(1+EPSILON*cosine[:, None])
    temperature = pressure/(rho*KB*(y/MASSES[0]+(1-y)/MASSES[1]))
    q = flow.state(rho, temperature, y, 0.)
    return q, dict(rho0=rho0, p0=p0, sound=sound, k=k, cosine=cosine, sine=sine)


def rotating_initial(flow):
    t, omega = 350., 900.
    beta = np.array(MASSES)*omega**2/(2*KB*t)
    area_coordinate = np.diff(flow.r**2)
    partial = np.array([rho*np.exp(b*flow.r[:-1]**2)*np.expm1(b*area_coordinate)/(b*area_coordinate)
                        for rho, b in zip((.0004, .0006), beta)])
    rho = partial.sum(axis=0)
    return flow.state(rho, t, partial[0]/rho, omega)


def evolve(flow, initial, time=TIME):
    q, elapsed, steps = initial.copy(), 0., 0
    while elapsed < time:
        dt = min(flow.stable_dt(q, cfl=.2), time-elapsed)
        q = flow.advance(q, dt)
        elapsed += dt
        steps += 1
    before, after = initial.sum(axis=(1, 2)), q.sum(axis=(1, 2))
    ledgers = {name: float(abs(after[i]-before[i])/max(abs(before[i]), 1e-300))
               for name, i in (('mass', 0), ('angularMomentum', 3), ('energy', 4), ('speciesMass', 5))}
    return q, steps, ledgers


def acoustic(n):
    flow = model(n)
    initial, exact = acoustic_initial(flow)
    q, steps, ledger = evolve(flow, initial)
    p = flow.primitive(q)
    phase = exact['sound']*exact['k']*TIME
    rho = exact['rho0']*(1+EPSILON/GAMMA*exact['cosine'][:, None]*math.cos(phase))
    pressure = exact['p0']*(1+EPSILON*exact['cosine'][:, None]*math.cos(phase))
    amplitude = EPSILON*exact['p0']/(exact['rho0']*exact['sound'])
    velocity = amplitude*exact['sine'][:, None]*math.sin(phase)
    errors = dict(density=rms(flow, p['densityKgM3']-rho)/(EPSILON*exact['rho0']/GAMMA),
                  pressure=rms(flow, p['pressurePa']-pressure)/(EPSILON*exact['p0']),
                  axialVelocity=rms(flow, p['vzMPS']-velocity)/amplitude)
    return dict(n=n, steps=steps, normalizedRms=errors, relativeLedgerResidual=ledger)


def rotating(n):
    flow = model(n)
    initial = rotating_initial(flow)
    q, steps, ledger = evolve(flow, initial)
    before, after = flow.primitive(initial), flow.primitive(q)
    errors = dict(density=rms(flow, after['densityKgM3']-before['densityKgM3'])/.001,
                  radialVelocity=rms(flow, after['vrMPS'])/(900*RADIUS),
                  temperature=rms(flow, after['temperatureK']-350)/ROTATIONAL_T_SCALE,
                  angularSpeed=rms(flow, after['omegaRadS']-900)/900)
    return dict(n=n, steps=steps, normalizedRms=errors, relativeLedgerResidual=ledger)


def run():
    result = dict(schemaVersion=1, timeS=TIME, epsilon=EPSILON, meshes=list(MESHES),
                  rotatingTemperatureScaleK=ROTATIONAL_T_SCALE,
                  acoustic=[acoustic(n) for n in MESHES], rotating=[rotating(n) for n in MESHES],
                  experimentalQualified=False, liveQualified=False)
    gates = []
    for name, fields, limit in (('acoustic', ('density', 'pressure', 'axialVelocity'), .05),
                                 ('rotating', ('density', 'radialVelocity', 'temperature', 'angularSpeed'), .02)):
        for field in fields:
            values = [row['normalizedRms'][field] for row in result[name]]
            decreasing = max(values) < .002 or all(b <= a+1e-12 for a, b in zip(values, values[1:]))
            gates.extend([dict(name=f'{name}:{field}:finest', passed=values[-1] < limit, value=values[-1]),
                          dict(name=f'{name}:{field}:decreasing', passed=decreasing, values=values)])
        for row in result[name]:
            gates.append(dict(name=f'{name}:{row["n"]}:closedLedgers',
                              passed=max(row['relativeLedgerResidual'].values()) < 1e-10))
    result.update(gates=gates, passed=all(g['passed'] for g in gates))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = run()
    here = Path(__file__).resolve().parent
    result['sourceHashes'] = {name: hashlib.sha256((here/name).read_bytes()).hexdigest()
                              for name in ('controls.py', 'flow.py')}
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(json.dumps(dict(passed=result['passed'], gates=result['gates'])))
    raise SystemExit(0 if result['passed'] else 1)
