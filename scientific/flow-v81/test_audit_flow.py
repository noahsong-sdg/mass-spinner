"""Synthetic receipt/gate controls, not experimental or PDE validation."""
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
from audit_flow import audit,INPUTS,SOURCES

HERE=Path(__file__).parent


class FlowAuditControls(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.home=Path(self.temp.name)/'scientific/flow-v81'; self.home.mkdir(parents=True)
        self.frozen=self.home.parent/'profile-v79/results/predictions.json'; self.frozen.parent.mkdir(parents=True)
        shutil.copy2(HERE.parent/'profile-v79/results/predictions.json',self.frozen)
        for name in SOURCES|{Path(p).name for p in INPUTS if p.startswith('flow-v81/')}:
            shutil.copy2(HERE/name,self.home/name)
        self.path=self.home/'results/flow-predictions.json'; (self.path.parent/'fields').mkdir(parents=True)
        self.m=json.loads(self.frozen.read_text())['manifest']; m=self.m
        h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
        self.data=dict(manifest=m,experimentalQualification=False,targetDataRead=False,cases=[],
            sourceSHA256={n:h(self.home/n) for n in SOURCES},inputSHA256={n:h(self.home.parent/n) for n in INPUTS})
        self.mock=patch('audit_flow.SPECIFICATIONS',(('legacy',3),)); self.mock.start(); self.addCleanup(self.mock.stop)
        variants=[(r,m['bulkVoltageV']) for r in m['refinements']]+[(4,v) for v in m['bulkVoltageCasesV'] if v!=m['bulkVoltageV']]
        for ref,voltage in variants:
            row=dict(transportCase='legacy',beta=3,refinement=ref,voltageV=voltage,status='available',sigmaParallelSM=1000.)
            p=dict(chordVelocityMS=[0.]*len(m['chordsM']),currentsA=dict(cathode=100.,anode=-100.),
                   electrodePowerW=1.,jouleW=.5,viscousW=.5,
                   meridional=dict(centrifugalCurlMaxS2=0.,centrifugalCurlVolumeRmsS2=0.,
                     midToLastCellLoopM2S2=0.,midToStationaryWallLoopM2S2=0.,circulationVelocityPredicted=False))
            for name in ('chargeResidualRelative','boundaryResidualRelative','powerResidualRelative',
                         'angularResidualRelative','linearResidualRelative','torqueMomentResidualRelative'): p[name]=0.
            q=dict(chordVelocityMS=p['chordVelocityMS'],branchCurrentA=100.,electrodePowerW=1.,jouleW=.5,shearW=.5)
            for name in ('chargeResidualRelative','momentumResidualRelative','powerResidualRelative','torqueResidualRelative'): q[name]=0.
            row.update(prediction=p,independentSameSigma=q); self.save_field(row,0.); self.data['cases'].append(row)
        self.write()

    def write(self): self.path.write_text(json.dumps(self.data))

    def save_field(self,row,omega):
        m=self.m; ref=row['refinement']; a=m['cathodeRadiusM']; R=m['radiusM']
        r=np.r_[np.linspace(0.,a,4*ref+1)[:-1],np.linspace(a,R,28*ref+1)]
        left,right=m['anodeCenterM']-m['anodeWidthM']/2,m['anodeCenterM']+m['anodeWidthM']/2
        z=np.r_[np.linspace(0.,left,12*ref+1)[:-1],np.linspace(left,right,4*ref+1)[:-1],np.linspace(right,m['halfLengthM'],32*ref+1)]
        raw=json.dumps(dict(r=r.tolist(),z=z.tolist(),omegaRadS=np.full((len(z)-1,len(r)-1),omega).tolist())).encode()
        compressed=gzip.compress(raw,mtime=0); name=f"fields/ref{ref}-v{row['voltageV']}.json.gz"
        (self.path.parent/name).write_bytes(compressed)
        row['fieldPacket']=dict(path=name,sha256=hashlib.sha256(compressed).hexdigest(),rawSHA256=hashlib.sha256(raw).hexdigest())

    def test_complete_synthetic_receipts_are_admitted_without_qualification(self):
        result=audit(self.path,self.frozen)
        self.assertTrue(result['flowNumericalPass']); self.assertTrue(result['meridionalAssessmentNumericalPass'])
        self.assertFalse(result['experimentalQualification'])

    def test_corrupt_compressed_and_stale_raw_field_hashes_are_rejected(self):
        row=self.data['cases'][0]; path=self.path.parent/row['fieldPacket']['path']
        original=path.read_bytes(); path.write_bytes(original+b'corrupted')
        with self.assertRaisesRegex(ValueError,'Compressed field hash'): audit(self.path,self.frozen)
        path.write_bytes(original); row['fieldPacket']['rawSHA256']='0'*64; self.write()
        with self.assertRaisesRegex(ValueError,'Raw field hash'): audit(self.path,self.frozen)

    def test_stale_sources_and_missing_cases_are_rejected(self):
        source=self.home/'solver.py'; original=source.read_bytes(); source.write_bytes(original+b'\n# stale')
        with self.assertRaisesRegex(ValueError,'Stale source'): audit(self.path,self.frozen)
        source.write_bytes(original); self.data['cases'].pop(); self.write()
        with self.assertRaisesRegex(ValueError,'Missing/duplicated'): audit(self.path,self.frozen)

    def test_failed_flow_and_assessment_gates_are_retained_separately(self):
        for row in self.data['cases']:
            if row['refinement']==4:
                self.save_field(row,1.)
                row['prediction']['chordVelocityMS']=self.m['chordsM']
                row['independentSameSigma']['chordVelocityMS']=self.m['chordsM']
                row['prediction']['meridional']['midToStationaryWallLoopM2S2']=self.m['radiusM']**2/2
                row['prediction']['powerResidualRelative']=1e-5
        self.write(); result=audit(self.path,self.frozen)
        self.assertFalse(result['flowNumericalPass']); self.assertFalse(result['meridionalAssessmentNumericalPass'])
        self.assertTrue(any(g['metric']=='primary/powerResidualRelative' for g in result['failures']))
        self.assertTrue(any(g['group']=='assessment' and g['metric']=='mesh/midToStationaryWallLoopM2S2' for g in result['failures']))


if __name__=='__main__': unittest.main()
