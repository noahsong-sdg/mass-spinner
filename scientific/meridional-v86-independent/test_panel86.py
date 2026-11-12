"""Exact polynomial/piecewise-panel controls and original-failure retention."""
import gzip
import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
import panel86 as p


def analytic(coefficients,R,L):
    total=0.
    for (i,j),a in coefficients.items():
        for (k,l),b in coefficients.items():
            total+=2*np.pi*a*b*R**(i+k+2)/(i+k+2)*L**(j+l+1)/(j+l+1)
    return total


def state(nr,nz):
    r,z=np.linspace(0,.06,nr+1),np.linspace(0,.24,nz+1)
    rc=(2/3)*np.diff(r**3)/np.diff(r*r); zc=(z[1:]+z[:-1])/2
    rr,zz=np.meshgrid(rc,zc)
    fields=dict(densityKgM3=.001*(1+rr/.06),temperatureK=3000+rr/.06*500,
        omegaRadS=900*(1-rr/.06)*(1-zz/.24),vrMPS=2*rr/.06*(1-rr/.06)*(1-zz/.24),
        vzMPS=3*(1-rr/.06)*zz/.24*(1-zz/.24))
    return dict(radialEdgesM=r.tolist(),axialEdgesM=z.tolist(),
        snapshots=[{name:value.tolist() for name,value in fields.items()} for _ in range(4)])


class PanelTests(unittest.TestCase):
    def test_exact_bilinear_squared_times_cylindrical_weight(self):
        coeff={(0,0):2.,(1,0):3.,(0,1):-4.,(1,1):5.}
        r=[0.,.007,.031,.06]; z=[0.,.017,.103,.24]
        def fn(points):
            zz,rr=points.T
            return (2+3*rr-4*zz+5*rr*zz)**2
        expected=analytic(coeff,.06,.24)
        for n in (2,3,4):
            with self.subTest(order=n):
                self.assertAlmostEqual(p.integral(r,z,fn,n)/expected,1.,places=14)

    def test_nonuniform_panels_integrate_actual_volume(self):
        for n in (2,3,4):
            result=p.integral([0.,.003,.012,.059,.06],[0.,.001,.09,.24],lambda x:np.ones(len(x)),n)
            self.assertAlmostEqual(result/(np.pi*.06**2*.24),1.,places=14)

    def test_piecewise_bilinear_fields_have_roundoff_only_panel_order_change(self):
        a,b=state(4,6),state(7,11)
        results=[p.metrics(a,b,1,n) for n in (2,3,4)]
        for name in results[0]:
            for term in ('errorIntegral','referenceIntegral'):
                values=np.array([row[name][term] for row in results])
                scale=np.max(abs(values))
                with self.subTest(field=name,term=term):
                    if scale: self.assertLess(np.ptp(values)/scale,2e-12)
                    else: np.testing.assert_array_equal(values,0.)

    def test_exact_zeros_and_tiny_flow_have_no_normalization_floor(self):
        a,b=state(4,6),state(4,6)
        for row in (a,b):
            for snap in row['snapshots']:
                snap['vrMPS']=np.zeros((6,4)).tolist(); snap['vzMPS']=np.zeros((6,4)).tolist()
        zero=p.metrics(a,b,0,2)
        self.assertEqual(zero['vrMPS']['value'],0.)
        self.assertEqual(zero['densityKgM3/increment']['value'],0.)
        b['snapshots'][1]['vrMPS']=(np.ones((6,4))*1e-20).tolist()
        result=p.metrics(a,b,1,2)['vrMPS']
        self.assertAlmostEqual(result['value'],1.,places=14)
        self.assertGreater(result['referenceRMS'],0.)
        self.assertLess(result['referenceRMS'],1e-19)

    def test_inactive_timestep_pair_cannot_manufacture_contraction(self):
        self.assertFalse(p.gate(0.,.001,.02)['passed'])
        self.assertFalse(p.gate(.01,.01,.02)['passed'])
        self.assertTrue(p.gate(.01,.005,.02)['passed'])
        self.assertTrue(p.gate(0.,0.,.02)['passed'])
        self.assertFalse(p.gate(None,.001,.02)['passed'])

    def test_supplement_never_overrides_original_failed_qualification(self):
        result=p.combine({'allRequiredNumericalPass':False},[{'passed':True}],[{'passed':True}])
        self.assertTrue(result['supplementalFixedPanelPass'])
        self.assertFalse(result['originalAllRequiredNumericalPass'])
        self.assertFalse(result['allRequiredNumericalPass'])
        self.assertFalse(result['experimentalQualification'])

    def test_corrupt_field_or_raw_seal_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'field.json.gz'; raw=json.dumps({'ok':True}).encode()
            packed=gzip.compress(raw); path.write_bytes(packed)
            receipt=dict(sha256=p.sha(packed),rawSHA256=p.sha(raw))
            self.assertEqual(p.read_sealed(path,receipt),{'ok':True})
            with self.assertRaisesRegex(ValueError,'Raw field seal'):
                p.read_sealed(path,{**receipt,'rawSHA256':'0'*64})
            with self.assertRaisesRegex(ValueError,'Field seal'):
                p.read_sealed(path,{**receipt,'sha256':'0'*64})

    def test_invalid_panels_or_nonfinite_field_rejected(self):
        for r in ([0.,0.,1.],[0.,np.nan,1.],[-1.,0.,1.]):
            with self.subTest(r=r),self.assertRaises(ValueError):
                p.panel_points(r,[0.,1.],2)
        with self.assertRaises(ValueError): p.integral([0.,1.],[0.,1.],lambda x:np.full(len(x),np.inf))


if __name__=='__main__':
    unittest.main()
