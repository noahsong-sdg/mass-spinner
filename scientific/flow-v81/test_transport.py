import unittest
import numpy as np
from transport import CASES, ENDPOINTS, SOURCE, profile, viscosity, source_collision_profile


class TransportControls(unittest.TestCase):
    def test_published_independent_reference_points_and_SI_units(self):
        self.assertAlmostEqual(float(viscosity(298.15)),22.5666e-6,places=15)
        check=SOURCE['publishedVerification']
        self.assertAlmostEqual(float(viscosity(check['temperatureK']))*1e6,
                               check['viscosityMicroPaS'],delta=check['roundingToleranceMicroPaS'])
        # The 1979 paper's independent mean-T estimate remains a useful cross-check.
        self.assertLess(abs(float(viscosity(2900))/1.14e-4-1),.02)

    def test_domain_is_not_silently_extrapolated(self):
        for t in (0.,83.99,10000.01,np.nan,np.inf):
            with self.assertRaises(ValueError): viscosity(t)
        self.assertTrue(np.all(viscosity([84.,10000.])>0))

    def test_every_endpoint_scenario_and_outer_continuation(self):
        self.assertEqual(len(CASES),12)
        for case in CASES[2:]:
            core,edge=ENDPOINTS[case.split('-',1)[1]]
            t,mu=profile(case,[0.,.025,.05,.06])
            np.testing.assert_array_equal(t[[0,2,3]],[core,edge,edge])
            self.assertTrue(np.all(np.diff(t)<=0))
            self.assertTrue(np.all(np.isfinite(mu)) and np.all(mu>0))
            np.testing.assert_array_equal(mu[2:],viscosity([edge,edge]))

    def test_axis_regularity_distinguishes_the_two_declared_shapes(self):
        step=1e-4
        q,_=profile('quadratic-nominal',[0.,step,2*step])
        linear,_=profile('linear-nominal',[0.,step,2*step])
        self.assertAlmostEqual((q[2]-q[0])/(q[1]-q[0]),4.,places=8)
        self.assertAlmostEqual((linear[2]-linear[0])/(linear[1]-linear[0]),2.,places=8)

    def test_baselines_and_geometry_boundaries(self):
        t,mu=profile('legacy',[0.,.06]); np.testing.assert_array_equal(mu,[1.14e-4]*2)
        t,nist=profile('nist-2900',[0.,.06]); np.testing.assert_array_equal(nist,viscosity(t))
        for r in ([-.01],[.061],[np.nan]):
            with self.assertRaises(ValueError): profile('quadratic-nominal',r)
        with self.assertRaises(ValueError): profile('selected-to-match-rotation',[.03])

    def test_source_collision_endpoints_and_effective_tensor_identity(self):
        for shape in ('linear','quadratic'):
            p=source_collision_profile(shape,[0.,.025,.05,.06])
            np.testing.assert_allclose(p['sourceParallelSM'][[0,2,3]],[1070.,950.,950.])
            np.testing.assert_allclose(p['electronBeta'][[0,2,3]],[100.,38.,38.])
            np.testing.assert_allclose(p['ionBeta'][[0,2,3]],[.94,.18,.18])
            np.testing.assert_allclose(p['sourcePedersenSM'],p['sourceParallelSM']/(1+p['effectiveBeta']**2),rtol=1e-14)
            np.testing.assert_allclose(p['parallelShape'],p['sourceParallelSM']/1070.)
            # Rounded endpoints plus leading neutral fraction do not exactly
            # reproduce the paper's rounded Hall conductivities; do not fit them.
            np.testing.assert_allclose(p['sourceHallSM'][[0,2]],[5.7,24.],rtol=.02)
            self.assertTrue(np.all(p['effectiveBeta']>0))

    def test_collision_shape_is_fixed_before_nonlinear_mapping(self):
        q=source_collision_profile('quadratic',[.025])
        linear=source_collision_profile('linear',[.025])
        self.assertAlmostEqual(float(q['electronBeta'][0]),84.5)
        self.assertAlmostEqual(float(linear['electronBeta'][0]),69.)
        for shape,r in (('fit',[.03]),('linear',[-.01]),('quadratic',[.061]),('linear',[np.nan])):
            with self.assertRaises(ValueError): source_collision_profile(shape,r)


if __name__=='__main__': unittest.main()
