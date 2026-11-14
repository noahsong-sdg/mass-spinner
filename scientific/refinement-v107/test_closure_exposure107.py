"""Independent analytic mask budgets and sealed-input rejection controls."""
import gzip
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
import closure_exposure107 as diagnostic


def fixture():
    m = diagnostic.M_AR*np.array([[1., 2.], [3., 4.]])
    inertia = m*np.array([.5, 2.5]); target = np.array([[42., 84.], [10000., 20000.]])
    angular = np.sqrt(2*inertia*np.array([[1e-21, 0.], [0., 4e-21]]))
    thermal = 1.5*diagnostic.KB*(m/2/diagnostic.M_AR+m/2/diagnostic.M_AR)*target
    q = np.array([m, m*0, m*0, angular, thermal+.5*angular*angular/inertia, m/2])
    recovered = q[4]-.5*angular*angular/inertia
    temperature = recovered/(1.5*diagnostic.KB*(q[5]/diagnostic.M_AR+(m-q[5])/diagnostic.M_AR))
    return dict(radialEdgesM=[0., 1., 2.], axialEdgesM=[0., 1., 2.],
        snapshots=[dict(timeS=t, q=q.tolist(), thermalJ=recovered.tolist(),
                        temperatureK=temperature.tolist()) for t in diagnostic.TIMES])


class ExposureTests(unittest.TestCase):
    def test_known_weights_and_inclusive_reference_boundaries(self):
        state = fixture(); row = diagnostic.budgets(state)[0]
        self.assertEqual(state['snapshots'][0]['temperatureK'][0][1], 84.)
        self.assertEqual(state['snapshots'][0]['temperatureK'][1][0], 10000.)
        self.assertEqual(row['maximumCell']['radialIndex'], 1)
        expected = [[1/8, 1/10, 42/110210, .5/17, np.sqrt(.5)/(np.sqrt(.5)+np.sqrt(40)), 1/5],
                    [3/8, 4/10, 80000/110210, 10/17, np.sqrt(40)/(np.sqrt(.5)+np.sqrt(40)), 4/5]]
        for actual, values in zip(row['fractions'].values(), expected):
            for a, b in zip(actual.values(), values):
                self.assertAlmostEqual(a, b)
        self.assertAlmostEqual(row['denominators']['volumeM3'], 8*np.pi)
        for snapshot in state['snapshots']:
            snapshot['q'][3] = [[0., 0.], [0., 0.]]
            snapshot['q'][4] = snapshot['thermalJ']
        zero = diagnostic.budgets(state)[0]
        self.assertEqual(zero['denominators']['swirlKineticJ'], 0.)
        self.assertIsNone(zero['fractions']['above10000K']['swirlKineticJ'])

    def test_domain_and_stale_primitive_rejected(self):
        for change in ('geometry', 'mass', 'thermal', 'primitive', 'clock'):
            state = fixture()
            if change == 'geometry': state['radialEdgesM'][1] = 0.
            if change == 'mass': state['snapshots'][0]['q'][0][0][0] = -1.
            if change == 'thermal': state['snapshots'][0]['q'][4][0][0] = 0.
            if change == 'primitive': state['snapshots'][0]['temperatureK'][0][0] += 1.
            if change == 'clock': state['snapshots'].pop()
            with self.subTest(change=change), self.assertRaises(ValueError): diagnostic.budgets(state)

    def test_translational_energy_and_negative_angular_momentum(self):
        state = fixture(); q = np.array(state['snapshots'][0]['q'])
        m = q[0]; q[1], q[2], q[3] = 3*m, 4*m, -q[3]
        inertia = m*np.array([.5, 2.5]); swirl = .5*q[3]*q[3]/inertia
        target = np.array([[42., 200.], [3000., 20000.]])
        expected_thermal = 1.5*diagnostic.KB*np.array([[1., 2.], [3., 4.]])*target
        # Independently: (3²+4²)m/2 = 12.5m; both signs of L have equal energy.
        q[4] = expected_thermal+12.5*m+swirl
        recovered = q[4]-(.5*(q[1]*q[1]+q[2]*q[2])/m+swirl)
        number = q[5]/diagnostic.M_AR+(m-q[5])/diagnostic.M_AR
        for snapshot in state['snapshots']:
            snapshot.update(q=q.tolist(), thermalJ=recovered.tolist(),
                            temperatureK=(recovered/(1.5*diagnostic.KB*number)).tolist())
        row = diagnostic.budgets(state)[0]
        self.assertAlmostEqual(row['denominators']['thermalJ']/(1.5*diagnostic.KB*89442), 1., places=12)
        self.assertAlmostEqual(row['denominators']['swirlKineticJ']/5e-21, 1., places=12)
        expected_absolute = np.sqrt(diagnostic.M_AR*1e-21)+np.sqrt(80*diagnostic.M_AR*1e-21)
        self.assertAlmostEqual(row['denominators']['absoluteAngularKgM2S']/expected_absolute, 1., places=12)
        self.assertAlmostEqual(row['fractions']['above10000K']['thermalJ'], 80000/89442)
        self.assertAlmostEqual(row['fractions']['below84K']['absoluteAngularKgM2S'],
                               np.sqrt(.5)/(np.sqrt(.5)+np.sqrt(40)))

    def test_sealed_case_and_corruption(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); (root/'fields').mkdir(); (root/'source.py').write_text('sealed\n')
            sha = lambda b: hashlib.sha256(b).hexdigest()
            raw = json.dumps(fixture()).encode(); packed = gzip.compress(raw)
            field = root/'fields/state.gz'; field.write_bytes(packed)
            packet = dict(phase='full', timesS=diagnostic.TIMES, sourceSHA256={'source.py':sha(b'sealed\n')},
                cases=[dict(completed=True, fieldPacket=dict(path='fields/state.gz', sha256=sha(packed), rawSHA256=sha(raw)))])
            prediction = root/'prediction.json'; prediction.write_text(json.dumps(packet)); seal = sha(prediction.read_bytes())
            self.assertEqual(len(diagnostic.inspect(prediction, seal, root)['snapshots']), 4)
            for path in (prediction, field, root/'source.py'):
                original = path.read_bytes(); path.write_bytes(original+b'corrupt')
                with self.assertRaises(ValueError): diagnostic.inspect(prediction, seal, root)
                path.write_bytes(original)
            packet['cases'][0]['fieldPacket']['rawSHA256'] = '0'*64
            prediction.write_text(json.dumps(packet))
            with self.assertRaises(ValueError): diagnostic.inspect(prediction, sha(prediction.read_bytes()), root)


if __name__ == '__main__': unittest.main()
