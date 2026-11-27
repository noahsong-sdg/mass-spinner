"""Admission regressions on the actual sealed producer and scorer boundary."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('benchmark_replay', HERE / 'replay.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


class ReplayAdmissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.prediction = json.loads((r.ROOT / r.PRED).read_text())
        cls.index = json.loads((r.ROOT / r.INDEX).read_text())

    def test_actual_sealed_packets_and_all_sources_admit(self):
        blobs, prediction, index, groups, sources = r.load_inputs()
        self.assertEqual(len(groups), 20)
        self.assertEqual(len(prediction['cases']), 100)
        self.assertEqual(r.sha(blobs[r.PRED]), self.index['predictionSHA256'])
        self.assertIn('scientific/flow-v81/argon-viscosity-source.json', sources)

    def test_stale_bytes_rejected_before_scoring(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'receipt').write_bytes(b'old')
            with self.assertRaisesRegex(ValueError, 'Sealed bytes changed'):
                r.checked_bytes(root, 'receipt', r.sha(b'new'))

    def test_missing_and_duplicate_optical_groups_rejected(self):
        for alteration in ('missing', 'duplicate', 'wrong-path'):
            with self.subTest(alteration=alteration):
                index = copy.deepcopy(self.index)
                if alteration == 'missing':
                    index['groups'].pop()
                elif alteration == 'duplicate':
                    index['groups'][-1] = index['groups'][0]
                else:
                    index['groups'][0]['path'] = '../unrelated.json.gz'
                with self.assertRaises(ValueError):
                    r.validate_packets(self.prediction, index)

    def test_conditioning_and_qualification_flags_rejected(self):
        for key in ('experimentalQualification', 'targetVelocityRead', 'currentConditioning'):
            with self.subTest(key=key):
                prediction = copy.deepcopy(self.prediction)
                prediction[key] = True
                with self.assertRaisesRegex(ValueError, 'conditioning/qualification'):
                    r.validate_packets(prediction, self.index)

    def test_missing_duplicate_or_fixed_current_primary_cases_rejected(self):
        for alteration in ('missing', 'duplicate', 'fixed-current'):
            with self.subTest(alteration=alteration):
                prediction = copy.deepcopy(self.prediction)
                if alteration == 'missing':
                    prediction['cases'].pop()
                elif alteration == 'duplicate':
                    prediction['cases'][-1] = prediction['cases'][0]
                else:
                    prediction['cases'][0]['drive'] = 'fixed-current'
                with self.assertRaises(ValueError):
                    r.validate_packets(prediction, self.index)

    def test_apparatus_mismatch_rejected(self):
        prediction = copy.deepcopy(self.prediction)
        prediction['manifest']['branchCurrentA'] = 50
        with self.assertRaisesRegex(ValueError, 'Apparatus'):
            r.validate_packets(prediction, self.index)

    def test_complete_actual_replay_and_exported_claim_boundaries(self):
        before = (r.ROOT / r.PRED).read_bytes()
        result = r.replay()
        self.assertEqual(len(result['cases']), 4320)
        self.assertEqual(len(result['electricalCases']), 60)
        self.assertEqual(result['opticalAllPointMatches'], 0)
        self.assertEqual(result['opticalEligiblePointMatches'], 0)
        self.assertIsNone(result['electricalAcceptanceThreshold'])
        self.assertFalse(result['fieldProducerReexecuted'])
        self.assertFalse(result['parametersRefitted'])
        self.assertEqual((r.ROOT / r.PRED).read_bytes(), before)
        for key, value in [('temperaturePredictionAvailable', True),
                           ('temperatureStatus', 'predicted'),
                           ('jointQualification', True),
                           ('experimentalQualification', True),
                           ('fieldProducerReexecuted', True),
                           ('parametersRefitted', True),
                           ('observationsPreviouslyExamined', False)]:
            with self.subTest(key=key):
                changed = dict(result, **{key: value})
                with self.assertRaisesRegex(ValueError, 'Unsupported joint/temperature'):
                    r.validate_result(changed)
        for alteration in ('missing', 'duplicate', 'fixed-current'):
            with self.subTest(alteration=alteration):
                rows = list(result['cases'])
                if alteration == 'missing':
                    rows.pop()
                elif alteration == 'duplicate':
                    rows[-1] = rows[0]
                else:
                    rows[0] = dict(rows[0], drive='fixed-current')
                with self.assertRaises(ValueError):
                    r.validate_rows(rows)

    def test_existing_output_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'retained'
            output.mkdir()
            sentinel = output / 'keep'
            sentinel.write_text('original evidence')
            with patch.object(sys, 'argv', ['replay.py', str(output)]):
                with self.assertRaisesRegex(ValueError, 'must be new'):
                    r.main()
            self.assertEqual(sentinel.read_text(), 'original evidence')


if __name__ == '__main__':
    unittest.main()
