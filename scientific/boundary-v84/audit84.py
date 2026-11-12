"""Independent saved-array checks; no producer imports or measured velocities."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import numpy as np

SEALED='a9cc96d31bf42f7039700dc5fae01f94ecaf12b98752c4dcf8c012fad39d3676'
NAMES={s+'-'+t for s in ('linear','quadratic') for t in ('finite-te1','finite-te2.5-source')}
SOURCES={'scientific/boundary-v84/'+n for n in ('PROTOCOL.md','model84.py','mesh84.py','reference84.py','campaign84.py')}
SOURCES|={'scientific/regional-v83/mesh83.py','scientific/profile-v79/solver.py'}
SOURCES|={'scientific/electrical-v82/'+n for n in ('model82.py','transport82.py')}
SOURCES|={'scientific/flow-v81/'+n for n in ('solver.py','reference.py','transport.py')}


def require(ok,message):
    if not ok: raise ValueError(message)


def sha(raw): return hashlib.sha256(raw).hexdigest()


def relative(a,b):
    a,b=np.asarray(a,dtype=float),np.asarray(b,dtype=float)
    require(a.shape==b.shape and np.isfinite(a).all() and np.isfinite(b).all(),'Invalid observable')
    return None if np.any(b==0) else float(np.max(abs(a-b)/abs(b)))


def edges(m,n):
    a,R,L,c,w=(m[k] for k in ('cathodeRadiusM','radiusM','halfLengthM','anodeCenterM','anodeWidthM'))
    zp=np.unique([0.,c-w/2,c,c+w/2,L-.004,L-.016,L-.04,L-.08,L])
    def make(points,counts):
        return np.r_[*[lo+(hi-lo)*np.sin(np.pi*np.arange(k)/(2*k))**2
                       for lo,hi,k in zip(points[:-1],points[1:],counts)],points[-1]]
    return make([0.,a,R],[4*n,28*n]),make(zp,np.maximum(2,np.ceil(np.diff(zp)/.005).astype(int))*n)


def packet(directory,receipt):
    name=Path(receipt['path']); require(len(name.parts)==2 and name.parts[0]=='fields' and name.suffix=='.gz','Invalid field path')
    zipped=(directory/name).read_bytes(); require(sha(zipped)==receipt['sha256'],'Compressed field seal mismatch')
    raw=gzip.decompress(zipped); require(sha(raw)==receipt['rawSHA256'],'Raw field seal mismatch')
    a={k:np.asarray(v,dtype=float) for k,v in json.loads(raw).items()}
    require(set(a)=={'r','z','omegaRadS','potentialV'} and all(np.isfinite(v).all() for v in a.values()),'Invalid field inventory')
    r,z=a['r'],a['z']; require(r.ndim==z.ndim==1 and min(len(r),len(z))>1 and np.all(np.diff(r)>0) and np.all(np.diff(z)>0),'Invalid mesh')
    require(a['omegaRadS'].shape==a['potentialV'].shape==(len(z)-1,len(r)-1),'Field shape mismatch')
    return a


def audit(path,root=None):
    path=Path(path).resolve(); root=Path(root).resolve() if root else path.parents[3]
    raw=path.read_bytes(); d=json.loads(raw); previous=(root/'scientific/regional-v83/results/predictions.json').read_bytes()
    require(sha(previous)==SEALED and d['previousPredictionSHA256']==SEALED,'Frozen V83 seal mismatch'); old=json.loads(previous)
    require(d['manifest']==old['manifest'] and d['scenarios']==old['scenarios'],'Changed source apparatus or scenarios')
    for key in ('experimentalQualification','targetVelocityRead','currentFitted','absoluteCurrentPrediction','correctedVoltagePrediction'):
        require(d[key] is False,'False qualification or fitting flag: '+key)
    require(d['prescribedCurrent'] is True and d['currentConditioning'] is True,'Prescribed current must remain explicit')
    require(set(d['sourceSHA256'])==SOURCES,'Incomplete source receipt')
    for name,value in d['sourceSHA256'].items():
        require(sha((root/name).read_bytes())==value,'Stale source receipt: '+name)
        if not name.startswith('scientific/boundary-v84/'): require(old['sourceSHA256'][name]==value,'Frozen physics changed: '+name)
    key=lambda c:(c['scenario'],c['anodeCenterM'],c['refinement'])
    cases={key(c):c for c in d['cases']}; expected={(s,c,n) for s in NAMES for c in (.07,.08) for n in (1,2,4,8)}
    require(len(cases)==len(d['cases'])==32 and set(cases)==expected,'Case inventory mismatch')
    gates=[]; fields={}; observed={}; contact=[]
    def gate(category,metric,value,limit,context,final=True):
        require(value is None or np.isfinite(value),'Nonfinite diagnostic')
        gates.append(dict(category=category,metric=metric,value=value,limit=limit,context=context,final=final,
                          passed=bool(value is not None and 0<=value<limit)))
    for context,c in cases.items():
        s,center,n=context; require(type(n) is int,'Integer refinement required'); m={**d['manifest'],'anodeCenterM':center}
        a=packet(path.parent,c['fieldPacket']); r,z=a['r'],a['z']; er,ez=edges(m,n)
        require(r.shape==er.shape and z.shape==ez.shape and np.allclose(r,er,rtol=0,atol=1e-14) and np.allclose(z,ez,rtol=0,atol=1e-14),'Changed mesh')
        p,q=c['prediction'],c['independent']; I=m['branchCurrentA']; B=m['magneticT']; nr=len(r)-1; nz=len(z)-1
        require(I==100 and p['currentA']==I and q['currentA']==I,'Prescribed current changed')
        require(p['prescribedCurrent'] is True and p['absoluteCurrentPrediction'] is False and p['correctedVoltagePrediction'] is False,'False primary qualification')
        require(q['currentConditioning'] is True and q['experimentalQualification'] is False and q['contactVoltageExperimental'] is False,'False reference qualification')
        power=p['electrodePowerW']; require(np.isfinite([power,p['jouleW'],p['viscousW']]).all() and min(power,p['jouleW'],p['viscousW'])>0,'Invalid power ledger')
        require(np.isfinite([q[k] for k in ('electrodePowerW','jouleW','shearW')]).all() and min(q[k] for k in ('electrodePowerW','jouleW','shearW'))>0,'Invalid reference power ledger')
        rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2; ports=p['ports']; require(len(ports)==4,'Ring source inventory')
        for kind,x,target,support in [('cathode',rc**2,m['cathodeRadiusM']**2,r),('anode',zc,center,z)]:
            selected=[v for v in ports if v['kind']==kind]; hi=int(np.searchsorted(x,target)); lo=hi-1
            require(len(selected)==2 and 0<=lo<hi<len(x),'Invalid source quadrature')
            w=(target-x[lo])/(x[hi]-x[lo]); wanted=np.array([1-w,w])*I*(1 if kind=='cathode' else -1)
            cells=[(nz-1)*nr+lo,(nz-1)*nr+hi] if kind=='cathode' else [lo*nr+nr-1,hi*nr+nr-1]
            require([v['cell'] for v in selected]==cells and all(type(v['cell']) is int for v in selected),'Source cell mismatch')
            gate('identity',kind+' quadrature',float(max(abs(np.array([v['amp'] for v in selected])-wanted)))/I,1e-8,context)
            require(np.allclose(p[kind+'SupportM'],[support[lo],support[hi+1]],rtol=0,atol=1e-14),'Source support mismatch')
        for port in ports:
            require(np.isfinite([port[k] for k in ('amp','halfR','torqueWeight','potentialV')]).all() and port['halfR']>0,'Invalid port')
            cell=port['cell']; t=0. if port['kind']=='cathode' else -B*(m['radiusM']**2-rc[-1]**2)/2
            gate('identity','boundary torque weight',abs(port['torqueWeight']-t)/(abs(B)*m['radiusM']**2/2),1e-8,context)
            phi=a['potentialV'].ravel()[cell]-port['amp']*port['halfR']-port['torqueWeight']*a['omegaRadS'].ravel()[cell]
            gate('identity','boundary potential',abs(port['potentialV']-phi)/max(abs(phi),power/I),1e-8,context)
        torque=B*I*(m['radiusM']**2-m['cathodeRadiusM']**2)/2
        for label,x,y,scale in [('port power',-sum(v['amp']*v['potentialV'] for v in ports),power,power),
                                ('work ledger',p['jouleW']+p['viscousW'],power,power),('source torque',p['sourceMomentTorqueNm'],torque,abs(torque)),
                                ('drive torque',p['driveTorqueNm'],torque,abs(torque))]: gate('identity',label,abs(x-y)/scale,1e-8,context)
        for name in ('chargeResidualRelative','powerResidualRelative','torqueResidualRelative','linearResidualRelative'): gate('identity','primary/'+name,p[name],1e-8,context)
        for name in ('chargeResidualRelative','momentumResidualRelative','powerResidualRelative','torqueResidualRelative','torqueMomentResidualRelative','linearResidualRelative'): gate('identity','reference/'+name,q[name],1e-8,context)
        gate('identity','reference work ledger',abs(q['electrodePowerW']-q['jouleW']-q['shearW'])/abs(q['electrodePowerW']),1e-8,context)
        gate('identity','reference source torque',abs(q['sourceMomentTorqueNm']-torque)/abs(torque),1e-8,context)
        require(q['chordsM']==m['chordsM'] and np.allclose(q['radialEdgesM'],r,rtol=0,atol=1e-14) and np.allclose(q['axialEdgesM'],z,rtol=0,atol=1e-14),'Reference geometry changed')
        gate('identity','reference source radius',abs(q['cathodeRadialMomentM2']-m['cathodeRadiusM']**2)/m['cathodeRadiusM']**2,1e-8,context)
        gate('identity','reference anode centroid',abs(q['anodeAxialCentroidM']-center)/center,1e-8,context)
        chords=[]
        for b in m['chordsM']:
            length=np.diff(np.sqrt(np.maximum(r*r-b*b,0.))); chords.append(float(b*(length@a['omegaRadS'][0])/sum(length)))
        gate('identity','saved observer',relative(p['chordVelocityMS'],chords),1e-8,context)
        fields[context]=a; observed[context]=dict(chords=chords,shear=p['viscousW'],torque=p['driveTorqueNm'])
        if n==8:
            for name,x,y in [('chords',q['chordVelocityMS'],chords),('shear',q['shearW'],p['viscousW']),('torque',q['driveTorqueNm'],p['driveTorqueNm'])]: gate('flow','reference/'+name,relative(x,y),.05,context)
        contact.append(dict(context=context,contactVoltEquivalentV=power/I,jouleW=p['jouleW'],electrodePowerW=power,qualifiesCorrectedVoltage=False))
    for s in NAMES:
        for center in (.07,.08):
            for n,fine in ((1,2),(2,4),(4,8)):
                left,right=(s,center,n),(s,center,fine)
                for axis in ('r','z'): require(np.allclose(fields[left][axis],fields[right][axis][::2],rtol=0,atol=1e-14),'Non-nested mesh')
                for name,x in observed[left].items(): gate('flow','mesh/'+name,relative(x,observed[right][name]),.05,right,fine==8)
    passed=lambda category:all(g['passed'] for g in gates if g['category']==category and g['final'])
    return dict(experimentalQualification=False,absoluteCurrentPrediction=False,correctedVoltagePrediction=False,prescribedCurrent=True,
        predictionSHA256=sha(raw),previousPredictionSHA256=SEALED,caseCount=32,identityPass=passed('identity'),flowNumericalPass=passed('flow'),
        gates=gates,failures=[g for g in gates if not g['passed']],contactAssessment=contact,
        scope='Saved-array/source-quadrature/port/observer checks and reported residuals; no fresh PDE assembly. Independent reference shares physical mesh. Current is prescribed, contact voltage/power not qualified, no experimental qualification.')


def main():
    result=audit(sys.argv[1]); Path(sys.argv[2]).write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    return 0 if result['identityPass'] and result['flowNumericalPass'] else 1


if __name__=='__main__': raise SystemExit(main())
