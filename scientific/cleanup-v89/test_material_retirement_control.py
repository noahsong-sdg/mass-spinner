"""Synthetic transfer controls; run only inside a root-authorized safe-dev VM."""
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tarfile
import tempfile
import unittest

import material_retirement_control as control


class MaterialTransferControls(unittest.TestCase):
    def fixture(self,root,name,payload):
        path=root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(payload)
        path.chmod(0o640);metadata=path.stat()
        return dict(path=path.relative_to('/work').as_posix(),size=len(payload),
                    sha256=hashlib.sha256(payload).hexdigest(),mode=stat.S_IMODE(metadata.st_mode),mtimeNS=metadata.st_mtime_ns)

    def archive(self,rows,payloads):
        result=io.BytesIO()
        with tarfile.open(fileobj=result,mode='w',format=tarfile.GNU_FORMAT) as archive:
            for row,payload in zip(rows,payloads):
                member=tarfile.TarInfo(row['path']);member.size=len(payload);member.mode=row['mode']
                archive.addfile(member,io.BytesIO(payload))
        return result.getvalue()

    def test_batch_budget_groups_many_small_files_without_one_launch_per_file(self):
        rows=[dict(path='project/'+str(i),size=1024) for i in range(1000)]
        groups=list(control.batches(rows))
        self.assertEqual(len(groups),1)
        self.assertEqual(groups[0],rows)
        boundary=[dict(path='project/'+str(i),size=control.CAP//3) for i in range(6)]
        groups=list(control.batches(boundary))
        self.assertEqual(len(groups),3)
        self.assertTrue(all(sum(r['size']+4096+len(r['path'].encode()) for r in g)+20480<=control.CAP for g in groups))

    def test_real_guest_tar_roundtrip_with_empty_unicode_and_long_paths(self):
        with tempfile.TemporaryDirectory(dir='/work/project') as tmp:
            root=Path(tmp);payloads=[b'',b'\x00raw bytes\xff'*100,b'long name']
            rows=[self.fixture(root,name,data) for name,data in zip(('empty','ion-\u03bb.bin','long/'+'x'*150),payloads)]
            run=subprocess.run([sys.executable,'-I','-c',control.BATCH],input=json.dumps(rows).encode(),capture_output=True)
            self.assertEqual(run.returncode,0,run.stderr.decode())
            self.assertLessEqual(len(run.stdout),control.CAP)
            with tarfile.open(fileobj=io.BytesIO(run.stdout),mode='r:') as archive:
                control.check_tar(archive,rows)
            self.assertEqual([control.digest(root/name) for name in ('empty','ion-\u03bb.bin','long/'+'x'*150)], [r['sha256'] for r in rows])

    def test_changed_size_and_symlink_are_rejected_by_actual_guest_helper(self):
        with tempfile.TemporaryDirectory(dir='/work/project') as tmp:
            root=Path(tmp);row=self.fixture(root,'original',b'preserve')
            for changed in (dict(row,size=row['size']+1),dict(row,path=(root/'alias').relative_to('/work').as_posix())):
                if not (root/'alias').exists():(root/'alias').symlink_to(root/'original')
                run=subprocess.run([sys.executable,'-I','-c',control.BATCH],input=json.dumps([changed]).encode(),capture_output=True)
                self.assertNotEqual(run.returncode,0)
            self.assertEqual((root/'original').read_bytes(),b'preserve')

    def test_tar_validator_rejects_corruption_extra_member_and_changed_mode(self):
        row=dict(path='project/evidence',size=4,sha256=hashlib.sha256(b'keep').hexdigest(),mode=0o640)
        cases=[self.archive([row],[b'fail']),self.archive([row,row],[b'keep',b'keep']),
               self.archive([dict(row,mode=0o600)],[b'keep'])]
        for data in cases:
            with tarfile.open(fileobj=io.BytesIO(data),mode='r:') as archive:
                with self.assertRaises(AssertionError):control.check_tar(archive,[row])

    def test_chunk_helper_reconstructs_exact_bounded_slice(self):
        with tempfile.TemporaryDirectory(dir='/work/project') as tmp:
            root=Path(tmp);row=self.fixture(root,'large',b'abcdefghij')
            run=subprocess.run([sys.executable,'-I','-c',control.CHUNK,row['path'],'3','4',str(row['size']),str(row['mtimeNS'])],capture_output=True)
            self.assertEqual(run.returncode,0,run.stderr.decode())
            self.assertEqual(run.stdout,b'defg')
            invalid=subprocess.run([sys.executable,'-I','-c',control.CHUNK,row['path'],'9','4',str(row['size']),str(row['mtimeNS'])],capture_output=True)
            self.assertNotEqual(invalid.returncode,0)


if __name__=='__main__':
    if sys.platform!='linux' or os.getuid()!=1000:
        raise SystemExit('Run only inside the authorized nonroot safe-dev guest')
    unittest.main()
