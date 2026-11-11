"""Joint fast-thermal sampled-history refinement analysis; safe-dev only.

Gates were frozen before any campaign result. Full-history here means the
same 97 physical checkpoints across the transient, not a continuous-time
error bound. The old uniform mesh remains an explicit comparison control.
"""
from pathlib import Path
import hashlib
import json
import sys
import numpy as np


def compare(a, b, packet):
    x,y = a['samples'],b['samples']
    assert len(x) == len(y) == len(packet['checkpointsTau'])
    assert [s['timeS'] for s in x] == [s['timeS'] for s in y], 'Same physical times; no time interpolation'
    maximum = lambda key: max(abs(p[key]-q[key]) for p,q in zip(x,y,strict=True))
    contrast = a['initial']['wallK'][0]-a['initial']['gasK']
    power_scale = abs(a['config']['gasWallWK']*contrast)
    exchange_scale = abs(a['config']['gasCapacityJK']*contrast)
    return {'coarse': a['name'], 'fine': b['name'],
            'gasDifferenceK': maximum('gasK'),
            'surfaceDifferenceK': maximum('innerSurfaceK'),
            'outerSurfaceDifferenceK': maximum('outerSurfaceK'),
            'profileDifferenceK': max(float(np.max(np.abs(np.asarray(p['depthProfileK'])-q['depthProfileK']))) for p,q in zip(x,y,strict=True)),
            'powerDifferenceRelativeInitial': maximum('interfacePowerW')/power_scale,
            'exchangeDifferenceRelativeInitialGasContrastEnergy': maximum('cumulativeGasExchangeJ')/exchange_scale}


def contraction(rows, packet):
    metrics = ('gasDifferenceK','surfaceDifferenceK','outerSurfaceDifferenceK',
               'profileDifferenceK','powerDifferenceRelativeInitial',
               'exchangeDifferenceRelativeInitialGasContrastEnergy')
    ratios, failures = {}, []
    for key in metrics:
        floor = packet['gates']['temperatureSignalFloorK'] if key.endswith('K') else 1e-10
        values = [r[key] for r in rows]
        ratios[key] = [b/a if a else None for a,b in zip(values,values[1:])]
        for i,ratio in enumerate(ratios[key]):
            if min(values[i:i+2]) > floor and ratio >= packet['gates']['contraction']:
                failures.append({'metric': key, 'coarse': rows[i]['coarse'], 'ratio': ratio})
    return {'rows': rows, 'differenceRatios': ratios, 'failures': failures,
            'allPass': not failures, 'scope': 'Differences on common sampled physical times'}


def accuracy(row, gates):
    keys = ('gasDifferenceK','surfaceDifferenceK','outerSurfaceDifferenceK',
            'profileDifferenceK','powerDifferenceRelativeInitial',
            'exchangeDifferenceRelativeInitialGasContrastEnergy')
    derived = {'outerSurfaceDifferenceK','profileDifferenceK'}
    threshold = lambda key: gates['surfaceDifferenceK'] if key in derived else gates[key]
    return {key: {'value': row[key], 'gate': threshold(key),
                  'pass': row[key] <= threshold(key),
                  **({'criterion': 'Same surface-temperature threshold for reconstructed profile and outer surface'} if key in derived else {})}
            for key in keys}


source,directory,target = map(Path,sys.argv[1:4])
packet = json.loads(source.read_text())
records = {}
for case in packet['cases']:
    if case['study']['family'] in ('audit-graded','constant'):
        continue
    path = directory/(case['name']+'.json')
    record = json.loads(path.read_text())
    assert record['allPass'] and record['physicalChecks']['allPass']
    assert record['inputSHA256'] == hashlib.sha256(source.read_bytes()).hexdigest()
    records[case['name']] = record

spatial,temporal = {},{}
for steps in (2560,5120,10240):
    names = [f'joint-n{n}-steps{steps}' for n in (32,64,128)]
    if steps == 10240:
        names += ['spatial-holdout-n256-steps10240']
    spatial[str(steps)] = contraction([compare(records[a],records[b],packet) for a,b in zip(names,names[1:])],packet)
for n in (32,64,128):
    names = [f'joint-n{n}-steps{steps}' for steps in (2560,5120,10240)]
    temporal[str(n)] = contraction([compare(records[a],records[b],packet) for a,b in zip(names,names[1:])],packet)
diagonal = [f'joint-n{n}-steps{m}' for n,m in ((32,2560),(64,5120),(128,10240))]
joint = contraction([compare(records[a],records[b],packet) for a,b in zip(diagonal,diagonal[1:])],packet)
finest_time = temporal['128']['rows'][-1]
finest_space = spatial['10240']['rows'][-1]
gates = {'temporalAccuracy': accuracy(finest_time,packet['gates']),
         'spatialAccuracy': accuracy(finest_space,packet['gates']),
         'jointAccuracy': accuracy(joint['rows'][-1],packet['gates'])}
control = compare(records['uniform-control-n128-steps10240'],records['joint-n128-steps10240'],packet)
control_gate = accuracy(control,packet['gates'])
passed = (all(s['allPass'] for s in [*spatial.values(),*temporal.values(),joint])
          and all(row['pass'] for study in gates.values() for row in study.values()))
summary = {'allPass': passed, 'cases': len(records), 'commonCheckpoints': len(packet['checkpointsTau']),
           'spatial': spatial, 'temporal': temporal, 'joint': joint,
           'finestPairGates': gates,
           'uniformNegativeControl': {'comparison': control, 'gates': control_gate,
               'meetsRefinedAccuracyGates': all(row['pass'] for row in control_gate.values()),
               'scope': 'Different discretizations; control differences are evidence, not absolute continuum error.'},
           'inputSHA256': hashlib.sha256(source.read_bytes()).hexdigest(),
           'scriptSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
           'runJSONSHA256': {name: hashlib.sha256((directory/(name+'.json')).read_bytes()).hexdigest() for name in records},
           'scope': 'Joint nonlinear radial/lumped-gas refinement. Gas/surface/flux/heat gates use common sampled histories; continuum accuracy and physical closure need independent checks.'}
target.write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
raise SystemExit(0 if passed else 1)
