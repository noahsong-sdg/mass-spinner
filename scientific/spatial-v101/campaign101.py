"""Fixed-input V99 clocks and equations on a smooth source-aligned nested mesh."""
import gzip
import json
import os
from pathlib import Path
import resource
import subprocess
import sys
import time
from reconstruction101 import mesh

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent/'spatial-v100'))
import campaign100
old = campaign100.old
FILES = (*old.SOURCE_FILES, 'spatial-v100/campaign100.py', 'spatial-v101/campaign101.py',
         'spatial-v101/reconstruction101.py', 'spatial-v101/PROTOCOL.md')
JOBS = campaign100.JOBS


def sources():
    return {'scientific/'+p: old.sha((HERE.parent/p).read_bytes()) for p in FILES}


def case(directory, n, cfl):
    data = campaign100.baseline()
    old.mesh = lambda n: mesh(n, 'smooth-source-aligned')
    label = f'n{n}-cfl{cfl:g}'
    start = time.monotonic()
    state = old.evolve(data['scenarios'][0], data['manifest'], n, cfl)
    payload = json.dumps(state, separators=(',', ':'), allow_nan=False).encode()
    packed = gzip.compress(payload, mtime=0)
    name = 'fields/'+label+'.json.gz'
    (directory/name).write_bytes(packed)
    row = dict(label=label, refinement=n, nr=20*n, nz=24*n, cfl=cfl,
        maxDtS=1e-7, anodeCenterM=.07, completed=True, stepCount=len(state['history']),
        maximumTemperatureK=max(h['maximumTemperatureK'] for h in state['history']),
        elapsedS=time.monotonic()-start,
        peakResidentKiB=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        fieldPacket=dict(path=name, sha256=old.sha(packed), rawSHA256=old.sha(payload)))
    (directory/(label+'.json')).write_text(json.dumps(row, indent=2)+'\n')


def main(directory):
    directory.mkdir(parents=True, exist_ok=False)
    (directory/'fields').mkdir()
    data = campaign100.baseline()
    packet = dict(manifest=data['manifest'], scenario=data['scenarios'][0], timesS=old.TIMES,
        sourceSHA256=sources(), baselinePredictionSHA256=old.BASELINE, targetVelocityRead=False,
        currentFitted=False, velocityFitted=False, conditionalRelease=True,
        experimentalQualification=False, mesh='smooth-source-aligned', cases=[])
    env = dict(os.environ, OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='1')
    for n, cfl in JOBS:
        label = f'n{n}-cfl{cfl:g}'
        command = [sys.executable, str(Path(__file__).resolve()), '--case', str(directory), str(n), str(cfl)]
        with (directory/(label+'.log')).open('x') as log:
            worker = subprocess.Popen(command, stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT, env=env, text=True)
            for line in worker.stdout:
                log.write(line); log.flush(); print(line, end='', flush=True)
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
        case(Path(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]))
    else:
        main(Path(sys.argv[1]).resolve())
