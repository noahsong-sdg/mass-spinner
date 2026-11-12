"""Independent saved-array audit: no predictor imports or measured velocities."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import numpy as np

SEALED='8b4041c7db6ee606db57dca695da350919c7a6f0c29727f2dbd3ac010ecd857e'
NAMES=tuple(shape+'-'+suffix for shape in ('linear','quadratic') for suffix in ('finite-te1','finite-te2.5-source'))
SOURCES={'scientific/regional-v83/'+n for n in ('campaign83.py','mesh83.py','PROTOCOL.md')}
SOURCES|={'scientific/electrical-v82/'+n for n in ('budget82.py','model82.py','transport82.py')}
SOURCES|={'scientific/flow-v81/'+n for n in ('solver.py','reference.py','transport.py')}
SOURCES.add('scientific/profile-v79/solver.py')
POWERS=('jouleW','rotorWorkW','electricalInW')


def require(ok,message):
    if not ok: raise ValueError(message)


def sha(raw): return hashlib.sha256(raw).hexdigest()


def relative(a,b):
    a,b=np.asarray(a,dtype=float),np.asarray(b,dtype=float)
    require(a.shape==b.shape and np.isfinite(a).all() and np.isfinite(b).all(),'Invalid relative comparison')
    if np.any(b==0): return None
    return float(np.max(abs(a-b)/abs(b)))


def scaled(a,b,scale):
    a,b=np.asarray(a,dtype=float),np.asarray(b,dtype=float)
    require(a.shape==b.shape and np.isfinite(a).all() and np.isfinite(b).all()
            and np.isfinite(scale) and scale>0,'Invalid scaled identity')
    return float(np.max(abs(a-b)))/scale


def axis_depth(m,scenario):
    """Independent source-axis covariance; shape endpoints coincide at r=0."""
    e,me=1.602176634e-19,9.1093837139e-31
    require(scenario['partition']=='source' and scenario['leadingWeakIonization'] is False,'Unexpected transport scenario')
    t=scenario['electronTemperatureEV']; require(t in (1.,2.5),'Unsupported source temperature')
    b=m['magneticT']; total=e*b/(me*100.)
    f=4.3e20*4e-20*np.sqrt(8*e/(np.pi*me))/total
    gain=1/((1-f)*t**-1.5+f*np.sqrt(t))
    fn=4.3e20/(4.3e20+1070*b/(e*100.)); electron=100*gain
    slip=fn**2*electron*.94
    return float(m['cathodeRadiusM']*np.sqrt(1+slip+electron**2/(1+slip)))


def mesh_edges(m,nr,nz,depth):
    a,R,L=m['cathodeRadiusM'],m['radiusM'],m['halfLengthM']
    zp=np.unique([0.,m['anodeCenterM']-m['anodeWidthM']/2,m['anodeCenterM']+m['anodeWidthM']/2,
                  L-.004,L-.016,L-.04,L-.08,L-depth,L])
    def make(points,counts):
        return np.r_[*[lo+(hi-lo)*np.sin(np.pi*np.arange(n)/(2*n))**2
                      for lo,hi,n in zip(points[:-1],points[1:],counts)],points[-1]]
    return make([0.,a,R],[4*nr,28*nr]),make(zp,np.maximum(2,np.ceil(np.diff(zp)/.005).astype(int))*nz)


def field_packet(directory,receipt):
    name=Path(receipt['path'])
    require(len(name.parts)==2 and name.parts[0]=='fields' and name.suffix=='.gz','Unexpected field-packet path')
    zipped=(directory/name).read_bytes(); require(sha(zipped)==receipt['sha256'],'Compressed field seal mismatch')
    raw=gzip.decompress(zipped); require(sha(raw)==receipt['rawSHA256'],'Raw field seal mismatch')
    arrays={k:np.asarray(v,dtype=float) for k,v in json.loads(raw).items()}
    require(set(arrays)=={'r','z','omegaRadS','potentialV','cellJouleW','cellRotorWorkW','cellElectricalInW'},'Field inventory mismatch')
    r,z=arrays['r'],arrays['z']
    require(r.ndim==z.ndim==1 and len(r)>1 and len(z)>1 and all(np.isfinite(v).all() for v in arrays.values())
            and np.all(np.diff(r)>0) and np.all(np.diff(z)>0),'Invalid field coordinates')
    shape=(len(z)-1,len(r)-1)
    require(all(v.shape==shape for k,v in arrays.items() if k not in ('r','z')),'Field shape mismatch')
    return arrays


def audit(path,root=None):
    path=Path(path).resolve(); root=Path(root).resolve() if root else path.parents[3]
    raw=path.read_bytes(); data=json.loads(raw); old_raw=(root/'scientific/electrical-v82/results/predictions.json').read_bytes()
    require(sha(old_raw)==SEALED and data['previousPredictionSHA256']==SEALED,'Frozen V82 seal mismatch')
    old=json.loads(old_raw)
    require(data['manifest']==old['manifest'] and data['experimentalQualification'] is False
            and data['targetVelocityRead'] is False and data['currentConditioning'] is False,'Changed apparatus or qualification')
    expected_scenarios=[s for s in old['scenarios'] if s['name'] in NAMES]
    require(data['scenarios']==expected_scenarios and {s['name'] for s in expected_scenarios}==set(NAMES),'Scenario inventory mismatch')
    require(set(data['sourceSHA256'])==SOURCES,'Incomplete source receipt')
    for name,value in data['sourceSHA256'].items():
        require(sha((root/name).read_bytes())==value,'Stale source receipt: '+name)
        if not name.startswith('scientific/regional-v83/'):
            require(old['sourceSHA256'][name]==value,'Frozen physics source changed: '+name)
    key=lambda c:(c['scenario'],c['anodeCenterM'],c['radialRefinement'],c['axialRefinement'])
    expected={(s,c,n,n) for s in NAMES for c in (.07,.08) for n in (1,2,4,8)}
    expected|={('linear-finite-te1',.07,4,8),('linear-finite-te1',.07,8,4)}
    cases={key(c):c for c in data['cases']}; require(len(cases)==len(data['cases'])==34 and set(cases)==expected,'Case inventory mismatch')
    gates=[]; saved={}; region_values={}
    def gate(category,metric,value,limit,context,final=True):
        require(value is None or np.isfinite(value),'Nonfinite diagnostic')
        gates.append(dict(category=category,metric=metric,value=value,limit=limit,context=context,final=final,
                          passed=bool(value is not None and 0<=value<limit)))
    def observations(context):
        c=cases[context]; p=c['prediction']
        return dict(current=p['currentsA']['cathode'],chords=saved[context]['chords'],
                    inputPower=p['electrodePowerW'],joulePower=p['jouleW'],rotorWork=p['viscousW'])
    for context,c in cases.items():
        s,center,nr,nz=context; m={**data['manifest'],'anodeCenterM':center}
        require(type(nr) is int and type(nz) is int,'Integer mesh refinement required')
        scenario=next(v for v in data['scenarios'] if v['name']==s); expected_depth=axis_depth(m,scenario)
        depth=c['accessDepthM']
        require(np.isfinite(depth) and abs(depth-expected_depth)<1e-13
                and depth==cases[s,center,1,1]['accessDepthM'],'Moving or incorrect access cut')
        a=field_packet(path.parent,c['fieldPacket']); r,z=a['r'],a['z']; er,ez=mesh_edges(m,nr,nz,depth)
        require(r.shape==er.shape and z.shape==ez.shape and np.allclose(r,er,rtol=0,atol=1e-14)
                and np.allclose(z,ez,rtol=0,atol=1e-14) and c['shape']==[len(z)-1,len(r)-1],'Changed declared mesh')
        p,b,q=c['prediction'],c['budget'],c['independent']; power=p['electrodePowerW']; current=p['currentsA']['cathode']
        require(np.isfinite([power,current]).all() and min(power,current)>0,'Positive drive required')
        gate('identity','port power',scaled(power,18.5*current,power),1e-8,context)
        gate('identity','port charge',scaled(sum(p['currentsA'].values()),0.,current),1e-8,context)
        for port in ('anode','cathode'):
            gate('identity','budget current/'+port,scaled(b['currentsA'][port],p['currentsA'][port],current),1e-8,context)
        for name,target in zip(POWERS,('jouleW','viscousW','electrodePowerW')):
            value=a['cell'+name[0].upper()+name[1:]]
            gate('identity','field sum/'+name,scaled(value.sum(),p[target],power),1e-8,context)
            gate('identity','budget/'+name,scaled(b[name],p[target],power),1e-8,context)
        gate('identity','positive Joule',float(max(0.,-a['cellJouleW'].min()))/power,1e-8,context)
        gate('identity','cell power',scaled(a['cellElectricalInW'],a['cellJouleW']+a['cellRotorWorkW'],power),1e-8,context)
        for name in ('chargeResidualRelative','cellElectricalBalanceRelative','globalBudgetRelative'):
            gate('identity','budget/'+name,b[name],1e-8,context)
        for name in ('chargeResidualRelative','boundaryResidualRelative','powerResidualRelative','angularResidualRelative','linearResidualRelative','torqueMomentResidualRelative'):
            gate('flow','primary/'+name,p[name],1e-8,context)
        for name in ('chargeResidualRelative','momentumResidualRelative','powerResidualRelative','torqueResidualRelative'):
            gate('flow','reference/'+name,q[name],1e-8,context)
        require(q['chordsM']==m['chordsM'] and q['sigmaParallelSM']==1070. and q['bulkVoltageV']==18.5,'Reference operating point changed')
        require(np.allclose(q['radialEdgesM'],r,rtol=0,atol=1e-14) and np.allclose(q['axialEdgesM'],z,rtol=0,atol=1e-14),'Reference grid changed')
        chords=[]
        for impact in m['chordsM']:
            lengths=np.diff(np.sqrt(np.maximum(r*r-impact*impact,0.)))
            chords.append(float(impact*(lengths@a['omegaRadS'][0])/sum(lengths)))
        gate('identity','saved chord observer',scaled(chords,c['chordVelocityMS'],max(abs(np.asarray(chords)))),1e-8,context)
        lower=center-m['anodeWidthM']/2; upper=center+m['anodeWidthM']/2
        intervals=[('midplane-side',0.,lower),('anode-band',lower,upper),('cathode-side',upper,z[-1])]
        intervals += [('endwall-'+str(d),z[-1]-d,z[-1]) for d in (.004,.016,.04,.08,depth)]
        require(len(c['regions'])==len(intervals),'Incomplete regional inventory'); values={}
        for region,(name,lo,hi) in zip(c['regions'],intervals):
            require(region['name']==name and np.allclose(region['axialEdgesM'],[lo,hi],rtol=0,atol=1e-13),'Moving region boundary')
            indices=[np.flatnonzero(abs(z-cut)<1e-13) for cut in (lo,hi)]
            require(all(len(i)==1 for i in indices),'Region cut not one mesh face')
            block=slice(indices[0][0],indices[1][0])
            for metric in POWERS:
                gate('identity','region/'+name+'/'+metric,scaled(a['cell'+metric[0].upper()+metric[1:]][block].sum(),region[metric],power),1e-8,context)
            for metric,unit in (('jouleW','jouleVoltEquivalent'),('rotorWorkW','rotorWorkVoltEquivalent')):
                gate('identity','region/'+name+'/'+unit,scaled(region[unit],region[metric]/current,18.5),1e-8,context)
                values[name+'/'+unit]=region[unit]
            gate('identity','region balance/'+name,scaled(region['electricalInW'],region['jouleW']+region['rotorWorkW'],power),1e-8,context)
            gate('identity','region balance receipt/'+name,region['electricalBalanceRelative'],1e-8,context)
        saved[context]=dict(fields=a,chords=chords); region_values[context]=values
        if nr==nz==8:
            for metric,x,y in [('current',q['branchCurrentA'],current),('chords',q['chordVelocityMS'],chords),
                    ('input power',q['electrodePowerW'],power),('Joule power',q['jouleW'],p['jouleW']),('shear power',q['shearW'],p['viscousW'])]:
                gate('flow','independent/'+metric,relative(x,y),.05,context)
    for s in NAMES:
        for center in (.07,.08):
            for n,fine in ((1,2),(2,4),(4,8)):
                old,new=(s,center,n,n),(s,center,fine,fine)
                for axis in ('r','z'):
                    require(np.allclose(saved[old]['fields'][axis],saved[new]['fields'][axis][::2],rtol=0,atol=1e-14),'Non-nested joint mesh')
                for metric,value in observations(old).items(): gate('flow','mesh/'+metric,relative(value,observations(new)[metric]),.05,new,fine==8)
                for metric,value in region_values[old].items(): gate('regional',metric,relative(value,region_values[new][metric]),.05,new,fine==8)
    directional=[]; base=('linear-finite-te1',.07,8,8)
    for nr,nz in ((4,8),(8,4)):
        context=('linear-finite-te1',.07,nr,nz)
        for axis,ref in (('r',nr),('z',nz)):
            expected_axis=saved['linear-finite-te1',.07,ref,ref]['fields'][axis]
            require(np.array_equal(saved[context]['fields'][axis],expected_axis),'Directional grid changed')
        directional.append(dict(context=context,reference=base,
            globalRelative={k:relative(v,observations(base)[k]) for k,v in observations(context).items()},
            regionalRelative={k:relative(v,region_values[base][k]) for k,v in region_values[context].items()}))
    passed=lambda category:all(g['passed'] for g in gates if g['category']==category and g['final'])
    return dict(experimentalQualification=False,predictionSHA256=sha(raw),previousPredictionSHA256=SEALED,caseCount=34,
        identityPass=passed('identity'),flowNumericalPass=passed('flow'),regionalNumericalPass=passed('regional'),
        gates=gates,failures=[g for g in gates if not g['passed']],directionalAssessment=directional,
        scope='Independent result-only fixed-domain identities, mesh/observer checks and saved reference ledgers. Shared mesh selection; no fresh PDE solve or experimental qualification. Directional sensitivity is limited to one declared baseline.')


def main():
    value=audit(sys.argv[1]); Path(sys.argv[2]).write_text(json.dumps(value,indent=2,allow_nan=False)+'\n')
    return 0 if all(value[key] for key in ('identityPass','flowNumericalPass','regionalNumericalPass')) else 1


if __name__=='__main__': raise SystemExit(main())
