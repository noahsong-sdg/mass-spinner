"""Post hoc exact-panel RMS supplement; never replaces frozen V86 gates."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import numpy as np
from numpy.polynomial.legendre import leggauss

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'meridional-v86'))
import audit86 as old


def sha(raw): return hashlib.sha256(raw).hexdigest()


def knots(state):
    r,z=[np.asarray(state[k],dtype=float) for k in ('radialEdgesM','axialEdgesM')]
    return np.r_[r[0],(2/3)*np.diff(r**3)/np.diff(r*r),r[-1]],np.r_[z[0],(z[1:]+z[:-1])/2,z[-1]]


def panel_points(r,z,order):
    """Gauss nodes on every interpolation panel, with exact cylindrical weight."""
    r,z=np.asarray(r,dtype=float),np.asarray(z,dtype=float)
    old.require(np.isfinite(r).all() and np.isfinite(z).all() and r[0]>=0
        and np.all(np.diff(r)>0) and np.all(np.diff(z)>0),'Invalid panel knots')
    old.require(order in (2,3,4),'Declared panel quadrature orders are 2,3,4')
    x,w=leggauss(order)
    rr=((r[:-1,None]+r[1:,None])/2+np.diff(r)[:,None]*x/2).ravel()
    zz=((z[:-1,None]+z[1:,None])/2+np.diff(z)[:,None]*x/2).ravel()
    wr=(np.diff(r)[:,None]*w/2).ravel(); wz=(np.diff(z)[:,None]*w/2).ravel()
    R,Z=np.meshgrid(rr,zz); weights=(2*np.pi*R*wz[:,None]*wr[None,:]).ravel()
    return np.column_stack((Z.ravel(),R.ravel())),weights


def integral(r,z,fn,order=2):
    points,weight=panel_points(r,z,order); values=np.asarray(fn(points),dtype=float)
    old.require(values.shape==(len(weight),) and np.isfinite(values).all(),'Invalid integrand')
    return float(weight@values)


def metrics(coarse,fine,ti,order):
    ra,za=knots(coarse); rb,zb=knots(fine)
    old.require(ra[0]==rb[0] and ra[-1]==rb[-1] and za[0]==zb[0] and za[-1]==zb[-1],
        'Physical domains differ')
    r,z=np.union1d(ra,rb),np.union1d(za,zb)
    points,weight=panel_points(r,z,order); volume=float(weight.sum())
    result={}
    for name in old.FIELDS:
        for increment in ((False,True) if name in old.FIELDS[:2] else (False,)):
            a,b=[old.interpolate(s,s['snapshots'][ti],name,points,increment) for s in (coarse,fine)]
            old.require(np.isfinite(a).all() and np.isfinite(b).all(),'Nonfinite interpolated field')
            tag=name+('/increment' if increment else '')
            result[tag]=dict(errorIntegral=float(weight@((a-b)**2)),referenceIntegral=float(weight@(b*b)))
    meridional=result['vrMPS']['referenceIntegral']+result['vzMPS']['referenceIntegral']
    for name,row in result.items():
        denominator=meridional if name in ('vrMPS','vzMPS') else row['referenceIntegral']
        row.update(absoluteRMS=float(np.sqrt(row['errorIntegral']/volume)),
            referenceRMS=float(np.sqrt(denominator/volume)),
            value=float(np.sqrt(row['errorIntegral']/denominator)) if denominator else
                (0. if row['errorIntegral']==0 else None))
    return result


def gate(x,y,limit):
    contraction=x is not None and y is not None and (y<x or x==y==0)
    return dict(coarseChange=x,fineChange=y,limit=limit,contraction=bool(contraction),
        passed=bool(y is not None and y<limit and contraction))


def combine(original,gates,quadrature):
    supplemental=all(g['passed'] for g in gates) and all(g['passed'] for g in quadrature)
    return dict(supplementalFixedPanelPass=bool(supplemental),
        originalAllRequiredNumericalPass=original['allRequiredNumericalPass'],
        allRequiredNumericalPass=bool(original['allRequiredNumericalPass'] and supplemental),
        experimentalQualification=False)


def read_sealed(path,packet):
    raw=Path(path).read_bytes(); old.require(sha(raw)==packet['sha256'],'Field seal mismatch')
    payload=gzip.decompress(raw); old.require(sha(payload)==packet['rawSHA256'],'Raw field seal mismatch')
    return json.loads(payload)


def audit(path,original_path=None):
    path=Path(path).resolve(); root=path.parents[3]
    raw=path.read_bytes(); packet=json.loads(raw)
    original_path=Path(original_path) if original_path else path.parent/'audit.json'
    original_raw=original_path.read_bytes(); original=json.loads(original_raw)
    old.require(original['predictionSHA256']==sha(raw),'Original audit/prediction seal mismatch')
    old.require(original['allRequiredNumericalPass'] is False,'Supplement requires retained failed original audit')
    baseline=(root/'scientific/boundary-v84/results/predictions.json').read_bytes()
    old.require(sha(baseline)==packet['baselinePredictionSHA256']==old.BASELINE,'Frozen baseline changed')
    old.require(packet['manifest']==json.loads(baseline)['manifest'],'Physical manifest changed')
    for name,digest in packet['sourceSHA256'].items():
        file=(root/name).resolve(); old.require(file.is_relative_to(root),'Invalid source path')
        old.require(sha(file.read_bytes())==digest,'Producer source changed: '+name)
    old.require(packet['sourceSHA256']==original['sourceSHA256'],'Original source seal changed')
    names=[s['name'] for s in packet['scenarios']]; old.check_inventory(packet['cases'],names)
    states={}; key=lambda c:(c['scenario'],c['anodeCenterM'],c['nr'],c['nz'],c['maxDtS'])
    for case in packet['cases']:
        p=case['fieldPacket']; field=(path.parent/p['path']).resolve()
        old.require(field.parent==path.parent/'fields','Invalid field path')
        state=read_sealed(field,p); old.check_state(state,case,packet['manifest']); states[key(case)]=state
    gates=[]; checks=[]; contrasts=[]
    def compare(keys,kind,limit):
        contrasts.append(dict(kind=kind,context=str(keys),
            actualDtSequencesEqual=[bool([h['dtS'] for h in states[a]['history']]==
                [h['dtS'] for h in states[b]['history']]) for a,b in zip(keys[:-1],keys[1:])]))
        for ti,t in enumerate(old.TIMES):
            pairs=[{n:metrics(states[a],states[b],ti,n) for n in (2,3,4)}
                for a,b in zip(keys[:-1],keys[1:])]
            for name in pairs[-1][2]:
                x,y=(pair[2][name]['value'] for pair in pairs)
                gates.append(dict(kind=kind,timeS=t,field=name,context=str(keys[-1]),**gate(x,y,limit)))
                for index,pair in enumerate(pairs):
                    for term in ('errorIntegral','referenceIntegral'):
                        values=[pair[n][name][term] for n in (2,3,4)]
                        scale=max(abs(v) for v in values)
                        relative=(max(values)-min(values))/scale if scale else 0.
                        checks.append(dict(kind=kind,timeS=t,field=name,pair=index,term=term,
                            values=values,relativeSpread=float(relative),limit=1e-10,
                            passed=bool(relative<1e-10)))
    for name in names:
        for center in (.07,.08): compare([(name,center,n,3*n//2,1e-7) for n in (16,32,64)],'spatial',.05)
    compare([(names[0],.07,64,96,dt) for dt in (1e-7,5e-8,2.5e-8)],'timestep',.02)
    files=[Path(__file__).resolve(),HERE/'test_panel86.py',Path(old.__file__).resolve()]
    return dict(predictionSHA256=sha(raw),originalAuditSHA256=sha(original_raw),
        originalFailureCount=len(original['failures']),originalQuadratureFailureCount=len(original['quadratureFailures']),
        supplementalSourceSHA256={str(p.relative_to(root)):sha(p.read_bytes()) for p in files},
        supplementalGates=gates,supplementalFailures=[g for g in gates if not g['passed']],
        panelQuadratureChecks=checks,panelQuadratureFailures=[g for g in checks if not g['passed']],
        timestepContrasts=contrasts,**combine(original,gates,checks),
        scope='Post hoc exact integration of the original piecewise-bilinear interpolants. Original failed field/quadrature gates remain unchanged. No optical scoring, PDE correction or experimental qualification.')


if __name__=='__main__':
    result=audit(sys.argv[1],sys.argv[3] if len(sys.argv)>3 else None)
    Path(sys.argv[2]).write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    raise SystemExit(0 if result['allRequiredNumericalPass'] else 1)
