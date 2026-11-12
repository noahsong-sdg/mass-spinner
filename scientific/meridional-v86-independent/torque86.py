"""Independent operator wall-reaction controls, outside the frozen V86 producer."""
from pathlib import Path
import sys
import unittest
import numpy as np
from scipy.sparse.linalg import spsolve

SCIENTIFIC=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(SCIENTIFIC/'mixture-axial-v75'))
sys.path.insert(0,str(SCIENTIFIC/'meridional-v86'))
from flow import Flow
from diffusion86 import Diffusion

M_AR=39.948*1.66053906660e-27


class WallReactionControls(unittest.TestCase):
    def setUp(self):
        self.f=Flow(np.linspace(0,.06,7),np.linspace(0,.24,10),[M_AR,M_AR])
        self.d=Diffusion(self.f,1.14e-4)
        r=self.f.mean_r[None,:]; z=((self.f.z[:-1]+self.f.z[1:])/2)[:,None]
        self.q=self.f.state(.001*(1+.3*r/.06+.1*z/.24),3000.,.5,
            900*(1-r/.06)*np.cos(np.pi*z/(2*.24)),
            vr=4*r/.06*(1-r/.06)*np.cos(np.pi*z/(2*.24)),
            vz=3*np.cos(np.pi*r/(2*.06))*np.sin(np.pi*z/.24))

    def check_reaction(self,q):
        dt=3e-6; f,d=self.f,self.d; out,receipt=d.advance(q,dt)
        endpoint=np.asarray(receipt['velocityTrace'])
        theta=d.velocity.nodal_dofs[2]; interior=d.vdofs[2]
        fixed=np.intersect1d(theta,d.fixed)
        natural=np.setdiff1d(theta,np.r_[interior,fixed])
        S=d.stiffness
        # A uniform generalized rotation is a full-space strain null vector,
        # including fixed wall nodes; it is a virtual-work test, not an
        # admissible rotating-wall boundary state for this run.
        rotation=np.zeros(d.velocity.N); rotation[theta]=1.
        scale=max(float(np.max(abs(S.data))),np.finfo(float).tiny)
        self.assertLess(np.max(abs(S@rotation)),2e-12*scale)
        row=np.asarray(S@endpoint)
        force_scale=max(float(np.max(abs(row))),np.finfo(float).tiny)
        self.assertLess(np.max(abs(row[natural]),initial=0.),2e-10*force_scale)
        np.testing.assert_array_equal(endpoint[d.fixed],0.)
        change=(out[3]-q[3]).ravel()
        np.testing.assert_allclose(change/dt,-row[interior],rtol=2e-9,atol=2e-15*force_scale)
        wall=float(row[fixed].sum())
        actual=float(change.sum()/dt)
        self.assertAlmostEqual(actual,wall,delta=2e-10*max(abs(actual),abs(wall),force_scale))
        # Recover the zero-capacity trace independently from the static theta
        # rows and the actual FV endpoint Omega, rather than trusting its value.
        if len(natural):
            expected=spsolve(S[natural][:,natural].tocsc(),-S[natural][:,interior]@endpoint[interior])
            np.testing.assert_allclose(endpoint[natural],expected,rtol=2e-10,atol=1e-11)
        return actual,wall,out

    def test_nonuniform_density_and_all_velocity_components(self):
        actual,wall,_=self.check_reaction(self.q)
        self.assertLess(actual,0.)
        self.assertLess(wall,0.)

    def test_spin_reversal_reverses_wall_torque(self):
        forward,_,a=self.check_reaction(self.q)
        q=self.q.copy(); q[3]*=-1
        backward,_,b=self.check_reaction(q)
        self.assertAlmostEqual(forward,-backward,delta=2e-11*abs(forward))
        np.testing.assert_allclose(a[3],-b[3],rtol=2e-12,atol=1e-20)
        np.testing.assert_allclose(a[[0,1,2,4,5]],b[[0,1,2,4,5]],rtol=2e-12,atol=1e-20)

    def test_meridional_stress_does_not_create_angular_momentum(self):
        q=self.q.copy(); q[4]-=.5*q[3]**2/(q[0]*self.f.mean_r2); q[3]=0.
        actual,wall,out=self.check_reaction(q)
        self.assertEqual(actual,0.)
        self.assertEqual(wall,0.)
        np.testing.assert_array_equal(out[3],0.)


if __name__=='__main__':
    unittest.main()
