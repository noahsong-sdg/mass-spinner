"""Analytical boundary reconstruction and closed-inventory regression tests."""
import json
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/coupled-openfoam-v90'))
from reference90 import Flow, M_AR, MU, K, Diffusion, R, H, RHO, own_packet


class BoundaryControls(unittest.TestCase):
    def flow(self,graded=False):
        r=R*np.linspace(0,1,9)**(1.3 if graded else 1.)
        z=H*np.linspace(0,1,17)**(1.2 if graded else 1.)
        return Flow(r,z,[M_AR,M_AR],noSlipWalls=True)

    def test_linear_endwall_shear_has_exact_zero_advection(self):
        for graded in (False,True):
            f=self.flow(graded);r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
            q=f.state(RHO,2900.,.5,0.,vr=10*r/R*(H-z)/H)
            left,right=f._face_states(f.primitive(q),1)
            exact=10*f.mean_r/R*(H-f.z[-2])/H
            np.testing.assert_allclose(left[2,-2],exact,rtol=2e-14)
            np.testing.assert_allclose(right[2,-2],exact,rtol=2e-14)
            flux=f.fluxes(q)[1]
            np.testing.assert_allclose(flux[1,-2],0.,atol=1e-16)

    def test_linear_outer_wall_shear_reconstructs_both_traces(self):
        for graded in (False,True):
            f=self.flow(graded)
            q=f.state(RHO,2900.,.5,0.,vz=10*(R-f.mean_r[None,:])/R)
            left,right=f._face_states(f.primitive(q),2)
            exact=10*(R-f.r[-2])/R
            np.testing.assert_allclose(left[3,:,-2],exact,rtol=2e-14)
            np.testing.assert_allclose(right[3,:,-2],exact,rtol=2e-14)
            np.testing.assert_allclose(f.fluxes(q)[0][2,:,-2],0.,atol=1e-16)

    def test_axis_and_midplane_keep_the_original_symmetry(self):
        f=self.flow();legacy=Flow(f.r,f.z,f.masses)
        r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
        q=f.state(RHO,2900.,.5,300.,vr=r, vz=z)
        p=f.primitive(q)
        for axis in (1,2):
            for a,b in zip(f._face_states(p,axis),legacy._face_states(p,axis)):
                np.testing.assert_array_equal(np.take(a,[0,1],axis=axis),
                                              np.take(b,[0,1],axis=axis))

    def test_all_closed_wall_inventories_and_tangential_euler_fluxes(self):
        f=self.flow();q=f.state(RHO,2900.,.4,700.,vr=3.,vz=-2.)
        radial,axial=f.fluxes(q)
        for i in (0,3,4,5):
            np.testing.assert_array_equal(radial[i,:,[0,-1]],0.)
            np.testing.assert_array_equal(axial[i,[0,-1]],0.)
        np.testing.assert_array_equal(radial[2,:,[0,-1]],0.)
        np.testing.assert_array_equal(axial[1,[0,-1]],0.)

    def test_coupled_step_conserves_energy_and_keeps_thermal_domain(self):
        f=self.flow();r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
        q=f.state(RHO,2900+20*np.cos(np.pi*z/H),.4,1000*(1-r/R),
                  vr=2*r/R*(1-r/R),vz=z/H*(1-z/H))
        before=q.sum(axis=(1,2));d=Diffusion(f,MU,conductivity=K)
        for _ in range(4):
            q=f.advance(q,1e-8);q,receipt=d.advance(q,1e-8)
        np.testing.assert_allclose(q.sum(axis=(1,2))[[0,4,5]],before[[0,4,5]],rtol=2e-13)
        self.assertGreater(np.min(f.primitive(q)['temperatureK']),0.)

    def test_invalid_wall_policy_rejected(self):
        for value in (None,1,'no-slip'):
            with self.assertRaises(ValueError):
                Flow(np.linspace(0,R,5),np.linspace(0,H,5),[M_AR,M_AR],noSlipWalls=value)

    def test_legacy_coupled_reference_remains_bitwise_unchanged(self):
        path=Path('/work/project/v90-coupled-source06/scientific/coupled-openfoam-v90/campaign-results/n8-s512-a0.5-work1.npz')
        with np.load(path,allow_pickle=False) as data:
            actual,_=own_packet(8,512)
            np.testing.assert_array_equal(actual,data['v86'])


if __name__=='__main__':
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    loader=unittest.defaultTestLoader
    suite=unittest.TestSuite([loader.loadTestsFromTestCase(BoundaryControls)]+[
        loader.discover(str(ROOT/'scientific'/folder),pattern=pattern,
                        top_level_dir=str(ROOT/'scientific'/folder))
        for folder,pattern in [('mixture-axial-v75','test_flow.py'),
                               ('meridional-v86','test_diffusion86.py'),
                               ('coupled-openfoam-v90','test_reference90.py')]])
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    (out/'controls.json').write_text(json.dumps(dict(testsRun=result.testsRun,
        failures=len(result.failures),errors=len(result.errors),passed=result.wasSuccessful()),indent=2)+'\n')
    raise SystemExit(not result.wasSuccessful())
