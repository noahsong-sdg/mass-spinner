"""Independent electrical-history negatives; parent executes only in safe-dev."""
from copy import deepcopy
import hashlib
import json
import math
from pathlib import Path
import tempfile
import unittest

from electrical_history import analyze, compare, gate, history, projected_gate


SOURCE = 'a'*64


def case(name, nr=2, nz=2, nw=2, steps=2):
    """Exact axial Ohmic solution; no production solver or reference generator."""
    r = [math.sqrt(i/nr) for i in range(nr+1)]
    lr = [1+i/nw for i in range(nw+1)]
    masses = [19250*math.pi*(b*b-a*a) for a, b in zip(lr, lr[1:])]
    setup = {'number': 1e20, 'lightFraction': .3, 'speciesMassKg': [1e-26, 2e-26],
             'radiusM': 1., 'lengthM': 1., 'diffusivityM2S': .001,
             'liner': {'radiusEdgesM': lr, 'massesKg': masses, 'lengthM': 1.},
             'electrical': {'radialEdgesM': r, 'axialEdgesM': [i/nz for i in range(nz+1)],
                            'sigmaPerpSM': [1.]*(nr*nz), 'sigmaParallelSM': [2.]*(nr*nz), 'magneticT': 0.,
                            'innerVoltageV': [None]*nz, 'outerVoltageV': [None]*nz,
                            'lowerVoltageV': [0.]*nr, 'upperVoltageV': [1.]*nr}}

    def state(t):
        return {'lightMass': [1/nr]*nr, 'heavyMass': [1/nr]*nr, 'omegaRadS': [1e-12]*nr,
                'gasEnergyJ': [1.5*history.K*1e20/nr*(300+t)]*nr,
                'linerEnergyJ': [m*history.enthalpy(600+t) for m in masses]}

    # sigma_z=2, dphi/dz=1: I_z=-2 A, Q=2pi W, Pe=Q.
    # Each cell contains its cylindrical annular area times dz times sigma_z.
    heat = [2*math.pi*(r[i+1]**2-r[i]**2)/nz for j in range(nz) for i in range(nr)]
    output = {'potentialV': [(j+.5)/nz for j in range(nz) for i in range(nr)],
              'torqueNm': [0.]*(nr*nz), 'jouleByCellW': heat, 'jouleW': 2*math.pi,
              'mechanicalW': 0., 'electrodePowerW': 2*math.pi, 'energyResidualW': 0.,
              'cellCurrentResidualA': [0.]*(nr*nz), 'maxCellCurrentResidualA': 0., 'netBoundaryCurrentA': 0.,
              'boundaryCurrentsA': [s*2*math.pi*(r[i+1]**2-r[i]**2) for s in (1, -1) for i in range(nr)]}
    return {'id': name, 'setup': setup, 'initialState': state(0), 'initialElectrical': deepcopy(output),
            'requestedSteps': steps, 'steps': [{'dtS': 1/steps, 'result': {
                'state': state((i+1)/steps), 'sourceOmegaRadS': [1e-12]*nr, 'electrical': deepcopy(output),
                'momentum': {'grid': {'shearScheme': 'volume-coordinate'}},
                'thermal': {'gasExchangeJ': 1/steps}}} for i in range(steps)]}


class ElectricalHistoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)

    def inputs(self, axis='time'):
        a = case('coarse')
        b = case('fine', **({'steps': 4} if axis == 'time' else {'nr': 4} if axis == 'radial'
                            else {'nz': 4} if axis == 'axial' else {'nw': 4}))
        config = {'sourceSHA256': SOURCE, 'pairs': [{'coarseFile': 'coarse.json', 'fineFile': 'fine.json', 'axis': axis}]}
        self.save(config, a, b)
        return config, a, b

    def save(self, config, a, b, source=SOURCE):
        for key, c in (('coarse', a), ('fine', b)):
            raw = json.dumps({'sourceSHA256': source, 'cases': [c]}, allow_nan=False).encode()
            (self.base/(key+'.json')).write_bytes(raw)
            config['pairs'][0][key+'SHA256'] = hashlib.sha256(raw).hexdigest()

    def test_exact_axial_solution_all_four_axes_and_initial_state(self):
        for axis in history.AXES:
            config, _, _ = self.inputs(axis)
            result = analyze(config, self.base)
            self.assertTrue(result['allPassed'], (axis, result['comparisons'][0]['maxima']))
            pair = result['comparisons'][0]
            self.assertEqual(pair['sharedInitialAndAcceptedTimes'], 3)
            self.assertEqual(pair['trace'][0]['timeS'], 0.)
            self.assertEqual(pair['fineOnlyAcceptedTimes'], 2 if axis == 'time' else 0)
            row = result['cases'][0]['states'][0]
            self.assertAlmostEqual(row['terminalCurrentA']['lower'], 2*math.pi)
            self.assertAlmostEqual(row['terminalCurrentA']['upper'], -2*math.pi)
            self.assertAlmostEqual(sum(row['projectedJouleW']), 2*math.pi)

    def test_stale_raw_file_and_common_source_are_rejected(self):
        config, a, b = self.inputs()
        (self.base/'fine.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'packet hash'):
            analyze(config, self.base)
        self.save(config, a, b, 'b'*64)
        with self.assertRaisesRegex(ValueError, 'source hash'):
            analyze(config, self.base)

    def test_incomplete_missing_initial_failed_and_stale_trajectory_reject(self):
        for kind in ('incomplete', 'initial', 'failure', 'scheme', 'sourceOmega'):
            config, a, b = self.inputs()
            if kind == 'incomplete':
                b['steps'].pop()
            elif kind == 'initial':
                del b['initialElectrical']
            elif kind == 'failure':
                b['failure'] = 'nonconverged'
            elif kind == 'scheme':
                b['steps'][0]['result']['momentum']['grid']['shearScheme'] = 'integrated-resistance'
            else:
                del b['steps'][0]['result']['sourceOmegaRadS']
            self.save(config, a, b)
            with self.assertRaises((ValueError, KeyError), msg=kind):
                analyze(config, self.base)

    def test_changed_physics_and_nonshared_times_reject_after_rehashing(self):
        for kind in ('conductivity', 'electrode', 'time', 'axis'):
            config, a, b = self.inputs()
            if kind == 'conductivity':
                b['setup']['electrical']['sigmaParallelSM'][0] *= 2
            elif kind == 'electrode':
                b['setup']['electrical']['lowerVoltageV'][0] = None
            elif kind == 'time':
                for row, dt in zip(b['steps'], [.2, .2, .2, .4]):
                    row['dtS'] = dt
            else:
                config['pairs'][0]['axis'] = 'axial'
            self.save(config, a, b)
            with self.assertRaises(ValueError, msg=kind):
                analyze(config, self.base)

    def test_duplicate_case_filename_and_self_pairs_reject(self):
        config, a, b = self.inputs(); b['id'] = a['id']; self.save(config, a, b)
        with self.assertRaisesRegex(ValueError, 'identity'):
            analyze(config, self.base)
        config, _, _ = self.inputs(); config['pairs'].append(deepcopy(config['pairs'][0]))
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            analyze(config, self.base)

    def test_initial_and_fine_only_corrupt_heat_or_torque_cannot_hide_behind_tiny_spin(self):
        for initial, key in ((True, 'jouleByCellW'), (False, 'torqueNm')):
            config, a, b = self.inputs()
            electrical = b['initialElectrical'] if initial else b['steps'][0]['result']['electrical']
            electrical[key][0] += 1.
            self.save(config, a, b)
            result = analyze(config, self.base)
            self.assertFalse(result['allIdentityGatesPassed'])
            self.assertFalse(result['allPassed'])
            # Every mechanical state still has exactly the same tiny spin.
            self.assertEqual(b['initialState']['omegaRadS'], a['initialState']['omegaRadS'])

    def test_history_profile_and_terminal_gates_do_not_use_spin_or_cancelled_net_torque(self):
        a = history.prepare(case('a')); b = history.prepare(case('b', steps=4))
        def reconstructed(plan, sign):
            return {'states': [{'powerScaleW': 20., 'currentScaleA': 4., 'torqueScaleNm': 2.,
                'electrodePowerW': 10., 'jouleW': 10., 'mechanicalW': 0.,
                'projectedTorqueNm': [sign, -sign], 'projectedJouleW': [5.+sign, 5.-sign],
                'terminalCurrentA': {'inner': 0., 'outer': 0., 'lower': 2.+sign, 'upper': -2.-sign}}
                for _ in plan['times']]}
        result = compare(a, b, reconstructed(a, 1.), reconstructed(b, -1.), 'time')
        gates = {g['name']: g for g in result['maxima']}
        for name in ('projectedTorqueNm', 'projectedJouleW', 'lowerCurrentA', 'upperCurrentA'):
            self.assertFalse(gates[name]['passed'], name)
        self.assertEqual(result['maxima'][0]['worstTimeS'], 0.)

    def test_no_positive_floor_and_corrupt_zero_torque_is_unqualified(self):
        self.assertTrue(gate('zero', 0., 0.)['passed'])
        bad = gate('missing scale', 1e-100, 0.)
        self.assertIsNone(bad['relativeError'])
        self.assertFalse(bad['passed'])

    def test_reported_projection_cannot_hide_behind_opposing_axial_torques(self):
        # Each radial bin has net torque 1 despite opposing axial values of
        # order 1e6. A 1e-4 Nm projected error passes the old 2D-L1 scale.
        expected = [1e6, -1e6, -1e6+1., 1e6+1.]
        supplied = expected.copy(); supplied[0] += 1e-4
        error = math.fsum(abs(a-b) for a, b in zip(supplied, expected))
        self.assertTrue(gate('cell torque', error, sum(map(abs, expected)))['passed'])
        projected = projected_gate('projected torque', supplied, expected, 2, 2)
        self.assertFalse(projected['passed'])
        self.assertEqual(projected['scale'], 2.)
        self.assertGreater(projected['relativeError'], 4e-5)
        # Joule must have its own dissipative scale even if a much larger
        # signed mechanical/electrode exchange sets the common power scale.
        heat = [1., 2., 3., 4.]; bad_heat = heat.copy(); bad_heat[0] += 1e-4
        self.assertTrue(gate('cell heat', 1e-4, 1e12)['passed'])
        self.assertFalse(projected_gate('projected heat', bad_heat, heat, 2, 2)['passed'])


if __name__ == '__main__':
    unittest.main()
