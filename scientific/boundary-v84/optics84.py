"""Same V80 diagnostic, checked actual graded flow edges instead of legacy mesh."""
from concurrent.futures import ProcessPoolExecutor
from multiprocessing import get_context
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import numpy as np

HERE=Path(__file__).parent; V80=HERE.parent/'optical-v80'
sys.path.insert(0,str(V80))
spec=importlib.util.spec_from_file_location('optical_operator84',V80/'study.py')
optical=importlib.util.module_from_spec(spec); spec.loader.exec_module(optical)


def sha(raw): return hashlib.sha256(raw).hexdigest()


def velocity_grid(case,manifest):
    p=case['prediction']; edges=np.asarray(p['radialEdgesM']); omega=np.asarray(p['midplaneOmegaRadS'])
    if (edges.ndim!=1 or omega.shape!=(len(edges)-1,) or not np.isfinite(edges).all()
            or not np.isfinite(omega).all() or edges[0]!=0 or edges[-1]!=manifest['radiusM'] or np.any(np.diff(edges)<=0)):
        raise ValueError('Actual graded flow annuli required')
    return edges,omega


def predict(job):
    label,packet,brightness,locations=job; optical.velocity_grid=velocity_grid
    return label,optical.predict(packet,brightness,locations)


def main():
    directory=HERE/'results'; raw=(directory/'predictions.json').read_bytes(); flow=json.loads(raw)
    brightness=optical.extract(json.loads((V80/'brightness-independent.json').read_text()))
    locations=json.loads((V80/'locations.json').read_text())['points']; (directory/'optics').mkdir(exist_ok=True)
    result=dict(predictionSHA256=sha(raw),experimentalQualification=False,targetVelocityRead=False,groups=[],
        operatorSHA256={p.name:sha(p.read_bytes()) for p in V80.glob('*.py')},adapterSHA256=sha(Path(__file__).read_bytes()),
        diagnosticSHA256={n:sha((V80/n).read_bytes()) for n in ('brightness-independent.json','locations.json')},
        interfaceScope='Legacy refinement=4 and beta=ring-current are adapter tags; actualFlowRefinement records resolution. Actual flow edges/omega are passed without regridding. No numerical Hall parameter or drive voltage is inferred from these tags.')
    jobs=[]
    for c in flow['cases']:
        if c['refinement'] not in (4,8): continue
        zipped=(directory/c['fieldPacket']['path']).read_bytes(); payload=gzip.decompress(zipped)
        if sha(zipped)!=c['fieldPacket']['sha256'] or sha(payload)!=c['fieldPacket']['rawSHA256']: raise ValueError('Flow field seal changed')
        field=json.loads(payload); label=f"{c['scenario']}-a{c['anodeCenterM']}-n{c['refinement']}"
        adapted=dict(beta='ring-current',voltageV=None,refinement=4,
                     prediction=dict(radialEdgesM=field['r'],midplaneOmegaRadS=field['omegaRadS'][0]))
        jobs.append((label,dict(manifest=flow['manifest'],cases=[adapted]),brightness,locations))
    with ProcessPoolExecutor(max_workers=2,mp_context=get_context('spawn')) as pool:
        for label,value in pool.map(predict,jobs):
            value.update(predictionSHA256=result['predictionSHA256'],actualFlowRefinement=int(label.rsplit('-n',1)[1]))
            payload=json.dumps(value,default=optical.serializable,allow_nan=False,separators=(',',':')).encode()
            zipped=gzip.compress(payload,mtime=0); name='optics/'+label+'.json.gz'; (directory/name).write_bytes(zipped)
            result['groups'].append(dict(group=label,path=name,sha256=sha(zipped),rawSHA256=sha(payload)))
            (directory/'optical-index.json').write_text(json.dumps(result,indent=2)+'\n'); print('END optics',label,flush=True)
    if (directory/'predictions.json').read_bytes()!=raw: raise ValueError('Optics modified flow')


if __name__=='__main__': main()
