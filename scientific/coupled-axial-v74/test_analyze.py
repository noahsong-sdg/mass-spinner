"""Analyzer regressions on explicit synthetic bookkeeping, not physics results."""
import unittest
import numpy as np
from analyze import analyze, request


def fixture():
    manifest = {'timesS': [.001, .004], 'outerVoltageProfile': 'sin(pi*z/L)',
                'radiusM': 1., 'lengthM': 1., 'sigmaPerpSM': .03, 'sigmaParallelSM': .3, 'outerVoltageV': 4.,
                'joint': [[2, 1], [4, 4], [8, 16], [16, 64]],
                'spatial': [[2, 64], [4, 64], [8, 64]], 'temporal': [[8, 1], [8, 4], [8, 16], [8, 64]],
                'radial': [[2, 16, 64], [4, 16, 64], [8, 16, 64]],
                'axial': [[16, 2, 64], [16, 4, 64], [16, 8, 64]], 'tighterTolerance': [8, 16],
                'referenceSmallerDt': [16, 16, 128], 'referenceSpatial': [32, 32, 64],
                'independentTolerances': ['linear', 'thermal']}
    keys = {request(level) for series in ('joint', 'spatial', 'temporal', 'radial', 'axial') for level in manifest[series]}
    keys.update(request(manifest[name]) for name in ('referenceSmallerDt', 'referenceSpatial'))
    keys.add(request(manifest['tighterTolerance'], True))
    keys.update(request(manifest['tighterTolerance'], mode) for mode in manifest['independentTolerances'])
    trajectories = []
    for nr, nz, nt, tight in sorted(keys, key=lambda k: (*k[:3], str(k[3]))):
        nw = max(2, nr//3)
        setup = {'r': np.linspace(0, 1, nr+1).tolist(), 'wall': np.linspace(1, 1.1, nw+1).tolist(),
                 'z': np.linspace(0, 1, nz+1).tolist()}
        temperature = np.full((nz, nr+nw), 600.)
        temperature[:, :nr] = 400.
        cases = []
        for time in manifest['timesS']:
            cases.append({'setup': setup, 'initialGasK': 400., 'initialLinerK': 600., 'timeS': time, 'interfaceIntoGasW': .25,
                'result': {'temperatureK': temperature.ravel().tolist(), 'mechanical': {
                    'omegaRadS': np.ones(nr*nz).tolist(), 'shearHeatW': 1.,
                    'current': {'jouleW': 2., 'boundaryCurrentsA': [1., -1.]},
                    'boundaryTorqueNm': {'outer': 1., 'lower': 2., 'upper': 3.}}}})
        trajectories.append({'n': nr, 'nz': nz, 'nt': nt, 'tight': tight, 'cases': cases})
    return {'manifest': manifest, 'cases': trajectories, 'failures': []}


def evaluate(report):
    static = {'boundaryProfile': 'sin(pi*z/L)', 'manifest': report['manifest'], 'passed': True, 'failures': [],
              'levels': [{'n': n, 'relativePotentialRms': 0., 'relativePowerError': 0.} for n in (6, 12, 24, 48, 96)]}
    return analyze([report], static)


class AnalyzerTests(unittest.TestCase):
    def test_observed_orders_report_known_radial_error_without_changing_gates(self):
        report = fixture()
        for trajectory in report['cases']:
            if trajectory['nz'] == 16 and trajectory['n'] in (2, 4, 8):
                for case in trajectory['cases']:
                    case['result']['mechanical']['omegaRadS'] = [1.+trajectory['n']**-2]*(trajectory['n']*16)
        result = evaluate(report)
        orders = result['series']['radial']['observedOrders']
        self.assertEqual(len(orders), 4)
        for row in orders:
            self.assertAlmostEqual(row['rmsOrders']['omega'], 2.)
            self.assertIsNone(row['rmsOrders']['gas'])
        self.assertTrue(result['series']['radial']['passed'])

    def test_complete_constant_fixture(self):
        self.assertTrue(evaluate(fixture())['numericallyQualified'])

    def test_missing_output_rejected_even_if_all_runs_omit_it(self):
        report = fixture()
        for trajectory in report['cases']:
            trajectory['cases'].pop(0)
        with self.assertRaisesRegex(AssertionError, 'scheduled output'):
            evaluate(report)

    def test_missing_reference_cannot_qualify(self):
        report = fixture()
        report['cases'] = [t for t in report['cases'] if (t['n'], t['nz'], t['nt']) != (32, 32, 64)]
        result = evaluate(report)
        self.assertTrue(result['comparisonGatesPassed'])
        self.assertFalse(result['numericallyQualified'])

    def test_reference_torque_drift_cannot_hide_behind_equal_profiles(self):
        report = fixture()
        reference = next(t for t in report['cases'] if (t['n'], t['nz'], t['nt']) == (32, 32, 64))
        reference['cases'][0]['result']['mechanical']['boundaryTorqueNm']['outer'] *= 1.5
        result = evaluate(report)
        self.assertFalse(result['referenceSpatial']['passed'])
        self.assertFalse(result['numericallyQualified'])

    def test_tolerance_observable_drift_rejected(self):
        report = fixture()
        reference = next(t for t in report['cases'] if t['tight'] is True)
        reference['cases'][0]['result']['mechanical']['current']['jouleW'] *= 1.01
        self.assertFalse(evaluate(report)['tighterTolerance']['passed'])

    def test_missing_independent_tolerance_mode_cannot_qualify(self):
        report = fixture()
        report['cases'] = [t for t in report['cases'] if t['tight'] != 'linear']
        self.assertFalse(evaluate(report)['numericallyQualified'])

    def test_independent_thermal_tolerance_observable_drift_rejected(self):
        report = fixture()
        reference = next(t for t in report['cases'] if t['tight'] == 'thermal')
        reference['cases'][0]['result']['mechanical']['current']['jouleW'] *= 1.01
        result = evaluate(report)
        self.assertFalse(result['independentTolerances']['thermal']['passed'])
        self.assertFalse(result['numericallyQualified'])

    def test_legacy_corner_boundary_cannot_qualify(self):
        report = fixture()
        report['manifest'].pop('outerVoltageProfile')
        result = evaluate(report)
        self.assertFalse(result['electricalBoundaryAdmissible'])
        self.assertFalse(result['numericallyQualified'])

    def test_missing_static_control_cannot_qualify(self):
        result = analyze([fixture()])
        self.assertFalse(result['staticCurrentPassed'])
        self.assertFalse(result['numericallyQualified'])


if __name__ == '__main__':
    unittest.main()
