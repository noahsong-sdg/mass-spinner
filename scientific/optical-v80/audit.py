"""Independent results-only audit; never imports a predictor or measured speeds."""
import hashlib
import json
import math
import sys
from pathlib import Path
SEALED = '1a1e7e54974ed7e7e28be655e911b17d3cdd7bc55107b34474148702858ef128'
def audit(data, sealed):
    def require(condition, message):
        if not condition:
            raise ValueError(message)
    require(hashlib.sha256(sealed).hexdigest() == SEALED, 'Frozen prediction SHA mismatch')
    require(data['inputSHA256']['profile-v79/results/predictions.json'] == SEALED, 'Input receipt mismatch')
    require(data['experimentalQualification'] is False, 'Experimental qualification must remain false')
    packet = json.loads(sealed)
    key = lambda c: (c['beta'], c['voltageV'], c['refinement'])
    sources = {key(c): c for c in packet['cases'] if c['refinement'] == 4}
    require(len(data['cases']) == len(sources) and {key(c) for c in data['cases']} == set(sources), 'Case membership mismatch')
    ids = [p['id'] for p in data['locations']]
    require(len(ids) == 5 and len(set(ids)) == 5, 'Location membership mismatch')
    maxima, failures, centroid_rows, spectrum_rows, hull_rows, unavailable = {}, [], [], [], [], []
    def record(name, value, limit=None, final=True, context=None):
        require(math.isfinite(value), 'Nonfinite audit quantity: '+name)
        maxima[name] = max(maxima.get(name, 0.), abs(value))
        if limit is not None and value >= limit:
            failures.append(dict(metric=name, value=value, limit=limit, final=final, context=context))
    relative = lambda fine, coarse: abs(fine-coarse)/max(abs(fine), 1e-12)
    require(len(data['reconstructions']) == 6 and {(r['edgeClosure'],r['mesh']) for r in data['reconstructions']} == {(c,n) for c in ('linear','sqrt') for n in (64,128,256)}, 'Reconstruction membership mismatch')
    for rec in data['reconstructions']:
        require(len(rec['originalResidualRelative']) == len(data['brightness']), 'Brightness residual count mismatch')
        for value in rec['originalResidualRelative']:
            record('brightnessReprojectionRelative', abs(value), context=(rec['edgeClosure'],rec['mesh']))
    for case in data['cases']:
        src = sources[key(case)]; ref = src['refinement']; manifest = packet['manifest']
        rc, radius = manifest['cathodeRadiusM'], manifest['radiusM']
        edges = [rc*i/(4*ref) for i in range(4*ref+1)]+[rc+(radius-rc)*i/(28*ref) for i in range(1,28*ref+1)]
        omega = [u/r for u,r in zip(src['prediction']['localMidplaneVelocityMS'],src['prediction']['radialCentersM'])]
        require(len(omega) == len(edges)-1, 'Velocity mesh length mismatch')
        hulls = {p['id']: (min([0.]+[p['radiusM']*o for o,e in zip(omega,edges[1:]) if e>abs(p['radiusM'])]), max([0.]+[p['radiusM']*o for o,e in zip(omega,edges[1:]) if e>abs(p['radiusM'])])) for p in data['locations']}
        require(len(case['closures']) == 2 and {c['edgeClosure'] for c in case['closures']} == {'linear','sqrt'}, 'Closure membership mismatch')
        for closure in case['closures']:
            context = (*key(case),closure['edgeClosure']); meshes = closure['centroidMeshes']
            require([m['mesh'] for m in meshes] == [64,128,256] and all(len(m['velocityMS']) == 5 for m in meshes), 'Centroid mesh mismatch')
            for coarse,fine in zip(meshes,meshes[1:]):
                changes = [relative(f,c) for f,c in zip(fine['velocityMS'],coarse['velocityMS'])]
                centroid_rows.append(dict(context=context, meshes=[coarse['mesh'],fine['mesh']], changes=changes))
                for value in changes:
                    record('centroidMeshRelative',value,.01,fine['mesh']==256,context)
            spectra = closure['spectra']
            require(len(spectra) == 90 and {(s['id'],s['temperatureK'],s['instrumentSigmaMS']) for s in spectra} == {(i,t,g) for i in ids for t in (1400,1800,2900,5950,7250,'linear') for g in (0.,500.,1000.)}, 'Spectrum membership mismatch')
            for s in spectra:
                ctx = (*context,s['id'],s['temperatureK'],s['instrumentSigmaMS']); runs = s['refinements']
                require([r['binWidthMS'] for r in runs] == [10.,5.,2.5], 'Spectral bins mismatch')
                changes = [{k:relative(f[k],c[k]) for k in ('centroidMS','modeMS')} for c,f in zip(runs,runs[1:])]
                optical = {k:relative(runs[-1][k],s['coarseOpticalSpectrum'][k]) for k in ('modeMS','varianceM2S2')}
                spectrum_rows.append(dict(context=ctx,binChanges=changes,optical128to256=optical,fluxErrors=[abs(r['capturedFlux']-1) for r in runs]))
                for j,change in enumerate(changes):
                    for k,value in change.items(): record('binRelative_'+k,value,.01,j==1,ctx)
                for k,value in optical.items(): record('opticalRelative_'+k,value,.01,True,ctx)
                for r in [*runs,s['coarseOpticalSpectrum']]:
                    record('fluxError',abs(r['capturedFlux']-1),1e-8,True,ctx)
                    for k in ('centroidMS','modeMS'):
                        lo,hi = hulls[s['id']]; record('hullViolationMS',max(lo-r[k],r[k]-hi,0.),1e-6,True,ctx)
            hull_rows.append(dict(context=context,projectedLocalSpeedHullsMS=hulls))
        require([b['mesh'] for b in case['brightnessBounds']] == [64,128,256], 'LP mesh mismatch')
        for bounds in case['brightnessBounds']:
            require([p['id'] for p in bounds['points']] == ids, 'LP location mismatch')
            for p in bounds['points']:
                ctx = (*key(case),bounds['mesh'],p['id'])
                if p['status'] != 'available': unavailable.append(dict(context=ctx,reason=p.get('reason'))); continue
                for name in ('minimumCertificate','maximumCertificate'):
                    for metric,value in p[name]['residuals'].items(): record('lpSaved_'+metric,abs(value),1e-7,True,ctx)
    return dict(experimentalQualification=False,finalNumericalPass=not any(f['final'] for f in failures) and not unavailable,maxima=maxima,failures=failures,centroidRefinement=centroid_rows,spectralRefinement=spectrum_rows,localSpeedHulls=hull_rows,lpUnavailable=unavailable,lpCertificateScope='Saved primal residuals only; no independent LP solve or dual certification',hullScope='Necessary positive Gaussian-mixture bound; stationary-wall limit included')
if __name__ == '__main__':
    source, frozen, output = map(Path,sys.argv[1:])
    result = audit(json.loads(source.read_text()),frozen.read_bytes())
    result['auditedPredictionSHA256'] = hashlib.sha256(source.read_bytes()).hexdigest()
    output.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
