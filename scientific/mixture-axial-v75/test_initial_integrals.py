"""Continuum-to-finite-volume projection, including unresolved kinetic energy."""
import json
from pathlib import Path
import unittest
import numpy as np
from endpoint_admission import check_initial
from run import configuration, initial_integrals


class InitialIntegrals(unittest.TestCase):
    def test_mesh_independent_continuum_inventories(self):
        m = json.loads(Path(__file__).with_name('manifest.json').read_text())
        mass = m['densityKgM3']*np.pi*m['radiusM']**2*m['lengthM']
        angular = np.pi*m['densityKgM3']*m['initialOmegaRadS']*m['radiusM']**4*m['lengthM']/12
        totals = []
        for nr, nz in ((3, 3), (6, 6), (12, 12), (24, 24)):
            _, setup, q, wall = configuration(m, nr, nz)
            total = q.sum(axis=(1, 2))
            np.testing.assert_allclose(total[[0, 3, 5]], [mass, angular, .5006*mass], rtol=1e-12)
            check_initial(dict(setup=setup, initialQ=q, initialSolidK=wall), m)
            totals.append(total)
        # The total includes integral(rho*v^2/2), rather than kinetic energy
        # of averaged velocity. The SAME continuum energy must be projected.
        np.testing.assert_allclose(np.asarray(totals)[:, 4], totals[-1][4], rtol=1e-12)

    def test_pre_projection_midpoint_state_is_rejected(self):
        m = json.loads(Path(__file__).with_name('manifest.json').read_text())
        f, setup, _, wall = configuration(m, 6, 6)
        rr, zz = np.meshgrid((f.r[:-1]+f.r[1:])/(2*f.r[-1]), (f.z[:-1]+f.z[1:])/(2*f.z[-1]))
        pattern = np.cos(np.pi*rr)*np.cos(np.pi*zz)
        old = f.state(m['densityKgM3']*(1+.04*pattern),
            m['initialGasK']+2*np.cos(np.pi*zz)*(1-rr*rr), .5+.06*pattern,
            m['initialOmegaRadS']*(1-rr*rr)*np.sin(np.pi*zz)**2,
            2*np.sin(np.pi*rr)*np.cos(np.pi*zz), np.cos(np.pi*rr)*np.sin(np.pi*zz))
        with self.assertRaisesRegex(AssertionError, 'canonical study'):
            check_initial(dict(setup=setup, initialQ=old, initialSolidK=wall), m)

    def test_quadrature_order_refinement(self):
        m = json.loads(Path(__file__).with_name('manifest.json').read_text())
        f, _, q, _ = configuration(m, 6, 6)
        refined = initial_integrals(f, m, order=24)
        scale = np.max(abs(refined), axis=(1, 2), keepdims=True)
        self.assertLess(np.max(abs(q-refined)/scale), 1e-13)

    def test_roundoff_envelope_does_not_admit_physical_nodal_velocity_bias(self):
        m = json.loads(Path(__file__).with_name('manifest.json').read_text())
        _, setup, q, wall = configuration(m, 3, 3)
        q[1, 1, 1] += 1e-8*q[0, 1, 1]
        with self.assertRaisesRegex(AssertionError, 'canonical study'):
            check_initial(dict(setup=setup, initialQ=q, initialSolidK=wall), m)


if __name__ == '__main__':
    unittest.main()
