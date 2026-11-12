"""Offline execution receipts; predicted fields are sealed before comparison."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

HERE=Path(__file__).resolve().parent; ROOT=HERE.parent.parent


def main():
    phase=sys.argv[1]; py=sys.executable
    commands={
        'flow':[('controls',[py,'-m','unittest','test_diagnostics85','test_campaign85','-v']),('campaign',[py,'campaign85.py'])],
        'optics':[('optics',[py,'replay85.py','optics'])],
        'final':[('all-controls',[py,'-m','unittest','discover','-p','test_*85.py','-v']),
                 ('audit',[py,'audit85.py','results/predictions.json','results/audit.json']),
                 ('compare',[py,'replay85.py','compare']),
                 ('optical-audit',[py,'../boundary-v84/audit_optics84.py','results','results/optical-audit.json']),
                 ('summarize',[py,'summarize85.py']),('app-test',['npm','test']),
                 ('typecheck',['npm','run','typecheck']),('build',['npm','run','build'])]}
    out=HERE/'results'; (out/'logs').mkdir(parents=True,exist_ok=True)
    receipt=dict(sourceSHA256={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()
                              for p in HERE.glob('*.py')},commands=[])
    for name,command in commands[phase]:
        print('RUN',name,flush=True); cwd=ROOT if name in ('app-test','typecheck','build') else HERE
        with (out/'logs'/f'{name}.log').open('w') as log:
            process=subprocess.Popen(command,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
            for line in process.stdout:
                log.write(line); log.flush()
                if name in ('campaign','optics'): print(line.rstrip(),flush=True)
            code=process.wait()
        receipt['commands'].append(dict(name=name,command=command,exitCode=code))
        (out/f'execution-{phase}.json').write_text(json.dumps(receipt,indent=2)+'\n')
        print('EXIT',name,code,flush=True)
        # Preserve scientific gate failures while still scoring independently
        # resolved optical fields and running required software checks.
        if code and name!='audit': raise SystemExit(code)
    return int(any(c['exitCode'] for c in receipt['commands']))


if __name__=='__main__': raise SystemExit(main())
