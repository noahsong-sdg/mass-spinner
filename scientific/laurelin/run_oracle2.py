import base64,hashlib,json,os,subprocess,sys,time
from pathlib import Path

def sha(b):return hashlib.sha256(b).hexdigest()
raw=sys.stdin.buffer.read()
if sha(raw)!=sys.argv[1]:raise ValueError('Wrong transfer')
files=json.loads(raw);root=Path('/work/project/laurelin-oracle202');root.mkdir(exist_ok=False)
for name,entry in files.items():
    if Path(name).name!=name:raise ValueError('Unsafe path')
    b=base64.b64decode(entry['base64'],validate=True)
    if sha(b)!=entry['sha256']:raise ValueError('Wrong payload')
    (root/name).write_bytes(b)
(root/'input.json').write_bytes(raw);(root/'controller.py').write_text(sys.orig_argv[2])
python='/work/home/v90-venv/bin/python';rows=[]
red=root/'prejson';red.mkdir();(red/'oracle2-cases.json').write_bytes((root/'oracle2-cases.json').read_bytes());(red/'oracle2.py').write_bytes((root/'oracle2-prejson.py').read_bytes());(red/'test_oracle2.py').write_bytes((root/'test_oracle2.py').read_bytes())
redcmd=[python,'-m','unittest','discover','-s',str(red),'-p','test_oracle2.py','-v']
with (root/'red.log').open('x') as stream:
    redresult=subprocess.run(redcmd,cwd=red,stdout=stream,stderr=subprocess.STDOUT,env=dict(os.environ,OPENBLAS_NUM_THREADS='1',OMP_NUM_THREADS='1'))
if redresult.returncode==0 or 'Object of type bool is not JSON serializable' not in (root/'red.log').read_text():raise ValueError('Expected red regression not reproduced')
print('Expected serialization regression reproduced',flush=True)
commands=[('tests',[python,'-m','unittest','discover','-s',str(root),'-p','test_oracle2.py','-v']),
          ('comparison',[python,str(root/'oracle2.py'),str(root/'production.json'),str(root/'comparison.json')])]
for label,command in commands:
    start=time.monotonic()
    with (root/(label+'.log')).open('x') as stream:
        result=subprocess.run(command,cwd=root,stdout=stream,stderr=subprocess.STDOUT,
            env=dict(os.environ,OPENBLAS_NUM_THREADS='1',OMP_NUM_THREADS='1'))
    rows.append(dict(label=label,command=command,exitCode=result.returncode,elapsedS=time.monotonic()-start,logSHA256=sha((root/(label+'.log')).read_bytes())))
    (root/'execution.json').write_text(json.dumps(dict(transferSHA256=sha(raw),sourceSHA256={n:e['sha256'] for n,e in files.items()},executions=rows),indent=2)+'\n')
    print((root/(label+'.log')).read_text(),flush=True)
    for n,e in files.items():
        if sha((root/n).read_bytes())!=e['sha256']:raise ValueError('Oracle source changed')
    if result.returncode:raise RuntimeError('Stage failed: '+label)
