"""Score sealed predictions; no solver imports, parameter changes or fitting."""
import hashlib
import json
from itertools import product
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

HERE = Path(__file__).parent
SEALED = '1a1e7e54974ed7e7e28be655e911b17d3cdd7bc55107b34474148702858ef128'


def extract(d):
    px = d['coordinateUncertaintyPx']
    # Endpoint tick calibration only; intermediate ticks independently check it.
    # Exact extrema over center + both anchor pixel boxes, positive denominators.
    def axis(value, anchors, pixel, physical, factor=1):
        a, b = anchors[0], anchors[-1]
        def transform(v, lo, hi):
            return factor*(a[physical]+(v-lo)*(b[physical]-a[physical])/(hi-lo))
        per_pixel = abs(factor*(b[physical]-a[physical])/(b[pixel]-a[pixel]))
        for tick in anchors[1:-1]:
            if abs(transform(tick[pixel], a[pixel], b[pixel])-factor*tick[physical]) > px*per_pixel:
                raise ValueError('Intermediate tick inconsistent with declared extraction range')
        bounds = [transform(value+dv, a[pixel]+da, b[pixel]+db)
                  for dv, da, db in product((-px, px), repeat=3)]
        return transform(value, a[pixel], b[pixel]), [min(bounds), max(bounds)]
    points = []
    for p in d['measuredMarkers']:
        x, y = p['centerPx']
        radius, xr = axis(x, d['xAnchors'], 'xPx', 'radiusCm', .01)
        velocity, yr = axis(y, d['yAnchors'], 'yPx', 'velocityMps')
        dy = max(abs(v-velocity) for v in yr)
        points.append(dict(id=p['id'], radiusM=radius, velocityMS=velocity,
                           extractionRadiusRangeM=xr, extractionVelocityRangeMS=yr,
                           extractionUnderFivePercent=bool(dy < .05*abs(velocity)),
                           plottedBarRangeMS=sorted(axis(v, d['yAnchors'], 'yPx', 'velocityMps')[0]
                                                    for v in p['verticalErrorBarY'])))
    return points


def score(predictions, points):
    scored = []
    x = np.array([p['radiusM'] for p in points])
    y = np.array([p['velocityMS'] for p in points])
    for case in predictions['cases']:
        if case['status'] != 'available':
            continue
        p = case['prediction']
        item = {k: case[k] for k in ('beta', 'refinement', 'voltageV')}
        for name, grid, values in (
                ('chord', p['chordsM'], p['chordVelocityMS']),
                ('local', p['radialCentersM'], p['localMidplaneVelocityMS'])):
            if min(x) < min(grid) or max(x) > max(grid):
                raise ValueError('Target outside sealed prediction grid')
            v = np.interp(x, grid, values)
            error = abs(v-y)/abs(y)
            eligible = [p['extractionUnderFivePercent'] for p in points]
            interval_errors = []
            for point in points:
                lo, hi = point['extractionRadiusRangeM']
                if lo < min(grid) or hi > max(grid):
                    raise ValueError('Extraction interval outside sealed grid')
                locations = [lo, hi]+[r for r in grid if lo < r < hi]
                predicted = np.interp(locations, grid, values)
                a, b = min(predicted), max(predicted)
                c, d = point['extractionVelocityRangeMS']
                if c <= 0:
                    raise ValueError('Relative extraction error needs positive resolved signal')
                ratios = [a/c, a/d, b/c, b/d]
                interval_errors.append(dict(bestRelative=0. if a <= d and b >= c else min(abs(r-1) for r in ratios),
                                            worstRelative=max(abs(r-1) for r in ratios)))
            item[name] = dict(predictionMS=v.tolist(), errorRelative=error.tolist(),
                              extractionIntervalErrors=interval_errors,
                              worstRelative=float(max(error)),
                              rmsOverMeasuredPeak=float(np.sqrt(np.mean((v-y)**2))/max(y)),
                              eligiblePointGate=bool(any(eligible) and np.all(error[eligible] <= .2)),
                              allPointGate=bool(np.all(error <= .2)),
                              peakRadiusM=float(np.asarray(grid)[np.argmax(values)]),
                              outerDeclines=bool(values[-1] < max(values)))
        scored.append(item)
    return scored


def main():
    path = HERE/'results/predictions.json'
    before = hashlib.sha256(path.read_bytes()).hexdigest()
    assert before == SEALED, 'Predictions changed after admission'
    predictions = json.loads(path.read_text())
    d = json.loads((HERE/'digitization-independent.json').read_text())
    assert hashlib.sha256((HERE/'sources/hal-conference.pdf').read_bytes()).hexdigest() == d['sourcePdfSha256']
    assert hashlib.sha256((HERE/d['image']).read_bytes()).hexdigest() == d['imageSha256']
    points = extract(d)
    results = score(predictions, points)
    output = dict(sealedPredictionSHA256=before, measuredProfileAdmitted=True,
                  qualification=False, points=points, cases=results,
                  limitations=['Unknown local emissivity and Fabry-Perot estimator',
                               'Prescribed homogeneous transport properties and no meridional flow',
                               'First and outermost points fail conservative 5% extraction gate; retained in scores',
                               'Prior source exposure; only marker coordinates prospectively withheld'])
    (HERE/'results/score.json').write_text(json.dumps(output, indent=2, allow_nan=False)+'\n')
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.6), sharey=True, layout='constrained')
    for axis, title, field, grid in zip(axes,
            ['Sightline centroid (assumed uniform emissivity)', 'Local speed (different observable)'],
            ['chordVelocityMS', 'localMidplaneVelocityMS'], ['chordsM', 'radialCentersM']):
        for beta, color in ((3, '#237b8b'), (9, '#b16630')):
            for c in predictions['cases']:
                if c['beta'] == beta and c['refinement'] == 4 and c['voltageV'] == 18.5:
                    p = c['prediction']
                    axis.plot(np.array(p[grid])*100, p[field], color=color, label=f'β = {beta}; no speed fit')
        y = np.array([p['velocityMS'] for p in points])
        bars = np.array([p['plottedBarRangeMS'] for p in points]).T
        axis.errorbar(np.array([p['radiusM'] for p in points])*100, y,
                      yerr=[y-bars[0], bars[1]-y], fmt='o', color='#222222',
                      label='1979 Ar I; published error bars')
        axis.set(xlabel='Radius / sightline offset (cm)', title=title, xlim=(0, 6), ylim=(0, 900))
        axis.grid(alpha=.18)
        axis.legend(fontsize=8)
    axes[0].set_ylabel('Speed (m/s)')
    fig.suptitle('Matched apparatus, 0.13 T · 100 A per branch · 1 Torr fill', fontsize=12)
    fig.savefig(HERE/'results/profile-comparison.png', dpi=180)
    plt.close(fig)
    assert hashlib.sha256(path.read_bytes()).hexdigest() == before
    print(json.dumps([c for c in results if c['refinement'] == 4 and c['voltageV'] == 18.5], indent=2))


if __name__ == '__main__':
    main()
