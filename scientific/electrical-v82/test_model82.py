import json
from pathlib import Path
import unittest
import numpy as np
from budget82 import reconstruct
from model82 import properties,scaled_state,solver
from transport82 import SCENARIOS


class ElectricalBudgetControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m=json.loads((Path(__file__).parents[1]/'profile-v79/manifest.json').read_text())

    def test_exact_regional_work_and_half_cell_loss_partition(self):
        for scenario in (SCENARIOS[1],SCENARIOS[2],SCENARIOS[-1]):
            fields=properties(scenario); state=solver.solve(self.m,0.,1070.,18.5,1,**fields)
            budget,arrays=reconstruct(self.m,state,18.5,fields)
            for key in ('chargeResidualRelative','cellElectricalBalanceRelative','globalBudgetRelative'):
                self.assertLess(budget[key],1e-8)
            self.assertTrue(np.all(arrays['jouleW']>=0))
            for key in ('jouleW','rotorWorkW','electricalInW'):
                self.assertAlmostEqual(sum(r[key] for r in budget['regions'])/budget[key],1.,places=10)
            self.assertTrue(all(r['electricalBalanceRelative']<1e-8 for r in budget['nestedEndwallRegions']))
            self.assertAlmostEqual(budget['electricalInW']/budget['currentsA']['cathode'],18.5,places=8)

    def test_fixed_current_is_linear_drive_not_transport_fit(self):
        fields=properties(SCENARIOS[2]); first=solver.solve(self.m,0.,1070.,18.5,1,**fields)
        gain=100./first['currentsA']['cathode']; scaled=scaled_state(first,gain)
        actual=solver.solve(self.m,0.,1070.,18.5*gain,1,**fields)
        np.testing.assert_allclose(scaled['omega'],actual['omega'],rtol=2e-9,atol=1e-7)
        np.testing.assert_allclose(scaled['potential'],actual['potential'],rtol=2e-9,atol=1e-7)
        self.assertAlmostEqual(scaled['currentsA']['cathode'],100.,places=10)
        budget,_=reconstruct(self.m,scaled,18.5*gain,fields)
        self.assertLess(budget['globalBudgetRelative'],1e-8)

    def test_locked_flow_conductance_exceeds_passive_rotating_load(self):
        fields=properties(SCENARIOS[2]); driven=solver.solve(self.m,0.,1070.,18.5,1,**fields)
        locked=solver.solve(self.m,0.,1070.,18.5,1,**fields,magnetic=0.)
        self.assertGreater(locked['currentsA']['cathode'],driven['currentsA']['cathode'])
        np.testing.assert_array_equal(locked['omega'],0.)
        budget,_=reconstruct(self.m,locked,18.5,fields,magnetic=0.)
        self.assertEqual(budget['rotorWorkW'],0.)
        self.assertLess(budget['globalBudgetRelative'],1e-8)


if __name__=='__main__': unittest.main()
