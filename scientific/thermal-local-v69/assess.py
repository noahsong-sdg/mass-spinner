"""Explicit fixed-time pairs, unchanged legacy gates, and endpoint gas diagnostic.

Parent executes offline only. CLI:
 python assess.py case PACKET.json NEW_FOLDER
 python assess.py time|liner COARSE.json FINE.json NEW_FOLDER
"""
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT/'transient-v67'))


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT/filename)
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result)
    return result


history = module('local_history', 'transient-v67/analyze.py')
surface = module('local_surface', 'transient-v67/surface.py')
current = module('local_current', 'current-v66/check_coupled.py')
electric = module('local_electric', 'resolved-v68/electrical_history.py')


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def save(folder, name, data):
    with (folder/name).open('x') as stream:
        json.dump(data, stream, indent=2, allow_nan=False)
        stream.write('\n')


def endpoint_gas(a, b):
    cells = []
    for i, (coarse, fine) in enumerate(zip(a['t'][-1], b['t'][-1])):
        signal = max(abs(row[i]-b['t'][0][i]) for row in b['t'])
        error = abs(coarse-fine)
        allowance = 64*sys.float_info.epsilon*(abs(coarse)+abs(fine)+abs(a['t'][0][i])+abs(b['t'][0][i]))
        relative = history.ratio(error, signal)
        cells.append({'cell': i, 'rawDifferenceK': error, 'fineCausalExcursionK': signal,
                      'relativeError': relative, 'temperatureRoundoffAllowanceK': allowance,
                      'resolvedReferenceSignal': signal > allowance,
                      'passed': relative <= .01 if signal > allowance and relative is not None else None})
    resolved = [row for row in cells if row['resolvedReferenceSignal']]
    reversal_resolved = len(cells) > 1 and cells[1]['resolvedReferenceSignal']
    passed = bool(resolved) and reversal_resolved and all(row['passed'] for row in resolved)
    return {'definition': 'Fixed physical endpoint error / per-cell fine causal excursion; no floor.',
            'timeS': a['times'][-1], 'cells': cells, 'knownReversalCell': 1,
            'knownReversalCellResolved': reversal_resolved,
            'allResolvedEndpointGatesPassed': bool(resolved) and all(row['passed'] for row in resolved),
            'allCellsResolved': bool(cells) and len(resolved) == len(cells),
            'qualified': passed, 'uniformAllTimeLocalAccuracyClaimed': False}


def main():
    axis = sys.argv[1]
    paths = [Path(p).resolve() for p in (sys.argv[2:3] if axis == 'case' else sys.argv[2:4])]
    folder = Path(sys.argv[-1]); folder.mkdir(exist_ok=False)
    packets = [json.loads(p.read_bytes()) for p in paths]
    if any(len(p['cases']) != 1 for p in packets) or len({p['sourceSHA256'] for p in packets}) != 1:
        raise ValueError('Need common-source one-case packets')
    if axis == 'case':
        report = current.audit_packet(packets[0]); case = packets[0]['cases'][0]
        witness = {'sourceSHA256': packets[0]['sourceSHA256'], 'cases': [dict(case, requestedSteps=1, steps=case['steps'][:1])]}
        report['negativeControls'] = current.negative_controls(witness)
        report['negativeControlScope'] = 'First accepted transition; every original accepted transition separately audited.'
        report['exportFileSHA256'] = sha(paths[0]); save(folder, 'conservation.json', report)
        print(json.dumps({'allPassed': report['allPassed'], 'acceptedSteps': len(case['steps'])}))
        return
    if axis not in ('time', 'liner'):
        raise ValueError('Explicit supported single refinement axis required')
    packet = {'sourceSHA256': packets[0]['sourceSHA256'], 'cases': [p['cases'][0] for p in packets]}
    digest = hashlib.sha256()
    with gzip.open(folder/'combined.json.gz', 'xb') as stream:
        for piece in json.JSONEncoder(separators=(',', ':'), allow_nan=False).iterencode(packet):
            raw = piece.encode(); digest.update(raw); stream.write(raw)
    pair = {'coarseID': packet['cases'][0]['id'], 'fineID': packet['cases'][1]['id'], 'axis': axis}
    config = {'sourceSHA256': packet['sourceSHA256'], 'predictionSHA256': digest.hexdigest(), 'pairs': [pair]}
    save(folder, 'config.json', config)
    primary = history.analyze(packet, config, digest.hexdigest()); save(folder, 'history.json', primary)
    physical = surface.analyze_surfaces(packet, config, digest.hexdigest()); save(folder, 'surface.json', physical)
    a, b = [history.prepare(p['cases'][0]) for p in packets]
    history.validate_setup(a, b, axis); shared = history.shared_indices(a, b)
    endpoint = endpoint_gas(a, b)
    save(folder, 'endpoint-gas.json', endpoint)
    requires_endpoint = axis == 'time' and all(p['cases'][0]['id'].startswith('gas-') for p in packets)
    source = packet['sourceSHA256']; del packet, packets, a, b
    econfig = {'sourceSHA256': source, 'pairs': [{'axis': axis, 'coarseFile': str(paths[0]), 'fineFile': str(paths[1]),
                 'coarseSHA256': sha(paths[0]), 'fineSHA256': sha(paths[1])}]}
    save(folder, 'electrical-config.json', econfig)
    electrical = electric.analyze(econfig); save(folder, 'electrical.json', electrical)
    accepted = primary['allWholeHistoryGatesPassed'] and physical['allSurfaceGatesPassed'] and electrical['allPassed']
    summary = {'pair': pair, 'sourceSHA256': source, 'originalPacketsSHA256': {str(p): sha(p) for p in paths},
               'combinedUncompressedSHA256': digest.hexdigest(), 'combinedGzipSHA256': sha(folder/'combined.json.gz'),
               'legacyGlobalGatesPassed': accepted,
               'resolvedEndpointGasGatesPassed': endpoint['allResolvedEndpointGatesPassed'],
               'allEndpointGasSignalsResolved': endpoint['allCellsResolved'],
               'endpointGasQualified': endpoint['qualified'], 'endpointGateRequired': requires_endpoint,
               'allRequiredGatesPassed': accepted and (not requires_endpoint or endpoint['qualified']),
               'sharedInitialAndAcceptedTimes': len(shared), 'fineOnlyTimesNotCompared': electrical['comparisons'][0]['fineOnlyAcceptedTimes'],
               'experimentalValidation': False, 'liveBackendChanged': False}
    save(folder, 'summary.json', summary); print(json.dumps(summary))
    if not summary['allRequiredGatesPassed']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
