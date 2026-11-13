"""Two additional trajectories, using unchanged V90/V91 implementations."""
import json
import os
from pathlib import Path
import sys
import time
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/endwall-v91'))
from candidate91 import evolve
from reference90 import environment,make_case,command,native_packet,sha
from score92 import verify_sources,OLD,load


def main():
    if sys.platform!='linux' or os.getuid()!=1000:raise RuntimeError('Run scientific computation inside safe-dev')
    verify_sources();reference,_=load(OLD/'fine-results')
    native=reference['nativeSHA256'];prefix=Path(environment()['WM_PROJECT_DIR'])
    def verify_native():
        if any(sha(prefix/k)!=v for k,v in native.items()):raise ValueError('Native installation changed')
    verify_native();out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    result=dict(sourceSHA256=json.loads((ROOT/'transfer.json').read_text()),
        referenceSHA256=json.loads((ROOT/'references.json').read_text()),nativeSHA256=native,cases=[],experimentalQualification=False)
    for steps in (512,2048):
        n=128;label=f'n{n}-s{steps}-a0.5-work1';print('START',label,flush=True)
        row=dict(label=label,n=n,steps=steps,halfAngleDeg=.5,stressWork=True);started=time.monotonic()
        try:
            case=out/label;row['commands']=make_case(case,n,steps,.5)
            row['inputSHA256']={str(p.relative_to(case)):sha(p) for p in case.rglob('*') if p.is_file()}
            row['commands'].append(command(case,['foamRun','-case',str(case)],environment(),'solver'))
            a,row['native']=native_packet(case,n,steps,.5);print('NATIVE COMPLETE',label,flush=True)
            b,row['v86']=evolve(n,steps);packet=out/(label+'.npz')
            np.savez_compressed(packet,native=a,v86=b)
            row.update(completed=True,packet=packet.name,packetSHA256=sha(packet))
        except Exception as error:
            row.update(completed=False,error=type(error).__name__+': '+str(error))
        row['wallSeconds']=time.monotonic()-started;result['cases'].append(row)
        (out/'predictions.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
        print('END',label,row.get('error','complete'),row['wallSeconds'],flush=True)
        verify_sources();verify_native()
        if not row['completed']:return 1
    return 0


if __name__=='__main__':raise SystemExit(main())
