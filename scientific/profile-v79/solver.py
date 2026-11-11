"""Steady azimuthal shear/charge, adapting the live power-adjoint network.

Scientific execution is restricted to safe-dev. This module has no measured-
velocity input, energy equation, radial flow, or independent discharge closure.
"""
import numpy as np
from scipy.optimize import brentq
from scipy.sparse import bmat, coo_matrix, diags
from scipy.sparse.linalg import spsolve


def grid(m, refinement):
    if refinement not in m['refinements']:
        raise ValueError('Undeclared refinement')
    def segments(points, counts):
        return np.concatenate([np.linspace(a, b, n * refinement + 1)[:-1]
                               for a, b, n in zip(points, points[1:], counts)]
                              + [np.array([points[-1]])])
    r = segments([0, m['cathodeRadiusM'], m['radiusM']], [4, 28])
    a = m['anodeCenterM'] - m['anodeWidthM'] / 2
    b = m['anodeCenterM'] + m['anodeWidthM'] / 2
    z = segments([0, a, b, m['halfLengthM']], [12, 4, 32])
    return r, z


def solve(m, beta, sigma, voltage, refinement, magnetic=None):
    if not np.isfinite([beta, sigma, voltage]).all() or beta < 0 or sigma <= 0:
        raise ValueError('Finite nonnegative anisotropy, positive conductivity required')
    B = m['magneticT'] if magnetic is None else magnetic
    mu = m['viscosityPaS']
    if not np.isfinite(B) or not np.isfinite(mu) or mu <= 0:
        raise ValueError('Finite B and positive viscosity required')
    r, z = grid(m, refinement)
    rc = np.sqrt((r[:-1] ** 2 + r[1:] ** 2) / 2)
    zc = (z[:-1] + z[1:]) / 2
    nr, nz = len(rc), len(zc)
    n = nr * nz
    # Link orientation: cell a -> cell b or electrode. T maps Omega to the
    # negative motional EMF; T.T maps exactly the same current to cell torque.
    drow, dcol, dval, trow, tcol, tval = [], [], [], [], [], []
    resistance, boundary_v, labels = [], [], []
    sr, sc, sv = [], [], []

    def current(a, b, resistance_value, parts=(), potential=0., label=None):
        link = len(resistance)
        drow.append(link); dcol.append(a); dval.append(1.)
        if b is not None:
            drow.append(link); dcol.append(b); dval.append(-1.)
        for cell, torque in parts:
            trow.append(link); tcol.append(cell); tval.append(torque)
        resistance.append(resistance_value)
        boundary_v.append(potential)
        labels.append(label)

    def shear(a, b, conductance):
        sr.append(a); sc.append(a); sv.append(conductance)
        if b is not None:
            sr.extend([b, a, b]); sc.extend([b, b, a])
            sv.extend([conductance, -conductance, -conductance])

    def radial_resistance(a, b, dz):
        return np.log(b / a) / (2 * np.pi * dz * sigma / (1 + beta**2))

    def radial_shear_resistance(a, b, dz):
        return (b*b - a*a) / (4 * np.pi * mu * dz * a*a * b*b)

    for j in range(nz):
        dz = z[j+1] - z[j]
        for i in range(nr):
            a = j*nr+i
            area = np.pi * (r[i+1]**2-r[i]**2)
            moment = np.pi/2 * (r[i+1]**4-r[i]**4)
            if i < nr-1:
                current(a, a+1, radial_resistance(rc[i], rc[i+1], dz),
                        [(a, -B*(r[i+1]**2-rc[i]**2)/2),
                         (a+1, -B*(rc[i+1]**2-r[i+1]**2)/2)])
                shear(a, a+1, 1/radial_shear_resistance(rc[i], rc[i+1], dz))
            if j < nz-1:
                current(a, a+nr, (zc[j+1]-zc[j])/(area*sigma))
                shear(a, a+nr, mu*moment/(zc[j+1]-zc[j]))
            if i == nr-1:
                shear(a, None, 1/radial_shear_resistance(rc[i], r[-1], dz))
                if abs(zc[j]-m['anodeCenterM']) < m['anodeWidthM']/2:
                    current(a, None, radial_resistance(rc[i], r[-1], dz),
                            [(a, -B*(r[-1]**2-rc[i]**2)/2)], voltage, 'anode')
            if j == nz-1:
                shear(a, None, mu*moment/(z[-1]-zc[j]))
                if r[i+1] <= m['cathodeRadiusM']*(1+1e-12):
                    current(a, None, (z[-1]-zc[j])/(area*sigma), label='cathode')
    count = len(resistance)
    D = coo_matrix((dval, (drow, dcol)), shape=(count, n)).tocsr()
    T = coo_matrix((tval, (trow, tcol)), shape=(count, n)).tocsr()
    G = diags(1/np.asarray(resistance))
    S = coo_matrix((sv, (sr, sc)), shape=(n, n)).tocsr()
    v = np.asarray(boundary_v)
    A = D.T @ G @ D
    C = D.T @ G @ T
    matrix = bmat([[A, -C], [-C.T, S + T.T @ G @ T]], format='csc')
    rhs = np.concatenate([D.T @ G @ v, -T.T @ G @ v])
    # Symmetric unit scaling improves conditioning without changing equations.
    scale = diags(1/np.sqrt(matrix.diagonal()))
    x = scale @ spsolve((scale @ matrix @ scale).tocsc(), scale @ rhs)
    phi, omega = x[:n], x[n:]
    amps = np.asarray(G @ (D @ phi - v - T @ omega))
    torque = np.asarray(T.T @ amps)
    currents = {name: float(sum(a for a, label in zip(amps, labels) if label == name))
                for name in ('cathode', 'anode')}
    electrical = float(-v @ amps)
    joule = float(np.asarray(resistance) @ amps**2)
    viscous = float(omega @ S @ omega)
    angular_residual = float(np.sum(S @ omega) - np.sum(torque))
    charge = float(np.max(np.abs(D.T @ amps)))
    power_scale = max(abs(electrical), abs(joule)+abs(viscous), np.finfo(float).tiny)
    current_scale = max(abs(currents['cathode']), abs(currents['anode']), np.finfo(float).tiny)
    torque_scale = max(float(np.sum(np.abs(torque))), np.finfo(float).tiny)
    return {'r': r, 'z': z, 'omega': omega.reshape(nz, nr),
            'potential': phi.reshape(nz, nr), 'currentsA': currents,
            'electrodePowerW': electrical, 'jouleW': joule, 'viscousW': viscous,
            'chargeResidualRelative': charge/current_scale,
            'boundaryResidualRelative': abs(sum(currents.values()))/current_scale,
            'powerResidualRelative': abs(electrical-joule-viscous)/power_scale,
            'angularResidualRelative': abs(angular_residual)/torque_scale if B != 0 else 0.,
            'linearResidualRelative': float(np.linalg.norm(matrix@x-rhs)/max(np.linalg.norm(rhs), np.finfo(float).tiny))}


def calibrate(m, beta, voltage, refinement):
    """Electrical-only conditioning; no observation array is accepted."""
    cache = {}
    def residual(log_sigma):
        cache[log_sigma] = solve(m, beta, np.exp(log_sigma), voltage, refinement)
        return cache[log_sigma]['currentsA']['cathode'] - m['branchCurrentA']
    lo, hi = np.log(m['sigmaBracketSM'])
    root = brentq(residual, lo, hi, xtol=2e-10)
    result = cache.get(root)
    if result is None:
        result = solve(m, beta, np.exp(root), voltage, refinement)
    return float(np.exp(root)), result


def observe(result, chords):
    """Piecewise constant Omega, exact uniform-local-emissivity chord weights."""
    r, w = result['r'], result['omega'][0]
    values = []
    for chord in chords:
        b = abs(chord)
        if not np.isfinite(chord) or b >= r[-1]:
            raise ValueError('Chord must intersect gas')
        a = np.maximum(r[:-1], b)
        hi = r[1:]
        lengths = np.sqrt(np.maximum(hi*hi-b*b, 0))-np.sqrt(np.maximum(a*a-b*b, 0))
        lengths = np.maximum(lengths, 0)
        values.append(float(chord*np.dot(lengths, w)/sum(lengths)))
    return values
