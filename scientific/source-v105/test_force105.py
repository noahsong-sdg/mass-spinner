"""Independent cylindrical-source controls; root executes only in safe-dev.

Polynomial integrals below are analytic, not the candidate's quadrature.
These supplemental controls do not replace the frozen coupled-study gates.
"""
from pathlib import Path
import sys
import unittest

import numpy as np

SCIENCE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCIENCE/'mixture-axial-v75'))
from flow import Flow, KB
sys.path.insert(0, str(SCIENCE/'balance-v103'))
import test_balance103 as balance
sys.path.insert(0, str(SCIENCE/'source-v105'))
from force105 import SourceFlow

U = 1.66053906660e-27


def moment(lo, hi, power):
    return (hi**(power+1)-lo**(power+1))/(power+1)


def gas_constant(flow, fraction=.35):
    return KB*(fraction/flow.masses[0]+(1-fraction)/flow.masses[1])


def polynomial_flow(cls=None):
    cls = SourceFlow if cls is None else cls
    return cls(np.linspace(0., .06, 9), [0., .12, .24], [36*U, 40*U])


def equilibrium_factors(flow, p):
    """Independent normalized exponential at annulus edges."""
    a = p['densityKgM3']*p['omegaRadS']**2/(2*p['pressurePa'])
    span = a*np.diff(flow.r**2)
    upper = np.ones_like(span)
    np.divide(span, -np.expm1(-span), out=upper, where=span != 0)
    return upper*np.exp(-span), upper


class SourceForceControls(unittest.TestCase):
    def test_linear_pressure_zero_spin_has_exact_interior_force_both_signs(self):
        for slope in (-1700., 1700.):
            f = polynomial_flow()
            rho = .001
            pressure = 600.+slope*f.mean_r
            q = f.state(rho, pressure/(rho*gas_constant(f)), .35, 0.)
            acceleration = f.rate(q)[1]/q[0]
            # Both HLLC traces must have a full linear reconstruction stencil.
            # Cells next to a boundary share its reflected, limited trace.
            np.testing.assert_allclose(acceleration[:, 2:-2], -slope/rho,
                                       rtol=4e-12, atol=1e-6)
            self.assertTrue(np.isfinite(acceleration).all())
            p = f.primitive(q)
            left, right = f._face_states(p, 2)
            lower, upper = right[1, :, :-1], left[1, :, 1:]
            width = np.diff(f.r)
            actual_slope = (upper-lower)/width
            # The source integral, unlike the full flux divergence, is exact
            # even in cells whose reflecting stencil flattens the departure.
            integral = actual_slope*(moment(f.r[:-1], f.r[1:], 1)-f.mean_r*width)
            expected_source = 2*np.pi*np.diff(f.z)[:, None]*integral
            np.testing.assert_allclose(f._radial_source_correction(p), expected_source,
                                       rtol=2e-10, atol=2e-13)
            radial, axial = f.fluxes(q)
            for component in (0, 3, 4, 5):
                np.testing.assert_array_equal(radial[component, :, [0, -1]], 0.)
                np.testing.assert_array_equal(axial[component, [0, -1]], 0.)
            old = polynomial_flow(Flow)
            old_acceleration = old.rate(q)[1]/q[0]
            self.assertGreater(np.max(abs(old_acceleration[:, 2:-2]+slope/rho)),
                               .001*abs(slope/rho))

    def test_zero_owner_spin_linear_shear_has_exact_polynomial_force(self):
        f = polynomial_flow()
        cell = 4
        center, lo, hi = f.mean_r[cell], f.r[cell], f.r[cell+1]
        rho, pressure = .001, 600.
        for sign in (-1., 1.):
            slope = sign*7e5
            q = f.state(rho, pressure/(rho*gas_constant(f)), .35,
                        slope*(f.mean_r-center))
            p = f.primitive(q)
            self.assertEqual(p['omegaRadS'][0, cell], 0.)
            # Integral rho*slope^2*(r-center)^2*r^2 dr.
            integral = rho*slope**2*(moment(lo, hi, 4)
                -2*center*moment(lo, hi, 3)+center**2*moment(lo, hi, 2))
            expected = 2*np.pi*np.diff(f.z)*integral
            # The previous source sees owner Omega=0 and drops this entire term.
            old = polynomial_flow(Flow)
            new_rate, old_rate = f.rate(q), old.rate(q)
            np.testing.assert_allclose((new_rate-old_rate)[1, :, cell], expected,
                                       rtol=2e-11, atol=1e-14)
            np.testing.assert_allclose(f._radial_source_correction(p)[:, cell],
                                       expected, rtol=2e-11, atol=1e-14)
            self.assertGreater(float(np.min(expected)), 1e-4)

    def test_constant_spin_density_and_pressure_departures_integrate_exactly(self):
        f = polynomial_flow()
        rho = .001*(1+.8*f.mean_r/f.r[-1])
        for omega in (-9000., 9000.):
            q = f.state(rho, 600./(rho*gas_constant(f)), .35, omega)
            p = f.primitive(q)
            left, right = f._face_states(p, 2)
            lower, upper = right[:, :, :-1], left[:, :, 1:]
            eqlo, eqhi = equilibrium_factors(f, p)
            width = np.diff(f.r)
            br = ((upper[0]-p['densityKgM3']*eqhi)
                  -(lower[0]-p['densityKgM3']*eqlo))/width
            bp = ((upper[1]-p['pressurePa']*eqhi)
                  -(lower[1]-p['pressurePa']*eqlo))/width
            np.testing.assert_allclose(upper[4], lower[4], rtol=0., atol=1e-10)
            # Integral bp*(r-c)+br*omega^2*(r-c)*r^2 dr.
            lo, hi, c = f.r[:-1], f.r[1:], f.mean_r
            linear = moment(lo, hi, 1)-c*width
            cubic = moment(lo, hi, 3)-c*moment(lo, hi, 2)
            expected = 2*np.pi*np.diff(f.z)[:, None]*(bp*linear+br*omega**2*cubic)
            self.assertGreater(np.max(abs(expected[:, 1:-1])), 1e-7)
            np.testing.assert_allclose(f._radial_source_correction(p), expected,
                                       rtol=2e-9, atol=2e-12)

    def test_source_changes_radial_momentum_only_and_leaves_fluxes_identical(self):
        f, old = polynomial_flow(), polynomial_flow(Flow)
        rr, zz = np.meshgrid(f.mean_r, [.06, .18])
        q = f.state(.001*(1+.1*rr/.06), 3000.+100*rr/.06+80*zz/.24,
                    .4, 9000.+2000*rr/.06, 2*np.sin(np.pi*rr/.06), -3.)
        for new_flux, old_flux in zip(f.fluxes(q), old.fluxes(q)):
            np.testing.assert_array_equal(new_flux, old_flux)
        delta = f.rate(q)-old.rate(q)
        np.testing.assert_array_equal(delta[[0, 2, 3, 4, 5]], 0.)
        self.assertGreater(np.max(abs(delta[1])), 1e-7)
        out, _ = f.advance_with_receipt(q, f.stable_dt(q, .05))
        for component in (0, 3, 4, 5):
            np.testing.assert_allclose(out[component].sum(), q[component].sum(),
                                       rtol=3e-13, atol=0.)

    def test_axis_and_two_cell_meshes_remain_finite_with_closed_inventory_flux(self):
        for r in ([0., .01, .06], [0., .001, .004, .05, .056, .06]):
            f = SourceFlow(r, [0., .02, .24], [39.948*U]*2)
            q = f.state(.001*(1+.2*f.mean_r/.06), 3000., .5,
                        8000.*(1+f.mean_r/.06), 0., 0.)
            self.assertTrue(np.isfinite(f.rate(q)).all())
            self.assertTrue(np.isfinite(f._radial_source_correction(f.primitive(q))).all())
            radial, axial = f.fluxes(q)
            for component in (0, 3, 4, 5):
                np.testing.assert_array_equal(radial[component, :, [0, -1]], 0.)
                np.testing.assert_array_equal(axial[component, [0, -1]], 0.)
            f.primitive(f.advance(q, f.stable_dt(q, .03)))

    def test_unrepresentable_exponential_reconstruction_fails_explicitly(self):
        f = polynomial_flow()
        q = f.state(.001, 350., .35, 1e7)
        with self.assertRaises((ValueError, ArithmeticError)):
            f.rate(q)


class SourceBalanceControls(balance.ForceBalanceControls):
    """Inherited independent V103 controls now exercise the candidate class.

    Covers native rigid equilibria of either sign, equal/mixed masses,
    finite evolution, nonrigid and nonisothermal refinement and real forces.
    """
    def flow(self, n=1, kind='smooth-source-aligned', masses=(36*U, 40*U)):
        old = super().flow(n, kind, masses)
        return SourceFlow(old.r, old.z, old.masses)


if __name__ == '__main__':
    unittest.main()
