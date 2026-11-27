"""Analytic fixtures and deliberate corruption of independent audit receipts."""
import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('independent_replay_audit', Path(__file__).with_name('audit_replay.py'))
a = importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)


class IndependentAuditTests(unittest.TestCase):
    def setUp(self):
        self.points = [dict(id='inner', radiusM=.01, velocityMS=100,
                           extractionVelocityRangeMS=[94, 106], extractionUnderFivePercent=False),
                       dict(id='outer', radiusM=.02, velocityMS=200,
                           extractionVelocityRangeMS=[196, 204], extractionUnderFivePercent=True)]
        self.state = {('group', 18.5): dict(scenario='source', anodeCenterM=.07,
                      prediction=dict(currentsA=dict(cathode=20)))}
        spectra = [dict(temperatureK=t, instrumentSigmaMS=w, spectralGate=True, fluxGate=True,
                       opticalSpectrumMeshGate=True, refinements=[dict(centroidMS=v, modeMS=v+5)])
                   for t in (1400, 1800, 2900, 5950, 7250, 'linear')
                   for w in (0., 500., 1000.) for v in (90., 210.)]
        closure = dict(edgeClosure='linear', spectra=spectra,
                       centroidMeshes=[dict(velocityMS=[89.5, 209.5]), dict(velocityMS=[90., 210.])])
        self.packet = dict(locations=[dict(id=p['id'], radiusM=p['radiusM']) for p in self.points],
                           cases=[dict(beta='absolute-voltage', voltageV=18.5, closures=[closure])])

    def rows(self):
        return list(a.optical_rows(self.packet, self.points, 'group', self.state))

    def test_scalar_arithmetic_and_complete_sensitivity_grid(self):
        rows = self.rows()
        self.assertEqual(len(rows), 36)
        centroid, mode = rows[:2]
        self.assertEqual(centroid['errorRelative'], [.1, .05])
        self.assertEqual(centroid['rmsOverMeasuredPeak'], .05)
        self.assertEqual(mode['errorRelative'], [.05, .075])
        self.assertAlmostEqual(centroid['opticalCentroidMeshChange'], .5/90)
        self.assertTrue(centroid['opticallyResolvedVoltageCompatiblePointMatch'])
        self.assertEqual(centroid['currentA'], 20)

    def test_nominal_match_does_not_hide_unresolved_spectrum(self):
        self.packet['cases'][0]['closures'][0]['spectra'][0]['fluxGate'] = False
        row = self.rows()[0]
        self.assertTrue(row['allPointGate'])
        self.assertFalse(row['spectralGate'])
        self.assertFalse(row['opticallyResolvedVoltageCompatiblePointMatch'])

    def test_bad_location_and_forged_extraction_mask_fail(self):
        self.packet['locations'][0]['radiusM'] = .011
        with self.assertRaisesRegex(ValueError, 'locations'):
            self.rows()
        self.packet['locations'][0]['radiusM'] = .01
        self.points[0]['extractionUnderFivePercent'] = True
        with self.assertRaisesRegex(ValueError, 'extraction mask'):
            self.rows()

    def test_recursive_receipt_rejects_error_claim_and_inventory_corruption(self):
        expected = dict(cases=self.rows(), jointQualification=False, electricalAcceptanceThreshold=None)
        for mutate in (lambda x: x['cases'][0]['errorRelative'].__setitem__(0, .01),
                       lambda x: x.__setitem__('jointQualification', True),
                       lambda x: x.__setitem__('jointQualification', 0),
                       lambda x: x['cases'].pop(),
                       lambda x: x['cases'][0].__setitem__('currentA', float('nan')),
                       lambda x: x.__setitem__('electricalAcceptanceThreshold', .2)):
            changed = copy.deepcopy(expected)
            mutate(changed)
            with self.assertRaises(ValueError):
                a.same(changed, expected)

    def test_current_conditioned_rows_are_not_admitted(self):
        self.packet['cases'][0]['beta'] = 'fixed-current'
        self.assertEqual(self.rows(), [])


class FullReplayAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # The producer is the test subject; the independent auditor never imports it.
        spec = importlib.util.spec_from_file_location('audit_test_subject', Path(__file__).with_name('replay.py'))
        producer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(producer)
        cls.result = producer.replay()

    def test_every_actual_row_current_and_receipt(self):
        receipt = a.audit(self.result)
        self.assertEqual(receipt['opticalRowsChecked'], 4320)
        self.assertEqual(receipt['electricalRowsChecked'], 60)
        self.assertTrue(receipt['arithmeticAuditPassed'])
        self.assertFalse(receipt['experimentalQualification'])

    def test_actual_output_corruptions_are_rejected(self):
        mutations = {
            'point-error': lambda x: x['cases'][0]['errorRelative'].__setitem__(0, 0),
            'duplicate-row': lambda x: x['cases'].__setitem__(-1, x['cases'][0]),
            'current': lambda x: x['electricalCases'][0].__setitem__('predictedCurrentA', 100),
            'count': lambda x: x.__setitem__('opticalAllPointMatches', 4320),
            'temperature': lambda x: x.__setitem__('temperaturePredictionAvailable', True),
            'refit': lambda x: x.__setitem__('parametersRefitted', True),
            'exposure': lambda x: x.__setitem__('observationsPreviouslyExamined', False),
            'target': lambda x: x['points'][0].__setitem__('velocityMS', 1),
            'source': lambda x: x['sourceSeals'].__setitem__(next(iter(a.PINS)), '0'*64),
        }
        for name, mutation in mutations.items():
            with self.subTest(name=name):
                changed = copy.deepcopy(self.result)
                mutation(changed)
                with self.assertRaises(ValueError):
                    a.audit(changed)


if __name__ == '__main__':
    unittest.main()
