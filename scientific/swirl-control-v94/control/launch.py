"""Trusted host copy/hash controller; every scientific command runs in safe-dev."""
import base64,datetime,hashlib,json,pathlib,subprocess,sys
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6')
name,phase=sys.argv[1:];assert name.startswith('v94-') and name.replace('-','').isalnum()
assert phase in ('tests','study','score')
out=P/'scientific/swirl-control-v94';receipt=out/(name+'-'+phase+'.json');log=out/(name+'-'+phase+'.log')
assert not receipt.exists() and not log.exists()
previous=json.loads((P/'scientific/graded-endwall-v93/v93-graded-source02-tests.json').read_text())['sourceSHA256']
paths=[k for k in previous if k!='references.json']+['scientific/graded-endwall-v93/test93.py']
paths=sorted(set(paths)|{str(p.relative_to(P)) for p in out.glob('*.py')}|{'scientific/swirl-control-v94/PROTOCOL.md'})
raw={k:(P/k).read_bytes() for k in paths}
assert all(hashlib.sha256(v).hexdigest()==previous[k] for k,v in raw.items() if k in previous)
references=json.loads((P/'scientific/graded-endwall-v93/v93-graded-source02-tests.json').read_text())['referenceSHA256']
for k in ('transfer.json','scientific/graded-endwall-v93/study-results/predictions.json','scientific/graded-endwall-v93/score-results/audit.json'):
 references['/work/project/v93-graded-source02/'+k]=hashlib.sha256((P/'scientific/graded-endwall-v93/evidence/v93-graded-source02'/k).read_bytes()).hexdigest()
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
verify();here=root/'scientific/swirl-control-v94'
args=['/work/home/v90-venv/bin/python','-u',{'tests':'test94.py','study':'control94.py','score':'score94.py'}[phase],phase+'-results']
print('RUN',args,flush=True);started=time.monotonic()
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
