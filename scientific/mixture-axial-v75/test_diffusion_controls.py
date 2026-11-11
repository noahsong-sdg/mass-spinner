import json
import unittest
from unittest.mock import patch
import numpy as np
import diffusion_controls as controls


class AnalyticalDiffusionControls(unittest.TestCase):
    def test_tagged_mode_and_closed_ledgers(self):
        row = controls.tagged(6)
        self.assertGreater(row['steps'], 0)
        self.assertGreater(row['diffusivityM2S'], 0.)
        self.assertLess(row['normalizedRms'], .02)
        self.assertLess(max(row['relativeLedgerResidual'].values()), 1e-10)

    def test_binary_rotating_residual_is_finite_and_no_extra_body_drift(self):
        row = controls.rotating(6)
        self.assertTrue(np.isfinite(row['normalizedMaxSpeciesDensityRate']))
        self.assertGreaterEqual(row['normalizedMaxSpeciesDensityRate'], 0.)
        self.assertLess(row['rotationInvariantNormalizedFlux'], 512*np.finfo(float).eps)

    def test_frozen_inputs_and_reference_scale(self):
        self.assertEqual(controls.MESHES, (6, 12, 24, 48, 96))
        self.assertEqual(controls.TIME, 4e-4)
        flow = controls.model(6, [36*controls.U, 40*controls.U])
        state = flow.primitive(controls.rotating_initial(flow))
        np.testing.assert_allclose(state['temperatureK'], 350., rtol=3e-15)
        np.testing.assert_allclose(state['omegaRadS'], 900., rtol=3e-15)

    def test_complete_report_is_strict_json_serializable(self):
        # Exercise actual gate construction without repeating the costly PDE
        # studies. NumPy's epsilon makes a comparison return np.bool_, which
        # the artifact JSON boundary cannot encode unless explicitly converted.
        tagged = lambda n: dict(n=n, normalizedRms=1e-4/n, relativeLedgerResidual={'mass': 0.})
        rotating = lambda n: dict(n=n, normalizedMaxSpeciesDensityRate=1e-4/n,
                                  rotationInvariantNormalizedFlux=0.)
        with patch.object(controls, 'tagged', side_effect=tagged), patch.object(controls, 'rotating', side_effect=rotating):
            report = controls.run()
        encoded = json.dumps(report, allow_nan=False)
        self.assertTrue(json.loads(encoded)['passed'])
        self.assertTrue(all(type(gate['passed']) is bool for gate in report['gates']))


if __name__ == '__main__':
    unittest.main()
