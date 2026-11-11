"""Offline safe-dev acceptance; retain failures and logs without hiding later checks."""
import json
from pathlib import Path
import subprocess
import sys
import time

folder = Path(sys.argv[1]); folder.mkdir(exist_ok=False)
python = sys.executable
scripts = Path('scientific/current-v66')
commands = [
    ('electrical', [python, str(scripts/'run_study.py'), str(folder/'electrical')]),
    ('analysis-tests', [python, '-m', 'unittest', 'discover', '-s', str(scripts), '-p', 'test_analysis.py']),
    ('q-momentum-fipy', [python, str(scripts/'reference_q_momentum.py'), str(folder/'q-momentum-fipy.json')]),
    ('coupled', ['node_modules/.bin/tsx', str(scripts/'coupled.ts'), str(folder/'coupled.json'), '[8,16,32,64]']),
    ('coupled-independent', [python, str(scripts/'check_coupled.py'), str(folder/'coupled.json'), str(folder/'coupled-audit.json')]),
    ('coupled-refinement', [python, str(scripts/'coupled_convergence.py'), str(folder/'coupled.json'), str(folder/'coupled-convergence.json')]),
    ('tests', ['npm', 'test']),
    ('typecheck', ['npm', 'run', 'typecheck']),
    ('build', ['npm', 'run', 'build']),
    ('site', ['npm', 'run', 'check:site']),
    ('assets', ['npm', 'run', 'check:assets']),
]
receipts = []
for label, command in commands:
    started = time.monotonic()
    result = subprocess.run(command, capture_output=True, text=True, timeout=600)
    (folder/(label+'.log')).write_text(result.stdout+'\n'+result.stderr)
    receipt = {'label': label, 'command': command, 'exitCode': result.returncode,
               'seconds': time.monotonic()-started}
    receipts.append(receipt)
    print(json.dumps(receipt), flush=True)
    (folder/'receipts.json').write_text(json.dumps(receipts, indent=2)+'\n')
raise SystemExit(0 if all(r['exitCode'] == 0 for r in receipts) else 1)
