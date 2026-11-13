"""Independent restriction controls; execute in safe-dev."""
import gzip
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
from independent100 import compare, geometry, load, restrict


def mesh(r, z):
    return dict(radialEdgesM=r, axialEdgesM=z)


class RestrictionTests(unittest.TestCase):
    def setUp(self):
        self.fine = mesh([0, .001, .004, .015, .03, .06], [0, .005, .03, .08, .24])
        self.coarse = mesh([0, .004, .03, .06], [0, .03, .24])

    def test_uniform_density_velocity_and_every_integral_preserved(self):
        _, _, fv = geometry(self.fine)
        _, _, cv = geometry(self.coarse)
        q = np.arange(1., 7.)[:, None, None]*fv
        out = restrict(q, self.fine, self.coarse)
        np.testing.assert_allclose(out, np.arange(1., 7.)[:, None, None]*cv, rtol=3e-15)
        np.testing.assert_allclose(out.sum(axis=(1, 2)), q.sum(axis=(1, 2)), rtol=3e-15)

    def test_nested_nonuniform_exact_sums(self):
        q = np.arange(1., 121.).reshape(6, 4, 5)
        out = restrict(q, self.fine, self.coarse)
        expected = np.empty((6, 2, 3))
        for j, (lo, hi) in enumerate(((0, 2), (2, 4))):
            for i, (left, right) in enumerate(((0, 2), (2, 4), (4, 5))):
                expected[:, j, i] = q[:, lo:hi, left:right].sum(axis=(1, 2))
        np.testing.assert_allclose(out, expected, rtol=3e-15)

    def test_non_nested_restriction_preserves_signed_integrals(self):
        target = mesh([0, .002, .02, .06], [0, .01, .04, .24])
        q = np.arange(-60., 60.).reshape(6, 4, 5)
        out = restrict(q, self.fine, target)
        np.testing.assert_allclose(out.sum(axis=(1, 2)), q.sum(axis=(1, 2)), rtol=3e-15, atol=1e-13)

    def test_own_initial_increment_removed_and_momentum_not_velocity_averaged(self):
        _, _, volume = geometry(self.fine)
        q = np.ones((6, *volume.shape))*volume
        q[0, :, 1::2] *= 3
        q[1] = 5*q[0]
        q[2] = -2*q[0]
        initial = q.copy()
        initial[1:3] = 0
        cq, ci = [restrict(v, self.fine, self.coarse) for v in (q, initial)]
        self.fine['snapshots'] = [dict(q=initial), dict(q=q)]
        self.coarse['snapshots'] = [dict(q=ci), dict(q=cq)]
        result = compare(self.coarse, self.fine, 1)
        for row in result.values():
            self.assertEqual(row['relativeRMS'], 0.)

    def test_bad_geometry_state_or_domain_rejected(self):
        for invalid in (mesh([0, .1, .05], [0, 1]), mesh([-1, 0, 1], [0, 1])):
            with self.assertRaises(ValueError):
                geometry(invalid)
        with self.assertRaises(ValueError):
            restrict(np.zeros((6, 4, 5)), self.fine, mesh([0, .06], [0, .2]))
        with self.assertRaises(ValueError):
            restrict(np.zeros((6, 5, 5)), self.fine, self.coarse)

    def test_stale_archived_field_rejected_without_rescoring(self):
        with tempfile.TemporaryDirectory() as name:
            root = Path(name); (root/'fields').mkdir()
            raw = b'{"snapshots": []}'
            packed = gzip.compress(raw, mtime=0)
            field = root/'fields/case.json.gz'; field.write_bytes(packed)
            packet = dict(cases=[dict(completed=True, refinement=1, cfl=.1,
                fieldPacket=dict(path='fields/case.json.gz',
                    sha256=hashlib.sha256(packed).hexdigest(), rawSHA256=hashlib.sha256(raw).hexdigest()))])
            index = root/'predictions.json'; index.write_text(json.dumps(packet))
            self.assertIn((1, .1), load(index))
            field.write_bytes(gzip.compress(b'{"snapshots": ["changed"]}', mtime=0))
            with self.assertRaisesRegex(ValueError, 'seal mismatch'):
                load(index)


if __name__ == '__main__':
    unittest.main()
