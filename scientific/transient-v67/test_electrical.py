"""Independent study regressions; run in safe-dev, no production imports."""
from copy import deepcopy
import json
import unittest

import numpy as np

from electrical import SOURCE_CODE_SHA, compare_fields, digest, freeze_cases, projected_fields, validate_source


def source_packet():
    electrical = {'radialEdgesM': (.01*np.sqrt(np.arange(65)/64)).tolist(),
                  'sigmaPerpSM': [.01]*256, 'sigmaParallelSM': [.1]*256,
                  'magneticT': .5, 'innerVoltageV': [None]*4, 'outerVoltageV': [.01]*4,
                  'lowerVoltageV': [None]*64, 'upperVoltageV': [0.]*32+[None]*32}
    steps = [{'dtS': 1e-3/64, 'result': {'state': {'omegaRadS': [float(k+1)]*64}}} for k in range(64)]
    return {'sourceSHA256': SOURCE_CODE_SHA, 'cases': [{'id': 'mixture-n64-t64',
            'setup': {'radiusM': .01, 'lengthM': .1, 'electrical': electrical},
            'initialState': {'omegaRadS': [0.]*64}, 'requestedSteps': 64,
            'steps': steps, 'failure': None}]}


class ElectricalStudyTests(unittest.TestCase):
    def test_source_pin_rejects_stale_and_wrong_code_identity(self):
        packet = source_packet(); raw = json.dumps(packet).encode()
        validate_source(raw, digest(raw))
        with self.assertRaisesRegex(ValueError, 'SHA256'):
            validate_source(raw+b' ', digest(raw))
        packet['sourceSHA256'] = 'stale'
        raw = json.dumps(packet).encode()
        with self.assertRaisesRegex(ValueError, 'source-code'):
            validate_source(raw, digest(raw))

    def test_exact_accepted_snapshots_and_physical_patch_are_frozen(self):
        cases = freeze_cases(source_packet())['cases']
        self.assertEqual(len(cases), 20)
        for row in cases:
            expected = {'initial': 0., 'step0': 1., 'step31': 32., 'step63': 64.}[row['snapshot']]
            self.assertEqual(set(row['omegaRadS']), {expected})
            self.assertEqual(row['upperVoltageV'], [0.]*32+[None]*32)
            self.assertEqual(len(row['omegaRadS']), 64*row['axialCells'])
        self.assertEqual([row['timeS'] for row in cases[::5]], [0., 1e-3/64, .5e-3, 1e-3])

    def test_partial_trajectory_or_moved_electrode_rejects(self):
        packet = source_packet(); packet['cases'][0]['steps'].pop()
        with self.assertRaisesRegex(ValueError, 'incomplete'):
            freeze_cases(packet)
        packet = source_packet(); packet['cases'][0]['setup']['electrical']['upperVoltageV'][32] = 0.
        with self.assertRaisesRegex(ValueError, 'patch'):
            freeze_cases(packet)

    def test_fipy_torque_is_adjoint_on_nonuniform_radial_cells(self):
        spec = {'radialEdgesM': [0., .4, 1.], 'axialEdgesM': [0., .5, 1.],
                'sigmaPerpSM': [1.]*4, 'magneticT': .5,
                'innerVoltageV': [None]*2, 'outerVoltageV': [0.]*2}
        derived = {'heat': np.zeros(4), 'torque': np.zeros(4),
                   'radial': np.array([[0., 1., 2.], [0., 1., 2.]]), 'axial': np.zeros((3, 2))}
        fields = projected_fields(spec, derived, 'fipy')
        np.testing.assert_allclose(fields['torqueNm'], [-.12, -.68])
        self.assertAlmostEqual(np.dot(fields['torqueNm'], [2., 3.]), -2.28)
        self.assertAlmostEqual(sum(fields['jouleByCellW']), 4.9/np.pi)

    def test_small_conductivity_does_not_hide_relative_profile_error(self):
        left = {'powerScaleW': 4e-30, 'currentScaleA': 2e-30,
                'jouleW': 2e-30, 'mechanicalW': -1e-30, 'electrodePowerW': 1e-30,
                'torqueNm': np.array([1e-30, -1e-30]),
                'jouleByCellW': np.array([1e-30, 1e-30]), 'terminalCurrentA': {'outer': 1e-30}}
        right = deepcopy(left); right['torqueNm'][0] *= 1.1
        self.assertGreater(compare_fields(left, right)['torqueL1'], .04)
        self.assertAlmostEqual(compare_fields(left, right)['powers']['jouleW'], 0.)


if __name__ == '__main__':
    unittest.main()
