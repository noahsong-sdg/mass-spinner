"""Independent saved-array optics audit; no producer or measured-target imports."""
import gzip
import hashlib
import json
from pathlib import Path
import sys

import numpy as np

NAMES = tuple(f'{shape}-{suffix}' for shape in ('linear','quadratic') for suffix in
    ('v81-leading-te1','finite-te1','finite-te2.5-source','finite-te2.5-ei-only','finite-te2.5-uniform20'))
GROUPS = {name+'-anode-'+str(center) for name in NAMES for center in (.07,.08)}
TEMPERATURES = (1400,1800,2900,5950,7250,'linear')
RESIDUALS = {'brightnessRelative','normalization','homogeneous','positivity','objectiveRelative'}
THERMAL = 1.380649e-23/(39.948*1.66053906660e-27)


def require(ok, message):
    if not ok: raise ValueError(message)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def paths(impacts, edges):
    roots = np.sqrt(np.maximum(np.asarray(edges)[None,:]**2-np.asarray(impacts)[:,None]**2,0.))
    return 2*np.diff(roots,axis=1)


def annuli(emission_edges, epsilon, velocity_edges, omega, impact):
    """Independent exact integration over intersected constant-field annuli."""
    e,f,v,w = [np.asarray(a,dtype=float) for a in (emission_edges,epsilon,velocity_edges,omega)]
    require(e.ndim==f.ndim==v.ndim==w.ndim==1 and len(e)==len(f)+1 and len(v)==len(w)+1,
            'Unmatched annular fields')
    require(all(np.isfinite(a).all() for a in (e,f,v,w)) and e[0]==v[0]==0 and e[-1]==v[-1]
            and np.all(np.diff(e)>0) and np.all(np.diff(v)>0) and np.all(f>=0)
            and np.isfinite(impact) and abs(impact)<v[-1], 'Invalid optical domain')
    common = sorted(set(e)|set(v)); mids = (np.array(common[:-1])+common[1:])/2
    ei,vi = np.searchsorted(e,mids)-1,np.searchsorted(v,mids)-1
    length = paths([impact],common)[0]; active = length>0
    return length[active]*f[ei[active]], impact*w[vi[active]], mids[active], ei[active], length[active]


def audit(prediction_raw, index, groups, fields, operators, diagnostics, fixture):
    packet = json.loads(prediction_raw); seal = sha(prediction_raw)
    require(packet.get('experimentalQualification') is False and packet.get('targetVelocityRead') is False
            and packet.get('currentConditioning') is False, 'Target-free unconditioned prediction required')
    require(index.get('experimentalQualification') is False and index.get('targetVelocityRead') is False
            and index.get('predictionSHA256')==seal, 'Prediction/index identity mismatch')
    require(index.get('operatorSHA256')==operators and index.get('diagnosticSHA256')==diagnostics, 'Changed optical operator/fixture')
    require(len(index['groups'])==20 and {g['group'] for g in index['groups']}==GROUPS, 'Group inventory mismatch')
    require(set(groups)=={g['path'] for g in index['groups']}, 'Group payload inventory mismatch')
    source_rows = [r for r in packet['cases'] if r['refinement']==4]+packet['fixedCurrent']
    require(len(source_rows)==80 and {r['group'] for r in source_rows}==GROUPS, 'Source inventory mismatch')
    require(set(fields)=={r['fieldPacket']['path'] for r in source_rows}, 'Field inventory mismatch')
    locations = fixture['locations']; ids = [p['id'] for p in locations]
    require(len(ids)==len(set(ids))==5 and len(fixture['brightness'])==29, 'Incomplete optical fixture')
    brightness = fixture['brightness']; b = [p['radiusM'] for p in brightness]
    intensity = np.array([p['brightness'] for p in brightness]); scale = float(max(intensity))
    low,high = np.array([p['brightnessExtractionRange'] for p in brightness]).T
    require(scale>0, 'Positive brightness scale required')
    maxima,failures,unavailable,refinements = {},[],[],[]
    def gate(name, value, limit=None, context=None, final=True):
        require(np.isfinite(value), 'Nonfinite '+name)
        maxima[name] = max(maxima.get(name,0.),abs(float(value)))
        if limit is not None and value>=limit:
            failures.append(dict(metric=name,value=float(value),limit=limit,context=context,final=final))
    rel = lambda x,y: abs(x-y)/max(abs(x),1e-12)
    key = lambda r:(r['drive'],r['voltageV'],r['refinement'])
    case_count = 0
    for entry in index['groups']:
        name = entry['group']; compressed = groups[entry['path']]
        require(sha(compressed)==entry['sha256'], 'Compressed optical seal mismatch')
        raw = gzip.decompress(compressed); require(sha(raw)==entry['rawSHA256'], 'Raw optical seal mismatch')
        data = json.loads(raw)
        require(data.get('experimentalQualification') is False and data.get('predictionSHA256')==seal, 'Group prediction identity mismatch')
        require(data.get('operatorSHA256')==operators and data.get('diagnosticSHA256')==diagnostics
                and data['legacyBetaKey']==index['legacyBetaKey'], 'Group optical operator/fixture mismatch')
        require(data['locations']==locations and data['brightness']==brightness
                and data['reconstructions']==fixture['reconstructions'], 'Frozen brightness data changed')
        recs = {(r['edgeClosure'],r['mesh']):r for r in data['reconstructions']}
        require(len(data['reconstructions'])==6 and set(recs)=={(c,n) for c in ('linear','sqrt') for n in (64,128,256)}, 'Optical mesh inventory mismatch')
        for rec in recs.values():
            projected = paths(b,rec['radialEdgesM'])@rec['emissivity']
            for x,y in zip(projected,rec['originalReprojectedBrightness']): gate('brightnessReceiptRelative',abs(x-y)/scale,1e-8,name)
            gate('brightnessReprojectionRelative',float(max(abs(projected-intensity)))/scale)
        rows = [r for r in source_rows if r['group']==name]; sources = {key(r):r for r in rows}
        require(len(rows)==len(sources)==4 and {r['voltageV'] for r in rows if r['drive']=='absolute-voltage'}=={16.5,18.5,20.5}
                and sum(r['drive']=='fixed-current' for r in rows)==1 and all(r['refinement']==4 for r in rows), 'Drive inventory mismatch')
        optical_key = lambda c:(c['beta'],c['voltageV'],c['refinement'])
        require(len(data['cases'])==4 and {optical_key(c) for c in data['cases']}==set(sources), 'Optical case inventory mismatch')
        for case in data['cases']:
            case_count += 1; src = sources[optical_key(case)]; ctx = (name,*optical_key(case))
            receipt = src['fieldPacket']; compressed = fields[receipt['path']]
            require(sha(compressed)==receipt['sha256'], 'Compressed velocity field seal mismatch')
            raw = gzip.decompress(compressed); require(sha(raw)==receipt['rawSHA256'], 'Raw velocity field seal mismatch')
            field = json.loads(raw); ve = np.array(field['r']); omega = np.array(field['omegaRadS'][0])
            centers = np.sqrt((ve[:-1]**2+ve[1:]**2)/2)
            require(len(omega)==128 and centers.shape==omega.shape, 'Velocity field mesh mismatch')
            for x,y in zip(centers,src['prediction']['radialCentersM']): gate('velocityCenterReceiptM',abs(x-y),1e-12,ctx)
            require(len(src['prediction']['radialCentersM'])==len(src['prediction']['localMidplaneVelocityMS'])==128, 'Velocity summary length mismatch')
            for x,y in zip(centers*omega,src['prediction']['localMidplaneVelocityMS']): gate('velocityReceiptRelative',rel(x,y),1e-8,ctx)
            observers = {}
            for (closure,n),rec in recs.items():
                require(len(rec['emissivity'])==n and len(rec['radialEdgesM'])==n+1, 'Emission mesh length mismatch')
                for p in locations:
                    parts = annuli(rec['radialEdgesM'],rec['emissivity'],ve,omega,p['radiusM'])
                    w,u,r,ei,length = parts; require(sum(w)>0, 'No emitted photons')
                    observers[closure,n,p['id']] = (w/sum(w),u,r,ei,length)
            require(len(case['closures'])==2 and {c['edgeClosure'] for c in case['closures']}=={'linear','sqrt'}, 'Closure inventory mismatch')
            for closure in case['closures']:
                edge = closure['edgeClosure']; mesh_rows = closure['centroidMeshes']
                require([m['mesh'] for m in mesh_rows]==[64,128,256] and all(len(m['velocityMS'])==5 for m in mesh_rows), 'Centroid mesh inventory mismatch')
                for mesh in mesh_rows:
                    for p,saved in zip(locations,mesh['velocityMS']):
                        f,u,*_ = observers[edge,mesh['mesh'],p['id']]
                        gate('independentCentroidRelative',rel(float(f@u),saved),1e-8,ctx)
                for old,new in zip(mesh_rows,mesh_rows[1:]):
                    values = [rel(f,c) for f,c in zip(new['velocityMS'],old['velocityMS'])]
                    refinements.append(dict(context=(*ctx,edge),meshes=[old['mesh'],new['mesh']],centroidRelative=values))
                    for value in values: gate('centroidMeshRelative',value,.01,ctx,new['mesh']==256)
                spectra = closure['spectra']
                require(len(spectra)==90 and {(s['id'],s['temperatureK'],s['instrumentSigmaMS']) for s in spectra}=={(i,t,g) for i in ids for t in TEMPERATURES for g in (0.,500.,1000.)}, 'Spectral inventory mismatch')
                for s in spectra:
                    sc = (*ctx,edge,s['id'],s['temperatureK'],s['instrumentSigmaMS']); runs = s['refinements']
                    require([r['binWidthMS'] for r in runs]==[10.,5.,2.5], 'Spectral bins mismatch')
                    coarse = s['coarseOpticalSpectrum']
                    for n,saved_rows in ((128,[coarse]),(256,runs)):
                        f,u,r,*_ = observers[edge,n,s['id']]; mean = float(f@u)
                        t = 5950+(1800-5950)*np.minimum(r/.05,1) if s['temperatureK']=='linear' else s['temperatureK']
                        variance = float(f@(THERMAL*t+(u-mean)**2)+s['instrumentSigmaMS']**2)
                        lo,hi = min(0.,float(min(u))),max(0.,float(max(u)))
                        for saved in saved_rows:
                            gate('spectralCentroidRelative',rel(mean,saved['centroidMS']),1e-8,sc)
                            gate('spectralVarianceRelative',rel(variance,saved['varianceM2S2']),1e-8,sc)
                            gate('fluxError',abs(saved['capturedFlux']-1),1e-8,sc)
                            for k in ('modeMS','centroidMS'): gate('speedHullViolationMS',max(lo-saved[k],saved[k]-hi,0.),1e-6,sc)
                    optical_changes = {k:rel(runs[-1][k],coarse[k]) for k in ('centroidMS','modeMS','varianceM2S2')}
                    changes = [{k:rel(f[k],c[k]) for k in ('centroidMS','modeMS','varianceM2S2')} for c,f in zip(runs,runs[1:])]
                    refinements.append(dict(context=sc,binRelative=changes,optical128to256=optical_changes))
                    for k,value in optical_changes.items(): gate('opticalRelative_'+k,value,.01,sc)
                    for j,row in enumerate(changes):
                        for k,value in row.items(): gate('binRelative_'+k,value,.01,sc,j==1)
            require([r['mesh'] for r in case['brightnessBounds']]==[64,128,256], 'LP mesh inventory mismatch')
            for bounds in case['brightnessBounds']:
                require([p['id'] for p in bounds['points']]==ids, 'LP location inventory mismatch')
                e = recs['linear',bounds['mesh']]['radialEdgesM']; A = paths(b,e)
                for p,location in zip(bounds['points'],locations):
                    pc = (*ctx,bounds['mesh'],p['id'])
                    if p['status']!='available': unavailable.append(dict(context=pc,reason=p.get('reason'))); continue
                    _,u,_,ei,length = annuli(e,np.ones(len(e)-1),ve,omega,location['radiusM'])
                    moment = np.bincount(ei,weights=length*u,minlength=len(e)-1); target_path = paths([location['radiusM']],e)[0]
                    require(np.isfinite([p['minMS'],p['maxMS']]).all() and p['minMS']<=p['maxMS']+1e-7, 'Invalid LP interval')
                    for label,endpoint in (('minimumCertificate','minMS'),('maximumCertificate','maxMS')):
                        cert = p[label]; epsilon = np.asarray(cert['epsilon'])
                        require(epsilon.shape==(len(e)-1,) and np.isfinite(epsilon).all() and np.all(epsilon>=0), 'Invalid LP emissivity')
                        saved_light = np.asarray(cert['brightness'])
                        require(saved_light.shape==intensity.shape and np.isfinite(saved_light).all(), 'Invalid LP brightness receipt')
                        light = A@epsilon; target = float(target_path@epsilon)
                        require(np.isfinite(target) and target>0 and np.isfinite(cert['targetBrightness']) and cert['targetBrightness']>0, 'Nonemitting LP certificate')
                        mean = float(moment@epsilon/target)
                        gate('lpBrightnessConstraintRelative',float(max(0.,max(low-light),max(light-high)))/scale,1e-7,pc)
                        gate('lpBrightnessReceiptRelative',float(max(abs(light-saved_light)))/scale,1e-8,pc)
                        gate('lpTargetReceiptRelative',rel(target,cert['targetBrightness']),1e-8,pc)
                        for saved in (cert['centroidMS'],p[endpoint]): gate('lpCentroidReceiptRelative',rel(mean,saved),1e-8,pc)
                        require(set(cert['residuals'])==RESIDUALS, 'Incomplete LP residuals')
                        for metric,value in cert['residuals'].items(): gate('lpSaved_'+metric,abs(value),1e-7,pc)
    return dict(experimentalQualification=False,predictionSHA256=seal,groupCount=20,caseCount=case_count,maxima=maxima,
        failures=failures,lpUnavailable=unavailable,refinement=refinements,
        finalNumericalPass=not unavailable and not any(f['final'] for f in failures),
        scope='Independent exact saved-field LOS/thermal moments and primal LP certificates; no independent spectral-mode solve, LP dual certificate or experimental qualification')


def main():
    directory,output = map(Path,sys.argv[1:]); v80 = Path(__file__).parent.parent/'optical-v80'
    receipt = json.loads((v80/'results/verification.json').read_text())
    sources = list(v80.glob('*.py'))+[v80/n for n in ('brightness-independent.json','locations.json')]
    for p in sources: require(sha(p.read_bytes())==receipt['sourceSHA256']['scientific/optical-v80/'+p.name], 'Immutable V80 source changed: '+p.name)
    raw = (v80/'results/optical-predictions.json').read_bytes(); require(sha(raw)==receipt['opticalPredictionSHA256'], 'V80 fixture reference changed')
    fixture = json.loads(raw); prediction = (directory/'predictions.json').read_bytes(); packet = json.loads(prediction)
    index_raw = (directory/'optical-index.json').read_bytes(); index = json.loads(index_raw); groups,fields = {},{}
    rows = [r for r in packet['cases'] if r['refinement']==4]+packet['fixedCurrent']
    for subdir,entries,target in (('optics',index['groups'],groups),('fields',[r['fieldPacket'] for r in rows],fields)):
        for entry in entries:
            path = (directory/entry['path']).resolve(); require(path.is_relative_to(directory.resolve()/subdir), 'Unexpected payload path')
            target[entry['path']] = path.read_bytes()
    result = audit(prediction,index,groups,fields,{p.name:sha(p.read_bytes()) for p in sources if p.suffix=='.py'},
                   {p.name:sha(p.read_bytes()) for p in sources if p.suffix=='.json'},fixture)
    result['opticalIndexSHA256'] = sha(index_raw); output.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')


if __name__=='__main__':
    main()
