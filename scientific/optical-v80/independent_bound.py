"""Necessary optical bounds, independent of any emissivity/temperature choice.

For a thin axisymmetric isolated line with a finite first moment, positive
emissivity makes its full-line centroid a convex combination of b*Omega.
A mixture of centered symmetric kernels that
decrease on either side of their centers (Gaussian/Voigt) has every mode in
the same center hull: its derivative is positive below all centers and negative
above them. Widths need not be equal. No guarantee applies to line blends,
absorption, asymmetric response, mistaken Fabry-Perot order or arbitrary fits.

This module imports neither a producer nor measured-velocity fitting code.
Passing these necessary per-chord bounds does not establish that ONE emissivity
profile can reproduce all chords, nor that it agrees with measured brightness.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

SEALED_SHA256 = '1a1e7e54974ed7e7e28be655e911b17d3cdd7bc55107b34474148702858ef128'


def center_hull(case, manifest, impact_range):
    """Closed bounds for frozen piecewise-constant annular Omega, including wall.

    impact_range is a nonnegative interval in m. Returning zero as an additional
    bound includes the stationary-wall limit conservatively. Radial cell values
    come only from the sealed prediction, never from brightness or velocities.
    """
    lo, hi = impact_range
    radius = manifest['radiusM']
    if not all(math.isfinite(x) for x in (lo, hi)) or not 0 <= lo <= hi < radius:
        raise ValueError('Need a finite intersecting nonnegative impact interval')
    ref = case['refinement']
    cathode = manifest['cathodeRadiusM']
    edges = [i*cathode/(4*ref) for i in range(4*ref)]
    edges += [cathode+i*(radius-cathode)/(28*ref) for i in range(28*ref+1)]
    p = case['prediction']
    centers = p['radialCentersM']
    velocities = p['localMidplaneVelocityMS']
    if len(centers) != len(edges)-1 or len(velocities) != len(centers):
        raise ValueError('Frozen grid/field lengths differ')
    extrema = [0.]
    for left, right, r, velocity in zip(edges, edges[1:], centers, velocities):
        if not math.isfinite(velocity) or not math.isclose(r, math.sqrt((left*left+right*right)/2), rel_tol=1e-12):
            raise ValueError('Unexpected frozen radial centers or nonfinite speed')
        if right > lo:
            omega = velocity/r
            upper = min(hi, right)
            extrema.extend((lo*omega, upper*omega))
    return min(extrema), max(extrema)


def minimum_relative_disagreement(predicted, observed):
    a, b = predicted
    c, d = observed
    if not (a <= b and 0 < c <= d) or not all(math.isfinite(x) for x in (a,b,c,d)):
        raise ValueError('Need ordered finite predicted and positive observed intervals')
    if a <= d and b >= c:
        return 0.
    return min(abs(x/y-1) for x in (a,b) for y in (c,d))


def report(packet, points):
    rows = []
    for case in packet['cases']:
        if case['status'] != 'available':
            raise ValueError('Unavailable frozen case')
        cells = []
        for point in points:
            nominal = center_hull(case, packet['manifest'], [point['radiusM']]*2)
            uncertain = center_hull(case, packet['manifest'], point['extractionRadiusRangeM'])
            signal = point['extractionVelocityRangeMS']
            minimum_error = minimum_relative_disagreement(uncertain, signal)
            cells.append(dict(id=point['id'], nominalCenterHullMS=nominal,
                              extractionCenterHullMS=uncertain,
                              measuredExtractionRangeMS=signal,
                              minimumPossibleRelativeError=minimum_error,
                              twentyPercentRuledOut=minimum_error > .2))
        rows.append(dict(beta=case['beta'], refinement=case['refinement'],
                         voltageV=case['voltageV'], points=cells))
    return dict(necessaryBoundsOnly=True, experimentalQualification=False, cases=rows)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('predictions', type=Path)
    parser.add_argument('scores', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    payload = args.predictions.read_bytes()
    if hashlib.sha256(payload).hexdigest() != SEALED_SHA256:
        raise ValueError('Prediction seal mismatch')
    output = report(json.loads(payload), json.loads(args.scores.read_text())['points'])
    output['predictionSHA256'] = SEALED_SHA256
    args.output.write_text(json.dumps(output, indent=2, allow_nan=False)+'\n')
