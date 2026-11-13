"""Trusted launcher for supplemental diagnostics; never changes admission."""
import hashlib,json,pathlib,subprocess
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/scientific/graded-endwall-v93')
code=r'''
import json,pathlib,sys,numpy as np
root=pathlib.Path('/work/project/v93-graded-source02/scientific/graded-endwall-v93');sys.path.insert(0,str(root))
from score93 import verify_sources,load,geometry,GRADE,MU,RHO,CLOCKS,compare,restrict,weights,label
verify_sources();data,packets=load(root/'study-results')
out=dict(diagnosticOnly=True,changesAdmission=False,resolution=[],initialSampling=[],velocityComponents=[])
for row in data['cases']:
 f=geometry(row['n'],axialGrade=GRADE);dz=np.diff(f.z)[-1]
 out['resolution'].append(dict(label=row['label'],endwallCellM=float(dz),initialCFLMargin=row['initialCFLMargin'],
  viscousScaleCells=[dict(timeS=t,cells=float(np.sqrt(MU/RHO*t)/dz)) for _,t in CLOCKS]))
space=[packets[label(n,2048)] for n in (16,32,64)]
def component(a,b,index,local):
 n=min(a.shape[-1],b.shape[-1]);f=geometry(n,axialGrade=GRADE);w=weights(n,CLOCKS[index-1][1],local)
 x,y=[f.primitive(restrict(q[index],n)) for q in (a,b)]
 rms=lambda v:float(np.sqrt(np.sum(w*v*v)/w.sum()))
 rows={}
 for k in ('vrMPS','vzMPS'):
  scale=max(rms(x[k]),rms(y[k]));absolute=rms(x[k]-y[k])
  rows[k]=dict(absoluteRMS=absolute,scaleRMS=scale,relative=None if not scale else absolute/scale)
 return rows
for solver in ('native','v86'):
 a=[p[solver] for p in space]
 initial=[np.repeat(p[:1],4,axis=0) for p in a]
 out['initialSampling'].append(dict(solver=solver,region='global',
  differences=[compare(initial[i],initial[i+1],1) for i in (0,1)]))
 for index,t in CLOCKS:
  for local in (False,True):
   out['velocityComponents'].append(dict(solver=solver,timeS=t,local=local,
    differences=[component(a[i],a[i+1],index,local) for i in (0,1)]))
verify_sources();target=root/'diagnostics.json';assert not target.exists()
target.write_text(json.dumps(out,indent=2,allow_nan=False)+chr(10));print(target.read_text())
'''
target=P/'diagnostics.json';assert not target.exists()
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','/work/home/v90-venv/bin/python','-I','-']
run=subprocess.run(cmd,input=code.encode(),capture_output=True);(P/'diagnostics-stderr.log').write_bytes(run.stderr)
(P/'diagnostics-launch.json').write_text(json.dumps(dict(command=cmd,exitCode=run.returncode,jobSHA256=hashlib.sha256(code.encode()).hexdigest()),indent=2)+'\n')
assert run.returncode==0,run.stderr.decode();json.loads(run.stdout);target.write_bytes(run.stdout)
print(json.dumps(dict(exitCode=run.returncode,output=str(target))))
