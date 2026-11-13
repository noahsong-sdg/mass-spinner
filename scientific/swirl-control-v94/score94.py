"""Fixed analytic gates, independent of the native and FE equation assembly."""
import json,sys
from pathlib import Path
import numpy as np
from control94 import (geometry,AMP,RATE,TIMES,JOBS,MODEL,label,mode,sha,verify_sources)
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scientific/graded-endwall-v93'))
from score93 import weights


def compare(actual,initial,index,n,local,increment,factor=1.):
    if index not in (1,2,3):raise ValueError('Need a positive saved clock')
    w=weights(n,float(TIMES[index]),local)
    exact=initial*(np.expm1(-RATE*TIMES[index]) if increment else np.exp(-RATE*TIMES[index]))
    value=(actual[index]-actual[0]) if increment else actual[index]
    rms=lambda v:float(np.sqrt(np.sum(w*v*v)/w.sum()))
    absolute=rms((value-exact)*factor);scale=rms(exact*factor)
    if not scale:raise ValueError('Nonzero analytic scale required')
    return dict(absoluteRMS=absolute,scaleRMS=scale,relative=absolute/scale)


def load(path):
    data=json.loads((path/'predictions.json').read_text());rows=data['cases'];packets={}
    if (data.get('model')!=MODEL or data.get('timesS')!=TIMES.tolist()
            or data.get('amplitudeMPS')!=AMP or data.get('decayRatePerS')!=RATE):
        raise ValueError('Analytic control metadata mismatch')
    if len(rows)!=len(JOBS) or {r['label'] for r in rows}!={label(*j) for j in JOBS}:
        raise ValueError('Complete frozen campaign required')
    for row in rows:
        n,s,a=row['n'],row['steps'],row['scale']
        if (n,s,a) not in JOBS or row['label']!=label(n,s,a) or row['axialGrade']!=4. or row['halfAngleDeg']!=.5 or not row['completed']:
            raise ValueError('Case metadata mismatch')
        p=path/row['packet']
        if p.name!=row['label']+'.npz' or p.parent!=path or sha(p)!=row['packetSHA256']:raise ValueError('Packet identity mismatch')
        with np.load(p,allow_pickle=False) as archive:q={k:archive[k] for k in archive.files}
        for k in ('native','v86','nativeR','nativeZ'):
            shape=(4,2*n,n) if k in ('native','v86') else (2*n,n)
            if q[k].shape!=shape or not np.all(np.isfinite(q[k])):raise ValueError('Invalid packet field')
        f=geometry(n,axialGrade=4.);r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
        for solver,initial in [('native',AMP*a*mode(q['nativeR'],q['nativeZ'])),('v86',AMP*a*mode(r,z))]:
            np.testing.assert_allclose(q[solver][0],initial,rtol=5e-14,atol=1e-25)
        if [h['timeS'] for h in row['v86']['history']]!=TIMES.tolist():raise ValueError('Own reporting clock mismatch')
        packets[row['label']]=q
    return data,packets


def audit(path):
    verify_sources();data,packets=load(path);sets={k:[] for k in ('analytic','spatial','temporal','linearity','conservation')}
    errors={};recovery=[]
    def gate(group,name,value,limit):
        sets[group].append(dict(name=name,value=float(value),limit=limit,passed=bool(np.isfinite(value) and value<limit)))
    for row in data['cases']:
        name=row['label'];q=packets[name];n=row['n'];f=geometry(n,axialGrade=4.)
        for solver in ('native','v86'):
            for i in (1,2,3):
                for local in (False,True):
                    for inc in (False,True):
                        key=f'{name}/{solver}/{i}/{int(local)}/{int(inc)}'
                        errors[key]=compare(q[solver],q[solver][0],i,n,local,inc)
                        if row['steps']==512:gate('analytic',key,errors[key]['relative'],.05)
                        if solver=='native':
                            factor=q['nativeR']*f.mean_r/f.mean_r2
                            recovery.append(dict(name=key,**compare(q[solver],q[solver][0],i,n,local,inc,factor)))
        gate('linearity',name+'/meridional',row['native']['peakMeridionalOverAmplitude'],1e-4)
        history=row['v86']['history']
        for k,limit in [('massKg',1e-8),('energyJ',1e-6)]:
            gate('conservation',name+'/'+k,max(abs(h[k]/history[0][k]-1) for h in history),limit)
    for solver in ('native','v86'):
        for i in (1,2,3):
            for local in (False,True):
                for inc in (False,True):
                    tag=f'{solver}/{i}/{int(local)}/{int(inc)}'
                    e=[errors[label(n,256,1.)+'/'+tag]['relative'] for n in (16,32,64)]
                    for j in (0,1):gate('spatial',tag+'/'+str(j),e[j+1]/e[j],1.)
                    fields=[packets[label(64,s,1.)][solver] for s in (128,256,512)]
                    w=weights(64,float(TIMES[i]),local);rms=lambda v:float(np.sqrt(np.sum(w*v*v)/w.sum()))
                    v=[a[i]-a[0] if inc else a[i] for a in fields]
                    exact=fields[0][0]*(np.expm1(-RATE*TIMES[i]) if inc else np.exp(-RATE*TIMES[i]))
                    diff=[rms(v[j+1]-v[j])/rms(exact) for j in (0,1)]
                    gate('temporal',tag+'/fine',diff[-1],.02)
                    gate('temporal',tag+'/contraction',diff[-1]/diff[0] if diff[0] else float('inf'),1.)
                full=packets[label(64,256,1.)][solver];half=packets[label(64,256,.5)][solver]
                x=(full[i]-full[0])/AMP;y=(half[i]-half[0])/(AMP*.5)
                w=weights(64,float(TIMES[i]),local)
                error=np.sqrt(np.sum(w*(x-y)**2)/np.sum(w*(full[0]/AMP*np.expm1(-RATE*TIMES[i]))**2))
                gate('linearity',f'{solver}/{i}/{int(local)}/half-response',error,.001)
    verify_sources()
    return dict(sets=sets,analyticErrors=errors,integratedRecoveryDiagnostic=recovery,
        analyticControlPass=all(g['passed'] for v in sets.values() for g in v),
        coupledReleaseQualified=False,experimentalQualification=False,livePlaygroundQualified=False)


if __name__=='__main__':
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False);result=audit(Path('study-results'))
    (out/'audit.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    for k,v in result['sets'].items():print(k,json.dumps(dict(gates=len(v),failed=[g for g in v if not g['passed']])),flush=True)
    raise SystemExit(not result['analyticControlPass'])
