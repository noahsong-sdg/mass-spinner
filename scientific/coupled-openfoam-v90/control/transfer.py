"""Trusted host file transfer/control only; all project execution in safe-dev."""
import base64,datetime,hashlib,json,pathlib,subprocess,sys
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6')
S='/private/tmp/mass-spinner-openfoam-v87-20261112'
name=sys.argv[1]
assert name.startswith('v90-') and name.replace('-','').isalnum()
out=P/'scientific/coupled-openfoam-v90'/('launch-'+name+'.json')
assert not out.exists()
paths=['scientific/coupled-openfoam-v90/'+f for f in ['reference90.py','score90.py','test_reference90.py','PROTOCOL.md','REFINEMENT.md','requirements.txt']]
paths+=['scientific/'+f for f in ['mixture-axial-v75/flow.py','meridional-v86/diffusion86.py','expert-v88/openfoam/reference88.py']]
paths+=['scientific/'+f for f in ['mixture-axial-v75/test_flow.py','meridional-v86/test_diffusion86.py']]
data={p:base64.b64encode((P/p).read_bytes()).decode() for p in paths}
hashes={p:hashlib.sha256((P/p).read_bytes()).hexdigest() for p in paths}
code='data='+repr(data)+'\nexpected='+repr(hashes)+'\nname='+repr(name)+'\n'+r'''
import base64,hashlib,json,pathlib,platform,os
assert platform.system()=='Linux' and os.getuid()==1000
root=pathlib.Path('/work/project')/name
root.mkdir(exist_ok=False)
for p,s in data.items():
 b=base64.b64decode(s,validate=True);assert hashlib.sha256(b).hexdigest()==expected[p]
 q=root/p;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b)
assert all(hashlib.sha256((root/p).read_bytes()).hexdigest()==h for p,h in expected.items())
(root/'transfer.json').write_text(json.dumps(expected,indent=2)+'\n')
print(json.dumps(dict(sourceRoot=str(root),files=len(expected),hashes=expected)))
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C',S,'run','--','python3','-I','-']
run=subprocess.run(cmd,input=code.encode(),capture_output=True)
receipt=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),stage=S,name=name,command=cmd,
 sourceSHA256=hashes,jobSHA256=hashlib.sha256(code.encode()).hexdigest(),exitCode=run.returncode,
 stdout=run.stdout.decode(),stderr=run.stderr.decode())
out.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(dict(exitCode=run.returncode,receipt=str(out))))
raise SystemExit(run.returncode)
