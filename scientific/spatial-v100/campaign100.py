"""V99's frozen argon release with corrected flux and local heat integration."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import resource
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent/'coupled-v99'))
import campaign99 as old

FILES = (*old.SOURCE_FILES, 'spatial-v100/campaign100.py', 'spatial-v100/PROTOCOL.md')
JOBS = ((1, .1), (2, .1), (2, .2), (2, .05), (4, .1))


def sources():
    return {'scientific/'+p: old.sha((HERE.parent/p).read_bytes()) for p in FILES}


def baseline():
    raw = (HERE.parent/old.SOURCE_FILES[-1]).read_bytes()
    if old.sha(raw) != old.BASELINE:
        raise ValueError('Frozen baseline changed')
    return json.loads(raw)


def case(directory, n, cfl):
    data = baseline(); label = f'n{n}-cfl{cfl:g}'; start = time.monotonic()
    row = dict(label=label, refinement=n, nr=16*n, nz=24*n, cfl=cfl,
               maxDtS=1e-7, anodeCenterM=.07)
    try:
        state = old.evolve(data['scenarios'][0], data['manifest'], n, cfl)
        payload = json.dumps(state, separators=(',', ':'), allow_nan=False).encode()
        packed = gzip.compress(payload, mtime=0); name = 'fields/'+label+'.json.gz'
        (directory/name).write_bytes(packed)
        row.update(completed=True, stepCount=len(state['history']),
            maximumTemperatureK=max(h['maximumTemperatureK'] for h in state['history']),
            fieldPacket=dict(path=name, sha256=old.sha(packed), rawSHA256=old.sha(payload)))
    except (ValueError, ArithmeticError) as exc:
        row.update(completed=False, error=type(exc).__name__+': '+str(exc))
    row.update(elapsedS=time.monotonic()-start,
               peakResidentKiB=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
    (directory/(label+'.json')).write_text(json.dumps(row, indent=2)+'\n')
    print(json.dumps(row), flush=True)


def main(directory):
    directory.mkdir(parents=True, exist_ok=False); (directory/'fields').mkdir()
    data = baseline()
    packet = dict(manifest=data['manifest'], scenario=data['scenarios'][0], timesS=old.TIMES,
        sourceSHA256=sources(), baselinePredictionSHA256=old.BASELINE, targetVelocityRead=False,
        currentFitted=False, velocityFitted=False, conditionalRelease=True,
        experimentalQualification=False, cases=[])
    env = dict(os.environ, OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='1')
    for n, cfl in JOBS:
        label = f'n{n}-cfl{cfl:g}'
        command = [sys.executable, str(Path(__file__).resolve()), '--case', str(directory), str(n), str(cfl)]
        with (directory/(label+'.log')).open('x') as log:
            result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, env=env)
        if result.returncode:
            raise RuntimeError(f'{label} worker failed: {result.returncode}; log retained')
        row = json.loads((directory/(label+'.json')).read_text())
        packet['cases'].append(row)
        (directory/'predictions.json').write_text(json.dumps(packet, indent=2)+'\n')
        print('CASE', json.dumps(row), flush=True)
    if sources() != packet['sourceSHA256']:
        raise ValueError('Producer inputs changed')
    print('SEALED', old.sha((directory/'predictions.json').read_bytes()), flush=True)


if __name__ == '__main__':
    if sys.platform != 'linux' or os.getuid() != 1000:
        raise RuntimeError('Execute inside safe-dev')
    if sys.argv[1] == '--case':
        case(Path(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]))
    else:
        main(Path(sys.argv[1]).resolve())
