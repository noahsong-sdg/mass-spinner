"""Independent admission mutations and unchanged-gate controls for V107."""
from contextlib import contextmanager, redirect_stdout
from copy import deepcopy
import gzip
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

import audit107 as review

sys.path.insert(0, str(review.ROOT/'scientific/coupled-v99'))
import test_audit99 as legacy
from heat106 import FVDiffusion
from flow import Flow


@contextmanager
def fixture():
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary); (root/'fields').mkdir()
        rn, zn, cfl = 16, 2, .1
        r, z = review.geometry(rn, zn)
        state = dict(radialEdgesM=r.tolist(), axialEdgesM=z.tolist(), cfl=cfl,
                     snapshots=[dict(timeS=t) for t in (0., 1e-6)])
        raw = json.dumps(state).encode(); packed = gzip.compress(raw, mtime=0)
        (root/'fields/state.json.gz').write_bytes(packed)
        row = dict(refinement=rn, radialRefinement=rn, axialRefinement=zn, cfl=cfl,
            nr=len(r)-1, nz=len(z)-1, maxDtS=1e-7, anodeCenterM=.07, completed=True,
            peakResidentKiB=600000, resourceBudgetKiB=1024**2,
            fieldPacket=dict(path='fields/state.json.gz', sha256=review.audit99.sha(packed),
                             rawSHA256=review.audit99.sha(raw)))
        fixed = dict(manifest={'fixed': 'apparatus'}, scenario={'fixed': 'initialization'})
        data = dict(schemaVersion=1, phase='preflight', timesS=[0., 1e-6],
            sourceSHA256={'scientific/frozen.py': 'frozen'}, inputSHA256=review.PINS,
            radialBalanceMethod=review.METHOD, baselinePredictionSHA256=review.audit99.BASELINE,
            targetVelocityRead=False, currentFitted=False, velocityFitted=False,
            conditionalRelease=True, experimentalQualification=False,
            originalGatesReplaced=False, originalFailuresSuperseded=False,
            workerExitCode=0, preflightPackets=[], resourceBudgetKiB=1024**2,
            cases=[row], **fixed)
        path = root/'predictions.json'; path.write_text(json.dumps(data))
        with patch.object(review.campaign, 'sources', return_value=data['sourceSHA256']):
            yield root, path, data, state, fixed


def replace_state(root, path, data, state):
    raw = json.dumps(state).encode(); packed = gzip.compress(raw, mtime=0)
    (root/'fields/state.json.gz').write_bytes(packed)
    data['cases'][0]['fieldPacket'].update(sha256=review.audit99.sha(packed),
                                          rawSHA256=review.audit99.sha(raw))
    path.write_text(json.dumps(data))


class AdmissionControls(unittest.TestCase):
    def test_independent_geometry_and_declared_jobs_budgets_match_frozen_plan(self):
        self.assertEqual(review.FULL_JOBS, review.campaign.FULL_JOBS)
        self.assertEqual(review.RESOURCE_BUDGET_KIB, review.campaign.RESOURCE_BUDGET_KIB)
        for rn, zn, _ in review.FULL_JOBS:
            for independent, actual in zip(review.geometry(rn, zn), review.campaign.geometry(rn, zn)):
                np.testing.assert_allclose(actual, independent, rtol=0, atol=1e-15)
        for n in (2, 4, 8):
            for coarse, fine in zip(review.geometry(n, n), review.geometry(2*n, 2*n)):
                np.testing.assert_array_equal(fine[::2], coarse)
        for pair in ((0, 2), (3, 2), (4., 2)):
            with self.assertRaisesRegex(ValueError, 'powers of two'):
                review.geometry(*pair)
        self.assertEqual({key for key, budget in review.RESOURCE_BUDGET_KIB.items()
                          if budget == 2*1024**2}, {(16, 4)})
        for phase, key in (('preflight', (4, 1, .1)), ('full', (32, 2, .1)),
                           ('unknown', (16, 2, .1))):
            with self.assertRaisesRegex(ValueError, 'Undeclared'):
                review.campaign.admit(phase, key, [])
        with self.assertRaisesRegex(ValueError, 'preflight is missing'):
            review.campaign.admit('full', (4, 2, .1), [])

    def test_stale_inputs_sources_clocks_and_changed_fitting_or_gate_claims_rejected(self):
        changes = dict(inputSHA256={}, sourceSHA256={}, timesS=[0., 2e-6],
            radialBalanceMethod='old-model', experimentalQualification=True,
            originalGatesReplaced=True, originalFailuresSuperseded=True,
            currentFitted=True, velocityFitted=True, targetVelocityRead=True,
            conditionalRelease=False, manifest={}, scenario={}, resourceBudgetKiB=2*1024**2)
        for key, value in changes.items():
            with self.subTest(key=key), fixture() as (root, path, data, _, fixed):
                changed = deepcopy(data); changed[key] = value
                path.write_text(json.dumps(changed))
                with self.assertRaises(ValueError):
                    review.load(path, fixed, root)

    def test_field_seals_and_resealed_geometry_clock_and_resource_drift_rejected(self):
        for defect in ('seal', 'geometry', 'clock', 'budget', 'rss'):
            with self.subTest(defect=defect), fixture() as (root, path, data, state, fixed):
                review.load(path, fixed, root)
                if defect == 'seal':
                    (root/'fields/state.json.gz').write_bytes(gzip.compress(b'changed'))
                else:
                    if defect == 'geometry':
                        state['radialEdgesM'][3] += 1e-7
                    elif defect == 'clock':
                        state['snapshots'][1]['timeS'] = 2e-6
                    elif defect == 'budget':
                        data['cases'][0]['resourceBudgetKiB'] *= 2
                    else:
                        data['cases'][0]['peakResidentKiB'] = 1024**2
                    replace_state(root, path, data, state)
                with self.assertRaises(ValueError):
                    review.load(path, fixed, root)

    def test_full_job_requires_genuine_same_source_preflight_and_unchanged_receipt(self):
        with fixture() as (root, path, data, state, fixed):
            core = root/'core.json'; core.write_bytes(path.read_bytes())
            data.update(phase='full', timesS=list(review.TIMES))
            state['snapshots'] = [dict(timeS=t) for t in review.TIMES]
            replace_state(root, path, data, state)
            with self.assertRaisesRegex(ValueError, 'preflight missing'):
                review.load(path, fixed, root)
            # Each preflight keeps its own archive, rather than pointing at
            # the full job's now differently clocked archive.
            pre = root/'pre'; (pre/'fields').mkdir(parents=True)
            original = json.loads(core.read_bytes())
            raw = json.dumps(dict(state, snapshots=[dict(timeS=t) for t in (0., 1e-6)])).encode()
            packed = gzip.compress(raw, mtime=0); (pre/'fields/state.json.gz').write_bytes(packed)
            original['cases'][0]['fieldPacket'].update(sha256=review.audit99.sha(packed),
                rawSHA256=review.audit99.sha(raw))
            core = pre/'predictions.json'; core.write_text(json.dumps(original))
            data['preflightPackets'] = [dict(path=str(core), sha256=review.audit99.sha(core.read_bytes()),
                job=[16, 2, .1], peakResidentKiB=600000, resourceBudgetKiB=1024**2)]
            path.write_text(json.dumps(data)); review.load(path, fixed, root)
            core.write_bytes(core.read_bytes()+b' ')
            with self.assertRaisesRegex(ValueError, 'Preflight seal'):
                review.load(path, fixed, root)

    def test_old_historical_bytes_and_forged_pass_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); original, radial = root/'original.json', root/'radial.json'
            original.write_text(json.dumps(dict(sourceSHA256={})))
            pin = review.audit99.sha(original.read_bytes())
            radial.write_text(json.dumps(dict(sourceSHA256={}, originalPredictionSHA256=pin,
                                             crossSummarySHA256='cross-seal')))
            pins = dict(original=pin, cross='cross-seal', radial=review.audit99.sha(radial.read_bytes()))
            old_audit = dict(predictionSHA256=pin, allRequiredNumericalPass=False, failures=[{}]*6)
            audit_path = root/'audit.json'; audit_path.write_text(json.dumps(old_audit))
            with patch.object(review, 'PINS', pins), patch.object(review, 'ORIGINAL_AUDIT',
                    review.audit99.sha(audit_path.read_bytes())):
                self.assertEqual(review.historical(original, radial, root)[2]['failures'], old_audit['failures'])
                original.write_bytes(original.read_bytes()+b' ')
                with self.assertRaisesRegex(ValueError, 'Stale historical'):
                    review.historical(original, radial, root)
                original.write_text(json.dumps(dict(sourceSHA256={})))
                old_audit['allRequiredNumericalPass'] = True
                audit_path.write_text(json.dumps(old_audit))
                with patch.object(review, 'ORIGINAL_AUDIT', review.audit99.sha(audit_path.read_bytes())):
                    with self.assertRaisesRegex(ValueError, 'failures must remain'):
                        review.historical(original, radial, root)


class ReusedAuditControls(unittest.TestCase):
    def legacy_fixture(self):
        helper = legacy.AuditControls('test_full_five_case_inventory_reconstructed')
        helper.setUp(); self.addCleanup(helper.doCleanups)
        return helper

    def test_default_and_explicit_original_layout_are_identical(self):
        helper = self.legacy_fixture(); original = helper.run_audit()
        explicit = review.audit99.audit(helper.out/'predictions.json', helper.root,
            jobs=review.audit99.JOBS, reporting_times=review.audit99.TIMES,
            comparison_groups=[('spatial', [(n, .1) for n in (1, 2, 4)]),
                               ('timestep', [(2, c) for c in (.2, .1, .05)])])
        self.assertEqual(original, explicit)
        self.assertTrue(original['allRequiredNumericalPass'])
        generated = review.audit99.audit(helper.out/'predictions.json', helper.root,
            comparison_groups=(group for group in [('spatial', [(n, .1) for n in (1, 2, 4)]),
                ('timestep', [(2, c) for c in (.2, .1, .05)])]))
        self.assertEqual(generated, original)
        path = helper.out/'predictions.json'; packet = json.loads(path.read_bytes())
        for row in packet['cases']:
            row['refinement'] = row['refinement']*100+2
        path.write_text(json.dumps(packet))
        encoded_jobs = {(n*100+2, c) for n, c in review.audit99.JOBS}
        mapped = review.audit99.audit(path, helper.root,
            expected_edges=lambda identifier: review.audit99.edges((identifier-2)//100),
            jobs=encoded_jobs, comparison_groups=[('spatial', [(n*100+2, .1) for n in (1, 2, 4)]),
                ('timestep', [(202, c) for c in (.2, .1, .05)])])
        self.assertTrue(mapped['allRequiredNumericalPass'])
        self.assertEqual(mapped['comparisons'], original['comparisons'])

    def test_empty_layout_is_pending_failure_and_no_threshold_parameter_exists(self):
        helper = self.legacy_fixture(); helper.run_audit()
        path = helper.out/'predictions.json'
        result = review.audit99.audit(path, helper.root, comparison_groups=[])
        self.assertFalse(result['allRequiredNumericalPass'])
        self.assertEqual(result['failures'], [dict(kind='missingComparison', context='layout',
                                                  value=None, limit=.05, passed=False)])
        for kwargs in (dict(reporting_times=[]), dict(reporting_times=[0.]),
                       dict(comparison_groups=[('axial', [(n, .1) for n in (1, 2, 4)])])):
            with self.assertRaises(ValueError):
                review.audit99.audit(path, helper.root, **kwargs)
        with self.assertRaises(TypeError):
            review.audit99.audit(path, helper.root, spatial_limit=.2)

    def test_repeated_spatial_layouts_distinguished_without_changed_values(self):
        helper = self.legacy_fixture(); original = helper.run_audit()
        group = ('spatial', [(n, .1) for n in (1, 2, 4)])
        result = review.audit99.audit(helper.out/'predictions.json', helper.root,
                                      comparison_groups=[group, group])
        rows = [row for row in original['comparisons'] if row['kind'] == 'spatial']
        for index in (0, 1):
            self.assertEqual([{k:v for k,v in row.items() if k != 'groupIndex'}
                for row in result['comparisons'] if row['groupIndex'] == index], rows)
            self.assertTrue(any(g['context'].startswith(f'spatial[{index}]/') for g in result['gates']))

    def test_genuine_snapshot_conservation_failure_stays_failure_with_layout_hook(self):
        helper = self.legacy_fixture()
        snapshot = helper.states[4, .1]['snapshots'][2]
        q = np.asarray(snapshot['q']); q[3] *= 1.01
        snapshot.update(q=q.tolist(), **{k:v.tolist() for k,v in
            review.audit99.primitive(*review.audit99.edges(4), q).items()})
        history = next(h for h in helper.states[4, .1]['history'] if h['timeS'] == snapshot['timeS'])
        history['maximumTemperatureK'] = float(np.max(snapshot['temperatureK']))
        failed = helper.run_audit()
        repeated = review.audit99.audit(helper.out/'predictions.json', helper.root,
            jobs=review.audit99.JOBS, reporting_times=review.audit99.TIMES)
        self.assertFalse(repeated['allRequiredNumericalPass'])
        self.assertEqual(repeated['failures'], failed['failures'])
        self.assertTrue(any(g['kind'] == 'snapshotAngular' for g in repeated['failures']))

    def test_progress_logging_branch_preserves_actual_state_and_every_receipt(self):
        flow = Flow([0., .01, .03, .06], [0., .08, .24], [39.948*1.66053906660e-27]*2,
                    noSlipWalls=True)
        q = flow.state(.001, 2900., .4, 100.)
        plain = FVDiffusion(flow, .000114)
        Wrapped = review.campaign.progress_diffusion(FVDiffusion, 0.)
        wrapped = Wrapped(flow, .000114); wrapped.progress_steps = 255
        expected, er = plain.advance(q, 1e-9)
        with redirect_stdout(io.StringIO()) as stream:
            actual, ar = wrapped.advance(q, 1e-9)
        self.assertIn('PROGRESS', stream.getvalue())
        np.testing.assert_array_equal(actual, expected)
        self.assertEqual(set(ar), set(er))
        for key in ar:
            np.testing.assert_equal(ar[key], er[key], err_msg=key)


if __name__ == '__main__':
    unittest.main(verbosity=2)
