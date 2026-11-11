"""Finite-reference adapter regression controls; run only inside safe-dev."""
import copy
import gzip
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


DIRECTORY = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('adaptive_reference_compare', DIRECTORY / 'reference-compare.py')
REFERENCE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(REFERENCE)
ARCHIVE = DIRECTORY.parent / 'centrifuge-v44/boundary60/studies/refined/hotwall60-extra'
FULL = ARCHIVE / 'long-ref-fixed/n512-w128-t32768.json.gz'
EARLY = ARCHIVE / 'early/n512-w128-t16384.json.gz'


class ReferenceComparisonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.full = REFERENCE.load(FULL)
        cls.early = REFERENCE.load(EARLY)

    def analyze_candidate(self, candidate):
        with patch.object(REFERENCE, 'load', side_effect=[self.full, self.early, candidate]):
            return REFERENCE.analyze(FULL, EARLY, ['candidate'])

    def test_archive_overlap_and_plain_gzip_identity(self):
        # This passes the actual archived reference through canonical validation
        # and the real independent common-volume comparison, with no mocks.
        with gzip.open(FULL, 'rt') as stream:
            packet = json.load(stream)
        with tempfile.TemporaryDirectory() as directory:
            plain = Path(directory) / 'full.json'
            plain.write_text(json.dumps(packet))
            result = REFERENCE.analyze(FULL, EARLY, [plain])
        self.assertTrue(result['referenceEarlyOverlap']['allAccuracyGatesPassed'])
        self.assertTrue(result['allCandidateAccuracyGatesPassed'])
        self.assertEqual(result['accuracyThresholds']['localHeatingRelative'], .05)
        self.assertTrue(result['productionPlaybackMayInterpolateCanonicalStates'])

    def test_only_explicit_numerical_fields_are_ignored(self):
        candidate = copy.deepcopy(self.full)
        candidate['operation']['thermal']['gas']['accuracy'] = {'relativeTolerance': .001}
        candidate['timeControl'] = {'method': 'BE step doubling', 'acceptedPairs': 123}
        result = self.analyze_candidate(candidate)
        self.assertEqual(result['comparisons'][0]['timeControl']['acceptedPairs'], 123)
        candidate['operation']['thermal']['coolingWK'] += .01
        with self.assertRaisesRegex(ValueError, 'physical operating inputs'):
            self.analyze_candidate(candidate)
        candidate = copy.deepcopy(self.full)
        candidate['operation']['accuracy'] = {'relativeTolerance': .001}
        with self.assertRaisesRegex(ValueError, 'physical operating inputs'):
            self.analyze_candidate(candidate)

    def test_intervention_cannot_use_startup_reference(self):
        candidate = copy.deepcopy(self.full)
        candidate['operation']['events'] = [{'timeS': .001, 'currentA': 0}]
        with self.assertRaisesRegex(ValueError, 'startup archives cannot qualify an intervention'):
            self.analyze_candidate(candidate)

    def test_no_observations_are_silently_discarded_or_interpolated(self):
        candidate = copy.deepcopy(self.full)
        candidate['times'][1] *= 1.00001
        with self.assertRaisesRegex(ValueError, 'every exact reference observation time'):
            self.analyze_candidate(candidate)

    def test_early_candidate_uses_complete_early_window(self):
        result = self.analyze_candidate(copy.deepcopy(self.early))
        self.assertTrue(result['allCandidateAccuracyGatesPassed'])
        self.assertLess(result['comparisons'][0]['metrics']['gasAbsoluteK']['value'], 1e-10)


if __name__ == '__main__':
    unittest.main()
