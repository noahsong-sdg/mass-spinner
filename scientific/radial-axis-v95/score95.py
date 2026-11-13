"""Directional analytic and zero-strain gates; no fitted normalization."""
import json,sys
from pathlib import Path
import numpy as np
from study95 import *


def weights(n,nz,t,local):
    f=geometry(n,axialGrade=4.,axialCells=nz)
    if not local:return f.volume
    if t not in TIMES[1:]:raise ValueError('Need a positive saved clock')
    from control94 import NU
    b=H-4*np.sqrt(NU*t)
    return f.volume*np.clip((f.z[1:]-np.maximum(f.z[:-1],b))/np.diff(f.z),0,1)[:,None]


def error(q,index,n,nz,local,increment):
    if index not in (1,2,3):raise ValueError('Need a positive saved frame')
    w=weights(n,nz,TIMES[index],local)
    exact=q[0]*(np.expm1(-RATE*TIMES[index]) if increment else np.exp(-RATE*TIMES[index]))
    a=q[index]-q[0] if increment else q[index]
    scale=float(np.sqrt(np.sum(w*exact**2)/w.sum()))
    absolute=float(np.sqrt(np.sum(w*(a-exact)**2)/w.sum()))
    return dict(relative=absolute/scale,absoluteRMS=absolute,scaleRMS=scale)


def strain(g):
    s=(g+np.swapaxes(g,-1,-2))/2
    return s-np.eye(3)*np.trace(s,axis1=-2,axis2=-1)[...,None,None]/3


def load(path):
    data=json.loads((path/'predictions.json').read_text());rows=data['cases'];packets={}
    if (data.get('model')!=MODEL or data.get('timesS')!=TIMES.tolist() or data.get('steps')!=256
            or data.get('axialGrade')!=4. or data.get('halfAngleDeg')!=.5):raise ValueError('Directional metadata mismatch')
    if data['sourceSHA256']!=json.loads((ROOT/'transfer.json').read_text()):raise ValueError('Prediction source mismatch')
    if len(rows)!=len(JOBS) or {r['label'] for r in rows}!={label(*j) for j in JOBS}:raise ValueError('Complete frozen campaign required')
    for row in rows:
        k,n,nz,s=[row[v] for v in ('kind','n','nz','gradient')]
        if (k,n,nz,s) not in JOBS or row['label']!=label(k,n,nz,s) or not row['completed']:raise ValueError('Case metadata mismatch')
        p=path/row['packet']
        if p.name!=row['label']+'.npz' or p.parent!=path or sha(p)!=row['packetSHA256']:raise ValueError('Packet identity mismatch')
        with np.load(p,allow_pickle=False) as a:q={k:a[k] for k in a.files}
        keys={'native','nativeR','nativeZ'}|({'v86'} if k=='decay' and s=='Gauss linear' else set())|({'gradU'} if k=='rigid' else set())
        if set(q)!=keys:raise ValueError('Packet fields mismatch')
        for name,v in q.items():
            shape=(4,nz,n,3,3) if name=='gradU' else ((nz,n) if name in ('nativeR','nativeZ') else (4,nz,n))
            if v.shape!=shape or not np.all(np.isfinite(v)):raise ValueError('Invalid packet field')
        f=geometry(n,axialGrade=4.,axialCells=nz);r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
        np.testing.assert_allclose(q['nativeZ'],z,atol=1e-13,rtol=0)
        if not np.all((q['nativeR']>f.r[:-1])&(q['nativeR']<f.r[1:])):raise ValueError('Radial sample outside its cell')
        initial=AMP*q['nativeR']/R if k=='rigid' else AMP*mode(q['nativeR'],q['nativeZ'])
        np.testing.assert_allclose(q['native'][0],initial,rtol=5e-14,atol=1e-25)
        if 'v86' in q:
            np.testing.assert_allclose(q['v86'][0],AMP*mode(r,z),rtol=5e-14,atol=1e-25)
            if [h['timeS'] for h in row['v86']['history']]!=TIMES.tolist():raise ValueError('Own reporting clock mismatch')
        packets[row['label']]=q
    return data,packets


def audit(path):
    verify_sources();data,packets=load(path);sets={k:[] for k in ('radialAnalytic','axialAnalytic','leastSquaresAnalytic','rigid','conservation','linearity')};errors={};rigid=[]
    def gate(group,name,value,limit):sets[group].append(dict(name=name,value=float(value),limit=limit,passed=bool(np.isfinite(value) and value<limit)))
    for row in data['cases']:
        name=row['label'];n,nz=row['n'],row['nz'];q=packets[name]
        if row['kind']=='decay':
            for solver in ('native','v86'):
                if solver not in q:continue
                for i in (1,2,3):
                    for local in (False,True):
                        for inc in (False,True):
                            tag=f'{name}/{solver}/{i}/{int(local)}/{int(inc)}';errors[tag]=error(q[solver],i,n,nz,local,inc)
                            group=('leastSquaresAnalytic' if row['gradient']=='leastSquares' else
                                   'radialAnalytic' if (n,nz)==(128,128) else 'axialAnalytic' if (n,nz)==(64,256) else None)
                            if group:gate(group,tag,errors[tag]['relative'],.05)
        else:
            f=geometry(n,axialGrade=4.,axialCells=nz)
            for i,t in enumerate(TIMES):
                norm=np.sqrt(np.sum(strain(q['gradU'][i])**2,axis=(-2,-1)))/(AMP/R)
                record=dict(label=name,timeS=float(t),maxStrainOverOmega=float(norm.max()),rmsStrainOverOmega=float(np.sqrt(np.sum(f.volume*norm**2)/f.volume.sum())),axisMaxStrainOverOmega=float(norm[:,0].max()),maxSwirlChangeOverA=float(np.max(np.abs(q['native'][i]-q['native'][0]))/AMP))
                rigid.append(record)
                for key in ('maxStrainOverOmega','maxSwirlChangeOverA'):gate('rigid',name+'/'+str(i)+'/'+key,record[key],1e-6)
            gate('rigid',name+'/meridional',row['native']['peakMeridionalOverAmplitude'],1e-6)
        gate('linearity',name+'/meridional',row['native']['peakMeridionalOverAmplitude'],1e-4)
        if 'v86' in row:
            history=row['v86']['history']
            for key,limit in [('massKg',1e-8),('energyJ',1e-6)]:gate('conservation',name+'/'+key,max(abs(h[key]/history[0][key]-1) for h in history),limit)
    verify_sources()
    return dict(sets=sets,analyticErrors=errors,rigidDiagnostics=rigid,
        diagnosticPass=all(g['passed'] for v in sets.values() for g in v),coupledReleaseQualified=False,experimentalQualification=False,livePlaygroundQualified=False)


if __name__=='__main__':
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False);result=audit(Path('study-results'))
    (out/'audit.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    for k,v in result['sets'].items():print(k,json.dumps(dict(gates=len(v),failed=[g for g in v if not g['passed']])),flush=True)
    raise SystemExit(not result['diagnosticPass'])
