import copy
import inspect
import unittest

import numpy as np

import optical86 as optical


class RadialOpticalControls(unittest.TestCase):
    def test_zero_radial_flow_recovers_exact_frozen_components(self):
        e=[0,.02,.06]; f=[2.,1.]; r=[0,.01,.04,.06]; omega=[100.,200.,300.]
        old=optical.spectrum80.components(e,f,r,omega,.015)
        new=optical.components(e,f,r,omega,[0,0,0],.015)
        for a,b in zip(old,new): np.testing.assert_array_equal(a,b)

    def test_symmetric_radial_flow_preserves_swirl_centroid_and_total_photons(self):
        for b in (0.,.01,-.01,.059):
            w,u,r=optical.components([0,.06],[3.],[0,.06],[1000.],[300.],b,32)
            self.assertAlmostEqual(sum(w),6*np.sqrt(.06**2-b*b),places=13)
            self.assertAlmostEqual(w@u/sum(w),b*1000,places=10)
            self.assertTrue(np.all(w>0)); self.assertTrue(np.all(r==.03))

    def test_pure_radial_excess_variance_matches_analytic_chord_integral(self):
        b=.02; R=.06; speed=300.; length=np.sqrt(R*R-b*b)
        w,u,_=optical.components([0,R],[1.],[0,R],[0.],[speed],b,64)
        expected=speed**2*(1-b/length*np.arctan(length/b))
        self.assertAlmostEqual(w@u/sum(w),0.,places=10)
        self.assertAlmostEqual(w@(u*u)/sum(w),expected,places=7)
        result=optical.spectrum(w,u,1800.,np.linspace(-12000,12000,2401))
        self.assertAlmostEqual(result['varianceM2S2'],expected+optical.spectrum80.KB*1800/optical.spectrum80.AR_MASS,places=7)
        self.assertAlmostEqual(result['capturedFlux'],1.,places=12)

    def test_radial_sign_reversal_preserves_complete_spectrum(self):
        bins=np.linspace(-12000,12000,2401); records=[]
        for sign in (-1,1):
            w,u,r=optical.components([0,.02,.06],[2,1],[0,.03,.06],[2000,1000],sign*np.array([100,300]),.01,8)
            records.append(optical.spectrum(w,u,optical.temperature_proxy('linear',r),bins,500.))
        np.testing.assert_allclose(records[0]['photonFractions'],records[1]['photonFractions'],atol=1e-15,rtol=1e-13)

    def test_blocked_spectrum_matches_existing_kernel(self):
        means=np.linspace(-500,700,601); weights=np.linspace(1,2,601)
        temperatures=np.linspace(1400,7250,601); bins=np.linspace(-12000,12000,2401)
        old=optical.spectrum80.gaussian_spectrum(weights,means,temperatures,bins,500.)
        new=optical.spectrum(weights,means,temperatures,bins,500.)
        for k in ('centroidMS','modeMS','varianceM2S2','capturedFlux','binCentroidMS'):
            np.testing.assert_allclose(new[k],old[k],atol=1e-10,rtol=1e-11)
        np.testing.assert_allclose(new['photonFractions'],old['photonFractions'],atol=1e-15,rtol=1e-12)

    def test_input_boundaries_reject_missing_stale_or_nonfinite_fields(self):
        for edges,omega,ur in (([0,.06],[1],[]),([0,.06],[1],[np.nan]),([0,.06,.04],[1,2],[0,1]),([.001,.06],[1],[1])):
            with self.assertRaises(ValueError): optical.components([0,.06],[1],edges,omega,ur,.01)
        for impact in (.06,np.nan):
            with self.assertRaises(ValueError): optical.components([0,.06],[1],[0,.06],[1],[1],impact)
        with self.assertRaises(ValueError): optical.components([0,.06],[1],[0,.06],[1],[1],.01,1)

    def test_predict_keeps_all_thermal_instrument_closure_alternatives_and_no_target_argument(self):
        R=.06; b=np.linspace(0,.05,6); intensity=2*np.sqrt(R*R-b*b)
        brightness=[dict(radiusM=float(x),brightness=float(y),brightnessExtractionRange=[float(.8*y),float(1.2*y)]) for x,y in zip(b,intensity)]
        locations=[dict(id='test',radiusM=.02)]
        result=optical.predict([0,.03,.06],[1000,1000],[20,30],brightness,locations,
            meshes=(4,8),bin_sizes=(20.,10.),los_orders=(2,4))
        self.assertNotIn('velocity',inspect.signature(optical.predict).parameters)
        self.assertIs(result['targetVelocityRead'],False)
        self.assertIs(result['experimentalQualification'],False)
        self.assertEqual(len(result['cases']),1)
        closures=result['cases'][0]['closures']; self.assertEqual(len(closures),2)
        for closure in closures:
            keys={(s['temperatureK'],s['instrumentSigmaMS']) for s in closure['spectra']}
            self.assertEqual(keys,{(t,g) for t in optical.TEMPERATURES for g in optical.INSTRUMENTS})
            self.assertEqual(len(closure['spectra']),18)
            self.assertTrue(all(len(s['losQuadrature'])==2 for s in closure['spectra']))
            self.assertTrue(all(isinstance(s['losQuadratureGate'],bool) for s in closure['spectra']))
        # Locations are coordinates only; arbitrary extra measured-velocity
        # annotations cannot enter prediction construction.
        changed=copy.deepcopy(locations); changed[0]['velocityMS']=1e30
        calls=[]
        def backend(*args):
            calls.append(True)
            return optical.spectrum(*args)
        repeated=optical.predict([0,.03,.06],[1000,1000],[20,30],brightness,changed,
            meshes=(4,8),bin_sizes=(20.,10.),los_orders=(2,4),spectrum_fn=backend)
        self.assertGreater(len(calls),0)
        self.assertEqual(repeated['cases'],result['cases'])


if __name__=='__main__': unittest.main()
