"""Bounded application gate; execute only inside the copied safe-dev guest."""
import hashlib
import json
from pathlib import Path
import subprocess
import time

root=Path('/work/project')
source=root/'tested-source-v19.json'
mapping=json.loads(source.read_text())
for name,expected in mapping.items():
    if hashlib.sha256((root/name).read_bytes()).hexdigest()!=expected:
        raise ValueError('Copied source differs: '+name)
out=root/'verification-v19'
out.mkdir(exist_ok=False)
(out/'tested-source-v19.json').write_bytes(source.read_bytes())
checks=[]
for name,command in [('test',['npm','test']),('typecheck',['npm','run','typecheck']),
                     ('build',['npm','run','build']),('site',['npm','run','check:site'])]:
    start=time.monotonic()
    with (out/(name+'.log')).open('x') as log:
        result=subprocess.run(command,cwd=root,stdout=log,stderr=subprocess.STDOUT)
    checks.append({'command':command,'exitCode':result.returncode,'wallS':time.monotonic()-start})
    if result.returncode:
        break
(out/'checks.json').write_text(json.dumps(checks,indent=2)+'\n')
manifest={str(p.relative_to(root/'release')):hashlib.sha256(p.read_bytes()).hexdigest()
          for p in (root/'release').rglob('*') if p.is_file()} if (root/'release').exists() else {}
(out/'release-sha256.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'sourceMapSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'checks':checks,'releaseFiles':len(manifest)}))
raise SystemExit(any(c['exitCode'] for c in checks))
