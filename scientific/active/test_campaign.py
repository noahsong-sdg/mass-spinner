"""Publication rejects stale evidence but accepts scheduler-created empty parents."""

import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import admission
import campaign
import campaign_inputs


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
            with (
                patch.object(campaign, "sources", return_value={"input": "identity"}),
                patch.object(campaign.subprocess, "run", side_effect=self.study),
                patch.object(campaign, "admit") as admit,
            ):
                campaign.produce(destination)
            self.assertEqual(
                json.loads((destination / "manifest.json").read_text())["sources"],
                {"input": "identity"},
            )
            admit.assert_called_once_with(destination.resolve())

    def test_existing_nonempty_or_symlink_destination_is_preserved(self):
        with tempfile.TemporaryDirectory() as root:
            saved = Path(root) / "saved"
            saved.mkdir()
            (saved / "evidence").write_text("preserve")
            for destination in [saved, Path(root) / "alias"]:
                if destination != saved:
                    destination.symlink_to(saved, target_is_directory=True)
                with (
                    patch.object(campaign, "sources", return_value={}),
                    patch.object(campaign.subprocess, "run", side_effect=self.study),
                    self.assertRaises((OSError, ValueError, shutil.Error)),
                ):
                    campaign.produce(destination)
                self.assertEqual((saved / "evidence").read_text(), "preserve")

    def test_admission_rechecks_cached_files_identity_and_claims(self):
        with tempfile.TemporaryDirectory() as root:
            destination = Path(root)
            report = dict.fromkeys(
                [
                    "experimentalQualification",
                    "parametersRefitted",
                    "fieldProducerReexecuted",
                    "temperaturePredictionAvailable",
                ],
                False,
            )
            report.update(opticalCases=4320, electricalCases=60)
            (destination / "diagnosis.json").write_text(json.dumps(report))
            (destination / "comparison.png").write_bytes(b"image")
            manifest = {
                "schemaVersion": 1,
                "sources": {"physics": "v1"},
                "files": {
                    name: campaign_inputs.sha(destination / name)
                    for name in ("diagnosis.json", "comparison.png")
                },
            }
            (destination / "manifest.json").write_text(json.dumps(manifest))
            with patch.object(admission, "sources", return_value={"physics": "v1"}):
                admission.admit(destination)
                (destination / "comparison.png").write_bytes(b"corrupted")
                with self.assertRaisesRegex(ValueError, "Corrupted"):
                    admission.admit(destination)
            with patch.object(admission, "sources", return_value={"physics": "v2"}):
                with self.assertRaisesRegex(ValueError, "identity mismatch"):
                    admission.admit(destination)

    def test_checker_is_not_in_producer_source_identity(self):
        paths = campaign_inputs.source_paths()
        self.assertNotIn(Path(admission.__file__).resolve(), paths)
        self.assertIn(Path(campaign.__file__).resolve(), paths)
        self.assertNotEqual(
            campaign_inputs.content_key({"physics": "v1"}),
            campaign_inputs.content_key({"physics": "v2"}),
        )
