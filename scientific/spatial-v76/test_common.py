from copy import deepcopy
from importlib.metadata import version
import json
import platform
import unittest
import numpy as np
import common_space as common
from analyze import compare_profiles as cell_average_profiles
from test_analyze import case, manifest, raw


def velocity(t, value):
    for e in t['cases']:
        q = np.asarray(e['q'])
        q[2] = q[0]*value
        q[4] += .5*q[0]*value**2
        e['q'] = q.tolist()
    return t


class CommonSpace(unittest.TestCase):
    def test_coarse_averaging_can_hide_a_fully_unresolved_wave(self):
        coarse, fine = case(2, 2, 4), case(2, 64, 32)
        z = np.asarray(fine['setup']['z'])
        k = 4*np.pi/z[-1]
        average = (np.cos(k*z[:-1])-np.cos(k*z[1:]))/(k*np.diff(z))
        fine = velocity(fine, average[:, None])
        old = cell_average_profiles(coarse, coarse['cases'][0], fine, fine['cases'][0], manifest())
        new = common.compare_profiles(coarse, coarse['cases'][0], fine, fine['cases'][0], manifest())
        self.assertLess(old['vz']['rmsNormalized'], 1e-14)
        self.assertGreater(new['vz']['rmsNormalized'], .70)

    def test_linear_fields_are_exact_on_nonnested_reference_grid(self):
        fields = []
        for n in (6, 36):
            t = case(n, n, 32)
            s = np.asarray(t['setup']['r'])**2
            z = np.asarray(t['setup']['z'])
            fields.append(velocity(t, 1+2*(z[:-1]+z[1:])[:, None]/2+3*(s[:-1]+s[1:])[None, :]/2))
        result = common.compare_profiles(fields[0], fields[0]['cases'][0], fields[1], fields[1]['cases'][0], manifest())
        self.assertLess(result['vz']['maxAbsolute'], 2e-15)

    def test_exact_profiles_retain_all_gates_observables_and_legacy_verdict(self):
        data = raw()
        data['manifest']['referenceTransportCfl'] = data['manifest']['joint'][-1]
        data['cases'].append(case(*data['manifest']['joint'][-1], mode='transport'))
        before = deepcopy(data)
        result = common.common_analysis(data)
        self.assertTrue(result['numericallyQualified'])
        self.assertTrue(result['cellAverageVerdict']['numericallyQualified'])
        self.assertEqual(sum(len(s['gates']) for s in result['series'].values()),
                         sum(len(s['gates']) for s in common.analyze(data)['series'].values()))
        self.assertEqual(data, before)
        self.assertFalse(result['experimentalQualified'])
        self.assertFalse(result['liveQualified'])

    def test_species_changes_reconstruct_initial_and_final_mass_separately(self):
        fields = []
        for n in (2, 6):
            s = np.linspace(0., .06, n+1)**2
            x = (s[:-1]+s[1:])[None, :]/2
            rho, light = 1+x, .2+.1*x
            initial_rho, initial_light = 2-.5*x, .3+.2*x
            t = case(n, n, 32, rho=initial_rho, y=initial_light/initial_rho)
            t['cases'] = case(n, n, 32, rho=rho, y=light/rho)['cases']
            fields.append(t)
        result = common.compare_profiles(fields[0], fields[0]['cases'][0], fields[1], fields[1]['cases'][0], manifest())
        for name in ('Y', 'YChange'):
            self.assertLess(result[name]['maxAbsolute'], 2e-15)
            self.assertEqual(result[name]['weighting'], 'mass')

    def test_stale_source_plan_runtime_or_thresholds_rejected(self):
        m = json.loads((common.SOURCE/'manifest.json').read_text())
        report = dict(sourceHashes=common.hashes(), manifest=m, failures=[],
            plannedAnalysisSha256=common.digest(common.__file__),
            preRunRuntime=dict(python=platform.python_version(), numpy=version('numpy'),
                scipy=version('scipy'), fipy=version('fipy')))
        plan = dict(schemaVersion=1, limits=common.LIMITS, fields=list(common.FIELDS),
            producerSourceHashes=common.hashes(), manifestSha256=common.digest(common.SOURCE/'manifest.json'),
            analysisSha256=common.digest(common.__file__))
        common.bind(report, plan)
        for field, value in (('schemaVersion', 0), ('limits', dict(common.LIMITS, rms=.03)),
                             ('producerSourceHashes', {'old': 'data'}), ('analysisSha256', 'old')):
            changed = deepcopy(plan)
            changed[field] = value
            with self.assertRaises(AssertionError):
                common.bind(report, changed)
        report['preRunRuntime']['numpy'] = 'old'
        with self.assertRaises(AssertionError):
            common.bind(report, plan)


if __name__ == '__main__':
    unittest.main()
