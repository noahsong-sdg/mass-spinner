"""Rectangular adapter regressions and unchanged V94/V93 controls."""
import json,sys,tempfile,unittest
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/swirl-control-v94'))
from control94 import geometry,make_control,native_packet,own_packet,read_field,native_order,sha,R,H
from test94 import AnalyticControls,GradedControls,ScoringControls,BoundaryControls

OLD=Path('/work/project/v94-swirl-source01/scientific/swirl-control-v94/study-results')


class RectangularControls(unittest.TestCase):
    def test_default_geometry_is_identical(self):
        for grade in (0.,4.):
            a=geometry(8,axialGrade=grade);b=geometry(8,axialGrade=grade,axialCells=16)
            for k in ('r','z','mean_r','mean_r2','volume'):np.testing.assert_array_equal(getattr(a,k),getattr(b,k))

    def test_fixed_other_axis_and_exact_nesting(self):
        a=geometry(8,axialGrade=4.,axialCells=32)
        b=geometry(16,axialGrade=4.,axialCells=32)
        c=geometry(8,axialGrade=4.,axialCells=64)
        np.testing.assert_array_equal(a.z,b.z);np.testing.assert_array_equal(a.r,c.r)
        np.testing.assert_array_equal(a.r,b.r[::2]);np.testing.assert_array_equal(a.z,c.z[::2])

    def test_invalid_axial_counts_rejected(self):
        for n in (True,0,-1,3.5,float('nan'),float('inf')):
            with self.assertRaises(ValueError):geometry(8,axialCells=n)

    def test_native_rectangular_centres_and_volumes(self):
        for n,nz in ((4,12),(8,8)):
            with tempfile.TemporaryDirectory() as folder:
                p=Path(folder)/'case';make_control(p,n,128,1.,axialCells=nz)
                f=geometry(n,axialGrade=4.,axialCells=nz);c=read_field(p/'0/C',f.count,3)
                order=native_order(f,c);shape=(nz,n)
                np.testing.assert_allclose(c[order,2].reshape(shape),np.broadcast_to(((f.z[:-1]+f.z[1:])/2)[:,None],shape),rtol=0,atol=1e-13)
                d=np.deg2rad(.5);v=read_field(p/'0/Vc',f.count)[order].reshape(shape)*np.pi/d
                np.testing.assert_allclose(v,f.volume*np.sin(2*d)/(2*d),rtol=1e-11)

    def test_legacy_native_inputs_remain_identical(self):
        expected=json.loads((OLD/'predictions.json').read_text())['cases'][0]['inputSHA256']
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'case';make_control(p,16,256,1.)
            for k in ('system/blockMeshDict','system/controlDict','system/fvSchemes','system/fvSolution',
                      'constant/physicalProperties','constant/momentumTransport','constant/fvModels','0/U','0/p','0/T','0/rho'):
                self.assertEqual(sha(p/k),expected[k],k)

    def test_legacy_native_extraction_remains_identical(self):
        a,_,_,_=native_packet(OLD/'n16-s256-x1',16,256,1.,axialCells=32)
        with np.load(OLD/'n16-s256-x1.npz',allow_pickle=False) as data:np.testing.assert_array_equal(a,data['native'])

    def test_legacy_custom_evolution_remains_identical(self):
        a,_=own_packet(16,256,1.)
        with np.load(OLD/'n16-s256-x1.npz',allow_pickle=False) as data:np.testing.assert_array_equal(a,data['v86'])

    def test_rigid_strain_is_zero_for_antisymmetric_gradient(self):
        from score95 import strain
        g=np.array([[0.,-3.,0.],[3.,0.,0.],[0.,0.,0.]])
        np.testing.assert_array_equal(strain(g),np.zeros((3,3)))
        self.assertGreater(np.linalg.norm(strain(np.diag([1.,0.,0.]))),0.)

    def test_native_rigid_boundary_and_initial_gradient(self):
        from study95 import configure
        for scheme in ('Gauss linear','leastSquares'):
            with tempfile.TemporaryDirectory() as folder:
                p=Path(folder)/'case';configure(p,4,12,'rigid',scheme)
                raw=(p/'0/U').read_text()
                self.assertIn('rotatingWallVelocity',raw)
                self.assertNotIn('value uniform',raw.split('boundaryField')[1])
                self.assertIn('gradSchemes {default '+scheme+';}',(p/'system/fvSchemes').read_text())
                g=read_field(p/'0/grad(U)',48,9)
                self.assertTrue(np.all(np.isfinite(g)))

    def test_stale_square_packet_cannot_enter_directional_campaign(self):
        from study95 import JOBS,MODEL,TIMES,label
        from score95 import load
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder);rows=[dict(kind=k,n=n,nz=nz,gradient=s,label=label(k,n,nz,s),completed=True) for k,n,nz,s in JOBS]
            row=rows[0];packet=p/(row['label']+'.npz');n=row['n']
            np.savez_compressed(packet,native=np.zeros((4,2*n,n)),v86=np.zeros((4,2*n,n)),nativeR=np.zeros((2*n,n)),nativeZ=np.zeros((2*n,n)))
            row.update(packet=packet.name,packetSHA256=sha(packet))
            data=dict(model=MODEL,timesS=TIMES.tolist(),steps=256,axialGrade=4.,halfAngleDeg=.5,
                sourceSHA256=json.loads((ROOT/'transfer.json').read_text()),cases=rows)
            (p/'predictions.json').write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError,'Invalid packet field'):load(p)
            data['model']='graded-small-amplitude-viscous-v94'
            (p/'predictions.json').write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError,'metadata'):load(p)

    def test_exact_directional_decay_and_partial_volume_norm(self):
        from study95 import mode,AMP,RATE,TIMES
        from score95 import error,weights
        f=geometry(8,axialGrade=4.,axialCells=32);r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
        q=np.array([AMP*mode(r,z)*np.exp(-RATE*t) for t in TIMES])
        for local in (False,True):
            self.assertLess(error(q,1,8,32,local,True)['relative'],1e-11)
            if local:
                from control94 import NU
                self.assertAlmostEqual(weights(8,32,TIMES[1],True).sum(),np.pi*R**2*4*np.sqrt(NU*TIMES[1]),places=15)


if __name__=='__main__':
    loader=unittest.defaultTestLoader
    suite=unittest.TestSuite([loader.loadTestsFromTestCase(k) for k in
        (RectangularControls,AnalyticControls,GradedControls,ScoringControls,BoundaryControls)]+[
        loader.discover(str(ROOT/'scientific'/folder),pattern=pattern,top_level_dir=str(ROOT/'scientific'/folder))
        for folder,pattern in [('mixture-axial-v75','test_flow.py'),('meridional-v86','test_diffusion86.py'),('coupled-openfoam-v90','test_reference90.py')]])
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    (out/'controls.json').write_text(json.dumps(dict(testsRun=result.testsRun,failures=len(result.failures),errors=len(result.errors),passed=result.wasSuccessful()),indent=2)+'\n')
    raise SystemExit(not result.wasSuccessful())
