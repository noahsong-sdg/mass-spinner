"""Exercise actual-FiPy legacy and explicit annuli; safe-dev reference venv only."""
from pathlib import Path
import importlib.util
import unittest

path = Path(__file__).resolve().parents[1]/'scientific/thermal-v53/reference-fipy.py'
spec = importlib.util.spec_from_file_location('graded_reference', path)
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)


class FiPyGrids(unittest.TestCase):
    def test_legacy_nonbinary_uniform_width_is_still_accepted(self):
        config = {'radiusM': .12, 'lengthM': .5, 'thicknessM': .1, 'cells': 3,
                  'gasCapacityJK': .000678584, 'gasWallWK': 1000.,
                  'coolingWK': 1., 'coolantK': 500.}
        case = {'name': 'legacy-nonbinary-uniform', 'config': config,
                'initial': {'gasK': 500., 'wallK': [1000.]*3},
                'steps': [{'dtS': 1e-8, 'gasEnergyJ': 0., 'linerEnergyJ': 0.}]}
        result = reference.run_case(case)
        self.assertLess(result['maximumNonlinearResidual'], 1e-11)
        self.assertTrue(500 < result['states'][0]['gasK'] < 1000)


if __name__ == '__main__':
    unittest.main()
