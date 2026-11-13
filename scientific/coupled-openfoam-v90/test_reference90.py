"""Synthetic controls for mapping/scoring; no native solver invoked."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
from reference90 import geometry, initial, native_packet, sha, R, H
from score90 import audit, difference, fields, require_packets, restrict
import reference90


class Controls(unittest.TestCase):
    def packet(self,n):
        f = geometry(n)
        r,z = np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
        t,speed = initial(r,z)
        q = f.state(.001,t,.5,speed/r)
        return np.array([q.copy() for _ in range(4)])

    def test_nested_restriction_preserves_every_conserved_inventory(self):
        q = self.packet(8)[0]
        coarse = restrict(q,4)
        np.testing.assert_allclose(q.sum(axis=(1,2)),coarse.sum(axis=(1,2)),rtol=3e-16)
        with self.assertRaises(ValueError):
            restrict(q,3)

    def test_equal_states_zero_error_zero_increment_is_unresolved(self):
        p = self.packet(4)
        self.assertTrue(all(v['relative']==0 for v in difference(p,p).values() if v['scaleRMS']))
        self.assertTrue(all(v['relative'] is None for v in difference(p,p,True).values()))

    def test_increment_norm_does_not_hide_local_temperature_error(self):
        a = self.packet(4)
        b = a.copy()
        # One-sided thermal change is tiny against background, order unity against response.
        b[-1,4,1,1] += .001*b[-1,4,1,1]
        self.assertLess(difference(a,b)['T']['relative'],.001)
        self.assertAlmostEqual(difference(a,b,True)['T']['relative'],1.)

    def test_initial_boundaries_and_axis_regular(self):
        t,u = initial(np.array([0.,R]),np.array([0.,H]))
        self.assertTrue(np.all(t>0))
        np.testing.assert_allclose(u,0.,atol=1e-12)
        self.assertTrue(np.all(np.isfinite(fields(self.packet(4)[0])['T'])))

    def test_finite_positive_and_full_history_admission(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            p = self.packet(4)
            path = root/'state.npz'
            np.savez_compressed(path,native=p,v86=p)
            row = dict(label='test',n=4,packet=path.name,packetSHA256=sha(path),completed=True)
            require_packets(root,[row])
            np.savez_compressed(path,native=p[:-1],v86=p)
            with self.assertRaises(ValueError):
                require_packets(root,[row])
            row['packetSHA256'] = sha(path)
            with self.assertRaises(ValueError):
                require_packets(root,[row])

    def test_partial_campaign_never_qualifies(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root/'predictions.json').write_text(json.dumps(dict(cases=[])))
            with self.assertRaises(ValueError):
                audit(root)

    def test_native_internal_energy_scheme_and_conservative_work_are_explicit(self):
        flow = geometry(4)
        r,z = np.meshgrid(flow.mean_r,(flow.z[:-1]+flow.z[1:])/2)
        c = np.column_stack((r.ravel(),np.zeros(flow.count),z.ravel()))
        with tempfile.TemporaryDirectory() as folder:
            case = Path(folder)/'case'
            with patch.object(reference90,'command',return_value={'exitCode':0}),\
                 patch.object(reference90,'read_field',return_value=c):
                reference90.make_case(case,4,512,.5)
            self.assertIn('div(phi,(p|rho)) Gauss linear;', (case/'system/fvSchemes').read_text())
            self.assertIn('type viscousHeating;', (case/'constant/fvModels').read_text())
            self.assertNotIn('writeCellCentres', (case/'system/controlDict').read_text())

    def test_driver_seals_native_files_after_state_arrays_are_produced(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            here = root/'scientific/coupled-openfoam-v90'
            here.mkdir(parents=True)
            for name in ['reference90.py','score90.py','test_reference90.py','PROTOCOL.md','REFINEMENT.md']:
                (here/name).write_text('synthetic driver control')
            for name in ['mixture-axial-v75/flow.py','meridional-v86/diffusion86.py','expert-v88/openfoam/reference88.py']:
                p = root/'scientific'/name
                p.parent.mkdir(parents=True,exist_ok=True)
                p.write_text('synthetic dependency control')
            native = root/'native'
            for name in ['applications/modules/fluid/thermophysicalPredictor.C',
                         'applications/modules/isothermalFluid/momentumPredictor.C',
                         'src/fvModels/general/viscousHeating/viscousHeating.C']+[
                         'platforms/linuxArm64GccDPInt32Opt/'+n for n in
                         ['bin/foamRun','bin/blockMesh','bin/checkMesh','bin/foamPostProcess','lib/libfluidSolver.so','lib/libfvModels.so']]:
                p = native/name
                p.parent.mkdir(parents=True,exist_ok=True)
                p.write_text('synthetic native identity')
            data = self.packet(8)
            with patch.object(reference90,'HERE',here),patch.object(reference90,'ROOT',root),\
                 patch.object(reference90,'environment',return_value={'WM_PROJECT_DIR':str(native)}),\
                 patch.object(reference90,'make_case',return_value=[]),\
                 patch.object(reference90,'command',return_value={'exitCode':0}),\
                 patch.object(reference90,'native_packet',return_value=(data,{})),\
                 patch.object(reference90,'own_packet',return_value=(data,{})),\
                 patch('sys.argv',['reference90.py','pilot','synthetic']):
                self.assertEqual(reference90.main(),0)
            result = json.loads((here/'synthetic/predictions.json').read_text())
            self.assertTrue(result['cases'][0]['completed'])
            self.assertEqual(len(result['nativeSHA256']),9)


if __name__=='__main__':
    unittest.main()
