"""Trusted transport/controller; executed only inside the existing safe-dev VM."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

root = Path('/work/project/v107-entry02')
expected_transfer = '993dc1e78b42aefa79c8261f6b335115ad4476ed06a5f8304a0a214e6a4e6836'
expected_driver = '8dd80a3eae3dcb2e429e5c11a92b7a331da5f8911ce693a730a019dca604739d'
def sha(raw):
    return hashlib.sha256(raw).hexdigest()
manifest_raw = (root/'transfer.json').read_bytes()
if sha(manifest_raw) != expected_transfer:
    raise ValueError('Wrong frozen checker snapshot')
manifest = json.loads(manifest_raw)
def check_sources():
    for relative, expected in manifest.items():
        if sha((root/relative).read_bytes()) != expected:
            raise ValueError('Frozen checker source changed: '+relative)
check_sources()
raw = sys.stdin.buffer.read(65537)
if len(raw) > 65536 or sha(raw) != expected_driver:
    raise ValueError('Unexpected diagnostic transport')
driver = root/'q0-diagnostic.py'
with driver.open('xb') as stream:
    stream.write(raw)
producer = Path('/work/project/v107-candidate01/results')
command = ['/work/home/v90-venv/bin/python', str(driver), str(root),
    str(root/'q0-diagnostic01'),
    '/work/project/v106-candidate02/results/predictions.json',
    '/work/project/v106-cross01/results/summary.json',
    '/work/project/v106-radial01/results/summary.json',
    str(producer/'full-r8-z2-cfl0.1/predictions.json'),
    str(producer/'preflight-r8z4/predictions.json'),
    '--r8z2-sha', '05b1dd693327557767ae4bc8f14211d874323acc53dac343e254849626ac476f']
started = time.monotonic()
log = root/'q0-diagnostic01.log'
with log.open('x') as stream:
    result = subprocess.run(command, cwd=root, env=dict(os.environ,
        OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='1', MKL_NUM_THREADS='1',
        FIPY_SOLVERS='scipy'), stdout=stream, stderr=subprocess.STDOUT)
check_sources()
receipt = dict(command=command, exitCode=result.returncode,
    elapsedS=time.monotonic()-started, transferSHA256=sha(manifest_raw),
    driverSHA256=sha(driver.read_bytes()), logSHA256=sha(log.read_bytes()))
with (root/'q0-diagnostic01-execution.json').open('x') as stream:
    json.dump(receipt, stream, indent=2)
print(log.read_text()[:20000], flush=True)
print(json.dumps(receipt), flush=True)
raise SystemExit(result.returncode)
