"""Inventory integrity checks; run in the isolated scientific environment."""
import copy
import hashlib
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
PATH = ROOT / 'scientific/public-data-campaign/observations.json'


def validate(data):
    assert data['schemaVersion'] == 1
    assert data['experimentalQualification'] is False
    assert data['observationsPreviouslyExamined'] is True
    apparatus, pressure = data['apparatus'], data['pressure']
    assert apparatus['id'] == 'wijnakker-1979-diffuse'
    assert (apparatus['cathodeMaterial'], apparatus['magneticT'],
            apparatus['branchCurrentA']) == ('tantalum', .13, 100)
    assert pressure['experimentalUncertainty'] is None
    assert pressure['scoring'].startswith('diagnostic-only')
    assert pressure['coordinateUncertaintyPx'] > 0
    rows = pressure['markers']
    assert len(rows) == len({r['id'] for r in rows}) == 17
    x0, x1 = pressure['xAnchors'][0][1], pressure['xAnchors'][-1][1]
    assert all(x0 < r['centerPx'][0] < x1 for r in rows)
    assert all(0 < r['centerPx'][1] < 2400 for r in rows)
    targets = {s['id']: s for s in data['scalars']}
    for key in ('central-heavy-temperature', 'near-wall-heavy-temperature'):
        assert 'prescribed input' in targets[key]['role']
    for source in [data['rotation'], data['sources']['pressureCrop'],
                   data['sources']['pressurePage']]:
        assert hashlib.sha256((ROOT / source['path']).read_bytes()).hexdigest() == source['sha256']


class InventoryTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(PATH.read_text())

    def test_frozen_inventory(self):
        validate(self.data)

    def test_uncertainty_and_condition_corruption(self):
        for edit in [lambda d: d['pressure'].update(experimentalUncertainty=0),
                     lambda d: d['apparatus'].update(cathodeMaterial='tungsten'),
                     lambda d: d.update(experimentalQualification=True),
                     lambda d: d['rotation'].update(sha256='0' * 64)]:
            changed = copy.deepcopy(self.data)
            edit(changed)
            with self.assertRaises(AssertionError):
                validate(changed)

    def test_outside_bore_and_duplicate_markers_rejected(self):
        for value in (1500, self.data['pressure']['markers'][0]['centerPx'][0]):
            changed = copy.deepcopy(self.data)
            if value == 1500:
                changed['pressure']['markers'][-1]['centerPx'][0] = value
            else:
                changed['pressure']['markers'][-1]['id'] = 'p01'
            with self.assertRaises(AssertionError):
                validate(changed)


if __name__ == '__main__':
    unittest.main()
