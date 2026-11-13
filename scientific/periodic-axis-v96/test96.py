"""Native rigid-rotation regression before adopting any candidate boundary."""
import json,sys,tempfile,unittest
from pathlib import Path
import numpy as np
from sector96 import configure,gradient,gradient_metrics,CANDIDATE,command,environment,MODEL,TIMES,ROOT
from test95 import RectangularControls,AnalyticControls,GradedControls,ScoringControls,BoundaryControls


class SectorControls(unittest.TestCase):
    def test_candidate_preserves_rigid_rotation_gradient(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'case';configure(p,8,16,256,'rigid',CANDIDATE,'leastSquares')
            self.assertLess(gradient_metrics(gradient(p,8,16,0.),8,16)['maxStrainOverOmega'],1e-6)

    def test_prescribed_faces_cannot_drive_decay(self):
        with self.assertRaisesRegex(ValueError,'diagnostic only'):
            configure(Path('/unused'),8,16,256,'decay','exact','leastSquares')

    def test_cyclic_mesh_and_field_constraints_match(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'case';configure(p,4,8,128,'rigid','cyclic','leastSquares')
            mesh=(p/'constant/polyMesh/boundary').read_text()
            self.assertEqual(mesh.count('type            cyclic;'),2)
            self.assertIn('neighbourPatch  plus;',mesh);self.assertIn('neighbourPatch  minus;',mesh)
            for name in ('U','p','T','rho'):
                raw=(p/'0'/name).read_text()
                self.assertIn('minus {type cyclic;}',raw);self.assertIn('plus {type cyclic;}',raw)

    def test_native_gradient_outputs_only_requested_clocks(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'case';configure(p,4,8,128,'rigid','cyclic','leastSquares')
            command(p,['foamRun','-case',str(p)],environment(),'solver')
            clocks=sorted(float(f.parent.name) for f in p.glob('*/gradU') if float(f.parent.name)>0)
            # Native quarter-interval output includes 15 us; scoring selects 5/10/20 us.
            np.testing.assert_allclose(clocks,np.arange(1,5)*TIMES[-1]/4,atol=1e-18,rtol=0)

    def test_stale_wedge_metadata_is_rejected(self):
        from score96 import load
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder);data=dict(model=MODEL,candidate='wedge',scheme='leastSquares',timesS=TIMES.tolist(),axialGrade=4.,halfAngleDeg=.5,cases=[])
            (p/'predictions.json').write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError,'Periodic metadata'):load(p)

    def test_full_gradient_metric_includes_antisymmetric_error(self):
        from sector96 import AMP,R
        g=np.tile((AMP/R)*np.array([[0.,1.,0.],[-1.,0.,0.],[0.,0.,0.]]),(16,8,1,1))
        self.assertLess(gradient_metrics(g,8,16)['maxGradientErrorOverOmega'],1e-14)
        self.assertGreater(gradient_metrics(2*g,8,16)['maxGradientErrorOverOmega'],1.)


if __name__=='__main__':
    loader=unittest.defaultTestLoader
    suite=unittest.TestSuite([loader.loadTestsFromTestCase(k) for k in
        (SectorControls,RectangularControls,AnalyticControls,GradedControls,ScoringControls,BoundaryControls)]+[
        loader.discover(str(ROOT/'scientific'/folder),pattern=pattern,top_level_dir=str(ROOT/'scientific'/folder))
        for folder,pattern in [('mixture-axial-v75','test_flow.py'),('meridional-v86','test_diffusion86.py'),('coupled-openfoam-v90','test_reference90.py')]])
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    (out/'controls.json').write_text(json.dumps(dict(testsRun=result.testsRun,failures=len(result.failures),errors=len(result.errors),passed=result.wasSuccessful(),candidate=CANDIDATE),indent=2)+'\n')
    raise SystemExit(not result.wasSuccessful())
