"""Trusted launcher; additional time/local-field diagnostics execute in safe-dev."""
import hashlib,json,pathlib,subprocess
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/scientific/endwall-v91')
code=r'''
import json,pathlib,sys,numpy as np
base=pathlib.Path('/work/project/v91-endwall-source04');root=base/'scientific/endwall-v91'
sys.path.insert(0,str(base/'scientific/coupled-openfoam-v90'))
from reference90 import geometry,H,MU,RHO,sha
from score90 import require_packets,difference,fields
expected=json.loads((base/'transfer.json').read_text())
assert all(sha(base/k)==h for k,h in expected.items())
rows=[]
for group,n,steps in [('extension-results',64,512),('fine-results',128,1024)]:
 path=root/'candidate-results'/group;data=json.loads((path/'predictions.json').read_text())
 packets=require_packets(path,data['cases']);label=f'n{n}-s{steps}-a0.5-work1';p=packets[label]
 f=geometry(n);r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
 for index,t in [(1,5e-6),(2,1e-5),(3,2e-5)]:
  a,b=[fields(p[k][index]) for k in ('native','v86')]
  length=float(np.sqrt(MU/RHO*t));weight=f.volume*(z>H-4*length)
  if not weight.sum():raise ValueError('Empty four-diffusion-length diagnostic region')
  av,bv=[v['meridional'] for v in (a,b)]
  rms=lambda v:float(np.sqrt(np.sum(weight*v**2)/weight.sum()))
  denominator=max(rms(av),rms(bv));i=int(np.argmin(abs(f.mean_r-.03)))
  rows.append(dict(n=n,steps=steps,timeS=t,diffusionLengthM=length,
   whole=difference(p['native'][:index+1],p['v86'][:index+1]),
   increment=difference(p['native'][:index+1],p['v86'][:index+1],True),
   endRegionMeridionalRelative=None if not denominator else rms(av-bv)/denominator,
   endRegionAxialExtentM=4*length,radiusM=float(f.mean_r[i]),
   axialCentersM=z[-8:,i].tolist(),
   profiles={name:{k:v[..., -8:,i].tolist() for k,v in value.items()} for name,value in [('native',a),('v86',b)]}))
result=dict(diagnosticOnly=True,changesAdmission=False,fields='conservative-grid recovered primitives',rows=rows)
out=root/'time-diagnostics.json';assert not out.exists();out.write_text(json.dumps(result,indent=2,allow_nan=False)+chr(10))
assert all(sha(base/k)==h for k,h in expected.items())
print(out.read_text())
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','/work/home/v90-venv/bin/python','-I','-']
out=P/'time-diagnostics.json';assert not out.exists();run=subprocess.run(cmd,input=code.encode(),capture_output=True)
(P/'time-diagnostics-stderr.log').write_bytes(run.stderr)
(P/'time-diagnostics-launch.json').write_text(json.dumps(dict(command=cmd,exitCode=run.returncode,jobSHA256=hashlib.sha256(code.encode()).hexdigest()),indent=2)+chr(10))
assert run.returncode==0,run.stderr.decode();json.loads(run.stdout);out.write_bytes(run.stdout)
print(json.dumps(dict(exitCode=run.returncode,output=str(out))))
