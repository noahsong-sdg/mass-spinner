"""Sealed conditional meridional release. No measured velocity input."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import time
import numpy as np

HERE=Path(__file__).resolve().parent; ROOT=HERE.parent.parent
sys.path.insert(0,str(HERE.parent/'mixture-axial-v75'))
sys.path.insert(0,str(HERE.parent/'electrical-v82'))
from flow import Flow
from transport82 import profile
from diffusion86 import Diffusion,M_AR
from electro86 import Electro

BASELINE='f328e73864378179280f14495fa0963613b9954ddce576dabe91c052f4ea6d74'
TIMES=(0.,1e-6,2e-6,4e-6)


def sha(raw): return hashlib.sha256(raw).hexdigest()


def sources():
    files=list(HERE.glob('*.py'))+[HERE/'PROTOCOL.md',HERE.parent/'mixture-axial-v75/flow.py',
        HERE.parent/'electrical-v82/transport82.py',HERE.parent/'flow-v81/transport.py',
        HERE.parent/'flow-v81/argon-viscosity-source.json']
    return {str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in files}


def initialize(scenario,center,nr,nz,manifest):
    f=Flow(np.linspace(0,manifest['radiusM'],nr+1),np.linspace(0,manifest['halfLengthM'],nz+1),[M_AR,M_AR])
    c=profile(scenario['shape'],f.mean_r,scenario['electronTemperatureEV'],scenario['partition'],scenario['leadingWeakIonization'])
    rho=M_AR*(c['neutralDensityM3']+c['impliedElectronDensityM3'])
    diffusion=Diffusion(f,manifest['viscosityPaS'])
    electro=Electro(f,c['pedersenSM'],c['hallSM'],c['sigmaParallelSM'],manifest['magneticT'],
                    manifest['branchCurrentA'],manifest['cathodeRadiusM'],center,manifest['anodeWidthM'])
    omega,_=electro.steady_torsion(diffusion)
    q=f.state(rho,c['heavyTemperatureK'],.5,omega)
    return f,diffusion,electro,q


def evolve(scenario,center,nr,nz,max_dt,manifest):
    f,diffusion,electro,q=initialize(scenario,center,nr,nz,manifest)
    initial=q.copy(); snapshots=[]; history=[]; elapsed=0.; electrical=0.
    for target in TIMES:
        while elapsed < target:
            dt=min(max_dt,target-elapsed,f.stable_dt(q,.2))
            old=q.copy(); q,hydro=f.advance_with_receipt(q,dt)
            q,em=electro.advance(q,dt); q,viscous=diffusion.advance(q,dt)
            electrical+=em['externalWorkJ']; elapsed+=dt
            p=f.primitive(q)
            scale=max(float(abs(np.sum(q[4])-np.sum(initial[4]))),abs(electrical),float(np.sum(initial[4])),1e-300)
            history.append(dict(timeS=float(elapsed),dtS=float(dt),massRelativeDrift=float(abs(np.sum(q[0])-np.sum(initial[0]))/np.sum(initial[0])),
                speciesRelativeDrift=float(abs(np.sum(q[5])-np.sum(initial[5]))/np.sum(initial[5])),
                energyRelativeDefect=float(abs(np.sum(q[4])-np.sum(initial[4])-electrical)/scale),
                chargeRelativeResidual=em['chargeResidualA']/abs(electro.current),
                electricalWorkJ=electrical,ohmicJ=float(sum(em['jouleByCellJ'])),
                emNumericalHeatJ=float(sum(em['BEdefectByCellJ'])),
                viscousHeatJ=float(np.sum(viscous['viscousHeatJ'])),
                viscousNumericalHeatJ=float(np.sum(viscous['numericalHeatJ'])),
                maximumTemperatureK=float(p['temperatureK'].max()),minimumTemperatureK=float(p['temperatureK'].min()),
                maximumTotalMach=float(np.max(np.sqrt(p['vrMPS']**2+p['vzMPS']**2+f.mean_r2*p['omegaRadS']**2)/p['soundMPS']))))
        p=f.primitive(q)
        snapshots.append(dict(timeS=target,q=q.tolist(),**{k:v.tolist() for k,v in p.items()}))
    return dict(radialEdgesM=f.r.tolist(),axialEdgesM=f.z.tolist(),snapshots=snapshots,history=history,
        conditionalRelease=True,thermalSteadyState=False,experimentalQualification=False,
        prescribedCurrent=True,absoluteCurrentPrediction=False)


def main():
    phase=sys.argv[1] if len(sys.argv)>1 else 'flow'; baseline=HERE.parent/'boundary-v84/results/predictions.json'
    raw=baseline.read_bytes()
    if sha(raw)!=BASELINE: raise ValueError('Frozen baseline changed')
    old=json.loads(raw); directory=HERE/('pilot' if phase=='pilot' else 'results'); directory.mkdir(exist_ok=True)
    output=dict(manifest=old['manifest'],scenarios=old['scenarios'],baselinePredictionSHA256=BASELINE,
        sourceSHA256=sources(),targetVelocityRead=False,currentFitted=False,velocityFitted=False,
        conditionalRelease=True,experimentalQualification=False,cases=[])
    jobs=[(s,a,n,3*n//2,1e-7) for s in old['scenarios'] for a in (.07,.08) for n in (16,32,64)]
    jobs += [(old['scenarios'][0],.07,64,96,dt) for dt in (5e-8,2.5e-8)]
    if phase=='pilot': jobs=jobs[:1]
    (directory/'fields').mkdir(exist_ok=True)
    for index,(s,a,nr,nz,dt) in enumerate(jobs):
        label=f"{s['name']}-a{a}-r{nr}-dt{dt:g}"; started=time.monotonic(); print('START',label,flush=True)
        row=dict(label=label,scenario=s['name'],anodeCenterM=a,nr=nr,nz=nz,maxDtS=dt)
        try:
            state=evolve(s,a,nr,nz,dt,old['manifest'])
            payload=json.dumps(state,separators=(',',':'),allow_nan=False).encode(); packed=gzip.compress(payload,mtime=0)
            name='fields/'+label+'.json.gz'; (directory/name).write_bytes(packed)
            row.update(completed=True,fieldPacket=dict(path=name,sha256=sha(packed),rawSHA256=sha(payload)),
                maximumTemperatureK=max(h['maximumTemperatureK'] for h in state['history']),stepCount=len(state['history']))
        except (ValueError,ArithmeticError) as exc:
            row.update(completed=False,error=type(exc).__name__+': '+str(exc))
        output['cases'].append(row)
        (directory/'predictions.json').write_text(json.dumps(output,indent=2,allow_nan=False)+'\n')
        print('END',label,row.get('maximumTemperatureK',row.get('error')),round(time.monotonic()-started,2),flush=True)
    if output['sourceSHA256']!=sources(): raise ValueError('Source changed during prediction')
    print('SEALED',sha((directory/'predictions.json').read_bytes()),flush=True)


if __name__=='__main__': main()
