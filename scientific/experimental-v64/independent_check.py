"""Independent stdlib-only audit of bounded v64 structural comparisons.

No production or comparison-runner imports. These challenges cannot qualify
matched experimental accuracy when inputs/closures are missing or conditioned.
Executed only in the parent's offline safe-dev guest.
"""
import hashlib
import json
import math
from pathlib import Path
import sys

ATOMIC_MASS_KG = 1.66053906892e-27
BOLTZMANN_J_K = 1.380649e-23


def finite(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(name+' must be finite')
    return value


def positive(value, name):
    if finite(value, name) <= 0:
        raise ValueError(name+' must be a finite positive number')
    return value


def close(observed, expected, name, rtol=1e-9):
    finite(observed, name)
    if abs(observed-expected) > max(1e-11, rtol*abs(expected)):
        raise ValueError(name+' differs from independent reconstruction')


def pressure_check(record):
    if record['backend'] != 'analytic-reference' or record['constantDrag'] is not True:
        raise ValueError('Pressure challenge needs the declared fixed-rate analytic reference')
    train_p = positive(record['trainPressureTorr'], 'training pressure')
    test_p = positive(record['testPressureTorr'], 'test pressure')
    train_speed = positive(record['trainMS'], 'normalized training speed')
    temperature_ratio = positive(record['temperatureRatio'], 'temperature ratio')
    reported = positive(record['measuredTestRatio'], 'reported test speed ratio')
    predicted = positive(record['predictedTestRatio'], 'production test speed ratio')
    # Freeze the single declared source challenge. The temperature equality is
    # an explicit structural assumption, not a measured value of exact unity.
    for value, expected_value, name in (
        (train_p, 3, 'source training pressure'),
        (test_p, 9, 'source test pressure'),
        (train_speed, 1, 'normalization'),
        (reported, 2/3, 'source reported ratio'),
        (temperature_ratio, 1, 'declared equal-temperature assumption'),
    ):
        close(value, expected_value, name)
    # All inertias, Γ and wall drag scale with neutral inventory; the affine
    # rotor matrix stays fixed. From rest, Ω(t) scales as τ/inventory, hence
    # Ωtest/Ωtrain = (Ttest/Ttrain) (ptrain/ptest) at the same elapsed time.
    expected = temperature_ratio*train_p/test_p
    close(predicted, expected, 'pressure ratio')
    for point in record.get('pressureTimes', []):
        positive(point['timeS'], 'elapsed pressure comparison time')
        close(point['predictedTestRatio'], expected, 'finite-time pressure ratio')
    relative = abs(expected-reported)/reported
    contrast = abs((1-expected)-(1-reported))/abs(1-reported) if reported != 1 else None
    return {'numericalReconstructionPassed': True,
            'independentPredictedRatio': expected, 'reportedRatio': reported,
            'relativeSpeedRatioError': relative,
            'relativeSlowdownSignalError': contrast,
            'prospectiveRelativeSpeedTarget': .2,
            'firstOrderSpeedScreenPassed': relative <= .2,
            'requiredTestToTrainDragRatioIfRefitted': expected/reported,
            'matchedExperimentalValidation': False,
            'scope': 'Structural pressure challenge under fixed rates, same drive/time and filling-pressure inventory proxy',
            'uncertaintyStatus': 'No probability distribution or experimental confidence level inferred',
            'fitWarning': 'Refitting pressure-dependent drag to this point is calibration, not held-out validation'}


def profile_check(record):
    close(record['radiusM'], .06, 'source chamber radius')
    if record['matchedExperimentalValidation'] is not False:
        raise ValueError('Conditioned profile comparison cannot validate the complete device')
    reproducibility = record['reproducibility']
    close(reproducibility['relativeHalfWidth'], .15, 'source reproducibility sensitivity')
    if reproducibility['semantics'] != 'common-scale-sensitivity-not-confidence':
        raise ValueError('Reproducibility sensitivity must retain its correlated interpretation')
    points = record['points']
    if len(points) != 8:
        raise ValueError('Frozen Fig10A extraction requires eight experimental markers')
    train, heldout = [], []
    for point in points:
        r_cm = positive(point['rCm'], 'Doppler chord coordinate')
        positive(point['vMS'], 'observed chord velocity')
        if r_cm > 100*record['radiusM']:
            raise ValueError('Marker lies outside chamber')
        for field in ('rHalfWidthCm', 'vHalfWidthMS'):
            if finite(point[field], field) < 0:
                raise ValueError('Digitization half widths cannot be negative')
        expected_split = 'train' if r_cm <= 3 else 'test'
        if point['split'] != expected_split:
            raise ValueError('Training split leaks held-out outer markers')
        (train if expected_split == 'train' else heldout).append(point)
    if len(train) < 2 or len(heldout) < 2:
        raise ValueError('Profile challenge requires inner training and outer holdout markers')
    omega = sum(.01*p['rCm']*p['vMS'] for p in train)/sum((.01*p['rCm'])**2 for p in train)
    close(record['fitOmegaRadS'], omega, 'inner-marker angular speed fit')
    for point in points:
        close(point['predictedMS'], omega*.01*point['rCm'], 'rigid profile prediction')
    peak = max(p['vMS'] for p in points)
    close(record['metricDenominatorMS'], peak, 'observed peak metric denominator')
    rms = math.sqrt(sum((omega*.01*p['rCm']-p['vMS'])**2 for p in heldout)/len(heldout))
    score = rms/peak
    close(record['heldoutRmsOverPeak'], score, 'held-out RMS/peak metric')
    return {'numericalReconstructionPassed': True, 'independentFitOmegaRadS': omega,
            'trainingCount': len(train), 'heldoutCount': len(heldout),
            'heldoutRmsMS': rms, 'heldoutRmsOverPeak': score,
            'heldoutSignedResidualMS': [omega*.01*p['rCm']-p['vMS'] for p in heldout],
            'prospectiveProfileTarget': .2, 'profileShapeScreenPassed': score <= .2,
            'matchedExperimentalValidation': False,
            'scope': 'Conditioned rigid Doppler chord profile shape; fitted inner markers, outer holdout',
            'uncertaintyStatus': 'Pixel bounds and correlated reproducibility sensitivity are not a confidence interval'}


def mechanism_check(record):
    checked = []
    for point in record['checks']:
        mass = positive(point['massU'], 'species mass')*ATOMIC_MASS_KG
        speed = finite(point['velocityMS'], 'wall speed')
        if speed < 0:
            raise ValueError('Wall-speed magnitude cannot be negative')
        temperature = positive(point['temperatureK'], 'gas temperature')
        ra = finite(point['raFraction'], 'inner sampling radius fraction')
        rb = finite(point['rbFraction'], 'outer sampling radius fraction')
        if not 0 <= ra < rb <= 1:
            raise ValueError('Sampling radii must satisfy 0 <= ra < rb <= 1')
        expected = mass*speed**2*(rb**2-ra**2)/(2*BOLTZMANN_J_K*temperature)
        close(point['productionLogRatio'], expected, 'conditional species log-density ratio', rtol=1e-8)
        checked.append(expected)
    if not checked:
        raise ValueError('Mechanism reconstruction requires at least one synthetic operator case')
    envelopes = []
    for point in record['maximaUncertainty']:
        positive(point['B'], 'source magnetic field')
        speed = positive(point['velocityMS'], 'source maximum speed')
        temperature = positive(point['temperatureK'], 'source maximum temperature')
        width = point['inputRelativeHalfWidth']
        close(width, .15, 'coordinate sensitivity half width')
        if point['confidenceInterval'] is not False:
            raise ValueError('Coordinate sensitivity envelope is not a confidence interval')
        expected = 39.948*ATOMIC_MASS_KG*speed**2/(2*BOLTZMANN_J_K*temperature)
        bounds = [expected*(1-width)**2/(1+width), expected*(1+width)**2/(1-width)]
        close(point['lambda'], expected, 'derived Ar maxima lambda', rtol=1e-8)
        if len(point['lambdaEnvelope']) != 2:
            raise ValueError('Sensitivity envelope needs lower and upper bounds')
        for actual, target in zip(point['lambdaEnvelope'], bounds):
            close(actual, target, 'lambda coordinate sensitivity bound', rtol=1e-8)
        envelopes.append({'B': point['B'], 'lambda': expected, 'coordinateSensitivityEnvelope': bounds})
    return {'numericalReconstructionPassed': True, 'conditionalLogDensityRatios': checked,
            'maximaSensitivity': envelopes, 'matchedExperimentalValidation': False,
            'scope': 'Synthetic radial-equilibrium operator plus measured-maxima coordinate sensitivity',
            'uncertaintyStatus': 'Independent Cartesian input bounds; maxima can occur at different locations; no joint confidence claim',
            'observationWarning': 'Single-species log density ratios are not isotope enrichment or outlet purity'}


def magnetic_check(record, maxima):
    if record['backend'] != 'analytic-reference' or record['matchedExperimentalValidation'] is not False:
        raise ValueError('Magnetic challenge must retain its conditional fixed-rate scope')
    points = record['points']
    if len(points) != 4 or len(maxima) != 4:
        raise ValueError('Frozen magnetic challenge requires four source field cases')
    training = [p for p in points if p['split'] == 'train']
    if len(training) != 1:
        raise ValueError('Magnetic challenge needs one calibration field')
    train = training[0]
    train_b = positive(train['B'], 'training field')
    close(record['trainingB'], train_b, 'calibration field metadata')
    if abs(train_b-.17) > .005 or any(abs(p['B']-.17) < abs(train_b-.17) for p in points):
        raise ValueError('Calibration field must be the declared source case nearest 0.17T')
    train_t = positive(train['temperatureK'], 'training Tmax proxy')
    train_v = positive(train['velocityMS'], 'training maximum speed')
    reconstructed = []
    for point in points:
        field = positive(point['B'], 'test magnetic field')
        speed = positive(point['velocityMS'], 'test maximum speed')
        temperature = positive(point['temperatureK'], 'test Tmax proxy')
        matching = [p for p in maxima if abs(p['B']-field) < 1e-5]
        if len(matching) != 1:
            raise ValueError('Magnetic marker must match exactly one source-maxima case')
        close(speed, matching[0]['velocityMS'], 'source velocity consistency')
        close(temperature, matching[0]['temperatureK'], 'source temperature consistency')
        if point is not train and point['split'] != 'test':
            raise ValueError('Only the calibration field may enter the training set')
        # Fixed p and fixed-rate analytic response: inventory ∝1/Tmax (proxy),
        # while torque ∝B. Normalizing one field cancels the rate/time factors.
        predicted = train_v*(field/train_b)*(temperature/train_t)
        close(point['predictedMS'], predicted, 'magnetic/Tmax proxy speed')
        error = abs(predicted-speed)/speed
        close(point['relativeError'], error, 'magnetic speed error')
        reconstructed.append({'B': field, 'split': point['split'],
                              'independentPredictedMS': predicted, 'relativeError': error})
    return {'numericalReconstructionPassed': True, 'points': reconstructed,
            'heldoutFirstOrderScreenPassed': all(p['relativeError'] <= .2 for p in reconstructed if p['split'] == 'test'),
            'matchedExperimentalValidation': False,
            'scope': 'One-field calibrated fixed-rate B scaling with diagnostic Tmax as inverse-inventory proxy',
            'observationWarning': 'Diagnostic maximum temperature is not measured volume-mean gas temperature'}


def audit(packet):
    if packet.get('schemaVersion') != 1:
        raise ValueError('Unsupported comparison schema')
    result = {'schemaVersion': 1, 'matchedExperimentalValidation': False,
              'independentImplementation': 'Python stdlib; no production/comparison imports'}
    if 'pressureScaling' not in packet:
        raise ValueError('Pressure comparison is required by this bounded protocol')
    result['pressureScaling'] = pressure_check(packet['pressureScaling'])
    if packet.get('profile') is not None:
        result['profile'] = profile_check(packet['profile'])
    if packet.get('mechanism') is not None:
        result['mechanism'] = mechanism_check(packet['mechanism'])
    if packet.get('magneticScaling') is not None:
        result['magneticScaling'] = magnetic_check(packet['magneticScaling'], packet['mechanism']['maximaUncertainty'])
    return result


def invalid_constant(value):
    raise ValueError('Nonfinite JSON constant '+value)


if __name__ == '__main__':
    source = Path(sys.argv[1])
    raw = source.read_bytes()
    packet = json.loads(raw, parse_constant=invalid_constant)
    result = {'sourceFileSHA256': hashlib.sha256(raw).hexdigest(), **audit(packet)}
    encoded = json.dumps(result, indent=2, allow_nan=False)+'\n'
    if len(sys.argv) > 2:
        destination = Path(sys.argv[2])
        with destination.open('x') as stream:
            stream.write(encoded)
    print(encoded)
