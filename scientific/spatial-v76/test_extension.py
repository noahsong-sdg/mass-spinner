from copy import deepcopy
from importlib.metadata import version
import json
from pathlib import Path
import platform
import tempfile
import unittest

from resolution_extension import extended_manifest, inputs, SOURCE, digest, hashes, requests, requested


class SamplingExtension(unittest.TestCase):
    def setUp(self):
        self.base = json.loads((SOURCE/'manifest.json').read_text())
        self.plan = json.loads(Path(__file__).with_name('refinement-plan-03.json').read_text())
        self.plan['baseManifestSha256'] = digest(SOURCE/'manifest.json')
        reference = self.base['joint'][-1]
        for name in ('spatial', 'radial', 'axial'):
            old = self.base[name][-1]
            self.plan['levels'][name] = [(a+b)//2 if a != b else a for a, b in zip(old, reference)]
            self.plan['levels'][name][2] = old[2]

    def test_only_adds_samples_and_retains_every_original_trajectory(self):
        saved = deepcopy(self.base)
        new = extended_manifest(self.base, self.plan)
        self.assertEqual(self.base, saved)
        self.assertEqual(requested(new)-requested(saved),
            {(*level, 'base') for level in self.plan['levels'].values()})
        self.assertTrue(requested(saved) < requested(new))
        for name in ('spatial', 'radial', 'axial'):
            self.assertEqual(new[name][:-1], saved[name])
        for name in set(saved)-{'spatial', 'radial', 'axial'}:
            self.assertEqual(new[name], saved[name])

    def test_cannot_relax_gates_change_time_or_change_uncontrolled_direction(self):
        for name, value in (('limits', dict(rms=.03, local=.05, observable=.02)),
                             ('schemaVersion', 0), ('levels', dict(self.plan['levels'], axial=[36, 36, 256])),
                             ('levels', dict(self.plan['levels'], radial=[36, 48, 128])),
                             ('levels', dict(self.plan['levels'], spatial=[48, 48, 256]))):
            plan = deepcopy(self.plan)
            plan[name] = value
            with self.assertRaises(AssertionError):
                extended_manifest(self.base, plan)

    def test_reused_data_requires_original_manifest_source_runtime_and_plan(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            base_path, plan_path = root/'base.json', root/'plan.json'
            report = dict(manifest=self.base, sourceHashes=hashes(), failures=[],
                preRunRuntime=dict(python=platform.python_version(), numpy=version('numpy'),
                    scipy=version('scipy'), fipy=version('fipy')),
                cases=[dict(zip(('nr', 'nz', 'nt', 'mode'), k)) for k in requests(self.base)])
            base_path.write_text(json.dumps(report))
            plan_path.write_text(json.dumps(self.plan))
            inputs(base_path, plan_path)
            for field, value in (('manifest', {'schemaVersion': 0}), ('sourceHashes', {'flow.py': 'old'}),
                                 ('preRunRuntime', {'numpy': 'old'}), ('cases', report['cases'][:-1])):
                bad = deepcopy(report)
                bad[field] = value
                base_path.write_text(json.dumps(bad))
                with self.assertRaises(AssertionError):
                    inputs(base_path, plan_path)
            base_path.write_text(json.dumps(report))
            bad_plan = deepcopy(self.plan)
            bad_plan['baseManifestSha256'] = 'old'
            plan_path.write_text(json.dumps(bad_plan))
            with self.assertRaisesRegex(AssertionError, 'Stale'):
                inputs(base_path, plan_path)


if __name__ == '__main__':
    unittest.main()
