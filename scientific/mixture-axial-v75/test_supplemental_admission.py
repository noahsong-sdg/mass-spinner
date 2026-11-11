"""Synthetic structural receipts do not claim numerical convergence."""
from copy import deepcopy
from pathlib import Path
import unittest
import test_verify as fixtures
from supplemental_admission import supplemental
from verify import HERE, source_hashes


class SupplementalAdmission(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.Admission()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        graph = Path('scientific/coupled-axial-v74/independent_check.py')
        (self.fixture.root/graph).write_bytes((HERE.parents[1]/graph).read_bytes())
        self.fixture.raw['sourceHashes'] = source_hashes(self.fixture.source, self.fixture.root)

    def check(self):
        self.fixture.save()
        return supplemental(self.fixture.paths[0], self.fixture.root)

    def test_two_distinct_snapshots_admitted_without_numerical_claim(self):
        result = self.check()
        self.assertTrue(result['producerBindingPassed'])
        self.assertTrue(result['endpointAdmissionPassed'])
        self.assertFalse(result['numericalQualificationAssessed'])
        self.assertFalse(result['numericallyQualified'])
        self.assertNotEqual(result['producerSourceHashes'], result['lateCheckerSourceHashes'])
        self.assertEqual(len(result['maxObservableRelativeErrors']), 14)

    def test_edited_frozen_source_cannot_be_admitted_as_original(self):
        (self.fixture.source/'flow.py').write_text('edited kernel\n')
        with self.assertRaisesRegex(AssertionError, 'producer binding'):
            self.check()

    def test_rebound_raw_cannot_hide_wrong_initial_state_or_observation(self):
        saved = deepcopy(self.fixture.raw)
        self.fixture.raw['cases'][0]['initialQ'][5][0][0] *= 1.001
        with self.assertRaisesRegex(AssertionError, 'canonical study'):
            self.check()
        self.fixture.raw = saved
        for t in self.fixture.raw['cases']:
            for endpoint in t['cases']:
                endpoint['observables']['gasPeakK'] *= 1.01
        with self.assertRaisesRegex(AssertionError, 'observable mismatch gasPeakK'):
            self.check()

    def test_partial_or_failed_producer_cannot_get_green_admission(self):
        saved = deepcopy(self.fixture.raw)
        self.fixture.raw['cases'].pop()
        with self.assertRaisesRegex(AssertionError, 'Incomplete producer'):
            self.check()
        self.fixture.raw = saved
        self.fixture.raw['failures'] = [dict(error='deliberate')]
        with self.assertRaisesRegex(AssertionError, 'Incomplete producer'):
            self.check()

    def test_changed_independent_graph_is_not_silently_substituted(self):
        path = self.fixture.root/'scientific/coupled-axial-v74/independent_check.py'
        path.write_text('different sealed graph\n')
        self.fixture.raw['sourceHashes'] = source_hashes(self.fixture.source, self.fixture.root)
        with self.assertRaisesRegex(AssertionError, 'Late endpoint graph'):
            self.check()


if __name__ == '__main__':
    unittest.main()
