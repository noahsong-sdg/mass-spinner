"""Independent scientific-analysis regressions; run only in safe-dev."""
import importlib.util
from pathlib import Path
import unittest

import numpy as np

SPEC = importlib.util.spec_from_file_location('joint_v60', Path(__file__).resolve().parents[1] /
                                            'scientific/hotwall-boundary-v60/analyze-joint.py')
JOINT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(JOINT)


class JointMetrics(unittest.TestCase):
    def test_projection_conserves_integrals_and_temperature_requires_particle_weights(self):
        counts = np.array([[1., 3., 2., 4.]])
        temperatures = np.array([[400., 800., 600., 1000.]])
        energy = 1.5 * JOINT.KB * counts * temperatures
        coarse_counts = JOINT.rebin(counts, 2)
        coarse_energy = JOINT.rebin(energy, 2)
        np.testing.assert_allclose(coarse_energy.sum(axis=1), energy.sum(axis=1), rtol=1e-15)
        actual = coarse_energy / (1.5 * JOINT.KB * coarse_counts)
        np.testing.assert_allclose(actual, [[700., 2600. / 3.]])
        self.assertGreater(np.max(np.abs(actual - temperatures.reshape(1, 2, 2).mean(axis=2))), 50.)
        with self.assertRaises(ValueError):
            JOINT.rebin([[1., 2., 3.]], 2)

    def test_masked_peak_reports_actual_time_and_annulus(self):
        result = JOINT.metric(np.array([[100., .2], [.3, .4]]), [1., 2.],
                              mask=np.array([[False, True], [True, True]]), radius_m=.1)
        self.assertEqual(result['value'], .4)
        self.assertEqual(result['timeS'], 2.)
        self.assertEqual(result['annulusIndex'], 1)
        self.assertEqual(result['activeSamples'], 3)
        self.assertAlmostEqual(result['radiusLowerM'], .1 / np.sqrt(2))

    def test_absent_resolved_signal_cannot_silently_pass_accuracy(self):
        result = JOINT.metric(np.array([0., 0.]), [0., 1.], mask=np.array([False, False]))
        self.assertFalse(result['assessed'])
        self.assertIsNone(JOINT.gate(result, .01))
        self.assertIsNone(result['value'])
        with self.assertRaises(ValueError):
            JOINT.metric(np.array([np.nan]), [0.])

    def test_composite_reference_uses_actual_early_states_and_preserves_late_states(self):
        full = {'config': {'durationS': 1., 'gasK': 500}, 'record': {'cells': 2, 'wallCells': 2, 'steps': 32},
                'times': np.array([0., .0001, .001, .1, 1.]), 'sources': ['full'],
                'arrays': {'energy': np.array([[1.], [2.], [3.], [4.], [5.]])}}
        early = {'config': {'durationS': .002, 'gasK': 500}, 'record': {'cells': 2, 'wallCells': 2, 'steps': 16},
                 'times': np.array([0., .0001, .001]), 'sources': ['early'],
                 'arrays': {'energy': np.array([[1.], [12.], [13.]])}}
        result = JOINT.composite_reference(full, early)
        np.testing.assert_array_equal(result['arrays']['energy'], [[1.], [12.], [13.], [4.], [5.]])
        np.testing.assert_array_equal(full['arrays']['energy'], [[1.], [2.], [3.], [4.], [5.]])
        a, b = JOINT.aligned_overlap(full, early)
        np.testing.assert_array_equal(a['times'], b['times'])
        self.assertEqual(len(a['times']), 3)
        with self.assertRaises(ValueError):
            JOINT.composite_reference(full, {**early, 'times': np.array([0., .0002, .001])})

    def test_accuracy_gates_use_resolved_heating_and_local_flux_not_large_backgrounds(self):
        config = {'durationS': 1., 'gasK': 500., 'radiusM': .1, 'lengthM': 1., 'lightFraction': .5}
        def case(rise, flux, wall_heat):
            t = np.array([[500., 500.], [501. + rise, 502. + rise]])
            energy = 1.5 * JOINT.KB * 1e20 / 2 * t
            arrays = {'lightMass': np.full((2, 2), .5), 'heavyMass': np.full((2, 2), .5),
                      'cellEnergyJ': energy, 'temperatureK': t,
                      'pressurePa': energy / (1.5 * np.pi * .1**2 / 2),
                      'ionRadS': np.zeros(2), 'neutralRadS': np.zeros(2),
                      'wallFluxW': np.array([50., flux]), 'wallHeatJ': np.array([0., wall_heat])}
            return {'config': config, 'record': {'cells': 2, 'wallCells': 2, 'steps': 2},
                    'number': 1e20, 'times': np.array([0., 1.]), 'arrays': arrays}
        result = JOINT.compare(case(.08, 1.02, 2.04), case(0, 1., 2.))
        self.assertTrue(result['gates']['localGasK'])
        self.assertFalse(result['gates']['localHeating'])
        self.assertFalse(result['gates']['wallFlux'])
        self.assertFalse(result['gates']['wallHeat'])
        self.assertAlmostEqual(result['metrics']['localHeatingRelative']['value'], .08)
        self.assertAlmostEqual(result['metrics']['wallFluxRelative']['value'], .02)


if __name__ == '__main__':
    unittest.main()
