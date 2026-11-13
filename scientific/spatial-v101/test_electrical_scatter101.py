"""Independent geometry-loop comparison for optimized local Joule scatter."""
from pathlib import Path
import sys
import unittest
import numpy as np

for name in ('mixture-axial-v75', 'meridional-v86'):
    sys.path.insert(0, str(Path(__file__).parents[1]/name))
from flow import Flow
from electro86 import Electro


def geometry_heat(model, out, receipt):
    """Original ordered half-segment loop, rebuilt without cached geometry."""
    f = model.flow
    u = f.primitive(out)['vrMPS'].ravel()
    rc, zc = f.mean_r, (f.z[:-1]+f.z[1:])/2
    heat = model.B**2*(model.p+model.h**2/model.p)*f.volume.ravel()*u*u
    currents = iter(receipt['faceCurrentA'])
    for j in range(f.nz):
        for i in range(f.nr):
            cell = j*f.nr+i
            if i+1 < f.nr:
                amp = next(currents)
                for a, lo, hi in ((cell, rc[i], f.r[i+1]), (cell+1, f.r[i+1], rc[i+1])):
                    resistance = np.log(hi/lo)/(2*np.pi*(f.z[j+1]-f.z[j])*model.p[a])
                    hall = model.B*model.h[a]/model.p[a]*(hi-lo)
                    heat[a] += amp*amp*resistance-2*amp*hall*u[a]
            if j+1 < f.nz:
                amp = next(currents)
                area = np.pi*(f.r[i+1]**2-f.r[i]**2)
                for a, length in ((cell, f.z[j+1]-zc[j]), (cell+f.nr, zc[j+1]-f.z[j+1])):
                    heat[a] += amp*amp*length/(area*model.parallel[a])
    for port in receipt['ports']:
        a, amp, resistance, hall = (port[key] for key in ('cell', 'amp', 'halfR', 'm'))
        heat[a] += amp*amp*resistance-2*amp*hall*u[a]
    return heat


class ElectricalScatterTests(unittest.TestCase):
    def test_signed_hall_current_and_flow_with_changing_capacity(self):
        mass = 39.948*1.66053906660e-27
        f = Flow([0., .002, .006, .02, .06], [0., .04, .06, .075, .09, .14], [mass, mass])
        for B, hall, current in ((.13, .18, .2), (-.13, -.18, .2),
                                 (.13, -.18, -.2), (0., .18, .2)):
            with self.subTest(B=B, hall=hall, current=current):
                model = Electro(f, .06, hall, 2., B, current)
                q = f.state(.001, 3000., .5, 300., vr=2., vz=1.)
                for density, direction, dt in ((.6, -1., 3e-5), (1.8, 1., 7e-6), (1.1, -1., 4e-5)):
                    p = f.primitive(q)
                    q = f.state(p['densityKgM3']*density, p['temperatureK'], .5,
                                p['omegaRadS'], direction*p['vrMPS'], p['vzMPS'])
                    out, receipt = model.advance(q, dt)
                    expected = dt*geometry_heat(model, out, receipt)
                    np.testing.assert_allclose(receipt['jouleByCellJ'], expected, rtol=5e-12, atol=1e-23)
                    np.testing.assert_array_equal(out[[0, 2, 5]], q[[0, 2, 5]])
                    self.assertLess(abs(receipt['energyResidualJ']), 1e-12)
                    self.assertLess(receipt['chargeResidualA'], 1e-10)
                    q = out


if __name__ == '__main__':
    unittest.main()
