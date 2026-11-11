"""Provenance admission tests use synthetic bookkeeping, not physics evidence."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from verify_results import PRODUCERS, NEGATIVES, PUBLICATION_DEPENDENCIES, digest, verify


class ProvenanceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root/'scientific/coupled-axial-v74'
        self.source.mkdir(parents=True)
        (self.root/'src').mkdir()
        for name in (*PRODUCERS, 'static_current.py'):
            (self.source/name).write_text('synthetic producer bytes: '+name)
        (self.root/'src/fuel-current.ts').write_text('synthetic current bytes')
        for name in PUBLICATION_DEPENDENCIES:
            path = self.root/name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('synthetic dependency bytes: '+name)
        manifest = {'schema': 'v74-test', 'timesS': [.001, .004], 'outerVoltageProfile': 'sin(pi*z/L)',
                    **{name: [[2, 2]] for name in ('joint', 'spatial', 'temporal', 'radial', 'axial')},
                    'referenceSmallerDt': [2, 2, 2], 'referenceSpatial': [2, 2, 2], 'tighterTolerance': [2, 2],
                    'independentTolerances': ['linear', 'thermal']}
        (self.source/'manifest.json').write_text(json.dumps(manifest))
        metrics = {'residual': 0., 'exchange': 1.}
        setup = {'r': [0., .03, .06], 'wall': [.06, .0615, .063], 'z': [0., .07, .14],
                 'rho': [.001]*4, 'contactH': 100., 'coolingH': 100., 'bathK': 400.,
                 'walls': {'outer': 0., 'lower': 0., 'upper': 0.}}
        setup['electrical'] = {'radialEdgesM': setup['r'].copy(), 'axialEdgesM': setup['z'].copy(),
            'sigmaPerpSM': [.03]*4, 'sigmaParallelSM': [.3]*4, 'magneticT': .2,
            'innerVoltageV': [None]*2, 'outerVoltageV': [2.8]*2, 'lowerVoltageV': [0.]*2, 'upperVoltageV': [0.]*2}
        props = {key: [value]*4 for key, value in [('mu', 1e-5), ('k', .02), ('solidK', 150.), ('solidCp', 150.), ('solidH', 1e5)]}
        case = {'setup': setup, 'dtS': .002, 'oldOmegaRadS': [900.]*4, 'oldTemperatureK': [400., 400., 600., 600.]*2,
                'props': deepcopy(props), 'oldProps': deepcopy(props), 'result': {
                    'temperatureK': [400., 400., 600., 600.]*2,
                    'mechanical': {'omegaRadS': [899.]*4, 'currentOmegaRadS': [899.]*4}}}
        trajectory = {'n': 2, 'nz': 2, 'nt': 2, 'independentStepChecks': [
            {'step': step, 'metrics': deepcopy(metrics)} for step in (1, 2)],
            'cases': [dict(deepcopy(case), timeS=time) for time in manifest['timesS']]}
        trajectories = [dict(deepcopy(trajectory), tight=mode) for mode in (False, True, 'linear', 'thermal')]
        raw = {'manifest': deepcopy(manifest), 'failures': [], 'cases': trajectories,
               'sourceHashes': {name: digest(self.source/name) for name in PRODUCERS}}
        paths = [self.root/'src/fuel-current.ts', *[self.source/name for name in ('bridge.py', 'bridge.ts', 'static_current.py', 'manifest.json')]]
        static = {'manifest': deepcopy(manifest), 'passed': True, 'failures': [], 'gates': [{'passed': True}],
                  'sourceHashes': {str(path.relative_to(self.root)): digest(path) for path in paths}}
        independent = {'passed': True, 'failures': [], 'inputFailures': [],
                       'cases': [{'index': i, 'checks': deepcopy(metrics)} for i in range(8)],
                       'negativeControls': [{'name': name, 'rejected': True} for name in sorted(NEGATIVES)]}
        convergence = {'manifest': deepcopy(manifest), 'numericallyQualified': True,
                       'staticCurrentPassed': True, 'electricalBoundaryAdmissible': True, 'requirementsGaps': [],
                       'series': {name: {'passed': True, 'gates': [{'passed': True}]} for name in ('joint', 'spatial', 'temporal', 'radial', 'axial')},
                       'independentTolerances': {name: {'passed': True} for name in ('linear', 'thermal')}}
        convergence.update({name: {'passed': True} for name in ('tighterTolerance', 'referenceSmallerDt', 'referenceSpatial')})
        self.records = dict(raw=raw, static=static, independent=independent, convergence=convergence)
        static_path = self.source/'static.json'
        static_path.write_text(json.dumps(static))
        raw['sourceHashes'][static_path.name] = digest(static_path)
        raw_path = self.source/'raw.json'
        raw_path.write_text(json.dumps(raw))
        independent['inputHashes'] = {raw_path.name: digest(raw_path)}
        convergence['inputHashes'] = {raw_path.name: digest(raw_path), static_path.name: digest(static_path)}

    def admit(self):
        paths = {}
        for key, record in self.records.items():
            paths[key] = self.source/(key+'.json')
            paths[key].write_text(json.dumps(record))
        return verify(paths, self.source, self.root)

    def test_complete_matching_snapshot(self):
        receipt = self.admit()
        self.assertTrue(receipt['passed'])
        self.assertEqual(receipt['scheduledCaseCount'], 8)
        self.assertEqual(receipt['stepCount'], 8)
        self.assertEqual(set(receipt['artifactHashes']), set(self.records))
        self.assertEqual(set(receipt['publicationSnapshotDependencyHashes']), set(PUBLICATION_DEPENDENCIES))
        self.assertIn('no pre-run', receipt['publicationSnapshotScope'])

    def test_one_stale_kernel_byte_rejected(self):
        with (self.source/'thermal.py').open('a') as stream:
            stream.write('x')
        with self.assertRaisesRegex(AssertionError, 'producer hash'):
            self.admit()

    def test_missing_static_source_hash_rejected(self):
        self.records['static']['sourceHashes'].pop('src/fuel-current.ts')
        with self.assertRaisesRegex(AssertionError, 'static hash'):
            self.admit()

    def test_missing_accepted_step_rejected(self):
        self.records['raw']['cases'][0]['independentStepChecks'].pop()
        with self.assertRaisesRegex(AssertionError, 'step checks'):
            self.admit()

    def test_nonfinite_accepted_step_metrics_rejected(self):
        self.records['raw']['cases'][0]['independentStepChecks'][0]['metrics']['residual'] = float('nan')
        with self.assertRaisesRegex(AssertionError, 'per-step metrics'):
            self.admit()

    def test_failed_corruption_control_rejected(self):
        self.records['independent']['negativeControls'][0]['rejected'] = False
        with self.assertRaisesRegex(AssertionError, 'corruption controls'):
            self.admit()

    def test_missing_corruption_control_rejected(self):
        self.records['independent']['negativeControls'].pop()
        with self.assertRaisesRegex(AssertionError, 'corruption controls'):
            self.admit()

    def test_pre_migration_manifest_rejected(self):
        self.records['raw']['manifest'].pop('schema')
        with self.assertRaisesRegex(AssertionError, 'manifest'):
            self.admit()

    def test_qualified_flag_cannot_hide_failed_refinement_gate(self):
        self.records['convergence']['series']['joint']['gates'][0]['passed'] = False
        with self.assertRaisesRegex(AssertionError, 'Refinement gate'):
            self.admit()

    def test_duplicate_audit_case_cannot_replace_missing_case(self):
        self.records['independent']['cases'][1]['index'] = 0
        with self.assertRaisesRegex(AssertionError, 'case index'):
            self.admit()

    def test_producer_failure_cannot_hide_behind_green_audits(self):
        self.records['raw']['failures'].append({'error': 'retained failure'})
        with self.assertRaisesRegex(AssertionError, 'Producer failures'):
            self.admit()

    def test_complete_present_cases_cannot_hide_missing_required_trajectory(self):
        self.records['raw']['cases'].pop()
        with self.assertRaisesRegex(AssertionError, 'required trajectory'):
            self.admit()

    def test_static_artifact_must_match_producer_bound_bytes(self):
        self.records['static']['extraReceipt'] = 'different bytes, unchanged green flags'
        with self.assertRaisesRegex(AssertionError, 'producer-bound artifact'):
            self.admit()

    def first_case(self):
        return self.records['raw']['cases'][0]['cases'][0]

    def test_primitive_timestep_boundary(self):
        for value in (0., -1., True, float('nan')):
            with self.subTest(value=value):
                self.first_case()['dtS'] = value
                with self.assertRaisesRegex(AssertionError, 'primitive timestep'):
                    self.admit()

    def test_negative_density_and_conductivity_rejected(self):
        case = self.first_case()
        case['setup']['rho'][0] = -1.
        with self.assertRaisesRegex(AssertionError, 'primitive rho'):
            self.admit()
        case['setup']['rho'][0] = .001
        case['setup']['electrical']['sigmaPerpSM'][0] = 0.
        with self.assertRaisesRegex(AssertionError, 'primitive sigmaPerpSM'):
            self.admit()

    def test_noncontiguous_and_unordered_grid_rejected(self):
        case = self.first_case()
        case['setup']['wall'][0] += .0001
        with self.assertRaisesRegex(AssertionError, 'contiguity'):
            self.admit()
        case['setup']['wall'][0] = case['setup']['r'][-1]
        case['setup']['z'][1] = 0.
        with self.assertRaisesRegex(AssertionError, 'ordered z'):
            self.admit()

    def test_electrical_and_thermal_grid_mismatch_rejected(self):
        self.first_case()['setup']['electrical']['radialEdgesM'][1] += .001
        with self.assertRaisesRegex(AssertionError, 'grid mismatch'):
            self.admit()

    def test_negative_and_boolean_films_rejected(self):
        for value in (-1., True):
            with self.subTest(value=value):
                self.first_case()['setup']['contactH'] = value
                with self.assertRaisesRegex(AssertionError, 'primitive contactH'):
                    self.admit()

    def test_primitive_field_length_and_temperature_domain(self):
        case = self.first_case()
        case['result']['mechanical']['currentOmegaRadS'].pop()
        with self.assertRaisesRegex(AssertionError, 'primitive angular speed'):
            self.admit()
        case['result']['mechanical']['currentOmegaRadS'].append(899.)
        case['result']['temperatureK'][2] = 1901.
        with self.assertRaisesRegex(AssertionError, 'temperature outside'):
            self.admit()

    def test_green_audits_cannot_be_reused_after_raw_bytes_change(self):
        self.records['raw']['unusedSummary'] = 'changed bytes, same manifest and valid domains'
        with self.assertRaisesRegex(AssertionError, 'Independent input artifact binding'):
            self.admit()

    def test_convergence_cannot_be_reused_when_only_independent_audit_is_fresh(self):
        raw = self.records['raw']
        raw['unusedSummary'] = 'changed raw bytes'
        path = self.source/'raw.json'
        path.write_text(json.dumps(raw))
        self.records['independent']['inputHashes'] = {path.name: digest(path)}
        with self.assertRaisesRegex(AssertionError, 'Convergence input artifact binding'):
            self.admit()

    def test_extra_input_hash_cannot_hide_under_green_flag(self):
        self.records['independent']['inputHashes']['unrelated.json'] = '0'*64
        with self.assertRaisesRegex(AssertionError, 'Independent input artifact binding'):
            self.admit()


if __name__ == '__main__':
    unittest.main()
