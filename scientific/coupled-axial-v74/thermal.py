"""Constrained fixed-density gas/tungsten r-z energy; actual FiPy increment solve.

All project execution belongs in safe-dev. Axial ends and the axis insulate.
Gas sources are physical W per cell, never mechanical numerical dissipation.
"""
import math
import numpy as np
from fipy import CellVariable, FaceVariable, CylindricalGrid2D
from fipy import TransientTerm, DiffusionTerm, ImplicitSourceTerm
from fipy.solvers.scipy import LinearLUSolver

KB, AR_MASS, SOLID_RHO = 1.380649e-23, 39.948*1.66053906892e-27, 19250.


class Thermal:
    def __init__(self, rgas, z, wall_edges, rho, bridge, contact_h=100.,
                 cooling_h=100., bath_k=400., nonlinear_rtol=1e-9, max_iterations=80):
        gas, wall, self.z = [np.array(e, dtype=float, copy=True) for e in (rgas, wall_edges, z)]
        for e, minimum in ((gas, 3), (wall, 2), (self.z, 3)):
            if e.ndim != 1 or len(e) < minimum or not np.all(np.isfinite(e)) or np.any(np.diff(e) <= 0):
                raise ValueError('Need ordered edges: two gas/axial cells and at least one wall cell')
        if gas[0] != 0 or wall[0] != gas[-1] or gas[-1] <= 0:
            raise ValueError('Need full gas cylinder and contiguous positive-radius wall')
        if any(isinstance(v, bool) or not math.isfinite(v) for v in
               (contact_h, cooling_h, bath_k, nonlinear_rtol)):
            raise ValueError('Boundary and solver parameters must be finite numbers')
        if min(contact_h, cooling_h) < 0 or not 300 <= bath_k <= 1900 or nonlinear_rtol <= 0:
            raise ValueError('Need nonnegative films, sourced bath temperature and positive tolerance')
        if isinstance(max_iterations, bool) or not isinstance(max_iterations, int) or max_iterations < 1:
            raise ValueError('Need a positive integer iteration limit')
        self.r = np.r_[gas, wall[1:]]
        self.ngr, self.nr, self.nz = len(gas)-1, len(self.r)-1, len(self.z)-1
        self.count = self.nr*self.nz
        self.gas_indices = np.array([j*self.nr+i for j in range(self.nz) for i in range(self.ngr)])
        self.solid_indices = np.array([j*self.nr+i for j in range(self.nz) for i in range(self.ngr, self.nr)])
        self.ng = len(self.gas_indices)
        self.bridge, self.contact_h, self.cooling_h, self.bath_k = bridge, contact_h, cooling_h, bath_k
        self.rtol, self.max_iterations = nonlinear_rtol, max_iterations
        self.mesh = CylindricalGrid2D(dx=np.diff(self.r), dy=np.diff(self.z), nx=self.nr,
                                     ny=self.nz, origin=((0.,), (self.z[0],)))
        self.volume = np.tile(np.pi*np.diff(self.r**2), self.nz)*np.repeat(np.diff(self.z), self.nr)
        density = self.field(rho, self.ng)
        if np.any(density <= 0):
            raise ValueError('Gas density must be positive')
        self.rho = density.copy()
        self.mass = np.empty(self.count)
        self.mass[self.gas_indices] = density*self.volume[self.gas_indices]
        self.mass[self.solid_indices] = SOLID_RHO*self.volume[self.solid_indices]
        if not np.all(np.isfinite(self.mass)) or np.any(self.mass <= 0):
            raise ValueError('Unrepresentable thermal mass/geometry')
        self.rc, self.zc = (self.r[:-1]+self.r[1:])/2, (self.z[:-1]+self.z[1:])/2
        if not np.all(np.isfinite(self.rc)) or not np.all(np.isfinite(self.zc)):
            raise ValueError('Unrepresentable thermal cell centers')
        self.increment = CellVariable(mesh=self.mesh, value=0., hasOld=True)
        self.linear_solver = LinearLUSolver(tolerance=1e-12, iterations=1000)
        self.faces = []
        fc, normals = self.mesh.faceCenters.value, self.mesh.faceNormals
        for f in np.flatnonzero(self.mesh.interiorFaces.value):
            if abs(normals[0, f]) > .5:
                i, j = int(np.argmin(abs(self.r-fc[0, f]))), int(np.argmin(abs(self.zc-fc[1, f])))
                left, right = j*self.nr+i-1, j*self.nr+i
                a, b = math.log(self.r[i]/self.rc[i-1]), math.log(self.rc[i]/self.r[i])
                area, distance = 2*np.pi*self.r[i]*np.diff(self.z)[j], self.rc[i]-self.rc[i-1]
                self.faces.append((f, left, right, a, b, 2*np.pi*np.diff(self.z)[j], area, distance, i == self.ngr))
            else:
                i, j = int(np.argmin(abs(self.rc-fc[0, f]))), int(np.argmin(abs(self.z-fc[1, f])))
                left, right = (j-1)*self.nr+i, j*self.nr+i
                area = np.pi*(self.r[i+1]**2-self.r[i]**2)
                a, b = self.z[j]-self.zc[j-1], self.zc[j]-self.z[j]
                self.faces.append((f, left, right, a, b, area, area, a+b, False))
        if any(not all(math.isfinite(v) and v > 0 for v in face[3:8]) for face in self.faces):
            raise ValueError('Unrepresentable positive thermal face geometry')

    @staticmethod
    def field(value, count):
        raw = np.asarray(value)
        if raw.dtype.kind == 'b':
            raise ValueError('Boolean fields are not physical inputs')
        result = np.broadcast_to(np.asarray(value, dtype=float), (count,)).copy()
        if not np.all(np.isfinite(result)):
            raise ValueError('Need finite fields with matching cell counts')
        return result

    def temperatures(self, value):
        t = self.field(value, self.count)
        if np.any(t[self.gas_indices] < 300) or np.any(t[self.gas_indices] > 20000) or \
                np.any(t[self.solid_indices] < 300) or np.any(t[self.solid_indices] > 1900):
            raise ValueError('Temperature lies outside sourced gas/solid domains')
        return t

    def properties(self, temperature):
        t = self.temperatures(temperature)
        raw = self.bridge.props(t[self.gas_indices].tolist(), t[self.solid_indices].tolist())
        props = {key: self.field(raw[key], self.ng if key in ('mu', 'k') else len(self.solid_indices))
                 for key in ('mu', 'k', 'solidK', 'solidCp', 'solidH')}
        if any(np.any(props[k] <= 0) for k in ('mu', 'k', 'solidK', 'solidCp')):
            raise ValueError('Conductivity, viscosity and heat capacity must be positive')
        return props

    def energy(self, temperature, props):
        t = self.temperatures(temperature)
        u = np.empty(self.count)
        u[self.gas_indices] = self.mass[self.gas_indices]*(1.5*KB/AR_MASS)*t[self.gas_indices]
        u[self.solid_indices] = self.mass[self.solid_indices]*props['solidH']
        if not np.all(np.isfinite(u)):
            raise ArithmeticError('Unrepresentable thermal energy')
        return u

    def capacity(self, props):
        result = np.empty(self.count)
        result[self.gas_indices] = self.mass[self.gas_indices]*(1.5*KB/AR_MASS)
        result[self.solid_indices] = self.mass[self.solid_indices]*props['solidCp']
        if not np.all(np.isfinite(result)) or np.any(result <= 0):
            raise ArithmeticError('Unrepresentable positive heat capacity')
        return result

    def coefficients(self, props):
        k = np.empty(self.count)
        k[self.gas_indices], k[self.solid_indices] = props['k'], props['solidK']
        coefficient, links = np.zeros(self.mesh.numberOfFaces), []
        for f, left, right, a, b, scale, area, distance, contact in self.faces:
            resistance = (a/k[left]+b/k[right])/scale
            conductance = 0. if contact and self.contact_h == 0 else 1/(resistance+(1/(self.contact_h*area) if contact else 0))
            coefficient[f] = conductance*distance/area
            links.append((left, right, conductance))
        bath = np.zeros(self.count)
        if self.cooling_h:
            for j in range(self.nz):
                cell, dz = (j+1)*self.nr-1, np.diff(self.z)[j]
                resistance = math.log(self.r[-1]/self.rc[-1])/(2*np.pi*dz*k[cell])
                bath[cell] = 1/(resistance+1/(self.cooling_h*2*np.pi*self.r[-1]*dz))
        if not np.all(np.isfinite(coefficient)) or not np.all(np.isfinite(bath)) or np.any(coefficient < 0):
            raise ArithmeticError('Unrepresentable thermal conductance')
        return coefficient, links, bath

    def flux(self, temperature, props):
        t = self.temperatures(temperature)
        _, links, bath = self.coefficients(props)
        net = np.zeros(self.count)
        for left, right, conductance in links:
            q = conductance*(t[right]-t[left])
            net[left] += q
            net[right] -= q
        outgoing = bath*(t-self.bath_k)
        net -= outgoing
        if not np.all(np.isfinite(net)) or not np.all(np.isfinite(outgoing)):
            raise ArithmeticError('Unrepresentable thermal flux')
        return net, float(np.sum(outgoing))

    def advance(self, old_temperature, dt, source_callback):
        if isinstance(dt, bool) or not math.isfinite(dt) or dt <= 0:
            raise ValueError('Need a finite positive timestep')
        old = self.temperatures(old_temperature)
        old_u = self.energy(old, self.properties(old))

        def evaluate(t):
            props = self.properties(t)
            gas_source, payload = source_callback(t.copy(), props)
            source = np.zeros(self.count)
            source[self.gas_indices] = self.field(gas_source, self.ng)
            u = self.energy(t, props)
            net, bath_out = self.flux(t, props)
            residual = (u-old_u)/dt-net-source
            exchange = abs((u-old_u)/dt)+abs(source)
            conduction_scale = np.zeros(self.count)
            _, links, bath = self.coefficients(props)
            for left, right, g in links:
                q = abs(g*(t[right]-t[left]))
                exchange[left] += q
                exchange[right] += q
                # Resolving a temperature difference also inherits the ULPs of
                # both absolute temperatures, even when its heat flux is tiny.
                scale = g*max(abs(t[left]), abs(t[right]))
                conduction_scale[left] += scale
                conduction_scale[right] += scale
            exchange += abs(bath*(t-self.bath_k))
            conduction_roundoff = 16*np.finfo(float).eps*(conduction_scale+bath*np.maximum(abs(t), abs(self.bath_k)))
            tolerance = (self.rtol*np.maximum(exchange, 1e-300)
                         +64*np.finfo(float).eps*(abs(u)+abs(old_u))/dt+conduction_roundoff)
            score = float(np.max(abs(residual)/tolerance))
            if not math.isfinite(score):
                raise ArithmeticError('Nonfinite thermal residual')
            return props, payload, residual, bath_out, conduction_roundoff, score

        t, result = old.copy(), evaluate(old)
        for iteration in range(self.max_iterations+1):
            props, payload, residual, bath_out, conduction_roundoff, score = result
            if score <= 1:
                return {'temperatureK': t.tolist(), 'payload': payload, 'residualW': residual.tolist(),
                        'bathOutW': bath_out, 'iterations': iteration,
                        'conductionRoundoffW': conduction_roundoff.tolist(),
                        'energyResidualJ': float(dt*np.sum(residual)), 'residualScore': score}
            if iteration == self.max_iterations:
                break
            coeff, _, bath = self.coefficients(props)
            self.increment.setValue(0.)
            self.increment.updateOld()
            equation = (TransientTerm(coeff=CellVariable(mesh=self.mesh, value=self.capacity(props)/self.volume))
                        == DiffusionTerm(coeff=FaceVariable(mesh=self.mesh, value=coeff))
                        - ImplicitSourceTerm(coeff=CellVariable(mesh=self.mesh, value=bath/self.volume))
                        + CellVariable(mesh=self.mesh, value=-residual/self.volume))
            equation.solve(var=self.increment, dt=dt, solver=self.linear_solver)
            delta = self.increment.value.copy()
            if not np.all(np.isfinite(delta)):
                raise ArithmeticError('Nonfinite thermal increment')
            for cut in range(30):
                trial = t+(2.**-cut)*delta
                if np.any(trial[self.gas_indices] < 300) or np.any(trial[self.gas_indices] > 20000) or \
                        np.any(trial[self.solid_indices] < 300) or np.any(trial[self.solid_indices] > 1900):
                    continue
                candidate = evaluate(trial)
                if candidate[-1] < score or candidate[-1] <= 1:
                    t, result = trial, candidate
                    break
            else:
                raise ArithmeticError('Thermal endpoint line search failed')
        raise ArithmeticError('Thermal endpoint did not converge')
