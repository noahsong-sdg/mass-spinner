"""Independent Robin continuum bracket for the actual adaptive operation path.

Run only inside safe-dev: robin-adaptive.py OUTPUT.json CASE.json [CASE.json...]
Inputs are v61 campaign packets from the current=0, D=1e-30, cooling=0 control.
The finite wall is NOT thermostatted. Recorded extrema over ALL accepted states
bound its inner temperature and independent tungsten half-shell conductance.
Constant Robin problems bound the corresponding variable-boundary continuum
temperature and absorbed heat by the maximum principle. Heat RATE is bounded
separately by interval arithmetic, not by ordering the two reference rates.

No production geometry/property/integration helper is imported. The independent
v60 canonical audit and Bessel eigenseries are reused. These bounds account for
the finite-wall boundary uncertainty; they do not bound discretization error.
"""
import importlib.util
import json
import math
from pathlib import Path
import sys

import numpy as np


DIRECTORY = Path(__file__).resolve().parent


def import_file(name, path):
    specification = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


ORACLE = import_file('v60_independent_robin', DIRECTORY.parent / 'hotwall-boundary-v60/robin-reference.py')
ADAPTER = import_file('v61_independent_canonical_audit', DIRECTORY / 'reference-compare.py')


def effective_film_bounds(radius, length, thickness, wall_cells, film, low, high):
    """Interval evaluation of the independent tungsten polynomial for T>0.

    Each signed monomial is bounded individually. No monotonicity assumption
    about the sum, numerical optimizer or production property helper is used.
    The gas half-cell is absent: continuum Robin acts at the physical gas face.
    """
    if not (300 <= low <= high <= 1900 and radius > 0 and length > 0 and thickness > 0
            and wall_cells >= 2 and film > 0):
        raise ValueError('Oracle requires positive geometry/film and tungsten temperatures in 300–1900 K.')
    k_low = (149.441 - .045466 * high + 13.193e-6 * low**2
             - 1.484e-9 * high**3 + 3.866e6 / high**2)
    k_high = (149.441 - .045466 * low + 13.193e-6 * high**2
              - 1.484e-9 * low**3 + 3.866e6 / low**2)
    if not (0 < k_low <= k_high):
        raise ValueError('Independent tungsten interval is not positive.')
    center = math.sqrt(radius * (radius + thickness / wall_cells))
    geometric_resistance = math.log(center / radius) / (2 * math.pi * length)
    return (1 / (1 / film + geometric_resistance / k_low),
            1 / (1 / film + geometric_resistance / k_high))


def continuum_bracket(constants, cells, wall_cells, times, wall_low, wall_high):
    film_low, film_high = effective_film_bounds(
        constants['radiusM'], constants['lengthM'], constants['wallThicknessM'],
        wall_cells, constants['gasWallWK'], wall_low, wall_high)
    solutions = {}
    truncation = {}
    for name, wall, film in (('low', wall_low, film_low),
                             ('high', wall_high, film_high),
                             ('nominal', constants['wallK'], constants['gasWallWK'])):
        setup = {**constants, 'wallK': wall}
        coarse = ORACLE.reference(setup, cells, times, 512, film=film)
        fine = ORACLE.reference(setup, cells, times, 1024, film=film)
        truncation[name] = {key: float(np.max(np.abs(fine[key] - coarse[key])))
                            for key in ('temperatureK', 'surfaceK', 'heatJ', 'fluxW')}
        if truncation[name]['temperatureK'] > 1e-8 or truncation[name]['surfaceK'] > 1e-8:
            raise ValueError('Robin eigenseries truncation exceeds the registered tolerance.')
        solutions[name] = fine
    low, high, nominal = (solutions[name] for name in ('low', 'high', 'nominal'))
    # Roundoff is reported separately from the physical interval. Widen by the
    # observed series discrepancy plus 1e-10 K/1e-12 J numerical slack so an
    # interval endpoint is not inverted by machine precision at t=0.
    temperature_slack = 1e-10 + max(v['temperatureK'] for v in truncation.values())
    surface_slack = 1e-10 + max(v['surfaceK'] for v in truncation.values())
    heat_slack = 1e-12 + max(v['heatJ'] for v in truncation.values())
    t_low, t_high = low['temperatureK'] - temperature_slack, high['temperatureK'] + temperature_slack
    s_low, s_high = low['surfaceK'] - surface_slack, high['surfaceK'] + surface_slack
    h_low, h_high = low['heatJ'] - heat_slack, high['heatJ'] + heat_slack
    if np.any(t_low > t_high) or np.any(h_low > h_high):
        raise ValueError('Continuum comparison bracket is inverted.')
    # Surface temperature and wall temperature can have either ordering in a
    # general bounded history. All four products preserve the signed flux.
    delta_low, delta_high = wall_low - s_high, wall_high - s_low
    products = np.array([film_low * delta_low, film_low * delta_high,
                         film_high * delta_low, film_high * delta_high])
    return {'temperatureLowK': t_low, 'temperatureHighK': t_high,
            'surfaceLowK': s_low, 'surfaceHighK': s_high,
            'heatLowJ': h_low, 'heatHighJ': h_high,
            'fluxLowW': products.min(axis=0), 'fluxHighW': products.max(axis=0),
            'filmLowWK': film_low, 'filmHighWK': film_high, 'nominal': nominal,
            'seriesTruncation512vs1024': truncation,
            'floatingPointSlack': {'temperatureK': temperature_slack,
                                   'surfaceK': surface_slack, 'heatJ': heat_slack}}


def worst_case_error(values, lower, upper):
    return np.maximum(np.abs(values - lower), np.abs(values - upper))


def metric(values, times, active=None):
    values = np.asarray(values)
    if not np.all(np.isfinite(values)):
        raise ValueError('Nonfinite oracle comparison.')
    mask = np.ones_like(values, dtype=bool) if active is None else np.broadcast_to(active, values.shape)
    if not np.any(mask):
        return {'assessed': False, 'value': None, 'activeSamples': 0, 'timeS': None}
    index = np.unravel_index(np.argmax(np.where(mask, values, -np.inf)), values.shape)
    result = {'assessed': True, 'value': float(values[index]),
              'activeSamples': int(np.count_nonzero(mask)), 'timeS': float(times[index[0]])}
    if values.ndim == 2:
        result['annulusIndex'] = int(index[1])
    return result


def audit_control(case):
    config, record, operation = case['config'], case['record'], case['operation']
    thermal, arrays = operation['thermal'], case['arrays']
    if thermal['spatial']['material'] != 'tungsten':
        raise ValueError('Oracle half-shell resistance requires tungsten material.')
    if (config['currentA'] != 0 or config['radialDiffusivityM2S'] != 1e-30
            or operation['events'] or thermal['coolingWK'] != 0):
        raise ValueError('Oracle requires the registered zero-current, D=1e-30, uncooled control.')
    if not (config['linerK'] > config['gasK'] > 0 and thermal['gas']['conductivityWMK'] > 0):
        raise ValueError('Oracle requires initially cold gas and positive conductivity.')
    if not (record['maxPhysicalGasSourceJ'] == 0
            and record['maxFrozenInventoryDifference'] == 0):
        raise ValueError('Accepted states do not satisfy the frozen-inventory/source-free control.')
    samples = case['samples']
    for field in ('slipDissipationJ', 'ohmicEnergyJ', 'redistributionWorkJ', 'ionRadS', 'neutralRadS'):
        if any(sample[field] != 0 for sample in samples):
            raise ValueError('Frozen Fourier control contains rotation or non-wall heating.')
    n = record['cells']
    for field in ('lightMass', 'heavyMass'):
        if np.any(arrays[field] != 1 / n):
            raise ValueError('Sampled species inventories are not uniform and frozen.')
    low, high = record['minWallInnerK'], record['maxWallInnerK']
    if not (math.isfinite(low) and math.isfinite(high) and config['gasK'] < low <= high):
        raise ValueError('Invalid all-accepted-state wall-temperature bounds.')
    if (np.any(arrays['wallInnerK'] < low - 1e-9) or np.any(arrays['wallInnerK'] > high + 1e-9)
            or not low - 1e-9 <= config['linerK'] <= high + 1e-9):
        raise ValueError('Wall bounds omit an observed or initial wall temperature.')
    times = case['times']
    if np.any((times > 0) & (times < 1e-7)):
        raise ValueError('Bessel oracle is qualified only for positive times >=1e-7 s.')
    heat = arrays['gasEnergyJ'] - arrays['gasEnergyJ'][0]
    if np.max(np.abs(heat - arrays['wallHeatJ'])) > 1e-11:
        raise ValueError('Source-free gas energy gain does not equal signed wall heat.')


def analyze_case(path):
    case = ADAPTER.load(path)
    audit_control(case)
    config, record, arrays, times = case['config'], case['record'], case['arrays'], case['times']
    thermal = case['operation']['thermal']
    constants = {'radiusM': config['radiusM'], 'lengthM': config['lengthM'], 'number': case['number'],
                 'initialK': config['gasK'], 'wallK': config['linerK'],
                 'conductivityWMK': thermal['gas']['conductivityWMK'], 'gasWallWK': thermal['gasWallWK'],
                 'wallThicknessM': thermal['spatial']['thicknessM']}
    bracket = continuum_bracket(constants, record['cells'], record['wallCells'], times,
                                record['minWallInnerK'], record['maxWallInnerK'])
    nominal = bracket['nominal']
    absolute = worst_case_error(arrays['temperatureK'], bracket['temperatureLowK'], bracket['temperatureHighK'])
    surface_rise_low = bracket['surfaceLowK'] - config['gasK']
    surface_rise_high = bracket['surfaceHighK'] - config['gasK']
    # An uncertainty interval crossing the registered signal mask cannot be
    # silently assigned the more convenient assessed/unassessed verdict.
    if np.any((surface_rise_low < .01) & (surface_rise_high >= .01)):
        raise ValueError('Oracle boundary uncertainty crosses the registered heating-signal mask.')
    active = surface_rise_low >= .01
    relative = np.zeros_like(absolute)
    np.divide(absolute, surface_rise_low[:, None], out=relative, where=active[:, None])
    flux_error = worst_case_error(arrays['wallFluxW'], bracket['fluxLowW'], bracket['fluxHighW'])
    flux_denominator = np.minimum(np.abs(bracket['fluxLowW']), np.abs(bracket['fluxHighW']))
    if np.any(bracket['fluxLowW'] * bracket['fluxHighW'] <= 0):
        raise ValueError('Oracle wall-flux interval contains zero; relative accuracy is unassessed.')
    heat_error = worst_case_error(arrays['wallHeatJ'], bracket['heatLowJ'], bracket['heatHighJ'])
    heat_active = bracket['heatLowJ'] > 1e-12
    heat_relative = np.zeros_like(heat_error)
    np.divide(heat_error, bracket['heatLowJ'], out=heat_relative, where=heat_active)
    metrics = {
        'profileAbsoluteK': metric(absolute, times),
        'profileRelativeToSurfaceHeating': metric(relative, times, active[:, None]),
        'wallFluxRelative': metric(flux_error / flux_denominator, times),
        'cumulativeHeatRelative': metric(heat_relative, times, heat_active),
        'nominalProfileAbsoluteK': metric(np.abs(arrays['temperatureK'] - nominal['temperatureK']), times),
    }
    gates = {name: metrics[metric_name]['assessed'] and metrics[metric_name]['value'] < threshold
             for name, metric_name, threshold in (
                 ('profileAbsoluteBelow0_1K', 'profileAbsoluteK', .1),
                 ('profileHeatingSignalBelow5Percent', 'profileRelativeToSurfaceHeating', .05),
                 ('wallFluxBelow1Percent', 'wallFluxRelative', .01),
                 ('cumulativeWallHeatBelow1Percent', 'cumulativeHeatRelative', .01))}
    uncertainty = {
        'maximumTemperatureBracketWidthK': float(np.max(bracket['temperatureHighK'] - bracket['temperatureLowK'])),
        'maximumSurfaceBracketWidthK': float(np.max(bracket['surfaceHighK'] - bracket['surfaceLowK'])),
        'maximumHeatBracketWidthJ': float(np.max(bracket['heatHighJ'] - bracket['heatLowJ'])),
        'maximumFluxBracketWidthW': float(np.max(bracket['fluxHighW'] - bracket['fluxLowW'])),
        'maximumTemperatureDifferenceFromIdealFilmK': float(np.max(worst_case_error(
            nominal['temperatureK'], bracket['temperatureLowK'], bracket['temperatureHighK']))),
    }
    return {'source': str(path), 'sourceSha256': case['sourceSha256'], 'record': record,
            'timeControl': case['timeControl'], 'metrics': metrics, 'gates': gates,
            'allAccuracyGatesPassed': all(gates.values()), 'oracleBoundaryUncertainty': uncertainty,
            'effectiveFilmBoundsWK': [bracket['filmLowWK'], bracket['filmHighWK']],
            'seriesTruncation512vs1024': bracket['seriesTruncation512vs1024'],
            'floatingPointSlack': bracket['floatingPointSlack']}


def main():
    if len(sys.argv) < 3:
        raise SystemExit('usage: robin-adaptive.py OUTPUT.json CASE.json...')
    results = [analyze_case(path) for path in sys.argv[2:]]
    output = {
        'scope': 'Whole-operation adaptive Fourier-limit control with bounded finite-wall boundary; not full-mixture or device calibration.',
        'method': 'Independent Bessel annulus averages; maximum-principle temperature/heat bracket and interval-arithmetic instantaneous flux.',
        'boundaryExtremaScope': 'All accepted finite-wall inner-cell temperatures; continuum comparison treats its boundary values as bounded in time.',
        'gatesUseWorstCaseOverBoundaryBracket': True,
        'continuumDiscretizationErrorIsNotBoundedByOracleBracket': True,
        'heatingNorm': 'Error relative to continuum SURFACE heating >=0.01 K; distinct from mixture local-cell heating >=0.1 K.',
        'accuracyThresholds': {'profileAbsoluteK': .1, 'profileRelativeToSurfaceHeating': .05,
                               'wallFluxRelative': .01, 'cumulativeHeatRelative': .01},
        'cases': results, 'accuracyFailuresAreRetained': True,
    }
    with Path(sys.argv[1]).open('w') as stream:
        json.dump(output, stream, indent=2)
        stream.write('\n')
    print(json.dumps({'cases': len(results), 'passingCases': sum(r['allAccuracyGatesPassed'] for r in results)}))


if __name__ == '__main__':
    main()
