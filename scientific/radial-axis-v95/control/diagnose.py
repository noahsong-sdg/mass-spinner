"""Trusted launcher for post-campaign guest diagnostics; no admission changes."""
import hashlib,json,pathlib,subprocess
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/scientific/radial-axis-v95')
out=P/'diagnostics.json';assert not out.exists()
code=r'''
import pathlib,sys,json
import numpy as np
p=pathlib.Path('/work/project/v95-axis-source03/scientific/radial-axis-v95');sys.path.insert(0,str(p))
from score95 import *
verify_sources();data,packets=load(p/'study-results');audit=json.loads((p/'score-results/audit.json').read_text())
result=dict(postHoc=True,errors=[],directions=[],rigid=audit['rigidDiagnostics'],counts={k:dict(total=len(v),failed=sum(not g['passed'] for g in v)) for k,v in audit['sets'].items()})
for row in data['cases']:
 if row['kind']!='decay':continue
 for solver in ('native','v86'):
  if solver not in packets[row['label']]:continue
  result['errors'].append(dict(label=row['label'],solver=solver,
    globalResponse=[audit['analyticErrors'][row['label']+'/'+solver+'/'+str(i)+'/0/1'] for i in (1,2,3)],
    localResponse=[audit['analyticErrors'][row['label']+'/'+solver+'/'+str(i)+'/1/1'] for i in (1,2,3)]))
for solver in ('native','v86'):
 for i in (1,2,3):
  for local in (False,True):
   for name,grids in [('radial',[(32,128),(64,128),(128,128)]),('axial',[(64,64),(64,128),(64,256)])]:
    errors=[audit['analyticErrors'][label('decay',n,nz,'Gauss linear')+f'/{solver}/{i}/{int(local)}/1']['relative'] for n,nz in grids]
    result['directions'].append(dict(direction=name,solver=solver,timeS=float(TIMES[i]),local=local,
      errors=errors,contraction=[errors[j+1]/errors[j] for j in (0,1)]))
old=Path('/work/project/v94-swirl-source01/scientific/swirl-control-v94/study-results/n64-s256-x1.npz')
current=packets[label('decay',64,128,'Gauss linear')]
with np.load(old,allow_pickle=False) as q:result['legacyBaseBitwiseEqual']={k:bool(np.array_equal(current[k],q[k])) for k in ('native','v86','nativeR','nativeZ')}
result['predictionSHA256']=sha(p/'study-results/predictions.json');result['auditSHA256']=sha(p/'score-results/audit.json')
verify_sources();print(json.dumps(result,allow_nan=False))
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','/work/home/v90-venv/bin/python','-I','-']
run=subprocess.run(cmd,input=code.encode(),capture_output=True);(P/'diagnostics.stderr.log').write_bytes(run.stderr)
(P/'diagnostics-execution.json').write_text(json.dumps(dict(command=cmd,exitCode=run.returncode,jobSHA256=hashlib.sha256(code.encode()).hexdigest()),indent=2)+'\n')
assert run.returncode==0,run.stderr.decode()
result=json.loads(run.stdout);out.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
print(json.dumps(result))
