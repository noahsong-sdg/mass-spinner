import unittest
import numpy as np
from contacts import geometry,A,R,L,CASES
from solvers import dolfinx_solve,skfem_solve
from campaign import RESIDUALS,dolfinx_sample,skfem_sample,relative


class FiniteContacts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.w,cls.h = CASES['middle']
        cls.o,cls.p,cls.m = dolfinx_solve(1,cls.w,cls.h)
        cls.other,cls.im = skfem_solve(1,cls.w,cls.h)
        cls.r,cls.z = np.meshgrid(np.linspace(0,R,21),np.linspace(0,L,17))

    def test_balanced_currents_moment_work_and_wall_reaction(self):
        for receipt in (self.m,self.im):
            for key in RESIDUALS:
                self.assertLess(receipt[key],1e-8,key)
            self.assertGreater(receipt['jouleW'],0)
            self.assertGreater(receipt['viscousW'],0)
            self.assertAlmostEqual(receipt['sourceMomentTorqueNm'],100*.13/2*(R*R-(A*A+(A+self.w)**2)/2))

    def test_independent_potential_flow_and_integrals(self):
        np.testing.assert_allclose(dolfinx_sample(self.o,self.r,self.z),skfem_sample(self.other,self.r,self.z),rtol=1e-7,atol=1e-4)
        other = dict(self.other,omega=self.other['potential'])
        np.testing.assert_allclose(dolfinx_sample(self.p,self.r,self.z),skfem_sample(other,self.r,self.z),rtol=1e-7,atol=1e-7)
        for key in ('jouleW','viscousW','portVoltageV'):
            self.assertLess(relative(self.m[key],self.im[key]),1e-7,key)

    def test_current_reversal_and_quadratic_work(self):
        for current in (-100.,200.):
            o,p,m = dolfinx_solve(1,self.w,self.h,current=current)
            factor = current/100
            np.testing.assert_allclose(dolfinx_sample(o,self.r,self.z),factor*dolfinx_sample(self.o,self.r,self.z),rtol=1e-8,atol=1e-4)
            np.testing.assert_allclose(dolfinx_sample(p,self.r,self.z),factor*dolfinx_sample(self.p,self.r,self.z),rtol=1e-8,atol=1e-7)
            self.assertLess(relative(m['electrodePowerW'],factor**2*self.m['electrodePowerW']),1e-8)

    def test_field_reversal_and_zero_field(self):
        reverse,p,m = dolfinx_solve(1,self.w,self.h,magnetic=-.13)
        np.testing.assert_allclose(dolfinx_sample(reverse,self.r,self.z),-dolfinx_sample(self.o,self.r,self.z),rtol=1e-8,atol=1e-4)
        np.testing.assert_allclose(dolfinx_sample(p,self.r,self.z),dolfinx_sample(self.p,self.r,self.z),rtol=1e-8,atol=1e-7)
        zero,_,m = dolfinx_solve(1,self.w,self.h,magnetic=0)
        np.testing.assert_allclose(dolfinx_sample(zero,self.r,self.z),0,atol=1e-10)
        self.assertEqual(m['viscousW'],0)

    def test_work_unchanged_by_potential_gauge(self):
        # Independent boundary quadrature of Q2 potential after a constant shift.
        from numpy.polynomial.legendre import leggauss
        x,w = leggauss(4)
        re,ze,*_ = geometry(1,self.w,self.h,100.,.13)
        def quadrature(edges,lo,hi):
            edges = edges[(edges>=lo)&(edges<=hi)]
            points,weights = [],[]
            for a,b in zip(edges,edges[1:]):
                points.extend(a+(b-a)*(x+1)/2)
                weights.extend((b-a)*w/2)
            return np.array(points),np.array(weights)
        r,rw = quadrature(re,A,A+self.w)
        z,zw = quadrature(ze,.07-self.h,.07+self.h)
        for shift in (-50.,1000.):
            cathode = np.sum(rw*r*(dolfinx_sample(self.p,r,L)+shift))/np.sum(rw*r)
            anode = np.sum(zw*(dolfinx_sample(self.p,R,z)+shift))/(2*self.h)
            self.assertLess(relative(anode-cathode,self.m['portVoltageV']),1e-7)

    def test_fixed_supports_and_nested_edges(self):
        for width,half_width in CASES.values():
            previous = None
            for n in (1,2,4):
                r,z,*_ = geometry(n,width,half_width,100.,.13)
                self.assertTrue(np.any(r==A+width))
                self.assertTrue(np.any(z==.07-half_width))
                if previous is not None:
                    self.assertTrue(np.isin(previous[0],r).all())
                    self.assertTrue(np.isin(previous[1],z).all())
                previous = (r,z)

    def test_invalid_supports_and_zero_width_rejected(self):
        for n,w,h,I,B in [(1,0,.01,100,.13),(1,.06,.01,100,.13),(1,.002,0,100,.13),
                          (1,.002,.08,100,.13),(3,.002,.01,100,.13),
                          (1,.002,.01,0,.13),(1,.002,.01,100,float('nan'))]:
            with self.assertRaises(ValueError):
                geometry(n,w,h,I,B)


if __name__ == '__main__':
    unittest.main()
