"""Regression for metadata reduction roundoff; parent executes in safe-dev."""
from functools import reduce
import importlib.util
import math
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('independent_coupled_checker', Path(__file__).parents[1]/'current-v66'/'check_coupled.py')
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class CoupledScaleArithmeticTests(unittest.TestCase):
    def test_cancelled_sequential_and_fsum_storage_reductions_have_explicit_allowance(self):
        old = {'gasEnergyJ': [1., 1.], 'linerEnergyJ': [10000.]+[0.]*31}
        new = {'gasEnergyJ': [1., 1.], 'linerEnergyJ': [10000.]+[1e-12]*31}
        sequential = lambda values: reduce(lambda a, b: a+b, values, 0.)
        dynamic = .01+abs(math.fsum(new['linerEnergyJ'])-math.fsum(old['linerEnergyJ']))
        declared = .01+abs(sequential(new['linerEnergyJ'])-sequential(old['linerEnergyJ']))
        self.assertGreater(abs(declared-dynamic), checker.TOL*dynamic)
        with self.assertRaises(ValueError):
            checker.Checks().check(declared, dynamic, 'old relative-only metadata comparison', dynamic)
        allowance = checker.dynamic_scale_roundoff(old, new, dynamic)
        checker.Checks().check(declared, dynamic, 'declared dynamic energy scale', dynamic, allowance)
        self.assertLess(allowance, 1e-8)

    def test_arithmetic_allowance_never_substitutes_background_for_dynamic_scale(self):
        old = {'gasEnergyJ': [1., 1.], 'linerEnergyJ': [10000.]*128}
        new = {'gasEnergyJ': [1., 1.], 'linerEnergyJ': [10000.]*128}
        dynamic = .014
        allowance = checker.dynamic_scale_roundoff(old, new, dynamic)
        with self.assertRaises(ValueError):
            checker.Checks().check(100*dynamic+1, dynamic, 'corrupt declared dynamic scale', dynamic, allowance)
        self.assertLess(allowance, 1e-6)

    def test_stiff_face_temperature_quantization_is_separate_from_stored_energy(self):
        # Actual r32-z4-g32-t128-q step74, first solid row, from packet
        # SHA256 1f10da5bc046cd149a024177e2e5c78c2536003e69e5b920c4e16ac4b44f2af2.
        old, new, dt = 15.295859672679098, 15.295859603007521, .00000909423828125
        left, right = 1199.99894318317, 1199.9989559802161
        center_l, edge, center_r = .010000488269329652, .0100009765625, .010002441298987825
        k_l, k_r = checker.solid(left)[1], checker.solid(right)[1]
        dt_g = dt*2*math.pi*.1/(math.log(edge/center_l)/k_l+math.log(center_r/edge)/k_r)
        incoming = -.00004275867357367268
        outgoing = dt_g*(left-right)
        change, expected = new-old, incoming-outgoing
        dynamic = abs(change)+abs(incoming)+abs(outgoing)
        storage = 64*checker.EPS*(abs(old)+abs(new))
        with self.assertRaises(ValueError):
            checker.Checks().check(change, expected, 'old storage-only row', dynamic, storage)
        face = checker.conductive_flux_roundoff(dt_g, left, right)
        checker.Checks().check(change, expected, 'quantized stiff row', dynamic, storage+face)
        self.assertGreater(face, abs(change-expected))
        self.assertLess(face, 1e-10)
        self.assertEqual(checker.conductive_flux_roundoff(0., 1200., 1200.), 0.)
        self.assertAlmostEqual(checker.conductive_flux_roundoff(2*dt_g, left, right), 2*face)

    def test_face_roundoff_bound_does_not_hide_injected_physical_energy(self):
        face = checker.conductive_flux_roundoff(4., 1200., 1200.+1.28e-5)
        with self.assertRaises(ValueError):
            checker.Checks().check(1e-5, 0., 'injected solid heat', 8.5517347e-5, 4.3473448e-13+face)


if __name__ == '__main__':
    unittest.main()
