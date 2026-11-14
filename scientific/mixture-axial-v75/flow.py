"""Conservative axisymmetric binary monatomic Euler flow with swirl.

Limited primitive MUSCL/HLLC face fluxes and SSPRK2, with reflecting closed walls. Cell state is
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
    def __init__(self, r, z, massesKg, *, noSlipWalls=False):
        if not isinstance(noSlipWalls, (bool, np.bool_)):
            raise ValueError('Stationary no-slip wall reconstruction must be boolean')
        self.noSlipWalls = bool(noSlipWalls)
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
        The optional viscous-wall stencil reflects tangential velocities for
        slopes at the outer radius/endwall. Final Riemann ghosts stay slip:
        only the separate viscous operator supplies wall shear traction.
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
        if self.noSlipWalls:
            # Zero stationary-wall velocity, without flattening linear shear.
            # The lower radial/axial boundaries retain axis/midplane symmetry.
            ghost_hi[2:5] = -a[2:5, ..., -1:]
        extended = np.concatenate((ghost_lo, a, ghost_hi), axis=-1)
        x = np.r_[2*edges[0]-centers[0], centers, 2*edges[-1]-centers[-1]]
        back = (a-extended[..., :-2])/(centers-edges[:-1])
        forward = (extended[..., 2:]-a)/(edges[1:]-centers)
        centered = (extended[..., 2:]-extended[..., :-2])/(x[2:]-x[:-2])
        slope = np.where(back*forward > 0, np.sign(centered)*np.minimum(
            abs(centered), np.minimum(abs(back), abs(forward))), 0.)
        lower = a+slope*(edges[:-1]-centers)
        upper = a+slope*(edges[1:]-centers)
        if axis == 2:
            # Reconstruct departures from each cell's own centrifugal
            # equilibrium, rather than limiting away its pressure gradient.
            coefficient, lo, hi = self._radial_equilibrium(p)
            span = np.diff(self.r**2)
            before, after = np.ones_like(lo), np.ones_like(hi)
            with np.errstate(over='ignore', invalid='ignore'):
                before[:, 1:] = (hi[:, 1:]*np.exp(coefficient[:, 1:]
                    *(self.r[1:-1]**2-self.r[2:]**2))
                    *self._exponential_average(coefficient[:, 1:]*span[:-1]))
                after[:, :-1] = (hi[:, :-1]*np.exp(coefficient[:, :-1]
                    *(self.r[2:]**2-self.r[1:-1]**2))
                    *self._exponential_average(coefficient[:, :-1]*span[1:]))
            if not np.all(np.isfinite(before)) or not np.all(np.isfinite(after)):
                raise ValueError('Unrepresentable neighboring centrifugal equilibrium')
            previous = np.concatenate((a[:2, ..., :1], a[:2, ..., :-1]), axis=-1)
            following = np.concatenate((a[:2, ..., 1:], a[:2, ..., -1:]), axis=-1)
            delta_lo, delta_hi = previous-a[:2]*before, following-a[:2]*after
            back = -delta_lo/(centers-edges[:-1])
            forward = delta_hi/(edges[1:]-centers)
            centered = (delta_hi-delta_lo)/(x[2:]-x[:-2])
            residual_slope = np.where(back*forward > 0, np.sign(centered)*np.minimum(
                abs(centered), np.minimum(abs(back), abs(forward))), 0.)
            baseline = np.array([a[:2]*lo, a[:2]*hi])
            change = np.array([residual_slope*(edges[:-1]-centers),
                               residual_slope*(edges[1:]-centers)])
            # Limit the perturbation, not the equilibrium. This preserves the
            # positive density/pressure domain without imposing a floor.
            ratio = np.ones_like(change)
            np.divide((1-64*np.finfo(float).eps)*baseline, -change,
                      out=ratio, where=change < 0)
            theta = np.minimum(1., np.min(ratio, axis=0))
            lower[:2], upper[:2] = baseline+theta*change
        ghost_lo, ghost_hi = lower[..., :1].copy(), upper[..., -1:].copy()
        ghost_lo[normal] *= -1
        ghost_hi[normal] *= -1
        left = np.concatenate((ghost_lo, upper), axis=-1)
        right = np.concatenate((lower, ghost_hi), axis=-1)
        return [np.moveaxis(v, -1, axis) for v in (left, right)]

    @staticmethod
    def _exponential_average(span):
        """Average exp[a(r²-r_hi²)] over a cylindrical annulus.

        span=a*(r_hi²-r_lo²); expm1 retains the nonrotating limit.
        """
        average = np.ones_like(span)
        np.divide(-np.expm1(-span), span, out=average, where=span != 0)
        return average

    def _radial_equilibrium(self, p):
        """Cell-average-normalized local isothermal rigid-rotation profile.

        c²=p/rho and Omega are local reconstruction parameters, not imposed
        global equilibrium constraints. General thermal/sheared states still
        evolve. The momentum source uses these SAME equilibrium edge values.
        """
        with np.errstate(over='ignore', invalid='ignore', divide='ignore'):
            coefficient = .5*p['densityKgM3']*p['omegaRadS']**2/p['pressurePa']
            span = coefficient*np.diff(self.r**2)
            upper = 1/self._exponential_average(span)
            lower = upper*np.exp(-span)
        if (not np.all(np.isfinite(coefficient)) or not np.all(np.isfinite(upper))
                or not np.all(np.isfinite(lower)) or np.any(lower <= 0)):
            raise ValueError('Unrepresentable local centrifugal equilibrium')
        return coefficient, lower, upper

    def _fluxes(self, q, p):
        faces = []
        for axis, normal, area in ((2, 1, self.radial_area), (1, 2, self.axial_area)):
            pair = self._face_states(p, axis)
            radius2 = self.r[None, :]**2 if axis == 2 else self.mean_r2[None, :]
            states, fluxes, velocities, sounds, pressures = [], [], [], [], []
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
                velocities.append(velocity)
                sounds.append(np.sqrt(GAMMA*pressure/rho))
                pressures.append(pressure)
            flux = self._hllc(states, fluxes, velocities, sounds, pressures, normal)
            # L and species travel with the same mass flux, using reconstructed
            # specific values at the SAME face radius. No artificial r² jump.
            for component in (3, 5):
                flux[component] = flux[0]*np.where(flux[0] >= 0,
                    states[0][component]/states[0][0], states[1][component]/states[1][0])
            faces.append(flux*area)
        return faces

    @staticmethod
    def _hllc(states, fluxes, velocities, sounds, pressures, normal):
        """Toro HLLC contact/shear resolution with Davis acoustic bounds.

        Same star-state construction as Clawpack's euler_hllc_1D, extended
        to tangential momentum, face-specific angular momentum and species.
        Unlike LLF, a stationary contact cannot diffuse mass or swirl energy.
        """
        left, right = states
        ul, ur = velocities
        pl, pr = pressures
        # Davis endpoint bounds need no azimuthal Roe average or axis division.
        sl = np.minimum(ul-sounds[0], ur-sounds[1])
        sr = np.maximum(ul+sounds[0], ur+sounds[1])
        contact = (pr-pl+left[0]*ul*(sl-ul)-right[0]*ur*(sr-ur)) / (
            left[0]*(sl-ul)-right[0]*(sr-ur))
        stars = []
        for state, u, p, speed in zip(states, velocities, pressures, (sl, sr)):
            density = state[0]*(speed-u)/(speed-contact)
            star = state*(density/state[0])
            star[normal] = density*contact
            star[4] = density*(state[4]/state[0]+(contact-u)*(
                contact+p/(state[0]*(speed-u))))
            pressure_star = p+state[0]*(speed-u)*(contact-u)
            star_flux = star*contact
            star_flux[normal] += pressure_star
            star_flux[4] += pressure_star*contact
            stars.append(star_flux)
        return np.where(sl >= 0, fluxes[0], np.where(sr <= 0, fluxes[1],
            np.where(contact >= 0, stars[0], stars[1])))

    def fluxes(self, q):
        return self._fluxes(q, self.primitive(q))

    def rate(self, q):
        p = self.primitive(q)
        radial, axial = self._fluxes(q, p)
        out = radial[:, :, :-1]-radial[:, :, 1:]+axial[:, :-1]-axial[:, 1:]
        # The area-weighted local equilibrium pressures integrate both the
        # cylindrical p/r term and rho*Omega²*r. Their common reconstruction
        # cancels a stationary rotating profile, including reflecting walls.
        pressure = p['pressurePa']
        _, lower, upper = self._radial_equilibrium(p)
        out[1] = ((radial[1, :, :-1]-pressure*lower*self.radial_area[:, :-1])
                  -(radial[1, :, 1:]-pressure*upper*self.radial_area[:, 1:])
                  +axial[1, :-1]-axial[1, 1:])
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
