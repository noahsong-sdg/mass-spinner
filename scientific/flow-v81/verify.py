"""Capture the exact tested research snapshot and required application checks."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

HERE=Path(__file__).parent
ROOT=HERE.parent.parent


def main():
    directory=HERE/'results'; logs=directory/'logs'; logs.mkdir(exist_ok=True)
    paths=list(HERE.glob('*.py'))+list(HERE.glob('*.md'))+list(HERE.glob('*.json'))
    paths+=list((ROOT/'src').rglob('*.ts'))+list((ROOT/'tests').rglob('*.ts'))
    paths+=[ROOT/name for name in ('package.json','package-lock.json','tsconfig.json','README.md')]
    receipt=dict(sourceSHA256={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},checks=[])
    env=dict(os.environ,OPENBLAS_NUM_THREADS='1',OMP_NUM_THREADS='1')
    commands=[('flow-tests',[sys.executable,'-m','unittest','discover','-s','scientific/flow-v81','-p','test_*.py','-v']),
              ('flow-audit',[sys.executable,'scientific/flow-v81/audit_flow.py','scientific/flow-v81/results/flow-predictions.json','scientific/profile-v79/results/predictions.json','scientific/flow-v81/results/flow-audit.json']),
              ('optical-prediction',[sys.executable,'scientific/flow-v81/optics.py']),
              ('optical-audit',[sys.executable,'scientific/flow-v81/audit_optics.py','scientific/flow-v81/results','scientific/flow-v81/results/optical-audit.json']),
              ('comparison',[sys.executable,'scientific/flow-v81/compare.py']),
              ('summary',[sys.executable,'scientific/flow-v81/summarize.py'])]
    commands += [(name+'-tests',[sys.executable,'-m','unittest','discover','-s','scientific/'+name,'-p','test_*.py','-v']) for name in ('profile-v79','optical-v80')]
    commands += [(name,['npm','run',name]) for name in ('test','typecheck','build')]
    for name,command in commands:
        print('Starting',name,flush=True); start=time.monotonic()
        with (logs/(name+'.log')).open('wb') as out:
            run=subprocess.run(command,cwd=ROOT,env=env,stdout=out,stderr=subprocess.STDOUT)
        receipt['checks'].append(dict(name=name,command=command,exitCode=run.returncode,seconds=time.monotonic()-start))
        (directory/'verification.json').write_text(json.dumps(receipt,indent=2)+'\n')
        print('Finished',name,run.returncode,flush=True)
        if run.returncode: raise SystemExit(run.returncode)
    receipt['flowPredictionSHA256']=hashlib.sha256((directory/'flow-predictions.json').read_bytes()).hexdigest()
    receipt['opticalIndexSHA256']=hashlib.sha256((directory/'optical-index.json').read_bytes()).hexdigest()
    (directory/'verification.json').write_text(json.dumps(receipt,indent=2)+'\n')


if __name__=='__main__': main()
