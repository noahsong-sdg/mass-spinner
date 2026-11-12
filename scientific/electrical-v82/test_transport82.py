import unittest
import numpy as np
from transport82 import profile,collision_gain,SCENARIOS,base,B,E,ME,QEN,NEUTRAL_ENDPOINTS_M3


class CoupledElectronTransportControls(unittest.TestCase):
    def test_source_partition_units_and_independent_rates(self):
        p=profile('linear',np.array([0.,.05,.06]))
        np.testing.assert_array_equal(p['neutralDensityM3'],[4.3e20,45.e20,45.e20])
        thermal_speed=np.sqrt(8*E/(np.pi*ME))
        self.assertGreater(thermal_speed,6.e5); self.assertLess(thermal_speed,7.e5)
        np.testing.assert_allclose(p['sourceReferenceNeutralRateS'],np.array([4.3e20,45.e20,45.e20])*QEN*thermal_speed)
        np.testing.assert_allclose(p['referenceTotalElectronRateS'],E*B/(ME*np.array([100.,38.,38.])))
        np.testing.assert_allclose(p['sourceNeutralCollisionFraction'],
            p['sourceReferenceNeutralRateS']/p['referenceTotalElectronRateS'])
        self.assertTrue(np.all(p['sourceNeutralCollisionFraction']>0))
        self.assertTrue(np.all(p['sourceNeutralCollisionFraction']<.3))

    def test_one_eV_degeneracy_reproduces_frozen_transport(self):
        r=np.array([0.,.01,.025,.05,.06])
        for shape in ('linear','quadratic'):
            old=base.source_collision_profile(shape,r)
            for partition in ('source','electron-ion-only','uniform-20pct'):
                p=profile(shape,r,1.,partition,leading_weak_ionization=True)
                for new,prior in [('sigmaParallelSM','sourceParallelSM'),('effectiveBeta','effectiveBeta'),
                                  ('pedersenSM','sourcePedersenSM'),('hallSM','sourceHallSM')]:
                    np.testing.assert_allclose(p[new],old[prior],rtol=1e-14)
                np.testing.assert_allclose(p['electronConductivityGain'],1.,rtol=1e-14)

    def test_collisions_and_density_covary_without_changing_heavy_transport(self):
        r=np.linspace(0.,.06,13)
        for shape in ('linear','quadratic'):
            cold=profile(shape,r)
            for partition in ('source','electron-ion-only','uniform-20pct'):
                hot=profile(shape,r,2.5,partition)
                np.testing.assert_allclose(hot['sigmaParallelSM']*B/(E*hot['electronBeta']),cold['impliedElectronDensityM3'],rtol=1e-14)
                total=hot['electronIonRateS']+hot['electronNeutralRateS']
                np.testing.assert_allclose(total,hot['referenceTotalElectronRateS']/hot['electronConductivityGain'],rtol=1e-14)
                np.testing.assert_allclose(hot['electronBeta'],E*B/(ME*total),rtol=1e-14)
                np.testing.assert_array_equal(hot['ionBeta'],cold['ionBeta'])
                np.testing.assert_array_equal(hot['viscosityPaS'],cold['viscosityPaS'])
                np.testing.assert_array_equal(hot['heavyTemperatureK'],cold['heavyTemperatureK'])

    def test_full_ion_slip_tensor_is_recomputed(self):
        p=profile('quadratic',np.array([[0.,.025,.05]]),2.5)
        s=p['neutralMassFraction']**2*p['electronBeta']*p['ionBeta']; d=(1+s)**2+p['electronBeta']**2
        np.testing.assert_allclose(p['pedersenSM'],p['sigmaParallelSM']/(1+p['effectiveBeta']**2),rtol=1e-14)
        np.testing.assert_allclose(p['hallSM'],p['sigmaParallelSM']*p['electronBeta']/d,rtol=1e-14)
        self.assertTrue(np.all(p['pedersenSM']>0)); self.assertEqual(p['pedersenSM'].shape,(1,3))

    def test_declared_endmembers_and_scenarios(self):
        self.assertEqual(len(SCENARIOS),10); self.assertEqual(len({s['name'] for s in SCENARIOS}),10)
        self.assertAlmostEqual(float(collision_gain(2.5,0.)),2.5**1.5)
        self.assertAlmostEqual(float(collision_gain(2.5,.2)),1/(.8*2.5**-1.5+.2*np.sqrt(2.5)))
        for s in SCENARIOS:
            p=profile(s['shape'],.025,s['electronTemperatureEV'],s['partition'],s['leadingWeakIonization'])
            self.assertEqual(np.asarray(p['sigmaParallelSM']).shape,())
            self.assertGreater(float(p['sigmaParallelSM']),0)

    def test_finite_neutral_fraction_is_squared_and_not_collision_fraction(self):
        for shape in ('linear','quadratic'):
            r=np.array([0.,.025,.05,.06]); finite=profile(shape,r)
            leading=profile(shape,r,leading_weak_ionization=True)
            fn=finite['neutralDensityM3']/(finite['neutralDensityM3']+finite['impliedElectronDensityM3'])
            np.testing.assert_allclose(finite['neutralMassFraction'],fn,rtol=1e-14)
            np.testing.assert_allclose(finite['ionSlipFactor']/leading['ionSlipFactor'],fn**2,rtol=1e-14)
            np.testing.assert_allclose(finite['sigmaParallelSM'],leading['sigmaParallelSM'],rtol=1e-14)
            np.testing.assert_array_equal(finite['sourceNeutralCollisionFraction'],leading['sourceNeutralCollisionFraction'])
            self.assertTrue(np.all(fn>0) and np.all(fn<1))
            # Independent Table1 density estimates bracket the implied endpoints;
            # they are a consistency check, not a replacement radial ne map.
            self.assertGreater(float(finite['impliedElectronDensityM3'][0]),6.e18)
            self.assertLess(float(finite['impliedElectronDensityM3'][0]),10.e18)
            self.assertGreater(float(finite['impliedElectronDensityM3'][2]),20.e18)
            self.assertLess(float(finite['impliedElectronDensityM3'][2]),24.e18)

    def test_invalid_inputs_are_rejected_without_clamping(self):
        for t,f in ((0.,.1),(np.nan,.1),(1.,-.01),(1.,1.),(1.,np.inf)):
            with self.assertRaises(ValueError): collision_gain(t,f)
        for arguments in [('fit',[.03],1.,'source'),('linear',[-.01],1.,'source'),
                          ('linear',[.061],1.,'source'),('linear',[.03],3.,'source'),
                          ('linear',[.03],1.,'fit')]:
            with self.assertRaises(ValueError): profile(*arguments)


if __name__=='__main__': unittest.main()
