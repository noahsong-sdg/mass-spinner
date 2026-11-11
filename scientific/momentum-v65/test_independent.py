"""Auditor negative controls; synthetic fixtures do not validate experiments."""
import copy
import math
import unittest

import independent_check as check


def fixture(walls=False, rigid=False):
    # Closed-form two-by-two inverse, independent of auditor's LDL solver.
    inertia = [7.5*math.pi, 32.5*math.pi]
    g = 4*math.pi/(1/1.5**2-1/2.5**2)
    gi = 4*math.pi/(1-1/1.5**2) if walls else 0
    go = 4*math.pi/(1/2.5**2-1/3**2) if walls else 0
    dt = .1
    old = [3.0, 3.0] if rigid else [3.0, -1.0]
    torque = [0.0, 0.0] if rigid else [1.0, -2.0]
    inner = 5.0 if walls else None
    outer = 0.0 if walls else None
    spec = {'id': 'synthetic-two-cell', 'edgesM': [1.0, 2.0, 3.0], 'lengthM': 1.0,
            'densityKgM3': [1.0, 1.0], 'viscosityPaS': [1.0, 1.0],
            'innerWallRadS': inner, 'outerWallRadS': outer,
            'torqueNm': torque, 'initialOmegaRadS': old, 'dtS': dt, 'steps': 1}
    d0, d1 = inertia[0]+dt*(g+gi), inertia[1]+dt*(g+go)
    rhs = [inertia[0]*old[0]+dt*(torque[0]+gi*(inner or 0)),
           inertia[1]*old[1]+dt*(torque[1]+go*(outer or 0))]
    determinant = d0*d1-(dt*g)**2
    new = [(d1*rhs[0]+dt*g*rhs[1])/determinant,
           (dt*g*rhs[0]+d0*rhs[1])/determinant]
    wall_torque = [gi*((inner or 0)-new[0]), go*((outer or 0)-new[1])]
    cumulative = {'driveWorkJ': dt*sum(t*w for t, w in zip(torque, new)),
                  'wallWorkJ': dt*(wall_torque[0]*(inner or 0)+wall_torque[1]*(outer or 0)),
                  'shearHeatJ': dt*(g*(new[1]-new[0])**2+gi*(new[0]-(inner or 0))**2+go*(new[1]-(outer or 0))**2),
                  'numericalLossJ': .5*sum(i*(b-a)**2 for i, a, b in zip(inertia, old, new)),
                  'driveImpulseKgM2S': dt*sum(torque),
                  'wallImpulseKgM2S': dt*sum(wall_torque)}
    def state(time, omega, ledger):
        return {'timeS': time, 'omegaRadS': omega,
                'angularMomentumKgM2S': sum(i*w for i, w in zip(inertia, omega)),
                'kineticJ': .5*sum(i*w*w for i, w in zip(inertia, omega)), 'cumulative': ledger}
    states = [state(0, old, {key: 0.0 for key in cumulative}), state(dt, new, cumulative)]
    return {'cases': [spec]}, {'cases': [{'spec': copy.deepcopy(spec), 'states': states}]}


class IndependentMomentumAuditTests(unittest.TestCase):
    def test_closed_form_two_cell_reconstruction(self):
        for walls in [False, True]:
            inputs, outputs = fixture(walls=walls)
            report = check.audit(inputs, outputs)
            self.assertTrue(report['cases'][0]['numericalChecksPassed'])
            self.assertFalse(report['experimentalValidation'])

    def test_rigid_stress_free_flow_has_no_physical_shear(self):
        inputs, outputs = fixture(rigid=True)
        result = check.audit(inputs, outputs)
        self.assertLess(result['cases'][0]['maxima']['energyRelative'], 1e-12)
        self.assertLess(outputs['cases'][0]['states'][1]['cumulative']['shearHeatJ'], 1e-24)

    def test_independent_ldl_known_spd_solution(self):
        values = check.solve(check.factor([4.0, 3.0], [1.0]), [1.0, 2.0])
        self.assertAlmostEqual(values[0], 1/11)
        self.assertAlmostEqual(values[1], 7/11)

    def test_rejects_changed_frozen_spec(self):
        inputs, outputs = fixture()
        outputs['cases'][0]['spec']['viscosityPaS'][0] *= 2
        with self.assertRaises(ValueError):
            check.audit(inputs, outputs)

    def test_rejects_hertz_radian_confusion(self):
        inputs, outputs = fixture()
        outputs['cases'][0]['states'][1]['omegaRadS'][0] /= 2*math.pi
        with self.assertRaises(ValueError):
            check.audit(inputs, outputs)

    def test_rejects_missing_or_skipped_steps(self):
        inputs, outputs = fixture()
        outputs['cases'][0]['states'].pop()
        with self.assertRaises(ValueError):
            check.audit(inputs, outputs)

    def test_rejects_reversed_wall_impulse(self):
        inputs, outputs = fixture(walls=True)
        outputs['cases'][0]['states'][1]['cumulative']['wallImpulseKgM2S'] *= -1
        with self.assertRaises(ValueError):
            check.audit(inputs, outputs)

    def test_rejects_global_omega_wall_power(self):
        inputs, outputs = fixture(walls=True)
        state = outputs['cases'][0]['states'][1]
        state['cumulative']['wallWorkJ'] = state['omegaRadS'][0]*state['cumulative']['wallImpulseKgM2S']
        with self.assertRaises(ValueError):
            check.audit(inputs, outputs)

    def test_rejects_missing_numerical_loss_or_wall_shear(self):
        for key in ['numericalLossJ', 'shearHeatJ']:
            inputs, outputs = fixture(walls=True)
            outputs['cases'][0]['states'][1]['cumulative'][key] = 0
            with self.assertRaises(ValueError):
                check.audit(inputs, outputs)

    def test_rejects_wrong_shell_inertia_energy(self):
        inputs, outputs = fixture()
        outputs['cases'][0]['states'][1]['kineticJ'] *= 2
        with self.assertRaises(ValueError):
            check.audit(inputs, outputs)

    def test_rejects_nonphysical_material_or_nonfinite_fields(self):
        for field in ['viscosityPaS', 'densityKgM3']:
            inputs, outputs = fixture()
            inputs['cases'][0][field][0] = 0
            outputs['cases'][0]['spec'] = copy.deepcopy(inputs['cases'][0])
            with self.assertRaises(ValueError):
                check.audit(inputs, outputs)
        with self.assertRaises(ValueError):
            check.finite(True, 'boolean')
        with self.assertRaises(ValueError):
            check.invalid_constant('NaN')

    def test_axis_cannot_be_a_rotating_solid_wall(self):
        inputs, _ = fixture(walls=True)
        spec = inputs['cases'][0]
        spec['edgesM'][0] = 0
        with self.assertRaisesRegex(ValueError, 'axis'):
            check.geometry(spec)
        spec['innerWallRadS'] = None
        self.assertEqual(check.geometry(spec)[3][0], 0)

    def test_couette_reference_exact_boundary_values(self):
        spec = {'edgesM': [1, 2, 3], 'lengthM': 1, 'viscosityPaS': [1, 1],
                'torqueNm': [0, 0], 'innerWallRadS': 5, 'outerWallRadS': -2}
        reference = check.analytic_profile(spec, [1, 3])
        self.assertAlmostEqual(reference['omegaRadS'][0], 5)
        self.assertAlmostEqual(reference['omegaRadS'][1], -2)

    def test_cutoff_reference_is_continuous_and_flat_in_core(self):
        edges = [0, .5, 1, 2]
        cutoff = .75
        torques = [max(0, b*b-cutoff**2)-max(0, a*a-cutoff**2) for a, b in zip(edges, edges[1:])]
        spec = {'edgesM': edges, 'lengthM': 1, 'viscosityPaS': [1, 1, 1],
                'torqueNm': torques, 'innerWallRadS': None, 'outerWallRadS': 0,
                'driveInnerRadiusM': cutoff}
        reference = check.analytic_profile(spec, [.25, .75, 2])
        self.assertAlmostEqual(reference['omegaRadS'][0], reference['omegaRadS'][1])
        self.assertAlmostEqual(reference['omegaRadS'][2], 0)


if __name__ == '__main__':
    unittest.main()
