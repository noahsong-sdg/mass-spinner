import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
import access82
from access82 import exact_potential,grid,solve


class DiskAccessControls(unittest.TestCase):
    def test_exact_potential_has_disk_axis_and_far_limits(self):
        a=.004
        np.testing.assert_allclose(exact_potential([0.,a/2,a],[0.,0.,0.],a,3.,1.,1.),3.,rtol=1e-15)
        z=np.array([a,3*a,8*a])
        np.testing.assert_allclose(exact_potential(0.,z,a,3.,1.,1.),6/np.pi*np.arctan(a/z),rtol=1e-14)
        self.assertLess(float(exact_potential(0.,1e6*a,a,3.,1.,1.)),2e-6)

    def test_mesh_is_nested_and_exactly_conforms_to_disk(self):
        old_r,old_z=grid(.004,1.,196.,16)
        new_r,new_z=grid(.004,1.,196.,32)
        np.testing.assert_allclose(old_r,new_r[::2],atol=1e-17)
        np.testing.assert_allclose(old_z,new_z[::2],atol=1e-17)
        self.assertEqual(old_r[16],.004)
        self.assertAlmostEqual(old_r[-1],.032)
        self.assertAlmostEqual(old_z[-1]/14,.032)

    def test_fipy_isotropic_signed_voltage_and_conductivity_scaling(self):
        a=solve(8,sigma_r=1.,sigma_z=1.,voltage=1.)
        negative=solve(8,sigma_r=1.,sigma_z=1.,voltage=-1.)
        scaled=solve(8,sigma_r=7.,sigma_z=7.,voltage=1.)
        np.testing.assert_allclose(negative['cellPotentialV'],-np.array(a['cellPotentialV']),rtol=1e-10,atol=1e-12)
        np.testing.assert_allclose(scaled['cellPotentialV'],a['cellPotentialV'],rtol=1e-10,atol=1e-12)
        self.assertAlmostEqual(negative['contactCurrentA'],-a['contactCurrentA'],places=10)
        self.assertAlmostEqual(scaled['contactCurrentA']/a['contactCurrentA'],7.,places=9)
        for row in (a,negative,scaled):
            self.assertLess(row['chargeResidualRelative'],1e-8)
            self.assertLess(row['boundaryChargeResidualRelative'],1e-8)
            self.assertLess(row['insulatingCurrentRelative'],1e-8)

    def test_coordinate_anisotropy_matches_same_transformed_problem(self):
        isotropic=solve(8,sigma_r=1.,sigma_z=1.,voltage=1.)
        stretched=solve(8,sigma_r=1.,sigma_z=196.,voltage=1.)
        np.testing.assert_allclose(stretched['cellPotentialV'],isotropic['cellPotentialV'],rtol=1e-9,atol=1e-11)
        self.assertAlmostEqual(stretched['contactCurrentA']/isotropic['contactCurrentA'],14.,places=8)

    def test_contact_current_and_field_refine_toward_analytic_solution(self):
        coarse=solve(8,sigma_r=1.,sigma_z=1.,voltage=1.)
        fine=solve(16,sigma_r=1.,sigma_z=1.,voltage=1.)
        self.assertLess(fine['currentRelativeError'],coarse['currentRelativeError'])
        self.assertLess(fine['fieldVolumeRmsOverVoltage'],coarse['fieldVolumeRmsOverVoltage'])
        self.assertFalse(fine['experimentalQualification'])

    def test_invalid_physical_domain_is_rejected(self):
        for kwargs in (dict(a=0.),dict(sigma_r=0.),dict(sigma_z=-1.),dict(voltage=float('nan'))):
            with self.assertRaises(ValueError): solve(8,**kwargs)
        for n in (0,3,8.5,True):
            with self.assertRaises(ValueError): solve(n)
        with self.assertRaises(ValueError): exact_potential(-1.,0.,.004,1.,1.,1.)

    def test_main_serializes_numpy_derived_gates_and_retains_failures(self):
        for error,expected_gate in ((.001,True),(.1,False)):
            with self.subTest(error=error),tempfile.TemporaryDirectory() as directory:
                destination=Path(directory)/'access.json'
                def row(n):
                    return dict(nearContactCells=n,contactCurrentA=np.float64(1.),
                        currentRelativeError=np.float64(error),
                        chargeResidualRelative=np.float64(0.),
                        boundaryChargeResidualRelative=np.float64(0.),
                        insulatingCurrentRelative=np.float64(0.),cellPotentialV=[1.])
                with patch.object(access82,'solve',side_effect=row), \
                        patch.object(access82.sys,'argv',['access82.py',str(destination)]), \
                        patch.object(access82.importlib.metadata,'version',return_value='test'), \
                        contextlib.redirect_stdout(io.StringIO()):
                    access82.main()
                output=json.loads(destination.read_text())
                self.assertIs(output['analyticCurrentGate'],expected_gate)
                self.assertIs(output['currentRefinementGate'],True)
                self.assertIs(output['chargeGate'],True)
                self.assertFalse(output['experimentalQualification'])
                self.assertEqual(len(output['rows']),len(access82.REFINEMENTS))
                self.assertNotIn('cellPotentialV',output['rows'][-1])
                self.assertEqual(len(output['sourceSHA256']),64)


if __name__=='__main__': unittest.main()
