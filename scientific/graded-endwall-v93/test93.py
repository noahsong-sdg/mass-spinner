"""Regression controls for the actual graded adapter and legacy reference."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/coupled-openfoam-v90'))
import reference90 as ref
sys.path.insert(0,str(ROOT/'scientific/wall-transient-v92'))
from test92 import ScoringControls,BoundaryControls


class GradedControls(unittest.TestCase):
    def test_fixed_map_is_nested_and_refines_the_endwall(self):
        for n in (8,16,32,64):
            f=ref.geometry(n,axialGrade=4.)
            fine=ref.geometry(2*n,axialGrade=4.)
            np.testing.assert_array_equal(f.z,fine.z[::2])
            self.assertLess(np.diff(f.z)[-1],ref.H/(2*n)/10)
            self.assertAlmostEqual(f.volume.sum(),np.pi*ref.R**2*ref.H)

    def test_uniform_default_keeps_identical_geometry(self):
        f=ref.geometry(8);g=ref.geometry(8,axialGrade=0.)
        for key in ('z','r','volume','mean_r','mean_r2'):
            np.testing.assert_array_equal(getattr(f,key),getattr(g,key))

    def test_invalid_grading_rejected(self):
        for a in (True,-1.,np.nan,np.inf):
            with self.assertRaises(ValueError):ref.geometry(8,axialGrade=a)

    def test_graded_native_centres_and_cell_volumes(self):
        from reference90 import make_case,read_field
        for n in (4,8):
            with tempfile.TemporaryDirectory() as folder:
                case=Path(folder)/'case';make_case(case,n,1024,.5,axialGrade=4.)
                f=ref.geometry(n,axialGrade=4.)
                c=read_field(case/'0/C',f.count,3)
                order=ref.native_order(f,c)
                z=np.broadcast_to(((f.z[:-1]+f.z[1:])/2)[:,None],f.volume.shape)
                np.testing.assert_allclose(c[order,2].reshape(z.shape),z,rtol=0,atol=1e-13)
                delta=np.deg2rad(.5)
                volumes=read_field(case/'0/Vc',f.count)[order].reshape(f.volume.shape)*np.pi/delta
                np.testing.assert_allclose(volumes,f.volume*np.sin(2*delta)/(2*delta),rtol=1e-11)

    def test_graded_mapping_rejects_outside_and_duplicate_cells(self):
        f=ref.geometry(8,axialGrade=4.)
        r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
        c=np.column_stack((r.ravel(),np.zeros(f.count),z.ravel()))
        rng=np.random.default_rng(93);c=c[rng.permutation(f.count)]
        ordered=c[ref.native_order(f,c)]
        np.testing.assert_array_equal(ordered[:,2],z.ravel())
        for value in (c[0],np.array([ref.R*2,0.,ref.H/2])):
            bad=c.copy();bad[1]=value
            with self.assertRaises(ValueError):ref.native_order(f,bad)

    def test_legacy_native_packet_remains_bitwise_identical(self):
        root=Path('/work/project/v90-coupled-source06/scientific/coupled-openfoam-v90/campaign-results')
        label='n8-s512-a0.5-work1'
        actual,_=ref.native_packet(root/label,8,512,.5)
        with np.load(root/(label+'.npz'),allow_pickle=False) as data:
            np.testing.assert_array_equal(actual,data['native'])

    def test_corrected_uniform_reference_remains_bitwise_identical(self):
        sys.path.insert(0,str(ROOT/'scientific/endwall-v91'))
        from candidate91 import evolve
        path=Path('/work/project/v91-endwall-source04/scientific/endwall-v91/candidate-results/campaign-results/n8-s512-a0.5-work1.npz')
        actual,_=evolve(8,512)
        with np.load(path,allow_pickle=False) as data:
            np.testing.assert_array_equal(actual,data['v86'])

    def test_restriction_preserves_graded_constant_primitives_and_inventory(self):
        from score93 import restrict
        fine=ref.geometry(16,axialGrade=4.);coarse=ref.geometry(8,axialGrade=4.)
        q=fine.state(ref.RHO,2900.,.3,700.)
        reduced=restrict(q,8)
        np.testing.assert_allclose(reduced.sum(axis=(1,2)),q.sum(axis=(1,2)),rtol=4e-16)
        p=coarse.primitive(reduced)
        for key,value in [('densityKgM3',ref.RHO),('temperatureK',2900.),('omegaRadS',700.)]:
            np.testing.assert_allclose(p[key],value,rtol=3e-14)

    def test_graded_norm_uses_actual_volume_not_uniform_geometry(self):
        from score93 import compare
        packets=[]
        for n in (8,16):
            f=ref.geometry(n,axialGrade=4.);q=f.state(ref.RHO,2900.,.5,0.)
            packets.append(np.array([q.copy() for _ in range(4)]))
        for local in (False,True):
            row=compare(*packets,1,local=local)
            self.assertAlmostEqual(row['rho']['scaleRMS'],ref.RHO,places=15)
            self.assertLess(row['rho']['relative'],1e-14)

    def test_local_band_and_invalid_clock(self):
        from score93 import weights
        for n in (8,16,32,64):
            for t in (5e-6,1e-5,2e-5):
                w=weights(n,t,True)
                np.testing.assert_allclose(w.sum(),np.pi*ref.R**2*4*np.sqrt(ref.MU/ref.RHO*t),rtol=5e-14)
        with self.assertRaises(ValueError):weights(8,0,True)

    def test_declared_timestep_study_respects_initial_graded_cfl(self):
        from score93 import JOBS,GRADE
        for n,steps in JOBS:
            f=ref.geometry(n,axialGrade=GRADE,noSlipWalls=True)
            r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2);t,u=ref.initial(r,z)
            self.assertLess(ref.END/steps,f.stable_dt(f.state(ref.RHO,t,.5,u/r),cfl=.5))

    def test_old_uniform_metadata_cannot_enter_graded_campaign(self):
        from score93 import load,JOBS,label
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)
            rows=[dict(label=label(n,s),n=n,steps=s,axialGrade=0.) for n,s in JOBS]
            (p/'predictions.json').write_text(json.dumps(dict(cases=rows)))
            with self.assertRaisesRegex(ValueError,'metadata'):load(p)


if __name__=='__main__':
    loader=unittest.defaultTestLoader
    suite=unittest.TestSuite([loader.loadTestsFromTestCase(k) for k in
        (GradedControls,ScoringControls,BoundaryControls)]+[
        loader.discover(str(ROOT/'scientific'/folder),pattern=pattern,top_level_dir=str(ROOT/'scientific'/folder))
        for folder,pattern in [('mixture-axial-v75','test_flow.py'),('meridional-v86','test_diffusion86.py'),('coupled-openfoam-v90','test_reference90.py')]])
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    (out/'controls.json').write_text(json.dumps(dict(testsRun=result.testsRun,failures=len(result.failures),errors=len(result.errors),passed=result.wasSuccessful()),indent=2)+'\n')
    raise SystemExit(not result.wasSuccessful())
