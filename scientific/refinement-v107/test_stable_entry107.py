"""Reporting and lifecycle regressions for the independent replay entry point."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import stable_audit107 as replay


class EntryControls(unittest.TestCase):
    def test_preexisting_short_job_keys_do_not_count_as_full_jobs(self):
        # Persisted preflight schema counted short records by geometry alone.
        old = dict(missingFullJobs=[[8, 1, .1]], fullDeclaredMatrixPass=False,
                   qualificationStatus='PENDING', failures=[])
        with tempfile.TemporaryDirectory() as temporary:
            out = Path(temporary)/'new'
            saved = replay.admission.audit99.metrics
            def component(*args):
                self.assertIs(replay.admission.audit99.metrics, replay.stable107.metrics)
                out.mkdir(); (out/'audit.json').write_text(json.dumps(old))
                return deepcopy(old)
            with patch.object(replay.admission, 'audit', side_effect=component):
                result = replay.audit(out, 'preflight', None, None, [])
            self.assertIs(replay.admission.audit99.metrics, saved)
            self.assertEqual(result['rawMissingFullJobKeys'], old['missingFullJobs'])
            self.assertEqual(result['missingFullJobs'], [list(job) for job in replay.admission.FULL_JOBS])
            self.assertEqual(json.loads((out/'audit.json').read_text()), old)
            self.assertFalse(result['fullDeclaredMatrixPass'])
            self.assertEqual(set(result['analysisSourceSHA256']), {'stable107.py', 'stable_audit107.py'})
            self.assertEqual(json.loads((out/'stable-audit.json').read_text()), result)

    def test_failed_admission_restores_metric_and_writes_no_final_result(self):
        with tempfile.TemporaryDirectory() as temporary:
            out = Path(temporary)/'new'
            saved = replay.admission.audit99.metrics
            with patch.object(replay.admission, 'audit', side_effect=ValueError('seal mismatch')):
                with self.assertRaisesRegex(ValueError, 'seal mismatch'):
                    replay.audit(out, 'preflight', None, None, [])
            self.assertIs(replay.admission.audit99.metrics, saved)
            self.assertFalse((out/'stable-audit.json').exists())

    def test_full_phase_keeps_missing_jobs_failure_and_qualification_decisions(self):
        old = dict(missingFullJobs=[[16, 4, .1]], fullDeclaredMatrixPass=False,
                   qualificationStatus='FAIL', failures=[dict(kind='refinement', value=.1, limit=.05)])
        with tempfile.TemporaryDirectory() as temporary:
            out = Path(temporary)/'new'
            def component(*args):
                out.mkdir(); (out/'audit.json').write_text(json.dumps(old))
                return deepcopy(old)
            with patch.object(replay.admission, 'audit', side_effect=component):
                result = replay.audit(out, 'full', None, None, [])
            for key, value in old.items():
                self.assertEqual(result[key], value)

    def test_prior_failures_remain_linked_and_different_saved_data_is_rejected(self):
        prior = dict(casePackets=[{'sha256': 'old-field'}], producerSourceSHA256={'flow': 'same'},
                     failures=[dict(kind='panelQuadrature', value=.02, limit=1e-10)])
        for mismatched in (False, True):
            with self.subTest(mismatched=mismatched), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary); out = root/'new'
                path = root/'prior.json'; path.write_text(json.dumps(prior))
                component_result = dict(prior, failures=[], missingFullJobs=[],
                                        fullDeclaredMatrixPass=False)
                if mismatched:
                    component_result['casePackets'] = [{'sha256': 'different'}]
                def component(*args):
                    out.mkdir(); (out/'audit.json').write_text(json.dumps(component_result))
                    return deepcopy(component_result)
                with patch.object(replay.admission, 'audit', side_effect=component):
                    if mismatched:
                        with self.assertRaisesRegex(ValueError, 'different saved fields'):
                            replay.audit(out, 'preflight', None, None, [], prior_audit=path)
                        self.assertFalse((out/'stable-audit.json').exists())
                    else:
                        result = replay.audit(out, 'preflight', None, None, [], prior_audit=path)
                        self.assertEqual(result['rawComparisonFailures'], prior['failures'])
                        self.assertEqual(result['failures'], [])
                        self.assertEqual(json.loads(path.read_text()), prior)


if __name__ == '__main__':
    unittest.main(verbosity=2)
