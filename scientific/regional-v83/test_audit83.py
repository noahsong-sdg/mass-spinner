"""Synthetic saved-field adversarial controls; no PDE or measured targets."""
import copy
import gzip
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
import audit83 as a


def encode(value): return json.dumps(value,allow_nan=False).encode()


def fixture_case(root,m,scenario,center,nr,nz,redistribute=False):
    m={**m,'anodeCenterM':center}; depth=a.axis_depth(m,scenario); r,z=a.mesh_edges(m,nr,nz,depth)
    shape=(len(z)-1,len(r)-1); volume=np.diff(z)[:,None]*np.diff(r*r)[None,:]
    fractions=volume/volume.sum(); joule=900*fractions; work=100*fractions
    if redistribute:
        mid=(z[:-1]+z[1:])/2; lo=center-m['anodeWidthM']/2; hi=center+m['anodeWidthM']/2
        joule=joule*np.where(((mid>=lo)&(mid<hi))[:,None],2.,1.); joule*=900/joule.sum()
    arrays=dict(cellJouleW=joule,cellRotorWorkW=work,cellElectricalInW=joule+work)
    field=dict(r=r.tolist(),z=z.tolist(),omegaRadS=np.full(shape,1000.).tolist(),potentialV=np.ones(shape).tolist(),
               **{k:v.tolist() for k,v in arrays.items()})
    raw=encode(field); zipped=gzip.compress(raw,mtime=0)
    name=f"fields/{scenario['name']}-{center}-{nr}-{nz}.json.gz"; (root/'scientific/regional-v83/results'/name).write_bytes(zipped)
    current=1000/18.5
    p=dict(currentsA={'cathode':current,'anode':-current},electrodePowerW=1000.,jouleW=900.,viscousW=100.)
    for key in ('chargeResidualRelative','boundaryResidualRelative','powerResidualRelative','angularResidualRelative','linearResidualRelative','torqueMomentResidualRelative'): p[key]=0.
    q=dict(branchCurrentA=current,electrodePowerW=1000.,jouleW=900.,shearW=100.,sigmaParallelSM=1070.,bulkVoltageV=18.5,
        chordsM=m['chordsM'],chordVelocityMS=[x*1000 for x in m['chordsM']],radialEdgesM=r.tolist(),axialEdgesM=z.tolist())
    for key in ('chargeResidualRelative','momentumResidualRelative','powerResidualRelative','torqueResidualRelative'): q[key]=0.
    b=dict(currentsA=p['currentsA'],jouleW=900.,rotorWorkW=100.,electricalInW=1000.,chargeResidualRelative=0.,cellElectricalBalanceRelative=0.,globalBudgetRelative=0.)
    lo=center-m['anodeWidthM']/2; hi=center+m['anodeWidthM']/2
    intervals=[('midplane-side',0.,lo),('anode-band',lo,hi),('cathode-side',hi,z[-1])]
    intervals += [('endwall-'+str(d),z[-1]-d,z[-1]) for d in (.004,.016,.04,.08,depth)]
    regions=[]
    for label,lo,hi in intervals:
        indices=[int(np.flatnonzero(abs(z-cut)<1e-13)[0]) for cut in (lo,hi)]; selection=slice(*indices)
        values={key:float(arrays['cell'+key[0].upper()+key[1:]][selection].sum()) for key in a.POWERS}
        regions.append(dict(name=label,axialEdgesM=[lo,hi],**values,jouleVoltEquivalent=values['jouleW']/current,
            rotorWorkVoltEquivalent=values['rotorWorkW']/current,electricalBalanceRelative=0.))
    return dict(scenario=scenario['name'],anodeCenterM=center,radialRefinement=nr,axialRefinement=nz,accessDepthM=depth,
        shape=list(shape),prediction=p,independent=q,budget=b,regions=regions,chordVelocityMS=q['chordVelocityMS'],
        fieldPacket=dict(path=name,sha256=a.sha(zipped),rawSHA256=a.sha(raw)))


class SavedRegionalAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(); cls.root=Path(cls.temp.name)
        cls.directory=cls.root/'scientific/regional-v83/results'; (cls.directory/'fields').mkdir(parents=True)
        sources={}
        for name in a.SOURCES:
            p=cls.root/name; p.parent.mkdir(parents=True,exist_ok=True); p.write_text('immutable '+name); sources[name]=a.sha(p.read_bytes())
        cls.m=dict(radiusM=.06,halfLengthM=.24,cathodeRadiusM=.004,anodeCenterM=.07,anodeWidthM=.02,magneticT=.13,
                   chordsM=[.005,.015,.025,.035,.045])
        cls.scenarios=[dict(name=s+'-'+v,shape=s,electronTemperatureEV=t,partition='source',leadingWeakIonization=False)
            for s in ('linear','quadratic') for v,t in (('finite-te1',1.),('finite-te2.5-source',2.5))]
        old=encode(dict(manifest=cls.m,scenarios=cls.scenarios,sourceSHA256={k:v for k,v in sources.items() if '/regional-v83/' not in k}))
        p=cls.root/'scientific/electrical-v82/results/predictions.json'; p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(old)
        cls.seal=a.sha(old); cases=[]
        for scenario in cls.scenarios:
            for center in (.07,.08):
                variants=[(n,n) for n in (1,2,4,8)]
                if scenario['name']=='linear-finite-te1' and center==.07: variants += [(4,8),(8,4)]
                cases += [fixture_case(cls.root,cls.m,scenario,center,nr,nz) for nr,nz in variants]
        cls.baseline=dict(experimentalQualification=False,targetVelocityRead=False,currentConditioning=False,
            previousPredictionSHA256=cls.seal,manifest=cls.m,scenarios=cls.scenarios,sourceSHA256=sources,cases=cases)

    @classmethod
    def tearDownClass(cls): cls.temp.cleanup()

    def setUp(self):
        self.data=copy.deepcopy(self.baseline); self.path=self.directory/'predictions.json'; self.restore=[]
        self.seal=patch.object(a,'SEALED',self.__class__.seal); self.seal.start()

    def tearDown(self):
        self.seal.stop()
        for path,raw in self.restore: path.write_bytes(raw)

    def audit(self):
        self.path.write_bytes(encode(self.data)); return a.audit(self.path,self.root)

    def test_complete_conservative_fixture_and_directionals_pass(self):
        result=self.audit()
        self.assertTrue(result['identityPass']); self.assertTrue(result['flowNumericalPass']); self.assertTrue(result['regionalNumericalPass'])
        self.assertFalse(result['experimentalQualification']); self.assertEqual(result['caseCount'],34)
        self.assertEqual(len(result['directionalAssessment']),2)

    def test_stale_source_and_frozen_packet_are_rejected(self):
        for name in ('scientific/regional-v83/mesh83.py','scientific/electrical-v82/results/predictions.json'):
            with self.subTest(name=name):
                p=self.root/name; raw=p.read_bytes(); p.write_bytes(raw+b'changed')
                try:
                    with self.assertRaises(ValueError): self.audit()
                finally: p.write_bytes(raw)

    def test_missing_or_duplicate_case_rejected(self):
        for mode in ('missing','duplicate'):
            self.data=copy.deepcopy(self.baseline)
            self.data['cases'].pop() if mode=='missing' else self.data['cases'].append(self.data['cases'][0])
            with self.assertRaisesRegex(ValueError,'inventory'): self.audit()

    def test_compressed_and_raw_packet_seals_are_checked(self):
        receipt=self.data['cases'][0]['fieldPacket']; p=self.directory/receipt['path']; raw=p.read_bytes()
        self.restore.append((p,raw)); p.write_bytes(raw+b'changed')
        with self.assertRaisesRegex(ValueError,'Compressed'): self.audit()
        p.write_bytes(raw); receipt['rawSHA256']='0'*64
        with self.assertRaisesRegex(ValueError,'Raw field'): self.audit()

    def test_moving_access_and_region_cuts_rejected(self):
        self.data['cases'][0]['accessDepthM']+=.001
        with self.assertRaisesRegex(ValueError,'access cut'): self.audit()
        self.data=copy.deepcopy(self.baseline); self.data['cases'][0]['regions'][-1]['axialEdgesM'][0]+=.001
        with self.assertRaisesRegex(ValueError,'Moving region'): self.audit()

    def test_rehashed_nonmonotone_grid_is_rejected(self):
        receipt=self.data['cases'][0]['fieldPacket']; p=self.directory/receipt['path']; raw=p.read_bytes(); self.restore.append((p,raw))
        field=json.loads(gzip.decompress(raw)); field['z'][1]=field['z'][0]
        payload=encode(field); zipped=gzip.compress(payload); p.write_bytes(zipped)
        receipt.update(sha256=a.sha(zipped),rawSHA256=a.sha(payload))
        with self.assertRaisesRegex(ValueError,'coordinates'): self.audit()

    def test_independent_reference_mismatch_is_retained(self):
        row=next(c for c in self.data['cases'] if c['radialRefinement']==c['axialRefinement']==8)
        row['independent']['chordVelocityMS'][0]*=2
        result=self.audit(); self.assertFalse(result['flowNumericalPass'])
        self.assertTrue(any(g['metric']=='independent/chords' for g in result['failures']))

    def test_unresolved_regions_can_fail_while_global_ledgers_pass(self):
        i=next(i for i,c in enumerate(self.data['cases']) if c['scenario']=='linear-finite-te1'
               and c['anodeCenterM']==.07 and c['radialRefinement']==c['axialRefinement']==8)
        receipt=self.data['cases'][i]['fieldPacket']; p=self.directory/receipt['path']; self.restore.append((p,p.read_bytes()))
        self.data['cases'][i]=fixture_case(self.root,self.m,self.scenarios[0],.07,8,8,redistribute=True)
        result=self.audit(); self.assertTrue(result['identityPass']); self.assertTrue(result['flowNumericalPass'])
        self.assertFalse(result['regionalNumericalPass'])
        self.assertTrue(any(g['category']=='regional' and g['final'] for g in result['failures']))

    def test_claimed_qualification_or_current_conditioning_rejected(self):
        for flag in ('experimentalQualification','currentConditioning','targetVelocityRead'):
            self.data=copy.deepcopy(self.baseline); self.data[flag]=True
            with self.assertRaisesRegex(ValueError,'qualification'): self.audit()

    def test_relative_error_keeps_zero_denominator_unavailable(self):
        self.assertIsNone(a.relative(0.,0.)); self.assertIsNone(a.relative(1.,0.))

    def test_roundoff_equivalent_access_label_keeps_independent_physical_check(self):
        for row in self.data['cases']:
            shifted=float(np.nextafter(row['accessDepthM'],np.inf))
            row['accessDepthM']=shifted; row['regions'][-1]['name']='endwall-'+str(shifted)
        result=self.audit(); self.assertTrue(result['identityPass']); self.assertTrue(result['regionalNumericalPass'])

    def test_cli_preserves_failed_reports_and_returns_nonzero_for_each_required_gate(self):
        destination=self.directory/'cli-report.json'; names=('identityPass','flowNumericalPass','regionalNumericalPass')
        for failed in (None,*names):
            report={name:name!=failed for name in names}; report.update(experimentalQualification=False,failures=[] if failed is None else [failed])
            with patch.object(a,'audit',return_value=report),patch.object(a.sys,'argv',['audit83.py',str(self.path),str(destination)]):
                code=a.main()
            self.assertEqual(code,0 if failed is None else 1)
            self.assertEqual(json.loads(destination.read_text()),report)


if __name__=='__main__': unittest.main()
