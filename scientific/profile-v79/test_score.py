"""Scoring controls keep measurement calibration distinct from velocity fitting."""
from copy import deepcopy
import json
from pathlib import Path
import unittest

import numpy as np

from score import extract, score, SEALED


class ScoringControls(unittest.TestCase):
    def test_axis_calibration_and_extraction_masks_ignore_predictions(self):
        d = json.loads(Path(__file__).with_name('digitization-independent.json').read_text())
        p = extract(d)
        json.dumps(p, allow_nan=False)
        self.assertEqual(len(p), 5)
        for point, expected in zip(p, [.01,.02,.03,.04,.05]):
            lo, hi = point['extractionRadiusRangeM']
            self.assertLess(lo, expected)
            self.assertGreater(hi, expected)
        self.assertEqual([x['extractionUnderFivePercent'] for x in p],
                         [False, True, True, True, False])
        self.assertTrue(all(x['plottedBarRangeMS'][0] < x['velocityMS'] < x['plottedBarRangeMS'][1] for x in p))

    def test_target_mutation_changes_scores_but_not_predictions(self):
        here = Path(__file__).parent
        path = here/'results/predictions.json'
        before = path.read_bytes()
        import hashlib
        self.assertEqual(hashlib.sha256(before).hexdigest(), SEALED)
        predictions = json.loads(before)
        original = deepcopy(predictions)
        points = extract(json.loads((here/'digitization-independent.json').read_text()))
        first = score(predictions, points)
        changed = deepcopy(points)
        for p in changed:
            p['velocityMS'] *= 2
        second = score(predictions, changed)
        self.assertNotEqual(first[0]['chord']['worstRelative'], second[0]['chord']['worstRelative'])
        self.assertEqual(predictions, original)
        self.assertEqual(path.read_bytes(), before)
        for p in changed:
            p['extractionUnderFivePercent'] = False
        self.assertTrue(all(not c['chord']['eligiblePointGate'] for c in score(predictions, changed)))

    def test_radius_interval_includes_internal_prediction_peak(self):
        grid, values = [.01, .02, .03], [1., 10., 1.]
        packet = {'cases': [dict(status='available', beta=3, refinement=4, voltageV=18.5,
                    prediction=dict(chordsM=grid, chordVelocityMS=values,
                                    radialCentersM=grid, localMidplaneVelocityMS=values))]}
        points = [dict(radiusM=.015, velocityMS=10., extractionUnderFivePercent=True,
                       extractionRadiusRangeM=[.014, .026], extractionVelocityRangeMS=[10., 10.])]
        result = score(packet, points)[0]['chord']
        self.assertGreater(result['errorRelative'][0], .2)
        self.assertEqual(result['extractionIntervalErrors'][0]['bestRelative'], 0.)
        self.assertAlmostEqual(result['extractionIntervalErrors'][0]['worstRelative'], .54)
        packet['cases'][0]['prediction']['chordVelocityMS'] = [-v for v in values]
        points[0]['extractionVelocityRangeMS'] = [8., 12.]
        result = score(packet, points)[0]['chord']
        self.assertAlmostEqual(result['extractionIntervalErrors'][0]['worstRelative'], 2.25)


if __name__ == '__main__':
    unittest.main()
