"""Trusted controller for explicitly post-campaign guest diagnostics/refinement."""
import base64,hashlib,json,pathlib,subprocess,sys
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/scientific/swirl-control-v94')
phase=sys.argv[1];assert phase in ('diagnostics','extension')
out=P/(phase+'.json');assert not out.exists()
protocol=(P/'EXTENSION.md').read_bytes()
code='phase='+repr(phase)+'\nprotocol='+repr(protocol)+'\n'+r'''
import hashlib,json,pathlib,sys,time
import numpy as np
p=pathlib.Path('/work/project/v94-swirl-source01/scientific/swirl-control-v94')
sys.path.insert(0,str(p))
from control94 import *
from score94 import load,compare,weights
verify_sources();data,packets=load(p/'study-results')
prefix=Path(environment()['WM_PROJECT_DIR'])
def verify_native():
 for k,h in data['nativeSHA256'].items():assert sha(prefix/k)==h,k
verify_native()
if phase=='diagnostics':
 audit=json.loads((p/'score-results/audit.json').read_text());result=dict(postHoc=True,errors=[],radial=[],maxima={},recovery=[])
 for row in data['cases']:
  for solver in ('native','v86'):
   result['errors'].append(dict(label=row['label'],solver=solver,
    globalResponse=[audit['analyticErrors'][row['label']+'/'+solver+'/'+str(i)+'/0/1']['relative'] for i in (1,2,3)]))
 q=packets[label(64,512,1.)];f=geometry(64,axialGrade=4.);w=f.volume
 for solver in ('native','v86'):
  exact=q[solver][0]*np.expm1(-RATE*TIMES[1]);error=q[solver][1]-q[solver][0]-exact;total=np.sum(w*error**2)
  rows=[]
  for lo,hi in ((0,1),(1,4),(4,16),(16,32),(32,48),(48,60),(60,64)):
   ss=np.sum(w[:,lo:hi]*error[:,lo:hi]**2)
   rows.append(dict(lo=lo,hi=hi,relative=float(np.sqrt(ss/np.sum(w[:,lo:hi]*exact[:,lo:hi]**2))),
    squaredErrorFraction=float(ss/total)))
  result['radial'].append(dict(solver=solver,rings=rows))
 for name,rows in audit['sets'].items():
  result['maxima'][name]={suffix:max(g['value'] for g in rows if g['name'].endswith(suffix)) for suffix in ('fine','contraction') if any(g['name'].endswith(suffix) for g in rows)}
 result['finestErrors']={k:v for k,v in audit['analyticErrors'].items() if k.startswith('n64-s512-x1/')}
 result['recovery']=[r for r in audit['integratedRecoveryDiagnostic'] if r['name'].startswith('n64-s512-x1/')]
 result['peakMeridionalOverAmplitude']=max(r['native']['peakMeridionalOverAmplitude'] for r in data['cases'])
 result['halfAmplitudeMax']=max(g['value'] for g in audit['sets']['linearity'] if g['name'].endswith('half-response'))
else:
 root=Path('/work/project/v94-native-extension-source01');root.mkdir(exist_ok=False)
 (root/'EXTENSION.md').write_bytes(protocol)
 result=dict(postHocExtension=True,customRun=False,coupledReleaseQualified=False,experimentalQualification=False,livePlaygroundQualified=False)
 case=root/'native-n128-s256';start=time.monotonic();result['commands']=make_control(case,128,256,1.)
 result['inputSHA256']={str(v.relative_to(case)):sha(v) for v in case.rglob('*') if v.is_file()}
 result['commands'].append(command(case,['foamRun','-case',str(case)],environment(),'solver'))
 a,r,z,info=native_packet(case,128,256,1.)
 packet=root/'native-n128-s256.npz';np.savez_compressed(packet,native=a,nativeR=r,nativeZ=z)
 result.update(packetSHA256=sha(packet),wallSeconds=time.monotonic()-start,native=info,comparisons=[])
 old=packets[label(64,256,1.)]['native']
 for i in (1,2,3):
  for local in (False,True):
   for inc in (False,True):
    fine=compare(a,a[0],i,128,local,inc);coarse=compare(old,old[0],i,64,local,inc)
    result['comparisons'].append(dict(timeS=float(TIMES[i]),local=local,increment=inc,**fine,
      contraction=fine['relative']/coarse['relative'],belowOriginalLimit=fine['relative']<.05))
 result['initialAnalyticError']=float(np.max(np.abs(a[0]-AMP*mode(r,z))))
 assert result['initialAnalyticError']<AMP*1e-13
 result['allBelowOriginalLimit']=all(v['belowOriginalLimit'] for v in result['comparisons'])
 result['allContract']=all(v['contraction']<1 for v in result['comparisons'])
result['sourceSHA256']=data['sourceSHA256'];result['nativeSHA256']=data['nativeSHA256']
result['predictionsSHA256']=sha(p/'study-results/predictions.json')
verify_sources();verify_native()
if phase=='extension':(root/'result.json').write_text(json.dumps(result,indent=2,allow_nan=False)+chr(10))
print(json.dumps(result,allow_nan=False))
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','/work/home/v90-venv/bin/python','-I','-']
run=subprocess.run(cmd,input=code.encode(),capture_output=True)
(P/(phase+'.stderr.log')).write_bytes(run.stderr)
(P/(phase+'-execution.json')).write_text(json.dumps(dict(command=cmd,exitCode=run.returncode,jobSHA256=hashlib.sha256(code.encode()).hexdigest(),protocolSHA256=hashlib.sha256(protocol).hexdigest()),indent=2)+'\n')
assert run.returncode==0,run.stderr.decode()
result=json.loads(run.stdout);out.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ('sourceSHA256','nativeSHA256','inputSHA256','commands','finestErrors','recovery')}))
