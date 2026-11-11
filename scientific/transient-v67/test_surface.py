"""Manufactured resistance and adversarial comparator tests; no production imports."""
from copy import deepcopy
import hashlib
import json
import math
import unittest

import analyze as baseline
from surface import analyze_surfaces, surface_history, tungsten_k

K = 1.380649e-23


def root(function, lo, hi):
    for _ in range(70):
        mid = (lo+hi)/2
        if function(mid) > 0:
            hi = mid
        else:
            lo = mid
    return (lo+hi)/2


def manufactured(case_id, cells, steps=2, response=.001, power=-10.):
    """Same prescribed physical surface on different cell-center locations.

    A boundary-resistance fixture, not a PDE/energy-balance manufactured solution.
    Accepted canonical energies are consistent with each recorded solve T.
    """
    radius, length, number, nr, nz = .01, .1, 1e19, 2, 2
    edges = [radius+.001*i/cells for i in range(cells+1)]
    centers = [math.sqrt(a*b) for a, b in zip(edges, edges[1:])]
    masses = [19250*math.pi*length*(b*b-a*a) for a, b in zip(edges, edges[1:])]
    initial = baseline.solid_temperature(baseline.enthalpy(1200.))

    def solid_at(surface):
        return root(lambda t: t+power*math.log(centers[0]/radius)/
                    (2*math.pi*length*tungsten_k(t))-surface, 1100., 1300.)

    def gas_at(surface):
        return root(lambda t: t-surface-power*(10.+1/(8*math.pi*length*
                    (1.398e-4*t**.863)*nr)), 500., 1500.)

    def state(solid_t, gas_t):
        return {'lightMass': [.5, .5], 'heavyMass': [.5, .5], 'omegaRadS': [0., 0.],
                'gasEnergyJ': [1.5*K*number/nr*gas_t]*nr,
                'linerEnergyJ': [mass*baseline.enthalpy(solid_t) for mass in masses]}

    setup = {'radiusM': radius, 'lengthM': length, 'number': number, 'lightFraction': .3,
             'speciesMassKg': [6*1.66053906892e-27, 7*1.66053906892e-27],
             'diffusivityM2S': .001, 'material': 'lithium',
             'boundary': {'gasWallWK': .1, 'coolingWK': 0., 'coolantK': 1200.},
             'liner': {'radiusEdgesM': edges, 'radiusCentersM': centers,
                       'massesKg': masses, 'lengthM': length},
             'electrical': {'radialEdgesM': [0., radius/math.sqrt(2), radius],
                            'axialEdgesM': [0., length/2, length],
                            'sigmaPerpSM': [1.]*4, 'sigmaParallelSM': [1.]*4,
                            'magneticT': .5, 'innerVoltageV': [None]*nz,
                            'outerVoltageV': [0.]*nz, 'lowerVoltageV': [None]*nr,
                            'upperVoltageV': [0.]*nr}}
    records = []
    for index in range(steps):
        target = initial-response*(index+1)/steps
        solid_t = solid_at(target) if power else target
        solid_t = baseline.solid_temperature(baseline.enthalpy(solid_t))
        gas_t = gas_at(target) if power else solid_t
        accepted = state(solid_t, gas_t)
        records.append({'dtS': .001/steps, 'result': {'state': accepted,
                        'momentum': {'grid': {'shearScheme': 'volume-coordinate'}},
                        'thermal': {'linerSolveTemperatureK': [solid_t]*cells,
                                    'gasTemperatureK': [gas_t]*nr,
                                    'gasExchangeJ': power*.001/steps}}})
    return {'id': case_id, 'setup': setup, 'initialState': state(initial, gas_at(initial) if power else initial),
            'requestedSteps': steps, 'steps': records, 'failure': None}


def bound(cases, axis='liner'):
    packet = {'sourceSHA256': 'a'*64, 'cases': cases}
    digest = hashlib.sha256(json.dumps(packet).encode()).hexdigest()
    return packet, {'sourceSHA256': 'a'*64, 'predictionSHA256': digest,
                    'pairs': [{'coarseID': cases[0]['id'], 'fineID': cases[1]['id'], 'axis': axis}]}, digest


class SurfaceTests(unittest.TestCase):
    def test_sourced_tungsten_polynomial_and_domain(self):
        self.assertAlmostEqual(tungsten_k(1200), 114.00009022222222, places=11)
        for value in [299., 1901., float('nan'), float('inf')]:
            with self.assertRaises(ValueError):
                tungsten_k(value)

    def test_different_cell_centers_reconstruct_same_physical_surface(self):
        packet, config, digest = bound([manufactured('coarse', 2), manufactured('fine', 4)])
        report = analyze_surfaces(packet, config, digest)
        row = report['comparisons'][0]
        self.assertTrue(report['allSurfaceGatesPassed'])
        self.assertLess(row['surfaceErrorK'], 1e-9)
        self.assertGreater(abs(row['coarseSurfaceHistory'][1]['cellCenterK']-
                               row['fineSurfaceHistory'][1]['cellCenterK']), 1e-5)
        self.assertEqual(row['surfaceRadiusM'], .01)
        self.assertEqual(row['causalPerTimeDiagnostics']['resolvedComparisons'], 2)
        compatibility = row['initialBoundaryCompatibility']
        self.assertNotEqual(compatibility['coarse']['initialBoundaryReconstructionMismatchK'], 0.)
        self.assertGreater(abs(compatibility['coarse']['initialBoundaryReconstructionMismatchK']),
                           abs(compatibility['fine']['initialBoundaryReconstructionMismatchK']))
        self.assertIn('not resolved physical heating', compatibility['interpretation'])

    def test_zero_heat_and_zero_response_have_no_invented_floor(self):
        packet, config, digest = bound([manufactured('c', 2, response=0., power=0.),
                                        manufactured('f', 4, response=0., power=0.)])
        row = analyze_surfaces(packet, config, digest)['comparisons'][0]
        self.assertEqual(row['surfaceErrorK'], 0.)
        self.assertEqual(row['surfaceHeatingScaleK'], 0.)
        self.assertTrue(row['allSurfaceGatesPassed'])
        self.assertEqual(row['causalPerTimeDiagnostics']['unresolvedSignalComparisons'], 2)
        self.assertEqual(row['causalPerTimeDiagnostics']['resolvedComparisons'], 0)
        self.assertEqual(row['initialBoundaryCompatibility']['coarse']['initialBoundaryReconstructionMismatchK'], 0.)

    def test_small_wall_response_failure_is_not_hidden_by_point_zero_five_kelvin(self):
        packet, config, digest = bound([manufactured('c', 2, response=.002),
                                        manufactured('f', 4, response=.001)])
        row = analyze_surfaces(packet, config, digest)['comparisons'][0]
        self.assertLess(row['surfaceErrorK'], .05)
        self.assertFalse(row['gates'][0]['passed'])
        self.assertTrue(row['gates'][1]['passed'])
        self.assertFalse(row['allSurfaceGatesPassed'])

    def test_bad_heat_timestep_or_accepted_temperature_length_reject(self):
        for mutation in ('heat', 'dt', 'length'):
            case = manufactured('c', 2)
            record = case['steps'][0]
            if mutation == 'heat':
                record['result']['thermal']['gasExchangeJ'] *= 1.01
            elif mutation == 'dt':
                record['dtS'] *= 2
            else:
                record['result']['thermal']['linerSolveTemperatureK'].pop()
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                surface_history(baseline.prepare(case))

    def test_nonuniform_initial_wall_or_moved_center_reject(self):
        case = manufactured('c', 2)
        case['initialState']['linerEnergyJ'][1] = case['setup']['liner']['massesKg'][1]*baseline.enthalpy(1200.01)
        with self.assertRaisesRegex(ValueError, 'Nonuniform initial'):
            surface_history(baseline.prepare(case))
        case = manufactured('c', 2)
        case['setup']['liner']['radiusCentersM'][0] *= 1.01
        with self.assertRaisesRegex(ValueError, 'centers'):
            surface_history(baseline.prepare(case))

    def test_physical_radius_hash_pair_or_partial_history_changes_reject(self):
        original = [manufactured('c', 2), manufactured('f', 4)]
        for mutation in ('radius', 'hash', 'pair', 'partial'):
            cases = deepcopy(original)
            if mutation == 'radius':
                cases[1]['setup']['radiusM'] *= 1.01
            if mutation == 'partial':
                cases[1]['steps'].pop()
            packet, config, digest = bound(cases)
            if mutation == 'hash':
                config['predictionSHA256'] = 'b'*64
            if mutation == 'pair':
                config['pairs'][0]['fineID'] = 'missing'
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                analyze_surfaces(packet, config, digest)

    def test_endpoint_surface_time_comparison_retains_every_coarse_step(self):
        packet, config, digest = bound([manufactured('c', 2, steps=2),
                                        manufactured('f', 2, steps=4)], axis='time')
        row = analyze_surfaces(packet, config, digest)['comparisons'][0]
        self.assertTrue(row['allSurfaceGatesPassed'])
        self.assertEqual(row['sharedAcceptedTimes'], 2)
        self.assertEqual(row['fineOnlyAcceptedTimesNotCompared'], 2)
        self.assertEqual(len(row['trace']), 3)
        self.assertEqual(row['gates'][0]['limit'], .01)


if __name__ == '__main__':
    unittest.main()
