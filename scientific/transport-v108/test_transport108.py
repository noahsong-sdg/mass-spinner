import unittest
import numpy as np
from force105 import SourceFlow
from heat106 import FVDiffusion
from diffusion86 import M_AR
from source_response107 import STEPS
import transport108 as diagnostic


class SplitControls(unittest.TestCase):
    def setUp(self):
        self.f = SourceFlow([0., .004, .016, .028, .045, .06],
            [0., .06, .08, .15, .22, .24], [M_AR]*2, noSlipWalls=True)
        self.d = FVDiffusion(self.f, 1.14e-4)

    def test_actual_ordered_stages_reconstruct_energy_and_native_invariants(self):
        f = self.f
        q = f.state(.001, 3000.+30000.*(f.mean_r > .028), .5, 2000., 20., -3.)
        for dt in STEPS:
            fields, checks = diagnostic.split(f, self.d, q, dt)
            self.assertLess(checks['maximumEnergyReconstructionJ'], 1e-18)
            self.assertLess(checks['maximumStressThermalIdentityJ'], 1e-15)
            self.assertGreater(fields['viscousHeatWM3'].sum(), 0.)
            np.testing.assert_allclose(fields['combinedPressureRatePaS'],
                fields['stressPressureRatePaS']+fields['conductionPressureRatePaS'], rtol=3e-15, atol=1e-8)

    def test_heat_only_state_has_no_stress_response(self):
        q = self.f.state(.001, 3000.+30000.*(self.f.mean_r > .028), .5, 0.)
        fields, _ = diagnostic.split(self.f, self.d, q, STEPS[0])
        for name in ('stressRadialForceNM3', 'stressAxialForceNM3', 'stressTorqueNmM3',
                     'stressEnergyWM3', 'viscousHeatWM3', 'numericalHeatWM3'):
            np.testing.assert_array_equal(fields[name], 0.)
        np.testing.assert_array_equal(fields['orderedConductionWM3'], fields['incomingConductionWM3'])
        self.assertGreater(np.max(abs(fields['orderedConductionWM3'])), 1.)

    def test_equal_level_common_input_and_cache_seal(self):
        q = self.f.state(.001, 3000., .5, 2000., 20., -3.)
        cached = diagnostic.split(self.f, self.d, q, STEPS[0])
        out = diagnostic.compare(self.f, self.d, q, self.f, q, cached, STEPS[0])
        for region in out['regionalTerms']['restrictionCommutator'].values():
            for field in region['fields'].values():
                self.assertLess(field['maximumAbsolute'], 1e-5)
        cached[1]['inputSHA256'] = '0'*64
        with self.assertRaises(ValueError):
            diagnostic.compare(self.f, self.d, q, self.f, q, cached, STEPS[0])


if __name__ == '__main__':
    unittest.main()
