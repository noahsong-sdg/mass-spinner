"""Strict whole-history comparisons. Parent executes offline in safe-dev only.

CLI: python analyze.py PACKET.json CONFIG.json NEW_OUTPUT.json
CONFIG binds exact source/export digests and explicit coarseID/fineID/axis pairs.
No production imports, temporal interpolation, signal floors or inferred pairs.
"""
import hashlib
import json
import math
from pathlib import Path
import re
import sys

K = 1.380649e-23
EPS = sys.float_info.epsilon
AXES = ('time', 'radial', 'axial', 'liner')


def close(a, b):
    return abs(a-b) <= 256*EPS*max(abs(a), abs(b))


def ratio(error, scale):
    if error < 0 or scale < 0 or not math.isfinite(error+scale):
        raise ValueError('Nonfinite or negative norm')
    return error/scale if scale else (0. if error == 0 else None)


def array(value, size, name, positive=False):
    if not isinstance(value, list) or len(value) != size or any(
        not isinstance(v, (int, float)) or not math.isfinite(v) or positive and v <= 0 for v in value):
        raise ValueError(name+': invalid array or length')
    return value


def edges(value, name):
    array(value, len(value), name)
    if len(value) < 3 or any(b <= a for a, b in zip(value, value[1:])):
        raise ValueError(name+': ordered cell edges required')
    return value


def same(a, b, name):
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if not close(a, b):
            raise ValueError(name+': changed physical input')
    elif isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        for x, y in zip(a, b):
            same(x, y, name)
    elif isinstance(a, dict) and isinstance(b, dict) and a.keys() == b.keys():
        for key in a:
            same(a[key], b[key], name+'.'+key)
    elif a != b:
        raise ValueError(name+': changed physical input')


def interpolate(x, xs, values):
    if x < xs[0] and not close(x, xs[0]) or x > xs[-1] and not close(x, xs[-1]):
        raise ValueError('Spatial interpolation would extrapolate')
    if x <= xs[0]:
        return values[0]
    for i in range(len(xs)-1):
        if x <= xs[i+1]:
            fraction = (x-xs[i])/(xs[i+1]-xs[i])
            return values[i]*(1-fraction)+values[i+1]*fraction
    return values[-1]


def overlap(target, source):
    same(target[0], source[0], 'mapping inner boundary')
    same(target[-1], source[-1], 'mapping outer boundary')
    weights = []
    for a, b in zip(target, target[1:]):
        row = []
        for j, (c, d) in enumerate(zip(source, source[1:])):
            length = min(b, d)-max(a, c)
            if length > 0:
                row.append((j, length/(d-c)))
        covered = math.fsum((source[j+1]-source[j])*w for j, w in row)
        if not close(covered, b-a):
            raise ValueError('Nonconservative spatial coverage')
        weights.append(row)
    return weights


def project_inventory(values, weights):
    return [math.fsum(values[j]*w for j, w in row) for row in weights]


def restrict_gas(plan, state, target_q):
    weights = overlap(target_q, plan['q'])
    restricted = {key: project_inventory(state[key], weights) for key in ('lightMass', 'heavyMass', 'gasEnergyJ')}
    setup = plan['case']['setup']; x = setup['lightFraction']
    mass = [setup['number']*(x*a*setup['speciesMassKg'][0]+(1-x)*b*setup['speciesMassKg'][1])
            for a, b in zip(state['lightMass'], state['heavyMass'])]
    omega = []
    for a, b in zip(target_q, target_q[1:]):
        inertias, angular = [], []
        for j, (c, d) in enumerate(zip(plan['q'], plan['q'][1:])):
            lo, hi = max(a, c), min(b, d)
            if hi > lo:
                inertia = mass[j]/(d-c)*(hi-lo)*(hi+lo)/2
                inertias.append(inertia); angular.append(inertia*state['omegaRadS'][j])
        omega.append(math.fsum(angular)/math.fsum(inertias))
    restricted['omegaRadS'] = omega
    return restricted, gas_temperature(setup, restricted)


def enthalpy(t):
    if not 300 <= t <= 1900:
        raise ValueError('Tungsten temperature domain')
    a, b, c, d, e, m, ref = 23.95930, 2.639680e-3, 1.257750e-6, -.254642e-9, -.048407e6, .18384, 300.
    return (t-ref)*(a+b*(t+ref)/2+c*(t*t+t*ref+ref*ref)/3+
                    d*(t**3+t*t*ref+t*ref*ref+ref**3)/4+e/(t*ref))/m


def solid_temperature(h):
    if not math.isfinite(h) or h < 0 or h > enthalpy(1900)*(1+8*EPS):
        raise ValueError('Tungsten enthalpy domain')
    lo, hi = 300., 1900.
    for _ in range(65):
        mid = (lo+hi)/2
        if enthalpy(mid) < h:
            lo = mid
        else:
            hi = mid
    return (lo+hi)/2


def gas_temperature(setup, state):
    n = len(state['lightMass'])
    for key in ('lightMass', 'heavyMass', 'omegaRadS', 'gasEnergyJ'):
        array(state[key], n, key)
    for key in ('lightMass', 'heavyMass'):
        if any(v < 0 for v in state[key]) or abs(math.fsum(state[key])-1.) > 512*EPS*n:
            raise ValueError('Canonical species inventory is not normalized')
    x, number = setup['lightFraction'], setup['number']
    counts = [number*(x*a+(1-x)*b) for a, b in zip(state['lightMass'], state['heavyMass'])]
    if any(v <= 0 for v in counts) or any(u <= 0 for u in state['gasEnergyJ']):
        raise ValueError('Canonical gas energy/count must be positive')
    return [u/(1.5*K*count) for u, count in zip(state['gasEnergyJ'], counts)]


def prepare(case):
    requested, records = case['requestedSteps'], case['steps']
    if type(requested) is not int or requested <= 0 or len(records) != requested or case.get('failure') is not None:
        raise ValueError(case['id']+': incomplete or failed requested trajectory')
    setup = case['setup']
    r, z = (edges(setup['electrical'][key], key) for key in ('radialEdgesM', 'axialEdgesM'))
    q, ns = [v*v for v in r], len(setup['liner']['massesKg'])
    if r[0] != 0 or not close(r[-1], setup['radiusM']) or not close(z[-1]-z[0], setup['lengthM']):
        raise ValueError('Inconsistent common gas/electrical geometry')
    if not math.isfinite(setup['number']) or setup['number'] <= 0 or not math.isfinite(setup['lightFraction']) or not 0 <= setup['lightFraction'] <= 1:
        raise ValueError('Invalid gas inventory setup')
    array(setup['speciesMassKg'], 2, 'species mass', positive=True)
    liner = setup['liner']; lq = [v*v for v in edges(liner['radiusEdgesM'], 'liner edges')]
    if not math.isfinite(liner['lengthM']) or not close(liner['lengthM'], setup['lengthM']):
        raise ValueError('Liner length must match the common gas geometry')
    array(liner['massesKg'], ns, 'liner mass', positive=True)
    if len(lq) != ns+1 or not close(lq[0], q[-1]):
        raise ValueError('Inconsistent liner geometry')
    states, times, heat = [case['initialState']], [0.], []
    for record in records:
        dt = record['dtS']
        if not math.isfinite(dt) or dt <= 0:
            raise ValueError('Accepted timestep must be positive and finite')
        result = record['result']
        if result['momentum']['grid']['shearScheme'] != 'volume-coordinate':
            raise ValueError('Stale non-volume-coordinate coupled trajectory')
        value = result['thermal']['gasExchangeJ']
        if not math.isfinite(value):
            raise ValueError('Nonfinite gas-wall heat')
        states.append(result['state']); heat.append(value)
        times.append(math.fsum([r['dtS'] for r in records[:len(heat)]]))
    temperatures, liner_t = [], []
    for state in states:
        if len(state['lightMass']) != len(q)-1:
            raise ValueError('State/grid length mismatch')
        temperatures.append(gas_temperature(setup, state))
        array(state['linerEnergyJ'], ns, 'liner energy')
        liner_t.append([solid_temperature(u/m) for u, m in zip(state['linerEnergyJ'], liner['massesKg'])])
    powers = [h/r['dtS'] for h, r in zip(heat, records)]
    cumulative = [0.]+[math.fsum(heat[:i]) for i in range(1, len(heat)+1)]
    return {'case': case, 'q': q, 'qc': [(a+b)/2 for a, b in zip(q, q[1:])], 'z': z,
            'lq': lq, 'states': states, 'times': times, 't': temperatures, 'linerT': liner_t,
            'heat': heat, 'power': powers, 'cumulative': cumulative}


def boundary_same(coarse_edges, coarse, fine_edges, fine, name):
    array(coarse_edges, len(coarse)+1, name+' coarse edges')
    array(fine_edges, len(fine)+1, name+' fine edges')
    for i, row in enumerate(overlap(coarse_edges, fine_edges)):
        for j, weight in row:
            if weight > 256*EPS:
                same(coarse[i], fine[j], name)


def validate_setup(a, b, axis):
    ca, cb = a['case']['setup'], b['case']['setup']
    same({k: v for k, v in ca.items() if k not in ('electrical', 'liner')},
         {k: v for k, v in cb.items() if k not in ('electrical', 'liner')}, 'setup')
    ea, eb = ca['electrical'], cb['electrical']
    variable = {'radialEdgesM', 'axialEdgesM', 'sigmaPerpSM', 'sigmaParallelSM',
                'innerVoltageV', 'outerVoltageV', 'lowerVoltageV', 'upperVoltageV'}
    same({k: v for k, v in ea.items() if k not in variable}, {k: v for k, v in eb.items() if k not in variable}, 'electrical scalar')
    target, source = (a['q'], b['q']) if axis == 'radial' else (a['z'], b['z'])
    if axis in ('radial', 'axial'):
        if len(source) <= len(target):
            raise ValueError('Declared spatial refinement does not refine its axis')
    if axis != 'radial':
        same(a['q'], b['q'], 'unlisted radial grid')
    if axis != 'axial':
        same(a['z'], b['z'], 'unlisted axial grid')
    rq, zz = overlap(a['q'], b['q']), overlap(a['z'], b['z'])
    na, nb, za, zb = len(a['q'])-1, len(b['q'])-1, len(a['z'])-1, len(b['z'])-1
    for key in ('sigmaPerpSM', 'sigmaParallelSM'):
        av, bv = array(ea[key], na*za, key, True), array(eb[key], nb*zb, key, True)
        for j in range(za):
            for i in range(na):
                integral = math.fsum(bv[l*nb+k]*wr*wz*(b['q'][k+1]-b['q'][k])*(b['z'][l+1]-b['z'][l])
                                     for k, wr in rq[i] for l, wz in zz[j])
                expected = integral/((a['q'][i+1]-a['q'][i])*(a['z'][j+1]-a['z'][j]))
                same(av[j*na+i], expected, key+' physical field')
    for key in ('innerVoltageV', 'outerVoltageV'):
        boundary_same(a['z'], ea[key], b['z'], eb[key], key)
    for key in ('lowerVoltageV', 'upperVoltageV'):
        boundary_same(a['q'], ea[key], b['q'], eb[key], key)
    if axis != 'liner':
        same(ca['liner'], cb['liner'], 'unlisted liner grid')
    elif len(b['lq']) <= len(a['lq']):
        raise ValueError('Declared liner refinement does not refine its grid')
    weights = overlap(a['lq'], b['lq'])
    projected = project_inventory(cb['liner']['massesKg'], weights)
    same(projected, ca['liner']['massesKg'], 'conservative liner mass mapping')
    if axis != 'radial':
        for key in ('lightMass', 'heavyMass', 'omegaRadS', 'gasEnergyJ'):
            same(a['states'][0][key], b['states'][0][key], 'initial gas '+key)
    if axis == 'time':
        if len(b['times']) <= len(a['times']):
            raise ValueError('Declared time refinement does not add steps')
    elif len(a['times']) != len(b['times']):
        raise ValueError('Unlisted timestep refinement')
    same(a['times'][-1], b['times'][-1], 'trajectory duration')
    return weights


def shared_indices(a, b):
    indices = []
    for time in a['times']:
        matches = [i for i, value in enumerate(b['times']) if close(value, time)]
        if len(matches) != 1:
            raise ValueError('Accepted time grid mismatch; temporal interpolation is forbidden')
        indices.append(matches[0])
    return indices


def maximum_excursion(history):
    return max(abs(value-initial) for row in history for value, initial in zip(row, history[0]))


def compare(a, b, spec):
    axis = spec['axis']
    weights = validate_setup(a, b, axis); shared = shared_indices(a, b)
    omega_scale = max(abs(v) for v in b['states'][0]['omegaRadS'])
    gas_scale = max(maximum_excursion(p['t']) for p in (a, b))
    liner_scale = max(maximum_excursion(p['linerT']) for p in (a, b))
    power_scale = max(abs(v) for p in (a, b) for v in p['power'])
    energy_scale = max(math.fsum(abs(v) for v in p['heat']) for p in (a, b))
    trace, causal = [], {'maximumResolvedRelativeError': 0., 'unresolvedSignalComparisons': 0,
                        'maximumUnresolvedRawErrorK': 0., 'roundoffDominatedComparisons': 0}
    restricted_gas = [restrict_gas(b, state, a['q']) for state in b['states']]
    restricted_liner = [[solid_temperature(u/m) for u, m in zip(project_inventory(state['linerEnergyJ'], weights),
                          a['case']['setup']['liner']['massesKg'])] for state in b['states']]
    fine_causal = [[max(abs(restricted_gas[k][1][i]-restricted_gas[0][1][i]) for k in range(j+1))
                    for i in range(len(a['qc']))] for j in range(len(b['times']))]
    liner_causal = [[max(abs(restricted_liner[k][i]-restricted_liner[0][i]) for k in range(j+1))
                    for i in range(len(a['lq'])-1)] for j in range(len(b['times']))]
    liner_local = {'maximumResolvedRelativeError': 0., 'resolvedComparisons': 0, 'unresolvedRelativeComparisons': 0,
                   'unresolvedAboveRoundoffComparisons': 0, 'maximumUnresolvedRawErrorK': 0.}
    for ia, ib in enumerate(shared):
        sa, sb = a['states'][ia], b['states'][ib]
        mapped_state, mapped_t = restricted_gas[ib]
        mapped_w = mapped_state['omegaRadS']
        omega_errors = [abs(x-y) for x, y in zip(sa['omegaRadS'], mapped_w)]
        temp_errors = [abs(x-y) for x, y in zip(a['t'][ia], mapped_t)]
        cdf_error = 0.
        for key in ('lightMass', 'heavyMass'):
            ac = [0.]+[math.fsum(sa[key][:i]) for i in range(1, len(sa[key])+1)]
            bc = [0.]+[math.fsum(sb[key][:i]) for i in range(1, len(sb[key])+1)]
            cdf_error = max(cdf_error, max(abs(v-interpolate(q, b['q'], bc)) for q, v in zip(a['q'], ac)))
        mapped_liner = restricted_liner[ib]
        liner_errors = [abs(x-y) for x, y in zip(a['linerT'][ia], mapped_liner)]
        liner_error = max(liner_errors)
        row = {'timeS': a['times'][ia], 'omegaDifferenceRadS': max(omega_errors),
               'omegaWorstCell': omega_errors.index(max(omega_errors)), 'gasTemperatureDifferenceK': max(temp_errors),
               'gasTemperatureWorstCell': temp_errors.index(max(temp_errors)), 'linerTemperatureDifferenceK': liner_error,
               'linerTemperatureWorstCell': liner_errors.index(liner_error),
               'speciesCdfError': cdf_error, 'cumulativeGasWallHeatDifferenceJ': abs(a['cumulative'][ia]-b['cumulative'][ib])}
        for i, error in enumerate(temp_errors):
            excursion = fine_causal[ib][i]
            background = abs(mapped_t[i])+abs(restricted_gas[0][1][i])
            location = {'timeS': row['timeS'], 'coarseCell': i, 'qM2': a['qc'][i], 'rawDifferenceK': error,
                        'referenceCausalExcursionK': excursion, 'temperatureRoundoffAllowanceK': 64*EPS*background}
            if excursion <= 64*EPS*background:
                causal['roundoffDominatedComparisons'] += 1
                causal['unresolvedSignalComparisons'] += 1
                if error >= causal['maximumUnresolvedRawErrorK']:
                    causal['maximumUnresolvedRawErrorK'] = error; causal['unresolvedWorstLocation'] = location
            else:
                local = error/excursion
                if local > causal['maximumResolvedRelativeError']:
                    causal['maximumResolvedRelativeError'] = local; causal['worstResolvedLocation'] = location
        if ia:
            for i, error in enumerate(liner_errors):
                excursion = liner_causal[ib][i]
                ulp = 64*EPS*(abs(mapped_liner[i])+abs(restricted_liner[0][i])+abs(a['linerT'][ia][i])+abs(a['linerT'][0][i]))
                location = {'timeS': row['timeS'], 'coarseCell': i, 'rawDifferenceK': error,
                            'referenceCausalExcursionK': excursion, 'temperatureRoundoffAllowanceK': ulp}
                if excursion <= ulp:
                    liner_local['unresolvedRelativeComparisons'] += 1
                    liner_local['unresolvedAboveRoundoffComparisons'] += int(error > ulp)
                    if error >= liner_local['maximumUnresolvedRawErrorK']:
                        liner_local['maximumUnresolvedRawErrorK'] = error; liner_local['unresolvedWorstLocation'] = location
                else:
                    liner_local['resolvedComparisons'] += 1
                    local = error/excursion
                    if local > liner_local['maximumResolvedRelativeError']:
                        liner_local['maximumResolvedRelativeError'] = local; liner_local['worstResolvedLocation'] = location
        if ia:
            row['endpointGasWallPowerDifferenceW'] = abs(a['power'][ia-1]-b['power'][ib-1])
            duration = a['times'][ia]-a['times'][ia-1]
            fine_heat = math.fsum(b['heat'][shared[ia-1]:ib])
            row['intervalGasWallPowerDifferenceW'] = abs(a['heat'][ia-1]/duration-fine_heat/duration)
        trace.append(row)
    metrics = [('omegaErrorOverInitialPeak', 'omegaDifferenceRadS', omega_scale),
               ('gasTemperatureErrorOverHeating', 'gasTemperatureDifferenceK', gas_scale),
               ('linerTemperatureErrorOverHeating', 'linerTemperatureDifferenceK', liner_scale),
               ('speciesCdfError', 'speciesCdfError', 1.),
               ('cumulativeGasWallHeatError', 'cumulativeGasWallHeatDifferenceJ', energy_scale),
               ('endpointGasWallPowerError', 'endpointGasWallPowerDifferenceW', power_scale),
               ('intervalGasWallPowerError', 'intervalGasWallPowerDifferenceW', power_scale)]
    gates, maxima = [], {}
    for metric, key, scale in metrics:
        eligible = [row for row in trace if key in row]
        worst = max(eligible, key=lambda row: row[key]); raw = worst[key]; value = ratio(raw, scale)
        if metric == 'speciesCdfError':
            limit = .005
        elif axis == 'time':
            limit = .005 if metric == 'omegaErrorOverInitialPeak' else .01
        else:
            limit = .02
        gates.append({'name': metric, 'value': value, 'limit': limit, 'passed': value is not None and value <= limit})
        maxima[metric] = {'rawDifference': raw, 'naturalScale': scale, 'relativeError': value, 'worstTimeS': worst['timeS'],
                         'worstCoarseCell': worst.get({'omegaDifferenceRadS': 'omegaWorstCell',
                             'gasTemperatureDifferenceK': 'gasTemperatureWorstCell', 'linerTemperatureDifferenceK': 'linerTemperatureWorstCell'}.get(key, ''))}
    liner_local['resolvedRelativeGate'] = {'limit': .01 if axis == 'time' else .02,
        'passed': liner_local['maximumResolvedRelativeError'] <= (.01 if axis == 'time' else .02) if liner_local['resolvedComparisons'] else None}
    liner_local['absoluteTemperatureGate'] = {'limitK': .05,
        'passed': maxima['linerTemperatureErrorOverHeating']['rawDifference'] <= .05}
    liner_local['status'] = 'unresolvedrelative' if liner_local['unresolvedRelativeComparisons'] else 'resolved'
    liner_local['fullLocalAccuracyQualified'] = not liner_local['unresolvedRelativeComparisons'] and liner_local['resolvedRelativeGate']['passed'] and liner_local['absoluteTemperatureGate']['passed']
    return {**spec, 'sharedAcceptedTimes': len(shared)-1, 'initialTimeIncludedInProfiles': True,
            'fineOnlyAcceptedTimesNotCompared': len(b['times'])-len(shared),
            'maxima': maxima, 'gates': gates, 'allPassed': all(g['passed'] for g in gates), 'trace': trace,
            'causalLocalLinerTemperatureSecondaryAssessment': liner_local,
            'causalLocalGasTemperatureDiagnostics': {**causal, 'gated': False,
                'warning': 'Global trajectory norms do not establish local relative accuracy; zero/roundoff reference excursions are explicit.'}}


def analyze(packet, config, prediction_sha256):
    for key, actual in (('sourceSHA256', packet['sourceSHA256']), ('predictionSHA256', prediction_sha256)):
        expected = config[key]
        if not isinstance(expected, str) or not re.fullmatch('[0-9a-f]{64}', expected) or expected != actual:
            raise ValueError('Stale or invalid '+key+' hash')
    cases = packet['cases']; ids = [c['id'] for c in cases]
    if not ids or len(set(ids)) != len(ids):
        raise ValueError('Duplicate or missing case identity')
    pairs = config['pairs']; required = set(); seen = set()
    if not pairs:
        raise ValueError('Explicit comparison pairs required')
    for spec in pairs:
        if set(spec) != {'coarseID', 'fineID', 'axis'} or spec['axis'] not in AXES:
            raise ValueError('Invalid explicit comparison pair')
        key = (spec['coarseID'], spec['fineID'], spec['axis'])
        if key in seen or key[0] == key[1] or any(v not in ids for v in key[:2]):
            raise ValueError('Duplicate, missing or self comparison identity')
        seen.add(key); required.update(key[:2])
    prepared = {c['id']: prepare(c) for c in cases if c['id'] in required}
    comparisons = [compare(prepared[s['coarseID']], prepared[s['fineID']], s) for s in pairs]
    return {'sourceSHA256': packet['sourceSHA256'], 'predictionSHA256': prediction_sha256,
            'comparisons': comparisons, 'unpairedCaseIDs': [value for value in ids if value not in required],
            'allWholeHistoryGatesPassed': all(c['allPassed'] for c in comparisons),
            'timeComparison': 'Every coarse accepted endpoint must exist exactly (binary64 roundoff only) in fine trajectory; no temporal interpolation.',
            'spatialComparison': 'Restrict gas species and U conservatively in q=r² before canonical T; restrict Omega as L/I using partial-shell inertias; compare species CDF at q edges; restrict liner U/mass before H inversion. This is a different norm from v66 point interpolation.',
            'fineOnlyAcceptedTimesCompared': False,
            'conservationAuditIncluded': False, 'experimentalValidation': False, 'liveBackendChanged': False}


if __name__ == '__main__':
    raw = Path(sys.argv[1]).read_bytes(); config_raw = Path(sys.argv[2]).read_bytes()
    result = analyze(json.loads(raw), json.loads(config_raw), hashlib.sha256(raw).hexdigest())
    result['configurationSHA256'] = hashlib.sha256(config_raw).hexdigest()
    with Path(sys.argv[3]).open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    print(json.dumps({'allWholeHistoryGatesPassed': result['allWholeHistoryGatesPassed'],
                      'comparisons': [{k: v for k, v in c.items() if k not in ('trace',)} for c in result['comparisons']]}, indent=2))
    if not result['allWholeHistoryGatesPassed']:
        raise SystemExit(1)
