import math
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import numpy as np
from torsion import Torsion


class TorsionTests(unittest.TestCase):
    def test_rigid_rotation_exact_inertia_variable_properties(self):
        r, z = [0, .003, .01, .06], [0, .01, .05, .14]
        density = np.linspace(.001, .003, 9)
        model = Torsion(r, z, density, np.linspace(.00005, .0003, 9), outer=None)
        result = model.step(37, 0, .001)
        expected_inertia = [math.pi*density[j*3+i]*(z[j+1]-z[j])*(r[i+1]**4-r[i]**4)/2
                            for j in range(3) for i in range(3)]
        np.testing.assert_allclose(model.inertia, expected_inertia, rtol=1e-14)
        np.testing.assert_allclose(result['omegaRadS'], 37, atol=1e-10)
        self.assertAlmostEqual(result['angularMomentumKgM2S'], 37*sum(expected_inertia), places=15)
        self.assertLess(result['shearHeatW'], 1e-20)

    def test_rotating_walls_and_body_torque_have_separate_work(self):
        model = Torsion([0, .02, .04, .06], [0, .03, .08, .14],
                        np.linspace(.001, .002, 9), np.linspace(.00005, .0002, 9),
                        outer=20, lower=20, upper=20)
        result = model.step(0, np.linspace(0, .00001, 9), .0002)
        self.assertGreater(result['boundaryPowerW'], 0)
        self.assertGreater(result['bodyPowerW'], 0)
        self.assertGreater(result['shearHeatW'], 0)
        self.assertGreater(result['numericalLossJ'], 0)
        self.assertLess(abs(result['energyResidualJ']), 1e-12)
        self.assertLess(abs(result['momentumResidualKgM2S']), 1e-12)

    def test_axial_face_weight_preserves_uniform_radial_mode(self):
        nr, nz, radius, length = 4, 16, .06, .14
        dt, nu = .001, .1
        z = (np.arange(nz)+.5)*length/nz
        initial = np.repeat(np.cos(math.pi*z/length), nr)
        model = Torsion(np.linspace(0, radius, nr+1), np.linspace(0, length, nz+1),
                        .001, .0001, outer=None)
        result = model.step(initial, 0, dt)
        eigenvalue = 4*nu/(length/nz)**2*math.sin(math.pi/(2*nz))**2
        np.testing.assert_allclose(result['omegaRadS'], initial/(1+dt*eigenvalue), atol=1e-11)

    def test_stress_free_ends_retain_radial_solution(self):
        nr, nz, radius = 16, 4, .06
        r, z = np.linspace(0, radius, nr+1), np.linspace(0, .14, nz+1)
        # Omega=1-r²/R² has radial diffusion -8mu/R².
        torque = np.tile(4*math.pi*.0001*np.diff(z)[0]*(r[1:]**4-r[:-1]**4)/radius**2, nz)
        model = Torsion(r, z, .001, .0001)
        field = np.array(model.steady(torque)['omegaRadS']).reshape(nz, nr)
        np.testing.assert_allclose(field, np.tile(field[0], (nz, 1)), atol=1e-12)
        np.testing.assert_allclose(field[0], 1-((r[:-1]+r[1:])/2/radius)**2, atol=.003)

    def test_invalid_and_nonfinite_derived_states(self):
        for r, rho, mu in [([.001, .02, .06], .001, .0001),
                            ([0, .02, .01], .001, .0001),
                            ([0, .02, .06], -1, .0001),
                            ([0, .02, .06], .001, math.nan)]:
            with self.assertRaises(ValueError):
                Torsion(r, [0, .02, .14], rho, mu)
        model = Torsion([0, .02, .06], [0, .02, .14], .001, .0001, outer=None)
        with self.assertRaises(ValueError):
            model.steady(0)
        for dt in [0, -1, math.nan, True]:
            with self.assertRaises(ValueError):
                model.step(0, 0, dt)
        with self.assertRaises(ArithmeticError):
            model.step(1e200, 0, .001)

    def test_independent_report_gates_and_corruption(self):
        from independent_check import check
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder)/'report.json'
            run = subprocess.run([sys.executable, str(Path(__file__).with_name('run_report.py')), str(output)],
                                 text=True, capture_output=True)
            self.assertEqual(run.returncode, 0, run.stdout+run.stderr)
            self.assertTrue(check(output)['independentCheckPassed'])
            original = json.loads(output.read_text())
            mutants = []
            for name in ['matchedExperimentalValidation', 'liveChanged']:
                mutant = copy.deepcopy(original)
                mutant[name] = True
                mutants.append(mutant)
            mutant = copy.deepcopy(original)
            mutant['cases'][-1]['result']['omegaRadS'][0] += .01
            mutants.append(mutant)
            mutant = copy.deepcopy(original)
            mutant['cases'][0]['input']['walls']['lower'] = None
            mutants.append(mutant)
            mutant = copy.deepcopy(original)
            mutant['sourcesSHA256']['torsion.py'] = '0'*64
            mutants.append(mutant)
            mutant = copy.deepcopy(original)
            mutant['schemaVersion'] = 0
            mutants.append(mutant)
            for mutant in mutants:
                output.write_text(json.dumps(mutant))
                with self.assertRaises(ValueError):
                    check(output)


if __name__ == '__main__':
    unittest.main()
