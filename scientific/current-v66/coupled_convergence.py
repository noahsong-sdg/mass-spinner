"""Joint radial/time comparisons at shared radii; execute offline in safe-dev."""
import hashlib
import json
from pathlib import Path
import sys

import numpy as np


def compare(coarse, fine):
    a, b = coarse['steps'][-1]['result'], fine['steps'][-1]['result']
    na, nb = len(a['state']['omegaRadS']), len(b['state']['omegaRadS'])
    qa, qb = (np.arange(na)+.5)/na, (np.arange(nb)+.5)/nb
    omega_scale = max(abs(w) for w in fine['initialState']['omegaRadS'])
    omega_error = np.max(abs(np.asarray(a['state']['omegaRadS'])-np.interp(qa, qb, b['state']['omegaRadS'])))/omega_scale
    gas_final = np.asarray(b['thermal']['gasTemperatureK'])
    numbers = fine['setup']['number']/nb
    gas_initial = np.asarray(fine['initialState']['gasEnergyJ'])/(1.5*1.380649e-23*numbers)
    heating_scale = float(np.max(abs(gas_final-gas_initial)))
    error = float(np.max(abs(np.asarray(a['thermal']['gasTemperatureK'])-np.interp(qa, qb, gas_final))))
    heat_error = error/heating_scale if heating_scale else (0 if error == 0 else None)
    cdf_error = 0.
    for key in ('lightMass', 'heavyMass'):
        cdfa = np.r_[0, np.cumsum(a['state'][key])]
        cdfb = np.r_[0, np.cumsum(b['state'][key])]
        cdf_error = max(cdf_error, float(np.max(abs(cdfa-np.interp(np.arange(na+1)/na, np.arange(nb+1)/nb, cdfb)))))
    return {'coarse': coarse['id'], 'fine': fine['id'], 'omegaErrorOverInitialPeak': float(omega_error),
            'gasTemperatureDifferenceK': error, 'gasHeatingScaleK': heating_scale,
            'gasTemperatureErrorOverHeating': heat_error, 'speciesCdfError': cdf_error}


def analyze(packet):
    cases = packet['cases']
    failed = [{'id': c['id'], 'failure': c.get('failure'), 'completed': len(c['steps']), 'requested': c['requestedSteps']}
              for c in cases if c.get('failure') or len(c['steps']) != c['requestedSteps']]
    complete = [c for c in cases if not c.get('failure') and len(c['steps']) == c['requestedSteps']]
    grids = sorted({len(c['initialState']['lightMass']) for c in cases})
    counts = sorted({c['requestedSteps'] for c in cases})
    lookup = {(len(c['initialState']['lightMass']), c['requestedSteps']): c for c in complete}
    comparisons = []
    for n in grids:
        for low, high in zip(counts, counts[1:]):
            if (n, low) in lookup and (n, high) in lookup:
                comparisons.append({'axis': 'time', **compare(lookup[n, low], lookup[n, high])})
    for low, high in zip(grids, grids[1:]):
        for count in counts:
            if (low, count) in lookup and (high, count) in lookup:
                comparisons.append({'axis': 'radial', **compare(lookup[low, count], lookup[high, count])})
    gates = []
    for axis, low, high, count in (('time', grids[-1], grids[-1], counts[-1]), ('radial', grids[-2], grids[-1], counts[-1])):
        pair = (lookup.get((high, counts[-2])), lookup.get((high, count))) if axis == 'time' else (lookup.get((low, count)), lookup.get((high, count)))
        if any(c is None for c in pair):
            gates.append({'name': axis+' finest completed', 'passed': False}); continue
        row = compare(*pair)
        for key, limit in [('omegaErrorOverInitialPeak', .005 if axis == 'time' else .02),
                           ('gasTemperatureErrorOverHeating', .01 if axis == 'time' else .02), ('speciesCdfError', .005)]:
            value = row[key]
            gates.append({'name': axis+' '+key, 'value': value, 'limit': limit, 'passed': value is not None and value <= limit})
    return {'failedRuns': failed, 'comparisons': comparisons, 'gates': gates,
            'allCoupledRefinementGatesPassed': not failed and all(g['passed'] for g in gates),
            'spatialComparison': 'Coarse cell-center r² coordinates; fine field linearly interpolated. Species CDF at shared radial edges.',
            'axialAndLinerGridsRefined': False, 'experimentalValidation': False, 'liveBackendChanged': False}


if __name__ == '__main__':
    raw = Path(sys.argv[1]).read_bytes()
    result = analyze(json.loads(raw)); result['predictionSHA256'] = hashlib.sha256(raw).hexdigest()
    with Path(sys.argv[2]).open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    print(json.dumps(result, indent=2))
    if not result['allCoupledRefinementGatesPassed']:
        raise SystemExit(1)
