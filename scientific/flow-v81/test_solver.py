import json
from pathlib import Path
import unittest
import numpy as np
from solver import solve,calibrate,legacy,radial_electric,radial_shear,axial_series


class SpatialSolverControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m=json.loads((Path(__file__).parents[1]/'profile-v79/manifest.json').read_text())
    def fields(self):
        return dict(viscosity=lambda r,z: 1.14e-4*(1+r/.06+z/.24),
                    conductivity_shape=lambda r,z: 1+2*r/.06+z/.24,
                    beta_field=lambda r,z: 1+r/.06+z/.24)
    def test_uniform_limit_matches_frozen_v79(self):
        a=solve(self.m,3.,1000.,18.5,1); b=legacy.solve(self.m,3.,1000.,18.5,1)
        for name in ('omega','potential','electrodePowerW','jouleW','viscousW'):
            np.testing.assert_allclose(a[name],b[name],rtol=2e-9,atol=1e-8)
    def test_nonuniform_power_charge_torque_and_independent_boundary_moment(self):
        a=solve(self.m,3.,1000.,18.5,1,**self.fields())
        for name in ('chargeResidualRelative','boundaryResidualRelative','powerResidualRelative',
                     'angularResidualRelative','linearResidualRelative','torqueMomentResidualRelative'):
            self.assertLess(a[name],1e-8,name)
        self.assertGreater(a['driveTorqueNm'],0)
    def test_property_scaling_and_signed_fields(self):
        fields=self.fields(); a=solve(self.m,3.,1000.,18.5,1,**fields)
        b=solve(self.m,3.,7000.,18.5,1,**{**fields,'viscosity':lambda r,z:7*fields['viscosity'](r,z)})
        np.testing.assert_allclose(a['omega'],b['omega'],rtol=2e-9,atol=1e-8)
        self.assertAlmostEqual(b['jouleW']/a['jouleW'],7.,places=8)
        c=solve(self.m,3.,1000.,18.5,1,**fields,magnetic=-self.m['magneticT'])
        np.testing.assert_allclose(c['omega'],-a['omega'],rtol=2e-9,atol=1e-8)
        d=solve(self.m,3.,1000.,-18.5,1,**fields)
        np.testing.assert_allclose(d['omega'],-a['omega'],rtol=2e-9,atol=1e-8)
        z=solve(self.m,3.,1000.,18.5,1,**fields,magnetic=0.)
        np.testing.assert_array_equal(z['omega'],0.)
    def test_electrical_conditioning_not_shape_normalization_or_target_velocity(self):
        fields=self.fields(); s,a=calibrate(self.m,3.,18.5,1,**fields)
        q,b=calibrate({**self.m,'measuredVelocityMS':[1e10]},3.,18.5,1,
                      **{**fields,'conductivity_shape':lambda r,z:11*fields['conductivity_shape'](r,z)})
        self.assertAlmostEqual(q*11/s,1.,places=8)
        np.testing.assert_allclose(a['omega'],b['omega'],rtol=2e-9,atol=1e-7)
    def test_layered_resistances_against_integrals(self):
        a,f,b,dz=.01,.02,.04,.03
        self.assertAlmostEqual(radial_electric(a,f,b,dz,2.,4.),np.log(2)*(1/2+1/4)/(2*np.pi*dz))
        expected=((1/a**2-1/f**2)/2+(1/f**2-1/b**2)/4)/(4*np.pi*dz)
        self.assertAlmostEqual(radial_shear(a,f,b,dz,2.,4.),expected)
        self.assertAlmostEqual(axial_series(0.,1.,3.,2.,2.,4.),.5)
        errors=[]
        for h in (.004,.002,.001):
            ra,rb=.03-h,.03+h
            flux=(ra**-3-rb**-3)/radial_shear(ra,.03,rb,dz,ra,rb)
            errors.append(abs(flux/(6*np.pi*dz)-1))
        self.assertTrue(all(c/f>3.8 for c,f in zip(errors,errors[1:])))
    def test_invalid_fields_are_not_repaired(self):
        for fields in (dict(viscosity=0.),dict(conductivity_shape=-1.),dict(beta_field=-1.),
                       dict(viscosity=np.ones((1,32))),dict(viscosity=float('nan'))):
            with self.assertRaises(ValueError): solve(self.m,3.,1000.,18.5,1,**fields)


if __name__=='__main__': unittest.main()
