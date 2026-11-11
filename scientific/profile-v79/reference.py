"""Independent velocity-coordinate Stokes--Ohm finite-volume reference.

No production/primary-solver imports, fitted velocities or target-data inputs.
Radial electrical conductance uses face area / center distance; vector shear
uses a linear velocity reconstruction. Both differ from the primary solver's
logarithmic electrical and exact Couette half-cell resistances. Their common
continuum limit, rather than same-grid equality, is the comparison target.
"""
import math

import numpy as np
from scipy.sparse import bmat, coo_matrix, diags
from scipy.sparse.linalg import spsolve


def _segments(points, counts):
    return np.concatenate([np.linspace(a, b, count, endpoint=False)
                           for a, b, count in zip(points[:-1], points[1:], counts)]
                          + [np.array([points[-1]])])


def solve(manifest, beta, sigma, voltage, refinement):
    """Solve a prescribed-property half apparatus, without electrical fitting.

    sigma is parallel conductivity in S/m. Returned branchCurrentA is the
    current leaving the gas into the one modeled cathode. A caller may calibrate
    sigma against that electrical measurement, never against velocity targets.
    """
    if (not isinstance(refinement, int) or refinement < 1
            or not all(math.isfinite(x) for x in (beta, sigma, voltage))
            or beta < 0 or sigma <= 0):
        raise ValueError('Need positive integer refinement, conductivity and finite inputs')
    radius = manifest['radiusM']
    length = manifest['halfLengthM']
    cathode = manifest['cathodeRadiusM']
    anode_lo = manifest['anodeCenterM'] - manifest['anodeWidthM']/2
    anode_hi = manifest['anodeCenterM'] + manifest['anodeWidthM']/2
    mu, magnetic = manifest['viscosityPaS'], manifest['magneticT']
    if not (0 < cathode < radius and 0 < anode_lo < anode_hi < length and mu > 0):
        raise ValueError('Need ordered finite apparatus geometry and positive viscosity')
    r = _segments([0., cathode, radius], [4*refinement, 28*refinement])
    z = _segments([0., anode_lo, anode_hi, length],
                  [12*refinement, 4*refinement, 32*refinement])
    rc, zc = (r[:-1]+r[1:])/2, (z[:-1]+z[1:])/2
    nr, nz = len(rc), len(zc)
    n = nr*nz
    radii = np.tile(rc, nz)
    perpendicular = sigma/(1+beta*beta)
    electrical = []
    shear = []

    def wire(a, b, resistance, boundary=0., parts=(), kind=None):
        electrical.append((a, b, 1/resistance, boundary, tuple(parts), kind))

    def radial_part(cell, a, b):
        # Ω is represented by u_cell/r_cell within each integration half-cell.
        return cell, magnetic*(b*b-a*a)/(2*radii[cell])

    for j in range(nz):
        dz = z[j+1]-z[j]
        for i in range(nr):
            a = j*nr+i
            area = math.pi*(r[i+1]**2-r[i]**2)
            radial_moment = math.pi*(r[i+1]**4-r[i]**4)/2
            if i+1 < nr:
                b, face = a+1, r[i+1]
                distance = rc[i+1]-rc[i]
                wire(a, b, distance/(2*math.pi*face*dz*perpendicular), parts=(
                    radial_part(a, rc[i], face), radial_part(b, face, rc[i+1])))
                # τ_rθ = μ(du/dr - u/r), with u linearly interpolated at face.
                conductance = 2*math.pi*mu*dz*face*rc[i]*rc[i+1]/distance
                shear.append((a, b, conductance))
            if j+1 < nz:
                b, distance = a+nr, zc[j+1]-zc[j]
                wire(a, b, distance/(area*sigma))
                shear.append((a, b, mu*radial_moment/distance))
            if i == nr-1:
                distance = radius-rc[i]
                shear.append((a, None, 2*math.pi*mu*radius**2*dz*rc[i]/distance))
                if anode_lo <= zc[j] <= anode_hi:
                    wire(a, None, distance/(2*math.pi*radius*dz*perpendicular),
                         voltage, (radial_part(a, rc[i], radius),), 'anode')
            if j == nz-1:
                distance = length-zc[j]
                shear.append((a, None, mu*radial_moment/distance))
                if rc[i] < cathode:
                    wire(a, None, distance/(area*sigma), kind='cathode')
    # Incidence D maps potential to the oriented face potential drop. E maps
    # velocity to motional EMF. Force is -E.T @ current, its power adjoint.
    dr, dc, dv, er, ec, ev = [], [], [], [], [], []
    conductance = np.array([link[2] for link in electrical])
    boundary = np.array([link[3] for link in electrical])
    for edge, (a, b, _, _, parts, _) in enumerate(electrical):
        dr.append(edge); dc.append(a); dv.append(1.)
        if b is not None:
            dr.append(edge); dc.append(b); dv.append(-1.)
        for cell, weight in parts:
            er.append(edge); ec.append(cell); ev.append(weight)
    d = coo_matrix((dv, (dr, dc)), shape=(len(electrical), n)).tocsr()
    e = coo_matrix((ev, (er, ec)), shape=(len(electrical), n)).tocsr()
    sr, sc, sv = [], [], []
    for a, b, g in shear:
        sr.append(a); sc.append(a); sv.append(g/radii[a]**2)
        if b is not None:
            sr.extend([b, a, b]); sc.extend([b, b, a])
            sv.extend([g/radii[b]**2, -g/(radii[a]*radii[b]),
                       -g/(radii[a]*radii[b])])
    s = coo_matrix((sv, (sr, sc)), shape=(n, n)).tocsr()
    g = diags(conductance)
    a, c = d.T@g@d, d.T@g@e
    system = bmat([[a, c], [c.T, s+e.T@g@e]], format='csc')
    rhs = np.concatenate([d.T@(conductance*boundary),
                          e.T@(conductance*boundary)])
    answer = spsolve(system, rhs)
    if not np.all(np.isfinite(answer)):
        raise ArithmeticError('Independent Stokes--Ohm solution is nonfinite')
    phi, velocity = answer[:n], answer[n:]
    omega = velocity/radii
    current = conductance*(d@phi+e@velocity-boundary)
    charge = np.asarray(d.T@current).ravel()
    electrical_force = -np.asarray(e.T@current).ravel()
    momentum = np.asarray(s@velocity).ravel()-electrical_force
    joule = float(np.sum(current**2/conductance))
    viscous = float(velocity@(s@velocity))
    power = -float(boundary@current)
    drive_torque = float(radii@electrical_force)
    wall_torque = -sum(g*omega[a] for a, b, g in shear if b is None)
    cathode_current = sum(current[k] for k, link in enumerate(electrical)
                          if link[-1] == 'cathode')
    anode_current = sum(current[k] for k, link in enumerate(electrical)
                        if link[-1] == 'anode')
    midplane = omega.reshape(nz, nr)[0]
    chords = np.asarray(manifest['chordsM'])
    chord_velocity = []
    for chord in chords:
        if not 0 <= chord < radius:
            raise ValueError('Chord must intersect the modeled gas')
        path = np.sqrt(np.maximum(0., r[1:]**2-chord**2)) \
            - np.sqrt(np.maximum(0., r[:-1]**2-chord**2))
        chord_velocity.append(float(chord*np.dot(path, midplane)/sum(path)))
    return {
        'method': 'Independent velocity-coordinate FV Stokes--Ohm',
        'radialEdgesM': r.tolist(), 'axialEdgesM': z.tolist(),
        'radialCentersM': rc.tolist(), 'axialCentersM': zc.tolist(),
        'potentialV': phi.reshape(nz, nr).tolist(),
        'velocityMS': velocity.reshape(nz, nr).tolist(),
        'omegaRadS': omega.reshape(nz, nr).tolist(),
        'branchCurrentA': float(cathode_current), 'anodeCurrentA': float(anode_current),
        'chordsM': chords.tolist(), 'chordVelocityMS': chord_velocity,
        'localMidplaneVelocityMS': (rc*midplane).tolist(),
        'electrodePowerW': power, 'jouleW': joule, 'shearW': viscous,
        'driveTorqueNm': drive_torque, 'wallTorqueNm': float(wall_torque),
        'chargeResidualRelative': float(max(abs(charge))/max(abs(current).max(), 1e-30)),
        'momentumResidualRelative': float(max(abs(momentum))
                                          /max(abs(electrical_force).max(), 1e-30)),
        'powerResidualRelative': abs(power-joule-viscous)/max(abs(power), 1e-30),
        'torqueResidualRelative': abs(drive_torque+wall_torque)
                                 /max(abs(drive_torque), abs(wall_torque), 1e-30),
        'sigmaParallelSM': sigma, 'effectiveBeta': beta, 'bulkVoltageV': voltage,
        'refinement': refinement,
    }
