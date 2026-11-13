"""Audit retained partial browser output without rerunning or replacing it."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

here=Path(__file__).resolve().parent; root=here.parents[2]; out=here/'results'
receipt=out/'continuation.json'
if receipt.exists(): raise FileExistsError('Preserve the prior continuation')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
packet=out/'browser.json'; before=sha(packet); records=[]
commands=[('controls-final',[sys.executable,'-m','unittest','discover','-s',str(here),'-p','test_reference.py','-v']),
    ('diagnosis',['/work/home/v75-deps/node_modules/.bin/tsx',str(here/'diagnose.ts')]),
    ('radau',[sys.executable,str(here/'reference.py')])]
for name,command in commands:
    with (out/'logs'/f'{name}.log').open('w') as log:
        code=subprocess.run(command,cwd=root,stdout=log,stderr=subprocess.STDOUT).returncode
    records.append(dict(name=name,command=command,exitCode=code)); print(name,code,flush=True)
if sha(packet)!=before: raise ValueError('Retained browser packet changed')
receipt.write_text(json.dumps(dict(browserSHA256=before,commands=records,python=sys.version,
    sourceSHA256={str(p.relative_to(root)):sha(p) for p in here.iterdir() if p.is_file()},
    artifactSHA256={str(p.relative_to(out)):sha(p) for p in out.rglob('*') if p.is_file() and p!=receipt},
    experimentalQualification=False),indent=2)+'\n')
raise SystemExit(0 if all(r['exitCode']==0 for r in records) else 1)
