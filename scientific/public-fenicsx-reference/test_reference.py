import unittest
import numpy as np
from reference import M, FIELDS, solve, sample, notebook_cathode_current
import fem98


class MatchedPhysics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.field, cls.metrics = solve(1)

    def test_original_notebook_source_is_not_100_a(self):
        self.assertGreater(notebook_cathode_current(),6.9)
        self.assertLess(notebook_cathode_current(),7.2)

    def test_matched_assembly_conserves_work_and_source_torque(self):
        for k in ('linearResidualRelative','powerResidualRelative','torqueResidualRelative'):
            self.assertLess(self.metrics[k],1e-8,k)
        self.assertGreater(self.metrics['jouleW'],0)
        self.assertGreater(self.metrics['viscousW'],0)

    def test_independent_implementations_match_same_discrete_problem(self):
        old = fem98.solve(M,1,FIELDS)
        r = np.linspace(0,.06,41)
        np.testing.assert_allclose(sample(self.field,r,0),fem98.sample(old,r,0),rtol=1e-7,atol=1e-4)

    def test_current_reversal_and_zero_field(self):
        r = np.linspace(0,.06,21)
        reverse,_ = solve(1,current=-100.)
        np.testing.assert_allclose(sample(reverse,r,0),-sample(self.field,r,0),rtol=1e-8,atol=1e-4)
        zero,metrics = solve(1,magnetic=0.)
        np.testing.assert_allclose(sample(zero,r,0),0,atol=1e-10)
        self.assertEqual(metrics['viscousW'],0.)

    def test_invalid_mesh_and_drive_rejected(self):
        for n,I,B in [(3,100.,.13),(1,0.,.13),(1,100.,float('nan'))]:
            with self.assertRaises(ValueError):
                solve(n,I,B)


if __name__ == '__main__':
    unittest.main()
