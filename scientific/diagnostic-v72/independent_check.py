"""Independent optical/fit reconstruction; run in safe-dev only.

Usage: python independent_check.py MARKERS.json REPORT.json
No study implementation imports. QUADPACK resolves the continuous projection;
an analytic flat-brightness centroid independently checks annular chords.
"""
import hashlib
import json
import math
from pathlib import Path
import sys

from scipy import __version__ as scipy_version
from scipy.integrate import quad


MARKER_HASH = '0cfb21edd1debf57ce7d62351b11d4f628fac84f5e44cfc87f21d84f1554de33'
OPERATORS = ('uniform-local-emissivity', 'flat-projected-brightness')
COUNTS = (32, 128, 512, 2048)
A, R = .0075, .06
GATE = 1e-6


def require(condition, message):
    if not condition:
        raise ValueError(message)


def close(actual, expected, label):
    require(not isinstance(actual, bool) and isinstance(actual, (int, float))
            and math.isfinite(actual), label + ': nonfinite or nonnumeric result')
    require(math.isclose(actual, expected, rel_tol=2e-12, abs_tol=2e-11),
            label + ': independent reconstruction disagrees')


def angular_speed(radius):
    # Independent frozen regular-core / annular-current steady solution.
    if radius < A:
        radius = A
    return math.log(R/radius) + .5*(A/radius)**2*((radius/R)**2-1)


def optical_projection(impact, operator, count=None):
    """QUADPACK reference, or independent signed midpoint reconstruction."""
    require(operator in OPERATORS and abs(impact) < R, 'Invalid optical domain')
    chord = math.sqrt(R*R-impact*impact)
    flat = operator == OPERATORS[1]
    upper = math.pi/2 if flat else chord

    def integrand(coordinate):
        y = chord*math.sin(coordinate) if flat else coordinate
        return impact*angular_speed(math.sqrt(impact*impact+y*y))

    if count is not None:
        # Use the entire signed chord, unlike the study's positive half-chord.
        width = upper/count
        return math.fsum(integrand(-upper+(i+.5)*width)
                         for i in range(2*count))/(2*count)
    crossings = []
    if abs(impact) < A:
        core_crossing = math.sqrt(A*A-impact*impact)
        crossings = [math.asin(core_crossing/chord) if flat else core_crossing]
    integral, error = quad(integrand, 0, upper, points=crossings,
                           epsabs=1e-13, epsrel=1e-12, limit=100)
    require(error/upper < 1e-11, 'Unresolved independent optical quadrature')
    return integral/upper


def flat_analytic(impact):
    """Closed-form annular chord from angular means of log(r) and 1/r²."""
    b = abs(impact)
    require(A <= b < R, 'Analytic annular chord requires a<=|b|<R')
    return impact*(math.log(2*R/(R+b)) + .5*A*A*(1/(R*R)-1/(b*R)))


def fitted_result(points, projected):
    train = range(3)
    scale = math.fsum(projected[i]*points[i]['vMS'] for i in train)/math.fsum(
        projected[i]**2 for i in train)
    predictions = [scale*p for p in projected]
    residuals = [value-p['vMS'] for value, p in zip(predictions, points)]
    errors = [abs(value)/p['vMS'] for value, p in zip(residuals, points)]
    peak = max(p['vMS'] for p in points)
    return {'fitScalePerS': scale, 'predictedMS': predictions,
            'residualMS': residuals, 'relativeError': errors,
            'heldoutRmsOverPeak': math.sqrt(math.fsum(r*r for r in residuals[3:])/5)/peak,
            'maximumHeldoutRelativeError': max(errors[3:]),
            'everyHeldoutWithin20Percent': all(e <= .2 for e in errors[3:])}


def check(marker_path, report_path):
    raw = marker_path.read_bytes()
    require(hashlib.sha256(raw).hexdigest() == MARKER_HASH, 'Stale or changed markers')
    markers = json.loads(raw)
    points = markers['profile']
    require(len(points) == 8 and all(p['rCm'] <= 3 for p in points[:3])
            and all(p['rCm'] > 3 for p in points[3:]), 'Changed frozen three/five split')
    report = json.loads(report_path.read_bytes())
    require(report['schemaVersion'] == 1, 'Unknown report schema')
    for flag in ('matchedExperimentalValidation', 'liveChanged',
                 'uncertaintyQualified', 'primaryFigureDigitizedInThisStage'):
        require(report[flag] is False, 'Invalid qualification claim: '+flag)
    require(report['primaryQualitativeSource'] ==
            'https://www.degruyterbrill.com/document/doi/10.1515/zna-1980-0815/pdf',
            'Changed qualitative source')
    require(set(report['notIncluded']) == {
        'Measured emissivity reconstruction', 'Actual Fabry-Perot fit estimator',
        'Extraction and reproducibility sensitivity rerun',
        'Predictive current, thermal, separation or Marathon performance validation'},
        'Missing source/estimator/uncertainty caveats')

    root = Path(__file__).resolve().parents[2]
    marker_relative = str(marker_path.resolve().relative_to(root))
    source_names = {str(Path('scientific/diagnostic-v72')/name) for name in (
        'brightness.py', 'run_report.py', 'test_brightness.py', 'PROTOCOL.md',
        'independent_check.py')} | {marker_relative}
    require(set(report['sourcesSHA256']) == source_names, 'Incomplete snapshot binding')
    for name, digest in report['sourcesSHA256'].items():
        require(hashlib.sha256((root/name).read_bytes()).hexdigest() == digest,
                'Changed input snapshot: '+name)
    require(report['sourcesSHA256'][marker_relative] == MARKER_HASH,
            'Report marker binding differs from frozen input')

    results = report['results']
    require(len(results) == 8, 'Missing retained operator/grid records')
    require([(r['operator'], r['quadratureCount']) for r in results] ==
            [(op, n) for op in OPERATORS for n in COUNTS],
            'Changed refinement sequence or record ordering')
    peak = max(p['vMS'] for p in points)
    references = {}
    for operator in OPERATORS:
        projected = [optical_projection(p['rCm']/100, operator) for p in points]
        references[operator] = (projected, fitted_result(points, projected))
        if operator == OPERATORS[1]:
            for point, value in zip(points, projected):
                close(value, flat_analytic(point['rCm']/100), 'Flat analytic centroid')

    numerical = []
    for record in results:
        operator, count = record['operator'], record['quadratureCount']
        require(type(count) is int, 'Quadrature count must be integer')
        for flag in ('matchedExperimentalValidation', 'uncertaintyQualified'):
            require(record[flag] is False, 'Invalid record qualification claim')
        projected = [optical_projection(p['rCm']/100, operator, count) for p in points]
        expected = fitted_result(points, projected)
        require(len(record['points']) == 8, 'Changed profile record count')
        for index, (observed, original) in enumerate(zip(record['points'], points)):
            require(all(observed.get(key) == value for key, value in original.items()),
                    'Changed experimental coordinates/metadata')
            require(observed['split'] == ('train' if index < 3 else 'test'),
                    'Changed holdout membership')
            close(observed['unitScaleProjectedMS'], projected[index], 'Unit projection')
            for field in ('predictedMS', 'residualMS', 'relativeError'):
                close(observed[field], expected[field][index], field)
        for field in ('fitScalePerS', 'heldoutRmsOverPeak', 'maximumHeldoutRelativeError'):
            close(record[field], expected[field], field)
        require(record['everyHeldoutWithin20Percent'] is
                expected['everyHeldoutWithin20Percent'], 'Changed individual-error screen')
        reference_projection, reference_fit = references[operator]
        projection_error = max(abs(a-b) for a, b in zip(projected, reference_projection))
        projection_error *= expected['fitScalePerS']/peak
        refit_error = max(abs(a-b) for a, b in zip(expected['predictedMS'],
                                                 reference_fit['predictedMS']))/peak
        numerical.append({'operator': operator, 'quadratureCount': count,
                          'fixedFitProjectionErrorOverObservedPeak': projection_error,
                          'independentRefitErrorOverObservedPeak': refit_error})
        if count == COUNTS[-1]:
            require(max(projection_error, refit_error) < GATE,
                    'Unresolved final quadrature at unchanged 1e-6 peak gate')
    return {'independentCheckPassed': True, 'scipyVersion': scipy_version,
            'markerSHA256': MARKER_HASH, 'numericalGate': GATE,
            'refinement': numerical,
            'matchedExperimentalValidation': False, 'uncertaintyQualified': False,
            'caveat': 'Conditional centroid sensitivity only; source intensity and historical estimator are not reconstructed'}


if __name__ == '__main__':
    require(len(sys.argv) == 3, 'Usage: independent_check.py MARKERS REPORT')
    print(json.dumps(check(Path(sys.argv[1]), Path(sys.argv[2])), indent=2, allow_nan=False))
