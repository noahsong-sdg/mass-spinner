"""Independent manufactured fields and actual ring-solve diagnostic regressions.

No helper used below imports the producer's face-law functions. Parent executes
inside safe-dev; writing these tests does not constitute an execution claim.
"""
from copy import deepcopy
import unittest

import numpy as np

from diagnostics85 import analyze, pressure_loop
from model84 import solve


M=dict(radiusM=.06,halfLengthM=.24,cathodeRadiusM=.004,
       anodeCenterM=.07,anodeWidthM=.02,magneticT=.13,branchCurrentA=100.,
       chordsM=[.01,.03,.05])
FIELDS=dict(viscosity=1.14e-4,conductivity_shape=700/1070,beta_field=3.)


def material(nr):
    return dict(neutralDensityM3=np.full(nr,1e21),
                impliedElectronDensityM3=np.full(nr,1e19),
                hallSM=np.full(nr,21.),pedersenSM=np.full(nr,70.))


def manufactured():
    r=np.linspace(0.,.06,9); z=np.linspace(0.,.24,9)
    rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2
    w=2.+3.*rc[None,:]**2+5.*zc[:,None]
    state=dict(r=r,z=z,omega=w,potential=np.zeros_like(w),ports=[])
    return state,rc,zc


def direct_constant_mu_work(state,mu):
    """Closed-form cylindrical shell resistances, not production face helpers."""
    r,z,w=(state[k] for k in ('r','z','omega'))
    rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2
    work=np.zeros(4)
    for j,dz in enumerate(np.diff(z)):
        for i in range(len(rc)-1):
            g=4*np.pi*mu*dz/(rc[i]**-2-rc[i+1]**-2)
            work[0]+=g*(w[j,i]-w[j,i+1])**2
        g=4*np.pi*mu*dz/(rc[-1]**-2-r[-1]**-2)
        work[2]+=g*w[j,-1]**2
    moments=np.pi/2*np.diff(r**4)
    for j in range(len(zc)-1):
        work[1]+=sum(mu*moments*(w[j]-w[j+1])**2/(zc[j+1]-zc[j]))
    work[3]=sum(mu*moments*w[-1]**2/(z[-1]-zc[-1]))
    return work


class PressureRectangle(unittest.TestCase):
    def test_exact_bilinear_force_on_nonuniform_centers_and_offgrid_cuts(self):
        r=np.array([0.,.007,.017,.039,.052,.06]); z=np.array([0.,.011,.041,.09,.17,.24])
        force=7.+2*r[None,:]+3*z[:,None]+5*r[None,:]*z[:,None]
        bounds=(.01,.05,.02,.12)
        expected=(.12-.02)*(3*(.05-.01)+2.5*(.05**2-.01**2))
        self.assertAlmostEqual(pressure_loop(r,z,force,bounds),expected,places=14)
        self.assertAlmostEqual(pressure_loop(r,z,-force,bounds),-expected,places=14)

    def test_axially_uniform_force_has_zero_loop_even_with_radial_structure(self):
        r=np.linspace(0.,.06,9); z=np.linspace(0.,.24,9)
        force=np.broadcast_to((1.+r**2)[None,:],(len(z),len(r)))
        self.assertEqual(pressure_loop(r,z,force),0.)

    def test_rejects_nonfinite_unordered_missing_and_exterior_support(self):
        r=np.linspace(0.,.06,9); z=np.linspace(0.,.24,9); force=np.zeros((9,9))
        broken=force.copy(); broken[2,3]=np.nan
        for rr,zz,ff,bounds in [(r[::-1],z,force,(.01,.05,.02,.12)),
                (r,z[::-1],force,(.01,.05,.02,.12)),(r,z,broken,(.01,.05,.02,.12)),
                (r,z,force[:,:-1],(.01,.05,.02,.12)),(r,z,force,(-.01,.05,.02,.12)),
                (r,z,force,(.01,.05,.02,.25)),(r,z,force,(.05,.01,.02,.12))]:
            with self.subTest(bounds=bounds), self.assertRaises(ValueError):
                pressure_loop(rr,zz,ff,bounds)


class FieldAccounting(unittest.TestCase):
    def test_four_work_partitions_match_independent_constant_mu_integrals(self):
        state,rc,_=manufactured(); value=analyze(M,state,FIELDS,material(len(rc)))
        expected=direct_constant_mu_work(state,FIELDS['viscosity'])
        actual=[value['workW'][k] for k in ('radialInteriorW','axialInteriorW','radialWallW','endWallW')]
        np.testing.assert_allclose(actual,expected,rtol=3e-14,atol=1e-18)
        self.assertTrue(np.all(expected>0))

    def test_rigid_rotation_has_zero_internal_work_but_stationary_walls_brake(self):
        state,rc,_=manufactured(); state['omega'][:]=10.
        value=analyze(M,state,FIELDS,material(len(rc)))
        self.assertEqual(value['workW']['radialInteriorW'],0.)
        self.assertEqual(value['workW']['axialInteriorW'],0.)
        self.assertGreater(value['workW']['radialWallW'],0.)
        self.assertGreater(value['workW']['endWallW'],0.)
        self.assertGreater(value['radialWallTorqueNm'],0.)
        self.assertGreater(value['endWallTorqueNm'],0.)

    def test_cosine_wall_halfcell_dissipation_vanishes_with_finite_torque(self):
        # Smooth exact field Omega=A*(1-z²/L²) obeys symmetry and endwall
        # no-slip. Exact axial dissipation is mu*M*4*A²/(3*L), where
        # M=int_0^R 2*pi*r³dr. The end halfcell is a shrinking gas region.
        r=np.linspace(0.,M['radiusM'],9); rc=np.sqrt((r[:-1]**2+r[1:]**2)/2)
        length=M['halfLengthM']; amplitude=100.; mu=FIELDS['viscosity']
        moment=np.pi*M['radiusM']**4/2
        exact_total=mu*moment*4*amplitude**2/(3*length)
        exact_torque=mu*moment*2*amplitude/length
        halves=[]; errors=[]; torques=[]
        for n in (16,32,64):
            z=length*(1-np.cos(np.linspace(0.,np.pi,n+1)))/2
            zc=(z[:-1]+z[1:])/2
            w=np.broadcast_to((amplitude*(1-zc**2/length**2))[:,None],(n,len(rc))).copy()
            state=dict(r=r,z=z,omega=w,potential=np.zeros_like(w),ports=[])
            d=analyze(M,state,FIELDS,material(len(rc)))
            half=d['workW']['endWallW']; halves.append(half); torques.append(d['endWallTorqueNm'])
            distance=length-zc[-1]
            self.assertAlmostEqual(half/(mu*moment*(amplitude*(1-zc[-1]**2/length**2))**2/distance),1.,places=12)
            total=d['workW']['axialInteriorW']+half
            errors.append(abs(total-exact_total)/exact_total)
        self.assertTrue(halves[0]>halves[1]>halves[2]>0)
        # A ~300% relative change is expected for an O(n^-2) quantity tending
        # to zero, while fixed-volume dissipation and physical torque converge.
        relative=abs(halves[1]-halves[2])/halves[2]
        self.assertGreater(relative,2.9); self.assertLess(relative,3.1)
        self.assertTrue(errors[0]>errors[1]>errors[2])
        self.assertLess(errors[-1],.001)
        self.assertLess(abs(torques[-1]-exact_torque)/exact_torque,.001)

    def test_positive_electron_hall_conductivity_gives_correct_radial_force_sign(self):
        # Standard cylindrical basis: electron Drude response has Jtheta/Jr>0
        # for B>0, sigmaH>0, Etheta'=0; (Jtheta e_theta)x(B e_z) points +r.
        state,rc,zc=manufactured(); state['omega'][:]=0.
        state['potential']=-zc[:,None]*rc[None,:]**2
        value=analyze(M,state,FIELDS,material(len(rc)))
        self.assertEqual(value['pressureLoopPa']['centrifugalPa'],0.)
        self.assertGreater(value['pressureLoopPa']['hallPa'],0.)
        self.assertAlmostEqual(value['pressureLoopPa']['totalPa'],value['pressureLoopPa']['hallPa'])
        opposite=material(len(rc)); opposite['hallSM']*=-1
        reverse=analyze(M,state,FIELDS,opposite)
        self.assertAlmostEqual(reverse['pressureLoopPa']['hallPa'],-value['pressureLoopPa']['hallPa'])

    def test_electron_drude_equations_fix_the_signed_hall_convention(self):
        # Normalized electron balance: vr+beta*vtheta=-Er,
        # vtheta-beta*vr=-Etheta. Conventional current is minus electron flow.
        for beta in (-3.,3.):
            electron=np.linalg.solve([[1.,beta],[-beta,1.]],[-2.,0.])
            current=-electron
            self.assertAlmostEqual(current[1]/current[0],beta)
            self.assertGreater(current[0],0.)

    def test_saved_field_and_material_domain_boundaries(self):
        state,rc,_=manufactured()
        for key in ('r','z','omega','potential'):
            broken=deepcopy(state); broken[key].flat[0]=np.nan
            with self.subTest(key=key), self.assertRaises(ValueError):
                analyze(M,broken,FIELDS,material(len(rc)))
        for key,bad in [('neutralDensityM3',np.nan),('pedersenSM',0.),('hallSM',np.inf)]:
            mat=material(len(rc)); mat[key][0]=bad
            with self.subTest(key=key), self.assertRaises(ValueError):
                analyze(M,state,FIELDS,mat)


class ActualRingLedger(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.state=solve(M,1,FIELDS)
        cls.mat=material(len(cls.state['r'])-1)
        cls.value=analyze(M,cls.state,FIELDS,cls.mat)

    def test_wall_torque_work_and_each_axial_slab_close(self):
        value,state=self.value,self.state
        torque=M['magneticT']*M['branchCurrentA']*(M['radiusM']**2-M['cathodeRadiusM']**2)/2
        self.assertAlmostEqual(value['sourceTorqueNm']/torque,1.,places=9)
        self.assertAlmostEqual((value['radialWallTorqueNm']+value['endWallTorqueNm'])/torque,1.,places=9)
        self.assertAlmostEqual(sum(value['workW'].values())/state['viscousW'],1.,places=10)
        self.assertLess(value['slabBalanceRelative'],1e-8)
        residual=np.asarray(value['sourceTorqueBySlabNm'])-value['radialWallTorqueBySlabNm']-np.diff(value['axialViscousTorqueFluxNm'])
        self.assertLess(max(abs(residual))/abs(torque),1e-8)
        self.assertEqual(value['axialViscousTorqueFluxNm'][0],0.)
        self.assertEqual(value['axialViscousTorqueFluxNm'][-1],value['endWallTorqueNm'])
        self.assertFalse(value['circulationVelocityPredicted'])

    def test_potential_gauge_does_not_change_any_accounting_or_force_loop(self):
        shifted=deepcopy(self.state); shifted['potential']+=17.25
        value=analyze(M,shifted,FIELDS,self.mat)
        np.testing.assert_allclose(list(value['pressureLoopPa'].values()),list(self.value['pressureLoopPa'].values()),rtol=1e-10,atol=1e-10)
        np.testing.assert_allclose(value['sourceTorqueBySlabNm'],self.value['sourceTorqueBySlabNm'],rtol=1e-9,atol=1e-12)
        self.assertEqual(value['workW'],self.value['workW'])

    def test_current_reversal_flips_hall_but_preserves_centrifugal_force(self):
        reverse=deepcopy(self.state)
        reverse['potential']*=-1; reverse['omega']*=-1
        reverse['ports']=[{**p,'amp':-p['amp']} for p in reverse['ports']]
        m={**M,'branchCurrentA':-M['branchCurrentA']}
        value=analyze(m,reverse,FIELDS,self.mat)
        self.assertEqual(value['workW'],self.value['workW'])
        self.assertAlmostEqual(value['sourceTorqueNm'],-self.value['sourceTorqueNm'])
        self.assertAlmostEqual(value['pressureLoopPa']['centrifugalPa'],self.value['pressureLoopPa']['centrifugalPa'])
        self.assertAlmostEqual(value['pressureLoopPa']['hallPa'],-self.value['pressureLoopPa']['hallPa'])
        self.assertAlmostEqual(value['pressureLoopPa']['totalPa'],value['pressureLoopPa']['centrifugalPa']+value['pressureLoopPa']['hallPa'])
        self.assertLess(value['slabBalanceRelative'],1e-8)

    def test_zero_field_yields_no_rotation_force_or_torque(self):
        m={**M,'magneticT':0.}; state=solve(m,1,FIELDS)
        value=analyze(m,state,FIELDS,self.mat)
        self.assertEqual(sum(value['workW'].values()),0.)
        self.assertEqual(value['sourceTorqueNm'],0.)
        self.assertEqual(value['radialWallTorqueNm'],0.)
        self.assertEqual(value['endWallTorqueNm'],0.)
        self.assertEqual(sum(abs(x) for x in value['pressureLoopPa'].values()),0.)
        self.assertFalse(value['circulationVelocityPredicted'])

    def test_field_reversal_also_reverses_signed_hall_coefficient(self):
        reverse=deepcopy(self.state); reverse['omega']*=-1
        mat=deepcopy(self.mat); mat['hallSM']*=-1
        m={**M,'magneticT':-M['magneticT']}
        value=analyze(m,reverse,FIELDS,mat)
        self.assertEqual(value['workW'],self.value['workW'])
        self.assertAlmostEqual(value['sourceTorqueNm'],-self.value['sourceTorqueNm'])
        np.testing.assert_allclose(list(value['pressureLoopPa'].values()),list(self.value['pressureLoopPa'].values()),rtol=1e-12,atol=1e-12)
        self.assertLess(value['slabBalanceRelative'],1e-8)


if __name__=='__main__': unittest.main()
