"""Independent saved-state, conservation and fixed-quadrature audit; no optics."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import numpy as np
from numpy.polynomial.legendre import leggauss
from scipy.interpolate import RegularGridInterpolator

BASELINE='f328e73864378179280f14495fa0963613b9954ddce576dabe91c052f4ea6d74'
TIMES=(0.,1e-6,2e-6,4e-6)
MASS=39.948*1.66053906660e-27
KB=1.380649e-23
FIELDS=('densityKgM3','temperatureK','omegaRadS','vrMPS','vzMPS')


def require(ok,message):
    if not ok: raise ValueError(message)


def sha(raw): return hashlib.sha256(raw).hexdigest()


def primitive(r,z,q):
    """Independent one-species EOS and FV inertia, without Flow import."""
    q=np.asarray(q,dtype=float); r,z=np.asarray(r),np.asarray(z)
    require(q.shape==(6,len(z)-1,len(r)-1) and np.isfinite(q).all(),'Invalid conserved state')
    volume=np.pi*np.diff(z)[:,None]*np.diff(r*r)[None,:]
    mass,mr,mz,angular,energy,species=q; inertia=mass*(r[1:]**2+r[:-1]**2)/2
    require(np.all(mass>0) and np.all(species>=0) and np.all(species<=mass),'Invalid mass/species')
    kinetic=(mr*mr+mz*mz)/(2*mass)+angular*angular/(2*inertia)
    thermal=energy-kinetic; number=mass/MASS
    require(np.all(thermal>0),'Nonpositive internal energy')
    T=thermal/(1.5*KB*number); rho=mass/volume; pressure=(2/3)*thermal/volume
    return dict(densityKgM3=rho,temperatureK=T,omegaRadS=angular/inertia,pressurePa=pressure,
        massFraction=species/mass,vrMPS=mr/mass,vzMPS=mz/mass,thermalJ=thermal,
        kineticJ=kinetic,soundMPS=np.sqrt((5/3)*pressure/rho))


def check_state(state,case,manifest):
    r,z=[np.asarray(state[k],dtype=float) for k in ('radialEdgesM','axialEdgesM')]
    require(len(r)==case['nr']+1 and len(z)==case['nz']+1 and r[0]==z[0]==0
        and r[-1]==manifest['radiusM'] and z[-1]==manifest['halfLengthM']
        and np.isfinite(r).all() and np.isfinite(z).all()
        and np.all(np.diff(r)>0) and np.all(np.diff(z)>0),'Invalid saved mesh')
    require(np.allclose(r,np.linspace(0,r[-1],len(r)),rtol=0,atol=1e-15)
        and np.allclose(z,np.linspace(0,z[-1],len(z)),rtol=0,atol=1e-15),'Nonuniform protocol mesh')
    require(state['conditionalRelease'] is True and state['thermalSteadyState'] is False
        and state['experimentalQualification'] is False and state['prescribedCurrent'] is True
        and state['absoluteCurrentPrediction'] is False,'False qualification flag')
    snaps=state['snapshots']; history=state['history']
    require([s['timeS'] for s in snaps]==list(TIMES),'Snapshot schedule changed')
    require(len(history)==case['stepCount'] and len(history)>0,'Missing history')
    elapsed=0.; largest=dict(mass=0.,species=0.,energy=0.,charge=0.)
    for h in history:
        dt,t=h['dtS'],h['timeS']
        require(np.isfinite([dt,t,h['electricalWorkJ']]).all() and 0<dt<=case['maxDtS']*(1+1e-12)
            and abs(t-elapsed-dt)<1e-16,'Invalid or incomplete step sequence')
        elapsed=t
        for field,name,limit in [('massRelativeDrift','mass',1e-10),('speciesRelativeDrift','species',1e-10),
                ('energyRelativeDefect','energy',1e-8),('chargeRelativeResidual','charge',1e-9)]:
            x=h[field]; require(np.isfinite(x) and 0<=x<limit,'Failed history '+field)
            largest[name]=max(largest[name],x)
        for field in ('ohmicJ','emNumericalHeatJ','viscousHeatJ','viscousNumericalHeatJ'):
            require(np.isfinite(h[field]) and h[field]>=0,'Invalid heat ledger')
        require(np.isfinite([h['maximumTemperatureK'],h['minimumTemperatureK'],h['maximumTotalMach']]).all()
            and h['minimumTemperatureK']>0 and h['maximumTemperatureK']>=h['minimumTemperatureK']
            and h['maximumTotalMach']>=0,'Invalid history physical extrema')
    require(abs(elapsed-TIMES[-1])<1e-16,'Truncated trajectory')
    initial=np.asarray(snaps[0]['q']); initial_sum=initial.sum(axis=(1,2))
    for s in snaps:
        reconstructed=primitive(r,z,s['q'])
        for name,expected in reconstructed.items():
            actual=np.asarray(s[name],dtype=float)
            require(actual.shape==expected.shape and np.isfinite(actual).all()
                and np.allclose(actual,expected,rtol=2e-12,atol=0),'Corrupt primitive '+name)
        q=np.asarray(s['q']); total=q.sum(axis=(1,2))
        if s['timeS']==0:
            require(np.all(q[1:3]==0),'Initial meridional velocity changed')
            work=0.
        else:
            rows=[h for h in history if abs(h['timeS']-s['timeS'])<1e-16]
            require(len(rows)==1,'Missing exact reporting-time energy ledger')
            work=rows[0]['electricalWorkJ']
            require(abs(reconstructed['temperatureK'].max()-rows[0]['maximumTemperatureK'])
                <2e-12*reconstructed['temperatureK'].max(),'Snapshot/history extrema mismatch')
        for index,name in ((0,'mass'),(5,'species')):
            value=abs(total[index]-initial_sum[index])/initial_sum[index]
            require(value<1e-10,'Independent '+name+' drift'); largest[name]=max(largest[name],float(value))
        scale=max(abs(total[4]-initial_sum[4]),abs(work),initial_sum[4])
        value=abs(total[4]-initial_sum[4]-work)/scale
        require(value<1e-8,'Independent total-energy drift'); largest['energy']=max(largest['energy'],float(value))
    require(abs(case['maximumTemperatureK']-max(h['maximumTemperatureK'] for h in history))<1e-8,
        'Case/history extrema mismatch')
    return largest


def interpolate(state,snapshot,name,points,increment=False):
    r,z=[np.asarray(state[k]) for k in ('radialEdgesM','axialEdgesM')]
    rc=(2/3)*np.diff(r**3)/np.diff(r*r); zc=(z[1:]+z[:-1])/2
    value=np.asarray(snapshot[name])
    if increment: value=value-np.asarray(state['snapshots'][0][name])
    value=np.pad(value,1,mode='edge')
    if name in ('omegaRadS','vrMPS','vzMPS'): value[-1,:]=0; value[:,-1]=0
    if name=='vrMPS': value[:,0]=0
    if name=='vzMPS': value[0,:]=0
    return RegularGridInterpolator((np.r_[z[0],zc,z[-1]],np.r_[r[0],rc,r[-1]]),value)(points)


def differences(coarse,fine,time_index,nquad):
    R=coarse['radialEdgesM'][-1]; L=coarse['axialEdgesM'][-1]
    x,w=leggauss(nquad); rr,zz=np.meshgrid((x+1)*R/2,(x+1)*L/2)
    weight=(w[:,None]*w[None,:]*rr).ravel(); weight/=weight.sum()
    points=np.column_stack((zz.ravel(),rr.ravel()))
    pairs={}
    for name in FIELDS:
        for inc in ((False,True) if name in FIELDS[:2] else (False,)):
            tag=name+('/increment' if inc else '')
            pairs[tag]=[interpolate(s,s['snapshots'][time_index],name,points,inc) for s in (coarse,fine)]
    rms=lambda v:float(np.sqrt(weight@(v*v)))
    meridional=np.hypot(rms(pairs['vrMPS'][1]),rms(pairs['vzMPS'][1]))
    result={}
    for name,(a,b) in pairs.items():
        scale=meridional if name in ('vrMPS','vzMPS') else rms(b)
        error=rms(a-b)
        result[name]=dict(value=error/scale if scale else (0. if error==0 else None),
            absoluteRMS=error,referenceRMS=scale)
    return result


def midpoint(coarse,fine,time_index,nquad=64):
    """Report the full fixed midplane line separately; no new acceptance gate."""
    x,w=leggauss(nquad); r=(x+1)*coarse['radialEdgesM'][-1]/2
    points=np.column_stack((np.zeros_like(r),r)); result={'radialM':r.tolist()}
    for name in FIELDS:
        a,b=[interpolate(s,s['snapshots'][time_index],name,points) for s in (coarse,fine)]
        result[name]=dict(coarse=a.tolist(),fine=b.tolist(),absoluteRMS=float(np.sqrt(w@((a-b)**2)/w.sum())))
    return result


def check_inventory(cases,names):
    require(len(names)==len(set(names))==4,'Wrong scenario inventory')
    jobs={(s,a,n,3*n//2,1e-7) for s in names for a in (.07,.08) for n in (16,32,64)}
    jobs|={(names[0],.07,64,96,dt) for dt in (5e-8,2.5e-8)}
    key=lambda c:(c['scenario'],c['anodeCenterM'],c['nr'],c['nz'],c['maxDtS'])
    require(len(cases)==26 and {key(c) for c in cases}==jobs,'Missing/duplicate/extra job')
    require(all(c['completed'] is True and 'error' not in c for c in cases),'Failed job cannot qualify')


def audit(path,root=None,expected_sha=None):
    path=Path(path).resolve(); root=Path(root).resolve() if root else path.parents[3]
    raw=path.read_bytes(); packet=json.loads(raw)
    require(expected_sha is None or sha(raw)==expected_sha,'Prediction seal mismatch')
    baseline_raw=(root/'scientific/boundary-v84/results/predictions.json').read_bytes()
    require(sha(baseline_raw)==packet['baselinePredictionSHA256']==BASELINE,'Baseline seal mismatch')
    baseline=json.loads(baseline_raw); manifest=packet['manifest']
    require(manifest==baseline['manifest'] and packet['scenarios']==baseline['scenarios'],'Changed conditions/scenarios')
    require(manifest['radiusM']==.06 and manifest['halfLengthM']==.24 and manifest['magneticT']==.13
        and manifest['branchCurrentA']==100 and manifest['cathodeRadiusM']==.004
        and manifest['anodeWidthM']==.02 and manifest['viscosityPaS']==1.14e-4,'Protocol conditions changed')
    for flag in ('targetVelocityRead','currentFitted','velocityFitted','experimentalQualification'):
        require(packet[flag] is False,'Invalid fitting/qualification flag')
    require(packet['conditionalRelease'] is True,'Conditional scope lost')
    directory=root/'scientific/meridional-v86'
    files=list(directory.glob('*.py'))+[directory/'PROTOCOL.md',root/'scientific/mixture-axial-v75/flow.py',
        root/'scientific/electrical-v82/transport82.py',root/'scientific/flow-v81/transport.py',
        root/'scientific/flow-v81/argon-viscosity-source.json']
    expected={str(p.relative_to(root)):sha(p.read_bytes()) for p in files}
    require(packet['sourceSHA256']==expected,'Stale or incomplete source seal')
    names=[s['name'] for s in baseline['scenarios']]
    key=lambda c:(c['scenario'],c['anodeCenterM'],c['nr'],c['nz'],c['maxDtS'])
    cases=packet['cases']; check_inventory(cases,names)
    states={}; ledger={}
    for case in cases:
        require(case['completed'] is True and 'error' not in case,'Failed job cannot qualify')
        p=case['fieldPacket']; field=(path.parent/p['path']).resolve()
        require(field.parent==path.parent/'fields','Invalid field path')
        packed=field.read_bytes(); require(sha(packed)==p['sha256'],'Field seal mismatch')
        payload=gzip.decompress(packed); require(sha(payload)==p['rawSHA256'],'Raw field seal mismatch')
        state=json.loads(payload); ledger[str(key(case))]=check_state(state,case,manifest); states[key(case)]=state
    gates=[]; quadratures=[]; midpoints=[]
    def compare(keys,kind,limit):
        for ti,t in enumerate(TIMES):
            levels=[{n:differences(states[a],states[b],ti,n) for n in (16,32,64)} for a,b in zip(keys[:-1],keys[1:])]
            midpoints.append(dict(kind=kind,timeS=t,context=str(keys[-1]),
                **midpoint(states[keys[-2]],states[keys[-1]],ti)))
            for name in levels[-1][64]:
                x,y=(level[64][name]['value'] for level in levels)
                contraction=x is not None and y is not None and (y<x or x==y==0)
                passed=y is not None and y<limit and contraction
                gates.append(dict(kind=kind,timeS=t,field=name,coarseChange=x,fineChange=y,
                    limit=limit,contraction=bool(contraction),passed=bool(passed),context=str(keys[-1][:-1])))
                for index,level in enumerate(levels):
                    a,b=(level[n][name]['value'] for n in (32,64))
                    change=abs(a-b)/max(abs(a),abs(b)) if a is not None and b is not None and max(abs(a),abs(b)) else (0. if a==b==0 else None)
                    quadratures.append(dict(kind=kind,timeS=t,field=name,pair=index,
                        values={str(n):level[n][name] for n in (16,32,64)},relativeChange=change,
                        passed=bool(change is not None and change<.01)))
    for s in names:
        for a in (.07,.08): compare([(s,a,n,3*n//2,1e-7) for n in (16,32,64)],'spatial',.05)
    compare([(names[0],.07,64,96,dt) for dt in (1e-7,5e-8,2.5e-8)],'timestep',.02)
    passed=all(g['passed'] for g in gates) and all(g['passed'] for g in quadratures)
    return dict(predictionSHA256=sha(raw),sourceSHA256=expected,caseCount=26,ledger=ledger,gates=gates,
        failures=[g for g in gates if not g['passed']],quadratureChecks=quadratures,midplaneComparisons=midpoints,
        quadratureFailures=[g for g in quadratures if not g['passed']],allRequiredNumericalPass=bool(passed),
        conditionalRelease=True,experimentalQualification=False,opticalScoringPerformed=False,
        scope='Independent saved-state/ledger and fixed-volume interpolation checks. No independent PDE assembly or experimental qualification.')


if __name__=='__main__':
    result=audit(sys.argv[1]); Path(sys.argv[2]).write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    raise SystemExit(0 if result['allRequiredNumericalPass'] else 1)
