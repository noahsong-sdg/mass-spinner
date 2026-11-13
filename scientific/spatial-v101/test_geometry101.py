"""Explicit mesh admission, including stale legacy packets."""
from functools import partial
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
import numpy as np

sys.path.insert(0, str(Path(__file__).parents[1]/'coupled-v99'))
import test_audit99 as fixtures
from audit99 import audit
from geometry101 import expected_edges
from reconstruction101 import mesh


class GeometryAdmissionControls(unittest.TestCase):
    def fixture(self, candidate=False):
        fixture = fixtures.AuditControls(methodName='runTest')
        geometry = expected_edges if candidate else fixtures.edges
        with patch.object(fixtures, 'edges', geometry):
            fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        if candidate:
            for case in fixture.data['cases']:
                state = fixture.states[case['refinement'], case['cfl']]
                case['nr'], case['nz'] = len(state['radialEdgesM'])-1, len(state['axialEdgesM'])-1
        return fixture

    def run_candidate(self, fixture):
        with patch.object(fixtures, 'audit', partial(audit, expected_edges=expected_edges)):
            return fixture.run_audit()

    def test_independent_polynomial_matches_producer_geometry(self):
        previous = None
        for n in (1, 2, 4):
            expected = expected_edges(n)
            for a, b in zip(expected, mesh(n, 'smooth-source-aligned')):
                np.testing.assert_allclose(a, b, rtol=0, atol=1e-16)
                self.assertTrue(np.all(np.diff(a) > 0))
            if previous is not None:
                for a, b in zip(expected, previous):
                    np.testing.assert_array_equal(a[::2], b)
            previous = expected

    def test_default_legacy_admission_unchanged_and_explicit_candidate_rejects_it(self):
        fixture = self.fixture()
        self.assertTrue(fixture.run_audit()['allRequiredNumericalPass'])
        with self.assertRaisesRegex(ValueError, 'geometry/clock'):
            self.run_candidate(fixture)

    def test_candidate_admission_and_stale_geometry_or_count_rejected(self):
        fixture = self.fixture(candidate=True)
        result = self.run_candidate(fixture)
        self.assertTrue(result['allRequiredNumericalPass'], result['failures'][:3])
        self.assertFalse(result['experimentalQualification'])
        with self.assertRaisesRegex(ValueError, 'geometry/clock'):
            fixture.run_audit()
        fixture.states[1, .1]['radialEdgesM'][2] += 1e-6
        with self.assertRaisesRegex(ValueError, 'nested mesh'):
            self.run_candidate(fixture)
        fixture.states[1, .1]['radialEdgesM'][2] -= 1e-6
        fixture.data['cases'][0]['nr'] += 1
        with self.assertRaisesRegex(ValueError, 'geometry/clock'):
            self.run_candidate(fixture)


if __name__ == '__main__':
    unittest.main()
