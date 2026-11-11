"""Bounded offline verification runner; execute in the safe-dev source copy."""
import hashlib
import json
from pathlib import Path
import subprocess

root=Path('.')
inputs={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for directory in ('src','tests','scripts','scientific','web-assets')
        for p in (root/directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts}
for name in ('package.json','package-lock.json','tsconfig.json'):
    inputs[name]=hashlib.sha256((root/name).read_bytes()).hexdigest()
commands=[['node','--import','tsx','--test','tests/collector-acceptance-v38.test.ts','tests/research-distribution-v38.test.ts',
           'tests/depth-ui-v38.test.ts','tests/research-controls-v20.test.ts','tests/hydrogen-charge-exchange-v38.test.ts'],
          ['node_modules/.bin/tsc','--noEmit','--strict','--target','ES2022','--module','NodeNext',
           'src/collector-acceptance.ts','src/research-distribution.ts','src/hydrogen-charge-exchange.ts']]
results=[]
for i,command in enumerate(commands):
    run=subprocess.run(command,capture_output=True,text=True)
    log=f'depth-v38-gate-{i}.log';Path(log).write_text(run.stdout+run.stderr)
    results.append({'command':command,'exitCode':run.returncode,'log':log})
packet={'snapshot':'safe-dev-d1fcc58287ea69d9 explicit sync of /tmp/mass-spinner-depth-v38','inputsSHA256':inputs,'checks':results}
Path('depth-v38-gates.json').write_text(json.dumps(packet,indent=2)+'\n')
print(json.dumps(results))
raise SystemExit(any(r['exitCode'] for r in results))
