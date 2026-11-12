"""Results-only optical audit. No producer imports or measured-speed inputs."""
import hashlib
import json
import math
from pathlib import Path
import sys

GROUPS = ('legacy','nist-2900')+tuple(f'{shape}-{end}' for shape in ('quadratic','linear')
    for end in ('nominal','low-low','low-high','high-low','high-high'))+('source-linear','source-quadratic')
TEMPERATURES = (1400,1800,2900,5950,7250,'linear')
CERTIFICATES = {'brightnessRelative','normalization','homogeneous','positivity','objectiveRelative'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def audit(flow_raw, index, groups, operators, diagnostics, fixture):
    flow = json.loads(flow_raw); flow_sha = sha(flow_raw)
    require(flow.get('experimentalQualification') is False and flow.get('targetDataRead') is False, 'Unqualified target-free flow required')
    require(index.get('experimentalQualification') is False and index.get('flowPredictionSHA256') == flow_sha, 'Flow/index seal mismatch')
    require(index.get('operatorSHA256') == operators and index.get('diagnosticInputSHA256') == diagnostics, 'Immutable optical inputs changed')
    require(len(index['groups']) == 14 and {g['transportCase'] for g in index['groups']} == set(GROUPS), 'Group membership mismatch')
    require(set(groups) == {g['path'] for g in index['groups']}, 'Group file membership mismatch')
    locations = fixture['locations']; ids = [p['id'] for p in locations]
    require(len(ids) == len(set(ids)) == 5 and len(fixture['brightness']) == 29, 'Diagnostic fixture incomplete')
    maxima, failures, unavailable, changes, hulls = {}, [], [], [], []
    def record(name, value, limit=None, final=True, context=None):
        require(math.isfinite(value), 'Nonfinite '+name)
        maxima[name] = max(maxima.get(name,0.), abs(value))
        if limit is not None and value >= limit:
            failures.append(dict(metric=name,value=value,limit=limit,final=final,context=context))
    relative = lambda f,c: abs(f-c)/max(abs(f),1e-12)
    case_key = lambda c: (c['beta'],c['voltageV'],c['refinement'])
    require({c['transportCase'] for c in flow['cases']} == set(GROUPS), 'Flow group membership mismatch')
    for entry in index['groups']:
        name = entry['transportCase']; raw = groups[entry['path']]; data = json.loads(raw)
        require(sha(raw) == entry['sha256'] and data.get('flowPredictionSHA256') == flow_sha, 'Group seal mismatch')
        require(data.get('experimentalQualification') is False, 'Optical qualification must remain false')
        require(data.get('operatorSHA256') == operators and data.get('diagnosticInputSHA256') == diagnostics, 'Group optical inputs changed')
        require(data['locations'] == locations and data['brightness'] == fixture['brightness'], 'Diagnostic values changed')
        require(data['reconstructions'] == fixture['reconstructions'], 'Brightness-only reconstructions changed')
        require(len(data['reconstructions']) == 6 and {(r['edgeClosure'],r['mesh']) for r in data['reconstructions']} == {(c,n) for c in ('linear','sqrt') for n in (64,128,256)}, 'Reconstruction membership mismatch')
        for rec in data['reconstructions']:
            require(len(rec['originalResidualRelative']) == 29, 'Brightness residual count mismatch')
            for value in rec['originalResidualRelative']: record('brightnessReprojectionRelative',abs(value))
        source_rows = [c for c in flow['cases'] if c['transportCase'] == name and c['refinement'] == 4]
        sources = {case_key(c):c for c in source_rows}
        expected = {(b,v,4) for b in ((0,) if name.startswith('source-') else (3,9)) for v in (16.5,18.5,20.5)}
        require(len(source_rows) == len(expected) and set(sources) == expected, 'Flow case membership mismatch')
        require(len(data['cases']) == len(expected) and {case_key(c) for c in data['cases']} == expected, 'Optical case membership mismatch')
        for case in data['cases']:
            src = sources[case_key(case)]; require(src['status'] == 'available', 'Unavailable flow')
            rc,R = flow['manifest']['cathodeRadiusM'],flow['manifest']['radiusM']
            edges = [rc*i/16 for i in range(17)]+[rc+(R-rc)*i/112 for i in range(1,113)]
            radii = src['prediction']['radialCentersM']; speeds = src['prediction']['localMidplaneVelocityMS']
            require(len(radii) == len(speeds) == 128, 'Flow field length mismatch')
            require(all(math.isfinite(r) and r>0 and math.isfinite(u) for r,u in zip(radii,speeds)), 'Invalid flow field')
            require(all(abs(r-math.sqrt((a*a+b*b)/2)) < 1e-12 for r,a,b in zip(radii,edges,edges[1:])), 'Flow geometry mismatch')
            omega = [u/r for u,r in zip(speeds,radii)]
            hull = {p['id']:(min([0.]+[p['radiusM']*o for o,e in zip(omega,edges[1:]) if e>abs(p['radiusM'])]),max([0.]+[p['radiusM']*o for o,e in zip(omega,edges[1:]) if e>abs(p['radiusM'])])) for p in locations}
            context = (name,*case_key(case)); hulls.append(dict(context=context,projectedLocalSpeedHullsMS=hull))
            require(len(case['closures']) == 2 and {c['edgeClosure'] for c in case['closures']} == {'linear','sqrt'}, 'Closure membership mismatch')
            for closure in case['closures']:
                ctx = (*context,closure['edgeClosure']); meshes = closure['centroidMeshes']
                require([m['mesh'] for m in meshes] == [64,128,256] and all(len(m['velocityMS']) == 5 for m in meshes), 'Centroid meshes mismatch')
                for coarse,fine in zip(meshes,meshes[1:]):
                    values = [relative(f,c) for f,c in zip(fine['velocityMS'],coarse['velocityMS'])]
                    changes.append(dict(context=ctx,meshes=[coarse['mesh'],fine['mesh']],centroidRelative=values))
                    for value in values: record('centroidMeshRelative',value,.01,fine['mesh']==256,ctx)
                spectra = closure['spectra']
                require(len(spectra) == 90 and {(s['id'],s['temperatureK'],s['instrumentSigmaMS']) for s in spectra} == {(i,t,g) for i in ids for t in TEMPERATURES for g in (0.,500.,1000.)}, 'Spectrum membership mismatch')
                for s in spectra:
                    sc = (*ctx,s['id'],s['temperatureK'],s['instrumentSigmaMS']); runs = s['refinements']; coarse = s['coarseOpticalSpectrum']
                    require([r['binWidthMS'] for r in runs] == [10.,5.,2.5], 'Spectral bins mismatch')
                    bin_changes = [{k:relative(f[k],c[k]) for k in ('centroidMS','modeMS','varianceM2S2')} for c,f in zip(runs,runs[1:])]
                    optical_changes = {k:relative(runs[-1][k],coarse[k]) for k in ('centroidMS','modeMS','varianceM2S2')}
                    changes.append(dict(context=sc,binRelative=bin_changes,optical128to256=optical_changes))
                    for j,row in enumerate(bin_changes):
                        for k,value in row.items(): record('binRelative_'+k,value,.01,j==1,sc)
                    for k,value in optical_changes.items(): record('opticalRelative_'+k,value,.01,True,sc)
                    for r in [*runs,coarse]:
                        record('fluxError',abs(r['capturedFlux']-1),1e-8,True,sc)
                        require(r['varianceM2S2'] > 0, 'Nonpositive variance')
                        for k in ('centroidMS','modeMS'):
                            lo,hi = hull[s['id']]; record('hullViolationMS',max(lo-r[k],r[k]-hi,0.),1e-6,True,sc)
            require([b['mesh'] for b in case['brightnessBounds']] == [64,128,256], 'LP meshes mismatch')
            for bounds in case['brightnessBounds']:
                require([p['id'] for p in bounds['points']] == ids, 'LP locations mismatch')
                for p in bounds['points']:
                    ctx = (*context,bounds['mesh'],p['id'])
                    if p['status'] != 'available': unavailable.append(dict(context=ctx,reason=p.get('reason'))); continue
                    require(math.isfinite(p['minMS']) and math.isfinite(p['maxMS']) and p['minMS']<=p['maxMS']+1e-7, 'Invalid LP interval')
                    for key in ('minimumCertificate','maximumCertificate'):
                        cert = p[key]; require(set(cert['residuals']) == CERTIFICATES, 'Incomplete LP residuals')
                        require(len(cert['epsilon']) == bounds['mesh'] and all(math.isfinite(e) and e>=0 for e in cert['epsilon']) and math.isfinite(cert['targetBrightness']) and cert['targetBrightness']>0, 'Invalid LP primal certificate')
                        for metric,value in cert['residuals'].items(): record('lpSaved_'+metric,abs(value),1e-7,True,ctx)
    return dict(experimentalQualification=False,flowPredictionSHA256=flow_sha,groupCount=14,caseCount=78,maxima=maxima,failures=failures,lpUnavailable=unavailable,refinement=changes,localSpeedHulls=hulls,finalNumericalPass=not unavailable and not any(f['final'] for f in failures),lpCertificateScope='Saved primal residuals and finite positive certificates; no independent LP solve or dual certification',hullScope='Necessary positive Gaussian-mixture bound, including stationary-wall limit')


def main():
    directory,output = map(Path,sys.argv[1:]); v80 = Path(__file__).parent.parent/'optical-v80'
    receipt = json.loads((v80/'results/verification.json').read_text())
    files = list(v80.glob('*.py'))+[v80/n for n in ('brightness-independent.json','locations.json')]
    for path in files:
        require(sha(path.read_bytes()) == receipt['sourceSHA256']['scientific/optical-v80/'+path.name], 'V80 source/fixture changed: '+path.name)
    reference = (v80/'results/optical-predictions.json').read_bytes()
    require(sha(reference) == receipt['opticalPredictionSHA256'], 'V80 brightness reference changed')
    index = json.loads((directory/'optical-index.json').read_text()); groups = {}
    for entry in index['groups']:
        path = (directory/entry['path']).resolve(); require(path.is_relative_to(directory.resolve()/'optics'), 'Group path outside optics')
        groups[entry['path']] = path.read_bytes()
    operators = {p.name:sha(p.read_bytes()) for p in files if p.suffix == '.py'}
    diagnostics = {p.name:sha(p.read_bytes()) for p in files if p.suffix == '.json'}
    result = audit((directory/'flow-predictions.json').read_bytes(),index,groups,operators,diagnostics,json.loads(reference))
    result['opticalIndexSHA256'] = sha((directory/'optical-index.json').read_bytes())
    output.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')


if __name__ == '__main__':
    main()
