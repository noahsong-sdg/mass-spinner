import gzip
import json
import unittest
from unittest.mock import patch
import compare82 as c


class SealedComparison(unittest.TestCase):
    def fixture(self,voltage=90.,resolved=True):
        case=dict(group='test',scenario='source',anodeCenterM=.07,refinement=4,drive='fixed-current',
                  voltageV=voltage,prediction={'currentsA':{'cathode':100.}})
        raw=json.dumps(dict(cases=[],fixedCurrent=[case])).encode()
        payload=json.dumps(dict(predictionSHA256=c.sha(raw))).encode(); zipped=gzip.compress(payload)
        entry=dict(group='test',path='optics/test.json.gz',sha256=c.sha(zipped),rawSHA256=c.sha(payload))
        index=dict(predictionSHA256=c.sha(raw),groups=[entry])
        row=dict(beta='fixed-current',voltageV=voltage,allPointGate=True,eligiblePointGate=True,
            opticalCentroidMeshGate=resolved,spectralGate=True,opticalSpectrumMeshGate=True)
        return raw,index,{'optics/test.json.gz':zipped},row

    def run_case(self,voltage=90.,resolved=True):
        raw,index,groups,row=self.fixture(voltage,resolved)
        with patch.object(c.previous,'score',return_value={'cases':[row]}): return c.compare(raw,index,groups,[])

    def test_point_match_cannot_hide_incompatible_voltage_or_unresolved_optics(self):
        for voltage,resolved,expected in ((90.,True,False),(18.5,False,False),(18.5,True,True)):
            result=self.run_case(voltage,resolved)
            self.assertTrue(result['anyAllPointPass'])
            self.assertIs(result['anyOpticallyResolvedVoltageCompatiblePointMatch'],expected)
            self.assertFalse(result['experimentalQualification'])

    def test_stale_prediction_and_compressed_packet_rejected(self):
        raw,index,groups,row=self.fixture()
        with self.assertRaises(ValueError): c.compare(raw+b' ',index,groups,[])
        index['groups'][0]['sha256']='0'*64
        with self.assertRaises(ValueError): c.compare(raw,index,groups,[])

    def test_drive_label_cannot_select_a_different_electrical_solution(self):
        raw,index,groups,row=self.fixture(); row['beta']='absolute-voltage'
        with patch.object(c.previous,'score',return_value={'cases':[row]}),self.assertRaises(ValueError):
            c.compare(raw,index,groups,[])


if __name__=='__main__': unittest.main()
