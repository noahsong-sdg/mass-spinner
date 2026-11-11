import json
from pathlib import Path
import unittest
from audit import control


class AuditTests(unittest.TestCase):
    def test_actual_coupled_stages_pass_and_conservative_corruptions_fail(self):
        m = json.loads(Path(__file__).with_name('manifest.json').read_text())
        result = control(m)
        self.assertEqual(set(result['positiveChecks']), {'hydro', 'diffusion', 'magnetic', 'source'})
        self.assertEqual(len(result['negativeControls']), 6)
        self.assertTrue(result['passed'], result['negativeControls'])


if __name__ == '__main__':
    unittest.main()
