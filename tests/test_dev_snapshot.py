"""The host preparation utility copies bytes; it never executes project inputs."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[1] / 'scripts/dev-snapshot.py'
spec = importlib.util.spec_from_file_location('dev_snapshot', MODULE)
snapshot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(snapshot)


class DevSnapshotTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name) / 'source'
        self.root.mkdir()
        self.destination = self.root.parent / 'inputs'
        self.git('init', '-q')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Test')
        self.write('package-lock.json', '{}\n')
        self.write('src/model.ts', 'export const n=1;\n')
        self.write('scientific/old-campaign/unique.txt', 'irreplaceable evidence\n')
        self.git('add', '.')
        self.git('commit', '-qm', 'fixture')

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.root), *args]).decode().strip()

    def write(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value)

    def test_working_inputs_preserve_real_revision_without_copying_history(self):
        self.write('src/model.ts', 'export const n=2;\n')
        self.write('tests/new.test.ts', 'new regression\n')
        self.write('LAURELIN-MODEL.md', 'required by the Laurelin UI import\n')
        self.write('src/.env.local', 'credential')
        self.write('docs/private.key', 'credential')
        self.write('docs/.ssh/config', 'credential')
        result = snapshot.build(self.root, self.destination)
        self.assertEqual(result['sourceRevision'], self.git('rev-parse', 'HEAD'))
        self.assertEqual((self.destination / 'src/model.ts').read_text(), 'export const n=2;\n')
        self.assertTrue((self.destination / 'tests/new.test.ts').exists())
        self.assertEqual((self.destination / 'LAURELIN-MODEL.md').read_text(), 'required by the Laurelin UI import\n')
        for name in ('.git', 'scientific/old-campaign', 'src/.env.local', 'docs/private.key', 'docs/.ssh'):
            self.assertFalse((self.destination / name).exists())
        self.assertEqual((self.root / 'scientific/old-campaign/unique.txt').read_text(), 'irreplaceable evidence\n')
        self.assertEqual(result['lockSHA256'], hashlib.sha256(b'{}\n').hexdigest())
        self.assertEqual(snapshot.verify(self.destination), result)
        with self.assertRaisesRegex(ValueError, 'new destination'):
            snapshot.build(self.root, self.destination)

    def test_changed_input_and_stale_manifest_refuse_verification(self):
        snapshot.build(self.root, self.destination)
        (self.destination / 'src/model.ts').write_text('tampered')
        with self.assertRaisesRegex(ValueError, 'Input changed'):
            snapshot.verify(self.destination)
        manifest = self.destination / snapshot.MANIFEST
        data = json.loads(manifest.read_text())
        data['schemaVersion'] = 0
        manifest.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, 'Unsupported'):
            snapshot.verify(self.destination)

    def test_unlisted_source_and_test_files_refuse_verification(self):
        snapshot.build(self.root, self.destination)
        for name in ('src/extra.ts', 'tests/extra.test.ts', '.env.local'):
            with self.subTest(name=name):
                path = self.destination / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('unmanifested input')
                with self.assertRaisesRegex(ValueError, 'Input inventory changed'):
                    snapshot.verify(self.destination)
                path.unlink()
        (self.destination / 'extra').symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            snapshot.verify(self.destination)

    def test_link_to_external_input_is_rejected_before_destination_creation(self):
        (self.root / 'src/link.ts').symlink_to(self.root / 'package-lock.json')
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            snapshot.build(self.root, self.destination)
        self.assertFalse(self.destination.exists())
        with self.assertRaisesRegex(ValueError, 'outside'):
            snapshot.build(self.root, self.root.parent / 'source/../source/nested')

    def test_size_limit_fails_before_destination_creation(self):
        old = snapshot.LIMIT
        self.addCleanup(setattr, snapshot, 'LIMIT', old)
        snapshot.LIMIT = 1
        with self.assertRaisesRegex(ValueError, '512 MiB'):
            snapshot.build(self.root, self.destination)
        self.assertFalse(self.destination.exists())


if __name__ == '__main__':
    unittest.main()
