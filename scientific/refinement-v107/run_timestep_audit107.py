import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

root = Path('/work/project/v107-entry02')
stage, *labels = sys.argv[1:]
def sha(raw):
    return hashlib.sha256(raw).hexdigest()
manifest_raw = (root/'transfer.json').read_bytes()
if sha(manifest_raw) != '993dc1e78b42aefa79c8261f6b335115ad4476ed06a5f8304a0a214e6a4e6836':
    raise ValueError('Wrong tested checker snapshot')
manifest = json.loads(manifest_raw)
for relative, expected in manifest.items():
    if sha((root/relative).read_bytes()) != expected:
        raise ValueError('Tested checker source changed')
driver = '''import json,sys,time,resource
from collections import Counter
from pathlib import Path
sys.path.insert(0,'scientific/refinement-v107')
import stable_audit107 as replay
stage,*labels=sys.argv[1:]
producer=Path('/work/project/v107-candidate01')
allowed={replay.admission.campaign.label(job) for job in replay.admission.FULL_JOBS}
if not labels or not set(labels)<=allowed or len(set(labels))!=len(labels):
 raise ValueError('Supply distinct declared full jobs')
out=Path(stage)
started=time.monotonic()
result=replay.audit(out,'full',
 Path('/work/project/v106-candidate02/results/predictions.json'),
 Path('/work/project/v106-radial01/results/summary.json'),
 [producer/'results'/('full-'+label)/'predictions.json' for label in labels],producer)
summary=dict(status=result['status'],qualificationStatus=result['qualificationStatus'],
 gateCount=len(result['gates']),failureCount=len(result['failures']),
 caseAdmissionPass=result['caseAdmissionPass'],
 failureKinds=dict(Counter(row['kind'] for row in result['failures'])),
 failures=result['failures'][:50],fullDeclaredMatrixPass=result['fullDeclaredMatrixPass'],
 missingFullJobs=result['missingFullJobs'],comparisonLayouts=result['comparisonLayouts'],
 stableAuditSHA256=replay.admission.audit99.sha((out/'stable-audit.json').read_bytes()),
 analysisDriverSHA256=replay.admission.audit99.sha(Path(__file__).read_bytes()),
 elapsedS=time.monotonic()-started,peakResidentKiB=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\\n')
print(json.dumps(summary,indent=2),flush=True)
for row in result['comparisons']:
 print('COMPARISON',json.dumps(row),flush=True)
if result['missingFullJobs'] and result['fullDeclaredMatrixPass']:
 raise ValueError('Incomplete matrix promoted to full qualification')
'''
path = root/(stage+'-driver.py'); path.write_text(driver)
command = ['/work/home/v90-venv/bin/python', path.name, stage, *labels]
started = time.monotonic(); log = root/(stage+'.log')
with log.open('x') as stream:
    result = subprocess.run(command,cwd=root,env=dict(os.environ,OPENBLAS_NUM_THREADS='1',
        OMP_NUM_THREADS='1',MKL_NUM_THREADS='1',FIPY_SOLVERS='scipy'),
        stdout=stream,stderr=subprocess.STDOUT)
(root/(stage+'-execution.json')).write_text(json.dumps(dict(command=command,
    exitCode=result.returncode,elapsedS=time.monotonic()-started,
    transferSHA256=sha(manifest_raw),driverSHA256=sha(path.read_bytes()),
    logSHA256=sha(log.read_bytes())),indent=2)+'\n')
print(log.read_text()[:20000],flush=True)
for relative, expected in manifest.items():
    if sha((root/relative).read_bytes()) != expected:
        raise ValueError('Checker source changed during replay')
raise SystemExit(result.returncode)
