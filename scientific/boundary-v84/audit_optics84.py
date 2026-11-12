"""Independent saved-field optical moments and score reconstruction; no producer imports."""
import gzip
import importlib.util
import json
from pathlib import Path
import sys
import numpy as np

HERE=Path(__file__).parent
spec=importlib.util.spec_from_file_location('independent_optics82',HERE.parent/'electrical-v82/audit_optics82.py')
previous=importlib.util.module_from_spec(spec); spec.loader.exec_module(previous)
annuli,paths,sha,require=previous.annuli,previous.paths,previous.sha,previous.require
TEMPERATURES,RESIDUALS,THERMAL=previous.TEMPERATURES,previous.RESIDUALS,previous.THERMAL
NAMES={s+'-'+t for s in ('linear','quadratic') for t in ('finite-te1','finite-te2.5-source')}
OPTIONS={(c,t,g,k) for c in ('linear','sqrt') for t in TEMPERATURES for g in (0.,500.,1000.) for k in ('centroidMS','modeMS')}


def rel(x,y):
    x,y=np.asarray(x,dtype=float),np.asarray(y,dtype=float)
    require(x.shape==y.shape and np.isfinite(x).all() and np.isfinite(y).all(),'Invalid observable')
    return float(np.max(abs(x-y)/np.maximum(abs(x),1e-12)))


def unpack(entry,payloads,kind):
    raw=payloads[entry['path']]; require(sha(raw)==entry['sha256'],'Compressed '+kind+' seal mismatch')
    raw=gzip.decompress(raw); require(sha(raw)==entry['rawSHA256'],'Raw '+kind+' seal mismatch')
    return json.loads(raw)


def audit(prediction_raw,index,groups,fields,operators,diagnostics,fixture,adapter,
          comparison=None,points=None,flow_audit=None):
    packet=json.loads(prediction_raw); seal=sha(prediction_raw)
    for key in ('experimentalQualification','targetVelocityRead','currentFitted','absoluteCurrentPrediction','correctedVoltagePrediction'):
        require(packet.get(key) is False,'Prediction fitting/qualification mismatch: '+key)
    require(packet.get('prescribedCurrent') is True and packet.get('currentConditioning') is True,'Source-prescribed current must be explicit')
    require(index.get('experimentalQualification') is False and index.get('targetVelocityRead') is False
            and index.get('predictionSHA256')==seal,'Prediction/index identity mismatch')
    require(index['operatorSHA256']==operators and index['diagnosticSHA256']==diagnostics and index['adapterSHA256']==adapter,'Operator/fixture/adapter mismatch')
    key=lambda c:(c['scenario'],c['anodeCenterM'],c['refinement'])
    sources={key(c):c for c in packet['cases']}
    expected={(s,c,n) for s in NAMES for c in (.07,.08) for n in (1,2,4,8)}
    require(len(sources)==len(packet['cases'])==32 and set(sources)==expected,'Flow inventory mismatch')
    labels={f'{s}-a{c}-n{n}':(s,c,n) for s,c,n in expected if n in (4,8)}
    require(len(index['groups'])==16 and {g['group'] for g in index['groups']}==set(labels),'Group inventory mismatch')
    require(set(groups)=={g['path'] for g in index['groups']},'Group payload inventory mismatch')
    require(set(fields)=={sources[k]['fieldPacket']['path'] for k in labels.values()},'Field inventory mismatch')
    locations=fixture['locations']; ids=[p['id'] for p in locations]; brightness=fixture['brightness']
    require(len(ids)==len(set(ids))==5 and len(brightness)==29,'Incomplete optical fixture')
    b=[p['radiusM'] for p in brightness]; intensity=np.array([p['brightness'] for p in brightness]); scale=float(max(intensity))
    low,high=np.array([p['brightnessExtractionRange'] for p in brightness]).T
    require(np.isfinite(intensity).all() and scale>0,'Invalid brightness')
    maxima,failures,unavailable={},[],[]; optical_rows={}
    def gate(metric,value,limit,context,final=True):
        require(np.isfinite(value),'Nonfinite '+metric); value=float(value)
        maxima[metric]=max(maxima.get(metric,0.),abs(value))
        if value>=limit: failures.append(dict(metric=metric,value=value,limit=limit,context=context,final=final))
    for entry in index['groups']:
        name=entry['group']; context=labels[name]; src=sources[context]; n=context[-1]
        data=unpack(entry,groups,'optical')
        require(data.get('experimentalQualification') is False and data.get('predictionSHA256')==seal
                and data.get('actualFlowRefinement')==n,'Group prediction identity mismatch')
        require(data['locations']==locations and data['brightness']==brightness and data['reconstructions']==fixture['reconstructions'],'Frozen brightness fixture changed')
        require(len(data['cases'])==1,'Optical case inventory mismatch'); case=data['cases'][0]
        require(case['beta']=='ring-current' and case['voltageV'] is None and case['refinement']==4,'Physical meaning changed in adapter tags')
        field=unpack(src['fieldPacket'],fields,'field'); ve=np.asarray(field['r']); omega=np.asarray(field['omegaRadS'])[0]
        require(ve.shape==(32*n+1,) and omega.shape==(32*n,) and np.isfinite(omega).all()
                and ve[0]==0 and ve[-1]==packet['manifest']['radiusM'] and np.all(np.diff(ve)>0),'Actual graded field required')
        recs={(r['edgeClosure'],r['mesh']):r for r in data['reconstructions']}
        require(len(data['reconstructions'])==6 and set(recs)=={(c,n) for c in ('linear','sqrt') for n in (64,128,256)},'Emission mesh inventory mismatch')
        observers={}
        for (closure,mesh),rec in recs.items():
            projected=paths(b,rec['radialEdgesM'])@rec['emissivity']
            gate('brightnessReceiptRelative',rel(projected,rec['originalReprojectedBrightness']),1e-8,name)
            maxima['brightnessReprojectionRelative']=max(maxima.get('brightnessReprojectionRelative',0.),float(max(abs(projected-intensity)))/scale)
            for p in locations:
                weight,u,r,ei,length=annuli(rec['radialEdgesM'],rec['emissivity'],ve,omega,p['radiusM'])
                require(sum(weight)>0,'No emitted photons'); observers[closure,mesh,p['id']]=(weight/sum(weight),u,r,ei,length)
        require(len(case['closures'])==2 and {c['edgeClosure'] for c in case['closures']}=={'linear','sqrt'},'Closure inventory mismatch')
        scored={}
        for closure in case['closures']:
            edge=closure['edgeClosure']; meshes=closure['centroidMeshes']
            require([m['mesh'] for m in meshes]==[64,128,256] and all(len(m['velocityMS'])==5 for m in meshes),'Centroid inventory mismatch')
            for mesh in meshes:
                reconstructed=[float(observers[edge,mesh['mesh'],p['id']][0]@observers[edge,mesh['mesh'],p['id']][1]) for p in locations]
                gate('independentCentroidRelative',rel(reconstructed,mesh['velocityMS']),1e-8,name)
            for a,z in zip(meshes,meshes[1:]): gate('centroidMeshRelative',rel(z['velocityMS'],a['velocityMS']),.01,name,z['mesh']==256)
            centroid_change=rel(meshes[-1]['velocityMS'],meshes[-2]['velocityMS'])
            spectra=closure['spectra']; spectral={(s['id'],s['temperatureK'],s['instrumentSigmaMS']):s for s in spectra}
            require(len(spectra)==len(spectral)==90 and set(spectral)=={(i,t,g) for i in ids for t in TEMPERATURES for g in (0.,500.,1000.)},'Spectral inventory mismatch')
            cert_flags={}
            for sk,s in spectral.items():
                ctx=(*context,edge,*sk); runs=s['refinements']; coarse=s['coarseOpticalSpectrum']
                require([r['binWidthMS'] for r in runs]==[10.,5.,2.5],'Bin inventory mismatch')
                for mesh,rows in ((128,[coarse]),(256,runs)):
                    f,u,r,*_=observers[edge,mesh,s['id']]; mean=float(f@u)
                    t=5950+(1800-5950)*np.minimum(r/.05,1) if s['temperatureK']=='linear' else s['temperatureK']
                    variance=float(f@(THERMAL*t+(u-mean)**2)+s['instrumentSigmaMS']**2)
                    lo,hi=min(0.,float(min(u))),max(0.,float(max(u)))
                    for row in rows:
                        gate('spectralCentroidRelative',rel(mean,row['centroidMS']),1e-8,ctx)
                        gate('spectralVarianceRelative',rel(variance,row['varianceM2S2']),1e-8,ctx)
                        gate('fluxError',abs(row['capturedFlux']-1),1e-8,ctx)
                        for k in ('centroidMS','modeMS'): gate('speedHullViolationMS',max(lo-row[k],row[k]-hi,0.),1e-6,ctx)
                changes=[max(rel(z[k],a[k]) for k in ('centroidMS','modeMS')) for a,z in zip(runs,runs[1:])]
                optical_change={k:rel(runs[-1][k],coarse[k]) for k in ('modeMS','varianceM2S2')}
                require(set(s['opticalMeshRelativeChanges'])==set(optical_change),'Optical mesh statistic inventory mismatch')
                for k,v in optical_change.items():
                    gate('savedOpticalChange/'+k,rel(v,s['opticalMeshRelativeChanges'][k]),1e-8,ctx)
                flags=dict(spectralGate=changes[-1]<.01,fluxGate=all(abs(r['capturedFlux']-1)<1e-8 for r in runs),
                           opticalSpectrumMeshGate=all(v<.01 for v in optical_change.values()))
                require(all(s[k] is v for k,v in flags.items()),'Spectral gate receipt mismatch')
                gate('savedSpectralChange',rel(changes[-1],s['finalRelativeChange']),1e-8,ctx)
                for j,v in enumerate(changes): gate('spectralBinRelative',v,.01,ctx,j==1)
                for k,v in optical_change.items(): gate('spectrumMeshRelative/'+k,v,.01,ctx)
                cert_flags[sk]=flags
            for t in TEMPERATURES:
                for g in (0.,500.,1000.):
                    selected=[spectral[i,t,g] for i in ids]; flags=[cert_flags[i,t,g] for i in ids]
                    for estimator in ('centroidMS','modeMS'):
                        scored[edge,t,g,estimator]=dict(predictionMS=[s['refinements'][-1][estimator] for s in selected],
                            opticalCentroidMeshChange=centroid_change,opticalCentroidMeshGate=centroid_change<.01,
                            spectralGate=all(s['spectralGate'] and s['fluxGate'] for s in flags),
                            opticalSpectrumMeshGate=all(s['opticalSpectrumMeshGate'] for s in flags))
        require([r['mesh'] for r in case['brightnessBounds']]==[64,128,256],'LP mesh inventory mismatch')
        for bounds in case['brightnessBounds']:
            require([p['id'] for p in bounds['points']]==ids,'LP location inventory mismatch'); e=recs['linear',bounds['mesh']]['radialEdgesM']; A=paths(b,e)
            for p,location in zip(bounds['points'],locations):
                ctx=(*context,bounds['mesh'],p['id'])
                if p['status']!='available': unavailable.append(dict(context=ctx,reason=p.get('reason'))); continue
                _,u,_,ei,length=annuli(e,np.ones(len(e)-1),ve,omega,location['radiusM'])
                moment=np.bincount(ei,weights=length*u,minlength=len(e)-1); target_path=paths([location['radiusM']],e)[0]
                require(np.isfinite([p['minMS'],p['maxMS']]).all() and p['minMS']<=p['maxMS']+1e-7,'Invalid LP interval')
                for label,endpoint in (('minimumCertificate','minMS'),('maximumCertificate','maxMS')):
                    cert=p[label]; epsilon=np.asarray(cert['epsilon']); require(epsilon.shape==(len(e)-1,) and np.isfinite(epsilon).all() and np.all(epsilon>=0),'Invalid LP emissivity')
                    light=A@epsilon; target=float(target_path@epsilon); require(np.isfinite(target) and target>0,'Nonemitting LP certificate')
                    mean=float(moment@epsilon/target)
                    gate('lpBrightnessConstraintRelative',float(max(0.,max(low-light),max(light-high)))/scale,1e-7,ctx)
                    gate('lpBrightnessReceiptRelative',float(max(abs(light-cert['brightness'])))/scale,1e-8,ctx)
                    gate('lpTargetReceiptRelative',rel(target,cert['targetBrightness']),1e-8,ctx)
                    for saved in (cert['centroidMS'],p[endpoint]): gate('lpCentroidReceiptRelative',rel(mean,saved),1e-8,ctx)
                    require(set(cert['residuals'])==RESIDUALS,'Incomplete LP residuals')
                    for metric,v in cert['residuals'].items(): gate('lpSaved/'+metric,abs(v),1e-7,ctx)
        require(set(scored)==OPTIONS,'Alternative inventory mismatch'); optical_rows[context]=scored
    flow_changes={}
    for s in NAMES:
        for c in (.07,.08):
            for option in OPTIONS:
                a=np.asarray(optical_rows[s,c,4][option]['predictionMS']); b=np.asarray(optical_rows[s,c,8][option]['predictionMS'])
                change=None if np.any(b==0) else float(max(abs(a-b)/abs(b))); flow_changes[s,c,option]=change
                if change is not None: gate('flowOpticalRelative',change,.05,(s,c,*option))
                else: failures.append(dict(metric='flowOpticalRelative',value=None,limit=.05,context=(s,c,*option),final=True))
    result=dict(experimentalQualification=False,absoluteCurrentPrediction=False,correctedVoltagePrediction=False,
        predictionSHA256=seal,groupCount=16,flowCaseCount=32,opticalCaseCount=16,alternativeCount=576,maxima=maxima,
        failures=failures,lpUnavailable=unavailable,finalNumericalPass=not unavailable and not any(f['final'] for f in failures),
        scope='Independent exact graded-field annular LOS/thermal moments, primal LP certificates and score reconstruction. No independent spectral-mode solve, LP dual certificate, PDE reassembly or experimental qualification.')
    if comparison is not None:
        require(points is not None and flow_audit is not None,'Score inputs required')
        result.update(audit_scores(comparison,points,flow_audit,seal,locations,optical_rows,flow_changes,index))
    return result


def audit_scores(d,points,flow_audit,seal,locations,rows,changes,index):
    for key in ('experimentalQualification','currentFitted','absoluteCurrentPrediction','correctedVoltagePrediction'):
        require(d.get(key) is False,'False comparison qualification: '+key)
    require(d.get('prescribedCurrent') is True and d['predictionSHA256']==seal and flow_audit['predictionSHA256']==seal,'Comparison binding changed')
    require(flow_audit.get('caseCount')==32 and flow_audit.get('experimentalQualification') is False
            and flow_audit.get('absoluteCurrentPrediction') is False and flow_audit.get('correctedVoltagePrediction') is False
            and flow_audit.get('prescribedCurrent') is True,'Flow audit scope changed')
    require(d['points']==points and [(p['id'],p['radiusM']) for p in points]==[(p['id'],p['radiusM']) for p in locations],'Target locations changed')
    y=np.asarray([p['velocityMS'] for p in points]); eligible=np.asarray([p['extractionUnderFivePercent'] for p in points])
    require(np.isfinite(y).all() and np.all(y>0) and eligible.any(),'Invalid target screen')
    key=lambda r:(r['scenario'],r['anodeCenterM'],(r['edgeClosure'],r['temperatureK'],r['instrumentSigmaMS'],r['estimator']))
    saved={key(r):r for r in d['cases']}; expected={(s,c,o) for s in NAMES for c in (.07,.08) for o in OPTIONS}
    require(len(saved)==len(d['cases'])==d['alternatives']==576 and set(saved)==expected,'Scored alternative inventory mismatch')
    flow_pass=flow_audit['identityPass'] and flow_audit['flowNumericalPass']; flags=[]
    for (s,c,o),r in saved.items():
        known=rows[s,c,8][o]; v=np.asarray(known['predictionMS']); error=abs(v-y)/y; change=changes[s,c,o]
        require(r['beta']=='ring-current' and r['voltageV'] is None and r['actualFlowRefinement']==8
                and r['prescribedCurrentA']==100 and r['predictedCurrentA'] is None,'Prescribed current presented as predicted')
        require(rel(v,r['predictionMS'])<1e-12 and rel(error,r['errorRelative'])<1e-12,'Score values changed')
        for k,value in (('worstRelative',max(error)),('rmsOverMeasuredPeak',np.sqrt(np.mean((v-y)**2))/max(y)),('opticalCentroidMeshChange',known['opticalCentroidMeshChange'])):
            require(rel(value,r[k])<1e-12,'Score statistic changed: '+k)
        check=dict(eligiblePointGate=bool(np.all(error[eligible]<=.2)),allPointGate=bool(np.all(error<=.2)),
            flowOpticalGate=bool(change is not None and change<.05),**{k:known[k] for k in ('opticalCentroidMeshGate','spectralGate','opticalSpectrumMeshGate')})
        require(r['flowOpticalRelativeChange']==change,'Flow refinement score changed')
        check['resolvedOpticalPointMatch']=bool(flow_pass and check['flowOpticalGate'] and check['allPointGate'] and all(check[k] for k in ('opticalCentroidMeshGate','spectralGate','opticalSpectrumMeshGate')))
        require(all(r[k] is bool(value) for k,value in check.items()),'Score gate receipt mismatch'); flags.append(check)
    for saved_key,row_key in (('anyAllPointPass','allPointGate'),('anyEligiblePointPass','eligiblePointGate'),('anyResolvedOpticalPointMatch','resolvedOpticalPointMatch')):
        require(d[saved_key] is any(r[row_key] for r in flags),'Score aggregate mismatch')
    return dict(scoreReconstructionPass=True,scoredAlternatives=576,
                anyAllPointPass=d['anyAllPointPass'],anyEligiblePointPass=d['anyEligiblePointPass'],anyResolvedOpticalPointMatch=d['anyResolvedOpticalPointMatch'])


def main():
    directory,output=map(Path,sys.argv[1:]); v80=HERE.parent/'optical-v80'; receipt=json.loads((v80/'results/verification.json').read_text())
    sources=list(v80.glob('*.py'))+[v80/n for n in ('brightness-independent.json','locations.json')]
    for p in sources: require(sha(p.read_bytes())==receipt['sourceSHA256']['scientific/optical-v80/'+p.name],'Immutable V80 source changed: '+p.name)
    fixture_raw=(v80/'results/optical-predictions.json').read_bytes(); require(sha(fixture_raw)==receipt['opticalPredictionSHA256'],'V80 fixture seal changed')
    prediction=(directory/'predictions.json').read_bytes(); packet=json.loads(prediction); index_raw=(directory/'optical-index.json').read_bytes(); index=json.loads(index_raw)
    def payloads(entries,subdir):
        result={}
        for e in entries:
            p=(directory/e['path']).resolve(); require(p.is_relative_to(directory.resolve()/subdir),'Unexpected payload path'); result[e['path']]=p.read_bytes()
        return result
    groups=payloads(index['groups'],'optics'); fields=payloads([c['fieldPacket'] for c in packet['cases'] if c['refinement'] in (4,8)],'fields')
    target=(HERE.parent/'profile-v79/results/score.json').read_bytes(); comparison_raw=(directory/'comparison.json.gz').read_bytes(); comparison=json.loads(gzip.decompress(comparison_raw))
    require(comparison['targetFileSHA256']==sha(target) and comparison['opticalIndexSHA256']==sha(index_raw),'Score source seal changed')
    result=audit(prediction,index,groups,fields,{p.name:sha(p.read_bytes()) for p in sources if p.suffix=='.py'},
        {p.name:sha(p.read_bytes()) for p in sources if p.suffix=='.json'},json.loads(fixture_raw),sha((HERE/'optics84.py').read_bytes()),
        comparison,json.loads(target)['points'],json.loads((directory/'audit.json').read_text()))
    result.update(opticalIndexSHA256=sha(index_raw),comparisonSHA256=sha(comparison_raw))
    output.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    return 0 if result['finalNumericalPass'] and result['scoreReconstructionPass'] else 1


if __name__=='__main__': raise SystemExit(main())
