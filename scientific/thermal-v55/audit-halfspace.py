"""Compare constant-property radial runs with the independent planar half-space.

Prospective absolute gates allow backward-Euler time truncation and the
explicit planar/short-time approximation. They are separate from the tighter
successive-refinement gates and from solver balance gates. Safe-dev only.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import numpy as np
from halfspace import response, self_checks

GATES = {'gasK': .1, 'surfaceK': .002, 'powerW': 100.,
         'exchangeJ': 1e-4, 'cellCenterWallK': .002}


def audit(path):
    record = json.loads(path.read_text())
    c, initial = record['config'], record['initial']
    assert record['study']['constantPropertyBenchmark'] is True
    material = c['material']
    assert c['coolingWK'] == 0 and c['gasWallWK'] > 0
    assert record['stepsUniform']['gasEnergyJ'] == record['stepsUniform']['linerEnergyJ'] == 0
    tau = c['gasCapacityJK']/c['gasWallWK']
    alpha = material['kWMK']/(material['densityKgM3']*material['cpJKgK'])
    edges = np.asarray(c['radiusEdgesM'])
    depths = np.sqrt(edges[:-1]*edges[1:])-c['radiusM']
    window = [tau/64, 5*tau]
    penetration = math.sqrt(alpha*window[1])
    assert penetration/c['radiusM'] < 1e-3
    assert c['thicknessM']/penetration > 20
    assert abs(record['study']['durationS']-window[1]) < 1e-18
    maximum = dict.fromkeys(GATES, 0.)
    checked = 0
    for sample in record['samples']:
        time = sample['timeS']
        if time == 0:
            assert sample['initialContinuumRightLimit'] is True
            exact = response(c, initial, 0.)
            assert sample['gasK'] == exact['gasK'] and sample['innerSurfaceK'] == exact['surfaceK']
            assert sample['interfacePowerW'] == exact['gasToWallW']
            continue
        assert window[0]*(1-1e-12) <= time <= window[1]*(1+1e-12)
        exact = response(c, initial, time, depths)
        errors = {'gasK': abs(sample['gasK']-exact['gasK']),
                  'surfaceK': abs(sample['innerSurfaceK']-exact['surfaceK']),
                  'powerW': abs(sample['interfacePowerW']-exact['gasToWallW']),
                  'exchangeJ': abs(sample['cumulativeGasExchangeJ']-exact['gasToWallEnergyJ']),
                  'cellCenterWallK': float(np.max(np.abs(np.asarray(sample['wallK'])-exact['wallK'])))}
        for key, error in errors.items():
            maximum[key] = max(maximum[key], error)
            assert error <= GATES[key], (record['name'], time/tau, key, error, GATES[key])
        checked += 1
    assert checked >= 12
    return {'name': record['name'], 'allPass': True, 'checkedSamples': checked,
            'windowS': window, 'maximumAbsoluteDifference': maximum,
            'planarSmallParameter': penetration/c['radiusM'],
            'thicknessToPenetrationRatio': c['thicknessM']/penetration,
            'runSHA256': hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('runs', type=Path, nargs='+')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = {'allPass': True, 'selfChecks': self_checks(),
              'absoluteGates': GATES, 'cases': [audit(path) for path in args.runs],
              'scope': 'Constant-property planar half-space continuum response; finite cylindrical curvature is small but not zero. No nonlinear-tungsten or gas-spatial calibration claim.',
              'scriptSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'analyticSHA256': hashlib.sha256(Path(__file__).with_name('halfspace.py').read_bytes()).hexdigest()}
    args.output.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
