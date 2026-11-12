"""Unfitted spatial-transport predictions; measured velocities are never read."""
import gzip
import hashlib
import json
from pathlib import Path
import time
import numpy as np
import reference
import solver
from meridional import assess
from transport import CASES,profile,source_collision_profile

HERE=Path(__file__).parent
SEALED='1a1e7e54974ed7e7e28be655e911b17d3cdd7bc55107b34474148702858ef128'


def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def specifications():
    return [dict(transportCase=name,beta=beta) for name in CASES for beta in (3,9)]+[
        dict(transportCase='source-'+shape,beta=0) for shape in ('linear','quadratic')]


def fields(name):
    thermal=name.replace('source-','')+'-nominal' if name.startswith('source-') else name
    values=dict(viscosity=lambda r,z:profile(thermal,r)[1]+z*0)
    if name.startswith('source-'):
        shape=name.split('-',1)[1]
        values.update(conductivity_shape=lambda r,z:source_collision_profile(shape,r)['parallelShape']+z*0,
                      beta_field=lambda r,z:source_collision_profile(shape,r)['effectiveBeta']+z*0)
    return thermal,values


def summarize(result,m,thermal):
    output={k:v for k,v in result.items() if not isinstance(v,np.ndarray)}
    r,z=result['r'],result['z']; centers=np.sqrt((r[:-1]**2+r[1:]**2)/2)
    output.update(chordsM=m['chordsM'],chordVelocityMS=solver.observe(result,m['chordsM']),
                  radialCentersM=centers.tolist(),localMidplaneVelocityMS=(centers*result['omega'][0]).tolist(),
                  meridional=assess(r,z,result['omega'],profile(thermal,centers)[0]))
    return output


def predict_case(m,spec,refinement,voltage):
    thermal,properties=fields(spec['transportCase'])
    sigma,state=solver.calibrate(m,spec['beta'],voltage,refinement,**properties)
    other=reference.solve(m,spec['beta'],sigma,voltage,refinement,**properties)
    drop=('potentialV','velocityMS','omegaRadS')
    row=dict(**spec,refinement=refinement,voltageV=voltage,status='available',sigmaParallelSM=sigma,
             prediction=summarize(state,m,thermal),independentSameSigma={k:v for k,v in other.items() if k not in drop})
    if spec['transportCase'].startswith('source-'):
        row['sourceConductivityGain']=sigma/1070.
        if voltage==m['bulkVoltageV']:
            absolute=solver.solve(m,0,1070.,voltage,refinement,**properties)
            row['absoluteSourceElectrical']={k:absolute[k] for k in ('currentsA','electrodePowerW','jouleW','viscousW')}
    return row,state


def main():
    path=HERE.parent/'profile-v79/results/predictions.json'
    if sha(path)!=SEALED: raise ValueError('V79 seal changed')
    m=json.loads(path.read_text())['manifest']
    directory=HERE/'results'; (directory/'fields').mkdir(parents=True,exist_ok=True)
    inputs=[HERE/'PROTOCOL.md',HERE/'SOURCE-TRANSPORT-ADDENDUM.md',HERE/'argon-viscosity-source.json',path]
    output=dict(manifest=m,experimentalQualification=False,targetDataRead=False,cases=[],
                inputSHA256={str(p.relative_to(HERE.parent)):sha(p) for p in inputs},
                sourceSHA256={name:sha(HERE/name) for name in ('solver.py','transport.py','reference.py','meridional.py','campaign.py')})
    for spec in specifications():
        variants=[(r,m['bulkVoltageV']) for r in m['refinements']]+[(4,v) for v in m['bulkVoltageCasesV'] if v!=m['bulkVoltageV']]
        for ref,voltage in variants:
            start=time.monotonic(); print('Starting',spec,ref,voltage,flush=True)
            row,state=predict_case(m,spec,ref,voltage)
            raw=json.dumps(dict(r=state['r'].tolist(),z=state['z'].tolist(),omegaRadS=state['omega'].tolist()),separators=(',',':'),allow_nan=False).encode()
            filename=f"fields/{spec['transportCase']}-b{spec['beta']}-r{ref}-v{voltage}.json.gz"
            payload=gzip.compress(raw,mtime=0); (directory/filename).write_bytes(payload)
            row['fieldPacket']=dict(path=filename,sha256=hashlib.sha256(payload).hexdigest(),rawSHA256=hashlib.sha256(raw).hexdigest())
            output['cases'].append(row)
            (directory/'flow-predictions.json').write_text(json.dumps(output,indent=2,allow_nan=False)+'\n')
            print('Finished',spec,ref,voltage,'seconds',round(time.monotonic()-start,2),'sigma',row['sigmaParallelSM'],flush=True)
    print('SEALED',sha(directory/'flow-predictions.json'),flush=True)


if __name__=='__main__': main()
