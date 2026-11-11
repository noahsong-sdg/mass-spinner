"""Independent SciPy graph reconstruction; never imports production solvers."""
import json
import hashlib
import math
import sys
from copy import deepcopy
from pathlib import Path
import numpy as np
from scipy.sparse import lil_matrix
from scipy.sparse.linalg import spsolve


def field(value, n):
    out = np.broadcast_to(np.asarray(value, dtype=float), (n,)).copy()
    if not np.all(np.isfinite(out)):
        raise AssertionError('Nonfinite serialized field')
    return out


def current_graph(c, omega):
    r, z = np.asarray(c['radialEdgesM']), np.asarray(c['axialEdgesM'])
    nr, nz = len(r)-1, len(z)-1
    n = nr*nz
    sigma_r, sigma_z = field(c['sigmaPerpSM'], n), field(c['sigmaParallelSM'], n)
    w, magnetic = field(omega, n), c['magneticT']
    rc, zc = np.sqrt((r[:-1]**2+r[1:]**2)/2), (z[:-1]+z[1:])/2
    voltage = [c[key] for key in ('innerVoltageV', 'outerVoltageV', 'lowerVoltageV', 'upperVoltageV')]
    reference = next(v for a in voltage for v in a if v is not None)
    links = []

    def radial(cell, left, right, j, sign=1):
        return (cell, math.log(right/left)/(2*math.pi*(z[j+1]-z[j])*sigma_r[cell]),
                -sign*magnetic*(right**2-left**2)/2)

    for j in range(nz):
        for i in range(nr):
            a, area = j*nr+i, math.pi*(r[i+1]**2-r[i]**2)
            if i < nr-1:
                links.append((a, a+1, 0., [radial(a, rc[i], r[i+1], j), radial(a+1, r[i+1], rc[i+1], j)]))
            if j < nz-1:
                links.append((a, a+nr, 0., [(a, (z[j+1]-zc[j])/(area*sigma_z[a]), 0.),
                                                       (a+nr, (zc[j+1]-z[j+1])/(area*sigma_z[a+nr]), 0.)]))
            if i == 0 and voltage[0][j] is not None:
                links.append((a, None, voltage[0][j]-reference, [radial(a, r[0], rc[0], j, -1)]))
            if i == nr-1 and voltage[1][j] is not None:
                links.append((a, None, voltage[1][j]-reference, [radial(a, rc[i], r[-1], j)]))
            if j == 0 and voltage[2][i] is not None:
                links.append((a, None, voltage[2][i]-reference, [(a, (zc[0]-z[0])/(area*sigma_z[a]), 0.)]))
            if j == nz-1 and voltage[3][i] is not None:
                links.append((a, None, voltage[3][i]-reference, [(a, (z[-1]-zc[-1])/(area*sigma_z[a]), 0.)]))
    matrix, rhs = lil_matrix((n, n)), np.zeros(n)
    for a, b, v, parts in links:
        g, emf = 1/sum(p[1] for p in parts), -sum(p[2]*w[p[0]] for p in parts)
        matrix[a, a] += g
        rhs[a] += g*(v-emf) if b is None else -g*emf
        if b is not None:
            matrix[b, b] += g
            matrix[a, b] -= g
            matrix[b, a] -= g
            rhs[b] += g*emf
    potential = spsolve(matrix.tocsr(), rhs)
    torque, heat, residual = np.zeros(n), np.zeros(n), np.zeros(n)
    electrode, boundary = 0., []
    for a, b, v, parts in links:
        resistance, emf = sum(p[1] for p in parts), -sum(p[2]*w[p[0]] for p in parts)
        amp = (potential[a]-(v if b is None else potential[b])+emf)/resistance
        residual[a] += amp
        if b is None:
            electrode -= v*amp
            boundary.append(amp)
        else:
            residual[b] -= amp
        for cell, half_r, torque_amp in parts:
            torque[cell] += amp*torque_amp
            heat[cell] += amp**2*half_r
    return dict(potentialV=potential+reference, relativePotentialV=potential,
                torqueNm=torque, jouleByCellW=heat, jouleW=float(sum(heat)),
                mechanicalW=float(torque@w), electrodePowerW=electrode,
                cellCurrentResidualA=residual, boundaryCurrentsA=np.asarray(boundary))


def torsion_graph(r, z, density, viscosity, omega, walls):
    r, z = np.asarray(r), np.asarray(z)
    nr, nz = len(r)-1, len(z)-1
    n = nr*nz
    rho, mu, w = field(density, n), field(viscosity, n), field(omega, n)
    rc, zc = (r[:-1]+r[1:])/2, (z[:-1]+z[1:])/2
    mean_r2 = (r[:-1]**2+r[1:]**2)/2
    inertia = (math.pi*np.diff(z)[:, None]*np.diff(r**2)[None, :]
               *mean_r2[None, :]*rho.reshape(nz, nr)).ravel()
    torque, heat = np.zeros(n), np.zeros(n)
    boundary = dict(outer=0., lower=0., upper=0.)
    stiffness = lil_matrix((n, n))
    forcing = np.zeros(n)

    def face(a, b, geometry, da, db=0., wall=None):
        half_a = da/(mu[a]*geometry)
        half_b = db/(mu[b]*geometry) if b is not None else 0.
        g = 1/(half_a+half_b)
        wb = w[b] if b is not None else walls[wall]
        flux = g*(wb-w[a])
        torque[a] += flux
        heat[a] += flux**2*half_a
        stiffness[a, a] += g
        if b is not None:
            torque[b] -= flux
            heat[b] += flux**2*half_b
            stiffness[b, b] += g
            stiffness[a, b] -= g
            stiffness[b, a] -= g
        else:
            boundary[wall] += flux
            forcing[a] += g*wb

    for j in range(nz):
        for i in range(nr):
            a = j*nr+i
            if i < nr-1:
                face(a, a+1, 2*math.pi*r[i+1]**3*(z[j+1]-z[j]), r[i+1]-rc[i], rc[i+1]-r[i+1])
            if j < nz-1:
                face(a, a+nr, math.pi*(r[i+1]**2-r[i]**2)*mean_r2[i], z[j+1]-zc[j], zc[j+1]-z[j+1])
            if i == nr-1 and walls['outer'] is not None:
                face(a, None, 2*math.pi*r[-1]**3*(z[j+1]-z[j]), r[-1]-rc[i], wall='outer')
            geometry = math.pi*(r[i+1]**2-r[i]**2)*mean_r2[i]
            if j == 0 and walls['lower'] is not None:
                face(a, None, geometry, zc[j]-z[0], wall='lower')
            if j == nz-1 and walls['upper'] is not None:
                face(a, None, geometry, z[-1]-zc[j], wall='upper')
    wall_power = sum(boundary[k]*walls[k] for k in boundary if walls[k] is not None)
    return dict(inertia=inertia, viscousTorqueNm=torque, shearByCellW=heat,
                boundaryTorqueNm=boundary, boundaryPowerW=wall_power,
                stiffness=stiffness.tocsr(), wallForcing=forcing)


def finite(value, label):
    if not np.all(np.isfinite(value)):
        raise AssertionError(f'{label}: nonfinite derived quantity')


def compare(actual, expected, label, rtol=1e-7, floor=1e-20):
    actual, expected = np.asarray(actual), np.asarray(expected)
    finite(actual, label)
    finite(expected, label)
    error, scale = float(np.max(abs(actual-expected))), max(floor, float(np.max(abs(expected))))
    if error > rtol*scale+64*np.finfo(float).eps*max(floor, float(np.max(abs(actual)))):
        raise AssertionError(f'{label}: error {error:g}, scale {scale:g}')
    return error/scale


def ledger(residual, exchange, storage, label):
    finite([residual, exchange, storage], label)
    tolerance = 1e-8*exchange+64*np.finfo(float).eps*storage
    if abs(residual) > tolerance:
        raise AssertionError(f'{label}: residual {residual:g}, tolerance {tolerance:g}')
    return dict(residual=float(residual), exchangeScale=float(exchange), storageAllowance=float(64*np.finfo(float).eps*storage))


def independent_properties(gas_t, solid_t):
    kb, argon_mass = 1.380649e-23, 39.948*1.66053906892e-27
    grid = [300, 500, 1000, 2000, 4000, 5000, 6000, 8000, 10000, 15000, 20000]
    table = [12.88, 11.12, 9.66, 8.60, 7.57, 7.23, 6.96, 6.53, 6.20, 5.60, 5.17]
    q = math.pi*1e-20*np.interp(gas_t, grid, table)
    mu = 5/16*np.sqrt(math.pi*argon_mass*kb*gas_t)/q
    t, ref, molar = solid_t, 300., .18384
    a, b, c, d, e = 23.95930, 2.639680e-3, 1.257750e-6, -.254642e-9, -.048407e6
    cp = (a+b*t+c*t*t+d*t**3+e/t**2)/molar
    # Algebraic antiderivative difference, independent of TS mean-Cp evaluation.
    enthalpy = (a*(t-ref)+b*(t*t-ref*ref)/2+c*(t**3-ref**3)/3
                +d*(t**4-ref**4)/4-e*(1/t-1/ref))/molar
    solid_k = 149.441-.045466*t+13.193e-6*t*t-1.484e-9*t**3+3.866e6/t**2
    return dict(mu=mu, k=15*kb*mu/(4*argon_mass), solidK=solid_k, solidCp=cp, solidH=enthalpy)


def thermal_graph(setup, temperature, props):
    gas_r, wall, z = [np.asarray(setup[k]) for k in ('r', 'wall', 'z')]
    r = np.r_[gas_r, wall[1:]]
    ngr, nr, nz = len(gas_r)-1, len(r)-1, len(z)-1
    n = nr*nz
    gi = np.array([j*nr+i for j in range(nz) for i in range(ngr)])
    si = np.array([j*nr+i for j in range(nz) for i in range(ngr, nr)])
    t = field(temperature, n)
    if np.any(t[gi] < 300) or np.any(t[gi] > 20000) or np.any(t[si] < 300) or np.any(t[si] > 1900):
        raise AssertionError('Source property domain violated')
    k = np.empty(n)
    k[gi], k[si] = props['k'], props['solidK']
    volume = (math.pi*np.diff(z)[:, None]*np.diff(r*r)[None, :]).ravel()
    mass = np.empty(n)
    mass[gi], mass[si] = field(setup['rho'], len(gi))*volume[gi], 19250.*volume[si]
    energy = np.empty(n)
    energy[gi] = mass[gi]*(1.5*1.380649e-23/(39.948*1.66053906892e-27))*t[gi]
    energy[si] = mass[si]*props['solidH']
    rc, zc = (r[:-1]+r[1:])/2, (z[:-1]+z[1:])/2
    net, flux_magnitude, interface, interface_magnitude = np.zeros(n), np.zeros(n), 0., 0.
    links = []
    for j in range(nz):
        for i in range(nr):
            a = j*nr+i
            if i < nr-1:
                resistance = (math.log(r[i+1]/rc[i])/k[a]+math.log(rc[i+1]/r[i+1])/k[a+1])/(2*math.pi*(z[j+1]-z[j]))
                contact = i+1 == ngr
                if contact and setup['contactH'] == 0:
                    conductance = 0.
                else:
                    if contact:
                        resistance += 1/(setup['contactH']*2*math.pi*r[i+1]*(z[j+1]-z[j]))
                    conductance = 1/resistance
                links.append((a, a+1, conductance))
                if contact:
                    q = conductance*(t[a]-t[a+1])
                    interface += q
                    interface_magnitude += abs(q)
            if j < nz-1:
                area = math.pi*(r[i+1]**2-r[i]**2)
                resistance = ((z[j+1]-zc[j])/k[a]+(zc[j+1]-z[j+1])/k[a+nr])/area
                links.append((a, a+nr, 1/resistance))
    for a, b, g in links:
        q = g*(t[b]-t[a])
        net[a] += q
        net[b] -= q
        flux_magnitude[a] += abs(q)
        flux_magnitude[b] += abs(q)
    bath_out = 0.
    if setup['coolingH']:
        for j in range(nz):
            a, dz = (j+1)*nr-1, z[j+1]-z[j]
            g = 1/(math.log(r[-1]/rc[-1])/(2*math.pi*dz*k[a])+1/(setup['coolingH']*2*math.pi*r[-1]*dz))
            q = g*(t[a]-setup['bathK'])
            net[a] -= q
            flux_magnitude[a] += abs(q)
            bath_out += q
    finite(energy, 'thermal storage')
    finite(net, 'thermal flux')
    return dict(energy=energy, net=net, fluxMagnitude=flux_magnitude, bathOutW=bath_out,
                gasIndices=gi, solidIndices=si, interfaceOutGasW=interface, interfaceMagnitudeW=interface_magnitude)


def check_case(case):
    c, result, props = case['setup'], case['result'], case['props']
    state, dt = result['mechanical'], case['dtS']
    w, old_w = np.asarray(state['omegaRadS']), np.asarray(case['oldOmegaRadS'])
    temperature, old_temperature = np.asarray(result['temperatureK']), np.asarray(case['oldTemperatureK'])
    nr, nz, ngr = len(c['r'])+len(c['wall'])-2, len(c['z'])-1, len(c['r'])-1
    gi = np.array([j*nr+i for j in range(nz) for i in range(ngr)])
    si = np.array([j*nr+i for j in range(nz) for i in range(ngr, nr)])
    expected_props = independent_properties(temperature[gi], temperature[si])
    old_props = independent_properties(old_temperature[gi], old_temperature[si])
    metrics = {}
    for key in expected_props:
        metrics['property_'+key] = compare(props[key], expected_props[key], 'property '+key, floor=1e-18)
        compare(case['oldProps'][key], old_props[key], 'old property '+key, floor=1e-18)
    # Current must be checked at the actual current iterate as well as accepted w.
    current_w = np.asarray(state['currentOmegaRadS'])
    compare(current_w, w, 'endpoint omega', rtol=5e-10, floor=1.)
    electrical = current_graph(c['electrical'], current_w)
    for key, value in electrical.items():
        if key == 'cellCurrentResidualA':
            continue
        metrics['current_'+key] = compare(state['current'][key], value, 'current '+key, floor=1e-15)
    current_scale = sum(abs(electrical['boundaryCurrentsA']))
    for values in (electrical['cellCurrentResidualA'], state['current']['cellCurrentResidualA']):
        if max(abs(np.asarray(values))) > 1e-8*max(current_scale, 1e-30):
            raise AssertionError('Electrical cell charge residual')
    mechanics = torsion_graph(c['r'], c['z'], c['rho'], props['mu'], w, c['walls'])
    compare(state['shearByCellW'], mechanics['shearByCellW'], 'local shear', floor=1e-18)
    compare(state['shearHeatW'], sum(mechanics['shearByCellW']), 'global shear', floor=1e-18)
    for wall in c['walls']:
        compare(state['boundaryTorqueNm'][wall], mechanics['boundaryTorqueNm'][wall], 'boundary '+wall, floor=1e-18)
    compare(state['boundaryPowerW'], mechanics['boundaryPowerW'], 'wall power', floor=1e-18)
    inertia = mechanics['inertia']
    row = inertia*(w-old_w)/dt-mechanics['viscousTorqueNm']-electrical['torqueNm']
    exchange = abs(inertia*(w-old_w)/dt)+abs(mechanics['viscousTorqueNm'])+abs(electrical['torqueNm'])
    storage_roundoff = 64*np.finfo(float).eps*inertia*(abs(w)+abs(old_w))/dt
    tolerance = 1e-8*exchange+storage_roundoff
    if np.any(abs(row) > tolerance):
        bad = int(np.argmax(abs(row)/np.maximum(tolerance, 1e-300)))
        ts_torque = np.asarray(state['current']['torqueNm'])
        debug = {'cell': bad, 'rowNm': float(row[bad]), 'toleranceNm': float(tolerance[bad]),
                 'storageTorqueNm': float(inertia[bad]*(w[bad]-old_w[bad])/dt),
                 'electricalTorqueNm': float(electrical['torqueNm'][bad]),
                 'tsElectricalTorqueNm': float(ts_torque[bad]),
                 'viscousTorqueNm': float(mechanics['viscousTorqueNm'][bad]),
                 'rowUsingTsTorqueNm': float(row[bad]+electrical['torqueNm'][bad]-ts_torque[bad]),
                 'storageRoundoffNm': float(storage_roundoff[bad]), 'exchangeScaleNm': float(exchange[bad]),
                 'omegaRadS': float(w[bad]), 'oldOmegaRadS': float(old_w[bad]),
                 'omegaEndpointMismatchRadS': float(w[bad]-current_w[bad]), 'dtS': dt,
                 'matrixDiagonalNmS': float(mechanics['stiffness'][bad, bad]),
                 'linearFormViscousTorqueNm': float((-mechanics['stiffness']@w+mechanics['wallForcing'])[bad])}
        raise AssertionError('Independent mechanical endpoint row residual: '+json.dumps(debug))
    new_k, old_k = .5*float(inertia@(w*w)), .5*float(inertia@(old_w*old_w))
    numerical_loss = .5*float(inertia@((w-old_w)**2))
    compare(state['numericalLossJ'], numerical_loss, 'numerical loss', floor=1e-25)
    thermal = thermal_graph(c, temperature, expected_props)
    old_thermal = thermal_graph(c, old_temperature, old_props)
    source = np.zeros(len(temperature))
    source[gi] = electrical['jouleByCellW']+mechanics['shearByCellW']
    storage = (thermal['energy']-old_thermal['energy'])/dt
    thermal_row = storage-thermal['net']-source
    exchange = abs(storage)+thermal['fluxMagnitude']+abs(source)
    tolerance = 1e-8*exchange+64*np.finfo(float).eps*(abs(thermal['energy'])+abs(old_thermal['energy']))/dt
    finite(thermal_row, 'thermal endpoint row')
    if np.any(abs(thermal_row) > tolerance):
        bad = int(np.argmax(abs(thermal_row)/np.maximum(tolerance, 1e-300)))
        raise AssertionError(f'Independent thermal row residual at {bad}: {thermal_row[bad]:g}, tol {tolerance[bad]:g}')
    compare(result['bathOutW'], thermal['bathOutW'], 'reservoir heat', floor=1e-15)
    if 'interfaceIntoGasW' in case:
        compare(case['interfaceIntoGasW'], -thermal['interfaceOutGasW'], 'gas interface heat',
                floor=max(1e-15, thermal['interfaceMagnitudeW']))
    delta_k = .5*float(inertia@((w-old_w)*(w+old_w)))
    delta_u = float(sum(thermal['energy']-old_thermal['energy']))
    supplied = dt*(electrical['electrodePowerW']+mechanics['boundaryPowerW'])
    bath = dt*thermal['bathOutW']
    residual = delta_k+delta_u+bath+numerical_loss-supplied
    metrics['totalEnergy'] = ledger(residual, abs(delta_k)+abs(delta_u)+abs(bath)+numerical_loss+abs(supplied),
                                    abs(new_k)+abs(old_k)+float(sum(abs(thermal['energy'])+abs(old_thermal['energy']))), 'total energy')
    momentum_residual = float(inertia@(w-old_w))-dt*(sum(electrical['torqueNm'])+sum(mechanics['boundaryTorqueNm'].values()))
    metrics['angularMomentum'] = ledger(momentum_residual,
        abs(float(inertia@(w-old_w)))+dt*(sum(abs(electrical['torqueNm']))+sum(abs(v) for v in mechanics['boundaryTorqueNm'].values())),
        float(inertia@(abs(old_w)+abs(w))), 'angular momentum')
    metrics.update(maxMechanicalRowResidual=float(max(abs(row))), maxThermalRowResidualW=float(max(abs(thermal_row))),
                   interfaceOutGasW=float(thermal['interfaceOutGasW']))
    return metrics


def audit_report(report):
    groups = report['cases'] if isinstance(report, dict) else report
    cases = [case for group in groups for case in group['cases']] if groups and 'cases' in groups[0] else groups
    input_failures = deepcopy(report.get('failures', [])) if isinstance(report, dict) else []
    result = {'cases': [], 'failures': [], 'inputFailures': input_failures,
              'experimentalQualified': False, 'liveQualified': False}
    for index, case in enumerate(cases):
        try:
            result['cases'].append({'index': index, 'name': case.get('name', str(index)), 'checks': check_case(case)})
        except (AssertionError, ValueError, KeyError, FloatingPointError) as error:
            result['failures'].append({'index': index, 'name': case.get('name', str(index)), 'error': str(error)})
    result['passed'] = not result['failures'] and not input_failures and bool(result['cases'])
    result['negativeControls'] = []
    if result['passed']:
        for name in ('potential', 'localShear', 'temperature', 'numericalLoss', 'bathHeat', 'interfaceHeat'):
            bad = deepcopy(cases[0])
            if name == 'potential':
                bad['result']['mechanical']['current']['relativePotentialV'][0] += .1
            elif name == 'localShear':
                bad['result']['mechanical']['shearByCellW'][0] += 1.
            elif name == 'temperature':
                bad['result']['temperatureK'][0] += 1.
            elif name == 'numericalLoss':
                bad['result']['mechanical']['numericalLossJ'] += 1.
            elif name == 'bathHeat':
                bad['result']['bathOutW'] += 1.
            else:
                bad['interfaceIntoGasW'] = bad.get('interfaceIntoGasW', -result['cases'][0]['checks']['interfaceOutGasW'])+1.
            try:
                check_case(bad)
                result['negativeControls'].append({'name': name, 'rejected': False})
            except (AssertionError, ValueError, KeyError, FloatingPointError) as error:
                result['negativeControls'].append({'name': name, 'rejected': True, 'reason': str(error)})
        result['passed'] = all(c['rejected'] for c in result['negativeControls'])
    return result


def main():
    source = Path(sys.argv[1])
    report = json.loads(source.read_text())
    result = audit_report(report)
    result['inputHashes'] = {source.name: hashlib.sha256(source.read_bytes()).hexdigest()}
    destination = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(sys.argv[1]).with_suffix('.independent.json')
    destination.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(json.dumps({'passed': result['passed'], 'checked': len(result['cases']),
                      'failures': result['failures'], 'inputFailures': result['inputFailures']}))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
