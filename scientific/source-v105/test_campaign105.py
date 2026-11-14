"""Actual constructor/state/ledger and wrong-variant admission controls."""
import json
from pathlib import Path
import runpy
import sys
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
import campaign105 as campaign
from flow import Flow
from geometry101 import expected_edges
from evaluate100 import audit_sources


class CampaignControls(unittest.TestCase):
    def test_real_initializer_preserves_state_and_one_step_ledgers(self):
        data = campaign.baseline.reference.campaign100.baseline()
        scenario, manifest = data['scenarios'][0], data['manifest']
        self.assertIs(campaign.old.Flow, campaign.CoupledFlow)
        with patch.object(campaign.old, 'mesh', return_value=expected_edges(1)):
            f, diffusion, electro, q = campaign.old.initialize(scenario, manifest, 1)
            with patch.object(campaign.old, 'Flow', Flow):
                old, _, _, original = campaign.old.initialize(scenario, manifest, 1)
        self.assertIs(type(f), campaign.CoupledFlow)
        self.assertTrue(f.noSlipWalls)
        self.assertFalse(old.noSlipWalls)
        self.assertEqual(q.tobytes(), original.tobytes())
        for actual, expected in zip((f.r, f.z), expected_edges(1)):
            np.testing.assert_array_equal(actual, expected)
        self.assertEqual(campaign.old.TIMES, (0., 1e-6, 2e-6, 4e-6))
        self.assertEqual(set(campaign.JOBS), {(1, .1), (2, .1), (4, .1), (2, .2), (2, .05)})
        initial = q.sum(axis=(1, 2))
        dt = min(1e-9, f.stable_dt(q, .1))
        hydro, _ = f.advance_with_receipt(q, dt)
        forced, em = electro.advance(hydro, dt)
        out, viscous = diffusion.advance(forced, dt)
        total = out.sum(axis=(1, 2))
        np.testing.assert_allclose(total[[0, 5]], initial[[0, 5]], rtol=1e-12, atol=0.)
        energy_scale = max(initial[4], abs(em['externalWorkJ']))
        self.assertLess(abs(total[4]-initial[4]-em['externalWorkJ'])/energy_scale, 1e-8)
        moment = sum(p['amp']*f.mean_r[p['cell'] % f.nr]**2
                     for p in electro.ports if p['kind'] == 'cathode')
        torque = .5*electro.B*(electro.current*f.r[-1]**2-moment)
        wall = np.intersect1d(diffusion.velocity.nodal_dofs[2], diffusion.fixed)
        wall_impulse = dt*float((diffusion.stiffness@viscous['velocityTrace'])[wall].sum())
        scale = max(abs(initial[3]), abs(dt*torque), abs(wall_impulse))
        self.assertLess(abs(total[3]-initial[3]-dt*torque-wall_impulse)/scale, 1e-8)
        self.assertLess(em['chargeResidualA']/abs(electro.current), 1e-9)
        self.assertGreater(f.primitive(out)['thermalJ'].min(), 0.)

    def test_inventory_seals_method_and_cli_rejects_wrong_variant(self):
        sealed = campaign.sources()
        required = {'source-v105/force105.py', 'source-v105/campaign105.py',
                    'source-v105/evaluate105.py', 'source-v105/PROTOCOL.md',
                    'mixture-axial-v75/flow.py', 'meridional-v86/electro86.py',
                    'meridional-v86/diffusion86.py', 'spatial-v101/reconstruction101.py'}
        self.assertTrue({'scientific/'+name for name in required} <= sealed.keys())
        self.assertEqual(set(audit_sources(campaign)), set(sealed))
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory/'predictions.json').write_text(json.dumps({'radialBalanceMethod': 'v103'}))
            argv = ['evaluate105', str(directory), str(directory)]
            with patch.object(sys, 'argv', argv), self.assertRaisesRegex(ValueError, 'declared source/wall'):
                runpy.run_module('evaluate105', run_name='__main__')


if __name__ == '__main__':
    unittest.main()
