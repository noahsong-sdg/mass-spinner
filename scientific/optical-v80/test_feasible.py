"""Analytic brightness-only LP controls. Execute only in safe-dev."""
import unittest

import numpy as np

from feasible import centroid_bounds


class FeasibleControls(unittest.TestCase):
    def test_exact_brightness_fixes_one_shared_emissivity(self):
        # The common profile must be epsilon=[1,3], not independent row weights.
        A = [[1.,1.],[1.,2.]]
        first = centroid_bounds(A, [4.,7.], [4.,7.], [1.,1.], [0.,100.])
        second = centroid_bounds(A, [4.,7.], [4.,7.], [1.,2.], [0.,200.])
        self.assertEqual(first['status'], 'available')
        self.assertEqual(second['status'], 'available')
        self.assertAlmostEqual(first['minMS'], 75.)
        self.assertAlmostEqual(first['maxMS'], 75.)
        self.assertAlmostEqual(second['minMS'], 600./7.)
        np.testing.assert_allclose(first['minimumCertificate']['epsilon'], [1.,3.])
        np.testing.assert_allclose(second['maximumCertificate']['epsilon'], [1.,3.])

    def test_brightness_scale_invariance(self):
        for factor in (1e-8, 1., 1e8):
            p = centroid_bounds([[1.,1.],[1.,2.]], np.array([4.,7.])*factor,
                                np.array([4.,7.])*factor, [1.,1.], [0.,100.])
            self.assertEqual(p['status'], 'available')
            self.assertAlmostEqual(p['minMS'], 75.)
            self.assertAlmostEqual(p['maxMS'], 75.)
            np.testing.assert_allclose(p['maximumCertificate']['epsilon'], np.array([1.,3.])*factor)

    def test_partial_brightness_constraint_preserves_full_signed_range(self):
        p = centroid_bounds([[1.,1.]], [4.], [4.], [1.,1.], [-100.,200.])
        self.assertEqual(p['status'], 'available')
        self.assertAlmostEqual(p['minMS'], -100.)
        self.assertAlmostEqual(p['maxMS'], 200.)
        for name in ('minimumCertificate', 'maximumCertificate'):
            self.assertLessEqual(max(p[name]['residuals'].values()), 1e-7)

    def test_infeasible_constraints_are_unavailable_without_widening(self):
        p = centroid_bounds([[1.,1.],[1.,1.]], [1.,3.], [1.,3.], [1.,1.], [0.,100.])
        self.assertEqual(p['status'], 'unavailable')
        self.assertEqual(p['solverStatus'], 2)

    def test_constraints_forbid_all_target_emission(self):
        p = centroid_bounds([[1.,0.],[0.,1.]], [0.,0.], [0.,0.], [1.,1.], [0.,100.])
        self.assertEqual(p['status'], 'unavailable')

    def test_real_optical_domain_boundaries(self):
        with self.assertRaises(ValueError):
            centroid_bounds([[1.,1.]], [-1.], [1.], [1.,1.], [0.,100.])
        with self.assertRaises(ValueError):
            centroid_bounds([[1.,1.]], [0.], [1.], [1.,0.], [0.,100.])
        with self.assertRaises(ValueError):
            centroid_bounds([[1.,1.]], [0.], [1.], [0.,0.], [0.,0.])
        with self.assertRaises(ValueError):
            centroid_bounds([[1.,1.]], [0.], [float('nan')], [1.,1.], [0.,100.])


if __name__ == '__main__':
    unittest.main()
