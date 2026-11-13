"""Analytic, negative and stale-campaign controls, plus retained regressions."""
import json,sys,tempfile,unittest
from pathlib import Path
import numpy as np
from scipy.special import jvp
from control94 import *
from score94 import compare,load,weights
sys.path.insert(0,str(ROOT/'scientific/graded-endwall-v93'))
from test93 import GradedControls,ScoringControls,BoundaryControls


class AnalyticControls(unittest.TestCase):
    def test_mode_obeys_cylindrical_stokes_equation(self):
        r,z=np.meshgrid(np.linspace(.0001,R-.0001,15),np.linspace(0,H,12))
        k=CHI/R;b=np.pi/(2*H)
        lap=(k*k*jvp(1,k*r,2)+k*jvp(1,k*r)/r-jv(1,k*r)/(r*r)-b*b*jv(1,k*r))*np.cos(b*z)
        np.testing.assert_allclose(NU*lap,-RATE*mode(r,z),rtol=1e-9,atol=1e-10)

    def test_mode_boundaries_and_midplane_symmetry(self):
        z=np.linspace(0,H,30);r=np.linspace(0,R,30)
        np.testing.assert_allclose(mode(R,z),0.,atol=1e-15)
        np.testing.assert_allclose(mode(r,H),0.,atol=1e-15)
        np.testing.assert_array_equal(mode(0,z),np.zeros_like(z))
        np.testing.assert_array_equal(mode(r,.001),mode(r,-.001))

    def test_exact_decay_is_scored_without_reference_subtraction(self):
        f=geometry(16,axialGrade=4.);r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
        initial=AMP*mode(r,z);q=np.array([initial*np.exp(-RATE*t) for t in TIMES])
        for i in (1,2,3):
            for local in (False,True):
                for inc in (False,True):self.assertLess(compare(q,initial,i,16,local,inc)['relative'],1e-11)

    def test_no_decay_and_wrong_rate_fail_response_gate(self):
        f=geometry(16,axialGrade=4.);r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
        initial=AMP*mode(r,z)
        for rate in (0.,RATE*1.2):
            q=np.array([initial*np.exp(-rate*t) for t in TIMES])
            self.assertGreater(compare(q,initial,1,16,True,True)['relative'],.05)

    def test_representation_factor_cannot_hide_missing_decay(self):
        f=geometry(16,axialGrade=4.);r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
        initial=AMP*mode(r,z);q=np.repeat(initial[None],4,axis=0)
        self.assertAlmostEqual(compare(q,initial,1,16,True,True,r*f.mean_r/f.mean_r2)['relative'],1.)

    def test_bad_clock_rejected(self):
        with self.assertRaises(ValueError):compare(None,None,0,16,True,True)

    def test_wrong_and_partial_campaign_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'predictions.json'
            p.write_text(json.dumps(dict(model='coupled-v93',cases=[])))
            with self.assertRaisesRegex(ValueError,'metadata'):load(p.parent)
            p.write_text(json.dumps(dict(model=MODEL,timesS=TIMES.tolist(),amplitudeMPS=AMP,decayRatePerS=RATE,cases=[])))
            with self.assertRaisesRegex(ValueError,'Complete'):load(p.parent)

    def test_native_configuration_uses_low_amplitude_and_mixed_walls(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'case';make_control(p,4,128,.5)
            self.assertIn('solver incompressibleFluid;', (p/'system/controlDict').read_text())
            self.assertNotIn('viscousHeating',(p/'constant/fvModels').read_text())
            c=read_field(p/'0/C',32,3);r=np.hypot(c[:,0],c[:,1]);u=read_field(p/'0/U',32,3)
            speed=(-u[:,0]*c[:,1]+u[:,1]*c[:,0])/r
            np.testing.assert_allclose(speed,.5*AMP*mode(r,c[:,2]),rtol=3e-16)
            self.assertIn('midplane {type symmetryPlane;}',(p/'0/U').read_text())


if __name__=='__main__':
    loader=unittest.defaultTestLoader
    suite=unittest.TestSuite([loader.loadTestsFromTestCase(k) for k in
        (AnalyticControls,GradedControls,ScoringControls,BoundaryControls)]+[
        loader.discover(str(ROOT/'scientific'/folder),pattern=pattern,top_level_dir=str(ROOT/'scientific'/folder))
        for folder,pattern in [('mixture-axial-v75','test_flow.py'),('meridional-v86','test_diffusion86.py'),('coupled-openfoam-v90','test_reference90.py')]])
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    (out/'controls.json').write_text(json.dumps(dict(testsRun=result.testsRun,failures=len(result.failures),errors=len(result.errors),passed=result.wasSuccessful()),indent=2)+'\n')
    raise SystemExit(not result.wasSuccessful())
