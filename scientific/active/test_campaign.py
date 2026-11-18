"""Publication rejects stale evidence but accepts scheduler-created empty parents."""
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import campaign


class CampaignPublicationTests(unittest.TestCase):
    def study(self, args, **_kwargs):
        work = Path(args[-1])
        work.mkdir()
        (work / "diagnosis.json").write_text("{}")
        (work / "comparison.png").write_bytes(b"image")

    def test_scheduler_empty_directory_is_published(self):
        with tempfile.TemporaryDirectory() as root:
            destination = Path(root) / "result"
            destination.mkdir()
            with patch.object(campaign, "sources", return_value={"input": "identity"}), \
                 patch.object(campaign.subprocess, "run", side_effect=self.study), \
                 patch.object(campaign, "admit") as admit:
                campaign.produce(destination)
            self.assertEqual(json.loads((destination / "manifest.json").read_text())["sources"], {"input": "identity"})
            admit.assert_called_once_with(destination.resolve())

    def test_existing_nonempty_or_symlink_destination_is_preserved(self):
        with tempfile.TemporaryDirectory() as root:
            saved = Path(root) / "saved"
            saved.mkdir()
            (saved / "evidence").write_text("preserve")
            for destination in [saved, Path(root) / "alias"]:
                if destination != saved:
                    destination.symlink_to(saved, target_is_directory=True)
                with patch.object(campaign, "sources", return_value={}), \
                     patch.object(campaign.subprocess, "run", side_effect=self.study), \
                     self.assertRaises((OSError, ValueError, shutil.Error)):
                    campaign.produce(destination)
                self.assertEqual((saved / "evidence").read_text(), "preserve")
