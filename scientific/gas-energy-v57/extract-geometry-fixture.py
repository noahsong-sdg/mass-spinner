"""Freeze one actual fine-shell audit failure; execute only inside safe-dev."""
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys

import numpy as np

payload = Path(sys.argv[1]).read_bytes()
packet = json.loads(gzip.decompress(payload))
best_ratio, fixture = 0., None
kb, eps = 1.380649e-23, np.finfo(float).eps
for case in packet['cases']:
    if case['config']['gasCells'] != 512:
        continue
    length = case['config']['lengthM']
    number = np.asarray(case['particleNumbers'])
    for index, (before, after) in enumerate(zip(case['states'], case['states'][1:]), 1):
        old, new = np.asarray(before['gasK']), np.asarray(after['gasK'])
        oe, ne = np.asarray(before['gasEdgesM']), np.asarray(after['gasEdgesM'])
        ov = math.pi*length*np.diff(oe)*(oe[:-1]+oe[1:])
        nv = math.pi*length*np.diff(ne)*(ne[:-1]+ne[1:])
        op, np_ = before['pressurePa'], after['pressurePa']
        storage = 1.5*number*kb*(abs(new)+abs(old))+np_*(abs(nv)+abs(ov))
        error = 2.5*number*kb*(new-old)-ov*(np_-op)
        error -= 1.5*number*kb*(new-old)+np_*(nv-ov)
        ratios = abs(error)/(128*eps*storage)
        cell = int(np.argmax(ratios))
        if ratios[cell] <= best_ratio:
            continue
        best_ratio = float(ratios[cell])
        fixture = {'case': case['name'], 'gasCells': 512, 'stateIndex': index,
                   'shellIndex': cell, 'timeS': after['timeS'], 'lengthM': length,
                   'number': float(number[cell]), 'oldK': float(old[cell]), 'newK': float(new[cell]),
                   'oldPressurePa': op, 'newPressurePa': np_,
                   'oldEdgesM': oe[cell:cell+2].tolist(), 'newEdgesM': ne[cell:cell+2].tolist(),
                   'legacyBudgetRatio': best_ratio,
                   'resultsSHA256': hashlib.sha256(payload).hexdigest()}
assert fixture is not None and best_ratio > 1., ('No actual legacy-budget failure found', best_ratio)
output = Path(sys.argv[2])
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(fixture, indent=2, allow_nan=False)+'\n')
print(json.dumps(fixture, indent=2, allow_nan=False))
