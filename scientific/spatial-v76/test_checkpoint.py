import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import parallel_study as runner


class PersistentCheckpoint(unittest.TestCase):
    def test_project_source_replacement_cannot_delete_the_retained_checkpoint(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project, retained = root/'project.json', root/'retained.json'
            report = dict(cases=[dict(nr=96, nz=96, nt=512)])
            with patch.object(runner, 'hashes', return_value={'sealed': 'source'}):
                runner.save_checkpoint(report, project, {'sealed': 'source'}, retained)
            self.assertEqual(project.read_bytes(), retained.read_bytes())
            project.unlink()  # The operation which previously lost results.
            self.assertEqual(json.loads(retained.read_text()), report)

    def test_failed_project_write_still_preserves_the_new_checkpoint(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            retained, project = root/'retained.json', root/'missing'/'project.json'
            with patch.object(runner, 'hashes', return_value={'sealed': 'source'}):
                with self.assertRaises(FileNotFoundError):
                    runner.save_checkpoint({'cases': ['completed']}, project, {'sealed': 'source'}, retained)
            self.assertEqual(json.loads(retained.read_text())['cases'], ['completed'])

    def test_stale_source_ephemeral_path_and_existing_backup_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            retained = root/'retained.json'
            with patch.object(runner, 'BACKUP_ROOT', root/'persistent'):
                with self.assertRaises(ValueError):
                    runner.check_backup(retained)
                valid = root/'persistent'/'new.json'
                runner.check_backup(valid)
                valid.parent.mkdir()
                valid.write_text('valuable data')
                with self.assertRaises(ValueError):
                    runner.check_backup(valid)
            with patch.object(runner, 'hashes', return_value={'changed': 'source'}):
                with self.assertRaises(AssertionError):
                    runner.save_checkpoint({}, root/'project.json', {'sealed': 'source'}, retained)
            self.assertFalse(retained.exists())


if __name__ == '__main__':
    unittest.main()
