import unittest
import importlib.util
from pathlib import Path
import sys
import numpy as np
from spectrum import components, gaussian_spectrum, projected_moment, AR_MASS, KB
from emissivity import optical_grid


class SpectralControls(unittest.TestCase):
    edges = np.linspace(-12000, 12000, 4801)

    def test_single_gaussian_flux_width_centroid_and_mode(self):
        p = gaussian_spectrum([3.], [321.], [2900.], self.edges, 500.)
        self.assertAlmostEqual(p['capturedFlux'], 1., places=10)
        self.assertAlmostEqual(p['centroidMS'], 321., places=10)
        self.assertAlmostEqual(p['binCentroidMS'], 321., places=7)
        self.assertAlmostEqual(p['modeMS'], 321., delta=.001)
        self.assertAlmostEqual(p['varianceM2S2'], KB*2900/AR_MASS+500**2, places=7)
        bin_variance = np.sum(p['photonFractions']*(p['binCentersMS']-p['centroidMS'])**2)
        self.assertAlmostEqual(bin_variance, p['varianceM2S2']+5**2/12, delta=.001)

    def test_rigid_rotation_exact_paths_and_photon_scale(self):
        e, r = np.array([0., .02, .06]), np.array([0., .03, .06])
        w, u, mid = components(e, [2., 3.], r, [10000.,10000.], .01)
        np.testing.assert_allclose(u, 100.)
        p = gaussian_spectrum(w, u, mid*0+2900, self.edges)
        q = gaussian_spectrum(w*17, u, mid*0+2900, self.edges)
        np.testing.assert_allclose(p['photonFractions'], q['photonFractions'], atol=1e-15)
        self.assertAlmostEqual(sum(w), 2*(2*np.sqrt(.02**2-.01**2)+3*(np.sqrt(.06**2-.01**2)-np.sqrt(.02**2-.01**2))))
        self.assertAlmostEqual(projected_moment(e,r,np.array([10000.,10000.]),.01)@np.array([2.,3.]), sum(w*u))

    def test_variable_temperature_shear_mixture_and_reversal(self):
        p = gaussian_spectrum([1.,3.], [-100.,700.], [1400.,7250.], self.edges)
        q = gaussian_spectrum([1.,3.], [100.,-700.], [1400.,7250.], self.edges)
        self.assertAlmostEqual(p['centroidMS'], 500.)
        self.assertGreaterEqual(p['modeMS'], -100.)
        self.assertLessEqual(p['modeMS'], 700.)
        self.assertAlmostEqual(p['modeMS'], -q['modeMS'], places=8)
        np.testing.assert_allclose(p['photonFractions'], q['photonFractions'][::-1], atol=1e-15)

    def test_zero_flow_and_invalid_resolution(self):
        p = gaussian_spectrum([1.,2.], [0.,0.], [1800.,5950.], self.edges)
        self.assertAlmostEqual(p['modeMS'], 0., places=8)
        with self.assertRaises(ValueError):
            gaussian_spectrum([1.], [0.], [1800.], [-12000.,-4000.,4000.,12000.])
        with self.assertRaises(ValueError):
            components([0.,1.], [0.], [0.,1.], [1.], .5)

    def test_exact_outer_domain_avoids_floating_point_sliver(self):
        for n in (64,128,256):
            _, e = optical_grid(.06,n)
            self.assertEqual(e[-1], .06)
            components(e,np.ones(n),[0.,.06],[1.],.01)
        for observer in (lambda e: components(e,[1.],[0.,.06],[1.],.01),
                         lambda e: projected_moment(e,[0.,.06],[1.],.01)):
            with self.assertRaises(ValueError):
                observer([0.,np.nextafter(.06,1.)])

    def test_independent_v71_moments_for_nonuniform_fields(self):
        spec=importlib.util.spec_from_file_location('v71_chord',Path(__file__).parents[1]/'diagnostic-v71/chord.py')
        module=importlib.util.module_from_spec(spec); sys.modules[spec.name]=module; spec.loader.exec_module(module)
        edges=[0.,.01,.03,.06]; omega=[30000.,20000.,4000.]
        epsilon=[3.,1.,4.]; temp=[5950.,2900.,1800.]
        for b in (-.025,.005,.025):
            w,u,r=components(edges,epsilon,edges,omega,b)
            ti=np.searchsorted(edges,r,side='right')-1
            p=gaussian_spectrum(w,u,np.array(temp)[ti],self.edges,500.)
            q=module.chord_moments(edges,omega,temp,epsilon,b,AR_MASS,500**2)
            self.assertAlmostEqual(sum(w),q.brightness,places=12)
            self.assertAlmostEqual(p['centroidMS'],q.centroid_m_s,places=10)
            self.assertAlmostEqual(p['varianceM2S2'],q.observed_variance_m2_s2,places=7)
            integrated=np.sum(p['photonFractions']*(p['binCentersMS']-p['centroidMS'])**2)
            self.assertAlmostEqual(integrated,p['varianceM2S2']+5**2/12,delta=.001)


if __name__ == '__main__':
    unittest.main()
