"""Run actual Snakemake/FiPy in temporary copies; execute only in safe-dev."""
import hashlib
from importlib.metadata import version
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import unittest

HERE = Path(__file__).resolve().parent
FILES = ('Snakefile','producer.py','assess.py','report.py','qualify.py','seals.py','admit.py',
         'config.json','PROTOCOL.md','requirements.txt','requirements-lock.txt')


class WorkflowTests(unittest.TestCase):
    receipts = {}
    output = HERE/'verification'/('run-'+str(time.time_ns()))

    @classmethod
    def tearDownClass(cls):
        out = cls.output
        out.mkdir(parents=True,exist_ok=True)
        record = dict(checks=cls.receipts, globalQualification=False,
            sourceSHA256={name: hashlib.sha256((HERE/name).read_bytes()).hexdigest()
                          for name in (*FILES,'test_workflow.py')},
            versions={name: version(name) for name in ('snakemake','FiPy','numpy','scipy')})
        (out/'receipts.json').write_text(json.dumps(record,indent=2)+'\n')

    def setUp(self):
        self.output.mkdir(parents=True,exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.work = Path(self.temporary.name)
        for name in FILES:
            shutil.copy2(HERE/name,self.work/name)
        self.count = 0

    def command(self, extra=()):
        return [sys.executable,'-m','snakemake','--cores','1','--executor','local',
                '--scheduler','greedy','--printshellcmds',*extra]

    def execute(self, command):
        result = subprocess.run(command,cwd=self.work,capture_output=True,text=True,timeout=180)
        out = self.output
        self.count += 1
        name = f'{self._testMethodName}-{self.count}.log'
        (out/name).write_text(json.dumps(command)+'\n'+result.stdout+result.stderr)
        return result

    def workflow(self):
        return self.execute(self.command())

    def passed(self):
        result = self.workflow()
        self.assertEqual(result.returncode,0,result.stderr)
        return next(self.work.glob('results/*/field.json'))

    def test_real_case_and_checker_cache(self):
        field = self.passed()
        before = (field.read_bytes(),field.stat().st_mtime_ns)
        code = self.work/'assess.py'
        code.write_text(code.read_text()+'\n# Checker-only mutation\n')
        self.assertEqual(self.workflow().returncode,0)
        self.assertEqual((field.read_bytes(),field.stat().st_mtime_ns),before)
        self.assertEqual(len(list(field.parent.glob('assessment-*.json'))),2)
        self.assertEqual(len(list(field.parent.glob('report-*.json'))),2)
        receipt = json.loads(next(field.parent.glob('qualification-*.json')).read_text())
        self.assertIs(receipt['globalQualification'],False)
        self.receipts['checkerMutation'] = dict(physicalBytesAndMtimeUnchanged=True,
            assessmentCount=2,reportCount=2,fieldSHA256=hashlib.sha256(before[0]).hexdigest())
        shutil.copytree(field.parent,self.output/'fine-control')

    def test_physical_input_invalidates_descendants(self):
        old = self.passed()
        before = (old.read_bytes(),old.stat().st_mtime_ns)
        config = self.work/'config.json'
        value = json.loads(config.read_text()); value['cells'] = 48
        config.write_text(json.dumps(value))
        self.assertEqual(self.workflow().returncode,0)
        fields = list(self.work.glob('results/*/field.json'))
        self.assertEqual(len(fields),2)
        self.assertEqual((old.read_bytes(),old.stat().st_mtime_ns),before)
        self.assertEqual(len(list(self.work.glob('results/*/qualification-*.json'))),2)
        self.receipts['physicalMutation'] = dict(caseCount=2,oldCaseRetained=True,
                                                descendantsInvalidated=True)

    def test_completed_scientific_failure_is_reported_and_rejected(self):
        config = self.work/'config.json'
        value = json.loads(config.read_text()); value.update(cells=8,steps=5)
        config.write_text(json.dumps(value))
        result = self.workflow()
        self.assertNotEqual(result.returncode,0)
        report_path = next(self.work.glob('results/*/report-*.json'))
        report = json.loads(report_path.read_text())
        self.assertEqual(report['assessment']['assessment'],'gate_fail')
        self.assertFalse(list(self.work.glob('results/*/qualification-*.json')))
        self.receipts['scientificFailure'] = dict(reportRetained=True,
            qualificationExitCode=result.returncode,assessment=report['assessment'])
        shutil.copytree(report_path.parent,self.output/'coarse-negative-control')

    def test_stale_artifact_admission(self):
        field = self.passed()
        audit = next(field.parent.glob('assessment-*.json'))
        report = next(field.parent.glob('report-*.json'))
        for path,command in (
            (field,[sys.executable,'report.py',str(field),str(audit),'rejected.json']),
            (audit,[sys.executable,'report.py',str(field),str(audit),'rejected.json']),
            (report,[sys.executable,'qualify.py',str(report),'rejected.json'])):
            saved = path.read_bytes()
            path.write_bytes(saved+b'\n')
            result = self.execute(command)
            self.assertNotEqual(result.returncode,0)
            self.assertIn('Corrupt sealed artifact',result.stderr)
            self.assertFalse((self.work/'rejected.json').exists())
            path.write_bytes(saved)
        self.receipts['corruption'] = dict(fieldRejected=True,auditRejected=True,reportRejected=True)

    def test_execution_error_does_not_become_scientific_failure(self):
        code = self.work/'assess.py'
        code.write_text('raise RuntimeError("injected execution failure")\n'+code.read_text())
        result = self.workflow()
        self.assertNotEqual(result.returncode,0)
        self.assertIn('injected execution failure',result.stderr)
        self.assertFalse(list(self.work.glob('results/*/report-*.json')))
        self.receipts['executionError'] = dict(exitCode=result.returncode,reportNotProduced=True)

    def test_cached_qualification_is_still_admitted(self):
        field = self.passed()
        qualification = next(field.parent.glob('qualification-*.json'))
        stat = qualification.stat()
        qualification.write_bytes(qualification.read_bytes()+b'\n')
        os.utime(qualification,ns=(stat.st_atime_ns,stat.st_mtime_ns))
        result = self.workflow()
        self.assertNotEqual(result.returncode,0)
        self.assertIn('Corrupt sealed artifact',result.stderr)
        self.receipts['cachedFinalCorruption'] = dict(exitCode=result.returncode,
                                                    unchangedMtimeCorruptionRejected=True)

    def test_real_interruption_resumes_completed_physics(self):
        code = self.work/'assess.py'; original = code.read_text()
        code.write_text('import time\nfrom pathlib import Path\n'
            'Path("audit-started").write_text("started")\ntime.sleep(30)\n'+original)
        with tempfile.TemporaryFile(mode='w+t') as log:
            process = subprocess.Popen(self.command(),cwd=self.work,stdout=log,stderr=log,
                                       text=True,start_new_session=True)
            deadline = time.monotonic()+120
            while not (self.work/'audit-started').exists() and process.poll() is None and time.monotonic()<deadline:
                time.sleep(.05)
            try:
                self.assertTrue((self.work/'audit-started').exists())
                field = next(self.work.glob('results/*/field.json'))
                before = (field.read_bytes(),field.stat().st_mtime_ns)
            finally:
                if process.poll() is None:
                    os.killpg(process.pid,signal.SIGTERM)
                process.wait(timeout=30)
                log.seek(0)
                (self.output/'interruption.log').write_text(log.read())
        code.write_text(original)
        self.assertEqual(self.workflow().returncode,0)
        self.assertEqual((field.read_bytes(),field.stat().st_mtime_ns),before)
        self.receipts['interruption'] = dict(processExitCode=process.returncode,
            resumed=True,completedPhysicalBytesAndMtimeUnchanged=True)


if __name__ == '__main__':
    unittest.main(verbosity=2)
