import unittest
import numpy as np
from optics84 import velocity_grid


class ActualOpticalGrid(unittest.TestCase):
    def test_graded_edges_and_angular_velocity_pass_without_resampling(self):
        r=[0,.001,.004,.013,.06]; w=[1,2,3,4]
        edges,omega=velocity_grid(dict(prediction=dict(radialEdgesM=r,midplaneOmegaRadS=w)),dict(radiusM=.06))
        np.testing.assert_array_equal(edges,r); np.testing.assert_array_equal(omega,w)

    def test_stale_or_invalid_flow_annuli_are_rejected(self):
        for r,w in (([0,.004,.06],[1]),([0,.06,.04],[1,2]),([0,.06],[np.nan]),([0,.07],[1])):
            with self.assertRaises(ValueError):
                velocity_grid(dict(prediction=dict(radialEdgesM=r,midplaneOmegaRadS=w)),dict(radiusM=.06))


if __name__=='__main__': unittest.main()
