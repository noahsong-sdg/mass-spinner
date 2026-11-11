"""Prospective independent-reference controls; no experimental targets."""
import json
from pathlib import Path
import unittest

import numpy as np

from reference import solve


class ReferenceControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads(Path(__file__).with_name('manifest.json').read_text())
        cls.base = solve(cls.manifest, 3, 1000., 18.5, 1)

    def test_balances_and_passivity(self):
        state = self.base
        self.assertGreater(state['branchCurrentA'], 0)
        self.assertGreater(state['jouleW'], 0)
        self.assertGreater(state['shearW'], 0)
        for key in ('chargeResidualRelative', 'momentumResidualRelative',
                    'powerResidualRelative', 'torqueResidualRelative'):
            self.assertLess(state[key], 1e-8, key)

    def test_zero_magnetic_field_has_no_rotation(self):
        state = solve({**self.manifest, 'magneticT': 0.}, 3, 1000., 18.5, 1)
        np.testing.assert_allclose(state['velocityMS'], 0., atol=1e-10)
        self.assertAlmostEqual(state['electrodePowerW'], state['jouleW'], places=8)

    def test_magnetic_reversal(self):
        state = solve({**self.manifest, 'magneticT': -self.manifest['magneticT']},
                      3, 1000., 18.5, 1)
        np.testing.assert_allclose(state['velocityMS'], -np.array(self.base['velocityMS']),
                                   rtol=1e-9, atol=1e-8)
        np.testing.assert_allclose(state['potentialV'], self.base['potentialV'], rtol=1e-9)
        self.assertAlmostEqual(state['branchCurrentA']/self.base['branchCurrentA'], 1., places=9)

    def test_voltage_reversal_and_linearity(self):
        for factor in (-1., 2.):
            state = solve(self.manifest, 3, 1000., 18.5*factor, 1)
            np.testing.assert_allclose(state['velocityMS'], factor*np.array(self.base['velocityMS']),
                                       rtol=1e-9, atol=1e-8)
            self.assertAlmostEqual(state['electrodePowerW']/self.base['electrodePowerW'],
                                   factor**2, places=9)

    def test_no_experimental_velocity_input(self):
        state = solve({**self.manifest, 'measuredVelocityMS': [1e100, -1e100]},
                      3, 1000., 18.5, 1)
        self.assertEqual(state, self.base)


if __name__ == '__main__':
    unittest.main()
