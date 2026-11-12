"""Result-only electrical audit: no producer imports or measured velocities."""
import gzip
import hashlib
import json
from pathlib import Path
import sys

import numpy as np

V81_SHA='1cda6cc3b87e1cffefde611d55122855911391e8ccab538b59b27a72a904ab1d'
INPUTS={'scientific/electrical-v82/PROTOCOL.md','scientific/flow-v81/results/flow-predictions.json',
        'scientific/profile-v79/manifest.json','scientific/flow-v81/argon-viscosity-source.json',
        'scientific/optical-v80/sources/journal.pdf'}
SOURCES={'scientific/electrical-v82/'+n for n in ('campaign82.py','model82.py','budget82.py','transport82.py')}
SOURCES|={'scientific/flow-v81/'+n for n in ('solver.py','reference.py','transport.py')}
SOURCES.add('scientific/profile-v79/solver.py')
NAMES=tuple(f'{s}-{v}' for s in ('linear','quadratic') for v in
            ('v81-leading-te1','finite-te1','finite-te2.5-source','finite-te2.5-ei-only','finite-te2.5-uniform20'))
POWERS=('jouleW','rotorWorkW','electricalInW')


def require(ok,message):
    if not ok: raise ValueError(message)


def digest(value): return hashlib.sha256(value).hexdigest()


def relative(a,b):
    a,b=np.asarray(a,dtype=float),np.asarray(b,dtype=float)
    require(a.shape==b.shape and np.isfinite(a).all() and np.isfinite(b).all(),'Nonfinite/mismatched comparison')
    delta=abs(a-b)
    if np.any((b==0)&(delta!=0)): return None
    return float(np.max(np.divide(delta,abs(b),out=np.zeros_like(delta),where=b!=0)))


def scaled_error(a,b,scale):
    a,b=np.asarray(a,dtype=float),np.asarray(b,dtype=float)
    require(a.shape==b.shape and np.isfinite(a).all() and np.isfinite(b).all(),'Nonfinite/mismatched ledger')
    require(np.isfinite(scale) and scale>0,'Positive ledger scale required')
    return float(np.max(abs(a-b)))/scale


def linear_field_error(name,actual,expected,input_power):
    # Cell net electrical input can cancel to zero; use the physical power scale.
    return scaled_error(actual,expected,input_power) if name.startswith('cell') else relative(actual,expected)


def packet(path,receipt,m,ref):
    name=Path(receipt['path'])
    require(not name.is_absolute() and len(name.parts)==2 and name.parts[0]=='fields'
            and name.suffix=='.gz','Unexpected field-packet path')
    zipped=(path.parent/name).read_bytes(); require(digest(zipped)==receipt['sha256'],'Compressed field hash mismatch')
    raw=gzip.decompress(zipped); require(digest(raw)==receipt['rawSHA256'],'Raw field hash mismatch')
    value={k:np.asarray(v,dtype=float) for k,v in json.loads(raw).items()}
    require(set(value)=={'r','z','omegaRadS','potentialV','cellJouleW','cellRotorWorkW','cellElectricalInW'},'Unexpected field arrays')
    r,z=value['r'],value['z']; shape=(48*ref,32*ref)
    require(r.shape==(shape[1]+1,) and z.shape==(shape[0]+1,) and np.all(np.diff(r)>0)
            and np.all(np.diff(z)>0) and r[0]==z[0]==0 and r[-1]==m['radiusM']
            and z[-1]==m['halfLengthM'] and all(np.isfinite(a).all() for a in value.values()),'Invalid field geometry')
    require(all(value[k].shape==shape for k in value if k not in ('r','z')),'Invalid field array shape')
    edges=(m['anodeCenterM']-m['anodeWidthM']/2,m['anodeCenterM']+m['anodeWidthM']/2)
    require(any(abs(r-m['cathodeRadiusM'])<1e-14) and all(any(abs(z-e)<1e-14) for e in edges),'Missing electrode mesh edge')
    return value


def audit(path,access_path,root=None):
    path,access_path=Path(path).resolve(),Path(access_path).resolve()
    root=Path(root).resolve() if root else path.parents[3]
    data=json.loads(path.read_text()); access=json.loads(access_path.read_text())
    frozen=root/'scientific/flow-v81/results/flow-predictions.json'
    require(digest(frozen.read_bytes())==V81_SHA,'V81 seal mismatch')
    require(data['manifest']==json.loads(frozen.read_text())['manifest'],'Frozen manifest changed')
    require(data['experimentalQualification'] is False and data['targetVelocityRead'] is False
            and data['currentConditioning'] is False,'Unqualified, unconditioned prediction required')
    for field,names in (('inputSHA256',INPUTS),('sourceSHA256',SOURCES)):
        require(set(data[field])==names,'Incomplete provenance receipt')
        for name,sha in data[field].items(): require(digest((root/name).read_bytes())==sha,'Stale provenance: '+name)
    require(data['inputSHA256']['scientific/flow-v81/results/flow-predictions.json']==V81_SHA,'V81 receipt mismatch')
    require(data['anodeCentersM']==[.07,.08] and len(data['scenarios'])==10,'Changed frozen scenario inventory')
    expected_scenarios=[]
    for shape in ('linear','quadratic'):
        for suffix,te,partition,leading in [('v81-leading-te1',1.,'source',True),('finite-te1',1.,'source',False),
                ('finite-te2.5-source',2.5,'source',False),('finite-te2.5-ei-only',2.5,'electron-ion-only',False),
                ('finite-te2.5-uniform20',2.5,'uniform-20pct',False)]:
            expected_scenarios.append(dict(name=shape+'-'+suffix,shape=shape,electronTemperatureEV=te,
                                           partition=partition,leadingWeakIonization=leading))
    require(data['scenarios']==expected_scenarios,'Changed frozen transport scenarios')
    key=lambda row:(row['scenario'],row['anodeCenterM'],row['refinement'],row['voltageV'])
    variants=((1,18.5),(2,18.5),(4,18.5),(4,16.5),(4,20.5))
    expected={(s,c,r,v) for s in NAMES for c in (.07,.08) for r,v in variants}
    cases={key(row):row for row in data['cases']}
    require(len(cases)==len(data['cases']) and set(cases)==expected,'Missing/duplicate/unexpected absolute cases')
    groups={s+'-anode-'+str(c):(s,c) for s in NAMES for c in (.07,.08)}
    fixed={row['group']:row for row in data['fixedCurrent']}; locked={row['group']:row for row in data['lockedFlow']}
    require(len(fixed)==len(data['fixedCurrent'])==20 and set(fixed)==set(groups),'Invalid fixed-current inventory')
    require(len(locked)==len(data['lockedFlow'])==20 and set(locked)==set(groups),'Invalid locked-flow inventory')
    gates=[]; saved={}; local_coordinates=[]
    def gate(category,metric,value,limit,context,final=True):
        if value is not None and not np.isfinite(value): value=None
        gates.append(dict(category=category,metric=metric,value=value,limit=limit,context=context,final=final,
                          passed=bool(value is not None and 0<=value<limit)))

    def check_row(row,context,mode):
        scenario,center=groups[row['group']]
        require(row['scenario']==scenario and row['anodeCenterM']==center and row['drive']==mode,'Mislabeled drive/group')
        p,b=row['prediction'],row['budget']; voltage=row['voltageV']; current=p['currentsA']['cathode']
        require(np.isfinite([voltage,current]).all() and min(voltage,current)>0,'Positive campaign drive required')
        m={**data['manifest'],'anodeCenterM':center}; fields=packet(path,row['fieldPacket'],m,row['refinement'])
        total=p['electrodePowerW']; require(np.isfinite(total) and total>0,'Positive input power required')
        gate('budget','Joule positivity',float(max(0.,-fields['cellJouleW'].min()))/total,1e-8,context)
        for name in POWERS:
            gate('budget','cell sum/'+name,scaled_error(fields['cell'+name[0].upper()+name[1:]].sum(),b[name],total),1e-8,context)
        for name,target in [('jouleW','jouleW'),('rotorWorkW','viscousW'),('electricalInW','electrodePowerW')]:
            gate('budget','primary total/'+name,scaled_error(b[name],p[target],total),1e-8,context)
        gate('budget','cell electrical work',scaled_error(fields['cellElectricalInW'],fields['cellJouleW']+fields['cellRotorWorkW'],total),1e-8,context)
        gate('budget','port power',scaled_error(total,voltage*current,total),1e-8,context)
        gate('budget','port charge',scaled_error(sum(p['currentsA'].values()),0.,current),1e-8,context)
        for port in ('anode','cathode'):
            gate('budget','reconstructed current/'+port,scaled_error(b['currentsA'][port],p['currentsA'][port],current),1e-8,context)
        for name in ('chargeResidualRelative','cellElectricalBalanceRelative','globalBudgetRelative'):
            gate('budget',name,b[name],1e-8,context)
        rc=np.sqrt((fields['r'][:-1]**2+fields['r'][1:]**2)/2); z=fields['z']; zc=(z[:-1]+z[1:])/2
        chords=[]
        for chord in data['manifest']['chordsM']:
            lengths=np.diff(np.sqrt(np.maximum(fields['r']**2-chord**2,0.)))
            chords.append(float(chord*(lengths@fields['omegaRadS'][0])/sum(lengths)))
        gate('flow','saved chord observer',relative(chords,p['chordVelocityMS']),1e-8,context)
        gate('flow','saved local velocity',relative(rc*fields['omegaRadS'][0],p['localMidplaneVelocityMS']),1e-8,context)
        lower=center-m['anodeWidthM']/2; upper=center+m['anodeWidthM']/2
        regions=[('midplane-side',zc<lower),('anode-band',(zc>=lower)&(zc<upper)),('cathode-side',zc>=upper)]
        depths=(m['cathodeRadiusM'],.016,.04,.08,b['nearAxisAccessLengthM'])
        require(np.isfinite(depths).all() and min(depths)>0,'Invalid access length')
        nested=[('within-'+str(d)+'m-of-endwall',z[-1]-zc<=d) for d in depths]
        for label,items,masks in [('regions',b['regions'],regions),('nestedEndwallRegions',b['nestedEndwallRegions'],nested)]:
            require(len(items)==len(masks),'Incomplete region inventory')
            for region,(name,mask) in zip(items,masks):
                require(region['name']==name,'Changed region definition')
                indices=np.flatnonzero(mask); edges=[float(z[indices[0]]),float(z[indices[-1]+1])] if len(indices) else None
                require(region['axialEdgesM']==edges,'Changed mesh-aligned region cut')
                for metric in POWERS:
                    value=fields['cell'+metric[0].upper()+metric[1:]][mask].sum()
                    gate('budget',label+'/'+name+'/'+metric,scaled_error(value,region[metric],total),1e-8,context)
                for metric,unit in [('jouleW','jouleVoltEquivalent'),('rotorWorkW','rotorWorkVoltEquivalent')]:
                    gate('budget',label+'/'+name+'/'+unit,scaled_error(region[unit],region[metric]/current,voltage),1e-8,context)
                gate('budget',label+'/'+name+'/electrical balance',region['electricalBalanceRelative'],1e-8,context)
        return fields,chords

    for context,row in cases.items():
        fields,chords=check_row(row,context,'absolute-voltage'); saved[context]=(fields,chords)
        p,q=row['prediction'],row['independentSameSigma']
        for name in ('chargeResidualRelative','boundaryResidualRelative','powerResidualRelative','angularResidualRelative','linearResidualRelative','torqueMomentResidualRelative'):
            gate('flow','primary/'+name,p[name],1e-8,context)
        for name in ('chargeResidualRelative','momentumResidualRelative','powerResidualRelative','torqueResidualRelative'):
            gate('flow','independent/'+name,q[name],1e-8,context)
        if row['refinement']==4:
            qr=np.asarray(q['radialCentersM'],dtype=float); qv=np.asarray(q['localMidplaneVelocityMS'],dtype=float)
            pr=np.sqrt((fields['r'][:-1]**2+fields['r'][1:]**2)/2); pv=np.asarray(p['localMidplaneVelocityMS'],dtype=float)
            require(qr.shape==qv.shape==pr.shape==pv.shape and np.isfinite(qr).all() and np.isfinite(pr).all(),
                    'Invalid local-coordinate assessment')
            local_coordinates.append(dict(context=context,primaryRadiusM=pr.tolist(),referenceRadiusM=qr.tolist(),
                primaryVelocityMS=pv.tolist(),referenceVelocityMS=qv.tolist(),rawRelativeDifference=relative(qv,pv),
                scope='Distinct solver cell-center coordinates; raw pointwise difference is not an agreement gate. Common-chord/current/power gates remain unchanged.'))
            for name,a,b in [('chords',q['chordVelocityMS'],chords),
                    ('current',q['branchCurrentA'],p['currentsA']['cathode']),('input power',q['electrodePowerW'],p['electrodePowerW']),
                    ('Joule power',q['jouleW'],p['jouleW']),('shear power',q['shearW'],p['viscousW'])]:
                gate('flow','independent/'+name,relative(a,b),.05,context)
    compatibility=[]
    for group,(scenario,center) in groups.items():
        base=cases[scenario,center,4,18.5]; fixed_row=fixed[group]; locked_row=locked[group]
        p=base['prediction']; gain=100./p['currentsA']['cathode']; fixed_fields,_=check_row(fixed_row,group,'fixed-current')
        gate('scaling','drive gain',relative(fixed_row['driveGain'],gain),1e-8,group)
        gate('scaling','required voltage',relative(fixed_row['voltageV'],18.5*gain),1e-8,group)
        gate('scaling','fixed current',relative(fixed_row['prediction']['currentsA']['cathode'],100.),1e-8,group)
        within=16.5<=18.5*gain<=20.5
        require(fixed_row['voltageWithinReportedRange'] is within,'Incorrect measured-voltage compatibility')
        compatibility.append(dict(group=group,requiredVoltageV=18.5*gain,voltageWithinReportedRange=within))
        source_fields=saved[scenario,center,4,18.5][0]
        for name in ('r','z','omegaRadS','potentialV','cellJouleW','cellRotorWorkW','cellElectricalInW'):
            factor=1. if name in ('r','z') else gain if name in ('omegaRadS','potentialV') else gain**2
            gate('scaling','saved field/'+name,linear_field_error(name,fixed_fields[name],source_fields[name]*factor,
                 fixed_row['prediction']['electrodePowerW']),1e-8,group)
        lp=locked_row['prediction']; require(locked_row['anodeCenterM']==center,'Locked geometry changed')
        require(lp['propertyRanges']==p['propertyRanges'],'Locked control changed the conductivity/viscosity tensor')
        gate('passivity','locked zero velocity',float(np.max(np.abs(lp['localMidplaneVelocityMS']))),1e-8,group)
        gate('passivity','locked zero chords',float(np.max(np.abs(lp['chordVelocityMS']))),1e-8,group)
        gate('passivity','locked zero shear',abs(lp['viscousW'])/lp['electrodePowerW'],1e-8,group)
        gate('passivity','passive coupled conductance',max(0.,p['currentsA']['cathode']-lp['currentsA']['cathode'])/lp['currentsA']['cathode'],1e-8,group)
        gate('passivity','locked power',relative(lp['electrodePowerW'],18.5*lp['currentsA']['cathode']),1e-8,group)
        gate('passivity','locked energy ledger',relative(lp['jouleW']+lp['viscousW'],lp['electrodePowerW']),1e-8,group)
        for name in ('chargeResidualRelative','boundaryResidualRelative','powerResidualRelative','angularResidualRelative','linearResidualRelative','torqueMomentResidualRelative'):
            gate('passivity','locked/'+name,lp[name],1e-8,group)
        for coarse,fine in ((1,2),(2,4)):
            a,b=(cases[scenario,center,r,18.5] for r in (coarse,fine)); context=(scenario,center,fine); final=fine==4
            for name,x,y in [('current',a['prediction']['currentsA']['cathode'],b['prediction']['currentsA']['cathode']),
                            ('chords',saved[scenario,center,coarse,18.5][1],saved[scenario,center,fine,18.5][1])]+[
                    (k,a['prediction'][k],b['prediction'][k]) for k in ('electrodePowerW','jouleW','viscousW')]:
                gate('flow','mesh/'+name,relative(x,y),.05,context,final)
            for scope in ('regions','nestedEndwallRegions'):
                for old,new in zip(a['budget'][scope],b['budget'][scope]):
                    for metric in ('jouleVoltEquivalent','rotorWorkVoltEquivalent'):
                        gate('budget-refinement',scope+'/'+new['name']+'/'+metric,relative(old[metric],new[metric]),.05,context,final)
    require(access['experimentalQualification'] is False,'Access verification mislabeled experimental')
    require(access['sourceSHA256']==digest((root/'scientific/electrical-v82/access82.py').read_bytes()),'Stale FiPy source')
    rows=access['rows']; require([r['nearContactCells'] for r in rows]==[16,32,64,128],'Changed FiPy refinement inventory')
    for i,row in enumerate(rows):
        require(row['experimentalQualification'] is False and row['radialCells']==3*row['nearContactCells']
                and row['axialCells']==2*row['nearContactCells'],'Invalid FiPy benchmark scope/mesh')
        require(all(row[k]==value for k,value in [('radiusM',.004),('sigmaRadialSM',1070./197.),
                    ('sigmaAxialSM',1070.),('voltageV',18.5)]),'Changed frozen FiPy benchmark inputs')
        expected=4*row['radiusM']*row['voltageV']*np.sqrt(row['sigmaRadialSM']*row['sigmaAxialSM'])
        gate('access','analytic current receipt',relative(row['analyticCurrentA'],expected),1e-8,i)
        error=relative(row['contactCurrentA'],expected)
        gate('access','analytic current error',error,.05,i,final=i==3)
        gate('access','analytic error receipt',scaled_error(row['currentRelativeError'],error,1.),1e-8,i)
        for name in ('chargeResidualRelative','boundaryChargeResidualRelative','insulatingCurrentRelative'):
            gate('access',name,row[name],1e-8,i)
        if i:
            change=relative(rows[i-1]['contactCurrentA'],row['contactCurrentA'])
            gate('access','mesh/current',change,.05,i,final=i==3)
            gate('access','mesh receipt',scaled_error(row['refinementRelativeChange'],change,1.),1e-8,i)
    for name,value in [('analyticCurrentGate',rows[-1]['currentRelativeError']<.05),
                       ('currentRefinementGate',rows[-1]['refinementRelativeChange']<.05),
                       ('chargeGate',all(max(r[k] for k in ('chargeResidualRelative','boundaryChargeResidualRelative','insulatingCurrentRelative'))<1e-8 for r in rows))]:
        require(access[name] is bool(value),'Incorrect access gate receipt')
    passed=lambda category:all(g['passed'] for g in gates if g['category']==category and g['final'])
    return dict(experimentalQualification=False,flowNumericalPass=passed('flow'),budgetIdentityPass=passed('budget'),
        budgetRefinementPass=passed('budget-refinement'),linearScalingPass=passed('scaling'),passivityPass=passed('passivity'),
        accessBenchmarkPass=passed('access'),gates=gates,failures=[g for g in gates if not g['passed']],
        requiredVoltage=compatibility,localCoordinateAssessment=local_coordinates,
        predictionSHA256=digest(path.read_bytes()),accessSHA256=digest(access_path.read_bytes()),
        scope='Independent saved-array/provenance audit, not a new PDE solve or experimental qualification; zero-denominator refinements remain unavailable failures.')


if __name__=='__main__':
    result=audit(sys.argv[1],sys.argv[2]); Path(sys.argv[3]).write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
