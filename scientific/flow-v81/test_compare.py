import copy
import json
import unittest
from unittest.mock import patch
import compare


class ComparisonControls(unittest.TestCase):
    def setUp(self):
        self.flow=b'{"targetDataRead":false}'
        self.raw=json.dumps(dict(flowPredictionSHA256=compare.sha(self.flow))).encode()
        self.index=dict(flowPredictionSHA256=compare.sha(self.flow),betaConvention='Unused source-case key',groups=[dict(
            transportCase='fixed',path='optics/fixed.json',sha256=compare.sha(self.raw))])
        self.groups={'optics/fixed.json':self.raw}

    def test_targets_only_enter_post_seal_scorer(self):
        original=copy.deepcopy((self.flow,self.index,self.groups))
        def scorer(group,points):
            return dict(cases=[dict(eligiblePointGate=points[0]['pass'],allPointGate=points[0]['pass'])])
        with patch.object(compare.previous,'score',side_effect=scorer):
            first=compare.compare(self.flow,self.index,self.groups,[{'pass':True}])
            changed=compare.compare(self.flow,self.index,self.groups,[{'pass':False}])
        self.assertTrue(first['anyAllPointPass']); self.assertFalse(changed['anyAllPointPass'])
        self.assertFalse(first['experimentalQualification'])
        self.assertEqual(original,(self.flow,self.index,self.groups))

    def test_stale_flow_or_optics_is_rejected(self):
        for flow,groups in ((b'changed',self.groups),(self.flow,{'optics/fixed.json':b'changed'})):
            with self.assertRaises(ValueError): compare.compare(flow,self.index,groups,[])


if __name__=='__main__': unittest.main()
