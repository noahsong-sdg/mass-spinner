"""Production magnetic stage versus analytic relaxation and independent audit."""
from copy import deepcopy
import unittest
import numpy as np
from flow import Flow
from independent import check_magnetic
from magnetic import advance


class MagneticTests(unittest.TestCase):
    def setUp(self):
        masses = [36*1.66053906892e-27, 40*1.66053906892e-27]
        self.flow = Flow([0., .02, .06], [0., .04, .14], masses)
        self.setup = dict(r=self.flow.r.tolist(), z=self.flow.z.tolist(), masses=masses,
                          electrical=dict(sigmaPerpSM=[.03]*4, magneticT=.2))
        self.q = self.flow.state([[.001, .002], [.003, .004]], 350., .4, 900.,
                                 [[2., -3.], [4., -5.]], 3.)

    def run_stage(self, dt, magnetic=None):
        setup = deepcopy(self.setup)
        if magnetic is not None:
            setup['electrical']['magneticT'] = magnetic
        sigma = np.array(setup['electrical']['sigmaPerpSM']).reshape(2, 2)
        out, receipt = advance(self.flow, self.q, dt, sigma, setup['electrical']['magneticT'])
        check_magnetic(setup, self.q, out, dt, receipt)
        return out, receipt

    def test_analytic_density_dependent_decay_and_heating(self):
        dt = .02
        out, receipt = self.run_stage(dt)
        exponent = .03*.2**2*dt/self.flow.primitive(self.q)['densityKgM3']
        np.testing.assert_allclose(out[1]/self.q[1], np.exp(-exponent), rtol=2e-15)
        before, after = self.flow.primitive(self.q), self.flow.primitive(out)
        np.testing.assert_allclose(after['thermalJ']-before['thermalJ'], receipt['jouleByCellJ'], rtol=2e-8)
        np.testing.assert_array_equal(out[[0, 2, 3, 4, 5]], self.q[[0, 2, 3, 4, 5]])
        self.assertGreater(receipt['jouleJ'], 0.)

    def test_zero_and_reversed_field(self):
        zero, zero_receipt = self.run_stage(.02, magnetic=0.)
        np.testing.assert_array_equal(zero, self.q)
        self.assertEqual(zero_receipt['jouleJ'], 0.)
        forward, heat = self.run_stage(.02, magnetic=.2)
        reverse, reverse_heat = self.run_stage(.02, magnetic=-.2)
        np.testing.assert_array_equal(forward, reverse)
        self.assertEqual(heat, reverse_heat)

    def test_sub_ulp_momentum_loss_still_has_positive_heat(self):
        out, receipt = self.run_stage(1e-20)
        np.testing.assert_array_equal(out, self.q)
        self.assertGreater(receipt['jouleJ'], 0.)
        expected = np.sum(self.q[1]**2/self.q[0]*.03*.2**2*1e-20
                          /self.flow.primitive(self.q)['densityKgM3'])
        self.assertAlmostEqual(receipt['jouleJ']/expected, 1., delta=3e-15)

    def test_corrupt_receipts_and_conserved_fields_rejected(self):
        out, receipt = self.run_stage(.02)
        for key in ('jouleJ', 'externalWorkJ', 'angularImpulseKgM2S'):
            with self.subTest(key=key):
                bad = deepcopy(receipt)
                bad[key] += 1.
                with self.assertRaises(AssertionError):
                    check_magnetic(self.setup, self.q, out, .02, bad)
        bad = deepcopy(receipt)
        bad['jouleByCellJ'][0][0] += 1.
        with self.assertRaisesRegex(AssertionError, 'heat mismatch'):
            check_magnetic(self.setup, self.q, out, .02, bad)
        bad = out.copy()
        bad[4, 0, 0] += 1e-8
        with self.assertRaisesRegex(AssertionError, 'conserved field'):
            check_magnetic(self.setup, self.q, bad, .02, receipt)
        bad = out.copy()
        bad[1, 0, 0] *= .99
        with self.assertRaisesRegex(AssertionError, 'decay mismatch'):
            check_magnetic(self.setup, self.q, bad, .02, receipt)


if __name__ == '__main__':
    unittest.main()
