"""Frozen native rigid/analytic gates; full failures remain visible."""
from sector96 import *


def load(path):
    data=json.loads((path/'predictions.json').read_text());rows=data['cases'];packets={}
    if (data.get('model')!=MODEL or data.get('candidate')!='cyclic' or data.get('scheme')!='leastSquares'
        or data.get('timesS')!=TIMES.tolist() or data.get('axialGrade')!=4. or data.get('halfAngleDeg')!=.5):
        raise ValueError('Periodic metadata mismatch')
    if data['sourceSHA256']!=json.loads((ROOT/'transfer.json').read_text()) or data['nativeSHA256']!=native_identity():
        raise ValueError('Prediction identity mismatch')
    if len(rows)!=len(JOBS) or {r['label'] for r in rows}!={label(*j) for j in JOBS}:raise ValueError('Complete frozen campaign required')
    for row in rows:
        kind,n,nz,steps=[row[k] for k in ('kind','n','nz','steps')];name=row['label']
        if (kind,n,nz,steps) not in JOBS or name!=label(kind,n,nz,steps) or not row['completed']:raise ValueError('Case metadata mismatch')
        p=path/row['packet']
        if p.parent!=path or p.name!=name+'.npz' or sha(p)!=row['packetSHA256']:raise ValueError('Packet identity mismatch')
        with np.load(p,allow_pickle=False) as a:q={k:a[k] for k in a.files}
        if set(q)!={'native','nativeR','nativeZ',('gradU' if kind=='rigid' else 'v86')}:raise ValueError('Packet fields mismatch')
        for k,v in q.items():
            shape=(4,nz,n,3,3) if k=='gradU' else (nz,n) if k in ('nativeR','nativeZ') else (4,nz,n)
            if v.shape!=shape or not np.all(np.isfinite(v)):raise ValueError('Invalid packet field')
        f=geometry(n,axialGrade=4.,axialCells=nz);r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
        np.testing.assert_allclose(q['nativeZ'],z,atol=1e-13,rtol=0)
        if not np.all((q['nativeR']>f.r[:-1])&(q['nativeR']<f.r[1:])):raise ValueError('Radial sample outside its cell')
        expected=AMP*q['nativeR']/R if kind=='rigid' else AMP*mode(q['nativeR'],z)
        np.testing.assert_allclose(q['native'][0],expected,atol=1e-25,rtol=5e-14)
        if kind=='decay':
            np.testing.assert_allclose(q['v86'][0],AMP*mode(r,z),atol=1e-25,rtol=5e-14)
            if [h['timeS'] for h in row['v86']['history']]!=TIMES.tolist():raise ValueError('Custom reporting clock mismatch')
        packets[name]=q
    return data,packets


def audit(path):
    verify_sources();data,packets=load(path);sets={k:[] for k in ('rigid','spatialAnalytic','temporalAnalytic','conservation','linearity')};errors={};rigid=[]
    def gate(group,name,value,limit):sets[group].append(dict(name=name,value=float(value),limit=limit,passed=bool(np.isfinite(value) and value<limit)))
    for row in data['cases']:
        kind,n,nz,steps=[row[k] for k in ('kind','n','nz','steps')];name=row['label'];q=packets[name]
        if kind=='rigid':
            for i,t in enumerate(TIMES):
                d=dict(label=name,timeS=float(t),**gradient_metrics(q['gradU'][i],n,nz),maxSwirlChangeOverA=float(np.max(np.abs(q['native'][i]-q['native'][0]))/AMP));rigid.append(d)
                for k in ('maxStrainOverOmega','maxSwirlChangeOverA'):gate('rigid',name+'/'+str(i)+'/'+k,d[k],1e-6)
            gate('rigid',name+'/meridional',row['native']['peakMeridionalOverAmplitude'],1e-6)
        else:
            for solver in ('native','v86'):
                for i in (1,2,3):
                    for local in (False,True):
                        for increment in (False,True):
                            tag=f'{name}/{solver}/{i}/{int(local)}/{int(increment)}';errors[tag]=error(q[solver],i,n,nz,local,increment)
                            group='spatialAnalytic' if (n,nz,steps)==(128,128,256) else 'temporalAnalytic' if (n,nz,steps)==(64,128,512) else None
                            if group:gate(group,tag,errors[tag]['relative'],.05)
            h=row['v86']['history']
            for k,limit in [('massKg',1e-8),('energyJ',1e-6)]:gate('conservation',name+'/'+k,max(abs(a[k]/h[0][k]-1) for a in h),limit)
        gate('linearity',name+'/meridional',row['native']['peakMeridionalOverAmplitude'],1e-4)
    verify_sources()
    return dict(sets=sets,analyticErrors=errors,rigidDiagnostics=rigid,diagnosticPass=all(g['passed'] for v in sets.values() for g in v),
        coupledReleaseQualified=False,experimentalQualification=False,livePlaygroundQualified=False)


if __name__=='__main__':
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False);result=audit(Path('study-results'))
    (out/'audit.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    for k,v in result['sets'].items():print(k,json.dumps(dict(gates=len(v),failed=[g for g in v if not g['passed']])),flush=True)
    raise SystemExit(not result['diagnosticPass'])
