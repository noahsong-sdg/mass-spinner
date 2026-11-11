import unittest
import numpy as np
from wall_resolution import control, exact_torque, wall_edges


class EndwallResolution(unittest.TestCase):
    def test_grid_preserves_domain_symmetry_and_resolves_both_walls(self):
        z = wall_edges(48, .14, 2.5)
        self.assertEqual(z[0], 0.)
        self.assertEqual(z[-1], .14)
        np.testing.assert_allclose(z+z[::-1], .14, atol=3e-17, rtol=0)
        self.assertLess(np.diff(z).min(), .00022)

    def test_graded_grid_resolves_gradient_that_uniform_grid_misses(self):
        uniform, graded = control(96, 0.), control(96, 2.5)
        self.assertGreater(uniform['cases'][0]['relativeError'], .2)
        self.assertLess(max(c['relativeError'] for c in graded['cases']), .01)

    def test_fourier_wall_torque_has_correct_decay_sign_and_long_time_limit(self):
        # At long times only the independently known first sine term remains.
        from wall_resolution import R, L, RHO, MU, OMEGA
        t = .5
        first = -np.pi*MU*R**4/2*OMEGA*8/(3*L)*np.exp(-MU/RHO*(np.pi/L)**2*t)
        self.assertAlmostEqual(exact_torque(t)/first, 1., delta=1e-6)
        self.assertLess(exact_torque(10e-6), 0.)


if __name__ == '__main__':
    unittest.main()
