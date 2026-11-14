"""Read-only instantaneous Euler transport diagnosis; no trajectory or new gates."""
import gzip
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy.interpolate import RegularGridInterpolator

R_QUERY = np.linspace(.012, .024, 49)
Z_QUERY = np.linspace(.220, .238, 37)
TIMES = [0., 1e-6, 2e-6, 4e-6]


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read_case(prediction, digest, source_root):
    """Caller must independently admit this full V107 equal-Ar case first."""
    prediction, source_root = Path(prediction).resolve(), Path(source_root).resolve()
    raw = prediction.read_bytes()
    if sha(raw) != digest:
        raise ValueError('Prediction seal mismatch')
    packet = json.loads(raw)
    if (packet['phase'] != 'full' or packet['timesS'] != TIMES or len(packet['cases']) != 1
            or packet['cases'][0]['completed'] is not True or not packet['sourceSHA256']):
        raise ValueError('Require a complete admitted full case')
    for relative, expected in packet['sourceSHA256'].items():
        path = (source_root/relative).resolve()
        if not path.is_relative_to(source_root) or sha(path.read_bytes()) != expected:
            raise ValueError('Producer source seal/path mismatch')
    entry = packet['cases'][0]['fieldPacket']
    path = (prediction.parent/entry['path']).resolve()
    if path.parent != prediction.parent/'fields':
        raise ValueError('Field path escapes case')
    packed = path.read_bytes()
    if sha(packed) != entry['sha256']:
        raise ValueError('Packed field seal mismatch')
    raw = gzip.decompress(packed)
    if sha(raw) != entry['rawSHA256']:
        raise ValueError('Raw field seal mismatch')
    state = json.loads(raw)
    if [s['timeS'] for s in state['snapshots']] != TIMES:
        raise ValueError('Changed snapshot clocks')
    return packet, state


def centered_reference(f, p, axis):
    """Distance-weighted cell rho*u reference; closed boundary flux is zero."""
    value = p['densityKgM3']*p['vrMPS' if axis == 2 else 'vzMPS']
    native = f.mean_r if axis == 2 else (f.z[:-1]+f.z[1:])/2
    edges = f.r if axis == 2 else f.z
    value = np.moveaxis(value, axis-1, -1)
    out = np.zeros((*value.shape[:-1], len(edges)))
    weight = (edges[1:-1]-native[:-1])/np.diff(native)
    out[..., 1:-1] = value[..., :-1]*(1-weight)+value[..., 1:]*weight
    return np.moveaxis(out, -1, axis-1)


def rates(f, q):
    """Bookkeeping references are not exact physical flux or pure diffusion."""
    p = f.primitive(q)
    actual = f.fluxes(q)
    fields, ledgers, faces = {}, {}, {}
    for axis, tag, area, flux in ((2, 'radial', f.radial_area, actual[0]),
                                   (1, 'axial', f.axial_area, actual[1])):
        left, right = f._face_states(p, axis)
        normal = 2 if axis == 2 else 3
        cell = centered_reference(f, p, axis)*area
        reconstructed = .5*(left[0]*left[normal]+right[0]*right[normal])*area
        parts = dict(cellReference=cell, reconstructionDifference=reconstructed-cell,
                     riemannReferenceDifference=flux[0]-reconstructed)
        def divergence(value):
            return -np.diff(value, axis=axis-1)/f.volume
        for name, value in parts.items():
            fields[tag+'_'+name] = divergence(value)
        fields[tag+'_total'] = divergence(flux[0])
        boundary = float(np.sum(np.take(flux[0], 0, axis=axis-1))
                         -np.sum(np.take(flux[0], -1, axis=axis-1)))
        ledgers[tag] = dict(boundaryMassRateKgS=boundary,
            integratedMassRateKgS=float(np.sum(fields[tag+'_total']*f.volume)),
            maximumBoundaryFluxKgS=float(max(np.max(abs(np.take(flux[0], i, axis=axis-1)))
                                            for i in (0, -1))))
        faces[tag+'_relativePressureJump'] = 2*(right[1]-left[1])/(right[1]+left[1])
        faces[tag+'_relativeDensityJump'] = 2*(right[0]-left[0])/(right[0]+left[0])
    rhs = f.rate(q)
    fields['total'] = rhs[0]/f.volume
    # Eulerian derivative of cell momentum/mass, not material acceleration.
    fields['radialCellVelocityRateMPS2'] = (rhs[1]-p['vrMPS']*rhs[0])/q[0]
    fields['axialCellVelocityRateMPS2'] = (rhs[2]-p['vzMPS']*rhs[0])/q[0]
    components = [v for k, v in fields.items() if k.endswith(('Reference', 'Difference'))]
    defect = sum(components)-fields['total']
    ledgers['maximumDecompositionDefectKgM3S'] = float(np.max(abs(defect)))
    ledgers['maximumAbsoluteTotalDensityRateKgM3S'] = float(np.max(abs(fields['total'])))
    return fields, faces, ledgers


def project(f, values, points):
    """Scalar Q1 convention: volume centroids and constant boundary padding."""
    r = np.r_[f.r[0], f.mean_r, f.r[-1]]
    z = np.r_[f.z[0], (f.z[:-1]+f.z[1:])/2, f.z[-1]]
    return RegularGridInterpolator((z, r), np.pad(values, 1, mode='edge'))(points)


def diagnose(f, state):
    rr, zz = np.meshgrid(R_QUERY, Z_QUERY)
    points = np.column_stack((zz.ravel(), rr.ravel()))
    initial = np.asarray(state['snapshots'][0]['densityKgM3'])
    rows = []
    for snapshot in state['snapshots']:
        q = np.asarray(snapshot['q'], dtype=float)
        p = f.primitive(q)
        for name, value in p.items():
            if not np.array_equal(value, np.asarray(snapshot[name])):
                raise ValueError('Saved primitive mismatch: '+name)
        before = q.copy()
        fields, faces, ledgers = rates(f, q)
        sampled = {name: project(f, value, points) for name, value in fields.items()}
        for name in ('densityKgM3', 'pressurePa', 'temperatureK', 'vrMPS', 'vzMPS', 'omegaRadS'):
            sampled[name] = project(f, p[name], points)
        sampled['densityIncrementKgM3'] = project(f, p['densityKgM3']-initial, points)
        for name in ('densityKgM3', 'pressurePa'):
            dz, dr = np.gradient(p[name], (f.z[:-1]+f.z[1:])/2, f.mean_r)
            sampled[name+'_radialGradient'] = project(f, dr, points)
            sampled[name+'_axialGradient'] = project(f, dz, points)
        for name, value in faces.items():
            knots = (((f.z[:-1]+f.z[1:])/2, f.r) if name.startswith('radial')
                     else (f.z, f.mean_r))
            sampled[name] = RegularGridInterpolator(knots, value)(points)
        part_names = [k for k in fields if k.endswith(('Reference', 'Difference'))]
        ledgers['maximumProjectedClosureDefectKgM3S'] = float(np.max(abs(
            sum(sampled[k] for k in part_names)-sampled['total'])))
        if not np.array_equal(q, before) or any(not np.isfinite(v).all() for v in sampled.values()):
            raise ValueError('Mutation or nonfinite diagnostic')
        rows.append(dict(timeS=snapshot['timeS'], ledgers=ledgers,
            samples={name: value.reshape(rr.shape).tolist() for name, value in sampled.items()}))
    return dict(scope='Instantaneous saved-state Euler diagnosis; no accumulated attribution or qualification',
        reference='Distance-weighted cell rho*u; mean reconstructed rho*u; original HLLC flux. '
                  'Their differences include physical acoustic transport, not just stabilization.',
        gradient='Finite differences of cell-average values at volume centroids; not exact continuum gradients',
        sampling='Fixed physical point grid, scalar Q1 with edge padding; not the convergence norm',
        sourceSHA256=sha(Path(__file__).read_bytes()), radialQueryM=R_QUERY.tolist(),
        axialQueryM=Z_QUERY.tolist(), snapshots=rows)
