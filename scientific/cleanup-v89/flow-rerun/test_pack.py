"""Actual compact-archive controls; run only inside safe-dev."""
import hashlib
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import pack


class PackingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir='/work/project')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.run, self.helper, self.source = [self.root/name for name in ('run', 'helper', 'source')]
        self.helper.mkdir()
        paths = {}
        for name, value in (('tracked', b'canonical'), ('changed', b'new bytes'), ('untracked', b'private fixture')):
            relative = 'scientific/'+name
            target = self.run/'v86'/relative
            target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(value)
            original = self.source/relative
            original.parent.mkdir(parents=True, exist_ok=True)
            original.write_bytes(b'old bytes' if name == 'changed' else value)
            paths[str(target.relative_to(self.run))] = pack.digest(target)
        (self.run/'source-closure.json').write_text(json.dumps(dict(fileSHA256={})))
        self.receipt = dict(physicalCampaignsComplete=True, allCommandsPassed=False, outputSHA256=paths)
        (self.run/'execution.json').write_text(json.dumps(self.receipt))
        self.tree = self.root/'tree.txt'
        canonical = self.source/'scientific/tracked'
        self.oid = pack.digest(canonical, git_blob=True)
        self.tree.write_bytes(('100644 blob '+self.oid+'\tscientific/tracked\0').encode())
        self.archive = self.root/'evidence.tar.gz'
        self.arguments = ['pack.py', '--run', str(self.run), '--helper', str(self.helper),
                          '--source', str(self.source), '--host-canonical', '/canonical',
                          '--git-tree', str(self.tree), '--repository-url', 'https://example.invalid/repo',
                          '--commit', 'a'*40, '--archive', str(self.archive)]

    def execute(self):
        with patch.object(sys, 'argv', self.arguments):
            pack.main()

    def test_only_exact_pinned_git_blob_is_deduplicated(self):
        self.execute()
        with tarfile.open(self.archive) as archive:
            names = archive.getnames()
            inventory = json.load(archive.extractfile('archive-inventory.json'))
            self.assertNotIn('run/v86/scientific/tracked', names)
            self.assertIn('run/v86/scientific/changed', names)
            self.assertIn('run/v86/scientific/untracked', names)
            recovered = inventory['recoveredExactBytes']
            self.assertEqual(len(recovered), 1)
            self.assertEqual(recovered[0]['gitBlobOID'], self.oid)
            self.assertEqual(recovered[0]['commit'], 'a'*40)
            self.assertEqual(recovered[0]['sha256'], hashlib.sha256(b'canonical').hexdigest())
            self.assertIs(inventory['allCommandsPassed'], False)
        sidecar = json.loads(Path(str(self.archive)+'.json').read_bytes())
        self.assertIs(sidecar['includedMemberHashesVerified'], True)
        self.assertEqual(sidecar['sha256'], pack.digest(self.archive))

    def test_changed_receipted_output_stops_export(self):
        (self.run/'v86/scientific/changed').write_bytes(b'mutated')
        with self.assertRaisesRegex(ValueError, 'Changed source/input/output'):
            self.execute()
        self.assertFalse(self.archive.exists())

    def test_incomplete_run_cannot_be_exported_as_complete(self):
        self.receipt['physicalCampaignsComplete'] = False
        (self.run/'execution.json').write_text(json.dumps(self.receipt))
        with self.assertRaisesRegex(ValueError, 'Incomplete run'):
            self.execute()
        self.assertFalse(self.archive.exists())

    def test_existing_archive_is_preserved(self):
        self.archive.write_bytes(b'unique evidence')
        with self.assertRaises(FileExistsError):
            self.execute()
        self.assertEqual(self.archive.read_bytes(), b'unique evidence')


if __name__ == '__main__':
    unittest.main()
