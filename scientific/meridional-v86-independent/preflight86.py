"""Independent pre-optics execution receipt; retain failed numerical gates."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

HERE=Path(__file__).resolve().parent; V86=HERE.parent/'meridional-v86'; ROOT=HERE.parent.parent


def main():
    py=sys.executable; directory=V86/'results/preflight'; directory.mkdir(exist_ok=True)
    files=list(V86.glob('*.py'))+list(HERE.glob('*.py'))
    receipt=dict(sourceSHA256={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},commands=[])
    commands=[('performance',[py,str(HERE/'performance86.py')]),
        ('flow-audit',[py,'audit86.py','results/predictions.json','results/audit.json']),
        ('thermal-reference',[py,'thermal_reference86.py','results/thermal-reference.json']),
        ('torque',[py,'-m','unittest','discover','-s',str(HERE),'-p','torque86.py','-v'])]
    for name,command in commands:
        print('RUN',name,flush=True)
        with (directory/(name+'.log')).open('w') as log:
            p=subprocess.Popen(command,cwd=V86,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
            for line in p.stdout: log.write(line); log.flush(); print(line.rstrip(),flush=True)
            code=p.wait()
        receipt['commands'].append(dict(name=name,command=command,exitCode=code))
        (directory/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n')
        print('EXIT',name,code,flush=True)
    return int(any(c['exitCode'] for c in receipt['commands']))


if __name__=='__main__': raise SystemExit(main())
