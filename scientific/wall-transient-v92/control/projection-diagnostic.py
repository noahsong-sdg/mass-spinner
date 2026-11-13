"""Trusted launcher; fixed-projection diagnostics run only inside safe-dev."""
import hashlib,json,pathlib,subprocess
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/scientific/wall-transient-v92')
code=r'''
import json,pathlib,sys,numpy as np
root=pathlib.Path('/work/project/v92-wall-source02/scientific/wall-transient-v92');sys.path.insert(0,str(root))
from score92 import verify_sources,OLD,load,compare,CLOCKS,restrict
verify_sources();packets={}
for group in ('extension-results','fine-results'):packets.update(load(OLD/group)[1])
space=[packets[f'n{n}-s1024-a0.5-work1'] for n in (32,64,128)]
rows=[]
for solver in ('native','v86'):
 original=[p[solver] for p in space]
 projected=[np.array([restrict(q,32) for q in p]) for p in original]
 for index,t in CLOCKS:
  for inc in (False,True):
   for local in (False,True):
    pairs={name:[compare(a[i],a[i+1],index,inc,local) for i in (0,1)] for name,a in [('pairwise',original),('fixed32',projected)]}
    ratios={name:{key:None if not a[0][key]['relative'] else a[1][key]['relative']/a[0][key]['relative'] for key in a[0]} for name,a in pairs.items()}
    rows.append(dict(solver=solver,timeS=t,increment=inc,local=local,comparisons=pairs,contraction=ratios))
result=dict(diagnosticOnly=True,changesAdmission=False,commonProjection=32,rows=rows)
out=root/'projection-diagnostic.json';assert not out.exists();out.write_text(json.dumps(result,indent=2,allow_nan=False)+chr(10));verify_sources();print(out.read_text())
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','/work/home/v90-venv/bin/python','-I','-']
out=P/'projection-diagnostic.json';assert not out.exists();run=subprocess.run(cmd,input=code.encode(),capture_output=True)
(P/'projection-stderr.log').write_bytes(run.stderr)
(P/'projection-launch.json').write_text(json.dumps(dict(command=cmd,exitCode=run.returncode,jobSHA256=hashlib.sha256(code.encode()).hexdigest()),indent=2)+'\n')
assert run.returncode==0,run.stderr.decode();json.loads(run.stdout);out.write_bytes(run.stdout)
print(json.dumps(dict(exitCode=run.returncode,output=str(out))))
