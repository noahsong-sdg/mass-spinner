"""Independent analyzer regressions; parent executes only in safe-dev."""
from copy import deepcopy
import math
import unittest

from analyze import analyze, enthalpy, gas_temperature, overlap, prepare, project_inventory, ratio, restrict_gas, solid_temperature


SOURCE, PREDICTION = 'a'*64, 'b'*64


def case(name, n=2, steps=2, liner_cells=2, nz=2):
    r = [math.sqrt(i/n) for i in range(n+1)]
    lr = [1+i/liner_cells for i in range(liner_cells+1)]
    masses = [19250*math.pi*(b*b-a*a) for a, b in zip(lr, lr[1:])]
    setup = {'number': 1e20, 'lightFraction': .3, 'speciesMassKg': [1e-26, 2e-26],
             'radiusM': 1., 'lengthM': 1., 'diffusivityM2S': .001, 'material': 'lithium',
             'boundary': {'gasWallWK': 1., 'coolingWK': 0., 'coolantK': 600.},
             'liner': {'radiusEdgesM': lr, 'radiusCentersM': [math.sqrt(a*b) for a, b in zip(lr, lr[1:])],
                       'massesKg': masses, 'volumesM3': [m/19250 for m in masses], 'lengthM': 1.},
             'electrical': {'radialEdgesM': r, 'axialEdgesM': [i/nz for i in range(nz+1)],
                            'sigmaPerpSM': [1.]*(n*nz), 'sigmaParallelSM': [2.]*(n*nz), 'magneticT': .5,
                            'innerVoltageV': [None]*nz, 'outerVoltageV': [0.]*nz,
                            'lowerVoltageV': [None]*n, 'upperVoltageV': [1.]*n}}

    def state(t):
        return {'lightMass': [1/n]*n, 'heavyMass': [1/n]*n, 'omegaRadS': [2+t]*n,
                'gasEnergyJ': [1.5*1.380649e-23*setup['number']/n*(300+10*t)]*n,
                'linerEnergyJ': [m*enthalpy(600+2*t) for m in masses]}

    return {'id': name, 'setup': setup, 'initialState': state(0), 'requestedSteps': steps,
            'steps': [{'dtS': 1/steps, 'result': {'state': state((i+1)/steps),
                       'momentum': {'grid': {'shearScheme': 'volume-coordinate'}},
                       'thermal': {'gasExchangeJ': 3/steps}}} for i in range(steps)]}


def inputs(axis='time'):
    a = case('coarse')
    b = case('fine', steps=4) if axis == 'time' else case('fine', n=4) if axis == 'radial' else case('fine', nz=4) if axis == 'axial' else case('fine', liner_cells=4)
    packet = {'sourceSHA256': SOURCE, 'cases': [a, b]}
    config = {'sourceSHA256': SOURCE, 'predictionSHA256': PREDICTION,
              'pairs': [{'coarseID': 'coarse', 'fineID': 'fine', 'axis': axis}]}
    return packet, config


class TransientAnalysisTests(unittest.TestCase):
    def test_explicit_time_radial_axial_and_liner_pairs_pass_identical_fields(self):
        for axis in ('time', 'radial', 'axial', 'liner'):
            packet, config = inputs(axis)
            result = analyze(packet, config, PREDICTION)
            self.assertTrue(result['allWholeHistoryGatesPassed'], (axis, result['comparisons'][0]['gates']))
            self.assertEqual(result['comparisons'][0]['sharedAcceptedTimes'], 2)

    def test_whole_history_exposes_failure_hidden_by_agreeing_endpoints(self):
        packet, config = inputs()
        state = packet['cases'][0]['steps'][0]['result']['state']
        state['gasEnergyJ'] = [u*307/305 for u in state['gasEnergyJ']]
        result = analyze(packet, config, PREDICTION)
        comparison = result['comparisons'][0]
        self.assertFalse(result['allWholeHistoryGatesPassed'])
        self.assertAlmostEqual(comparison['trace'][-1]['gasTemperatureDifferenceK'], 0)
        self.assertEqual(comparison['maxima']['gasTemperatureErrorOverHeating']['worstTimeS'], .5)
        self.assertGreater(comparison['maxima']['gasTemperatureErrorOverHeating']['relativeError'], .19)

    def test_stale_source_and_prediction_hashes_reject(self):
        for key in ('sourceSHA256', 'predictionSHA256'):
            packet, config = inputs(); config[key] = 'c'*64
            with self.assertRaisesRegex(ValueError, 'hash'):
                analyze(packet, config, PREDICTION)

    def test_incomplete_failed_stale_scheme_and_wrong_time_grid_reject(self):
        for mutation in ('incomplete', 'failure', 'scheme', 'time'):
            packet, config = inputs(); b = packet['cases'][1]
            if mutation == 'incomplete':
                b['steps'].pop()
            elif mutation == 'failure':
                b['failure'] = 'nonlinear convergence'
            elif mutation == 'scheme':
                b['steps'][0]['result']['momentum']['grid']['shearScheme'] = 'integrated-resistance'
            else:
                for record, dt in zip(b['steps'], [.2, .2, .2, .4]):
                    record['dtS'] = dt
            with self.assertRaises(ValueError, msg=mutation):
                analyze(packet, config, PREDICTION)

    def test_changed_physics_duplicate_pairs_and_wrong_axis_reject(self):
        for mutation in ('physics', 'duplicate', 'axis', 'identity'):
            packet, config = inputs()
            if mutation == 'physics':
                packet['cases'][1]['setup']['electrical']['magneticT'] = 2.
            elif mutation == 'duplicate':
                config['pairs'].append(deepcopy(config['pairs'][0]))
            elif mutation == 'axis':
                config['pairs'][0]['axis'] = 'radial'
            else:
                packet['cases'][1]['id'] = 'coarse'
            with self.assertRaises(ValueError, msg=mutation):
                analyze(packet, config, PREDICTION)

    def test_unpaired_cases_are_explicit_diagnostic_inventory(self):
        packet, config = inputs(); packet['cases'].append({'id': 'unpaired-diagnostic'})
        result = analyze(packet, config, PREDICTION)
        self.assertEqual(result['unpairedCaseIDs'], ['unpaired-diagnostic'])

    def test_stale_liner_length_cannot_hide_behind_unchanged_cell_masses(self):
        packet, config = inputs('liner')
        packet['cases'][1]['setup']['liner']['lengthM'] *= 2
        with self.assertRaisesRegex(ValueError, 'Liner length'):
            analyze(packet, config, PREDICTION)

    def test_canonical_temperature_uses_actual_species_counts(self):
        c = case('nonuniform'); state = c['initialState']
        state['lightMass'], state['heavyMass'] = [.2, .8], [.6, .4]
        counts = [1e20*(.3*a+.7*b) for a, b in zip(state['lightMass'], state['heavyMass'])]
        state['gasEnergyJ'] = [1.5*1.380649e-23*n*700 for n in counts]
        for t in gas_temperature(c['setup'], state):
            self.assertAlmostEqual(t, 700.)

    def test_angular_restriction_is_L_over_I_and_liner_mapping_conserves_energy(self):
        c = case('restrict'); c['initialState']['omegaRadS'] = [2., 4.]
        plan = prepare(c); restricted, _ = restrict_gas(plan, c['initialState'], [0., 1.])
        self.assertAlmostEqual(restricted['omegaRadS'][0], 3.5)
        weights = overlap([1., 3.], [1., 2., 3.])
        values = [2*enthalpy(600), 2*enthalpy(1200)]
        projected = project_inventory(values, weights)
        self.assertEqual(sum(projected), sum(values))
        self.assertGreater(solid_temperature(projected[0]/4), 900.)

    def test_zero_scales_have_no_invented_positive_floor(self):
        self.assertEqual(ratio(0., 0.), 0.)
        self.assertIsNone(ratio(1e-30, 0.))
        self.assertEqual(ratio(2., 4.), .5)

    def test_endpoint_and_interval_wall_power_are_different_observables(self):
        packet, config = inputs()
        # Fine endpoint at t=.5 agrees with coarse, but interval average does not.
        packet['cases'][1]['steps'][0]['result']['thermal']['gasExchangeJ'] = 1.5
        result = analyze(packet, config, PREDICTION)['comparisons'][0]
        self.assertEqual(result['trace'][1]['endpointGasWallPowerDifferenceW'], 0.)
        self.assertGreater(result['trace'][1]['intervalGasWallPowerDifferenceW'], 0.)
        self.assertFalse(result['allPassed'])


if __name__ == '__main__':
    unittest.main()
