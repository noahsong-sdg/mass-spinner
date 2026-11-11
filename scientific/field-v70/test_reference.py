"""Independent scorer regression tests; parent executes inside safe-dev."""
import copy
import hashlib
import json
import math
from pathlib import Path
import unittest

from reference import argon_viscosity, independent_cases, matched_measurements, validate

ROOT = Path(__file__).resolve().parents[2]


class ReferenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.markers = (ROOT/'scientific/experimental-v64/data/markers-corrected.json').read_bytes()
        cls.protocol = (ROOT/'scientific/field-v70/PROTOCOL.md').read_bytes()
        cls.cases = independent_cases(json.loads(cls.markers))
        cls.packet = {'schemaVersion': 1,
                      'markersSHA256': hashlib.sha256(cls.markers).hexdigest(),
                      'protocolSHA256': hashlib.sha256(cls.protocol).hexdigest(),
                      'matchedExperimentalValidation': False, 'liveQualified': False, 'unconditionalAccuracy': False,
                      'trainingFieldT': .17, 'heldoutFieldsT': [.13, .21, .255], 'target': .2,
                      'unresolved': ['radial-profile', 'pressure-sweep', 'independent-current', 'radial-temperature',
                                     'diagnostic-fit', 'predicted-heating', 'separation-products'],
                      'cases': cls.cases}

    def rejects(self, mutate):
        packet = copy.deepcopy(self.packet)
        mutate(packet)
        with self.assertRaises(ValueError):
            validate(packet, self.markers, self.protocol)

    def test_uncorrupted_packet(self):
        self.assertTrue(validate(self.packet, self.markers, self.protocol)['allRequiredChecksPassed'])

    def test_absolute_transport_pi_and_units(self):
        reference = 5/16*math.sqrt(math.pi*39.948*1.66053906892e-27*1.380649e-23*10000)/(math.pi*6.20e-20)
        self.assertAlmostEqual(argon_viscosity(10000)/reference, 1, places=14)
        self.assertGreater(reference, 2e-4)
        self.assertLess(reference, 4e-4)
        for bad in (True, 0, 299, 20001, math.nan, math.inf):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                argon_viscosity(bad)

    def test_stale_or_changed_input_hash_rejected(self):
        for name in ('markersSHA256', 'protocolSHA256'):
            with self.subTest(name=name):
                self.rejects(lambda p: p.__setitem__(name, '0'*64))
        with self.assertRaises(ValueError):
            validate(self.packet, self.markers+b' ', self.protocol)

    def test_training_leak_rejected(self):
        self.rejects(lambda p: p['cases'][2]['points'][0].__setitem__('split', 'train'))
        self.rejects(lambda p: p.__setitem__('heldoutFieldsT', [.13, .21]))

    def test_wrong_viscosity_or_prediction_rejected(self):
        self.rejects(lambda p: p['cases'][2]['points'][0].__setitem__('viscosityPaS',
                                                                    p['cases'][2]['points'][0]['viscosityPaS']*math.pi))
        self.rejects(lambda p: p['cases'][2]['points'][0].__setitem__('predictedMS', 1))

    def test_false_qualification_rejected(self):
        for name in ('matchedExperimentalValidation', 'liveQualified', 'unconditionalAccuracy'):
            with self.subTest(name=name):
                self.rejects(lambda p: p.__setitem__(name, True))

    def test_corner_results_not_just_nominal_reconstructed(self):
        self.rejects(lambda p: p['cases'][2]['extraction'].__setitem__('cornerCount', 1))
        self.rejects(lambda p: p['cases'][2]['reproducibility'].__setitem__('maximumErrorRange', [0, 0]))
        self.rejects(lambda p: p['cases'][2]['transportSensitivity'].__setitem__('allCornersWithin20Percent', True))

    def test_property_domain_only_applies_to_property_candidate(self):
        for case in self.cases[3:5]:
            self.assertEqual(case['reproducibility']['outsidePropertyDomain'], 0)
            self.assertTrue(all(p['viscosityPaS'] is None for p in case['points']))
        self.assertGreater(self.cases[5]['reproducibility']['outsidePropertyDomain'], 0)
        self.assertFalse(self.cases[5]['reproducibility']['allCornersWithin20Percent'])

    def test_duplicate_matched_marker_rejected(self):
        marker = json.loads(self.markers)
        marker['sweeps']['temperature'].append(marker['sweeps']['temperature'][0])
        with self.assertRaises(ValueError):
            matched_measurements(marker)


if __name__ == '__main__':
    unittest.main()
