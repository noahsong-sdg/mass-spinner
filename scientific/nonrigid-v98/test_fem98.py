import unittest
import numpy as np
from skfem import LinearForm, asm
from fem98 import solve, sample, chords

M = dict(branchCurrentA=100., magneticT=.13, radiusM=.06, halfLengthM=.24,
         cathodeRadiusM=.004, anodeCenterM=.07)
FIELDS = dict(viscosity=1.14e-4, conductivity_shape=1., beta_field=3.)


class PhysicsControls(unittest.TestCase):
    def test_exact_current_free_rigid_corotation_operator(self):
        a = solve(M, 1, FIELDS)
        op = a['operators']
        r = a['basis'].doflocs[0]
        phi = .5*M['magneticT']*1234.*r*r
        omega = np.full_like(r, 1234.)
        electric = op['electric']@phi+op['coupling']@omega
        angular = op['coupling'].T@phi+(op['shear']+op['motional'])@omega
        self.assertLess(np.max(abs(electric)), 1e-10)
        self.assertLess(np.max(abs(angular)), 1e-10)

    def test_independent_manufactured_viscous_pde(self):
        a = solve(M, 1, FIELDS)
        R, L, mu = M['radiusM'], M['halfLengthM'], FIELDS['viscosity']
        r, z = a['basis'].doflocs
        exact = (1-r*r/R**2)*(1-z*z/L**2)
        @LinearForm
        def force(v, w):
            r, z = w.x
            return 2*np.pi*mu*r**3*(8/R**2*(1-z*z/L**2)+2/L**2*(1-r*r/R**2))*v
        residual = a['operators']['shear']@exact-asm(force, a['basis'])
        free = (r < R-1e-14) & (z < L-1e-14)
        self.assertLess(np.max(abs(residual[free])), 1e-14)

    def test_current_and_field_reversal_gauge_and_passivity(self):
        a = solve(M, 1, FIELDS)
        r = np.linspace(0, .06, 41)
        for key in ('chargeResidualRelative', 'momentumResidualRelative', 'linearResidualRelative',
                    'powerResidualRelative', 'torqueResidualRelative', 'wallTorqueResidualRelative'):
            self.assertLess(a[key], 1e-8, key)
        self.assertGreater(a['jouleW'], 0)
        self.assertGreater(a['viscousW'], 0)
        for kwargs in ({'current': -100.}, {'magnetic': -.13}):
            b = solve(M, 1, FIELDS, **kwargs)
            np.testing.assert_allclose(sample(b, r, 0), -sample(a, r, 0), rtol=1e-10, atol=1e-7)
        b = solve(M, 1, FIELDS, gauge=123.)
        np.testing.assert_array_equal(b['omega'], a['omega'])
        np.testing.assert_allclose(b['potential']-a['potential'], 123., atol=1e-10)
        self.assertEqual(sample(a, .06, 0), 0.)
        b = solve(M, 1, FIELDS, current=200.)
        np.testing.assert_allclose(b['omega'], 2*a['omega'], rtol=1e-10, atol=1e-7)
        self.assertAlmostEqual(b['viscousW']/a['viscousW'], 4., places=9)

    def test_sampling_batches_preserve_coordinates_and_values(self):
        a = solve(M, 1, FIELDS)
        r = np.linspace(0, .06, 257)
        expected = np.asarray(a['basis'].probes(np.vstack((r, r*0)))@a['omega'])
        np.testing.assert_array_equal(sample(a, r, 0), expected)

    def test_zero_field_cannot_drive_rotation(self):
        a = solve(M, 1, FIELDS, magnetic=0.)
        np.testing.assert_array_equal(a['omega'], 0.)
        self.assertEqual(a['viscousW'], 0.)

    def test_measurement_operator_exact_for_rigid_rotation(self):
        a = solve(M, 1, FIELDS)
        a['omega'][:] = 1234.
        b = np.array([0., .01, .03, .05])
        np.testing.assert_allclose(chords(a, b, .06), b*1234, rtol=1e-13, atol=1e-12)
        with self.assertRaises(ValueError):
            chords(a, [.06], .06)


if __name__ == '__main__':
    unittest.main()
