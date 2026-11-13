"""Tempfile-only regression controls for V86 report-input admission."""
import gzip
import json
from pathlib import Path
import tempfile
import unittest

from check_report87 import sha, validate_inputs


class ReportAdmissionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.results = Path(self.temp.name)/'results'
        self.results.mkdir()
        self.target = Path(self.temp.name)/'target.json'
        self.target.write_text('{"points": []}\n')
        self.put('predictions.json', {'cases': [], 'experimentalQualification': False})
        self.prediction = sha((self.results/'predictions.json').read_bytes())
        self.put('optical-index.json', {'predictionSHA256': self.prediction, 'groups': []})
        self.put('audit.json', {'predictionSHA256': self.prediction,
                                'allRequiredNumericalPass': False})
        self.put('panel-audit.json', {'predictionSHA256': self.prediction,
            'originalAuditSHA256': sha((self.results/'audit.json').read_bytes())})
        self.comparison = dict(predictionSHA256=self.prediction,
            opticalIndexSHA256=sha((self.results/'optical-index.json').read_bytes()),
            targetFileSHA256=sha(self.target.read_bytes()), cases=[],
            experimentalQualification=False, currentFitted=False, velocityFitted=False,
            scoredTimeSelected=False, steadyComparison=False,
            previouslyViewedDevelopmentData=True)
        self.seal_comparison()

    def put(self, name, value):
        raw = json.dumps(value, sort_keys=True).encode()
        (self.results/name).write_bytes(gzip.compress(raw, mtime=0)
                                       if name.endswith('.gz') else raw)

    def seal_comparison(self):
        self.put('comparison.json.gz', self.comparison)
        summary = {key: value for key, value in self.comparison.items() if key != 'cases'}
        summary['comparisonSHA256'] = sha((self.results/'comparison.json.gz').read_bytes())
        self.put('comparison-summary.json', summary)

    def admit(self):
        return validate_inputs(self.results, self.target)

    def test_admits_failed_science_without_modifying_inputs_or_qualifying(self):
        paths = [*self.results.iterdir(), self.target]
        before = {path: path.read_bytes() for path in paths}
        receipt = self.admit()
        self.assertTrue(receipt['evidenceAdmitted'])
        self.assertIs(receipt['globalQualification'], False)
        self.assertIs(receipt['experimentalQualification'], False)
        self.assertEqual(receipt['predictionSHA256'], self.prediction)
        self.assertEqual(before, {path: path.read_bytes() for path in paths})

    def test_stale_comparison_packet_rejected(self):
        self.put('comparison.json.gz', dict(self.comparison, cases=[{'changed': True}]))
        with self.assertRaisesRegex(ValueError, 'Stale comparison packet'):
            self.admit()

    def test_semantically_identical_but_changed_target_bytes_rejected(self):
        self.target.write_text('{"points": []}\n\n')
        with self.assertRaisesRegex(ValueError, 'Stale target binding'):
            self.admit()

    def test_stale_prediction_bindings_rejected(self):
        names = ('optical-index.json', 'comparison-summary.json',
                 'comparison.json.gz', 'audit.json', 'panel-audit.json')
        for name in names:
            with self.subTest(name=name):
                path = self.results/name
                saved = path.read_bytes()
                value = json.loads(gzip.decompress(saved) if name.endswith('.gz') else saved)
                self.put(name, dict(value, predictionSHA256='0'*64))
                with self.assertRaisesRegex(ValueError, 'Stale prediction binding'):
                    self.admit()
                path.write_bytes(saved)

    def test_changed_audit_with_same_prediction_rejected_by_panel(self):
        self.put('audit.json', {'predictionSHA256': self.prediction,
                                'allRequiredNumericalPass': True})
        with self.assertRaisesRegex(ValueError, 'Stale panel original-audit binding'):
            self.admit()

    def test_changed_optical_index_with_same_prediction_rejected(self):
        self.put('optical-index.json', {'predictionSHA256': self.prediction,
                                       'groups': [{'changed': True}]})
        with self.assertRaisesRegex(ValueError, 'Stale optical index binding'):
            self.admit()

    def test_legacy_summary_without_comparison_seal_rejected(self):
        summary = json.loads((self.results/'comparison-summary.json').read_bytes())
        del summary['comparisonSHA256']
        self.put('comparison-summary.json', summary)
        with self.assertRaisesRegex(ValueError, 'Stale comparison packet'):
            self.admit()

    def test_summary_metadata_must_match_bound_comparison(self):
        summary = json.loads((self.results/'comparison-summary.json').read_bytes())
        self.put('comparison-summary.json', dict(summary, velocityFitted=True))
        with self.assertRaisesRegex(ValueError, 'summary metadata differs'):
            self.admit()

    def test_resealed_fitted_comparison_still_cannot_change_scope(self):
        self.comparison['velocityFitted'] = True
        self.seal_comparison()
        with self.assertRaisesRegex(ValueError, 'scope changed: velocityFitted'):
            self.admit()

    def test_missing_input_rejected(self):
        (self.results/'audit.json').unlink()
        with self.assertRaises(FileNotFoundError):
            self.admit()


if __name__ == '__main__':
    unittest.main()
