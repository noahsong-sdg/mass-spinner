"""Seal two-sided Doppler predictions before scoring viewed development data."""
from concurrent.futures import ProcessPoolExecutor
from multiprocessing import get_context
import gzip
import importlib.util
import json
from pathlib import Path
import sys
import numpy as np
from campaign86 import sha,sources,TIMES
import optical86

HERE=Path(__file__).resolve().parent; V80=HERE.parent/'optical-v80'
OPTIONS={(c,t,g,k) for c in ('linear','sqrt') for t in optical86.TEMPERATURES for g in optical86.INSTRUMENTS for k in ('centroidMS','modeMS')}


def option(row):
    return tuple(row[k] for k in ('edgeClosure','temperatureK','instrumentSigmaMS','estimator'))


def expected_groups(flow):
    names=[s['name'] for s in flow['scenarios']]
    if len(names)!=4 or len(set(names))!=4: raise ValueError('Four unique frozen scenarios required')
    selected=[c for c in flow['cases'] if c['nr'] in (32,64) and c['maxDtS']==1e-7]
    keys=[(c['scenario'],c['anodeCenterM'],c['nr']) for c in selected]
    if len(keys)!=16 or set(keys)!={(s,a,n) for s in names for a in (.07,.08) for n in (32,64)}:
        raise ValueError('Missing or duplicate optical flow cases')
    expected={}
    for c in selected:
        for i,t in enumerate(TIMES):
            label=c['label']+f'-t{i}'
            if label in expected: raise ValueError('Duplicate optical group label')
            expected[label]=dict(scenario=c['scenario'],anodeCenterM=c['anodeCenterM'],nr=c['nr'],timeS=t,flowCompleted=c['completed'])
    return expected


def optical_sources():
    return {str(p.relative_to(HERE.parent.parent)):sha(p.read_bytes()) for p in [Path(__file__),HERE/'optical86.py']+list(V80.glob('*.py'))}


def diagnostic_sources():
    return {n:sha((V80/n).read_bytes()) for n in ('brightness-independent.json','locations.json')}


def check_flow(flow):
    if flow['sourceSHA256']!=sources(): raise ValueError('Stale flow producer sources')
    receipt=json.loads((V80/'results/verification.json').read_text())['sourceSHA256']
    for p in V80.glob('*.py'):
        if sha(p.read_bytes())!=receipt['scientific/optical-v80/'+p.name]: raise ValueError('Frozen V80 source changed')


def fixture():
    sys.path.insert(0,str(V80))
    try: optical=optical86.load('study80_for86',V80/'study.py')
    finally: sys.path.pop(0)
    return optical,optical.extract(json.loads((V80/'brightness-independent.json').read_text())),json.loads((V80/'locations.json').read_text())['points']


def validate_index(flow,index):
    expected=expected_groups(flow); labels=[e['label'] for e in index['groups']]
    if len(labels)!=len(expected) or set(labels)!=set(expected): raise ValueError('Missing or duplicate optical groups')
    for entry in index['groups']:
        known=expected[entry['label']]
        if any(entry[k]!=known[k] for k in ('scenario','anodeCenterM','nr','timeS')): raise ValueError('Optical group metadata changed')
        if type(entry['completed']) is not bool or (entry['completed'] and not known['flowCompleted']): raise ValueError('Invalid completed optical group')
        if not entry['completed'] and not entry.get('error'): raise ValueError('Failed optical group lacks reason')
    return expected


def canonical(value,brightness,locations):
    if value['locations']!=locations or value['brightness']!=brightness: raise ValueError('Frozen optical fixture changed')
    if value.get('experimentalQualification') is not False or value.get('targetVelocityRead') is not False: raise ValueError('Optical prediction scope changed')
    if len(value['cases'])!=1: raise ValueError('One optical state required')
    closures=value['cases'][0]['closures']; ids=[p['id'] for p in locations]
    if len(ids)!=len(set(ids)) or len(closures)!=2 or {c['edgeClosure'] for c in closures}!={'linear','sqrt'}: raise ValueError('Incomplete optical closures')
    for closure in closures:
        if ([m['mesh'] for m in closure['centroidMeshes']]!=[64,128,256]
                or any(len(m['velocityMS'])!=len(ids) for m in closure['centroidMeshes'])):
            raise ValueError('Incomplete centroid refinement inventory')
        spectra=closure['spectra']; key=lambda s:(s['id'],s['temperatureK'],s['instrumentSigmaMS'])
        known={key(s):s for s in spectra}
        expected={(i,t,g) for i in ids for t in optical86.TEMPERATURES for g in optical86.INSTRUMENTS}
        if len(known)!=len(spectra) or set(known)!=expected: raise ValueError('Incomplete or duplicate spectral points')
        for s in spectra:
            if any(type(s[k]) is not bool for k in ('spectralGate','fluxGate','opticalSpectrumMeshGate','losQuadratureGate')): raise ValueError('Invalid optical gate type')
            if [r['binWidthMS'] for r in s['refinements']]!=[10.,5.,2.5] or [r['order'] for r in s['losQuadrature']]!=[2,4,8]:
                raise ValueError('Incomplete spectral or LOS refinement inventory')
        closure['spectra']=[known[i,t,g] for t in optical86.TEMPERATURES for g in optical86.INSTRUMENTS for i in ids]
    return value


def keyed(rows):
    result={option(r):r for r in rows}
    if len(result)!=len(rows) or set(result)!=OPTIONS: raise ValueError('Incomplete or duplicate scored alternatives')
    return result


def load(directory,entry):
    path=(directory/entry['path']).resolve()
    if not path.is_relative_to(directory.resolve()): raise ValueError('Payload outside study results')
    packed=path.read_bytes(); raw=gzip.decompress(packed)
    if sha(packed)!=entry['sha256'] or sha(raw)!=entry['rawSHA256']: raise ValueError('Stale field packet')
    return json.loads(raw)


def predict(job):
    label,edges,omega,ur,brightness,locations=job
    print('START optics',label,flush=True)
    try: return label,optical86.predict(edges,omega,ur,brightness,locations),None
    except ValueError as exc: return label,None,str(exc)


def optics():
    directory=HERE/'results'; raw=(directory/'predictions.json').read_bytes(); flow=json.loads(raw)
    check_flow(flow); expected=expected_groups(flow); optical,brightness,locations=fixture()
    index=dict(predictionSHA256=sha(raw),targetVelocityRead=False,experimentalQualification=False,
        sourceSHA256=optical_sources(),diagnosticSHA256=diagnostic_sources(),groups=[])
    jobs=[]; metadata={}; (directory/'optics').mkdir(exist_ok=True)
    for c in flow['cases']:
        if c['nr'] not in (32,64) or c['maxDtS']!=1e-7: continue
        if not c['completed']:
            for i in range(len(TIMES)):
                label=c['label']+f'-t{i}'; meta={k:v for k,v in expected[label].items() if k!='flowCompleted'}
                index['groups'].append(dict(label=label,**meta,completed=False,error='Flow failed: '+c['error']))
            continue
        field=load(directory,c['fieldPacket'])
        if tuple(s['timeS'] for s in field['snapshots'])!=TIMES: raise ValueError('Missing or reordered fixed reporting times')
        for i,s in enumerate(field['snapshots']):
            label=c['label']+f'-t{i}'
            metadata[label]=dict(scenario=c['scenario'],anodeCenterM=c['anodeCenterM'],nr=c['nr'],timeS=s['timeS'])
            jobs.append((label,field['radialEdgesM'],s['omegaRadS'][0],s['vrMPS'][0],brightness,locations))
    (directory/'optical-index.json').write_text(json.dumps(index,indent=2)+'\n')
    with ProcessPoolExecutor(max_workers=2,mp_context=get_context('spawn')) as pool:
        for label,value,error in pool.map(predict,jobs):
            entry=dict(label=label,**metadata[label],completed=value is not None)
            if error: entry['error']=error
            else:
                value['predictionSHA256']=index['predictionSHA256']
                payload=json.dumps(value,default=optical.serializable,separators=(',',':'),allow_nan=False).encode()
                packed=gzip.compress(payload,mtime=0); name='optics/'+label+'.json.gz'; (directory/name).write_bytes(packed)
                entry['packet']=dict(path=name,sha256=sha(packed),rawSHA256=sha(payload))
            index['groups'].append(entry)
            (directory/'optical-index.json').write_text(json.dumps(index,indent=2)+'\n')
            print('END optics',label,error or 'complete',flush=True)
    if sha((directory/'predictions.json').read_bytes())!=index['predictionSHA256']: raise ValueError('Flow changed during optics')
    validate_index(flow,index)
    if index['sourceSHA256']!=optical_sources() or index['diagnosticSHA256']!=diagnostic_sources(): raise ValueError('Optical sources changed during predictions')
    check_flow(flow)


def compare():
    directory=HERE/'results'; raw=(directory/'predictions.json').read_bytes()
    flow=json.loads(raw); check_flow(flow)
    index_raw=(directory/'optical-index.json').read_bytes(); index=json.loads(index_raw)
    if index['predictionSHA256']!=sha(raw): raise ValueError('Stale optical index')
    expected=validate_index(flow,index)
    if index['sourceSHA256']!=optical_sources() or index['diagnosticSHA256']!=diagnostic_sources(): raise ValueError('Stale optical source or diagnostic seal')
    if index.get('targetVelocityRead') is not False or index.get('experimentalQualification') is not False: raise ValueError('Optical index scope changed')
    _,brightness,locations=fixture()
    scoring=optical86.load('compare80_for86',V80/'compare.py')
    target=(HERE.parent/'profile-v79/results/score.json').read_bytes(); points=json.loads(target)['points']
    rows=[]; groups={}
    for entry in index['groups']:
        if not entry['completed']: continue
        value=load(directory,entry['packet'])
        if value['predictionSHA256']!=sha(raw): raise ValueError('Stale optical prediction')
        scored=scoring.score(canonical(value,brightness,locations),points)['cases']; keyed(scored)
        for row in scored:
            closure=next(c for c in value['cases'][0]['closures'] if c['edgeClosure']==row['edgeClosure'])
            spectra=[s for s in closure['spectra'] if s['temperatureK']==row['temperatureK'] and s['instrumentSigmaMS']==row['instrumentSigmaMS']]
            row['losQuadratureGate']=bool(all(s['losQuadratureGate'] for s in spectra))
        groups[(entry['scenario'],entry['anodeCenterM'],entry['timeS'],entry['nr'])]=scored
    for key,fine in groups.items():
        if key[-1]!=64: continue
        coarse=groups.get((*key[:-1],32)); coarse=None if coarse is None else keyed(coarse)
        for row in fine:
            old=None if coarse is None else coarse[option(row)]
            change=None if old is None else float(np.max(abs(np.asarray(row['predictionMS'])-old['predictionMS'])/np.maximum(abs(np.asarray(row['predictionMS'])),1e-300)))
            rows.append(dict(scenario=key[0],anodeCenterM=key[1],timeS=key[2],flowOpticalRelativeChange=change,
                flowOpticalGate=bool(change is not None and change<.05),experimentalQualification=False,**row))
    result=dict(predictionSHA256=sha(raw),opticalIndexSHA256=sha(index_raw),targetFileSHA256=sha(target),
        experimentalQualification=False,steadyComparison=False,previouslyViewedDevelopmentData=True,
        currentFitted=False,velocityFitted=False,scoredTimeSelected=False,alternatives=len(rows),
        expectedOpticalGroups=len(expected),expectedAlternativesPerTime=len(flow['scenarios'])*2*len(OPTIONS),
        comparisonComplete=all(e['completed'] for e in index['groups']),
        failedOpticalGroups=[e for e in index['groups'] if not e['completed']],cases=rows,
        timeSummaries=[dict(timeS=t,alternatives=sum(r['timeS']==t for r in rows),
            expectedAlternatives=len(flow['scenarios'])*2*len(OPTIONS),
            unavailableAlternatives=sum(e['timeS']==t and e['nr']==64 and not e['completed'] for e in index['groups'])*len(OPTIONS),
            allPointMatches=sum(r['timeS']==t and r['allPointGate'] for r in rows),
            numericalOpticalFailures=sum(r['timeS']==t and not all(r[k] for k in ('flowOpticalGate','opticalCentroidMeshGate','spectralGate','opticalSpectrumMeshGate','losQuadratureGate')) for r in rows)) for t in TIMES])
    packed=gzip.compress(json.dumps(result,indent=2,allow_nan=False).encode(),mtime=0)
    (directory/'comparison.json.gz').write_bytes(packed)
    summary={k:v for k,v in result.items() if k!='cases'}; summary['comparisonSHA256']=sha(packed)
    (directory/'comparison-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    if (directory/'predictions.json').read_bytes()!=raw or (directory/'optical-index.json').read_bytes()!=index_raw:
        raise ValueError('Scoring changed sealed predictions')
    check_flow(flow)
    print(json.dumps(summary,indent=2))


if __name__=='__main__': {'optics':optics,'compare':compare}[sys.argv[1]]()
