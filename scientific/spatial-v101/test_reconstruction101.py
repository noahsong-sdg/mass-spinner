import unittest
import numpy as np
from reconstruction101 import Flow, M_AR, KB, analytic_faces, mesh, moments, phase_zero, quadratic_average_slope


class ReconstructionControls(unittest.TestCase):
    def test_production_reconstruction_is_exact_for_linear_fv_averages(self):
        for kind in ('original', 'smooth-source-aligned'):
            f = Flow(*mesh(1, kind), [M_AR, M_AR])
            for axis in (1, 2):
                result = analytic_faces(f, axis, 1)
                self.assertLess(result['maximumRelativeFaceError'], 2e-14)
                self.assertLess(result['maximumRelativeFaceJump'], 2e-14)

    def test_three_average_derivative_uses_cylindrical_and_axial_moments(self):
        f = Flow(*mesh(1, 'original'), [M_AR, M_AR])
        for axis in (1, 2):
            mean, second, _ = moments(f, axis)
            average = 3.+4.*mean+5.*second
            np.testing.assert_allclose(quadratic_average_slope(average, mean, second),
                                       4.+10.*mean[1:-1], rtol=2e-12, atol=2e-12)

    def test_point_derivative_is_not_an_average_derivative_on_abrupt_grading(self):
        f = Flow(*mesh(1, 'original'), [M_AR, M_AR])
        mean, second, _ = moments(f, 1)
        average = second
        hl, hr = np.diff(mean)[:-1], np.diff(mean)[1:]
        dl, dr = np.diff(average)[:-1]/hl, np.diff(average)[1:]/hr
        point_derivative = (hr*dl+hl*dr)/(hl+hr)
        self.assertGreater(np.max(abs(point_derivative-2*mean[1:-1])), 1e-4)

    def test_smooth_geometry_is_nested_monotone_and_preserves_physical_contacts(self):
        previous = None
        for n in (1, 2, 4):
            r, z = mesh(n, 'smooth-source-aligned')
            self.assertTrue(np.all(np.diff(r) > 0))
            self.assertTrue(np.all(np.diff(z) > 0))
            # Geometric refinement must not create an endpoint cell O(n^-2).
            self.assertGreater(r[1]*n, .0008)
            self.assertGreater((z[-1]-z[-2])*n, .0015)
            for value in (0., .004, .05, .06):
                self.assertLess(np.min(abs(r-value)), 1e-16)
            for value in (0., .06, .08, .24):
                self.assertLess(np.min(abs(z-value)), 1e-16)
            if previous is not None:
                np.testing.assert_array_equal(r[::2], previous[0])
                np.testing.assert_array_equal(z[::2], previous[1])
            previous = r, z

    def test_phase_zero_uniform_pressure_control_stays_at_arithmetic_scale(self):
        f = Flow(*mesh(1, 'original'), [M_AR, M_AR])
        rho = .001*(1+f.mean_r/.06)
        pressure = 100.*(1+f.mean_r/.06)
        report = phase_zero(f, np.array([rho, pressure]), True)
        constant_pressure = float(np.sum(f.volume*pressure)/f.volume.sum())
        q = f.state(rho, constant_pressure*M_AR/(rho*KB), .5, 0.)
        rate_bound = 512*np.finfo(float).eps*np.max(rho)/f.stable_dt(q, .5)
        self.assertLess(report['densityRateRMSKgM3S'], rate_bound)
        flux_bound = 512*np.finfo(float).eps*np.max(rho)*np.max(f.primitive(q)['soundMPS'])*max(
            np.max(f.radial_area), np.max(f.axial_area))
        self.assertLess(report['maximumFaceMassFluxKgS'], flux_bound)


if __name__ == '__main__':
    unittest.main()
