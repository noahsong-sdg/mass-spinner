"""Export saved Gaussian-mixture marginals and unchanged audit gates, never a new solve.

Run inside safe-dev. Inputs are exact archived arrays, not reconstructed moments.
"""
import hashlib
import json
import math
from pathlib import Path

ROOT = Path('.')
SOURCES = {}


def read(path, lines=False):
    data = (ROOT / path).read_bytes()
    SOURCES[path] = hashlib.sha256(data).hexdigest()
    return [json.loads(row) for row in data.splitlines()] if lines else json.loads(data)


def marginal(centers, weights, variance, axis):
    sigma = math.sqrt(variance)
    left = min(v[axis] for v in centers) - 10 * sigma
    right = max(v[axis] for v in centers) + 10 * sigma
    x = [left + (right-left)*i/160 for i in range(161)]
    y = [math.fsum(w * math.exp(-(u-v[axis])**2/(2*variance))/math.sqrt(2*math.pi*variance)
                   for v, w in zip(centers, weights)) for u in x]
    dx = x[1] - x[0]
    moments = [dx*math.fsum((.5 if i in (0,160) else 1)*p*u**power
                           for i,(u,p) in enumerate(zip(x,y))) for power in range(3)]
    number = math.fsum(weights)
    exact = [number, math.fsum(w*v[axis] for w,v in zip(weights,centers)),
             math.fsum(w*(v[axis]**2+variance) for w,v in zip(weights,centers))]
    error = max(abs(a-b)/max(1,abs(b)) for a,b in zip(moments,exact))
    if error > 1e-8:
        raise ValueError('Marginal quadrature failed its population/first/second-moment gate')
    return {'x':x,'density':y,'number':number,'moments':exact,'quadratureRelativeScaledError':error}


def main():
    original = read('web-assets/research-recordings.json')
    packet = {'schemaVersion':'mass-spinner-distributions-v1','kind':'recorded-offline-data',
              'normalization':original['normalization'],
              'representation':'Exact one-dimensional marginals of archived positive Gaussian mixtures; not Maxwellians fitted to moments.',
              'units':{'velocity':'v/V0','density':'number per normalized velocity','entropy':'sum_s integral f_s log(f_s) d3(v/V0)'},
              'limitations':['Recorded arrays only; selecting a time runs no collision solver.',
                             'Marginal shape does not determine the full joint distribution.',
                             'These v17 representations remain unqualified; physical entropy decisions retain the archived uncertainty.',
                             'v16 isotropic and v17 general-3D gates concern different representations; passing v16 is not v17 qualification.'],
              'cases':[],'refinements':[]}
    for case in original['cases']:
        ident = case['id']
        directory = f'scientific/general3d-evolution-v17/main-results/{ident}'
        meta = read(directory+'/metadata.json')
        rows = read(directory+'/history.jsonl',True)
        review_path = f'scientific/general3d-review-v17/results/cases/{ident}.json'
        report = read(review_path)['report']
        if meta['schemaVersion'] != 'general3d-v17-1' or len(rows) != len(case['states']):
            raise ValueError('Archived distribution/moments membership differs')
        states = []
        for row,saved,audit in zip(rows,case['states'],report['states']):
            if row['step'] != saved['step'] or row['timeS'] != saved['timeS'] or row['step'] != audit['step'] or row['timeS'] != audit['timeS']:
                raise ValueError('Saved state identity differs')
            species = []
            for ident_s in (1,2):
                indexes = [i for i,s in enumerate(meta['species']) if s == ident_s]
                centers = [row['velocity'][i] for i in indexes]
                weights = [meta['weight'][i] for i in indexes]
                variance = meta['variance'][indexes[0]]
                if any(meta['variance'][i] != variance for i in indexes):
                    raise ValueError('Marginal assumes constant species kernel variance')
                species.append({'species':ident_s,'variance':variance,'axes':[marginal(centers,weights,variance,a) for a in range(3)]})
            entropy = audit['physicalEntropy']
            states.append({'step':row['step'],'timeS':row['timeS'],'species':species,
                           'physicalEntropy':{k:entropy[k] for k in ('H','sensitivityPerInitialNumber','quadratureGate')}})
        packet['cases'].append({'id':ident,'label':case['label'],'sourceDirectory':directory,'auditSource':review_path,
                                'gates':report['gates'],'states':states})
    for path in sorted((ROOT/'scientific/general3d-review-v17/results/comparisons').glob('*.json')):
        d = read(str(path))
        packet['refinements'].append({'study':'v17 general 3D','source':str(path),'comparison':d['comparison'],'records':d['records']})
    for name in ('cross.json','cross-extension.json'):
        path = f'scientific/evolution-review-v16/reviewed-results/{name}'
        d = read(path)
        packet['refinements'].append({'study':'v16 isotropic','source':path,'comparison':{'id':name},
                                      'records':d['crossIncrementRefinements']})
    packet['sourceSHA256'] = SOURCES
    packet['exporterSHA256'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    output = ROOT/'web-assets/research-depth/recorded-distributions.json'
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(packet,separators=(',',':'),allow_nan=False)+'\n')
    print(json.dumps({'output':str(output),'cases':len(packet['cases']),'savedStates':sum(len(c['states']) for c in packet['cases']),
                      'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}))


if __name__ == '__main__':
    main()
