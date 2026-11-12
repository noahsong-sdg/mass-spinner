import json
from pathlib import Path
import unittest
import numpy as np
from mesh84 import grid,weights
from model84 import solve

M=json.loads((Path(__file__).parents[1]/'profile-v79/manifest.json').read_text())
FIELDS=dict(viscosity=1.14e-4,conductivity_shape=1.,beta_field=9.)


class SourceRing(unittest.TestCase):
    def test_nested_grids_and_shrinking_source_support(self):
        for n in (1,2,4):
            coarse=grid(M,n); fine=grid(M,2*n)
            for x,y in zip(coarse,fine): np.testing.assert_allclose(x,y[::2],rtol=0,atol=1e-14)
            r,z=coarse; rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2
            for x,target in ((rc**2,M['cathodeRadiusM']**2),(zc,M['anodeCenterM'])):
                ids,w=weights(x,target); self.assertTrue(np.all(w>=0)); self.assertAlmostEqual(float(w.sum()),1)
                self.assertAlmostEqual(float(w@x[ids]),target)

    def test_charge_power_and_exact_torque(self):
        row=solve(M,1,FIELDS)
        for k in ('chargeResidualRelative','powerResidualRelative','torqueResidualRelative','linearResidualRelative'):
            self.assertLess(row[k],1e-8,k)
        expected=M['magneticT']*100*(M['radiusM']**2-M['cathodeRadiusM']**2)/2
        self.assertAlmostEqual(row['driveTorqueNm'],expected,places=11)
        self.assertGreater(row['jouleW'],0); self.assertGreater(row['viscousW'],0)
        self.assertFalse(row['absoluteCurrentPrediction']); self.assertFalse(row['correctedVoltagePrediction'])

    def test_gauge_preserves_power_and_flow(self):
        a=solve(M,1,FIELDS); b=solve(M,1,FIELDS,gauge=37.)
        np.testing.assert_allclose(a['omega'],b['omega'],rtol=0,atol=0)
        np.testing.assert_allclose(b['potential']-a['potential'],37.,rtol=0,atol=1e-12)
        self.assertAlmostEqual(a['electrodePowerW'],b['electrodePowerW'],places=8)

    def test_current_and_field_reversal(self):
        a=solve(M,1,FIELDS); b=solve(M,1,FIELDS,current=-100.); c=solve(M,1,FIELDS,magnetic=-M['magneticT'])
        np.testing.assert_allclose(b['omega'],-a['omega'],rtol=1e-11,atol=1e-9)
        np.testing.assert_allclose(c['omega'],-a['omega'],rtol=1e-11,atol=1e-9)
        np.testing.assert_allclose(c['potential'],a['potential'],rtol=1e-11,atol=1e-9)
        self.assertAlmostEqual(b['electrodePowerW'],a['electrodePowerW'],places=8)

    def test_zero_field_has_no_rotation(self):
        row=solve(M,1,FIELDS,magnetic=0.)
        np.testing.assert_array_equal(row['omega'],0.)
        self.assertEqual(row['viscousW'],0.); self.assertLess(row['powerResidualRelative'],1e-8)

    def test_invalid_bracketing_and_refinement(self):
        for x,target in (([1,2],0),([1,1],1),([1,np.nan],1),([1,2],np.nan)):
            with self.assertRaises(ValueError): weights(x,target)
        with self.assertRaises(ValueError): grid(M,3)
        with self.assertRaises(ValueError): solve(M,1,FIELDS,current=0.)


if __name__=='__main__': unittest.main()
