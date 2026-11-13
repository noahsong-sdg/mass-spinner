"""Active acoustic-CFL refinement of immutable V86; no optical targets."""
import gzip
import hashlib
from importlib.metadata import version
import json
from pathlib import Path
import sys
import time
import numpy as np

HERE=Path(__file__).resolve().parent; ROOT=HERE.parent.parent
sys.path.insert(0,str(HERE.parent/'meridional-v86'))
import campaign86 as base

BASELINE='70e0923e8ac9a53a476e439a9df3e670fb52467ee9d3d6ab5aa62ad9eae5e5c7'
SOURCE_FILES=('scientific/timestep-v87/study87.py','scientific/timestep-v87/PROTOCOL.md',
    'scientific/meridional-v86/campaign86.py','scientific/meridional-v86/diffusion86.py',
    'scientific/meridional-v86/electro86.py','scientific/mixture-axial-v75/flow.py',
    'scientific/electrical-v82/transport82.py','scientific/flow-v81/transport.py',
    'scientific/flow-v81/argon-viscosity-source.json')


def sha(raw): return hashlib.sha256(raw).hexdigest()


def sources(root=ROOT): return {name:sha((root/name).read_bytes()) for name in SOURCE_FILES}


def choose_dt(cap,remaining,acoustic):
    if not np.isfinite([cap,remaining,acoustic]).all() or min(cap,remaining,acoustic)<=0:
        raise ValueError('Step candidates must be finite and positive')
    return min(cap,remaining,acoustic)


def evolve(scenario,manifest,cfl,nr=64,nz=96):
    if cfl not in (.2,.1,.05): raise ValueError('Undeclared CFL')
    f,diffusion,electro,q=base.initialize(scenario,.07,nr,nz,manifest)
    initial=q.copy(); snapshots=[]; history=[]; schedule=[]; elapsed=0.; electrical=0.
    for target in base.TIMES:
        while elapsed < target:
            acoustic=f.stable_dt(q,cfl); remaining=target-elapsed
            dt=choose_dt(1e-7,remaining,acoustic)
            schedule.append(dict(timeBeforeS=float(elapsed),acousticBoundS=float(acoustic),
                remainingToReportS=float(remaining),acceptedDtS=float(dt)))
            q,hydro=f.advance_with_receipt(q,dt)
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
    state=dict(radialEdgesM=f.r.tolist(),axialEdgesM=f.z.tolist(),snapshots=snapshots,history=history,
        conditionalRelease=True,thermalSteadyState=False,experimentalQualification=False,
        prescribedCurrent=True,absoluteCurrentPrediction=False)
    return state,schedule


def read_baseline(path):
    raw=path.read_bytes()
    if sha(raw)!=BASELINE: raise ValueError('Frozen V86 prediction changed')
    packet=json.loads(raw)
    for name,digest in packet['sourceSHA256'].items():
        if sha((ROOT/name).read_bytes())!=digest: raise ValueError('Frozen V86 source changed: '+name)
    return packet


def main():
    old=read_baseline(HERE.parent/'meridional-v86/results/predictions.json')
    directory=HERE/'results'; (directory/'fields').mkdir(parents=True,exist_ok=True)
    output=dict(manifest=old['manifest'],baselinePredictionSHA256=BASELINE,sourceSHA256=sources(),
        versions={p:version(p) for p in ('numpy','scipy','scikit-fem')},
        targetVelocityRead=False,currentFitted=False,velocityFitted=False,conditionalRelease=True,
        experimentalQualification=False,fullModelNumericallyQualified=False,cases=[])
    for cfl in (.2,.1,.05):
        label=f'linear-finite-te1-a0.07-r64-cfl{cfl:g}'; started=time.monotonic()
        print('START',label,flush=True)
        row=dict(label=label,cfl=cfl,scenario=old['scenarios'][0]['name'],anodeCenterM=.07,nr=64,nz=96,maxDtS=1e-7)
        try:
            state,schedule=evolve(old['scenarios'][0],old['manifest'],cfl)
            payload=json.dumps(state,separators=(',',':'),allow_nan=False).encode(); packed=gzip.compress(payload,mtime=0)
            name='fields/'+label+'.json.gz'; (directory/name).write_bytes(packed)
            if cfl==.2:
                control=next(c for c in old['cases'] if c['scenario']==row['scenario'] and c['anodeCenterM']==.07
                    and c['nr']==64 and c['maxDtS']==1e-7)['fieldPacket']
                if sha(payload)!=control['rawSHA256'] or sha(packed)!=control['sha256']:
                    raise ValueError('CFL .2 changed frozen V86 field/history packet')
            row.update(completed=True,fieldPacket=dict(path=name,sha256=sha(packed),rawSHA256=sha(payload)),
                maximumTemperatureK=max(h['maximumTemperatureK'] for h in state['history']),
                stepCount=len(state['history']),schedule=schedule)
        except (ValueError,ArithmeticError) as exc:
            row.update(completed=False,error=type(exc).__name__+': '+str(exc))
        output['cases'].append(row)
        (directory/'predictions.json').write_text(json.dumps(output,indent=2,allow_nan=False)+'\n')
        print('END',label,row.get('stepCount',row.get('error')),round(time.monotonic()-started,2),flush=True)
        if not row['completed']: return 1
    if output['sourceSHA256']!=sources(): raise ValueError('Producer source changed during study')
    print('SEALED',sha((directory/'predictions.json').read_bytes()),flush=True)
    return 0


if __name__=='__main__': raise SystemExit(main())
