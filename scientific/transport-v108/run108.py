import base64,hashlib,json,os,subprocess,sys,time
from pathlib import Path

def sha(raw):return hashlib.sha256(raw).hexdigest()
producer=Path('/work/project/v107-candidate01');transfer=producer/'transfer.json'
if sha(transfer.read_bytes())!='31d24d7550a869e830e561c5276270b8daedeb8b948da30c54107cb801997cef':raise ValueError('Wrong producer')
source=json.loads(transfer.read_bytes())
def verify():
    for name,digest in source.items():
        if sha((producer/name).read_bytes())!=digest:raise ValueError('Frozen source changed: '+name)
verify()
raw=sys.stdin.buffer.read()
if sha(raw)!=sys.argv[1]:raise ValueError('Wrong transfer')
files=json.loads(raw);root=Path('/work/project/v108-transport09');root.mkdir(exist_ok=False)
for name,entry in files.items():
    if Path(name).name!=name:raise ValueError('Unsafe path')
    content=base64.b64decode(entry['base64'],validate=True)
    if sha(content)!=entry['sha256']:raise ValueError('Wrong payload')
    (root/name).write_bytes(content)
(root/'transfer.json').write_bytes(raw);(root/'controller.py').write_text(sys.orig_argv[2])
env=dict(os.environ,OPENBLAS_NUM_THREADS='1',OMP_NUM_THREADS='1',MKL_NUM_THREADS='1',PYTHONPATH=':'.join(str(producer/'scientific'/name) for name in ('source-v105','heat-v106','meridional-v86','mixture-axial-v75')))
python='/work/home/v90-venv/bin/python';rows=[]
for label,cmd in [
    ('runtime',[python,'-c',"import importlib.metadata as m,json,sys; print(json.dumps(dict(python=sys.version,packages={n:m.version(n) for n in ('numpy','scipy','scikit-fem','fipy')})))"]),
    ('tests',[python,'-m','unittest','discover','-s',str(root),'-p','test_transport108.py','-v']),
    ('independent',[python,'-m','unittest','discover','-s',str(root),'-p','test_independent108.py','-v']),
    ('moment-tests',[python,'-m','unittest','discover','-s',str(root),'-p','test_moment108.py','-v']),
    ('evolution',[python,'-m','unittest','discover','-s',str(root),'-p','test_evolution108.py','-v']),
    ('capacity-heat',[python,'-m','unittest','discover','-s',str(root),'-p','test_capacity_heat108.py','-v']),
    ('analysis',[python,str(root/'driver.py')]),
    ('moment-analysis',[python,str(root/'moment_driver108.py')])]:
    start=time.monotonic()
    with (root/(label+'.log')).open('x') as stream:result=subprocess.run(cmd,cwd=root,env=env,stdout=stream,stderr=subprocess.STDOUT)
    rows.append(dict(label=label,command=cmd,exitCode=result.returncode,elapsedS=time.monotonic()-start,logSHA256=sha((root/(label+'.log')).read_bytes())))
    (root/'execution.json').write_text(json.dumps(dict(transferSHA256=sha(raw),sourceSHA256={n:e['sha256'] for n,e in files.items()},executions=rows),indent=2)+'\n')
    print((root/(label+'.log')).read_text(),flush=True);verify()
    for n,e in files.items():
        if sha((root/n).read_bytes())!=e['sha256']:raise ValueError('Probe source changed')
    if result.returncode:raise RuntimeError('Stage failed: '+label)