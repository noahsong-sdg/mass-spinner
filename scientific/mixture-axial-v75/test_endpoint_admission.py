"""Production fixtures are used only in tests, never in the checker."""
from copy import deepcopy
import json
from pathlib import Path
import unittest
import numpy as np
from endpoint_admission import check_initial, check_observables, expected_observables
from flow import Flow
from mixcheck import graph
from run import configuration, endpoint, trajectory

HERE = Path(__file__).resolve().parent


class InitialAdmission(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads((HERE/'manifest.json').read_text())
        _, setup, q, wall = configuration(self.manifest, 3, 4)
        self.t = dict(setup=setup, initialQ=q, initialSolidK=wall)

    def test_actual_initializer_matches_independent_canonical_fields(self):
        check_initial(self.t, self.manifest)

    def test_all_initial_conserved_fields_reject_balanced_corruption(self):
        for component in range(6):
            with self.subTest(component=component):
                t = deepcopy(self.t)
                field = t['initialQ'][component]
                delta = 1e-4*np.max(abs(field))
                field.flat[0] += delta
                field.flat[-1] -= delta
                with self.assertRaisesRegex(AssertionError, 'canonical study'):
                    check_initial(t, self.manifest)

    def test_valid_but_wrong_initial_wall_temperature_rejected(self):
        self.t['initialSolidK'][0] += 1
        with self.assertRaisesRegex(AssertionError, 'solid temperature'):
            check_initial(self.t, self.manifest)

    def test_changed_declared_initial_fields_reject_old_state(self):
        for name in ('initialGasK', 'densityKgM3', 'initialOmegaRadS', 'initialLinerK'):
            with self.subTest(name=name):
                m = deepcopy(self.manifest)
                m[name] *= 1.001
                with self.assertRaises(AssertionError):
                    check_initial(self.t, m)


class EndpointAdmission(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        m = json.loads((HERE/'manifest.json').read_text())
        cls.t = trajectory(m, 3, 4, 16)

    def test_real_coupled_endpoints_match_every_reconstructed_observable(self):
        for case in self.t['cases']:
            with self.subTest(time=case['timeS']):
                self.assertEqual(len(check_observables(self.t, case, graph)), 14)

    def test_reconstructed_observations_are_json_numbers(self):
        values = expected_observables(self.t, self.t['cases'][0], graph)
        self.assertTrue(all(type(value) is float for value in values.values()))
        self.assertEqual(json.loads(json.dumps(values, allow_nan=False)), values)

    def test_common_cached_observable_bias_cannot_hide_in_refinement(self):
        for name in self.t['cases'][0]['observables']:
            with self.subTest(name=name):
                t = deepcopy(self.t)
                for case in t['cases']:
                    value = case['observables'][name]
                    case['observables'][name] = value*1.01 if value else 1.
                with self.assertRaisesRegex(AssertionError, 'observable mismatch '+name):
                    check_observables(t, t['cases'][0], graph)

    def test_stale_current_shear_and_wall_torques_rejected(self):
        original = self.t['cases'][-1]
        for name in ('currentA', 'jouleW', 'shearW', 'torque_outer', 'torque_lower', 'torque_upper'):
            with self.subTest(name=name):
                case = deepcopy(original)
                q = np.asarray(case['q']).copy()
                r = np.asarray(self.t['setup']['r'])
                inertia = q[0]*(r[:-1]**2+r[1:]**2)/2
                old_rotational = q[3]**2/(2*inertia)
                q[3] *= 1.5
                q[4] += q[3]**2/(2*inertia)-old_rotational
                case['q'] = q
                stale = case['observables'][name]
                case['observables'] = expected_observables(self.t, case, graph)
                case['observables'][name] = stale
                with self.assertRaisesRegex(AssertionError, 'observable mismatch '+name):
                    check_observables(self.t, case, graph)

    def test_exact_cylinder_centroid_rejects_old_midpoint_formula(self):
        setup = deepcopy(self.t['setup'])
        f = Flow(setup['r'], setup['z'], setup['masses'])
        q = f.state(.001, 350., .4, 0.)
        case = dict(q=q, solidK=[350.]*(len(setup['z'])-1)*(len(setup['wall'])-1))
        t = dict(setup=setup)
        case['observables'] = expected_observables(t, case, graph)
        for name in ('lightRadialMomentM', 'heavyRadialMomentM'):
            self.assertAlmostEqual(case['observables'][name], 2*setup['r'][-1]/3, delta=1e-16)
        r = np.asarray(setup['r'])
        midpoint = (r[:-1]+r[1:])/2
        case['observables']['lightRadialMomentM'] = float(np.sum(q[5]*midpoint)/np.sum(q[5]))
        with self.assertRaisesRegex(AssertionError, 'observable mismatch lightRadialMomentM'):
            check_observables(t, case, graph)

    def test_no_drive_zero_motion_observables_need_no_relative_floor(self):
        setup = deepcopy(self.t['setup'])
        c = setup['electrical']
        c['magneticT'] = 0.
        for name in ('outerVoltageV', 'lowerVoltageV', 'upperVoltageV'):
            c[name] = [0.]*len(c[name])
        f = Flow(setup['r'], setup['z'], setup['masses'])
        q = f.state(.001, 350., .4, 0.)
        wall = [350.]*(len(setup['z'])-1)*(len(setup['wall'])-1)
        source = dict(mechanical=dict(current=dict(boundaryCurrentsA=[0.], jouleW=0.),
            shearHeatW=0., boundaryTorqueNm=dict(outer=0., lower=0., upper=0.)))
        case = endpoint(f, setup, q, wall, source, 1e-5)
        check_observables(dict(setup=setup), case, graph)
        for name in ('currentA', 'jouleW', 'shearW', 'radialMotionalJouleW'):
            self.assertEqual(case['observables'][name], 0.)


if __name__ == '__main__':
    unittest.main()
