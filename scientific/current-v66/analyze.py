"""Independent current/work reconstruction and frozen gates; safe-dev only.

CLI: analyze.py CASES.json PRODUCTION.json FIPY.json NEW_ANALYSIS.json
No production imports. Failed gates are written before returning exit1.
"""
import hashlib
import json
import math
from pathlib import Path
import sys

import numpy as np


def validate_links(inputs, production, fipy, input_hash):
    ids = [c['id'] for c in inputs['cases']]
    if not ids or len(set(ids)) != len(ids):
        raise ValueError('Frozen inputs require distinct nonempty case identities')
    for packet in (production, fipy):
        if packet['sourceSHA256'] != input_hash:
            raise ValueError('Stale current reference input hash')
        if [c['id'] for c in packet['cases']] != ids:
            raise ValueError('Case identity/order differs from frozen input')


def ratio(error, scale):
    if scale == 0:
        return 0. if error == 0 else math.inf
    return abs(float(error))/abs(float(scale))


def canonical_potential(spec, result):
    boundary = [v for key in ('innerVoltageV', 'outerVoltageV', 'lowerVoltageV', 'upperVoltageV') for v in spec[key] if v is not None]
    reference = float(boundary[0])
    absolute = np.asarray(result['potentialV'], dtype=float)
    if 'relativePotentialV' in result:
        relative = np.asarray(result['relativePotentialV'], dtype=float)
        result_reference = float(result['voltageReferenceV'])
        if relative.shape != absolute.shape or not np.isfinite(relative).all() or not math.isfinite(result_reference):
            raise ValueError('Invalid canonical relative potential')
        if not np.allclose(relative+result_reference, absolute, rtol=0, atol=8*np.finfo(float).eps*max(1., float(np.max(abs(absolute))))):
            raise ValueError('Absolute potential differs from relative potential and gauge')
        relative = relative+(result_reference-reference)
    else:
        relative = absolute-reference
    if not np.isfinite(relative).all():
        raise ValueError('Nonfinite potential')
    return relative, reference


def radial_centers(edges, mode):
    edges = np.asarray(edges, dtype=float)
    if mode == 'integrated':
        return np.sqrt((edges[:-1]**2+edges[1:]**2)/2)
    if mode == 'fipy':
        return (edges[:-1]+edges[1:])/2
    raise ValueError('Unknown electrical discretization')


def collocated_reference_potential(spec, result):
    """Interpolate native FiPy values to production's physical radial points."""
    r = np.asarray(spec['radialEdgesM'], dtype=float)
    native, target = radial_centers(r, 'fipy'), radial_centers(r, 'integrated')
    nz = len(spec['axialEdgesM'])-1
    phi, reference = canonical_potential(spec, result)
    phi = phi.reshape(nz, len(native))
    omega = np.asarray(spec['omegaRadS']).reshape(phi.shape)
    rows = []
    for j, row in enumerate(phi):
        outer_voltage = spec['outerVoltageV'][j]
        outer = (outer_voltage-reference if outer_voltage is not None else
                 row[-1]+spec['magneticT']*r[-1]*omega[j, -1]*(r[-1]-native[-1]))
        rows.append(np.interp(target, np.append(native, r[-1]), np.append(row, outer)))
    return np.asarray(rows).ravel()


def reconstruct(spec, result, mode):
    r, z = np.asarray(spec['radialEdgesM']), np.asarray(spec['axialEdgesM'])
    nr, nz = len(r)-1, len(z)-1
    rc, zc = radial_centers(r, mode), (z[:-1]+z[1:])/2
    phi, reference = canonical_potential(spec, result)
    if phi.shape != (nr*nz,):
        raise ValueError('Potential/grid shape mismatch')
    phi = phi.reshape(nz, nr)
    sigma_r = np.asarray(spec['sigmaPerpSM']).reshape(nz, nr)
    sigma_z = np.asarray(spec['sigmaParallelSM']).reshape(nz, nr)
    omega = np.asarray(spec['omegaRadS']).reshape(nz, nr)
    magnetic = spec['magneticT']
    radial_current, axial_current = np.zeros((nz, nr+1)), np.zeros((nz+1, nr))
    cell_heat, cell_torque = np.zeros((nz, nr)), np.zeros((nz, nr))
    joule, mechanical, electrical = 0., 0., 0.
    boundary_currents = []
    for j in range(nz):
        for face in range(nr+1):
            boundary_voltage = spec['innerVoltageV'][j] if face == 0 else spec['outerVoltageV'][j] if face == nr else None
            if face in (0, nr) and boundary_voltage is None:
                continue
            indices = ([face-1] if face else [])+([face] if face < nr else [])
            segments = [(rc[i], r[face]) if i < face else (r[face], rc[i]) for i in indices]
            if mode == 'integrated':
                resistances = [math.log(b/a)/(2*math.pi*(z[j+1]-z[j])*sigma_r[j, i]) for i, (a, b) in zip(indices, segments)]
                emfs = [magnetic*omega[j, i]*(b*b-a*a)/2 for i, (a, b) in zip(indices, segments)]
                emf = math.fsum(emfs)
            else:
                area = 2*math.pi*r[face]*(z[j+1]-z[j])
                resistances = [(b-a)/(sigma_r[j, i]*area) for i, (a, b) in zip(indices, segments)]
                widths = [b-a for a, b in segments]
                face_omega = omega[j, indices[0]] if len(indices) == 1 else (omega[j, indices[0]]*widths[1]+omega[j, indices[1]]*widths[0])/sum(widths)
                emf = magnetic*r[face]*face_omega*sum(widths)
            left = phi[j, face-1] if face else boundary_voltage-reference
            right = phi[j, face] if face < nr else boundary_voltage-reference
            current = (left-right+emf)/math.fsum(resistances)
            radial_current[j, face] = current
            joule += current*current*math.fsum(resistances); mechanical -= current*emf
            if mode == 'integrated':
                for i, (a, b), resistance in zip(indices, segments, resistances):
                    cell_heat[j, i] += current*current*resistance
                    cell_torque[j, i] -= current*magnetic*(b*b-a*a)/2
            if face in (0, nr):
                outward = current if face else -current
                boundary_currents.append(outward); electrical -= (boundary_voltage-reference)*outward
    for face in range(nz+1):
        for i in range(nr):
            boundary_voltage = spec['lowerVoltageV'][i] if face == 0 else spec['upperVoltageV'][i] if face == nz else None
            if face in (0, nz) and boundary_voltage is None:
                continue
            indices = ([face-1] if face else [])+([face] if face < nz else [])
            widths = [z[face]-zc[j] if j < face else zc[j]-z[face] for j in indices]
            area = math.pi*(r[i+1]**2-r[i]**2)
            resistances = [width/(sigma_z[j, i]*area) for j, width in zip(indices, widths)]
            lower = phi[face-1, i] if face else boundary_voltage-reference
            upper = phi[face, i] if face < nz else boundary_voltage-reference
            current = (lower-upper)/math.fsum(resistances)
            axial_current[face, i] = current; joule += current*current*math.fsum(resistances)
            for j, resistance in zip(indices, resistances):
                cell_heat[j, i] += current*current*resistance
            if face in (0, nz):
                outward = current if face else -current
                boundary_currents.append(outward); electrical -= (boundary_voltage-reference)*outward
    residual = radial_current[:, 1:]-radial_current[:, :-1]+axial_current[1:]-axial_current[:-1]
    return {'potential': phi.ravel(), 'radial': radial_current, 'axial': axial_current,
            'cellResidual': residual.ravel(), 'heat': cell_heat.ravel(), 'torque': cell_torque.ravel(),
            'jouleW': joule, 'mechanicalW': mechanical, 'electrodePowerW': electrical,
            'boundary': boundary_currents, 'currentScale': math.fsum(abs(v) for v in boundary_currents),
            'powerScale': abs(joule)+abs(mechanical)+abs(electrical)}


def exact_coaxial(spec, mode='integrated'):
    r, z = spec['radialEdgesM'], spec['axialEdgesM']
    length, inner, outer = z[-1]-z[0], r[0], r[-1]
    omega, sigma, magnetic = spec['omegaRadS'][0], spec['sigmaPerpSM'][0], spec['magneticT']
    vin, vout = spec['innerVoltageV'][0], spec['outerVoltageV'][0]
    resistance = math.log(outer/inner)/(2*math.pi*length*sigma)
    emf = magnetic*omega*(outer*outer-inner*inner)/2
    current = (vin-vout+emf)/resistance
    centers = radial_centers(r, mode)
    potential = [vin-current*math.log(at/inner)/(2*math.pi*length*sigma)+magnetic*omega*(at*at-inner*inner)/2 for at in centers]
    return {'currentA': current, 'potentialV': potential*((len(z)-1)),
            'jouleW': current*current*resistance, 'mechanicalW': -current*emf,
            'electrodePowerW': current*(vin-vout)}


def analyze(inputs, production, fipy):
    rows, gates = [], []
    def gate(name, error, scale, limit):
        value = ratio(error, scale)
        gates.append({'name': name, 'value': value if math.isfinite(value) else None,
                      'limit': limit, 'passed': math.isfinite(value) and value <= limit})
    for spec, prod, ref in zip(inputs['cases'], production['cases'], fipy['cases']):
        p, f = reconstruct(spec, prod, 'integrated'), reconstruct(spec, ref, 'fipy')
        row = {'id': spec['id'], 'kind': spec['kind'], 'radialCells': len(spec['radialEdgesM'])-1,
               'axialCells': len(spec['axialEdgesM'])-1, 'checks': {}}
        nr, nz = row['radialCells'], row['axialCells']
        for label, result, independent in (('kernel', prod, p), ('fipy', ref, f)):
            scale, power_scale = independent['currentScale'], independent['powerScale']
            for quantity in ('jouleW', 'mechanicalW', 'electrodePowerW'):
                gate(spec['id']+' '+label+' reconstructed '+quantity, result[quantity]-independent[quantity], power_scale, 1e-9)
            gate(spec['id']+' '+label+' cell charge', np.max(abs(independent['cellResidual'])), scale, 1e-9)
            gate(spec['id']+' '+label+' net boundary charge', math.fsum(independent['boundary']), scale, 1e-9)
            gate(spec['id']+' '+label+' power identity', independent['electrodePowerW']-independent['jouleW']-independent['mechanicalW'], power_scale, 1e-9)
            gate(spec['id']+' '+label+' reported charge maximum', result['maxCellCurrentResidualA']-float(np.max(abs(independent['cellResidual']))), scale, 1e-9)
            gate(spec['id']+' '+label+' reported net boundary', result['netBoundaryCurrentA']-math.fsum(independent['boundary']), scale, 1e-9)
            if independent['jouleW'] < 0:
                raise ValueError('Negative dissipative Joule heating')
            row['checks'][label] = {'currentScaleA': scale, 'powerScaleW': power_scale,
                                     'maxCellChargeOverScale': ratio(np.max(abs(independent['cellResidual'])), scale),
                                     'powerResidualOverScale': ratio(independent['electrodePowerW']-independent['jouleW']-independent['mechanicalW'], power_scale)}
        for key, reconstruction in (('torqueNm', p['torque']), ('jouleByCellW', p['heat'])):
            scale = max(abs(p['torque'])) if key == 'torqueNm' else p['powerScale']
            gate(spec['id']+' kernel reconstructed '+key, np.max(abs(np.asarray(prod[key])-reconstruction)), scale, 1e-9)
        supplied_radial = np.asarray(ref['radialCurrentA']).reshape(nz, nr+1)
        supplied_axial = np.asarray(ref['axialCurrentA']).reshape(nz+1, nr)
        gate(spec['id']+' FiPy exported radial current', np.max(abs(supplied_radial-f['radial'])), f['currentScale'], 1e-9)
        gate(spec['id']+' FiPy exported axial current', np.max(abs(supplied_axial-f['axial'])), f['currentScale'], 1e-9)
        insulating = []
        for key, values in (('innerVoltageV', -supplied_radial[:, 0]), ('outerVoltageV', supplied_radial[:, -1]),
                             ('lowerVoltageV', -supplied_axial[0]), ('upperVoltageV', supplied_axial[-1])):
            insulating += [abs(v) for v, boundary in zip(values, spec[key]) if boundary is None]
        gate(spec['id']+' FiPy insulating current', max(insulating, default=0.), f['currentScale'], 1e-9)
        finite_voltage = [v for key in ('innerVoltageV', 'outerVoltageV', 'lowerVoltageV', 'upperVoltageV') for v in spec[key] if v is not None]
        motional = abs(spec['magneticT'])*max(abs(v) for v in spec['omegaRadS'])*(spec['radialEdgesM'][-1]**2-spec['radialEdgesM'][0]**2)/2
        voltage_scale = max(finite_voltage)-min(finite_voltage)+motional
        power_scale = max(p['powerScale'], f['powerScale'])
        row['nativeIndexPotentialDifferenceOverScale'] = ratio(np.max(abs(p['potential']-f['potential'])), voltage_scale)
        collocated = collocated_reference_potential(spec, ref)
        row['potentialDifferenceOverScale'] = ratio(np.max(abs(p['potential']-collocated)), voltage_scale)
        row['potentialComparison'] = 'FiPy linear interpolation in physical r to q-centred production points'
        row['powerDifferencesOverCombinedScale'] = {key: ratio(prod[key]-ref[key], power_scale) for key in ('jouleW', 'mechanicalW', 'electrodePowerW')}
        if spec['kind'] in ('coaxial', 'motional'):
            exact = exact_coaxial(spec)
            for label, result, independent in (('kernel', prod, p), ('fipy', ref, f)):
                current = float(np.sum(independent['radial'][:, -1]))
                continuum_error = max([ratio(current-exact['currentA'], exact['currentA'])]+
                                     [ratio(result[key]-exact[key], sum(abs(exact[k]) for k in ('jouleW', 'mechanicalW', 'electrodePowerW'))) for key in ('jouleW', 'mechanicalW', 'electrodePowerW')])
                row['checks'][label]['exactCoaxialMaximumRelativeError'] = continuum_error
                if label == 'kernel':
                    gate(spec['id']+' exact-log coaxial identity', continuum_error, 1., 1e-8)
        rows.append(row)
    for kind in sorted({row['kind'] for row in rows}):
        finest = max((row for row in rows if row['kind'] == kind), key=lambda row: row['radialCells'])
        gate(kind+' finest potential convergence', finest['potentialDifferenceOverScale'], 1., .01)
        for key, value in finest['powerDifferencesOverCombinedScale'].items():
            gate(kind+' finest '+key+' convergence', value, 1., .02)
        if kind in ('coaxial', 'motional'):
            gate(kind+' finest FiPy exact continuum', finest['checks']['fipy']['exactCoaxialMaximumRelativeError'], 1., .01)
    return {'cases': rows, 'gates': gates, 'allNumericalGatesPassed': all(g['passed'] for g in gates),
            'discreteAudit': 'Independent Python reconstruction from potentials; no production imports',
            'conductivityPredicted': False, 'experimentalValidation': False, 'liveBackendChanged': False}


if __name__ == '__main__':
    paths = [Path(value) for value in sys.argv[1:4]]
    raw = [path.read_bytes() for path in paths]; packets = [json.loads(value) for value in raw]
    hashes = [hashlib.sha256(value).hexdigest() for value in raw]
    validate_links(*packets, hashes[0])
    result = analyze(*packets)
    result.update({'inputsSHA256': dict(zip(('cases', 'production', 'fipy'), hashes)), 'versions': packets[2]['versions']})
    with Path(sys.argv[4]).open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    print(json.dumps({'cases': len(result['cases']), 'gates': len(result['gates']),
                      'allNumericalGatesPassed': result['allNumericalGatesPassed'],
                      'failed': [g for g in result['gates'] if not g['passed']]}, indent=2))
    if not result['allNumericalGatesPassed']:
        raise SystemExit(1)
