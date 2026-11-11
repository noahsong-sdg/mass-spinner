"""Independent assessment-domain regressions. Run only in the pinned safe-dev venv.

These test inventory ownership, physical limits and reporting semantics. They
do not establish experimental transport validity or replace independent audits.
"""
from copy import deepcopy
import importlib.util
import math
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT/'scientific/gas-regime-v56'/(name+'.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


assessment = load('assessment')
transport = load('transport')


def example():
    return {'name': 'independent-domain-fixture',
            'config': {'radiusM': .12, 'lengthM': .8, 'gasK': 500.,
                       'pressurePa': 10., 'lightFraction': .5, 'pair': 'dt',
                       'speciesMassU': [2., 8.]},
            'state': {'gasK': 500., 'lightMass': [.25]*4,
                      'heavyMass': [.25]*4, 'neutralRadS': 0.},
            'gasWallWK': .1}


def attributed_properties(pair, temperature, fraction):
    return {'muPaS': 1e-5, 'kWMK': .1,
            'source': 'Synthetic test transport, not published gas data',
            'quality': 'regression fixture only'}


class GasRegimeAssessment(unittest.TestCase):
    def test_heating_changes_pressure_without_removing_particles(self):
        cold = example()
        hot = deepcopy(cold)
        hot['state']['gasK'] *= 2
        a, b = [assessment.assess(c, attributed_properties) for c in (cold, hot)]
        self.assertEqual(a['meanNumberDensityM3'], b['meanNumberDensityM3'])
        self.assertEqual(a['neutralCapacityJK'], b['neutralCapacityJK'])
        self.assertAlmostEqual(b['meanPressurePa']/a['meanPressurePa'], 2.)
        self.assertAlmostEqual(b['wall']['maxwellReferenceWK']/a['wall']['maxwellReferenceWK'], math.sqrt(2.))

    def test_number_inventory_survives_radial_separation(self):
        case = example()
        case['config']['lightFraction'] = .2
        case['state']['lightMass'] = [.1, .2, .3, .4]
        case['state']['heavyMass'] = [.4, .3, .2, .1]
        result = assessment.assess(case, attributed_properties)
        mean = result['meanNumberDensityM3']
        self.assertAlmostEqual(sum(c['partialNumberDensitiesM3'][0] for c in result['cells'])/4/mean, .2)
        self.assertAlmostEqual(sum(c['partialNumberDensitiesM3'][1] for c in result['cells'])/4/mean, .8)
        self.assertNotEqual(result['cells'][0]['lightFraction'], case['config']['lightFraction'])
        self.assertEqual(result['wall']['numberDensitiesM3'], result['cells'][-1]['partialNumberDensitiesM3'])
        self.assertIn('cell', result['wall']['densitySource'].lower())

    def test_wall_moment_preserves_species_mass_weighting(self):
        case = example()
        mixed = assessment.assess(case)['wall']['maxwellReferenceWK']
        pure = []
        for x in (0., 1.):
            single = deepcopy(case)
            single['config']['lightFraction'] = x
            pure.append(assessment.assess(single)['wall']['maxwellReferenceWK'])
        self.assertAlmostEqual(mixed/(.5*sum(pure)), 1., places=13)
        mean_mass_case = deepcopy(case)
        mean_mass_case['config']['speciesMassU'] = [5., 5.]
        mean_mass_approx = assessment.assess(mean_mass_case)['wall']['maxwellReferenceWK']
        self.assertGreater(mixed/mean_mass_approx, 1.1,
                           'Mean molecular mass cannot replace species-resolved incident moments')

    def test_absent_species_cannot_create_false_gradient(self):
        case = example()
        case['config']['lightFraction'] = 1.
        a = assessment.assess(case, attributed_properties)
        case['state']['heavyMass'] = [1., 0., 0., 0.]
        b = assessment.assess(case, attributed_properties)
        self.assertEqual(a['cells'], b['cells'])
        self.assertEqual(a['wall'], b['wall'])
        self.assertEqual(a['transport'], b['transport'])

    def test_empty_wall_cell_stays_unresolved(self):
        case = example()
        case['state']['lightMass'] = [.5, .5, 0., 0.]
        case['state']['heavyMass'] = [.5, .5, 0., 0.]
        result = assessment.assess(case, attributed_properties)
        self.assertEqual(result['wall']['maxwellReferenceWK'], 0.)
        self.assertIsNone(result['wall']['requiredAccommodationReference'])
        self.assertIsNone(result['transport']['maximumKnRadius'])
        self.assertFalse(result['screens']['continuumCandidate'])
        self.assertEqual(result['screens']['wallReference'], 'vacuum-unresolved')
        self.assertFalse(result['qualified'])

    def test_zero_film_does_not_mean_infinite_or_zero_mixing_time(self):
        case = example()
        case['gasWallWK'] = 0.
        result = assessment.assess(case, attributed_properties)
        self.assertIsNone(result['nominalFilmTimeS'])
        self.assertIsNone(result['transport']['radialCpOverFilmTime'])
        self.assertIsNone(result['screens']['conductionLumpingNotExcluded'])
        self.assertEqual(result['screens']['wallReference'], 'disabled')
        self.assertFalse(result['qualified'])

    def test_unknown_properties_do_not_become_a_valid_continuum_result(self):
        result = assessment.assess(example())
        self.assertIsNone(result['transport']['globalProperties'])
        self.assertIsNone(result['transport']['maximumKnRadius'])
        self.assertIsNone(result['transport']['radialDiffusionCpS'])
        self.assertFalse(result['screens']['continuumCandidate'])
        self.assertFalse(result['qualified'])
        self.assertIsNone(result['wall']['accommodation'])

    def test_molecular_energy_closure_remains_unsupported(self):
        case = example()
        case['config']['pair'] = 'molecular'
        result = assessment.assess(case, attributed_properties)
        self.assertFalse(result['supported'])
        self.assertFalse(result['qualified'])
        self.assertIn('internal modes', result['reason'])

    def test_invalid_inventory_rejects_instead_of_normalizing_it(self):
        for invalid in ([.1]*4, [-.1, .3, .3, .5], [math.nan, 0., 0., 1.], [1.], []):
            with self.subTest(inventory=invalid):
                case = example()
                case['state']['lightMass'] = invalid
                with self.assertRaises(ValueError):
                    assessment.assess(case, attributed_properties)

    def test_nonfinite_rotation_rejects(self):
        for speed in (math.nan, math.inf, -math.inf):
            with self.subTest(speed=speed):
                case = example()
                case['state']['neutralRadS'] = speed
                with self.assertRaises(ValueError):
                    assessment.assess(case, attributed_properties)

    def test_rotation_sign_does_not_change_thermal_arrival_or_slip_energy(self):
        case = example()
        case['state']['neutralRadS'] = 100.
        forward = assessment.assess(case, attributed_properties)
        case['state']['neutralRadS'] = -100.
        reverse = assessment.assess(case, attributed_properties)
        self.assertEqual(forward['wall'], reverse['wall'])
        self.assertGreater(reverse['wall']['fullAccommodationTangentialDriftReferenceW'], 0.)

    def test_one_cell_does_not_establish_a_zero_density_gradient(self):
        case = example()
        case['state']['lightMass'] = [1.]
        case['state']['heavyMass'] = [1.]
        result = assessment.assess(case, attributed_properties)
        self.assertIsNone(result['transport']['maximumGradientKn'])
        self.assertFalse(result['screens']['continuumCandidate'])

    def test_heuristic_pass_does_not_claim_physical_qualification(self):
        case = example()
        case['gasWallWK'] = 1e-8
        result = assessment.assess(case, attributed_properties)
        self.assertTrue(result['screens']['continuumCandidate'])
        self.assertTrue(result['screens']['conductionLumpingNotExcluded'])
        self.assertFalse(result['qualified'])
        self.assertIn('not sufficient', result['screens']['scope'])


class PublishedTransportDomains(unittest.TestCase):
    def test_lithium_range_and_units(self):
        properties = transport.properties('lithium', 1000., .5)
        self.assertGreater(properties['muPaS'], 1e-5)
        self.assertLess(properties['muPaS'], 2e-5)
        self.assertGreater(properties['kWMK'], .04)
        self.assertLess(properties['kWMK'], .07)
        self.assertIsNone(transport.properties('lithium', 99.999, .5))
        self.assertIsNone(transport.properties('lithium', 3000.001, .5))
        self.assertIn('proxy', properties['quality'])

    def test_helium_exact_table_units_and_no_unjustified_composition_interpolation(self):
        pure_four = transport.properties('helium', 500., 0.)
        equimolar = transport.properties('helium', 500., .5)
        self.assertAlmostEqual(pure_four['muPaS'], 28.344e-6, places=13)
        self.assertAlmostEqual(pure_four['kWMK'], .221707, places=12)
        self.assertAlmostEqual(equimolar['muPaS'], 26.562e-6, places=13)
        self.assertAlmostEqual(equimolar['kWMK'], .237099, places=12)
        self.assertIsNone(transport.properties('helium', 500., .499))
        self.assertIsNone(transport.properties('helium', 299., .5))
        self.assertIsNone(transport.properties('helium', 2001., .5))

    def test_cantera_phase_actually_uses_the_declared_isotope_masses(self):
        phase = transport.hydrogen_isotopes()
        masses = dict(zip(phase.species_names, phase.molecular_weights))
        self.assertAlmostEqual(masses['D'], 2.014101778, places=7)
        self.assertAlmostEqual(masses['T'], 3.016049282, places=7)
        phase.TPX = 500., 10., {'D': .25, 'T': .75}
        self.assertAlmostEqual(phase.cp_mole/phase.cv_mole, 5/3, places=12)
        self.assertGreater(phase.viscosity, 0.)
        self.assertGreater(phase.thermal_conductivity, 0.)


if __name__ == '__main__':
    unittest.main()
