"""Corruption controls for saved evidence admission; no producer imports/solve."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
from audit98 import audit, sha, ROOT, KEYS, RESIDUALS


class SavedEvidenceControls(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.out = self.root/'result'
        self.out.mkdir()
        baseline = self.root/'scientific/axial-v85/results/predictions.json'
        baseline.parent.mkdir(parents=True)
        baseline.write_bytes((ROOT/'scientific/axial-v85/results/predictions.json').read_bytes())
        old = json.loads(baseline.read_text())
        (self.root/'source.txt').write_text('frozen source\n')
        sources = {'source.txt': sha(self.root/'source.txt')}
        (self.root/'transfer.json').write_text(json.dumps(sources))
        self.data = dict(manifest={k: old['manifest'][k] for k in KEYS}, scenarios=old['scenarios'],
            baselineSHA256=sha(baseline), sourceSHA256=sources, cases=[], comparisons=[],
            currentFitted=False, experimentalQualification=False, livePlaygroundQualified=False,
            scope='Conditional angular-only model; uniform-emissivity centroid, not the experimental diagnostic',
            numericalGates=dict(conservation=True, refinement=True, independentReference=True))
        r, z = np.linspace(0, .06, 161), np.linspace(0, .24, 121)
        field = 5000*(1-(z[:, None]/.24)**2)*(1-(r[None, :]/.06)**2)
        relative = lambda a, b: float(np.max(abs(np.asarray(a)-b))/np.max(abs(b)))
        for scenario in old['scenarios']:
            s = scenario['name']
            for center in (.07, .08):
                ref = next(row for row in old['cases'] if
                    (row['scenario'], row['anodeCenterM'], row['refinement']) == (s, center, 8))
                chord = np.asarray(ref['prediction']['chordVelocityMS'])
                arrays, viscous = [], []
                for n in (1, 2, 4):
                    gain = 1+.02/n**2
                    packet = self.out/f'{s}-a{center}-n{n}.npz'
                    omega = field*gain
                    q = dict(radialM=r, axialM=z, omegaRadS=omega,
                             localMidplaneMS=r*omega[0], uniformChordMS=chord*gain)
                    np.savez_compressed(packet, **q)
                    torque, v = 100*.13*(.06**2-.004**2)/2, 100*gain
                    row = dict(scenario=s, anodeCenterM=center, refinement=n, packet=packet.name,
                        packetSHA256=sha(packet), chordVelocityMS=(chord*gain).tolist(),
                        currentA=100., magneticT=.13, experimentalQualification=False,
                        contactVoltageExperimental=False, electrodePowerW=200+v, jouleW=200.,
                        viscousW=v, driveTorqueNm=torque, sourceMomentTorqueNm=torque,
                        wallReactionTorqueNm=-torque, **{k: 0. for k in RESIDUALS})
                    self.data['cases'].append(row)
                    arrays.append(q)
                    viscous.append(v)
                comparison = dict(scenario=s, anodeCenterM=center)
                for label, values in [('chord', [q['uniformChordMS'] for q in arrays]),
                                      ('local', [q['localMidplaneMS'] for q in arrays]),
                                      ('field', [q['omegaRadS'] for q in arrays]), ('viscous', viscous)]:
                    comparison[label+'CoarseChange'] = relative(values[0], values[1])
                    comparison[label+'FineChange'] = relative(values[1], values[2])
                comparison['independentFVChordDifference'] = relative(arrays[-1]['uniformChordMS'], chord)
                self.data['comparisons'].append(comparison)

    def run_audit(self):
        (self.out/'predictions.json').write_text(json.dumps(self.data))
        return audit(self.out, self.root)

    def test_complete_synthetic_evidence_reconstructs_all_frozen_gates(self):
        result = self.run_audit()
        self.assertTrue(result['passed'])
        self.assertEqual(len(result['gates']), 24*6+8*9)
        self.assertFalse(result['experimentalQualification'])

    def test_missing_and_duplicate_case_rejected(self):
        saved = copy.deepcopy(self.data)
        self.data['cases'].pop()
        with self.assertRaisesRegex(ValueError, '24-case'):
            self.run_audit()
        self.data = saved
        self.data['cases'][-1] = self.data['cases'][0]
        with self.assertRaisesRegex(ValueError, '24-case'):
            self.run_audit()

    def test_nonfinite_array_rejected_even_with_updated_packet_hash(self):
        row = self.data['cases'][0]
        path = self.out/row['packet']
        with np.load(path) as raw:
            q = {k: raw[k].copy() for k in raw.files}
        q['omegaRadS'][10, 20] = np.nan
        np.savez_compressed(path, **q)
        row['packetSHA256'] = sha(path)
        with self.assertRaisesRegex(ValueError, 'Invalid omega'):
            self.run_audit()

    def test_source_and_packet_identity_rejected(self):
        (self.root/'source.txt').write_text('changed source')
        with self.assertRaisesRegex(ValueError, 'Source identity'):
            self.run_audit()
        (self.root/'source.txt').write_text('frozen source\n')
        self.data['cases'][0]['packetSHA256'] = '0'*64
        with self.assertRaisesRegex(ValueError, 'Packet identity'):
            self.run_audit()

    def test_corrupt_comparison_or_producer_status_rejected(self):
        saved = copy.deepcopy(self.data)
        self.data['comparisons'][0]['fieldFineChange'] = 0.
        with self.assertRaisesRegex(ValueError, 'Comparison drift'):
            self.run_audit()
        self.data = saved
        self.data['numericalGates']['refinement'] = False
        with self.assertRaisesRegex(ValueError, 'aggregate'):
            self.run_audit()

    def test_false_drive_or_experimental_claim_rejected(self):
        saved = copy.deepcopy(self.data)
        self.data['cases'][0]['currentA'] = 20.
        with self.assertRaisesRegex(ValueError, 'drive drift'):
            self.run_audit()
        self.data = saved
        self.data['experimentalQualification'] = True
        with self.assertRaisesRegex(ValueError, 'scope drift'):
            self.run_audit()

    def test_real_refinement_failure_cannot_be_replaced_by_green_status(self):
        row = self.data['cases'][2]
        path = self.out/row['packet']
        with np.load(path) as raw:
            q = {k: raw[k].copy() for k in raw.files}
        q['omegaRadS'][30, 40] *= 3
        np.savez_compressed(path, **q)
        row['packetSHA256'] = sha(path)
        comparison = self.data['comparisons'][0]
        with np.load(self.out/self.data['cases'][1]['packet']) as raw:
            comparison['fieldFineChange'] = float(np.max(abs(raw['omegaRadS']-q['omegaRadS']))/
                                                       np.max(abs(q['omegaRadS'])))
        with self.assertRaisesRegex(ValueError, 'aggregate'):
            self.run_audit()
        self.data['numericalGates']['refinement'] = False
        result = self.run_audit()
        self.assertFalse(result['passed'])
        self.assertTrue(any(not gate['passed'] for gate in result['gates']))

    def test_sampled_boundary_roundoff_allowed_but_nonzero_trace_rejected(self):
        row = self.data['cases'][0]
        path = self.out/row['packet']
        with np.load(path) as raw:
            q = {k: raw[k].copy() for k in raw.files}
        scale = float(np.max(abs(q['omegaRadS'])))
        q['omegaRadS'][-1, 20] = 32*np.finfo(float).eps*scale
        np.savez_compressed(path, **q)
        row['packetSHA256'] = sha(path)
        self.assertTrue(self.run_audit()['passed'])
        q['omegaRadS'][-1, 20] = 1e-8*scale
        np.savez_compressed(path, **q)
        row['packetSHA256'] = sha(path)
        with self.assertRaisesRegex(ValueError, 'Boundary sampling'):
            self.run_audit()


if __name__ == '__main__':
    unittest.main()
