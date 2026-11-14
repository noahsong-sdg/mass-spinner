"""Actual E/FiPy split controls on a small graded cylindrical mesh."""
import unittest
import numpy as np
from force105 import SourceFlow
from heat106 import FVDiffusion
from electro86 import Electro
import source_response107 as diagnostic

M_AR = 39.948*1.66053906660e-27


class SourceControls(unittest.TestCase):
    def setUp(self):
        self.f = SourceFlow(np.array([0., .004, .016, .028, .045, .06]),
            np.array([0., .06, .08, .15, .22, .24]), [M_AR]*2, noSlipWalls=True)

    def test_region_intersections_and_constant_field(self):
        for bounds in diagnostic.BOUNDS.values():
            a, b, c, d = bounds
            weights = diagnostic.region_volumes(self.f, bounds)
            self.assertAlmostEqual(weights.sum(), np.pi*(b*b-a*a)*(d-c), places=16)
        stats = diagnostic.statistics(self.f, {'signed': -np.ones(self.f.volume.shape)*3})
        for region in stats.values():
            self.assertAlmostEqual(region['fields']['signed']['mean'], -3.)
            self.assertAlmostEqual(region['fields']['signed']['rms'], 3.)

    def test_em_work_heat_and_exact_invariants(self):
        f = self.f
        e = Electro(f, 100., 30., 2000., .1, 10.)
        q = f.state(.001, 3000., .5, 2000., 20., -3.)
        for dt in diagnostic.STEPS:
            fields, checks = diagnostic.response(f, e, q, dt, 'electromagnetic')
            self.assertTrue(checks['massSpeciesBitwisePreserved'])
            np.testing.assert_array_equal(fields['axialVelocityRateMPS2'], 0.)
            self.assertGreater(checks['signedEnergyRatesW']['jouleByCellJ'], 0.)
            self.assertGreater(checks['signedEnergyRatesW']['BEdefectByCellJ'], 0.)
            self.assertLess(checks['maximumThermalIdentityResidualJ'], 1e-15)
            self.assertLess(checks['maximumTotalEnergyIdentityResidualJ'], 1e-15)
            self.assertLess(checks['maximumPressureIdentityResidualPa'], 1e-9)
            self.assertLess(checks['chargeResidualA'], 1e-10)

    def test_uniform_quiescent_diffusion_is_null(self):
        f = self.f; d = FVDiffusion(f, 1.14e-4)
        q = f.state(.001, 3000., .5, 0.)
        fields, checks = diagnostic.response(f, d, q, diagnostic.STEPS[0], 'stressHeat')
        self.assertLess(checks['maximumThermalIdentityResidualJ'], 1e-15)
        for key in ('viscousHeatPowerWM3', 'numericalHeatPowerWM3',
                    'radialVelocityRateMPS2', 'axialVelocityRateMPS2', 'omegaRateRadS2'):
            np.testing.assert_array_equal(fields[key], 0.)
        self.assertLess(abs(checks['thermalEnergyResidualJ']), 1e-15)

    def test_actual_fipy_heat_moves_hot_to_cold_conservatively(self):
        f = self.f; d = FVDiffusion(f, 1.14e-4)
        temperature = np.broadcast_to(3000.+30000.*(f.mean_r > .028), f.volume.shape)
        q = f.state(.001, temperature, .5, 0.)
        fields, checks = diagnostic.response(f, d, q, diagnostic.STEPS[0], 'stressHeat')
        heat = fields['thermalRedistributionPowerWM3']*f.volume
        # At a picosecond only the cells adjacent to the step change above roundoff.
        self.assertLess(heat[:, -2].sum(), 0.)
        self.assertGreater(heat[:, -3].sum(), 0.)
        self.assertLess(abs(checks['thermalEnergyResidualJ']), 1e-14)
        np.testing.assert_array_equal(fields['radialVelocityRateMPS2'], 0.)
        self.assertLess(checks['maximumThermalIdentityResidualJ'], 1e-15)
        self.assertGreater(checks['minimumTemperatureK'], 0.)

    def test_stress_heat_identity_with_nonzero_flow(self):
        f = self.f; d = FVDiffusion(f, 1.14e-4)
        q = f.state(.001, 3000., .5, 2000., 20., -3.)
        _, checks = diagnostic.response(f, d, q, diagnostic.STEPS[0], 'stressHeat')
        self.assertGreater(checks['signedEnergyRatesW']['viscousHeatJ'], 0.)
        self.assertGreater(checks['signedEnergyRatesW']['numericalHeatJ'], 0.)
        self.assertLess(checks['maximumThermalIdentityResidualJ'], 1e-15)
        self.assertLess(checks['maximumTotalEnergyIdentityResidualJ'], 1e-15)


if __name__ == '__main__':
    unittest.main()
