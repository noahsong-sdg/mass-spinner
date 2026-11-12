"""Independent sealed-result checks; imports no predictor or velocity targets."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import numpy as np

SEALED='1a1e7e54974ed7e7e28be655e911b17d3cdd7bc55107b34474148702858ef128'
NAMES=('legacy','nist-2900')+tuple(f'{s}-{e}' for s in ('quadratic','linear')
    for e in ('nominal','low-low','low-high','high-low','high-high'))
SPECIFICATIONS=tuple((name,beta) for name in NAMES for beta in (3,9))+(('source-linear',0),('source-quadratic',0))
SOURCES={'solver.py','transport.py','reference.py','meridional.py','campaign.py'}
INPUTS={'flow-v81/PROTOCOL.md','flow-v81/SOURCE-TRANSPORT-ADDENDUM.md',
        'flow-v81/argon-viscosity-source.json','profile-v79/results/predictions.json'}


def require(condition,message):
    if not condition: raise ValueError(message)


def digest(data): return hashlib.sha256(data).hexdigest()


def relative(a,b):
    a,b=np.asarray(a,dtype=float),np.asarray(b,dtype=float)
    require(a.shape==b.shape and np.isfinite(a).all() and np.isfinite(b).all(),'Nonfinite/mismatched comparison')
    difference=abs(a-b)
    if np.any((b==0)&(difference>0)): return None
    return float(np.max(np.divide(difference,abs(b),out=np.zeros_like(difference),where=b!=0)))


def field_observables(path,receipt,m,ref):
    name=Path(receipt['path'])
    require(not name.is_absolute() and len(name.parts)==2 and name.parts[0]=='fields'
            and name.suffix=='.gz','Unexpected field-packet path')
    compressed=(path.parent/name).read_bytes()
    require(digest(compressed)==receipt['sha256'],'Compressed field hash mismatch')
    raw=gzip.decompress(compressed)
    require(digest(raw)==receipt['rawSHA256'],'Raw field hash mismatch')
    fields=json.loads(raw); r,z,w=[np.asarray(fields[k],dtype=float) for k in ('r','z','omegaRadS')]
    require(len(r)==32*ref+1 and len(z)==48*ref+1 and w.shape==(len(z)-1,len(r)-1)
            and r[0]==z[0]==0 and r[-1]==m['radiusM'] and z[-1]==m['halfLengthM']
            and np.all(np.diff(r)>0) and np.all(np.diff(z)>0)
            and all(np.isfinite(x).all() for x in (r,z,w)),'Invalid saved field geometry')
    require(any(abs(r-m['cathodeRadiusM'])<1e-14) and all(any(abs(z-v)<1e-14) for v in
            (m['anodeCenterM']-m['anodeWidthM']/2,m['anodeCenterM']+m['anodeWidthM']/2)),
            'Field mesh misses a frozen electrode edge')
    rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2
    chords=[]
    for b in m['chordsM']:
        lengths=np.diff(np.sqrt(np.maximum(r*r-b*b,0)))
        chords.append(float(b*(lengths@w[0])/sum(lengths)))
    acceleration=w*w*rc[None,:]; derivative=np.empty_like(w)
    for j in range(len(zc)):
        indices=np.arange(max(0,min(j-1,len(zc)-3)),max(0,min(j-1,len(zc)-3))+3)
        derivative[j]=0.
        for k in indices:
            a,b=[v for v in indices if v!=k]
            coefficient=(2*zc[j]-zc[a]-zc[b])/((zc[k]-zc[a])*(zc[k]-zc[b]))
            derivative[j]+=coefficient*acceleration[k]
    volume=np.pi*np.diff(r*r)[None,:]*np.diff(z)[:,None]; measure=np.diff(r*r)/2
    diagnostics=dict(centrifugalCurlMaxS2=float(np.max(abs(derivative))),
        centrifugalCurlVolumeRmsS2=float(np.sqrt(np.sum(derivative**2*volume)/np.sum(volume))),
        midToLastCellLoopM2S2=float(measure@(w[0]**2-w[-1]**2)),
        midToStationaryWallLoopM2S2=float(measure@w[0]**2))
    return chords,diagnostics


def audit(path,frozen):
    path,frozen=Path(path),Path(frozen); data=json.loads(path.read_text()); here=path.parent.parent
    require(digest(frozen.read_bytes())==SEALED,'Frozen V79 seal mismatch')
    require(data['manifest']==json.loads(frozen.read_text())['manifest'],'Frozen manifest changed')
    require(data['experimentalQualification'] is False and data['targetDataRead'] is False,'Unqualified prediction packet required')
    require(set(data['inputSHA256'])==INPUTS and set(data['sourceSHA256'])==SOURCES,'Incomplete provenance receipt')
    for name,sha in data['inputSHA256'].items():
        require(digest((here.parent/name).read_bytes())==sha,'Stale input: '+name)
    for name,sha in data['sourceSHA256'].items():
        require(digest((here/name).read_bytes())==sha,'Stale source: '+name)
    require(data['inputSHA256']['profile-v79/results/predictions.json']==SEALED,'V79 input receipt mismatch')
    m=data['manifest']; nominal=m['bulkVoltageV']; variants=[(r,nominal) for r in m['refinements']]+[(4,v) for v in m['bulkVoltageCasesV'] if v!=nominal]
    expected={(name,beta,r,v) for name,beta in SPECIFICATIONS for r,v in variants}
    key=lambda row:(row['transportCase'],row['beta'],row['refinement'],row['voltageV'])
    cases={key(c):c for c in data['cases']}
    require(len(cases)==len(data['cases']) and set(cases)==expected,'Missing/duplicated/unexpected cases')
    gates,derived,absolute=[],{},[]
    def gate(group,metric,value,limit,context,final=True):
        if value is not None and not np.isfinite(value): value=None
        gates.append(dict(group=group,metric=metric,value=value,limit=limit,context=context,final=final,
                          passed=bool(value is not None and 0<=value<limit)))
    for context,row in cases.items():
        if row['status']!='available':
            gate('flow','availability',None,1.,context); continue
        p,q=row['prediction'],row['independentSameSigma']
        chords,diagnostics=field_observables(path,row['fieldPacket'],m,row['refinement'])
        derived[context]=dict(chords=chords,diagnostics=diagnostics)
        gate('flow','saved uniform-chord observer',relative(chords,p['chordVelocityMS']),1e-8,context)
        for name,value in diagnostics.items():
            error=abs(value-p['meridional'][name])/max(1.,abs(value),abs(p['meridional'][name]))
            gate('assessment','saved diagnostic/'+name,error,1e-8,context)
        require(p['meridional']['circulationVelocityPredicted'] is False,'Diagnostic mislabeled as circulation prediction')
        for name in ('chargeResidualRelative','boundaryResidualRelative','powerResidualRelative','angularResidualRelative','linearResidualRelative','torqueMomentResidualRelative'):
            gate('flow','primary/'+name,p[name],1e-8,context)
        for name in ('chargeResidualRelative','momentumResidualRelative','powerResidualRelative','torqueResidualRelative'):
            gate('flow','independent/'+name,q[name],1e-8,context)
        gate('flow','electrical-only current conditioning',relative(p['currentsA']['cathode'],m['branchCurrentA']),1e-8,context)
        if row['refinement']==max(m['refinements']):
            for name,a,b in [('uniform chords',q['chordVelocityMS'],chords),('current',q['branchCurrentA'],p['currentsA']['cathode']),
                             ('electrode power',q['electrodePowerW'],p['electrodePowerW']),('Joule power',q['jouleW'],p['jouleW']),('shear power',q['shearW'],p['viscousW'])]:
                gate('flow','independent same sigma/'+name,relative(a,b),.05,context)
        if row['transportCase'].startswith('source-'):
            gate('flow','source conductivity gain receipt',relative(row['sourceConductivityGain'],row['sigmaParallelSM']/1070.),1e-8,context)
            if row['voltageV']==nominal:
                source=row['absoluteSourceElectrical']; amps=source['currentsA']['cathode']
                absolute.append(dict(context=context,conductivityGain=row['sourceConductivityGain'],absoluteSourceElectrical=source,
                                     absoluteCurrentRelativeMismatch=relative(amps,m['branchCurrentA'])))
    for name,beta in SPECIFICATIONS:
        for coarse_ref,fine_ref in zip(m['refinements'],m['refinements'][1:]):
            old,new=(name,beta,coarse_ref,nominal),(name,beta,fine_ref,nominal)
            if old not in derived or new not in derived: continue
            a,b=cases[old],cases[new]; final=fine_ref==max(m['refinements'])
            for label,x,y in [('uniform chords',derived[old]['chords'],derived[new]['chords']),('conductivity',a['sigmaParallelSM'],b['sigmaParallelSM'])]+[
                    (p,a['prediction'][p],b['prediction'][p]) for p in ('electrodePowerW','jouleW','viscousW')]:
                gate('flow','mesh/'+label,relative(x,y),.05,new,final)
            for label,x in derived[old]['diagnostics'].items():
                gate('assessment','mesh/'+label,relative(x,derived[new]['diagnostics'][label]),.05,new,final)
    passed=lambda group:all(g['passed'] for g in gates if g['group']==group and g['final'])
    return dict(experimentalQualification=False,flowNumericalPass=passed('flow'),meridionalAssessmentNumericalPass=passed('assessment'),
                betaConvention='In source-* cases beta=0 is an unused grouping key; propertyRanges.effectiveBeta records the supplied spatial Hall field.',
                gates=gates,failures=[g for g in gates if not g['passed']],sourceAbsoluteElectrical=absolute,
                predictionSHA256=digest(path.read_bytes()),frozenV79SHA256=SEALED,
                scope='Independent hashed-field observer/diagnostic recomputation; saved solver residuals, not a fresh PDE solve. Assessment is not a circulation or experimental qualification.')


if __name__=='__main__':
    result=audit(sys.argv[1],sys.argv[2]); Path(sys.argv[3]).write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
