"""Independent geometry and sealed-input controls; root executes in safe-dev."""
from contextlib import contextmanager
from copy import deepcopy
import gzip
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

import radial_next106 as radial
from geometry101 import expected_edges, hermite_edges


@contextmanager
def fixtures():
    with tempfile.TemporaryDirectory() as temporary:
        directory = Path(temporary); (directory/'fields').mkdir()
        original, summary = directory/'original.json', directory/'summary.json'
        original.write_text('original sealed fixture')
        original_sha = radial.old.sha(original.read_bytes())
        sources = {'scientific/frozen.py': 'frozen-source'}
        packet = dict(manifest={'viscosityPaS': .000114}, scenario={'shape': 'linear'},
                      timesS=[0., 1e-6, 2e-6, 4e-6])
        state = dict(snapshots=[dict(timeS=t, q=np.ones((6, 2, 2)).tolist()) for t in radial.cross.TIMES])
        data = dict(sourcePredictionSHA256=original_sha, sourceSHA256=sources,
                    manifest=packet['manifest'], scenario=packet['scenario'],
                    protocol=json.loads(json.dumps(radial.cross.PROTOCOL)), cases=[])
        for rn, zn in ((2, 2), (4, 2), (2, 4), (4, 4)):
            raw = json.dumps(state).encode(); packed = gzip.compress(raw)
            path = f'fields/r{rn}-z{zn}.json.gz'; (directory/path).write_bytes(packed)
            data['cases'].append(dict(radialRefinement=rn, axialRefinement=zn, completed=True,
                fieldPacket=dict(path=path, sha256=radial.old.sha(packed), rawSHA256=radial.old.sha(raw))))
        summary.write_text(json.dumps(data))
        with patch.object(radial, 'ORIGINAL', original_sha), \
                patch.object(radial, 'CROSS', radial.old.sha(summary.read_bytes())), \
                patch.object(radial.cross, 'inputs', return_value=packet), \
                patch.object(radial.cross, 'sources', return_value=sources):
            yield original, summary, data, packet


class RadialControls(unittest.TestCase):
    def test_original_geometry_is_unchanged_and_eighth_level_is_exactly_nested(self):
        for n in (1, 2, 4):
            for actual, independent in zip(radial.cross.mesh(n, 'smooth-source-aligned'), expected_edges(n)):
                np.testing.assert_allclose(actual, independent, rtol=0., atol=1e-15)
        r8, z2 = radial.geometry(8, 2)
        independent = hermite_edges([0., .004, .05, .056, .06], [4, 8, 4, 4], 8)
        np.testing.assert_allclose(r8, independent, rtol=0., atol=1e-15)
        self.assertEqual((len(r8)-1, len(z2)-1), (160, 48))
        r2, _ = radial.geometry(2, 2); r4, _ = radial.geometry(4, 2)
        np.testing.assert_array_equal(r8[::2], r4)
        np.testing.assert_array_equal(r4[::2], r2)
        np.testing.assert_array_equal(z2, radial.cross.mesh(2, 'smooth-source-aligned')[1])
        for pair in ((8, 4), (4, 4), (16, 2), (1, 2)):
            with self.subTest(pair=pair), self.assertRaises(ValueError):
                radial.geometry(*pair)

    def test_pinned_original_cross_and_all_field_seals_are_required(self):
        with fixtures() as (original, summary, data, packet):
            self.assertEqual(radial.inputs(summary, original), (data, packet))
            path = summary.parent/data['cases'][0]['fieldPacket']['path']
            path.write_bytes(gzip.compress(b'changed field'))
            with self.assertRaisesRegex(ValueError, 'seal mismatch'):
                radial.inputs(summary, original)
        for target in ('original', 'summary'):
            with self.subTest(target=target), fixtures() as (original, summary, _, _):
                path = original if target == 'original' else summary
                path.write_bytes(path.read_bytes()+b' ')
                with self.assertRaisesRegex(ValueError, 'pinned original'):
                    radial.inputs(summary, original)

    def test_changed_protocol_sources_physics_and_job_set_are_rejected(self):
        changes = [('sourcePredictionSHA256', 'old-study'), ('sourceSHA256', {}),
                   ('manifest', {}), ('scenario', {}), ('protocol', {}), ('cases', [])]
        with fixtures() as (original, summary, data, _):
            changes.append(('cases', [data['cases'][0]]*4))
            for key, value in changes:
                with self.subTest(key=key, value=value):
                    changed = deepcopy(data); changed[key] = value
                    summary.write_text(json.dumps(changed))
                    with patch.object(radial, 'CROSS', radial.old.sha(summary.read_bytes())):
                        with self.assertRaises(ValueError):
                            radial.inputs(summary, original)

    def test_stale_field_clock_is_rejected_even_with_updated_field_seals(self):
        with fixtures() as (original, summary, data, _):
            entry = data['cases'][0]['fieldPacket']
            path = summary.parent/entry['path']
            state = json.loads(gzip.decompress(path.read_bytes()))
            state['snapshots'][1]['timeS'] = 2e-6
            raw = json.dumps(state).encode(); packed = gzip.compress(raw)
            path.write_bytes(packed)
            entry.update(sha256=radial.old.sha(packed), rawSHA256=radial.old.sha(raw))
            summary.write_text(json.dumps(data))
            with patch.object(radial, 'CROSS', radial.old.sha(summary.read_bytes())):
                with self.assertRaisesRegex(ValueError, 'clocks changed'):
                    radial.inputs(summary, original)

    def test_worker_runs_only_declared_pair_and_rejects_source_mutation(self):
        packet = dict(manifest={}, scenario={})
        with patch.object(radial, 'inputs', return_value=({}, packet)), \
                patch.object(radial, 'sources', side_effect=[{'a': 'before'}, {'a': 'after'}]), \
                patch.object(radial.old, 'TIMES', radial.old.TIMES), \
                patch.object(radial.old, 'mesh', radial.old.mesh), \
                patch.object(radial.old, 'evolve', return_value={}) as evolve, \
                patch.object(radial.cross, 'retain') as retain:
            with self.assertRaisesRegex(ValueError, 'source changed'):
                radial.worker(Path('unused'), Path('original'), Path('cross'))
            evolve.assert_called_once_with(packet['scenario'], packet['manifest'], 1, .1)
            self.assertEqual(radial.old.TIMES, radial.cross.TIMES)
            for actual, expected in zip(radial.old.mesh(1), radial.geometry(8, 2)):
                np.testing.assert_array_equal(actual, expected)
            retain.assert_not_called()


if __name__ == '__main__':
    unittest.main()
