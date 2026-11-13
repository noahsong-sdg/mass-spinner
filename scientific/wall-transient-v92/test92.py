"""Saved-clock, physical-band and frozen-backend regression controls."""
import sys
from pathlib import Path
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
from score92 import compare,weights,load,OLD,refinements,verify_sources
from reference90 import R,H,MU,RHO
from score90 import difference
sys.path.insert(0,str(ROOT/'scientific/endwall-v91'))
from test91 import BoundaryControls


class ScoringControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        verify_sources();_,p=load(OLD/'fine-results')
        cls.packet=p['n32-s1024-a0.5-work1']

    def test_global_matches_existing_conservative_scorer_at_each_clock(self):
        a,b=[self.packet[k] for k in ('native','v86')]
        for index in (1,2,3):
            for inc in (False,True):
                x,y=compare(a,b,index,inc),difference(a[:index+1],b[:index+1],inc)
                for key in x:
                    for value in x[key]:
                        np.testing.assert_allclose(x[key][value],y[key][value],rtol=2e-14,atol=0)

    def test_physical_band_volume_is_exact_across_meshes(self):
        for n in (8,16,32,64,128):
            for t in (5e-6,1e-5,2e-5):
                w=weights(n,t,True);full=weights(n,t,False)
                np.testing.assert_allclose(w.sum(),np.pi*R**2*4*np.sqrt(MU/RHO*t),rtol=5e-14)
                self.assertTrue(np.all(w>=0));self.assertTrue(np.all(w<=full))
                self.assertTrue(np.any((w>0)&(w<full)))

    def test_bad_clock_and_initial_frame_are_not_scored(self):
        for t in (0,-1,np.nan,3e-6):
            with self.assertRaises(ValueError):weights(32,t,True)
        a,b=[self.packet[k] for k in ('native','v86')]
        for index in (0,4):
            with self.assertRaises(ValueError):compare(a,b,index)

    def test_identical_histories_have_zero_error_in_both_regions(self):
        a=self.packet['v86']
        for local in (False,True):
            for inc in (False,True):
                for index in (1,2,3):
                    self.assertTrue(all(v['relative']==0 for v in compare(a,a,index,inc,local).values()))

    def test_undefined_or_noncontracting_refinement_fails_closed(self):
        for a,b in ((0.,0.),(None,.1),(.1,None),(.1,.1),(.1,.11)):
            gates=[];refinements(gates,'control',[{'u':{'relative':a}},{'u':{'relative':b}}],.2)
            self.assertFalse(gates[-1]['passed'])
        gates=[];refinements(gates,'control',[{'u':{'relative':.1}},{'u':{'relative':.05}}],.02)
        self.assertFalse(gates[0]['passed']);self.assertTrue(gates[-1]['passed'])


if __name__=='__main__':
    loader=unittest.defaultTestLoader
    suite=unittest.TestSuite([loader.loadTestsFromTestCase(k) for k in (ScoringControls,BoundaryControls)]+[
        loader.discover(str(ROOT/'scientific'/folder),pattern=pattern,top_level_dir=str(ROOT/'scientific'/folder))
        for folder,pattern in [('mixture-axial-v75','test_flow.py'),('meridional-v86','test_diffusion86.py'),('coupled-openfoam-v90','test_reference90.py')]])
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    import json
    (out/'controls.json').write_text(json.dumps(dict(testsRun=result.testsRun,failures=len(result.failures),errors=len(result.errors),passed=result.wasSuccessful()),indent=2)+'\n')
    raise SystemExit(not result.wasSuccessful())
