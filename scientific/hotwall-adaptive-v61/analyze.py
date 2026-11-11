"""Retain every result; gate only the explicit live refined numerical policy.

VM only: analyze.py OUTPUT.json FULL_REFERENCE EARLY_REFERENCE CASE_DIRECTORY...
Fourier-limit packets use the independent finite-wall Robin bracket. Rotating
packets use unchanged v60 common-annulus startup comparisons. Other tolerances
and meshes are convergence controls, never silently promoted to live policy.
"""
import importlib.util
import json
from pathlib import Path
import sys


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


reference = module('v61_reference', 'reference-compare.py')
robin = module('v61_robin', 'robin-adaptive.py')
output, full, early, *folders = sys.argv[1:]
assert folders
paths = [p for folder in folders for p in sorted(Path(folder).glob('*.json'))]
assert paths and len(paths) == len(set(paths))
mixture, fourier, promoted = [], [], []
for path in paths:
    packet = json.loads(path.read_text())
    (fourier if packet['config']['currentA'] == 0 else mixture).append(path)
    accuracy = packet['operation']['thermal']['gas']['accuracy']
    if packet['record']['cells'] == 256 and accuracy['relativeTolerance'] == 6.25e-7:
        assert accuracy['temperatureToleranceK'] == 1e-7
        promoted.append(str(path))
result = {'mixture': reference.analyze(full, early, mixture) if mixture else None,
          'fourier': [robin.analyze_case(p) for p in fourier],
          'qualifiedPolicy': {'cells': 256, 'relativeTolerance': 6.25e-7, 'temperatureToleranceK': 1e-7},
          'failuresOfOtherPoliciesAreRetained': True}
comparisons = (result['mixture']['comparisons'] if mixture else []) + result['fourier']
checks = {c.get('source', (c.get('candidateSources') or [None])[0]): c['allAccuracyGatesPassed']
          for c in comparisons}
assert promoted, 'No live refined-policy candidate was assessed.'
result['livePolicyGates'] = {p: checks[p] for p in promoted}
Path(output).write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'livePolicyGates': result['livePolicyGates'],
                  'allCases': {p: passed for p, passed in checks.items()}}, indent=2))
assert all(result['livePolicyGates'].values()), 'Live refined policy failed an unchanged accuracy gate.'
