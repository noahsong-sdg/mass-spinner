"""Conservative binary mass-average diffusion with pressure barodiffusion.

No centrifugal body drift is added: a shared acceleration cancels from the
Maxwell--Stefan force difference. Soret/Dufour effects are not modeled.
Ar self diffusion is an explicit approximation for the Ar36/Ar40 pair, not
lithium data. NIST TN 2279, Table 1a, gives the 235--418 K, 101325 Pa fit:
https://doi.org/10.6028/NIST.TN.2279 . Dilute-gas 1/p scaling is assumed.
"""
import math
import numpy as np

KB = 1.380649e-23


def _number(value, label, minimum=0.):
    if isinstance(value, (bool, np.bool_)) or not np.isscalar(value) or not math.isfinite(value) or value < minimum:
        raise ValueError(f'{label} must be finite and at least {minimum}')
    return float(value)


def bernoulli(value):
    """Positive B(x)=x/(exp(x)-1), including the removable zero limit."""
    x = np.asarray(value, dtype=float)
    if not np.all(np.isfinite(x)):
        raise ValueError('Nonfinite diffusion exponent')
    result = np.empty_like(x)
    small, large = abs(x) < 1e-5, x > 50.
    result[small] = 1-x[small]/2+x[small]**2/12-x[small]**4/720
    result[large] = x[large]*np.exp(-x[large])/(-np.expm1(-x[large]))
    regular = ~(small | large)
    result[regular] = x[regular]/np.expm1(x[regular])
    return result


def argon_diffusivity(temperature, pressure):
    t, p = np.broadcast_arrays(np.asarray(temperature, dtype=float), np.asarray(pressure, dtype=float))
    if not np.all(np.isfinite(t)) or not np.all(np.isfinite(p)) or np.any((t < 235) | (t > 418)) or np.any(p <= 0):
        raise ValueError('Ar diffusion fit requires 235--418 K and positive pressure')
    result = 1e-4*(101325./p)*np.exp(-11.097-45.486/t+1.676*np.log(t))
    if not np.all(np.isfinite(result)) or np.any(result <= 0):
        raise ArithmeticError('Unrepresentable positive Ar diffusivity')
    return result


def _faces(flow, q, scale):
    """Return face mass/enthalpy flux and a conservative departure-rate bound."""
    scale = _number(scale, 'Diffusivity scale')
    state = flow.primitive(q)
    shape = q.shape[1:]
    radial = np.zeros((2, shape[0], shape[1]+1))
    axial = np.zeros((2, shape[0]+1, shape[1]))
    departure, outgoing_heat = np.zeros(shape), np.zeros(shape)
    if scale == 0:
        return radial, axial, departure, outgoing_heat, state
    rho, t, p, y = [state[k] for k in ('densityKgM3', 'temperatureK', 'pressurePa', 'massFraction')]
    # Admission applies to every gas cell, not only an averaged face value.
    argon_diffusivity(t, p)
    m1, m2 = flow.masses

    def face(a, b, area, distance):
        tf, pf, yf = (t[a]+t[b])/2, (p[a]+p[b])/2, (y[a]+y[b])/2
        mean_mass = 1/(yf/m1+(1-yf)/m2)
        psi = (m2-m1)/mean_mass*(np.log(p[b])-np.log(p[a]))
        forward, backward = bernoulli(psi), bernoulli(-psi)
        rhof = 2*rho[a]*rho[b]/(rho[a]+rho[b])
        conductance = rhof*scale*argon_diffusivity(tf, pf)*area/distance
        mass = conductance*(forward*y[a]*(1-y[b])-backward*y[b]*(1-y[a]))
        # Both opposing species fluxes use the same thermodynamic face T.
        # Hence relabeling identical species produces exactly zero heat flux.
        heat = 2.5*KB*tf*(1/m1-1/m2)*mass
        bound = conductance*np.maximum(forward, backward)
        departure[a] += bound/q[0][a]
        departure[b] += bound/q[0][b]
        outgoing_heat[a] += np.maximum(heat, 0.)
        outgoing_heat[b] += np.maximum(-heat, 0.)
        return mass, heat

    a, b = (slice(None), slice(None, -1)), (slice(None), slice(1, None))
    area = 2*np.pi*flow.r[1:-1][None, :]*np.diff(flow.z)[:, None]
    radial[:, :, 1:-1] = face(a, b, area, (flow.r[2:]-flow.r[:-2])[None, :]/2)
    a, b = (slice(None, -1), slice(None)), (slice(1, None), slice(None))
    area = np.pi*np.diff(flow.r**2)[None, :]
    axial[:, 1:-1, :] = face(a, b, area, (flow.z[2:]-flow.z[:-2])[:, None]/2)
    if not all(np.all(np.isfinite(v)) for v in (radial, axial, departure, outgoing_heat)):
        raise ArithmeticError('Nonfinite binary diffusion flux or rate')
    return radial, axial, departure, outgoing_heat, state


def fluxes(flow, q, scale=1.):
    """Outward-oriented F1, enthalpy-W faces; F2 is exactly -F1."""
    return _faces(flow, q, scale)[:2]


def rate(flow, q, scale=1.):
    radial, axial = fluxes(flow, q, scale)
    net = radial[:, :, :-1]-radial[:, :, 1:]+axial[:, :-1, :]-axial[:, 1:, :]
    result = np.zeros_like(q, dtype=float)
    result[5], result[4] = net[0], net[1]
    return result


def stable_dt(flow, q, scale=1., cfl=.2):
    cfl = _number(cfl, 'Diffusion CFL', np.finfo(float).tiny)
    if cfl > 1:
        raise ValueError('Diffusion CFL cannot exceed one')
    _, _, departure, outgoing_heat, state = _faces(flow, q, scale)
    limits = [1/float(np.max(departure))] if np.any(departure > 0) else []
    if np.any(outgoing_heat > 0):
        limits.append(float(np.min(state['thermalJ'][outgoing_heat > 0]/outgoing_heat[outgoing_heat > 0])))
    return cfl*min(limits) if limits else math.inf


def advance_with_receipt(flow, q, dt, scale=1.):
    """SSPRK2, closed walls, with no clipping or inventory renormalization."""
    dt = _number(dt, 'Timestep')
    flow.primitive(q)
    scale = _number(scale, 'Diffusivity scale')
    if dt == 0 or scale == 0:
        return q.copy(), {'dtS': dt, 'radialTransfers': np.zeros((2, q.shape[1], q.shape[2]+1)).tolist(),
                          'axialTransfers': np.zeros((2, q.shape[1]+1, q.shape[2])).tolist()}
    if dt > stable_dt(flow, q, scale, cfl=1.):
        raise ValueError('Diffusion timestep exceeds species/enthalpy positivity bound')
    r0, z0 = fluxes(flow, q, scale)
    first = rate(flow, q, scale)
    stage = q+dt*first
    flow.primitive(stage)
    if dt > stable_dt(flow, stage, scale, cfl=1.):
        raise ValueError('Diffusion stage exceeds species/enthalpy positivity bound')
    r1, z1 = fluxes(flow, stage, scale)
    new = q+.5*dt*(first+rate(flow, stage, scale))
    flow.primitive(new)
    return new, {'dtS': dt, 'radialTransfers': (.5*dt*(r0+r1)).tolist(),
                 'axialTransfers': (.5*dt*(z0+z1)).tolist()}


def advance(flow, q, dt, scale=1.):
    return advance_with_receipt(flow, q, dt, scale)[0]
