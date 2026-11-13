import gzip
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import optics99 as o


class OpticalWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        (self.directory/'fields').mkdir()
        self.field = dict(radialEdgesM=[0., .06], snapshots=[dict(timeS=t,
            omegaRadS=[[100.+i]], vrMPS=[[10.+i]]) for i, t in enumerate(o.TIMES)])
        self.case = dict(refinement=4, cfl=.1, completed=True)
        self.write_field()

    def write_field(self):
        raw = json.dumps(self.field).encode(); packed = gzip.compress(raw, mtime=0)
        (self.directory/'fields/state.gz').write_bytes(packed)
        self.case['fieldPacket'] = dict(path='fields/state.gz', sha256=o.sha(packed), rawSHA256=o.sha(raw))
        (self.directory/'predictions.json').write_text(json.dumps(dict(cases=[self.case])))

    def test_prediction_keeps_every_clock_without_reading_measured_speeds(self):
        original = Path.read_bytes
        def admitted(path):
            if path.name == 'score.json': raise AssertionError('Measured speed read by prediction')
            return original(path)
        with patch.object(Path, 'read_bytes', admitted), patch.object(o.optical, 'predict', return_value={}) as predict:
            o.predict(self.directory)
        self.assertEqual(predict.call_count, 4)
        self.assertEqual([c.args[1] for c in predict.call_args_list], [[100.+i] for i in range(4)])
        index = json.loads((self.directory/'optical-index.json').read_text())
        self.assertEqual([g['timeS'] for g in index['groups']], list(o.TIMES))
        self.assertFalse(index['targetVelocityRead'])
        self.assertFalse(index['experimentalQualification'])
        self.assertIn('near-midplane', index['diagnosticScope'])

    def test_stale_packet_missing_clocks_and_path_escape_reject(self):
        self.case['fieldPacket']['sha256'] = '0'*64
        with self.assertRaisesRegex(ValueError, 'Stale'): o.load_field(self.directory, self.case)
        self.field['snapshots'].pop(); self.write_field()
        with self.assertRaisesRegex(ValueError, 'clock inventory'): o.load_field(self.directory, self.case)
        self.case['fieldPacket']['path'] = '../outside.gz'
        with self.assertRaisesRegex(ValueError, 'outside'): o.load_field(self.directory, self.case)

    def test_scoring_rejects_changed_target_before_comparison(self):
        index = dict(sourceSHA256=o.inputs(), targetVelocityRead=False, experimentalQualification=False,
            predictionSHA256=o.sha((self.directory/'predictions.json').read_bytes()),
            groups=[dict(timeS=t) for t in o.TIMES])
        (self.directory/'optical-index.json').write_text(json.dumps(index))
        original = Path.read_bytes
        def changed(path):
            return b'changed measurement' if path.name == 'score.json' else original(path)
        with patch.object(Path, 'read_bytes', changed), self.assertRaisesRegex(ValueError, 'measured target changed'):
            o.score(self.directory)


if __name__ == '__main__': unittest.main()
