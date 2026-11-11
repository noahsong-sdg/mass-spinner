"""Actual analytic benchmark also exercises its persisted JSON result contract."""
import json
from pathlib import Path
import unittest
from static_current import run


class StaticCurrentTests(unittest.TestCase):
    def test_analytic_control_and_json_boolean_contract(self):
        manifest = json.loads(Path(__file__).with_name('manifest.json').read_text())
        result = json.loads(json.dumps(run(manifest), allow_nan=False))
        self.assertTrue(result['passed'])
        self.assertEqual([level['n'] for level in result['levels']], [6, 12, 24, 48, 96])
        self.assertTrue(all(isinstance(gate['passed'], bool) for gate in result['gates']))


if __name__ == '__main__':
    unittest.main()
