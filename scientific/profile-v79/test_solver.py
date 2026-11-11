"""Independent invariants for the electrically conditioned profile challenge.

Run only inside safe-dev. These controls verify implementation, not experiments.
"""
from copy import deepcopy
import json
from pathlib import Path
import unittest

import numpy as np

from solver import calibrate, grid, observe, solve


class SolverControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m = json.loads(Path(__file__).with_name('manifest.json').read_text())
        cls.beta, cls.sigma, cls.voltage = 3., 1000., cls.m['bulkVoltageV']
        cls.base = solve(cls.m, cls.beta, cls.sigma, cls.voltage, 1)

    def assert_close(self, actual, expected):
        scale = max(float(np.max(np.abs(expected))), np.finfo(float).tiny)
        np.testing.assert_allclose(actual, expected, rtol=2e-9, atol=2e-10*scale)

    def test_mesh_resolves_fixed_electrode_edges(self):
        r, z = grid(self.m, 1)
        self.assertEqual(len(r)-1, 32)
        self.assertEqual(len(z)-1, 48)
        for edge in (0., self.m['cathodeRadiusM'], self.m['radiusM']):
            self.assertTrue(np.any(np.isclose(r, edge, rtol=0, atol=1e-14)))
        for edge in (0., self.m['anodeCenterM']-self.m['anodeWidthM']/2,
                     self.m['anodeCenterM']+self.m['anodeWidthM']/2,
                     self.m['halfLengthM']):
            self.assertTrue(np.any(np.isclose(z, edge, rtol=0, atol=1e-14)))

    def test_nonzero_drive_closes_charge_torque_and_power(self):
        p = self.base
        self.assertGreater(p['currentsA']['cathode'], 0)
        self.assertLess(p['currentsA']['anode'], 0)
        self.assertGreater(p['electrodePowerW'], 0)
        self.assertGreater(p['jouleW'], 0)
        self.assertGreater(p['viscousW'], 0)
        self.assertGreater(float(np.max(np.abs(p['omega']))), 0)
        for field in ('chargeResidualRelative', 'boundaryResidualRelative',
                      'powerResidualRelative', 'angularResidualRelative',
                      'linearResidualRelative'):
            self.assertTrue(np.isfinite(p[field]), field)
            self.assertLess(p[field], 1e-8, field)
        self.assertAlmostEqual(p['electrodePowerW'],
                               p['jouleW']+p['viscousW'],
                               delta=1e-8*p['electrodePowerW'])

    def test_zero_field_keeps_electric_current_but_removes_rotation(self):
        p = solve(self.m, self.beta, self.sigma, self.voltage, 1, magnetic=0.)
        np.testing.assert_array_equal(p['omega'], np.zeros_like(p['omega']))
        self.assertGreater(p['currentsA']['cathode'], 0)
        self.assertEqual(p['viscousW'], 0.)
        self.assertAlmostEqual(p['electrodePowerW'], p['jouleW'],
                               delta=1e-8*p['electrodePowerW'])

    def test_reversing_field_reverses_rotation_not_charge_or_dissipation(self):
        p = solve(self.m, self.beta, self.sigma, self.voltage, 1,
                  magnetic=-self.m['magneticT'])
        self.assert_close(p['omega'], -self.base['omega'])
        self.assert_close(p['potential'], self.base['potential'])
        for field in ('electrodePowerW', 'jouleW', 'viscousW'):
            self.assert_close(np.array(p[field]), np.array(self.base[field]))
        for electrode in ('cathode', 'anode'):
            self.assert_close(np.array(p['currentsA'][electrode]),
                              np.array(self.base['currentsA'][electrode]))

    def test_voltage_reversal_and_scaling_are_linear(self):
        for factor in (-1., 2.):
            p = solve(self.m, self.beta, self.sigma, factor*self.voltage, 1)
            self.assert_close(p['omega'], factor*self.base['omega'])
            self.assert_close(p['potential'], factor*self.base['potential'])
            for electrode in ('cathode', 'anode'):
                self.assert_close(np.array(p['currentsA'][electrode]),
                                  np.array(factor*self.base['currentsA'][electrode]))
            for field in ('electrodePowerW', 'jouleW', 'viscousW'):
                self.assert_close(np.array(p[field]),
                                  np.array(factor**2*self.base[field]))

    def test_solid_body_observation_is_signed_omega_times_chord(self):
        r, z = grid(self.m, 1)
        omega = 7123.
        result = {'r': r, 'omega': np.full((len(z)-1, len(r)-1), omega)}
        chords = [-.0599, -.045, -.004, 0., .004, .045, .0599]
        self.assert_close(np.array(observe(result, chords)), omega*np.array(chords))
        for chord in (self.m['radiusM'], -self.m['radiusM'], float('nan')):
            with self.assertRaises(ValueError):
                observe(result, [chord])

    def test_electrical_conditioning_ignores_target_velocity_mutation(self):
        first = deepcopy(self.m)
        second = deepcopy(self.m)
        first['heldOutVelocityMS'] = [1., 2., 3.]
        second['heldOutVelocityMS'] = [1e8, -17., 0.]
        sigma_a, a = calibrate(first, self.beta, self.voltage, 1)
        sigma_b, b = calibrate(second, self.beta, self.voltage, 1)
        self.assertEqual(sigma_a, sigma_b)
        self.assertEqual(a['omega'].tobytes(), b['omega'].tobytes())
        self.assertEqual(a['potential'].tobytes(), b['potential'].tobytes())
        self.assertEqual(observe(a, self.m['chordsM']), observe(b, self.m['chordsM']))
        self.assertAlmostEqual(a['currentsA']['cathode'], self.m['branchCurrentA'],
                               delta=1e-6*self.m['branchCurrentA'])

    def test_unbracketed_electrical_condition_is_unavailable(self):
        with self.assertRaises(ValueError):
            calibrate(self.m, self.beta, 0., 1)


if __name__ == '__main__':
    unittest.main()
