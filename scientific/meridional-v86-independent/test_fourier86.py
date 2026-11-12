import importlib.util
from pathlib import Path
import unittest

import numpy as np

from fourier86 import spectrum,KB,AR_MASS

SOURCE=Path(__file__).parents[1]/'optical-v80/spectrum.py'
spec=importlib.util.spec_from_file_location('frozen_cdf_for_fourier86',SOURCE)
reference=importlib.util.module_from_spec(spec); spec.loader.exec_module(reference)
spec86=importlib.util.spec_from_file_location('grouped_cdf_for_fourier86',SOURCE.parent.parent/'meridional-v86/optical86.py')
reference86=importlib.util.module_from_spec(spec86); spec86.loader.exec_module(reference86)


class FourierSpectrumControls(unittest.TestCase):
    def compare(self,w,u,t,bins,instrument=0.):
        exact=reference.gaussian_spectrum(w,u,t,bins,instrument)
        actual=spectrum(w,u,t,bins,instrument)
        info=actual['fourier']; tolerance=info['floatingPointProbabilityBound']+info['truncationProbabilityBound']/len(actual['photonFractions'])+info['imageProbabilityBound']
        np.testing.assert_allclose(actual['photonFractions'],exact['photonFractions'],atol=max(2e-16,tolerance),rtol=1e-11)
        for name in ('centroidMS','varianceM2S2','capturedFlux','modeMS'):
            np.testing.assert_allclose(actual[name],exact[name],atol=1e-8,rtol=1e-11)
        self.assertLess(info['truncationProbabilityBound'],1e-14)
        self.assertLess(info['imageProbabilityBound'],1e-14)
        self.assertIs(info['probabilityRenormalized'],False)
        self.assertTrue(np.all(actual['photonFractions']>=0))
        self.assertLessEqual(abs(sum(actual['photonFractions'])-actual['capturedFlux']),info['totalProbabilityErrorBudget'])
        return actual

    def test_constant_gaussian_and_all_original_bin_refinements(self):
        for step in (10.,5.,2.5):
            actual=self.compare([1.],[700.],1800.,np.linspace(-12000,12000,round(24000/step)+1))
            self.assertAlmostEqual(actual['modeMS'],700.,places=7)
            self.assertLess(actual['fourier']['frequencyCount'],1000)

    def test_variable_temperature_and_instrument_mixtures(self):
        u=np.linspace(-2500,3000,1001); w=np.exp(-(u/1700)**2); t=np.linspace(1400,7250,len(u))
        for instrument in (0.,500.,1000.):
            self.compare(w,u,t,np.linspace(-12000,12000,4801),instrument)

    def test_linear_radial_temperature_proxy_and_large_radial_motion(self):
        x=np.linspace(-.05,.05,1501); b=.02; r=np.sqrt(x*x+b*b)
        u=500.+1800*x/r; t=5950+(1800-5950)*np.minimum(r/.05,1.)
        self.compare(np.ones(len(x)),u,t,np.linspace(-12000,12000,9601),500.)

    def test_zero_mean_and_radial_sign_symmetry(self):
        u=np.r_[np.linspace(0,300,301),-np.linspace(0,300,301)]; weights=np.ones(len(u))
        bins=np.linspace(-12000,12000,2401)
        a=self.compare(weights,u,2900.,bins); b=self.compare(weights,-u,2900.,bins)
        np.testing.assert_allclose(a['photonFractions'],b['photonFractions'],atol=1e-16,rtol=1e-13)
        self.assertAlmostEqual(a['centroidMS'],0.,places=11)
        self.assertAlmostEqual(a['modeMS'],0.,places=8)

    def test_bimodal_near_tie_uses_exact_cdf_maximum(self):
        for step in (10.,5.,2.5):
            self.compare([1.,1.000001],[-2500.,2500.],1400.,np.linspace(-12000,12000,round(24000/step)+1))

    def test_duplicate_components_match_grouped_blocked_v86_reference(self):
        means=np.r_[np.linspace(-2700,-2300,301),np.linspace(2300,2700,301)]
        temperatures=np.linspace(1400,1800,len(means)); weights=np.r_[np.ones(301),np.full(301,1.000001)]
        # Repeat and scramble equivalent components to require the same
        # sorted (mean,T), bincount and 256-component reference arithmetic.
        means=np.tile(means,3)[::-1]; temperatures=np.tile(temperatures,3)[::-1]
        weights=np.tile(weights/3,3)[::-1]; bins=np.linspace(-12000,12000,9601)
        expected=reference86.spectrum(weights,means,temperatures,bins)
        actual=spectrum(weights,means,temperatures,bins)
        self.assertLess(abs(expected['modeMS']-actual['modeMS']),1e-6)
        self.assertEqual(expected['centroidMS'],actual['centroidMS'])
        self.assertEqual(expected['varianceM2S2'],actual['varianceM2S2'])
        np.testing.assert_allclose(actual['photonFractions'],expected['photonFractions'],atol=1e-14,rtol=1e-10)

    def test_linewidth_domain_and_window_clipping(self):
        bins=np.linspace(-12000,12000,2401)
        for function in (reference.gaussian_spectrum,spectrum):
            with self.assertRaises(ValueError): function([1.],[12010.],1400.,bins)
            with self.assertRaises(ValueError): function([1.],[0.],1.,bins)
        with self.assertRaises(ValueError): spectrum([1.],[47000.],7250.,bins,1000.)

    def test_period_image_bound_uses_actual_weighted_tails(self):
        bins=np.linspace(-12000,12000,2401)
        with self.assertRaises(ValueError): spectrum([1.,1.],[0.,96000.],1800.,bins)
        # An independently negligible outlier is admitted only if its actual
        # periodic-image probability lies below the declared tolerance.
        result=spectrum([1.,1e-16],[0.,96000.],1800.,bins)
        self.assertLess(result['fourier']['imageProbabilityBound'],1e-14)
        self.assertGreater(result['fourier']['imageProbabilityBound'],0.)

    def test_zero_weight_components_and_invalid_inputs(self):
        bins=np.linspace(-12000,12000,2401)
        self.compare([1.,0.],[0.,500.],[1800.,7250.],bins)
        for weights,means,temp in (([-1.,2.],[0.,1.],1800.),([0.],[0.],1800.),([1.],[np.nan],1800.),([1.],[0.],-1.)):
            with self.assertRaises(ValueError): spectrum(weights,means,temp,bins)


if __name__=='__main__': unittest.main()
