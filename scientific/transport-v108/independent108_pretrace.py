"""Independent Newtonian strong-form controls; execute only in safe-dev.

These test the actual Q1 stress stiffness against annular-cell averages of
analytic cylindrical force densities. Boundary rows are reported separately:
an FE nodal load is not a finite-volume strong operator at a wall centroid.
No frozen coupled-study gate is changed by these manufactured controls.
"""
import json
from pathlib import Path
import sys
import unittest

import numpy as np

SCIENCE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCIENCE/'mixture-axial-v75'))
sys.path.insert(0, str(SCIENCE/'meridional-v86'))
from flow import Flow
from diffusion86 import Diffusion, M_AR

R, H, MU = .06, .24, 1.14e-4


def radial_moment(edges, power):
    return 2*np.diff(edges**(power+2))/((power+2)*np.diff(edges**2))


def axial_moment(edges, power):
    return np.diff(edges**(power+1))/((power+1)*np.diff(edges))


def manufactured(n):
    """ur=a*r*A*B, uz=b*z*A*B, Omega=c*A*B; A=R²-r²,B=H²-z².

    All wall velocities vanish. Axis and lower-z symmetry are satisfied.
    The input conserves exactly averaged momenta, not centroid-point values.
    """
    f = Flow(np.linspace(0., R, n+1), np.linspace(0., H, 4*n+1), [M_AR, M_AR])
    d = Diffusion(f, MU, conductivity=.1)
    rm = {p: radial_moment(f.r, p)[None, :] for p in (1, 2, 3, 4)}
    zm = {p: axial_moment(f.z, p)[:, None] for p in (1, 2, 3)}
    a, b, c = 1/(R*H**2), 1/(H*R**2), 1e4/(R**2*H**2)
    A, B = R**2-rm[2], H**2-zm[2]
    vr = a*(R**2*rm[1]-rm[3])*B
    vz = b*(H**2*zm[1]-zm[3])*A
    omega = c*(R**2*rm[2]-rm[4])/rm[2]*B
    q = f.state(2e-4, 1e4, .4, omega, vr=vr, vz=vz)
    force_r = MU*(-32*a*rm[1]*B/3
        -2*a*(R**2*rm[1]-rm[3])-2*b*rm[1]*(H**2-3*zm[2])/3)
    force_z = MU*(-4*b*(H**2*zm[1]-zm[3])-8*b*zm[1]*A
        -4*a*zm[1]*(R**2-2*rm[2])/3)
    torque = MU*c*(-8*rm[2]*B-2*(R**2*rm[2]-rm[4]))
    expected = np.asarray([force_r, force_z, torque])
    nodal_force = -d.stiffness@d.nodal_velocity(q)
    actual = nodal_force[d.vdofs].reshape(expected.shape)/f.volume
    return f, d, q, actual, expected


def relative_rms(f, actual, expected, mask):
    volume = f.volume*mask
    return [float(np.sqrt(np.sum(volume*(a-e)**2)/np.sum(volume*e**2)))
            for a, e in zip(actual, expected)]


class IndependentStressControls(unittest.TestCase):
    def test_annular_and_axial_moment_reference_has_exact_constant_and_linear_limits(self):
        r = np.array([0., .001, .017, .06]); z = np.array([0., .002, .07, .24])
        np.testing.assert_allclose(radial_moment(r, 0), 1., rtol=2e-15)
        np.testing.assert_allclose(axial_moment(z, 0), 1., rtol=2e-15)
        np.testing.assert_allclose(radial_moment(r, 2), (r[1:]**2+r[:-1]**2)/2, rtol=2e-15)
        np.testing.assert_allclose(axial_moment(z, 1), (z[1:]+z[:-1])/2, rtol=2e-15)

    def test_constant_normal_strains_have_zero_interior_stress_divergence(self):
        f = Flow(np.linspace(0., R, 9), np.linspace(0., H, 17), [M_AR, M_AR])
        d = Diffusion(f, MU, conductivity=.1)
        r, z = d.mesh.p
        x = np.zeros(d.velocity.N)
        x[d.velocity.nodal_dofs[0]] = 2*r
        x[d.velocity.nodal_dofs[1]] = 3*z
        # Constant deviatoric stresses, tau_rr=tau_tt: the hoop force cancels.
        force = (d.stiffness@x)[d.vdofs]
        np.testing.assert_allclose(force, 0., rtol=0., atol=1e-16)

    def test_manufactured_interior_stress_forces_contract_under_joint_refinement(self):
        rows = []
        for n in (8, 16, 32):
            f, d, q, actual, expected = manufactured(n)
            interior = np.zeros(f.volume.shape, dtype=bool)
            interior[2:-2, 2:-2] = True
            endwall = np.zeros_like(interior); endwall[-1, 2:-2] = True
            row = dict(nr=f.nr, nz=f.nz,
                interiorRelativeRMS=relative_rms(f, actual, expected, interior),
                endwallRelativeRMS=relative_rms(f, actual, expected, endwall),
                fullDomainRelativeRMS=relative_rms(f, actual, expected, np.ones_like(interior)))
            rows.append(row)
        print('INDEPENDENT_STRESS108 '+json.dumps(rows, allow_nan=False), flush=True)
        errors = np.asarray([r['interiorRelativeRMS'] for r in rows])
        self.assertTrue(np.all(errors[1:] < errors[:-1]))
        self.assertTrue(np.all(errors[-1] < .02))
        self.assertTrue(np.all(np.log2(errors[-2]/errors[-1]) > 1.2))


if __name__ == '__main__':
    unittest.main(verbosity=2)
