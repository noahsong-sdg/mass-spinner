"""Actual TS current solver versus finite-energy cylindrical Bessel solution.

Run only in safe-dev. No coupled production solver or fitted reference is used.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import numpy as np
from scipy.special import ive
from bridge import Bridge

HERE = Path(__file__).resolve().parent
MESHES = (6, 12, 24, 48, 96)
PROFILE = 'sin(pi*z/L)'


def control(manifest, n):
    radius, length, voltage = [manifest[k] for k in ('radiusM', 'lengthM', 'outerVoltageV')]
    sigma_r, sigma_z = manifest['sigmaPerpSM'], manifest['sigmaParallelSM']
    s = np.linspace(0., 1., n+1)
    r, z = radius*np.sin(np.pi*s/2), length*(1-np.cos(np.pi*s))/2
    rc, zc = np.sqrt((r[:-1]**2+r[1:]**2)/2), (z[:-1]+z[1:])/2
    outer = voltage*np.sin(np.pi*zc/length)
    setup = dict(radialEdgesM=r.tolist(), axialEdgesM=z.tolist(),
        sigmaPerpSM=[sigma_r]*n*n, sigmaParallelSM=[sigma_z]*n*n,
        magneticT=0., innerVoltageV=[None]*n, outerVoltageV=outer.tolist(),
        lowerVoltageV=[0.]*n, upperVoltageV=[0.]*n)
    with Bridge(setup) as bridge:
        actual = bridge.current(np.zeros(n*n))
    wave = math.pi/length
    radial_wave = wave*math.sqrt(sigma_z/sigma_r)
    # Scaled Bessel functions avoid overflow without changing the exact ratio.
    radial = ive(0, radial_wave*rc)/ive(0, radial_wave*radius)*np.exp(radial_wave*(rc-radius))
    exact = (voltage*np.sin(wave*zc)[:, None]*radial[None, :]).ravel()
    exact_power = math.pi*radius*length*sigma_r*voltage**2*radial_wave*ive(1, radial_wave*radius)/ive(0, radial_wave*radius)
    volume = (math.pi*np.diff(z)[:, None]*np.diff(r*r)[None, :]).ravel()
    potential = np.asarray(actual['potentialV'])
    field_error = math.sqrt(float(volume@((potential-exact)**2))/float(volume@(exact*exact)))
    power_error = float(abs(actual['jouleW']-exact_power)/abs(exact_power))
    if not np.all(np.isfinite([field_error, power_error, exact_power, *potential])):
        raise ArithmeticError('Nonfinite static current result')
    power_residual = actual['electrodePowerW']-actual['jouleW']
    if abs(power_residual) > 1e-10*abs(exact_power) or max(abs(v) for v in actual['torqueNm']) != 0:
        raise ArithmeticError('B=0 static control power or torque identity failed')
    return dict(n=n, relativePotentialRms=field_error, relativePowerError=power_error,
                exactPowerW=float(exact_power), actual=actual, exactPotentialV=exact.tolist(), setup=setup)


def run(manifest):
    if manifest.get('outerVoltageProfile') != PROFILE:
        raise ValueError('Static qualification requires the declared continuous sine boundary')
    levels, failures = [], []
    for n in MESHES:
        try:
            levels.append(control(manifest, n))
        except Exception as error:
            failures.append(dict(n=n, error=repr(error)))
    gates = []
    if len(levels) == len(MESHES):
        for metric in ('relativePotentialRms', 'relativePowerError'):
            errors = [level[metric] for level in levels]
            monotone = max(errors) < .002 or all(b <= a+1e-12 for a, b in zip(errors, errors[1:]))
            gates.extend([dict(name=metric+':finest', value=errors[-1], passed=errors[-1] < .005),
                          dict(name=metric+':decreasing', values=errors, passed=monotone)])
    root = HERE.parents[1]
    files = [HERE/'static_current.py', HERE/'manifest.json', HERE/'bridge.py', HERE/'bridge.ts', root/'src/fuel-current.ts']
    return dict(boundaryProfile=PROFILE, manifest=manifest, meshes=list(MESHES), levels=levels, failures=failures,
                gates=gates, passed=not failures and bool(gates) and all(g['passed'] for g in gates),
                sourceHashes={str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files},
                experimentalQualified=False, liveQualified=False)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = run(json.loads((HERE/'manifest.json').read_text()))
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(json.dumps({'passed': result['passed'], 'gates': result['gates'], 'failures': result['failures']}))
    raise SystemExit(0 if result['passed'] else 1)
