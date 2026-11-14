"""Repeat the fixed-input V101 study with the corrected radial balance operator."""
import json
import os
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent/'spatial-v101'))
import campaign101 as reference

old = reference.old
FILES = (*reference.FILES, 'balance-v103/campaign103.py',
         'balance-v103/evaluate103.py', 'balance-v103/PROTOCOL.md')
JOBS = reference.JOBS
METHOD = 'local-isothermal-radial-equilibrium-plus-perturbations'


def sources():
    return {'scientific/'+name: old.sha((HERE.parent/name).read_bytes()) for name in FILES}


def main(directory):
    directory.mkdir(parents=True, exist_ok=False)
    (directory/'fields').mkdir()
    data = reference.campaign100.baseline()
    packet = dict(manifest=data['manifest'], scenario=data['scenarios'][0], timesS=old.TIMES,
        sourceSHA256=sources(), baselinePredictionSHA256=old.BASELINE, targetVelocityRead=False,
        currentFitted=False, velocityFitted=False, conditionalRelease=True,
        experimentalQualification=False, mesh='smooth-source-aligned',
        radialBalanceMethod=METHOD, cases=[])
    env = dict(os.environ, OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='1')
    for n, cfl in JOBS:
        label = f'n{n}-cfl{cfl:g}'
        command = [sys.executable, str(Path(__file__).resolve()), '--case', str(directory), str(n), str(cfl)]
        with (directory/(label+'.log')).open('x') as log:
            worker = subprocess.Popen(command, stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT, env=env, text=True)
            for line in worker.stdout:
                log.write(line)
                log.flush()
                print(line, end='', flush=True)
            code = worker.wait()
        if code:
            raise RuntimeError(f'{label} failed: {code}; log retained')
        packet['cases'].append(json.loads((directory/(label+'.json')).read_text()))
        (directory/'predictions.json').write_text(json.dumps(packet, indent=2)+'\n')
        print('CASE', label, packet['cases'][-1]['elapsedS'], flush=True)
    if sources() != packet['sourceSHA256']:
        raise ValueError('Producer inputs changed')
    print('SEALED', old.sha((directory/'predictions.json').read_bytes()), flush=True)


if __name__ == '__main__':
    if sys.argv[1] == '--case':
        reference.case(Path(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]))
    else:
        main(Path(sys.argv[1]).resolve())
