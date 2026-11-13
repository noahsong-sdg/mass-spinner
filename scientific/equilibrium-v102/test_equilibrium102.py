import unittest
import numpy as np
from scipy.integrate import quad
from equilibrium102 import (Flow, KB, M_AR, OMEGA_RADS, TEMPERATURE_K,
    WALL_DENSITY_KGM3, initial_residual, mesh, projected_state, radial_moments,
    short_transient)


class EquilibriumControls(unittest.TestCase):
    def flow(self, n=1, kind='original'):
        return Flow(*mesh(n, kind), [M_AR, M_AR])

    def test_cylindrical_mass_and_inertia_moments_against_independent_quad(self):
        flow = self.flow()
        density, inertia = radial_moments(flow, OMEGA_RADS)
        a = OMEGA_RADS**2/(2*KB*TEMPERATURE_K/M_AR)
        for i, (lo, hi) in enumerate(zip(flow.r[:-1], flow.r[1:])):
            for power, actual in ((1, density[i]), (3, inertia[i])):
                expected = quad(lambda r: 2*r**power*WALL_DENSITY_KGM3*
                    np.exp(a*(r*r-flow.r[-1]**2)), lo, hi, epsabs=1e-20)[0]/(hi*hi-lo*lo)
                self.assertAlmostEqual(actual/expected, 1., places=13)

    def test_nonrotating_projections_coincide_and_remain_stationary(self):
        flow = self.flow()
        a = projected_state(flow, 0., 'native-primitives')
        b = projected_state(flow, 0., 'conservative-moments')
        np.testing.assert_allclose(a, b, rtol=5e-15, atol=0.)
        residual = initial_residual(flow, a)
        sound = np.max(flow.primitive(a)['soundMPS'])
        rate_bound = 1024*np.finfo(float).eps*WALL_DENSITY_KGM3/flow.stable_dt(a, .5)
        self.assertLess(residual['densityRateRMSKgM3S'], rate_bound)
        result = short_transient(flow, a)
        self.assertLess(result['relativeDensityChangeRMS'], 1024*np.finfo(float).eps)
        self.assertLess(result['radialSpeedRMSMPS'], 1024*np.finfo(float).eps*sound)

    def test_projection_contract_does_not_conflate_angular_momentum_with_omega(self):
        flow = self.flow()
        native = projected_state(flow, OMEGA_RADS, 'native-primitives')
        exact = projected_state(flow, OMEGA_RADS, 'conservative-moments')
        p = flow.primitive(native)
        np.testing.assert_allclose(p['omegaRadS'], OMEGA_RADS, rtol=3e-15)
        np.testing.assert_allclose(p['temperatureK'], TEMPERATURE_K, rtol=3e-15)
        density, inertia = radial_moments(flow, OMEGA_RADS)
        np.testing.assert_allclose(exact[0], flow.volume*density, rtol=3e-15)
        np.testing.assert_allclose(exact[3], flow.volume*inertia*OMEGA_RADS, rtol=3e-15)
        np.testing.assert_allclose(exact[4], flow.volume*(1.5*KB*TEMPERATURE_K*density/M_AR
            +.5*OMEGA_RADS**2*inertia), rtol=3e-15)
        self.assertGreater(np.max(abs(flow.primitive(exact)['omegaRadS']-OMEGA_RADS)), 1e-6)
        self.assertGreater(np.max(abs(flow.primitive(exact)['temperatureK']-TEMPERATURE_K)), 1e-8)

    def test_density_weighted_inertia_representation_error_contracts_under_refinement(self):
        for kind in ('original', 'smooth-source-aligned'):
            errors = []
            for n in (1, 2, 4):
                f = self.flow(n, kind)
                density, inertia = radial_moments(f, OMEGA_RADS)
                errors.append(np.max(abs(inertia-density*f.mean_r2)/inertia))
            self.assertGreater(errors[0], errors[1])
            self.assertGreater(errors[1], errors[2])


if __name__ == '__main__':
    unittest.main()
