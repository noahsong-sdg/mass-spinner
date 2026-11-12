"""Brightness-conditioned predictions. This entry point never reads measured speeds."""
import hashlib
import json
import platform
from itertools import product
from pathlib import Path

import abel
import numpy as np
import scipy
from emissivity import optical_grid, path_matrix, reconstruct
from feasible import centroid_bounds
from independent_bound import SEALED_SHA256
from spectrum import components, gaussian_spectrum, projected_moment, velocity_grid

HERE = Path(__file__).parent


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def extract(d):
    """Endpoint calibration with exact extrema over declared pixel boxes."""
    px = d['coordinateUncertaintyPx']
    def axis(value, anchors, pixel, physical, factor=1.):
        a, b = anchors[0], anchors[-1]
        def convert(v, lo, hi):
            return factor*(a[physical]+(v-lo)*(b[physical]-a[physical])/(hi-lo))
        per_pixel = abs(factor*(b[physical]-a[physical])/(b[pixel]-a[pixel]))
        for t in anchors[1:-1]:
            if abs(convert(t[pixel], a[pixel], b[pixel])-factor*t[physical]) > px*per_pixel:
                raise ValueError('Brightness axis inconsistent with declared pixel uncertainty')
        values = [convert(value+v, a[pixel]+lo, b[pixel]+hi)
                  for v, lo, hi in product((-px, px), repeat=3)]
        return convert(value, a[pixel], b[pixel]), [min(values), max(values)]
    rows = []
    for p in d['measuredMarkers']:
        x, y = p['centerPx']
        b, br = axis(x, d['xAnchors'], 'xPx', 'radiusCm', .01)
        intensity, yr = axis(y, d['yAnchors'], 'yPx', 'intensityAU')
        rows.append(dict(id=p['id'], radiusM=b, brightness=intensity,
                         radiusExtractionRangeM=br, brightnessExtractionRange=yr))
    return rows


def predict(packet, brightness, locations, meshes=(64,128,256), bin_sizes=(10.,5.,2.5)):
    """No target-speed argument; all alternatives are retained, without selection."""
    R = packet['manifest']['radiusM']
    b = np.array([p['radiusM'] for p in brightness])
    intensity = np.array([p['brightness'] for p in brightness])
    lower, upper = np.array([p['brightnessExtractionRange'] for p in brightness]).T
    reconstructions, cases, selected = [], [], None
    for closure in ('linear', 'sqrt'):
        for n in meshes:
            rec = reconstruct(b, intensity, R, n, closure)
            reconstructions.append(dict(mesh=n, **rec))
    for case in packet['cases']:
        if case['refinement'] != 4:
            continue
        v_edges, omega = velocity_grid(case, packet['manifest'])
        row = {k: case[k] for k in ('beta','voltageV','refinement')}
        row['closures'] = []
        print(f"Predict beta={case['beta']} V={case['voltageV']}", flush=True)
        for closure in ('linear','sqrt'):
            runs = [r for r in reconstructions if r['edgeClosure'] == closure]
            centroids, spectra, lp_bounds = [], [], []
            for rec in runs:
                values = []
                for p in locations:
                    w, u, _ = components(rec['radialEdgesM'], rec['emissivity'], v_edges, omega, p['radiusM'])
                    values.append(float(w@u/sum(w)))
                centroids.append(dict(mesh=rec['mesh'], velocityMS=values))
            rec = runs[-1]
            for p in locations:
                w, u, radii = components(rec['radialEdgesM'], rec['emissivity'], v_edges, omega, p['radiusM'])
                cw, cu, cr = components(runs[-2]['radialEdgesM'],runs[-2]['emissivity'],v_edges,omega,p['radiusM'])
                for temperature in (1400,1800,2900,5950,7250,'linear'):
                    t = (5950+(1800-5950)*np.minimum(radii/.05,1)) if temperature == 'linear' else temperature
                    # Combining identical means/temperatures is algebraically exact.
                    pairs, inverse = np.unique(np.column_stack((u, np.broadcast_to(t,u.shape))), axis=0, return_inverse=True)
                    weights = np.bincount(inverse, weights=w)
                    for instrument in (0.,500.,1000.):
                        refinements = []
                        for step in bin_sizes:
                            bins = np.linspace(-12000,12000,round(24000/step)+1)
                            s = gaussian_spectrum(weights,pairs[:,0],pairs[:,1],bins,instrument)
                            saved = {k:v for k,v in s.items() if k not in ('binCentersMS','photonFractions')}
                            refinements.append(dict(binWidthMS=step, **saved))
                            if (case['beta'] == 9 and case['voltageV'] == 18.5 and closure == 'sqrt'
                                    and p['id'] == 'ar-i-r3' and temperature == 'linear' and instrument == 0 and step == bin_sizes[-1]):
                                selected = dict(binCentersMS=s['binCentersMS'],photonFractions=s['photonFractions'], **saved)
                        change = max(abs(refinements[-1][k]-refinements[-2][k])/max(abs(refinements[-1][k]),1e-12)
                                     for k in ('centroidMS','modeMS')) if len(refinements)>1 else None
                        ct = (5950+(1800-5950)*np.minimum(cr/.05,1)) if temperature == 'linear' else temperature
                        coarse_spectrum = gaussian_spectrum(cw,cu,ct,bins,instrument)
                        optical_change = {k:abs(refinements[-1][k]-coarse_spectrum[k])/max(abs(refinements[-1][k]),1e-12)
                                          for k in ('modeMS','varianceM2S2')}
                        spectra.append(dict(id=p['id'],temperatureK=temperature,instrumentSigmaMS=instrument,
                                            refinements=refinements,finalRelativeChange=change,
                                            opticalMeshRelativeChanges=optical_change,
                                            coarseOpticalSpectrum={k:coarse_spectrum[k] for k in ('centroidMS','modeMS','varianceM2S2','capturedFlux')},
                                            opticalSpectrumMeshGate=all(v<.01 for v in optical_change.values()),
                                            fluxGate=all(abs(s['capturedFlux']-1)<1e-8 for s in refinements),
                                            spectralGate=change is not None and change < .01))
            row['closures'].append(dict(edgeClosure=closure,centroidMeshes=centroids,spectra=spectra))
        # No continuation assumption: use original brightness constraints directly.
        for n in meshes:
            _, edges = optical_grid(R,n)
            A = path_matrix(b,edges)
            per_chord = []
            for p in locations:
                path = path_matrix([p['radiusM']],edges)[0]
                moment = projected_moment(edges,v_edges,omega,p['radiusM'])
                bound = centroid_bounds(A,lower,upper,path,moment)
                per_chord.append(dict(id=p['id'],**bound))
            lp_bounds.append(dict(mesh=n,points=per_chord))
        row['brightnessBounds'] = lp_bounds
        cases.append(row)
    return dict(experimentalQualification=False,brightness=brightness,reconstructions=reconstructions,
                cases=cases,selectedSpectrum=selected,locations=locations,
                lpScope='Fixed nominal brightness/target paths and finite annular basis; no radial-coordinate uncertainty guarantee')


def serializable(value):
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, np.generic):
        return value.item()
    raise TypeError(type(value).__name__)


def main():
    packet_path = HERE.parent/'profile-v79/results/predictions.json'
    if sha(packet_path) != SEALED_SHA256:
        raise ValueError('Frozen V79 packet changed')
    d = json.loads((HERE/'brightness-independent.json').read_text())
    if sha(HERE/'sources/journal.pdf') != d['sourcePdfSha256']:
        raise ValueError('Brightness PDF provenance mismatch')
    if sha(HERE/d['image']) != d['imageSha256']:
        raise ValueError('Brightness crop provenance mismatch')
    if sha(HERE/'sources/figure6a-symbol-zoom.png') != d['inspectionZoomSha256']:
        raise ValueError('Brightness inspection zoom provenance mismatch')
    result = predict(json.loads(packet_path.read_text()),extract(d),json.loads((HERE/'locations.json').read_text())['points'])
    inputs = [packet_path,HERE/'brightness-independent.json',HERE/'locations.json',HERE/'PROTOCOL.md',HERE/'NUMERICAL-ADDENDUM.md']
    result['inputSHA256'] = {str(p.relative_to(HERE.parent)):sha(p) for p in inputs}
    result['codeSHA256'] = {p.name:sha(p) for p in HERE.glob('*.py')}
    result['versions'] = dict(python=platform.python_version(),numpy=np.__version__,scipy=scipy.__version__,pyabel=abel.__version__)
    out = HERE/'results'
    out.mkdir(exist_ok=True)
    (out/'optical-predictions.json').write_text(json.dumps(result,indent=2,default=serializable,allow_nan=False)+'\n')


if __name__ == '__main__':
    main()
