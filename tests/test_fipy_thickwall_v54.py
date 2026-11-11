"""Actual FiPy regression; execute with the offline thermal reference venv."""
from pathlib import Path
import importlib.util
import math
import unittest

path=Path(__file__).resolve().parents[1]/'scientific/thermal-v53/reference-fipy.py'
spec=importlib.util.spec_from_file_location('thickwall_reference',path)
reference=importlib.util.module_from_spec(spec);spec.loader.exec_module(reference)


class ThickWallFiPy(unittest.TestCase):
    def test_original_low_inventory_thick_wall_converges_without_relaxing_gate(self):
        config={'radiusM':.12,'lengthM':.5,'thicknessM':.012,'cells':16,
                'gasCapacityJK':1.5*10*math.pi*.12**2*.5/500,
                'gasWallWK':1000.,'coolingWK':1.,'coolantK':500.}
        case={'name':'original-thickwall-regression','config':config,
              'initial':{'gasK':500.,'wallK':[1000.]*16},
              'steps':[{'dtS':1/512,'gasEnergyJ':0.,'linerEnergyJ':0.} for _ in range(5)]}
        result=reference.run_case(case)
        self.assertEqual(len(result['states']),5)
        self.assertLess(result['maximumNonlinearResidual'],1e-11)
        self.assertLess(result['maximumRelativeEnergyBalance'],1e-9)
        self.assertGreater(result['states'][0]['gasK'],999.)
        for state in result['states']:
            self.assertTrue(all(500.<=v<=1000. for v in [state['gasK'],*state['wallK']]))


if __name__=='__main__':unittest.main()
