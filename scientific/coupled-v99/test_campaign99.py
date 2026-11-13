"""Regression controls for inactive-cap clocks and nonuniform physical support."""
import json
import unittest
import numpy as np
import campaign99 as c


class CampaignTests(unittest.TestCase):
    def test_refinement_preserves_physical_contact_edges_and_nesting(self):
        for n in (1, 2):
            r, z = c.mesh(n); rr, zz = c.mesh(2*n)
            self.assertEqual((len(r)-1, len(z)-1), (16*n, 24*n))
            np.testing.assert_allclose(rr[::2], r, rtol=0, atol=1e-17)
            np.testing.assert_allclose(zz[::2], z, rtol=0, atol=1e-17)
            for point in (.004, .056): self.assertIn(point, r)
            for point in (.06, .08, .232): self.assertIn(point, z)

    def test_inactive_cap_no_longer_duplicates_clocks(self):
        class Acoustic:
            def stable_dt(self, q, cfl): return cfl*1e-8
        # Old max-dt caps1e-7/5e-8 both selected the same acoustic step.
        self.assertEqual(min(1e-7, 2e-9), min(5e-8, 2e-9))
        steps = [c.step_size(Acoustic(), None, x, 1e-6)[0] for x in (.2, .1, .05)]
        np.testing.assert_allclose(steps, [2e-9, 1e-9, 5e-10], rtol=1e-15)
        self.assertEqual(c.step_size(Acoustic(), None, .1, 1e-12)[0], 1e-12)
        for value in (0., -.1, .3, True, float('nan')):
            with self.assertRaises(ValueError): c.step_size(Acoustic(), None, value, 1e-6)

    def test_coupled_release_preserves_angular_and_total_energy_ledgers(self):
        old = json.loads((c.HERE.parent/'boundary-v84/results/predictions.json').read_text())
        times = c.TIMES
        try:
            c.TIMES = (0., 2e-10)
            state = c.evolve(old['scenarios'][0], old['manifest'], 1, .1)
        finally:
            c.TIMES = times
        h = state['history'][-1]
        self.assertEqual(h['cflBound'], .1)
        self.assertLess(h['dtS']/h['unitCflStableDtS'], h['cflBound'])
        self.assertLess(h['energyRelativeDefect'], 1e-8)
        self.assertLess(h['angularRelativeDefect'], 1e-8)
        self.assertLess(h['massRelativeDrift'], 1e-10)
        self.assertLess(state['relativeTorqueFootprintError'], 1e-4)
        self.assertIs(state['experimentalQualification'], False)
        q = np.asarray(state['snapshots'][-1]['q'])
        self.assertGreater(np.linalg.norm(q[1:3]), 0.)


if __name__ == '__main__': unittest.main()
