"""Fixed-physics spatial refinement; no measured-speed access or fitting."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import time
import numpy as np
from mesh83 import access_depth,operators

HERE=Path(__file__).parent; ROOT=HERE.parent.parent
sys.path.insert(0,str(HERE.parent/'electrical-v82'))
from model82 import properties
from budget82 import reconstruct
from transport82 import SCENARIOS
SEALED='8b4041c7db6ee606db57dca695da350919c7a6f0c29727f2dbd3ac010ecd857e'


def sha(raw): return hashlib.sha256(raw).hexdigest()


def regions(m,state,arrays,depth):
    z=state['z']; lower=m['anodeCenterM']-m['anodeWidthM']/2; upper=lower+m['anodeWidthM']
    intervals=[('midplane-side',0.,lower),('anode-band',lower,upper),('cathode-side',upper,z[-1])]
    intervals += [('endwall-'+str(d),z[-1]-d,z[-1]) for d in (.004,.016,.04,.08,depth)]
    output=[]; current=state['currentsA']['cathode']; power=state['electrodePowerW']
    for name,lo,hi in intervals:
        ends=[]
        for x in (lo,hi):
            found=np.flatnonzero(abs(z-x)<1e-13)
            if len(found)!=1: raise ValueError('Region cut must match one mesh face')
            ends.append(int(found[0]))
        values={k:float(np.sum(v[ends[0]:ends[1]])) for k,v in arrays.items()}
        output.append(dict(name=name,axialEdgesM=[lo,hi],**values,
            jouleVoltEquivalent=values['jouleW']/current,rotorWorkVoltEquivalent=values['rotorWorkW']/current,
            electricalBalanceRelative=abs(values['electricalInW']-values['jouleW']-values['rotorWorkW'])/power))
    return output


def main():
    previous=HERE.parent/'electrical-v82/results/predictions.json'; raw=previous.read_bytes()
    if sha(raw)!=SEALED: raise ValueError('V82 prediction seal changed')
    m=json.loads(raw)['manifest']; scenarios=[s for s in SCENARIOS if s['name'].endswith(('finite-te1','finite-te2.5-source'))]
    directory=HERE/'results'; (directory/'fields').mkdir(parents=True,exist_ok=True)
    sources=[HERE/n for n in ('campaign83.py','mesh83.py','PROTOCOL.md')]
    sources += [HERE.parent/'electrical-v82'/n for n in ('budget82.py','model82.py','transport82.py')]
    sources += [HERE.parent/'flow-v81'/n for n in ('solver.py','reference.py','transport.py')]+[HERE.parent/'profile-v79/solver.py']
    result=dict(experimentalQualification=False,targetVelocityRead=False,currentConditioning=False,
        previousPredictionSHA256=SEALED,manifest=m,scenarios=scenarios,sourceSHA256={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in sources},cases=[])
    for scenario in scenarios:
        for center in (.07,.08):
            apparatus={**m,'anodeCenterM':center}; depth=access_depth(scenario,apparatus); fields=properties(scenario)
            variants=[(n,n) for n in (1,2,4,8)]
            if scenario['name']=='linear-finite-te1' and center==.07: variants += [(4,8),(8,4)]
            for nr,nz in variants:
                start=time.monotonic(); print('START',scenario['name'],center,nr,nz,flush=True)
                p,q=operators(apparatus,nr,nz,depth); state=p.solve(apparatus,0.,1070.,18.5,1,**fields)
                other=q.solve(apparatus,0.,1070.,18.5,1,**fields)
                budget,arrays=reconstruct(apparatus,state,18.5,fields)
                key=f"{scenario['name']}-a{center}-r{nr}-z{nz}"; name='fields/'+key+'.json.gz'
                field=dict(r=state['r'].tolist(),z=state['z'].tolist(),omegaRadS=state['omega'].tolist(),potentialV=state['potential'].tolist(),
                    **{'cell'+k[0].upper()+k[1:]:v.tolist() for k,v in arrays.items()})
                payload=json.dumps(field,separators=(',',':'),allow_nan=False).encode(); zipped=gzip.compress(payload,mtime=0)
                (directory/name).write_bytes(zipped)
                result['cases'].append(dict(scenario=scenario['name'],anodeCenterM=center,radialRefinement=nr,axialRefinement=nz,
                    accessDepthM=depth,shape=list(state['omega'].shape),prediction={k:v for k,v in state.items() if not isinstance(v,np.ndarray)},
                    chordVelocityMS=p.observe(state,m['chordsM']),budget=budget,regions=regions(apparatus,state,arrays,depth),
                    independent={k:v for k,v in other.items() if k not in ('potentialV','velocityMS','omegaRadS')},
                    fieldPacket=dict(path=name,sha256=sha(zipped),rawSHA256=sha(payload))))
                (directory/'predictions.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
                print('END A',state['currentsA']['cathode'],'seconds',round(time.monotonic()-start,2),flush=True)
    print('SEALED',sha((directory/'predictions.json').read_bytes()),flush=True)


if __name__=='__main__': main()
