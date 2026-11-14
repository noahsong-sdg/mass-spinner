"""Rational analytic controls for a separate high-precision norm witness."""
from decimal import Decimal, localcontext
from fractions import Fraction
import math
import unittest

import numpy as np

import precision107 as precise


def state(r, z, values):
    return dict(radialEdgesM=list(r), axialEdgesM=list(z),
        snapshots=[dict(timeS=0., densityKgM3=np.asarray(values).tolist(),
                        temperatureK=np.asarray(values).tolist())])


def rational_integral(corners, r0, h, k):
    """Independent monomial integration, not the producer's Q1 mass matrix."""
    f = [[Fraction(value) for value in row] for row in corners]
    polynomial = {(0, 0):f[0][0], (1, 0):f[0][1]-f[0][0],
        (0, 1):f[1][0]-f[0][0], (1, 1):f[1][1]-f[1][0]-f[0][1]+f[0][0]}
    total = Fraction(0)
    for (i, j), a in polynomial.items():
        for (l, m), b in polynomial.items():
            total += a*b*(Fraction(r0)/(i+l+1)+Fraction(h)/(i+l+2))/(j+m+1)
    return Fraction(2*math.pi)*Fraction(h)*Fraction(k)*total


def decimal_fraction(value):
    return Decimal(value.numerator)/Decimal(value.denominator)


class PrecisionControls(unittest.TestCase):
    def test_constant_one_ulp_difference_matches_exact_binary_rational_volume(self):
        base = 1.; changed = np.nextafter(base, math.inf)
        r, z = [0., .02, .06], [0., .08, .24]
        a = state(r, z, np.full((2, 2), base))
        b = state([0., .01, .03, .06], [0., .03, .11, .24], np.full((3, 3), changed))
        with localcontext() as context:
            context.prec = 60
            delta = Fraction(changed)-Fraction(base)
            volume = Fraction(2*math.pi)*Fraction(.06)**2*Fraction(.24)/2
            expected = decimal_fraction(volume*delta*delta)
            for digits in (40, 60):
                row = precise.integrals(a, b, 'densityKgM3', precision=digits)
                self.assertGreater(row['q1ErrorIntegral'], 0)
                # Subtracting O(1) profiles separated by one binary64 ulp
                # consumes about 16 decimal digits: 40 leaves about 24.
                # Allow two digits for interpolation/summation; the separate
                # scientific panel gate remains the original 1e-10.
                self.assertLess(precise.relative_spread(row['q1ErrorIntegral'], expected),
                                Decimal('1e-22') if digits == 40 else Decimal('1e-42'))
            self.assertTrue(precise.witness(a, b, 'densityKgM3')['allPrecisionChecksPass'])

    def test_bilinear_one_ulp_scale_matches_independent_monomial_integral(self):
        with localcontext() as context:
            context.prec = 60
            unit = Fraction(1, 2**52)
            corners = ((unit, -2*unit), (3*unit, 7*unit))
            r0, h, k = Fraction(1, 64), Fraction(3, 128), Fraction(5, 64)
            expected = decimal_fraction(rational_integral(corners, r0, h, k))
            decimal_corners = tuple(tuple(decimal_fraction(x) for x in row) for row in corners)
            args = decimal_corners, decimal_fraction(r0), decimal_fraction(h), decimal_fraction(k)
            actual = precise.q1_square(*args)
            self.assertGreater(actual, 0)
            self.assertLess(precise.relative_spread(actual, expected), Decimal('1e-55'))
            for order in (2, 3):
                self.assertLess(precise.relative_spread(precise.gauss_square(*args, order), expected),
                                Decimal('1e-55'))

    def test_identical_constant_across_grids_and_radial_profile_across_axial_grids_are_exact_zero(self):
        a = state([0., .02, .06], [0., .08, .24], np.full((2, 2), 2900.))
        b = state([0., .01, .03, .06], [0., .03, .11, .24], np.full((3, 3), 2900.))
        for digits in (40, 60):
            self.assertEqual(precise.integrals(a, b, 'temperatureK', precision=digits)['q1ErrorIntegral'], 0)
        radial = [2000., 3000.]
        a = state([0., .02, .06], [0., .08, .24], np.tile(radial, (2, 1)))
        b = state([0., .02, .06], [0., .03, .11, .24], np.tile(radial, (3, 1)))
        report = precise.witness(a, b, 'temperatureK')
        self.assertTrue(report['allPrecisionChecksPass'])
        self.assertTrue(all(Decimal(row['q1ErrorIntegral']) == 0 for row in report['rows']))

    def test_alternating_near_ulp_samples_remain_positive_and_precision_agrees(self):
        base = 2900.; spacing = np.spacing(base)
        r, z = [0., .02, .06], [0., .08, .24]
        a = state(r, z, np.full((2, 2), base))
        b = state(r, z, base+spacing*np.array([[1., -2.], [3., 7.]]))
        report = precise.witness(a, b, 'temperatureK')
        self.assertTrue(report['allPrecisionChecksPass'])
        self.assertTrue(all(Decimal(row['q1ErrorIntegral']) > 0 for row in report['rows']))
        # A real 10% change stays a 10% change of the reference-scaled norm;
        # higher precision is not an acceptance tolerance or a floor.
        b = state(r, z, np.full((2, 2), base*1.1))
        row = precise.integrals(a, b, 'temperatureK', precision=60)
        with localcontext() as context:
            context.prec = 60
            relative = (row['q1ErrorIntegral']/row['q1ReferenceIntegral']).sqrt()
            self.assertGreater(relative, Decimal('.05'))

    def test_scalar_padding_and_domain_boundaries_are_explicit(self):
        a = state([0., .06], [0., .24], [[2900.]])
        b = state([0., .06], [0., .24], [[np.nextafter(2900., math.inf)]])
        self.assertTrue(precise.witness(a, b, 'temperatureK')['allPrecisionChecksPass'])
        for field in ('vrMPS', 'omegaRadS'):
            with self.assertRaisesRegex(ValueError, 'only scalar'):
                precise.integrals(a, b, field)
        with self.assertRaisesRegex(ValueError, '40 decimal'):
            precise.integrals(a, b, 'temperatureK', precision=28)
        b['radialEdgesM'][-1] = .07
        with self.assertRaisesRegex(ValueError, 'physical domains'):
            precise.integrals(a, b, 'temperatureK')


if __name__ == '__main__':
    unittest.main(verbosity=2)
