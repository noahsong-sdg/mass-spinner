"""Time one exact optical kernel before launching the full comparison."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import time
import numpy as np

HERE=Path(__file__).resolve().parent; V86=HERE.parent/'meridional-v86'
sys.path.insert(0,str(V86))
import optical86
from compare86 import fixture,load


def main():
    directory=V86/'results'; packet=json.loads((directory/'predictions.json').read_text())
    case=next(c for c in packet['cases'] if c['scenario']=='linear-finite-te1' and c['anodeCenterM']==.07
              and c['nr']==64 and c['maxDtS']==1e-7)
    state=load(directory,case['fieldPacket']); final=state['snapshots'][-1]
    _,brightness,_=fixture()
    b=np.array([p['radiusM'] for p in brightness]); intensity=np.array([p['brightness'] for p in brightness])
    rec=optical86.emission80.reconstruct(b,intensity,.06,256,'linear')
    weights,means,_=optical86.components(rec['radialEdgesM'],rec['emissivity'],state['radialEdgesM'],
                                        final['omegaRadS'][0],final['vrMPS'][0],.025,8)
    bins=np.linspace(-12000,12000,9601); started=time.perf_counter()
    result=optical86.spectrum(weights,means,1400.,bins,0.)
    report=dict(componentCount=len(weights),binCount=len(bins)-1,kernelSeconds=time.perf_counter()-started,
        centroidMS=result['centroidMS'],modeMS=result['modeMS'],targetVelocityRead=False,
        predictionSHA256=hashlib.sha256((directory/'predictions.json').read_bytes()).hexdigest(),
        sourceSHA256={str(p.relative_to(HERE.parent.parent)):hashlib.sha256(p.read_bytes()).hexdigest()
                      for p in (Path(__file__),V86/'optical86.py')})
    (HERE/'performance.json').write_text(json.dumps(report,indent=2)+'\n'); print(json.dumps(report,indent=2))


if __name__=='__main__': main()
