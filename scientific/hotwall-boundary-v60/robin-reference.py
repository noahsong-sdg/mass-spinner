"""Independent cylindrical Robin heat-step reference; execute only in safe-dev.

This is the fixed-inventory Fourier limit, not the nonlinear rotating mixture.
No production property, geometric resistance or stepping helper is imported.
The source packet contains actual production-kernel annulus-average gas states
and a compensated, isothermal solid. The continuum target uses the physical film
at r=R. Finite solid half-cell resistance is quantified independently.
"""
import json
import math
import sys

import numpy as np
import scipy
from scipy.optimize import brentq
from scipy.special import j0, j1, jn_zeros

KB = 1.380649e-23


def roots(biot, count):
    """One positive root in each (previous J1 zero, current J0 zero)."""
    left = np.r_[0.0, jn_zeros(1, count - 1)]
    right = jn_zeros(0, count)
    values = np.array([brentq(lambda x: x * j1(x) - biot * j0(x),
                             a, b, xtol=5e-15, rtol=9e-16)
                       for a, b in zip(left, right)])
    if not np.all(values > 0) or not np.all(np.diff(values) > 0):
        raise ValueError('Robin eigenvalues must be positive and ordered.')
    return values


def reference(constants, cells, times, count, film=None):
    r, length = constants['radiusM'], constants['lengthM']
    conductivity = constants['conductivityWMK']
    film = constants['gasWallWK'] if film is None else film
    initial, wall = constants['initialK'], constants['wallK']
    cv_total = 1.5 * KB * constants['number']
    alpha = conductivity * math.pi * r * r * length / cv_total
    biot = film / (2 * math.pi * length * conductivity)
    eigenvalues = roots(biot, count)
    zero, one = j0(eigenvalues), j1(eigenvalues)
    coefficients = 2 * one / (eigenvalues * (zero * zero + one * one))
    edges = np.sqrt(np.arange(cells + 1) / cells)
    # Exact volume averages of J0(mu*r/R), not evaluation at a mesh center.
    primitive = edges[:, None] * j1(edges[:, None] * eigenvalues)
    modes = 2 * np.diff(primitive, axis=0) / (eigenvalues / cells)
    mean_modes = 2 * one / eigenvalues
    decay = np.exp(-np.asarray(times)[:, None] * alpha * (eigenvalues / r)**2)
    amplitudes = decay * coefficients
    remaining = amplitudes @ modes.T
    surface_remaining = amplitudes @ zero
    mean_remaining = amplitudes @ mean_modes
    delta = wall - initial
    temperature = wall - delta * remaining
    surface = wall - delta * surface_remaining
    heat = cv_total * delta * (1 - mean_remaining)
    flux = film * delta * surface_remaining
    # Uniform initial data are known exactly; do not use a truncated series at t=0.
    at_zero = np.asarray(times) == 0
    temperature[at_zero] = initial
    surface[at_zero] = initial
    heat[at_zero] = 0
    flux[at_zero] = film * delta
    return {'temperatureK': temperature, 'surfaceK': surface,
            'heatJ': heat, 'fluxW': flux, 'alphaM2S': alpha,
            'biot': biot, 'maximumEigenResidual': float(np.max(np.abs(
                eigenvalues * one - biot * zero)))}


def maximum(values, times, radii=None):
    index = np.unravel_index(np.argmax(values), values.shape)
    result = {'value': float(values[index]), 'timeS': float(times[index[0]])}
    if radii is not None:
        result['annulusIndex'] = int(index[1])
        result['radiusM'] = float(radii[index[1]])
    return result


def analyze_case(constants, case):
    n, nw = case['cells'], case['wallCells']
    states = case['states']
    times = np.array([s['timeS'] for s in states])
    if np.any(np.diff(times) <= 0) or np.any(times < 0):
        raise ValueError('Reference samples must be strictly ordered in time.')
    if np.any((times > 0) & (times < 1e-7)):
        raise ValueError('This reference is qualified for positive times >= 0.1 us.')
    temperature = np.array([s['temperatureK'] for s in states])
    if temperature.shape != (len(times), n) or not np.all(np.isfinite(temperature)):
        raise ValueError('Production gas states must share the declared grid.')
    coarse = reference(constants, n, times, 512)
    exact = reference(constants, n, times, 1024)
    truncation = {
        'maximumTemperatureK': float(np.max(np.abs(exact['temperatureK'] - coarse['temperatureK']))),
        'maximumSurfaceK': float(np.max(np.abs(exact['surfaceK'] - coarse['surfaceK']))),
        'maximumHeatJ': float(np.max(np.abs(exact['heatJ'] - coarse['heatJ']))),
        'maximumFluxW': float(np.max(np.abs(exact['fluxW'] - coarse['fluxW']))),
    }
    if truncation['maximumTemperatureK'] > 1e-8 or truncation['maximumSurfaceK'] > 1e-8:
        raise ValueError(f'Independent eigenseries is not truncated accurately enough: {truncation}')
    r, length = constants['radiusM'], constants['lengthM']
    wall, initial = constants['wallK'], constants['initialK']
    conductivity = constants['conductivityWMK']
    # Independent Tolias polynomial at the thermostatted wall temperature.
    wall_k = (149.441 - .045466 * wall + 13.193e-6 * wall**2
              - 1.484e-9 * wall**3 + 3.866e6 / wall**2)
    thickness = constants['wallThicknessM']
    wall_center = math.sqrt(r * (r + thickness / nw))
    wall_resistance = math.log(wall_center / r) / (2 * math.pi * length * wall_k)
    gas_resistance = 1 / (8 * math.pi * length * conductivity * n)
    film_resistance = 1 / constants['gasWallWK']
    interface = 1 / (film_resistance + wall_resistance + gas_resistance)
    flux = interface * (wall - temperature[:, -1])
    surface = temperature[:, -1] + flux * gas_resistance
    emitted_flux = np.array([s['wallFluxW'] for s in states])
    if np.max(np.abs(emitted_flux - flux)) > 2e-8:
        raise ValueError('Emitted interface flux does not match independent series resistance.')
    cv_total = 1.5 * KB * constants['number']
    energy = np.array([s['gasEnergyJ'] for s in states])
    heat = energy - cv_total * initial
    reconstructed_energy = cv_total * temperature.mean(axis=1)
    if np.max(np.abs(energy - reconstructed_energy)) > 1e-11:
        raise ValueError('Fixed-inventory gas energy does not agree with temperatures.')
    if case['maximumWallDeviationK'] > 2e-7:
        raise ValueError('Thermostatted continuum control did not hold a uniform wall.')
    # Quantify the finite thermostatted solid half-cell against the film-only continuum.
    corrected = reference(constants, n, times, 1024,
                          film=1 / (film_resistance + wall_resistance))
    half_solid_effect = {
        'maximumTemperatureK': float(np.max(np.abs(corrected['temperatureK'] - exact['temperatureK']))),
        'maximumFluxW': float(np.max(np.abs(corrected['fluxW'] - exact['fluxW']))),
        'maximumHeatJ': float(np.max(np.abs(corrected['heatJ'] - exact['heatJ']))),
    }
    error = np.abs(temperature - exact['temperatureK'])
    surface_heating = exact['surfaceK'] - initial
    active = surface_heating >= .01
    # Resolve the actual heating signal, not the large 500 K background.
    layer_error = error[active] / surface_heating[active, None]
    local_heating = exact['temperatureK'] - initial
    local_active = local_heating >= .01
    local_error = np.zeros_like(error)
    local_error[local_active] = error[local_active] / local_heating[local_active]
    positive_heat = exact['heatJ'] > 1e-12
    flux_relative = np.abs(flux - exact['fluxW']) / np.maximum(1e-12, np.abs(exact['fluxW']))
    heat_relative = np.zeros(len(times))
    heat_relative[positive_heat] = np.abs(heat[positive_heat] - exact['heatJ'][positive_heat]) / exact['heatJ'][positive_heat]
    radii = r * np.sqrt((np.arange(n) + .5) / n)
    metrics = {
        'profileAbsoluteK': maximum(error, times, radii),
        'profileRelativeToSurfaceHeating': maximum(layer_error, times[active], radii),
        'profileRelativeToLocalHeatingDiagnostic': maximum(local_error, times, radii),
        'wallFluxRelative': maximum(flux_relative, times),
        'cumulativeHeatRelative': maximum(heat_relative, times),
        'surfaceAbsoluteK': maximum(np.abs(surface - exact['surfaceK']), times),
    }
    gates = {
        'profileAbsoluteBelow0_1K': metrics['profileAbsoluteK']['value'] <= .1,
        'profileHeatingSignalBelow5Percent': metrics['profileRelativeToSurfaceHeating']['value'] <= .05,
        'wallFluxBelow1Percent': metrics['wallFluxRelative']['value'] <= .01,
        'cumulativeWallHeatBelow1Percent': metrics['cumulativeHeatRelative']['value'] <= .01,
    }
    return {'cells': n, 'wallCells': nw, 'steps': case['steps'],
            'sampleCount': len(times), 'biot': exact['biot'], 'alphaM2S': exact['alphaM2S'],
            'outerGasCellWidthM': r * (1 - math.sqrt((n - 1) / n)),
            'gasHalfCellResistanceKPerW': gas_resistance,
            'solidHalfCellResistanceKPerW': wall_resistance,
            'maximumWallDeviationK': case['maximumWallDeviationK'],
            'referenceTruncation512vs1024': truncation,
            'halfSolidContinuumCorrection': half_solid_effect,
            'metrics': metrics, 'gates': gates, 'allAccuracyGatesPassed': all(gates.values())}


def main():
    with open(sys.argv[1]) as stream:
        packet = json.load(stream)
    if packet['schemaVersion'] != 1 or packet['kernel'] != 'advanceFuelMixtureThermal':
        raise ValueError('Unsupported reference packet.')
    results = [analyze_case(packet['constants'], case) for case in packet['cases']]
    output = {'scope': 'Independent cylindrical Robin step continuum; fixed inventories, thermostatted wall, no rotor or species flux.',
              'method': 'Bessel eigenseries with exact annulus-volume averages; 512/1024 mode truncation check.',
              'versions': {'numpy': np.__version__, 'scipy': scipy.__version__},
              'accuracyGatesRegisteredBeforeResults': True,
              'cases': results}
    with open(sys.argv[2], 'w') as stream:
        json.dump(output, stream, indent=2)
        stream.write('\n')
    print(json.dumps({'cases': len(results), 'passingAccuracyCases': sum(r['allAccuracyGatesPassed'] for r in results),
                      'accuracyFailuresAreRetained': True}))


if __name__ == '__main__':
    main()
