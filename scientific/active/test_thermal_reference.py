import unittest

import numpy as np

from thermal_reference import enthalpy, properties, solve


class ThermalReferenceTests(unittest.TestCase):
    def test_uniform_insulated_equilibrium_and_energy(self):
        config = {"radiusM": .12, "lengthM": .8, "thicknessM": .005,
                  "gasCapacityJK": .5, "initialGasK": 700, "initialWallK": 700,
                  "gasPowerW": 0, "durationS": .1,
                  "boundary": {"gasWallWK": 100, "coolingWK": 0, "coolantK": 500}}
        for method in ("Radau", "BDF"):
            y, residual = solve(config, 8, [0, .01, .1], method)
            np.testing.assert_allclose(y[:-1], 700, rtol=0, atol=1e-10)
            np.testing.assert_array_equal(y[-1], 0)
            self.assertLess(residual, 1e-10)

    def test_enthalpy_derivative_is_heat_capacity(self):
        t = np.array([400., 800., 1200., 1800.])
        cp, conductivity = properties(t)
        np.testing.assert_allclose((enthalpy(t+.001)-enthalpy(t-.001))/.002, cp, rtol=1e-8)
        self.assertTrue(np.all(cp > 0) and np.all(conductivity > 0))
