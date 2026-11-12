"""Independent geometry and analytic checks; execute only inside safe-dev."""
import unittest

import numpy as np
from scipy.special import erf

from emissivity import optical_grid, path_matrix, reconstruct


class EmissivityControls(unittest.TestCase):
    def test_uniform_volume_emission_and_signed_chords(self):
        radius = .06
        b, edges = optical_grid(radius, 64)
        projection = path_matrix(b, edges)@np.ones(len(b))
        np.testing.assert_allclose(projection, 2*np.sqrt(radius**2-b**2), rtol=2e-14)
        np.testing.assert_array_equal(path_matrix(-b, edges), path_matrix(b, edges))
        np.testing.assert_array_equal(path_matrix([radius, radius+.01], edges), np.zeros((2, 64)))
        result = reconstruct(b, projection, radius, 64, 'linear')
        np.testing.assert_allclose(result['emissivity'], 1., rtol=1e-8, atol=1e-8)
        self.assertLess(max(abs(result['originalResidualRelative'])), 1e-10)
        self.assertLess(max(abs(result['gridResidualRelative'])), 1e-10)

    def test_analytic_finite_radius_gaussian(self):
        radius, sigma = .06, .012
        b, _ = optical_grid(radius, 128)
        projection = np.sqrt(np.pi)*sigma*np.exp(-(b/sigma)**2) \
            * erf(np.sqrt(radius**2-b*b)/sigma)
        recovered = reconstruct(b, projection, radius, 128, 'sqrt')['emissivity']
        self.assertLess(max(abs(recovered-np.exp(-(b/sigma)**2))), .005)

    def test_flat_chord_brightness_means_edge_enhanced_emissivity(self):
        radius = .06
        errors = []
        for n in (64, 128, 256):
            b, _ = optical_grid(radius, n)
            result = reconstruct(b, np.ones(n), radius, n, 'linear')
            analytical = 1/(np.pi*np.sqrt(radius**2-b*b))
            interior = b < .8*radius
            errors.append(max(abs(result['emissivity'][interior]/analytical[interior]-1)))
            self.assertGreater(result['emissivity'][-1], result['emissivity'][0]*3)
            self.assertLess(max(abs(result['gridResidualRelative'])), 1e-9)
        self.assertLess(errors[-1], .03)
        self.assertLess(errors[-1], errors[0])

    def test_brightness_scaling_preserves_relative_distribution(self):
        b, y = np.array([0., .02, .04, .055]), np.array([1., .92, .74, .36])
        for closure in ('linear', 'sqrt'):
            a = reconstruct(b, y, .06, 64, closure)
            c = reconstruct(b, 7*y, .06, 64, closure)
            np.testing.assert_allclose(c['emissivity'], 7*a['emissivity'], rtol=1e-8, atol=1e-8)
            np.testing.assert_allclose(c['originalResidualRelative'], a['originalResidualRelative'], atol=1e-10)

    def test_declared_axis_and_edge_continuations(self):
        b, y = [.01, .03, .05], [1., 1., .6]
        linear = reconstruct(b, y, .06, 64, 'linear')
        root = reconstruct(b, y, .06, 64, 'sqrt')
        self.assertTrue(linear['axisConstantContinuation'])
        self.assertEqual(linear['interpolatedBrightness'][0], 1.)
        mask = linear['radialCentersM'] > .05
        self.assertTrue(np.all(root['interpolatedBrightness'][mask] > linear['interpolatedBrightness'][mask]))

    def test_nonphysical_brightness_is_rejected_not_clipped(self):
        for b, y in (([0., .02], [1., -1.]), ([0., .02], [0., 0.]),
                     ([0., .02], [1., np.nan]), ([.02, .02], [1., 1.]),
                     ([-.01, .02], [1., 1.]), ([0., .07], [1., 1.])):
            with self.assertRaises(ValueError):
                reconstruct(b, y, .06, 64, 'linear')
        with self.assertRaises(ValueError):
            reconstruct([0., .02], [1., .8], .06, 64, 'selected-from-velocity')
        with self.assertRaises(ValueError):
            path_matrix([np.nan], [0., .03, .06])


if __name__ == '__main__':
    unittest.main()
