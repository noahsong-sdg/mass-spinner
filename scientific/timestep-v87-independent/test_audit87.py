"""Prospective active-CFL admission and independent acoustic bound controls."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
import audit87 as a


def fixture(cfl=.2,cap=1e-5):
    r,z=np.linspace(0,.06,5),np.linspace(0,.24,7)
    volume=np.pi*np.diff(z)[:,None]*np.diff(r*r)[None,:]
    q=np.zeros((6,6,4)); q[0]=.001*volume; q[4]=1.5*a.old.KB*3000*q[0]/a.old.MASS; q[5]=q[0]/2
    fields=a.old.primitive(r,z,q)
    state=dict(radialEdgesM=r.tolist(),axialEdgesM=z.tolist(),snapshots=[],history=[])
    for t in a.old.TIMES:
        state['snapshots'].append(dict(timeS=t,q=q.tolist(),**{k:v.tolist() for k,v in fields.items()}))
    bound=a.acoustic_bound(state,state['snapshots'][0],cfl)
    elapsed=0.; schedule=[]
    for target in a.old.TIMES[1:]:
        while elapsed<target:
            remaining=target-elapsed; dt=min(bound,remaining,cap)
            schedule.append(dict(timeBeforeS=elapsed,acousticBoundS=bound,remainingToReportS=remaining,acceptedDtS=dt))
            elapsed+=dt; state['history'].append(dict(timeS=elapsed,dtS=dt))
    case=dict(cfl=cfl,maxDtS=cap,schedule=schedule,stepCount=len(schedule))
    return state,case


class ActiveCFLAuditControls(unittest.TestCase):
    def test_uniform_cylindrical_bound_has_independent_analytic_value(self):
        state,case=fixture(); sound=np.sqrt((5/3)*a.old.KB*3000/a.old.MASS)
        expected=.2/(2*sound*(1/.015+1/.04))
        actual=a.acoustic_bound(state,state['snapshots'][0],case['cfl'])
        self.assertAlmostEqual(actual/expected,1.,places=14)

    def test_genuine_acoustic_schedule_and_reporting_state_checks(self):
        state,case=fixture(); result=a.check_schedule(case,state)
        self.assertTrue(result['passed'])
        self.assertEqual(result['acousticLimitedNonterminalFraction'],1.)
        self.assertEqual(len(result['independentSnapshotCFLChecks']),3)

    def test_cap_limited_schedule_is_not_active_cfl_refinement(self):
        state,case=fixture(cap=1e-8); result=a.check_schedule(case,state)
        self.assertFalse(result['passed'])
        self.assertEqual(result['acousticLimitedNonterminalFraction'],0.)
        self.assertEqual(len(result['independentSnapshotCFLChecks']),3)

    def test_roundoff_residual_step_does_not_duplicate_reporting_state(self):
        state,case=fixture(cap=1e-6-5e-20)
        self.assertTrue(any(0<abs(s['timeBeforeS']-1e-6)<1e-16 for s in case['schedule']))
        result=a.check_schedule(case,state)
        self.assertEqual([s['timeS'] for s in result['independentSnapshotCFLChecks']],list(a.old.TIMES[:-1]))
        self.assertFalse(result['passed'])
        self.assertEqual(result['acousticLimitedNonterminalFraction'],0.)

    def test_fake_cfl_label_or_candidate_rejected_independently(self):
        for corruption in ('cfl','bound'):
            state,case=fixture()
            if corruption=='cfl': case['cfl']/=2
            else:
                # Keep the accepted-minimum decision unchanged, so the saved
                # reporting-state reconstruction must detect the false bound.
                case['schedule'][-1]['acousticBoundS']*=1.1
                case['schedule'][0]['acousticBoundS']*=1.1
            with self.subTest(corruption=corruption),self.assertRaises(ValueError):
                a.check_schedule(case,state)

    def test_missing_or_corrupt_accepted_schedule_rejected(self):
        for mutation in ('missing','dt','before','remaining','history'):
            state,case=fixture()
            if mutation=='missing': case['schedule'].pop()
            if mutation=='dt': case['schedule'][0]['acceptedDtS']*=.9
            if mutation=='before': case['schedule'][0]['timeBeforeS']=1e-9
            if mutation=='remaining': case['schedule'][0]['remainingToReportS']*=.9
            if mutation=='history': state['history'][0]['dtS']*=.9
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):
                a.check_schedule(case,state)

    def test_three_case_inventory_and_unchanged_slice(self):
        cases=[dict(cfl=c,nr=64,nz=96,maxDtS=1e-7,scenario='linear-finite-te1',anodeCenterM=.07,completed=True)
            for c in a.CFLS]
        a.check_inventory(cases,'linear-finite-te1')
        for mutation in ('order','missing','failed','grid','scenario','cap','anode'):
            bad=deepcopy(cases)
            if mutation=='order': bad.reverse()
            if mutation=='missing': bad.pop()
            if mutation=='failed': bad[0]['completed']=False
            if mutation=='grid': bad[0]['nr']=32
            if mutation=='scenario': bad[0]['scenario']='quadratic-finite-te1'
            if mutation=='cap': bad[0]['maxDtS']=5e-8
            if mutation=='anode': bad[0]['anodeCenterM']=.08
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):
                a.check_inventory(bad,'linear-finite-te1')

    def test_true_temporal_success_cannot_promote_spatial_or_experimental_status(self):
        activity=[dict(cfl=c,stepCount=n,maximumAcceptedDtS=dt,passed=True)
            for c,n,dt in zip(a.CFLS,(100,200,400),(1e-7,5e-8,2.5e-8))]
        result=a.assessment([{'passed':True}],[{'passed':True}],activity)
        self.assertTrue(result['temporalSliceNumericalPass'])
        self.assertFalse(result['fullModelNumericallyQualified'])
        self.assertFalse(result['allRequiredNumericalPass'])
        self.assertFalse(result['experimentalQualification'])

    def test_inactive_step_counts_or_nonshrinking_maximum_fail(self):
        for counts,steps in (((100,100,101),(1e-7,1e-7,9e-8)),((100,200,400),(1e-7,1e-7,5e-8))):
            activity=[dict(cfl=c,stepCount=n,maximumAcceptedDtS=dt,passed=True)
                for c,n,dt in zip(a.CFLS,counts,steps)]
            result=a.assessment([{'passed':True}],[{'passed':True}],activity)
            self.assertFalse(result['temporalSliceNumericalPass'])

    def test_exact_zero_and_nonzero_reference_contraction_rules_preserved(self):
        self.assertTrue(a.panel.gate(0.,0.,.02)['passed'])
        self.assertTrue(a.panel.gate(.01,.005,.02)['passed'])
        self.assertFalse(a.panel.gate(0.,.001,.02)['passed'])
        self.assertFalse(a.panel.gate(None,.001,.02)['passed'])

    def test_prediction_seal_rejected_before_other_admission(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'predictions.json'; path.write_text(json.dumps({}))
            with self.assertRaisesRegex(ValueError,'Prediction seal'):
                a.audit(path,root=directory,expected_sha='0'*64)


if __name__=='__main__':
    unittest.main()
