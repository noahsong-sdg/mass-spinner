import copy
import unittest
from compare import score


class ScoringControls(unittest.TestCase):
    def fixture(self):
        points=[dict(id='one',radiusM=.01,velocityMS=100.,extractionUnderFivePercent=True),
                dict(id='two',radiusM=.02,velocityMS=100.,extractionUnderFivePercent=False)]
        spectra=[dict(id=p['id'],temperatureK=t,instrumentSigmaMS=s,
                      refinements=[dict(centroidMS=v,modeMS=v)],spectralGate=True,fluxGate=True,opticalSpectrumMeshGate=True)
                 for t in (1400,1800,2900,5950,7250,'linear') for s in (0.,500.,1000.)
                 for p,v in zip(points,(90.,10.))]
        pred=dict(locations=[dict(id=p['id'],radiusM=p['radiusM']) for p in points],
                  cases=[dict(beta=9,voltageV=18.5,closures=[dict(edgeClosure='linear',spectra=spectra,
                         centroidMeshes=[dict(velocityMS=[90.,10.]),dict(velocityMS=[90.,10.])])])])
        return pred,points

    def test_unchanged_extraction_mask_and_no_prediction_mutation(self):
        pred,points=self.fixture(); before=copy.deepcopy(pred)
        result=score(pred,points)
        self.assertFalse(result['experimentalQualification'])
        self.assertTrue(result['anyEligiblePointPass'])
        self.assertFalse(result['anyAllPointPass'])
        self.assertEqual(len(result['cases']),36)
        points[0]['velocityMS']=1000.
        self.assertFalse(score(pred,points)['anyEligiblePointPass'])
        self.assertEqual(pred,before)

    def test_changed_target_geometry_is_rejected(self):
        pred,points=self.fixture(); points[0]['radiusM']+=.001
        with self.assertRaises(ValueError): score(pred,points)


if __name__=='__main__': unittest.main()
