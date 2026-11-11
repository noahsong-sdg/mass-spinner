"""Provenance and sign regressions for independent electrical analysis."""
from copy import deepcopy
import unittest
import numpy as np
from analyze import collocated_reference_potential, radial_centers, ratio, reconstruct, validate_links


class CurrentAnalysisTests(unittest.TestCase):
    def test_linked_identity_accepts_and_stale_hash_rejects(self):
        source = {'cases': [{'id': 'case'}]}
        output = {'sourceSHA256': 'hash', 'cases': [{'id': 'case'}]}
        validate_links(source, output, output, 'hash')
        for which in (0, 1):
            packets = [deepcopy(output), deepcopy(output)]
            packets[which]['sourceSHA256'] = 'stale'
            with self.assertRaisesRegex(ValueError, 'hash'):
                validate_links(source, *packets, 'hash')

    def test_wrong_or_duplicated_case_identity_rejects(self):
        source = {'cases': [{'id': 'first'}, {'id': 'second'}]}
        output = {'sourceSHA256': 'hash', 'cases': [{'id': 'first'}, {'id': 'second'}]}
        for ids in (['second', 'first'], ['first', 'first'], ['first']):
            altered = {**output, 'cases': [{'id': value} for value in ids]}
            with self.assertRaisesRegex(ValueError, 'identity'):
                validate_links(source, output, altered, 'hash')

    def test_zero_scale_does_not_supply_an_arbitrary_absolute_tolerance(self):
        self.assertEqual(ratio(0, 0), 0)
        self.assertEqual(ratio(1e-30, 0), float('inf'))
        self.assertEqual(ratio(-2, 4), .5)

    def test_volume_centers_resolve_regular_axis_open_circuit(self):
        r = np.asarray([0., .5, 1.])
        centers = radial_centers(r, 'integrated')
        np.testing.assert_allclose(centers**2, (r[:-1]**2+r[1:]**2)/2)
        spec = {'radialEdgesM': r.tolist(), 'axialEdgesM': [0., .5, 1.],
                'sigmaPerpSM': [2.]*4, 'sigmaParallelSM': [7.]*4,
                'omegaRadS': [2.]*4, 'magneticT': 3.,
                'innerVoltageV': [None]*2, 'outerVoltageV': [0.]*2,
                'lowerVoltageV': [None]*2, 'upperVoltageV': [None]*2}
        phi = np.tile(3*(centers**2-1), 2)
        derived = reconstruct(spec, {'potentialV': phi.tolist()}, 'integrated')
        np.testing.assert_allclose(derived['radial'], 0, atol=1e-13)
        np.testing.assert_allclose(derived['torque'], 0, atol=1e-13)

    def test_potential_comparison_uses_physical_points_and_boundary_condition(self):
        spec = {'radialEdgesM': [0., .5, 1.], 'axialEdgesM': [0., 1.],
                'outerVoltageV': [2.], 'innerVoltageV': [None],
                'lowerVoltageV': [None, None], 'upperVoltageV': [None, None],
                'magneticT': 2., 'omegaRadS': [1., 1.]}
        native = radial_centers(spec['radialEdgesM'], 'fipy')
        target = radial_centers(spec['radialEdgesM'], 'integrated')
        result = {'potentialV': (2*native).tolist()}
        np.testing.assert_allclose(collocated_reference_potential(spec, result), 2*target-2)
        spec['outerVoltageV'] = [None]
        spec['lowerVoltageV'] = [0., None]
        np.testing.assert_allclose(collocated_reference_potential(spec, result), 2*target)
