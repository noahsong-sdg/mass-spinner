"""Run final regression/build gates in the parent's offline safe-dev guest."""
import json
from pathlib import Path
import subprocess
import sys

folder = Path(sys.argv[1]); folder.mkdir(exist_ok=False)
checks = [
    ('scientific-tests', [sys.executable, '-m', 'unittest', 'discover', '-s', 'scientific/transient-v67', '-p', 'test_*.py']),
    ('application-tests', ['npm', 'test']),
    ('typecheck', ['npm', 'run', 'typecheck']),
    ('build', ['npm', 'run', 'build']),
    ('site', ['npm', 'run', 'check:site']),
    ('assets', ['npm', 'run', 'check:assets']),
]
receipts = []
for label, command in checks:
    result = subprocess.run(command, capture_output=True, text=True, timeout=360)
    (folder/(label+'.log')).write_text(result.stdout+'\n'+result.stderr)
    receipts.append({'label': label, 'command': command, 'exitCode': result.returncode})
    print(label, result.returncode, '\n'.join((result.stdout+'\n'+result.stderr).splitlines()[-12:]), flush=True)
(folder/'receipts.json').write_text(json.dumps(receipts, indent=2)+'\n')
raise SystemExit(0 if all(row['exitCode'] == 0 for row in receipts) else 1)
