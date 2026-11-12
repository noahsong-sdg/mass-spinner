import json
from pathlib import Path
import unittest
import numpy as np
from mesh83 import grid,access_depth,operators,transport


class FixedCuts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m=json.loads((Path(__file__).parents[1]/'profile-v79/manifest.json').read_text())
        cls.s=transport.SCENARIOS[1]

    def test_all_refinements_are_nested_with_identical_physical_cuts(self):
        depth=access_depth(self.s,self.m)
        old=None
        for ref in (1,2,4,8):
            r,z=grid(self.m,ref,ref,depth)
            for point in (.06,.08,.236,.224,.20,.16,.24-depth):
                self.assertLess(min(abs(z-point)),1e-14)
            if old is not None:
                np.testing.assert_allclose(r[::2],old[0],rtol=0,atol=1e-16)
                np.testing.assert_allclose(z[::2],old[1],rtol=0,atol=1e-16)
            old=r,z

    def test_adapter_has_no_fallback_and_does_not_mutate_frozen_solver(self):
        p,q=operators(self.m,1,1,access_depth(self.s,self.m))
        with self.assertRaises(ValueError): p.grid(self.m,2)
        with self.assertRaises(ValueError): q._segments([0.,.1],[1])
        np.testing.assert_array_equal(p.grid(self.m,1)[0],q._segments([0,.004,.06],[4,28]))
        self.assertNotEqual(len(p.grid(self.m,1)[1]),49)
        self.assertEqual(len(p.legacy.grid(self.m,1)[1]),49)

    def test_access_cut_depends_on_continuous_axis_not_mesh_sample(self):
        depth=access_depth(self.s,self.m)
        for ref in (1,2,4,8): self.assertIn(self.m['halfLengthM']-depth,grid(self.m,ref,ref,depth)[1])
        self.assertAlmostEqual(depth,.004*np.sqrt(1+float(transport.profile('linear',0.)['effectiveBeta'])**2))


if __name__=='__main__': unittest.main()
