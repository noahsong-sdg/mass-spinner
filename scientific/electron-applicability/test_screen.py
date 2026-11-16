"""VM-only controls; manufactured powers are not experimental observations."""
import json
import os
from pathlib import Path
import tempfile
import unittest

import screen as m


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, allow_nan=False))
    return m.digest(path)


def fixture(root):
    cases = []
    for cells, field, rate in zip((1000, 2000, 4000), (10.1, 10.01, 10.), (1.1e-15, 1.01e-15, 1e-15)):
        label = 'point-n' + str(cells)
        folder = root / 'output' / label
        folder.mkdir(parents=True)
        values = dict.fromkeys(m.CHANNELS, 0.)
        values.update({'Field': field, 'Elastic collisions (loss)': -.4 * field,
                       'Excitation inelastic collisions': -.6 * field})
        power = folder / 'powerBalance.txt'
        power.write_text('\n'.join(f'{key} = {value:+.16e} (eVm3/s)' for key, value in values.items()) +
                         '\n---------\nField = +1000 (eVm3/s)\n')
        rates = folder / 'rateCoefficients.txt'
        rates.write_text(f'{rate} 0 e + Ar -> e + e + Ar+, Ionization\n')
        cases.append(dict(label=label, cells=cells, completed=True, exitCode=0,
            reducedFieldTd=10., gasTemperatureK=300., numberDensityM3=10.,
            meanEnergyEV=5., ionizationRateM3S=rate, checks=dict(native=True),
            nativeHashes={path.name: m.digest(path) for path in (power, rates)}))
    domain = dict(magneticFieldT=0, interpolationQualified=False)
    common = dict(upstreamCommit='fixed-test-source', dataSHA256='fixed-test-cross-sections')
    receipt = dict(common, cases=cases)
    receipt_sha = write(root / 'results/receipt.json', receipt)
    table = dict(common, domain=domain, rows=[cases[-1]], receiptSHA256=receipt_sha)
    table_sha = write(root / 'results/transport-table.json', table)
    row = dict(cases[-1], qualifiedObservables=['meanEnergyEV'])
    admitted = dict(common, schema='loki-bulk-admission-v1', domain=domain, rows=[row],
                    receiptSHA256=receipt_sha, sourceTableSHA256=table_sha)
    return write(root / 'results/bulk-admission-v2.json', admitted)


def state():
    return dict(schema='electron-applicability-state-v1', fieldFrame='neutral-rest',
        magneticFieldT=0., neutralDensityM3=10., electronDensityM3=2.,
        electricFieldNeutralFrameVm=[0., 0., 1e-19], gasTemperatureK=300., durationS=.1)


class ApplicabilityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.sha = fixture(self.root)
        self.point = m.authenticated_point(self.root, self.sha, 10., 300.)

    def test_actual_sourced_outputs_and_mesh_screens(self):
        report = m.assess(self.point, state())
        self.assertTrue(report['qualification']['powerChannelsNumericallyScreened'])
        self.assertTrue(report['qualification']['ionizationRateNumericallyScreened'])
        self.assertEqual(len(report['signedElectronPowerWM3']), 14)
        self.assertAlmostEqual(report['signedElectronPowerWM3']['Field'] / m.QE, 200.)
        self.assertAlmostEqual(report['directElasticHeavyPowerWM3'] / m.QE, 80.)
        self.assertAlmostEqual(report['directElasticHeavyFractionDiagnostic'], .4)
        self.assertAlmostEqual(report['electronEnergyThroughputTimeS'], .05)
        self.assertAlmostEqual(report['durationOverElectronEnergyThroughputTime'], 2.)
        self.assertAlmostEqual(report['neutralIonizationDepletionTimeS'], 5e14)
        self.assertAlmostEqual(report['electronIonizationMultiplicationTimeS'], 1e14)
        self.assertFalse(report['qualification']['experimental'])
        self.assertFalse(report['qualification']['magnetized'])

    def test_failed_ionization_gate_cannot_create_timescale(self):
        self.point['ionizationGate'] = m.refinement([1., 2., 3.])
        report = m.assess(self.point, state())
        self.assertFalse(report['qualification']['ionizationRateNumericallyScreened'])
        for key in ('neutralIonizationDepletionTimeS', 'electronIonizationMultiplicationTimeS',
                    'durationOverNeutralDepletionTime', 'durationOverElectronMultiplicationTime'):
            self.assertIsNone(report[key])

    def test_derived_values_require_only_contributing_power_screens(self):
        self.point['powerGates']['Ionization collisions']['passGate'] = False
        report = m.assess(self.point, state())
        self.assertIsNotNone(report['electronEnergyThroughputTimeS'])
        self.assertIsNotNone(report['directElasticHeavyPowerWM3'])
        self.point['powerGates']['group:elastic']['passGate'] = False
        report = m.assess(self.point, state())
        self.assertIsNone(report['directElasticHeavyPowerWM3'])
        self.assertIsNone(report['directElasticHeavyFractionDiagnostic'])
        self.point['powerGates']['Field']['passGate'] = False
        report = m.assess(self.point, state())
        self.assertIsNone(report['electronEnergyThroughputTimeS'])
        self.assertFalse(report['derivedNumericalScreens']['electronEnergyThroughputTime'])

    def test_zero_electron_population_does_not_imply_finite_depletion(self):
        inputs = state(); inputs['electronDensityM3'] = 0.
        report = m.assess(self.point, inputs)
        self.assertTrue(all(value == 0 for value in report['signedElectronPowerWM3'].values()))
        self.assertIsNone(report['neutralIonizationDepletionTimeS'])
        self.assertIsNone(report['electronEnergyThroughputTimeS'])
        self.assertIsNotNone(report['electronIonizationMultiplicationTimeS'])

    def test_zero_ionization_has_no_finite_time(self):
        self.point['row']['ionizationRateM3S'] = 0.
        self.point['ionizationGate'] = m.refinement([0., 0., 0.])
        report = m.assess(self.point, state())
        self.assertIsNone(report['neutralIonizationDepletionTimeS'])
        self.assertIsNone(report['electronIonizationMultiplicationTimeS'])

    def test_refuses_magnetic_frame_density_field_temperature_and_invalid_scalars(self):
        edits = [('magneticFieldT', .13), ('magneticFieldT', False), ('fieldFrame', 'lab'),
                 ('neutralDensityM3', 20.), ('gasTemperatureK', 1000.),
                 ('electricFieldNeutralFrameVm', [0., 0., 2e-19]),
                 ('electricFieldNeutralFrameVm', [True, 0., 1e-19]),
                 ('electronDensityM3', -1.), ('durationS', float('nan'))]
        for key, value in edits:
            with self.subTest(key=key, value=value):
                inputs = state(); inputs[key] = value
                with self.assertRaises(ValueError): m.assess(self.point, inputs)

    def test_unrepresentable_rate_scale_is_rejected_not_zero_or_finite_time(self):
        inputs = state(); inputs['electronDensityM3'] = 1e-310
        with self.assertRaisesRegex(ValueError, 'floating-point'): m.assess(self.point, inputs)

    def test_failed_rate_gate_does_not_hide_underflowed_power(self):
        self.point['ionizationGate'] = m.refinement([1., 2., 3.])
        self.point['row']['numberDensityM3'] = 1e22
        self.point['powers']['Ionization collisions'] = -1e-20
        inputs = state(); inputs.update(electronDensityM3=1e-310, neutralDensityM3=1e22,
                                        electricFieldNeutralFrameVm=[0., 0., 100.])
        with self.assertRaisesRegex(ValueError, 'Normalized power'): m.assess(self.point, inputs)

    def test_nonfinite_reciprocal_and_duration_ratio_are_refused(self):
        with self.assertRaisesRegex(ValueError, 'Rate scale'): m.inverse_product(1., 1e-320)
        inputs = state(); inputs['durationS'] = 1e308
        with self.assertRaisesRegex(ValueError, 'Derived ratio'): m.assess(self.point, inputs)

    def test_serialization_failure_leaves_no_partial_output_and_existing_is_preserved(self):
        output = self.root / 'report.json'
        with self.assertRaises(ValueError): m.write_report(output, dict(value=float('inf')))
        self.assertFalse(output.exists())
        m.write_report(output, dict(qualified=False))
        before = output.read_bytes()
        with self.assertRaises(FileExistsError): m.write_report(output, dict(qualified=True))
        self.assertEqual(output.read_bytes(), before)

    def test_relative_cli_root_binds_same_sources(self):
        previous = Path.cwd()
        try:
            os.chdir(self.root.parent)
            point = m.authenticated_point(Path(self.root.name), self.sha, 10., 300.)
        finally:
            os.chdir(previous)
        self.assertEqual(point['nativeSources'], self.point['nativeSources'])

    def test_stale_legacy_native_receipt_and_table_cases(self):
        with self.assertRaisesRegex(ValueError, 'Stale'):
            m.authenticated_point(self.root, 'not-the-pin', 10., 300.)
        with self.assertRaisesRegex(ValueError, 'Outside'):
            m.authenticated_point(self.root, self.sha, 11., 300.)
        power = self.root / 'output/point-n1000/powerBalance.txt'
        power.write_text(power.read_text() + 'changed')
        with self.assertRaisesRegex(ValueError, 'Stale native'):
            m.authenticated_point(self.root, self.sha, 10., 300.)
        # A fresh admission hash cannot authorize a pre-admission schema.
        legacy = self.root / 'results/bulk-admission-v2.json'
        sha = write(legacy, dict(qualifiedUnmagnetizedGrid=True, rows=[]))
        with self.assertRaisesRegex(ValueError, 'schema'):
            m.authenticated_point(self.root, sha, 10., 300.)

    def test_duplicate_global_channels_and_path_escape_rejected(self):
        power = self.root / 'duplicate.txt'
        text = (self.root / 'output/point-n1000/powerBalance.txt').read_text()
        power.write_text('Field = +1000 (eVm3/s)\n' + text)
        with self.assertRaisesRegex(ValueError, 'duplicate'): m.native_channels(power)
        with self.assertRaisesRegex(ValueError, 'escapes'): m.confined(self.root, '../outside')

    def test_signed_growth_and_internal_channels_are_not_added_to_heavy_heat(self):
        self.point['powers']['Excitation inelastic collisions'] = -5.
        self.point['powers']['Electron density growth'] = -1.
        report = m.assess(self.point, state())
        self.assertAlmostEqual(report['directElasticHeavyPowerWM3'] / m.QE, 80.)
        self.assertAlmostEqual(report['groupedSignedElectronPowerWM3']['densityGrowth'] / m.QE, -20.)

    def test_input_assumptions_bind_source_bytes_without_becoming_measurements(self):
        inputs = state()
        source = self.root / 'assumptions.txt'; source.write_text('Manufactured test inputs only.\n')
        names = ('neutralDensityM3', 'electronDensityM3', 'gasTemperatureK',
                 'electricFieldNeutralFrameVm', 'magneticFieldT', 'durationS')
        inputs['provenance'] = {name: dict(kind='assumption', citation='test fixture',
            path=source.name, sha256=m.digest(source)) for name in names}
        path = self.root / 'state.json'; sha = write(path, inputs)
        loaded = m.load_state(path, sha)
        self.assertTrue(all(value['kind'] == 'assumption' for value in loaded['provenance'].values()))
        source.write_text('Changed assumed neutral density.\n')
        with self.assertRaisesRegex(ValueError, 'Stale input source'): m.load_state(path, sha)

    def test_retained_upstream_points_preserve_failed_rates(self):
        root = Path(__file__).resolve().parents[1] / 'expert-v88/electrons'
        pin = '2be0967cabb083c2402161ca5a2f534b87fc1eff67580096a84ec64f33168d0a'
        for tg in (300, 1000):
            for td in (10, 30, 100, 300):
                with self.subTest(td=td, tg=tg):
                    point = m.authenticated_point(root, pin, td, tg)
                    self.assertEqual(point['row']['reducedFieldTd'], td)
                    self.assertEqual(len(point['powerGates']), 22)
                    self.assertEqual(point['ionizationGate']['passGate'], td in (100, 300))
                    self.assertEqual(len(point['nativeSources']), 6)


if __name__ == '__main__':
    unittest.main()
