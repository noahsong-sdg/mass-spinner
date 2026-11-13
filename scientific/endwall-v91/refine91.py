"""Matched-clock refinement of the unchanged V90 physical problem."""
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/coupled-openfoam-v90'))
from reference90 import make_case, native_packet, own_packet, environment, command, sha


def main():
    if sys.platform!='linux' or os.getuid()!=1000:
        raise RuntimeError('Scientific execution requires safe-dev')
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    transfer=json.loads((ROOT/'transfer.json').read_text())
    def verify():
        for name,h in transfer.items():
            if sha(ROOT/name)!=h:
                raise ValueError('Transferred source changed: '+name)
    verify()
    old=Path('/work/project/v90-coupled-source06/scientific/coupled-openfoam-v90/campaign-results')
    native=json.loads((old/'predictions.json').read_text())['nativeSHA256']
    prefix=Path(environment()['WM_PROJECT_DIR'])
    if any(sha(prefix/p)!=h for p,h in native.items()):
        raise ValueError('Native implementation differs from V90')
    result=dict(sourceSHA256=transfer,nativeSHA256=native,cases=[],
                numericalComparisonPass=False,experimentalQualification=False)
    for n in (32,128):
        steps=1024;angle=.5;label=f'n{n}-s{steps}-a{angle}-work1'
        row=dict(label=label,n=n,steps=steps,halfAngleDeg=angle,stressWork=True)
        start=time.monotonic();print('START',label,flush=True)
        try:
            case=out/label
            row['commands']=make_case(case,n,steps,angle)
            row['inputSHA256']={str(p.relative_to(case)):sha(p) for p in case.rglob('*') if p.is_file()}
            row['commands'].append(command(case,['foamRun','-case',str(case)],environment(),'solver'))
            print('NATIVE COMPLETE',label,flush=True)
            a,row['native']=native_packet(case,n,steps,angle)
            b,row['v86']=own_packet(n,steps)
            packet=out/(label+'.npz');np.savez_compressed(packet,native=a,v86=b)
            row.update(completed=True,packet=packet.name,packetSHA256=sha(packet))
        except Exception as error:
            row.update(completed=False,error=type(error).__name__+': '+str(error))
        row['wallSeconds']=time.monotonic()-start;result['cases'].append(row)
        (out/'predictions.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
        print('END',label,row.get('error','complete'),row['wallSeconds'],flush=True)
        if not row['completed']:
            return 1
    verify()
    if any(sha(prefix/p)!=h for p,h in native.items()):
        raise ValueError('Native implementation changed during predictions')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
