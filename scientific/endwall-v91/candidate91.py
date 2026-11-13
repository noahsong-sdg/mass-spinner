"""Opt-in stationary-wall reconstruction; reuse authenticated native fields."""
import json
import os
from pathlib import Path
import sys
import time
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/coupled-openfoam-v90'))
from reference90 import Flow,Diffusion,R,H,RHO,MU,K,END,M_AR,initial,sha,environment,geometry
from score90 import require_packets

OLD=Path('/work/project/v90-coupled-source06/scientific/coupled-openfoam-v90')
BASE=Path('/work/project/v91-endwall-source02/scientific/endwall-v91/refine-results')


def evolve(n,steps, *, axialGrade=0.):
    f=geometry(n,axialGrade=axialGrade,noSlipWalls=True)
    r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
    t,u=initial(r,z);q=f.state(RHO,t,.5,u/r);d=Diffusion(f,MU,conductivity=K)
    states=[];history=[]
    for step in range(steps+1):
        if step in (0,steps//4,steps//2,steps):
            p=f.primitive(q);states.append(q.copy())
            history.append(dict(timeS=END*step/steps,massKg=float(q[0].sum()),
                energyJ=float(q[4].sum()),angularKgM2S=float(q[3].sum()),
                maxTemperatureK=float(p['temperatureK'].max()),
                peakMeridionalMPS=float(np.max(np.hypot(p['vrMPS'],p['vzMPS'])))))
        if step<steps:
            q=f.advance(q,END/steps);q,_=d.advance(q,END/steps)
    return np.array(states),dict(history=history)


def main():
    if sys.platform!='linux' or os.getuid()!=1000:
        raise RuntimeError('Scientific execution requires safe-dev')
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    sources=json.loads((ROOT/'transfer.json').read_text())
    def verify():
        for name,h in sources.items():
            if sha(ROOT/name)!=h:raise ValueError('Source changed: '+name)
    verify();prefix=Path(environment()['WM_PROJECT_DIR'])
    for group,reference in [('campaign-results',OLD/'campaign-results'),
                             ('extension-results',OLD/'extension-results'),('fine-results',BASE)]:
        target=out/group;target.mkdir()
        data=json.loads((reference/'predictions.json').read_text())
        packets=require_packets(reference,data['cases'])
        native=data['nativeSHA256']
        if any(sha(prefix/p)!=h for p,h in native.items()):
            raise ValueError('Native implementation changed')
        result=dict(sourceSHA256=sources,nativeSHA256=native,cases=[],
            nativePredictionReference=str(reference/'predictions.json'),
            nativePredictionSHA256=sha(reference/'predictions.json'),
            experimentalQualification=False)
        for row in data['cases']:
            label=row['label'];print('START',label,flush=True);started=time.monotonic()
            new={k:row[k] for k in ('label','n','steps','halfAngleDeg','stressWork','native')}
            new['nativePacketReference']=dict(path=str(reference/row['packet']),sha256=row['packetSHA256'])
            try:
                q,new['v86']=evolve(row['n'],row['steps'])
                path=target/(label+'.npz')
                np.savez_compressed(path,native=packets[label]['native'],v86=q)
                new.update(completed=True,packet=path.name,packetSHA256=sha(path))
            except Exception as error:
                new.update(completed=False,error=type(error).__name__+': '+str(error))
            new['wallSeconds']=time.monotonic()-started;result['cases'].append(new)
            (target/'predictions.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
            print('END',label,new.get('error','complete'),new['wallSeconds'],flush=True)
            if not new['completed']:return 1
        if sha(reference/'predictions.json')!=result['nativePredictionSHA256']:
            raise ValueError('Native prediction manifest changed')
        if any(sha(prefix/p)!=h for p,h in native.items()):
            raise ValueError('Native implementation changed during predictions')
    verify();return 0


if __name__=='__main__':
    raise SystemExit(main())
