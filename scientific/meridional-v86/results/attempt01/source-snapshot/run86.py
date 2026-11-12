"""Safe-dev receipts and retained failures; run from this directory."""
import hashlib
from importlib.metadata import version
import json
from pathlib import Path
import subprocess
import sys

HERE=Path(__file__).resolve().parent; ROOT=HERE.parent.parent


def main():
    phase=sys.argv[1]; py=sys.executable
    commands={
        'pilot':[('controls',[py,'-m','unittest','discover','-p','test_*86.py','-v']),('pilot',[py,'campaign86.py','pilot'])],
        'flow':[('controls',[py,'-m','unittest','discover','-p','test_*86.py','-v']),('flow',[py,'campaign86.py','flow'])],
        'optics':[('optics',[py,'compare86.py','optics'])],
        'final':[('controls-final',[py,'-m','unittest','discover','-p','test_*86.py','-v']),
                 ('hydro-controls',[py,'-m','unittest','discover','-s','../mixture-axial-v75','-p','test_flow.py','-v']),
                 ('thermal-reference',[py,'thermal_reference86.py','results/thermal-reference.json']),
                 ('audit',[py,'audit86.py','results/predictions.json','results/audit.json']),
                 ('compare',[py,'compare86.py','compare']),('summarize',[py,'summarize86.py']),('app-test',['npm','test']),
                 ('typecheck',['npm','run','typecheck']),('build',['npm','run','build'])]}
    directory=HERE/'results'; (directory/'logs').mkdir(parents=True,exist_ok=True)
    receipt=dict(sourceSHA256={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in HERE.glob('*.py')},
        versions={p:version(p) for p in ('numpy','scipy','scikit-fem','fipy')},commands=[])
    for name,command in commands[phase]:
        cwd=ROOT if name in ('app-test','typecheck','build') else HERE
        print('RUN',name,flush=True)
        with (directory/'logs'/f'{name}.log').open('w') as log:
            process=subprocess.Popen(command,cwd=cwd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
            for line in process.stdout:
                log.write(line); log.flush()
                if name in ('flow','pilot','optics'): print(line.rstrip(),flush=True)
            code=process.wait()
        receipt['commands'].append(dict(name=name,command=command,exitCode=code))
        (directory/f'execution-{phase}.json').write_text(json.dumps(receipt,indent=2)+'\n')
        print('EXIT',name,code,flush=True)
        if code and name not in ('audit','thermal-reference'): return code
    return int(any(c['exitCode'] for c in receipt['commands']))


if __name__=='__main__': raise SystemExit(main())
