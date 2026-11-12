import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import summarize


class SummaryControls(unittest.TestCase):
    def test_failed_assessment_is_never_labeled_failed_flow(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)
            assessment=dict(group='assessment',metric='curl',value=.2,final=True)
            flow=dict(cases=[])
            audit=dict(flowNumericalPass=True,meridionalAssessmentNumericalPass=False,
                       failures=[assessment],sourceAbsoluteElectrical=[],gates=[assessment])
            optical=dict(finalNumericalPass=True,failures=[],lpUnavailable=[])
            for name,data in [('flow-predictions',flow),('comparison',{'cases':[]}),
                              ('flow-audit',audit),('optical-audit',optical)]:
                (root/(name+'.json')).write_text(json.dumps(data))
            with patch.object(summarize,'HERE',root),contextlib.redirect_stdout(io.StringIO()): summarize.main()
            result=json.loads((root/'summary.json').read_text())
            self.assertTrue(result['flowNumericalPass'])
            self.assertEqual(result['finalFlowFailures'],[])
            self.assertEqual(result['finalAssessmentFailures'],[assessment])
            self.assertFalse(result['meridionalAssessmentNumericalPass'])


if __name__=='__main__': unittest.main()
