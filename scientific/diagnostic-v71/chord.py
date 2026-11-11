"""Research-only optically thin Doppler moments, exact for constant annular fields.

The symmetry axis is +z, the chord lies at x=b, and positive LOS velocity is +y.
Thus positive rotation about +z projects to u_LOS=b*Omega. Emissivity is per path length,
not mass density; callers must supply the emitting-species temperature and mass.
One isolated transition/species is represented, not unresolved isotope/line blends.
No inference of emissivity, opacity, instrument fitting or device qualification.
"""
from dataclasses import dataclass
import math

KB = 1.380649e-23  # exact SI J/K


@dataclass(frozen=True)
class Moments:
    brightness: float
    centroid_m_s: float
    thermal_variance_m2_s2: float
    shear_variance_m2_s2: float
    instrument_variance_m2_s2: float
    observed_variance_m2_s2: float
    moment_temperature_k: float


def finite(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(name + ' must be a finite number')
    return value


def chord_moments(edges_m, omega_rad_s, temperature_k, emissivity, impact_m,
                  emitter_mass_kg, instrument_variance_m2_s2=0, bulk_los_m_s=0):
    """Return moments, or None for a tangent/outside/nonemitting sight line.

    Fields are constant on each radial annulus. A positive inner edge denotes
    an empty central hole. The centered shear sum avoids subtracting large raw
    second moments. Independent, zero-mean instrument broadening adds variance.
    moment_temperature_k includes unresolved shear and instrumental broadening;
    it is NOT a local kinetic temperature or a Gaussian-fit/FWHM temperature.
    """
    if len(edges_m) < 2:
        raise ValueError('Need at least one annulus')
    edges = [finite(v, 'radial edge') for v in edges_m]
    if edges[0] < 0 or any(b <= a for a, b in zip(edges, edges[1:])):
        raise ValueError('Radial edges must be nonnegative and strictly increasing')
    count = len(edges)-1
    if any(len(field) != count for field in (omega_rad_s, temperature_k, emissivity)):
        raise ValueError('Need one field value per annulus')
    omega = [finite(v, 'angular speed') for v in omega_rad_s]
    temp = [finite(v, 'temperature') for v in temperature_k]
    eps = [finite(v, 'emissivity') for v in emissivity]
    mass = finite(emitter_mass_kg, 'emitter mass')
    b = finite(impact_m, 'signed impact parameter')
    bulk = finite(bulk_los_m_s, 'line-of-sight bulk velocity')
    instrument = finite(instrument_variance_m2_s2, 'instrument variance')
    if mass <= 0 or any(t <= 0 for t in temp) or any(e < 0 for e in eps) or instrument < 0:
        raise ValueError('Need positive mass/temperature and nonnegative emissivity/variance')
    weights, speeds, thermal = [], [], []
    x = abs(b)
    for left, right, w, t, e in zip(edges, edges[1:], omega, temp, eps):
        if x >= right or e == 0:
            continue
        hi = math.sqrt((right-x)*(right+x))
        if x < left:
            lo = math.sqrt((left-x)*(left+x))
            # hi-lo in rationalized form retains thin annular path lengths.
            length = 2*(right-left)*(right+left)/(hi+lo)
        else:
            length = 2*hi
        weights.append(e*length)
        speeds.append(b*w)  # Keep a uniform bulk boost out of the centered sum.
        thermal.append(KB*t/mass)
    if not weights:
        return None
    brightness = math.fsum(weights)
    if not math.isfinite(brightness) or brightness <= 0:
        raise ValueError('Emitting brightness is not representable')
    fractions = [w/brightness for w in weights]
    mean = math.fsum(f*u for f, u in zip(fractions, speeds))
    thermal_var = math.fsum(f*s for f, s in zip(fractions, thermal))
    shear_var = math.fsum(f*(u-mean)**2 for f, u in zip(fractions, speeds))
    observed = thermal_var+shear_var+instrument
    result = Moments(brightness, mean+bulk, thermal_var, shear_var, instrument,
                     observed, mass*observed/KB)
    if any(not math.isfinite(v) for v in result.__dict__.values()):
        raise ValueError('Doppler moments are not representable')
    return result
