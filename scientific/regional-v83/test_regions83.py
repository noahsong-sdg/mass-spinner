import json
from pathlib import Path
import unittest
import numpy as np
from campaign83 import regions
from mesh83 import grid,access_depth,transport,operators
from model82 import properties
from budget82 import reconstruct


class FixedDomainBudgets(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m=json.loads((Path(__file__).parents[1]/'profile-v79/manifest.json').read_text())
        cls.scenario=transport.SCENARIOS[1]

    def test_same_physical_integral_on_every_mesh(self):
        depth=access_depth(self.scenario,self.m)
        for ref in (1,2,4,8):
            r,z=grid(self.m,ref,ref,depth); nr=len(r)-1
            rows=np.repeat(np.diff(z)[:,None]/nr,nr,axis=1)
            arrays=dict(jouleW=2*rows,rotorWorkW=3*rows,electricalInW=5*rows)
            state=dict(z=z,currentsA={'cathode':1.},electrodePowerW=1.2)
            for region in regions(self.m,state,arrays,depth):
                lo,hi=region['axialEdgesM']
                self.assertAlmostEqual(region['jouleW'],2*(hi-lo),places=13)
                self.assertAlmostEqual(region['rotorWorkW'],3*(hi-lo),places=13)
                self.assertLess(region['electricalBalanceRelative'],1e-13)

    def test_unaligned_cut_is_rejected_instead_of_moving(self):
        state=dict(z=np.linspace(0,.24,49),currentsA={'cathode':1.},electrodePowerW=1.)
        with self.assertRaisesRegex(ValueError,'mesh face'):
            regions(self.m,state,{k:np.zeros((48,1)) for k in ('jouleW','rotorWorkW','electricalInW')},.056)

    def test_frozen_operators_keep_conservation_on_graded_mesh(self):
        depth=access_depth(self.scenario,self.m); p,q=operators(self.m,1,1,depth); fields=properties(self.scenario)
        a=p.solve(self.m,0.,1070.,18.5,1,**fields); b=q.solve(self.m,0.,1070.,18.5,1,**fields)
        budget,arrays=reconstruct(self.m,a,18.5,fields)
        for metric in ('chargeResidualRelative','powerResidualRelative','linearResidualRelative'):
            self.assertLess(a[metric],1e-8)
        self.assertLess(b['chargeResidualRelative'],1e-8)
        self.assertLess(b['powerResidualRelative'],1e-8)
        self.assertLess(budget['globalBudgetRelative'],1e-8)
        self.assertTrue(all(row['electricalBalanceRelative']<1e-8 for row in regions(self.m,a,arrays,depth)))
        self.assertGreater(a['currentsA']['cathode'],0)


if __name__=='__main__': unittest.main()
