import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import audit85 as a


def fixture(root):
    sources={}
    for name in a.SOURCES:
        p=root/name; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(name); sources[name]=a.sha(p.read_bytes())
    manifest=dict(magneticT=.13,branchCurrentA=100.,radiusM=.06,cathodeRadiusM=.004,halfLengthM=.24,anodeWidthM=.02)
    torque=.13*100*(.06**2-.004**2)/2
    packet=dict(baselinePredictionSHA256=a.BASELINE,viscosityModel=a.LABEL,v85SourceSHA256=sources,manifest=manifest,cases=[])
    baseline=dict(manifest=manifest,cases=[])
    diagnostics=dict(baselinePredictionSHA256=a.BASELINE,targetVelocityRead=False,circulationVelocityPredicted=False,cases=[])
    for label,target in [('published-uniform',packet),('radial-viscosity',baseline)]:
        for scenario in a.audit84.NAMES:
            for center in (.07,.08):
                for n in (1,2,4,8):
                    key=dict(scenario=scenario,anodeCenterM=center,refinement=n)
                    seal=f'{label}-{scenario}-{center}-{n}'
                    target['cases'].append(dict(**key,fieldPacket=dict(sha256=seal),prediction=dict(viscousW=4.)))
                    flux=[0.,.3*torque,.6*torque]; wall=[.2*torque,.2*torque]; drive=[.5*torque,.5*torque]
                    residual=max(abs(drive[i]-wall[i]-(flux[i+1]-flux[i])) for i in range(2))/torque
                    d=dict(workW={k:1. for k in a.WORK},radialWallTorqueNm=.4*torque,endWallTorqueNm=.6*torque,
                        sourceTorqueNm=torque,slabBalanceRelative=residual,axialEdgesM=[0.,.12,.24],
                        axialViscousTorqueFluxNm=flux,sourceTorqueBySlabNm=drive,radialWallTorqueBySlabNm=wall,
                        pressureLoopPa=dict(centrifugalPa=2.,hallPa=-1.,totalPa=1.),
                        rectangleMeanForceCurlNM4=dict(centrifugalPa=500.,hallPa=-250.,totalPa=250.),
                        pressureRectangleM=[.01,.05,.02,.12],circulationVelocityPredicted=False)
                    diagnostics['cases'].append(dict(**key,viscosityModel=label,sourceFieldSHA256=seal,reportedViscousW=4.,diagnostic=d))
    return packet,baseline,diagnostics


class IndependentAudit(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup); self.root=Path(self.temp.name)
        self.packet,self.baseline,self.d=fixture(self.root)

    def check(self): return a.check(self.packet,self.baseline,self.d,self.root)

    def test_complete_manufactured_inventory_and_ledgers_pass(self):
        r=self.check(); self.assertEqual(r['diagnosticCaseCount'],64)
        self.assertTrue(r['diagnosticIdentityPass']); self.assertTrue(r['partitionNumericalPass']); self.assertTrue(r['pressureNumericalPass'])
        self.assertEqual(r['diagnosticFailures'],[]); self.assertFalse(r['circulationVelocityPredicted'])

    def test_missing_duplicate_and_wrong_family_rejected(self):
        for operation in ('missing','duplicate','family'):
            with self.subTest(operation=operation):
                self.d=fixture(self.root)[2]
                if operation=='missing': self.d['cases'].pop()
                elif operation=='duplicate': self.d['cases'][-1]=copy.deepcopy(self.d['cases'][0])
                else: self.d['cases'][0]['viscosityModel']='fitted'
                with self.assertRaises(ValueError): self.check()

    def test_stale_or_incomplete_new_source_receipt_rejected(self):
        name=next(iter(a.SOURCES)); (self.root/name).write_text('changed')
        with self.assertRaisesRegex(ValueError,'Stale new source'): self.check()
        self.packet,self.baseline,self.d=fixture(self.root); self.packet['v85SourceSHA256'].pop(name)
        with self.assertRaisesRegex(ValueError,'incomplete'): self.check()

    def test_false_qualification_and_changed_boundary_rejected(self):
        for key in ('targetVelocityRead','circulationVelocityPredicted'):
            self.d[key]=True
            with self.assertRaises(ValueError): self.check()
            self.d[key]=False
        self.d['cases'][0]['diagnostic']['pressureRectangleM'][-1]=.11
        with self.assertRaisesRegex(ValueError,'domain'): self.check()

    def test_stale_field_and_reported_work_rejected(self):
        row=self.d['cases'][0]; row['sourceFieldSHA256']='stale'
        with self.assertRaisesRegex(ValueError,'field binding'): self.check()
        row['sourceFieldSHA256']=self.packet['cases'][0]['fieldPacket']['sha256']; row['reportedViscousW']=5.
        with self.assertRaisesRegex(ValueError,'work binding'): self.check()

    def test_work_and_pressure_identity_failures_are_retained(self):
        row=self.d['cases'][0]['diagnostic']; row['workW']['radialInteriorW']*=2
        row['pressureLoopPa']['totalPa']+=1.
        r=self.check(); self.assertFalse(r['diagnosticIdentityPass'])
        metrics={g['metric'] for g in r['diagnosticFailures']}
        self.assertIn('shear work',metrics); self.assertIn('pressure components',metrics)

    def test_nonfinite_and_false_residual_receipts_rejected(self):
        row=self.d['cases'][0]['diagnostic']; row['slabBalanceRelative']=.1
        with self.assertRaisesRegex(ValueError,'residual receipt'): self.check()
        self.d=fixture(self.root)[2]; self.d['cases'][0]['diagnostic']['pressureLoopPa']['hallPa']=float('nan')
        with self.assertRaises(ValueError): self.check()

    def test_final_pressure_failure_is_separate_from_work_pass(self):
        row=next(r for r in self.d['cases'] if r['refinement']==4)['diagnostic']
        row['pressureLoopPa']=dict(centrifugalPa=4.,hallPa=-2.,totalPa=2.)
        row['rectangleMeanForceCurlNM4']={k:v/.004 for k,v in row['pressureLoopPa'].items()}
        r=self.check(); self.assertTrue(r['diagnosticIdentityPass']); self.assertTrue(r['partitionNumericalPass'])
        self.assertFalse(r['pressureNumericalPass']); self.assertTrue(any(g['final'] for g in r['diagnosticFailures']))

    def test_coarse_failures_retained_without_rejecting_final_convergence(self):
        row=next(r for r in self.d['cases'] if r['refinement']==1)['diagnostic']
        row['pressureLoopPa']=dict(centrifugalPa=4.,hallPa=-2.,totalPa=2.)
        row['rectangleMeanForceCurlNM4']={k:v/.004 for k,v in row['pressureLoopPa'].items()}
        r=self.check(); self.assertTrue(r['pressureNumericalPass']); self.assertGreater(len(r['diagnosticFailures']),0)
        self.assertTrue(all(not g['final'] for g in r['diagnosticFailures']))

    def test_main_preserves_failed_report_and_returns_nonzero(self):
        output=self.root/'audit.json'; result=dict(allRequiredNumericalPass=False,experimentalQualification=False)
        with patch.object(a,'audit',return_value=result),patch.object(a.sys,'argv',['audit85.py','input',str(output)]):
            self.assertEqual(a.main(),1)
        self.assertEqual(json.loads(output.read_text()),result)
        result['allRequiredNumericalPass']=True
        with patch.object(a,'audit',return_value=result),patch.object(a.sys,'argv',['audit85.py','input',str(output)]):
            self.assertEqual(a.main(),0)

    def test_supplemental_directional_work_does_not_replace_vanishing_partition_failure(self):
        row=next(r for r in self.d['cases'] if r['refinement']==8)['diagnostic']
        row['workW']=dict(radialInteriorW=1.75,radialWallW=.25,axialInteriorW=1.75,endWallW=.25)
        r=self.check()
        self.assertTrue(r['diagnosticIdentityPass']); self.assertTrue(r['supplementalDirectionalWorkPass'])
        self.assertFalse(r['partitionNumericalPass'])
        self.assertTrue(any(g['final'] and g['category']=='partition' and not g['passed'] for g in r['diagnosticGates']))
        decay=next(d for d in r['supplementalHalfCellDecay'] if d['coarseToFineWorkRatio']==4.)
        self.assertAlmostEqual(decay['absoluteChangeOverFineTotalShear'],.75/4)
        self.assertGreater(decay['coarseToFineWidthRatio'],3.9)
        # Exercise actual final aggregation: a supplemental pass cannot waive an original failure.
        baseline_raw=json.dumps(self.baseline).encode(); seal=a.sha(baseline_raw)
        with patch.object(a,'BASELINE',seal):
            self.packet['baselinePredictionSHA256']=self.d['baselinePredictionSHA256']=seal
            raw=json.dumps(self.packet).encode(); self.d['predictionSHA256']=a.sha(raw)
            directory=self.root/'scientific/axial-v85/results'; directory.mkdir(parents=True)
            (directory/'predictions.json').write_bytes(raw); (directory/'diagnostics.json').write_text(json.dumps(self.d))
            baseline_path=self.root/'scientific/boundary-v84/results/predictions.json'
            baseline_path.parent.mkdir(parents=True); baseline_path.write_bytes(baseline_raw)
            with patch.object(a.audit84,'audit',return_value=dict(identityPass=True,flowNumericalPass=True,experimentalQualification=False)):
                final=a.audit(directory/'predictions.json',self.root)
            self.assertTrue(final['supplementalDirectionalWorkPass']); self.assertFalse(final['allRequiredNumericalPass'])

    def test_supplemental_fixed_domain_failure_is_retained_separately(self):
        row=next(r for r in self.d['cases'] if r['refinement']==4)
        row['diagnostic']['workW']['radialInteriorW']=1.5
        row['reportedViscousW']=4.5
        context=(row['scenario'],row['anodeCenterM'],row['refinement'])
        target=self.packet if row['viscosityModel']=='published-uniform' else self.baseline
        source=next(c for c in target['cases'] if (c['scenario'],c['anodeCenterM'],c['refinement'])==context)
        source['prediction']['viscousW']=4.5
        r=self.check(); self.assertTrue(r['diagnosticIdentityPass'])
        self.assertFalse(r['supplementalDirectionalWorkPass'])
        self.assertTrue(any(not g['passed'] for g in r['supplementalGates']))


if __name__=='__main__': unittest.main()
