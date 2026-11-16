"""Exact-copy/provenance checks only; no scientific imports or solver execution."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import tarfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('argon_export', ROOT/'scripts/export-argon-reference.py')
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class ReferenceExportTest(unittest.TestCase):
    def test_every_displayed_sample_and_source_identity_is_an_exact_retained_copy(self):
        with tarfile.open(ROOT/exporter.ARCHIVE) as source:
            raw = source.extractfile(exporter.MEMBER).read()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), exporter.MEMBER_SHA)
        original = json.loads(raw)
        packet = json.loads((ROOT/'web-assets/argon-reference/v98.json').read_bytes())
        for key in ('manifest', 'scenarios', 'comparisons', 'sourceSHA256', 'baselineSHA256', 'numericalGates'):
            self.assertEqual(packet[key], original[key])
        self.assertEqual(len(packet['cases']), len(original['cases']))
        for displayed, retained in zip(packet['cases'], original['cases']):
            self.assertEqual(displayed, {key: retained[key] for key in displayed})
        for key in ('experimentalQualification', 'livePlaygroundQualified', 'currentFitted'):
            self.assertIs(packet[key], False)

    def test_export_reproduces_both_published_bytes_and_bundled_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/exporter.ARCHIVE).parent.mkdir(parents=True)
            (root/exporter.ARCHIVE).hardlink_to(ROOT/exporter.ARCHIVE)
            (root/'web-assets/argon-reference').mkdir(parents=True)
            (root/'src').mkdir()
            with patch.object(exporter, 'ROOT', root):
                exporter.export()
            for name in ('web-assets/argon-reference/v98.json', 'src/argon-reference-identity.ts'):
                self.assertEqual((root/name).read_bytes(), (ROOT/name).read_bytes())

    def test_changed_archive_refuses_before_any_output_is_written(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = root/exporter.ARCHIVE
            archive.parent.mkdir(parents=True)
            archive.write_bytes(b'unverified replacement')
            with patch.object(exporter, 'ROOT', root):
                with self.assertRaisesRegex(ValueError, 'archive changed'):
                    exporter.export()
            self.assertFalse((root/'web-assets').exists())


if __name__ == '__main__':
    unittest.main()
