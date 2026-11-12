"""Independent finite-volume Hall, current and BE-energy controls."""
from pathlib import Path
import sys
import unittest
import numpy as np

sys.path.insert(0, str(Path(__file__).parents[1]/'mixture-axial-v75'))
from flow import Flow
from electro86 import Electro

MASS = 39.948*1.66053906660e-27


class ElectroTests(unittest.TestCase):
    def setUp(self):
        self.f = Flow([0., .002, .006, .02, .06],
                      [0., .04, .06, .075, .09, .14], [MASS, MASS])
        self.q = self.f.state(.001, 3000., .5, 300., vr=2., vz=1.)
        self.dt = 3e-5

    def model(self, B=.13, hall=.18, current=.2):
        return Electro(self.f, .06, hall, 2., B, current)

    def reconstruct(self, model, q, out, receipt):
        """Rebuild segment currents/forces from geometry, not producer matrices."""
        f, dt = self.f, self.dt
        phi = np.asarray(receipt['potentialV']).reshape(f.nz, f.nr)
        p = f.primitive(out); u = p['vrMPS']; w = p['omegaRadS']
        rc, zc = f.mean_r, (f.z[:-1]+f.z[1:])/2
        sigma, h, parallel = [x.reshape(f.nz, f.nr) for x in (model.p, model.h, model.parallel)]
        B = model.B
        charge, torque = np.zeros_like(u), np.zeros_like(u)
        K = B*B*(sigma+h*h/sigma)*f.volume
        force, heat = -K*u, K*u*u
        currents = []

        def segment(j, i, a, b):
            R = np.log(b/a)/(2*np.pi*(f.z[j+1]-f.z[j])*sigma[j, i])
            return (j, i, R, -B*(b*b-a*a)/2, B*h[j, i]/sigma[j, i]*(b-a))

        def account(amp, parts):
            for j, i, R, t, m in parts:
                torque[j, i] += amp*t
                force[j, i] += amp*m
                heat[j, i] += amp*amp*R-2*amp*m*u[j, i]

        for j in range(f.nz):
            for i in range(f.nr):
                if i+1 < f.nr:
                    parts = [segment(j, i, rc[i], f.r[i+1]),
                             segment(j, i+1, f.r[i+1], rc[i+1])]
                    R = sum(row[2] for row in parts)
                    emf = sum(t*w[a, b]-m*u[a, b] for a, b, _, t, m in parts)
                    amp = (phi[j, i]-phi[j, i+1]-emf)/R
                    charge[j, i] += amp; charge[j, i+1] -= amp
                    currents.append(amp); account(amp, parts)
                if j+1 < f.nz:
                    area = np.pi*(f.r[i+1]**2-f.r[i]**2)
                    parts = [(j, i, (f.z[j+1]-zc[j])/(area*parallel[j, i]), 0., 0.),
                             (j+1, i, (zc[j+1]-f.z[j+1])/(area*parallel[j+1, i]), 0., 0.)]
                    amp = (phi[j, i]-phi[j+1, i])/sum(row[2] for row in parts)
                    charge[j, i] += amp; charge[j+1, i] -= amp
                    currents.append(amp); account(amp, parts)
        source_work = 0.
        for port in receipt['ports']:
            j, i = divmod(port['cell'], f.nr)
            I, R, t, m = [port[k] for k in ('amp', 'halfR', 't', 'm')]
            charge[j, i] += I; account(I, [(j, i, R, t, m)])
            voltage = phi[j, i]-I*R-t*w[j, i]+m*u[j, i]
            self.assertAlmostEqual(port['potentialV'], voltage, delta=1e-11*max(1., abs(voltage)))
            source_work -= dt*I*voltage
        np.testing.assert_allclose(receipt['faceCurrentA'], currents, rtol=2e-11, atol=1e-13)
        self.assertLess(np.max(abs(charge)), 2e-11*max(1., abs(model.current)))
        np.testing.assert_allclose(out[1]-q[1], dt*force, rtol=2e-9, atol=2e-18)
        np.testing.assert_allclose(out[3]-q[3], dt*torque, rtol=2e-9, atol=2e-19)
        np.testing.assert_allclose(receipt['jouleByCellJ'], (dt*heat).ravel(), rtol=2e-10, atol=2e-17)
        self.assertGreaterEqual(np.min(heat), -1e-12*max(1., np.max(abs(heat))))
        self.assertAlmostEqual(receipt['externalWorkJ'], source_work, delta=2e-12*max(1., abs(source_work)))

    def test_independent_charge_force_heat_and_boundary_power(self):
        m = self.model(); out, r = m.advance(self.q, self.dt)
        self.reconstruct(m, self.q, out, r)
        self.assertIs(r['prescribedCurrent'], True)
        self.assertIs(r['absoluteCurrentPrediction'], False)
        self.assertAlmostEqual(sum(p['amp'] for p in r['ports'] if p['kind']=='cathode'), .2)
        self.assertAlmostEqual(sum(p['amp'] for p in r['ports'] if p['kind']=='anode'), -.2)
        np.testing.assert_array_equal(out[[0, 2, 5]], self.q[[0, 2, 5]])

    def test_endpoint_work_internal_heat_and_be_defect_are_distinct(self):
        out, r = self.model().advance(self.q, self.dt)
        old, new = self.f.primitive(self.q), self.f.primitive(out)
        defect = .5*(self.q[0]*(new['vrMPS']-old['vrMPS'])**2
                     + self.q[0]*self.f.mean_r2*(new['omegaRadS']-old['omegaRadS'])**2)
        Q, W, D = [np.asarray(r[k]).reshape(self.f.nz, self.f.nr) for k in
                   ('jouleByCellJ', 'mechanicalWorkByCellJ', 'BEdefectByCellJ')]
        np.testing.assert_allclose(D, defect, rtol=2e-13, atol=1e-24)
        np.testing.assert_allclose(new['kineticJ']-old['kineticJ'], W-D, rtol=2e-9, atol=2e-17)
        np.testing.assert_allclose(new['thermalJ']-old['thermalJ'], Q+D, rtol=2e-9, atol=2e-16)
        np.testing.assert_allclose(out[4]-self.q[4], Q+W, rtol=2e-9, atol=2e-16)
        self.assertAlmostEqual(r['externalWorkJ'], float(np.sum(Q+W)), delta=2e-12)
        self.assertGreater(np.sum(D), 0.)

    def test_exact_be_radial_relaxation_includes_hall_damping(self):
        for hall in (0., .18, -.18):
            with self.subTest(hall=hall):
                q = self.f.state(.001, 3000., .5, 0., vr=2.)
                m = self.model(hall=hall, current=0.)
                out, r = m.advance(q, self.dt)
                coefficient = .13**2*(.06+hall**2/.06)/.001
                expected = 2./(1+self.dt*coefficient)
                np.testing.assert_allclose(self.f.primitive(out)['vrMPS'], expected, rtol=2e-11)
                np.testing.assert_allclose(out[3], 0., atol=1e-20)
                np.testing.assert_allclose(out[4], q[4], rtol=2e-14, atol=1e-18)
                self.assertGreater(sum(r['jouleByCellJ']), 0.)
                self.reconstruct(m, q, out, r)

    def test_current_reversal_reverses_momenta_not_heating(self):
        q = self.q.copy(); q[[1, 3]] = 0.
        a, ra = self.model().advance(q, self.dt)
        b, rb = self.model(current=-.2).advance(q, self.dt)
        np.testing.assert_allclose(a[[1, 3]], -b[[1, 3]], rtol=2e-11, atol=1e-20)
        np.testing.assert_allclose(a[[0, 2, 4, 5]], b[[0, 2, 4, 5]], rtol=2e-13)
        np.testing.assert_allclose(ra['potentialV'], -np.asarray(rb['potentialV']), rtol=2e-11, atol=1e-12)

    def test_field_reversal_requires_signed_hall_reversal(self):
        reverse = self.q.copy(); reverse[3] *= -1
        a, ra = self.model().advance(self.q, self.dt)
        b, rb = self.model(B=-.13, hall=-.18).advance(reverse, self.dt)
        np.testing.assert_allclose(a[3], -b[3], rtol=2e-11, atol=1e-20)
        np.testing.assert_allclose(a[[0, 1, 2, 4, 5]], b[[0, 1, 2, 4, 5]], rtol=2e-12, atol=1e-20)
        np.testing.assert_allclose(ra['faceCurrentA'], rb['faceCurrentA'], rtol=2e-11, atol=1e-12)

    def test_no_field_has_only_electrical_heating(self):
        m = self.model(B=0.); out, r = m.advance(self.q, self.dt)
        np.testing.assert_allclose(out[[0, 1, 2, 3, 5]], self.q[[0, 1, 2, 3, 5]], rtol=2e-14, atol=1e-20)
        self.assertGreater(r['externalWorkJ'], 0.)
        np.testing.assert_allclose(r['mechanicalWorkByCellJ'], 0., atol=1e-22)
        self.reconstruct(m, self.q, out, r)

    def test_exact_contact_overlap_is_not_nearest_cell_selection(self):
        m = self.model()
        cath = [p for p in m.ports if p['kind']=='cathode']
        self.assertEqual(len(cath), 2)
        np.testing.assert_allclose([p['amp'] for p in cath], [.05, .15], rtol=2e-15)
        anode = [p for p in m.ports if p['kind']=='anode']
        np.testing.assert_allclose([p['amp'] for p in anode], [-.15, -.05], rtol=2e-14)

    def test_discrete_torque_matches_boundary_current_second_moment(self):
        q = self.q.copy(); q[[1, 3]] = 0.
        m = self.model(); out, r = m.advance(q, self.dt)
        cath = [p for p in r['ports'] if p['kind']=='cathode']
        # Collocated current source uses center radii; the continuum disk value
        # is a separate spatial-refinement target, not exact on this coarse mesh.
        source_moment = sum(p['amp']*self.f.mean_r[p['cell'] % self.f.nr]**2 for p in cath)
        expected = .5*m.B*(m.current*self.f.r[-1]**2-source_moment)
        self.assertAlmostEqual(float(np.sum(out[3]-q[3]))/self.dt, expected, delta=2e-12)

    def test_invalid_conductivity_geometry_and_timestep_rejected(self):
        for dt in (0., -1., float('nan'), float('inf'), True):
            with self.subTest(dt=dt), self.assertRaises(ValueError):
                self.model().advance(self.q, dt)
        for args in ((0., .18, 2., .13, .2), (.06, .18, 0., .13, .2),
                     (.06, float('nan'), 2., .13, .2)):
            with self.subTest(args=args), self.assertRaises(ValueError):
                Electro(self.f, *args)
        with self.assertRaises(ValueError):
            Electro(self.f, .06, .18, 2., .13, .2, anodeCenter=.13, anodeWidth=.04)


if __name__ == '__main__':
    unittest.main()
