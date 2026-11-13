"""Independent strain integrals and conservation controls; run in safe-dev."""
from pathlib import Path
import sys
import unittest
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'mixture-axial-v75'))
from flow import Flow
from diffusion86 import Diffusion, KB, M_AR, argon_conductivity


class DiffusionControls(unittest.TestCase):
    def setUp(self):
        self.f = Flow(np.linspace(0, .06, 5), np.linspace(0, .14, 6), [M_AR, M_AR])
        self.mu = 1.14e-4
        self.d = Diffusion(self.f, self.mu)

    def nodal(self, ur, uz, omega):
        x = np.zeros(self.d.velocity.N)
        r, z = self.d.mesh.p
        for component, value in enumerate((ur(r, z), uz(r, z), omega(r, z))):
            x[self.d.velocity.nodal_dofs[component]] = np.broadcast_to(value, r.shape)
        return x

    def test_uniform_translation_rotation_and_dilation_have_zero_strain_work(self):
        for ur, uz, om in ((lambda r,z: 0*r, lambda r,z: 3+0*r, lambda r,z: 0*r),
                          (lambda r,z: 0*r, lambda r,z: 0*r, lambda r,z: 7+0*r),
                          (lambda r,z: r, lambda r,z: z, lambda r,z: 0*r)):
            x = self.nodal(ur, uz, om)
            self.assertLess(np.sum(self.d.dissipation_cells(x)), 1e-24)
            self.assertLess(np.max(abs(self.d.stiffness@x)), 1e-15)

    def test_exact_divergence_free_extensional_stress_and_variable_mu(self):
        # ur=a*r, uz=-2*a*z: trace(S)=0, dev(S):dev(S)=6*a².
        a, b, c = 2., 3., 4.
        x = self.nodal(lambda r,z:a*r, lambda r,z:-2*a*z, lambda r,z:0*r)
        volume = np.pi*self.f.r[-1]**2*(self.f.z[-1]-self.f.z[0])
        expected = 12*self.mu*a*a*volume
        self.assertAlmostEqual(np.sum(self.d.dissipation_cells(x))/expected, 1., places=12)
        self.assertAlmostEqual(float(x@(self.d.stiffness@x))/expected, 1., places=12)
        variable = Diffusion(self.f, lambda r,z:self.mu*(1+b*r+c*z), conductivity=.1)
        mean_factor = 1+b*2*self.f.r[-1]/3+c*self.f.z[-1]/2
        self.assertAlmostEqual(float(x@(variable.stiffness@x))/(expected*mean_factor), 1., places=12)

    def test_linear_omega_has_exact_cylindrical_shear(self):
        # Omega=a*r+b*z gives physical shear density mu*r²*(a²+b²).
        a, b = 2., 3.
        x = self.nodal(lambda r,z:0*r, lambda r,z:0*r, lambda r,z:a*r+b*z)
        expected = self.mu*(a*a+b*b)*np.pi*self.f.r[-1]**4*self.f.z[-1]/2
        self.assertAlmostEqual(np.sum(self.d.dissipation_cells(x))/expected, 1., places=12)

    def test_graded_cells_receive_exact_linear_omega_heat(self):
        # Constitutive manufactured field, including nonzero boundary traces.
        # A correct global integral alone cannot detect misplaced local heat.
        f = Flow([0., .0008, .003, .014, .04, .06],
                 [0., .0004, .007, .032, .08, .14], [M_AR, M_AR])
        d = Diffusion(f, self.mu)
        a, b = 2., 3.
        x = np.zeros(d.velocity.N)
        r, z = d.mesh.p
        x[d.velocity.nodal_dofs[2]] = a*r+b*z
        actual = d.dissipation_cells(x).reshape(f.nz, f.nr)
        expected = (self.mu*(a*a+b*b)*np.pi/2
                    *np.diff(f.z)[:, None]*np.diff(f.r**4)[None, :])
        np.testing.assert_allclose(actual, expected, rtol=2e-12, atol=0.)

    def test_graded_hoop_strain_heat_matches_stiffness_work(self):
        # Q1 ur/r has rational integrands off-axis. Dissipation and stiffness
        # must use the same quadrature, including when FV faces split elements.
        f = Flow([0., .0008, .003, .014, .04, .06],
                 [0., .0004, .007, .032, .08, .14], [M_AR, M_AR])
        d = Diffusion(f, self.mu)
        r, z = d.mesh.p
        x = np.zeros(d.velocity.N)
        x[d.velocity.nodal_dofs[0]] = r*(.06-r)*(1+z/.14)
        x[d.velocity.nodal_dofs[1]] = z*(.14-z)*(1+r/.06)
        heat = d.dissipation_cells(x)
        self.assertTrue(np.all(heat >= 0))
        work = float(x@(d.stiffness@x))
        self.assertGreater(work, 0.)
        self.assertAlmostEqual(float(heat.sum())/work, 1., places=12)

    def test_stiffness_symmetry_positive_mechanical_and_constant_heat_nullspace(self):
        k = self.d.stiffness
        self.assertLess(np.max(abs((k-k.T).data), initial=0.), 1e-15)
        self.assertGreater(np.min(np.linalg.eigvalsh(k[self.d.free][:, self.d.free].toarray())), 0.)
        self.assertLess(np.max(abs(self.d.thermal_stiffness@np.ones(self.d.heat.N))), 1e-14)
        self.assertAlmostEqual(argon_conductivity(self.mu), 15*KB*self.mu/(4*M_AR))

    def test_step_full_energy_positive_heat_and_boundary_symmetry(self):
        r = self.f.mean_r[None, :]
        z = ((self.f.z[:-1]+self.f.z[1:])/2)[:, None]
        q = self.f.state(2e-4, 2900+100*r/.06, .4, 300*(1-r/.06),
                         vr=2*r/.06, vz=3*z/.14)
        out, receipt = self.d.advance(q, 1e-5)
        self.assertLess(abs(np.sum(out[4]-q[4]))/np.sum(q[4]), 2e-12)
        np.testing.assert_array_equal(out[[0, 5]], q[[0, 5]])
        self.assertGreater(receipt['kineticLossJ'], 0)
        self.assertTrue(np.all(receipt['viscousHeatJ'] >= 0))
        self.assertTrue(np.all(receipt['numericalHeatJ'] >= 0))
        heat = np.sum(receipt['viscousHeatJ']+receipt['numericalHeatJ'])
        self.assertAlmostEqual(heat/receipt['kineticLossJ'], 1., places=10)
        self.assertLess(abs(np.sum(receipt['stressRedistributionJ'])), 1e-12*np.sum(q[4]))
        self.assertLess(abs(np.sum(receipt['thermalRedistributionJ'])), 1e-12*np.sum(q[4]))
        np.testing.assert_array_equal(receipt['velocityTrace'][self.d.fixed], 0.)
        self.assertTrue(np.all(self.f.primitive(out)['temperatureK'] > 0))

    def test_stationary_uniform_temperature_is_exact_adiabatic_state(self):
        q = self.f.state(2e-4, 2900., .4, 0.)
        out, receipt = self.d.advance(q, 1e-4)
        np.testing.assert_allclose(out, q, rtol=1e-12, atol=1e-18)
        np.testing.assert_allclose(receipt['temperatureTrace'], 2900., rtol=1e-12)

    def test_domain_rejections(self):
        q = self.f.state(2e-4, 2900., .4, 0.)
        for dt in (0., -1., True, np.nan, np.inf):
            with self.assertRaises(ValueError):
                self.d.advance(q, dt)
        for mu in (0., -1., np.nan):
            with self.assertRaises(ValueError):
                Diffusion(self.f, mu)
        with self.assertRaises(ValueError):
            Diffusion(self.f, lambda r,z:1+0*r)


if __name__ == '__main__':
    unittest.main()
