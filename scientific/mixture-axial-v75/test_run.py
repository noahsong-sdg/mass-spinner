import unittest
from copy import deepcopy
import numpy as np
from flow import Flow
from run import endpoint, admit_checkpoint


class ReportControls(unittest.TestCase):
    def test_resume_rejects_stale_manifest_source_runtime_and_failed_checkpoints(self):
        from test_analyze import manifest
        report = dict(manifest=manifest(), sourceHashes={'flow.py': 'new'},
                      preRunRuntime={'numpy': 'pinned'}, failures=[], cases=[])
        self.assertEqual(admit_checkpoint(deepcopy(report), report), [])
        for key, value in (('manifest', {'schemaVersion': 0}), ('sourceHashes', {'flow.py': 'old'}),
                           ('preRunRuntime', {'numpy': 'old'}), ('failures', [{'error': 'retained'}])):
            saved = deepcopy(report)
            saved[key] = value
            with self.assertRaisesRegex(ValueError, 'Checkpoint'):
                admit_checkpoint(saved, report)

    def test_uniform_cylinder_species_centroids_are_exact_inventory_moments(self):
        f = Flow(np.linspace(0, .06, 5), np.linspace(0, .14, 5), [36*1.66053906892e-27, 40*1.66053906892e-27])
        q = f.state(.001, 350, .4, 0)
        c = dict(electrical=dict(sigmaPerpSM=[.03]*16, magneticT=.2))
        source = dict(mechanical=dict(current=dict(boundaryCurrentsA=[0.], jouleW=0.),
                                     shearHeatW=0., boundaryTorqueNm=dict(outer=0., lower=0., upper=0.)))
        obs = endpoint(f, c, q, [350.]*8, source, 1e-5)['observables']
        for name in ('lightRadialMomentM', 'heavyRadialMomentM'):
            self.assertAlmostEqual(obs[name], 2*.06/3, delta=1e-16)
        for name in ('lightAxialMomentM', 'heavyAxialMomentM'):
            self.assertAlmostEqual(obs[name], .14/2, delta=1e-16)


if __name__ == '__main__':
    unittest.main()
