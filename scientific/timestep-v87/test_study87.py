"""Regression: inactive caps and producer/checker dependency separation."""
import tempfile
import unittest
from pathlib import Path
import numpy as np
import study87 as s


class Controls(unittest.TestCase):
    def test_inactive_caps_do_not_refine_but_cfl_does(self):
        self.assertEqual([s.choose_dt(cap,1e-6,1e-9) for cap in (1e-7,5e-8,2.5e-8)],[1e-9]*3)
        self.assertEqual([s.choose_dt(1e-7,1e-6,bound) for bound in (1e-9,5e-10,2.5e-10)],
            [1e-9,5e-10,2.5e-10])

    def test_report_boundary_and_invalid_candidates(self):
        self.assertEqual(s.choose_dt(1e-7,1e-12,1e-9),1e-12)
        for x in (0,-1,np.nan,np.inf):
            for values in ((x,1,1),(1,x,1),(1,1,x)):
                with self.assertRaises(ValueError): s.choose_dt(*values)

    def test_stale_prediction_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'predictions.json'; path.write_text('{}')
            with self.assertRaisesRegex(ValueError,'prediction changed'): s.read_baseline(path)

    def test_checker_change_does_not_invalidate_physics(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            for name in s.SOURCE_FILES:
                p=root/name; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(name)
            before=s.sources(root)
            (root/'scientific/timestep-v87/test_study87.py').write_text('checker changed')
            self.assertEqual(before,s.sources(root))
            (root/s.SOURCE_FILES[-1]).write_text('transport input changed')
            self.assertNotEqual(before,s.sources(root))


if __name__=='__main__': unittest.main()
