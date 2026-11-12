"""Manufactured ledgers test audit admission, not PDE correctness."""
import copy
import gzip
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
import audit84 as a


def store(path,raw):
    zipped=gzip.compress(raw,mtime=0); path.write_bytes(zipped)
    return dict(path='fields/'+path.name,sha256=a.sha(zipped),rawSHA256=a.sha(raw))


def fixture_edges(m,n):
    a0,R,L,c,w=(m[k] for k in ('cathodeRadiusM','radiusM','halfLengthM','anodeCenterM','anodeWidthM'))
    z=np.unique([0.,c-w/2,c,c+w/2,L-.004,L-.016,L-.04,L-.08,L])
    def graded(points,counts):
        return np.r_[*[lo+(hi-lo)*(1-np.cos(np.pi*np.arange(k)/k))/2
                       for lo,hi,k in zip(points[:-1],points[1:],counts)],points[-1]]
    return graded([0.,a0,R],[4*n,28*n]),graded(z,np.maximum(2,np.ceil(np.diff(z)/.005).astype(int))*n)


def fixture_case(directory,m,scenario,center,n):
    m={**m,'anodeCenterM':center}; r,z=fixture_edges(m,n); rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2
    nr,nz=len(rc),len(zc); I=m['branchCurrentA']; B=m['magneticT']; ports=[]; supports={}
    for kind,x,target,boundary in [('cathode',rc**2,m['cathodeRadiusM']**2,r),('anode',zc,center,z)]:
        right=int(np.searchsorted(x,target)); left=right-1; fraction=(target-x[left])/(x[right]-x[left])
        for i,weight in ((left,1-fraction),(right,fraction)):
            cell=(nz-1)*nr+i if kind=='cathode' else i*nr+nr-1
            amp=I*weight*(1 if kind=='cathode' else -1); half=.25/n**2
            torque=0. if kind=='cathode' else -B*(m['radiusM']**2-rc[-1]**2)/2
            ports.append(dict(kind=kind,cell=int(cell),amp=float(amp),halfR=half,torqueWeight=float(torque),potentialV=float(-amp*half-torque)))
        supports[kind+'SupportM']=[float(boundary[left]),float(boundary[right+1])]
    power=-sum(p['amp']*p['potentialV'] for p in ports); torque=B*I*(m['radiusM']**2-m['cathodeRadiusM']**2)/2
    p=dict(currentA=I,prescribedCurrent=True,absoluteCurrentPrediction=False,correctedVoltagePrediction=False,ports=ports,
           electrodePowerW=power,jouleW=power-1,viscousW=1.,driveTorqueNm=torque,sourceMomentTorqueNm=torque,
           chordVelocityMS=m['chordsM'],**supports)
    for key in ('chargeResidualRelative','powerResidualRelative','torqueResidualRelative','linearResidualRelative'): p[key]=0.
    q=dict(currentA=I,currentConditioning=True,experimentalQualification=False,contactVoltageExperimental=False,
           electrodePowerW=power,jouleW=power-1,shearW=1.,driveTorqueNm=torque,sourceMomentTorqueNm=torque,
           chordsM=m['chordsM'],chordVelocityMS=m['chordsM'],radialEdgesM=r.tolist(),axialEdgesM=z.tolist(),
           cathodeRadialMomentM2=m['cathodeRadiusM']**2,anodeAxialCentroidM=center)
    for key in ('chargeResidualRelative','momentumResidualRelative','powerResidualRelative','torqueResidualRelative','torqueMomentResidualRelative','linearResidualRelative'): q[key]=0.
    raw=json.dumps(dict(r=r.tolist(),z=z.tolist(),omegaRadS=np.ones((nz,nr)).tolist(),potentialV=np.zeros((nz,nr)).tolist()),separators=(',',':')).encode()
    receipt=store(directory/'fields'/f'{scenario}-{center}-{n}.json.gz',raw)
    return dict(scenario=scenario,anodeCenterM=center,refinement=n,prediction=p,independent=q,fieldPacket=receipt)


class SavedRingAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(); cls.root=Path(cls.temp.name); cls.directory=cls.root/'scientific/boundary-v84/results'
        (cls.directory/'fields').mkdir(parents=True); cls.path=cls.directory/'predictions.json'
        m=dict(radiusM=.06,halfLengthM=.1,cathodeRadiusM=.004,anodeCenterM=.07,anodeWidthM=.02,
               magneticT=.13,branchCurrentA=100,chordsM=[.01,.03,.05])
        scenarios=[dict(name=name) for name in sorted(a.NAMES)]; sources={}
        for name in a.SOURCES:
            path=cls.root/name; path.parent.mkdir(parents=True,exist_ok=True); path.write_text('frozen fixture source\n'); sources[name]=a.sha(path.read_bytes())
        old=dict(manifest=m,scenarios=scenarios,sourceSHA256={k:v for k,v in sources.items() if not k.startswith('scientific/boundary-v84/')})
        previous=cls.root/'scientific/regional-v83/results/predictions.json'; previous.parent.mkdir(parents=True,exist_ok=True)
        previous.write_text(json.dumps(old)); cls.seal=a.sha(previous.read_bytes())
        cls.baseline=dict(manifest=m,scenarios=scenarios,sourceSHA256=sources,previousPredictionSHA256=cls.seal,
            experimentalQualification=False,targetVelocityRead=False,currentFitted=False,absoluteCurrentPrediction=False,
            correctedVoltagePrediction=False,prescribedCurrent=True,currentConditioning=True,
            cases=[fixture_case(cls.directory,m,s,center,n) for s in sorted(a.NAMES) for center in (.07,.08) for n in (1,2,4,8)])

    @classmethod
    def tearDownClass(cls): cls.temp.cleanup()

    def setUp(self):
        self.data=copy.deepcopy(self.baseline); self.restore=[]; self.seal_patch=patch.object(a,'SEALED',self.seal); self.seal_patch.start()

    def tearDown(self):
        for path,raw in self.restore: path.write_bytes(raw)
        self.seal_patch.stop()

    def audit(self):
        self.path.write_text(json.dumps(self.data)); return a.audit(self.path,self.root)

    def test_complete_inventory_passes_without_qualifying_contact_voltage(self):
        result=self.audit(); self.assertTrue(result['identityPass']); self.assertTrue(result['flowNumericalPass'])
        self.assertEqual(result['failures'],[]); self.assertEqual(len(result['contactAssessment']),32)
        self.assertFalse(result['experimentalQualification']); self.assertFalse(result['absoluteCurrentPrediction'])
        values=[x['contactVoltEquivalentV'] for x in result['contactAssessment']]
        self.assertGreater(max(values),10*min(values)); self.assertFalse(result['correctedVoltagePrediction'])

    def test_missing_or_duplicated_case_rejected(self):
        self.data['cases'][-1]=copy.deepcopy(self.data['cases'][0])
        with self.assertRaisesRegex(ValueError,'inventory'): self.audit()

    def test_false_independent_or_experimental_claim_rejected(self):
        for key in ('experimentalQualification','targetVelocityRead','currentFitted','absoluteCurrentPrediction','correctedVoltagePrediction'):
            self.data=copy.deepcopy(self.baseline); self.data[key]=True
            with self.assertRaisesRegex(ValueError,'qualification|fitting'): self.audit()
        self.data=copy.deepcopy(self.baseline); self.data['cases'][0]['independent']['contactVoltageExperimental']=True
        with self.assertRaisesRegex(ValueError,'reference qualification'): self.audit()

    def test_stale_source_or_previous_prediction_rejected(self):
        name=sorted(a.SOURCES)[0]; path=self.root/name; self.restore.append((path,path.read_bytes())); path.write_text('stale')
        with self.assertRaisesRegex(ValueError,'Stale source'): self.audit()
        path.write_bytes(self.restore[0][1]); self.data['previousPredictionSHA256']='bad'
        with self.assertRaisesRegex(ValueError,'seal'): self.audit()

    def test_corrupt_compressed_field_rejected(self):
        path=self.directory/self.data['cases'][0]['fieldPacket']['path']; self.restore.append((path,path.read_bytes())); path.write_bytes(b'corrupt')
        with self.assertRaisesRegex(ValueError,'seal'): self.audit()

    def test_resealed_but_moved_mesh_rejected(self):
        case=self.data['cases'][0]; path=self.directory/case['fieldPacket']['path']; self.restore.append((path,path.read_bytes()))
        packet=json.loads(gzip.decompress(path.read_bytes())); packet['r'][1]+=1e-6
        case['fieldPacket']=store(path,json.dumps(packet).encode())
        with self.assertRaisesRegex(ValueError,'Changed mesh'): self.audit()

    def test_prescribed_current_must_not_change(self):
        self.data['cases'][0]['prediction']['currentA']=99.
        with self.assertRaisesRegex(ValueError,'current changed'): self.audit()

    def test_nonconservative_source_quadrature_fails(self):
        self.data['cases'][0]['prediction']['ports'][0]['amp']+=1
        result=self.audit(); self.assertFalse(result['identityPass'])
        self.assertTrue(any(g['metric']=='cathode quadrature' for g in result['failures']))

    def test_moving_support_rejected(self):
        self.data['cases'][0]['prediction']['cathodeSupportM'][1]+=.001
        with self.assertRaisesRegex(ValueError,'support'): self.audit()

    def test_missing_boundary_half_face_torque_fails(self):
        for port in self.data['cases'][-1]['prediction']['ports']:
            if port['kind']=='anode': port['torqueWeight']=0.
        result=self.audit(); self.assertFalse(result['identityPass'])
        self.assertTrue(any(g['metric']=='boundary torque weight' for g in result['failures']))

    def test_claimed_work_residual_does_not_override_wrong_ledger(self):
        self.data['cases'][0]['prediction']['jouleW']*=1.1
        result=self.audit(); self.assertFalse(result['identityPass'])
        self.assertTrue(any(g['metric']=='work ledger' for g in result['failures']))

    def test_unresolved_shear_fails_flow_gate(self):
        self.data['cases'][-1]['prediction']['viscousW']=1.2
        self.assertFalse(self.audit()['flowNumericalPass'])

    def test_cli_preserves_failed_report_and_returns_failure(self):
        destination=self.directory/'audit.json'
        for identity,flow in ((True,True),(False,True),(True,False)):
            report=dict(identityPass=identity,flowNumericalPass=flow)
            with patch.object(a,'audit',return_value=report),patch.object(a.sys,'argv',['audit84.py',str(self.path),str(destination)]):
                self.assertEqual(a.main(),0 if identity and flow else 1)
            self.assertEqual(json.loads(destination.read_text()),report)


if __name__=='__main__': unittest.main()
