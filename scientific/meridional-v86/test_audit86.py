"""Adversarial saved-state and no-floor convergence admission controls."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
import audit86 as a


def fixture(nr=4,nz=6):
    r,z=np.linspace(0,.06,nr+1),np.linspace(0,.24,nz+1)
    volume=np.pi*np.diff(z)[:,None]*np.diff(r*r)[None,:]
    mass=.001*volume; q=np.zeros((6,nz,nr))
    q[0]=mass; q[4]=1.5*a.KB*3000*mass/a.MASS; q[5]=mass/2
    primitive=a.primitive(r,z,q)
    snaps=[dict(timeS=t,q=q.tolist(),**{k:v.tolist() for k,v in primitive.items()}) for t in a.TIMES]
    history=[dict(timeS=i*1e-7,dtS=1e-7,massRelativeDrift=0.,speciesRelativeDrift=0.,
        energyRelativeDefect=0.,chargeRelativeResidual=0.,electricalWorkJ=0.,ohmicJ=0.,
        emNumericalHeatJ=0.,viscousHeatJ=0.,viscousNumericalHeatJ=0.,maximumTemperatureK=3000.,
        minimumTemperatureK=3000.,maximumTotalMach=0.) for i in range(1,41)]
    state=dict(radialEdgesM=r.tolist(),axialEdgesM=z.tolist(),snapshots=snaps,history=history,
        conditionalRelease=True,thermalSteadyState=False,experimentalQualification=False,
        prescribedCurrent=True,absoluteCurrentPrediction=False)
    case=dict(nr=nr,nz=nz,maxDtS=1e-7,stepCount=40,maximumTemperatureK=3000.)
    return state,case,dict(radiusM=.06,halfLengthM=.24)


def jobs():
    cases=[dict(scenario=s,anodeCenterM=c,nr=n,nz=3*n//2,maxDtS=1e-7,completed=True)
        for s in ('a','b','c','d') for c in (.07,.08) for n in (16,32,64)]
    cases += [dict(scenario='a',anodeCenterM=.07,nr=64,nz=96,maxDtS=dt,completed=True)
        for dt in (5e-8,2.5e-8)]
    return cases


class AuditTests(unittest.TestCase):
    def test_independent_monatomic_eos_and_uniform_ledgers(self):
        state,case,manifest=fixture(); result=a.check_state(state,case,manifest)
        self.assertTrue(all(v<1e-10 for v in result.values()))
        q=np.asarray(state['snapshots'][0]['q'])
        p=a.primitive(state['radialEdgesM'],state['axialEdgesM'],q)
        np.testing.assert_allclose(p['pressurePa'],.001*a.KB*3000/a.MASS,rtol=2e-15)
        np.testing.assert_allclose(p['temperatureK'],3000.,rtol=2e-15)

    def test_wrong_species_mass_primitive_is_rejected(self):
        state,case,manifest=fixture()
        state['snapshots'][1]['temperatureK']=(np.asarray(state['snapshots'][1]['temperatureK'])*40/39.948).tolist()
        with self.assertRaisesRegex(ValueError,'primitive temperatureK'):
            a.check_state(state,case,manifest)

    def test_corrupt_conserved_snapshot_is_rejected(self):
        for field in (0,3,4,5):
            state,case,manifest=fixture(); state['snapshots'][2]['q'][field][0][0]+=1e-9
            with self.subTest(field=field),self.assertRaises(ValueError):
                a.check_state(state,case,manifest)

    def test_global_energy_check_rejects_consistent_primitive_corruption(self):
        state,case,manifest=fixture(); s=state['snapshots'][1]
        q=np.asarray(s['q']); q[4]*=1.01; s['q']=q.tolist()
        s.update({k:v.tolist() for k,v in a.primitive(state['radialEdgesM'],state['axialEdgesM'],q).items()})
        state['history'][9]['maximumTemperatureK']=3030.
        with self.assertRaisesRegex(ValueError,'total-energy'):
            a.check_state(state,case,manifest)

    def test_missing_schedule_or_history_cannot_qualify(self):
        for mutation in ('snapshot','history','dt','reported_failure','qualification'):
            state,case,manifest=fixture()
            if mutation=='snapshot': state['snapshots'].pop(1)
            if mutation=='history': state['history'].pop(9)
            if mutation=='dt': state['history'][0]['dtS']*=2
            if mutation=='reported_failure': state['history'][0]['chargeRelativeResidual']=1e-5
            if mutation=='qualification': state['thermalSteadyState']=True
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):
                a.check_state(state,case,manifest)

    def test_complete_jobs_and_failed_job_retention(self):
        a.check_inventory(jobs(),['a','b','c','d'])
        for mutation in ('missing','duplicate','failed','hidden_error','timestamp','grid'):
            cases=jobs()
            if mutation=='missing': cases.pop()
            if mutation=='duplicate': cases[-1]=deepcopy(cases[0])
            if mutation=='failed': cases[0]['completed']=False
            if mutation=='hidden_error': cases[0]['error']='retained unsuccessful solve'
            if mutation=='timestamp': cases[0]['maxDtS']=2e-7
            if mutation=='grid': cases[0]['nz']+=1
            with self.subTest(mutation=mutation),self.assertRaises(ValueError):
                a.check_inventory(cases,['a','b','c','d'])

    def test_exact_zero_meridional_fields_and_increments_pass(self):
        coarse,_,_=fixture(4,6); fine,_,_=fixture(8,12)
        values=a.differences(coarse,fine,0,16)
        for name in ('vrMPS','vzMPS','densityKgM3/increment','temperatureK/increment'):
            self.assertEqual(values[name]['value'],0.)
            self.assertEqual(values[name]['referenceRMS'],0.)

    def test_nonzero_tiny_flow_is_not_hidden_behind_normalizing_floor(self):
        coarse,_,_=fixture(4,6); fine,_,_=fixture(8,12)
        fine['snapshots'][1]['vrMPS']=(np.ones((12,8))*1e-20).tolist()
        values=a.differences(coarse,fine,1,16)
        self.assertAlmostEqual(values['vrMPS']['value'],1.,places=14)
        self.assertGreater(values['vrMPS']['referenceRMS'],0.)
        self.assertLess(values['vrMPS']['referenceRMS'],1e-19)

    def test_nonzero_error_against_zero_reference_is_unresolved(self):
        coarse,_,_=fixture(); fine,_,_=fixture()
        coarse['snapshots'][1]['vrMPS']=(np.ones((6,4))*1e-20).tolist()
        self.assertIsNone(a.differences(coarse,fine,1,16)['vrMPS']['value'])

    def test_prediction_seal_is_checked_before_other_admission(self):
        with tempfile.TemporaryDirectory() as temp:
            p=Path(temp)/'predictions.json'; p.write_text(json.dumps({}))
            with self.assertRaisesRegex(ValueError,'Prediction seal'):
                a.audit(p,root=temp,expected_sha='0'*64)


if __name__=='__main__':
    unittest.main()
