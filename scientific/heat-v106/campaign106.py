"""V105 fixed-input campaign with only its heat discretization replaced."""
import json
import os
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent/'source-v105'))
import campaign105 as baseline
from heat106 import FVDiffusion

old = baseline.old
old.Diffusion = FVDiffusion
FILES = (*baseline.FILES, 'heat-v106/heat106.py', 'heat-v106/campaign106.py',
         'heat-v106/evaluate106.py', 'heat-v106/PROTOCOL.md')
JOBS = baseline.JOBS
METHOD = 'v105-consistent-source-and-wall-with-fipy-cell-heat'


def sources():
    return {'scientific/'+name: old.sha((HERE.parent/name).read_bytes()) for name in FILES}


def main(directory):
    directory.mkdir(parents=True, exist_ok=False)
    (directory/'fields').mkdir()
    data = baseline.baseline.reference.campaign100.baseline()
    packet = dict(manifest=data['manifest'], scenario=data['scenarios'][0], timesS=old.TIMES,
        sourceSHA256=sources(), baselinePredictionSHA256=old.BASELINE,
        targetVelocityRead=False, currentFitted=False, velocityFitted=False,
        conditionalRelease=True, experimentalQualification=False,
        mesh='smooth-source-aligned', radialBalanceMethod=METHOD, cases=[])
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
            if worker.wait():
                raise RuntimeError(f'{label} failed; log retained')
        packet['cases'].append(json.loads((directory/(label+'.json')).read_text()))
        (directory/'predictions.json').write_text(json.dumps(packet, indent=2)+'\n')
        print('CASE', label, packet['cases'][-1]['elapsedS'], flush=True)
    if sources() != packet['sourceSHA256']:
        raise ValueError('Producer inputs changed')
    print('SEALED', old.sha((directory/'predictions.json').read_bytes()), flush=True)


if __name__ == '__main__':
    if sys.argv[1] == '--case':
        baseline.baseline.reference.case(Path(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]))
    else:
        main(Path(sys.argv[1]).resolve())
