"""Conditional experimental centroid sensitivity; not an emissivity inversion.

The flat-brightness ideal has an integrable edge singularity. Integrating its
analytic theta measure avoids sampling or clipping a divergent emissivity.
"""
import hashlib
import json
import math
from pathlib import Path

MARKERS_SHA256 = '0cfb21edd1debf57ce7d62351b11d4f628fac84f5e44cfc87f21d84f1554de33'
OPERATORS = ('uniform-local-emissivity', 'flat-projected-brightness')
CORE_M, RADIUS_M = .0075, .06


def finite(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError('Need a finite number')
    return value


def core_omega(r):
    """Frozen v65 unit-drive-scale constant-viscosity solution, units of 1."""
    at = max(r, CORE_M)
    return math.log(RADIUS_M/at) + CORE_M**2/2*(1/RADIUS_M**2 - 1/at**2)


def projection(impact_m, radius_m, omega, operator, count=2048):
    """Return normalized brightness and centroid; None for no emitting path.

    Flat-brightness emissivity normalization C=1; uniform-local epsilon=1.
    Their arbitrary brightness units differ; only normalized photon weights
    enter the centroid. Neither operator is a finite-aperture instrument fit.
    """
    b, radius = finite(impact_m), finite(radius_m)
    if radius <= 0 or operator not in OPERATORS:
        raise ValueError('Need positive radius and a declared photon weight')
    if isinstance(count, bool) or not isinstance(count, int) or count < 1:
        raise ValueError('Need a positive integer quadrature count')
    if abs(b) >= radius:
        return None
    length = math.sqrt((radius-abs(b))*(radius+abs(b)))
    def radial(t):
        y = length*(math.sin(math.pi*t/2) if operator == OPERATORS[1] else t)
        return math.hypot(b, y)
    mean = math.fsum(finite(omega(radial((i+.5)/count))) for i in range(count))/count
    brightness = math.pi if operator == OPERATORS[1] else 2*length
    return {'brightness': brightness, 'centroidMS': b*mean}


def load_markers(path):
    data = Path(path).read_bytes()
    if hashlib.sha256(data).hexdigest() != MARKERS_SHA256:
        raise ValueError('Need the frozen corrected marker artifact; stale or changed bytes rejected')
    return json.loads(data)


def challenge(markers, operator, count=2048):
    points = markers['profile']
    if len(points) != 8:
        raise ValueError('Need the eight frozen profile markers')
    rows = []
    for point in points:
        b = finite(point['rCm'])*.01
        observed = finite(point['vMS'])
        if observed <= 0:
            raise ValueError('Resolved experimental speed must be positive')
        projected = projection(b, RADIUS_M, core_omega, operator, count)
        if projected is None:
            raise ValueError('Experimental point has no emitting path')
        rows.append({**point, 'split': 'train' if point['rCm'] <= 3 else 'test',
                     'unitScaleProjectedMS': projected['centroidMS']})
    train = [p for p in rows if p['split'] == 'train']
    if len(train) != 3:
        raise ValueError('Frozen split requires three inner and five outer markers')
    fit = math.fsum(p['unitScaleProjectedMS']*p['vMS'] for p in train)/math.fsum(
        p['unitScaleProjectedMS']**2 for p in train)
    for p in rows:
        p['predictedMS'] = fit*p['unitScaleProjectedMS']
        p['residualMS'] = p['predictedMS']-p['vMS']
        p['relativeError'] = abs(p['residualMS'])/p['vMS']
    heldout = [p for p in rows if p['split'] == 'test']
    return {'operator': operator, 'quadratureCount': count, 'fitScalePerS': fit,
            'points': rows, 'heldoutRmsOverPeak': math.sqrt(math.fsum(
                p['residualMS']**2 for p in heldout)/len(heldout))/max(p['vMS'] for p in rows),
            'maximumHeldoutRelativeError': max(p['relativeError'] for p in heldout),
            'everyHeldoutWithin20Percent': all(p['relativeError'] <= .2 for p in heldout),
            'matchedExperimentalValidation': False, 'uncertaintyQualified': False}
