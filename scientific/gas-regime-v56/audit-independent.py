"""Independent gas-screen arithmetic and Maxwell-flux audit. Safe-dev only.

Usage: audit-independent.py INPUT.json RESULTS.json OUTPUT.json
Imports no assessment, transport, Cantera, or simulation module. SciPy
quadrature evaluates the normal/tangential Maxwellian moments explicitly.
This verifies calculations and declared scope, not gas mixing or hardware.
"""
from pathlib import Path
import hashlib
import json
import math
import sys
from scipy.integrate import quad

KB = 1.380649e-23
AMU = 1.66053906892e-27
NIST = {
    (300., 0.): (19.919e-6, .155863),
    (500., 0.): (28.344e-6, .221707),
    (1000., 0.): (46.378e-6, .362590),
    (2000., 0.): (77.286e-6, .603905),
    (300., 1.): (17.296e-6, .179621),
    (500., 1.): (24.606e-6, .255451),
    (1000., 1.): (40.259e-6, .417739),
    (2000., 1.): (67.087e-6, .695745),
    (300., .5): (18.667e-6, .166649),
    (500., .5): (26.562e-6, .237099),
    (1000., .5): (43.465e-6, .387918),
    (2000., .5): (72.436e-6, .646403),
}


def near(actual, expected, name, relative=3e-12, absolute=1e-300):
    assert isinstance(actual, (int, float)) and math.isfinite(actual), (name, actual)
    assert math.isclose(actual, expected, rel_tol=relative, abs_tol=absolute), (name, actual, expected)


def moments():
    """Dimensionless f(v)=exp(-v²)/sqrt(pi), independent 1D integrals."""
    gaussian, e0 = quad(lambda u: math.exp(-u*u), -math.inf, math.inf,
                        epsabs=1e-13, epsrel=1e-13)
    tangent2, e2 = quad(lambda u: u*u*math.exp(-u*u), -math.inf, math.inf,
                        epsabs=1e-13, epsrel=1e-13)
    normal1, e1 = quad(lambda u: u*math.exp(-u*u), 0., math.inf,
                       epsabs=1e-13, epsrel=1e-13)
    normal3, e3 = quad(lambda u: u**3*math.exp(-u*u), 0., math.inf,
                       epsabs=1e-13, epsrel=1e-13)
    rate = normal1/gaussian
    energy_per_hit = normal3/normal1+2*tangent2/gaussian
    near(rate, 1/(2*math.sqrt(math.pi)), 'Half-range number moment')
    near(energy_per_hit, 2., 'Incident energy / kT')
    # Independent signed heat checks at fixed incidence density.
    near(rate*energy_per_hit*(500.-500.), 0., 'Equal-temperature zero heat')
    assert rate*energy_per_hit*(500.-1000.) < 0
    return {'gaussian': gaussian, 'tangentialSecond': tangent2,
            'normalFirst': normal1, 'normalThird': normal3,
            'incidentEnergyOverKT': energy_per_hit,
            'numberRateOverThermalVelocity': rate,
            'quadratureEstimatedErrors': [e0, e2, e1, e3], 'allPass': True}


def main():
    input_path, results_path, output_path = map(Path, sys.argv[1:4])
    packet = json.loads(input_path.read_text())
    results = json.loads(results_path.read_text())
    assert len({c['name'] for c in packet['cases']}) == len(packet['cases'])
    by_name = {r['name']: r for r in results['cases']}
    assert len(by_name) == len(results['cases'])
    assert set(by_name) == {c['name'] for c in packet['cases']}
    m = moments()
    checked, unsupported, data_points = [], [], set()
    max_number_error = 0.

    def check_properties(pair, temperature, fraction, properties):
        if not properties:
            return
        assert properties['source'] and properties['quality']
        assert properties['muPaS'] > 0 and properties['kWMK'] > 0
        if pair == 'helium' and (temperature, fraction) in NIST:
            expected = NIST[temperature, fraction]
            near(properties['muPaS'], expected[0], 'Independent NIST viscosity')
            near(properties['kWMK'], expected[1], 'Independent NIST conductivity')
            data_points.add((temperature, fraction))

    data_checks = results.get('dataChecks', [])
    for point in data_checks:
        check_properties(point['pair'], point['temperatureK'],
                         point['lightFraction'], point['properties'])
    dt_points = {(p['temperatureK'], p['lightFraction']): p['properties']
                 for p in data_checks if p['pair'] == 'dt'}
    for temperature, fraction in dt_points:
        if fraction != 0. or (temperature, 1.) not in dt_points:
            continue
        tritium, deuterium = dt_points[temperature, 0.], dt_points[temperature, 1.]
        near(deuterium['muPaS']/tritium['muPaS'], math.sqrt(2.014101778/3.016049282),
             'Identical-potential isotope viscosity scaling', relative=1e-9)
        near(deuterium['kWMK']/tritium['kWMK'], math.sqrt(3.016049282/2.014101778),
             'Identical-potential isotope conductivity scaling', relative=1e-9)

    for case in packet['cases']:
        c, s = case['config'], case['state']
        row = by_name[case['name']]
        assert row['qualified'] is False
        if c['pair'] == 'molecular':
            assert row['supported'] is False and row['reason']
            unsupported.append(case['name'])
            continue
        assert row['supported'] is True
        radius, length = c['radiusM'], c['lengthM']
        initial_t, initial_p, temperature = c['gasK'], c['pressurePa'], s['gasK']
        fraction, film = c['lightFraction'], case['gasWallWK']
        volume = math.pi*radius**2*length
        side_area = 2*math.pi*radius*length
        particles = initial_p*volume/(KB*initial_t)
        number_density = particles/volume
        masses = [value*AMU for value in c['speciesMassU']]
        probabilities = [s['lightMass'], s['heavyMass']]
        count = len(probabilities[0])
        fractions = (fraction, 1-fraction)
        mean_mass = math.fsum(f*mass for f, mass in zip(fractions, masses))
        capacity = 1.5*KB*particles
        sound = math.sqrt((5/3)*KB*temperature/mean_mass)
        near(row['meanNumberDensityM3'], number_density, 'Fixed neutral inventory')
        near(row['meanPressurePa'], initial_p*temperature/initial_t, 'Heated mean pressure')
        near(row['neutralCapacityJK'], capacity, 'Monatomic Cv')
        near(row['lateralWallAreaM2'], side_area, 'Lateral interface area')
        near(row['soundSpeedMS'], sound, 'Bulk ideal acoustic estimate')
        near(row['radialAcousticTimeS'], radius/sound, 'Radial acoustic time')
        near(row['axialAcousticTimeS'], length/sound, 'Axial acoustic time')
        if film:
            near(row['nominalFilmTimeS'], capacity/film, 'Nominal reservoir time')
        else:
            assert row['nominalFilmTimeS'] is None
        assert len(row['cells']) == count
        local_partial, local_paths = [], []
        for i, cell in enumerate(row['cells']):
            ns = [particles*f*probabilities[j][i]/(volume/count)
                  for j, f in enumerate(fractions)]
            nt = math.fsum(ns)
            local_partial.append(ns)
            near(cell['numberDensityM3'], nt, 'Local total number density')
            near(cell['pressurePa'], nt*KB*temperature, 'Local pressure')
            for actual, expected in zip(cell['partialNumberDensitiesM3'], ns):
                near(actual, expected, 'Local partial number density')
            if nt:
                x = ns[0]/nt
                near(cell['lightFraction'], x, 'Local composition')
            else:
                assert cell['lightFraction'] is None and cell['properties'] is None
            properties = cell['properties']
            check_properties(c['pair'], temperature, ns[0]/nt if nt else None, properties)
            if properties:
                rho = math.fsum(mass*density for mass, density in zip(masses, ns))
                pressure = nt*KB*temperature
                # Algebraically independent density form of Sharipov's convention.
                path = properties['muPaS']/rho*math.sqrt(math.pi*(rho/nt)/(2*KB*temperature))
                local_paths.append(path)
                near(cell['lambdaViscosityM'], path, 'Viscosity path convention')
                near(cell['knRadius'], path/radius, 'Vessel-radius Kn screen')
                near(cell['stressRelaxationTimeS'], properties['muPaS']/pressure, 'Stress relaxation proxy')
            else:
                local_paths.append(None)
                assert all(cell[key] is None for key in
                           ('lambdaViscosityM', 'knRadius', 'stressRelaxationTimeS'))
        for j, f in enumerate(fractions):
            recovered = math.fsum(ns[j]*volume/count for ns in local_partial)
            expected = f*particles
            relative = abs(recovered-expected)/particles
            max_number_error = max(max_number_error, relative)
            assert relative < 2.1e-8, ('Species inventory conservation', case['name'], j, relative)
        arrivals = [ns*math.sqrt(2*KB*temperature/mass)*m['numberRateOverThermalVelocity']
                    for ns, mass in zip(local_partial[-1], masses)]
        wall_conductance = side_area*KB*m['incidentEnergyOverKT']*math.fsum(arrivals)
        near(row['wall']['maxwellReferenceWK'], wall_conductance, 'Quadrature Maxwellian wall reference')
        for actual, expected in zip(row['wall']['numberDensitiesM3'], local_partial[-1]):
            near(actual, expected, 'Outer-cell density ownership')
        required = film/wall_conductance if wall_conductance else None
        if required is None:
            assert row['wall']['requiredAccommodationReference'] is None
        else:
            near(row['wall']['requiredAccommodationReference'], required, 'Required-accommodation reference')
        drift = side_area*math.fsum(flux*mass for flux, mass in zip(arrivals, masses))*(s['neutralRadS']*radius)**2/2
        near(row['wall']['fullAccommodationTangentialDriftReferenceW'], drift, 'Separate tangential drift reference')
        assert row['wall']['accommodation'] is None
        assert 'cell' in row['wall']['densitySource'].lower()
        transport = row['transport']
        properties = transport['globalProperties']
        check_properties(c['pair'], temperature, fraction, properties)
        if properties:
            conductivity = properties['kWMK']
            cv_time = capacity*radius**2/(conductivity*volume)
            cp_time = (5/3)*cv_time
            near(transport['radialDiffusionCvS'], cv_time, 'Isochoric diffusion estimate')
            near(transport['radialDiffusionCpS'], cp_time, 'Isobaric diffusion estimate')
            near(transport['axialDiffusionCpS'], cp_time*(length/radius)**2, 'Axial diffusion estimate')
            near(transport['biotVolumeOverArea'], (film/side_area)*(volume/side_area)/conductivity, 'Continuum Biot screen')
            if film:
                near(transport['radialCpOverFilmTime'], cp_time*film/capacity, 'Gas diffusion / film time')
            else:
                assert transport['radialCpOverFilmTime'] is None
        else:
            assert all(transport[key] is None for key in ('radialDiffusionCvS', 'radialDiffusionCpS',
                       'axialDiffusionCpS', 'biotVolumeOverArea', 'radialCpOverFilmTime'))
        if all(path is not None for path in local_paths):
            near(transport['maximumKnRadius'], max(local_paths)/radius, 'Worst local vessel Kn')
        else:
            assert transport['maximumKnRadius'] is None
        grad = []
        unresolved = False
        for j, f in enumerate(fractions):
            if not f:
                continue
            for i in range(count-1):
                a, b = local_partial[i][j], local_partial[i+1][j]
                pa, pb = local_paths[i:i+2]
                if min(a, b) <= 0 or pa is None or pb is None:
                    unresolved = True
                    continue
                delta_radius = radius*(math.sqrt((i+1.5)/count)-math.sqrt((i+.5)/count))
                grad.append(max(pa, pb)*abs(math.log(b/a))/delta_radius)
        if unresolved or count < 2:
            assert transport['maximumGradientKn'] is None
        else:
            near(transport['maximumGradientKn'], max(grad, default=0.),
                 'Density-gradient Kn proxy', relative=2e-10, absolute=1e-12)
        expected_wall_screen = ('disabled' if not film else 'vacuum-unresolved' if required is None else
                                'exceeds-local-Maxwellian-reference' if required > 1 else
                                'requires-accommodation-and-gas-transport')
        assert row['screens']['wallReference'] == expected_wall_screen
        thresholds = row['screens']['thresholds']
        continuum = (transport['maximumKnRadius'] is not None and transport['maximumGradientKn'] is not None and
                     max(transport['maximumKnRadius'], transport['maximumGradientKn']) < thresholds['kn'])
        assert row['screens']['continuumCandidate'] is continuum
        lumping = (continuum and transport['radialCpOverFilmTime'] is not None and
                   transport['radialCpOverFilmTime'] < thresholds['diffusionToFilmTime']) if film else None
        assert row['screens']['conductionLumpingNotExcluded'] is lumping
        checked.append(case['name'])

    result = {'allPass': True, 'quadrature': m, 'supportedCasesChecked': len(checked),
              'unsupportedCasesChecked': len(unsupported), 'caseNames': checked,
              'maximumRelativeSpeciesInventoryError': max_number_error,
              'independentNISTTablePointsChecked': sorted(data_points),
              'dataCheckRecordsInspected': len(data_checks),
              'scope': 'Independent formula/quadrature/invariant audit. No mixing, accommodation, chemistry or hardware validation.',
              'inputSHA256': hashlib.sha256(input_path.read_bytes()).hexdigest(),
              'resultsSHA256': hashlib.sha256(results_path.read_bytes()).hexdigest(),
              'scriptSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    output_path.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
