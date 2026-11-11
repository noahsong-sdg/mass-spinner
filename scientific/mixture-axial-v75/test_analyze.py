import unittest
from copy import deepcopy
import numpy as np
from analyze import analyze, compare_profiles, overlap, requested, response_scale

KB, U = 1.380649e-23, 1.66053906892e-27


def manifest():
    return dict(schemaVersion=1, densityKgM3=.001, initialGasK=350., initialLinerK=350., timesS=[1., 2., 4.],
                joint=[[2, 2, 4], [4, 4, 16], [6, 6, 32]],
                spatial=[[2, 2, 32], [4, 4, 32]], temporal=[[4, 4, 4], [4, 4, 16], [4, 4, 32]],
                radial=[[2, 6, 32], [4, 6, 32]], axial=[[6, 2, 32], [6, 4, 32]],
                tighterTolerance=[4, 4, 16], independentTolerances=['linear', 'thermal', 'both'],
                referenceSmallerDt=[6, 6, 64], referenceSpatial=[8, 8, 64])


def case(nr, nz, nt, mode='base', rho=.001, y=.5, gas=350., omega=900.):
    r, z = np.linspace(0., .06, nr+1), np.linspace(0., .14, nz+1)
    volume = np.pi*np.diff(z)[:, None]*np.diff(r*r)[None, :]
    mass = np.broadcast_to(rho, (nz, nr))*volume
    fraction = np.broadcast_to(y, (nz, nr))
    inertia = mass*(r[:-1]**2+r[1:]**2)/2
    energy = 1.5*KB*mass*(fraction/(36*U)+(1-fraction)/(40*U))*gas+.5*inertia*omega**2
    q = np.array([mass, np.zeros_like(mass), np.zeros_like(mass), inertia*omega, energy, mass*fraction])
    cases = [dict(timeS=t, q=q.tolist(), solidK=np.full((nz, 2), 350.).tolist(),
                      observables=dict(currentA=1., torqueNm=-2., shearHeatW=.1)) for t in (1., 2., 4.)]
    return dict(nr=nr, nz=nz, nt=nt, mode=mode,
                setup=dict(r=r.tolist(), z=z.tolist(), wall=[.06, .061, .063], masses=[36*U, 40*U]),
                initialQ=q.tolist(), initialSolidK=np.full((nz, 2), 350.).tolist(),
                cases=cases, stepChecks=[])


def raw():
    m = manifest()
    return dict(manifest=m, failures=[], cases=[case(*k) for k in sorted(requested(m))])


class AnalysisControls(unittest.TestCase):
    def test_complete_exact_profiles_pass_all_series_and_references(self):
        out = analyze(raw())
        self.assertTrue(out['numericallyQualified'])
        self.assertEqual(out['requirementsGaps'], [])
        self.assertFalse(out['experimentalQualified'])
        self.assertFalse(out['liveQualified'])
        for series in out['series'].values():
            self.assertTrue(series['passed'])

    def test_missing_trajectory_or_reference_withholds_qualification(self):
        for k in ((2, 6, 32, 'base'), (6, 6, 64, 'base'), (4, 4, 16, 'thermal')):
            data = raw()
            data['cases'] = [t for t in data['cases'] if (t['nr'], t['nz'], t['nt'], t['mode']) != k]
            result = analyze(data)
            self.assertFalse(result['numericallyQualified'])
            self.assertTrue(result['requirementsGaps'])

    def test_failed_producer_never_qualifies(self):
        data = raw()
        data['failures'] = [{'error': 'retained actual failure'}]
        self.assertFalse(analyze(data)['numericallyQualified'])

    def test_duplicate_extra_or_missing_physical_outputs_rejected(self):
        for times in ([1., 2., 2.], [1., 4.], [4., 2., 1.]):
            data = raw()
            data['cases'][0]['cases'] = [dict(data['cases'][0]['cases'][0], timeS=t) for t in times]
            with self.assertRaisesRegex(AssertionError, 'physical outputs'):
                analyze(data)
        data = raw()
        data['cases'].append(deepcopy(data['cases'][0]))
        with self.assertRaisesRegex(AssertionError, 'Duplicate'):
            analyze(data)
        data = raw()
        data['cases'].append(case(7, 7, 77))
        with self.assertRaisesRegex(AssertionError, 'Unexpected'):
            analyze(data)

    def test_migrated_schema_and_missing_tolerance_variation_rejected(self):
        data = raw()
        data['manifest']['schemaVersion'] = 0
        with self.assertRaisesRegex(AssertionError, 'migrated'):
            analyze(data)
        data = raw()
        data['manifest']['independentTolerances'] = ['both']
        with self.assertRaisesRegex(AssertionError, 'tolerance modes'):
            analyze(data)

    def test_primitive_profiles_recomputed_from_conserved_state(self):
        data = raw()
        for t in data['cases']:
            for endpoint in t['cases']:
                endpoint['profiles'] = {'density': 'stale cached profile'}
        self.assertTrue(analyze(data)['numericallyQualified'])
        data['cases'][0]['cases'][0]['q'][4][0][0] = -1.
        with self.assertRaisesRegex(AssertionError, 'primitive'):
            analyze(data)

    def test_nonfinite_state_or_observable_rejected(self):
        for value in (float('nan'), float('inf')):
            data = raw()
            data['cases'][0]['cases'][0]['q'][0][0][0] = value
            with self.assertRaises(AssertionError):
                analyze(data)
            data = raw()
            data['cases'][0]['cases'][0]['observables']['currentA'] = value
            with self.assertRaisesRegex(AssertionError, 'observables'):
                analyze(data)

    def test_reference_must_cover_entire_coarse_volume(self):
        with self.assertRaisesRegex(AssertionError, 'cover'):
            overlap([0., .5, 1.], [0., .25, .75])
        np.testing.assert_array_equal(overlap([0., 1.], [0., .25, 1.]), [[.25, .75]])

    def test_mass_fraction_uses_mass_restriction_not_volume_average(self):
        fine = case(2, 2, 32, rho=np.array([[1., 3.], [1., 3.]]), y=np.array([[.1, .9], [.1, .9]]))
        coarse = case(1, 1, 4, rho=2.5, y=.82)
        out = compare_profiles(coarse, coarse['cases'][0], fine, fine['cases'][0], manifest())
        self.assertLess(out['Y']['rmsAbsolute'], 1e-14)
        self.assertEqual(out['Y']['weighting'], 'mass')
        self.assertNotAlmostEqual(.82, .25*.1+.75*.9)

    def test_mass_fraction_rms_is_mass_weighted(self):
        density = np.array([[1., 9.], [1., 9.]])
        fine = case(2, 2, 32, rho=density, y=.5)
        coarse = case(2, 2, 4, rho=density, y=np.array([[.51, .5], [.51, .5]]))
        out = compare_profiles(coarse, coarse['cases'][0], fine, fine['cases'][0], manifest())
        self.assertAlmostEqual(out['Y']['rmsAbsolute'], .01/np.sqrt(28.), places=14)

    def test_response_scales_do_not_hide_small_density_composition_changes(self):
        m = manifest()
        self.assertEqual(response_scale('density', np.array([.001]), m), 1e-6)
        self.assertEqual(response_scale('Y', np.array([.5]), m), .001)
        self.assertEqual(response_scale('gas', np.array([350.]), m), 1.)
        self.assertEqual(response_scale('solid', np.array([350.01]), m), 1.)
        self.assertEqual(response_scale('vr', np.array([.1]), m), 1.)
        self.assertEqual(response_scale('densityChange', np.array([0.]), m), 1e-9)
        self.assertEqual(response_scale('YChange', np.array([0.]), m), 1e-6)

    def test_tiny_evolution_is_not_hidden_by_large_initial_variation(self):
        rho = np.array([[.0009, .0011], [.0009, .0011]])
        y = np.array([[.44, .56], [.44, .56]])
        coarse = case(2, 2, 16, rho=rho, y=y)
        reference = case(2, 2, 32, rho=rho, y=y)
        coarse['cases'][0] = case(2, 2, 16, rho=rho+1e-9, y=y+1e-6)['cases'][0]
        reference['cases'][0] = case(2, 2, 32, rho=rho+2e-9, y=y+2e-6)['cases'][0]
        result = compare_profiles(coarse, coarse['cases'][0], reference, reference['cases'][0], manifest())
        self.assertLess(result['density']['rmsNormalized'], .001)
        self.assertLess(result['Y']['rmsNormalized'], .001)
        self.assertAlmostEqual(result['densityChange']['rmsNormalized'], .5, places=10)
        self.assertAlmostEqual(result['YChange']['rmsNormalized'], .5, places=10)

    def test_y_change_restricts_initial_and_final_states_with_their_own_mass(self):
        fine = case(2, 2, 32, rho=np.array([[1., 3.], [1., 3.]]), y=np.array([[.1, .9], [.1, .9]]))
        fine['cases'][0] = case(2, 2, 32, rho=np.array([[3., 1.], [3., 1.]]),
                                  y=np.array([[.2, .8], [.2, .8]]))['cases'][0]
        # Initial mass-weighted Y=.82; final mass-weighted Y=.5, hence change=-.32.
        coarse = case(1, 1, 4, rho=2.5, y=.82)
        coarse['cases'][0] = case(1, 1, 4, rho=1.5, y=.5)['cases'][0]
        result = compare_profiles(coarse, coarse['cases'][0], fine, fine['cases'][0], manifest())
        self.assertLess(result['YChange']['rmsAbsolute'], 1e-14)

    def test_local_error_gate_catches_spike_despite_passing_rms(self):
        data = raw()
        for index, t in enumerate(data['cases']):
            if (t['nr'], t['nz'], t['nt'], t['mode']) == (4, 4, 32, 'base'):
                rho = np.full((4, 4), .001)
                rho[0, 0] += 1e-7
                data['cases'][index] = case(4, 4, 32, rho=rho)
        out = analyze(data)
        gates = out['series']['spatial']['gates']
        self.assertTrue(next(g['passed'] for g in gates if g['name'] == '1.0:density:rms'))
        self.assertFalse(next(g['passed'] for g in gates if g['name'] == '1.0:density:max'))
        self.assertFalse(out['numericallyQualified'])

    def test_tolerance_difference_is_subject_to_stricter_gate(self):
        data = raw()
        t = next(t for t in data['cases'] if t['mode'] == 'linear')
        for endpoint in t['cases']:
            endpoint['observables']['currentA'] *= 1.002
        out = analyze(data)
        self.assertFalse(out['linearTolerance']['passed'])
        self.assertFalse(out['numericallyQualified'])


if __name__ == '__main__':
    unittest.main()
