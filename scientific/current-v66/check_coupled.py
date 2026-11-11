"""Independent coupled-step audit; stdlib only, no production imports.

Execute only in parent's offline safe-dev guest:
    python check_coupled.py EXPORTED_CASES.json NEW_AUDIT.json
Prospective gate:1e-9 natural dynamic scale plus explicit64-ULP energy storage.
"""
import hashlib
import json
import math
from pathlib import Path
import re
import sys

K = 1.380649e-23
EPS = sys.float_info.epsilon
TOL = 1e-9


def total(values):
    return math.fsum(values)


class Checks:
    def __init__(self):
        self.maxima = {}
        self.count = 0

    def check(self, actual, expected, name, scale=0, roundoff=0):
        if not all(math.isfinite(v) for v in (actual, expected, scale, roundoff)) or roundoff < 0:
            raise ValueError(name+': nonfinite quantity or invalid allowance')
        denominator = max(abs(actual), abs(expected), abs(scale), 1e-300)
        adjusted = max(0., abs(actual-expected)-roundoff)/denominator
        self.maxima[name] = max(self.maxima.get(name, 0.), adjusted)
        self.count += 1
        if adjusted > TOL:
            raise ValueError(f'{name}: error {abs(actual-expected)}, scale {denominator}, storage allowance {roundoff}, adjusted relative {adjusted}')


def dynamic_scale_roundoff(old, new, dynamic):
    """Arithmetic comparison bound, not a physical-energy scale or tolerance.

    JS sequential sums and Python fsum differ by <=(gamma[n-1]+eps)*sum|U|.
    Bound rounding in both new-minus-old subtractions separately; abs() is
    nonexpansive. EPS conservatively bounds binary64's unit roundoff.
    """
    allowance = 0.
    for key in ('gasEnergyJ', 'linerEnergyJ'):
        sequential_bounds, fsum_bounds = [], []
        for state in (old, new):
            values = state[key]; magnitude = total(abs(v) for v in values)
            operations = max(0, len(values)-1)
            gamma = operations*EPS/(1-operations*EPS)
            allowance += (gamma+EPS)*magnitude
            sequential_bounds.append((1+gamma)*magnitude)
            fsum_bounds.append((1+EPS)*magnitude)
        allowance += EPS*(total(sequential_bounds)+total(fsum_bounds))
    # The two nonnegative outer scale reductions contain at most eight terms.
    gamma8 = 8*EPS/(1-8*EPS)
    return allowance+2*gamma8*(abs(dynamic)+allowance)/(1-gamma8)


def conductive_flux_roundoff(dt_conductance, left_k, right_k):
    """One-adjacent-float temperature representability bound for a face heat.

    This is distinct from stored-U subtraction. At stiff graded faces a
    temperature ULP times dt*G can exceed the stored-energy arithmetic floor.
    The restricted conductivity laws satisfy |T*kappa'/kappa| <= 1; positive
    series resistances cannot amplify their relative perturbations.
    """
    if not all(math.isfinite(v) for v in (dt_conductance, left_k, right_k)) or dt_conductance < 0 or min(left_k, right_k) <= 0:
        raise ValueError('Invalid conductive face for roundoff reconstruction')
    dl, dr = math.ulp(left_k), math.ulp(right_k)
    temperature = dt_conductance*(dl+dr)
    relative = dl/left_k+dr/right_k
    heat = abs(dt_conductance*(left_k-right_k))
    conductivity = heat*relative/(1-relative)
    gamma3 = 3*EPS/(1-3*EPS)
    return temperature+conductivity+gamma3*(heat+temperature+conductivity)


def neutral(material, temperature):
    if material == 'lithium':
        if not 100 <= temperature <= 3000:
            raise ValueError('Li neutral fit domain')
        return 3.14e-8*temperature**.863, 1.398e-4*temperature**.863
    if material != 'argon' or not 300 <= temperature <= 20000:
        raise ValueError('Ar neutral table domain')
    temperatures = [300, 500, 1000, 2000, 4000, 5000, 6000, 8000, 10000, 15000, 20000]
    cross_sections = [12.88, 11.12, 9.66, 8.60, 7.57, 7.23, 6.96, 6.53, 6.20, 5.60, 5.17]
    index = next(i for i in range(len(temperatures)-1) if temperature <= temperatures[i+1])
    fraction = (temperature-temperatures[index])/(temperatures[index+1]-temperatures[index])
    omega22 = math.pi*1e-20*(cross_sections[index]*(1-fraction)+cross_sections[index+1]*fraction)
    mass = 39.948*1.66053906892e-27
    viscosity = 5*math.sqrt(math.pi*mass*K*temperature)/(16*omega22)
    return viscosity, 15*K*viscosity/(4*mass)


def solid(temperature):
    if not 300 <= temperature <= 1900:
        raise ValueError('Tungsten temperature domain')
    a, b, c, d, e, mass = 23.95930, 2.639680e-3, 1.257750e-6, -.254642e-9, -.048407e6, .18384
    old = 300.
    enthalpy = (temperature-old)*(a+b*(temperature+old)/2+c*(temperature**2+temperature*old+old**2)/3+
                                  d*(temperature**3+temperature**2*old+temperature*old**2+old**3)/4+e/(temperature*old))/mass
    conductivity = 149.441-.045466*temperature+13.193e-6*temperature**2-1.484e-9*temperature**3+3.866e6/temperature**2
    return enthalpy, conductivity


def invert_solid(enthalpy):
    if not 0 <= enthalpy <= solid(1900)[0]*(1+8*EPS):
        raise ValueError('Initial solid enthalpy domain')
    low, high = 300., 1900.
    for _ in range(70):
        middle = (low+high)/2
        if solid(middle)[0] < enthalpy:
            low = middle
        else:
            high = middle
    return (low+high)/2


def numbers(setup, state):
    fractions = [setup['lightFraction'], 1-setup['lightFraction']]
    probability = [state['lightMass'], state['heavyMass']]
    ns = [[setup['number']*fraction*p for p in ps] for fraction, ps in zip(fractions, probability)]
    count = [a+b for a, b in zip(*ns)]
    if any(v <= 0 or not math.isfinite(v) for v in count):
        raise ValueError('Positive canonical gas cell count required')
    temperature = [u/(1.5*K*n) for u, n in zip(state['gasEnergyJ'], count)]
    mass = [a*setup['speciesMassKg'][0]+b*setup['speciesMassKg'][1] for a, b in zip(*ns)]
    return ns, temperature, mass


def finite_array(values, size, name, positive=False):
    if not isinstance(values, list) or len(values) != size:
        raise ValueError(name+': exact array length required')
    if any(not isinstance(v, (int, float)) or not math.isfinite(v) or (positive and v <= 0) for v in values):
        raise ValueError(name+': invalid cell value')


def validate_state(state, n, ns):
    for key in ('lightMass', 'heavyMass', 'omegaRadS', 'gasEnergyJ'):
        finite_array(state[key], n, key, positive=key == 'gasEnergyJ')
    finite_array(state['linerEnergyJ'], ns, 'linerEnergyJ')
    for key in ('lightMass', 'heavyMass'):
        if any(p < 0 for p in state[key]) or abs(total(state[key])-1) > 512*EPS*n:
            raise ValueError('Species probabilities must be positive and normalized')


def enthalpy_face_temperature(a, b):
    u = (b-a)/a
    if abs(u) < 1e-5:
        return a*(1+u/2-u*u/6+u**3/12-u**4/20)
    return b*math.log1p(u)/u


def bernoulli(z):
    if z < 1e-5:
        return 1-z/2+z*z/12-z**4/720
    return z*math.exp(-z)/(-math.expm1(-z)) if z > 50 else z/math.expm1(z)


def sg_solution(old, temperatures, omega, species_mass, radius, diffusion, dt):
    n = len(old)
    diagonal, lower, upper = [1.]*n, [], []
    for i in range(n-1):
        inverse = (1/temperatures[i]+1/temperatures[i+1])/2
        work = species_mass*radius*radius*(omega[i]**2+omega[i+1]**2)/(4*n)
        z = work*inverse/K
        b = bernoulli(z)
        factor = dt*4*diffusion/radius**2*(i+1)*n*inverse
        outward, inward = factor*temperatures[i]*(b+z), factor*temperatures[i+1]*b
        diagonal[i] += outward
        diagonal[i+1] += inward
        lower.append(-outward)
        upper.append(-inward)
    rhs = old[:]
    for i in range(1, n):
        factor = lower[i-1]/diagonal[i-1]
        diagonal[i] -= factor*upper[i-1]
        rhs[i] -= factor*rhs[i-1]
    solution = [0.]*n
    solution[-1] = rhs[-1]/diagonal[-1]
    for i in range(n-2, -1, -1):
        solution[i] = (rhs[i]-upper[i]*solution[i+1])/diagonal[i]
    return solution


def entropy_change(setup, old, new, old_temperature, new_temperature, old_solid, new_solid):
    n = len(old_temperature)
    entropy = 0.
    for fraction, key in ((setup['lightFraction'], 'lightMass'), (1-setup['lightFraction'], 'heavyMass')):
        for p0, p1, t0, t1 in zip(old[key], new[key], old_temperature, new_temperature):
            # Dimensionless reference density is each species' conserved mean density.
            s0 = p0*(1.5*math.log(t0/300)-math.log(n*p0)) if p0 else 0.
            s1 = p1*(1.5*math.log(t1/300)-math.log(n*p1)) if p1 else 0.
            entropy += K*setup['number']*fraction*(s1-s0)
    a, b, c, d, e, molar_mass = 23.95930, 2.639680e-3, 1.257750e-6, -.254642e-9, -.048407e6, .18384
    for mass, t0, t1 in zip(setup['liner']['massesKg'], old_solid, new_solid):
        difference = t1-t0
        entropy += mass/molar_mass*(a*math.log(t1/t0)+b*difference+c*difference*(t1+t0)/2+
                                   d*difference*(t1*t1+t1*t0+t0*t0)/3+e*(1/t0**2-1/t1**2)/2)
    return entropy


def audit_step(c, old, record, check):
    dt, result = record['dtS'], record['result']
    new, momentum, electrical, thermal = (result[k] for k in ('state', 'momentum', 'electrical', 'thermal'))
    n = len(old['lightMass']); radius, length = c['radiusM'], c['lengthM']
    if not math.isfinite(dt) or dt <= 0:
        raise ValueError('Accepted coupled step requires finite positive timestep')
    ns = len(c['liner']['massesKg'])
    validate_state(old, n, ns); validate_state(new, n, ns)
    edges = c['electrical']['radialEdgesM']; volume = math.pi*radius**2*length/n
    finite_array(edges, n+1, 'radialEdgesM')
    if edges[0] != 0 or edges[-1] != radius or any(b <= a for a, b in zip(edges, edges[1:])):
        raise ValueError('Full-cylinder radial geometry required')
    q = [(a*a+b*b)/2 for a, b in zip(edges, edges[1:])]
    dq = radius**2/n
    if any(abs(b*b-a*a-dq) > 128*EPS*radius**2 for a, b in zip(edges, edges[1:])):
        raise ValueError('Equal-volume radial cells required')
    old_ns, old_t, mass0 = numbers(c, old)
    new_ns, canonical_t, mass1 = numbers(c, new)
    t = thermal['gasTemperatureK']
    old_inertia, inertia = ([m*v for m, v in zip(ms, q)] for ms in (mass0, mass1))
    w0, w = old['omegaRadS'], new['omegaRadS']; source_w = result['sourceOmegaRadS']
    faces = result['faceTransfers']
    if len(source_w) != n or len(faces) != 2 or any(len(f) != n-1 for f in faces):
        raise ValueError('Missing exact accepted coupling fields')
    for label, values in (('sourceOmegaRadS', source_w), ('momentum omegaRadS', momentum['omegaRadS']),
                          ('centWorkJByCell', momentum['centWorkJByCell']), ('shearHeatJByCell', momentum['shearHeatJByCell']),
                          ('thermal gasTemperatureK', thermal['gasTemperatureK'])):
        finite_array(values, n, label)
    finite_array(thermal['linerSolveTemperatureK'], ns, 'linerSolveTemperatureK', positive=True)
    nz = len(c['electrical']['axialEdgesM'])-1
    finite_array(electrical['torqueNm'], n*nz, 'electrical torqueNm')
    finite_array(electrical['jouleByCellW'], n*nz, 'electrical jouleByCellW')
    finite_array(thermal['speciesFaceEnergyJ'], n-1, 'speciesFaceEnergyJ')
    finite_array(thermal['gasFaceEnergyJ'], n-1, 'gasFaceEnergyJ')
    for species, key in enumerate(('lightMass', 'heavyMass')):
        old_p, new_p, flux = old[key], new[key], faces[species]
        if any(p < 0 or not math.isfinite(p) for p in new_p):
            raise ValueError('Species positivity failed')
        check.check(total(new_p), total(old_p), 'species inventory')
        expected = sg_solution(old_p, t, source_w, c['speciesMassKg'][species], radius, c['diffusivityM2S'], dt)
        for i in range(n):
            change = (flux[i-1] if i else 0)-(flux[i] if i < n-1 else 0)
            check.check(new_p[i]-old_p[i], change, 'accepted species continuity', abs(old_p[i])+abs(new_p[i])+abs(change))
            check.check(new_p[i], expected[i], 'independent SG solution', old_p[i]+new_p[i])
    fractions = [c['lightFraction'], 1-c['lightFraction']]
    transfer = [c['number']*total(fractions[s]*c['speciesMassKg'][s]*faces[s][i] for s in range(2)) for i in range(n-1)]
    mu_k = [neutral(c['material'], ti) for ti in t]
    if momentum['grid']['shearScheme'] != 'volume-coordinate':
        raise ValueError('Coupled volume-average states require the declared volume-coordinate shear scheme')
    conductance = [0.]
    halves = []
    for i in range(n-1):
        face_q = edges[i+1]**2
        left = (face_q-q[i])/(4*math.pi*length*mu_k[i][0]*face_q**2)
        right = (q[i+1]-face_q)/(4*math.pi*length*mu_k[i+1][0]*face_q**2)
        halves.append((left, right)); conductance.append(1/(left+right))
    conductance.append(4*math.pi*length*mu_k[-1][0]*edges[-1]**4/(edges[-1]**2-q[-1]))
    finite_array(momentum['grid']['conductance'], n+1, 'shear conductance')
    for actual, expected in zip(momentum['grid']['conductance'], conductance):
        check.check(actual, expected, 'volume-coordinate shear geometry')
    torque = [total(electrical['torqueNm'][i::n]) for i in range(n)]
    joule = [total(electrical['jouleByCellW'][i::n]) for i in range(n)]
    angular_flux = [f*edges[i+1]**2*(w[i] if f >= 0 else w[i+1]) for i, f in enumerate(transfer)]
    work = [f*(q[i+1]-q[i])*(w[i]**2+w[i+1]**2)/4 for i, f in enumerate(transfer)]
    numerical_advection = total(abs(f)*edges[i+1]**2*(w[i+1]-w[i])**2/2 for i, f in enumerate(transfer))
    numerical_be = total(ii*(b-a)**2/2 for ii, a, b in zip(old_inertia, w0, w))
    shear, centrifugal = [0.]*n, [0.]*n
    for i, (left, right) in enumerate(halves):
        heat = dt*conductance[i+1]*(w[i+1]-w[i])**2
        shear[i] += heat*left/(left+right); shear[i+1] += heat*right/(left+right)
        centrifugal[i] += work[i]/2; centrifugal[i+1] += work[i]/2
    shear[-1] += dt*conductance[-1]*w[-1]**2
    wall_torque = -conductance[-1]*w[-1]
    for i in range(n):
        check.check(momentum['grid']['densityKgM3'][i], mass1[i]/volume, 'accepted density/inertia consistency')
        check.check(momentum['grid']['inertiaKgM2'][i], inertia[i], 'exact shell inertia')
        check.check(momentum['omegaRadS'][i], w[i], 'accepted momentum/state spin')
        check.check(t[i], canonical_t[i], 'canonical gas temperature')
        check.check(momentum['grid']['viscosityPaS'][i], mu_k[i][0], 'sourced endpoint viscosity')
        check.check(momentum['centWorkJByCell'][i], centrifugal[i], 'centrifugal gas work', total(abs(v) for v in work))
        check.check(momentum['shearHeatJByCell'][i], shear[i], 'physical shear heat', total(shear))
        shear_torque = (conductance[i]*(w[i-1]-w[i]) if i else 0)+(conductance[i+1]*((w[i+1] if i < n-1 else 0)-w[i]))
        advected = (angular_flux[i-1] if i else 0)-(angular_flux[i] if i < n-1 else 0)
        change = inertia[i]*w[i]-old_inertia[i]*w0[i]
        expected = advected+dt*(torque[i]+shear_torque)
        scale = abs(inertia[i]*w[i])+abs(old_inertia[i]*w0[i])+abs(advected)+dt*(abs(torque[i])+abs(shear_torque))
        check.check(change, expected, 'local angular momentum', scale)
    kinetic0 = total(ii*wi*wi/2 for ii, wi in zip(old_inertia, w0))
    kinetic = total(ii*wi*wi/2 for ii, wi in zip(inertia, w))
    drive = dt*total(a*b for a, b in zip(torque, w))
    angular0, angular = (total(ii*wi for ii, wi in zip(it, wt)) for it, wt in ((old_inertia, w0), (inertia, w)))
    check.check(momentum['kineticJ'], kinetic, 'reported mechanical kinetic energy')
    check.check(momentum['angularMomentumKgM2S'], angular, 'reported angular momentum')
    check.check(angular-angular0, dt*(total(torque)+wall_torque), 'global angular momentum', abs(angular)+abs(angular0)+dt*(total(abs(v) for v in torque)+abs(wall_torque)))
    increments = momentum['increment']
    for name, value in (('driveWorkJ', drive), ('wallWorkJ', 0.), ('shearHeatJ', total(shear)),
                        ('centrifugalWorkJ', total(work)), ('advectionNumericalLossJ', numerical_advection),
                        ('backwardEulerNumericalLossJ', numerical_be), ('numericalLossJ', numerical_advection+numerical_be)):
        check.check(increments[name], value, 'mechanical '+name, kinetic+kinetic0+abs(drive)+total(shear)+total(abs(v) for v in work))
    check.check(kinetic-kinetic0, drive-total(shear)-total(work)-numerical_advection-numerical_be,
                'mechanical work identity', kinetic+kinetic0+abs(drive)+total(shear)+total(abs(v) for v in work))
    expected_current_work = total(electrical['torqueNm'][j]*source_w[j % n] for j in range(len(electrical['torqueNm'])))
    check.check(electrical['mechanicalW'], expected_current_work, 'axial mechanical projection', abs(expected_current_work)+electrical['jouleW'])
    check.check(electrical['electrodePowerW'], electrical['jouleW']+expected_current_work, 'electrical work identity', abs(electrical['electrodePowerW'])+electrical['jouleW']+abs(expected_current_work))
    check.check(result['mechanicalEndpointDefectJ'], drive-dt*expected_current_work, 'declared endpoint work defect', abs(drive)+dt*electrical['jouleW'])
    omega_scale = max(1., *map(abs, source_w), *map(abs, w))
    mismatch = max(abs(a-b) for a, b in zip(source_w, w))
    check.check(result['maxOmegaMismatchRadS'], mismatch, 'declared endpoint spin defect', omega_scale)
    if mismatch > 2e-11*omega_scale:
        raise ValueError('Coupled spin endpoint did not meet its acceptance criterion')
    liner = c['liner']; solid_t = thermal['linerSolveTemperatureK']
    old_solid_t = [invert_solid(u/m) for u, m in zip(old['linerEnergyJ'], liner['massesKg'])]
    solid_k = [solid(ti)[1] for ti in solid_t]
    for i, (u, m, ti) in enumerate(zip(new['linerEnergyJ'], liner['massesKg'], solid_t)):
        check.check(u, m*solid(ti)[0], 'canonical solid enthalpy', abs(u))
    factor = 2*math.pi*length
    rsolid, xsolid = liner['radiusEdgesM'], liner['radiusCentersM']
    gas_factor = 4*math.pi*length
    gas_flux = []
    for i in range(n-1):
        kface = 2/(1/mu_k[i][1]+1/mu_k[i+1][1])
        conduction = dt*gas_factor*(i+1)*kface*(t[i]-t[i+1])
        particle_transfer = c['number']*total(fractions[s]*faces[s][i] for s in range(2))
        face_temperature = enthalpy_face_temperature(t[i], t[i+1])
        enthalpy = 2.5*K*particle_transfer*face_temperature
        check.check(thermal['speciesFaceEnergyJ'][i], enthalpy, 'species enthalpy flux', abs(enthalpy)+abs(conduction))
        gas_flux.append(conduction+enthalpy)
        check.check(thermal['gasFaceEnergyJ'][i], gas_flux[-1], 'gas conduction/enthalpy flux', abs(enthalpy)+abs(conduction))
    boundary = c['boundary']
    inner_g = 0. if boundary['gasWallWK'] == 0 else 1/(1/boundary['gasWallWK']+math.log(xsolid[0]/rsolid[0])/(factor*solid_k[0])+1/(2*gas_factor*mu_k[-1][1]*n))
    exchange = dt*inner_g*(t[-1]-solid_t[0])
    outer_g = 0. if boundary['coolingWK'] == 0 else 1/(1/boundary['coolingWK']+math.log(rsolid[-1]/xsolid[-1])/(factor*solid_k[-1]))
    cooling = dt*outer_g*(solid_t[-1]-boundary['coolantK'])
    check.check(thermal['gasExchangeJ'], exchange, 'gas-wall boundary flux', abs(exchange), 64*EPS*dt*inner_g*max(t[-1], solid_t[0]))
    check.check(thermal['coolingEnergyJ'], cooling, 'coolant boundary flux', abs(cooling), 64*EPS*dt*outer_g*max(solid_t[-1], boundary['coolantK']))
    for i in range(n):
        source = dt*joule[i]+shear[i]+centrifugal[i]
        check.check(thermal['gasSourceJ'][i], source, 'accepted physical gas source', dt*abs(joule[i])+shear[i]+abs(centrifugal[i]))
        outgoing = gas_flux[i] if i < n-1 else exchange
        incoming = gas_flux[i-1] if i else 0.
        change = new['gasEnergyJ'][i]-old['gasEnergyJ'][i]
        dynamic = abs(change)+abs(source)+abs(outgoing)+abs(incoming)
        storage = 64*EPS*(abs(new['gasEnergyJ'][i])+abs(old['gasEnergyJ'][i]))
        check.check(change, source+incoming-outgoing, 'local gas energy', dynamic, storage)
    solid_flux = [exchange]
    solid_flux_roundoff = [conductive_flux_roundoff(dt*inner_g, t[-1], solid_t[0])]
    for i in range(len(solid_t)-1):
        link = factor/(math.log(rsolid[i+1]/xsolid[i])/solid_k[i]+math.log(xsolid[i+1]/rsolid[i+1])/solid_k[i+1])
        solid_flux.append(dt*link*(solid_t[i]-solid_t[i+1]))
        solid_flux_roundoff.append(conductive_flux_roundoff(dt*link, solid_t[i], solid_t[i+1]))
    solid_flux.append(cooling)
    solid_flux_roundoff.append(conductive_flux_roundoff(dt*outer_g, solid_t[-1], boundary['coolantK']))
    solid_row_roundoff = []
    for i in range(len(solid_t)):
        change = new['linerEnergyJ'][i]-old['linerEnergyJ'][i]
        expected = solid_flux[i]-solid_flux[i+1]
        storage = 64*EPS*(abs(new['linerEnergyJ'][i])+abs(old['linerEnergyJ'][i]))
        flux_roundoff = solid_flux_roundoff[i]+solid_flux_roundoff[i+1]
        solid_row_roundoff.append(flux_roundoff)
        check.check(change, expected, 'local solid energy', abs(change)+abs(solid_flux[i])+abs(solid_flux[i+1]), storage+flux_roundoff)
    gas_change = total(new['gasEnergyJ'])-total(old['gasEnergyJ'])
    solid_change = total(new['linerEnergyJ'])-total(old['linerEnergyJ'])
    electrode_work = dt*electrical['electrodePowerW']
    check.check(result['inputWorkJ'], electrode_work, 'reported input electrical work')
    global_residual = kinetic-kinetic0+gas_change+solid_change+cooling-electrode_work+numerical_advection+numerical_be
    dynamic = abs(electrode_work)+kinetic0+kinetic+numerical_advection+numerical_be+abs(gas_change)+abs(solid_change)+abs(cooling)
    storage = 64*EPS*(total(old['gasEnergyJ'])+total(new['gasEnergyJ'])+total(abs(v) for v in old['linerEnergyJ'])+total(abs(v) for v in new['linerEnergyJ']))
    check.check(global_residual, 0., 'global dynamic energy', dynamic, storage)
    check.check(result['energyResidualJ'], global_residual, 'reported global energy residual', dynamic, storage)
    check.check(result['storageRoundoffJ'], storage, 'declared storage ULP allowance', storage)
    scale_roundoff = dynamic_scale_roundoff(old, new, dynamic)
    check.check(result['energyScaleJ'], dynamic, 'declared dynamic energy scale', dynamic, scale_roundoff)
    entropy = entropy_change(c, old, new, old_t, t, old_solid_t, solid_t)+cooling/boundary['coolantK']
    entropy_scale = dynamic/min(*old_t, *t, *old_solid_t, *solid_t, boundary['coolantK'])
    entropy_roundoff = storage/min(*old_t, *t, *old_solid_t, *solid_t, boundary['coolantK'])
    if entropy < -TOL*entropy_scale-entropy_roundoff:
        raise ValueError(f'Conditional ideal-gas/solid total entropy decreased: {entropy}')
    return {'globalEnergyResidualJ': global_residual, 'dynamicEnergyScaleJ': dynamic, 'storageRoundoffJ': storage,
            'declaredDynamicScaleArithmeticAllowanceJ': scale_roundoff,
            'solidFaceTemperatureRoundoffAllowanceJ': solid_flux_roundoff,
            'solidRowFluxRoundoffAllowanceJ': solid_row_roundoff,
            'totalEntropyChangeIncludingCoolantJK': entropy, 'entropyRoundoffAllowanceJK': entropy_roundoff,
            'mechanicalEndpointDefectJ': drive-dt*expected_current_work, 'endpointOmegaRelativeMismatch': mismatch/omega_scale}


def audit_packet(packet):
    if not re.fullmatch('[0-9a-f]{64}', packet['sourceSHA256']):
        raise ValueError('Need exact source snapshot SHA256')
    ids = [case['id'] for case in packet['cases']]
    if not ids or len(ids) != len(set(ids)):
        raise ValueError('Need distinct nonempty coupled cases')
    cases = []
    for case in packet['cases']:
        requested = case['requestedSteps']
        if not isinstance(requested, int) or requested <= 0 or len(case['steps']) != requested or case.get('failure') is not None:
            raise ValueError(case['id']+': incomplete or failed requested trajectory')
        check, old, steps = Checks(), case['initialState'], []
        for index, record in enumerate(case['steps']):
            try:
                steps.append(audit_step(case['setup'], old, record, check))
            except (ValueError, KeyError, ZeroDivisionError) as error:
                raise ValueError(f'{case["id"]}, accepted step {index}: {error}') from error
            old = record['result']['state']
        if not steps:
            raise ValueError('No accepted steps exported')
        cases.append({'id': case['id'], 'acceptedSteps': len(steps), 'checks': check.count,
                      'maxRoundoffAdjustedRelativeErrors': check.maxima,
                      'minimumTotalEntropyChangeIncludingCoolantJK': min(s['totalEntropyChangeIncludingCoolantJK'] for s in steps),
                      'steps': steps, 'passed': True})
    return {'method': 'Independent stdlib finite-volume reconstruction; no production imports',
            'sourceSHA256': packet['sourceSHA256'], 'prospectiveTolerance': TOL,
            'energyStorageAllowance': '64 binary64 epsilon times explicitly stored energy, reported separately',
            'cases': cases, 'allPassed': True, 'experimentalValidation': False}


def negative_controls(packet):
    """Deliberately corrupt accepted data; every corruption must be rejected."""
    controls = {
        'missing accepted solid solve temperature': lambda r: r['thermal'].pop('linerSolveTemperatureK'),
        'wrong canonical density': lambda r: r['momentum']['grid']['densityKgM3'].__setitem__(0, r['momentum']['grid']['densityKgM3'][0]*1.01),
        'wrong shell inertia': lambda r: r['momentum']['grid']['inertiaKgM2'].__setitem__(0, r['momentum']['grid']['inertiaKgM2'][0]*1.01),
        'wrong accepted angular speed': lambda r: r['state']['omegaRadS'].__setitem__(0, r['state']['omegaRadS'][0]+max(1., abs(r['state']['omegaRadS'][0]))*.01),
        'invented gas heat': lambda r: r['state']['gasEnergyJ'].__setitem__(0, r['state']['gasEnergyJ'][0]*1.01),
        'wrong projected torque': lambda r: r['electrical']['torqueNm'].__setitem__(0, r['electrical']['torqueNm'][0]+max(1e-12, max(map(abs, r['electrical']['torqueNm'])))*.01),
        'background energy used as dynamic scale': lambda r: r.__setitem__('energyScaleJ', r['energyScaleJ']*100+1),
        'undeclared old shear geometry': lambda r: r['momentum']['grid'].__setitem__('shearScheme', 'integrated-resistance'),
    }
    outcomes = []
    for name, mutate in controls.items():
        altered = json.loads(json.dumps(packet))
        mutate(altered['cases'][0]['steps'][0]['result'])
        try:
            audit_packet(altered)
        except (ValueError, KeyError, ZeroDivisionError) as error:
            outcomes.append({'control': name, 'rejected': True, 'reason': str(error)})
        else:
            raise ValueError('Independent checker missed negative control: '+name)
    partial = json.loads(json.dumps(packet))
    partial['cases'][0]['steps'].pop()
    try:
        audit_packet(partial)
    except ValueError as error:
        outcomes.append({'control': 'partial accepted trajectory', 'rejected': True, 'reason': str(error)})
    else:
        raise ValueError('Independent checker missed partial accepted trajectory')
    return outcomes


if __name__ == '__main__':
    raw = Path(sys.argv[1]).read_bytes()
    packet = json.loads(raw)
    result = audit_packet(packet)
    result['negativeControls'] = negative_controls(packet)
    result['exportFileSHA256'] = hashlib.sha256(raw).hexdigest()
    with Path(sys.argv[2]).open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    print(json.dumps({'allPassed': result['allPassed'], 'cases': len(result['cases']),
                      'acceptedSteps': sum(c['acceptedSteps'] for c in result['cases'])}, indent=2))
