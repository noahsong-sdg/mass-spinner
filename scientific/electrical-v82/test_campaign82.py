"""Target-blind orchestration regression; physical solves are replaced, not fitted."""
import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import Mock,patch

import numpy as np

HERE=Path(__file__).parent
INPUTS=('electrical-v82/PROTOCOL.md','flow-v81/results/flow-predictions.json','profile-v79/manifest.json',
        'flow-v81/argon-viscosity-source.json','optical-v80/sources/journal.pdf')
SOURCES=tuple('electrical-v82/'+n for n in ('campaign82.py','model82.py','budget82.py','transport82.py'))+tuple(
        'flow-v81/'+n for n in ('solver.py','reference.py','transport.py'))+('profile-v79/solver.py',)


def scenarios():
    return tuple(dict(name=shape+'-'+label,shape=shape,electronTemperatureEV=te,partition=partition,
                      leadingWeakIonization=leading)
        for shape in ('linear','quadratic') for label,te,partition,leading in (
            ('v81-leading-te1',1.,'source',True),('finite-te1',1.,'source',False),
            ('finite-te2.5-source',2.5,'source',False),('finite-te2.5-ei-only',2.5,'electron-ion-only',False),
            ('finite-te2.5-uniform20',2.5,'uniform-20pct',False)))


class CampaignOrchestration(unittest.TestCase):
    def test_sealed_campaign_never_reads_or_fits_measured_targets(self):
        reads=[]; solve_calls=[]; reference_calls=[]; properties_calls=[]; scale_calls=[]; budget_calls=[]
        read_bytes,read_text=Path.read_bytes,Path.read_text
        def guard(path):
            text=str(path).lower(); reads.append(text)
            self.assertFalse(any(word in text for word in ('score.json','digitiz','measured','comparison.json')),
                             'Campaign attempted to read measured/scored data: '+str(path))
        def checked_bytes(path,*args,**kwargs): guard(path); return read_bytes(path,*args,**kwargs)
        def checked_text(path,*args,**kwargs): guard(path); return read_text(path,*args,**kwargs)
        def fields(scenario):
            properties_calls.append(scenario['name'])
            return {name:(lambda r,z:np.ones((len(z),len(r))))
                    for name in ('viscosity','conductivity_shape','beta_field')}
        def solve(m,beta,sigma,voltage,refinement,**kwargs):
            solve_calls.append((m.copy(),beta,sigma,voltage,refinement,kwargs.copy()))
            current=voltage; locked=kwargs.get('magnetic')==0.
            return dict(r=np.array([0.,.004,.06]),z=np.array([0.,.06,.24]),omega=np.full((2,2),0. if locked else voltage),
                        potential=np.full((2,2),voltage),currentsA=dict(cathode=current,anode=-current),
                        electrodePowerW=voltage*current,jouleW=voltage*current*(1. if locked else .5),
                        viscousW=0. if locked else voltage*current*.5)
        def reference_solve(m,beta,sigma,voltage,refinement,**kwargs):
            reference_calls.append((m.copy(),beta,sigma,voltage,refinement,kwargs.copy()))
            return dict(branchCurrentA=voltage,electrodePowerW=voltage**2,jouleW=voltage**2/2,shearW=voltage**2/2,
                        potentialV=[[voltage]],velocityMS=[[voltage]],omegaRadS=[[voltage]])
        def scale(state,gain):
            scale_calls.append(gain)
            return dict(r=state['r'],z=state['z'],omega=state['omega']*gain,potential=state['potential']*gain,
                        currentsA={k:v*gain for k,v in state['currentsA'].items()},
                        **{k:state[k]*gain**2 for k in ('electrodePowerW','jouleW','viscousW')})
        def budget(m,state,voltage,kwargs):
            budget_calls.append((m.copy(),voltage,kwargs.copy()))
            values=dict(jouleW=state['jouleW'],rotorWorkW=state['viscousW'],electricalInW=state['electrodePowerW'])
            return values,{k:np.full((2,2),v/4) for k,v in values.items()}
        solver=types.SimpleNamespace(solve=Mock(side_effect=solve),observe=lambda s,c:[float(s['omega'][0,0])]*len(c),
                                     calibrate=Mock(side_effect=AssertionError('Current calibration is forbidden')))
        modules={
            'model82':types.SimpleNamespace(properties=fields,scaled_state=scale,solver=solver,
                                            reference=types.SimpleNamespace(solve=Mock(side_effect=reference_solve))),
            'budget82':types.SimpleNamespace(reconstruct=budget),
            'transport82':types.SimpleNamespace(SCENARIOS=scenarios(),profile=lambda *args:{'sigmaParallelSM':np.array([1070.])})}
        with tempfile.TemporaryDirectory() as temporary,patch.object(Path,'read_bytes',checked_bytes),patch.object(Path,'read_text',checked_text):
            root=Path(temporary); here=root/'scientific/electrical-v82'
            for name in INPUTS+SOURCES:
                destination=root/'scientific'/name; destination.parent.mkdir(parents=True,exist_ok=True)
                destination.write_bytes((HERE.parent/name).read_bytes())
            spec=importlib.util.spec_from_file_location('campaign82_orchestration',HERE/'campaign82.py')
            campaign=importlib.util.module_from_spec(spec)
            with patch.dict(sys.modules,modules): spec.loader.exec_module(campaign)
            campaign.HERE=here; campaign.ROOT=root
            with contextlib.redirect_stdout(io.StringIO()): campaign.main()
            result_path=here/'results/predictions.json'; result=json.loads(result_path.read_text())
            expected={(s['name'],c,r,v) for s in scenarios() for c in (.07,.08)
                      for r,v in ((1,18.5),(2,18.5),(4,18.5),(4,16.5),(4,20.5))}
            actual={(r['scenario'],r['anodeCenterM'],r['refinement'],r['voltageV']) for r in result['cases']}
            self.assertEqual(actual,expected); self.assertEqual(len(result['cases']),100)
            groups={s['name']+'-anode-'+str(c) for s in scenarios() for c in (.07,.08)}
            for name in ('fixedCurrent','lockedFlow'):
                self.assertEqual(len(result[name]),20); self.assertEqual({r['group'] for r in result[name]},groups)
            self.assertEqual(len(solve_calls),120); self.assertEqual(len(reference_calls),100)
            self.assertEqual(len(properties_calls),10); self.assertEqual(len(scale_calls),20); self.assertEqual(len(budget_calls),120)
            self.assertEqual(properties_calls,[s['name'] for s in scenarios()]); solver.calibrate.assert_not_called()
            absolute=[call for call in solve_calls if 'magnetic' not in call[-1]]
            locked=[call for call in solve_calls if 'magnetic' in call[-1]]
            self.assertEqual(len(absolute),100); self.assertEqual(len(locked),20)
            for m,beta,sigma,voltage,refinement,kwargs in solve_calls+reference_calls:
                self.assertEqual(beta,0.); self.assertEqual(sigma,1070.)
                self.assertEqual(m['branchCurrentA'],100)
                self.assertEqual(set(kwargs)-{'magnetic'},{'viscosity','conductivity_shape','beta_field'})
                self.assertTrue(all(callable(kwargs[k]) for k in ('viscosity','conductivity_shape','beta_field')))
                self.assertIn((refinement,voltage),((1,18.5),(2,18.5),(4,18.5),(4,16.5),(4,20.5)))
            for m,beta,sigma,voltage,refinement,kwargs in locked:
                self.assertEqual((voltage,refinement,kwargs['magnetic']),(18.5,4,0.))
                nominal=next(call for call in absolute if call[0]['anodeCenterM']==m['anodeCenterM']
                             and call[3:5]==(18.5,4) and call[-1]['beta_field'] is kwargs['beta_field'])
                self.assertTrue(all(kwargs[k] is nominal[-1][k] for k in ('viscosity','conductivity_shape','beta_field')))
            for row in result['fixedCurrent']:
                self.assertEqual(row['prediction']['currentsA']['cathode'],100.)
                self.assertAlmostEqual(row['driveGain'],100./18.5)
                self.assertAlmostEqual(row['voltageV'],100.); self.assertFalse(row['voltageWithinReportedRange'])
            for name,expected_paths in [('inputSHA256',INPUTS),('sourceSHA256',SOURCES)]:
                self.assertEqual(set(result[name]),{'scientific/'+p for p in expected_paths})
                for p,sha in result[name].items(): self.assertEqual(sha,hashlib.sha256((root/p).read_bytes()).hexdigest())
            self.assertEqual(result['inputSHA256']['scientific/flow-v81/results/flow-predictions.json'],campaign.V81_SHA)
            for row in result['cases']+result['fixedCurrent']:
                receipt=row['fieldPacket']; payload=(result_path.parent/receipt['path']).read_bytes()
                self.assertEqual(receipt['sha256'],hashlib.sha256(payload).hexdigest())
            self.assertFalse(result['targetVelocityRead']); self.assertFalse(result['currentConditioning'])
            self.assertFalse(result['experimentalQualification']); self.assertTrue(reads)


if __name__=='__main__': unittest.main()
