"""Trusted host launcher; all numerical scoring occurs in the pinned guest."""
import hashlib,json,pathlib,subprocess
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/scientific/periodic-axis-v96')
assert not (P/'diagnostics.json').exists()
code=r'''
import pathlib,sys,json
root=pathlib.Path('/work/project');here=root/'v96-sector-source05/scientific/periodic-axis-v96';sys.path.insert(0,str(here))
from sector96 import *
verify_sources();native=native_identity()
inputs={'probes':root/'v96-sector-source04/scientific/periodic-axis-v96/probes-results/probes.json',
 'campaign':root/'v96-sector-source04/scientific/periodic-axis-v96/study-results/predictions.json',
 'stability':here/'stability-results/stability.json'}
data={k:json.loads(p.read_text()) for k,p in inputs.items()}
assert data['probes']['nativeSHA256']==data['stability']['nativeSHA256']==native
assert len(data['probes']['cases'])==10 and all(r['completed'] for r in data['probes']['cases'])
assert [(r['steps'],r['outer']) for r in data['stability']['cases']]==[(512,1),(1024,1),(256,2),(256,4)]
gates=[]
def gate(name,value,limit):gates.append(dict(name=name,value=float(value),limit=limit,passed=bool(np.isfinite(value) and value<limit)))
for row in data['stability']['cases']:
 name=row['label'];gates.append(dict(name=name+'/completed',value=row['completed'],passed=row['completed']))
 if row['completed']:
  for frame in row['frames']:
   for k in ('maxStrainOverOmega','maxSwirlChangeOverA'):gate(name+'/'+str(frame['timeS'])+'/'+k,frame[k],1e-6)
  gate(name+'/meridional',row['native']['peakMeridionalOverAmplitude'],1e-6)
result=dict(postHoc=True,inputSHA256={k:sha(p) for k,p in inputs.items()},nativeSHA256=native,
 probes=[{k:v for k,v in r.items() if k!='commands'} for r in data['probes']['cases']],
 stability=[{k:v for k,v in r.items() if k!='commands'} for r in data['stability']['cases']],stabilityGates=gates,
 campaignComplete=len(data['campaign']['cases'])==len(JOBS) and all(r['completed'] for r in data['campaign']['cases']),
 diagnosticPass=False,coupledReleaseQualified=False,experimentalQualification=False,livePlaygroundQualified=False)
verify_sources();assert native_identity()==native;print(json.dumps(result,allow_nan=False))
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','/work/home/v90-venv/bin/python','-I','-']
run=subprocess.run(cmd,input=code.encode(),capture_output=True);(P/'diagnostics.stderr.log').write_bytes(run.stderr)
(P/'diagnostics-execution.json').write_text(json.dumps(dict(command=cmd,exitCode=run.returncode,jobSHA256=hashlib.sha256(code.encode()).hexdigest()),indent=2)+'\n')
assert run.returncode==0,run.stderr.decode()
result=json.loads(run.stdout);(P/'diagnostics.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
print(json.dumps(dict(campaignComplete=result['campaignComplete'],stabilityGates=len(result['stabilityGates']),failed=sum(not g['passed'] for g in result['stabilityGates']))))
