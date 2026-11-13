"""Trusted host launcher/receipt; actual scientific subprocesses run in safe-dev."""
import datetime,hashlib,json,pathlib,subprocess,sys
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6')
source,phase=sys.argv[1:]
assert source.startswith('v90-') and source.replace('-','').isalnum()
assert phase in ('pilot','campaign','score','extension','extendedscore','extendedscore2','replay','replay2','replay3')
out=P/'scientific/coupled-openfoam-v90'
log=out/(source+'-'+phase+'.log');receipt=out/(source+'-'+phase+'.json')
assert not log.exists() and not receipt.exists()
code='source='+repr(source)+'\nphase='+repr(phase)+'\n'+r'''
import hashlib,json,pathlib,subprocess,sys,time,datetime
base=pathlib.Path('/work/project')/source;root=base/'scientific/coupled-openfoam-v90'
expected=json.loads((base/'transfer.json').read_text())
def verify():
 for name,h in expected.items():assert hashlib.sha256((base/name).read_bytes()).hexdigest()==h,name
verify();py='/work/home/v90-venv/bin/python'
commands=[('tests',[py,'-m','unittest','-v','test_reference90'])]
if phase=='campaign':
 commands += [('flow-controls',[py,'-m','unittest','discover','-s','../mixture-axial-v75','-p','test_flow.py','-v']),
              ('stress-controls',[py,'-m','unittest','discover','-s','../meridional-v86','-p','test_diffusion86.py','-v'])]
if phase in ('replay','replay2','replay3'):
 replay=r"""
import hashlib,json,pathlib,numpy as np
root=pathlib.Path.cwd();old=pathlib.Path('/work/project/v90-coupled-source05/scientific/coupled-openfoam-v90/campaign-results');new=root/'campaign-results'
a=json.loads((old/'predictions.json').read_text())['cases'];b=json.loads((new/'predictions.json').read_text())['cases']
assert len(a)==len(b)==7 and [r['label'] for r in a]==[r['label'] for r in b]
rows=[]
for x,y in zip(a,b):
 assert x['completed'] and y['completed']
 with np.load(old/x['packet'],allow_pickle=False) as p,np.load(new/y['packet'],allow_pickle=False) as q:
  assert set(p.files)==set(q.files)=={'native','v86'}
  matches={k:np.array_equal(p[k],q[k]) for k in p.files};assert all(matches.values())
 assert x['native']==y['native'] and x['v86']==y['v86']
 rows.append(dict(label=x['label'],stateArraysExact=matches,packetBytesExact=x['packetSHA256']==y['packetSHA256']))
result=dict(cases=rows,allStatesAndHistoriesExact=True)
path=root/'replay-admission.json';assert not path.exists()
path.write_text(json.dumps(result,indent=2)+chr(10));assert json.loads(path.read_text())==result
print(json.dumps(result))
"""
 commands=[('replay',[py,'-c',replay])]
elif phase not in ('score','extendedscore','extendedscore2'):
 commands.append((phase,[py,'-u','reference90.py',{'pilot':'pilot','campaign':'full','extension':'extension'}[phase],phase+'-results']))
else:commands=[('score',[py,'score90.py','campaign-results']+(['extension-results'] if phase.startswith('extendedscore') else []))]
receipt=dict(sourceSHA256=expected,startedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(),commands=[])
for name,cmd in commands:
 started=time.monotonic();print('RUN',name,flush=True)
 path=root/(phase+'-'+name+'.log')
 with path.open('x') as log:
  child=subprocess.Popen(cmd,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
  for line in child.stdout:log.write(line);log.flush();print(line,end='',flush=True)
  code=child.wait()
 receipt['commands'].append(dict(name=name,args=cmd,exitCode=code,wallSeconds=time.monotonic()-started,
  logSHA256=hashlib.sha256(path.read_bytes()).hexdigest()))
 (root/(phase+'-execution.json')).write_text(json.dumps(receipt,indent=2)+'\n')
 if code and name!='score':raise SystemExit(code)
 if code and name=='score':
  audit=json.loads((root/'campaign-results'/('audit-extension.json' if phase.startswith('extendedscore') else 'audit.json')).read_text());assert not audit['numericalComparisonPass']
verify()
receipt['sourceUnchanged']=True;receipt['finishedUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat()
(root/(phase+'-execution.json')).write_text(json.dumps(receipt,indent=2)+'\n')
print('RECEIPT',json.dumps(receipt),flush=True)
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','python3','-I','-']
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
with log.open('xb') as f:run=subprocess.run(cmd,input=code.encode(),stdout=f,stderr=subprocess.STDOUT)
receipt.write_text(json.dumps(dict(command=cmd,source=source,phase=phase,startedUTC=start,
 finishedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(),exitCode=run.returncode,
 logSHA256=hashlib.sha256(log.read_bytes()).hexdigest(),jobSHA256=hashlib.sha256(code.encode()).hexdigest()),indent=2)+'\n')
print(json.dumps(dict(exitCode=run.returncode,log=str(log),receipt=str(receipt))))
raise SystemExit(run.returncode)
