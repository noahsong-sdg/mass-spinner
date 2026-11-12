"""Offline receipts; parent explicitly syncs host sources before execution."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

HERE=Path(__file__).resolve().parent; ROOT=HERE.parent.parent


def main():
    phase=sys.argv[1]; py=sys.executable
    commands={'flow':[('controls',[py,'-m','unittest','test_model84','test_reference84','-v']),('campaign',[py,'campaign84.py'])],
              'optics':[('optics',[py,'optics84.py'])],
              'final':[('all-controls',[py,'-m','unittest','discover','-p','test_*84.py','-v']),
                       ('audit',[py,'audit84.py','results/predictions.json','results/audit.json']),
                       ('compare',[py,'compare84.py']),
                       ('optical-audit',[py,'audit_optics84.py','results','results/optical-audit.json']),
                       ('app-test',['npm','test']),
                       ('typecheck',['npm','run','typecheck']),('build',['npm','run','build'])]}
    directory=HERE/'results'; (directory/'logs').mkdir(parents=True,exist_ok=True)
    receipt=dict(sourceSHA256={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.glob('*.py')},commands=[])
    for name,command in commands[phase]:
        print('RUN',name,flush=True); cwd=ROOT if name in ('app-test','typecheck','build') else HERE
        with (directory/'logs'/f'{name}.log').open('w') as log:
            process=subprocess.Popen(command,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
            for line in process.stdout:
                log.write(line); log.flush()
                if name in ('campaign','optics'): print(line.rstrip(),flush=True)
            code=process.wait()
        receipt['commands'].append(dict(name=name,command=command,exitCode=code))
        (directory/f'execution-{phase}.json').write_text(json.dumps(receipt,indent=2)+'\n')
        print('EXIT',name,code,flush=True)
        if code: raise SystemExit(code)


if __name__=='__main__': main()
