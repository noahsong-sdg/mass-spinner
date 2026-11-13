"""Trusted host launcher; post-prediction scientific diagnostics execute in VM."""
import hashlib,json,pathlib,subprocess
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/scientific/coupled-openfoam-v90')
code=r'''
import json,pathlib,sys,numpy as np
root=pathlib.Path('/work/project/v90-coupled-source06/scientific/coupled-openfoam-v90');sys.path.insert(0,str(root))
from reference90 import RGAS,R,H,geometry
from score90 import require_packets,restrict,fields
rows=json.loads((root/'campaign-results/predictions.json').read_text())['cases']
extra=json.loads((root/'extension-results/predictions.json').read_text())['cases']
packets=require_packets(root/'campaign-results',rows);packets.update(require_packets(root/'extension-results',extra))
rgas=rows[0]['native']['nativeGasConstantRange']
result=dict(postPredictionDiagnostic=True,changesAdmission=False,ownGasConstant=RGAS,
 nativeGasConstantRange=rgas,eosRelativeDifference=max(abs(x/RGAS-1) for x in rgas),localization=[])
for n in (16,32):
 a=fields(packets[f'n{n}-s512-a0.5-work1']['v86'][-1])['meridional']
 b=fields(restrict(packets[f'n{2*n}-s512-a0.5-work1']['v86'][-1],n))['meridional']
 f=geometry(n);r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
 energy=f.volume*np.sum((a-b)**2,axis=0);total=energy.sum();i=np.unravel_index(np.argmax(energy),energy.shape)
 result['localization'].append(dict(coarseN=n,fineN=2*n,
  radialRMS=float(np.sqrt(np.sum(f.volume*(a[0]-b[0])**2)/f.volume.sum())),
  axialRMS=float(np.sqrt(np.sum(f.volume*(a[1]-b[1])**2)/f.volume.sum())),
  endQuarterSquaredErrorFraction=float(energy[z>.75*H].sum()/total),
  outerQuarterSquaredErrorFraction=float(energy[r>.75*R].sum()/total),
  largestCellContributionAtRM=float(r[i]),largestCellContributionAtZM=float(z[i])))
path=root/'diagnostics.json';assert not path.exists()
path.write_text(json.dumps(result,indent=2)+chr(10));print(path.read_text())
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','/work/home/v90-venv/bin/python','-I','-']
run=subprocess.run(cmd,input=code.encode(),capture_output=True)
out=P/'diagnostics.json';assert not out.exists()
(P/'diagnostics-stderr.log').write_bytes(run.stderr)
receipt=dict(command=cmd,exitCode=run.returncode,jobSHA256=hashlib.sha256(code.encode()).hexdigest())
(P/'diagnostics-launch.json').write_text(json.dumps(receipt,indent=2)+chr(10));assert run.returncode==0
json.loads(run.stdout);out.write_bytes(run.stdout);print(run.stdout.decode())
