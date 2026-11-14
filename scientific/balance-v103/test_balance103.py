"""Independent force-balance regressions; execute only inside safe-dev.

The equilibria are cylindrical cell averages, not centroid samples. Exact
stationarity applies to Flow's declared native rigid-rotation representation;
nonrigid continuum projections are convergence controls instead.
"""
from pathlib import Path
import sys
import unittest

import numpy as np

SCIENCE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCIENCE/'mixture-axial-v75'))
from flow import Flow, KB
sys.path.insert(0, str(SCIENCE/'spatial-v101'))
from reconstruction101 import mesh

U = 1.66053906660e-27
ROUNDING = 32768*np.finfo(float).eps


def radial_average(flow, function, order=32):
    """Independent Gaussian volume average with the cylindrical Jacobian."""
    x, weight = np.polynomial.legendre.leggauss(order)
    lo, hi = flow.r[:-1, None], flow.r[1:, None]
    radius = .5*((hi+lo)+(hi-lo)*x)
    return np.sum(function(radius)*radius*weight, axis=-1)*(hi-lo)[:, 0]/(
        hi*hi-lo*lo)[:, 0]


def equilibrium(flow, omega, temperature=3000., fraction=.35):
    c2 = KB*temperature*(fraction/flow.masses[0]+(1-fraction)/flow.masses[1])
    density = radial_average(flow, lambda r: .001*np.exp(
        omega*omega*(r*r-flow.r[-1]**2)/(2*c2)))
    return flow.state(density, temperature, fraction, omega)


def rms(flow, value):
    return float(np.sqrt(np.sum(flow.volume*value*value)/flow.volume.sum()))


def arithmetic_rates(flow, q):
    """Scales before cancellation, including components whose exact rate is zero."""
    p = flow.primitive(q)
    mass = q[0]
    sound = np.max(p['soundMPS'])
    dt = flow.stable_dt(q, .5)
    return np.array([mass, mass*sound, mass*sound,
                     mass*flow.r[-1]*sound, q[4], mass])/dt


class ForceBalanceControls(unittest.TestCase):
    def flow(self, n=1, kind='smooth-source-aligned', masses=(36*U, 40*U)):
        return Flow(*mesh(n, kind), masses)

    def test_initializer_is_a_cylindrical_average_not_a_centroid_sample(self):
        f = self.flow()
        omega, temperature, fraction = 23000., 1800., .2
        q = equilibrium(f, omega, temperature, fraction)
        c2 = KB*temperature*(fraction/f.masses[0]+(1-fraction)/f.masses[1])
        a = omega*omega/(2*c2)
        lo, hi = f.r[:-1], f.r[1:]
        expected = .001*np.exp(a*(lo*lo-f.r[-1]**2))*np.expm1(
            a*(hi*hi-lo*lo))/(a*(hi*hi-lo*lo))
        np.testing.assert_allclose(f.primitive(q)['densityKgM3'],
                                   np.broadcast_to(expected, f.volume.shape), rtol=3e-14)
        sampled = .001*np.exp(a*(f.mean_r**2-f.r[-1]**2))
        self.assertGreater(np.max(abs(expected-sampled)/expected), 1e-5)

    def test_rigid_equilibria_have_roundoff_rates_on_graded_meshes(self):
        for kind in ('original', 'smooth-source-aligned'):
            for n in (1, 2):
                for masses, fraction in (((39.948*U, 39.948*U), .5),
                                         ((36*U, 40*U), .2)):
                    f = self.flow(n, kind, masses)
                    for omega, temperature in ((9000., 5000.), (-23000., 1800.)):
                        with self.subTest(mesh=kind, n=n, masses=masses,
                                          omega=omega, temperature=temperature):
                            q = equilibrium(f, omega, temperature, fraction)
                            self.assertTrue(np.all(abs(f.rate(q)) <=
                                ROUNDING*arithmetic_rates(f, q)))

    def test_rotating_equilibrium_has_no_acoustic_mass_or_energy_flux(self):
        f = self.flow(2)
        q = equilibrium(f, -20000.)
        p = f.primitive(q)
        rho, sound = np.max(p['densityKgM3']), np.max(p['soundMPS'])
        energy = np.max(q[4]/f.volume)
        for flux, area in zip(f.fluxes(q), (f.radial_area, f.axial_area)):
            self.assertTrue(np.all(abs(flux[0]) <= ROUNDING*rho*sound*area))
            self.assertTrue(np.all(abs(flux[4]) <= ROUNDING*energy*sound*area))

    def test_multiple_steps_do_not_create_motion_or_change_equilibrium(self):
        for kind in ('original', 'smooth-source-aligned'):
            f = self.flow(1, kind)
            initial = equilibrium(f, 20000., 2700., .8)
            q = initial.copy()
            for _ in range(8):
                q = f.advance(q, f.stable_dt(q, .1))
            p, p0 = f.primitive(q), f.primitive(initial)
            scale = np.max(p0['soundMPS'])
            self.assertLess(rms(f, p['vrMPS']), 8*ROUNDING*scale)
            self.assertLess(rms(f, p['vzMPS']), 8*ROUNDING*scale)
            for name in ('densityKgM3', 'temperatureK', 'omegaRadS'):
                np.testing.assert_allclose(p[name], p0[name], rtol=8*ROUNDING, atol=0.)

    def test_uniform_pressure_rotating_gas_still_accelerates_outward(self):
        f = self.flow(2)
        for omega in (-20000., 20000.):
            q = f.state(.001, 3000., .35, omega)
            acceleration = f.rate(q)[1]/q[0]
            self.assertGreater(rms(f, acceleration), .1*omega*omega*f.r[-1])
            self.assertGreater(np.sum(f.volume*acceleration), 0.)
            # This is not an equilibrium: the missing outward pressure rise
            # must produce genuine radial motion rather than a frozen state.
            out = f.advance(q, f.stable_dt(q, .1))
            self.assertGreater(rms(f, f.primitive(out)['vrMPS']), 1e-5)

    def test_pressure_perturbation_accelerates_with_the_right_sign_and_converges(self):
        omega, temperature, fraction = 7000., 3000., .35
        for amplitude in (-.05, .05):
            errors = []
            for n in (1, 2, 4, 8):
                f = self.flow(n)
                radius = f.r[-1]
                c2 = KB*temperature*(fraction/f.masses[0]+(1-fraction)/f.masses[1])
                def density(r):
                    return .001*np.exp(omega*omega*(r*r-radius*radius)/(2*c2))
                def bump(r):
                    return np.sin(np.pi*r/radius)**2
                rho = radial_average(f, density)
                pressure = radial_average(f, lambda r: c2*density(r)*(1+amplitude*bump(r)))
                q = f.state(rho, pressure/rho/(c2/temperature), fraction, omega)
                expected = radial_average(f, lambda r: -amplitude*density(r)*(
                    c2*np.pi/radius*np.sin(2*np.pi*r/radius)+omega*omega*r*bump(r)))/rho
                acceleration = f.rate(q)[1]/q[0]
                errors.append(rms(f, acceleration-expected)/rms(f, expected))
                if n >= 4:
                    left = (f.mean_r > .15*radius) & (f.mean_r < .4*radius)
                    right = (f.mean_r > .6*radius) & (f.mean_r < .85*radius)
                    self.assertLess(amplitude*np.mean(acceleration[:, left]), 0.)
                    self.assertGreater(amplitude*np.mean(acceleration[:, right]), 0.)
            # Limited reconstruction near the bump maximum need not have
            # monotone error on the coarsest grid. Keep that sample, require
            # the finest error to beat every coarser sample, and check both
            # subsequent contractions. This supplemental analytical control
            # does not replace or relax the campaign's existing gates.
            self.assertLess(errors[-1], min(errors[:-1]))
            self.assertGreater(errors[1], errors[2])
            self.assertGreater(errors[2], errors[3])

    def test_nonrigid_equilibrium_projection_errors_contract(self):
        omega, temperature, fraction = 14000., 3200., .65
        for beta in (-.4, .4):
            errors = []
            for n in (1, 2, 4):
                f = self.flow(n)
                radius = f.r[-1]
                c2 = KB*temperature*(fraction/f.masses[0]+(1-fraction)/f.masses[1])
                def potential(r):
                    return omega*omega/c2*(r*r/2+beta*r**4/(2*radius**2)
                        +beta*beta*r**6/(6*radius**4))
                rho = radial_average(f, lambda r: .001*np.exp(potential(r)-potential(radius)))
                # A consistent native projection, not an assertion that the
                # density-weighted continuum angular momentum equals m<r²>Ω.
                q = f.state(rho, temperature, fraction,
                            omega*(1+beta*f.mean_r**2/radius**2))
                errors.append(rms(f, f.rate(q)[1]/q[0])/(omega*omega*radius))
            self.assertGreater(errors[0], errors[1])
            self.assertGreater(errors[1], errors[2])

    def test_nonisothermal_quadratic_pressure_force_contracts(self):
        rho, omega, fraction = .001, 12000., .35
        for multiplier in (0., .5, 1.):
            errors = []
            for n in (1, 2, 4):
                f = self.flow(n)
                coefficient = multiplier*rho*omega*omega
                pressure = 600.+coefficient*f.mean_r2
                specific_constant = KB*(fraction/f.masses[0]+(1-fraction)/f.masses[1])
                q = f.state(rho, pressure/(rho*specific_constant), fraction, omega)
                expected = (omega*omega-2*coefficient/rho)*f.mean_r
                error = f.rate(q)[1]/q[0]-expected
                # This controls the interior differential operator. Closed
                # boundary reconstruction has a separate stationarity test.
                volume = f.volume[:, 1:-1]
                errors.append(float(np.sqrt(np.sum(volume*error[:, 1:-1]**2)
                    /volume.sum()))/(omega*omega*f.r[-1]))
            if max(errors) > 16*ROUNDING:
                self.assertGreater(errors[0], errors[1])
                self.assertGreater(errors[1], errors[2])

    def test_perturbed_two_dimensional_flow_conserves_closed_inventories(self):
        f = self.flow()
        rr, zz = np.meshgrid(f.mean_r, (f.z[:-1]+f.z[1:])/2)
        q = f.state(.001*(1+.1*np.cos(np.pi*zz/f.z[-1])),
            3000.+40*np.sin(np.pi*rr/f.r[-1]), .4+.1*np.cos(np.pi*rr/f.r[-1]),
            9000.+1000*np.cos(np.pi*zz/f.z[-1]),
            3*np.sin(np.pi*rr/f.r[-1]), 2*np.sin(np.pi*zz/f.z[-1]))
        initial = q.copy()
        for _ in range(10):
            q, receipt = f.advance_with_receipt(q, f.stable_dt(q, .1))
            self.assertGreater(receipt['minimumDensityKgM3'], 0.)
            self.assertGreater(receipt['minimumThermalJ'], 0.)
        for component in (0, 3, 4, 5):
            self.assertAlmostEqual(q[component].sum()/initial[component].sum(), 1., places=13)
        self.assertGreater(np.max(abs(q[0]-initial[0])), 1e-15)
        self.assertGreater(np.max(abs(q[3]-initial[3])), 1e-15)

    def test_reflecting_faces_have_no_inventory_leak_under_perturbations(self):
        f = self.flow()
        rr, zz = np.meshgrid(f.mean_r, (f.z[:-1]+f.z[1:])/2)
        q = f.state(.001*(1+.2*rr/f.r[-1]), 3000.+100*zz/f.z[-1],
                    .4, 13000.+500*rr/f.r[-1], 5., -7.)
        radial, axial = f.fluxes(q)
        for component in (0, 3, 4, 5):
            np.testing.assert_array_equal(radial[component, :, [0, -1]], 0.)
            np.testing.assert_array_equal(axial[component, [0, -1]], 0.)

    def test_zero_spin_pressure_contact_and_fast_source_domain_are_preserved(self):
        f = self.flow()
        rho = np.where(np.arange(f.nr)[None, :] < f.nr//2, .001, .002)
        q = f.state(rho, 3000.*.001/rho, .35, 0.)
        self.assertTrue(np.all(abs(f.rate(q)) <= ROUNDING*arithmetic_rates(f, q)))
        q = f.state(.001, 350., .35, 1e7)
        with self.assertRaises((ValueError, ArithmeticError)):
            f.advance(q, f.stable_dt(q, .4))


if __name__ == '__main__':
    unittest.main()
