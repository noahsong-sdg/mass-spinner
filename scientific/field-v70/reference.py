"""Independent conditional Ar-field reference. Execute only inside safe-dev.

The table below was manually checked against Mutation++v1.0.5 collisions.xml,
Ar--Ar Q22 (Wright2005, multpi=yes); no TypeScript implementation is imported.
This is not a radial-temperature closure or experimental apparatus replay.
"""
from bisect import bisect_right
import hashlib
from itertools import product
import json
import math
from pathlib import Path
import sys

MARKER_SHA = '0cfb21edd1debf57ce7d62351b11d4f628fac84f5e44cfc87f21d84f1554de33'
FIELDS = (.13, .17, .21, .255)
TEMPERATURES = (300, 500, 1000, 2000, 4000, 5000, 6000, 8000, 10000, 15000, 20000)
Q22 = (12.88, 11.12, 9.66, 8.60, 7.57, 7.23, 6.96, 6.53, 6.20, 5.60, 5.17)


def positive(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
        raise ValueError('Expected finite positive physical quantity')
    return value


def argon_viscosity(temperature):
    positive(temperature)
    if not TEMPERATURES[0] <= temperature <= TEMPERATURES[-1]:
        raise ValueError('Neutral Ar table domain is 300--20000 K')
    i = min(len(TEMPERATURES)-2, bisect_right(TEMPERATURES, temperature)-1)
    f = (temperature-TEMPERATURES[i])/(TEMPERATURES[i+1]-TEMPERATURES[i])
    integral = math.pi*1e-20*((1-f)*Q22[i]+f*Q22[i+1])
    return 5*math.sqrt(math.pi*(39.948*1.66053906892e-27)*1.380649e-23*temperature)/(16*integral)


def matched_measurements(markers):
    result = []
    for field in FIELDS:
        temperatures = [p for p in markers['sweeps']['temperature'] if abs(p['B']-field) < 1e-5]
        velocities = [p for p in markers['sweeps']['velocity'] if abs(p['B']-field) < 1e-5]
        if len(temperatures) != 1 or len(velocities) != 1:
            raise ValueError('Require exactly one matched temperature/velocity pair per frozen field')
        t, v = temperatures[0], velocities[0]
        if t['B'] != v['B']:
            raise ValueError('Mismatched extracted field coordinates')
        result.append({'B': positive(t['B']), 'temperatureK': positive(t['value']),
                       'velocityMS': positive(v['value']), 'split': 'train' if field == .17 else 'test',
                       'BHalfWidth': positive(v['BHalfWidth']), 'temperatureHalfWidth': positive(t['valueHalfWidth']),
                       'velocityHalfWidth': positive(v['valueHalfWidth'])})
    if len(markers['sweeps']['temperature']) != 4:
        raise ValueError('Unexpected temperature marker or stale membership')
    return result


def independent_score(measurements, model, scale):
    def predictor(point):
        t = point['temperatureK']*scale
        return point['B']*(t if model == 'fixed-rate-inventory' else
                           1 if model == 'constant-viscosity' else 1/argon_viscosity(t))
    train = measurements[1]
    calibration = train['velocityMS']/predictor(train)
    points = []
    for i, point in enumerate(measurements):
        predicted = train['velocityMS'] if i == 1 else calibration*predictor(point)
        points.append({**point, 'proxyTemperatureK': point['temperatureK']*scale,
                       'viscosityPaS': argon_viscosity(point['temperatureK']*scale) if model == 'neutral-viscosity' else None,
                       'predictedMS': predicted, 'relativeError': abs(predicted-point['velocityMS'])/point['velocityMS']})
    error = max(p['relativeError'] for p in points if p['split'] == 'test')
    trend = all(b['predictedMS'] > a['predictedMS'] for a, b in zip(points, points[1:]))
    return {'points': points, 'maximumHeldoutRelativeError': error,
            'increasingTrend': trend, 'conditionedScreenPassed': error <= .2 and trend}


def independent_corners(points, model, scale, kind):
    values = []
    missing = 0
    extraction = kind == 'extraction'
    for signs in product((-1, 1), repeat=12 if extraction else 8):
        iterator = iter(signs)
        varied = []
        for point in points:
            p = dict(point)
            if extraction:
                p['B'] += next(iterator)*p['BHalfWidth']
            p['velocityMS'] += next(iterator)*(p['velocityHalfWidth'] if extraction else .15*p['velocityMS'])
            p['temperatureK'] += next(iterator)*(p['temperatureHalfWidth'] if extraction else .15*p['temperatureK'])
            varied.append(p)
        if model == 'neutral-viscosity' and any(not 300 <= p['temperatureK']*scale <= 20000 for p in varied):
            missing += 1
        else:
            values.append(independent_score(varied, model, scale)['maximumHeldoutRelativeError'])
    return {'kind': kind, 'cornerCount': len(values)+missing, 'availableCorners': len(values),
            'outsidePropertyDomain': missing, 'maximumErrorRange': [min(values), max(values)] if values else None,
            'allAvailableCornersWithin20Percent': bool(values) and max(values) <= .2,
            'allCornersWithin20Percent': missing == 0 and bool(values) and max(values) <= .2,
            'confidenceInterval': False, 'continuousExtremaBound': False}


def independent_transport(points, scale):
    baseline = independent_score(points, 'neutral-viscosity', scale)['points']
    extrema = []
    for changes in product((.95, 1.05), repeat=4):
        errors = [abs(p['predictedMS']*changes[i]/changes[1]-p['velocityMS'])/p['velocityMS']
                  for i, p in enumerate(baseline) if p['split'] == 'test']
        extrema.append(max(errors))
    return {'sourceAccuracyAnnotation': 5, 'cornerCount': 16, 'maximumErrorRange': [min(extrema), max(extrema)],
            'allCornersWithin20Percent': max(extrema) <= .2, 'confidenceInterval': False,
            'interpretation': 'Independent ±5% collision-integral coordinates; source correlation and confidence semantics unspecified'}


def independent_cases(markers):
    points = matched_measurements(markers)
    result = []
    for identifier, scale in (('nominal', 1), ('common-central-temperature-sensitivity', 1/.7)):
        for model in ('fixed-rate-inventory', 'constant-viscosity', 'neutral-viscosity'):
            result.append({'id': identifier, 'candidate': model, 'temperatureScale': scale,
                           **independent_score(points, model, scale),
                           'extraction': independent_corners(points, model, scale, 'extraction'),
                           'reproducibility': independent_corners(points, model, scale, 'independent-reproducibility'),
                           'transportSensitivity': independent_transport(points, scale) if model == 'neutral-viscosity' else None})
    return result


def close(actual, expected, label):
    if isinstance(actual, bool) or not isinstance(actual, (int, float)) or not math.isfinite(actual):
        raise ValueError(label+': nonfinite or nonnumeric value')
    if abs(actual-expected) > 3e-11*abs(expected)+1e-13:
        raise ValueError(label+': disagrees with independent calculation')


def compare(actual, expected, label):
    if isinstance(expected, dict):
        if not isinstance(actual, dict) or not expected.keys() <= actual.keys():
            raise ValueError(label+': missing required fields')
        for key, value in expected.items():
            compare(actual[key], value, label+'.'+key)
    elif isinstance(expected, list):
        if not isinstance(actual, list) or len(actual) != len(expected):
            raise ValueError(label+': wrong list membership')
        for i, value in enumerate(expected):
            compare(actual[i], value, label+'.'+str(i))
    elif isinstance(expected, bool) or expected is None or isinstance(expected, str):
        if type(actual) is not type(expected) or actual != expected:
            raise ValueError(label+': wrong declared value')
    else:
        close(actual, expected, label)


def validate(report, marker_bytes, protocol_bytes):
    digest = hashlib.sha256(marker_bytes).hexdigest()
    if digest != MARKER_SHA:
        raise ValueError('Frozen corrected marker bytes changed')
    expected = {'schemaVersion': 1, 'markersSHA256': digest,
                'protocolSHA256': hashlib.sha256(protocol_bytes).hexdigest(),
                'matchedExperimentalValidation': False, 'liveQualified': False, 'unconditionalAccuracy': False,
                'trainingFieldT': .17, 'heldoutFieldsT': [.13, .21, .255], 'target': .2,
                'unresolved': ['radial-profile', 'pressure-sweep', 'independent-current', 'radial-temperature',
                               'diagnostic-fit', 'predicted-heating', 'separation-products'],
                'cases': independent_cases(json.loads(marker_bytes))}
    compare(report, expected, 'report')
    return {'independentImplementation': 'Python standard-library transport/scaling/corner reconstruction; no TypeScript imports',
            'markersSHA256': digest, 'protocolSHA256': expected['protocolSHA256'], 'allRequiredChecksPassed': True,
            'matchedExperimentalValidation': False, 'liveQualified': False,
            'cases': [{k: row[k] for k in ('id', 'candidate', 'maximumHeldoutRelativeError', 'conditionedScreenPassed')}
                      for row in expected['cases']]}


if __name__ == '__main__':
    report_path, marker_path, protocol_path, output_path = map(Path, sys.argv[1:5])
    result = validate(json.loads(report_path.read_bytes()), marker_path.read_bytes(), protocol_path.read_bytes())
    with output_path.open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    print(json.dumps(result, allow_nan=False))
