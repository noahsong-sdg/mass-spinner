import unittest
from native98 import solver_log, solver_settings


class NativeAdmission(unittest.TestCase):
    def test_final_correction_is_distinct_from_capped_intermediate(self):
        row = solver_log('Time = 1e-8s\nDICPCG: Solving for p, Initial residual = 1e-3, '
                         'Final residual = 3e-11, No Iterations 1000\n'
                         'DICPCG: Solving for p, Initial residual = 3e-11, '
                         'Final residual = 9e-15, No Iterations 300\n')
        self.assertEqual(row['iterationCapCount'], 1)
        self.assertEqual(row['maxFinalPressureResidual'], 9e-15)
        self.assertEqual(row['finalPressureCorrectionCount'], 1)

    def test_coupled_uses_vector_tolerances_and_preserves_pressure(self):
        p = 'p {solver PCG; preconditioner DIC; tolerance 1e-14; relTol 0;}'
        u = 'U {solver smoothSolver; smoother symGaussSeidel; tolerance 1e-14; relTol 0;}'
        changed = solver_settings(p + u, 'coupled-U')
        self.assertTrue(changed.startswith(p))
        self.assertIn('type coupled;', changed)
        self.assertIn('tolerance (1e-14 1e-14 1e-14)', changed)
        with self.assertRaises(ValueError):
            solver_settings(p + u + u, 'coupled-U')

    def test_unknown_and_stale_configurations_rejected(self):
        with self.assertRaises(ValueError):
            solver_settings('', 'tuned')
        with self.assertRaises(ValueError):
            solver_settings('p {solver PCG; tolerance 1e-9;}', 'GAMG-p')
        with self.assertRaises(ValueError):
            solver_log('Solving for p, Initial residual = 1, Final residual = 0, No Iterations 1')


if __name__ == '__main__':
    unittest.main()
