"""Trusted host verification controller; all application commands run in safe-dev."""
import base64,hashlib,json,pathlib,subprocess
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6')
expected=json.loads((P/'scientific/endwall-v91/app-final/source.json').read_text())
assert all(hashlib.sha256((P/k).read_bytes()).hexdigest()==h for k,h in expected.items())
out=P/'scientific/wall-transient-v92/app-final';out.mkdir(exist_ok=False)
code='expected='+repr(expected)+'\n'+r'''
import base64,datetime,hashlib,json,pathlib,subprocess,time
root=pathlib.Path('/work/project');out=root/'v92-app-final';out.mkdir(exist_ok=False)
def verify():
 for k,h in expected.items():assert hashlib.sha256((root/k).read_bytes()).hexdigest()==h,k
verify();receipt=dict(startedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourceFiles=len(expected),
 sourceTreeSHA256=hashlib.sha256(json.dumps(expected,sort_keys=True,separators=(',',':')).encode()).hexdigest(),changedFiles=[],commands=[])
for name,args in [('test',['npm','test']),('typecheck',['npm','run','typecheck']),('build',['npm','run','build']),('site',['npm','run','check:site']),('assets',['npm','run','check:assets'])]:
 start=time.monotonic();run=subprocess.run(args,cwd=root,capture_output=True);raw=run.stdout+run.stderr
 (out/(name+'.log')).write_bytes(raw)
 receipt['commands'].append(dict(name=name,args=args,exitCode=run.returncode,wallSeconds=time.monotonic()-start,logSHA256=hashlib.sha256(raw).hexdigest()))
 if run.returncode:raise RuntimeError('Required check failed: '+name)
verify();receipt.update(allPassed=True,sourceUnchanged=True,finishedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat())
(out/'execution.json').write_text(json.dumps(receipt,indent=2)+chr(10))
(out/'source.json').write_text(json.dumps(expected,indent=2)+chr(10))
print(json.dumps({p.name:dict(sha256=hashlib.sha256(p.read_bytes()).hexdigest(),base64=base64.b64encode(p.read_bytes()).decode()) for p in out.iterdir() if p.is_file()}))
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-app-v88-clean-20261112','run','--','python3','-I','-']
run=subprocess.run(cmd,input=code.encode(),capture_output=True);(out/'stderr.log').write_bytes(run.stderr)
(out/'launch.json').write_text(json.dumps(dict(command=cmd,exitCode=run.returncode,jobSHA256=hashlib.sha256(code.encode()).hexdigest()),indent=2)+'\n')
assert run.returncode==0,run.stderr.decode()
for name,row in json.loads(run.stdout).items():
 assert pathlib.PurePosixPath(name).name==name
 raw=base64.b64decode(row['base64'],validate=True);assert hashlib.sha256(raw).hexdigest()==row['sha256'];(out/name).write_bytes(raw)
print((out/'execution.json').read_text())
