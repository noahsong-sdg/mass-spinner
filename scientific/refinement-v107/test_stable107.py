"""Analytic and independent Decimal controls for the stable metric arithmetic."""
from copy import deepcopy
from decimal import Decimal
from fractions import Fraction
import math
import unittest

import numpy as np

import stable107 as stable
import precision107 as decimal_reference
from test_precision107 import rational_integral


def state(r, z, value=1.):
    shape = len(z)-1, len(r)-1
    fields = {name: (np.full(shape, value) if name in ('densityKgM3', 'temperatureK')
                     else np.zeros(shape)).tolist() for name in stable.audit99.FIELDS}
    return dict(radialEdgesM=list(r), axialEdgesM=list(z), snapshots=[dict(timeS=0., **fields)])


class StableMetricControls(unittest.TestCase):
    def test_one_ulp_constant_matches_analytic_volume_and_preserves_nonzero_difference(self):
        a = state([0., .02, .06], [0., .08, .24])
        b = state([0., .01, .03, .06], [0., .03, .11, .24], np.nextafter(1., math.inf))
        delta = Fraction(np.nextafter(1., math.inf))-1
        volume = Fraction(2*math.pi)*Fraction(.06)**2*Fraction(.24)/2
        expected = float(volume*delta*delta)
        for order in (2, 3):
            rows = stable.metrics(a, b, 0, order)
            for name in ('densityKgM3', 'temperatureK'):
                actual = rows[name]['errorIntegral']
                self.assertGreater(actual, 0.)
                self.assertLess(abs(actual/expected-1), 2e-14)

    def test_constant_different_grids_and_same_radial_function_different_axial_grids_are_exact_zero(self):
        a = state([0., .02, .06], [0., .08, .24], 2900.)
        b = state([0., .01, .03, .06], [0., .03, .11, .24], 2900.)
        for order in (2, 3):
            self.assertTrue(all(row['errorIntegral'] == 0 for row in stable.metrics(a, b, 0, order).values()))
        b = state([0., .02, .06], [0., .03, .11, .24])
        for name in ('densityKgM3', 'temperatureK'):
            a['snapshots'][0][name] = np.tile([2000., 3000.], (2, 1)).tolist()
            b['snapshots'][0][name] = np.tile([2000., 3000.], (3, 1)).tolist()
        for order in (2, 3):
            rows = stable.metrics(a, b, 0, order)
            self.assertEqual(rows['densityKgM3']['errorIntegral'], 0.)
            self.assertEqual(rows['temperatureK']['errorIntegral'], 0.)

    def test_near_ulp_spatial_variation_agrees_with_independent_decimal_mass_integral(self):
        a = state([0., .02, .06], [0., .08, .24], 2900.)
        b = state([0., .02, .06], [0., .03, .11, .24], 2900.)
        perturbation = np.spacing(2900.)*np.array([[1., -2.], [3., 7.], [-1., 4.]])
        b['snapshots'][0]['temperatureK'] = (2900.+perturbation).tolist()
        exact = decimal_reference.integrals(a, b, 'temperatureK', precision=60)['q1ErrorIntegral']
        values = [stable.metrics(a, b, 0, order)['temperatureK']['errorIntegral'] for order in (2, 3)]
        self.assertTrue(all(value > 0 for value in values))
        for value in values:
            self.assertLess(abs(Decimal.from_float(value)/exact-1), Decimal('1e-12'))
        self.assertLess(abs(values[0]-values[1])/max(values), 1e-10)

    def test_finite_piecewise_bilinear_field_on_two_different_grids_matches_exact_integral(self):
        a = state([0., .015, .035, .06], [0., .07, .12, .24], 0.)
        b = state([0., .01, .03, .045, .06], [0., .03, .11, .17, .24])
        values = np.array([[1., 2., 4., 8.], [2., 5., 3., 1.],
                           [3., 1., 7., 2.], [9., 4., 2., 6.]])
        b['snapshots'][0]['densityKgM3'] = values.tolist()
        r, z = np.asarray(b['radialEdgesM']), np.asarray(b['axialEdgesM'])
        r = np.r_[0., (2/3)*np.diff(r**3)/np.diff(r*r), r[-1]]
        z = np.r_[0., (z[1:]+z[:-1])/2, z[-1]]
        padded = np.pad(values, 1, mode='edge'); exact = Fraction(0)
        for j in range(len(z)-1):
            for i in range(len(r)-1):
                corners = [[padded[j+y, i+x] for x in range(2)] for y in range(2)]
                exact += rational_integral(corners, Fraction(r[i]),
                    Fraction(r[i+1])-Fraction(r[i]), Fraction(z[j+1])-Fraction(z[j]))
        for order in (2, 3):
            actual = stable.metrics(a, b, 0, order)['densityKgM3']['errorIntegral']
            self.assertLess(abs(actual/float(exact)-1), 2e-14)

    def test_velocity_boundary_values_match_declared_observable_and_analytic_q1_norm(self):
        a = state([0., .06], [0., .24]); b = deepcopy(a)
        expected = dict(omegaRadS=[[1., 1., 0.], [1., 1., 0.], [0., 0., 0.]],
            vrMPS=[[0., 2., 0.], [0., 2., 0.], [0., 0., 0.]],
            vzMPS=[[0., 0., 0.], [3., 3., 0.], [0., 0., 0.]])
        for name, number in (('omegaRadS', 1.), ('vrMPS', 2.), ('vzMPS', 3.)):
            a['snapshots'][0][name] = [[number]]
            (r, z), values = stable.difference_grid(a, b, name)
            np.testing.assert_array_equal(values, expected[name])
            exact = Fraction(0)
            for j in range(2):
                for i in range(2):
                    corners = [[expected[name][j+y][i+x] for x in range(2)] for y in range(2)]
                    exact += rational_integral(corners, Fraction(r[i]),
                        Fraction(r[i+1])-Fraction(r[i]), Fraction(z[j+1])-Fraction(z[j]))
            for order in (2, 3):
                actual = stable.metrics(a, b, 0, order)[name]['errorIntegral']
                self.assertLess(abs(actual/float(exact)-1), 2e-14)

    def test_float_increments_reference_norm_and_combined_meridional_denominator_are_unchanged(self):
        a = state([0., .02, .06], [0., .08, .24], 1e16)
        b = state([0., .02, .06], [0., .08, .24], 1e16+4)
        for saved in (a, b):
            saved['snapshots'].append(deepcopy(saved['snapshots'][0]))
            saved['snapshots'][1]['timeS'] = 1e-6
            for name in ('densityKgM3', 'temperatureK'):
                saved['snapshots'][1][name] = (np.asarray(saved['snapshots'][0][name])+2.).tolist()
        rows = stable.metrics(a, b, 1, 2)
        self.assertGreater(rows['densityKgM3']['errorIntegral'], 0.)
        self.assertEqual(rows['densityKgM3/increment']['errorIntegral'], 0.)
        self.assertGreater(rows['densityKgM3/increment']['referenceIntegral'], 0.)
        for saved, factor in ((a, 1.), (b, 2.)):
            saved['snapshots'][1]['vrMPS'] = np.full((2, 2), 2.*factor).tolist()
            saved['snapshots'][1]['vzMPS'] = np.full((2, 2), 3.*factor).tolist()
        rows, old = stable.metrics(a, b, 1, 2), stable.audit99.metrics(a, b, 1, 2)
        denominator = rows['vrMPS']['referenceIntegral']+rows['vzMPS']['referenceIntegral']
        self.assertEqual(rows['vrMPS']['referenceRMS'], rows['vzMPS']['referenceRMS'])
        for name in rows:
            self.assertEqual(rows[name]['referenceIntegral'], old[name]['referenceIntegral'])
        for name in ('vrMPS', 'vzMPS'):
            self.assertAlmostEqual(rows[name]['value']**2, rows[name]['errorIntegral']/denominator)

    def test_genuine_large_discrepancy_remains_failed_and_invalid_domain_is_rejected(self):
        a = state([0., .02, .06], [0., .08, .24], 1000.)
        b = state([0., .01, .03, .06], [0., .03, .11, .24], 1100.)
        for order in (2, 3):
            row = stable.metrics(a, b, 0, order)['densityKgM3']
            self.assertGreater(row['value'], .05)
            self.assertAlmostEqual(row['value'], 100/1100, places=14)
        b['radialEdgesM'][-1] = .07
        with self.assertRaisesRegex(ValueError, 'physical domains'):
            stable.difference_grid(a, b, 'densityKgM3')
        with self.assertRaisesRegex(ValueError, 'Unsupported'):
            stable.difference_grid(a, a, 'pressurePa')


if __name__ == '__main__':
    unittest.main(verbosity=2)
