"""Prospective saved-clock global/local and largest-grid temporal checks."""
import json
from pathlib import Path
import sys
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/coupled-openfoam-v90'))
from reference90 import geometry,H,RHO,MU,sha
from score90 import restrict,fields,require_packets

OLD=Path('/work/project/v91-endwall-source04/scientific/endwall-v91/candidate-results')
CLOCKS=((1,5e-6),(2,1e-5),(3,2e-5))


def verify_sources():
    for name,h in json.loads((ROOT/'transfer.json').read_text()).items():
        if sha(ROOT/name)!=h:raise ValueError('Source changed: '+name)
    for name,h in json.loads((ROOT/'references.json').read_text()).items():
        if sha(Path(name))!=h:raise ValueError('Referenced manifest changed: '+name)


def load(path):
    data=json.loads((path/'predictions.json').read_text())
    for row in data['cases']:
        for solver in ('native','v86'):
            h=row[solver]['history']
            if len(h)!=4 or not np.allclose([v['timeS'] for v in h],[0,5e-6,1e-5,2e-5],rtol=1e-12,atol=0):
                raise ValueError('Reporting clock mismatch')
    return data,require_packets(path,data['cases'])


def weights(n,t,local):
    if t not in [v for _,v in CLOCKS]:raise ValueError('Need a saved positive reporting clock')
    f=geometry(n)
    if not local:return f.volume
    boundary=H-4*np.sqrt(MU/RHO*t)
    overlap=np.clip((f.z[1:]-np.maximum(f.z[:-1],boundary))/np.diff(f.z),0,1)
    return f.volume*overlap[:,None]


def compare(a,b,index,increment=False,local=False):
    if index not in (1,2,3):raise ValueError('Need a noninitial saved frame')
    n=min(a.shape[-1],b.shape[-1]);v=weights(n,CLOCKS[index-1][1],local)
    a0,af,b0,bf=[fields(restrict(q,n)) for q in (a[0],a[index],b[0],b[index])]
    rms=lambda x:float(np.sqrt(np.sum(v*x*x)/v.sum()))
    result={}
    for key in af:
        x,y=(af[key]-a0[key],bf[key]-b0[key]) if increment else (af[key],bf[key])
        scale=max(rms(x),rms(y));absolute=rms(x-y)
        result[key]=dict(absoluteRMS=absolute,scaleRMS=scale,relative=None if not scale else absolute/scale)
    return result


def refinements(gates,name,pair,limit):
    for key in pair[0]:
        a,b=[c[key]['relative'] for c in pair]
        for kind,value,bound in [('fine',b,limit),('contraction',None if not a or b is None else b/a,1.)]:
            gates.append(dict(name=name+'/'+key+'/'+kind,value=value,limit=bound,
                passed=value is not None and np.isfinite(value) and value<bound))


def audit(new=None):
    verify_sources();rows=[];packets={}
    for group in ('extension-results','fine-results'):
        d,p=load(OLD/group);rows+=d['cases'];packets.update(p)
    if new is not None:
        d,p=load(new)
        expected={'n128-s512-a0.5-work1','n128-s2048-a0.5-work1'}
        if len(d['cases'])!=2 or set(p)!=expected:raise ValueError('Complete declared time sweep required')
        rows+=d['cases'];packets.update(p)
    sets={k:[] for k in ('finalGlobalSpatial','earlyGlobalSpatial','localSpatial','globalTemporal','localTemporal','conservation')}
    comparisons={};space=[packets[f'n{n}-s1024-a0.5-work1'] for n in (32,64,128)]
    for index,t in CLOCKS:
        for local in (False,True):
            region='local' if local else 'global'
            s=sets['localSpatial' if local else ('finalGlobalSpatial' if index==3 else 'earlyGlobalSpatial')]
            for inc in (False,True):
                tag=f'{region}/{t:.8g}/'+('increment' if inc else 'whole')
                cross=[compare(p['native'],p['v86'],index,inc,local) for p in space]
                comparisons[tag+'/cross']=cross
                refinements(s,tag+'/cross',cross[-2:],.05)
                for solver in ('native','v86'):
                    diff=[compare(space[i][solver],space[i+1][solver],index,inc,local) for i in (0,1)]
                    comparisons[tag+'/'+solver+'/space']=diff
                    refinements(s,tag+'/'+solver+'/space',diff,.05)
                    if new is not None:
                        clock=[packets[f'n128-s{steps}-a0.5-work1'][solver] for steps in (512,1024,2048)]
                        diff=[compare(clock[i],clock[i+1],index,inc,local) for i in (0,1)]
                        comparisons[tag+'/'+solver+'/time']=diff
                        refinements(sets['localTemporal' if local else 'globalTemporal'],tag+'/'+solver+'/time',diff,.02)
    if new is not None:
        for row in [r for r in rows if r['n']==128]:
            for solver in ('native','v86'):
                h=row[solver]['history']
                for key,limit in [('massKg',1e-8),('energyJ',1e-6)]:
                    value=max(abs(v[key]/h[0][key]-1) for v in h)
                    sets['conservation'].append(dict(name=row['label']+'/'+solver+'/'+key,value=value,limit=limit,passed=value<limit))
            h=row['native']['history'];value=abs((h[-1]['angularKgM2S']-h[0]['angularKgM2S']+row['native']['wallImpulseKgM2S'])/h[0]['angularKgM2S'])
            sets['conservation'].append(dict(name=row['label']+'/wall-angular',value=value,limit=.01,passed=value<.01))
    verify_sources()
    return dict(sets=sets,comparisons=comparisons,temporalStudyComplete=new is not None,
        numericalComparisonPass=new is not None and all(g['passed'] for v in sets.values() for g in v),experimentalQualification=False)


if __name__=='__main__':
    mode,out=sys.argv[1:];out=Path(out);out.mkdir(exist_ok=False)
    if mode not in ('preflight','score'):raise ValueError('Unknown study phase')
    result=audit(Path('study-results') if mode=='score' else None)
    (out/'audit.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    for key,gates in result['sets'].items():
        print(key,json.dumps(dict(gates=len(gates),failed=[g for g in gates if not g['passed']])),flush=True)
    raise SystemExit(0 if mode=='preflight' else not result['numericalComparisonPass'])
