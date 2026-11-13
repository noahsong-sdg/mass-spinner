"""Independent prospective gates; run inside the dedicated safe-dev guest."""
import hashlib,json,sys,zipfile
from pathlib import Path
import numpy as np


def rms(a,b,v):
    return float(np.sqrt(np.sum(v*(a-b)**2)/np.sum(v*b*b)))


def audit(root):
    packet=json.loads((root/'results/predictions.json').read_text()); gates=[]
    def gate(name,passed,**evidence): gates.append(dict(name=name,passed=bool(passed),**evidence))
    for name,digest in packet['sourceSHA256'].items():
        gate('source:'+name,hashlib.sha256((root/name).read_bytes()).hexdigest()==digest)
    rows=packet['cases']; index={(r['mode'],r['n'],r['steps'],r['halfAngleDeg'],r['amplitudeScale']):r for r in rows}
    for row in rows:
        label=row['label']; archive=root/'results'/row['archive']['path']
        gate(label+':archive',hashlib.sha256(archive.read_bytes()).hexdigest()==row['archive']['sha256'])
        with zipfile.ZipFile(archive) as packed:
            gate(label+':initial-input',all(hashlib.sha256(packed.read(p)).hexdigest()==h for p,h in row.get('inputSHA256',{}).items()))
        gate(label+':complete',row['completed'])
        if not row['completed']: continue
        gate(label+':analytic',row['analyticError']<.05,value=row['analyticError'],limit=.05)
        if row['mode']=='heat':
            gate(label+':inventory',row['heatRelativeDrift']<1e-10,value=row['heatRelativeDrift'])
            gate(label+':temperature',min(r['minimumK'] for r in row['history'])>0)
        else: gate(label+':monotone',row['energyMonotone'])
    for mode in ('heat','swirl'):
        def get(n,s=128,a=.5,x=1.): return index.get((mode,n,s,a,x))
        expected=[get(n) for n in (8,16,32)]+[get(32,s) for s in (64,256)]+[get(16,a=.25)]
        if mode=='swirl': expected.append(get(32,x=.5))
        ready=all(r is not None and r['completed'] for r in expected)
        gate(mode+':matrix',ready)
        if not ready: continue
        errors=[get(n)['analyticError'] for n in (8,16,32)]
        gate(mode+':space',errors[2]<.01 and all(b/a<.8 for a,b in zip(errors,errors[1:])),errors=errors)
        def values(row): return np.array(row['finalField'])-(2900 if mode=='heat' else 0)
        def difference(a,b): return rms(values(a),values(b),np.array(b['volume']))
        differences=[difference(get(32,64),get(32,128)),difference(get(32,128),get(32,256))]
        gate(mode+':time',differences[1]<.002 and differences[1]/differences[0]<.8,differences=differences)
        angle=difference(get(16),get(16,a=.25)); gate(mode+':angle',angle<.002,value=angle)
        if mode=='swirl':
            fine=get(32)
            for key in ('angularBudgetRelative','energyBudgetRelative'):
                gate(mode+':'+key,fine[key]<.05,value=fine[key])
            amplitude=rms(2*values(get(32,x=.5)),values(fine),np.array(fine['volume']))
            gate(mode+':linearization',amplitude<.001 and fine['maxMeridionalOverAmplitude']<.001,
                 normalizedAmplitudeDifference=amplitude,meridionalOverAmplitude=fine['maxMeridionalOverAmplitude'])
    result=dict(predictionSHA256=hashlib.sha256((root/'results/predictions.json').read_bytes()).hexdigest(),
        auditorSHA256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),gates=gates,
        allPassed=all(g['passed'] for g in gates),scope='Constant-property smooth neutral operators only; no experimental or V86 qualification.')
    (root/'results/audit.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    return result


if __name__=='__main__':
    result=audit(Path(__file__).resolve().parent)
    print(json.dumps(dict(passed=sum(g['passed'] for g in result['gates']),total=len(result['gates']),allPassed=result['allPassed'])))
    sys.exit(0 if result['allPassed'] else 1)
