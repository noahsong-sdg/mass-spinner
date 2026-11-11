import unittest
import numpy as np
from flow import Flow
import diffusion

U = 1.66053906892e-27


class DiffusionControls(unittest.TestCase):
    def setUp(self):
        self.flow = Flow(np.linspace(0., .06, 5), np.linspace(0., .14, 4), [36*U, 40*U])
        self.y = np.broadcast_to(np.linspace(.2, .8, 4), (3, 4)).copy()
        self.q = self.flow.state(.001, 350., self.y, 900.)

    def test_bernoulli_limit_symmetry_extremes(self):
        z = np.array([-1000., -1., -1e-8, 0., 1e-8, 1., 1000.])
        b = diffusion.bernoulli(z)
        self.assertTrue(np.all(np.isfinite(b)))
        self.assertTrue(np.all(b >= 0))
        np.testing.assert_allclose(diffusion.bernoulli(-z)-b, z, atol=1e-13)
        self.assertEqual(float(diffusion.bernoulli(0.)), 1.)

    def test_nist_value_pressure_scaling_and_domains(self):
        d = diffusion.argon_diffusivity(298.15, 101325.)
        self.assertAlmostEqual(float(d)/1e-4, .182, delta=.001)
        self.assertEqual(float(diffusion.argon_diffusivity(298.15, 101325./2)), float(d)*2)
        for t, p in [(234.9, 100.), (418.1, 100.), (350., 0.), (np.nan, 100.)]:
            with self.assertRaises(ValueError):
                diffusion.argon_diffusivity(t, p)

    def test_zero_scale_and_zero_step_identity(self):
        np.testing.assert_array_equal(diffusion.advance(self.flow, self.q, 1., scale=0.), self.q)
        np.testing.assert_array_equal(diffusion.advance(self.flow, self.q, 0.), self.q)

    def test_closed_mass_energy_species_and_angular_conservation(self):
        dt = diffusion.stable_dt(self.flow, self.q)
        new, receipt = diffusion.advance_with_receipt(self.flow, self.q, dt)
        np.testing.assert_array_equal(new[:4], self.q[:4])
        np.testing.assert_allclose(new.sum(axis=(1, 2)), self.q.sum(axis=(1, 2)), rtol=3e-15, atol=1e-25)
        self.assertGreater(np.max(abs(new[5]-self.q[5])), 0.)
        self.assertGreater(np.max(abs(new[4]-self.q[4])), 0.)
        radial, axial = np.array(receipt['radialTransfers']), np.array(receipt['axialTransfers'])
        changes = radial[:, :, :-1]-radial[:, :, 1:]+axial[:, :-1, :]-axial[:, 1:, :]
        np.testing.assert_allclose(new[5]-self.q[5], changes[0], atol=1e-24)
        np.testing.assert_allclose(new[4]-self.q[4], changes[1], atol=1e-18)
        self.assertTrue(np.all(radial[:, :, [0, -1]] == 0))
        self.assertTrue(np.all(axial[:, [0, -1], :] == 0))

    def test_uniform_pressure_fick_and_enthalpy_flux(self):
        masses = self.flow.masses
        mbar = 1/(self.y/masses[0]+(1-self.y)/masses[1])
        rho = 100.*mbar/(diffusion.KB*350.)
        q = self.flow.state(rho, 350., self.y, 0.)
        p = self.flow.primitive(q)
        radial, axial = diffusion.fluxes(self.flow, q)
        a, b = (1, 1), (1, 2)
        rhof = 2*rho[a]*rho[b]/(rho[a]+rho[b])
        area = 2*np.pi*self.flow.r[2]*(self.flow.z[2]-self.flow.z[1])
        distance = (self.flow.r[3]-self.flow.r[1])/2
        expected = rhof*diffusion.argon_diffusivity(350., 100.)*area/distance*(self.y[a]-self.y[b])
        self.assertAlmostEqual(radial[0, 1, 2]/expected, 1., delta=2e-14)
        self.assertAlmostEqual(radial[1, 1, 2]/radial[0, 1, 2],
                               2.5*diffusion.KB*350.*(1/masses[0]-1/masses[1]), delta=1e-9)
        np.testing.assert_allclose(p['pressurePa'], 100., rtol=3e-15)
        np.testing.assert_allclose(p['massFraction'], self.y, rtol=3e-15)
        np.testing.assert_allclose(p['temperatureK'], 350., rtol=3e-15)
        # Conserved-cell construction and EOS recovery round independently in
        # each axial volume. Zero physical flux therefore has an arithmetic
        # floor, scaled by the actual kg/s face conductance, not by 1 kg/s.
        ra, rb = p['densityKgM3'][:-1], p['densityKgM3'][1:]
        tf = (p['temperatureK'][:-1]+p['temperatureK'][1:])/2
        pf = (p['pressurePa'][:-1]+p['pressurePa'][1:])/2
        d = 1e-4*101325/pf*np.exp(-11.097-45.486/tf+1.676*np.log(tf))
        area = np.pi*np.diff(self.flow.r**2)[None, :]
        spacing = (self.flow.z[2:]-self.flow.z[:-2])[:, None]/2
        conductance = 2*ra*rb/(ra+rb)*d*area/spacing
        mass_roundoff = 32*np.finfo(float).eps*conductance
        enthalpy = 2.5*diffusion.KB*tf*abs(1/masses[0]-1/masses[1])
        self.assertTrue(np.all(abs(axial[0, 1:-1]) <= mass_roundoff))
        self.assertTrue(np.all(abs(axial[1, 1:-1]) <= mass_roundoff*enthalpy*(1+8*np.finfo(float).eps)))
        self.assertTrue(np.all(axial[:, [0, -1], :] == 0.))

    def test_pressure_drives_light_species_down_gradient_without_omega_force(self):
        rho = np.broadcast_to(np.linspace(.001, .002, 4), (3, 4))
        q = self.flow.state(rho, 350., .5, 0.)
        radial, _ = diffusion.fluxes(self.flow, q)
        self.assertTrue(np.all(radial[0, :, 1:-1] < 0.))
        rotating = self.flow.state(rho, 350., .5, 1200.)
        np.testing.assert_allclose(diffusion.fluxes(self.flow, rotating)[0], radial, rtol=2e-14)

    def test_identical_species_no_barodiffusion_or_enthalpy(self):
        flow = Flow(self.flow.r, self.flow.z, [40*U, 40*U])
        rho = np.broadcast_to(np.linspace(.001, .002, 4), (3, 4))
        uniform_y = flow.state(rho, 350., .5, 0.)
        radial, axial = diffusion.fluxes(flow, uniform_y)
        self.assertTrue(np.all(radial == 0.))
        self.assertTrue(np.all(axial == 0.))
        mixed = flow.state(rho, 350., self.y, 0.)
        self.assertTrue(np.all(diffusion.fluxes(flow, mixed)[0][1] == 0.))

    def test_pure_cell_positivity_no_clipping(self):
        y = np.broadcast_to(np.array([0., 0., 1., 1.]), (3, 4))
        q = self.flow.state(.001, 350., y, 0.)
        new = diffusion.advance(self.flow, q, diffusion.stable_dt(self.flow, q))
        fraction = self.flow.primitive(new)['massFraction']
        self.assertTrue(np.all((fraction >= 0.) & (fraction <= 1.)))
        self.assertGreater(float(fraction[1, 1]), 0.)
        self.assertLess(float(fraction[1, 2]), 1.)

    def test_invalid_scale_dt_and_unresolvable_step_rejected(self):
        for value in (-1., np.nan, True):
            with self.assertRaises(ValueError):
                diffusion.advance(self.flow, self.q, value)
            with self.assertRaises(ValueError):
                diffusion.advance(self.flow, self.q, 1e-9, scale=value)
        with self.assertRaises(ValueError):
            diffusion.advance(self.flow, self.q, 2*diffusion.stable_dt(self.flow, self.q, cfl=1.))

    def test_integer_input_does_not_truncate_physical_flux(self):
        q = np.zeros((6, 3, 4), dtype=int)
        q[0], q[4], q[5] = 4, 400000, np.array([1, 2, 3, 2])
        rate = diffusion.rate(self.flow, q)
        self.assertEqual(rate.dtype.kind, 'f')
        self.assertGreater(float(np.max(abs(rate))), 0.)
        np.testing.assert_array_equal(rate, diffusion.rate(self.flow, q.astype(float)))


if __name__ == '__main__':
    unittest.main()
