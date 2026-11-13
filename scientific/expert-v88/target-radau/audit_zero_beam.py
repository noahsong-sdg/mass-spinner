"""Supplement only: zero incident current must produce exactly zero rate."""
import hashlib
import json
import math
from pathlib import Path
import sys


def require(ok,message):
    if not ok: raise ValueError(message)


def audit(packet):
    rows=samples=0
    for row in packet['rows']:
        current=row['beam']['beamCurrentA']
        require(type(current) in (int,float) and math.isfinite(current) and current>=0,'Invalid beam current')
        if current!=0: continue
        require(row['completed'] is True and len(row['history'])>0,'Missing zero-beam trajectory')
        rows+=1
        for state in row['history']:
            rate=state['neutronRateS']
            require(type(rate) in (int,float) and math.isfinite(rate) and rate==0,
                'Zero-current neutron rate must be finite and exactly zero')
            samples+=1
    require(rows>0,'No zero-current trajectory to audit')
    return dict(zeroCurrentTrajectories=rows,zeroCurrentSamples=samples,zeroBeamRateAdmissionPass=True,
        numericalControlPass=False,experimentalQualification=False,
        scope='Exact-zero rate admission only; original failed numerical gates remain unchanged.')


def main():
    source,destination=map(Path,sys.argv[1:3]); raw=source.read_bytes()
    require(not destination.exists(),'Preserve the previous supplemental receipt')
    result=audit(json.loads(raw)); digest=lambda data:hashlib.sha256(data).hexdigest()
    result.update(browserSHA256=digest(raw),helperSHA256=digest(Path(__file__).read_bytes()))
    destination.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    print(json.dumps(result,indent=2)); return 0


if __name__=='__main__': raise SystemExit(main())
