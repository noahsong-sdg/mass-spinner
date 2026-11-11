import unittest
import numpy as np
from flow import Flow
from run import endpoint


class ReportControls(unittest.TestCase):
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
