"""Narrow regression, full scientific rerun and release gates; safe-dev only."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time

root = Path.cwd()
assert root == Path('/work/home/fix-v43-source')
out = Path(sys.argv[1]); out.mkdir(exist_ok=False)
python = sys.executable
commands = [
    ('regression-tests', ['node_modules/.bin/tsx', '--test', 'tests/fuel-momentum-v65.test.ts',
                          'tests/experimental-v64.test.ts', 'tests/fuel-centrifuge-independent-v44.test.ts',
                          'tests/fuel-centrifuge-scenario-v44.test.ts']),
    ('momentum-independent-tests', [python, '-m', 'unittest', 'discover', '-s', 'scientific/momentum-v65', '-p', 'test_*.py', '-v']),
    ('benchmark-independent-tests', [python, '-m', 'unittest', 'discover', '-s', 'scientific/experimental-v64', '-p', 'test_*.py', '-v']),
    ('study', [python, 'scientific/momentum-v65/run_study.py', str(out/'study')]),
    ('typecheck', ['npm', 'run', 'typecheck']),
    ('build', ['npm', 'run', 'build']),
    ('site', ['npm', 'run', 'check:site']),
    ('assets', ['npm', 'run', 'check:assets']),
]
records = []
for name, command in commands:
    start = time.monotonic()
    result = subprocess.run(command, capture_output=True, text=True, timeout=600)
    (out/(name+'.log')).write_text(result.stdout+'\n'+result.stderr)
    records.append({'name': name, 'command': command, 'exitCode': result.returncode, 'seconds': time.monotonic()-start})
    print(name, result.returncode, result.stdout[-400:], result.stderr[-400:], flush=True)
    if result.returncode:
        raise SystemExit(result.returncode)
release = {str(p.relative_to(root/'release')): hashlib.sha256(p.read_bytes()).hexdigest()
           for p in sorted((root/'release').rglob('*')) if p.is_file()}
expected = json.loads(Path('/work/home/features-v44-adaptive61d-final/release-sha256.json').read_text())
assert release == expected, 'Unexpected public release change from standalone qualification work'
manifest = json.loads(Path('v43-last-manifest.json').read_text())
receipt = {'commands': records, 'sourceSHA256': hashlib.sha256(json.dumps(manifest, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
           'inputs': len(manifest), 'releaseFiles': len(release),
           'releaseSHA256': hashlib.sha256(json.dumps(release, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
           'releaseByteIdenticalToDeployedFinalD': True,
           'newLiveBackend': False, 'experimentalValidation': False, 'freshBrowserTest': False}
(out/'receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')
print(json.dumps(receipt, indent=2))
