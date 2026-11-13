"""Compare optimized heat evaluation with the original vector FE quadrature."""
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
import numpy as np
from skfem import Basis, BilinearForm, ElementQuad1, ElementVector, MeshQuad, asm
from scipy.sparse import diags

HERE = Path(__file__).resolve().parent
for folder in ('mixture-axial-v75', 'meridional-v86'):
    sys.path.insert(0, str(HERE.parent/folder))
from flow import Flow
from diffusion86 import Diffusion, KB, M_AR, strains, deviatoric_product


class QuadratureControls(unittest.TestCase):
    def test_full_grid_coefficient_arrays_and_callbacks_keep_their_semantics(self):
        # More than 1,024 split elements exercises the production batch boundary.
        f = Flow(np.linspace(0., .06, 18), np.linspace(0., .14, 19), [M_AR, M_AR])
        split = MeshQuad.init_tensor(np.union1d(np.r_[0., f.mean_r, .06], f.r),
            np.union1d(np.r_[0., (f.z[:-1]+f.z[1:])/2, .14], f.z))
        scalar = Basis(split, ElementQuad1(), intorder=6)
        r, z = scalar.global_coordinates()
        cases = (('array', 1.14e-4*(1+2*r+3*z)),
                 ('callback', lambda r, z: 1.14e-4*(1+np.mean(r))))
        for label, mu in cases:
            with self.subTest(coefficient=label):
                d = Diffusion(f, mu, conductivity=.1)
                full = Basis(split, ElementVector(ElementQuad1(), dim=3), intorder=6)
                @BilinearForm
                def stress(u, v, w):
                    value = mu(*w.x) if callable(mu) else mu
                    return 2*value*2*np.pi*w.x[0]*deviatoric_product(
                        strains(u, w.x[0]), strains(v, w.x[0]))
                expected = d.prolongation.T@asm(stress, full)@d.prolongation
                difference = (d.stiffness-expected).tocoo()
                self.assertLess(np.max(abs(difference.data), initial=0.),
                                3e-13*np.max(abs(expected.data)))
                x = np.random.default_rng(103).normal(size=d.velocity.N)
                self.assertAlmostEqual(d.dissipation_cells(x).sum()/float(x@(d.stiffness@x)),
                                       1., places=12)

    def test_batched_stress_matches_whole_mesh_including_partial_batch(self):
        f = Flow([0., .003, .02, .06], [0., .007, .04, .14], [M_AR, M_AR])
        mu = lambda r, z: 1.14e-4*(1+2*r+3*z)
        for size in (3, 7):
            with patch('diffusion86.STRESS_BATCH_ELEMENTS', size):
                d = Diffusion(f, mu, conductivity=.1)
            split = d.integration.mesh
            full = Basis(split, ElementVector(ElementQuad1(), dim=3), intorder=6)
            @BilinearForm
            def stress(u, v, w):
                return 2*mu(*w.x)*2*np.pi*w.x[0]*deviatoric_product(
                    strains(u, w.x[0]), strains(v, w.x[0]))
            expected = (d.prolongation.T@asm(stress, full)@d.prolongation).toarray()
            np.testing.assert_allclose(d.stiffness.toarray(), expected,
                                       rtol=3e-13, atol=1e-18)

    def test_reordered_systems_match_dense_with_changing_capacities(self):
        f = Flow([0., .003, .02, .06], [0., .007, .04, .14], [M_AR, M_AR])
        d = Diffusion(f, 1.14e-4)
        rng = np.random.default_rng(102)
        for dt, factor in ((1e-7, .6), (3e-6, 1.8), (2e-8, 1.1)):
            mass = factor*.001*f.volume.ravel()
            mechanical = np.zeros(d.velocity.N)
            mechanical[d.vdofs[0]] = mechanical[d.vdofs[1]] = mass
            mechanical[d.vdofs[2]] = mass*np.tile(f.mean_r2, f.nz)
            thermal = np.zeros(d.heat.N)
            thermal[d.tdofs] = 1.5*KB*mass/M_AR
            for stiffness, capacity, free in ((d.stiffness, mechanical, d.free),
                    (d.thermal_stiffness, thermal, np.arange(d.heat.N))):
                matrix = diags(capacity)+dt*stiffness
                rhs = capacity*rng.normal(size=len(capacity))
                reduced = matrix[free][:, free].toarray()
                # Equilibrate the independent dense reference: mixed momentum
                # units and zero-capacity boundary traces make the raw matrix
                # ill-conditioned even when its equilibrated form is benign.
                scale = 1/np.sqrt(reduced.diagonal())
                expected = np.zeros_like(rhs)
                expected[free] = scale*np.linalg.solve(
                    scale[:, None]*reduced*scale[None, :], scale*rhs[free])
                np.testing.assert_allclose(d.solve(matrix, rhs, free), expected,
                                           rtol=2e-10, atol=2e-13)
                known = np.zeros_like(rhs)
                known[free] = rng.normal(size=len(free))
                np.testing.assert_allclose(d.solve(matrix, matrix@known, free), known,
                                           rtol=2e-10, atol=2e-13)

    def test_full_vector_cell_heat_matches_original_quadrature(self):
        f = Flow([0., .0008, .003, .014, .04, .06],
                 [0., .0004, .007, .032, .08, .14], [M_AR, M_AR])
        mu = lambda r, z: 1.14e-4*(1+2*r+3*z)
        d = Diffusion(f, mu, conductivity=.1)
        mesh = MeshQuad.init_tensor(np.union1d(d.rnodes, f.r),
                                    np.union1d(d.znodes, f.z))
        original = Basis(mesh, ElementVector(ElementQuad1(), dim=3), intorder=6)
        rng = np.random.default_rng(101)
        for x in (rng.normal(size=d.velocity.N),
                  d.nodal_velocity(f.state(.001, 3000., .4, 300., vr=2., vz=-3.))):
            field = original.interpolate(d.prolongation@x)
            points = np.asarray(original.global_coordinates())
            e = strains(field, points[0])
            density = 2*mu(*points)*deviatoric_product(e, e)
            ri = np.searchsorted(f.r, points[0], side='right')-1
            zi = np.searchsorted(f.z, points[1], side='right')-1
            expected = np.bincount((zi*f.nr+ri).ravel(),
                weights=(density*original.dx*2*np.pi*points[0]).ravel(), minlength=f.count)
            actual = d.dissipation_cells(x)
            np.testing.assert_allclose(actual, expected, rtol=3e-13, atol=0.)
            self.assertTrue(np.all(actual >= 0))
            self.assertAlmostEqual(actual.sum()/float(x@(d.stiffness@x)), 1., places=12)


if __name__ == '__main__':
    unittest.main()
