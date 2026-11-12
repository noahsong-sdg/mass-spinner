"""Independent spatial-transport controls; parent executes only in safe-dev."""
import importlib.util
import json
from pathlib import Path
import unittest
import numpy as np
from reference import solve, _radial_shear

HERE=Path(__file__).parent


class SpatialReferenceControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m=json.loads((HERE.parent/'profile-v79/manifest.json').read_text())
        cls.base=solve(cls.m,3.,1000.,18.5,1)

    def test_uniform_fields_recover_independent_v79(self):
        spec=importlib.util.spec_from_file_location('v79_reference',HERE.parent/'profile-v79/reference.py')
        old=importlib.util.module_from_spec(spec); spec.loader.exec_module(old)
        expected=old.solve(self.m,3.,1000.,18.5,1)
        actual=solve(self.m,3.,1000.,18.5,1,viscosity=lambda r,z: self.m['viscosityPaS']+r*0,
                     conductivity_shape=1.,beta_field=lambda r,z: z*0+3.)
        for field in ('velocityMS','potentialV','chordVelocityMS','branchCurrentA','electrodePowerW','jouleW','shearW'):
            # The old unequilibrated solve is a noisy regression baseline, not
            # an exact local oracle near zero speed. Compare in common units
            # using a single field scale, without changing convergence gates.
            scale=max(float(np.max(np.abs(expected[field]))),np.finfo(float).tiny)
            error=float(np.max(np.abs(np.asarray(actual[field])-expected[field])))/scale
            self.assertLess(error,2e-9,field)

    def fields(self):
        return dict(viscosity=lambda r,z: self.m['viscosityPaS']*(1+2*r/.06+z/.24),
                    conductivity_shape=lambda r,z: 1+r/.06+2*z/.24,
                    beta_field=lambda r,z: 1+2*r/.06+z/.24)

    def test_variable_positive_fields_preserve_balances(self):
        state=solve(self.m,3.,1000.,18.5,1,**self.fields())
        self.assertGreater(state['branchCurrentA'],0)
        self.assertGreater(state['jouleW'],0); self.assertGreater(state['shearW'],0)
        for key in ('chargeResidualRelative','momentumResidualRelative','powerResidualRelative','torqueResidualRelative'):
            self.assertLess(state[key],1e-8,key)
        self.assertGreater(state['transportRanges']['viscosityPaS']['max'],state['transportRanges']['viscosityPaS']['min'])

    def test_manufactured_variable_viscosity_shear_flux_refines(self):
        # μ(r)=r and Ω(r)=r^-3 give -2πΔz μr³Ω'=6πΔz.
        # This continuum flux is derived independently of the FV face formula.
        face,dz=.03,.01
        exact=6*np.pi*dz; errors=[]
        for h in (.004,.002,.001):
            ra,rb=face-h,face+h
            conductance=_radial_shear(ra,face,rb,dz,ra,rb)
            actual=conductance*(ra**-3-rb**-3)
            errors.append(abs(actual/exact-1))
        self.assertLess(errors[-1],.002)
        self.assertTrue(all(coarse/fine>3.8 for coarse,fine in zip(errors,errors[1:])))

    def test_transport_and_voltage_scaling(self):
        fields=self.fields(); state=solve(self.m,3.,1000.,18.5,1,**fields)
        changed={**fields,'viscosity':lambda r,z: 7*fields['viscosity'](r,z)}
        scaled=solve(self.m,3.,7000.,18.5,1,**changed)
        for key in ('velocityMS','potentialV','chordVelocityMS'):
            np.testing.assert_allclose(scaled[key],state[key],rtol=2e-9,atol=1e-8)
        for key in ('branchCurrentA','electrodePowerW','jouleW','shearW'):
            self.assertAlmostEqual(scaled[key]/state[key],7.,places=8)
        reversed_state=solve(self.m,3.,1000.,-18.5,1,**fields)
        np.testing.assert_allclose(reversed_state['velocityMS'],-np.array(state['velocityMS']),rtol=2e-9,atol=1e-8)

    def test_conductivity_shape_normalization_is_not_physics(self):
        fields=self.fields(); state=solve(self.m,3.,1000.,18.5,1,**fields)
        changed={**fields,'conductivity_shape':lambda r,z: 13*fields['conductivity_shape'](r,z)}
        equivalent=solve(self.m,3.,1000./13,18.5,1,**changed)
        for key in ('velocityMS','potentialV','chordVelocityMS','branchCurrentA'):
            np.testing.assert_allclose(equivalent[key],state[key],rtol=2e-9,atol=1e-8)

    def test_variable_fields_zero_and_reversed_magnetic_field(self):
        fields=self.fields(); state=solve(self.m,3.,1000.,18.5,1,**fields)
        zero=solve({**self.m,'magneticT':0.},3.,1000.,18.5,1,**fields)
        np.testing.assert_allclose(zero['velocityMS'],0.,atol=1e-12)
        reverse=solve({**self.m,'magneticT':-self.m['magneticT']},3.,1000.,18.5,1,**fields)
        np.testing.assert_allclose(reverse['velocityMS'],-np.array(state['velocityMS']),rtol=2e-9,atol=1e-8)
        self.assertAlmostEqual(reverse['branchCurrentA']/state['branchCurrentA'],1.,places=9)

    def test_invalid_transport_domains_and_shapes_are_rejected(self):
        for kwargs in (dict(viscosity=0.),dict(viscosity=float('nan')),dict(conductivity_shape=-1.),
                       dict(beta_field=-.1),dict(viscosity=np.ones((1,32))),
                       dict(beta_field=lambda r,z: np.ones((2,3)))):
            with self.assertRaises(ValueError): solve(self.m,3.,1000.,18.5,1,**kwargs)

    def test_target_mutation_is_ignored(self):
        altered={**self.m,'measuredVelocityMS':[1e100,-1e100]}
        self.assertEqual(solve(altered,3.,1000.,18.5,1),self.base)


if __name__=='__main__': unittest.main()
