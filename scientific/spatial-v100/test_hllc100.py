"""Independent analytic contact/upwind and admissibility checks; safe-dev only."""
from pathlib import Path
import sys
import unittest
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'mixture-axial-v75'))
from flow import Flow, GAMMA, KB

MASS = 39.948*1.66053906660e-27


def physical(rho, pressure, ur, uz, omega, species, radius2, normal):
    """Independent physical Euler state and flux at the specified face radius."""
    energy = pressure/(GAMMA-1)+rho*(ur*ur+uz*uz+radius2*omega*omega)/2
    state = np.array(np.broadcast_arrays(rho, rho*ur, rho*uz,
                                         rho*radius2*omega, energy, rho*species))
    speed = ur if normal == 1 else uz
    flux = state*speed
    flux[normal] += pressure
    flux[4] += pressure*speed
    return state, flux


class HLLCControls(unittest.TestCase):
    def test_moving_density_species_and_shear_contact_both_directions_and_axes(self):
        f = Flow([0, .001, .004, .009, .021, .035, .06],
                 [0, .003, .014, .04, .08, .15, .24], [MASS, MASS])
        face = 3
        for axis, normal in ((2, 1), (1, 2)):
            shape = (1, f.nr) if axis == 2 else (f.nz, 1)
            side = (np.arange(shape[-1] if axis == 2 else shape[0]) < face).reshape(shape)
            rho = np.where(side, .001, .003)
            tangent = np.where(side, 3., -8.)
            # An exact radial Riemann contact has no centrifugal body force.
            # Axial contacts still exercise discontinuous angular transport.
            omega = 0. if axis == 2 else np.where(side, 200., 900.)
            species = np.where(side, .2, .8)
            pressure = 80.
            for speed in (-17., 17.):
                with self.subTest(axis=axis, speed=speed):
                    ur, uz = (speed, tangent) if axis == 2 else (tangent, speed)
                    q = f.state(rho, pressure*MASS/(rho*KB), species, omega, ur, uz)
                    radial, axial = f.fluxes(q)
                    left = speed > 0
                    density = .001 if left else .003
                    shear = 3. if left else -8.
                    spin = 0. if axis == 2 else (200. if left else 900.)
                    y = .2 if left else .8
                    ur, uz = (speed, shear) if axis == 2 else (shear, speed)
                    radius2 = f.r[face]**2 if axis == 2 else f.mean_r2
                    _, expected = physical(density, pressure, ur, uz, spin, y, radius2, normal)
                    if axis == 2:
                        observed = radial[:, :, face]
                        expected = expected[:, None]*f.radial_area[None, :, face]
                    else:
                        observed = axial[:, face, :]
                        expected = expected*f.axial_area[None, face, :]
                    np.testing.assert_allclose(observed, expected, rtol=3e-13, atol=0.)

    def test_supersonic_flux_is_exactly_upstream_physical_flux(self):
        for normal in (1, 2):
            for sign in (-1., 1.):
                with self.subTest(normal=normal, sign=sign):
                    inputs = []
                    for rho, p, v, tangential, omega, y in (
                            (1., 1., 8*sign, 3., 2., .2),
                            (2., 3., 10*sign, -2., -4., .8)):
                        ur, uz = (v, tangential) if normal == 1 else (tangential, v)
                        state, flux = physical(rho, p, ur, uz, omega, y, .3, normal)
                        inputs.append((state, flux, v, np.sqrt(GAMMA*p/rho), p))
                    observed = Flow._hllc(*zip(*inputs), normal)
                    expected = inputs[0 if sign > 0 else 1][1]
                    np.testing.assert_array_equal(observed, expected)

    def test_radial_hllc_contact_transports_discontinuous_angular_momentum(self):
        # Prescribed Riemann states isolate angular advection from the radial
        # equilibrium reconstruction and its centrifugal body force.
        for speed in (-17., 17.):
            inputs = []
            for rho, omega, y in ((.001, 200., .2), (.003, 900., .8)):
                state, flux = physical(rho, 80., speed, 3., omega, y, .03**2, 1)
                inputs.append((state, flux, speed, np.sqrt(GAMMA*80./rho), 80.))
            observed = Flow._hllc(*zip(*inputs), 1)
            expected = inputs[0 if speed > 0 else 1][1]
            np.testing.assert_allclose(observed, expected, rtol=3e-13, atol=0.)

    def test_shock_tube_small_cfl_positive_and_conservative(self):
        f = Flow(np.linspace(0, .06, 5), np.linspace(0, .24, 81), [MASS, MASS])
        left = ((f.z[:-1]+f.z[1:])/2 < .12)[:, None]
        rho = np.where(left, 1., .125)
        pressure = np.where(left, 1., .1)
        q = f.state(rho, pressure*MASS/(rho*KB), np.where(left, .2, .8), 0.)
        initial = q.sum(axis=(1, 2))
        for _ in range(30):
            q, _ = f.advance_with_receipt(q, f.stable_dt(q, .05))
            p = f.primitive(q)
            self.assertTrue(np.all(np.isfinite(q)))
            self.assertGreater(float(p['pressurePa'].min()), 0.)
            self.assertGreater(float(p['densityKgM3'].min()), 0.)
            self.assertGreaterEqual(float(p['massFraction'].min()), 0.)
            self.assertLessEqual(float(p['massFraction'].max()), 1.)
        np.testing.assert_allclose(q.sum(axis=(1, 2))[[0, 4, 5]],
                                   initial[[0, 4, 5]], rtol=3e-14, atol=0.)
        np.testing.assert_array_equal(q[3], 0.)

    def test_strong_rarefaction_small_steps_remain_admissible(self):
        # Negative approximate interfacial traction is not itself negative
        # thermodynamic pressure: test evolved EOS positivity, not flux sign.
        for normal in (1, 2):
            for speed in (1., 8.):
                with self.subTest(normal=normal, speed=speed):
                    nr, nz = (40, 4) if normal == 1 else (4, 40)
                    f = Flow(np.linspace(0, .06, nr+1), np.linspace(0, .24, nz+1), [MASS, MASS])
                    center = f.mean_r[None, :] if normal == 1 else ((f.z[:-1]+f.z[1:])/2)[:, None]
                    velocity = np.where(center < (.03 if normal == 1 else .12), -speed, speed)
                    ur, uz = (velocity, 0.) if normal == 1 else (0., velocity)
                    q = f.state(1., MASS/KB, .5, 0., ur, uz)
                    initial = q.sum(axis=(1, 2))
                    for _ in range(20):
                        q = f.advance(q, f.stable_dt(q, .025))
                        p = f.primitive(q)
                        self.assertGreater(float(p['pressurePa'].min()), 0.)
                        self.assertGreater(float(p['densityKgM3'].min()), 0.)
                    np.testing.assert_allclose(q.sum(axis=(1, 2))[[0, 4, 5]],
                                               initial[[0, 4, 5]], rtol=3e-14, atol=0.)


if __name__ == '__main__':
    unittest.main()
