"""Diagnostic admission and artifact controls; root executes only in safe-dev."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

import directional_cross106 as cross


class DirectionalControls(unittest.TestCase):
    def setUp(self):
        self.fixed = dict(manifest={'currentA': 100}, scenarios=[{'shape': 'linear'}])
        self.seals = {'scientific/frozen.py': 'sealed-source'}
        self.packet = dict(manifest=self.fixed['manifest'], scenario=self.fixed['scenarios'][0],
            sourceSHA256=self.seals, radialBalanceMethod=cross.campaign106.METHOD,
            baselinePredictionSHA256=cross.old.BASELINE, timesS=[0., 1e-6, 2e-6, 4e-6],
            targetVelocityRead=False, currentFitted=False, velocityFitted=False,
            experimentalQualification=False, cases=[dict(refinement=n, cfl=cfl, completed=True)
                for n, cfl in cross.campaign106.JOBS])
        self.r, self.z = np.array([0., .004, .06]), np.array([0., .12, .24])
        q = np.ones((6, 2, 2)); q[1:4] = 0.; q[5] = .5
        self.state = dict(radialEdgesM=self.r.tolist(), axialEdgesM=self.z.tolist(), cfl=.1,
            snapshots=[dict(timeS=t, q=q.tolist()) for t in cross.TIMES],
            history=[dict(timeS=1e-6)])

    def test_fixed_protocol_is_admitted_and_changed_inputs_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary, \
                patch.object(cross.campaign106, 'sources', return_value=self.seals), \
                patch.object(cross.campaign106.baseline.baseline.reference.campaign100,
                             'baseline', return_value=self.fixed):
            path = Path(temporary)/'predictions.json'
            path.write_text(json.dumps(self.packet))
            self.assertEqual(cross.inputs(path), self.packet)
            mutations = [('manifest', {}), ('scenario', {}), ('sourceSHA256', {}),
                ('radialBalanceMethod', 'older-method'), ('baselinePredictionSHA256', 'older-seal'),
                ('timesS', [0., 1e-6]), ('currentFitted', True), ('velocityFitted', True),
                ('targetVelocityRead', True), ('experimentalQualification', True),
                ('cases', self.packet['cases'][:-1]),
                ('cases', [self.packet['cases'][0]]*5)]
            incomplete = deepcopy(self.packet['cases']); incomplete[0]['completed'] = False
            mutations.append(('cases', incomplete))
            for key, value in mutations:
                with self.subTest(key=key, value=value):
                    changed = deepcopy(self.packet); changed[key] = value
                    path.write_text(json.dumps(changed))
                    with self.assertRaises(ValueError):
                        cross.inputs(path)

    def test_undeclared_worker_pair_is_rejected_before_reading_inputs(self):
        with patch.object(cross, 'inputs') as inputs:
            for pair in ((2, 2), (4, 4), (1, 4), (4, 1), (3, 2)):
                with self.subTest(pair=pair), self.assertRaisesRegex(ValueError, 'Worker pair'):
                    cross.worker(Path('unused'), Path('unused'), *pair)
            inputs.assert_not_called()

    def test_retain_preserves_full_initial_fields_and_sealed_roundtrip(self):
        with tempfile.TemporaryDirectory() as temporary, \
                patch.object(cross, 'mesh', return_value=(self.r, self.z)):
            out = Path(temporary); (out/'fields').mkdir()
            row = cross.retain(out, 'r4-z2', self.state, 4, 2, reused=False)
            self.assertEqual((row['nr'], row['nz']), (2, 2))
            self.assertEqual((row['radialRefinement'], row['axialRefinement']), (4, 2))
            restored = cross.read_field(out, row)
            self.assertEqual(restored, self.state)
            self.assertEqual(restored['snapshots'][0]['q'], self.state['snapshots'][0]['q'])
            bad = deepcopy(row); bad['fieldPacket']['sha256'] = 'stale-packed-seal'
            with self.assertRaisesRegex(ValueError, 'seal mismatch'):
                cross.read_field(out, bad)
            bad = deepcopy(row); bad['fieldPacket']['rawSHA256'] = 'stale-raw-seal'
            with self.assertRaisesRegex(ValueError, 'seal mismatch'):
                cross.read_field(out, bad)
            bad = deepcopy(row); bad['fieldPacket']['path'] = '../escape.json.gz'
            with self.assertRaisesRegex(ValueError, 'contained fields'):
                cross.read_field(out, bad)

    def test_clock_and_geometry_drift_are_rejected_before_saving(self):
        changes = [('snapshots', [dict(timeS=0.), dict(timeS=2e-6)]),
                   ('history', [dict(timeS=2e-6)]), ('history', []),
                   ('cfl', .2), ('radialEdgesM', [0., .005, .06])]
        with tempfile.TemporaryDirectory() as temporary, \
                patch.object(cross, 'mesh', return_value=(self.r, self.z)):
            out = Path(temporary); (out/'fields').mkdir()
            for key, value in changes:
                with self.subTest(key=key, value=value):
                    state = deepcopy(self.state); state[key] = value
                    with self.assertRaises(ValueError):
                        cross.retain(out, 'never-written', state, 4, 2)
                    self.assertEqual(list((out/'fields').iterdir()), [])

    def test_worker_rejects_source_changes_during_evolution(self):
        with patch.object(cross, 'inputs', return_value=self.packet), \
                patch.object(cross, 'sources', side_effect=[{'a': 'before'}, {'a': 'after'}]), \
                patch.object(cross.old, 'TIMES', cross.old.TIMES), \
                patch.object(cross.old, 'mesh', cross.old.mesh), \
                patch.object(cross.old, 'evolve', return_value=self.state), \
                patch.object(cross, 'retain') as retain:
            with self.assertRaisesRegex(ValueError, 'source changed'):
                cross.worker(Path('unused'), Path('unused'), 4, 2)
            retain.assert_not_called()


if __name__ == '__main__':
    unittest.main()
