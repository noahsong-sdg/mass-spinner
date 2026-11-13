"""The extended producer inventory must retain legacy baseline resolution."""
import json
import unittest
import evaluate100 as e


class InventoryControl(unittest.TestCase):
    def test_extended_inventory_resolves_original_baseline_not_protocol(self):
        entries = e.audit_sources()
        raw = (e.campaign100.ROOT/entries[-1]).read_bytes()
        self.assertEqual(e.campaign100.old.sha(raw), e.campaign100.old.BASELINE)
        self.assertIn('scenarios', json.loads(raw))
        self.assertEqual(set(entries), set(e.campaign100.sources()))
        self.assertEqual(len(entries), len(set(entries)))


if __name__ == '__main__':
    unittest.main()
