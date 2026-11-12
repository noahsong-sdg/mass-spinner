"""Adversarial saved-result fixtures; imports no physical predictor."""
import copy
import gzip
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import audit82 as audit


class ResultAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory(); cls.root=Path(cls.tmp.name)
        cls.path=cls.root/'scientific/electrical-v82/results/predictions.json'
        cls.path.parent.mkdir(parents=True); (cls.path.parent/'fields').mkdir()
        cls.access=cls.path.parent/'access-results.json'
        cls.m=dict(radiusM=.06,halfLengthM=.24,cathodeRadiusM=.004,anodeWidthM=.02,
                   anodeCenterM=.07,chordsM=[.01,.03,.05])
        for name in audit.INPUTS|audit.SOURCES|{'scientific/electrical-v82/access82.py'}:
            target=cls.root/name; target.parent.mkdir(parents=True,exist_ok=True); target.write_text(name)
        frozen=cls.root/'scientific/flow-v81/results/flow-predictions.json'
        frozen.write_text(json.dumps(dict(manifest=cls.m))); cls.seal=audit.digest(frozen.read_bytes())
        scenarios=[dict(name=shape+'-'+suffix,shape=shape,electronTemperatureEV=te,partition=partition,
                        leadingWeakIonization=leading)
            for shape in ('linear','quadratic') for suffix,te,partition,leading in [
                ('v81-leading-te1',1.,'source',True),('finite-te1',1.,'source',False),
                ('finite-te2.5-source',2.5,'source',False),('finite-te2.5-ei-only',2.5,'electron-ion-only',False),
                ('finite-te2.5-uniform20',2.5,'uniform-20pct',False)]]
        data=dict(manifest=cls.m,scenarios=scenarios,anodeCentersM=[.07,.08],experimentalQualification=False,
                  targetVelocityRead=False,currentConditioning=False,cases=[],fixedCurrent=[],lockedFlow=[],
                  inputSHA256={n:audit.digest((cls.root/n).read_bytes()) for n in audit.INPUTS},
                  sourceSHA256={n:audit.digest((cls.root/n).read_bytes()) for n in audit.SOURCES})
        # Reuse immutable field fixtures across scenarios, but keep each drive/mesh distinct.
        templates={}
        for center in (.07,.08):
            for ref,voltage in ((1,18.5),(2,18.5),(4,18.5),(4,16.5),(4,20.5),(4,92.5)):
                templates[center,ref,voltage]=cls.row(center,ref,voltage)
        for scenario in scenarios:
            for center in (.07,.08):
                group=scenario['name']+'-anode-'+str(center)
                for ref,voltage in ((1,18.5),(2,18.5),(4,18.5),(4,16.5),(4,20.5)):
                    row=copy.deepcopy(templates[center,ref,voltage]); row.update(group=group,scenario=scenario['name'])
                    data['cases'].append(row)
                row=copy.deepcopy(templates[center,4,92.5]); row.update(group=group,scenario=scenario['name'],
                    drive='fixed-current',driveGain=5.,voltageWithinReportedRange=False)
                row.pop('independentSameSigma'); data['fixedCurrent'].append(row)
                p=copy.deepcopy(templates[center,4,18.5]['prediction'])
                p.update(localMidplaneVelocityMS=[0.]*128,chordVelocityMS=[0.]*3,viscousW=0.,jouleW=388.5,
                         electrodePowerW=388.5,currentsA=dict(cathode=21.,anode=-21.))
                data['lockedFlow'].append(dict(group=group,anodeCenterM=center,prediction=p))
        rows=[]
        for n in (16,32,64,128):
            row=dict(nearContactCells=n,radialCells=3*n,axialCells=2*n,radiusM=.004,sigmaRadialSM=1070./197.,
                     sigmaAxialSM=1070.,voltageV=18.5,experimentalQualification=False,
                     chargeResidualRelative=0.,boundaryChargeResidualRelative=0.,insulatingCurrentRelative=0.)
            row['analyticCurrentA']=4*.004*18.5*1070./np.sqrt(197.); row['contactCurrentA']=row['analyticCurrentA']
            row['currentRelativeError']=0.
            if rows: row['refinementRelativeChange']=0.
            rows.append(row)
        cls.access.write_text(json.dumps(dict(rows=rows,experimentalQualification=False,analyticCurrentGate=True,
            currentRefinementGate=True,chargeGate=True,sourceSHA256=audit.digest((cls.root/'scientific/electrical-v82/access82.py').read_bytes()))))
        cls.original=data

    @classmethod
    def tearDownClass(cls): cls.tmp.cleanup()

    @classmethod
    def row(cls,center,ref,voltage):
        r=np.r_[np.linspace(0.,.004,4*ref+1),np.linspace(.004,.06,28*ref+1)[1:]]
        z=np.r_[np.linspace(0.,center-.01,12*ref+1),np.linspace(center-.01,center+.01,4*ref+1)[1:],
                np.linspace(center+.01,.24,32*ref+1)[1:]]
        shape=(48*ref,32*ref); gain=voltage/18.5; current=20.*gain; power=voltage*current
        omega=np.full(shape,gain); phi=np.full(shape,voltage); q=np.full(shape,power/2/np.prod(shape))
        e=2*q; fields=dict(r=r.tolist(),z=z.tolist(),omegaRadS=omega.tolist(),potentialV=phi.tolist(),
                          cellJouleW=q.tolist(),cellRotorWorkW=q.tolist(),cellElectricalInW=e.tolist())
        raw=json.dumps(fields).encode(); compressed=gzip.compress(raw,mtime=0)
        filename='fields/'+str(center)+'-'+str(ref)+'-'+str(voltage)+'.gz'
        (cls.path.parent/filename).write_bytes(compressed)
        receipt=dict(path=filename,sha256=audit.digest(compressed),rawSHA256=audit.digest(raw))
        rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2
        chords=[b*gain for b in cls.m['chordsM']]
        p=dict(currentsA=dict(cathode=current,anode=-current),electrodePowerW=power,jouleW=power/2,viscousW=power/2,
               chordVelocityMS=chords,radialCentersM=rc.tolist(),localMidplaneVelocityMS=(rc*gain).tolist(),propertyRanges=dict(sigmaParallelSM=[1070.,1070.],effectiveBeta=[14.,14.],viscosityPaS=[1e-5,1e-5]),
               **{k:0. for k in ('chargeResidualRelative','boundaryResidualRelative','powerResidualRelative',
                                 'angularResidualRelative','linearResidualRelative','torqueMomentResidualRelative')})
        def region(name,mask):
            indices=np.flatnonzero(mask); amount=float(q[mask].sum())
            return dict(name=name,axialEdgesM=[float(z[indices[0]]),float(z[indices[-1]+1])] if len(indices) else None,
                        jouleW=amount,rotorWorkW=amount,electricalInW=2*amount,
                        jouleVoltEquivalent=amount/current,rotorWorkVoltEquivalent=amount/current,electricalBalanceRelative=0.)
        b=dict(currentsA=p['currentsA'],jouleW=power/2,rotorWorkW=power/2,electricalInW=power,
               chargeResidualRelative=0.,cellElectricalBalanceRelative=0.,globalBudgetRelative=0.,nearAxisAccessLengthM=.056,
               regions=[region('midplane-side',zc<center-.01),region('anode-band',(zc>=center-.01)&(zc<center+.01)),
                        region('cathode-side',zc>=center+.01)],
               nestedEndwallRegions=[region('within-'+str(d)+'m-of-endwall',z[-1]-zc<=d) for d in (.004,.016,.04,.08,.056)])
        reference_radius=(r[:-1]+r[1:])/2
        independent=dict(branchCurrentA=current,chordVelocityMS=chords,radialCentersM=reference_radius.tolist(),
                         localMidplaneVelocityMS=(reference_radius*gain).tolist(),
                         electrodePowerW=power,jouleW=power/2,shearW=power/2,
                         **{k:0. for k in ('chargeResidualRelative','momentumResidualRelative','powerResidualRelative','torqueResidualRelative')})
        return dict(anodeCenterM=center,refinement=ref,voltageV=voltage,drive='absolute-voltage',prediction=p,
                    budget=b,fieldPacket=receipt,independentSameSigma=independent)

    def run_audit(self,data=None):
        self.path.write_text(json.dumps(self.original if data is None else data))
        with patch.object(audit,'V81_SHA',self.seal): return audit.audit(self.path,self.access,self.root)

    def test_complete_packet_preserves_experimental_nonqualification(self):
        result=self.run_audit()
        self.assertFalse(result['experimentalQualification'])
        for key in ('flowNumericalPass','budgetIdentityPass','linearScalingPass','passivityPass','accessBenchmarkPass'):
            self.assertTrue(result[key],key)
        self.assertEqual(len(result['requiredVoltage']),20)
        self.assertTrue(all(not r['voltageWithinReportedRange'] for r in result['requiredVoltage']))

    def test_cli_relative_paths_infer_root_from_resolved_prediction(self):
        self.path.write_text(json.dumps(self.original))
        previous=Path.cwd()
        try:
            os.chdir(self.path.parent.parent)
            with patch.object(audit,'V81_SHA',self.seal):
                result=audit.audit('results/predictions.json','results/access-results.json')
            self.assertTrue(result['linearScalingPass'])
            self.assertEqual(result['predictionSHA256'],audit.digest(self.path.read_bytes()))
        finally:
            os.chdir(previous)

    def test_solid_rotation_at_distinct_cell_centers_is_not_a_flow_failure(self):
        result=self.run_audit()
        self.assertTrue(result['flowNumericalPass'])
        self.assertEqual(len(result['localCoordinateAssessment']),60)
        for row in result['localCoordinateAssessment']:
            np.testing.assert_allclose(np.asarray(row['primaryVelocityMS'])/row['primaryRadiusM'],
                                       np.asarray(row['referenceVelocityMS'])/row['referenceRadiusM'])
            self.assertGreater(row['rawRelativeDifference'],.29)
        self.assertFalse(any(g['metric']=='independent/local velocity' for g in result['gates']))

    def test_cancelled_cell_power_uses_global_power_and_still_detects_material_error(self):
        power=1000.; expected=np.array([1e-15,100.])
        roundoff=expected+np.array([1e-12,0.])
        self.assertGreater(audit.relative(roundoff,expected),1.)
        self.assertLess(audit.linear_field_error('cellElectricalInW',roundoff,expected,power),1e-8)
        self.assertGreater(audit.linear_field_error('cellElectricalInW',expected+np.array([.1,0.]),expected,power),1e-8)
        self.assertGreater(audit.linear_field_error('omegaRadS',roundoff,expected,power),1.)

    def test_stale_source_missing_case_and_mislabeled_drive_rejected(self):
        for mutate in (lambda d:d['sourceSHA256'].__setitem__(next(iter(audit.SOURCES)),'stale'),
                       lambda d:d['cases'].pop(),lambda d:d['fixedCurrent'][0].__setitem__('drive','absolute-voltage')):
            data=copy.deepcopy(self.original); mutate(data)
            with self.assertRaises(ValueError): self.run_audit(data)

    def test_corrupted_compressed_and_raw_receipts_rejected(self):
        for field in ('sha256','rawSHA256'):
            data=copy.deepcopy(self.original); data['cases'][0]['fieldPacket'][field]='stale'
            with self.assertRaisesRegex(ValueError,'field hash mismatch'): self.run_audit(data)

    def test_fixed_current_gain_disagreement_retained(self):
        data=copy.deepcopy(self.original); data['fixedCurrent'][0]['driveGain']=4.
        result=self.run_audit(data)
        self.assertFalse(result['linearScalingPass'])
        self.assertTrue(any(g['metric']=='drive gain' and not g['passed'] for g in result['failures']))

    def test_rehashed_negative_joule_cell_still_fails_identity(self):
        data=copy.deepcopy(self.original); receipt=data['cases'][0]['fieldPacket']
        fields=json.loads(gzip.decompress((self.path.parent/receipt['path']).read_bytes()))
        fields['cellJouleW'][0][0]=-10.
        raw=json.dumps(fields).encode(); zipped=gzip.compress(raw,mtime=0)
        receipt.update(path='fields/negative-joule.gz',sha256=audit.digest(zipped),rawSHA256=audit.digest(raw))
        (self.path.parent/receipt['path']).write_bytes(zipped)
        result=self.run_audit(data)
        self.assertFalse(result['budgetIdentityPass'])
        self.assertTrue(any(g['metric']=='Joule positivity' and not g['passed'] for g in result['failures']))

    def test_locked_control_cannot_change_transport_or_beat_passivity(self):
        data=copy.deepcopy(self.original); p=data['lockedFlow'][0]['prediction']
        p['propertyRanges']['effectiveBeta']=[0.,0.]
        with self.assertRaisesRegex(ValueError,'changed the conductivity'): self.run_audit(data)
        data=copy.deepcopy(self.original); p=data['lockedFlow'][0]['prediction']
        p['currentsA']['cathode']=19.
        result=self.run_audit(data)
        self.assertFalse(result['passivityPass'])

    def test_region_identity_and_refinement_failures_are_retained(self):
        data=copy.deepcopy(self.original)
        row=next(r for r in data['cases'] if r['refinement']==4 and r['voltageV']==18.5)
        row['budget']['regions'][0]['rotorWorkVoltEquivalent']*=2
        result=self.run_audit(data)
        self.assertFalse(result['budgetIdentityPass']); self.assertFalse(result['budgetRefinementPass'])

    def test_zero_denominator_refinement_is_unavailable_failure(self):
        self.assertIsNone(audit.relative(1.,0.))
        self.assertEqual(audit.relative(0.,0.),0.)
        data=copy.deepcopy(self.original)
        row=next(r for r in data['cases'] if r['refinement']==4 and r['voltageV']==18.5)
        row['budget']['regions'][0]['rotorWorkVoltEquivalent']=0.
        result=self.run_audit(data)
        self.assertTrue(any(g['category']=='budget-refinement' and g['value'] is None and not g['passed'] for g in result['failures']))

    def test_false_experimental_claim_rejected(self):
        data=copy.deepcopy(self.original); data['experimentalQualification']=True
        with self.assertRaises(ValueError): self.run_audit(data)


if __name__=='__main__': unittest.main()
