"""Independent saved-array controls; no flow or optical producer imports."""
import gzip
import json
import math
import unittest

from audit_optics84 import audit, NAMES, OPTIONS, RESIDUALS, sha, TEMPERATURES, THERMAL


def packed(value):
    raw=json.dumps(value,allow_nan=False).encode(); payload=gzip.compress(raw,mtime=0)
    return payload,dict(sha256=sha(payload),rawSHA256=sha(raw))


def path(b,inner,outer=.06):
    return 2*(math.sqrt(max(outer**2-b**2,0))-math.sqrt(max(inner**2-b**2,0)))


def fixture():
    operators,diagnostics={'operator.py':'source'},{'brightness.json':'brightness'}
    locations=[dict(id=f'p{i}',radiusM=.005+.01*i) for i in range(5)]
    brightness=[dict(radiusM=.055*i/28,brightness=.01,brightnessExtractionRange=[0.,1.]) for i in range(29)]
    recs=[]; bounds=[]
    for n in (64,128,256):
        edges=[.06*i/n for i in range(n+1)]; edges[-1]=.06
        light=[path(p['radiusM'],edges[-2]) for p in brightness]
        for closure in ('linear','sqrt'):
            recs.append(dict(mesh=n,edgeClosure=closure,radialEdgesM=edges,
                             emissivity=[0.]*(n-1)+[1.],originalReprojectedBrightness=light))
        points=[]
        for p in locations:
            cert=dict(epsilon=[0.]*(n-1)+[1.],brightness=light,targetBrightness=path(p['radiusM'],edges[-2]),
                      centroidMS=p['radiusM']*1000,residuals={k:0. for k in RESIDUALS})
            points.append(dict(id=p['id'],status='available',minMS=cert['centroidMS'],maxMS=cert['centroidMS'],
                               minimumCertificate=cert,maximumCertificate=cert))
        bounds.append(dict(mesh=n,points=points))
    baseline=dict(locations=locations,brightness=brightness,reconstructions=recs)
    packet=dict(manifest=dict(radiusM=.06),experimentalQualification=False,targetVelocityRead=False,currentFitted=False,
                absoluteCurrentPrediction=False,correctedVoltagePrediction=False,prescribedCurrent=True,currentConditioning=True,cases=[])
    fields={}
    for scenario in sorted(NAMES):
        for center in (.07,.08):
            for n in (1,2,4,8):
                # Deliberately graded; solid rotation gives an exact LOS speed b*omega.
                edges=[.06*(i/(32*n))**1.5 for i in range(32*n+1)]; edges[-1]=.06
                field=dict(r=edges,omegaRadS=[[1000.]*(32*n)])
                payload,receipt=packed(field); name=f'fields/{scenario}-{center}-{n}.json.gz'
                if n in (4,8): fields[name]=payload
                packet['cases'].append(dict(scenario=scenario,anodeCenterM=center,refinement=n,fieldPacket=dict(path=name,**receipt)))
    raw=json.dumps(packet).encode(); seal=sha(raw)
    index=dict(experimentalQualification=False,targetVelocityRead=False,predictionSHA256=seal,
               operatorSHA256=operators,diagnosticSHA256=diagnostics,adapterSHA256='adapter',groups=[])
    spectra=[]
    for p in locations:
        for t in TEMPERATURES:
            for instrument in (0.,500.,1000.):
                summary=dict(centroidMS=p['radiusM']*1000,modeMS=p['radiusM']*1000,
                             varianceM2S2=THERMAL*(1800 if t=='linear' else t)+instrument**2,capturedFlux=1.)
                spectra.append(dict(id=p['id'],temperatureK=t,instrumentSigmaMS=instrument,coarseOpticalSpectrum=summary,
                    refinements=[dict(binWidthMS=b,**summary) for b in (10.,5.,2.5)],finalRelativeChange=0.,
                    opticalMeshRelativeChanges=dict(modeMS=0.,varianceM2S2=0.),spectralGate=True,fluxGate=True,opticalSpectrumMeshGate=True))
    meshes=[dict(mesh=n,velocityMS=[p['radiusM']*1000 for p in locations]) for n in (64,128,256)]
    groups={}
    for row in packet['cases']:
        if row['refinement'] not in (4,8): continue
        label=f"{row['scenario']}-a{row['anodeCenterM']}-n{row['refinement']}"; name='optics/'+label+'.json.gz'
        case=dict(beta='ring-current',voltageV=None,refinement=4,brightnessBounds=bounds,
                  closures=[dict(edgeClosure=c,centroidMeshes=meshes,spectra=spectra) for c in ('linear','sqrt')])
        data=dict(baseline,experimentalQualification=False,predictionSHA256=seal,actualFlowRefinement=row['refinement'],cases=[case])
        groups[name],receipt=packed(data); index['groups'].append(dict(group=label,path=name,**receipt))
    points=[dict(p,velocityMS=p['radiusM']*1000,extractionUnderFivePercent=i<3) for i,p in enumerate(locations)]
    score=dict(predictionSHA256=seal,experimentalQualification=False,currentFitted=False,absoluteCurrentPrediction=False,
               correctedVoltagePrediction=False,prescribedCurrent=True,points=points,alternatives=576,cases=[],
               anyAllPointPass=True,anyEligiblePointPass=True,anyResolvedOpticalPointMatch=True)
    for scenario in sorted(NAMES):
        for center in (.07,.08):
            for closure,t,g,estimator in sorted(OPTIONS,key=str):
                score['cases'].append(dict(scenario=scenario,anodeCenterM=center,actualFlowRefinement=8,prescribedCurrentA=100,
                    predictedCurrentA=None,beta='ring-current',voltageV=None,edgeClosure=closure,temperatureK=t,instrumentSigmaMS=g,
                    estimator=estimator,predictionMS=[p['velocityMS'] for p in points],errorRelative=[0.]*5,worstRelative=0.,
                    rmsOverMeasuredPeak=0.,eligiblePointGate=True,allPointGate=True,opticalCentroidMeshChange=0.,
                    opticalCentroidMeshGate=True,spectralGate=True,opticalSpectrumMeshGate=True,flowOpticalRelativeChange=0.,
                    flowOpticalGate=True,resolvedOpticalPointMatch=True))
    flow=dict(predictionSHA256=seal,caseCount=32,experimentalQualification=False,absoluteCurrentPrediction=False,
              correctedVoltagePrediction=False,prescribedCurrent=True,identityPass=True,flowNumericalPass=True)
    return [raw,index,groups,fields,operators,diagnostics,baseline,'adapter',score,points,flow]


class Optical84Tests(unittest.TestCase):
    def setUp(self): self.inputs=fixture()

    def mutate(self,change):
        entry=self.inputs[1]['groups'][0]; name=entry['path']; value=json.loads(gzip.decompress(self.inputs[2][name]))
        change(value); self.inputs[2][name],receipt=packed(value); entry.update(receipt)

    def test_all_32_flows_16_groups_576_scores(self):
        result=audit(*self.inputs)
        self.assertTrue(result['finalNumericalPass']); self.assertTrue(result['scoreReconstructionPass'])
        self.assertEqual((result['flowCaseCount'],result['groupCount'],result['scoredAlternatives']),(32,16,576))
        self.assertFalse(result['experimentalQualification']); self.assertFalse(result['absoluteCurrentPrediction'])

    def test_stale_prediction_rejected(self):
        self.inputs[0]+=b' '
        with self.assertRaisesRegex(ValueError,'identity mismatch'): audit(*self.inputs)

    def test_missing_optical_group_rejected(self):
        self.inputs[1]['groups'].pop()
        with self.assertRaisesRegex(ValueError,'Group inventory'): audit(*self.inputs)

    def test_stale_raw_group_seal_rejected(self):
        self.inputs[1]['groups'][0]['rawSHA256']='stale'
        with self.assertRaisesRegex(ValueError,'Raw optical seal'): audit(*self.inputs)

    def test_field_seal_rejected(self):
        name=next(iter(self.inputs[3])); self.inputs[3][name]+=b'bad'
        with self.assertRaisesRegex(ValueError,'Compressed field seal'): audit(*self.inputs)

    def test_operator_adapter_and_brightness_seals(self):
        for field in ('operatorSHA256','diagnosticSHA256','adapterSHA256'):
            original=self.inputs[1][field]; self.inputs[1][field]='stale'
            with self.assertRaisesRegex(ValueError,'Operator/fixture/adapter'): audit(*self.inputs)
            self.inputs[1][field]=original

    def test_independent_centroid(self):
        self.mutate(lambda d:d['cases'][0]['closures'][0]['centroidMeshes'][0]['velocityMS'].__setitem__(0,999.))
        result=audit(*self.inputs[:8])
        self.assertFalse(result['finalNumericalPass'])
        self.assertTrue(any(f['metric']=='independentCentroidRelative' for f in result['failures']))

    def test_independent_thermal_variance(self):
        def change(d):
            for r in d['cases'][0]['closures'][0]['spectra'][0]['refinements']: r['varianceM2S2']*=1.1
            d['cases'][0]['closures'][0]['spectra'][0]['coarseOpticalSpectrum']['varianceM2S2']*=1.1
        self.mutate(change); result=audit(*self.inputs[:8])
        self.assertFalse(result['finalNumericalPass'])
        self.assertTrue(any(f['metric']=='spectralVarianceRelative' for f in result['failures']))

    def test_lp_constraints_and_missing_certificates_stay_visible(self):
        def change(d): d['cases'][0]['brightnessBounds'][0]['points'][0]['maximumCertificate']['epsilon'][-1]=10000.
        self.mutate(change); result=audit(*self.inputs[:8])
        self.assertTrue(any(f['metric']=='lpBrightnessConstraintRelative' for f in result['failures']))
        self.mutate(lambda d:d['cases'][0]['brightnessBounds'][0]['points'].__setitem__(0,dict(id='p0',status='unavailable',reason='infeasible')))
        result=audit(*self.inputs[:8]); self.assertFalse(result['finalNumericalPass'])
        self.assertEqual(result['lpUnavailable'][0]['reason'],'infeasible')

    def test_forged_spectral_gate_rejected(self):
        self.mutate(lambda d:d['cases'][0]['closures'][0]['spectra'][0].update(spectralGate=False))
        with self.assertRaisesRegex(ValueError,'Spectral gate receipt'): audit(*self.inputs)

    def test_alternatives_cannot_be_dropped(self):
        self.inputs[8]['cases'].pop()
        with self.assertRaisesRegex(ValueError,'Scored alternative inventory'): audit(*self.inputs)

    def test_current_is_never_a_predicted_success(self):
        self.inputs[8]['cases'][0]['predictedCurrentA']=100
        with self.assertRaisesRegex(ValueError,'Prescribed current presented'): audit(*self.inputs)

    def test_original_twenty_percent_gate_reconstructed(self):
        self.inputs[8]['cases'][0]['allPointGate']=False
        with self.assertRaisesRegex(ValueError,'Score gate receipt'): audit(*self.inputs)

    def test_flow_refinement_score_cannot_be_forged(self):
        self.inputs[8]['cases'][0]['flowOpticalRelativeChange']=.1
        with self.assertRaisesRegex(ValueError,'Flow refinement score'): audit(*self.inputs)

    def test_qualification_is_false_even_when_all_synthetic_points_match(self):
        self.inputs[8]['experimentalQualification']=True
        with self.assertRaisesRegex(ValueError,'False comparison qualification'): audit(*self.inputs)


if __name__=='__main__': unittest.main()
