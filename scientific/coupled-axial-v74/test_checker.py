"""Independent-audit regression cases; execute only inside safe-dev."""
from copy import deepcopy
import json
from pathlib import Path
import unittest
from independent_check import audit_report, check_case


def accepted_case():
    report = json.loads(Path(__file__).with_name('attempt-01.json').read_text())
    return deepcopy(report['cases'][0]['cases'][0])


class CheckerTests(unittest.TestCase):
    def test_actual_retained_case_and_six_corruptions(self):
        result = audit_report({'cases': [accepted_case()], 'failures': []})
        self.assertTrue(result['passed'])
        self.assertEqual(len(result['negativeControls']), 6)
        self.assertTrue(all(c['rejected'] for c in result['negativeControls']))

    def test_interface_metadata_matches_reconstructed_flux(self):
        case = accepted_case()
        check_case(case)
        case['interfaceIntoGasW'] += 1.
        with self.assertRaisesRegex(AssertionError, 'gas interface heat'):
            check_case(case)

    def test_per_step_case_may_omit_scheduled_interface_metadata(self):
        case = accepted_case()
        case.pop('interfaceIntoGasW')
        check_case(case)

    def test_successful_retained_case_does_not_hide_producer_failure(self):
        failure = {'n': 24, 'nz': 24, 'nt': 4, 'error': 'retained original failure'}
        result = audit_report({'cases': [accepted_case()], 'failures': [failure]})
        self.assertFalse(result['passed'])
        self.assertEqual(result['inputFailures'], [failure])
        self.assertEqual(len(result['cases']), 1)
        self.assertEqual(result['failures'], [])


if __name__ == '__main__':
    unittest.main()
