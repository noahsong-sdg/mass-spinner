"""Regression checks for stale qualification packets; execute in safe-dev."""
from copy import deepcopy
import unittest
from analyze import validate_packet_links


class QualificationLinkTests(unittest.TestCase):
    def setUp(self):
        self.hashes = {'cases': 'inputs', 'production': 'states'}
        self.packets = {'cases': {'cases': [{'id': 'case'}]},
                        'production': {'inputSHA256': 'inputs', 'cases': [{'spec': {'id': 'case'}}]},
                        'audit': {'sourceSHA256': 'inputs', 'predictionSHA256': 'states', 'cases': [{'id': 'case'}]},
                        'fipy': {'sourceSHA256': 'inputs', 'cases': [{'id': 'case'}]},
                        'diagnostic': {'statesFileSHA256': 'states', 'markersFileSHA256': 'markers', 'spatialCases': [{'id': 'case'}]}}

    def test_accepts_linked_packets(self):
        validate_packet_links(self.packets, self.hashes, 'markers')

    def test_rejects_every_stale_link(self):
        for packet, key in (('production', 'inputSHA256'), ('audit', 'sourceSHA256'),
                            ('audit', 'predictionSHA256'), ('fipy', 'sourceSHA256'),
                            ('diagnostic', 'statesFileSHA256'), ('diagnostic', 'markersFileSHA256')):
            with self.subTest(packet=packet, key=key):
                altered = deepcopy(self.packets); altered[packet][key] = 'stale'
                with self.assertRaisesRegex(ValueError, 'hashes'):
                    validate_packet_links(altered, self.hashes, 'markers')

    def test_rejects_mismatched_case_identity(self):
        for packet, key in (('cases', 'cases'), ('audit', 'cases'), ('fipy', 'cases'), ('diagnostic', 'spatialCases')):
            with self.subTest(packet=packet):
                altered = deepcopy(self.packets); altered[packet][key][0]['id'] = 'other'
                with self.assertRaises(ValueError):
                    validate_packet_links(altered, self.hashes, 'markers')
