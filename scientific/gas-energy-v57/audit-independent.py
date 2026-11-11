"""Independent all-state thermodynamic audit. Execute only inside safe-dev.

Imports no solver, production, property or FiPy modules. Particle inventories,
moving-shell ideal-gas geometry, pressure work, solid energy and entropy are
reconstructed from raw states. Reported residuals are never acceptance inputs.
"""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path

import numpy as np

KB = 1.380649e-23
MOLAR_W = .18384
# NIST solid-W Cp rewritten as a polynomial in kelvin, J/(mol K).
A, B, C, D, E = 23.95930, .002639680, .000001257750, -.000000000254642, -48407.


def volume_roundoff(edges, length):
    """Cumulative-radius to shell-volume cancellation, absolute m³ budget.

    Rounded cumulative sums are shared by adjacent faces; their common
    accumulated error cancels on differencing. Sqrt/square and subtraction
    still contribute errors scaled to face radii, not the small shell volume.
    Sixteen eps covers those operations and the pi*length conversion.
    """
    return 16*np.finfo(float).eps*math.pi*length*(edges[:-1]**2+edges[1:]**2)


def check_pressure_work_identity(number, tg, oldg, p, pold, vi, vold, edges, oldedges, length):
    storage = 1.5*number*KB*(abs(tg)+abs(oldg))+p*(abs(vi)+abs(vold))
    error = 2.5*number*KB*(tg-oldg)-vold*(p-pold)
    error -= 1.5*number*KB*(tg-oldg)+p*(vi-vold)
    legacy_budget = 128*np.finfo(float).eps*storage
    budget = legacy_budget+p*volume_roundoff(edges, length)+pold*volume_roundoff(oldedges, length)
    ratio = float(max(abs(error)/budget))
    assert ratio <= 1., ('pressure-work identity geometry budget ratio', ratio)
    return {'geometryBudgetRatio': ratio, 'storedEnergyOnlyBudgetRatio': float(max(abs(error)/legacy_budget))}


def solid_hchange(new, old, config):
    if config['wallMaterial'] == 'constant':
        return config['wallCpJKgK'] * (new-old)
    return ((new-old)*(A+B*(new+old)/2+C*(new*new+new*old+old*old)/3
            +D*(new**3+new*new*old+new*old*old+old**3)/4+E/(new*old)) / MOLAR_W)


def solid_schange(new, old, config):
    if config['wallMaterial'] == 'constant':
        return config['wallCpJKgK'] * np.log1p((new-old)/old)
    d = new-old
    return (A*np.log1p(d/old)+B*d+C*d*(new+old)/2
            +D*d*(new*new+new*old+old*old)/3
            +E*d*(new+old)/(2*new*new*old*old)) / MOLAR_W


def solid_cp(t, config):
    if config['wallMaterial'] == 'constant':
        return np.full_like(t, config['wallCpJKgK'])
    return (A+B*t+C*t*t+D*t**3+E/(t*t))/MOLAR_W


def independent_coefficients(tg, tw, gas_edges, solid_edges, pressure, config):
    """Source-attributed properties, independently assembled shell resistances."""
    reference = np.full_like(tg, config['referenceK']) if config['constantTransport'] else tg
    if config['gas'] == 'helium4':
        anchors = np.array([300., 500., 1000., 2000.])
        viscosity = np.array([19.919, 28.344, 46.378, 77.286])*1e-6
        conductivity = np.array([155.863, 221.707, 362.590, 603.905])*1e-3
        assert min(tg) >= 300-1e-8 and max(tg) <= 2000+1e-8
        mu = np.exp(np.interp(np.log(reference), np.log(anchors), np.log(viscosity)))
        kg = np.exp(np.interp(np.log(reference), np.log(anchors), np.log(conductivity)))
        mass = 4.00260325413*1.66053906660e-27
    else:
        assert config['gas'] == 'lithium' and min(tg) >= 100 and max(tg) <= 3000
        mu, kg = 3.14e-8*reference**.863, 1.398e-4*reference**.863
        mass = 7.*1.66053906660e-27
    if config['wallMaterial'] == 'constant':
        kw = np.full_like(tw, config['wallKWMK'])
    else:
        kw = 149.441-.045466*tw+13.193e-6*tw**2-1.484e-9*tw**3+3.866e6/tw**2
    assert np.all(kg > 0) and np.all(kw > 0) and np.all(mu > 0)
    gc = np.sqrt((gas_edges[:-1]**2+gas_edges[1:]**2)/2)
    wc = np.sqrt(solid_edges[:-1]*solid_edges[1:])
    geometric = 2*math.pi*config['lengthM']
    rg = np.log(gas_edges[1:-1]/gc[:-1])/kg[:-1]+np.log(gc[1:]/gas_edges[1:-1])/kg[1:]
    rw = np.log(solid_edges[1:-1]/wc[:-1])/kw[:-1]+np.log(wc[1:]/solid_edges[1:-1])/kw[1:]
    gas_links, wall_links = geometric/rg, geometric/rw
    gas_half = math.log(config['radiusM']/gc[-1])/(geometric*kg[-1])
    wall_half = math.log(wc[0]/config['radiusM'])/(geometric*kw[0])
    alpha = config['alpha']
    mean_free = mu/pressure*np.sqrt(math.pi*KB*tg/(2*mass))
    prandtl = 2.5*KB/mass*mu/kg
    jump = (2-alpha)/alpha*1.25*mean_free[-1]/prandtl[-1] if alpha else None
    interface = 1/(gas_half+jump/(geometric*config['radiusM']*kg[-1])+wall_half) if alpha else 0.
    outer = 0. if config['coolingWK'] == 0 else 1/(1/config['coolingWK']+math.log(solid_edges[-1]/wc[-1])/(geometric*kw[-1]))
    return gas_links, wall_links, interface, outer, jump, mean_free, gas_half, wall_half, mu, kg, mass


def checked_case(case):
    c, states = case['config'], case['states']
    number = np.asarray(case['particleNumbers'], dtype=float)
    solid_edges = np.asarray(case['solidEdgesM'], dtype=float)
    assert len(states) >= 2 and len(number) >= 1
    assert np.all(np.isfinite(number)) and np.all(number > 0)
    assert np.all(np.diff(solid_edges) > 0)
    assert abs(solid_edges[0]-c['radiusM']) <= 2e-14
    length, volume = c['lengthM'], math.pi*c['radiusM']**2*c['lengthM']
    solid_volume = math.pi*length*np.diff(solid_edges)*(solid_edges[:-1]+solid_edges[1:])
    density = c['wallDensityKgM3'] if c['wallMaterial'] == 'constant' else 19250.
    masses = density*solid_volume
    cv = 1.5*number*KB
    old = states[0]
    initial_gas = np.asarray(old['gasK'], dtype=float)
    initial_solid = np.asarray(old['solidK'], dtype=float)
    maximum_row = maximum_energy = maximum_eos = maximum_volume = 0.
    maximum_gas_row = maximum_wall_row = maximum_budget_ratio = cumulative_budget = 0.
    maximum_number = maximum_conservative_mach = 0.
    maximum_gradient_kn = maximum_stress_rate = maximum_acoustic_rate = 0.
    maximum_pressure_identity_ratio = maximum_legacy_pressure_ratio = 0.
    minimum_entropy = math.inf
    cumulative_interface = cumulative_cooling = cumulative_source = 0.
    for index, state in enumerate(states):
        tg = np.asarray(state['gasK'], dtype=float)
        tw = np.asarray(state['solidK'], dtype=float)
        edges = np.asarray(state['gasEdgesM'], dtype=float)
        p = state['pressurePa']
        assert tg.shape == number.shape and tw.shape == masses.shape
        assert edges.shape == (len(number)+1,)
        assert np.all(np.isfinite(tg)) and np.all(tg > 0)
        assert np.all(np.isfinite(tw)) and np.all(tw > 0)
        assert np.all(np.isfinite(edges)) and np.all(np.diff(edges) > 0)
        assert edges[0] == 0 and abs(edges[-1]-c['radiusM']) <= 2e-14
        assert math.isfinite(p) and p > 0
        if c['wallMaterial'] != 'constant':
            assert np.min(tw) >= 300-1e-8 and np.max(tw) <= 1900+1e-8
        vi = math.pi*length*np.diff(edges)*(edges[:-1]+edges[1:])
        eos = float(np.max(np.abs(p*vi-number*KB*tg)/(number*KB*tg)))
        pressure = KB*float(np.dot(number, tg))/volume
        eos_budget = 128*np.finfo(float).eps*number*KB*tg+p*volume_roundoff(edges, length)
        assert np.all(abs(p*vi-number*KB*tg) <= eos_budget)
        assert abs(p-pressure) <= 3e-12*p
        verror = abs(float(sum(vi))-volume)/volume
        nerror = abs(float(sum(p*vi/(KB*tg)))-float(sum(number)))/float(sum(number))
        assert verror < 3e-13 and nerror < 3e-12
        maximum_eos = max(maximum_eos, eos)
        maximum_volume = max(maximum_volume, verror)
        maximum_number = max(maximum_number, nerror)
        gl, wl, contact, outer, jump, mfp, rg, rw, mu, kg, mass = independent_coefficients(tg, tw, edges, solid_edges, p, c)
        centers = np.sqrt((edges[:-1]**2+edges[1:]**2)/2)
        bulk_gradient = max((mfp[:-1]+mfp[1:])/2*abs(np.diff(np.log(tg)))/np.diff(centers))
        instantaneous_power = contact*(tg[-1]-tw[0])
        boundary_gradient = mfp[-1]*abs(instantaneous_power)/(2*math.pi*length*c['radiusM']*kg[-1]*tg[-1])
        gradient_kn = max(bulk_gradient, boundary_gradient)
        assert abs(state['maxThermalGradientKn']-gradient_kn) <= 1e-13+1e-10*gradient_kn
        maximum_gradient_kn = max(maximum_gradient_kn, gradient_kn)
        assert abs(state['maxKn']-max(mfp)/c['radiusM']) <= 1e-13+1e-10*state['maxKn']
        if index == 0:
            assert state['maxMach'] == state['maxStressTimeRate'] == state['maxAcousticTimeRate'] == 0
            continue
        dt = state['timeS']-old['timeS']
        assert dt > 0 and math.isfinite(dt)
        oldg, oldw = np.asarray(old['gasK']), np.asarray(old['solidK'])
        oldedges = np.asarray(old['gasEdgesM'])
        vold = math.pi*length*np.diff(oldedges)*(oldedges[:-1]+oldedges[1:])
        sourceg, sourcew = np.asarray(state['gasSourceJ']), np.asarray(state['solidSourceJ'])
        internal_g = np.asarray(state['gasFaceEnergyJ'])
        internal_w = np.asarray(state['solidFaceEnergyJ'])
        assert sourceg.shape == tg.shape and sourcew.shape == tw.shape
        assert internal_g.shape == (len(tg)-1,) and internal_w.shape == (len(tw)-1,)
        assert all(np.all(np.isfinite(v)) for v in [sourceg, sourcew, internal_g, internal_w])
        interface, cooling = state['interfaceEnergyJ'], state['coolingEnergyJ']
        assert math.isfinite(interface) and math.isfinite(cooling)
        expected_fluxes = np.r_[dt*gl*(tg[:-1]-tg[1:]), dt*wl*(tw[:-1]-tw[1:]),
                                dt*contact*(tg[-1]-tw[0]), dt*outer*(tw[-1]-c['coolantK'])]
        actual_fluxes = np.r_[internal_g, internal_w, interface, cooling]
        assert np.max(abs(expected_fluxes-actual_fluxes)) <= 1e-11+1e-10*np.max(abs(expected_fluxes))
        assert abs(state['interfaceConductanceWK']-contact) <= 1e-12+1e-11*contact
        if jump is None:
            assert state['jumpLengthM'] is None
        else:
            assert abs(state['jumpLengthM']-jump) <= 1e-14+1e-11*jump
        power = interface/dt
        assert abs(state['gasSurfaceK']-(tg[-1]-power*rg)) <= 1e-8
        assert abs(state['solidSurfaceK']-(tw[0]+power*rw)) <= 1e-8
        gas_change = cv*(tg-oldg)
        work = p*(vi-vold)
        solid_change = masses*solid_hchange(tw, oldw, c)
        gas_residual = gas_change+work-sourceg
        gas_residual[:-1] += internal_g
        gas_residual[1:] -= internal_g
        gas_residual[-1] += interface
        wall_residual = solid_change-sourcew
        wall_residual[:-1] += internal_w
        wall_residual[1:] -= internal_w
        wall_residual[0] -= interface
        wall_residual[-1] += cooling
        gas_flux_scale, wall_flux_scale = abs(sourceg).copy(), abs(sourcew).copy()
        gas_flux_scale[:-1] += abs(internal_g)
        gas_flux_scale[1:] += abs(internal_g)
        gas_flux_scale[-1] += abs(interface)
        wall_flux_scale[:-1] += abs(internal_w)
        wall_flux_scale[1:] += abs(internal_w)
        wall_flux_scale[0] += abs(interface)
        wall_flux_scale[-1] += abs(cooling)
        gas_storage = cv*(abs(tg)+abs(oldg))+p*(abs(vi)+abs(vold))
        wall_storage = masses*np.maximum(solid_cp(tw, c), solid_cp(oldw, c))*(abs(tw)+abs(oldw))
        # No one-joule absolute floor: budget float roundoff on stored energy
        # separately from a relative allowance on actual heat/storage changes.
        gas_budget = 128*np.finfo(float).eps*gas_storage+2e-10*(abs(gas_change)+abs(work)+gas_flux_scale)
        gas_budget += p*(volume_roundoff(edges, length)+volume_roundoff(oldedges, length))
        wall_budget = 128*np.finfo(float).eps*wall_storage+2e-10*(abs(solid_change)+wall_flux_scale)
        row = max(float(np.max(np.abs(gas_residual))), float(np.max(np.abs(wall_residual))))
        ratio = max(float(max(abs(gas_residual)/gas_budget)), float(max(abs(wall_residual)/wall_budget)))
        assert ratio <= 1., (case['name'], index, 'row energy budget ratio', ratio, row)
        maximum_budget_ratio = max(maximum_budget_ratio, ratio)
        maximum_gas_row = max(maximum_gas_row, float(max(abs(gas_residual))))
        maximum_wall_row = max(maximum_wall_row, float(max(abs(wall_residual))))
        step_budget = float(sum(gas_budget)+sum(wall_budget))
        cumulative_budget += step_budget
        # Algebraically independent check of Cp*dT - Vold*dp identity.
        identity = check_pressure_work_identity(number, tg, oldg, p, old['pressurePa'], vi, vold, edges, oldedges, length)
        maximum_pressure_identity_ratio = max(maximum_pressure_identity_ratio, identity['geometryBudgetRatio'])
        maximum_legacy_pressure_ratio = max(maximum_legacy_pressure_ratio, identity['storedEnergyOnlyBudgetRatio'])
        balance = float(sum(gas_change)+sum(solid_change)-sum(sourceg)-sum(sourcew)+cooling)
        assert abs(balance) <= step_budget, (case['name'], index, 'global energy', balance)
        assert abs(sum(work)) <= 128*np.finfo(float).eps*p*volume
        # Shared passive face energies must always point down temperature.
        assert np.min(internal_g*(tg[:-1]-tg[1:]), initial=0.) >= -1e-12
        assert np.min(internal_w*(tw[:-1]-tw[1:]), initial=0.) >= -1e-12
        assert interface*(tg[-1]-tw[0]) >= -1e-12
        assert cooling*(tw[-1]-c['coolantK']) >= -1e-12
        if c['alpha'] == 0:
            assert interface == 0 and state['interfaceConductanceWK'] == 0
        entropy = float(np.dot(number*KB, 1.5*np.log1p((tg-oldg)/oldg)+np.log1p((vi-vold)/vold)))
        entropy += float(np.dot(masses, solid_schange(tw, oldw, c)))
        entropy += cooling/c['coolantK']-float(sum(sourceg/tg)+sum(sourcew/tw))
        budget = 16*np.finfo(float).eps*(1+float(sum(cv))+float(np.dot(masses, solid_cp(tw, c))))
        assert entropy >= -budget, (case['name'], index, 'entropy', entropy, budget)
        cumulative_interface += interface
        cumulative_cooling += cooling
        cumulative_source += float(sum(sourceg)+sum(sourcew))
        maximum_row, maximum_energy = max(maximum_row, row), max(maximum_energy, abs(balance))
        minimum_entropy = min(minimum_entropy, entropy)
        # Conservative speed screen only: no reported Mach value is trusted.
        sound_min = math.sqrt((5/3)*KB*float(min(tg))/mass)
        expected_mach = float(max(abs(edges-oldedges)))/dt/sound_min
        maximum_conservative_mach = max(maximum_conservative_mach, expected_mach)
        assert abs(state['maxMach']-expected_mach) <= 1e-14+1e-10*expected_mach
        log_rate = abs(np.log(tg/oldg))/dt
        stress_rate, acoustic_rate = max(mu/p*log_rate), c['radiusM']/sound_min*max(log_rate)
        assert abs(state['maxStressTimeRate']-stress_rate) <= 1e-13+1e-10*stress_rate
        assert abs(state['maxAcousticTimeRate']-acoustic_rate) <= 1e-13+1e-10*acoustic_rate
        maximum_stress_rate = max(maximum_stress_rate, stress_rate)
        maximum_acoustic_rate = max(maximum_acoustic_rate, acoustic_rate)
        old = state
    finalg, finalw = np.asarray(states[-1]['gasK']), np.asarray(states[-1]['solidK'])
    total_change = float(np.dot(cv, finalg-initial_gas)+np.dot(masses, solid_hchange(finalw, initial_solid, c)))
    final_error = total_change+cumulative_cooling-cumulative_source
    assert abs(final_error) <= cumulative_budget
    return {'name': case['name'], 'checkedStates': len(states), 'allPass': True,
            'maximumRowEnergyResidualJ': maximum_row, 'maximumGlobalStepResidualJ': maximum_energy,
            'maximumGasRowResidualJ': maximum_gas_row, 'maximumSolidRowResidualJ': maximum_wall_row,
            'maximumRowRoundoffRelativeBudgetRatio': maximum_budget_ratio,
            'cumulativeEnergyBudgetJ': cumulative_budget,
            'cumulativeEnergyResidualJ': final_error, 'minimumReducedEntropyIncrementJK': minimum_entropy,
            'maximumIdealGasRelativeError': maximum_eos, 'maximumVolumeRelativeError': maximum_volume,
            'maximumNumberRelativeError': maximum_number, 'maximumConservativeMach': maximum_conservative_mach,
            'maximumThermalGradientKn': maximum_gradient_kn,
            'maximumStressTimeRate': maximum_stress_rate, 'maximumAcousticTimeRate': maximum_acoustic_rate,
            'maximumPressureIdentityGeometryBudgetRatio': maximum_pressure_identity_ratio,
            'maximumPressureIdentityLegacyStoredOnlyBudgetRatio': maximum_legacy_pressure_ratio,
            'cumulativeInterfaceEnergyJ': cumulative_interface, 'cumulativeCoolingEnergyJ': cumulative_cooling}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    raw = args.input.read_bytes()
    packet = json.loads(gzip.decompress(raw) if args.input.suffix == '.gz' else raw)
    result = {'allPass': True, 'cases': [checked_case(c) for c in packet['cases']],
              'inputSHA256': hashlib.sha256(raw).hexdigest(),
              'scriptSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'scope': 'Independent all-state thermodynamics, fixed shell particle numbers and ideal-gas geometry; no physical accommodation qualification.'}
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(json.dumps(result, indent=2, allow_nan=False))


if __name__ == '__main__':
    main()
