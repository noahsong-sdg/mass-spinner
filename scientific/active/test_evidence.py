import copy
import io
import json
import tarfile
import tempfile
import unittest
from pathlib import Path

import evidence


class EvidenceTests(unittest.TestCase):
    def test_round_trip_and_corruption_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            source.mkdir()
            (source / "result.json").write_text(json.dumps({"qualified": False}))
            bundle = root / "evidence.tar.gz"
            catalog = evidence.package(source, bundle, "url", "revision", "run", "scope")
            evidence.unpack(bundle, catalog, root / "restored")
            self.assertEqual(evidence.inventory(source), evidence.inventory(root / "restored"))
            for edit in [
                {"files": {}},
                {"bytes": 1},
                {"sha256": "0" * 64},
                {"files": {"missing": "0" * 64}},
            ]:
                with self.assertRaises(ValueError):
                    evidence.unpack(bundle, catalog | edit, root / "bad")
            bundle.write_bytes(bundle.read_bytes()[:-1])
            with self.assertRaises(ValueError):
                evidence.unpack(bundle, catalog, root / "corrupted")

    def test_unsafe_archives_and_existing_destination_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for name, kind in [
                ("../escape", tarfile.REGTYPE),
                ("/absolute", tarfile.REGTYPE),
                ("link", tarfile.SYMTYPE),
                ("duplicate", tarfile.REGTYPE),
            ]:
                bundle = root / "bad.tar.gz"
                with tarfile.open(bundle, "w:gz") as archive:
                    member = tarfile.TarInfo(name)
                    member.type = kind
                    archive.addfile(member, io.BytesIO())
                    if name == "duplicate":
                        archive.addfile(copy.copy(member), io.BytesIO())
                catalog = {
                    "schemaVersion": 1,
                    "files": {name: "0" * 64},
                    "bytes": bundle.stat().st_size,
                    "sha256": evidence.digest(bundle),
                }
                with self.assertRaises(ValueError):
                    evidence.unpack(bundle, catalog, root / "bad")
            with self.assertRaises(ValueError):
                evidence.unpack(bundle, catalog, root)

    def test_input_symlinks_and_untrusted_download_origins_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "source").write_text("value")
            (root / "alias").symlink_to(root / "source")
            with self.assertRaises(ValueError):
                evidence.inventory(root)
            with self.assertRaises(ValueError):
                evidence.retrieve({"url": "http://untrusted.invalid"}, root / "download")
