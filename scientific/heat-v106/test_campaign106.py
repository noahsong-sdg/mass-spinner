"""Actual initialization, source sealing and coupled-ledger controls."""
import json
from pathlib import Path
import runpy
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import campaign106 as campaign
from diffusion86 import Diffusion
from evaluate100 import audit_sources
from geometry101 import expected_edges
from heat106 import FVDiffusion


class CampaignControls(unittest.TestCase):
    def test_identical_initializer_and_one_step_energy_angular_ledgers(self):
        data = campaign.baseline.baseline.reference.campaign100.baseline()
        args = data['scenarios'][0], data['manifest'], 1
        self.assertIs(campaign.old.Diffusion, FVDiffusion)
        with patch.object(campaign.old, 'mesh', return_value=expected_edges(1)):
            f, diffusion, electro, q = campaign.old.initialize(*args)
            with patch.object(campaign.old, 'Diffusion', Diffusion):
                _, _, _, original = campaign.old.initialize(*args)
        self.assertEqual(q.tobytes(), original.tobytes())
        self.assertTrue(f.noSlipWalls)
        self.assertEqual(campaign.old.TIMES, (0., 1e-6, 2e-6, 4e-6))
        self.assertEqual(set(campaign.JOBS), {(1, .1), (2, .1), (4, .1), (2, .2), (2, .05)})
        initial = q.sum(axis=(1, 2))
        dt = min(1e-9, f.stable_dt(q, .1))
        hydro, _ = f.advance_with_receipt(q, dt)
        forced, em = electro.advance(hydro, dt)
        out, receipt = diffusion.advance(forced, dt)
        total = out.sum(axis=(1, 2))
        np.testing.assert_allclose(total[[0, 5]], initial[[0, 5]], rtol=1e-12, atol=0.)
        self.assertLess(abs(total[4]-initial[4]-em['externalWorkJ'])/initial[4], 1e-8)
        moment = sum(p['amp']*f.mean_r[p['cell'] % f.nr]**2
                     for p in electro.ports if p['kind'] == 'cathode')
        torque = .5*electro.B*(electro.current*f.r[-1]**2-moment)
        wall = np.intersect1d(diffusion.velocity.nodal_dofs[2], diffusion.fixed)
        wall_impulse = dt*float((diffusion.stiffness@receipt['velocityTrace'])[wall].sum())
        scale = max(abs(initial[3]), abs(dt*torque), abs(wall_impulse))
        self.assertLess(abs(total[3]-initial[3]-dt*torque-wall_impulse)/scale, 1e-8)
        self.assertLess(em['chargeResidualA']/abs(electro.current), 1e-9)
        self.assertGreater(f.primitive(out)['thermalJ'].min(), 0.)

    def test_source_inventory_and_wrong_method_rejection(self):
        sealed = campaign.sources()
        required = {'heat-v106/heat106.py', 'heat-v106/campaign106.py',
                    'heat-v106/evaluate106.py', 'heat-v106/PROTOCOL.md',
                    'source-v105/force105.py', 'meridional-v86/diffusion86.py'}
        self.assertTrue({'scientific/'+name for name in required} <= sealed.keys())
        self.assertEqual(set(audit_sources(campaign)), set(sealed))
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory/'predictions.json').write_text(json.dumps({'radialBalanceMethod': campaign.baseline.METHOD}))
            with patch.object(sys, 'argv', ['evaluate106', str(directory), str(directory)]):
                with self.assertRaisesRegex(ValueError, 'finite-volume heat'):
                    runpy.run_module('evaluate106', run_name='__main__')


if __name__ == '__main__':
    unittest.main()
