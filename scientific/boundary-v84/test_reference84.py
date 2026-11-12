"""Independent Neumann-reference controls; no primary assembly imports."""
import unittest
import numpy as np
from reference84 import solve,_weights


M=dict(radiusM=.06,halfLengthM=.24,cathodeRadiusM=.004,anodeCenterM=.07,
       anodeWidthM=.02,magneticT=.13,branchCurrentA=100.,viscosityPaS=1.14e-4,
       chordsM=[.005,.015,.025,.035,.045,.055])
FIELDS=dict(conductivity_shape=1.,beta_field=3.)


class IndependentReference(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.state=solve(M,1,FIELDS)

    def test_flux_moments_and_conservation(self):
        s=self.state
        self.assertEqual(s['currentA'],100.)
        self.assertEqual(s['anodeCurrentA'],-100.)
        self.assertAlmostEqual(s['cathodeRadialMomentM2'],M['cathodeRadiusM']**2,places=16)
        self.assertAlmostEqual(s['anodeAxialCentroidM'],M['anodeCenterM'],places=15)
        for name in ('chargeResidualRelative','momentumResidualRelative','powerResidualRelative',
                     'torqueResidualRelative','torqueMomentResidualRelative','linearResidualRelative'):
            self.assertLess(s[name],1e-8,name)
        self.assertGreater(s['jouleW'],0.)
        self.assertGreater(s['shearW'],0.)
        self.assertGreater(s['driveTorqueNm'],0.)
        self.assertAlmostEqual(s['driveTorqueNm'],100*.13*(.06**2-.004**2)/2,places=11)
        self.assertGreater(s['boundaryJouleW'],0.)
        self.assertAlmostEqual(s['jouleW'],s['internalJouleW']+s['boundaryJouleW'],places=10)
        self.assertFalse(s['contactVoltageExperimental'])
        self.assertFalse(s['experimentalQualification'])
        self.assertTrue(s['currentConditioning'])

    def test_gauge_does_not_become_an_electrical_contact(self):
        shifted=solve(M,1,FIELDS,gauge=7.25)
        np.testing.assert_allclose(shifted['potentialV']-self.state['potentialV'],7.25,rtol=0,atol=3e-14)
        np.testing.assert_array_equal(shifted['velocityMS'],self.state['velocityMS'])
        self.assertAlmostEqual(shifted['electrodePowerW'],self.state['electrodePowerW'],places=8)
        self.assertLess(shifted['chargeResidualRelative'],1e-8)
        self.assertLess(shifted['torqueMomentResidualRelative'],1e-8)

    def test_zero_magnetic_field_and_zero_current(self):
        for kwargs in (dict(magnetic=0.),dict(current=0.)):
            s=solve(M,1,FIELDS,**kwargs)
            np.testing.assert_allclose(s['velocityMS'],0.,rtol=0,atol=1e-12)
            self.assertEqual(s['driveTorqueNm'],0.)
            self.assertLess(s['powerResidualRelative'],1e-8)
        self.assertIsNone(s['contactVoltEquivalentV'])

    def test_current_reversal_and_linearity(self):
        for current in (-100.,37.):
            s=solve(M,1,FIELDS,current=current); ratio=current/100
            for name in ('potentialV','velocityMS','chordVelocityMS'):
                np.testing.assert_allclose(s[name],np.asarray(self.state[name])*ratio,rtol=2e-10,atol=1e-10)
            self.assertAlmostEqual(s['electrodePowerW']/self.state['electrodePowerW'],ratio**2,places=9)
            self.assertAlmostEqual(s['driveTorqueNm']/self.state['driveTorqueNm'],ratio,places=9)

    def test_field_reversal_preserves_resistive_loss(self):
        s=solve(M,1,FIELDS,magnetic=-M['magneticT'])
        np.testing.assert_allclose(s['velocityMS'],-self.state['velocityMS'],rtol=1e-11,atol=1e-10)
        np.testing.assert_allclose(s['potentialV'],self.state['potentialV'],rtol=1e-11,atol=1e-10)
        self.assertAlmostEqual(s['jouleW'],self.state['jouleW'],places=8)
        self.assertAlmostEqual(s['driveTorqueNm'],-self.state['driveTorqueNm'],places=11)

    def test_source_quadrature_conserves_total_and_first_coordinate_moment(self):
        x=np.array([.1,.3,.6,1.]); indices,weights=_weights(x,.5)
        self.assertTrue(np.all(weights>=0))
        self.assertAlmostEqual(sum(weights),1.,places=15)
        self.assertAlmostEqual(float(x[indices]@weights),.5,places=15)
        indices,weights=_weights(x,.3)
        np.testing.assert_array_equal(indices,[1]); np.testing.assert_array_equal(weights,[1.])
        for coordinates,target in (([0.,0.,1.],.5),([0.,np.nan,1.],.5),([0.,1.],2.)):
            with self.assertRaises(ValueError): _weights(coordinates,target)

    def test_unphysical_transport_and_apparatus_are_rejected(self):
        for bad in (dict(conductivity_shape=-1.),dict(beta_field=-1.),dict(viscosity=0.),
                    dict(conductivity_shape=np.ones((2,3))),dict(beta_field=np.nan)):
            with self.assertRaises(ValueError): solve(M,1,bad)
        for changed in (dict(cathodeRadiusM=.06),dict(anodeCenterM=.24),dict(branchCurrentA=np.nan)):
            with self.assertRaises(ValueError): solve({**M,**changed},1,FIELDS)


if __name__=='__main__': unittest.main()
