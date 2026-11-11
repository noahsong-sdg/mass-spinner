"""Parent-owned offline assessment of retained v68 cases; no production imports.

CLI: python assess.py case|time|radial|axial|liner CASE_FOLDER NEW_OUTPUT_FOLDER
     case mode also takes an explicit case ID.
Pairs retain an exact, rehydratable gzip of the combined prediction bytes used
by the frozen v67 analyzers. Each original one-case packet is hash-bound too.
"""
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT/'transient-v67'))


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT/path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


history = module('resolved_history', 'transient-v67/analyze.py')
surface = module('resolved_surface', 'transient-v67/surface.py')
coupled = module('resolved_coupled', 'current-v66/check_coupled.py')
electrical = module('resolved_electrical', 'resolved-v68/electrical_history.py')


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def save(folder, name, value):
    with (folder/name).open('x') as stream:
        json.dump(value, stream, indent=2, allow_nan=False)
        stream.write('\n')


def main():
    mode, source, folder = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
    folder.mkdir(exist_ok=False)
    if mode == 'case':
        path = source/(sys.argv[4]+'.json')
        packet = json.loads(path.read_bytes())
        result = coupled.audit_packet(packet)
        # All accepted states above are audited. Corrupt only the first accepted
        # transition for controls, avoiding nine full-trajectory deep copies.
        case = packet['cases'][0]
        witness = {'sourceSHA256': packet['sourceSHA256'], 'cases': [dict(case,
            requestedSteps=1, steps=case['steps'][:1])]}
        result['negativeControls'] = coupled.negative_controls(witness)
        result['negativeControlScope'] = 'First accepted transition; complete original trajectory separately audited.'
        result['exportFileSHA256'] = sha(path)
        save(folder, 'conservation.json', result)
        print(json.dumps({'id': case['id'], 'allPassed': result['allPassed'],
                          'acceptedSteps': len(case['steps']), 'negativeControls': len(result['negativeControls'])}))
        return
    if mode not in history.AXES:
        raise ValueError('Explicit assessment axis required')
    specs = json.loads((Path(__file__).parent/'specifications.json').read_bytes())
    anchor = specs[0]['id']
    coarse = next(s['id'] for s in specs if s['id'].startswith(mode+'-'))
    paths = [source/(value+'.json') for value in (coarse, anchor)]
    packets = [json.loads(path.read_bytes()) for path in paths]
    if packets[0]['sourceSHA256'] != packets[1]['sourceSHA256'] or any(len(p['cases']) != 1 for p in packets):
        raise ValueError('Require common-source one-case packets')
    packet = {'sourceSHA256': packets[0]['sourceSHA256'], 'cases': [p['cases'][0] for p in packets]}
    digest = hashlib.sha256()
    # Hash precisely the uncompressed JSON stream, retaining those exact bytes.
    with gzip.open(folder/'combined.json.gz', 'xb') as stream:
        for piece in json.JSONEncoder(allow_nan=False, separators=(',', ':')).iterencode(packet):
            raw = piece.encode(); digest.update(raw); stream.write(raw)
    config = {'sourceSHA256': packet['sourceSHA256'], 'predictionSHA256': digest.hexdigest(),
              'pairs': [{'coarseID': coarse, 'fineID': anchor, 'axis': mode}]}
    save(folder, 'history-config.json', config)
    original = {str(path): sha(path) for path in paths}
    primary = history.analyze(packet, config, digest.hexdigest())
    save(folder, 'history.json', primary)
    physical = surface.analyze_surfaces(packet, config, digest.hexdigest())
    save(folder, 'surface.json', physical)
    econfig = {'sourceSHA256': packet['sourceSHA256'], 'pairs': [{
        'coarseFile': str(paths[0].resolve()), 'fineFile': str(paths[1].resolve()),
        'coarseSHA256': original[str(paths[0])], 'fineSHA256': original[str(paths[1])], 'axis': mode}]}
    save(folder, 'electrical-config.json', econfig)
    # Release the large original states before the independent comparator reload.
    del packet, packets
    electric = electrical.analyze(econfig)
    save(folder, 'electrical.json', electric)
    checkpoint_times = [.001*(m/128)**2 for m in (4, 8, 16, 32, 64, 128)]
    checkpoints = []
    for time in checkpoint_times:
        rows = {}
        for name, report in (('history', primary), ('surface', physical), ('electrical', electric)):
            matches = [r for r in report['comparisons'][0]['trace'] if history.close(r['timeS'], time)]
            if len(matches) != 1:
                raise ValueError('Fixed physical checkpoint missing or duplicated')
            rows[name] = matches[0]
        checkpoints.append({'timeS': time, **rows})
    summary = {'axis': mode, 'sourceSHA256': config['sourceSHA256'], 'originalPacketsSHA256': original,
               'combinedUncompressedSHA256': digest.hexdigest(), 'combinedGzipSHA256': sha(folder/'combined.json.gz'),
               'wholeHistoryPassed': primary['allWholeHistoryGatesPassed'],
               'physicalSurfacePassed': physical['allSurfaceGatesPassed'],
               'electricalIdentityPassed': electric['allIdentityGatesPassed'],
               'electricalRefinementPassed': electric['allElectricalHistoryRefinementGatesPassed'],
               'fixedPhysicalCheckpoints': checkpoints,
               'checkpointScope': 'Additional fixed times; does not replace all-shared-time or startup diagnostics.',
               'experimentalValidation': False, 'liveBackendChanged': False}
    save(folder, 'summary.json', summary)
    print(json.dumps({k: v for k, v in summary.items() if k != 'fixedPhysicalCheckpoints'}))
    if not all(summary[k] for k in ('wholeHistoryPassed', 'physicalSurfacePassed', 'electricalIdentityPassed', 'electricalRefinementPassed')):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
