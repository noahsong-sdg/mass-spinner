"""Independent physical-limit/domain regressions; execute only in safe-dev.

These tests exercise public reference-model inputs and conserved observables.
They neither import its property arrays nor claim measured accommodation data.
"""
from copy import deepcopy
import importlib.util
import math
from pathlib import Path
import unittest

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('gas_energy_v57', ROOT/'scientific/gas-energy-v57/model.py')
model = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(model)
KB = 1.380649e-23


def example():
    return {'name': 'independent-domain-fixture', 'caseKind': 'test',
            'config': {'gasCells': 4, 'wallCells': 2, 'steps': 4,
                       'radiusM': .12, 'lengthM': .8, 'thicknessM': .001,
                       'pressurePa': 1000., 'referenceK': 500., 'durationS': .01,
                       'gas': 'helium4', 'alpha': .5, 'wallMaterial': 'tungsten',
                       'coolingWK': 0., 'coolantK': 500., 'constantTransport': False},
            'initial': {'gasK': 500., 'solidK': 500.}}


def volume(c):
    return math.pi*c['radiusM']**2*c['lengthM']


class GasEnergyLimits(unittest.TestCase):
    def test_external_cooling_has_conservative_energy_and_bath_entropy(self):
        spec = importlib.util.spec_from_file_location('independent_gas_audit', ROOT/'scientific/gas-energy-v57/audit-independent.py')
        audit = importlib.util.module_from_spec(spec); spec.loader.exec_module(audit)
        case = example(); case['config'].update(coolingWK=10., coolantK=400.)
        case['initial']['gasK'] = 600.
        result = model.run_case(case)
        self.assertTrue(all(s['coolingEnergyJ']>0 for s in result['states'][1:]))
        checked = audit.checked_case(result)
        self.assertTrue(checked['allPass'])
        self.assertLess(abs(checked['cumulativeEnergyResidualJ']), 1e-8)

    def test_actual_fipy_scalar_coefficient_and_equilibrium(self):
        spec = importlib.util.spec_from_file_location('gas_fipy_reference', ROOT/'scientific/gas-energy-v57/reference-fipy.py')
        reference = importlib.util.module_from_spec(spec); spec.loader.exec_module(reference)
        case = example()
        case['config'].update(wallMaterial='constant', wallDensityKgM3=7900.,
                              wallCpJKgK=477., wallKWMK=14.9, constantTransport=True)
        result = reference.run(case)
        for state in result['states']:
            np.testing.assert_allclose(state['gasK'], 500., rtol=0, atol=1e-10)
            np.testing.assert_allclose(state['solidK'], 500., rtol=0, atol=1e-10)

    def test_uniform_equilibrium_at_tungsten_lower_bound(self):
        case = example()
        case['config'].update(referenceK=300., coolantK=300.)
        case['initial'] = {'gasK': 300., 'solidK': 300.}
        result = model.run_case(case)
        for state in result['states']:
            np.testing.assert_allclose(state['gasK'], 300., rtol=0, atol=2e-10)
            np.testing.assert_allclose(state['solidK'], 300., rtol=0, atol=2e-10)
            self.assertLess(abs(state['interfaceEnergyJ']), 1e-12)
            self.assertLess(abs(state['coolingEnergyJ']), 1e-12)

    def test_uniform_equilibrium_at_tungsten_upper_bound(self):
        # Regression: a forward finite-difference Cp probe at 1900 K must not
        # request an out-of-domain 1900.00001 K solid property.
        case = example()
        case['config'].update(referenceK=1900., coolantK=1900.)
        case['initial'] = {'gasK': 1900., 'solidK': 1900.}
        result = model.run_case(case)
        for state in result['states']:
            np.testing.assert_allclose(state['gasK'], 1900., rtol=0, atol=2e-10)
            np.testing.assert_allclose(state['solidK'], 1900., rtol=0, atol=2e-10)
            self.assertLess(abs(state['interfaceEnergyJ']), 1e-12)

    def test_zero_accommodation_insulates_unequal_reservoirs(self):
        case = example()
        case['config']['alpha'] = 0.
        case['initial']['solidK'] = 600.
        result = model.run_case(case)
        for state in result['states']:
            np.testing.assert_allclose(state['gasK'], 500., rtol=0, atol=1e-10)
            np.testing.assert_allclose(state['solidK'], 600., rtol=0, atol=1e-10)
            self.assertEqual(state['interfaceConductanceWK'], 0.)
            self.assertEqual(state['interfaceEnergyJ'], 0.)

    def test_full_accommodation_retains_finite_temperature_jump(self):
        case = example()
        case['config']['alpha'] = 1.
        result = model.run_case(case)
        state = result['states'][0]
        self.assertGreater(state['jumpLengthM'], 0.)
        self.assertTrue(math.isfinite(state['jumpLengthM']))
        self.assertGreater(state['jumpResistanceKW'], 0.)
        self.assertGreater(state['interfaceConductanceWK'], 0.)
        c = case['config']
        _, _, edges, _ = model.geometry(np.asarray(state['gasK']),
                                        np.asarray(result['particleNumbers']), c)
        temperatures = np.r_[state['gasK'], state['solidK']]
        _, _, detail = model.coefficients(temperatures, np.asarray(result['particleNumbers']),
                                          np.asarray(result['solidEdgesM']), c)
        contact_limit = 1/(detail[-3]+detail[-1])
        self.assertLess(state['interfaceConductanceWK'], contact_limit,
                        'alpha=1 does not remove the rarefied-gas temperature jump')
        self.assertAlmostEqual(edges[-1], c['radiusM'], places=13)

    def test_uniform_particle_specific_heat_uses_total_cv(self):
        case = example()
        c = case['config']
        c['alpha'] = 0.
        edges = np.linspace(0., c['radiusM'], c['gasCells']+1)
        weights = np.diff(edges**2)/c['radiusM']**2
        total_power = .1
        case['gasPowerW'] = (total_power*weights).tolist()
        result = model.run_case(case)
        total_number = c['pressurePa']*volume(c)/(KB*c['referenceK'])
        rise = total_power*c['durationS']/(1.5*KB*total_number)
        last = result['states'][-1]
        np.testing.assert_allclose(last['gasK'], 500.+rise, rtol=0, atol=3e-9)
        self.assertAlmostEqual(last['pressurePa']/c['pressurePa'], (500.+rise)/500., places=11)
        self.assertGreater(rise, 1.5*total_power*c['durationS']/(2.5*KB*total_number),
                           'A Cp reservoir would underpredict closed-vessel heating')

    def test_fixed_particles_and_rigid_wall_with_nonuniform_initial_gas(self):
        case = example()
        case['config']['alpha'] = 0.
        case['initial']['gasK'] = [450., 475., 525., 550.]
        result = model.run_case(case)
        c = case['config']
        numbers = np.asarray(result['particleNumbers'])
        expected_number = c['pressurePa']*volume(c)/(KB*c['referenceK'])
        self.assertAlmostEqual(float(numbers.sum())/expected_number, 1., places=13)
        initial_energy = 1.5*KB*np.dot(numbers, result['states'][0]['gasK'])
        for state in result['states']:
            edges = np.asarray(state['gasEdgesM'])
            self.assertEqual(edges[0], 0.)
            self.assertAlmostEqual(edges[-1], c['radiusM'], places=13)
            self.assertTrue(np.all(np.diff(edges)>0))
            cell_volumes = math.pi*c['lengthM']*np.diff(edges**2)
            reconstructed = state['pressurePa']*cell_volumes/(KB*np.asarray(state['gasK']))
            np.testing.assert_allclose(reconstructed, numbers, rtol=3e-13, atol=0)
            self.assertAlmostEqual(1.5*KB*np.dot(numbers, state['gasK'])/initial_energy, 1., places=10)
        self.assertNotEqual(result['states'][0]['gasEdgesM'][1], result['states'][-1]['gasEdgesM'][1])

    def test_local_pressure_work_is_nonzero_and_global_work_cancels(self):
        case = example()
        case['config']['alpha'] = 0.
        case['initial']['gasK'] = [450., 475., 525., 550.]
        result = model.run_case(case)
        c = case['config']; numbers = np.asarray(result['particleNumbers'])
        first, second = result['states'][:2]
        def shell_volumes(state):
            return math.pi*c['lengthM']*np.diff(np.asarray(state['gasEdgesM'])**2)
        work = second['pressurePa']*(shell_volumes(second)-shell_volumes(first))
        self.assertGreater(float(np.max(np.abs(work))), 1e-7)
        self.assertLess(abs(float(work.sum())), 1e-10)
        heat = np.asarray(second['gasFaceEnergyJ'])
        internal_change = 1.5*KB*numbers*(np.asarray(second['gasK'])-first['gasK'])
        # Independent shell first law: ΔU + p_new ΔV = incoming heat − outgoing heat.
        incoming = np.r_[0., heat]-np.r_[heat, 0.]
        np.testing.assert_allclose(internal_change+work, incoming, rtol=2e-8, atol=1e-10)


class GasEnergyDomains(unittest.TestCase):
    def test_nonfinite_or_nonpositive_geometry_and_initial_state_reject(self):
        for key in ('radiusM', 'lengthM', 'thicknessM', 'pressurePa', 'referenceK', 'durationS'):
            for value in (0., -1., math.nan, math.inf):
                with self.subTest(key=key, value=value):
                    case = example(); case['config'][key] = value
                    with self.assertRaises(ValueError):
                        model.run_case(case)
        for key in ('gasK', 'solidK'):
            for value in (0., -1., math.nan, math.inf):
                with self.subTest(key=key, value=value):
                    case = example(); case['initial'][key] = value
                    with self.assertRaises(ValueError):
                        model.run_case(case)

    def test_invalid_cells_steps_cooling_and_accommodation_reject(self):
        domains = {'gasCells': [1, 2.5, math.nan], 'wallCells': [1, 2.5],
                   'steps': [0, 1, 2.5], 'coolingWK': [-1., math.nan, math.inf],
                   'coolantK': [0., math.nan, math.inf],
                   'alpha': [-.01, 1.01, math.nan, math.inf]}
        for key, values in domains.items():
            for value in values:
                with self.subTest(key=key, value=value):
                    case = example(); case['config'][key] = value
                    with self.assertRaises(ValueError):
                        model.run_case(case)

    def test_nonfinite_cell_powers_reject(self):
        for field in ('gasPowerW', 'solidPowerW'):
            for value in (math.nan, math.inf, -math.inf):
                with self.subTest(field=field, value=value):
                    case = example(); case[field] = value
                    with self.assertRaises(ValueError):
                        model.run_case(case)

    def test_unknown_gas_and_molecular_internal_modes_reject(self):
        for gas in ('molecular', 'D2', 'dt', 'unknown'):
            with self.subTest(gas=gas):
                case = example(); case['config']['gas'] = gas
                with self.assertRaises(ValueError):
                    model.run_case(case)

    def test_published_transport_anchor_units_and_domains(self):
        mu, conductivity, mass = model.transport('helium4', np.asarray([500.]))
        self.assertAlmostEqual(float(mu[0]), 28.344e-6, places=13)
        self.assertAlmostEqual(float(conductivity[0]), .221707, places=12)
        self.assertGreater(mass, 6.64e-27); self.assertLess(mass, 6.65e-27)
        for gas, bad in (('helium4', 299.), ('helium4', 2001.),
                         ('lithium', 99.), ('lithium', 3001.)):
            with self.subTest(gas=gas, value=bad), self.assertRaises(ValueError):
                model.transport(gas, np.asarray([bad]))
        with self.assertRaises(ValueError):
            model.transport('helium4', np.asarray([math.nan]))

    def test_constant_wall_properties_must_be_finite_positive(self):
        base = example()
        base['config'].update(wallMaterial='constant', wallDensityKgM3=1000.,
                              wallCpJKgK=1000., wallKWMK=1.)
        for key in ('wallDensityKgM3', 'wallCpJKgK', 'wallKWMK'):
            for value in (0., -1., math.nan, math.inf):
                with self.subTest(key=key, value=value):
                    case = deepcopy(base); case['config'][key] = value
                    with self.assertRaises(ValueError):
                        model.run_case(case)


if __name__ == '__main__':
    unittest.main()
