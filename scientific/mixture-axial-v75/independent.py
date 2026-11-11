"""Independent primitive/face reconstruction; imports no production solver.

All execution belongs in safe-dev. Canonical setup: r,z,masses (SI).
Integrated q: [M, Mr, Mz, L, Etotal, M1], shape (6,nz,nr).
"""
import math
import numpy as np

KB, GAMMA, EPS = 1.380649e-23, 5./3., np.finfo(float).eps


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def finite(value, label):
    require(np.all(np.isfinite(value)), 'Nonfinite independent '+label)


def geometry(setup):
    r, z, masses = [np.asarray(setup[key], dtype=float) for key in ('r', 'z', 'masses')]
    for edges in (r, z):
        require(edges.ndim == 1 and len(edges) >= 3 and np.all(np.isfinite(edges))
                and np.all(np.diff(edges) > 0), 'Invalid independent ordered grid')
    require(r[0] == 0, 'Independent radial grid must include axis')
    require(masses.shape == (2,) and np.all(np.isfinite(masses)) and np.all(masses > 0),
            'Invalid independent species masses')
    volume = math.pi*np.diff(z)[:, None]*np.diff(r*r)[None, :]
    a2 = (r[:-1]**2+r[1:]**2)/2
    radial_area = 2*math.pi*np.diff(z)[:, None]*r[None, :]
    axial_area = np.broadcast_to(math.pi*np.diff(r*r), (len(z), len(r)-1))
    for value in (volume, a2, radial_area, axial_area):
        finite(value, 'geometry')
    require(np.all(volume > 0) and np.all(a2 > 0), 'Degenerate independent geometry')
    return r, z, masses, volume, a2, radial_area, axial_area


def primitives(q, volume, a2, masses):
    raw = np.asarray(q)
    require(raw.dtype.kind != 'b' and raw.shape == (6, *volume.shape), 'Invalid independent conserved shape')
    finite(raw, 'conserved state')
    mass, mr, mz, angular, energy, light = np.asarray(raw, dtype=float)
    require(np.all(mass > 0) and np.all(light >= 0) and np.all(light <= mass),
            'Nonpositive independent mass/species inventory')
    with np.errstate(over='ignore', invalid='ignore', divide='ignore'):
        inertia = mass*a2
        velocity = np.array([mr/mass, mz/mass])
        omega = angular/inertia
        kinetic = (mr*mr+mz*mz)/(2*mass)+angular*angular/(2*inertia)
        internal = energy-kinetic
        number = light/masses[0]+(mass-light)/masses[1]
        t = internal/(1.5*KB*number)
        pressure = (2./3.)*internal/volume
        density = mass/volume
        sound = np.sqrt(GAMMA*pressure/density)
        fraction = light/mass
    for value in (inertia, velocity, omega, kinetic, internal, number, t, pressure, density, sound, fraction):
        finite(value, 'primitive')
    require(np.all(internal > 0) and np.all(number > 0), 'Nonpositive independent internal energy')
    return dict(velocity=velocity, omega=omega, internal=internal, temperature=t,
                pressure=pressure, density=density, sound=sound, fraction=fraction)


def hydro_rate(setup, q, with_scale=False):
    r, z, masses, volume, a2, area_r, area_z = geometry(setup)
    state = np.asarray(q, dtype=float)
    p = primitives(state, volume, a2, masses)
    face_fluxes = []
    # Separate componentwise reconstruction, including reflected primitives;
    # imports no production slope, face-state, or flux helper.
    raw = (p['density'], p['pressure'], *p['velocity'], p['omega'], p['fraction'])
    mean_r = 2*np.diff(r**3)/(3*np.diff(r*r))
    for dim, area, positions, centers in ((1, area_r, r, mean_r),
                                         (0, area_z, z, (z[:-1]+z[1:])/2)):
        left, right = [], []
        for component, field in enumerate(raw):
            a = np.moveaxis(field, dim, 0)
            sign = -1 if component == (2 if dim else 3) else 1
            ghost = np.concatenate((sign*a[:1], a, sign*a[-1:]))
            x = np.r_[2*positions[0]-centers[0], centers, 2*positions[-1]-centers[-1]]
            candidates = np.array([(a-ghost[:-2])/(centers-positions[:-1])[:, None],
                (ghost[2:]-a)/(positions[1:]-centers)[:, None],
                (ghost[2:]-ghost[:-2])/(x[2:]-x[:-2])[:, None]])
            same_sign = np.all(candidates > 0, axis=0) | np.all(candidates < 0, axis=0)
            derivative = np.where(same_sign, np.sign(candidates[2])*np.min(abs(candidates), axis=0), 0.)
            lo = a+derivative*(positions[:-1]-centers)[:, None]
            hi = a+derivative*(positions[1:]-centers)[:, None]
            left.append(np.moveaxis(np.concatenate((sign*lo[:1], hi)), 0, dim))
            right.append(np.moveaxis(np.concatenate((lo, sign*hi[-1:])), 0, dim))
        states, physical, speeds = [], [], []
        rf2 = r[None, :]**2 if dim else a2[None, :]
        for rho, pressure, ur, uz, omega, y in (left, right):
            require(np.all(rho > 0) and np.all(pressure > 0) and np.all(y >= 0) and np.all(y <= 1),
                    'Independent reconstructed face domain')
            velocity = ur if dim else uz
            energy = 1.5*pressure+.5*rho*(ur*ur+uz*uz+rf2*omega*omega)
            conserved = np.array(np.broadcast_arrays(rho, rho*ur, rho*uz, rho*rf2*omega, energy, rho*y))
            flux = conserved*velocity
            flux[2-dim] += pressure
            flux[4] += pressure*velocity
            states.append(conserved)
            physical.append(flux)
            speeds.append(abs(velocity)+np.sqrt(GAMMA*pressure/rho))
        before, after = states
        flux = (physical[0]+physical[1]-(after-before)*np.maximum(*speeds))/2
        for component in (3, 5):
            donor = np.where(flux[0] >= 0, before[component]/before[0], after[component]/after[0])
            flux[component] = flux[0]*donor
        face_fluxes.append(flux*area)
    fr, fz = face_fluxes
    rate = fr[:, :, :-1]-fr[:, :, 1:]+fz[:, :-1]-fz[:, 1:]
    arithmetic = abs(fr[:, :, :-1])+abs(fr[:, :, 1:])+abs(fz[:, :-1])+abs(fz[:, 1:])
    geometric = 2*math.pi*np.diff(z)[:, None]*np.diff(r)[None, :]*p['pressure']
    mean_r = 2*np.diff(r**3)/(3*np.diff(r*r))
    centrifugal = state[0]*p['omega']**2*mean_r
    rate[1] += geometric+centrifugal
    arithmetic[1] += abs(geometric)+abs(centrifugal)
    finite(rate, 'hydro face rate')
    finite(arithmetic, 'hydro arithmetic scale')
    return (rate, arithmetic) if with_scale else rate


def bernoulli(value):
    x = np.asarray(value, dtype=float)
    finite(x, 'barodiffusion exponent')
    out = np.empty_like(x)
    small, positive, negative = abs(x) < 1e-5, x > 50, x < -50
    regular = ~(small | positive | negative)
    out[small] = 1-x[small]/2+x[small]**2/12-x[small]**4/720
    out[positive] = x[positive]*np.exp(-x[positive])/(-np.expm1(-x[positive]))
    out[negative] = -x[negative]/(-np.expm1(x[negative]))
    out[regular] = x[regular]/np.expm1(x[regular])
    return out


def diffusion_rate(setup, q, scale=1., with_scale=False):
    require(not isinstance(scale, bool) and math.isfinite(scale) and scale >= 0,
            'Invalid independent diffusion scale')
    r, z, masses, volume, a2, _, _ = geometry(setup)
    p = primitives(q, volume, a2, masses)
    result = np.zeros_like(np.asarray(q, dtype=float))
    arithmetic = np.zeros_like(result)
    if scale == 0:
        return (result, arithmetic) if with_scale else result
    y, rho, pressure, temperature = [p[k] for k in ('fraction', 'density', 'pressure', 'temperature')]
    require(np.all(temperature >= 235) and np.all(temperature <= 418),
            'Independent diffusion data outside 235–418 K')
    for axis in (1, 0):
        left = (slice(None), slice(None, -1)) if axis else (slice(None, -1), slice(None))
        right = (slice(None), slice(1, None)) if axis else (slice(1, None), slice(None))
        ta, tb, ya, yb = temperature[left], temperature[right], y[left], y[right]
        tf, pf = .5*(ta+tb), .5*(pressure[left]+pressure[right])
        require(np.all(tf >= 235) and np.all(tf <= 418), 'Independent diffusion data outside 235–418 K')
        df = scale*1e-4*101325/pf*np.exp(-11.097-45.486/tf+1.676*np.log(tf))
        rhof = 2*rho[left]*rho[right]/(rho[left]+rho[right])
        yf = .5*(ya+yb)
        mean_mass = 1/(yf/masses[0]+(1-yf)/masses[1])
        psi = (masses[1]-masses[0])/mean_mass*(np.log(pressure[right])-np.log(pressure[left]))
        if axis:
            area = 2*math.pi*np.diff(z)[:, None]*r[None, 1:-1]
            distance = (r[2:]-r[:-2])[None, :]/2
        else:
            area = np.broadcast_to(math.pi*np.diff(r*r), (len(z)-2, len(r)-1))
            distance = (z[2:]-z[:-2])[:, None]/2
        particles = rhof*df*area/distance*(bernoulli(psi)*ya*(1-yb)-bernoulli(-psi)*yb*(1-ya))
        enthalpy = 2.5*KB*tf*(1/masses[0]-1/masses[1])*particles
        finite(particles, 'species face flux')
        finite(enthalpy, 'enthalpy face flux')
        for component, flux in ((5, particles), (4, enthalpy)):
            result[component][left] -= flux
            result[component][right] += flux
            arithmetic[component][left] += abs(flux)
            arithmetic[component][right] += abs(flux)
    finite(result, 'diffusion rate')
    finite(arithmetic, 'diffusion arithmetic scale')
    return (result, arithmetic) if with_scale else result


def check_step(setup, old, new, dt, operator, conserved):
    require(not isinstance(dt, bool) and math.isfinite(dt) and dt > 0, 'Invalid independent timestep')
    _, _, masses, volume, a2, _, _ = geometry(setup)
    old, new = np.asarray(old, dtype=float), np.asarray(new, dtype=float)
    before, after = [primitives(q, volume, a2, masses) for q in (old, new)]
    r0, scale0 = operator(old)
    stage = old+dt*r0
    primitives(stage, volume, a2, masses)
    r1, scale1 = operator(stage)
    expected = .5*old+.5*(stage+dt*r1)
    residual = new-expected
    exchange = .5*dt*(abs(r0)+abs(r1))
    face_roundoff = 128*EPS*.5*dt*(scale0+scale1)
    allowance = 1e-8*exchange+128*EPS*(abs(old)+abs(new))+face_roundoff
    finite(allowance, 'local residual allowance')
    score = float(np.max(abs(residual)/np.maximum(allowance, 1e-300)))
    require(score <= 1, f'Independent local endpoint mismatch: score {score:g}')
    totals = np.sum(new-old, axis=(1, 2))
    total_allowance = 128*EPS*np.sum(abs(old)+abs(new), axis=(1, 2))
    finite(totals, 'closed totals')
    finite(total_allowance, 'closed-total allowance')
    require(np.all(abs(totals[conserved]) <= total_allowance[conserved]),
            'Independent closed species/mass/angular/energy balance failed')
    return dict(maxLocalScore=score, massResidualKg=float(totals[0]),
                angularResidualKgM2S=float(totals[3]), energyResidualJ=float(totals[4]),
                speciesResidualKg=float(totals[5]), minimumDensityKgM3=float(after['density'].min()),
                minimumInternalJ=float(after['internal'].min()),
                maxFaceRoundoffAllowance=float(np.max(face_roundoff)),
                maximumTemperatureChangeK=float(np.max(abs(after['temperature']-before['temperature']))))


def check_hydro(setup, old, new, dt):
    return check_step(setup, old, new, dt, lambda q: hydro_rate(setup, q, with_scale=True), [0, 3, 4, 5])


def check_diffusion(setup, old, new, dt, scale=1.):
    metrics = check_step(setup, old, new, dt, lambda q: diffusion_rate(setup, q, scale, with_scale=True), [0, 1, 2, 3, 4, 5])
    # Counterdiffusion changes neither mixture mass nor its common momentum.
    require(np.array_equal(np.asarray(old)[[0, 1, 2, 3]], np.asarray(new)[[0, 1, 2, 3]]),
            'Independent counterdiffusion changed mixture mass or momentum')
    return metrics


def check_magnetic(setup, old, new, dt, receipt):
    """Analytic Jtheta=-sigma_P B ur relaxation; no production imports."""
    require(not isinstance(dt, bool) and math.isfinite(dt) and dt > 0, 'Invalid independent magnetic timestep')
    _, _, masses, volume, a2, _, _ = geometry(setup)
    old, new = np.asarray(old, dtype=float), np.asarray(new, dtype=float)
    before, after = [primitives(q, volume, a2, masses) for q in (old, new)]
    sigma = np.asarray(setup['electrical']['sigmaPerpSM'], dtype=float).reshape(volume.shape)
    magnetic = setup['electrical']['magneticT']
    finite(sigma, 'magnetic conductivity')
    require(np.all(sigma >= 0) and not isinstance(magnetic, bool) and math.isfinite(magnetic),
            'Invalid independent magnetic parameters')
    exponent = sigma*magnetic**2*dt/before['density']
    finite(exponent, 'magnetic relaxation exponent')
    require(np.array_equal(old[[0, 2, 3, 4, 5]], new[[0, 2, 3, 4, 5]]),
            'Independent magnetic stage changed conserved field')
    expected = old[1]*np.exp(-exponent)
    allowance = 1e-8*abs(old[1]-expected)+128*EPS*(abs(old[1])+abs(new[1]))
    finite(allowance, 'magnetic momentum allowance')
    require(np.all(abs(new[1]-expected) <= allowance), 'Independent magnetic decay mismatch')
    kinetic_before = .5*old[1]**2/old[0]
    # Unlike subtracting two kinetic energies, this resolves tiny positive heat.
    heat = kinetic_before*(-np.expm1(-2*exponent))
    finite(heat, 'magnetic heat')
    actual_heat = np.asarray(receipt['jouleByCellJ'], dtype=float)
    require(actual_heat.shape == volume.shape and np.all(np.isfinite(actual_heat))
            and np.all(actual_heat >= 0), 'Invalid independent magnetic heat receipt')
    heat_allowance = (1e-8+128*EPS)*heat
    require(np.all(abs(actual_heat-heat) <= heat_allowance), 'Independent magnetic heat mismatch')
    total = float(math.fsum(heat.ravel()))
    actual_total = receipt['jouleJ']
    require(not isinstance(actual_total, bool) and math.isfinite(actual_total)
            and abs(actual_total-total) <= (1e-8+128*EPS)*total,
            'Independent magnetic total heat mismatch')
    require(receipt['externalWorkJ'] == 0 and receipt['angularImpulseKgM2S'] == 0,
            'Independent magnetic stage supplied work or angular momentum')
    thermal_residual = after['internal']-before['internal']-heat
    thermal_allowance = 1e-8*heat+128*EPS*(abs(old[4])+abs(new[4])+kinetic_before)
    finite(thermal_residual, 'magnetic thermal residual')
    finite(thermal_allowance, 'magnetic thermal allowance')
    require(np.all(abs(thermal_residual) <= thermal_allowance), 'Independent magnetic kinetic/heat mismatch')
    return dict(jouleJ=total, externalWorkJ=0., angularImpulseKgM2S=0.,
                maxMomentumResidualKgMPS=float(np.max(abs(new[1]-expected))),
                maxThermalResidualJ=float(np.max(abs(thermal_residual))))
