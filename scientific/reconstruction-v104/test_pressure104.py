"""Independent radial-pressure reconstruction controls; safe-dev execution only.

Quadratic exactness is a radial pressure property, not a claim that the Euler
operator or the coupled solver is third order. No apparatus measurements enter.
"""
from pathlib import Path
import sys
import unittest

import numpy as np

SCIENCE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCIENCE/'mixture-axial-v75'))
from flow import KB
sys.path.insert(0, str(SCIENCE/'spatial-v101'))
from reconstruction101 import mesh
from pressure104 import PressureFlow as Flow

U = 1.66053906660e-27
ROUNDING = 32768*np.finfo(float).eps


def average(flow, function, order=32):
    """Independent cylindrical Gaussian integral of an analytic function."""
    x, weights = np.polynomial.legendre.leggauss(order)
    lo, hi = flow.r[:-1, None], flow.r[1:, None]
    radius = .5*((lo+hi)+(hi-lo)*x)
    return np.sum(function(radius)*radius*weights, axis=-1)*(hi-lo)[:, 0]/(
        hi*hi-lo*lo)[:, 0]


def specific_constant(flow, fraction):
    return KB*(fraction/flow.masses[0]+(1-fraction)/flow.masses[1])


def pressure_state(flow, pressure, density=.001, fraction=.35, omega=0., **velocity):
    return flow.state(density, pressure/(density*specific_constant(flow, fraction)),
                      fraction, omega, **velocity)


def equilibrium(flow, omega, temperature=3000., fraction=.35):
    c2 = specific_constant(flow, fraction)*temperature
    rho = average(flow, lambda r: .001*np.exp(omega**2*(r*r-flow.r[-1]**2)/(2*c2)))
    return flow.state(rho, temperature, fraction, omega)


def rms(flow, value):
    return float(np.sqrt(np.sum(flow.volume*value*value)/flow.volume.sum()))


def quadratic_profile(flow, q):
    """Recover the unique zero-spin quadratic from its mean and edge traces.

    This is independent of the production coefficient routine. The centered
    quadratic's subtracted variance enforces its cylindrical cell average.
    """
    p = flow.primitive(q)
    left, right = flow._face_states(p, 2)
    lo = flow.r[:-1]-flow.mean_r
    hi = flow.r[1:]-flow.mean_r
    variance = flow.mean_r2-flow.mean_r**2
    lower = right[1, :, :-1]-p['pressurePa']
    upper = left[1, :, 1:]-p['pressurePa']
    determinant = lo*(hi*hi-variance)-hi*(lo*lo-variance)
    slope = (lower*(hi*hi-variance)-upper*(lo*lo-variance))/determinant
    curvature = (lo*upper-hi*lower)/determinant
    return p['pressurePa'], slope, curvature, lo, hi, variance


class PressureControls(unittest.TestCase):
    def flow(self, n=1, kind='smooth-source-aligned', masses=(36*U, 40*U)):
        return Flow(*mesh(n, kind), masses)

    def test_radial_faces_use_true_quadratic_cylindrical_cell_averages(self):
        for kind in ('original', 'smooth-source-aligned'):
            for n in (1, 2):
                f = self.flow(n, kind)
                radius = f.r[-1]
                for linear, quadratic in ((20./radius, 30./radius**2),
                                           (60./radius, -20./radius**2)):
                    pressure = 200.+linear*f.mean_r+quadratic*f.mean_r2
                    q = pressure_state(f, pressure)
                    left, right = f._face_states(f.primitive(q), 2)
                    expected = 200.+linear*f.r[2:-2]+quadratic*f.r[2:-2]**2
                    for observed in (left[1, :, 2:-2], right[1, :, 2:-2]):
                        np.testing.assert_allclose(observed,
                            np.broadcast_to(expected, observed.shape), rtol=2e-12, atol=0.)

    def test_limited_quadratic_maximum_remains_admissible_and_converges(self):
        for kind in ('original', 'smooth-source-aligned'):
            errors = []
            for n in (1, 2, 4, 8):
                f = self.flow(n, kind)
                radius, center = f.r[-1], .5*f.r[-1]
                curvature = -30./radius**2
                pressure = 230.+curvature*(f.mean_r2-2*center*f.mean_r+center*center)
                q = pressure_state(f, pressure)
                left, right = f._face_states(f.primitive(q), 2)
                expected = 230.+curvature*(f.r[2:-2]-center)**2
                observed = np.array([left[1, :, 2:-2], right[1, :, 2:-2]])
                self.assertGreater(float(np.min(observed)), 0.)
                self.assertLessEqual(float(np.max(observed)), 230.*(1+ROUNDING))
                errors.append(float(np.max(abs(observed-expected)))/230.)
            # The declared monotone limiter reduces order at extrema. Unlike
            # the unlimited Q2 fit, it cannot promise quadratic exactness here.
            self.assertLess(errors[-1], min(errors[:-1]))
            self.assertGreater(errors[1], errors[2])
            self.assertGreater(errors[2], errors[3])

    def test_radial_force_includes_quadratic_pressure_geometric_integral(self):
        rho = .001
        for kind in ('original', 'smooth-source-aligned'):
            f = self.flow(2, kind)
            for linear, quadratic in ((300., 9000.), (-300., -9000.)):
                pressure = 300.+linear*f.mean_r+quadratic*f.mean_r2
                q = pressure_state(f, pressure, rho)
                expected = -q[0]*(linear+2*quadratic*f.mean_r)/rho
                np.testing.assert_allclose(f.rate(q)[1, :, 2:-2],
                    expected[:, 2:-2], rtol=3e-11, atol=0.)

    def test_native_equilibria_stay_balanced_for_mixtures_and_both_spin_signs(self):
        for kind in ('original', 'smooth-source-aligned'):
            for masses, fraction in (((39.948*U, 39.948*U), .5),
                                     ((36*U, 40*U), .2)):
                f = self.flow(1, kind, masses)
                for omega, temperature in ((-23000., 1800.), (9000., 5000.), (0., 3000.)):
                    q = equilibrium(f, omega, temperature, fraction)
                    p = f.primitive(q)
                    sound = np.max(p['soundMPS'])
                    scale = np.array([q[0], q[0]*sound, q[0]*sound,
                        q[0]*f.r[-1]*sound, q[4], q[0]])/f.stable_dt(q, .5)
                    self.assertTrue(np.all(abs(f.rate(q)) <= ROUNDING*scale))
                    out = q.copy()
                    for _ in range(6):
                        out = f.advance(out, f.stable_dt(out, .1))
                    self.assertLess(rms(f, f.primitive(out)['vrMPS']), 6*ROUNDING*sound)

    def test_pressure_step_limits_the_whole_profile_not_only_its_faces(self):
        f = self.flow(2)
        for low, high in ((1., 100.), (1e-6, 1e4)):
            pressure = np.full(f.nr, low)
            pressure[f.nr//3:2*f.nr//3] = high
            q = pressure_state(f, pressure)
            mean, slope, curvature, lo, hi, variance = quadratic_profile(f, q)
            locations = np.linspace(0., 1., 129)
            x = lo[:, None]+(hi-lo)[:, None]*locations
            profile = mean[..., None]+slope[..., None]*x+curvature[..., None]*(x*x-variance[:, None])
            vertex = np.zeros_like(curvature)
            np.divide(-slope, 2*curvature, out=vertex, where=curvature != 0)
            vertex = np.maximum(lo, np.minimum(hi, vertex))
            value = mean+slope*vertex+curvature*(vertex*vertex-variance)
            self.assertGreater(float(np.min(profile)), 0.)
            self.assertGreater(float(np.min(value)), 0.)
            self.assertGreaterEqual(float(np.min(profile)), low-ROUNDING*high)
            self.assertLessEqual(float(np.max(profile)), high*(1+ROUNDING))
            self.assertLessEqual(float(np.max(value)), high*(1+ROUNDING))

    def test_rotating_mixture_preserves_mean_and_positive_full_pressure_profile(self):
        f = self.flow(2)
        phase = 2*np.pi*f.mean_r/f.r[-1]
        q = pressure_state(f, 300.+140*np.sin(phase)+80*np.cos(2*phase),
            .001*(1+.2*np.cos(phase)), .2, 18000.*(1+.25*np.sin(phase)))
        p = f.primitive(q)
        lower, upper, slope, curvature = f._pressure_faces(p)
        coefficient = p['densityKgM3']*p['omegaRadS']**2/(2*p['pressurePa'])
        x, weight = np.polynomial.legendre.leggauss(32)
        lo, hi = f.r[:-1], f.r[1:]
        radius = .5*((lo+hi)[:, None]+(hi-lo)[:, None]*x)
        exponential = np.exp(coefficient[..., None]*(radius*radius-hi[:, None]**2))
        normalization = np.sum(exponential*radius*weight, axis=-1)*(hi-lo)/(hi*hi-lo*lo)
        baseline = p['pressurePa'][..., None]*exponential/normalization[..., None]
        offset = radius-f.mean_r[:, None]
        variance = f.mean_r2-f.mean_r**2
        profile = baseline+slope[..., None]*offset+curvature[..., None]*(
            offset*offset-variance[:, None])
        projected = np.sum(profile*radius*weight, axis=-1)*(hi-lo)/(hi*hi-lo*lo)
        np.testing.assert_allclose(projected, p['pressurePa'], rtol=3e-13, atol=0.)
        lower_x, upper_x = lo-f.mean_r, hi-f.mean_r
        vertex = np.zeros_like(curvature)
        np.divide(-slope, 2*curvature, out=vertex, where=curvature != 0)
        vertex = np.maximum(lower_x, np.minimum(upper_x, vertex))
        departure_min = np.minimum.reduce([slope*v+curvature*(v*v-variance)
                                          for v in (lower_x, upper_x, vertex)])
        baseline_min = p['pressurePa']*np.exp(coefficient*(lo*lo-hi*hi))/normalization
        self.assertGreater(float(np.min(baseline_min+departure_min)), 0.)
        self.assertGreater(float(np.min(profile)), 0.)
        for radius, actual in ((lo, lower), (hi, upper)):
            offset = radius-f.mean_r
            expected = p['pressurePa']*np.exp(coefficient*(radius*radius-hi*hi))/normalization
            expected += slope*offset+curvature*(offset*offset-variance)
            np.testing.assert_allclose(actual, expected, rtol=3e-13, atol=0.)

    def test_zero_spin_contact_resolves_density_and_species_without_acoustic_flux(self):
        f = self.flow(1, masses=(40*U, 40*U))
        rho = np.where(np.arange(f.nr)[None, :] < f.nr//2, .001, .003)
        fraction = np.where(np.arange(f.nr)[None, :] < f.nr//2, .2, .8)
        q = pressure_state(f, 100., rho, fraction)
        p = f.primitive(q)
        for flux, area in zip(f.fluxes(q), (f.radial_area, f.axial_area)):
            self.assertTrue(np.all(abs(flux[0]) <= ROUNDING*np.max(rho)*np.max(p['soundMPS'])*area))
            self.assertTrue(np.all(abs(flux[4]) <= ROUNDING*np.max(q[4]/f.volume)
                                   *np.max(p['soundMPS'])*area))

    def test_two_radial_cells_keep_the_physical_domain_and_closed_inventories(self):
        edges = ([0., .02, .06], [0., .08, .24])
        f = Flow(*edges, (36*U, 40*U))
        q = equilibrium(f, -9000.)
        out = f.advance(q, f.stable_dt(q, .05))
        self.assertLess(rms(f, f.primitive(out)['vrMPS']),
                        ROUNDING*np.max(f.primitive(q)['soundMPS']))
        q = f.state([.001, .0012], [2800., 3100.], .35, [7000., 9000.],
                    vr=[2., -3.], vz=1.)
        out, receipt = f.advance_with_receipt(q, f.stable_dt(q, .05))
        self.assertGreater(receipt['minimumThermalJ'], 0.)
        for component in (0, 3, 4, 5):
            np.testing.assert_allclose(out[component].sum(), q[component].sum(), rtol=3e-14, atol=0.)
        self.assertGreater(np.max(abs(out[0]-q[0])), 1e-15)

    def test_real_pressure_perturbations_accelerate_and_converge(self):
        omega, temperature, fraction = 7000., 3000., .35
        for amplitude in (-.05, .05):
            errors = []
            for n in (1, 2, 4, 8):
                f = self.flow(n)
                radius = f.r[-1]
                c2 = specific_constant(f, fraction)*temperature
                def density(r):
                    return .001*np.exp(omega**2*(r*r-radius*radius)/(2*c2))
                def bump(r):
                    return np.sin(np.pi*r/radius)**2
                rho = average(f, density)
                pressure = average(f, lambda r: c2*density(r)*(1+amplitude*bump(r)))
                q = pressure_state(f, pressure, rho, fraction, omega)
                expected = average(f, lambda r: -amplitude*density(r)*(
                    c2*np.pi/radius*np.sin(2*np.pi*r/radius)+omega**2*r*bump(r)))/rho
                acceleration = f.rate(q)[1]/q[0]
                errors.append(rms(f, acceleration-expected)/rms(f, expected))
                if n >= 4:
                    left = (f.mean_r > .15*radius) & (f.mean_r < .4*radius)
                    right = (f.mean_r > .6*radius) & (f.mean_r < .85*radius)
                    self.assertLess(amplitude*np.mean(acceleration[:, left]), 0.)
                    self.assertGreater(amplitude*np.mean(acceleration[:, right]), 0.)
            self.assertLess(errors[-1], min(errors[:-1]))
            self.assertGreater(errors[1], errors[2])
            self.assertGreater(errors[2], errors[3])

    def test_nonrigid_equilibrium_remains_a_converging_projection_control(self):
        omega, temperature, fraction = 14000., 3200., .65
        for beta in (-.4, .4):
            errors = []
            for n in (1, 2, 4):
                f = self.flow(n)
                radius = f.r[-1]
                c2 = specific_constant(f, fraction)*temperature
                def potential(r):
                    return omega**2/c2*(r*r/2+beta*r**4/(2*radius**2)
                        +beta*beta*r**6/(6*radius**4))
                rho = average(f, lambda r: .001*np.exp(potential(r)-potential(radius)))
                q = f.state(rho, temperature, fraction,
                            omega*(1+beta*f.mean_r**2/radius**2))
                errors.append(rms(f, f.rate(q)[1]/q[0])/(omega**2*radius))
            self.assertGreater(errors[0], errors[1])
            self.assertGreater(errors[1], errors[2])

    def test_nonisothermal_rotating_quadratic_pressure_force_converges(self):
        rho, omega = .001, 12000.
        for multiplier in (.5, 1.):
            errors = []
            for n in (1, 2, 4, 8):
                f = self.flow(n)
                coefficient = multiplier*rho*omega**2
                pressure = 600.+coefficient*f.mean_r2
                q = pressure_state(f, pressure, rho, omega=omega)
                expected = (omega**2-2*coefficient/rho)*f.mean_r
                error = f.rate(q)[1]/q[0]-expected
                volume = f.volume[:, 2:-2]
                errors.append(float(np.sqrt(np.sum(volume*error[:, 2:-2]**2)
                    /volume.sum()))/(omega**2*f.r[-1]))
            self.assertLess(errors[-1], min(errors[:-1]))
            self.assertGreater(errors[1], errors[2])
            self.assertGreater(errors[2], errors[3])

    def test_radial_pressure_shock_evolves_without_clipping_or_inventory_loss(self):
        f = Flow(np.linspace(0., .06, 49), np.linspace(0., .24, 4), (40*U, 40*U))
        side = f.mean_r[None, :] < .03
        rho, pressure = np.where(side, 1., .125), np.where(side, 1., .1)
        fraction = np.where(side, .2, .8)
        q = pressure_state(f, pressure, rho, fraction)
        initial = q.copy()
        for _ in range(20):
            q, receipt = f.advance_with_receipt(q, f.stable_dt(q, .025))
            p = f.primitive(q)
            self.assertGreater(np.min(p['densityKgM3']), 0.)
            self.assertGreater(np.min(p['pressurePa']), 0.)
            self.assertGreaterEqual(np.min(p['massFraction']), 0.)
            self.assertLessEqual(np.max(p['massFraction']), 1.)
            self.assertGreater(receipt['minimumThermalJ'], 0.)
        for component in (0, 3, 4, 5):
            np.testing.assert_allclose(q[component].sum(), initial[component].sum(), rtol=3e-14, atol=0.)
        self.assertGreater(rms(f, f.primitive(q)['vrMPS']), 1e-4)

    def test_perturbed_two_dimensional_flow_conserves_and_has_closed_wall_fluxes(self):
        f = self.flow()
        rr, zz = np.meshgrid(f.mean_r, (f.z[:-1]+f.z[1:])/2)
        q = f.state(.001*(1+.1*np.cos(np.pi*zz/f.z[-1])),
            3000.+40*np.sin(np.pi*rr/f.r[-1]), .4+.1*np.cos(np.pi*rr/f.r[-1]),
            9000.+1000*np.cos(np.pi*zz/f.z[-1]),
            3*np.sin(np.pi*rr/f.r[-1]), 2*np.sin(np.pi*zz/f.z[-1]))
        initial = q.copy()
        for _ in range(10):
            radial, axial = f.fluxes(q)
            for component in (0, 3, 4, 5):
                np.testing.assert_array_equal(radial[component, :, [0, -1]], 0.)
                np.testing.assert_array_equal(axial[component, [0, -1]], 0.)
            q = f.advance(q, f.stable_dt(q, .05))
        for component in (0, 3, 4, 5):
            np.testing.assert_allclose(q[component].sum(), initial[component].sum(), rtol=3e-14, atol=0.)
        self.assertGreater(np.max(abs(q[0]-initial[0])), 1e-15)


if __name__ == '__main__':
    unittest.main()
