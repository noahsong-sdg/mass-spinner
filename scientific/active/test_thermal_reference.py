import unittest

import numpy as np

from thermal_reference import enthalpy, properties, solve


class ThermalReferenceTests(unittest.TestCase):
    def test_uniform_insulated_equilibrium_and_energy(self):
        config = {
            "radiusM": 0.12,
            "lengthM": 0.8,
            "thicknessM": 0.005,
            "gasCapacityJK": 0.5,
            "initialGasK": 700,
            "initialWallK": 700,
            "gasPowerW": 0,
            "durationS": 0.1,
            "boundary": {"gasWallWK": 100, "coolingWK": 0, "coolantK": 500},
        }
        for method in ("Radau", "BDF"):
            y, residual = solve(config, 8, [0, 0.01, 0.1], method)
            np.testing.assert_allclose(y[:-1], 700, rtol=0, atol=1e-10)
            np.testing.assert_array_equal(y[-1], 0)
            self.assertLess(residual, 1e-10)

    def test_enthalpy_derivative_is_heat_capacity(self):
        t = np.array([400.0, 800.0, 1200.0, 1800.0])
        cp, conductivity = properties(t)
        np.testing.assert_allclose(
            (enthalpy(t + 0.001) - enthalpy(t - 0.001)) / 0.002, cp, rtol=1e-8
        )
        self.assertTrue(np.all(cp > 0) and np.all(conductivity > 0))
