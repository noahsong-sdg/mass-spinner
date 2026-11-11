"""Exact radial motional-current relaxation, Etheta=0 and diagonal sigma.

Jtheta=-sigma B ur brakes radial motion. Lost radial kinetic energy becomes
positive Joule heat with zero external work; total energy stays unchanged.
"""
import math
import numpy as np


def advance(flow, q, dt, conductivity, magnetic_t):
    if isinstance(dt, bool) or not math.isfinite(dt) or dt <= 0 or not math.isfinite(magnetic_t):
        raise ValueError('Need finite field and positive timestep')
    sigma = flow.field(conductivity)
    if np.any(sigma < 0):
        raise ValueError('Conductivity must be nonnegative')
    p = flow.primitive(q)
    exponent = sigma*magnetic_t**2*dt/p['densityKgM3']
    if not np.all(np.isfinite(exponent)):
        raise ValueError('Unrepresentable magnetic relaxation')
    out = q.copy()
    out[1] = q[1]*np.exp(-exponent)
    heat = .5*q[1]**2/q[0]*(-np.expm1(-2*exponent))
    flow.primitive(out)
    return out, dict(jouleByCellJ=heat.tolist(), jouleJ=float(sum(heat.ravel())),
                     externalWorkJ=0., angularImpulseKgM2S=0.)
