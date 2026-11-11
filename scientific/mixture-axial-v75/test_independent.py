"""Hand-controlled invariant/corruption cases; execute only in safe-dev."""
from copy import deepcopy
import unittest
import numpy as np
from independent import KB, check_hydro, check_diffusion, geometry, primitives, diffusion_rate


class IndependentControls(unittest.TestCase):
    def setUp(self):
        self.setup = dict(r=[0., .02, .06], z=[0., .04, .14], masses=[20*1.66053906892e-27, 40*1.66053906892e-27])
        _, _, masses, volume, _, _, _ = geometry(self.setup)
        mass = .001*volume
        energy = 1.5*KB*mass*(.25/masses[0]+.75/masses[1])*300.
        self.uniform = np.array([mass, np.zeros_like(mass), np.zeros_like(mass),
                                 np.zeros_like(mass), energy, .25*mass])

    def test_uniform_closed_equilibrium(self):
        result = check_hydro(self.setup, self.uniform, self.uniform.copy(), 1e-8)
        self.assertLessEqual(result['maxLocalScore'], 1.)
        check_diffusion(self.setup, self.uniform, self.uniform.copy(), 1e-8)

    def test_local_corruptions_cannot_hide_in_totals(self):
        for component in (0, 1, 2, 3, 4, 5):
            with self.subTest(component=component):
                changed = self.uniform.copy()
                delta = float(self.uniform[0, 0, 0])*1e-3
                changed[component, 0, 0] += delta
                changed[component, 0, 1] -= delta
                with self.assertRaisesRegex(AssertionError, 'endpoint mismatch|internal energy'):
                    check_hydro(self.setup, self.uniform, changed, 1e-8)

    def test_stale_heat_capacity_detected_with_unequal_masses(self):
        _, _, masses, volume, a2, _, _ = geometry(self.setup)
        old = self.uniform.copy()
        moved = old.copy()
        moved[5] = .5*moved[0]  # Same mass and internal energy, more light particles.
        t0 = primitives(old, volume, a2, masses)['temperature']
        t1 = primitives(moved, volume, a2, masses)['temperature']
        np.testing.assert_allclose(t1/t0, 5./6., rtol=2e-15)
        with self.assertRaisesRegex(AssertionError, 'endpoint mismatch'):
            check_diffusion(self.setup, old, moved, 1e-8)

    def test_eos_pressure_uses_particle_number_and_total_energy(self):
        _, _, masses, volume, a2, _, _ = geometry(self.setup)
        q = self.uniform.copy()
        inertia = q[0]*a2
        q[1] = q[0]*2.
        q[2] = q[0]*(-3.)
        q[3] = inertia*400.
        q[4] += .5*q[0]*13.+.5*inertia*400.**2
        p = primitives(q, volume, a2, masses)
        np.testing.assert_allclose(p['temperature'], 300., rtol=3e-15)
        pressure = .001*(.25/masses[0]+.75/masses[1])*KB*300.
        np.testing.assert_allclose(p['pressure'], pressure, rtol=3e-15)

    def test_diffusion_admits_every_cell_not_only_face_average(self):
        q = self.uniform.copy()
        q[4, :, 0] *= 230./300.
        q[4, :, 1] *= 310./300.
        # Every radial face average is inside the fit; the cold cell is not.
        with self.assertRaisesRegex(AssertionError, '235'):
            diffusion_rate(self.setup, q)

    def test_identical_species_mass_has_no_diffusion_enthalpy(self):
        setup = deepcopy(self.setup)
        setup['masses'] = [setup['masses'][0]]*2
        q = self.uniform.copy()
        q[4] = 1.5*KB*q[0]/setup['masses'][0]*300.
        q[5, :, 0], q[5, :, 1] = .2*q[0, :, 0], .6*q[0, :, 1]
        rate = diffusion_rate(setup, q)
        np.testing.assert_array_equal(rate[4], 0.)
        self.assertGreater(np.max(abs(rate[5])), 0.)
        np.testing.assert_array_equal(rate[:4], 0.)

    def test_disabled_diffusion_does_not_need_dataset_temperature(self):
        q = self.uniform.copy()
        q[4] *= 4
        check_diffusion(self.setup, q, q.copy(), 1e-8, scale=0.)
        with self.assertRaisesRegex(AssertionError, '235'):
            check_diffusion(self.setup, q, q.copy(), 1e-8, scale=1.)

    def test_species_and_thermal_domains(self):
        for component, value in ((0, -1.), (4, 0.), (5, -1.), (4, float('nan'))):
            with self.subTest(component=component, value=value):
                bad = self.uniform.copy()
                bad[component, 0, 0] = value
                with self.assertRaises(AssertionError):
                    check_hydro(self.setup, bad, bad, 1e-8)
        for dt in (0., -1., True, float('nan')):
            with self.subTest(dt=dt), self.assertRaisesRegex(AssertionError, 'timestep'):
                check_hydro(self.setup, self.uniform, self.uniform, dt)

    def test_actual_flow_agrees_with_independent_stage_reconstruction(self):
        from flow import Flow
        flow = Flow(self.setup['r'], self.setup['z'], self.setup['masses'])
        q = flow.state([[.0011, .001], [.001, .0012]], [[340., 350.], [345., 355.]],
                       [[.3, .4], [.5, .6]], [[600., 700.], [900., 800.]],
                       [[2., -3.], [1., 4.]], [[-1., 2.], [3., -2.]])
        dt = .2*flow.stable_dt(q)
        result = check_hydro(self.setup, q, flow.advance(q, dt), dt)
        self.assertLessEqual(result['maxLocalScore'], 1.)

    def test_actual_diffusion_agrees_with_independent_stage_reconstruction(self):
        import diffusion
        from flow import Flow
        flow = Flow(self.setup['r'], self.setup['z'], self.setup['masses'])
        q = flow.state([[.0011, .001], [.001, .0012]], [[340., 350.], [345., 355.]],
                       [[.3, .4], [.5, .6]], 600., 2., -1.)
        dt = min(1e-7, .1*diffusion.stable_dt(flow, q))
        result = check_diffusion(self.setup, q, diffusion.advance(flow, q, dt), dt)
        self.assertLessEqual(result['maxLocalScore'], 1.)


if __name__ == '__main__':
    unittest.main()
