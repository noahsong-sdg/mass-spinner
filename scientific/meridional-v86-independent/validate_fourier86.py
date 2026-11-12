"""Fixed actual-field CDF/FFT witnesses; no measured velocity is opened.

Run only in parent-owned safe-dev after exporting the frozen V86 results.
This independent script never imports the flow campaign or scores observations.
There are exactly 84 direct-CDF calls, fixed before inspecting their outputs.
"""
import argparse
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import platform
import sys
from time import perf_counter

import numpy as np
import scipy

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
V86 = HERE.parent / 'meridional-v86'
V80 = HERE.parent / 'optical-v80'
ARCHIVE = V86 / 'results/attempt01'
SOURCE_SNAPSHOT = ARCHIVE / 'source-snapshot'
BASELINE_SHA256 = 'b211cfaffeacdea7207f210f7874f6aedd34d3d38c804cd18554b2bb679ae06e'
BIN_WIDTHS = (10., 5., 2.5)
TIMES = (0., 4e-6)
EPS = np.finfo(float).eps


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def source_seal():
    files = [Path(__file__).resolve(), HERE / 'fourier86.py', V86 / 'optical86.py']
    files += sorted(V80.glob('*.py'))
    return {str(p.relative_to(ROOT)): digest(p.read_bytes()) for p in files}


def read_packet(directory, entry):
    path = (directory / entry['path']).resolve()
    if not path.is_relative_to(directory.resolve()):
        raise ValueError('Field packet outside declared result directory')
    packed = path.read_bytes()
    raw = gzip.decompress(packed)
    if digest(packed) != entry['sha256'] or digest(raw) != entry['rawSHA256']:
        raise ValueError('Field packet does not match frozen producer hashes')
    return path, packed, raw, json.loads(raw)


def check_flow_sources(flow):
    for name, expected in flow['sourceSHA256'].items():
        parts = Path(name).parts
        if parts[:2] == ('scientific', 'meridional-v86'):
            # Explicit archived-producer mapping, never a current-tree fallback.
            if len(parts) != 3 or parts[2] in ('.', '..'):
                raise ValueError('Unexpected archived producer path: ' + name)
            path = (SOURCE_SNAPSHOT / parts[2]).resolve()
            admitted = path.is_relative_to(SOURCE_SNAPSHOT.resolve())
        else:
            path = (ROOT / name).resolve()
            admitted = path.is_relative_to(ROOT)
        if not admitted or digest(path.read_bytes()) != expected:
            raise ValueError('Frozen flow source changed: ' + name)


def compare(direct, accelerated):
    """Frozen tolerances: no output-dependent threshold selection."""
    probability = float(np.max(abs(direct['photonFractions'] - accelerated['photonFractions'])))
    mode = abs(direct['modeMS'] - accelerated['modeMS'])
    centroid = abs(direct['centroidMS'] - accelerated['centroidMS'])
    variance = abs(direct['varianceM2S2'] - accelerated['varianceM2S2'])
    flux = abs(direct['capturedFlux'] - accelerated['capturedFlux'])
    thresholds = dict(probability=1e-10, modeMS=1e-6,
                      centroidMS=128*EPS*max(1., abs(direct['centroidMS'])),
                      varianceM2S2=128*EPS*max(1., abs(direct['varianceM2S2'])),
                      capturedFlux=128*EPS)
    errors = dict(probability=probability, modeMS=float(mode), centroidMS=float(centroid),
                  varianceM2S2=float(variance), capturedFlux=float(flux))
    gates = {k: bool(np.isfinite(errors[k]) and errors[k] < thresholds[k]) for k in errors}
    gates['nonnegative'] = bool(np.all(accelerated['photonFractions'] >= 0))
    gates['unrenormalized'] = accelerated['fourier']['probabilityRenormalized'] is False
    gates['sumBudget'] = bool(abs(float(sum(accelerated['photonFractions'])) - accelerated['capturedFlux'])
                              <= accelerated['fourier']['totalProbabilityErrorBudget'])
    return dict(errors=errors, thresholds=thresholds, gates=gates,
                passed=bool(all(gates.values())), fourier=accelerated['fourier'])


def validate(predictions):
    # Sources and all input bytes are sealed before either numerical kernel runs.
    before = source_seal()
    prediction_bytes = predictions.read_bytes()
    if digest(prediction_bytes) != BASELINE_SHA256:
        raise ValueError('Expected immutable attempt01 prediction manifest SHA256')
    flow = json.loads(prediction_bytes)
    check_flow_sources(flow)
    scenario = flow['scenarios'][0]['name']
    selected = [c for c in flow['cases'] if c['scenario'] == scenario and c['nr'] == 64 and c['nz'] == 96
                and c['anodeCenterM'] == .07 and c['maxDtS'] == 1e-7]
    if len(selected) != 1 or selected[0]['completed'] is not True:
        raise ValueError('Exactly one completed, fixed first-scenario 64x96 .07m case required')
    case = selected[0]
    packet_path, packed, raw, field = read_packet(predictions.parent, case['fieldPacket'])
    snapshots = {}
    for time in TIMES:
        matches = [s for s in field['snapshots'] if s['timeS'] == time]
        if len(matches) != 1:
            raise ValueError('Missing or duplicate frozen t=0/4us snapshot')
        snapshots[time] = matches[0]
    brightness_path = V80 / 'brightness-independent.json'
    locations_path = V80 / 'locations.json'
    brightness_bytes = brightness_path.read_bytes()
    locations_bytes = locations_path.read_bytes()
    # Both fixtures contain geometry/brightness only, never measured velocities.
    locations = json.loads(locations_bytes)['points']
    if len(locations) < 3 or any('velocityMS' in p for p in locations):
        raise ValueError('Expected at least three velocity-free optical locations')
    impacts = [locations[i] for i in (0, len(locations)//2, len(locations)-1)]
    if len({p['id'] for p in impacts}) != 3:
        raise ValueError('Three distinct predeclared impact positions required')
    optical = module('optical86_for_actual_fourier_validation', V86 / 'optical86.py')
    fourier = module('fourier86_for_actual_validation', HERE / 'fourier86.py')
    sys.path.insert(0, str(V80))
    try:
        extraction = module('study80_for_actual_fourier_validation', V80 / 'study.py')
    finally:
        sys.path.pop(0)
    brightness = extraction.extract(json.loads(brightness_bytes))
    b = np.array([p['radiusM'] for p in brightness])
    intensity = np.array([p['brightness'] for p in brightness])
    edges = np.asarray(field['radialEdgesM'], dtype=float)
    rows = []
    direct_seconds = fft_seconds = 0.
    reconstruction_start = perf_counter()
    reconstructions = {closure: optical.emission80.reconstruct(b, intensity, edges[-1], 256, closure)
                       for closure in ('linear', 'sqrt')}
    reconstruction_seconds = perf_counter() - reconstruction_start
    # 72 main witnesses: 2 times x 2 closures x 3 impacts x 2 T/instrument x 3 bins.
    # 12 endpoint witnesses: both times, first closure/impact, 1400/7250K, all bins.
    jobs = [(time, closure, point, temp, instrument, step)
            for time in TIMES for closure in ('linear', 'sqrt') for point in impacts
            for temp, instrument in ((2900, 0.), ('linear', 1000.)) for step in BIN_WIDTHS]
    jobs += [(time, 'linear', impacts[0], temp, 500., step)
             for time in TIMES for temp in (1400, 7250) for step in BIN_WIDTHS]
    if len(jobs) != 84:
        raise AssertionError('Fixed witness inventory changed')
    components = {}
    for time, closure, point, temperature, instrument, step in jobs:
        key = (time, closure, point['id'])
        if key not in components:
            rec = reconstructions[closure]
            state = snapshots[time]
            components[key] = optical.components(rec['radialEdgesM'], rec['emissivity'], edges,
                                                  state['omegaRadS'][0], state['vrMPS'][0],
                                                  point['radiusM'], 8)
        w, u, radii = components[key]
        bins = np.linspace(-12000, 12000, round(24000/step)+1)
        t = optical.temperature_proxy(temperature, radii)
        row = dict(timeS=time, edgeClosure=closure, id=point['id'], impactM=point['radiusM'],
                   temperatureK=temperature, instrumentSigmaMS=instrument, binWidthMS=step,
                   componentCount=len(w), completed=False)
        try:
            start = perf_counter()
            direct = optical.spectrum(w, u, t, bins, instrument)
            direct_time = perf_counter() - start
            start = perf_counter()
            actual = fourier.spectrum(w, u, t, bins, instrument)
            fft_time = perf_counter() - start
            direct_seconds += direct_time
            fft_seconds += fft_time
            row.update(completed=True, directSeconds=direct_time, fourierSeconds=fft_time,
                       **compare(direct, actual))
        except (ValueError, ArithmeticError) as exc:
            row.update(passed=False, error=str(exc))
        rows.append(row)
    if (source_seal() != before or predictions.read_bytes() != prediction_bytes
            or packet_path.read_bytes() != packed or brightness_path.read_bytes() != brightness_bytes
            or locations_path.read_bytes() != locations_bytes):
        raise ValueError('Inputs or sources changed during validation')
    check_flow_sources(flow)
    return dict(passed=bool(all(r['passed'] for r in rows)), expectedWitnesses=84,
                witnesses=rows, fieldCase=case['label'], sourceSHA256=before,
                archivedProducerSourceSHA256=flow['sourceSHA256'],
                archivedProducerSourceDirectory=str(SOURCE_SNAPSHOT.relative_to(ROOT)),
                predictionSHA256=digest(prediction_bytes), fieldPacketSHA256=digest(packed),
                fieldPacketRawSHA256=digest(raw), brightnessSHA256=digest(brightness_bytes),
                locationsSHA256=digest(locations_bytes), targetVelocityRead=False,
                velocityFitted=False, currentFitted=False, experimentalQualification=False,
                reference='Unchanged V86 grouped SciPy Gaussian-CDF spectrum',
                scope='Numerical optical-kernel equivalence on one frozen fine flow case; not physical or experimental validation',
                timing=dict(directSeconds=direct_seconds, fourierSeconds=fft_seconds,
                            reconstructionSeconds=reconstruction_seconds, fixedSpeedGate=False),
                versions=dict(python=platform.python_version(), numpy=np.__version__, scipy=scipy.__version__))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--predictions', type=Path, default=ARCHIVE / 'predictions.json')
    parser.add_argument('--output', type=Path, default=V86 / 'results/fourier-validation.json')
    args = parser.parse_args()
    result = validate(args.predictions.resolve())
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n')
    print(json.dumps(dict(passed=result['passed'], witnesses=len(result['witnesses']), timing=result['timing'])))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
