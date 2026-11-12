"""Coupled-path controls, not empirical agreement tests."""
import json
from pathlib import Path
import unittest
import numpy as np
from campaign86 import initialize,evolve

PACKET=json.loads((Path(__file__).parents[1]/'boundary-v84/results/predictions.json').read_text())


class CoupledTests(unittest.TestCase):
    def test_initialization_is_same_finite_contact_torsional_equilibrium(self):
        f,d,e,q=initialize(PACKET['scenarios'][0],.07,8,12,PACKET['manifest'])
        p=f.primitive(q)
        self.assertTrue(np.all(p['vrMPS']==0))
        self.assertTrue(np.all(p['vzMPS']==0))
        x=d.nodal_velocity(q); w,_=e.steady_torsion(d)
        np.testing.assert_allclose(p['omegaRadS'],w,rtol=2e-15)
        self.assertGreater(float(np.max(w)),0)

    def test_actual_release_conserves_mass_and_total_energy(self):
        result=evolve(PACKET['scenarios'][0],.07,8,12,1e-7,PACKET['manifest'])
        self.assertEqual([s['timeS'] for s in result['snapshots']],[0.,1e-6,2e-6,4e-6])
        self.assertFalse(result['experimentalQualification'])
        for row in result['history']:
            self.assertLess(row['massRelativeDrift'],1e-10)
            self.assertLess(row['speciesRelativeDrift'],1e-10)
            self.assertLess(row['energyRelativeDefect'],1e-8)
            self.assertLess(row['chargeRelativeResidual'],1e-9)
        initial,final=result['snapshots'][0],result['snapshots'][-1]
        self.assertGreater(np.max(abs(np.asarray(final['vrMPS']))),0)
        self.assertFalse(np.array_equal(initial['densityKgM3'],final['densityKgM3']))
        self.assertFalse(np.array_equal(initial['temperatureK'],final['temperatureK']))


if __name__=='__main__': unittest.main()
