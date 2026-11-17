"""Independent 80-digit ideal cylindrical-equilibrium composition oracle.

JSON stdin is a list of cases with massesU, edgeSpeedMS, temperatureK,
lightFraction and radiusFraction. JSON stdout is an ordered list of references;
Decimal results are strings so tiny enrichment gains survive serialization.
No production modules or log-domain production formulas are used.

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
    if beta == 0:
        return end - start
    if beta >= D('1e-20'):
        return ((beta * end).exp() - (beta * start).exp()) / beta
    # The convergent integral of exp's Taylor series retains tiny-beta limits.
    total = end - start
    coefficient = ONE
    for order in range(1, 10000):
        coefficient *= beta / order
        term = coefficient * (end ** (order + 1) - start ** (order + 1)) / (order + 1)
        updated = total + term
        if updated == total:
            return total
        total = updated
    raise ArithmeticError('Integral series failed to converge.')


def region(weights, species, inner):
    inventory = sum((weight * fraction for weight, fraction in zip(weights, species)), ZERO)
    desired = 0 if inner else 1
    purity = weights[desired] * species[desired] / inventory if inventory else None
    return {
        'speciesFractions': species,
        'inventoryFraction': inventory,
        'purity': purity,
        'gain': purity - weights[desired] if purity is not None else None,
        'recoveries': [fraction if weight else None for weight, fraction in zip(weights, species)],
    }


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
        return {
            'beta': beta,
            'densityRelativeMean': densities,
            'lightFraction': composition,
            'gain': composition - light,
            'inner': region(weights, inner, True),
            'outer': region(weights, outer, False),
        }


def encode(value):
    if isinstance(value, D):
        return str(value)
    raise TypeError(type(value).__name__)


if __name__ == '__main__':
    cases = json.load(sys.stdin)
    json.dump([reference(case) for case in cases], sys.stdout, default=encode, allow_nan=False)
    sys.stdout.write('\n')
