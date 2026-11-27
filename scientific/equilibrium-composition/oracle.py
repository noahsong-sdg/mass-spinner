"""Independent 80-digit ideal cylindrical-equilibrium composition oracle.

JSON stdin is a list of cases with massesU, edgeSpeedMS, temperatureK,
lightFraction and radiusFraction. JSON stdout is an ordered list of references;
Decimal results are strings so tiny enrichment gains survive serialization.
No production modules or log-domain production formulas are used.
Supplying totalParticles, radiusM and lengthM together also returns absolute
SI densities and cut counts, scaled before any conversion to binary64.

The volume coordinate is y=(r/R)^2. A species' unnormalized density is
exp(beta*y), beta=m*v_edge^2/(2*k*T). We integrate that density directly.
Inner purity refers to the light species; outer purity to the heavy species.
Species fractions are fractions of each species' entire inventory, not local
composition. Recovery is undefined only when that species is absent.
"""

import json
import math
import sys
from decimal import Decimal as D, localcontext

U = D('1.66053906892e-27')
KB = D('1.380649e-23')
# Pi rounded independently to 80 significant decimal digits.
PI = D('3.1415926535897932384626433832795028841971693993751058209749445923078164062862090')
ZERO, ONE = D(0), D(1)


def binary64(value):
    """Reference the actual binary64 inputs used by the JavaScript caller."""
    value = float(value)
    if not math.isfinite(value):
        raise ValueError('All inputs must be finite.')
    return D.from_float(value)


def integral(beta, start, end):
    if start == end:
        return ZERO
    width = end - start
    if beta == 0:
        return width
    # Shift to the interval's origin: exp(beta*start) * width * phi(beta*width),
    # where phi(z) = sum(z**n/(n+1)!). Tiny intervals retain their own scale
    # instead of disappearing when two nearly equal exponentials are subtracted.
    z = beta * width
    shift = (beta * start).exp()
    if abs(z) >= D('0.5'):
        return shift * (z.exp() - ONE) / beta
    total = term = ONE
    for order in range(1, 10000):
        term *= z / (order + 1)
        updated = total + term
        if updated == total:
            return shift * width * total
        total = updated
    raise ArithmeticError('Integral series failed to converge.')


def region(weights, species, inner, total_particles=None):
    inventory = sum((weight * fraction for weight, fraction in zip(weights, species)), ZERO)
    desired = 0 if inner else 1
    purity = weights[desired] * species[desired] / inventory if inventory else None
    result = {
        'speciesFractions': species,
        'inventoryFraction': inventory,
        'purity': purity,
        'gain': purity - weights[desired] if purity is not None else None,
        'recoveries': [fraction if weight else None for weight, fraction in zip(weights, species)],
    }
    if total_particles is not None:
        result['speciesParticles'] = [
            total_particles * weight * fraction for weight, fraction in zip(weights, species)
        ]
        result['totalParticles'] = total_particles * inventory
    return result


def reference(case):
    with localcontext() as context:
        context.prec = 80
        masses = [binary64(value) for value in case['massesU']]
        speed = binary64(case['edgeSpeedMS'])
        temperature = binary64(case['temperatureK'])
        light = binary64(case['lightFraction'])
        radius = binary64(case['radiusFraction'])
        if len(masses) != 2 or not ZERO < masses[0] <= masses[1]:
            raise ValueError('Require two positive masses ordered light then heavy.')
        if temperature <= 0 or not ZERO <= light <= ONE or not ZERO <= radius <= ONE:
            raise ValueError('Require T>0 and fractions in [0,1].')
        total_particles = mean_density = None
        if all(key in case for key in ('totalParticles', 'radiusM', 'lengthM')):
            total_particles, radius_m, length_m = [
                binary64(case[key]) for key in ('totalParticles', 'radiusM', 'lengthM')
            ]
            if min(total_particles, radius_m, length_m) <= 0:
                raise ValueError('SI references require positive inventory, radius and length.')
            mean_density = total_particles / (PI * radius_m * radius_m * length_m)
        beta = [mass * U * speed * speed / (2 * KB * temperature) for mass in masses]
        if beta[1] > 100:
            raise ValueError('Oracle qualification domain is beta_heavy <= 100.')
        y = radius * radius
        normalizers = [integral(b, ZERO, ONE) for b in beta]
        densities = [(b * y).exp() / z for b, z in zip(beta, normalizers)]
        weights = [light, ONE - light]
        total = sum((weight * density for weight, density in zip(weights, densities)), ZERO)
        composition = weights[0] * densities[0] / total
        inner = [integral(b, ZERO, y) / z for b, z in zip(beta, normalizers)]
        outer = [integral(b, y, ONE) / z for b, z in zip(beta, normalizers)]
        result = {
            'beta': beta,
            'densityRelativeMean': densities,
            'lightFraction': composition,
            'gain': composition - light,
            'inner': region(weights, inner, True, total_particles),
            'outer': region(weights, outer, False, total_particles),
        }
        if mean_density is not None:
            result['densityM3'] = [
                mean_density * weight * density for weight, density in zip(weights, densities)
            ]
        return result


def encode(value):
    if isinstance(value, D):
        return str(value)
    raise TypeError(type(value).__name__)


if __name__ == '__main__':
    cases = json.load(sys.stdin)
    json.dump([reference(case) for case in cases], sys.stdout, default=encode, allow_nan=False)
    sys.stdout.write('\n')
