"""Independent sparse torque graph and analytic gates; safe-dev only.

Usage: python independent_check.py REPORT.json
No FiPy or torsion imports. Rebuilds fixed inputs, every state and work ledger.
"""
import hashlib
import json
import math
from pathlib import Path
import sys
import numpy as np
import scipy
from scipy.sparse import coo_matrix, diags
from scipy.sparse.linalg import factorized, spsolve

R, L, RHO, MU = .06, .14, .001, .0001
IDS = [f'manufactured-{n}' for n in (8, 16, 32, 64)] + [
    f'axial-decay-{n}' for n in (8, 32, 128)] + [
    'variable-axial-couette', 'variable-rigid', 'variable-wall-work', 'radial-core-annulus',
    'endwall-free', 'endwall-stationary']
CUMULATIVE = {'shearHeatJ', 'numericalLossJ', 'bodyWorkJ', 'wallWorkJ',
              'maxAbsoluteEnergyResidualJ', 'maxAbsoluteMomentumResidualKgM2S'}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def near(actual, expected, name, scale=0.):
    a, b = np.asarray(actual, dtype=float), np.asarray(expected, dtype=float)
    require(a.shape == b.shape and np.all(np.isfinite(a)) and np.all(np.isfinite(b)),
            name+': invalid shape/nonfinite value')
    require(np.all(abs(a-b) <= 2e-9*abs(b)+2e-12*scale+1e-25),
            name+': independent reconstruction mismatch')


def frozen(identifier):
    walls, steps, dt = {'outer': None, 'lower': None, 'upper': None}, 0, None
    if identifier.startswith('manufactured-'):
        kind, n = 'manufactured-steady', int(identifier.split('-')[-1])
        r, z = np.linspace(0, R, n+1), np.linspace(0, L, n+1)
        k = math.pi/L
        qr = (8/R**2+k*k)*(r[1:]**4-r[:-1]**4)/4
        qr -= k*k*(r[1:]**6-r[:-1]**6)/(6*R**2)
        q = (2*math.pi*MU*np.outer((np.cos(k*z[:-1])-np.cos(k*z[1:]))/k, qr)).ravel()
        walls = dict.fromkeys(walls, 0.)
    elif identifier.startswith('axial-decay-'):
        kind, steps = 'axial-decay', int(identifier.split('-')[-1])
        r, z, dt = np.linspace(0, R, 5), np.linspace(0, L, 33), .02/steps
        q = np.zeros(128)
    elif identifier == 'radial-core-annulus' or identifier.startswith('endwall-'):
        kind = 'radial-reduction' if identifier == 'radial-core-annulus' else 'endwall-sensitivity'
        r, z = np.linspace(0, R, 65), np.linspace(0, L, 5 if kind == 'radial-reduction' else 33)
        q = (2*math.pi*MU*np.outer(np.diff(z), np.maximum(
            0., r[1:]**2-np.maximum(r[:-1], .0075)**2))).ravel()
        walls['outer'] = 0.
        if identifier == 'endwall-stationary':
            walls.update(lower=0., upper=0.)
    else:
        r = np.array([0., .001, .008, .025, R])
        z = np.array([0., .005, .017, .04, .08, L])
        kind = {'variable-axial-couette': 'axial-couette', 'variable-rigid': 'rigid',
                'variable-wall-work': 'wall-work'}[identifier]
        q = np.linspace(0., .00001, 20) if kind == 'wall-work' else np.zeros(20)
        if kind == 'axial-couette':
            walls.update(lower=10., upper=70.)
        else:
            steps, dt = 1, .001 if kind == 'rigid' else .0002
            if kind == 'wall-work':
                walls = dict.fromkeys(walls, 20.)
    count = (len(r)-1)*(len(z)-1)
    rho, mu, initial = np.full(count, RHO), np.full(count, MU), np.zeros(count)
    if kind in ('rigid', 'wall-work'):
        rho, mu = np.linspace(.001, .003, count), np.linspace(.00005, .0003, count)
    if kind == 'rigid':
        initial[:] = 37.
    if kind == 'axial-couette':
        mu = np.repeat([.0001, .0002, .00005, .0001, .0003], 4)
    if kind == 'axial-decay':
        initial = np.repeat(np.cos(math.pi*(z[1:]+z[:-1])/(2*L)), 4)
    return kind, r, z, rho, mu, walls, q, initial, steps, dt


def graph(r, z, rho, mu, walls):
    nr, nz = len(r)-1, len(z)-1
    rc, zc, dz = (r[1:]+r[:-1])/2, (z[1:]+z[:-1])/2, np.diff(z)
    weight = math.pi*(r[1:]**4-r[:-1]**4)/2
    inertia = (rho.reshape(nz, nr)*np.outer(dz, weight)).ravel()
    edges, boundary = [], []
    for j in range(nz):
        for i in range(nr):
            cell = j*nr+i
            if i+1 < nr:
                resistance = (r[i+1]-rc[i])/mu[cell]+(rc[i+1]-r[i+1])/mu[cell+1]
                edges.append((cell, cell+1, 2*math.pi*dz[j]*r[i+1]**3/resistance))
            if j+1 < nz:
                resistance = (z[j+1]-zc[j])/mu[cell]+(zc[j+1]-z[j+1])/mu[cell+nr]
                edges.append((cell, cell+nr, weight[i]/resistance))
            for name, at_wall, conductance in (
                ('outer', i == nr-1, 2*math.pi*dz[j]*R**3*mu[cell]/(R-rc[i])),
                ('lower', j == 0, weight[i]*mu[cell]/(zc[j]-z[0])),
                ('upper', j == nz-1, weight[i]*mu[cell]/(z[-1]-zc[j]))):
                if at_wall and walls[name] is not None:
                    boundary.append((cell, conductance, walls[name], name))
    diagonal, rhs = np.zeros(len(rho)), np.zeros(len(rho))
    rows, columns, data = [], [], []
    for a, b, g in edges:
        diagonal[a] += g
        diagonal[b] += g
        rows.extend((a, b)); columns.extend((b, a)); data.extend((-g, -g))
    for cell, g, speed, _ in boundary:
        diagonal[cell] += g
        rhs[cell] += g*speed
    matrix = coo_matrix((data, (rows, columns)), shape=(len(rho), len(rho))).tocsc()+diags(diagonal)
    return inertia, edges, boundary, matrix, rhs


def rates(w, torque, inertia, edges, boundary):
    torques = dict.fromkeys(('outer', 'lower', 'upper'), 0.)
    heat = sum(g*(w[a]-w[b])**2 for a, b, g in edges)
    power = 0.
    for cell, g, speed, name in boundary:
        traction = g*(speed-w[cell])
        torques[name] += traction
        power += speed*traction
        heat += g*(speed-w[cell])**2
    return {'omegaRadS': w, 'angularMomentumKgM2S': inertia@w,
            'kineticJ': inertia@(w*w)/2, 'boundaryTorqueNm': torques,
            'boundaryPowerW': power, 'bodyTorqueNm': sum(torque),
            'bodyPowerW': torque@w, 'shearHeatW': heat}


def check(path):
    packet = json.loads(Path(path).read_bytes())
    require(type(packet['schemaVersion']) is int and packet['schemaVersion'] == 1, 'Schema changed')
    require(packet['matchedExperimentalValidation'] is False and packet['liveChanged'] is False,
            'Invalid experimental/live qualification claim')
    names = {'torsion.py', 'run_report.py', 'test_torsion.py', 'independent_check.py', 'PROTOCOL.md'}
    require(set(packet['sourcesSHA256']) == names, 'Incomplete source snapshot')
    for name, digest in packet['sourcesSHA256'].items():
        require(hashlib.sha256(Path(__file__).with_name(name).read_bytes()).hexdigest() == digest,
                'Stale input: '+name)
    require(packet['versions'] == {'fipy': '4.0.3', 'numpy': np.__version__, 'scipy': scipy.__version__},
            'Unexpected scientific runtime versions')
    require([c['id'] for c in packet['cases']] == IDS, 'Changed frozen campaign')
    outcomes, manufactured, decay, endwalls = [], [], [], {}
    for case in packet['cases']:
        kind, r, z, rho, mu, walls, q, initial, steps, dt = frozen(case['id'])
        spec = case['input']
        require(case['kind'] == kind and type(case['steps']) is int
                and case['steps'] == steps and case['dtS'] == dt and spec['walls'] == walls,
                'Changed kind/boundaries/time sequence')
        for key, expected in (('radialEdgesM', r), ('axialEdgesM', z),
                              ('densityKgM3', rho), ('viscosityPaS', mu)):
            near(spec[key], expected, key)
        near(case['torqueNm'], q, 'Frozen integrated source')
        near(case['initialOmegaRadS'], initial, 'Frozen initial state')
        inertia, edges, boundary, matrix, rhs = graph(r, z, rho, mu, walls)
        require(set(case['cumulative']) == CUMULATIVE, 'Changed cumulative ledger fields')
        w, sums = initial.copy(), dict.fromkeys(CUMULATIVE, 0.)
        solve = factorized(matrix+diags(inertia/dt)) if steps else None
        for _ in range(steps):
            old = w.copy()
            w = solve(q+rhs+inertia*old/dt)
            output = rates(w, q, inertia, edges, boundary)
            loss = inertia@((w-old)**2)/2
            e = inertia@(w*w-old*old)/2+dt*(output['shearHeatW']-output['bodyPowerW']-output['boundaryPowerW'])+loss
            l = inertia@(w-old)-dt*(output['bodyTorqueNm']+sum(output['boundaryTorqueNm'].values()))
            for key, value in (('shearHeatJ', dt*output['shearHeatW']), ('numericalLossJ', loss),
                               ('bodyWorkJ', dt*output['bodyPowerW']), ('wallWorkJ', dt*output['boundaryPowerW'])):
                sums[key] += value
            sums['maxAbsoluteEnergyResidualJ'] = max(sums['maxAbsoluteEnergyResidualJ'], abs(e))
            sums['maxAbsoluteMomentumResidualKgM2S'] = max(sums['maxAbsoluteMomentumResidualKgM2S'], abs(l))
        if not steps:
            w = spsolve(matrix, q+rhs)
        reference, result = rates(w, q, inertia, edges, boundary), case['result']
        lscale, escale = sum(inertia)*max(1., max(abs(initial)), max(abs(w))), sum(inertia)*max(1., max(initial*initial), max(w*w))
        for key in ('omegaRadS', 'angularMomentumKgM2S', 'kineticJ', 'bodyTorqueNm', 'bodyPowerW', 'shearHeatW', 'boundaryPowerW'):
            near(result[key], reference[key], key, max(abs(w)) if key == 'omegaRadS' else lscale/dt if steps and 'Torque' in key else escale)
        for key in walls:
            near(result['boundaryTorqueNm'][key], reference['boundaryTorqueNm'][key], 'Signed wall torque', lscale/(dt or 1.))
        for key in sums:
            near(case['cumulative'][key], sums[key], 'Cumulative '+key, lscale if 'Momentum' in key else escale)
        if steps:
            near(result['numericalLossJ'], loss, 'BE loss', escale)
            require(result['dtS'] == dt, 'Changed endpoint timestep')
            require(abs(result['energyResidualJ']) < 1e-9*escale and abs(result['momentumResidualKgM2S']) < 1e-9*lscale, 'Endpoint ledger gate failed')
            require(case['cumulative']['maxAbsoluteEnergyResidualJ'] < 1e-9*escale and case['cumulative']['maxAbsoluteMomentumResidualKgM2S'] < 1e-9*lscale, 'Trajectory ledger gate failed')
        if kind == 'manufactured-steady':
            exact = np.outer(np.sin(math.pi*(z[:-1]+z[1:])/(2*L)), 1-((r[:-1]+r[1:])/(2*R))**2).ravel()
            manufactured.append(float(max(abs(np.asarray(result['omegaRadS'])-exact))/max(exact)))
        if kind == 'axial-decay':
            eigenvalue = 4*(MU/RHO)*math.sin(math.pi/(2*32))**2/(L/32)**2
            near(result['omegaRadS'], initial/(1+dt*eigenvalue)**steps, 'Discrete axial eigenmode', 1.)
            decay.append(float(max(abs(np.asarray(result['omegaRadS'])-initial*math.exp(-MU/RHO*(math.pi/L)**2*.02)))))
        if kind == 'axial-couette':
            resistance = np.diff(z)/mu.reshape(5, 4)[:, 0]
            exact = 10+60*(np.cumsum(resistance)-resistance/2)/sum(resistance)
            near(result['omegaRadS'], np.repeat(exact, 4), 'Layered Couette profile', 70.)
            traction = math.pi*R**4/2*60/sum(resistance)
            near(result['boundaryTorqueNm']['upper'], traction, 'Absolute axial torque')
            near(sum(inertia), RHO*math.pi*R**4*L/2, 'Absolute cylinder inertia')
        if kind == 'rigid':
            near(result['omegaRadS'], initial, 'Rigid invariance', 37.)
        if kind == 'radial-reduction':
            radial = np.maximum((r[1:]+r[:-1])/2, .0075)
            exact = np.log(R/radial)+.0075**2/2*(1/R**2-1/radial**2)
            require(max(abs(np.asarray(result['omegaRadS'])-np.tile(exact, 4))) < .005,
                    'Radial continuum gate failed')
            near(np.asarray(result['omegaRadS']).reshape(4, 64),
                 np.tile(np.asarray(result['omegaRadS'])[:64], (4, 1)), 'Radial extrusion')
        if kind == 'endwall-sensitivity':
            endwalls[case['id']] = np.asarray(result['omegaRadS'])
            require(abs(sum(result['boundaryTorqueNm'].values())+sum(q)) < 1e-9*sum(q),
                    'Steady wall torque partition failed')
        outcomes.append({'id': case['id'], 'independentSparseReconstructionPassed': True})
    require(all(a > b for a, b in zip(manufactured, manufactured[1:])) and manufactured[-1] < .005, 'Manufactured refinement gate failed')
    require(all(a > b for a, b in zip(decay, decay[1:])) and decay[-1] < .01, 'Continuum timestep gate failed')
    require(np.all(endwalls['endwall-stationary'] <= endwalls['endwall-free']+1e-9*max(endwalls['endwall-free'])),
            'Stationary endwalls increased the constrained positive-source solution')
    return {'independentCheckPassed': True, 'cases': outcomes, 'manufacturedErrors': manufactured,
            'continuumDecayErrors': decay, 'matchedExperimentalValidation': False,
            'scope': 'Numerical constrained torsional transport only; no meridional flow or device qualification'}


if __name__ == '__main__':
    require(len(sys.argv) == 2, 'Usage: independent_check.py REPORT.json')
    print(json.dumps(check(sys.argv[1]), indent=2, allow_nan=False))
