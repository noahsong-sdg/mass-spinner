"""Mixture source audit using the sealed independent v74 graph reconstructions.

No production source solver is imported. Gas storage is reconstructed from
both species, not the natural-Ar approximation used for transport coefficients.
"""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import numpy as np
from independent import geometry, primitives

spec = spec_from_file_location('v75_independent_v74', Path(__file__).resolve().parents[1]/'coupled-axial-v74/independent_check.py')
graph = module_from_spec(spec)
spec.loader.exec_module(graph)
KB = 1.380649e-23


def check_source(setup, before, after, dt, wall_before, wall_after, source):
    r, z, masses = [np.asarray(setup[k]) for k in ('r', 'z', 'masses')]
    nr, nz, nw = len(r)-1, len(z)-1, len(setup['wall'])-1
    ng = nr*nz
    _, _, admitted_masses, admitted_volume, admitted_r2, _, _ = geometry(setup)
    for q in (before, after):
        admitted = primitives(q, admitted_volume, admitted_r2, admitted_masses)
        if np.any((admitted['temperature'] < 300) | (admitted['temperature'] > 418)):
            raise AssertionError('Mixture source gas outside 300--418 K domain')
    if not np.array_equal(after[[0, 1, 2, 5]], before[[0, 1, 2, 5]]):
        raise AssertionError('Source changed transported inventories')
    volume = (np.pi*np.diff(z)[:, None]*np.diff(r*r)[None, :]).ravel()
    inertia = before[0].ravel()*np.tile((r[:-1]**2+r[1:]**2)/2, nz)
    cv = (1.5*KB*(before[5]/masses[0]+(before[0]-before[5])/masses[1])).ravel()
    gi = np.array([j*(nr+nw)+i for j in range(nz) for i in range(nr)])
    si = np.array([j*(nr+nw)+i for j in range(nz) for i in range(nr, nr+nw)])

    def fields(q, wall):
        w = q[3].ravel()/inertia
        kinetic = .5*(q[1]**2+q[2]**2)/q[0]+(q[3]**2/(2*before[0]*np.tile((r[:-1]**2+r[1:]**2)/2, (nz, 1))))
        temperature = np.empty((nr+nw)*nz)
        temperature[gi] = (q[4]-kinetic).ravel()/cv
        temperature[si] = wall
        props = graph.independent_properties(temperature[gi], temperature[si])
        return w, temperature, props

    old_w, old_t, old_props = fields(before, wall_before)
    w, t, props = fields(after, wall_after)
    graph.compare(source['temperatureK'], t, 'Accepted source temperature', floor=300.)
    state = source['mechanical']
    graph.compare(state['omegaRadS'], w, 'Accepted source angular speed', floor=1.)
    graph.compare(state['currentOmegaRadS'], w, 'Current endpoint speed', rtol=5e-10, floor=1.)
    electrical = graph.current_graph(setup['electrical'], state['currentOmegaRadS'])
    for key in ('potentialV', 'relativePotentialV', 'torqueNm', 'jouleByCellW', 'boundaryCurrentsA',
                'jouleW', 'mechanicalW', 'electrodePowerW'):
        graph.compare(state['current'][key], electrical[key], 'Current '+key, floor=1e-15)
    current_scale = max(sum(abs(electrical['boundaryCurrentsA'])), 1e-30)
    for rows in (electrical['cellCurrentResidualA'], state['current']['cellCurrentResidualA']):
        graph.finite(rows, 'Charge rows')
        if max(abs(np.asarray(rows))) > 1e-8*current_scale:
            raise AssertionError('Independent local charge conservation')
    mechanics = graph.torsion_graph(r, z, before[0].ravel()/volume, props['mu'], w, setup['walls'])
    graph.compare(state['shearByCellW'], mechanics['shearByCellW'], 'Local viscous heat', floor=1e-18)
    graph.compare(state['shearHeatW'], sum(mechanics['shearByCellW']), 'Total viscous heat', floor=1e-18)
    for key in setup['walls']:
        graph.compare(state['boundaryTorqueNm'][key], mechanics['boundaryTorqueNm'][key], 'Wall torque '+key, floor=1e-18)
    graph.compare(state['boundaryPowerW'], mechanics['boundaryPowerW'], 'Wall power', floor=1e-18)
    momentum = inertia*(w-old_w)/dt
    residual = momentum-mechanics['viscousTorqueNm']-electrical['torqueNm']
    tol = 1e-8*(abs(momentum)+abs(mechanics['viscousTorqueNm'])+abs(electrical['torqueNm']))
    tol += 64*np.finfo(float).eps*inertia*(abs(w)+abs(old_w))/dt
    graph.finite(residual, 'Momentum row')
    graph.finite(tol, 'Momentum tolerance')
    if np.any(abs(residual) > tol):
        raise AssertionError('Mixture source local angular momentum residual')
    c = dict(r=r, z=z, wall=setup['wall'], rho=before[0].ravel()/volume,
             contactH=setup['contactH'], coolingH=setup['coolingH'], bathK=setup['bathK'])
    heat, old_heat = graph.thermal_graph(c, t, props), graph.thermal_graph(c, old_t, old_props)
    heat['energy'][gi], old_heat['energy'][gi] = cv*t[gi], cv*old_t[gi]
    storage = (heat['energy']-old_heat['energy'])/dt
    heating = np.zeros(len(t))
    heating[gi] = electrical['jouleByCellW']+mechanics['shearByCellW']
    heat_row = storage-heat['net']-heating
    heat_tol = 1e-8*(abs(storage)+heat['fluxMagnitude']+abs(heating))
    heat_tol += 64*np.finfo(float).eps*(abs(heat['energy'])+abs(old_heat['energy']))/dt
    graph.finite(heat_row, 'Thermal row')
    graph.finite(heat_tol, 'Thermal tolerance')
    if np.any(abs(heat_row) > heat_tol):
        raise AssertionError('Mixture source local thermal residual')
    loss = .5*float(inertia@((w-old_w)**2))
    graph.compare(state['numericalLossJ'], loss, 'BE loss', floor=1e-25)
    graph.compare(source['bathOutW'], heat['bathOutW'], 'Reservoir power', floor=1e-15)
    angular_impulse = dt*(sum(electrical['torqueNm'])+sum(mechanics['boundaryTorqueNm'].values()))
    angular_delta = float(np.sum(after[3]-before[3]))
    graph.ledger(angular_delta-angular_impulse, abs(angular_delta)+abs(angular_impulse),
                 float(np.sum(abs(before[3])+abs(after[3]))), 'Mixture angular momentum')
    delta = float(np.sum(after[4]-before[4])+sum(heat['energy'][si]-old_heat['energy'][si]))
    supplied = dt*(electrical['electrodePowerW']+mechanics['boundaryPowerW'])
    bath = dt*heat['bathOutW']
    ledger = graph.ledger(delta+bath+loss-supplied, abs(delta)+abs(bath)+loss+abs(supplied),
                          float(sum(abs(heat['energy'])+abs(old_heat['energy']))+sum(abs(before[4].ravel())+abs(after[4].ravel()))), 'Mixture total energy')
    return dict(energy=ledger, maxMomentumRowNm=float(max(abs(residual))),
                maxThermalRowW=float(max(abs(heat_row))), numericalLossJ=loss,
                electrodeJ=dt*electrical['electrodePowerW'], bathJ=bath,
                wallWorkJ=dt*mechanics['boundaryPowerW'], angularImpulseKgM2S=float(angular_impulse))
