import unittest
import numpy as np
from campaign85 import control_properties,properties


class FrozenControl(unittest.TestCase):
    def test_only_published_viscosity_changes_for_every_source_case(self):
        for shape in ('linear','quadratic'):
            for te in (1.,2.5):
                scenario=dict(shape=shape,electronTemperatureEV=te,partition='source',leadingWeakIonization=False)
                old,new=properties(scenario),control_properties(scenario)
                self.assertEqual(new['viscosity'],1.14e-4)
                r=np.array([.001,.01,.03,.05,.059])[None,:]; z=np.array([.01,.1,.23])[:,None]
                for k in ('conductivity_shape','beta_field'):
                    np.testing.assert_array_equal(new[k](r,z),old[k](r,z))
                self.assertGreater(np.ptp(old['viscosity'](r,z)),0.)


if __name__=='__main__': unittest.main()
