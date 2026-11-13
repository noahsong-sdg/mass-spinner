"""Offline narrow gate; preserve every command log and refuse result overwrite."""
from datetime import datetime,timezone
import hashlib
import json
from pathlib import Path
import platform
import subprocess
import sys

here=Path(__file__).resolve().parent; root=here.parents[2]; out=here/'results'
if out.exists(): raise FileExistsError('Preserve old results before a new attempt')
(out/'logs').mkdir(parents=True)
commands=[('controls',[sys.executable,'-m','unittest','discover','-s',str(here),'-p','test_reference.py','-v']),
    ('browser',['/work/home/v75-deps/node_modules/.bin/tsx',str(here/'export.ts')]),
    ('radau',[sys.executable,str(here/'reference.py')])]
receipt=dict(startedUTC=datetime.now(timezone.utc).isoformat(),python=sys.version,platform=platform.platform(),
    network='offline safe-dev',commands=[],sourceSHA256={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(here.iterdir()) if p.is_file()},experimentalQualification=False)
for name,command in commands:
    with (out/'logs'/f'{name}.log').open('w') as log:
        code=subprocess.run(command,cwd=root,stdout=log,stderr=subprocess.STDOUT).returncode
    receipt['commands'].append(dict(name=name,command=command,exitCode=code))
    receipt['finishedUTC']=datetime.now(timezone.utc).isoformat()
    receipt['artifactSHA256']={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(out.rglob('*')) if p.is_file() and p.name!='execution.json'}
    (out/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(name,code,flush=True)
    if code: raise SystemExit(code)
