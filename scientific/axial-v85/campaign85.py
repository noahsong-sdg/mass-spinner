"""Published uniform-viscosity control and paired unfitted axial diagnostics."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import time
import numpy as np

HERE=Path(__file__).resolve().parent; ROOT=HERE.parent.parent; V84=HERE.parent/'boundary-v84'
sys.path.insert(0,str(V84)); sys.path.insert(0,str(HERE.parent/'electrical-v82'))
from model84 import solve
from reference84 import solve as reference
from model82 import properties
from transport82 import profile
from diagnostics85 import analyze

BASELINE='f328e73864378179280f14495fa0963613b9954ddce576dabe91c052f4ea6d74'
NEW_SOURCES=('PROTOCOL.md','campaign85.py','diagnostics85.py')


def sha(raw): return hashlib.sha256(raw).hexdigest()


def control_properties(scenario):
    fields=properties(scenario)
    return {**fields,'viscosity':1.14e-4}


def material(scenario,r):
    return profile(scenario['shape'],r,scenario['electronTemperatureEV'],scenario['partition'],scenario['leadingWeakIonization'])


def load_field(directory,entry):
    raw=(directory/entry['path']).read_bytes()
    if sha(raw)!=entry['sha256']: raise ValueError('Stale compressed field')
    raw=gzip.decompress(raw)
    if sha(raw)!=entry['rawSHA256']: raise ValueError('Stale raw field')
    f=json.loads(raw)
    return dict(r=f['r'],z=f['z'],omega=f['omegaRadS'],potential=f['potentialV'])


def main():
    raw=(V84/'results/predictions.json').read_bytes()
    if sha(raw)!=BASELINE: raise ValueError('Frozen baseline changed')
    old=json.loads(raw); directory=HERE/'results'; (directory/'fields').mkdir(parents=True,exist_ok=True)
    for name,value in old['sourceSHA256'].items():
        if sha((ROOT/name).read_bytes())!=value: raise ValueError('Frozen source changed: '+name)
    output={k:old[k] for k in ('manifest','scenarios','previousPredictionSHA256','sourceSHA256')}
    output.update(experimentalQualification=False,targetVelocityRead=False,currentFitted=False,currentConditioning=True,
        prescribedCurrent=True,absoluteCurrentPrediction=False,correctedVoltagePrediction=False,
        baselinePredictionSHA256=BASELINE,viscosityModel='Published uniform neutral-Ar 1.14e-4 Pa s; historical control',
        v85SourceSHA256={str((HERE/n).relative_to(ROOT)):sha((HERE/n).read_bytes()) for n in NEW_SOURCES},cases=[])
    diagnostics=dict(baselinePredictionSHA256=BASELINE,targetVelocityRead=False,circulationVelocityPredicted=False,cases=[])
    for scenario in old['scenarios']:
        for center in (.07,.08):
            apparatus={**old['manifest'],'anodeCenterM':center}; fields=control_properties(scenario)
            for n in (1,2,4,8):
                started=time.monotonic(); print('START',scenario['name'],center,n,flush=True)
                state=solve(apparatus,n,fields); other=reference(apparatus,n,fields)
                field=dict(r=state['r'].tolist(),z=state['z'].tolist(),omegaRadS=state['omega'].tolist(),potentialV=state['potential'].tolist())
                payload=json.dumps(field,separators=(',',':'),allow_nan=False).encode(); zipped=gzip.compress(payload,mtime=0)
                name=f"fields/{scenario['name']}-a{center}-n{n}.json.gz"; (directory/name).write_bytes(zipped)
                row=dict(scenario=scenario['name'],anodeCenterM=center,refinement=n,
                    prediction={k:v for k,v in state.items() if not isinstance(v,np.ndarray)},
                    independent={k:v for k,v in other.items() if not isinstance(v,np.ndarray)},
                    fieldPacket=dict(path=name,sha256=sha(zipped),rawSHA256=sha(payload)))
                output['cases'].append(row)
                original=next(c for c in old['cases'] if all(c[k]==row[k] for k in ('scenario','anodeCenterM','refinement')))
                baseline=load_field(V84/'results',original['fieldPacket']); baseline['ports']=original['prediction']['ports']
                for label,snapshot,coefficients in [('radial-viscosity',baseline,properties(scenario)),('published-uniform',state,fields)]:
                    rc=np.sqrt((np.asarray(snapshot['r'])[:-1]**2+np.asarray(snapshot['r'])[1:]**2)/2)
                    diagnostics['cases'].append(dict(scenario=row['scenario'],anodeCenterM=center,refinement=n,viscosityModel=label,
                        sourceFieldSHA256=(original if label=='radial-viscosity' else row)['fieldPacket']['sha256'],
                        reportedViscousW=(original if label=='radial-viscosity' else row)['prediction']['viscousW'],
                        diagnostic=analyze(apparatus,snapshot,coefficients,material(scenario,rc))))
                (directory/'predictions.json').write_text(json.dumps(output,indent=2,allow_nan=False)+'\n')
                (directory/'diagnostics.json').write_text(json.dumps(diagnostics,indent=2,allow_nan=False)+'\n')
                print('END',scenario['name'],center,n,'seconds',round(time.monotonic()-started,2),flush=True)
    diagnostics['predictionSHA256']=sha((directory/'predictions.json').read_bytes())
    (directory/'diagnostics.json').write_text(json.dumps(diagnostics,indent=2,allow_nan=False)+'\n')
    print('SEALED',diagnostics['predictionSHA256'],flush=True)


if __name__=='__main__': main()
