"""Conditional neutral-gas screens, not a new gas solver. Execute in safe-dev.

The viscosity mean-free-path convention follows Sharipov & Seleznev Eq2.3:
https://srd.nist.gov/jpcrdreprint/1.556019.pdf . It is not a collision count.
The single-wall Maxwellian energy moment is 2kT per incident atom:
https://ntrs.nasa.gov/api/citations/19860022180/downloads/19860022180.pdf AppB.
"""
import math

K = 1.380649e-23
U = 1.66053906892e-27
SCREEN_KN = .01
SCREEN_TIME_RATIO = .1


def positive(value):
    if not isinstance(value, (float, int)) or not math.isfinite(value) or value <= 0:
        raise ValueError('Finite positive physical value required')
    return value


def assess(case, property_at=None):
    """property_at(pair,T,x_light) returns attributed mu/k or None.

    Initial p,T set fixed neutral inventory. State arrays are per-species
    NUMBER probabilities on equal-volume gas cells, not wall thermal cells.
    No collision rate, phenomenological mass D or numerical dt is repurposed.
    """
    c, s = case['config'], case['state']
    r, length, t0, p0, t = map(positive, (c['radiusM'], c['lengthM'], c['gasK'], c['pressurePa'], s['gasK']))
    x = c['lightFraction']
    if not math.isfinite(x) or not 0 <= x <= 1:
        raise ValueError('Species fraction outside [0,1]')
    masses = [positive(m)*U for m in c['speciesMassU']]
    if len(masses) != 2:
        raise ValueError('Two-species assessment required')
    g = case['gasWallWK']
    if not math.isfinite(g) or g < 0:
        raise ValueError('Finite nonnegative film conductance required')
    if not math.isfinite(s['neutralRadS']):
        raise ValueError('Finite neutral angular speed required')
    probabilities = [s['lightMass'], s['heavyMass']]
    count = len(probabilities[0])
    if count < 1 or any(len(p) != count or any(not math.isfinite(v) or v < 0 for v in p)
                         or abs(sum(p)-1) > 2e-8 for p in probabilities):
        raise ValueError('Normalized nonnegative per-species number inventories required')
    if c['pair'] == 'molecular':
        return {'name': case['name'], 'supported': False, 'qualified': False,
                'reason': 'Molecular internal modes and accommodation are outside the atomic thermal model'}
    volume, area = math.pi*r*r*length, 2*math.pi*r*length
    n = p0/(K*t0)
    capacity = 1.5*n*K*volume
    mean_mass = x*masses[0]+(1-x)*masses[1]
    sound = math.sqrt((5/3)*K*t/mean_mass)
    tau = capacity/g if g else None
    get = property_at or (lambda pair, temperature, fraction: None)
    global_properties = get(c['pair'], t, x)
    cells = []
    for i in range(count):
        partial = [n*f*count*probabilities[j][i] for j, f in enumerate((x, 1-x))]
        density = sum(partial)
        local_x = partial[0]/density if density else None
        properties = get(c['pair'], t, local_x) if density else None
        pressure = density*K*t
        row = {'partialNumberDensitiesM3': partial, 'numberDensityM3': density,
               'lightFraction': local_x, 'pressurePa': pressure,
               'properties': properties, 'lambdaViscosityM': None,
               'knRadius': None, 'stressRelaxationTimeS': None}
        if properties:
            mu, conductivity = map(positive, (properties['muPaS'], properties['kWMK']))
            local_mass = local_x*masses[0]+(1-local_x)*masses[1]
            path = mu/pressure*math.sqrt(math.pi*K*t/(2*local_mass))
            row.update(lambdaViscosityM=path, knRadius=path/r, stressRelaxationTimeS=mu/pressure)
        cells.append(row)
    # These are outer GAS-cell means, never exact kinetic boundary densities.
    wall_partial = cells[-1]['partialNumberDensitiesM3']
    arrivals = [density*math.sqrt(K*t/(2*math.pi*m)) for density, m in zip(wall_partial, masses)]
    maxwell = 2*K*area*sum(arrivals)
    required = g/maxwell if maxwell else None
    # Drift reference is diagnostic only: existing drag heat is not changed.
    speed = s['neutralRadS']*r
    drift = .5*area*sum(flux*m*speed**2 for flux, m in zip(arrivals, masses))
    centers = [r*math.sqrt((i+.5)/count) for i in range(count)]
    gradient_kn = []
    unresolved_gradient = False
    for j, fraction in enumerate((x, 1-x)):
        if fraction == 0:
            continue
        for i in range(count-1):
            a, b = (cells[q]['partialNumberDensitiesM3'][j] for q in (i, i+1))
            paths = [cells[q]['lambdaViscosityM'] for q in (i, i+1)]
            if a <= 0 or b <= 0 or None in paths:
                unresolved_gradient = True
                continue
            inverse_length = abs(math.log(b)-math.log(a))/(centers[i+1]-centers[i])
            gradient_kn.append(max(paths)*inverse_length)
    all_paths = all(row['knRadius'] is not None for row in cells)
    kn_max = max(row['knRadius'] for row in cells) if all_paths else None
    grad_max = max(gradient_kn, default=0.) if count >= 2 and not unresolved_gradient else None
    transport = {'globalProperties': global_properties, 'maximumKnRadius': kn_max,
                 'maximumGradientKn': grad_max, 'radialDiffusionCvS': None,
                 'radialDiffusionCpS': None, 'axialDiffusionCpS': None,
                 'biotVolumeOverArea': None, 'radialCpOverFilmTime': None}
    if global_properties:
        conductivity = positive(global_properties['kWMK'])
        radial_cv, radial_cp = 1.5*n*K*r*r/conductivity, 2.5*n*K*r*r/conductivity
        transport.update(radialDiffusionCvS=radial_cv, radialDiffusionCpS=radial_cp,
                         axialDiffusionCpS=2.5*n*K*length*length/conductivity,
                         biotVolumeOverArea=g*volume/(area*area*conductivity),
                         radialCpOverFilmTime=radial_cp/tau if tau else None)
    continuum = kn_max is not None and grad_max is not None and max(kn_max, grad_max) < SCREEN_KN
    ratio = transport['radialCpOverFilmTime']
    conduction = (continuum and ratio is not None and ratio < SCREEN_TIME_RATIO)
    return {'name': case['name'], 'supported': True, 'qualified': False,
            'meanNumberDensityM3': n, 'meanPressurePa': n*K*t,
            'neutralCapacityJK': capacity, 'lateralWallAreaM2': area,
            'soundSpeedMS': sound, 'radialAcousticTimeS': r/sound,
            'axialAcousticTimeS': length/sound, 'nominalFilmTimeS': tau,
            'scaleAssumptions': 'Acoustics use bulk frozen-composition ideal sound speed; diffusion/Bi use bulk uniform properties; gradients use cell-center log secants, not thermal gradients',
            'wall': {'numberDensitiesM3': wall_partial, 'maxwellReferenceWK': maxwell,
                     'requiredAccommodationReference': required,
                     'fullAccommodationTangentialDriftReferenceW': drift,
                     'densitySource': 'Outer gas-cell mean; boundary reconstruction needs spatial qualification',
                     'accommodation': None},
            'transport': transport, 'cells': cells,
            'screens': {'continuumCandidate': continuum,
                        'conductionLumpingNotExcluded': conduction if g else None,
                        'wallReference': ('disabled' if not g else 'vacuum-unresolved' if required is None else
                                          'exceeds-local-Maxwellian-reference' if required > 1 else
                                          'requires-accommodation-and-gas-transport'),
                        'thresholds': {'kn': SCREEN_KN, 'diffusionToFilmTime': SCREEN_TIME_RATIO},
                        'scope': 'Heuristic necessary screens, not sufficient validation; axial/forcing/deposition and chemistry unresolved'}}
