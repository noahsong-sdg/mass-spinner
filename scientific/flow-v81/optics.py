"""Apply immutable V80 optical operators to new flow, without target speeds."""
import importlib.util
import json
from pathlib import Path
import sys
import hashlib
from concurrent.futures import ProcessPoolExecutor
from multiprocessing import get_context

HERE=Path(__file__).parent
V80=HERE.parent/'optical-v80'
sys.path.insert(0,str(V80))
spec=importlib.util.spec_from_file_location('v80_optical_study',V80/'study.py')
optical=importlib.util.module_from_spec(spec); spec.loader.exec_module(optical)


def predict_group(job):
    name,group,brightness,locations=job
    return name,optical.predict(group,brightness,locations)


def main():
    flow_path=HERE/'results/flow-predictions.json'; frozen=flow_path.read_bytes()
    packet=json.loads(frozen); brightness=optical.extract(json.loads((V80/'brightness-independent.json').read_text()))
    locations=json.loads((V80/'locations.json').read_text())['points']
    output=HERE/'results/optics'; output.mkdir(exist_ok=True)
    index=dict(flowPredictionSHA256=hashlib.sha256(frozen).hexdigest(),experimentalQualification=False,groups=[])
    index['betaConvention']='For source-* cases beta=0 is an unused case key; the supplied spatial effectiveBeta field sets transport. See flow prediction propertyRanges.effectiveBeta.'
    index['operatorSHA256']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in V80.glob('*.py')}
    index['diagnosticInputSHA256']={name:hashlib.sha256((V80/name).read_bytes()).hexdigest()
                                   for name in ('brightness-independent.json','locations.json')}
    jobs=[(name,dict(manifest=packet['manifest'],cases=[c for c in packet['cases'] if c['transportCase']==name]),brightness,locations)
          for name in dict.fromkeys(c['transportCase'] for c in packet['cases'])]
    with ProcessPoolExecutor(max_workers=2,mp_context=get_context('spawn')) as pool:
        results=list(pool.map(predict_group,jobs))
    for name,result in results:
        result['flowPredictionSHA256']=index['flowPredictionSHA256']
        result['operatorSHA256']=index['operatorSHA256']
        result['diagnosticInputSHA256']=index['diagnosticInputSHA256']
        result['betaConvention']=index['betaConvention']
        file=output/(name+'.json')
        file.write_text(json.dumps(result,indent=2,default=optical.serializable,allow_nan=False)+'\n')
        index['groups'].append(dict(transportCase=name,path='optics/'+file.name,sha256=hashlib.sha256(file.read_bytes()).hexdigest()))
        (HERE/'results/optical-index.json').write_text(json.dumps(index,indent=2)+'\n')
        print('Optical group finished',name,flush=True)
    if flow_path.read_bytes()!=frozen: raise ValueError('Flow changed during optical prediction')


if __name__=='__main__': main()
