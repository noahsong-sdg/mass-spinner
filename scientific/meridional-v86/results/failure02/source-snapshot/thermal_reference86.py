"""Frozen actual-FiPy and hybrid FE/FV adiabatic eigenmode control.

No experimental inputs/velocities are loaded. Run only in safe-dev. Spatial
error uses the continuum backward-Euler mode, separating it from time error.
"""
import hashlib
import importlib.metadata
import json
from pathlib import Path
import sys
import numpy as np
from scipy.special import j0, j1, jn_zeros

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent/'mixture-axial-v75'))
from flow import Flow
from diffusion86 import Diffusion, KB, M_AR, argon_conductivity

GRIDS = (16, 32, 64)
STEPS = 24
TIME_STEPS = 12
RADIUS = .06
HEIGHT = .14
RHO = 2e-4
MU = 1.14e-4
BASE = 2900.
AMPLITUDE = 100.
DECAY_EXPONENT = .1
GATES = dict(spatialAmplitude=.01, timeChangeAmplitude=.001,
             crossCodeAmplitude=.01, energyRelative=1e-10, contraction=.8)


def mode_averages(r, z):
    """Exact cylindrical FV means; J1(root)=0 gives outer radial Neumann BC."""
    root = float(jn_zeros(1, 1)[0])
    wave_r, wave_z = root/RADIUS, np.pi/HEIGHT
    radial = 2*np.diff(r*j1(wave_r*r))/(wave_r*np.diff(r*r))
    axial = np.diff(np.sin(wave_z*z))/(wave_z*np.diff(z))
    return axial[:, None]*radial[None, :]


def parameters(steps):
    if isinstance(steps, bool) or not isinstance(steps, int) or steps <= 0:
        raise ValueError('Positive integer thermal steps required')
    k = argon_conductivity(MU)
    alpha = k/(RHO*1.5*KB/M_AR)
    eigenvalue = (float(jn_zeros(1, 1)[0])/RADIUS)**2+(np.pi/HEIGHT)**2
    duration = DECAY_EXPONENT/(alpha*eigenvalue)
    return k, alpha, eigenvalue, duration, duration/steps


def metrics(values, initial, mode, volume, steps):
    _, alpha, eigenvalue, duration, dt = parameters(steps)
    be_decay = (1+alpha*eigenvalue*dt)**(-steps)
    analytic_be = BASE+AMPLITUDE*be_decay*mode
    analytic = BASE+AMPLITUDE*np.exp(-alpha*eigenvalue*duration)*mode
    return dict(spatialMaxOverAmplitude=float(np.max(abs(values-analytic_be))/AMPLITUDE),
        finiteTimeMaxOverAmplitude=float(np.max(abs(values-analytic))/AMPLITUDE),
        spatialRmsOverAmplitude=float(np.sqrt(np.sum((values-analytic_be)**2*volume)/np.sum(volume))/AMPLITUDE),
        energyRelative=float(abs(np.sum((values-initial)*volume))/np.sum(initial*volume)),
        minimumTemperatureK=float(np.min(values)), temperatureK=values.tolist())


def solve(n, steps=STEPS):
    if isinstance(n, bool) or not isinstance(n, int) or n < 4:
        raise ValueError('At least four radial/axial cells required')
    from fipy import CellVariable, CylindricalGrid2D, DiffusionTerm, TransientTerm
    from fipy.solvers.scipy import LinearLUSolver
    r, z = np.linspace(0, RADIUS, n+1), np.linspace(0, HEIGHT, n+1)
    f = Flow(r, z, [M_AR, M_AR]); mode = mode_averages(r, z)
    initial = BASE+AMPLITUDE*mode
    k, _, _, duration, dt = parameters(steps)
    q = f.state(RHO, initial, .5, 0.)
    diffusion = Diffusion(f, MU, k)
    for _ in range(steps):
        q, _ = diffusion.advance(q, dt)
    hybrid = f.primitive(q)['temperatureK']

    mesh = CylindricalGrid2D(dr=np.diff(r), dz=np.diff(z))
    temperature = CellVariable(mesh=mesh, value=initial.ravel(), hasOld=True)
    equation = TransientTerm(coeff=RHO*1.5*KB/M_AR) == DiffusionTerm(coeff=k)
    solver = LinearLUSolver(tolerance=1e-12, iterations=2000)
    # Natural zero flux at every boundary; no fixed-temperature reservoir.
    for _ in range(steps):
        temperature.updateOld()
        equation.solve(var=temperature, dt=dt, solver=solver)
    reference = np.asarray(temperature.value).reshape(n, n)
    if not np.isfinite(reference).all() or np.any(reference <= 0):
        raise ArithmeticError('Invalid FiPy thermal reference state')
    return dict(cellsPerCoordinate=n, steps=steps, durationS=duration, dtS=dt,
        hybrid=metrics(hybrid, initial, mode, f.volume, steps),
        fipy=metrics(reference, initial, mode, f.volume, steps),
        crossCodeMaxOverAmplitude=float(np.max(abs(hybrid-reference))/AMPLITUDE))


def assessment(rows, time_row):
    if [r['cellsPerCoordinate'] for r in rows] != list(GRIDS) or any(r['steps'] != STEPS for r in rows):
        raise ValueError('Changed frozen thermal refinement inventory')
    if time_row['cellsPerCoordinate'] != GRIDS[-1] or time_row['steps'] != TIME_STEPS:
        raise ValueError('Changed frozen time witness')
    fine = rows[-1]
    gates = {}
    for code in ('hybrid', 'fipy'):
        gates[code+'Spatial'] = fine[code]['spatialMaxOverAmplitude'] < GATES['spatialAmplitude']
        gates[code+'Contraction'] = all(b[code]['spatialMaxOverAmplitude'] < GATES['contraction']*a[code]['spatialMaxOverAmplitude']
                                       for a, b in zip(rows, rows[1:]))
        change = float(np.max(abs(np.asarray(fine[code]['temperatureK'])
                                  -np.asarray(time_row[code]['temperatureK'])))/AMPLITUDE)
        gates[code+'Time'] = change < GATES['timeChangeAmplitude']
        fine[code]['time12To24ChangeOverAmplitude'] = change
        gates[code+'Energy'] = all(r[code]['energyRelative'] < GATES['energyRelative'] for r in rows+[time_row])
    gates['crossCode'] = fine['crossCodeMaxOverAmplitude'] < GATES['crossCodeAmplitude']
    return {k:bool(v) for k,v in gates.items()}


def main():
    files = [Path(__file__), HERE/'diffusion86.py', HERE.parent/'mixture-axial-v75/flow.py']
    seal = {str(p.relative_to(HERE.parent.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    rows = []
    for n in GRIDS:
        rows.append(solve(n)); print('THERMAL', n, rows[-1]['crossCodeMaxOverAmplitude'], flush=True)
    time_row = solve(GRIDS[-1], TIME_STEPS)
    gates = assessment(rows, time_row)
    if seal != {str(p.relative_to(HERE.parent.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}:
        raise ValueError('Thermal reference source changed during execution')
    report = dict(method='Actual FiPy vs hybrid scikit-fem/FV vs exact adiabatic cylindrical eigenmode',
        sourceSHA256=seal, versions={p:importlib.metadata.version(p) for p in ('fipy','scikit-fem','scipy','numpy')},
        frozenGates=GATES, gridRows=rows, timestepRow=time_row, gates=gates,
        allPass=all(gates.values()), experimentalQualification=False)
    destination = Path(sys.argv[1])
    destination.write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
    if not report['allPass']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
