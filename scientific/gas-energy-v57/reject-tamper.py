"""Independent-audit rejection controls; execute only inside safe-dev."""
import argparse
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    raw = args.input.read_bytes()
    packet = json.loads(gzip.decompress(raw) if args.input.suffix == '.gz' else raw)
    path = Path(__file__).with_name('audit-independent.py')
    spec = importlib.util.spec_from_file_location('independent_energy_audit', path)
    audit = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(audit)
    # Choose a resolved nontrivial case rather than an all-zero equilibrium.
    candidates = [(abs(s['interfaceEnergyJ']), i, j)
                  for i, case in enumerate(packet['cases']) for j, s in enumerate(case['states'][1:], 1)]
    amplitude, case_index, state_index = max(candidates)
    assert amplitude > 0
    base = packet['cases'][case_index]
    audit.checked_case(base)
    outcomes = []
    args.output.parent.mkdir(parents=True, exist_ok=True)
    for kind in ['missing-interface-heat', 'shell-work-volume', 'negative-particle-number', 'extra-Cp-storage-energy']:
        changed = copy.deepcopy(base)
        if kind == 'missing-interface-heat':
            changed['states'][state_index]['interfaceEnergyJ'] = 0.
        elif kind == 'shell-work-volume':
            changed['states'][state_index]['gasEdgesM'][1] *= 1.001
        elif kind == 'negative-particle-number':
            changed['particleNumbers'][0] *= -1
        else:
            # Cp-Cv=NkB. This adds the exact fictitious storage energy that
            # would arise from replacing internal Cv storage by Cp storage.
            before, after = changed['states'][state_index-1], changed['states'][state_index]
            perturbations = [audit.KB*n*(b-a) for n, a, b in
                             zip(changed['particleNumbers'], before['gasK'], after['gasK'], strict=True)]
            assert max(map(abs, perturbations)) > 0
            after['gasSourceJ'] = [a+b for a, b in zip(after['gasSourceJ'], perturbations, strict=True)]
        content = json.dumps({'cases': [changed]}, allow_nan=False).encode()
        target = args.output.parent/f'{kind}.json.gz'
        target.write_bytes(gzip.compress(content, mtime=0))
        try:
            audit.checked_case(changed)
        except (AssertionError, ValueError, FloatingPointError) as error:
            outcomes.append({'control': kind, 'rejected': True, 'message': str(error),
                             'inputFile': target.name, 'inputSHA256': hashlib.sha256(target.read_bytes()).hexdigest()})
        else:
            raise AssertionError(f'Independent audit accepted corruption: {kind}')
    result = {'allRejected': True, 'controlCase': base['name'], 'controls': outcomes,
              'sourceResultsSHA256': hashlib.sha256(raw).hexdigest(),
              'auditorSHA256': hashlib.sha256(path.read_bytes()).hexdigest(),
              'scriptSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    args.output.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
