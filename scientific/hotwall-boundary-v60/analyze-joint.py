"""Independent joint-grid analysis of actual production histories; safe-dev only.

CLI: matrixDir fineDir extraDir output.json. Uses no production/TS helper.
Early-window cases may be in extraDir/early; actual common-time samples replace
the early portion of a composite reference, without interpolation or resampling.
Accuracy failures are findings and remain in the output, not execution errors.
Input/canonical-state corruption does fail execution. The finest finite run is
a comparison reference, not a continuum solution or an absolute error bound.
"""
import json
import math
from pathlib import Path
import sys

import numpy as np

KB = 1.380649e-23


def rebin(integrals, target):
    """Sum nested equal-volume cell integrals, preserving physical annuli."""
    values = np.asarray(integrals, dtype=float)
    if values.ndim != 2 or target < 1 or values.shape[1] % target:
        raise ValueError('Reference must be a nested finer equal-volume grid.')
    return values.reshape(values.shape[0], target, -1).sum(axis=2)


def metric(error, times, mask=None, radius_m=None):
    values = np.asarray(error)
    active = np.ones_like(values, dtype=bool) if mask is None else np.broadcast_to(mask, values.shape)
    if not np.all(np.isfinite(values)):
        raise ValueError('Comparison contains a nonfinite error.')
    if not np.any(active):
        return {'assessed': False, 'activeSamples': 0, 'value': None, 'timeS': None}
    index = np.unravel_index(np.argmax(np.where(active, values, -np.inf)), values.shape)
    result = {'assessed': True, 'activeSamples': int(np.count_nonzero(active)),
              'value': float(values[index]), 'timeS': float(times[index[0]])}
    if values.ndim == 2:
        n = values.shape[1]
        result.update({'annulusIndex': int(index[1]), 'yLower': index[1] / n,
                       'yUpper': (index[1] + 1) / n})
        if radius_m is not None:
            result.update({'radiusLowerM': radius_m * math.sqrt(index[1] / n),
                           'radiusUpperM': radius_m * math.sqrt((index[1] + 1) / n)})
    return result


def gate(result, threshold):
    return result['value'] < threshold if result['assessed'] else None


def load_case(path):
    with path.open() as stream:
        packet = json.load(stream)
    config, record, samples = packet['config'], packet['record'], packet['sampled']
    n, nw, steps = record['cells'], record['wallCells'], record['steps']
    number = packet['number']
    volume = math.pi * config['radiusM']**2 * config['lengthM']
    expected_number = config['pressurePa'] * volume / (KB * config['gasK'])
    if not math.isclose(number, expected_number, rel_tol=2e-13):
        raise ValueError(f'{path}: incorrect particle inventory.')
    times = np.asarray([s['timeS'] for s in samples], dtype=float)
    if (len(times) < 2 or not np.all(np.isfinite(times)) or times[0] != 0
            or np.any(np.diff(times) <= 0) or times[-1] > config['durationS'] * (1 + 8 * np.finfo(float).eps)):
        raise ValueError(f'{path}: samples must start at zero and increase.')
    arrays = {key: np.asarray([s[key] for s in samples], dtype=float)
              for key in ('lightMass', 'heavyMass', 'cellEnergyJ', 'temperatureK', 'pressurePa',
                          'ionRadS', 'neutralRadS', 'gasEnergyJ', 'wallHeatJ', 'wallFluxW', 'wallInnerK')}
    if any(not np.all(np.isfinite(v)) for v in arrays.values()):
        raise ValueError(f'{path}: nonfinite sample.')
    for key in ('lightMass', 'heavyMass', 'cellEnergyJ', 'temperatureK', 'pressurePa'):
        if arrays[key].shape != (len(times), n):
            raise ValueError(f'{path}: {key} grid mismatch.')
    for key in ('lightMass', 'heavyMass'):
        if np.any(arrays[key] < 0) or np.max(np.abs(arrays[key].sum(axis=1) - 1)) > 2e-8:
            raise ValueError(f'{path}: species positivity/inventory failure.')
    x = config['lightFraction']
    particles = number * (x * arrays['lightMass'] + (1 - x) * arrays['heavyMass'])
    if np.any(particles <= 0) or np.any(arrays['cellEnergyJ'] <= 0):
        raise ValueError(f'{path}: nonpositive canonical gas state.')
    temperature = arrays['cellEnergyJ'] / (1.5 * KB * particles)
    pressure = arrays['cellEnergyJ'] / (1.5 * volume / n)
    if not np.allclose(temperature, arrays['temperatureK'], rtol=3e-13, atol=1e-10):
        raise ValueError(f'{path}: temperature is inconsistent with U/N.')
    if not np.allclose(pressure, arrays['pressurePa'], rtol=3e-13, atol=1e-12):
        raise ValueError(f'{path}: pressure is inconsistent with U/volume.')
    if not np.allclose(arrays['cellEnergyJ'].sum(axis=1), arrays['gasEnergyJ'], rtol=3e-13, atol=1e-12):
        raise ValueError(f'{path}: total gas energy is inconsistent.')
    # Independent reconstruction of the finite-volume interface rate: prescribed
    # film + logarithmic tungsten half-cell + linear-y gas half-cell resistance.
    thermal = packet['operation']['thermal']
    if thermal['spatial']['cells'] != nw:
        raise ValueError(f'{path}: recorded solid grid does not match the actual operation.')
    r, length = config['radiusM'], config['lengthM']
    wall_t = arrays['wallInnerK']
    wall_k = (149.441 - .045466 * wall_t + 13.193e-6 * wall_t**2
              - 1.484e-9 * wall_t**3 + 3.866e6 / wall_t**2)
    center = math.sqrt(r * (r + thermal['spatial']['thicknessM'] / nw))
    resistance = (1 / thermal['gasWallWK'] + math.log(center / r) / (2 * math.pi * length * wall_k)
                  + 1 / (8 * math.pi * length * thermal['gas']['conductivityWMK'] * n))
    flux = (wall_t - arrays['temperatureK'][:, -1]) / resistance
    if not np.allclose(flux, arrays['wallFluxW'], rtol=3e-12, atol=2e-10):
        raise ValueError(f'{path}: wall flux is inconsistent with the independent resistance formula.')
    residuals = ('maxSpeciesResidual', 'maxAngularResidual', 'maxMechanicalResidual', 'maxThermalResidual')
    if any(not math.isfinite(record[key]) or not 0 <= record[key] < 2e-8 for key in residuals):
        raise ValueError(f'{path}: accepted-state conservation gate failure.')
    return {'config': config, 'record': record, 'number': number, 'times': times,
            'arrays': arrays, 'samples': samples, 'sources': [str(path)]}


def key(case):
    r = case['record']
    return (r['cells'], r['wallCells'], r['steps'])


def physical_config(case):
    return {k: v for k, v in case['config'].items() if k != 'durationS'}


def aligned_overlap(a, b):
    """Keep only exactly shared recorded times; never synthesize a new state."""
    common, ia, ib = np.intersect1d(a['times'], b['times'], return_indices=True)
    if len(common) < 2:
        raise ValueError('Cross-horizon check requires shared actual observation times.')
    def subset(case, indices):
        return {**case, 'times': common, 'arrays': {k: v[indices] for k, v in case['arrays'].items()}}
    return subset(a, ia), subset(b, ib)


def composite_reference(full, early):
    if key(full)[:2] != key(early)[:2] or physical_config(full) != physical_config(early):
        raise ValueError('Composite windows require the same spatial grid and physical configuration.')
    positions = np.searchsorted(full['times'], early['times'])
    if np.any(positions >= len(full['times'])) or not np.array_equal(full['times'][positions], early['times']):
        raise ValueError('Early reference times must be actual full-study observation times.')
    if not np.array_equal(full['times'][full['times'] <= early['config']['durationS']], early['times']):
        raise ValueError('Early reference must cover every full-study time in its window.')
    arrays = {k: v.copy() for k, v in full['arrays'].items()}
    for name in arrays:
        arrays[name][positions] = early['arrays'][name]
    record = {**full['record'], 'compositeEarlyHorizonS': early['config']['durationS'],
              'compositeEarlySteps': early['record']['steps']}
    return {**full, 'record': record, 'arrays': arrays,
            'sources': full['sources'] + early['sources']}


def compare(a, b):
    if physical_config(a) != physical_config(b) or a['number'] != b['number'] or not np.array_equal(a['times'], b['times']):
        raise ValueError('Comparisons require identical setup, inventory and physical times.')
    aa, bb, times = a['arrays'], b['arrays'], a['times']
    n, config, number = a['record']['cells'], a['config'], a['number']
    light, heavy, energy = (rebin(bb[k], n) for k in ('lightMass', 'heavyMass', 'cellEnergyJ'))
    particles = number * (config['lightFraction'] * light + (1 - config['lightFraction']) * heavy)
    projected_t = energy / (1.5 * KB * particles)
    volume = math.pi * config['radiusM']**2 * config['lengthM']
    projected_p = energy / (1.5 * volume / n)
    error_t = np.abs(aa['temperatureK'] - projected_t)
    rise = np.abs(projected_t - config['gasK'])
    local_relative = np.zeros_like(error_t)
    np.divide(error_t, rise, out=local_relative, where=rise >= .1)
    flux_relative = np.zeros(len(times))
    flux_active = np.abs(bb['wallFluxW']) >= .5
    np.divide(np.abs(aa['wallFluxW'] - bb['wallFluxW']), np.abs(bb['wallFluxW']),
              out=flux_relative, where=flux_active)
    heat_relative = np.zeros(len(times))
    heat_active = np.abs(bb['wallHeatJ']) >= 1e-6
    np.divide(np.abs(aa['wallHeatJ'] - bb['wallHeatJ']), np.abs(bb['wallHeatJ']),
              out=heat_relative, where=heat_active)
    # Include the exact initial sample in absolute metrics; masked relative
    # metrics do not quietly turn absence of a measurable signal into a pass.
    metrics = {
        'ionRelative': metric(np.abs(aa['ionRadS'] - bb['ionRadS']) / np.maximum(1, np.abs(bb['ionRadS'])), times),
        'neutralRelative': metric(np.abs(aa['neutralRadS'] - bb['neutralRadS']) / np.maximum(1, np.abs(bb['neutralRadS'])), times),
        'gasAbsoluteK': metric(error_t, times, radius_m=config['radiusM']),
        'localHeatingRelative': metric(local_relative, times, mask=rise >= .1, radius_m=config['radiusM']),
        'wallFluxRelative': metric(flux_relative, times, mask=flux_active),
        'wallHeatRelative': metric(heat_relative, times, mask=heat_active),
        'pressureRelative': metric(np.abs(aa['pressurePa'] - projected_p) /
                                   np.max(bb['pressurePa'], axis=1)[:, None], times, radius_m=config['radiusM']),
        'lightCDFAbsolute': metric(np.abs(np.cumsum(aa['lightMass'] - light, axis=1)), times, radius_m=config['radiusM']),
        'heavyCDFAbsolute': metric(np.abs(np.cumsum(aa['heavyMass'] - heavy, axis=1)), times, radius_m=config['radiusM']),
    }
    for name in ('lightCDFAbsolute', 'heavyCDFAbsolute'):
        metrics[name]['yBoundary'] = metrics[name]['yUpper']
        metrics[name]['radiusBoundaryM'] = metrics[name]['radiusUpperM']
    gates = {'rotor': gate(metrics['ionRelative'], .03) and gate(metrics['neutralRelative'], .03),
             'localGasK': gate(metrics['gasAbsoluteK'], .1),
             'localHeating': gate(metrics['localHeatingRelative'], .05),
             'wallFlux': gate(metrics['wallFluxRelative'], .01),
             'wallHeat': gate(metrics['wallHeatRelative'], .01)}
    return {'coarse': a['record'], 'reference': b['record'], 'metrics': metrics,
            'gates': gates, 'allAccuracyGatesPassed': all(v is True for v in gates.values())}


def main():
    horizons = {}
    for directory in sys.argv[1:4]:
        paths = sorted(Path(directory).rglob('n*.json'))
        if not paths:
            raise ValueError(f'No raw joint histories in {directory}.')
        for path in paths:
            case = load_case(path)
            cases = horizons.setdefault(case['config']['durationS'], {})
            identity = key(case)
            if identity in cases:
                if case['samples'] != cases[identity]['samples']:
                    raise ValueError(f'Conflicting repeated history for {identity}.')
                cases[identity]['sources'].extend(case['sources'])
            else:
                cases[identity] = case
    full_duration = max(horizons)
    cases = horizons[full_duration]
    full_candidates = [c for c in cases.values() if key(c)[:2] == (512, 128)]
    full_reference = max(full_candidates, key=lambda c: key(c)[2])
    reference = full_reference
    early_diagnostics = None
    if len(horizons) > 1:
        if len(horizons) != 2:
            raise ValueError('Expected one full and at most one early reference horizon.')
        early_duration = min(horizons)
        early = horizons[early_duration]
        early_reference = early[(512, 128, 16384)]
        reference = composite_reference(full_reference, early_reference)
        overlap_full, overlap_early = aligned_overlap(full_reference, early_reference)
        early_diagnostics = {
            'horizonS': early_duration,
            'time256_8192vs16384': compare(early[(256, 64, 8192)], early[(256, 64, 16384)]),
            'space256vs512At16384': compare(early[(256, 64, 16384)], early_reference),
            'fullVsEarlyAtExactSharedTimes': compare(overlap_full, overlap_early),
            'cases': [{'record': c['record'], 'sources': c['sources']} for c in early.values()],
        }
    ordered = [cases[k] for k in sorted(cases)]
    comparisons = [compare(c, reference) for c in ordered if c is not reference]
    temporal, spatial, wall = [], [], []
    for a in ordered:
        n, nw, steps = key(a)
        temporal_candidates = [c for c in ordered if key(c)[:2] == (n, nw) and key(c)[2] > steps]
        if temporal_candidates:
            b = min(temporal_candidates, key=lambda c: key(c)[2])
            temporal.append(compare(a, b))
        spatial_candidates = [c for c in ordered if key(c)[2] == steps and key(c)[0] > n
                              and key(c)[1] * n == nw * key(c)[0]]
        if spatial_candidates:
            b = min(spatial_candidates, key=lambda c: key(c)[0])
            spatial.append(compare(a, b))
        wall_candidates = [c for c in ordered if key(c)[0] == n and key(c)[2] == steps and key(c)[1] > nw]
        if wall_candidates:
            b = min(wall_candidates, key=lambda c: key(c)[1])
            wall.append(compare(a, b))
    time_candidates = [c for c in ordered if key(c)[:2] == (512, 128) and key(c)[2] < key(full_reference)[2]]
    time_coarse = max(time_candidates, key=lambda c: key(c)[2])
    self_time = compare(time_coarse, full_reference)
    shared_steps = max(set(k[2] for k in cases if k[:2] == (256, 64)) &
                       set(k[2] for k in cases if k[:2] == (512, 128)))
    self_space = compare(cases[(256, 64, shared_steps)], cases[(512, 128, shared_steps)])
    output = {'scope': 'Conditional comparison to a finite joint reference; not a continuum solution or device calibration.',
              'accuracyThresholds': {'gasAbsoluteK': .1, 'localHeatingRelative': .05, 'minimumLocalRiseK': .1,
                                     'rotorRelative': .03, 'wallFluxRelative': .01, 'minimumWallFluxW': .5,
                                     'wallHeatRelative': .01, 'minimumWallHeatJ': 1e-6},
              'method': 'Independent Python nested-annulus sums of U/N and reconstructed ideal-monatomic T/p; no production helper.',
              'reference': reference['record'], 'caseCount': sum(len(c) for c in horizons.values()),
              'referenceConstruction': {'fullReference': full_reference['record'],
                                        'earlyWindowReplaced': early_diagnostics is not None,
                                        'noInterpolationOrResampling': True},
              'inputAudit': 'Canonical energy/particles/EOS, independent interface resistance, and accepted-state budget records passed.',
              'referenceSelfChecks': {'adjacentFullTime': self_time, 'space256vs512AtFinestSharedTime': self_space},
              'earlyWindowQualification': early_diagnostics,
              'allCasesAgainstReference': comparisons, 'adjacentTimeRefinement': temporal,
              'adjacentJointGasWallSpatialRefinement': spatial, 'wallOnlyRefinement': wall,
              'cases': [{'record': c['record'], 'sources': c['sources']} for c in ordered],
              'accuracyFailuresAreRetained': True}
    with Path(sys.argv[4]).open('w') as stream:
        json.dump(output, stream, indent=2)
        stream.write('\n')
    live = next(c for c in comparisons if c['coarse']['cells'] == 64 and c['coarse']['wallCells'] == 16 and c['coarse']['steps'] == 512)
    print(json.dumps({'cases': sum(len(c) for c in horizons.values()), 'liveDefaultGates': live['gates'],
                      'finiteReferenceSelfTimeGates': self_time['gates'],
                      'finiteReferenceSelfSpaceGates': self_space['gates'],
                      'passingCasesAgainstReference': sum(c['allAccuracyGatesPassed'] for c in comparisons),
                      'accuracyFailuresAreRetained': True}))


if __name__ == '__main__':
    main()
