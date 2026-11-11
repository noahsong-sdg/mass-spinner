"""Constrained 2D current/torsion/thermal endpoint; frozen Ar density and sigma.

No meridional flow, species migration, electron energy or ionization solve.
All Joule heat immediately enters one heavy-gas temperature (assumed closure).
"""
from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path
import numpy as np
from fipy import CellVariable, FaceVariable, TransientTerm, DiffusionTerm
from scipy.sparse.linalg import LinearOperator, gmres

_spec = spec_from_file_location('axial_v73_torsion', Path(__file__).resolve().parents[1]/'axial-v73/torsion.py')
_torsion = module_from_spec(_spec)
_spec.loader.exec_module(_torsion)
Torsion = _torsion.Torsion


class _TorsionWorkspace(Torsion):
    """Fixed geometry with dependency-tracked, endpoint viscosity coefficients."""
    def __init__(self, r, z, rho, walls):
        super().__init__(r, z, rho, 1., **walls)
        self.viscosity = CellVariable(mesh=self.mesh, value=1.)
        self.coefficient = FaceVariable(mesh=self.mesh, value=self.coefficient.value.copy())*self.viscosity.harmonicFaceValue
        diffusion = DiffusionTerm(coeff=self.coefficient)
        self.transient = TransientTerm(coeff=self.capacity) == diffusion+self.source
        self.stationary = diffusion+self.source == 0

    def set_viscosity(self, viscosity):
        values = self.field(viscosity)
        if np.any(values <= 0):
            raise ValueError('Viscosity must be positive')
        self.viscosity.setValue(values)
        if not np.all(np.isfinite(self.coefficient.value)):
            raise ValueError('Unrepresentable torsional diffusion coefficient')


def local_shear(model, viscosity):
    """Allocate actual FiPy face dissipation by its two fluid resistances."""
    ids = np.ma.filled(model.mesh.faceCellIDs, -1).astype(int)
    centers, faces = model.mesh.cellCenters.value, model.mesh.faceCenters.value
    normals = model.mesh.faceNormals
    gradient = np.sum(model.omega.faceGrad.value*normals, axis=0)
    heat = model.coefficient.value*model.area*model.distance*gradient**2
    result = np.zeros(model.count)
    mu = model.field(viscosity)
    for f, power in enumerate(heat):
        cells = ids[:, f][ids[:, f] >= 0]
        resistance = [abs(float((faces[:, f]-centers[:, i])@normals[:, f]))/mu[i]
                      for i in cells]
        fractions = np.array(resistance)/sum(resistance)
        result[cells] += power*fractions
    if not np.all(np.isfinite(result)) or np.any(result < 0):
        raise ArithmeticError('Nonphysical local shear heat')
    if abs(result.sum()-heat.sum()) > 32*np.finfo(float).eps*heat.sum():
        raise ArithmeticError('Shear heat partition lost energy')
    return result


def mechanical(bridge, r, z, rho, mu, old, dt, walls, rtol=2e-11):
    """Solve the affine electrical/mechanical Schur complement with SciPy GMRES."""
    model = Torsion(r, z, rho, mu, **walls)
    return _mechanical(model, bridge, mu, old, dt, rtol)


def _mechanical(model, bridge, mu, old, dt, rtol):
    count = model.count
    old = model.field(old)
    evaluations = 0

    def endpoint(omega):
        nonlocal evaluations
        evaluations += 1
        electrical = bridge.current(omega)
        state = model.step(old, electrical['torqueNm'], dt)
        return np.asarray(state['omegaRadS']), state, electrical

    baseline = endpoint(np.zeros(count))[0]
    operator = LinearOperator((count, count), matvec=lambda w: w-(endpoint(w)[0]-baseline), dtype=float)
    omega, info = gmres(operator, baseline, x0=old, rtol=rtol, atol=0,
                        restart=min(count, 40), maxiter=40)
    if info:
        raise ArithmeticError(f'Coupled mechanical GMRES did not converge: {info}')
    accepted, state, current = endpoint(omega)
    mismatch = float(np.max(abs(accepted-omega)))
    if mismatch > 5e-10*max(1., float(np.max(abs(accepted)))):
        raise ArithmeticError('Current and angular speed endpoints disagree')
    work_defect = dt*float(np.asarray(current['torqueNm'])@(accepted-omega))
    work_scale = dt*(abs(current['mechanicalW'])+current['jouleW']+state['shearHeatW'])
    if not np.isfinite(work_defect) or abs(work_defect) > 1e-9*work_scale+64*np.finfo(float).eps*state['kineticJ']:
        raise ArithmeticError('Electrical/mechanical endpoint work defect')
    state.update(current=current, currentOmegaRadS=omega.tolist(),
                 endpointMismatchRadS=mismatch, endpointWorkDefectJ=work_defect, evaluations=evaluations,
                 shearByCellW=local_shear(model, mu).tolist())
    return state


def _step(thermal, old_temperature, old_omega, dt, mechanical_endpoint, rtol):
    old_omega = thermal.field(old_omega, thermal.ng)
    def source(temperature, props):
        state = mechanical_endpoint(props['mu'], old_omega, dt, rtol)
        current = state['current']
        return np.asarray(current['jouleByCellW'])+state['shearByCellW'], state

    result = thermal.advance(old_temperature, dt, source)
    state = result['payload']
    old = old_omega
    r = thermal.r[:thermal.ngr+1]
    inertia = (np.pi/2*thermal.rho.reshape(len(thermal.z)-1, thermal.ngr)
               *np.diff(thermal.z)[:, None]*np.diff(r**4)[None, :]).ravel()
    delta_k = .5*float(inertia@((np.asarray(state['omegaRadS'])-old)
                              *(np.asarray(state['omegaRadS'])+old)))
    props = thermal.properties(result['temperatureK'])
    oldprops = thermal.properties(old_temperature)
    delta_u = float(np.sum(thermal.energy(result['temperatureK'], props)
                          -thermal.energy(old_temperature, oldprops)))
    supplied = dt*(state['current']['electrodePowerW']+state['boundaryPowerW'])
    residual = delta_k+delta_u+dt*result['bathOutW']+state['numericalLossJ']-supplied
    exchange = abs(delta_k)+abs(delta_u)+dt*abs(result['bathOutW'])+state['numericalLossJ']+abs(supplied)
    storage = float(np.sum(abs(thermal.energy(old_temperature, oldprops))))+float(.5*inertia@(old*old))
    if not np.isfinite(residual) or abs(residual) > 1e-8*exchange+64*np.finfo(float).eps*storage:
        raise ArithmeticError('Coupled total energy ledger failed')
    return {**result, 'mechanical': state, 'totalEnergyResidualJ': residual,
            'energyExchangeScaleJ': exchange, 'deltaKineticJ': delta_k, 'deltaThermalJ': delta_u}


class Stepper:
    """One fixed-grid trajectory workspace; only viscosity and endpoint state vary."""
    def __init__(self, thermal, bridge, walls):
        self.thermal, self.bridge = thermal, bridge
        self.model = _TorsionWorkspace(thermal.r[:thermal.ngr+1], thermal.z, thermal.rho, dict(walls))

    def mechanical(self, mu, old, dt, rtol=2e-11):
        self.model.set_viscosity(mu)
        return _mechanical(self.model, self.bridge, mu, old, dt, rtol)

    def step(self, old_temperature, old_omega, dt, rtol=2e-11):
        return _step(self.thermal, old_temperature, old_omega, dt, self.mechanical, rtol)


def step(thermal, bridge, old_temperature, old_omega, dt, walls, rtol=2e-11):
    return Stepper(thermal, bridge, walls).step(old_temperature, old_omega, dt, rtol)
