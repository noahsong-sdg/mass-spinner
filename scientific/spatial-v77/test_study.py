from copy import deepcopy
import json
from pathlib import Path
import sys
import tempfile
import unittest
import numpy as np
import study

sys.path.insert(0, str(study.SOURCE))
from test_analyze import case, manifest
from verify import OBS


def constant(k, speed=1.):
    t = case(*k[:3], mode=k[3])
    for e in t['cases']:
        q = np.asarray(e['q'])
        q[2] = q[0]*speed
        q[4] += .5*q[0]*speed**2
        e['q'] = q.tolist()
        e['observables'] = {name: 1. for name in OBS}
    return t


class IsolatedRefinement(unittest.TestCase):
    def test_mixed_space_time_comparison_can_falsely_cancel_errors(self):
        lookup = {k: constant(k, 2. if k in study.REUSED else 1.) for k in (*study.NEW, *study.REUSED)}
        # The previous combined 48/256 -> 96/512 difference vanishes.
        combined = study.compare(lookup[study.REUSED[0]], lookup[study.REUSED[1]], manifest(), True)
        self.assertTrue(all(row['passed'] for row in combined))
        # Fixed-time space and fixed-grid time comparisons expose both errors.
        result = study.evaluations(lookup, manifest())
        for row in result.values():
            self.assertFalse(row['passed'])
            self.assertFalse(row['spatial'][0][0]['passed'])
            self.assertFalse(row['temporal'][0]['passed'])

    def test_identical_fields_pass_all_315_gates_per_metric(self):
        result = study.evaluations({k: constant(k) for k in (*study.NEW, *study.REUSED)}, manifest())
        for row in result.values():
            self.assertTrue(row['passed'])
            self.assertEqual(len(row['gates']), 315)
            self.assertEqual(len({g['name'] for g in row['gates']}), 315)

    def test_mixed_timestep_cannot_substitute_for_fixed_timestep_reference(self):
        lookup = {k: constant(k) for k in (*study.NEW, *study.REUSED)}
        del lookup[study.NEW[1]]
        with self.assertRaisesRegex(AssertionError, 'Missing fixed-timestep'):
            study.evaluations(lookup, manifest())
        lookup[study.NEW[1]] = lookup[study.REUSED[1]]
        with self.assertRaisesRegex(AssertionError, 'Wrong comparison resolution'):
            study.evaluations(lookup, manifest())

    def test_projection_budget_retains_the_unresolved_velocity_wave(self):
        coarse, fine = constant((2, 2, 32, 'base'), 0.), constant((2, 64, 32, 'base'), 0.)
        z = np.asarray(fine['setup']['z'])
        wave = (np.cos(4*np.pi*z[:-1]/z[-1])-np.cos(4*np.pi*z[1:]/z[-1]))/(4*np.pi*np.diff(z)/z[-1])
        for e in fine['cases']:
            q = np.asarray(e['q'])
            q[2] = q[0]*wave[:, None]
            q[4] += .5*q[0]*wave[:, None]**2
            e['q'] = q.tolist()
        for row in study.projection_budget(coarse, fine, manifest()):
            self.assertLess(row['normalizedResolvedRms'], 1e-14)
            self.assertGreater(row['normalizedUnresolvedRms'], .70)
            self.assertAlmostEqual(row['normalizedTotalRms'], row['normalizedUnresolvedRms'], delta=1e-14)
            self.assertLess(row['closureResidualM2S2'], 1e-14)

    def test_stale_baseline_plan_runtime_and_relaxed_limits_rejected(self):
        m = json.loads((study.SOURCE/'manifest.json').read_text())
        raw = dict(manifest=m, sourceHashes=study.hashes(), preRunRuntime=study.runtime(), failures=[],
            cases=[dict(zip(('nr', 'nz', 'nt', 'mode'), k)) for k in study.requests(m)])
        with tempfile.TemporaryDirectory() as directory:
            base, plan = [Path(directory)/n for n in ('base.json', 'plan.json')]
            study.write(base, raw)
            original = study.freeze(base, plan)
            study.bind(base, plan)
            for field, value in (('schemaVersion', 0), ('limits', dict(study.LIMITS, local=.06)),
                ('new', [[64, 64, 256, 'base'], [96, 96, 512, 'base']]),
                ('producerSourceHashes', {}), ('extensionSourceSha256', 'old'),
                ('commonMetricSha256', 'old'), ('baselineSha256', 'old')):
                bad = deepcopy(original)
                bad[field] = value
                study.write(plan, bad)
                with self.assertRaises(AssertionError):
                    study.bind(base, plan)
            study.write(plan, original)
            for field, value in (('sourceHashes', {}), ('preRunRuntime', dict(study.runtime(), numpy='old')),
                                  ('cases', raw['cases'][:-1])):
                bad = deepcopy(raw)
                bad[field] = value
                study.write(base, bad)
                with self.assertRaises(AssertionError):
                    study.bind(base, plan)

    def test_output_cannot_double_as_persistent_backup(self):
        with tempfile.TemporaryDirectory(dir='/work/home') as directory:
            path = Path(directory)/'shared-checkpoint.json'
            with self.assertRaisesRegex(AssertionError, 'must be distinct'):
                study.produce(Path('unused'), Path('unused-plan'), path, path)

    def test_signed_observable_budget_exposes_cancellation_and_zero_difference(self):
        a, b, c = [constant(k) for k in (study.REUSED[0], study.NEW[1], study.REUSED[1])]
        for row in study.observable_budget(a, b, c):
            self.assertTrue(all(v['cancellationFraction'] is None for v in row['observables'].values()))
        for t, value in ((a, 2.), (b, 1.), (c, 2.)):
            for e in t['cases']:
                e['observables'] = {name: value for name in OBS}
        for row in study.observable_budget(a, b, c):
            for v in row['observables'].values():
                self.assertEqual(v['spatialNormalized'], .5)
                self.assertEqual(v['temporalNormalized'], -.5)
                self.assertEqual(v['combinedNormalized'], 0.)
                self.assertEqual(v['cancellationFraction'], 1.)


if __name__ == '__main__':
    unittest.main()
