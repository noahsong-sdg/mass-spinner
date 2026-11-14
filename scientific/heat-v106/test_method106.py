"""Method admission and truthful output locations, not a second heat oracle."""
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from heat106 import FVDiffusion
from diffusion86 import M_AR
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'mixture-axial-v75'))
from flow import Flow


class MethodControls(unittest.TestCase):
    def flow(self):
        return Flow([0., .004, .018, .06], [0., .02, .08, .24], [M_AR, M_AR])

    def test_unsupported_or_nonphysical_conductivity_is_rejected(self):
        for coefficient in (0., -1., np.nan, np.inf, True, [1., 2.], lambda r, z: .1):
            with self.subTest(coefficient=str(coefficient)):
                with self.assertRaises(ValueError):
                    FVDiffusion(self.flow(), 1.14e-4, coefficient)

    def test_temperature_receipt_identifies_cells_and_actual_linear_residual(self):
        f = self.flow()
        d = FVDiffusion(f, 1.14e-4)
        q = f.state(.0002, 3000.+100.*f.mean_r/.06, .5, 0.)
        out, receipt = d.advance(q, 1e-8)
        self.assertEqual(receipt['temperatureTraceLocation'], 'finite-volume-cells')
        self.assertIn('FiPy', receipt['method'])
        self.assertEqual(receipt['temperatureTrace'].shape, (f.count,))
        np.testing.assert_allclose(receipt['temperatureTrace'],
            f.primitive(out)['temperatureK'].ravel(), rtol=2e-13, atol=0.)
        self.assertTrue(np.isfinite(receipt['thermalLinearResidualJ']))
        self.assertLess(receipt['thermalLinearResidualJ'], 1e-11*q[4].sum())
        self.assertLess(abs(receipt['thermalEnergyResidualJ']), 1e-11*q[4].sum())


if __name__ == '__main__':
    unittest.main()
