"""Conservative axisymmetric binary monatomic Euler flow with swirl.

Limited primitive MUSCL/Rusanov face fluxes and SSPRK2, with reflecting closed walls. Cell state is
integrated [mass, radial momentum, axial momentum, angular momentum, total
energy, species-1 mass]. Total energy includes meridional and swirl kinetic
energy. This is an inviscid meridional operator, not a complete Navier–Stokes
or plasma closure. Existing FiPy operators supply azimuthal shear and heat.
All project execution belongs in safe-dev.
"""
import math
import numpy as np

KB = 1.380649e-23
GAMMA = 5./3.


class Flow:
    def __init__(self, r, z, massesKg):
        self.r, self.z = [np.array(v, dtype=float, copy=True) for v in (r, z)]
        for edges in (self.r, self.z):
            if (edges.ndim != 1 or len(edges) < 3 or not np.all(np.isfinite(edges))
                    or np.any(np.diff(edges) <= 0)):
                raise ValueError('Need ordered finite edges and at least two cells per coordinate')
        if self.r[0] != 0:
            raise ValueError('The radial domain must include the symmetry axis')
        self.masses = np.array(massesKg, dtype=float, copy=True)
        if self.masses.shape != (2,) or not np.all(np.isfinite(self.masses)) or np.any(self.masses <= 0):
            raise ValueError('Need two finite positive molecular masses')
        self.nr, self.nz = len(self.r)-1, len(self.z)-1
        self.count = self.nr*self.nz
        annulus = math.pi*np.diff(self.r**2)
        self.volume = np.diff(self.z)[:, None]*annulus[None, :]
        self.mean_r2 = (self.r[:-1]**2+self.r[1:]**2)/2
        self.mean_r = (2./3.)*np.diff(self.r**3)/np.diff(self.r**2)
        self.radial_area = 2*math.pi*np.diff(self.z)[:, None]*self.r[None, :]
        self.axial_area = np.broadcast_to(annulus, (self.nz+1, self.nr)).copy()
        values = (self.volume, self.mean_r2, self.mean_r, self.radial_area, self.axial_area)
        if any(not np.all(np.isfinite(v)) for v in values) or np.any(self.volume <= 0):
            raise ValueError('Geometry exceeds the finite-volume domain')

    def field(self, value):
        raw = np.asarray(value)
        if raw.dtype.kind == 'b':
            raise ValueError('Boolean fields are not physical inputs')
        if raw.ndim == 1 and raw.size == self.count:
            raw = raw.reshape(self.nz, self.nr)
        out = np.broadcast_to(np.asarray(raw, dtype=float), (self.nz, self.nr)).copy()
        if not np.all(np.isfinite(out)):
            raise ValueError('Need finite scalar or cell-shaped fields')
        return out

    def state(self, rho, temperature, massFraction, omega, vr=0., vz=0.):
        rho, t, y, w, ur, uz = [self.field(v) for v in
                               (rho, temperature, massFraction, omega, vr, vz)]
        if np.any(rho <= 0) or np.any(t <= 0) or np.any(y < 0) or np.any(y > 1):
            raise ValueError('Need positive density/temperature and a mass fraction in [0,1]')
        mass = rho*self.volume
        inertia = mass*self.mean_r2
        thermal = 1.5*KB*mass*(y/self.masses[0]+(1-y)/self.masses[1])*t
        energy = thermal+.5*mass*(ur*ur+uz*uz)+.5*inertia*w*w
        out = np.array([mass, mass*ur, mass*uz, inertia*w, energy, mass*y])
        self.primitive(out)
        return out

    def primitive(self, q):
        q = np.asarray(q)
        if q.dtype.kind == 'b' or q.shape != (6, self.nz, self.nr) or not np.all(np.isfinite(q)):
            raise ValueError('Need six finite cell-integrated conserved fields')
        mass, mr, mz, angular, energy, species = q
        if np.any(mass <= 0) or np.any(species < 0) or np.any(species > mass):
            raise ValueError('Mass must be positive and both species nonnegative')
        with np.errstate(over='ignore', invalid='ignore', divide='ignore'):
            rho, y = mass/self.volume, species/mass
            inertia = mass*self.mean_r2
            vr, vz, omega = mr/mass, mz/mass, angular/inertia
            kinetic = .5*(mr*mr+mz*mz)/mass+.5*angular*angular/inertia
            thermal = energy-kinetic
            number = species/self.masses[0]+(mass-species)/self.masses[1]
            temperature = thermal/(1.5*KB*number)
            pressure = (GAMMA-1)*thermal/self.volume
            sound = np.sqrt(GAMMA*pressure/rho)
        values = dict(densityKgM3=rho, temperatureK=temperature, omegaRadS=omega,
                      pressurePa=pressure, massFraction=y, vrMPS=vr, vzMPS=vz,
                      thermalJ=thermal, kineticJ=kinetic, soundMPS=sound)
        if any(not np.all(np.isfinite(v)) for v in values.values()) or np.any(thermal <= 0):
            raise ValueError('State has nonpositive or unrepresentable thermal energy')
        return values

    def _face_states(self, p, axis):
        """Monotone linear reconstruction about cylindrical volume centroids.

        Limit slopes by the actual center-to-face distances on graded grids.
        Reflected ghost primitives impose impermeable slip Euler boundaries;
        the separate viscous source supplies azimuthal no-slip braking.
        """
        values = np.array([p[k] for k in ('densityKgM3', 'pressurePa', 'vrMPS',
                                         'vzMPS', 'omegaRadS', 'massFraction')])
        a = np.moveaxis(values, axis, -1)
        centers = self.mean_r if axis == 2 else (self.z[:-1]+self.z[1:])/2
        edges = self.r if axis == 2 else self.z
        ghost_lo, ghost_hi = a[..., :1].copy(), a[..., -1:].copy()
        normal = 2 if axis == 2 else 3
        ghost_lo[normal] *= -1
        ghost_hi[normal] *= -1
        extended = np.concatenate((ghost_lo, a, ghost_hi), axis=-1)
        x = np.r_[2*edges[0]-centers[0], centers, 2*edges[-1]-centers[-1]]
        back = (a-extended[..., :-2])/(centers-edges[:-1])
        forward = (extended[..., 2:]-a)/(edges[1:]-centers)
        centered = (extended[..., 2:]-extended[..., :-2])/(x[2:]-x[:-2])
        slope = np.where(back*forward > 0, np.sign(centered)*np.minimum(
            abs(centered), np.minimum(abs(back), abs(forward))), 0.)
        lower = a+slope*(edges[:-1]-centers)
        upper = a+slope*(edges[1:]-centers)
        ghost_lo, ghost_hi = lower[..., :1].copy(), upper[..., -1:].copy()
        ghost_lo[normal] *= -1
        ghost_hi[normal] *= -1
        left = np.concatenate((ghost_lo, upper), axis=-1)
        right = np.concatenate((lower, ghost_hi), axis=-1)
        return [np.moveaxis(v, -1, axis) for v in (left, right)]

    def _fluxes(self, q, p):
        faces = []
        for axis, normal, area in ((2, 1, self.radial_area), (1, 2, self.axial_area)):
            pair = self._face_states(p, axis)
            radius2 = self.r[None, :]**2 if axis == 2 else self.mean_r2[None, :]
            states, fluxes, speeds = [], [], []
            for rho, pressure, ur, uz, omega, y in pair:
                if np.any(rho <= 0) or np.any(pressure <= 0) or np.any(y < 0) or np.any(y > 1):
                    raise ValueError('Reconstructed face violates density/pressure/species domain')
                velocity = ur if normal == 1 else uz
                energy = pressure/(GAMMA-1)+.5*rho*(ur*ur+uz*uz+radius2*omega*omega)
                state = np.array(np.broadcast_arrays(rho, rho*ur, rho*uz, rho*radius2*omega, energy, rho*y))
                flux = state*velocity
                flux[normal] += pressure
                flux[4] += pressure*velocity
                states.append(state)
                fluxes.append(flux)
                speeds.append(abs(velocity)+np.sqrt(GAMMA*pressure/rho))
            flux = .5*(fluxes[0]+fluxes[1])-.5*np.maximum(*speeds)*(states[1]-states[0])
            # L and species travel with the same mass flux, using reconstructed
            # specific values at the SAME face radius. No artificial r² jump.
            for component in (3, 5):
                flux[component] = flux[0]*np.where(flux[0] >= 0,
                    states[0][component]/states[0][0], states[1][component]/states[1][0])
            faces.append(flux*area)
        return faces

    def fluxes(self, q):
        return self._fluxes(q, self.primitive(q))

    def rate(self, q):
        p = self.primitive(q)
        radial, axial = self._fluxes(q, p)
        out = radial[:, :, :-1]-radial[:, :, 1:]+axial[:, :-1]-axial[:, 1:]
        # Subtract each cell's pressure before differencing radial momentum
        # fluxes: this is exactly +p*(Aout-Ain), but avoids cancellation of
        # large equal terms for a uniform stationary gas.
        pressure = p['pressurePa']
        out[1] = ((radial[1, :, :-1]-pressure*self.radial_area[:, :-1])
                  -(radial[1, :, 1:]-pressure*self.radial_area[:, 1:])
                  +axial[1, :-1]-axial[1, 1:])
        # Integral rho*Omega²*r uses a cell-constant rho and Omega. Updating
        # radial momentum but conserving total energy includes pressure and
        # centrifugal conversion between thermal and kinetic energy.
        out[1] += q[0]*p['omegaRadS']**2*self.mean_r
        if not np.all(np.isfinite(out)):
            raise ArithmeticError('Nonfinite compressible flow rate')
        return out

    def stable_dt(self, q, cfl=.3):
        if isinstance(cfl, bool) or not math.isfinite(cfl) or not 0 < cfl <= .5:
            raise ValueError('CFL must lie in (0,0.5]')
        p = self.primitive(q)
        sr, sz = abs(p['vrMPS'])+p['soundMPS'], abs(p['vzMPS'])+p['soundMPS']
        fr = np.empty((self.nz, self.nr+1))
        fz = np.empty((self.nz+1, self.nr))
        fr[:, 0], fr[:, -1], fr[:, 1:-1] = sr[:, 0], sr[:, -1], np.maximum(sr[:, :-1], sr[:, 1:])
        fz[0], fz[-1], fz[1:-1] = sz[0], sz[-1], np.maximum(sz[:-1], sz[1:])
        denominator = ((self.radial_area[:, :-1]*fr[:, :-1]+self.radial_area[:, 1:]*fr[:, 1:])
                       +(self.axial_area[:-1]*fz[:-1]+self.axial_area[1:]*fz[1:]))
        dt = cfl*float(np.min(self.volume/denominator))
        if not math.isfinite(dt) or dt <= 0:
            raise ArithmeticError('Unrepresentable acoustic timestep')
        return dt

    def advance(self, q, dt):
        return self.advance_with_receipt(q, dt)[0]

    def advance_with_receipt(self, q, dt):
        if isinstance(dt, bool) or not math.isfinite(dt) or dt <= 0:
            raise ValueError('Need a finite positive timestep')
        self.primitive(q)
        if dt > self.stable_dt(q, cfl=.5)*(1+64*np.finfo(float).eps):
            raise ValueError('Timestep exceeds the explicit acoustic CFL bound')
        first = q+dt*self.rate(q)
        self.primitive(first)
        if dt > self.stable_dt(first, cfl=.5)*(1+64*np.finfo(float).eps):
            raise ValueError('Timestep exceeds the second-stage acoustic CFL bound')
        out = .5*q+.5*(first+dt*self.rate(first))
        p = self.primitive(out)
        residual = np.sum(out-q, axis=(1, 2))
        # These four closed-domain quantities have no cylindrical body source.
        conserved = [0, 3, 4, 5]
        scale = np.sum(abs(q)+abs(out), axis=(1, 2))
        if np.any(abs(residual[conserved]) > 128*np.finfo(float).eps*scale[conserved]):
            raise ArithmeticError('Closed Euler mass/angular/energy/species conservation failed')
        return out, dict(massResidualKg=float(residual[0]), angularResidualKgM2S=float(residual[3]),
                         energyResidualJ=float(residual[4]), speciesResidualKg=float(residual[5]),
                         minimumDensityKgM3=float(p['densityKgM3'].min()),
                         minimumThermalJ=float(p['thermalJ'].min()))
