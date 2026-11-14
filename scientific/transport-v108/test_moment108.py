"""Diagnostic accounting controls only; execute in root-owned safe-dev guest."""
import unittest
import numpy as np
from force105 import SourceFlow
from heat106 import FVDiffusion
from diffusion86 import M_AR
from source_commutator107 import restrict
import moment108 as diagnostic


class MomentControls(unittest.TestCase):
    def setUp(self):
        z = [0., .08, .16, .24]
        self.fc = SourceFlow([0., .03, .06], z, [M_AR, M_AR], noSlipWalls=True)
        self.ff = SourceFlow([0., .015, .03, .045, .06], z, [M_AR, M_AR], noSlipWalls=True)
        f = self.ff; r = f.mean_r[None, :]; zz = np.mean([f.z[:-1], f.z[1:]], axis=0)[:, None]
        self.q = f.state(.001*(1+r/.06), 3000.+10000.*r/.06+1000.*zz/.24,
                         .2+.5*r/.06, 20000.*(1-r/.06), vr=2000.*r/.06, vz=-500.*zz/.24)

    def test_companion_preserves_restricted_thermal_and_momentum_but_reports_energy_change(self):
        fc, ff = self.fc, self.ff
        rq, qt, receipt = diagnostic.thermal_companion(fc, ff, self.q)
        np.testing.assert_array_equal(rq, restrict(fc, ff, self.q))
        np.testing.assert_array_equal(qt[[0, 1, 2, 3, 5]], rq[[0, 1, 2, 3, 5]])
        target = restrict(fc, ff, ff.primitive(self.q)['thermalJ'])
        np.testing.assert_allclose(fc.primitive(qt)['thermalJ'], target, rtol=2e-12, atol=0.)
        np.testing.assert_allclose(fc.primitive(qt)['pressurePa'], 2*target/(3*fc.volume), rtol=2e-12)
        kinetic_offset = (fc.primitive(rq)['kineticJ']
                          -restrict(fc, ff, ff.primitive(self.q)['kineticJ']))
        np.testing.assert_allclose(qt[4]-rq[4], kinetic_offset, rtol=2e-12, atol=1e-15)
        self.assertGreater(abs(receipt['energyOffsetJ']), 1e-9)
        self.assertAlmostEqual(receipt['energyOffsetJ'], float((qt[4]-rq[4]).sum()), places=15)

    def test_heat_difference_decomposition_and_stale_fine_cache(self):
        fc, ff = self.fc, self.ff
        dc, df = FVDiffusion(fc, 1.14e-4), FVDiffusion(ff, 1.14e-4)
        h = 1e-12
        cached = diagnostic.heat_response(ff, df, self.q, h)
        result = diagnostic.diagnose(fc, dc, ff, self.q, cached, h)
        self.assertLess(result['algebraMaximumAbsoluteWM3'], 1e-4)
        self.assertIn('Nonconservative', result['scope'])
        self.assertTrue(result['receipts']['companion']['inputBitwisePreserved'])
        cached[1]['dtS'] = 5e-13
        with self.assertRaises(ValueError):
            diagnostic.diagnose(fc, dc, ff, self.q, cached, h)
        cached[1]['dtS'] = h
        cached[1]['inputSHA256'] = '0'*64
        with self.assertRaises(ValueError):
            diagnostic.diagnose(fc, dc, ff, self.q, cached, h)

    def test_equal_level_has_no_restriction_thermalization_with_roundoff_budget(self):
        f = self.ff
        rq, qt, receipt = diagnostic.thermal_companion(f, f, self.q)
        np.testing.assert_allclose(qt, rq, rtol=2e-15, atol=0.)
        self.assertLess(abs(receipt['energyOffsetJ']), 2e-15*float(rq[4].sum()))


if __name__ == '__main__':
    unittest.main(verbosity=2)
