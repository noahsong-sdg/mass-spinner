"""Fresh stock-FiPy versus reusable dependency-tracked workspace controls."""
import unittest
import numpy as np
from bridge import Bridge
from coupled import Stepper, mechanical, step
from thermal import Thermal


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.r = np.array([0., .01, .027, .06])
        self.z = np.array([0., .02, .075, .14])
        self.rho = np.linspace(.001, .0015, 9)
        self.walls = dict(outer=0., lower=0., upper=300.)
        self.electrical = dict(radialEdgesM=self.r.tolist(), axialEdgesM=self.z.tolist(),
            sigmaPerpSM=[.03]*9, sigmaParallelSM=[.3]*9, magneticT=.2,
            innerVoltageV=[None]*3, outerVoltageV=[.5, 1., .5],
            lowerVoltageV=[0.]*3, upperVoltageV=[0.]*3)

    def thermal(self, bridge):
        return Thermal(self.r, self.z, [.06, .061, .063], self.rho, bridge)

    def compare_mechanical(self, a, b):
        for field in ('omegaRadS', 'shearByCellW'):
            np.testing.assert_allclose(a[field], b[field], rtol=2e-11, atol=1e-13)
        for field in ('kineticJ', 'shearHeatW', 'numericalLossJ', 'bodyPowerW', 'boundaryPowerW'):
            self.assertAlmostEqual(a[field], b[field], delta=2e-12*max(abs(b[field]), 1e-6))
        for wall in self.walls:
            self.assertAlmostEqual(a['boundaryTorqueNm'][wall], b['boundaryTorqueNm'][wall], delta=1e-15)
        np.testing.assert_allclose(a['current']['torqueNm'], b['current']['torqueNm'], rtol=2e-10, atol=1e-16)

    def test_viscosity_updates_and_successive_old_states_match_fresh_stock(self):
        low, high = np.geomspace(2e-5, 5e-5, 9), np.geomspace(8e-5, 3e-5, 9)
        old = np.linspace(100., 900., 9)
        with Bridge(self.electrical) as bridge:
            thermal = self.thermal(bridge)
            workspace = Stepper(thermal, bridge, self.walls)
            geometry = workspace.model.mesh
            for viscosity, dt in ((low, .002), (high, .001), (low, .003)):
                reference = mechanical(bridge, self.r, self.z, self.rho, viscosity, old, dt, self.walls)
                reused = workspace.mechanical(viscosity, old, dt)
                self.compare_mechanical(reused, reference)
                self.assertIs(workspace.model.mesh, geometry)
                old = np.array(reference['omegaRadS'])
            before = workspace.mechanical(low, old, .002)
            workspace.mechanical(high, old, .002)
            after = workspace.mechanical(low, old, .002)
            self.compare_mechanical(after, before)
            for invalid in (0., -1., np.nan):
                with self.assertRaises(ValueError):
                    workspace.mechanical(invalid, old, .002)

    def test_full_trajectory_workspace_matches_fresh_endpoints(self):
        with Bridge(self.electrical) as bridge:
            thermal = self.thermal(bridge)
            workspace = Stepper(thermal, bridge, self.walls)
            temperature = np.full(thermal.count, 400.)
            temperature[thermal.solid_indices] = 650.
            omega = np.full(thermal.ng, 900.)
            for dt in (.0001, .0002):
                fresh = step(self.thermal(bridge), bridge, temperature, omega, dt, self.walls)
                reused = workspace.step(temperature, omega, dt)
                np.testing.assert_allclose(reused['temperatureK'], fresh['temperatureK'], rtol=0, atol=2e-8)
                self.compare_mechanical(reused['mechanical'], fresh['mechanical'])
                self.assertLess(abs(reused['totalEnergyResidualJ']), 1e-10)
                temperature = np.array(fresh['temperatureK'])
                omega = np.array(fresh['mechanical']['omegaRadS'])


if __name__ == '__main__':
    unittest.main()
