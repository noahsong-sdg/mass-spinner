"""Regressions for audit-found evidence loss and hidden unresolved fields."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import launch87
from summarize87 import finite_time_summary,admitted_panel,sha


class ReportingControls(unittest.TestCase):
    def test_stale_panel_after_initial_admission_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'panel.json'; path.write_bytes(b'{"supplementalFailures":[]}')
            expected=sha(path.read_bytes())
            self.assertEqual(admitted_panel(path,expected),{'supplementalFailures':[]})
            path.write_bytes(path.read_bytes()+b'\n')
            with self.assertRaisesRegex(ValueError,'changed after admission'): admitted_panel(path,expected)

    def test_unresolved_relative_fields_remain_in_report_rows(self):
        rows=[dict(timeS=0.,fineChange=0.),dict(timeS=1e-6,fineChange=None),
            dict(timeS=2e-6,fineChange=.01)]
        finite,unresolved,largest=finite_time_summary(rows)
        self.assertEqual(finite,rows[1:]); self.assertEqual(unresolved,1)
        self.assertEqual(largest,rows[-1])

    def test_all_unresolved_comparisons_have_no_invented_maximum(self):
        rows=[dict(timeS=1e-6,fineChange=None)]
        finite,unresolved,largest=finite_time_summary(rows)
        self.assertEqual(finite,rows); self.assertEqual(unresolved,1); self.assertIsNone(largest)

    def test_fresh_source_copy_can_start(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            with patch.object(launch87.study87,'HERE',root),patch.object(launch87.study87,'main',return_value=0) as run:
                self.assertEqual(launch87.main(),0); run.assert_called_once()
            (root/'results').mkdir(); launch87.require_fresh(root/'results')

    def test_stale_or_partial_outputs_refused_without_touching_them(self):
        for partial in (False,True):
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp); output=root/'results'; output.mkdir()
                saved=output/('partial-field.json.gz' if partial else 'predictions.json'); saved.write_bytes(b'preserve')
                with patch.object(launch87.study87,'HERE',root),patch.object(launch87.study87,'main') as run:
                    with self.assertRaises(FileExistsError): launch87.main()
                    run.assert_not_called(); self.assertEqual(saved.read_bytes(),b'preserve')


if __name__=='__main__': unittest.main()
