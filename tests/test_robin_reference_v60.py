"""Independent Robin-reference checks. Execute with SciPy inside safe-dev only."""
from copy import deepcopy
import importlib.util
import math
from pathlib import Path
import unittest

import numpy as np
from scipy.integrate import quad
from scipy.special import j0, j1

PATH = Path(__file__).resolve().parents[1] / 'scientific/hotwall-boundary-v60/robin-reference.py'
SPEC = importlib.util.spec_from_file_location('robin_reference_v60', PATH)
ROBIN = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ROBIN)

CONSTANTS = {'radiusM': .12, 'lengthM': .8, 'number': 10 * math.pi * .12**2 * .8 / (ROBIN.KB * 500),
             'initialK': 500., 'wallK': 1000., 'conductivityWMK': .1,
             'gasWallWK': .1, 'wallThicknessM': .001}


class RobinReferenceTests(unittest.TestCase):
    def test_modes_satisfy_physical_robin_condition_and_annulus_integral(self):
        biot = CONSTANTS['gasWallWK'] / (2 * math.pi * CONSTANTS['lengthM'] * CONSTANTS['conductivityWMK'])
        modes = ROBIN.roots(biot, 16)
        self.assertLess(float(np.max(np.abs(modes * j1(modes) - biot * j0(modes)))), 2e-12)
        self.assertTrue(np.all(np.diff(modes) > 0))
        for mu in modes[[0, 3, 15]]:
            for a, b in [(0., math.sqrt(1 / 64)), (math.sqrt(63 / 64), 1.)]:
                numerical = 2 * quad(lambda r: r * j0(mu * r), a, b, epsabs=1e-13)[0] / (b*b - a*a)
                analytic = 2 * (b * j1(mu * b) - a * j1(mu * a)) / (mu * (b*b - a*a))
                self.assertAlmostEqual(numerical, analytic, delta=2e-13)

    def test_continuum_absorbed_energy_derivative_is_physical_boundary_flux(self):
        cv = 1.5 * ROBIN.KB * CONSTANTS['number']
        for time in [1e-7, 1e-5, .001, .02]:
            epsilon = time * 1e-3
            value = ROBIN.reference(CONSTANTS, 64, [time-epsilon, time, time+epsilon], 1024)
            derivative = (value['heatJ'][2] - value['heatJ'][0]) / (2 * epsilon)
            self.assertAlmostEqual(derivative, value['fluxW'][1], delta=2e-5)
            integrated = cv * (value['temperatureK'][1].mean() - CONSTANTS['initialK'])
            self.assertAlmostEqual(integrated, value['heatJ'][1], delta=2e-13)
            self.assertGreater(value['surfaceK'][1], CONSTANTS['initialK'])
            self.assertLess(value['surfaceK'][1], CONSTANTS['wallK'])

    def test_oracle_rejects_corrupted_energy_and_interface_flux(self):
        cells, wall_cells = 64, 16
        exact = ROBIN.reference(CONSTANTS, cells, [1e-7, 1e-5], 1024)
        wall, r, length = CONSTANTS['wallK'], CONSTANTS['radiusM'], CONSTANTS['lengthM']
        wall_k = 149.441-.045466*wall+13.193e-6*wall**2-1.484e-9*wall**3+3.866e6/wall**2
        wall_r = math.log(math.sqrt(r * (r + .001 / wall_cells)) / r) / (2 * math.pi * length * wall_k)
        resistance = 1 / CONSTANTS['gasWallWK'] + wall_r + 1 / (8 * math.pi * length * .1 * cells)
        cv = 1.5 * ROBIN.KB * CONSTANTS['number']
        states = [{'timeS': t, 'temperatureK': values.tolist(), 'gasEnergyJ': float(cv * values.mean()),
                   'wallFluxW': float((wall-values[-1]) / resistance)}
                  for t, values in zip([1e-7, 1e-5], exact['temperatureK'])]
        case = {'cells': cells, 'wallCells': wall_cells, 'steps': 512,
                'maximumWallDeviationK': 0., 'states': states}
        result = ROBIN.analyze_case(CONSTANTS, case)
        self.assertEqual(result['metrics']['profileAbsoluteK']['value'], 0.)
        corrupted = deepcopy(case)
        corrupted['states'][0]['gasEnergyJ'] *= 1.01
        with self.assertRaisesRegex(ValueError, 'energy'):
            ROBIN.analyze_case(CONSTANTS, corrupted)
        corrupted = deepcopy(case)
        corrupted['states'][0]['wallFluxW'] *= 1.01
        with self.assertRaisesRegex(ValueError, 'flux'):
            ROBIN.analyze_case(CONSTANTS, corrupted)


if __name__ == '__main__':
    unittest.main()
