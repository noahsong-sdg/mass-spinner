"""Actual graded-volume comparisons; V92 limits and failed gates stay intact."""
import json
from pathlib import Path
import sys
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/wall-transient-v92'))
from score92 import verify_sources,refinements,CLOCKS
from reference90 import geometry,H,MU,RHO,sha
from score90 import restrict,require_packets

GRADE=4.
JOBS=((16,2048),(32,2048),(64,2048),(64,1024),(64,4096))
label=lambda n,s:f'g4-n{n}-s{s}'


def weights(n,t,local):
    if t not in [v for _,v in CLOCKS]:raise ValueError('Need a positive saved clock')
    f=geometry(n,axialGrade=GRADE)
    if not local:return f.volume
    boundary=H-4*np.sqrt(MU/RHO*t)
    overlap=np.clip((f.z[1:]-np.maximum(f.z[:-1],boundary))/np.diff(f.z),0,1)
    return f.volume*overlap[:,None]


def compare(a,b,index,increment=False,local=False):
    if index not in (1,2,3):raise ValueError('Need a positive saved frame')
    n=min(a.shape[-1],b.shape[-1]);f=geometry(n,axialGrade=GRADE)
    def fields(q):
        p=f.primitive(restrict(q,n))
        return dict(rho=p['densityKgM3'],T=p['temperatureK'],swirl=p['omegaRadS']*f.mean_r,
                    meridional=np.array([p['vrMPS'],p['vzMPS']]))
    a0,af,b0,bf=[fields(q) for q in (a[0],a[index],b[0],b[index])]
    v=weights(n,CLOCKS[index-1][1],local)
    rms=lambda x:float(np.sqrt(np.sum(v*x*x)/v.sum()))
    rows={}
    for key in af:
        x,y=(af[key]-a0[key],bf[key]-b0[key]) if increment else (af[key],bf[key])
        scale=max(rms(x),rms(y));absolute=rms(x-y)
        rows[key]=dict(absoluteRMS=absolute,scaleRMS=scale,relative=None if not scale else absolute/scale)
    return rows


def load(path):
    data=json.loads((path/'predictions.json').read_text());rows=data['cases']
    if len(rows)!=len(JOBS) or {r['label'] for r in rows}!={label(*j) for j in JOBS}:
        raise ValueError('Complete declared graded campaign required')
    for row in rows:
        if row['axialGrade']!=GRADE or row['label']!=label(row['n'],row['steps']):
            raise ValueError('Graded case metadata mismatch')
        for solver in ('native','v86'):
            if not np.allclose([h['timeS'] for h in row[solver]['history']],[0,5e-6,1e-5,2e-5],rtol=1e-12,atol=0):
                raise ValueError('Reporting clock mismatch')
    packets=require_packets(path,rows)
    for row in rows:
        f=geometry(row['n'],axialGrade=GRADE)
        for packet in packets[row['label']].values():
            for q in packet:f.primitive(q)
    return data,packets


def audit(path):
    verify_sources();data,packets=load(path)
    sets={k:[] for k in ('globalSpatial','localSpatial','globalTemporal','localTemporal','conservation')}
    comparisons={};projections=[]
    space=[packets[label(n,2048)] for n in (16,32,64)]
    for index,t in CLOCKS:
        for local in (False,True):
            region='local' if local else 'global'
            for inc in (False,True):
                tag=f'{region}/{t:.8g}/'+('increment' if inc else 'whole')
                s=sets['localSpatial' if local else 'globalSpatial']
                cross=[compare(p['native'],p['v86'],index,inc,local) for p in space]
                comparisons[tag+'/cross']=cross;refinements(s,tag+'/cross',cross[-2:],.05)
                for solver in ('native','v86'):
                    diff=[compare(space[i][solver],space[i+1][solver],index,inc,local) for i in (0,1)]
                    comparisons[tag+'/'+solver+'/space']=diff;refinements(s,tag+'/'+solver+'/space',diff,.05)
                    clock=[packets[label(64,steps)][solver] for steps in (1024,2048,4096)]
                    diff=[compare(clock[i],clock[i+1],index,inc,local) for i in (0,1)]
                    comparisons[tag+'/'+solver+'/time']=diff
                    refinements(sets['localTemporal' if local else 'globalTemporal'],tag+'/'+solver+'/time',diff,.02)
                    projected=[np.array([restrict(q,16) for q in p[solver]]) for p in space]
                    projections.append(dict(tag=tag,solver=solver,commonGrid=16,admission=False,
                        differences=[compare(projected[i],projected[i+1],index,inc,local) for i in (0,1)]))
    for row in data['cases']:
        for solver in ('native','v86'):
            h=row[solver]['history']
            for key,limit in [('massKg',1e-8),('energyJ',1e-6)]:
                value=max(abs(v[key]/h[0][key]-1) for v in h)
                sets['conservation'].append(dict(name=row['label']+'/'+solver+'/'+key,value=value,limit=limit,passed=value<limit))
        h=row['native']['history'];value=abs((h[-1]['angularKgM2S']-h[0]['angularKgM2S']+row['native']['wallImpulseKgM2S'])/h[0]['angularKgM2S'])
        sets['conservation'].append(dict(name=row['label']+'/wall-angular',value=value,limit=.01,passed=value<.01))
    verify_sources()
    return dict(sets=sets,comparisons=comparisons,fixedProjectionDiagnostics=projections,
        numericalComparisonPass=all(g['passed'] for v in sets.values() for g in v),
        experimentalQualification=False,livePlaygroundQualified=False)


if __name__=='__main__':
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False);result=audit(Path('study-results'))
    (out/'audit.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    for k,gates in result['sets'].items():
        print(k,json.dumps(dict(gates=len(gates),failed=[g for g in gates if not g['passed']])),flush=True)
    raise SystemExit(not result['numericalComparisonPass'])
