import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("comparison", Path(__file__).with_name("compare.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ComparisonTests(unittest.TestCase):
    def run_comparison(self, current, previous):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            with patch.object(m, "projected", side_effect=[current, previous]):
                return m.compare("test", root)

    def test_exact_physical_values(self):
        result = self.run_comparison({"a": [0, 1., 2]}, {"a": [0, 1., 2]})
        self.assertTrue(result["physicalProjectionExactlyEqual"])
        self.assertEqual(result["comparedNumericScalars"], 3)

    def test_unmatched_tail_is_recorded(self):
        result = self.run_comparison({"a": [1, 2]}, {"a": [1]})
        self.assertFalse(result["physicalProjectionExactlyEqual"])
        self.assertEqual(result["structuralDifferences"],
                         [{"path": "$.a", "currentLength": 2, "baselineLength": 1}])

    def test_tiny_nonzero_reaction_is_a_change(self):
        result = self.run_comparison({"yield": 1e-30}, {"yield": 0.})
        self.assertEqual(result["changedNumericScalars"], 1)
        self.assertEqual(result["maxAbsoluteDifference"], 1e-30)

    def test_nonfinite_physical_values_rejected(self):
        with self.assertRaisesRegex(ValueError, "Nonfinite"):
            self.run_comparison({"a": float("nan")}, {"a": 1.})


class ArtifactInventoryTests(unittest.TestCase):
    def test_nested_execution_receipt_is_preserved(self):
        spec = importlib.util.spec_from_file_location("orchestration", Path(__file__).with_name("guest.py"))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root/"execution.json").write_text("self")
            (root/"results").mkdir()
            (root/"results/execution.json").write_text("native failure receipt")
            (root/"baseline").mkdir()
            (root/"baseline/old.json").write_text("retained elsewhere")
            self.assertEqual(set(module.inventory(root)), {"results/execution.json"})


if __name__ == "__main__":
    unittest.main()

