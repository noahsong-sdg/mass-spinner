"""FiPy constrained r,z torsional diffusion, fixed density, no meridional flow.

Not a complete Navier-Stokes equilibrium, plasma closure or live model. All
project execution belongs in safe-dev. Cell order is axial_index*nr+radial_index.
"""
import math
import numpy as np
from fipy import CellVariable, FaceVariable, CylindricalGrid2D, TransientTerm, DiffusionTerm
from fipy.solvers.scipy import LinearLUSolver


class Torsion:
    def __init__(self, radial_edges, axial_edges, density, viscosity,
                 outer=0., lower=None, upper=None):
        r, z = np.array(radial_edges, dtype=float), np.array(axial_edges, dtype=float)
        if any(e.ndim != 1 or len(e) < 3 or not np.all(np.isfinite(e))
               or np.any(np.diff(e) <= 0) for e in (r, z)) or r[0] != 0:
            raise ValueError('Need an ordered full-cylinder grid with at least two cells per coordinate')
        self.nr, self.nz = len(r)-1, len(z)-1
        self.count = self.nr*self.nz
        self.r, self.z = r, z
        mesh = CylindricalGrid2D(dx=np.diff(r), dy=np.diff(z), nx=self.nr, ny=self.nz,
                                 origin=((0.,), (z[0],)))
        self.mesh = mesh
        self.omega = CellVariable(mesh=mesh, value=0., hasOld=True)
        self.wall_speeds = {'outer': outer, 'lower': lower, 'upper': upper}
        self.wall_masks = {'outer': mesh.facesRight.value, 'lower': mesh.facesBottom.value,
                           'upper': mesh.facesTop.value}
        for name, value in self.wall_speeds.items():
            if value is not None:
                if isinstance(value, bool) or not math.isfinite(value):
                    raise ValueError('Wall speed must be finite or stress-free None')
                self.omega.constrain(value, where=self.wall_masks[name])
        rho, mu = self.field(density), self.field(viscosity)
        if np.any(rho <= 0) or np.any(mu <= 0):
            raise ValueError('Density and viscosity must be positive')
        mean_r2 = np.tile((r[:-1]**2+r[1:]**2)/2, self.nz)
        self.capacity = CellVariable(mesh=mesh, value=rho*mean_r2)
        self.inertia = 2*np.pi*mesh.cellVolumes*rho*mean_r2
        fc, normal = mesh.faceCenters.value, mesh.faceNormals
        radial = np.abs(normal[0]) > .5
        ri = np.argmin(abs(fc[0, :, None]-(r[:-1]+r[1:])[None, :]/2), axis=1)
        zi = np.argmin(abs(fc[1, :, None]-(z[:-1]+z[1:])[None, :]/2), axis=1)
        re = np.argmin(abs(fc[0, :, None]-r[None, :]), axis=1)
        ze = np.argmin(abs(fc[1, :, None]-z[None, :]), axis=1)
        face_r2 = np.where(radial, fc[0]**2, (r[ri]**2+r[ri+1]**2)/2)
        self.coefficient = CellVariable(mesh=mesh, value=mu).harmonicFaceValue*FaceVariable(mesh=mesh, value=face_r2)
        self.area = np.where(radial, 2*np.pi*fc[0]*np.diff(z)[zi],
                             np.pi*(r[ri+1]**2-r[ri]**2))
        rc, zc = (r[:-1]+r[1:])/2, (z[:-1]+z[1:])/2
        dr = np.r_[rc[0]-r[0], np.diff(rc), r[-1]-rc[-1]]
        dz = np.r_[zc[0]-z[0], np.diff(zc), z[-1]-zc[-1]]
        self.distance = np.where(radial, dr[re], dz[ze])
        if any(not np.all(np.isfinite(v)) for v in (self.capacity.value, self.inertia,
               self.coefficient.value, self.area, self.distance)) or np.any(self.inertia <= 0):
            raise ValueError('Geometry and properties exceed representable inertia or conductance')
        self.source = CellVariable(mesh=mesh, value=0.)
        diffusion = DiffusionTerm(coeff=self.coefficient)
        self.transient = TransientTerm(coeff=self.capacity) == diffusion+self.source
        self.stationary = diffusion+self.source == 0
        self.solver = LinearLUSolver(tolerance=1e-12, iterations=1000)

    def field(self, value):
        raw = np.asarray(value)
        if raw.dtype.kind == 'b':
            raise ValueError('Boolean fields are not physical inputs')
        result = np.broadcast_to(np.asarray(value, dtype=float), (self.count,)).copy()
        if not np.all(np.isfinite(result)):
            raise ValueError('Need one finite field value per cell, or a scalar')
        return result

    def state(self):
        w = self.omega.value
        if not np.all(np.isfinite(w)):
            raise ArithmeticError('Nonfinite torsional state')
        with np.errstate(over='ignore', invalid='ignore'):
            momentum, kinetic = float(self.inertia@w), float(.5*self.inertia@(w*w))
        if not math.isfinite(momentum) or not math.isfinite(kinetic):
            raise ArithmeticError('Derived torsional momentum or energy is not finite')
        return {'omegaRadS': w.tolist(), 'angularMomentumKgM2S': momentum, 'kineticJ': kinetic}

    def rates(self, torque):
        gradient = np.sum(self.omega.faceGrad.value*self.mesh.faceNormals, axis=0)
        flux = self.coefficient.value*self.area*gradient
        walls = {name: float(np.sum(flux[mask])) for name, mask in self.wall_masks.items()}
        wall_power = sum(walls[name]*speed for name, speed in self.wall_speeds.items() if speed is not None)
        result = {'boundaryTorqueNm': walls, 'boundaryPowerW': wall_power,
                'bodyTorqueNm': float(np.sum(torque)), 'bodyPowerW': float(torque@self.omega.value),
                'shearHeatW': float(np.sum(self.coefficient.value*self.area*self.distance*gradient**2))}
        if any(not math.isfinite(v) for v in [*walls.values(), *[v for k, v in result.items() if k != 'boundaryTorqueNm']]):
            raise ArithmeticError('Derived torsional torque, power or heat is not finite')
        return result

    def steady(self, torque):
        if all(v is None for v in self.wall_speeds.values()):
            raise ValueError('All-stress-free steady problem has no unique angular speed')
        t = self.field(torque)
        self.source.setValue(t/(2*np.pi*self.mesh.cellVolumes))
        self.stationary.solve(var=self.omega, solver=self.solver)
        return {**self.state(), **self.rates(t)}

    def step(self, initial, torque, dt):
        if isinstance(dt, bool) or not math.isfinite(dt) or dt <= 0:
            raise ValueError('Timestep must be finite and positive')
        old, t = self.field(initial), self.field(torque)
        self.omega.setValue(old)
        self.omega.updateOld()
        self.source.setValue(t/(2*np.pi*self.mesh.cellVolumes))
        before = self.state()
        self.transient.solve(var=self.omega, dt=dt, solver=self.solver)
        result = {**self.state(), **self.rates(t)}
        loss = float(.5*self.inertia@((self.omega.value-old)**2))
        wall_torque = sum(result['boundaryTorqueNm'].values())
        momentum_residual = result['angularMomentumKgM2S']-before['angularMomentumKgM2S']-dt*(result['bodyTorqueNm']+wall_torque)
        energy_residual = result['kineticJ']-before['kineticJ']+dt*result['shearHeatW']+loss-dt*(result['bodyPowerW']+result['boundaryPowerW'])
        energy_scale = abs(result['kineticJ']-before['kineticJ'])+dt*(abs(result['bodyPowerW'])+abs(result['boundaryPowerW'])+result['shearHeatW'])+loss
        momentum_scale = abs(result['angularMomentumKgM2S']-before['angularMomentumKgM2S'])+dt*(abs(result['bodyTorqueNm'])+sum(abs(v) for v in result['boundaryTorqueNm'].values()))
        if any(not math.isfinite(v) for v in (loss, energy_residual, momentum_residual, energy_scale, momentum_scale)):
            raise ArithmeticError('Torsional ledger is not finite')
        eps = np.finfo(float).eps
        if abs(energy_residual) > 1e-9*energy_scale+64*eps*(result['kineticJ']+before['kineticJ']):
            raise ArithmeticError('Torsional mechanical energy ledger failed')
        if abs(momentum_residual) > 1e-9*momentum_scale+64*eps*float(self.inertia@(abs(old)+abs(self.omega.value))):
            raise ArithmeticError('Torsional angular momentum ledger failed')
        return {**result, 'numericalLossJ': loss, 'energyResidualJ': energy_residual,
                'momentumResidualKgM2S': momentum_residual, 'dtS': dt}
