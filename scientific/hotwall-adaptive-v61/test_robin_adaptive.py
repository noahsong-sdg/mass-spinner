"""Independent finite-wall oracle regression controls; execute in safe-dev."""
import importlib.util
import math
from pathlib import Path
import unittest

import numpy as np


DIRECTORY = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('robin_adaptive_oracle', DIRECTORY / 'robin-adaptive.py')
ROBIN = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ROBIN)


class AdaptiveRobinTests(unittest.TestCase):
    def test_conductance_interval_contains_independent_polynomial_values(self):
        lower, upper = ROBIN.effective_film_bounds(.12, .8, .001, 16, .1, 999.9993, 1000.0002)
        geometry = math.log(math.sqrt(.12 * (.12 + .001 / 16)) / .12) / (2 * math.pi * .8)
        for temperature in np.linspace(999.9993, 1000.0002, 31):
            conductivity = (149.441 - .045466 * temperature + 13.193e-6 * temperature**2
                            - 1.484e-9 * temperature**3 + 3.866e6 / temperature**2)
            actual = 1 / (10 + geometry / conductivity)
            self.assertLessEqual(lower, actual)
            self.assertGreaterEqual(upper, actual)
        self.assertLess(upper, .1)  # finite solid resistance is retained
        for low, high in ((299, 1000), (1000, 1901), (1001, 1000)):
            with self.assertRaisesRegex(ValueError, '300–1900 K'):
                ROBIN.effective_film_bounds(.12, .8, .001, 16, .1, low, high)

    def test_bracket_contains_intermediate_robin_solution_and_flux(self):
        constants = {'radiusM': .12, 'lengthM': .8, 'number': 1e20,
                     'initialK': 500, 'wallK': 1000, 'conductivityWMK': .1,
                     'gasWallWK': .1, 'wallThicknessM': .001}
        times = np.array([0, 1e-7, 1e-5, .002, .02])
        bracket = ROBIN.continuum_bracket(constants, 16, 16, times, 999.9993, 1000)
        middle = ROBIN.ORACLE.reference({**constants, 'wallK': 999.99965}, 16, times, 1024,
                                       film=(bracket['filmLowWK'] + bracket['filmHighWK']) / 2)
        self.assertTrue(np.all(middle['temperatureK'] >= bracket['temperatureLowK']))
        self.assertTrue(np.all(middle['temperatureK'] <= bracket['temperatureHighK']))
        self.assertTrue(np.all(middle['heatJ'] >= bracket['heatLowJ']))
        self.assertTrue(np.all(middle['heatJ'] <= bracket['heatHighJ']))
        self.assertTrue(np.all(middle['fluxW'] >= bracket['fluxLowW']))
        self.assertTrue(np.all(middle['fluxW'] <= bracket['fluxHighW']))
        # A boundary bracket must remain separate from discretization error.
        profile = bracket['temperatureHighK'] + .2
        error = ROBIN.worst_case_error(profile, bracket['temperatureLowK'], bracket['temperatureHighK'])
        self.assertGreater(float(np.max(error)), .1)

    @staticmethod
    def control():
        return {
            'config': {'currentA': 0, 'radialDiffusivityM2S': 1e-30, 'linerK': 1000, 'gasK': 500},
            'operation': {'events': [], 'thermal': {'coolingWK': 0, 'gas': {'conductivityWMK': .1},
                                                   'spatial': {'material': 'tungsten'}}},
            'record': {'cells': 2, 'minWallInnerK': 999.9993, 'maxWallInnerK': 1000,
                       'maxPhysicalGasSourceJ': 0, 'maxFrozenInventoryDifference': 0},
            'arrays': {'lightMass': np.full((3, 2), .5), 'heavyMass': np.full((3, 2), .5),
                       'wallInnerK': np.array([1000, 1000, 999.9993]),
                       'gasEnergyJ': np.array([1., 1.00001, 1.1]),
                       'wallHeatJ': np.array([0., .00001, .1])},
            'times': np.array([0, 1e-7, .02]),
            'samples': [{'slipDissipationJ': 0, 'ohmicEnergyJ': 0, 'redistributionWorkJ': 0,
                         'ionRadS': 0, 'neutralRadS': 0} for _ in range(3)],
        }

    def test_control_rejects_hidden_sources_inventory_changes_and_bad_wall_bounds(self):
        ROBIN.audit_control(self.control())
        case = self.control()
        case['operation']['thermal']['spatial']['material'] = 'copper'
        with self.assertRaisesRegex(ValueError, 'tungsten material'):
            ROBIN.audit_control(case)
        for field, value in (('maxPhysicalGasSourceJ', 1e-8),
                             ('maxFrozenInventoryDifference', 1e-8),
                             ('maxFrozenInventoryDifference', 1e-16),
                             ('minWallInnerK', 999.9999)):
            case = self.control()
            case['record'][field] = value
            with self.assertRaises(ValueError):
                ROBIN.audit_control(case)
        case = self.control()
        case['arrays']['lightMass'][1, 0] += 1e-16
        with self.assertRaisesRegex(ValueError, 'uniform and frozen'):
            ROBIN.audit_control(case)
        case = self.control()
        case['samples'][1]['ohmicEnergyJ'] = 1e-8
        with self.assertRaisesRegex(ValueError, 'non-wall heating'):
            ROBIN.audit_control(case)
        case = self.control()
        case['arrays']['wallHeatJ'][-1] += 1e-6
        with self.assertRaisesRegex(ValueError, 'signed wall heat'):
            ROBIN.audit_control(case)

    def test_masked_metrics_report_unassessed(self):
        result = ROBIN.metric(np.array([0., 0.]), np.array([0., .02]), np.array([False, False]))
        self.assertFalse(result['assessed'])
        self.assertIsNone(result['value'])


if __name__ == '__main__':
    unittest.main()
