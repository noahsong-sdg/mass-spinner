"""Trusted host snapshot/launch/readback. Scientific execution stays in safe-dev."""
import base64,datetime,hashlib,json,pathlib,subprocess,sys
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6')
name,phase=sys.argv[1:];assert name.startswith('v91-') and name.replace('-','').isalnum()
assert phase in ('probe','refine','score','tests','inspect','candidate')
out=P/'scientific/endwall-v91';receipt=out/(name+'-'+phase+'.json');log=out/(name+'-'+phase+'.log')
assert not receipt.exists() and not log.exists()
paths=['scientific/'+s for s in ['mixture-axial-v75/flow.py','mixture-axial-v75/test_flow.py',
 'meridional-v86/diffusion86.py','meridional-v86/test_diffusion86.py','expert-v88/openfoam/reference88.py']]
paths += ['scientific/coupled-openfoam-v90/'+s for s in ['reference90.py','score90.py','test_reference90.py','PROTOCOL.md','REFINEMENT.md','requirements.txt']]
paths += [str(p.relative_to(P)) for p in sorted(out.glob('*.py'))]+[str(p.relative_to(P)) for p in sorted(out.glob('*.md'))]
data={k:base64.b64encode((P/k).read_bytes()).decode() for k in paths}
expected={k:hashlib.sha256((P/k).read_bytes()).hexdigest() for k in paths}
code='name='+repr(name)+'\nphase='+repr(phase)+'\ndata='+repr(data)+'\nexpected='+repr(expected)+'\n'+r'''
import base64,datetime,hashlib,json,os,pathlib,subprocess,time
assert os.getuid()==1000
root=pathlib.Path('/work/project')/name
if root.exists():
 assert json.loads((root/'transfer.json').read_text())==expected
else:
 root.mkdir()
 for k,v in data.items():
  raw=base64.b64decode(v,validate=True);assert hashlib.sha256(raw).hexdigest()==expected[k]
  p=root/k;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
 (root/'transfer.json').write_text(json.dumps(expected,indent=2)+chr(10))
def verify():
 for k,h in expected.items():assert hashlib.sha256((root/k).read_bytes()).hexdigest()==h,k
verify();here=root/'scientific/endwall-v91';py='/work/home/v90-venv/bin/python'
args=[py,'-u',{'probe':'probe91.py','refine':'refine91.py','score':'score91.py','tests':'test91.py','inspect':'inspect91.py','candidate':'candidate91.py'}[phase],phase+'-results']
started=time.monotonic();print('RUN',args,flush=True)
with (here/(phase+'.log')).open('x') as log:
 run=subprocess.Popen(args,cwd=here,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 for line in run.stdout:log.write(line);log.flush();print(line,end='',flush=True)
 exitcode=run.wait()
record=dict(args=args,exitCode=exitcode,wallSeconds=time.monotonic()-started,sourceSHA256=expected)
verify();record['sourceUnchanged']=True
(here/(phase+'-execution.json')).write_text(json.dumps(record,indent=2)+chr(10))
print('RECEIPT',json.dumps(record),flush=True)
raise SystemExit(exitcode)
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','python3','-I','-']
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
with log.open('xb') as f:run=subprocess.run(cmd,input=code.encode(),stdout=f,stderr=subprocess.STDOUT)
receipt.write_text(json.dumps(dict(command=cmd,exitCode=run.returncode,startedUTC=start,
 finishedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourceSHA256=expected,
 jobSHA256=hashlib.sha256(code.encode()).hexdigest(),logSHA256=hashlib.sha256(log.read_bytes()).hexdigest()),indent=2)+chr(10))
print(json.dumps(dict(exitCode=run.returncode,log=str(log))));raise SystemExit(run.returncode)
