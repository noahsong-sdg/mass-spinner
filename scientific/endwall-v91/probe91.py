"""Post-prediction V90 diagnosis; does not alter the backend or admission."""
import json
from pathlib import Path
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'scientific/coupled-openfoam-v90'))
from reference90 import R, H, MU, RHO, END, geometry, initial, K, Diffusion
from score90 import audit, require_packets, fields, restrict, difference

OLD = Path('/work/project/v90-coupled-source06/scientific/coupled-openfoam-v90')


def main():
    out = Path(sys.argv[1])
    out.mkdir(exist_ok=False)
    result = audit(OLD/'campaign-results', OLD/'extension-results')
    failures = [g for g in result['gates'] if not g['passed']]
    if len(failures) != 4:
        raise ValueError('Original four-gate failure did not reproduce')
    packets = {}
    for name in ('campaign-results', 'extension-results'):
        root = OLD/name
        rows = json.loads((root/'predictions.json').read_text())['cases']
        packets.update(require_packets(root, rows))
    observations = dict(reproducedFailures=failures, timeProfiles=[], wallLayers=[])
    for n in (16,32,64):
        f = geometry(n)
        p = packets[f'n{n}-s512-a0.5-work1']
        observations['wallLayers'].append(dict(n=n, dzM=H/(2*n),
            diffusionLengthM=float(np.sqrt(MU/RHO*END)),
            diffusionLengthInCells=float(np.sqrt(MU/RHO*END)/(H/(2*n)))))
        for j in (1,2,3):
            a,b = [fields(p[k][j]) for k in ('native','v86')]
            i = int(np.argmin(abs(f.mean_r-.03)))
            observations['timeProfiles'].append(dict(n=n,timeIndex=j,
                axialCentersM=((f.z[:-1]+f.z[1:])/2)[-8:].tolist(),
                radiusM=float(f.mean_r[i]),
                native={k:v[..., -8:,i].tolist() for k,v in a.items()},
                v86={k:v[..., -8:,i].tolist() for k,v in b.items()}))
    # Isolate only viscous/conductive response, before any subsequent Euler step.
    probes = []
    for n in (16,32,64):
        f = geometry(n);r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
        t,u = initial(r,z);q=f.state(RHO,t,.5,u/r)
        d=Diffusion(f,MU,conductivity=K)
        q1,receipt=d.advance(q,END/1024)
        p0,p1=f.primitive(q),f.primitive(q1)
        probes.append(dict(n=n,initialMaxRadialAcceleration=float(np.max(abs(f.rate(q)[1]/q[0]))),
            initialMaxAxialAcceleration=float(np.max(abs(f.rate(q)[2]/q[0]))),
            diffusionMaxMeridionalMPS=float(np.max(np.hypot(p1['vrMPS'],p1['vzMPS']))),
            maxTemperatureChangeK=float(np.max(abs(p1['temperatureK']-p0['temperatureK']))),
            energyResidualJ=receipt['energyResidualJ']))
    observations['isolatedInitialDiffusion']=probes
    (out/'diagnosis.json').write_text(json.dumps(observations,indent=2,allow_nan=False)+'\n')
    print(json.dumps(dict(reproducedFailures=failures,wallLayers=observations['wallLayers'],isolatedInitialDiffusion=probes)),flush=True)


if __name__=='__main__':
    main()
