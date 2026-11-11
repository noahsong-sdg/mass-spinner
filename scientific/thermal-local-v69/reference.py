"""Independent frozen-property FV reference; run: reference.py PACKET NEW_OUTPUT.

W properties: NIST Shomate and Tolias https://arxiv.org/abs/1703.06302.
Reference algorithm: SciPy scipy.linalg.eigh/expm; no production imports.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np
from scipy.linalg import eigh, expm, null_space

KB, EPS, RHO, MOL = 1.380649e-23, np.finfo(float).eps, 19250., .18384
A, B, C, D, E = 23.95930, 2.639680e-3, 1.257750e-6, -.254642e-9, -.048407e6


def properties(t):
    t = np.asarray(t)
    return ((A+B*t+C*t*t+D*t**3+E/t**2)/MOL,
            149.441-.045466*t+13.193e-6*t*t-1.484e-9*t**3+3.866e6/t**2)


def enthalpy(t):
    t = np.asarray(t)
    return (A*(t-300)+B/2*(t*t-300**2)+C/3*(t**3-300**3)
            + D/4*(t**4-300**4)-E*(1/t-1/300))/MOL


def require(condition, message):
    if not condition:
        raise ValueError(message)


def frozen_graph(setup, ng):
    """Construct capacities and W/K links independently from annular geometry."""
    s, g, b = setup, setup['liner'], setup['boundary']
    r, x, v, m = (np.asarray(g[k], float) for k in
                 ('radiusEdgesM', 'radiusCentersM', 'volumesM3', 'massesKg'))
    n, length, radius = len(x), s['lengthM'], s['radiusM']
    require(ng >= 2 and 2 <= n <= 128 and len(r) == n+1, 'grid dimensions')
    require(all(np.all(np.isfinite(a)) for a in (r, x, v, m)), 'finite geometry')
    require(radius > 0 and length > 0 and np.all(np.diff(r) > 0)
            and r[0] == radius and g['lengthM'] == length, 'annular domain')
    require(s.get('meshFamily') in ('quadratic', 'exponential-8'), 'declared mesh family')
    y = np.arange(n+1)/n
    shape = y*y if s['meshFamily'] == 'quadratic' else np.expm1(8*y)/np.expm1(8)
    require(np.allclose(r, radius+(r[-1]-radius)*shape, rtol=8*EPS, atol=0), 'mesh declaration disagrees with edges')
    for actual, expected in ((x, np.sqrt(r[:-1]*r[1:])),
                             (v, np.pi*length*np.diff(r)*(r[1:]+r[:-1])), (m, RHO*v)):
        require(actual.shape == expected.shape and np.allclose(actual, expected, rtol=2e-12, atol=0),
                'corrupted annular geometry')
    tg, tw, number, k = (s[key] for key in
                         ('gasTemperatureK', 'wallTemperatureK', 'number', 'gasConductivityWMK'))
    require(all(np.isfinite(z) for z in (tg, tw, number, k)) and tg > 0
            and 300 <= tw <= 1900 and number > 0 and k > 0
            and 0 <= s['lightFraction'] <= 1, 'thermal domain')
    require(b['coolingWK'] == 0 and np.isfinite(b['gasWallWK']) and b['gasWallWK'] > 0
            and np.isfinite(b['coolantK']) and b['coolantK'] > 0, 'closed finite-film benchmark')
    cp, kw = properties(tw)
    factor = 2*np.pi*length
    solid_half = np.log(x[0]/radius)/(factor*kw)
    resistance = 1/b['gasWallWK']+solid_half+1/(8*np.pi*length*k*ng)
    links = np.r_[4*np.pi*length*k*np.arange(1, ng), 1/resistance,
                  factor*kw/np.log(x[1:]/x[:-1])]
    capacity = np.r_[np.full(ng, 1.5*KB*number/ng), m*cp]
    return capacity, links, solid_half/resistance


def eigensolution(capacity, links, initial, time):
    """Project the conserved uniform mode out before diagonalizing."""
    capacity, initial = np.asarray(capacity), np.asarray(initial)
    n = len(capacity)
    require(len(links) == n-1 and np.all(capacity > 0) and np.all(links > 0), 'positive graph')
    matrix = np.zeros((n, n))
    for i, conductance in enumerate(links):
        matrix[i:i+2, i:i+2] += conductance*np.array([[1., -1.], [-1., 1.]])
    require(np.max(abs(matrix.sum(axis=1))) <= 8*EPS*max(links)
            and np.array_equal(matrix, matrix.T), 'conservative symmetric operator')
    root = np.sqrt(capacity)
    symmetric = matrix/root[:, None]/root[None, :]
    zero = root/np.linalg.norm(root)
    basis = null_space(zero[None, :])
    reduced = basis.T@symmetric@basis
    rates, vectors = eigh(reduced)
    scale = np.linalg.norm(symmetric, 2)
    defect = np.linalg.norm(reduced@vectors-vectors*rates, 2)/scale
    require(np.min(rates) > 0 and defect < 2e-12, 'eigensystem defect')
    # Subtract a nearby datum before the weighted mean, retaining small signals.
    offset = initial-initial[-1]
    mean_offset = np.dot(capacity, offset)/sum(capacity)
    modes = vectors.T@basis.T@(root*(offset-mean_offset))
    delta = basis@(vectors@(np.expm1(-rates*time)*modes))/root
    # Cross-check increments using an augmented exponential, not exp(A*t)-I.
    operator = -reduced
    augmented = np.zeros((n, n))
    augmented[:-1, :-1] = operator
    augmented[:-1, -1] = operator@(basis.T@(root*(offset-mean_offset)))
    cross_delta = basis@expm(augmented*time)[:-1, -1]/root
    cross = float(np.max(np.abs(cross_delta-delta)))
    conservation = abs(np.dot(capacity, delta))
    require(conservation <= 256*EPS*np.dot(capacity, np.abs(delta)), 'reference heat conservation')
    return delta, {'eigenRelativeDefect': float(defect), 'expmIncrementDifferenceK': cross,
                   'heatDefectJ': float(conservation), 'operatorRowSumWK': float(np.max(abs(matrix.sum(axis=1))))}


def entropy_increment(old, new, capacity, masses, ng):
    gas = np.dot(capacity[:ng], np.log1p((new[:ng]-old[:ng])/old[:ng]))
    a, b = old[ng:], new[ng:]
    wall = (A*np.log1p((b-a)/a)+B*(b-a)+C/2*(b-a)*(b+a)
            + D/3*(b-a)*(b*b+b*a+a*a)-E/2*(1/b**2-1/a**2))/MOL
    return float(gas+np.dot(masses, wall))


def error_record(actual, reference, uncertainty):
    errors, responses = abs(actual-reference), abs(reference)
    relative = [float(e/r) if r else (0. if e == 0 else None) for e, r in zip(errors, responses)]
    resolved = responses > uncertainty
    return {'errorK': float(max(errors)), 'responseK': float(max(responses)),
            'localErrorK': list(errors), 'localResponseK': list(responses), 'rawLocalRelative': relative,
            'resolvedResponse': list(map(bool, resolved)),
            'relative': float(max(errors)/max(responses)) if max(responses) else None,
            'referenceUncertaintyK': uncertainty,
            # Reserve at most 10% of the prospective 1% external error budget
            # for reference uncertainty; do not subtract it from measured error.
            'referenceQualified': bool(max(responses) > 0 and uncertainty <= .001*max(responses)),
            'referenceResolvedAgainstDefect': list(map(bool, uncertainty < .1*errors))}


def evaluate(case):
    s, initial, steps = case['setup'], case['initial'], case['steps']
    require(case.get('failure') is None and case.get('requestedSteps') == len(steps), 'failed or incomplete case')
    ng = len(initial['gasEnergyJ'])
    capacity, links, surface_weight = frozen_graph(s, ng)
    nw = len(s['liner']['massesKg'])
    masses = np.asarray(s['liner']['massesKg'])
    old = np.r_[np.full(ng, s['gasTemperatureK']), np.full(nw, s['wallTemperatureK'])]
    old_energy = np.r_[initial['gasEnergyJ'], initial['linerEnergyJ']].astype(float)
    expected = np.r_[capacity[:ng]*old[:ng], masses*enthalpy(old[ng:])]
    require(np.allclose(old_energy, expected, rtol=2e-13, atol=0), 'initial energies disagree with declared uniform state')
    require(steps and all(np.isfinite(a['dtS']) and a['dtS'] > 0 for a in steps), 'positive steps')
    time, audits, max_cp, max_k = 0., [], 0., 0.
    cp0, k0 = properties(s['wallTemperatureK'])
    for step in steps:
        r, dt = step['result'], step['dtS']
        new = np.r_[r['gasTemperatureK'], r['linerSolveTemperatureK']]
        energy = np.r_[r['gasEnergyJ'], r['cellEnergyJ']]
        require(new.shape == old.shape and np.all(np.isfinite(new)) and np.all(new[:ng] > 0)
                and np.all((new[ng:] >= 300) & (new[ng:] <= 1900)), 'endpoint domain')
        require(np.allclose(r['gasCellNumbers'], s['number']/ng, rtol=2e-13, atol=0), 'fixed species inventory')
        require(np.all(np.asarray(r['gasSourceJ']) == 0) and r['coolingEnergyJ'] == 0
                and np.all(np.asarray(r['speciesFaceEnergyJ']) == 0), 'source-free diagnostic')
        expected = np.r_[capacity[:ng]*new[:ng], masses*enthalpy(new[ng:])]
        require(np.allclose(energy, expected, rtol=2e-13, atol=0), 'endpoint energy representation')
        # Only exported gas/interface faces are used for independent sign checks.
        q = np.r_[r['gasFaceEnergyJ'], r['gasExchangeJ']]
        sign = float(np.min(q*(new[:ng]-new[1:ng+1])))
        edges, centers = (np.asarray(s['liner'][key]) for key in ('radiusEdgesM', 'radiusCentersM'))
        kw = properties(new[ng:])[1]
        half = np.log(centers[0]/s['radiusM'])/(2*np.pi*s['lengthM']*kw[0])
        inner = 1/(half+1/s['boundary']['gasWallWK']+1/(8*np.pi*s['lengthM']*s['gasConductivityWMK']*ng))
        wall_links = 2*np.pi*s['lengthM']/(np.log(edges[1:-1]/centers[:-1])/kw[:-1]
                                         + np.log(centers[1:]/edges[1:-1])/kw[1:])
        actual_links = np.r_[links[:ng-1], inner, wall_links]
        physical_q = dt*actual_links*(new[:-1]-new[1:])
        heat_defect = abs(q-physical_q[:ng])
        heat_limit = 64*EPS*(abs(q)+dt*actual_links[:ng]*max(new))+1e-9*abs(physical_q[:ng])
        heat_verified = bool(np.all(heat_defect <= heat_limit))
        row = energy-old_energy+np.r_[physical_q, 0]-np.r_[0, physical_q]
        flux_scale = np.r_[abs(physical_q), 0]+np.r_[0, abs(physical_q)]
        row_roundoff = 64*EPS*(abs(energy)+abs(old_energy)
                               + dt*(np.r_[actual_links, 0]+np.r_[0, actual_links])*max(new))
        row_limit = row_roundoff+1e-9*(abs(energy-old_energy)+flux_scale)
        row_ratio = float(max(abs(row)/row_limit))
        storage = 64*EPS*float(sum(abs(old_energy))+sum(abs(energy)))
        residual = float(sum(energy-old_energy))
        entropy = entropy_increment(old, new, capacity, masses, ng)
        entropy_roundoff = 128*EPS*float(np.dot(capacity, np.maximum(old, new))/min(old.min(), new.min()))
        audit = {'energyDefectJ': residual, 'energyRoundoffJ': storage, 'entropyIncrementJK': entropy,
                 'entropyRoundoffJK': entropy_roundoff, 'minimumHeatSignJK': sign,
                 'exportedHeatMatchesPhysics': heat_verified, 'maximumExportedHeatDefectJ': float(max(heat_defect)),
                 'maximumRowToleranceRatio': row_ratio,
                 'pass': bool(heat_verified and row_ratio <= 1 and abs(residual) <= storage+1e-9*sum(abs(energy-old_energy))
                              and entropy >= -entropy_roundoff and sign >= -storage*float(max(new)))}
        audits.append(audit)
        cp, kw = properties(new[ng:])
        max_cp, max_k = max(max_cp, float(max(abs(cp/cp0-1)))), max(max_k, float(max(abs(kw/k0-1))))
        old, old_energy, time = new, energy, time+dt
    require(abs(time-case['durationS']) <= 16*EPS*case['durationS'], 'duration support mismatch')
    initial_t = np.r_[np.full(ng, s['gasTemperatureK']), np.full(nw, s['wallTemperatureK'])]
    delta, diagnostics = eigensolution(capacity, links, initial_t, time)
    ref_surface = (initial_t[ng]-s['wallTemperatureK']+delta[ng]
                   + surface_weight*(initial_t[ng-1]-initial_t[ng]+delta[ng-1]-delta[ng]))
    _, actual_kw = properties(old[ng])
    actual_weight = np.log(s['liner']['radiusCentersM'][0]/s['radiusM'])/(2*np.pi*s['lengthM']*actual_kw)
    actual_resistance = actual_weight+1/s['boundary']['gasWallWK']+1/(8*np.pi*s['lengthM']*s['gasConductivityWMK']*ng)
    actual_surface = old[ng]-s['wallTemperatureK']+actual_weight/actual_resistance*(old[ng-1]-old[ng])
    uncertainty = diagnostics['expmIncrementDifferenceK']+64*EPS*max(initial_t)
    return {'id': case['id'], 'wallCells': nw, 'substeps': len(steps), 'timeS': case['durationS'],
            'gridFamily': s['meshFamily'], 'surfaceIncrementK': actual_surface,
            'gasIncrementK': list(old[:ng]-initial_t[:ng]),
            'surface': error_record(np.array([actual_surface]), np.array([ref_surface]), uncertainty),
            'gas': error_record(old[:ng]-initial_t[:ng], delta[:ng], uncertainty),
            'reference': diagnostics, 'maxRelativeCpVariation': max_cp, 'maxRelativeKVariation': max_k,
            'allStepAuditsPass': all(a['pass'] for a in audits), 'stepAudits': audits}


def assess(packet):
    require(isinstance(packet, dict) and re.fullmatch('[0-9a-f]{64}', packet.get('sourceSHA256', '')),
            'packet sourceSHA256 must be a lowercase SHA-256; stale/unversioned packets are unsupported')
    require(isinstance(packet.get('cases'), list) and packet['cases'], 'nonempty cases required')
    require(len({c['id'] for c in packet['cases']}) == len(packet['cases']), 'duplicate case IDs')
    cases, failures = [], []
    for case in packet['cases']:
        try:
            cases.append(evaluate(case))
        except (ValueError, KeyError, TypeError, IndexError, np.linalg.LinAlgError) as error:
            failures.append({'id': case.get('id'), 'failure': str(error)})
    expected_support = {(family, n, steps, time) for family in ('quadratic', 'exponential-8')
                        for n in (32, 64, 128) for steps in (1, 4, 16, 64)
                        for time in (15.2587890625e-9, 61.03515625e-9)}
    support = {(c['gridFamily'], c['wallCells'], c['substeps'], c['timeS']) for c in cases}
    fine = [c for c in cases if c['gridFamily'] == 'exponential-8' and c['wallCells'] == 128 and c['substeps'] == 64]
    pairs = []
    for a in cases:
        for b in cases:
            kind = 'time' if a['wallCells'] == b['wallCells'] == 128 and (a['substeps'], b['substeps']) == (16, 64) else 'wall' if (a['wallCells'], b['wallCells']) == (64, 128) and a['substeps'] == b['substeps'] == 64 else None
            if kind and a['gridFamily'] == b['gridFamily'] and a['timeS'] == b['timeS']:
                uncertainty = max(a['surface']['referenceUncertaintyK'], b['surface']['referenceUncertaintyK'])
                surface = error_record(np.array([a['surfaceIncrementK']]), np.array([b['surfaceIncrementK']]), uncertainty)
                gas = error_record(np.asarray(a['gasIncrementK']), np.asarray(b['gasIncrementK']), uncertainty)
                pairs.append({'kind': kind, 'coarse': a['id'], 'fine': b['id'], 'surface': surface, 'gas': gas,
                              'pass': all(z['relative'] is not None and z['relative'] <= (.01 if kind == 'time' else .02) for z in (surface, gas))})
    return {'sourceSHA256': packet['sourceSHA256'], 'sourceHashScope': 'Retained producer attestation; checkout binding is verified separately by the campaign runner.',
            'referenceScope': 'Frozen W Cp/k at initial wall temperature; fixed gas inventory and conductivity; not exact nonlinear physics.',
            'gasGateScope': 'Infinity profile error divided by maximum physical gas heating increment. Per-cell relative errors are diagnostics; this is not pointwise local qualification.',
            'cases': cases, 'failedCases': failures, 'completeStudySupport': support == expected_support,
            'successivePairs': pairs,
            'pass': not failures and support == expected_support and all(c['allStepAuditsPass'] for c in cases)
            and all(c[z]['referenceQualified'] and c[z]['relative'] is not None and c[z]['relative'] <= .01 for c in fine for z in ('surface', 'gas'))
            and all(p['pass'] for p in pairs if next(c for c in cases if c['id'] == p['fine'])['gridFamily'] == 'exponential-8')}


if __name__ == '__main__':
    require(len(sys.argv) == 3, 'usage: reference.py PACKET NEW_OUTPUT')
    raw = Path(sys.argv[1]).read_bytes()
    output = assess(json.loads(raw))
    output['rawSHA256'] = hashlib.sha256(raw).hexdigest()
    encoded = json.dumps(output, indent=2, allow_nan=False)+'\n'
    with Path(sys.argv[2]).open('x') as stream:
        stream.write(encoded)
    sys.exit(0 if output['pass'] else 1)
