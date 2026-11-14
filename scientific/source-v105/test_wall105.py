"""Advected no-slip wall shear: analytic Euler flux, not stationary LLF shear.

The last interior axial face lies in a constant-radial-profile strip. There
ur=U*(H-z)/H and uz=V*(H-z)/H; rho and pressure are constant. Its exact
tangential momentum flux is area*rho*ur*uz for either sign of V. Both
velocities vanish at the stationary endwall. Tapers away from the tested
strip respect the remaining axis, midplane and outer-wall velocity values.
"""
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'mixture-axial-v75'))
from flow import Flow


class WallFlow(Flow):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs, noSlipWalls=True)

M_AR = 39.948*1.66053906660e-27
R, H, RHO, U = .06, .24, .001, 10.


def fixture(cls, sign, graded):
    r = R*np.linspace(0., 1., 13)**(1.3 if graded else 1.)
    z = H*np.linspace(0., 1., 17)**(1.2 if graded else 1.)
    flow = cls(r, z, [M_AR, M_AR])
    rr, zz = np.meshgrid(flow.mean_r, (z[:-1]+z[1:])/2)
    taper = np.minimum(1., np.minimum(4*rr/R, 4*(R-rr)/R))
    axial_taper = np.minimum(1., 4*(R-rr)/R)
    ur = U*taper*np.minimum(.5, 1-zz/H)
    uz = sign*4*axial_taper*np.minimum(zz/H, 1-zz/H)
    q = flow.state(RHO, 2900., .4, 0., vr=ur, vz=uz)
    cell = flow.nr//2
    if not np.all(taper[-3:, cell-1:cell+2] == 1.):
        raise ValueError('Analytic witness must remain inside the radial plateau')
    height = (H-z[-2])/H
    exact = flow.axial_area[-2, cell]*RHO*U*sign*4*height**2
    return flow, q, cell, height, exact


class AdvectedWallControls(unittest.TestCase):
    def test_both_owner_traces_resolve_linear_shear_for_both_flow_signs(self):
        for graded in (False, True):
            for sign in (-1., 1.):
                with self.subTest(graded=graded, sign=sign):
                    f, q, cell, height, _ = fixture(WallFlow, sign, graded)
                    self.assertTrue(f.noSlipWalls)
                    left, right = f._face_states(f.primitive(q), 1)
                    for trace in (left, right):
                        np.testing.assert_allclose(trace[[2, 3], -2, cell],
                            [U*height, sign*4*height], rtol=2e-12, atol=1e-13)
                    old, oq, _, _, _ = fixture(Flow, sign, graded)
                    self.assertFalse(old.noSlipWalls)
                    owner = old._face_states(old.primitive(oq), 1)[1]
                    np.testing.assert_allclose(owner[2, -2, cell], U*height/2,
                                               rtol=2e-12, atol=1e-13)

    def test_actual_hllc_tangential_flux_matches_signed_physical_advection(self):
        for graded in (False, True):
            for sign in (-1., 1.):
                with self.subTest(graded=graded, sign=sign):
                    f, q, cell, _, exact = fixture(WallFlow, sign, graded)
                    actual = f.fluxes(q)[1][1, -2, cell]
                    np.testing.assert_allclose(actual, exact, rtol=5e-11, atol=1e-16)
                    old, oq, _, _, _ = fixture(Flow, sign, graded)
                    # Outward flow upwinds the correct interior owner; inward
                    # flow exposes the flattened wall-cell tangential trace.
                    expected_old = exact*(.5 if sign < 0 else 1.)
                    np.testing.assert_allclose(old.fluxes(oq)[1][1, -2, cell],
                                               expected_old, rtol=5e-11, atol=1e-16)

    def test_wall_mass_flux_and_inviscid_tangential_wall_traction_stay_zero(self):
        for cls in (Flow, WallFlow):
            for sign in (-1., 1.):
                f, q, _, _, _ = fixture(cls, sign, True)
                radial, axial = f.fluxes(q)
                np.testing.assert_array_equal(radial[0, :, [0, -1]], 0.)
                np.testing.assert_array_equal(axial[0, [0, -1]], 0.)
                np.testing.assert_array_equal(axial[1, -1], 0.)
                np.testing.assert_array_equal(radial[2, :, -1], 0.)

    def test_ssprk2_advects_inward_shear_with_the_expected_leading_order_change(self):
        for graded in (False, True):
            f, q, cell, _, exact = fixture(WallFlow, -1., graded)
            old, oq, _, _, _ = fixture(Flow, -1., graded)
            dt = f.stable_dt(q, .1)*1e-4
            new, legacy = f.advance(q, dt), old.advance(oq, dt)
            # At this cell all radial fluxes and body sources initially agree;
            # the endwall contributes zero tangential Euler flux. The missing
            # half of the inward interior-face flux therefore controls dPr/dt.
            observed = (new[1, -1, cell]-legacy[1, -1, cell])/dt
            np.testing.assert_allclose(observed, .5*exact, rtol=2e-4, atol=1e-12)


if __name__ == '__main__':
    unittest.main(verbosity=2)
