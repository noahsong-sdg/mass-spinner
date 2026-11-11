"""Read-only-production witness: execute only inside an existing safe-dev guest.

The assertions describe the current defect, not the required corrected behavior.
Two one-step, eight-representative plans isolate execution-mode propagation.
"""
import copy
import json
from pathlib import Path
import subprocess
import tempfile


root = Path(__file__).resolve().parents[2]
fixture = json.loads((root / 'tests/fixtures/rng-legacy-v33.json').read_text())
config = copy.deepcopy(fixture['config'])
config.update(particlesPerSpecies=8, collisions=False, dt=1e-7, duration=1e-7,
              randomSource='philox4x32-10-u32-v1')
plan = {
    'id': 'v42-mode-witness', 'description': 'One-step mode propagation witness',
    'seeds': [11, 22], 'levels': [{'id': 'tiny', 'config': config}],
    'comparisons': [],
    'tolerances': {
        'fraction': .01, 'radiusFraction': .01, 'temperatureEV': .1,
        'timeFraction': .02, 'normalizedAngularMomentum': .001,
        'maxRawMomentumResidual': .001, 'maxUnresolvedExposure': .01,
        'minimumSeeds': 2,
    },
}

with tempfile.TemporaryDirectory(prefix='v42-cli-mode-') as temporary:
    directory = Path(temporary)
    results = {}
    for label in ('legacy-omitted', 'research'):
        declared = copy.deepcopy(plan)
        if label == 'research':
            declared['executionMode'] = 'research'
        input_path = directory / (label + '.plan.json')
        output_path = directory / (label + '.json')
        input_path.write_text(json.dumps(declared))
        command = ['node', '--import', 'tsx', 'scripts/run-convergence.ts',
                   '--plan', str(input_path), '--output', str(output_path)]
        process = subprocess.run(command, cwd=root, capture_output=True,
                                 text=True, timeout=45)
        assert process.returncode == 0, process.stderr
        artifact = json.loads(output_path.read_text())
        result = {
            'case': label, 'declaredMode': declared.get('executionMode', 'interactive'),
            'runModes': [run['executionMode'] for run in artifact['runs']],
            'runStatuses': [run['status'] for run in artifact['runs']],
            'gate': artifact['summary']['status'],
            'batchFailures': [check for check in artifact['summary']['checks']
                              if check['name'].endswith('complete batch')],
            'sourceHash': artifact['sourceHash'],
        }
        results[label] = result
        print(json.dumps(result), flush=True)
    assert results['legacy-omitted']['runModes'] == ['interactive', 'interactive']
    assert results['legacy-omitted']['runStatuses'] == ['complete', 'complete']
    assert results['legacy-omitted']['gate'] == 'unknown'
    assert not results['legacy-omitted']['batchFailures']
    assert results['research']['runModes'] == ['interactive', 'interactive']
    assert results['research']['runStatuses'] == ['complete', 'complete']
    assert results['research']['gate'] == 'fail'
    assert results['research']['batchFailures'][0]['status'] == 'fail'
    print('OBSERVED DEFECT: accepted research plan executes interactive runs and rejects its own batch.')
