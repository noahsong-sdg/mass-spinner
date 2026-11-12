"""Seal source-prescribed current-ring flow before reading measured velocities."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import time
import numpy as np
from model84 import solve
from reference84 import solve as reference

HERE=Path(__file__).parent; ROOT=HERE.parent.parent
sys.path.insert(0,str(HERE.parent/'electrical-v82'))
from model82 import properties
SEALED='a9cc96d31bf42f7039700dc5fae01f94ecaf12b98752c4dcf8c012fad39d3676'


def sha(raw): return hashlib.sha256(raw).hexdigest()


def main():
    raw=(HERE.parent/'regional-v83/results/predictions.json').read_bytes()
    if sha(raw)!=SEALED: raise ValueError('Frozen V83 packet changed')
    old=json.loads(raw); m=old['manifest']; directory=HERE/'results'; (directory/'fields').mkdir(parents=True,exist_ok=True)
    sources=[HERE/n for n in ('PROTOCOL.md','model84.py','mesh84.py','reference84.py','campaign84.py')]
    sources+=[HERE.parent/'regional-v83/mesh83.py']
    sources+=[HERE.parent/'electrical-v82'/n for n in ('model82.py','transport82.py')]
    sources+=[HERE.parent/'flow-v81'/n for n in ('solver.py','reference.py','transport.py')]+[HERE.parent/'profile-v79/solver.py']
    output=dict(manifest=m,scenarios=old['scenarios'],previousPredictionSHA256=SEALED,
        experimentalQualification=False,targetVelocityRead=False,currentFitted=False,currentConditioning=True,
        prescribedCurrent=True,absoluteCurrentPrediction=False,correctedVoltagePrediction=False,
        sourceSHA256={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in sources},cases=[])
    for scenario in old['scenarios']:
        for center in (.07,.08):
            apparatus={**m,'anodeCenterM':center}; fields=properties(scenario)
            for n in (1,2,4,8):
                start=time.monotonic(); print('START',scenario['name'],center,n,flush=True)
                state=solve(apparatus,n,fields); other=reference(apparatus,n,fields)
                field=dict(r=state['r'].tolist(),z=state['z'].tolist(),omegaRadS=state['omega'].tolist(),potentialV=state['potential'].tolist())
                payload=json.dumps(field,separators=(',',':'),allow_nan=False).encode(); zipped=gzip.compress(payload,mtime=0)
                name=f"fields/{scenario['name']}-a{center}-n{n}.json.gz"; (directory/name).write_bytes(zipped)
                output['cases'].append(dict(scenario=scenario['name'],anodeCenterM=center,refinement=n,
                    prediction={k:v for k,v in state.items() if not isinstance(v,np.ndarray)},
                    independent={k:v for k,v in other.items() if not isinstance(v,np.ndarray)},
                    fieldPacket=dict(path=name,sha256=sha(zipped),rawSHA256=sha(payload))))
                (directory/'predictions.json').write_text(json.dumps(output,indent=2,allow_nan=False)+'\n')
                print('END',scenario['name'],center,n,'P/I',state['electrodePowerW']/state['currentA'],
                      'seconds',round(time.monotonic()-start,2),flush=True)
    print('SEALED',sha((directory/'predictions.json').read_bytes()),flush=True)


if __name__=='__main__': main()
