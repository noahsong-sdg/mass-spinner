"""Sealed absolute-current predictions; measured speed files are never opened."""
import gzip
import hashlib
import json
from pathlib import Path
import time
import numpy as np
from budget82 import reconstruct
from model82 import properties,scaled_state,solver,reference
from transport82 import SCENARIOS,profile

HERE=Path(__file__).parent; ROOT=HERE.parent.parent
V81_SHA='1cda6cc3b87e1cffefde611d55122855911391e8ccab538b59b27a72a904ab1d'


def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def key(scenario,center): return scenario['name']+'-anode-'+str(center)


def describe(m,state):
    r=state['r']; rc=np.sqrt((r[:-1]**2+r[1:]**2)/2)
    return dict(**{k:v for k,v in state.items() if not isinstance(v,np.ndarray)},
                chordsM=m['chordsM'],chordVelocityMS=solver.observe(state,m['chordsM']),
                radialCentersM=rc.tolist(),localMidplaneVelocityMS=(rc*state['omega'][0]).tolist())


def save_state(directory,name,state,arrays):
    value=dict(r=state['r'].tolist(),z=state['z'].tolist(),omegaRadS=state['omega'].tolist(),potentialV=state['potential'].tolist(),
               **{'cell'+k[0].upper()+k[1:]:v.tolist() for k,v in arrays.items()})
    raw=json.dumps(value,separators=(',',':'),allow_nan=False).encode(); compressed=gzip.compress(raw,mtime=0)
    path='fields/'+name+'.json.gz'; (directory/path).write_bytes(compressed)
    return dict(path=path,sha256=hashlib.sha256(compressed).hexdigest(),rawSHA256=hashlib.sha256(raw).hexdigest())


def main():
    frozen=HERE.parent/'flow-v81/results/flow-predictions.json'
    if sha(frozen)!=V81_SHA: raise ValueError('V81 seal changed')
    m=json.loads(frozen.read_text())['manifest']; directory=HERE/'results'
    (directory/'fields').mkdir(parents=True,exist_ok=True)
    inputs=[HERE/'PROTOCOL.md',frozen,HERE.parent/'profile-v79/manifest.json',
            HERE.parent/'flow-v81/argon-viscosity-source.json',HERE.parent/'optical-v80/sources/journal.pdf']
    sources=[HERE/n for n in ('campaign82.py','model82.py','budget82.py','transport82.py')]
    sources+=[HERE.parent/'flow-v81'/n for n in ('solver.py','reference.py','transport.py')]+[HERE.parent/'profile-v79/solver.py']
    output=dict(manifest=m,scenarios=SCENARIOS,anodeCentersM=[.07,.08],experimentalQualification=False,
                targetVelocityRead=False,currentConditioning=False,betaMode='Supplied spatial effective-beta field; scalar beta is unused',
                inputSHA256={str(p.relative_to(ROOT)):sha(p) for p in inputs},sourceSHA256={str(p.relative_to(ROOT)):sha(p) for p in sources},
                cases=[],fixedCurrent=[],lockedFlow=[])
    for scenario in SCENARIOS:
        fields=properties(scenario)
        for center in output['anodeCentersM']:
            apparatus={**m,'anodeCenterM':center}; group=key(scenario,center)
            variants=[(r,18.5) for r in (1,2,4)]+[(4,v) for v in (16.5,20.5)]
            for ref,voltage in variants:
                print('Starting',group,ref,voltage,flush=True); start=time.monotonic()
                state=solver.solve(apparatus,0.,1070.,voltage,ref,**fields)
                independent=reference.solve(apparatus,0.,1070.,voltage,ref,**fields)
                budget,arrays=reconstruct(apparatus,state,voltage,fields)
                rc=np.sqrt((state['r'][:-1]**2+state['r'][1:]**2)/2)
                transport=profile(scenario['shape'],rc,scenario['electronTemperatureEV'],scenario['partition'],scenario['leadingWeakIonization'])
                row=dict(group=group,scenario=scenario['name'],anodeCenterM=center,refinement=ref,voltageV=voltage,drive='absolute-voltage',
                         prediction=describe(apparatus,state),budget=budget,
                         transportRanges={k:[float(np.min(v)),float(np.max(v))] for k,v in transport.items()},
                         independentSameSigma={k:v for k,v in independent.items() if k not in ('potentialV','velocityMS','omegaRadS')})
                row['fieldPacket']=save_state(directory,group+'-r'+str(ref)+'-v'+str(voltage),state,arrays)
                output['cases'].append(row)
                if ref==4 and voltage==18.5:
                    gain=100./state['currentsA']['cathode']; driven=scaled_state(state,gain)
                    fixed_budget,fixed_arrays=reconstruct(apparatus,driven,voltage*gain,fields)
                    fixed=dict(group=group,scenario=scenario['name'],anodeCenterM=center,refinement=4,voltageV=voltage*gain,
                               drive='fixed-current',driveGain=gain,voltageWithinReportedRange=16.5<=voltage*gain<=20.5,
                               prediction=describe(apparatus,driven),budget=fixed_budget)
                    fixed['fieldPacket']=save_state(directory,group+'-fixed100A',driven,fixed_arrays); output['fixedCurrent'].append(fixed)
                    locked=solver.solve(apparatus,0.,1070.,18.5,4,**fields,magnetic=0.)
                    output['lockedFlow'].append(dict(group=group,anodeCenterM=center,prediction=describe(apparatus,locked),
                        scope='Frozen conductivity tensor; suppress only motional EMF and torque. Not a zero-B discharge.'))
                (directory/'predictions.json').write_text(json.dumps(output,indent=2,allow_nan=False)+'\n')
                print('Finished',group,ref,voltage,'A',state['currentsA']['cathode'],'s',round(time.monotonic()-start,2),flush=True)
    print('SEALED',sha(directory/'predictions.json'),flush=True)


if __name__=='__main__': main()
