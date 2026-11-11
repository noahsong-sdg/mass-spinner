"""Physical wall-work and rigid-equilibrium controls using the actual TS bridge.

Run only in safe-dev. These are controlled numerical tests, not device data.
"""
import unittest
import numpy as np
from bridge import Bridge
from coupled import step
from thermal import Thermal


class WallWorkControls(unittest.TestCase):
    def setUp(self):
        self.r = np.array([0., .01, .027, .06])
        self.z = np.array([0., .02, .075, .14])
        nr, nz = len(self.r)-1, len(self.z)-1
        self.setup = dict(radialEdgesM=self.r.tolist(), axialEdgesM=self.z.tolist(),
                          sigmaPerpSM=[.03]*(nr*nz), sigmaParallelSM=[.3]*(nr*nz), magneticT=0.,
                          innerVoltageV=[None]*nz, outerVoltageV=[0.]*nz,
                          lowerVoltageV=[0.]*nr, upperVoltageV=[0.]*nr)

    def test_moving_endwall_supplies_kinetic_energy_and_physical_heat(self):
        dt = .002
        with Bridge(self.setup) as bridge:
            model = Thermal(self.r, self.z, [.06, .061, .063], .001, bridge,
                            contact_h=0., cooling_h=0.)
            result = step(model, bridge, 400., 0., dt, dict(outer=0., lower=0., upper=700.))
            temperature = np.array(result['temperatureK'])
            gas_heat = float(np.sum(model.energy(temperature, model.properties(temperature))[model.gas_indices]
                                    -model.energy(400., model.properties(400.))[model.gas_indices]))
        state = result['mechanical']
        wall_work = dt*state['boundaryPowerW']
        physical_heat = dt*sum(state['shearByCellW'])
        self.assertGreater(wall_work, 0.)
        self.assertGreater(result['deltaKineticJ'], 0.)
        self.assertGreater(gas_heat, 0.)
        self.assertGreater(state['numericalLossJ'], 0.)
        self.assertEqual(state['current']['jouleW'], 0.)
        self.assertEqual(state['current']['electrodePowerW'], 0.)
        self.assertEqual(result['bathOutW'], 0.)
        self.assertAlmostEqual(gas_heat, physical_heat, delta=1e-10)
        self.assertAlmostEqual(result['deltaKineticJ']+gas_heat+state['numericalLossJ'],
                               wall_work, delta=1e-10)
        np.testing.assert_allclose(temperature[model.solid_indices], 400., rtol=0, atol=1e-10)
        self.assertLess(abs(result['totalEnergyResidualJ']), 1e-10)

    def test_full_coupled_stress_free_rigid_equilibrium(self):
        with Bridge(self.setup) as bridge:
            model = Thermal(self.r, self.z, [.06, .061, .063], .001, bridge,
                            contact_h=0., cooling_h=0.)
            result = step(model, bridge, 400., 900., .002,
                          dict(outer=None, lower=None, upper=None))
        state = result['mechanical']
        np.testing.assert_allclose(state['omegaRadS'], 900., rtol=0, atol=2e-9)
        np.testing.assert_allclose(result['temperatureK'], 400., rtol=0, atol=1e-10)
        self.assertEqual(state['current']['jouleW'], 0.)
        self.assertEqual(state['boundaryPowerW'], 0.)
        self.assertLess(sum(state['shearByCellW']), 1e-22)
        self.assertLess(state['numericalLossJ'], 1e-24)
        self.assertLess(abs(result['deltaThermalJ']), 1e-10)
        self.assertLess(abs(result['totalEnergyResidualJ']), 1e-10)


if __name__ == '__main__':
    unittest.main()
