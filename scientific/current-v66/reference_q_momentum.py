"""Actual FiPy manufactured q=r² momentum transient; parent executes in safe-dev.

This reference uses FiPy's TransientTerm/DiffusionTerm, not production code:
    rho*q*dOmega/dt = d/dq(4*mu*q²*dOmega/dq).
Omega=A+B*q+8*(mu/rho)*B*t is exact with its evolving outer wall and the
natural regular-axis zero torque. Both spatial and BE temporal truncation
vanish for this manufactured polynomial; it isolates the axis shear operator.
"""
import json
from pathlib import Path
import sys

import numpy as np
from fipy import CellVariable, FaceVariable, Grid1D, TransientTerm, DiffusionTerm, Variable, LinearLUSolver


def study(n, steps):
    rho, mu, radius, a, b, duration = 2., .3, 1., 3., -2., .1
    mesh = Grid1D(nx=n, dx=radius**2/n)
    q = np.asarray(mesh.cellCenters[0], dtype=float)
    q_faces = np.asarray(mesh.faceCenters[0], dtype=float)
    omega = CellVariable(mesh=mesh, value=a+b*q, hasOld=True)
    wall = Variable(value=a+b*radius**2)
    omega.constrain(wall, mesh.facesRight)
    capacity = CellVariable(mesh=mesh, value=rho*q)
    coefficient = FaceVariable(mesh=mesh, value=4*mu*q_faces*q_faces)
    equation = TransientTerm(coeff=capacity) == DiffusionTerm(coeff=coefficient)
    solver = LinearLUSolver(tolerance=1e-12, iterations=1000)
    rate, dt = 8*mu*b/rho, duration/steps
    maximum_error = 0.
    for step in range(1, steps+1):
        omega.updateOld()
        wall.setValue(a+b*radius**2+rate*step*dt)
        equation.solve(var=omega, dt=dt, solver=solver)
        maximum_error = max(maximum_error, float(np.max(np.abs(np.asarray(omega)-a-b*q-rate*step*dt))))
    if maximum_error > 2e-10:
        raise ValueError(f'FiPy polynomial transient failed n={n}, steps={steps}: {maximum_error}')
    return {'cells': n, 'steps': steps, 'qM2': q.tolist(), 'finalOmegaRadS': np.asarray(omega).tolist(),
            'expectedOmegaRadS': (a+b*q+rate*duration).tolist(), 'maximumAbsoluteErrorRadS': maximum_error,
            'passed': True}


if __name__ == '__main__':
    import fipy
    cases = [study(n, steps) for n in (4, 16, 64) for steps in (4, 16)]
    result = {'method': 'Executed FiPy finite-volume q-coordinate momentum equation', 'fipyVersion': fipy.__version__,
              'equation': 'rho*q*dOmega/dt = d/dq(4*mu*q^2*dOmega/dq)',
              'cases': cases, 'allPassed': True, 'experimentalValidation': False}
    with Path(sys.argv[1]).open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    print(json.dumps({'allPassed': True, 'cases': len(cases), 'maximumAbsoluteErrorRadS': max(c['maximumAbsoluteErrorRadS'] for c in cases)}))
