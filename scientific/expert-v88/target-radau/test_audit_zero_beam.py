"""Independent negative controls for the supplemental exact-zero gate."""
from copy import deepcopy
import math
import unittest
import audit_zero_beam as a


def fixture():
    return {'rows':[{'beam':{'beamCurrentA':0},'completed':True,
        'history':[{'neutronRateS':0},{'neutronRateS':-0.0}]},
        {'beam':{'beamCurrentA':.001},'completed':True,'history':[{'neutronRateS':42}]}]}


class ZeroBeamRateControls(unittest.TestCase):
    def test_exact_zero_admitted_without_promoting_original_gates(self):
        result=a.audit(fixture())
        self.assertTrue(result['zeroBeamRateAdmissionPass'])
        self.assertEqual(result['zeroCurrentTrajectories'],1)
        self.assertEqual(result['zeroCurrentSamples'],2)
        self.assertFalse(result['numericalControlPass'])
        self.assertFalse(result['experimentalQualification'])

    def test_positive_negative_and_nonfinite_zero_beam_rates_rejected(self):
        for rate in (1.,-1.,1e-300,-1e-300,math.inf,-math.inf,math.nan):
            packet=fixture(); packet['rows'][0]['history'][0]['neutronRateS']=rate
            with self.subTest(rate=rate),self.assertRaisesRegex(ValueError,'exactly zero'):
                a.audit(packet)

    def test_missing_zero_beam_trajectory_is_not_a_pass(self):
        for mutation in ('failed','empty','absent'):
            packet=deepcopy(fixture())
            if mutation=='failed': packet['rows'][0]['completed']=False
            if mutation=='empty': packet['rows'][0]['history']=[]
            if mutation=='absent': packet['rows'].pop(0)
            with self.subTest(mutation=mutation),self.assertRaises(ValueError): a.audit(packet)

    def test_boolean_or_non_numeric_rates_are_not_physical_zero(self):
        for rate in (False,True,None,'0'):
            packet=fixture(); packet['rows'][0]['history'][0]['neutronRateS']=rate
            with self.subTest(rate=rate),self.assertRaises(ValueError): a.audit(packet)


if __name__=='__main__': unittest.main()
