"""Prospective joint fast-thermal campaign; execute only in offline safe-dev."""
from pathlib import Path
import hashlib
import json
import math
import sys

RADIUS, LENGTH, THICKNESS = .12, .5, .012
CG = 1.5*10*math.pi*RADIUS**2*LENGTH/500
TAU = CG/1000
DURATION = 5*TAU
BETA = 9.
DEPTHS = [v*1e-6 for v in (0, .25, .5, 1, 2, 4, 8, 16, 32)]
# All levels land exactly on these physical times, without time interpolation.
CHECKPOINTS = sorted({0., *[i/64 for i in range(1, 65)], *[i/8 for i in range(9, 41)]})


def edges(n):
    def depth(u):
        return (.5*THICKNESS*math.expm1(2*BETA*u)/math.expm1(BETA)
                if u <= .5 else THICKNESS-depth(1-u))
    return [RADIUS+depth(i/n) for i in range(n+1)]


def case(n, steps, family='joint', uniform=False, constant=False):
    name = f'{family}-n{n}-steps{steps}'
    config = {'radiusM': RADIUS, 'lengthM': LENGTH, 'thicknessM': THICKNESS,
              'cells': n, 'gasCapacityJK': CG, 'gasWallWK': 1000.,
              'coolingWK': 1., 'coolantK': 500.}
    if not uniform:
        config['radiusEdgesM'] = edges(n)
    if constant:
        config['coolingWK'] = 0.  # insulated distant boundary for half-space comparison
        config['material'] = {'kind': 'constant', 'densityKgM3': 19250.,
            'cpJKgK': (23.95930+2.639680+1.257750-.254642-.048407)/.18384,
            'kWMK': 149.441-.045466*1000+13.193e-6*1000**2-1.484e-9*1000**3+3.866e6/1000**2}
    duration = 5*DURATION/10240 if family == 'audit-graded' else DURATION
    return {'name': name, 'config': config,
            'initial': {'gasK': 500., 'wallK': [1000.]*n},
            'steps': [{'dtS': duration/steps, 'gasEnergyJ': 0., 'linerEnergyJ': 0.}
                      for _ in range(steps)],
            'study': {'family': family, 'cells': n, 'steps': steps,
                      'durationS': duration, 'dtS': duration/steps,
                      'productionComparison': n <= 128 and not constant,
                      'uniformNegativeControl': uniform,
                      'constantPropertyBenchmark': constant}}


def packet():
    cases = [case(n, steps) for n in (32, 64, 128) for steps in (2560, 5120, 10240)]
    cases += [case(128, 10240, 'uniform-control', uniform=True),
              case(256, 10240, 'spatial-holdout'), case(128, 5, 'audit-graded')]
    cases += [case(n, 10240, 'constant', constant=True) for n in (128, 256)]
    return {'cases': cases, 'gasFilmTimeS': TAU, 'durationS': DURATION,
            'checkpointsTau': CHECKPOINTS, 'profileDepthsM': DEPTHS,
            'mesh': {'mapping': 'symmetric exponential', 'beta': BETA,
                     'fullThicknessM': THICKNESS},
            'gates': {'gasDifferenceK': .05, 'surfaceDifferenceK': .001,
                      'powerDifferenceRelativeInitial': 1e-4,
                      'exchangeDifferenceRelativeInitialGasContrastEnergy': 1e-4,
                      'contraction': .85, 'temperatureSignalFloorK': 1e-8},
            'scope': 'Passive radial solid/lumped gas closure. Sampled-history differences are numerical evidence, not continuous-time error bounds or hardware calibration.',
            'generatorSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}


if __name__ == '__main__':
    output = Path(sys.argv[1])
    output.write_text(json.dumps(packet(), separators=(',', ':'))+'\n')
    print(json.dumps({'path': str(output), 'cases': len(packet()['cases']),
                      'checkpoints': len(CHECKPOINTS), 'tauS': TAU}))
