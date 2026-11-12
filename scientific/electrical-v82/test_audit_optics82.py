"""Synthetic saved-field controls, independent of electrical/optical producers."""
import gzip
import json
import math
import unittest

import numpy as np

from audit_optics82 import annuli, audit, GROUPS, RESIDUALS, sha, TEMPERATURES, THERMAL


def packed(value):
    raw = json.dumps(value,allow_nan=False).encode()
    payload = gzip.compress(raw,mtime=0)
    return payload,dict(sha256=sha(payload),rawSHA256=sha(raw))


def shell_path(impact, inner, outer=.06):
    return 2*(math.sqrt(max(outer*outer-impact*impact,0.))-math.sqrt(max(inner*inner-impact*impact,0.)))


def fixture():
    operators,diagnostics = {'operator.py':'immutable-source'},{'brightness.json':'immutable-brightness'}
    locations = [dict(id=f'p{i}',radiusM=.005+.01*i) for i in range(5)]
    brightness = [dict(radiusM=.055*i/28,brightness=.01,brightnessExtractionRange=[0.,1.]) for i in range(29)]
    reconstructions = []
    for closure in ('linear','sqrt'):
        for n in (64,128,256):
            edges = [.06*i/n for i in range(n+1)]; edges[-1] = .06
            projected = [shell_path(p['radiusM'],edges[-2]) for p in brightness]
            reconstructions.append(dict(mesh=n,edgeClosure=closure,radialEdgesM=edges,
                emissivity=[0.]*(n-1)+[1.],originalReprojectedBrightness=projected,
                originalResidualRelative=[(x-.01)/.01 for x in projected]))
    baseline = dict(locations=locations,brightness=brightness,reconstructions=reconstructions)
    ve = [.004*i/16 for i in range(17)]+[.004+(.06-.004)*i/112 for i in range(1,113)]; ve[-1] = .06
    centers = [math.sqrt((a*a+b*b)/2) for a,b in zip(ve,ve[1:])]
    field = dict(r=ve,omegaRadS=[[1000.]*128]); field_payload,field_seal = packed(field)
    packet = dict(experimentalQualification=False,targetVelocityRead=False,currentConditioning=False,cases=[],fixedCurrent=[])
    fields = {}
    for name in sorted(GROUPS):
        for drive,voltage in [('absolute-voltage',16.5),('absolute-voltage',18.5),('absolute-voltage',20.5),('fixed-current',30.)]:
            path = f'fields/{name}-{drive}-{voltage}.json.gz'; fields[path] = field_payload
            row = dict(group=name,drive=drive,voltageV=voltage,refinement=4,
                prediction=dict(radialCentersM=centers,localMidplaneVelocityMS=[1000*r for r in centers]),
                fieldPacket=dict(path=path,**field_seal))
            packet['fixedCurrent' if drive=='fixed-current' else 'cases'].append(row)
    prediction_raw = json.dumps(packet).encode(); seal = sha(prediction_raw)
    index = dict(experimentalQualification=False,targetVelocityRead=False,predictionSHA256=seal,
        operatorSHA256=operators,diagnosticSHA256=diagnostics,legacyBetaKey='Drive label only',groups=[])
    spectra = []
    for p in locations:
        for t in TEMPERATURES:
            for instrument in (0.,500.,1000.):
                # Emission is confined above r=.059 m, where linear T has reached1800K.
                summary = dict(centroidMS=p['radiusM']*1000,modeMS=p['radiusM']*1000,
                    varianceM2S2=THERMAL*(1800 if t=='linear' else t)+instrument**2,capturedFlux=1.)
                spectra.append(dict(id=p['id'],temperatureK=t,instrumentSigmaMS=instrument,
                    coarseOpticalSpectrum=summary,refinements=[dict(binWidthMS=b,**summary) for b in (10.,5.,2.5)]))
    bounds = []
    for n in (64,128,256):
        inner = .06*(n-1)/n
        light = [shell_path(p['radiusM'],inner) for p in brightness]; points = []
        for p in locations:
            cert = dict(epsilon=[0.]*(n-1)+[1.],brightness=light,targetBrightness=shell_path(p['radiusM'],inner),
                        centroidMS=p['radiusM']*1000,residuals={k:0. for k in RESIDUALS})
            points.append(dict(id=p['id'],status='available',minMS=cert['centroidMS'],maxMS=cert['centroidMS'],
                               minimumCertificate=cert,maximumCertificate=cert))
        bounds.append(dict(mesh=n,points=points))
    meshes = [dict(mesh=n,velocityMS=[p['radiusM']*1000 for p in locations]) for n in (64,128,256)]
    groups = {}
    for name in sorted(GROUPS):
        data = dict(baseline,experimentalQualification=False,predictionSHA256=seal,
                    operatorSHA256=operators,diagnosticSHA256=diagnostics,legacyBetaKey=index['legacyBetaKey'],cases=[])
        for row in packet['cases']+packet['fixedCurrent']:
            if row['group']==name:
                data['cases'].append(dict(beta=row['drive'],voltageV=row['voltageV'],refinement=4,
                    brightnessBounds=bounds,closures=[dict(edgeClosure=c,centroidMeshes=meshes,spectra=spectra)
                                                     for c in ('linear','sqrt')]))
        path = 'optics/'+name+'.json.gz'; groups[path],receipt = packed(data)
        index['groups'].append(dict(group=name,path=path,**receipt))
    return [prediction_raw,index,groups,fields,operators,diagnostics,baseline]


class OpticalAudit82Tests(unittest.TestCase):
    def setUp(self):
        self.inputs = fixture()

    def mutate(self, change):
        entry = self.inputs[1]['groups'][0]; path = entry['path']
        value = json.loads(gzip.decompress(self.inputs[2][path])); change(value)
        self.inputs[2][path],receipt = packed(value); entry.update(receipt)

    def test_full_20_group_80_case_campaign_passes(self):
        result = audit(*self.inputs)
        self.assertEqual((result['groupCount'],result['caseCount']),(20,80))
        self.assertTrue(result['finalNumericalPass'])
        self.assertFalse(result['experimentalQualification'])

    def test_exact_common_annulus_signed_observer(self):
        b = .25
        weight,u,_,_,_ = annuli([0.,1.,2.],[2.,1.],[0.,.5,1.5,2.],[3.,5.,7.],b)
        lengths = [2*(math.sqrt(y*y-b*b)-math.sqrt(max(x*x-b*b,0.)))
                   for x,y in zip((0.,.5,1.,1.5),(.5,1.,1.5,2.))]
        expected = np.array(lengths)*[2.,2.,1.,1.]
        np.testing.assert_allclose(weight,expected,rtol=1e-14)
        np.testing.assert_allclose(u,b*np.array([3.,5.,5.,7.]))
        reverse = annuli([0.,1.,2.],[2.,1.],[0.,.5,1.5,2.],[3.,5.,7.],-b)
        np.testing.assert_allclose(reverse[0],weight)
        np.testing.assert_allclose(reverse[1],-u)

    def test_changed_new_prediction_seal_rejected(self):
        self.inputs[0] += b' '
        with self.assertRaisesRegex(ValueError,'identity mismatch'): audit(*self.inputs)

    def test_missing_group_rejected(self):
        entry = self.inputs[1]['groups'].pop(); del self.inputs[2][entry['path']]
        with self.assertRaisesRegex(ValueError,'Group inventory'): audit(*self.inputs)

    def test_raw_group_seal_is_checked_separately(self):
        self.inputs[1]['groups'][0]['rawSHA256'] = 'stale'
        with self.assertRaisesRegex(ValueError,'Raw optical seal'): audit(*self.inputs)

    def test_compressed_velocity_packet_seal_is_checked(self):
        key = next(iter(self.inputs[3])); self.inputs[3][key] += b'x'
        with self.assertRaisesRegex(ValueError,'Compressed velocity field seal'): audit(*self.inputs)

    def test_forged_centroid_fails_independent_los(self):
        def change(g): g['cases'][0]['closures'][0]['centroidMeshes'][-1]['velocityMS'][0] += 1.
        self.mutate(change); result = audit(*self.inputs)
        self.assertFalse(result['finalNumericalPass'])
        self.assertTrue(any(f['metric']=='independentCentroidRelative' for f in result['failures']))

    def test_forged_variance_fails_independent_thermal_moment(self):
        def change(g): g['cases'][0]['closures'][0]['spectra'][0]['refinements'][-1]['varianceM2S2'] *= 1.1
        self.mutate(change); result = audit(*self.inputs)
        self.assertTrue(any(f['metric']=='spectralVarianceRelative' for f in result['failures']))

    def test_lp_certificate_cannot_hide_violated_brightness(self):
        def change(g): g['cases'][0]['brightnessBounds'][0]['points'][0]['maximumCertificate']['epsilon'][-1] = 10000.
        self.mutate(change); result = audit(*self.inputs)
        self.assertTrue(any(f['metric']=='lpBrightnessConstraintRelative' for f in result['failures']))

    def test_true_group_qualification_rejected(self):
        self.mutate(lambda g:g.update(experimentalQualification=True))
        with self.assertRaisesRegex(ValueError,'identity mismatch'): audit(*self.inputs)

    def test_stale_diagnostic_receipt_rejected(self):
        self.mutate(lambda g:g.update(diagnosticSHA256={'brightness.json':'stale'}))
        with self.assertRaisesRegex(ValueError,'operator/fixture mismatch'): audit(*self.inputs)

    def test_unavailable_lp_stays_visible(self):
        def change(g): g['cases'][0]['brightnessBounds'][0]['points'][0] = dict(id='p0',status='unavailable',reason='infeasible')
        self.mutate(change); result = audit(*self.inputs)
        self.assertFalse(result['finalNumericalPass'])
        self.assertEqual(result['lpUnavailable'][0]['reason'],'infeasible')


if __name__=='__main__':
    unittest.main()
