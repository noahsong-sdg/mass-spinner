"""Replay comparison and non-overwrite controls; execute in safe-dev only."""
import gzip
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

import rerun


class ReplayComparisonTests(unittest.TestCase):
    def packet(self, root, value=1., completed=True):
        root.mkdir()
        raw = json.dumps(dict(snapshots=[dict(timeS=0., q=[[value]])],
                              history=[dict(timeS=1., energyRelativeDefect=0.)])).encode()
        packed = gzip.compress(raw, mtime=0)
        (root/'state.json.gz').write_bytes(packed)
        rerun.write(root/'predictions.json', dict(cases=[dict(label='case', completed=completed,
                     stepCount=1, fieldPacket=dict(path='state.json.gz',
                     sha256=hashlib.sha256(packed).hexdigest(), rawSHA256=hashlib.sha256(raw).hexdigest()))]))

    def test_exact_and_float_changes_are_reported_separately(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.packet(root/'old'); self.packet(root/'same'); self.packet(root/'changed', 1.25)
            rerun.compare_fields(root/'same', root/'old', root/'same.json')
            self.assertEqual(rerun.load(root/'same.json')['rawIdenticalCases'], 1)
            rerun.compare_fields(root/'changed', root/'old', root/'changed.json')
            report = rerun.load(root/'changed.json')
            self.assertEqual(report['rawIdenticalCases'], 0)
            field = next(x for x in report['cases'][0]['numericalDifferences'] if x['field'].endswith('.q'))
            self.assertEqual(field['maxAbsoluteDifference'], .25)
            self.assertEqual(field['maxDifferenceOverBaselinePeak'], .25)

    def test_mutated_archive_is_rejected_before_comparison(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); self.packet(root/'old'); self.packet(root/'new')
            (root/'new/state.json.gz').write_bytes(gzip.compress(b'{}'))
            with self.assertRaisesRegex(ValueError, 'authentication failed'):
                rerun.compare_fields(root/'new', root/'old', root/'report.json')
            self.assertFalse((root/'report.json').exists())

    def test_failed_trajectory_cannot_be_a_completed_replay(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); self.packet(root/'old'); self.packet(root/'new', completed=False)
            with self.assertRaisesRegex(ValueError, 'Incomplete physical trajectory'):
                rerun.compare_fields(root/'new', root/'old', root/'report.json')

    def test_existing_stage_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); destination = root/'existing'; destination.mkdir()
            marker = destination/'unique-evidence'; marker.write_bytes(b'keep')
            with self.assertRaises(FileExistsError):
                rerun.prepare(root/'absent-source', destination)
            self.assertEqual(marker.read_bytes(), b'keep')


if __name__ == '__main__':
    unittest.main()
