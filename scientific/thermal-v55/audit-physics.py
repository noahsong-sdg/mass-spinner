"""Independent all-state heat/entropy audit on explicit annular meshes.

No FiPy or production module is imported. Run in safe-dev:
audit-physics.py RUN.json [RUN.json ...] --output AUDIT.json
Each run identifies its compressed actual-FiPy states and zero-source steps.
"""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import numpy as np

MOLAR = .18384
A, B, C, D, E = 23.95930, .002639680, .000001257750, -.000000000254642, -48407.


def hchange(new, old, material):
    if material:
        return material['cpJKgK']*(new-old)
    return (new-old)*(A+B*(new+old)/2+C*(new*new+new*old+old*old)/3
                      +D*(new**3+new*new*old+new*old*old+old**3)/4+E/(new*old))/MOLAR


def schange(new, old, material):
    if material:
        return material['cpJKgK']*np.log1p((new-old)/old)
    d = new-old
    return (A*np.log1p(d/old)+B*d+C*d*(new+old)/2
            +D*d*(new*new+new*old+old*old)/3+E*d*(new+old)/(2*new*new*old*old))/MOLAR


def cp(t, material):
    return np.full_like(t, material['cpJKgK']) if material else (A+B*t+C*t*t+D*t**3+E/(t*t))/MOLAR


def audit(path):
    record = json.loads(path.read_text())
    c, material = record['config'], record['config'].get('material')
    edges = (np.asarray(c['radiusEdgesM'], dtype=float) if 'radiusEdgesM' in c
             else np.linspace(c['radiusM'], c['radiusM']+c['thicknessM'], c['cells']+1))
    assert len(edges) == c['cells']+1 and np.all(np.diff(edges) > 0)
    assert abs(edges[0]-c['radiusM']) < 1e-14
    assert abs(edges[-1]-edges[0]-c['thicknessM']) < 1e-14
    centers = np.sqrt(edges[:-1]*edges[1:])
    geometric = 2*math.pi*c['lengthM']
    rho = material['densityKgM3'] if material else 19250.
    masses = rho*geometric*np.diff(edges)*(edges[:-1]+edges[1:])/2
    log_left = np.log(edges[1:-1]/centers[:-1])
    log_right = np.log(centers[1:]/edges[1:-1])
    cg, film, coolant = c['gasCapacityJK'], c['gasWallWK'], c['coolantK']
    step = record['stepsUniform']
    assert step['dtS'] > 0 and step['gasEnergyJ'] == step['linerEnergyJ'] == 0
    states_path = path.parent/record['statesFile']
    with gzip.open(states_path, 'rt') as stream:
        states = json.load(stream)['states']
    assert len(states) == record['study']['steps']
    initial = np.asarray([record['initial']['gasK'], *record['initial']['wallK']])
    old, previous_cooling = initial.copy(), 0.
    maximum_row = maximum_energy = maximum_gas_j = maximum_exchange_error = 0.
    minimum_entropy = math.inf
    exchange = 0.
    dt = step['dtS']
    for state in states:
        new = np.asarray([state['gasK'], *state['wallK']])
        assert new.shape == initial.shape and np.all(np.isfinite(new))
        assert np.min(new) >= min(*initial, coolant)-1e-8
        assert np.max(new) <= max(*initial, coolant)+1e-8
        t = new[1:]
        if not material:
            assert min(t) >= 300 and max(t) <= 1900
        k = np.full_like(t, material['kWMK']) if material else 149.441-.045466*t+13.193e-6*t*t-1.484e-9*t**3+3.866e6/(t*t)
        assert np.all(k > 0) and np.all(cp(t, material) > 0)
        links = np.empty(c['cells'])
        half = math.log(centers[0]/edges[0])/(geometric*k[0])
        links[0] = 1/(1/film+half) if film else 0.
        links[1:] = geometric/(log_left/k[:-1]+log_right/k[1:])
        outer = 1/(1/c['coolingWK']+math.log(edges[-1]/centers[-1])/(geometric*k[-1])) if c['coolingWK'] else 0.
        changes = np.r_[cg*(new[0]-old[0]), masses*hchange(t, old[1:], material)]
        flux = dt*links*(new[:-1]-new[1:])
        cooling = dt*outer*(new[-1]-coolant)
        residual = changes.copy()
        residual[:-1] += flux
        residual[1:] -= flux
        residual[-1] += cooling
        energy_old = np.r_[cg*old[0], masses*hchange(old[1:], 300., material)]
        energy_new = np.r_[cg*new[0], masses*hchange(t, 300., material)]
        normalized = float(np.max(np.abs(residual)/(1+np.maximum(np.maximum(abs(energy_old), abs(energy_new)), 1e-9))))
        assert normalized < 1e-11, (record['name'], state['timeS'], 'node balance', normalized)
        maximum_row = max(maximum_row, normalized)
        maximum_gas_j = max(maximum_gas_j, abs(residual[0]))
        maximum_energy = max(maximum_energy, abs(float(sum(changes))+cooling))
        assert abs(state['coolingEnergyJ']-previous_cooling-cooling) < 1e-7+1e-9*abs(cooling)
        assert abs(state['gasExchangeJ']-flux[0]) < 1e-10+1e-9*abs(flux[0])
        exchange += flux[0]
        exchange_error = abs(exchange+cg*(new[0]-initial[0]))
        maximum_exchange_error = max(maximum_exchange_error, exchange_error)
        assert exchange_error < 1e-7+1e-9*abs(exchange)
        entropy = cg*math.log1p((new[0]-old[0])/old[0])+float(np.dot(masses, schange(t, old[1:], material)))+cooling/coolant
        budget = 8*np.finfo(float).eps*(1+cg+float(np.dot(masses, cp(t, material)))+abs(cooling/coolant))
        assert entropy >= -budget, (record['name'], 'negative entropy', entropy, budget)
        minimum_entropy = min(minimum_entropy, entropy)
        surface = new[0]-flux[0]/(dt*film) if film else new[1]
        assert min(new[0], new[1])-1e-8 <= surface <= max(new[0], new[1])+1e-8
        assert abs(surface-(new[1]+flux[0]*half/dt)) < 1e-8
        previous_cooling, old = state['coolingEnergyJ'], new
    return {'name': record['name'], 'checkedStates': len(states), 'allPass': True,
            'maximumNormalizedNodeResidual': maximum_row,
            'maximumGasRowResidualJ': maximum_gas_j,
            'maximumGlobalStepEnergyResidualJ': maximum_energy,
            'maximumCumulativeGasExchangeIdentityErrorJ': maximum_exchange_error,
            'minimumSystemBathEntropyIncrementJK': minimum_entropy,
            'runSHA256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'statesSHA256': hashlib.sha256(states_path.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('runs', type=Path, nargs='+')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    records = []
    for path in args.runs:
        print(f'Independent physics audit: {path.name}', flush=True)
        records.append(audit(path))
    result = {'allPass': True, 'cases': records,
              'checkedStates': sum(r['checkedStates'] for r in records),
              'assumptions': 'Fixed annular mass, lumped gas, no deposition, passive total-W/K Robin films.',
              'scriptSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    args.output.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
