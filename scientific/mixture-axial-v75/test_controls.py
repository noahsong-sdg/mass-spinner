import unittest
import numpy as np
from controls import model, acoustic_initial, rotating_initial, evolve, MASSES, KB
from test_flow import stationary_arithmetic_scale


class AnalyticControlsTests(unittest.TestCase):
    def test_acoustic_initial_cell_average_and_zero_velocity(self):
        flow = model(6)
        q, exact = acoustic_initial(flow)
        p = flow.primitive(q)
        np.testing.assert_allclose(p['pressurePa'],
                                   exact['p0']*(1+1e-5*exact['cosine'][:, None])*np.ones((1, 6)), rtol=2e-15)
        np.testing.assert_array_equal(p['vrMPS'], 0)
        np.testing.assert_array_equal(p['vzMPS'], 0)

    def test_rotating_initial_is_exact_volume_average(self):
        flow = model(6)
        q = rotating_initial(flow)
        rho1, rho2 = q[5]/flow.volume, (q[0]-q[5])/flow.volume
        for rho, mass, axis in ((rho1, MASSES[0], .0004), (rho2, MASSES[1], .0006)):
            beta = mass*900**2/(2*KB*350)
            expected_total = axis*np.pi*.14*np.expm1(beta*.06**2)/beta
            self.assertAlmostEqual(float(np.sum(rho*flow.volume))/expected_total, 1., places=14)
        np.testing.assert_allclose(flow.primitive(q)['omegaRadS'], 900., rtol=2e-15)

    def test_cold_equilibrium_remains_stationary_with_closed_ledgers(self):
        flow = model(6)
        q = flow.state(.001, 350., .4, 0.)
        out, steps, ledgers = evolve(flow, q, time=5e-6)
        self.assertGreater(steps, 0)
        rounding = 128*np.finfo(float).eps
        scale = stationary_arithmetic_scale(flow, q)
        self.assertTrue(np.all(abs(out-q) <= rounding*(abs(out)+abs(q)+5e-6*scale)))
        p = flow.primitive(out)
        self.assertLess(max(np.max(abs(p['vrMPS'])), np.max(abs(p['vzMPS']))),
                        rounding*np.max(p['soundMPS']))
        self.assertLess(max(ledgers.values()), 1e-12)


if __name__ == '__main__':
    unittest.main()
