"""Independent reference fixtures. Run with unittest inside safe-dev only."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

from reference import KB, RHO, assess, eigensolution, enthalpy, error_record, evaluate, frozen_graph


def fixture(tg=1100., tw=1200.):
    radius, length, n, number = .1, 1., 2, 1e19
    edges = radius+.005*(np.arange(n+1)/n)**2
    centers = np.sqrt(edges[:-1]*edges[1:])
    volume = np.pi*length*np.diff(edges)*(edges[1:]+edges[:-1])
    masses = volume*RHO
    setup = {'number': number, 'lightFraction': .3, 'radiusM': radius, 'lengthM': length,
             'meshFamily': 'quadratic', 'gasTemperatureK': tg, 'wallTemperatureK': tw,
             'gasConductivityWMK': .04,
             'boundary': {'gasWallWK': 2., 'coolingWK': 0., 'coolantK': 300.},
             'liner': {'radiusEdgesM': list(edges), 'radiusCentersM': list(centers),
                       'volumesM3': list(volume), 'massesKg': list(masses), 'lengthM': length}}
    gas = np.full(n, 1.5*KB*number/n*tg)
    wall = masses*enthalpy(tw)
    result = {'gasTemperatureK': [tg]*n, 'linerSolveTemperatureK': [tw]*n,
              'gasEnergyJ': list(gas), 'cellEnergyJ': list(wall),
              'gasCellNumbers': [number/n]*n, 'gasSourceJ': [0.]*n,
              'coolingEnergyJ': 0., 'speciesFaceEnergyJ': [0.],
              'gasFaceEnergyJ': [0.], 'gasExchangeJ': 0.}
    return {'id': 'fixture', 'setup': setup, 'initial': {'gasEnergyJ': list(gas), 'linerEnergyJ': list(wall)},
            'durationS': 1e-9, 'requestedSteps': 1, 'failure': None,
            'steps': [{'dtS': 1e-9, 'result': result}]}


class ReferenceTests(unittest.TestCase):
    def test_two_node_exact_exchange(self):
        capacity, link, initial, time = np.array([2., 3.]), np.array([4.]), np.array([10., 20.]), .2
        delta, audit = eigensolution(capacity, link, initial, time)
        difference = -10*np.exp(-4*(1/2+1/3)*time)
        expected = np.array([16+3/5*difference, 16-2/5*difference])-initial
        np.testing.assert_allclose(delta, expected, rtol=2e-14, atol=1e-14)
        self.assertLess(audit['expmIncrementDifferenceK'], 1e-13)

    def test_three_node_laplacian_mode(self):
        # [1,0,-1] is eigenvector of the unit-chain Laplacian with eigenvalue 1.
        initial = np.array([1201., 1200., 1199.])
        delta, _ = eigensolution(np.ones(3), np.ones(2), initial, .3)
        np.testing.assert_allclose(delta, np.expm1(-.3)*np.array([1., 0., -1.]), atol=1e-14)

    def test_uniform_equilibrium_and_no_heat(self):
        result = evaluate(fixture(1100., 1100.))
        self.assertTrue(result['allStepAuditsPass'])
        self.assertIs(type(result['stepAudits'][0]['pass']), bool)
        json.dumps(result, allow_nan=False)  # Report is a plain JSON boundary.
        self.assertEqual(result['surface']['errorK'], 0)
        self.assertEqual(result['gas']['errorK'], 0)
        self.assertIsNone(result['gas']['relative'])  # Zero response is not qualified accuracy.

    def test_invalid_geometry_and_domain(self):
        for mutate in (
            lambda c: c['setup']['liner']['massesKg'].__setitem__(0, 0.),
            lambda c: c['setup']['liner']['radiusEdgesM'].__setitem__(1, .09),
            lambda c: c['setup'].__setitem__('meshFamily', 'exponential-8'),
            lambda c: c['setup'].__setitem__('wallTemperatureK', 2000.),
            lambda c: c['setup']['boundary'].__setitem__('coolingWK', 1.),
        ):
            case = fixture()
            mutate(case)
            with self.assertRaises(ValueError):
                frozen_graph(case['setup'], 2)

    def test_stale_hash_and_incomplete_case(self):
        for old in ({'cases': [fixture()]}, {'sourceSHA256': 'old', 'cases': [fixture()]}):
            with self.assertRaises(ValueError):
                assess(old)
        packet = {'sourceSHA256': 'a'*64, 'cases': [fixture()]}
        packet['cases'][0]['requestedSteps'] = 4
        result = assess(packet)
        self.assertFalse(result['pass'])
        self.assertIn('incomplete', result['failedCases'][0]['failure'])

    def test_energy_defect_and_reversed_heat_rejected(self):
        case = fixture(1100., 1100.)
        case['steps'][0]['result']['gasEnergyJ'][0] += 1e-4
        with self.assertRaises(ValueError):
            evaluate(case)
        case = fixture()
        case['steps'][0]['result']['gasExchangeJ'] = 1e-4  # Colder gas cannot heat the hotter wall.
        self.assertFalse(evaluate(case)['allStepAuditsPass'])

    def test_source_and_duration_rejected(self):
        for key, value in (('gasSourceJ', [1e-4, 0.]), ('coolingEnergyJ', 1e-4),
                           ('speciesFaceEnergyJ', [1e-4])):
            case = fixture()
            case['steps'][0]['result'][key] = value
            with self.assertRaises(ValueError):
                evaluate(case)
        case = fixture()
        case['durationS'] *= 2
        with self.assertRaises(ValueError):
            evaluate(case)

    def test_reference_uncertainty_can_block_small_apparent_error(self):
        # 0.5% measured error passes accuracy, but reference consumes 20% of
        # the 1% budget and therefore cannot qualify this external comparison.
        result = error_record(np.array([1.005e-6]), np.array([1e-6]), 2e-9)
        self.assertLess(result['relative'], .01)
        self.assertFalse(result['referenceQualified'])
        qualified = error_record(np.array([1.005e-6]), np.array([1e-6]), 5e-10)
        self.assertTrue(qualified['referenceQualified'])
        self.assertFalse(error_record(np.zeros(1), np.zeros(1), 0)['referenceQualified'])

    def test_exported_heat_magnitude_not_only_direction(self):
        case = fixture()
        result = case['steps'][0]['result']
        _, links, _ = frozen_graph(case['setup'], 2)
        physical = case['durationS']*links[1]*(1100-1200)
        result['gasExchangeJ'] = physical
        self.assertTrue(evaluate(case)['stepAudits'][0]['exportedHeatMatchesPhysics'])
        result['gasExchangeJ'] *= 2  # Same physical direction, incorrect magnitude.
        audit = evaluate(case)['stepAudits'][0]
        self.assertFalse(audit['exportedHeatMatchesPhysics'])
        self.assertGreater(audit['maximumExportedHeatDefectJ'], 0)

    def test_external_gate_rejects_unqualified_reference(self):
        # Isolate assessment logic from the numerical reference with a complete,
        # otherwise passing support matrix; uncertainty must independently veto.
        reports = []
        for family in ('quadratic', 'exponential-8'):
            for wall in (32, 64, 128):
                for steps in (1, 4, 16, 64):
                    for time in (15.2587890625e-9, 61.03515625e-9):
                        metric = {'relative': .005, 'referenceQualified': True, 'referenceUncertaintyK': 0.}
                        reports.append({'id': str(len(reports)), 'gridFamily': family, 'wallCells': wall,
                                        'substeps': steps, 'timeS': time, 'surfaceIncrementK': 1.,
                                        'gasIncrementK': [1.], 'surface': dict(metric), 'gas': dict(metric),
                                        'allStepAuditsPass': True})
        packet = {'sourceSHA256': 'a'*64, 'cases': reports}
        with patch('reference.evaluate', side_effect=lambda case: case):
            self.assertTrue(assess(packet)['pass'])
            reports[-1]['surface']['referenceQualified'] = False
            self.assertFalse(assess(packet)['pass'])

    def test_cli_failed_assessment_is_nonzero_and_retains_raw_hash(self):
        with tempfile.TemporaryDirectory() as directory:
            packet, output = Path(directory)/'packet.json', Path(directory)/'output.json'
            raw = json.dumps({'sourceSHA256': 'a'*64, 'cases': [fixture(1100., 1100.)]}).encode()
            packet.write_bytes(raw)
            completed = subprocess.run([sys.executable, str(Path(__file__).with_name('reference.py')),
                                        str(packet), str(output)], capture_output=True, text=True)
            self.assertEqual(completed.returncode, 1, completed.stderr)
            text = output.read_text() if output.exists() else '<missing output>'
            try:
                saved = json.loads(text)
            except json.JSONDecodeError:
                self.fail(f'CLI failed to emit complete JSON; stderr={completed.stderr!r}; output={text!r}')
            self.assertFalse(saved['pass'])
            self.assertEqual(saved['rawSHA256'], hashlib.sha256(raw).hexdigest())


if __name__ == '__main__':
    unittest.main()
