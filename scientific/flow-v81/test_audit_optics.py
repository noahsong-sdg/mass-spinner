"""Independent synthetic campaign and tamper controls; no producer dependency."""
import json
import math
import unittest

from audit_optics import audit, CERTIFICATES, GROUPS, sha, TEMPERATURES


def encoded(value):
    return json.dumps(value,allow_nan=False).encode()


def campaign():
    operators, diagnostics = {'operator.py':'source-seal'}, {'brightness.json':'fixture-seal'}
    locations = [dict(id=f'p{i}',radiusM=.005+.01*i) for i in range(5)]
    fixture = dict(locations=locations,brightness=[dict(brightness=1.) for _ in range(29)],
        reconstructions=[dict(mesh=n,edgeClosure=c,originalResidualRelative=[0.]*29)
                         for c in ('linear','sqrt') for n in (64,128,256)])
    edges = [.004*i/16 for i in range(17)]+[.004+.056*i/112 for i in range(1,113)]
    radii = [math.sqrt((a*a+b*b)/2) for a,b in zip(edges,edges[1:])]
    prediction = dict(radialCentersM=radii,localMidplaneVelocityMS=[1000*r for r in radii])
    flow = dict(manifest=dict(cathodeRadiusM=.004,radiusM=.06),experimentalQualification=False,
                targetDataRead=False,cases=[])
    for name in GROUPS:
        for beta in ((0,) if name.startswith('source-') else (3,9)):
            for voltage in (16.5,18.5,20.5):
                flow['cases'].append(dict(transportCase=name,beta=beta,voltageV=voltage,
                                         refinement=4,status='available',prediction=prediction))
    raw = encoded(flow)
    index = dict(flowPredictionSHA256=sha(raw),experimentalQualification=False,
                 operatorSHA256=operators,diagnosticInputSHA256=diagnostics,groups=[])
    spectra = []
    for p in locations:
        summary = dict(centroidMS=p['radiusM']*1000,modeMS=p['radiusM']*1000,
                       varianceM2S2=1000.,capturedFlux=1.)
        for t in TEMPERATURES:
            for instrument in (0.,500.,1000.):
                spectra.append(dict(id=p['id'],temperatureK=t,instrumentSigmaMS=instrument,
                    refinements=[dict(binWidthMS=b,**summary) for b in (10.,5.,2.5)],
                    coarseOpticalSpectrum=summary))
    meshes = [dict(mesh=n,velocityMS=[p['radiusM']*1000 for p in locations]) for n in (64,128,256)]
    bounds = []
    for n in (64,128,256):
        cert = dict(epsilon=[1.]*n,targetBrightness=1.,residuals={k:0. for k in CERTIFICATES})
        bounds.append(dict(mesh=n,points=[dict(id=p['id'],status='available',minMS=0.,maxMS=100.,
            minimumCertificate=cert,maximumCertificate=cert) for p in locations]))
    groups = {}
    for name in GROUPS:
        data = dict(fixture,experimentalQualification=False,flowPredictionSHA256=sha(raw),
                    operatorSHA256=operators,diagnosticInputSHA256=diagnostics,cases=[])
        for row in flow['cases']:
            if row['transportCase'] == name:
                data['cases'].append(dict(beta=row['beta'],voltageV=row['voltageV'],refinement=4,
                    brightnessBounds=bounds,closures=[dict(edgeClosure=c,centroidMeshes=meshes,spectra=spectra)
                                                     for c in ('linear','sqrt')]))
        path = 'optics/'+name+'.json'; groups[path] = encoded(data)
        index['groups'].append(dict(transportCase=name,path=path,sha256=sha(groups[path])))
    return raw,index,groups,operators,diagnostics,fixture


class AuditOpticsTests(unittest.TestCase):
    def setUp(self):
        self.inputs = list(campaign())

    def mutate_group(self, change):
        entry = self.inputs[1]['groups'][0]; path = entry['path']
        group = json.loads(self.inputs[2][path]); change(group)
        self.inputs[2][path] = encoded(group); entry['sha256'] = sha(self.inputs[2][path])

    def test_complete_campaign_passes_without_experimental_qualification(self):
        result = audit(*self.inputs)
        self.assertTrue(result['finalNumericalPass'])
        self.assertFalse(result['experimentalQualification'])
        self.assertEqual((result['groupCount'],result['caseCount']), (14,78))
        self.assertEqual(result['failures'], [])

    def test_changed_flow_bytes_reject_stale_index_seal(self):
        self.inputs[0] += b' '
        with self.assertRaisesRegex(ValueError,'seal mismatch'):
            audit(*self.inputs)

    def test_missing_group_is_not_a_partial_campaign_pass(self):
        entry = self.inputs[1]['groups'].pop(); del self.inputs[2][entry['path']]
        with self.assertRaisesRegex(ValueError,'Group membership'):
            audit(*self.inputs)

    def test_resealed_group_cannot_change_flow_identity(self):
        self.mutate_group(lambda g:g.update(flowPredictionSHA256='wrong-flow'))
        with self.assertRaisesRegex(ValueError,'Group seal'):
            audit(*self.inputs)

    def test_changed_optical_source_is_rejected(self):
        self.inputs[1]['operatorSHA256'] = {'operator.py':'changed-source'}
        with self.assertRaisesRegex(ValueError,'Immutable optical inputs'):
            audit(*self.inputs)

    def test_missing_group_operator_receipt_is_rejected(self):
        self.mutate_group(lambda g:g.pop('operatorSHA256'))
        with self.assertRaisesRegex(ValueError,'Group optical inputs'):
            audit(*self.inputs)

    def test_stale_group_diagnostic_receipt_is_rejected(self):
        self.mutate_group(lambda g:g.update(diagnosticInputSHA256={'brightness.json':'stale'}))
        with self.assertRaisesRegex(ValueError,'Group optical inputs'):
            audit(*self.inputs)

    def test_qualification_must_remain_false_at_every_stage(self):
        for stage in ('flow','index','group'):
            with self.subTest(stage=stage):
                self.inputs = list(campaign())
                if stage == 'flow':
                    flow = json.loads(self.inputs[0]); flow['experimentalQualification'] = True
                    self.inputs[0] = encoded(flow)
                elif stage == 'index':
                    self.inputs[1]['experimentalQualification'] = True
                else:
                    self.mutate_group(lambda g:g.update(experimentalQualification=True))
                with self.assertRaises(ValueError):
                    audit(*self.inputs)

    def test_mode_outside_new_flow_hull_is_a_final_failure(self):
        def change(g):
            g['cases'][0]['closures'][0]['spectra'][0]['refinements'][-1]['modeMS'] = 1e6
        self.mutate_group(change)
        result = audit(*self.inputs)
        self.assertFalse(result['finalNumericalPass'])
        self.assertGreater(result['maxima']['hullViolationMS'], 999000.)
        self.assertTrue(any(f['metric']=='hullViolationMS' and f['final'] for f in result['failures']))

    def test_unavailable_lp_stays_visible(self):
        def change(g):
            g['cases'][0]['brightnessBounds'][0]['points'][0] = dict(id='p0',status='unavailable',reason='infeasible')
        self.mutate_group(change)
        result = audit(*self.inputs)
        self.assertFalse(result['finalNumericalPass'])
        self.assertEqual(result['lpUnavailable'][0]['reason'],'infeasible')


if __name__ == '__main__':
    unittest.main()
