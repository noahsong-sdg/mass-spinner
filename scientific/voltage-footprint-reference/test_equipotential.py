import copy
import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
from equipotential import dolfinx_solve,skfem_solve,ROOT,A
from voltage_campaign import RESIDUALS,INTEGRALS,relative,dolfinx_sample,skfem_sample,uniform_receipt,UNIFORM_PATH
from voltage_ledger import ledger,INVENTORY
from solvers import dolfinx_solve as uniform_solve


class EquipotentialBoundary(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.r,cls.z = np.meshgrid(np.linspace(0,.06,21),np.linspace(0,.24,17))
        cls.o,cls.p,cls.m = dolfinx_solve(1,.002,.01,target_current=100.)
        cls.other,cls.im = skfem_solve(1,.002,.01,target_current=100.)

    def test_charge_work_torque_and_contact_constraints(self):
        for m in (self.m,self.im):
            for key in RESIDUALS:
                self.assertLess(m[key],1e-8,key)
            self.assertLess(abs(m['branchCurrentA']-100),1e-8)
            self.assertTrue(A*A<=m['cathodeMeanRadiusSquaredM2']<=(A+.002)**2)
            self.assertGreater(m['jouleW'],0)

    def test_both_independent_fields_and_integrals(self):
        np.testing.assert_allclose(dolfinx_sample(self.o,self.r,self.z),skfem_sample(self.other,self.r,self.z),rtol=1e-7,atol=1e-4)
        np.testing.assert_allclose(dolfinx_sample(self.p,self.r,self.z),skfem_sample(dict(self.other,omega=self.other['potential']),self.r,self.z),rtol=1e-7,atol=1e-7)
        for key in INTEGRALS:
            self.assertLess(relative(self.m[key],self.im[key]),1e-7,key)

    def test_real_resolve_after_common_contact_gauge_shift(self):
        o,p,m = dolfinx_solve(1,.002,.01,gauge=50.,target_current=100.)
        np.testing.assert_allclose(dolfinx_sample(p,self.r,self.z)-50,dolfinx_sample(self.p,self.r,self.z),rtol=1e-7,atol=1e-6)
        np.testing.assert_allclose(dolfinx_sample(o,self.r,self.z),dolfinx_sample(self.o,self.r,self.z),rtol=1e-7,atol=1e-3)
        for key in INTEGRALS:
            self.assertLess(relative(m[key],self.m[key]),1e-7)
        self.assertLess(m['sourceResidualRelative'],1e-8)

    def test_voltage_linearity_and_inverse_current_normalization(self):
        o,p,m = dolfinx_solve(1,.002,.01,voltage=self.m['portVoltageV'])
        self.assertLess(relative(m['branchCurrentA'],100.),1e-7)
        np.testing.assert_allclose(dolfinx_sample(o,self.r,self.z),dolfinx_sample(self.o,self.r,self.z),rtol=1e-7,atol=1e-4)
        _,_,twice = dolfinx_solve(1,.002,.01,voltage=2*self.m['portVoltageV'])
        self.assertLess(relative(twice['branchCurrentA'],200.),1e-7)
        self.assertLess(relative(twice['electrodePowerW'],4*self.m['electrodePowerW']),1e-7)

    def test_current_and_field_reversals_and_zero_field(self):
        for kwargs,sign in [(dict(target_current=-100.),-1),(dict(target_current=100.,magnetic=-.13),-1)]:
            o,p,m = dolfinx_solve(1,.002,.01,**kwargs)
            np.testing.assert_allclose(dolfinx_sample(o,self.r,self.z),sign*dolfinx_sample(self.o,self.r,self.z),rtol=1e-7,atol=1e-4)
            potential_sign = -1 if kwargs.get('target_current')==-100 else 1
            np.testing.assert_allclose(dolfinx_sample(p,self.r,self.z),potential_sign*dolfinx_sample(self.p,self.r,self.z),rtol=1e-7,atol=1e-7)
            self.assertLess(relative(m['electrodePowerW'],self.m['electrodePowerW']),1e-7)
        zero,_,m = dolfinx_solve(1,.002,.01,magnetic=0.,target_current=100.)
        np.testing.assert_allclose(dolfinx_sample(zero,self.r,self.z),0,atol=1e-10)
        self.assertEqual(m['viscousW'],0)

    def test_equipotential_distribution_requires_no_more_work_than_uniform_flux(self):
        _,_,uniform = uniform_solve(1,.002,.01)
        self.assertLessEqual(self.m['electrodePowerW'],uniform['electrodePowerW']*(1+1e-8))
        uniform_mean_r2 = (A*A+(A+.002)**2)/2
        self.assertGreater(abs(self.m['cathodeMeanRadiusSquaredM2']-uniform_mean_r2),1e-10)

    def test_invalid_drive_support_and_zero_contact_width(self):
        for kwargs in (dict(voltage=0),dict(gauge=float('nan')),dict(target_current=0)):
            with self.assertRaises(ValueError): dolfinx_solve(1,.002,.01,**kwargs)
        with self.assertRaises(ValueError): skfem_solve(1,0,.01)

    def test_fine_contact_factorization_preserves_physical_budgets(self):
        _,_,m = dolfinx_solve(4,.001,.005,target_current=100.)
        for key in RESIDUALS:
            self.assertLess(m[key],1e-8,key)

    def test_voltage_ledger_preserves_unidentified_observables(self):
        d = ledger()
        self.assertEqual(d['terminalMinusCorrectedRangeV'],[37.,42.])
        self.assertEqual(d['probeReferenceRadiusM'],.05)
        self.assertFalse(d['modelPortMappingEstablished'])
        self.assertFalse(d['experimentalQualification'])
        original = json.loads(INVENTORY.read_text())
        for edit in (lambda d:d['scalars'].append(copy.deepcopy(d['scalars'][1])),
                     lambda d:d['scalars'][1].update(units='A'),
                     lambda d:d['scalars'][1].update(reportedPlusMinus=-1),
                     lambda d:d['scalars'][1].update(reportedPlusMinus=None),
                     lambda d:d['scalars'][1].update(value=float('nan')),
                     lambda d:d['apparatus'].update(id='wijnakker-1980')):
            changed = copy.deepcopy(original)
            edit(changed)
            with tempfile.TemporaryDirectory() as folder:
                path = Path(folder)/'observation.json'
                path.write_text(json.dumps(changed))
                with self.assertRaises(ValueError): ledger(path)

    def test_uniform_control_rejects_corruption_and_earlier_receipt(self):
        self.assertTrue(uniform_receipt()['numericalScreen'])
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'changed.json.gz'
            raw = bytearray(UNIFORM_PATH.read_bytes())
            raw[-1] ^= 1
            path.write_bytes(raw)
            with self.assertRaises(ValueError): uniform_receipt(path)
        with self.assertRaises(ValueError):
            uniform_receipt(UNIFORM_PATH.with_name('campaign-initial.json.gz'))


if __name__=='__main__': unittest.main()
