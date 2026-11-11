import unittest
import numpy as np
from flow import Flow, KB

U = 1.66053906892e-27


def stationary_arithmetic_scale(flow, q):
    """Magnitude of raw face arithmetic before uniform-state cancellation.

    E/V can differ by an ULP after integrated storage. The LLF difference
    therefore inherits alpha*(abs(Uleft)+abs(Uright)), even when its physical
    flux is zero; the already-cancelled numerical flux is not that scale.
    """
    p = flow.primitive(q)
    radial_area = flow.radial_area[:, :-1]+flow.radial_area[:, 1:]
    axial_area = flow.axial_area[:-1]+flow.axial_area[1:]
    state_density = np.max(abs(q/flow.volume), axis=(1, 2))[:, None, None]
    scale = 2*np.max(p['soundMPS'])*state_density*(radial_area+axial_area)
    pressure = np.max(p['pressurePa'])
    scale[1] += pressure*radial_area+abs(p['pressurePa']*np.diff(flow.radial_area))
    scale[2] += pressure*axial_area
    return scale


class FlowTests(unittest.TestCase):
    def setUp(self):
        self.flow = Flow(np.linspace(0, .06, 7), np.linspace(0, .14, 7), [36*U, 40*U])

    def test_uniform_gas_stationary(self):
        q = self.flow.state(.001, 350, .4, 0)
        scale = stationary_arithmetic_scale(self.flow, q)
        rounding = 128*np.finfo(float).eps
        self.assertTrue(np.all(abs(self.flow.rate(q)) <= rounding*scale))
        dt = self.flow.stable_dt(q)
        out = self.flow.advance(q, dt)
        self.assertTrue(np.all(abs(out-q) <= rounding*(abs(out)+abs(q)+dt*scale)))
        p = self.flow.primitive(out)
        self.assertLess(max(np.max(abs(p['vrMPS'])), np.max(abs(p['vzMPS']))),
                        rounding*np.max(p['soundMPS']))

    def test_smooth_contact_has_no_first_order_acoustic_mass_diffusion(self):
        # Constant pressure with linear density and uniform axial velocity.
        # Reconstructed left/right states agree at interior faces exactly.
        z = (self.flow.z[1:]+self.flow.z[:-1])/2
        rho = .001*(1+.2*z[:, None]/.14)
        q = self.flow.state(rho, 350*.001/rho, .4, 0., vz=3.)
        _, flux = self.flow.fluxes(q)
        expected = .001*(1+.2*self.flow.z[2:-2, None]/.14)*3*self.flow.axial_area[2:-2]
        np.testing.assert_allclose(flux[0, 2:-2], expected, rtol=2e-13, atol=0)

    def test_eos_and_swirl_use_evolving_species_mass(self):
        rho = np.linspace(.001, .002, self.flow.count).reshape(6, 6)
        y = np.linspace(0., 1., self.flow.count).reshape(6, 6)
        q = self.flow.state(rho, 370., y, 900., vr=2., vz=-3.)
        p = self.flow.primitive(q)
        for name, expected in (('densityKgM3', rho), ('massFraction', y),
                               ('temperatureK', 370.), ('omegaRadS', 900.),
                               ('vrMPS', 2.), ('vzMPS', -3.)):
            np.testing.assert_allclose(p[name], expected, rtol=2e-15, atol=1e-14)
        pressure = rho*KB*370*(y/(36*U)+(1-y)/(40*U))
        np.testing.assert_allclose(p['pressurePa'], pressure, rtol=2e-15)
        np.testing.assert_allclose(q[3], q[0]*self.flow.mean_r2*900, rtol=2e-15)

    def test_closed_nonuniform_flow_conserves_all_inventories(self):
        rr, zz = np.meshgrid((self.flow.r[:-1]+self.flow.r[1:])/2,
                             (self.flow.z[:-1]+self.flow.z[1:])/2)
        q = self.flow.state(.001*(1+.12*np.cos(np.pi*zz/.14)),
                            350+3*np.sin(np.pi*rr/.06), .4+.1*np.cos(np.pi*rr/.06),
                            700+100*np.cos(np.pi*zz/.14), 5*np.sin(np.pi*rr/.06),
                            3*np.sin(np.pi*zz/.14))
        before = q.sum(axis=(1, 2))
        for _ in range(10):
            q, receipt = self.flow.advance_with_receipt(q, self.flow.stable_dt(q)*.8)
            self.assertGreater(receipt['minimumThermalJ'], 0)
        np.testing.assert_allclose(q.sum(axis=(1, 2))[[0, 3, 4, 5]], before[[0, 3, 4, 5]], rtol=3e-14)

    def test_density_and_angular_momentum_actually_transport(self):
        y = np.arange(6)[None, :]/10+.1
        q = self.flow.state(.001*(1+y), 350, y, 800., 8., 0.)
        initial = q.copy()
        q = self.flow.advance(q, self.flow.stable_dt(q)*.5)
        self.assertGreater(np.max(abs(q[0]-initial[0])), 1e-14)
        self.assertGreater(np.max(abs(q[3]-initial[3])), 1e-13)
        np.testing.assert_allclose(q.sum(axis=(1, 2))[[0, 3, 4, 5]],
                                   initial.sum(axis=(1, 2))[[0, 3, 4, 5]], rtol=1e-14)

    def test_pressure_gradient_accelerates_towards_low_pressure(self):
        temperatures = np.linspace(360, 340, 6)[None, :]
        q = self.flow.state(.001, temperatures, .5, 0)
        rate = self.flow.rate(q)
        self.assertTrue(np.all(rate[1, :, 1:-1] > 0))
        q = self.flow.state(.001, temperatures[:, ::-1], .5, 0)
        self.assertTrue(np.all(self.flow.rate(q)[1, :, 1:-1] < 0))

    def test_rotational_source_is_even_in_spin_and_outward(self):
        q = self.flow.state(.001, 350, .5, 900)
        reverse = self.flow.state(.001, 350, .5, -900)
        forward_rate, reverse_rate = self.flow.rate(q), self.flow.rate(reverse)
        np.testing.assert_allclose(forward_rate[1], reverse_rate[1], rtol=1e-14)
        np.testing.assert_allclose(forward_rate[3], -reverse_rate[3], rtol=1e-14)
        self.assertTrue(np.all(forward_rate[1] > 0))

    def test_reflecting_faces_have_no_mass_energy_or_species_leak(self):
        q = self.flow.state(.001, 350, .5, 700, 5, -9)
        radial, axial = self.flow.fluxes(q)
        for field in (0, 3, 4, 5):
            np.testing.assert_array_equal(radial[field, :, [0, -1]], 0)
            np.testing.assert_array_equal(axial[field, [0, -1]], 0)

    def test_zero_mass_flux_rigid_rotation_has_zero_angular_transport(self):
        q = self.flow.state(.001, 350., .4, 900.)
        radial, axial = self.flow.fluxes(q)
        for flux in (radial, axial):
            np.testing.assert_array_equal(flux[0], 0)
            np.testing.assert_array_equal(flux[3], 0)
            np.testing.assert_array_equal(flux[5], 0)

    def test_uniform_composition_preserved_during_density_pressure_transport(self):
        rho = .001*(1+.1*np.arange(6)[:, None])
        q = self.flow.state(rho, 350., .4, 700., 3., -2.)
        initial_mass = q[0].copy()
        for _ in range(6):
            q = self.flow.advance(q, self.flow.stable_dt(q)*.8)
        self.assertGreater(np.max(abs(q[0]-initial_mass)), 1e-14)
        np.testing.assert_allclose(self.flow.primitive(q)['massFraction'], .4, atol=2e-15, rtol=0)

    def test_invalid_states_rejected_without_clipping(self):
        for args in ((0., 350, .5, 0), (.001, 0, .5, 0), (.001, 350, 1.001, 0),
                     (.001, 350, True, 0), (.001, 350, -.001, 0)):
            with self.assertRaises(ValueError):
                self.flow.state(*args)
        q = self.flow.state(.001, 350, .5, 0)
        for index, value in ((0, 0), (4, -1), (5, -1), (3, 1e10)):
            bad = q.copy()
            bad[index, 0, 0] = value
            with self.assertRaises(ValueError):
                self.flow.primitive(bad)
        for dt in (0, -1, float('nan'), True):
            with self.assertRaises(ValueError):
                self.flow.advance(q, dt)
        with self.assertRaisesRegex(ValueError, 'CFL'):
            self.flow.advance(q, 2*self.flow.stable_dt(q, cfl=.5))

    def test_acoustic_cfl_does_not_silently_admit_fast_centrifugal_source(self):
        q = self.flow.state(.001, 350., .4, 1e7)
        self.assertGreater(np.min(self.flow.primitive(q)['thermalJ']), 0)
        with self.assertRaisesRegex(ValueError, 'thermal energy'):
            self.flow.advance(q, self.flow.stable_dt(q)*.8)


if __name__ == '__main__':
    unittest.main()
