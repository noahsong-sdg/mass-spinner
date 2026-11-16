"""No-fit sensitivity and conditional pressure-shape diagnosis of sealed V82 fields."""
import hashlib
import importlib.util
from itertools import product
import json
from pathlib import Path
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def extract_pressure(data):
    p = data['pressure']
    if p['experimentalUncertainty'] is not None or data['experimentalQualification'] is not False:
        raise ValueError('Unknown experimental uncertainty and unqualified scope must be retained')
    def axis(value, anchors, factor):
        (a, x), (b, y) = anchors[0], anchors[-1]
        u = p['coordinateUncertaintyPx']
        at = lambda v, lo, hi: factor*(a+(v-lo)*(b-a)/(hi-lo))
        bounds = [at(value+dv, x+dx, y+dy) for dv, dx, dy in product((-u, u), repeat=3)]
        return at(value, x, y), [min(bounds), max(bounds)]
    points = []
    for marker in p['markers']:
        r, rr = axis(marker['centerPx'][0], p['xAnchors'], .01)
        pressure, pr = axis(marker['centerPx'][1], p['yAnchors'], 1)
        if not 0 < rr[0] <= r <= rr[1] < data['apparatus']['radiusM'] or pr[0] <= 0:
            raise ValueError('Pressure extraction box leaves positive, in-bore domain')
        points.append(dict(id=marker['id'], radiusM=r, radiusRangeM=rr, pressureTorr=pressure, extractionRangeTorr=pr))
    if len({p['id'] for p in points}) != len(points) or any(a['radiusM'] >= b['radiusM'] for a, b in zip(points, points[1:])):
        raise ValueError('Pressure markers must have unique identities and increasing radii')
    return points


def pressure_ratios(radius, velocity, temperature, locations, intervals=2048):
    """p(r)/p(r_outer) from dp/dr=rho*v²/r, ideal Ar and prescribed T(r).

    A stationary radial-force-balance closure ONLY: no meridional momentum,
    radial stress or neutral drag force. Pressure normalization cancels exactly.
    Never use this to claim an independently predicted pressure field.
    """
    r, v, t, q = map(lambda a: np.asarray(a, dtype=float), (radius, velocity, temperature, locations))
    if (r.ndim != 1 or len(r) < 2 or v.shape != r.shape or t.shape != r.shape or q.ndim != 1 or
        not all(np.isfinite(a).all() for a in (r, v, t, q)) or np.any(np.diff(r) <= 0) or
        np.any(t <= 0) or r[0] <= 0 or not len(q) or np.min(q) < r[0] or np.max(q) > r[-1] or
        type(intervals) is not int or intervals < 2):
        raise ValueError('Finite ordered supported radial profiles and positive temperatures required')
    x = np.unique(np.r_[np.linspace(np.min(q), np.max(q), intervals+1), q, r[(r > np.min(q)) & (r < np.max(q))]])
    integrand = 6.6335209e-26*np.interp(x, r, v)**2/(1.380649e-23*np.interp(x, r, t)*x)
    integral = np.r_[0., np.cumsum((integrand[1:]+integrand[:-1])*np.diff(x)/2)]
    return np.exp(np.interp(q, x, integral)-integral[-1])


def summarize(replay, prediction, data, profile):
    if replay['experimentalQualification'] is not False or replay['parametersRefitted'] is not False:
        raise ValueError('Replay must remain unqualified and unfitted')
    points = extract_pressure(data)
    x = np.array([p['radiusM'] for p in points])
    observed = np.array([p['pressureTorr'] for p in points]); observed /= observed[-1]
    # Denominator is the predeclared outermost admitted marker, not a fitted scale.
    ratio_boxes = [[p['extractionRangeTorr'][0]/points[-1]['extractionRangeTorr'][1],
                    p['extractionRangeTorr'][1]/points[-1]['extractionRangeTorr'][0]] for p in points]
    ratio_boxes[-1] = [1., 1.]
    pressure = []
    for case in prediction['cases']:
        if case['refinement'] != 4:
            continue
        field = case['prediction']; r = field['radialCentersM']; v = field['localMidplaneVelocityMS']
        temperature, _ = profile(case['scenario'].split('-')[0]+'-nominal', np.array(r))
        coarse = pressure_ratios(r, v, temperature, x, 1024)
        fine = pressure_ratios(r, v, temperature, x)
        pressure.append(dict(group=case['group'], voltageV=case['voltageV'], predictedRatio=fine.tolist(),
            integrationRefinementMax=float(np.max(abs(fine-coarse))),
            nominalMaxRatioDifference=float(np.max(abs(fine-observed)))))
    keys = ('scenario', 'anodeCenterM', 'voltageV', 'edgeClosure', 'temperatureK', 'instrumentSigmaMS', 'estimator')
    effects = {}
    for key in keys:
        buckets = {}
        for row in replay['cases']:
            identity = tuple(row[k] for k in keys if k != key)
            buckets.setdefault(identity, []).append(row['predictionMS'])
        effects[key] = max(float(np.max(np.ptp(values, axis=0))) for values in buckets.values())
    optical = np.array([r['predictionMS'] for r in replay['cases']])
    current = [r['predictedCurrentA'] for r in replay['electricalCases']]
    if len(pressure) != 60 or len({(r['group'], r['voltageV']) for r in pressure}) != 60:
        raise ValueError('All sixty finest-grid electrical alternatives must be retained')
    source_current = [r['predictedCurrentA'] for r in replay['electricalCases']
                      if r['scenario'].endswith(('finite-te1', 'finite-te2.5-source'))]
    return dict(schemaVersion=1, kind='public-data-conditional-diagnosis', experimentalQualification=False,
        parametersRefitted=False, observationsPreviouslyExamined=True, fieldProducerReexecuted=False,
        temperaturePredictionAvailable=False, opticalCases=len(optical), electricalCases=len(current),
        opticalEnvelopeMS=dict(low=optical.min(axis=0).tolist(), high=optical.max(axis=0).tolist()),
        currentEnvelopeA=[min(current), max(current)], oneFactorSampledSpanMS=effects,
        sourceMotivatedCurrentEnvelopeA=[min(source_current), max(source_current)],
        allPointMatches=replay['opticalAllPointMatches'], pressurePoints=points,
        observedPressureRatios=observed.tolist(), pressureExtractionRatioBoxes=ratio_boxes, pressureCases=pressure,
        pressureMaxRatioDifferenceRange=[min(r['nominalMaxRatioDifference'] for r in pressure), max(r['nominalMaxRatioDifference'] for r in pressure)],
        pressureIntegrationRefinementMax=max(r['integrationRefinementMax'] for r in pressure),
        pressureAcceptanceThreshold=None,
        interpretation='Discrete sensitivity envelope, not a confidence band or physically bounded uncertainty. One-factor spans use fixed other alternatives; scenario jointly varies transport inputs. Pressure is an extra stationary radial-force-balance closure applied to existing fields, not a new PDE pressure prediction. Radius/probe-response uncertainty is not propagated into a compatibility test. Ratios share a denominator and are correlated. No pressure pass or statistical rejection is established.')


def main():
    out = Path(sys.argv[1]); out.mkdir(exist_ok=False, parents=True)
    source = HERE/'observations.json'
    old = load_module('public_replay', ROOT/'scientific/benchmark-identifiability-20261116/replay.py')
    replay = old.replay()
    transport = load_module('public_temperature_profile', ROOT/'scientific/flow-v81/transport.py')
    raw = (ROOT/old.PRED).read_bytes()
    report = summarize(replay, json.loads(raw), json.loads(source.read_bytes()), transport.profile)
    report['sourceSHA256'] = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in (source, Path(__file__), ROOT/old.PRED, ROOT/'scientific/flow-v81/transport.py')}
    (out/'diagnosis.json').write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
    plot(report, replay['points'], out/'comparison.png')
    print(json.dumps({k: report[k] for k in ('opticalCases', 'electricalCases', 'currentEnvelopeA', 'allPointMatches', 'oneFactorSampledSpanMS')}))


def plot(report, rotation, path):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, axes = plt.subplots(1, 2, figsize=(11, 4), layout='constrained')
    radii = [p['radiusM']*100 for p in rotation]
    axes[0].fill_between(radii, report['opticalEnvelopeMS']['low'], report['opticalEnvelopeMS']['high'], alpha=.3, label='All retained model/control alternatives')
    axes[0].plot(radii, [p['velocityMS'] for p in rotation], 'ko', label='Published markers')
    axes[0].set(xlabel='Sightline offset (cm)', ylabel='Apparent neutral speed (m/s)', title='Retrospective optical comparison')
    radii = [p['radiusM']*100 for p in report['pressurePoints']]
    predictions = np.array([r['predictedRatio'] for r in report['pressureCases']])
    axes[1].fill_between(radii, predictions.min(axis=0), predictions.max(axis=0), alpha=.3, label='Conditional force-balance closure')
    axes[1].plot(radii, report['observedPressureRatios'], 'ko', markersize=3, label='Published pressure ratios')
    axes[1].fill_between(radii, np.array(report['pressureExtractionRatioBoxes'])[:,0], np.array(report['pressureExtractionRatioBoxes'])[:,1], color='k', alpha=.12, label='Pixel ranges only')
    axes[1].set(xlabel='Radius (cm)', ylabel='p(r) / p(outermost admitted radius)', title='Pressure shape; no acceptance gate')
    for ax in axes:
        ax.grid(alpha=.2); ax.legend(fontsize=7)
    fig.suptitle('Conditional public-data diagnosis: shading is not a confidence band', fontsize=11)
    fig.savefig(path, dpi=160); plt.close(fig)


if __name__ == '__main__':
    main()
