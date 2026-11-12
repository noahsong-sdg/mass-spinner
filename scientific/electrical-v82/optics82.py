"""Apply the immutable V80 optical model to sealed V82 electrical challenges."""
from concurrent.futures import ProcessPoolExecutor
from multiprocessing import get_context
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

HERE=Path(__file__).parent; V80=HERE.parent/'optical-v80'
sys.path.insert(0,str(V80))
spec=importlib.util.spec_from_file_location('optical_operator_v80',V80/'study.py')
optical=importlib.util.module_from_spec(spec); spec.loader.exec_module(optical)


def sha(raw): return hashlib.sha256(raw).hexdigest()


def predict(job):
    name,packet,brightness,locations=job
    return name,optical.predict(packet,brightness,locations)


def main():
    directory=HERE/'results'; raw=(directory/'predictions.json').read_bytes(); packet=json.loads(raw)
    brightness=optical.extract(json.loads((V80/'brightness-independent.json').read_text()))
    locations=json.loads((V80/'locations.json').read_text())['points']
    output=directory/'optics'; output.mkdir(exist_ok=True)
    index=dict(predictionSHA256=sha(raw),experimentalQualification=False,targetVelocityRead=False,groups=[],
        operatorSHA256={p.name:sha(p.read_bytes()) for p in V80.glob('*.py')},
        diagnosticSHA256={n:sha((V80/n).read_bytes()) for n in ('brightness-independent.json','locations.json')},
        legacyBetaKey='V80 beta key contains drive label, never a numerical Hall parameter; actual spatial tensor remains in V82 predictions.')
    rows=[c for c in packet['cases'] if c['refinement']==4]+packet['fixedCurrent']; jobs=[]
    for group in dict.fromkeys(c['group'] for c in rows):
        selected=[c for c in rows if c['group']==group]
        cases=[dict(beta=c['drive'],voltageV=c['voltageV'],refinement=4,prediction=c['prediction']) for c in selected]
        m={**packet['manifest'],'anodeCenterM':selected[0]['anodeCenterM']}
        jobs.append((group,dict(manifest=m,cases=cases),brightness,locations))
    with ProcessPoolExecutor(max_workers=2,mp_context=get_context('spawn')) as pool:
        for group,data in pool.map(predict,jobs):
            data.update(predictionSHA256=index['predictionSHA256'],operatorSHA256=index['operatorSHA256'],
                        diagnosticSHA256=index['diagnosticSHA256'],legacyBetaKey=index['legacyBetaKey'])
            payload=json.dumps(data,indent=2,default=optical.serializable,allow_nan=False).encode()
            compressed=gzip.compress(payload,mtime=0); name='optics/'+group+'.json.gz'
            (directory/name).write_bytes(compressed)
            index['groups'].append(dict(group=group,path=name,sha256=sha(compressed),rawSHA256=sha(payload)))
            (directory/'optical-index.json').write_text(json.dumps(index,indent=2)+'\n')
            print('Optical group finished',group,flush=True)
    if (directory/'predictions.json').read_bytes()!=raw: raise ValueError('Predictions changed during optics')


if __name__=='__main__': main()
