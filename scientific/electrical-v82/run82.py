"""Offline VM study driver with per-command logs and an exact source receipt."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

HERE=Path(__file__).resolve().parent; ROOT=HERE.parent.parent


def main():
    out=HERE/'results'; (out/'logs').mkdir(parents=True,exist_ok=True)
    phase=sys.argv[1]; python=sys.executable
    commands={
        'predict':[
            ('unit',[python,'-m','unittest','test_access82','test_transport82','test_model82','test_audit82','-v']),
            ('access',[python,'access82.py','results/access-results.json']),('campaign',[python,'campaign82.py']),('optics',[python,'optics82.py']),
            ('compare',[python,'compare82.py']),
            ('electrical-audit',[python,'audit82.py','results/predictions.json','results/access-results.json','results/electrical-audit.json'])],
        'final':[
            ('electrical-controls-final',[python,'-m','unittest','test_access82','test_transport82','test_model82','test_audit82','-v']),
            ('electrical-audit-final',[python,'audit82.py','results/predictions.json','results/access-results.json','results/electrical-audit.json']),
            ('optical-audit-unit',[python,'-m','unittest','test_audit_optics82','test_compare82','test_campaign82','-v']),
            ('compare-final',[python,'compare82.py']),
            ('optical-audit',[python,'audit_optics82.py','results','results/optical-audit.json']),
            ('v79-controls',[python,'-m','unittest','discover','-s','../profile-v79','-p','test_*.py','-v']),
            ('v80-controls',[python,'-m','unittest','discover','-s','../optical-v80','-p','test_*.py','-v']),
            ('v81-controls',[python,'-m','unittest','discover','-s','../flow-v81','-p','test_*.py','-v']),
            ('app-test',['npm','test']),('typecheck',['npm','run','typecheck']),('build',['npm','run','build'])],
        'review':[
            ('audit-controls-review',[python,'-m','unittest','test_audit82','-v']),
            ('electrical-audit-review',[python,'audit82.py','results/predictions.json','results/access-results.json','results/electrical-audit.json'])]}
    receipt=dict(phase=phase,sourceSHA256={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()
        for p in HERE.glob('*.py')},commands=[])
    env={**os.environ,'OPENBLAS_NUM_THREADS':'1','OMP_NUM_THREADS':'1'}
    for name,command in commands[phase]:
        print('RUN',name,flush=True)
        cwd=ROOT if name in ('app-test','typecheck','build') else HERE
        with (out/'logs'/f'{name}.log').open('w') as log:
            code=subprocess.run(command,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT).returncode
        receipt['commands'].append(dict(name=name,command=command,exitCode=code))
        (out/f'execution-{phase}.json').write_text(json.dumps(receipt,indent=2)+'\n')
        print('EXIT',name,code,flush=True)
        if code: raise SystemExit(code)


if __name__=='__main__': main()
