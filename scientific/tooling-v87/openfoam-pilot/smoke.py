"""Guest-only upstream smoke; serial dummy Pstream, no matched physics claim."""
import hashlib,json,os,resource,shutil,subprocess,time
from pathlib import Path
root=Path.cwd(); out=root/'evidence'; install=root/'tools/opt/openfoam14'
binary=install/'platforms/linuxArm64GccDPInt32Opt'
env=os.environ.copy(); env.update(WM_PROJECT_DIR=str(install),WM_PROJECT_VERSION='14',
    FOAM_ETC=str(install/'etc'),FOAM_LIBBIN=str(binary/'lib'),
    LD_LIBRARY_PATH=str(binary/'lib/dummy')+':'+str(binary/'lib'),
    PATH=str(binary/'bin')+':'+str(install/'bin')+':'+env['PATH'])
source=install/'tutorials/fluid/cavity'; case=root/'fluid-cavity'
shutil.copytree(source,case)
initial={str(p.relative_to(case)):hashlib.sha256(p.read_bytes()).hexdigest()
         for p in sorted(case.rglob('*')) if p.is_file()}
receipt={'role':'unchanged upstream compressible air RAS cavity installation smoke',
         'parallelQualified':False,'matchedPlasmaOrArgonValidated':False,
         'upstreamCase':'tutorials/fluid/cavity','initialSHA256':initial,
         'environment':{k:env[k] for k in ('WM_PROJECT_DIR','WM_PROJECT_VERSION','FOAM_ETC',
                                         'FOAM_LIBBIN','LD_LIBRARY_PATH','PATH')},
         'commands':[]}
for args in (['foamRun','-help'],['blockMesh','-help'],['blockMesh','-case',str(case)],
             ['checkMesh','-case',str(case)],['foamRun','-case',str(case)]):
    start=time.monotonic()
    result=subprocess.run(args,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    name='smoke-'+str(len(receipt['commands']))+'.log'
    (out/name).write_text(result.stdout)
    receipt['commands'].append({'args':args,'exitCode':result.returncode,'log':name,
                               'wallSeconds':time.monotonic()-start})
    print(name,result.returncode,result.stdout[-1600:],flush=True)
    if result.returncode: break
receipt['allPassed']=all(c['exitCode']==0 for c in receipt['commands']) and len(receipt['commands'])==5
receipt['peakChildRSSKiB']=resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss
receipt['pythonVersion']=__import__('sys').version
(out/'smoke-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
if not receipt['allPassed']: raise SystemExit(1)
