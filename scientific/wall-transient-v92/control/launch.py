"""Trusted host copy/launch controller; scientific execution only in safe-dev."""
import base64,datetime,hashlib,json,pathlib,subprocess,sys
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6')
name,phase=sys.argv[1:];assert name.startswith('v92-') and name.replace('-','').isalnum()
assert phase in ('tests','preflight','study','score')
out=P/'scientific/wall-transient-v92';receipt=out/(name+'-'+phase+'.json');log=out/(name+'-'+phase+'.log')
assert not receipt.exists() and not log.exists()
paths=['scientific/'+s for s in ['mixture-axial-v75/flow.py','mixture-axial-v75/test_flow.py','meridional-v86/diffusion86.py','meridional-v86/test_diffusion86.py','expert-v88/openfoam/reference88.py']]
paths+=['scientific/coupled-openfoam-v90/'+s for s in ['reference90.py','score90.py','test_reference90.py','PROTOCOL.md','REFINEMENT.md','requirements.txt']]
paths+=['scientific/endwall-v91/'+s for s in ['candidate91.py','test91.py']]
paths+=[str(p.relative_to(P)) for p in sorted(out.glob('*.py'))]+['scientific/wall-transient-v92/PROTOCOL.md']
raw={k:(P/k).read_bytes() for k in paths}
refroot=P/'scientific/endwall-v91/evidence/v91-endwall-source04'
references={str(pathlib.PurePosixPath('/work/project/v91-endwall-source04')/k):hashlib.sha256((refroot/k).read_bytes()).hexdigest() for k in ['transfer.json']+['scientific/endwall-v91/candidate-results/'+g+'/predictions.json' for g in ('extension-results','fine-results')]}
old=json.loads((refroot/'transfer.json').read_text())
assert all(hashlib.sha256(v).hexdigest()==old[k] for k,v in raw.items() if k in old)
raw['references.json']=(json.dumps(references,indent=2)+'\n').encode()
expected={k:hashlib.sha256(v).hexdigest() for k,v in raw.items()};data={k:base64.b64encode(v).decode() for k,v in raw.items()}
code='name='+repr(name)+'\nphase='+repr(phase)+'\ndata='+repr(data)+'\nexpected='+repr(expected)+'\n'+r'''
import base64,hashlib,json,os,pathlib,subprocess,time
assert os.getuid()==1000
root=pathlib.Path('/work/project')/name
if root.exists():assert json.loads((root/'transfer.json').read_text())==expected
else:
 root.mkdir()
 for k,v in data.items():
  b=base64.b64decode(v,validate=True);assert hashlib.sha256(b).hexdigest()==expected[k]
  p=root/k;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
 (root/'transfer.json').write_text(json.dumps(expected,indent=2)+chr(10))
def verify():
 for k,h in expected.items():assert hashlib.sha256((root/k).read_bytes()).hexdigest()==h,k
verify();here=root/'scientific/wall-transient-v92'
args=['/work/home/v90-venv/bin/python','-u',{'tests':'test92.py','preflight':'score92.py','study':'study92.py','score':'score92.py'}[phase]]
if phase in ('preflight','score'):args.append(phase)
args.append(phase+'-results');print('RUN',args,flush=True);started=time.monotonic()
with (here/(phase+'.log')).open('x') as f:
 run=subprocess.Popen(args,cwd=here,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 for line in run.stdout:f.write(line);f.flush();print(line,end='',flush=True)
 status=run.wait()
verify();record=dict(args=args,exitCode=status,wallSeconds=time.monotonic()-started,sourceSHA256=expected,sourceUnchanged=True)
(here/(phase+'-execution.json')).write_text(json.dumps(record,indent=2)+chr(10));print('RECEIPT',json.dumps(record),flush=True)
raise SystemExit(status)
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','python3','-I','-']
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
with log.open('xb') as f:run=subprocess.run(cmd,input=code.encode(),stdout=f,stderr=subprocess.STDOUT)
receipt.write_text(json.dumps(dict(command=cmd,exitCode=run.returncode,startedUTC=start,finishedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourceSHA256=expected,referenceSHA256=references,jobSHA256=hashlib.sha256(code.encode()).hexdigest(),logSHA256=hashlib.sha256(log.read_bytes()).hexdigest()),indent=2)+'\n')
print(json.dumps(dict(exitCode=run.returncode,log=str(log))));raise SystemExit(run.returncode)
