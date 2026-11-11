"""Regression for the under-resolved axis on the actual study mesh."""
import json
from pathlib import Path
import sys
import unittest

from radial_control import measure

SOURCE = Path(__file__).resolve().parents[1]/'mixture-axial-v75'
sys.path.insert(0, str(SOURCE))
from run import configuration


class RadialResolution(unittest.TestCase):
    def test_reference_mesh_resolves_cylindrical_acoustic_response_at_axis(self):
        manifest = json.loads((SOURCE/'manifest.json').read_text())
        results = [measure(configuration(manifest, n, 2)[0].r) for n in (48, 96)]
        self.assertLess(results[0]['normalizedMax'], .05)
        self.assertLess(results[0]['normalizedRms'], .02)
        self.assertLess(results[1]['normalizedMax'], .01)
        self.assertGreater(results[0]['normalizedMax']/results[1]['normalizedMax'], 3.)
        self.assertTrue(all(abs(row['massResidualKg']) < 1e-20 for row in results))


if __name__ == '__main__':
    unittest.main()
