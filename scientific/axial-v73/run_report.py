"""Frozen torsional research controls; output must be a new file. Safe-dev only."""
import hashlib
import importlib.metadata
import json
import math
from pathlib import Path
import sys
import numpy as np
from torsion import Torsion

R, L, RHO, MU = .06, .14, .001, .0001


def run_case(identifier, kind, r, z, rho, mu, walls, torque, initial=0., steps=0, dt=None):
    model = Torsion(r, z, rho, mu, **walls)
    initial, torque = model.field(initial), model.field(torque)
    cumulative = {'shearHeatJ': 0., 'numericalLossJ': 0., 'bodyWorkJ': 0., 'wallWorkJ': 0.,
                  'maxAbsoluteEnergyResidualJ': 0., 'maxAbsoluteMomentumResidualKgM2S': 0.}
    omega = initial
    if steps:
        for _ in range(steps):
            result = model.step(omega, torque, dt)
            omega = result['omegaRadS']
            for name, value in [('shearHeatJ', dt*result['shearHeatW']), ('numericalLossJ', result['numericalLossJ']),
                                ('bodyWorkJ', dt*result['bodyPowerW']), ('wallWorkJ', dt*result['boundaryPowerW'])]:
                cumulative[name] += value
            cumulative['maxAbsoluteEnergyResidualJ'] = max(cumulative['maxAbsoluteEnergyResidualJ'], abs(result['energyResidualJ']))
            cumulative['maxAbsoluteMomentumResidualKgM2S'] = max(cumulative['maxAbsoluteMomentumResidualKgM2S'], abs(result['momentumResidualKgM2S']))
    else:
        result = model.steady(torque)
    return {'id': identifier, 'kind': kind,
            'input': {'radialEdgesM': list(r), 'axialEdgesM': list(z), 'densityKgM3': model.field(rho).tolist(),
                      'viscosityPaS': model.field(mu).tolist(), 'walls': walls},
            'initialOmegaRadS': initial.tolist(), 'torqueNm': torque.tolist(),
            'steps': steps, 'dtS': dt, 'result': result, 'cumulative': cumulative}


def cases():
    output = []
    for n in [8, 16, 32, 64]:
        r, z = np.linspace(0, R, n+1), np.linspace(0, L, n+1)
        k = math.pi/L
        radial = (8/R**2+k*k)*np.diff(r**4)/4-k*k/R**2*np.diff(r**6)/6
        axial = (np.cos(k*z[:-1])-np.cos(k*z[1:]))/k
        torque = (2*math.pi*MU*axial[:, None]*radial[None, :]).ravel()
        output.append(run_case(f'manufactured-{n}', 'manufactured-steady', r, z, RHO, MU,
                               {'outer': 0., 'lower': 0., 'upper': 0.}, torque))
    r, z = np.linspace(0, R, 5), np.linspace(0, L, 33)
    initial = np.repeat(np.cos(math.pi*(z[:-1]+z[1:])/2/L), 4)
    for steps in [8, 32, 128]:
        output.append(run_case(f'axial-decay-{steps}', 'axial-decay', r, z, RHO, MU,
                               {'outer': None, 'lower': None, 'upper': None}, 0., initial, steps, .02/steps))
    r, z = np.array([0., .001, .008, .025, R]), np.array([0., .005, .017, .04, .08, L])
    mu = np.repeat([.0001, .0002, .00005, .0001, .0003], 4)
    output.append(run_case('variable-axial-couette', 'axial-couette', r, z, RHO, mu,
                           {'outer': None, 'lower': 10., 'upper': 70.}, 0.))
    count = 4*5
    output.append(run_case('variable-rigid', 'rigid', r, z, np.linspace(.001, .003, count),
                           np.linspace(.00005, .0003, count),
                           {'outer': None, 'lower': None, 'upper': None}, 0., 37., 1, .001))
    output.append(run_case('variable-wall-work', 'wall-work', r, z, np.linspace(.001, .003, count),
                           np.linspace(.00005, .0003, count),
                           {'outer': 20., 'lower': 20., 'upper': 20.},
                           np.linspace(0., .00001, count), 0., 1, .0002))
    r, z = np.linspace(0, R, 65), np.linspace(0, L, 5)
    core = .0075
    radial = np.maximum(0, r[1:]**2-np.maximum(r[:-1], core)**2)
    torque = (2*math.pi*MU*np.diff(z)[:, None]*radial[None, :]).ravel()
    output.append(run_case('radial-core-annulus', 'radial-reduction', r, z, RHO, MU,
                           {'outer': 0., 'lower': None, 'upper': None}, torque))
    z = np.linspace(0, L, 33)
    torque = (2*math.pi*MU*np.diff(z)[:, None]*radial[None, :]).ravel()
    for name, end in [('free', None), ('stationary', 0.)]:
        output.append(run_case(f'endwall-{name}', 'endwall-sensitivity', r, z, RHO, MU,
                               {'outer': 0., 'lower': end, 'upper': end}, torque))
    return output


if __name__ == '__main__':
    here = Path(__file__).resolve().parent
    filenames = ['torsion.py', 'run_report.py', 'test_torsion.py', 'independent_check.py', 'PROTOCOL.md']
    result = {'schemaVersion': 1, 'matchedExperimentalValidation': False, 'liveChanged': False,
              'scope': 'Fixed-density constrained torsional diffusion; no meridional hydrodynamics or plasma closure',
              'versions': {name: importlib.metadata.version(name) for name in ['fipy', 'numpy', 'scipy']},
              'sourcesSHA256': {name: hashlib.sha256((here/name).read_bytes()).hexdigest() for name in filenames},
              'cases': cases()}
    with Path(sys.argv[1]).open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
        stream.write('\n')
    print('Wrote', len(result['cases']), 'unqualified research controls')
