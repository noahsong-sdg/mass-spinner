"""Independent evolving-current reconstruction; parent executes in safe-dev.

CLI: python electrical_history.py CONFIG.json NEW_OUTPUT.json
Packets contain one complete case, initialElectrical, and accepted electrical
states. Config binds their raw bytes and common simulation source. No production
imports, temporal interpolation, inferred pairs, or positive signal floors.
"""
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import sys


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).resolve().parent.parent/relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


history = load_module('electrical_history_v67', 'transient-v67/analyze.py')
current = load_module('electrical_current_v66', 'current-v66/analyze.py')
POWERS = ('electrodePowerW', 'jouleW', 'mechanicalW')
TERMINALS = ('inner', 'outer', 'lower', 'upper')


def digest(value, name):
    if not isinstance(value, str) or re.fullmatch('[0-9a-f]{64}', value) is None:
        raise ValueError(name+': lowercase SHA256 required')
    return value


def scalar(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(name+': finite scalar required')
    return float(value)


def vector(value, size, name):
    if not isinstance(value, list) or len(value) != size:
        raise ValueError(name+': array/grid length mismatch')
    return [scalar(v, name) for v in value]


def gate(name, error, scale, limit=1e-9):
    value = history.ratio(abs(float(error)), float(scale))
    return {'name': name, 'absoluteError': abs(float(error)), 'scale': float(scale),
            'relativeError': value, 'limit': limit, 'passed': value is not None and value <= limit}


def projected_gate(name, supplied, expected, nr, nz):
    # The radial gas feels the axial sum. Large opposing axial torques must
    # not supply the scale for validating that much smaller projected torque.
    actual = [math.fsum(supplied[j*nr+i] for j in range(nz)) for i in range(nr)]
    target = [math.fsum(expected[j*nr+i] for j in range(nz)) for i in range(nr)]
    return gate(name, math.fsum(abs(a-b) for a, b in zip(actual, target)),
                math.fsum(abs(v) for v in target))


def reconstruct_case(plan):
    case = plan['case']; spec = case['setup']['electrical']
    nr, nz = len(plan['q'])-1, len(plan['z'])-1
    size = nr*nz
    for key, length in (('sigmaPerpSM', size), ('sigmaParallelSM', size)):
        if any(v <= 0 for v in vector(spec[key], length, key)):
            raise ValueError('Electrical conductivity must be positive')
    for key, length in (('innerVoltageV', nz), ('outerVoltageV', nz), ('lowerVoltageV', nr), ('upperVoltageV', nr)):
        if not isinstance(spec[key], list) or len(spec[key]) != length:
            raise ValueError(key+': electrode/grid length mismatch')
        for v in spec[key]:
            if v is not None:
                scalar(v, key)
    if not any(v is not None for key in ('innerVoltageV', 'outerVoltageV', 'lowerVoltageV', 'upperVoltageV') for v in spec[key]):
        raise ValueError('Electrical gauge requires a physical voltage electrode')
    if any(v is not None for v in spec['innerVoltageV']):
        raise ValueError('Full-cylinder axis cannot be a voltage electrode')
    scalar(spec['magneticT'], 'magneticT')
    electrical = [case['initialElectrical']]+[r['result']['electrical'] for r in case['steps']]
    omega = [case['initialState']['omegaRadS']]+[r['result']['sourceOmegaRadS'] for r in case['steps']]
    rows, gates = [], []
    for index, (time, output, source) in enumerate(zip(plan['times'], electrical, omega)):
        source = vector(source, nr, 'actual sourceOmegaRadS')
        inputs = dict(spec, omegaRadS=source*nz)
        vector(output['potentialV'], size, 'potentialV')
        rebuilt = current.reconstruct(inputs, output, 'integrated')
        heat, torque = list(map(float, rebuilt['heat'])), list(map(float, rebuilt['torque']))
        projected_heat = [math.fsum(heat[j*nr+i] for j in range(nz)) for i in range(nr)]
        projected_torque = [math.fsum(torque[j*nr+i] for j in range(nz)) for i in range(nr)]
        pscale, iscale = rebuilt['powerScale'], rebuilt['currentScale']
        tscale = math.fsum(abs(v) for v in torque)
        residual = list(map(float, rebuilt['cellResidual']))
        boundary = list(map(float, rebuilt['boundary']))
        local = [gate('cell charge', max(map(abs, residual)), iscale),
                 gate('boundary charge', math.fsum(boundary), iscale),
                 gate('electrical work', rebuilt['electrodePowerW']-rebuilt['jouleW']-rebuilt['mechanicalW'], pscale)]
        for key in POWERS:
            local.append(gate('reported '+key, scalar(output[key], key)-rebuilt[key], pscale))
        local.append(gate('reported energyResidualW', scalar(output['energyResidualW'], 'energyResidualW')-
                          (rebuilt['electrodePowerW']-rebuilt['jouleW']-rebuilt['mechanicalW']), pscale))
        for key, expected, scale in (('jouleByCellW', heat, pscale), ('torqueNm', torque, tscale),
                                     ('cellCurrentResidualA', residual, iscale)):
            values = vector(output[key], size, key)
            local.append(gate('reported '+key, math.fsum(abs(a-b) for a, b in zip(values, expected)), scale))
            if key in ('jouleByCellW', 'torqueNm'):
                local.append(projected_gate('reported projected '+key, values, expected, nr, nz))
        local.append(gate('reported charge maximum', scalar(output['maxCellCurrentResidualA'], 'maxCellCurrentResidualA')-
                          max(map(abs, residual)), iscale))
        local.append(gate('reported boundary net', scalar(output['netBoundaryCurrentA'], 'netBoundaryCurrentA')-
                          math.fsum(boundary), iscale))
        supplied_boundary = vector(output['boundaryCurrentsA'], len(boundary), 'boundaryCurrentsA')
        # Production and independent traversals can enumerate the same physical
        # electrode faces in different orders. Compare their signed multiset.
        local.append(gate('reported boundary currents', math.fsum(abs(a-b) for a, b in
                          zip(sorted(supplied_boundary), sorted(boundary))), iscale))
        if any(v < 0 for v in heat):
            raise ValueError('Negative reconstructed dissipative Joule heat')
        terminals = {'inner': -math.fsum(map(float, rebuilt['radial'][:, 0])),
                     'outer': math.fsum(map(float, rebuilt['radial'][:, -1])),
                     'lower': -math.fsum(map(float, rebuilt['axial'][0, :])),
                     'upper': math.fsum(map(float, rebuilt['axial'][-1, :]))}
        rows.append({'timeS': time, 'sourceIndex': index, **{key: float(rebuilt[key]) for key in POWERS},
                     'projectedTorqueNm': projected_torque, 'projectedJouleW': projected_heat,
                     'terminalCurrentA': terminals, 'powerScaleW': pscale, 'currentScaleA': iscale,
                     'torqueScaleNm': math.fsum(abs(v) for v in projected_torque),
                     'allIdentityGatesPassed': all(g['passed'] for g in local), 'gates': local})
        gates.extend(local)
    return {'id': case['id'], 'initialAndAcceptedStates': len(rows), 'states': rows,
            'allIdentityGatesPassed': all(g['passed'] for g in gates)}


def compare(a, b, ar, br, axis):
    history.validate_setup(a, b, axis)
    shared = history.shared_indices(a, b)
    weights = history.overlap(a['q'], b['q'])
    scales = {'powerW': max(row['powerScaleW'] for case in (ar, br) for row in case['states']),
              'torqueNm': max(row['torqueScaleNm'] for case in (ar, br) for row in case['states']),
              'jouleW': max(row['jouleW'] for case in (ar, br) for row in case['states']),
              'currentA': max(row['currentScaleA'] for case in (ar, br) for row in case['states'])}
    limit = .01 if axis == 'time' else .02
    trace = []
    for ia, ib in enumerate(shared):
        ca, cb = ar['states'][ia], br['states'][ib]
        errors = {key: (abs(ca[key]-cb[key]), scales['powerW']) for key in POWERS}
        for key, scale in (('projectedTorqueNm', 'torqueNm'), ('projectedJouleW', 'jouleW')):
            mapped = history.project_inventory(cb[key], weights)
            errors[key] = (math.fsum(abs(x-y) for x, y in zip(ca[key], mapped)), scales[scale])
        for terminal in TERMINALS:
            errors[terminal+'CurrentA'] = (abs(ca['terminalCurrentA'][terminal]-cb['terminalCurrentA'][terminal]), scales['currentA'])
        trace.append({'timeS': a['times'][ia], 'coarseIndex': ia, 'fineIndex': ib,
                      'gates': [gate(key, error, scale, limit) for key, (error, scale) in errors.items()]})
    maxima = []
    for gi in range(len(trace[0]['gates'])):
        # Undefined positive/zero errors sort above every defined relative norm.
        worst = max(trace, key=lambda row: (row['gates'][gi]['relativeError'] is None,
                                            row['gates'][gi]['relativeError'] or 0.))
        maxima.append(dict(worst['gates'][gi], worstTimeS=worst['timeS']))
    return {'coarseID': a['case']['id'], 'fineID': b['case']['id'], 'axis': axis,
            'sharedInitialAndAcceptedTimes': len(shared), 'fineOnlyAcceptedTimes': len(b['times'])-len(shared),
            'fineOnlyTimesQualification': 'identity checks only; no interpolated refinement comparison',
            'naturalHistoryScales': scales, 'trace': trace, 'maxima': maxima,
            'allElectricalHistoryRefinementGatesPassed': all(g['passed'] for row in trace for g in row['gates'])}


def analyze(config, base_dir=Path('.')):
    source = digest(config['sourceSHA256'], 'sourceSHA256')
    pairs = config['pairs']
    if not isinstance(pairs, list) or not pairs:
        raise ValueError('Explicit nonempty electrical comparison pairs required')
    loaded, identities, seen, comparisons = {}, {}, set(), []

    def load(filename, expected):
        if not isinstance(filename, str) or not filename or Path(filename).suffix != '.json':
            raise ValueError('Explicit JSON packet filename required')
        path = (Path(base_dir)/filename).resolve(); expected = digest(expected, 'packet SHA256')
        if path in loaded:
            if loaded[path][0] != expected:
                raise ValueError('Same filename has conflicting packet hashes')
            return loaded[path][1:]
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected:
            raise ValueError('Stale packet hash: '+filename)
        packet = json.loads(raw)
        if packet['sourceSHA256'] != source:
            raise ValueError('Stale simulation source hash: '+filename)
        if not isinstance(packet['cases'], list) or len(packet['cases']) != 1:
            raise ValueError('Exactly one complete case per electrical packet required')
        case = packet['cases'][0]
        if not isinstance(case['id'], str) or not case['id']:
            raise ValueError('Nonempty case identity required')
        if case['id'] in identities and identities[case['id']] != path:
            raise ValueError('Case identity reused by another packet filename')
        identities[case['id']] = path
        plan = history.prepare(case); result = reconstruct_case(plan)
        loaded[path] = (expected, plan, result)
        return plan, result

    for pair in pairs:
        if set(pair) != {'coarseFile', 'fineFile', 'coarseSHA256', 'fineSHA256', 'axis'} or pair['axis'] not in history.AXES:
            raise ValueError('Explicit filenames, hashes and single valid axis required')
        a, ar = load(pair['coarseFile'], pair['coarseSHA256'])
        b, br = load(pair['fineFile'], pair['fineSHA256'])
        identity = (ar['id'], br['id'], pair['axis'])
        if ar['id'] == br['id'] or identity in seen:
            raise ValueError('Duplicate or self electrical comparison')
        seen.add(identity)
        comparisons.append(compare(a, b, ar, br, pair['axis']))
    cases = [item[2] for item in loaded.values()]
    identity_pass = all(case['allIdentityGatesPassed'] for case in cases)
    refinement_pass = all(row['allElectricalHistoryRefinementGatesPassed'] for row in comparisons)
    return {'sourceSHA256': source, 'packetInputs': [{'file': str(path), 'SHA256': item[0]} for path, item in loaded.items()],
            'definition': 'integrated independent current reconstruction; extensive q-overlap; initial plus shared accepted times',
            'terminalDefinition': 'outward current summed on each physical inner/outer/lower/upper side; scale sums absolute electrode-face currents',
            'cases': cases, 'comparisons': comparisons, 'allIdentityGatesPassed': identity_pass,
            'allElectricalHistoryRefinementGatesPassed': refinement_pass, 'allPassed': identity_pass and refinement_pass}


if __name__ == '__main__':
    config_path, output = map(Path, sys.argv[1:])
    if output.exists():
        raise ValueError('Output already exists; retained evidence must not be overwritten')
    raw = config_path.read_bytes()
    result = analyze(json.loads(raw), config_path.resolve().parent)
    result['configurationSHA256'] = hashlib.sha256(raw).hexdigest()
    output.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    sys.exit(0 if result['allPassed'] else 1)
