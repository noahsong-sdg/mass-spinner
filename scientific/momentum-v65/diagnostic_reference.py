"""Independent analytical momentum / QUADPACK Doppler reference; safe-dev only.

Usage: python diagnostic_reference.py STATES.json MARKERS_CORRECTED.json OUTPUT.json
Input: {cases:[{spec:{id,edgesM,lengthM,densityKgM3:[...],viscosityPaS:[...],
driveInnerRadiusM,innerWallRadS,outerWallRadS,torqueNm:[...]},
states:[{timeS,omegaRadS:[...]}],
diagnostic:{chordsM:[...],apparentVelocityMS:[...]}}]}.

The core-annulus cases have constant density/viscosity, a full cylinder with an
unforced core, stationary outer wall, and f_theta=IB/(2*pi*L*r) outside that core
(I positive inward). Signed drive scale is derived from integrated cell torque.
No production imports. Experimental fits are conditional shape challenges only.
"""
from bisect import bisect_right
import hashlib
from itertools import product
import json
import math
from pathlib import Path
import sys

from scipy.integrate import quad
from scipy import __version__ as scipy_version


def positive(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
        raise ValueError(name+' must be finite and positive')
    return value


def constant_field(values, count, name):
    if not isinstance(values, list) or len(values) != count:
        raise ValueError(name+' must have one entry per cell')
    first = positive(values[0], name)
    if any(positive(value, name) != first for value in values):
        raise ValueError(name+' must be constant for this analytical reference')
    return first


def core_omega(r, a, radius, scale=1):
    """Exact steady angular speed: unforced regular core, annular radial current."""
    if not 0 < a < radius or not 0 <= r <= radius:
        raise ValueError('Need 0<a<R and 0<=r<=R')
    at = max(r, a)
    return scale*(math.log(radius/at)+a*a/2*(1/(radius*radius)-1/(at*at)))


def chord_from_function(x, inner_radius, radius, omega, crossings=()):
    """Uniform-emissivity centroid by independent QUADPACK chord integration.

    x is the apparent chord coordinate, not a local fluid sampling radius.
    Optical opacity, finite aperture and non-centroid spectral fits are omitted.
    """
    if not 0 <= inner_radius < radius or not 0 <= x < radius:
        raise ValueError('Chord needs 0<=inner<R and 0<=x<R; tangent has no emitting path')
    if x == 0:
        return 0.0
    lo = math.sqrt(max(0, inner_radius*inner_radius-x*x))
    hi = math.sqrt(radius*radius-x*x)
    points = sorted({math.sqrt(r*r-x*x) for r in crossings if max(inner_radius, x) < r < radius})
    integral, error = quad(lambda z: x*omega(math.hypot(x, z)), lo, hi,
                           points=points, epsabs=1e-12, epsrel=1e-11,
                           limit=max(100, len(points)+10))
    if error > 1e-9*max(1, abs(integral)):
        raise ValueError('Independent chord quadrature did not resolve its integral')
    return integral/(hi-lo)


def core_chord(x, a, radius, scale=1):
    """Exact constant-emissivity projection, with stable near-tangent limit."""
    if not 0 < a < radius or not 0 <= x <= radius:
        raise ValueError('Need 0<a<R and 0<=x<=R')
    if x == 0 or x == radius:
        return 0.0  # Analytical limiting value, not a finite-path measurement.
    if x < a:
        return chord_from_function(x, 0, radius, lambda r: core_omega(r, a, radius, scale), [a])
    u = math.sqrt(radius*radius-x*x)/x
    if u < 1e-3:
        q = u*u/3-u**4/5+u**6/7-u**8/9
    else:
        q = 1-math.atan(u)/u
    return scale*x*(q+a*a/(2*x*x)*(q-u*u/(1+u*u)))


def piecewise_chord(edges, omega, x):
    if len(edges) != len(omega)+1 or len(omega) < 2 or any(b <= a for a, b in zip(edges, edges[1:])):
        raise ValueError('Need ordered cell edges and one angular speed per cell')
    if any(not math.isfinite(v) for v in [*edges, *omega]):
        raise ValueError('Nonfinite discrete field')
    def field(r):
        index = min(len(omega)-1, bisect_right(edges, r)-1)
        return omega[index]
    return chord_from_function(x, edges[0], edges[-1], field, edges[1:-1])


def self_checks():
    a, radius = .0075, .06
    chords = [.001, .006, .0075, .01, .03, .055, .059999]
    errors = [abs(core_chord(x, a, radius)-chord_from_function(
        x, 0, radius, lambda r: core_omega(r, a, radius), [a])) for x in chords]
    if max(errors) > 1e-11:
        raise ValueError('Analytical projection disagrees with independent quadrature')
    rigid_errors = [abs(piecewise_chord([0, .2, .6, 1], [2, 2, 2], x)-2*x)
                    for x in [0, .1, .5, .99]]
    if max(rigid_errors) > 1e-11:
        raise ValueError('Rigid projection identity failed')
    return {'analyticalVersusQuadMaxMSAtUnitScale': max(errors),
            'rigidProjectionMaxError': max(rigid_errors),
            'analyticalWallLimitMS': core_chord(radius, a, radius)}


def extraction_corners(rows, a, radius):
    """Frozen train/holdout membership; every extraction rectangle corner.

    This finite sensitivity set is not a confidence interval or proof of the
    extrema over the continuous rectangles, and excludes reproduction error.
    """
    def corners(point):
        dr = positive(point['rHalfWidthCm'], 'extraction radial half-width')
        dv = positive(point['vHalfWidthMS'], 'extraction velocity half-width')
        return [(core_chord((point['rCm']+sr*dr)*.01, a, radius),
                 positive(point['vMS']+sv*dv, 'corner observed speed'))
                for sr, sv in product((-1, 1), repeat=2)]
    train = [corners(p) for p in rows if p['split'] == 'train']
    heldout = [corners(p) for p in rows if p['split'] == 'test']
    scores, fits = [], []
    for calibration in product(*train):
        fit = sum(g*v for g, v in calibration)/sum(g*g for g, _ in calibration)
        fits.append(fit)
        calibration_peak = max(v for _, v in calibration)
        for observed in product(*heldout):
            peak = max(calibration_peak, *(v for _, v in observed))
            rms = math.sqrt(sum((fit*g-v)**2 for g, v in observed)/len(observed))
            scores.append(rms/peak)
    return {'membership': 'Nominal three inner / five outer, frozen before perturbation',
            'cornerCombinations': len(scores), 'fitScalePerSRange': [min(fits), max(fits)],
            'heldoutRmsOverPeakRange': [min(scores), max(scores)],
            'everyCornerPasses20PercentScreen': max(scores) <= .2,
            'anyCornerPasses20PercentScreen': min(scores) <= .2,
            'warning': 'Extraction rectangle corners only; not statistical or full continuous uncertainty bounds; excludes unknown reproduced-figure, emissivity and geometry errors'}


def profile_challenge(markers):
    # Reject the retained superseded frame-based temperature extraction.
    if len(markers.get('temperatureCalibrationTicks', [])) != 3:
        raise ValueError('Use the corrected v64 marker artifact, not the superseded extraction')
    a, radius = .0075, .06
    points = markers['profile']
    if len(points) != 8:
        raise ValueError('Frozen experimental extraction requires eight markers')
    rows = []
    for point in points:
        x = positive(point['rCm'], 'chord cm')*.01
        rows.append({**point, 'xM': x, 'split': 'train' if point['rCm'] <= 3 else 'test',
                     'unitScaleProjectedMS': core_chord(x, a, radius)})
    train = [p for p in rows if p['split'] == 'train']
    if len(train) != 3:
        raise ValueError('Frozen nominal split requires three inner markers')
    fit = sum(p['unitScaleProjectedMS']*p['vMS'] for p in train)/sum(p['unitScaleProjectedMS']**2 for p in train)
    for point in rows:
        point['predictedMS'] = fit*point['unitScaleProjectedMS']
        point['residualMS'] = point['predictedMS']-point['vMS']
        point['relativeError'] = abs(point['residualMS'])/positive(point['vMS'], 'measured apparent speed')
    test = [p for p in rows if p['split'] == 'test']
    peak = max(p['vMS'] for p in rows)
    rms = math.sqrt(sum(p['residualMS']**2 for p in test)/len(test))
    return {'candidateFrozenBeforeScoring': 'Constant-mu full-cylinder unforced core + annular Jr proportional to1/r, stationary outer wall',
            'innerDriveRadiusM': a, 'radiusM': radius, 'fitScalePerS': fit,
            'fitCount': len(train), 'heldoutCount': len(test), 'points': rows,
            'heldoutRmsMS': rms, 'observedPeakMS': peak, 'heldoutRmsOverPeak': rms/peak,
            'prospectiveScreen': .2, 'profileShapeScreenPassed': rms/peak <= .2,
            'maximumHeldoutRelativeError': max(p['relativeError'] for p in test),
            'everyHeldoutWithin20Percent': all(p['relativeError'] <= .2 for p in test),
            'matchedExperimentalValidation': False,
            'operatorAssumption': 'Optically thin uniform-emissivity spectral centroid; no extra chord-dependent flow',
            'emissivityExperimentallyEstablished': False,
            'extractionCornerSensitivity': extraction_corners(rows, a, radius),
            'warning': 'One fitted amplitude; not unfitted current-to-performance, temperature or separation validation'}


def case_reference(case):
    spec = case['spec']
    if not spec['id'].startswith('core-annulus-'):
        return {'id': spec['id'], 'status': 'not-this-analytical-family'}
    edges = spec['edgesM']
    if edges[0] != 0 or spec['innerWallRadS'] is not None or spec['outerWallRadS'] != 0:
        raise ValueError('Core-annulus oracle requires a full regular cylinder and stationary outer wall')
    radius = positive(edges[-1], 'outer radius')
    a = positive(spec['driveInnerRadiusM'], 'drive inner radius')
    if a >= radius:
        raise ValueError('Need drive inner radius below outer radius')
    length = positive(spec['lengthM'], 'length')
    count = len(edges)-1
    mu = constant_field(spec['viscosityPaS'], count, 'viscosity')
    rho = constant_field(spec['densityKgM3'], count, 'density')
    torques = spec['torqueNm']
    if not isinstance(torques, list) or len(torques) != count or any(not math.isfinite(v) for v in torques):
        raise ValueError('Need one finite integrated drive torque per cell')
    scale = sum(torques)/(2*math.pi*length*mu*(radius*radius-a*a))
    if scale == 0:
        raise ValueError('Driven analytical normalized-error reference requires nonzero net torque')
    expected_torques = [2*math.pi*length*mu*scale*max(0, right**2-max(left, a)**2)
                        for left, right in zip(edges, edges[1:])]
    if max(abs(got-want) for got, want in zip(torques, expected_torques)) > 1e-11*abs(sum(torques)):
        raise ValueError('Drive torque does not match the declared regular-core annular1/r force')
    state = case['states'][-1]
    omega = state['omegaRadS']
    if len(omega)+1 != len(edges):
        raise ValueError('State/grid mismatch')
    expected = [core_omega((left+right)/2, a, radius, scale) for left, right in zip(edges, edges[1:])]
    omega_scale = max(abs(v) for v in expected)
    diagnostic = case['diagnostic']
    chords = diagnostic['chordsM']
    actual = diagnostic['apparentVelocityMS']
    if len(chords) != len(actual) or not chords:
        raise ValueError('Export production diagnostics at every declared chord')
    independent = [piecewise_chord(edges, omega, x) for x in chords]
    exact = [core_chord(x, a, radius, scale) for x in chords]
    for observed, recomputed in zip(actual, independent):
        if abs(observed-recomputed) > 1e-10*max(1, abs(recomputed)):
            raise ValueError('Production chord operator disagrees with QUADPACK reconstruction')
    velocity_scale = max(abs(v) for v in exact)
    elapsed_scales = state['timeS']/(rho*radius*radius/mu)
    return {'id': spec['id'], 'cells': len(omega), 'driveScalePerS': scale,
            'elapsedViscousScales': elapsed_scales,
            'steadyInterpretationWarning': 'A finite-time deviation includes transient error; inspect elapsed scales and timestep/mesh refinement',
            'omegaMaxErrorOverExactPeak': max(abs(a-b) for a, b in zip(omega, expected))/omega_scale,
            'chordsM': chords, 'productionApparentMS': actual,
            'independentPiecewiseApparentMS': independent, 'analyticalSteadyApparentMS': exact,
            'chordMaxErrorOverExactPeak': max(abs(a-b) for a, b in zip(actual, exact))/velocity_scale,
            'productionProjectionReconstructionPassed': True,
            'matchedExperimentalValidation': False}


def analyze(packet, markers):
    return {'schemaVersion': 1, 'independentImplementation': 'Analytical constant-mu solution + SciPy QUADPACK; no production imports',
            'scipyVersion': scipy_version,
            'selfChecks': self_checks(), 'spatialCases': [case_reference(case) for case in packet['cases']],
            'profileChallenge': profile_challenge(markers),
            'pressureChallenge': {'predictedSteadyRatioAtFixedMuAndDrive': 1,
                                   'reportedApproximateRatio': 2/3,
                                   'relativeRatioError': .5, 'prospectiveScreenPassed': False,
                                   'matchedExperimentalValidation': False,
                                   'warning': 'Density drops out of prescribed constant-viscosity steady momentum; pressure trend remains unexplained'},
            'matchedExperimentalValidation': False}


if __name__ == '__main__':
    states_raw = Path(sys.argv[1]).read_bytes()
    markers_raw = Path(sys.argv[2]).read_bytes()
    result = analyze(json.loads(states_raw), json.loads(markers_raw))
    result.update({'statesFileSHA256': hashlib.sha256(states_raw).hexdigest(),
                   'markersFileSHA256': hashlib.sha256(markers_raw).hexdigest()})
    with Path(sys.argv[3]).open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    print(json.dumps({'selfChecks': result['selfChecks'],
                      'profileHeldoutRmsOverPeak': result['profileChallenge']['heldoutRmsOverPeak'],
                      'spatialCases': [{k: p[k] for k in ('id', 'cells', 'chordMaxErrorOverExactPeak', 'elapsedViscousScales')}
                                       for p in result['spatialCases'] if 'cells' in p]}, indent=2))
