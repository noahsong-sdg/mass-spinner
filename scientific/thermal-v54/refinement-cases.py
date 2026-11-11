"""Generate the failed thick-wall case and separate refinements. Safe-dev only."""
from pathlib import Path
import hashlib
import json
import math
import sys

CG = 1.5 * 10 * math.pi * .12**2 * .5 / 500
GAS_FILM = 1000.
ORIGINAL_DURATION = 5 / 512
FAST_DURATION = 5 * CG / GAS_FILM


def case(family, cells, steps, duration):
    return {
        'name': f'{family}-n{cells}-steps{steps}',
        'study': {'family': family, 'cells': cells, 'steps': steps,
                  'durationS': duration},
        'productionComparison': cells <= 128,
        'config': {'radiusM': .12, 'lengthM': .5, 'thicknessM': .012,
                   'cells': cells, 'gasCapacityJK': CG, 'gasWallWK': GAS_FILM,
                   'coolingWK': 1., 'coolantK': 500.},
        'initial': {'gasK': 500., 'wallK': [1000.] * cells},
        'steps': [{'dtS': duration / steps, 'gasEnergyJ': 0., 'linerEnergyJ': 0.}
                  for _ in range(steps)],
    }


cases = [case('original', 16, 5, ORIGINAL_DURATION)]
cases += [case('spatial', n, 160, ORIGINAL_DURATION) for n in (8, 16, 32, 64, 128, 256)]
cases += [case('temporal', 128, steps, ORIGINAL_DURATION)
          for steps in (5, 10, 20, 40, 80, 160, 320, 640)]
cases += [case('fast-gas', 128, steps, FAST_DURATION)
          for steps in (5, 10, 20, 40, 80, 160, 320)]
packet = {
    'description': 'Exact failed thick wall and independently varied mesh/time. No deposition.',
    'scope': 'Discrete radial solid / lumped gas model; no full slider-domain qualification.',
    'fastGasTimeS': CG / GAS_FILM,
    'originalDurationS': ORIGINAL_DURATION,
    'fastDurationS': FAST_DURATION,
    'crossCodeTemperatureToleranceK': 5e-6,
    'maximumProductionCells': 128,
    'spatialTailCriterion': 'Cell width <= sqrt(alpha(1000 K) * duration); same 0.85 contraction gate on that resolved tail. Full-grid failures remain failures.',
    'cases': cases,
    'generatorSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
}
target = Path(sys.argv[1])
target.write_text(json.dumps(packet, separators=(',', ':')) + '\n')
print(json.dumps({'cases': len(cases), 'steps': sum(len(c['steps']) for c in cases),
                  'gasCapacityJK': CG, 'fastGasTimeS': packet['fastGasTimeS'],
                  'originalDurationS': ORIGINAL_DURATION, 'fastDurationS': FAST_DURATION,
                  'path': str(target)}))
