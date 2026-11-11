"""Independent, actual-FiPy frozen-density angular-momentum reference.

Run inside safe-dev: python reference_fipy.py CASES_JSON OUTPUT_JSON
Input: {"cases": [spec, ...]}; all quantities are SI. Each spec supplies id,
edgesM, lengthM, densityKgM3, viscosityPaS, innerWallRadS, outerWallRadS,
torqueNm, initialOmegaRadS, dtS and steps. Null wall speeds mean zero stress.

With cylindrical measure r dr, solve
    rho*r^2*dOmega/dt = (1/r)*d(mu*r^3*dOmega/dr)/dr + r*f_theta.
Cell capacity uses the exact cell-average r^2; face viscosity uses FiPy's
standard harmonic interpolation. This is intentionally independent of the
browser kernel's integrated half-cell resistance, not an identical matrix.
Density, viscosity and sources are held fixed. No radial mass advection,
ion-neutral closure, sheath model or experimental validation is implied.
"""

import argparse
import hashlib
import importlib.metadata
import json
import math
from pathlib import Path

import numpy as np
from fipy import CellVariable, CylindricalGrid1D, DiffusionTerm, TransientTerm
from fipy.solvers.scipy import LinearLUSolver


def solve_case(spec):
    edges = np.asarray(spec['edgesM'], dtype=float)
    if edges.ndim != 1 or len(edges) < 2 or not np.all(np.isfinite(edges)):
        raise ValueError('edgesM must be finite cell edges')
    if edges[0] < 0 or np.any(np.diff(edges) <= 0):
        raise ValueError('radii must be nonnegative and strictly increasing')
    count = len(edges) - 1

    def field(name, positive=False):
        values = np.asarray(spec[name], dtype=float)
        if values.shape != (count,) or not np.all(np.isfinite(values)):
            raise ValueError(f'{name} must contain one finite value per cell')
        if positive and np.any(values <= 0):
            raise ValueError(f'{name} must be positive')
        return values

    density = field('densityKgM3', positive=True)
    viscosity = field('viscosityPaS', positive=True)
    torque = field('torqueNm')
    initial = field('initialOmegaRadS')
    length, dt = float(spec['lengthM']), float(spec['dtS'])
    steps = spec['steps']
    if not math.isfinite(length) or length <= 0 or not math.isfinite(dt) or dt <= 0:
        raise ValueError('lengthM and dtS must be finite and positive')
    if not isinstance(steps, int) or isinstance(steps, bool) or steps < 0:
        raise ValueError('steps must be a nonnegative integer')
    mesh = CylindricalGrid1D(dx=np.diff(edges), origin=(float(edges[0]),))
    omega = CellVariable(mesh=mesh, value=initial, hasOld=True, name='Omega')
    mu = CellVariable(mesh=mesh, value=viscosity)
    capacity = CellVariable(mesh=mesh, value=density * (edges[:-1]**2 + edges[1:]**2) / 2)
    # FiPy cylindrical cellVolumes are integral r dr, without the 2*pi*length.
    source = CellVariable(mesh=mesh, value=torque / (2 * math.pi * length * mesh.cellVolumes))
    for key, faces in [('innerWallRadS', mesh.facesLeft), ('outerWallRadS', mesh.facesRight)]:
        speed = spec[key]
        if speed is not None:
            if not math.isfinite(speed):
                raise ValueError(f'{key} must be finite or null')
            if key == 'innerWallRadS' and edges[0] == 0:
                raise ValueError('the symmetry axis is not a solid inner wall')
            omega.constrain(float(speed), where=faces)
    coefficient = mu.harmonicFaceValue * mesh.faceCenters[0]**2
    equation = TransientTerm(coeff=capacity) == DiffusionTerm(coeff=coefficient) + source
    solver = LinearLUSolver(tolerance=1e-12, iterations=1000)
    states = [{'timeS': 0.0, 'omegaRadS': initial.tolist()}]
    for step in range(steps):
        omega.updateOld()
        equation.solve(var=omega, dt=dt, solver=solver)
        values = np.asarray(omega.value, dtype=float)
        if not np.all(np.isfinite(values)):
            raise ArithmeticError(f'nonfinite FiPy state in {spec["id"]} at step {step + 1}')
        states.append({'timeS': (step + 1) * dt, 'omegaRadS': values.tolist()})
    return {'id': spec['id'], 'states': states}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('cases', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    raw_input = args.cases.read_bytes()
    payload = json.loads(raw_input)
    result = {
        'method': 'FiPy CylindricalGrid1D backward Euler; harmonic mu; physical face r^2',
        'sourceSHA256': hashlib.sha256(raw_input).hexdigest(),
        'versions': {package: importlib.metadata.version(package) for package in ('fipy', 'numpy', 'scipy')},
        'cases': [solve_case(spec) for spec in payload['cases']],
    }
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n')


if __name__ == '__main__':
    main()
