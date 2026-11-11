"""Frozen prescribed-conductivity current fixtures; execute only in safe-dev."""
import json
import math
from pathlib import Path
import sys

cases = []
for kind in ('coaxial', 'motional', 'patch', 'axis-patch'):
    for nr in (12, 24, 48, 96):
        nz = nr//2; inner = 0 if kind == 'axis-patch' else 1
        radial = [inner+(2-inner)*i/nr for i in range(nr+1)]
        axial = [j/nz for j in range(nz+1)]
        r = [(a+b)/2 for a, b in zip(radial, radial[1:])]
        z = [(a+b)/2 for a, b in zip(axial, axial[1:])]
        patch = kind.endswith('patch')
        case = {'id': f'{kind}-n{nr}', 'kind': kind, 'radialEdgesM': radial, 'axialEdgesM': axial,
                'sigmaPerpSM': [1+.4*rr*rr*math.sin(math.pi*zz)**2 if patch else 2. for zz in z for rr in r],
                'sigmaParallelSM': [10.+rr if patch else 7. for zz in z for rr in r],
                'omegaRadS': [2+math.sin(math.pi*zz)*rr if patch else 2. if kind == 'motional' else 0. for zz in z for rr in r],
                'magneticT': .3,
                'innerVoltageV': [None if patch else 1.]*nz,
                'outerVoltageV': [1. if patch else 0.]*nz,
                'lowerVoltageV': [None]*nr,
                'upperVoltageV': [0. if patch and i < nr//3 else None for i in range(nr)]}
        cases.append(case)
with Path(sys.argv[1]).open('x') as stream:
    json.dump({'cases': cases}, stream, indent=2, allow_nan=False)
