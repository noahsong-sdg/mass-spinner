import math
import unittest
import numpy as np
from thermal import Thermal, KB, AR_MASS, SOLID_RHO


class Properties:
    """Analytic enthalpy reference; no production bridge data reused."""
    def props(self, gas, solid):
        return {'mu': [2e-5]*len(gas), 'k': [.1]*len(gas),
                'solidK': [100.]*len(solid), 'solidCp': [100.+.1*t for t in solid],
                'solidH': [100.*(t-300)+.05*(t*t-300**2) for t in solid]}


class ThermalTests(unittest.TestCase):
    def test_frozen_geometry_owns_numpy_inputs(self):
        r, z, wall = np.array([0., .02, .06]), np.array([0., .01, .04]), np.array([.06, .061, .065])
        m = Thermal(r, z, wall, .002, Properties())
        original_r, original_z = m.r.copy(), m.z.copy()
        t = np.full(m.count, 500.)
        before = m.flux(t, m.properties(t))
        r[:], z[:], wall[:] = 99., 99., 99.
        np.testing.assert_array_equal(m.r, original_r)
        np.testing.assert_array_equal(m.z, original_z)
        np.testing.assert_array_equal(m.flux(t, m.properties(t))[0], before[0])

    def model(self, **options):
        return Thermal([0, .02, .06], [0, .01, .04], [.06, .061, .065],
                       .002, Properties(), **options)

    def test_geometry_capacity_and_uniform_equilibrium(self):
        m = self.model()
        np.testing.assert_allclose(m.volume.reshape(2, 4).sum(axis=1),
                                   math.pi*.065**2*np.diff(m.z), rtol=1e-14)
        p = m.properties(np.full(m.count, 400.))
        np.testing.assert_allclose(m.capacity(p)[m.gas_indices],
                                   .002*m.volume[m.gas_indices]*1.5*KB/AR_MASS)
        result = m.advance(400., .001, lambda t, p: (np.zeros(m.ng), 'accepted'))
        np.testing.assert_array_equal(result['temperatureK'], np.full(m.count, 400.))
        self.assertEqual(result['bathOutW'], 0)
        self.assertEqual(result['payload'], 'accepted')

    def test_exact_interface_series_and_signed_bath_flux(self):
        m = self.model()
        t = np.full(m.count, 500.)
        t[m.solid_indices] = 400.
        p = m.properties(t)
        _, links, _ = m.coefficients(p)
        g = next(g for left, right, g in links if left == 1 and right == 2)
        dz, radius = .01, .06
        expected = 1/(math.log(.06/.04)/(2*math.pi*dz*.1)
                      + 1/(100*2*math.pi*radius*dz)
                      + math.log(.0605/.06)/(2*math.pi*dz*100))
        self.assertAlmostEqual(g, expected, places=13)
        net, bath = m.flux(t, p)
        self.assertAlmostEqual(float(net.sum()), -bath, places=11)
        cool = self.model(bath_k=600.)
        self.assertLess(cool.flux(t, p)[1], 0)

    def test_axial_solid_conduction_and_closed_enthalpy_budget(self):
        m = self.model(cooling_h=0)
        t = np.full(m.count, 500.)
        t[:m.nr] = 700.
        p = m.properties(t)
        net, bath = m.flux(t, p)
        self.assertLess(net[m.nr-1], 0)
        self.assertGreater(net[2*m.nr-1], 0)
        self.assertEqual(bath, 0)
        old_energy = m.energy(t, p).sum()
        source = np.arange(1, m.ng+1)*.01
        dt = .003
        result = m.advance(t, dt, lambda trial, props: (source, None))
        new_t = np.array(result['temperatureK'])
        new_energy = m.energy(new_t, m.properties(new_t)).sum()
        self.assertAlmostEqual(new_energy-old_energy, dt*source.sum(), delta=2e-9)
        self.assertLess(result['residualScore'], 1)
        self.assertTrue(np.all(new_t >= 300))

    def test_radial_limit_stays_axially_uniform(self):
        m = Thermal([0, .02, .06], [0, .02, .04], [.06, .061, .065],
                    .002, Properties(), cooling_h=0)
        t = np.tile([800., 600., 400., 400.], 2)
        result = m.advance(t, .002, lambda trial, props: (np.tile([.02, .01], 2), None))
        field = np.array(result['temperatureK']).reshape(2, m.nr)
        np.testing.assert_allclose(field[0], field[1], rtol=0, atol=1e-10)

    def test_source_is_recomputed_at_accepted_temperature(self):
        m = self.model(contact_h=0, cooling_h=0)
        capacity = m.capacity(m.properties(400.))[m.gas_indices]
        rate, dt = 5., .01
        def source(t, props):
            return rate*capacity*t[m.gas_indices], t.copy()
        result = m.advance(400., dt, source)
        t = np.array(result['temperatureK'])
        np.testing.assert_allclose(t[m.gas_indices], 400/(1-dt*rate), rtol=1e-10)
        np.testing.assert_array_equal(result['payload'], t)
        np.testing.assert_allclose(t[m.solid_indices], 400., atol=1e-11)

    def test_pure_axial_heat_mode_matches_discrete_backward_euler(self):
        class FrozenProperties(Properties):
            def props(self, gas, solid):
                props = super().props(gas, solid)
                props.update(solidCp=[120.]*len(solid),
                             solidH=[120.*(t-300.) for t in solid])
                return props

        nz, length, rho, conductivity, dt, steps = 8, .14, .002, .1, .0007, 6
        z = np.linspace(0., length, nz+1)
        m = Thermal([0., .003, .017, .06], z, [.06, .064, .071], rho,
                    FrozenProperties(), contact_h=0., cooling_h=0.)
        mode = np.cos(np.pi*(z[:-1]+z[1:])/(2*length))
        temperature = np.full((nz, m.nr), 400.)
        temperature[:, :m.ngr] = 500.+50.*mode[:, None]
        for _ in range(steps):
            temperature = np.array(m.advance(temperature.ravel(), dt,
                                            lambda t, p: (np.zeros(m.ng), None))['temperatureK'])
        diffusivity = conductivity/(rho*1.5*KB/AR_MASS)
        eigenvalue = 4*diffusivity*math.sin(math.pi/(2*nz))**2/(length/nz)**2
        expected = 500.+50.*mode/(1+dt*eigenvalue)**steps
        field = temperature.reshape(nz, m.nr)
        np.testing.assert_allclose(field[:, :m.ngr], np.repeat(expected[:, None], m.ngr, axis=1),
                                   rtol=0, atol=2e-9)
        np.testing.assert_allclose(field[:, m.ngr:], 400., rtol=0, atol=2e-10)

    def test_frozen_radial_transient_matches_independent_sparse_graph(self):
        from scipy.sparse import diags
        from scipy.sparse.linalg import spsolve

        class FrozenProperties(Properties):
            def props(self, gas, solid):
                props = super().props(gas, solid)
                props.update(solidCp=[120.]*len(solid),
                             solidH=[120.*(t-300.) for t in solid])
                return props

        r, z = np.array([0., .004, .019, .06]), np.array([0., .02, .07])
        rho, conductivity, dt, steps = .002, .1, .0003, 5
        m = Thermal(r, z, [.06, .063, .069], rho, FrozenProperties(),
                    contact_h=0., cooling_h=0.)
        # Independent radial graph per unit axial length; do not use model links.
        centers = (r[:-1]+r[1:])/2
        capacity = rho*1.5*KB/AR_MASS*math.pi*np.diff(r*r)
        conductance = 2*math.pi*conductivity/np.log(centers[1:]/centers[:-1])
        diagonal = capacity/dt+np.r_[conductance, 0.]+np.r_[0., conductance]
        matrix = diags((-conductance, diagonal, -conductance), (-1, 0, 1)).tocsr()
        expected = np.array([850., 620., 430.])
        temperature = np.full((len(z)-1, m.nr), 400.)
        temperature[:, :m.ngr] = expected
        before = float(capacity@expected)
        for _ in range(steps):
            expected = spsolve(matrix, capacity*expected/dt)
            temperature = np.array(m.advance(temperature.ravel(), dt,
                                            lambda t, p: (np.zeros(m.ng), None))['temperatureK']).reshape(-1, m.nr)
        np.testing.assert_allclose(temperature[:, :m.ngr], np.tile(expected, (len(z)-1, 1)),
                                   rtol=0., atol=2e-8)
        np.testing.assert_allclose(temperature[:, m.ngr:], 400., rtol=0., atol=2e-10)
        self.assertAlmostEqual(float(capacity@expected), before, delta=1e-13)

    def test_invalid_domains_and_zero_contact(self):
        m = self.model(contact_h=0, cooling_h=0)
        t = np.full(m.count, 400.)
        t[m.gas_indices] = 1000.
        np.testing.assert_allclose(m.flux(t, m.properties(t))[0], 0, atol=1e-12)
        for value in (299., 1901.):
            with self.assertRaises(ValueError):
                m.properties(value)
        for dt in (0., -1., math.nan, True):
            with self.assertRaises(ValueError):
                m.advance(t, dt, lambda trial, props: (0, None))
        with self.assertRaises(ValueError):
            m.advance(t, .01, lambda trial, props: ([math.inf]*m.ng, None))

    def test_sub_ulp_temperature_difference_has_conductive_roundoff_floor(self):
        # An imposed balanced heat dipole needs a sub-ULP temperature change.
        # This is a numerical representability control, not a gas-regime case.
        m = Thermal([0., .02, .06], [0., .01, .04], [.06, .061, .065],
                    1e-13, Properties(), contact_h=0., cooling_h=0.)
        source = np.array([2e-17, -2e-17, 6e-17, -6e-17])
        result = m.advance(400., 1., lambda t, p: (source, None))
        np.testing.assert_array_equal(result['temperatureK'], 400.)
        self.assertLessEqual(result['residualScore'], 1.)
        self.assertGreater(max(abs(np.array(result['residualW']))), 0.)
        self.assertTrue(np.all(np.array(result['conductionRoundoffW'])[m.gas_indices] > 0.))


if __name__ == '__main__':
    unittest.main()
