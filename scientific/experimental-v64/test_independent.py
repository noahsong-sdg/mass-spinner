"""Negative controls for the independent audit; execute only in safe-dev.

These synthetic fixtures check the auditor, not experimental agreement.
"""
import copy
import json
import math
import unittest

import independent_check as check


def fixture():
    pressure = {'backend': 'analytic-reference', 'constantDrag': True,
                'trainPressureTorr': 3, 'testPressureTorr': 9, 'trainMS': 1,
                'temperatureRatio': 1, 'measuredTestRatio': 2/3,
                'predictedTestRatio': 1/3}
    points = [{'rCm': r, 'vMS': v, 'split': 'train' if r <= 3 else 'test',
               'rHalfWidthCm': .02, 'vHalfWidthMS': 10}
              for r, v in zip((.5, 1, 1.5, 2, 3.5, 4, 4.5, 5),
                              (500, 1000, 1500, 2000, 2200, 2100, 1800, 1000))]
    train = points[:4]
    omega = sum(.01*p['rCm']*p['vMS'] for p in train)/sum((.01*p['rCm'])**2 for p in train)
    for p in points:
        p['predictedMS'] = omega*.01*p['rCm']
    peak = max(p['vMS'] for p in points)
    rms = math.sqrt(sum((p['predictedMS']-p['vMS'])**2 for p in points[4:])/4)
    profile = {'radiusM': .06, 'fitOmegaRadS': omega,
               'metricDenominatorMS': peak, 'heldoutRmsOverPeak': rms/peak,
               'points': points, 'matchedExperimentalValidation': False,
               'reproducibility': {'relativeHalfWidth': .15,
                                   'semantics': 'common-scale-sensitivity-not-confidence'}}
    operator = {'massU': 7, 'velocityMS': 1000, 'temperatureK': 400,
                'raFraction': .2, 'rbFraction': .8}
    operator['productionLogRatio'] = 7*check.ATOMIC_MASS_KG*1000**2*(.8**2-.2**2)/(2*check.BOLTZMANN_J_K*400)
    maxima = {'B': .17, 'velocityMS': 1200, 'temperatureK': 500,
              'inputRelativeHalfWidth': .15, 'confidenceInterval': False}
    lam = 39.948*check.ATOMIC_MASS_KG*1200**2/(2*check.BOLTZMANN_J_K*500)
    maxima.update({'lambda': lam, 'lambdaEnvelope': [lam*.85**2/1.15, lam*1.15**2/.85]})
    return {'schemaVersion': 1, 'pressureScaling': pressure, 'profile': profile,
            'mechanism': {'checks': [operator], 'maximaUncertainty': [maxima]}}


class IndependentAuditTests(unittest.TestCase):
    def test_reconstructs_and_retains_structural_failures(self):
        result = check.audit(fixture())
        self.assertFalse(result['matchedExperimentalValidation'])
        pressure = result['pressureScaling']
        self.assertAlmostEqual(pressure['relativeSpeedRatioError'], .5)
        self.assertAlmostEqual(pressure['relativeSlowdownSignalError'], 1)
        self.assertFalse(pressure['firstOrderSpeedScreenPassed'])
        self.assertFalse(result['profile']['profileShapeScreenPassed'])
        self.assertTrue(result['mechanism']['numericalReconstructionPassed'])

    def test_rejects_ratio_orientation_error(self):
        packet = fixture()
        packet['pressureScaling']['predictedTestRatio'] = 3
        with self.assertRaises(ValueError):
            check.audit(packet)

    def test_rejects_mutated_reported_source_value(self):
        packet = fixture()
        packet['pressureScaling']['measuredTestRatio'] = 1/3
        with self.assertRaises(ValueError):
            check.audit(packet)

    def test_rejects_coupled_backend_as_exact_inverse_pressure_law(self):
        packet = fixture()
        packet['pressureScaling']['backend'] = 'coupled'
        with self.assertRaises(ValueError):
            check.audit(packet)

    def test_rejects_heldout_training_leakage(self):
        packet = fixture()
        packet['profile']['points'][-1]['split'] = 'train'
        with self.assertRaises(ValueError):
            check.audit(packet)

    def test_rejects_hertz_radians_confusion(self):
        packet = fixture()
        packet['profile']['fitOmegaRadS'] /= 2*math.pi
        with self.assertRaises(ValueError):
            check.audit(packet)

    def test_rejects_using_predicted_peak_to_dilute_error(self):
        packet = fixture()
        packet['profile']['metricDenominatorMS'] = max(p['predictedMS'] for p in packet['profile']['points'])
        with self.assertRaises(ValueError):
            check.audit(packet)

    def test_rejects_missing_uncertainty_instead_of_treating_as_zero(self):
        packet = fixture()
        del packet['profile']['points'][0]['vHalfWidthMS']
        with self.assertRaises(KeyError):
            check.audit(packet)

    def test_rejects_false_full_validation_or_confidence(self):
        for route in ('validation', 'reproducibility', 'envelope'):
            with self.subTest(route=route):
                packet = fixture()
                if route == 'validation':
                    packet['profile']['matchedExperimentalValidation'] = True
                elif route == 'reproducibility':
                    packet['profile']['reproducibility']['semantics'] = '95%-confidence'
                else:
                    packet['mechanism']['maximaUncertainty'][0]['confidenceInterval'] = True
                with self.assertRaises(ValueError):
                    check.audit(packet)

    def test_rejects_wrong_density_ratio_orientation(self):
        packet = fixture()
        packet['mechanism']['checks'][0]['productionLogRatio'] *= -1
        with self.assertRaises(ValueError):
            check.audit(packet)

    def test_rejects_factor_two_in_centrifugal_potential(self):
        packet = fixture()
        packet['mechanism']['maximaUncertainty'][0]['lambda'] *= 2
        with self.assertRaises(ValueError):
            check.audit(packet)

    def test_rejects_nonfinite_json_and_boolean_numbers(self):
        with self.assertRaises(ValueError):
            json.loads('{"v": NaN}', parse_constant=check.invalid_constant)
        packet = copy.deepcopy(fixture())
        packet['pressureScaling']['testPressureTorr'] = True
        with self.assertRaises(ValueError):
            check.audit(packet)

    def test_rejects_wrong_finite_time_pressure_ratio(self):
        packet = fixture()
        packet['pressureScaling']['pressureTimes'] = [{'timeS': .01, 'predictedTestRatio': .5}]
        with self.assertRaises(ValueError):
            check.audit(packet)

    def test_magnetic_reconstruction_and_negative_controls(self):
        packet = fixture()
        maxima = []
        for field, speed, temperature in ((.13, 800, 8000), (.17, 1000, 9000), (.21, 1200, 10000), (.255, 1400, 12000)):
            lam = 39.948*check.ATOMIC_MASS_KG*speed**2/(2*check.BOLTZMANN_J_K*temperature)
            maxima.append({'B': field, 'velocityMS': speed, 'temperatureK': temperature,
                           'lambda': lam, 'lambdaEnvelope': [lam*.85**2/1.15, lam*1.15**2/.85],
                           'inputRelativeHalfWidth': .15, 'confidenceInterval': False})
        packet['mechanism']['maximaUncertainty'] = maxima
        points = copy.deepcopy(maxima)
        for p in points:
            prediction = 1000*(p['B']/.17)*(p['temperatureK']/9000)
            p.update({'split': 'train' if p['B'] == .17 else 'test', 'predictedMS': prediction,
                      'relativeError': abs(prediction-p['velocityMS'])/p['velocityMS']})
        packet['magneticScaling'] = {'backend': 'analytic-reference', 'trainingB': .17,
                                     'points': points, 'matchedExperimentalValidation': False}
        self.assertTrue(check.audit(packet)['magneticScaling']['numericalReconstructionPassed'])
        for mutation in ('inverse-temperature', 'two-training-fields', 'source-mismatch'):
            altered = copy.deepcopy(packet)
            p = altered['magneticScaling']['points'][-1]
            if mutation == 'inverse-temperature':
                p['predictedMS'] = 1000*(p['B']/.17)*(9000/p['temperatureK'])
            elif mutation == 'two-training-fields':
                p['split'] = 'train'
            else:
                p['velocityMS'] += 1
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                check.audit(altered)


if __name__ == '__main__':
    unittest.main()
