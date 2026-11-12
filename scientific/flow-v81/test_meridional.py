import unittest
import numpy as np
from meridional import assess


class MeridionalControls(unittest.TestCase):
    def test_zero_and_axially_uniform_rotation(self):
        r=np.linspace(0.,.06,9); z=np.linspace(0.,.24,13)
        for speed in (0.,1000.):
            a=assess(r,z,np.full((12,8),speed),2900.)
            self.assertAlmostEqual(a['centrifugalCurlMaxS2'],0.,delta=1e-8)
            self.assertAlmostEqual(a['midToLastCellLoopM2S2'],0.)
            self.assertFalse(a['circulationVelocityPredicted'])
    def test_curl_and_loop_match_independent_polynomial(self):
        r=np.linspace(0.,.06,17); z=np.linspace(0.,.24,25)
        rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2
        w=1000.*np.sqrt(1+zc[:,None]/.24)+np.zeros((24,16))
        a=assess(r,z,w,2900.)
        self.assertAlmostEqual(a['centrifugalCurlMaxS2'],max(rc)*1e6/.24,delta=1e-7)
        self.assertAlmostEqual(a['midToLastCellLoopM2S2'],.06**2/2*1e6*(zc[0]-zc[-1])/.24,places=9)
        b=assess(r,z,-w,2900.)
        self.assertEqual(a,b)


if __name__=='__main__': unittest.main()
