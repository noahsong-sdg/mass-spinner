"""Trusted host source transfer; scientific execution is offline inside safe-dev."""
import base64,datetime,hashlib,json,pathlib,subprocess,sys
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6')
name,phase=sys.argv[1:];assert name.startswith('v96-') and name.replace('-','').isalnum()
assert phase in ('tests','probes','study','score','stability')
out=P/'scientific/periodic-axis-v96';receipt=out/(name+'-'+phase+'.json');log=out/(name+'-'+phase+'.log')
assert not receipt.exists() and not log.exists()
previous=json.loads((P/'scientific/radial-axis-v95/v95-axis-source03-tests.json').read_text())
paths=sorted({k for k in previous['sourceSHA256'] if k!='references.json'}|{str(p.relative_to(P)) for p in out.glob('*.py')}|{str(p.relative_to(P)) for p in out.glob('*.md')})
raw={k:(P/k).read_bytes() for k in paths}
assert all(hashlib.sha256(v).hexdigest()==previous['sourceSHA256'][k] for k,v in raw.items() if k in previous['sourceSHA256'])
refs=previous['referenceSHA256'].copy()
for k in ('transfer.json','scientific/radial-axis-v95/study-results/predictions.json','scientific/radial-axis-v95/score-results/audit.json'):
 refs['/work/project/v95-axis-source03/'+k]=hashlib.sha256((P/'scientific/radial-axis-v95/evidence/v95-axis-source03'/k).read_bytes()).hexdigest()
raw['references.json']=(json.dumps(refs,indent=2)+'\n').encode()
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
verify();here=root/'scientific/periodic-axis-v96'
script={'tests':'test96.py','probes':'sector96.py','study':'study96.py','score':'score96.py','stability':'stability96.py'}[phase]
args=['/work/home/v90-venv/bin/python','-u',script,phase+'-results'];start=time.monotonic()
with (here/(phase+'.log')).open('x') as f:
 run=subprocess.Popen(args,cwd=here,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 for line in run.stdout:f.write(line);f.flush();print(line,end='',flush=True)
 status=run.wait()
verify();record=dict(args=args,exitCode=status,wallSeconds=time.monotonic()-start,sourceSHA256=expected,sourceUnchanged=True)
(here/(phase+'-execution.json')).write_text(json.dumps(record,indent=2)+chr(10));print('RECEIPT',json.dumps(record),flush=True)
raise SystemExit(status)
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','python3','-I','-']
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
with log.open('xb') as f:run=subprocess.run(cmd,input=code.encode(),stdout=f,stderr=subprocess.STDOUT)
receipt.write_text(json.dumps(dict(command=cmd,exitCode=run.returncode,startedUTC=start,finishedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourceSHA256=expected,referenceSHA256=refs,jobSHA256=hashlib.sha256(code.encode()).hexdigest(),logSHA256=hashlib.sha256(log.read_bytes()).hexdigest()),indent=2)+'\n')
print(json.dumps(dict(exitCode=run.returncode,log=str(log))));raise SystemExit(run.returncode)
