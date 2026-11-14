"""Analytic transport controls; execute only in the isolated frozen source copy."""
import gzip
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from force105 import SourceFlow
import ring_flux107 as diagnostic

M_AR = 39.948*1.66053906660e-27


class FluxControls(unittest.TestCase):
    def flow(self):
        return SourceFlow(np.linspace(0, 1, 15)**1.2, np.linspace(0, 2, 13)**1.1,
                          [M_AR, M_AR], noSlipWalls=True)

    def test_linear_flow_and_signed_cancellation(self):
        for a, b in ((2., 3.), (-2., -3.), (2., -4.)):
            f = self.flow()
            q = f.state(1.7, 3000., .5, 0., a*f.mean_r,
                        b*((f.z[:-1]+f.z[1:])/2)[:, None])
            before = q.copy(); fields, _, ledger = diagnostic.rates(f, q)
            interior = np.s_[2:-2, 2:-2]
            np.testing.assert_allclose(fields['radial_total'][interior], -1.7*2*a, rtol=1e-12)
            np.testing.assert_allclose(fields['axial_total'][interior], -1.7*b, rtol=1e-12)
            np.testing.assert_allclose(fields['radial_cellReference'][interior], -1.7*2*a, rtol=1e-12)
            np.testing.assert_allclose(fields['axial_cellReference'][interior], -1.7*b, rtol=1e-12)
            for name in ('radial', 'axial'):
                for part in ('reconstructionDifference', 'riemannReferenceDifference'):
                    np.testing.assert_allclose(fields[name+'_'+part][interior], 0., atol=2e-10)
            np.testing.assert_allclose(fields['total'][interior], -1.7*(2*a+b), atol=2e-11)
            np.testing.assert_array_equal(q, before)
            for direction in ('radial', 'axial'):
                self.assertEqual(ledger[direction]['maximumBoundaryFluxKgS'], 0.)
                self.assertLess(abs(ledger[direction]['integratedMassRateKgS']), 2e-12)

    def test_stationary_pressure_contact(self):
        f = self.flow()
        for step in (np.arange(f.nr)[None, :] >= f.nr//2,
                     np.arange(f.nz)[:, None] >= f.nz//2):
            rho = np.where(step, 2., 1.)
            q = f.state(rho, 3000/rho, .5, 0.)
            fields, _, ledger = diagnostic.rates(f, q)
            self.assertLess(np.max(abs(fields['total'])), 1e-10)
            self.assertLess(ledger['maximumDecompositionDefectKgM3S'], 1e-10)

    def test_pressure_jump_at_rest_is_acoustic_transport(self):
        f = self.flow()
        temperature = np.where(np.arange(f.nz)[:, None] < f.nz//2, 6000., 3000.)
        q = f.state(1., temperature, .5, 0.)
        fields, _, _ = diagnostic.rates(f, q)
        self.assertEqual(np.max(abs(fields['axial_cellReference'])), 0.)
        self.assertEqual(np.max(abs(fields['axial_reconstructionDifference'])), 0.)
        self.assertGreater(np.max(abs(fields['axial_riemannReferenceDifference'])), 1.)
        integrated = fields['axial_total']*f.volume
        self.assertLess(integrated[:f.nz//2].sum(), 0.)
        self.assertGreater(integrated[f.nz//2:].sum(), 0.)

    def test_projection_preserves_signed_decomposition(self):
        f = self.flow()
        q = f.state(1.2, 3000., .5, 20., f.mean_r, .1)
        fields, _, ledger = diagnostic.rates(f, q)
        points = np.array([[0., 0.], [.43, .17], [f.z[-1], f.r[-1]]])
        parts = [diagnostic.project(f, v, points) for k, v in fields.items()
                 if k.endswith(('Reference', 'Difference'))]
        total = diagnostic.project(f, fields['total'], points)
        np.testing.assert_allclose(sum(parts), total, rtol=1e-12, atol=1e-12)
        self.assertLess(ledger['maximumDecompositionDefectKgM3S'], 1e-10)

    def test_uniform_velocity_derivative_accounts_for_changing_mass(self):
        f = self.flow(); q = f.state(1.2, 3000., .5, 0., 3., -4.)
        fields, _, _ = diagnostic.rates(f, q)
        interior = np.s_[2:-2, 2:-2]
        self.assertGreater(np.max(abs(fields['total'][interior])), 1.)
        p = f.primitive(q)
        roundoff = 256*np.finfo(float).eps*float(p['soundMPS'].max())**2/min(
            np.min(np.diff(f.r)), np.min(np.diff(f.z)))
        for name in ('radialCellVelocityRateMPS2', 'axialCellVelocityRateMPS2'):
            self.assertLess(np.max(abs(fields[name][interior])), roundoff)

    def test_sealed_reader_rejects_corruption_and_stale_clocks(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); (root/'fields').mkdir()
            (root/'source.py').write_bytes(b'sealed source\n')
            state = dict(snapshots=[dict(timeS=t) for t in diagnostic.TIMES])
            raw = json.dumps(state).encode(); packed = gzip.compress(raw)
            field = root/'fields/state.gz'; field.write_bytes(packed)
            packet = dict(phase='full', timesS=diagnostic.TIMES,
                sourceSHA256={'source.py': diagnostic.sha(b'sealed source\n')},
                cases=[dict(completed=True, fieldPacket=dict(path='fields/state.gz',
                    sha256=diagnostic.sha(packed), rawSHA256=diagnostic.sha(raw)))])
            path = root/'predictions.json'; path.write_text(json.dumps(packet))
            digest = diagnostic.sha(path.read_bytes())
            self.assertEqual(diagnostic.read_case(path, digest, root)[1], state)
            for target in (path, field, root/'source.py'):
                before = target.read_bytes(); target.write_bytes(before+b'corrupt')
                with self.assertRaises(ValueError): diagnostic.read_case(path, digest, root)
                target.write_bytes(before)
            state['snapshots'].pop()
            raw = json.dumps(state).encode(); packed = gzip.compress(raw); field.write_bytes(packed)
            packet['cases'][0]['fieldPacket'].update(sha256=diagnostic.sha(packed), rawSHA256=diagnostic.sha(raw))
            path.write_text(json.dumps(packet))
            with self.assertRaises(ValueError): diagnostic.read_case(path, diagnostic.sha(path.read_bytes()), root)


if __name__ == '__main__':
    unittest.main()
