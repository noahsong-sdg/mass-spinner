"""Independent unit/geometry controls for the supplemental energy report."""
import unittest
import numpy as np
from energy102 import analyze, frame_metrics, receipt_totals, validate_packet, KB, M_AR, STEP_HEAT, INITIALIZER


class EnergyControls(unittest.TestCase):
    def state(self):
        r, z = np.array([0., 1., 2.]), np.array([0., 1., 3.])
        volume = np.pi*np.diff(z)[:, None]*np.diff(r*r)[None, :]
        mass = np.array([[1., 1.], [1., 9.]])*M_AR
        temperature = np.array([[100., 200.], [300., 20000.]])
        ur, uz, omega = 2., -3., 4.
        inertia = mass*(r[:-1]**2+r[1:]**2)/2
        kinetic = .5*mass*(ur*ur+uz*uz)+.5*inertia*omega*omega
        thermal = 1.5*KB*mass/M_AR*temperature
        q = np.array([mass, mass*ur, mass*uz, inertia*omega, thermal+kinetic, .5*mass])
        frame = dict(timeS=0., q=q.tolist(), temperatureK=temperature.tolist())
        return dict(radialEdgesM=r.tolist(), axialEdgesM=z.tolist(), snapshots=[frame], history=[]), volume

    def test_cumulative_work_and_incremental_joules_are_not_summed_or_dt_weighted_alike(self):
        history = [dict(timeS=1., dtS=1., electricalWorkJ=11., ohmicJ=2.,
                        emNumericalHeatJ=.1, viscousHeatJ=3., viscousNumericalHeatJ=.2),
                   dict(timeS=3., dtS=2., electricalWorkJ=29., ohmicJ=5.,
                        emNumericalHeatJ=.4, viscousHeatJ=7., viscousNumericalHeatJ=.5)]
        self.assertEqual(receipt_totals(history, 0.), dict.fromkeys((*STEP_HEAT, 'externalElectricalWorkJ'), 0.))
        at_first = receipt_totals(history, 1.)
        self.assertEqual(at_first['externalElectricalWorkJ'], 11.)
        final = receipt_totals(history, 3.)
        self.assertEqual(final['externalElectricalWorkJ'], 29.)
        self.assertEqual(final['ohmicJ'], 7.)
        self.assertEqual(final['viscousHeatJ'], 10.)
        self.assertEqual(final['emNumericalHeatJ'], .5)
        self.assertAlmostEqual(final['viscousNumericalHeatJ'], .7)
        with self.assertRaisesRegex(ValueError, 'retained accepted clock'):
            receipt_totals(history, 2.)
        with self.assertRaises(ValueError):
            receipt_totals(history[::-1], 3.)
        with self.assertRaisesRegex(ValueError, 'complete history'):
            receipt_totals(history[1:], 3.)

    def test_initializer_admission_rejects_missing_or_other_species_identity(self):
        packet = dict(mesh='smooth-source-aligned', manifest=dict(sourceDOI='10.1515/zna-1979-0602'),
                      sourceSHA256={'scientific/coupled-v99/campaign99.py': INITIALIZER})
        validate_packet(packet)
        packet['sourceSHA256']['scientific/coupled-v99/campaign99.py'] = 'other-species-initializer'
        with self.assertRaisesRegex(ValueError, 'initializer identity'):
            validate_packet(packet)
        del packet['sourceSHA256']
        with self.assertRaisesRegex(ValueError, 'initializer identity'):
            validate_packet(packet)

    def test_stale_temperature_shape_and_invalid_species_are_rejected(self):
        state, _ = self.state()
        frame = state['snapshots'][0]
        original = frame['temperatureK']
        frame['temperatureK'] = original[0]
        with self.assertRaisesRegex(ValueError, 'finite cell shape'):
            frame_metrics(frame, state, (84., 10000.))
        frame['temperatureK'] = original
        frame['q'][5][0][0] = 2*frame['q'][0][0][0]
        with self.assertRaisesRegex(ValueError, 'species masses'):
            frame_metrics(frame, state, (84., 10000.))

    def test_cylindrical_hotspot_does_not_replace_bulk_temperature(self):
        state, volume = self.state()
        frame = state['snapshots'][0]
        result = frame_metrics(frame, state, (84., 10000.))
        expected_mass = (100.+200.+300.+9*20000.)/12
        expected_volume = (100.+3*200.+2*300.+6*20000.)/12
        self.assertAlmostEqual(result['massWeightedTemperatureK'], expected_mass, places=10)
        self.assertAlmostEqual(result['volumeWeightedTemperatureK'], expected_volume, places=10)
        self.assertAlmostEqual(result['massFractionAboveCorrelationRange'], .75)
        self.assertEqual(result['massFractionBelowCorrelationRange'], 0.)
        self.assertAlmostEqual(result['maximumTemperatureK'], 20000., places=10)
        self.assertAlmostEqual(result['maximumTemperatureLocationM']['r'], 14/9)
        self.assertEqual(result['maximumTemperatureLocationM']['z'], 2.)
        q = np.asarray(frame['q'])
        np.testing.assert_allclose(result['totalEnergyJ'], result['thermalEnergyJ']+result['kineticEnergyJ'])
        self.assertLess(result['savedTemperatureMaximumDifferenceK'], 1e-10)
        frame['q'][4][0][0] = -1.
        with self.assertRaisesRegex(ValueError, 'thermal energy'):
            frame_metrics(frame, state, (84., 10000.))

    def test_remainder_is_not_misidentified_as_missing_external_power(self):
        state, _ = self.state()
        q = np.asarray(state['snapshots'][0]['q'])
        increment = 4e-20
        q[4] += increment/4
        temperature = np.asarray(state['snapshots'][0]['temperatureK'])+increment/4/(1.5*KB*q[0]/M_AR)
        state['snapshots'].append(dict(timeS=2., q=q.tolist(), temperatureK=temperature.tolist()))
        state['history'] = [dict(timeS=2., dtS=2., electricalWorkJ=increment,
            ohmicJ=increment/4, emNumericalHeatJ=0., viscousHeatJ=0., viscousNumericalHeatJ=0.)]
        rows = analyze(state, dict(branchCurrentA=2.), dict(electronTemperatureEV=1.), (84., 10000.))
        self.assertIsNone(rows[0]['inferredMeanTerminalVoltageV'])
        self.assertAlmostEqual(rows[-1]['globalEnergyBalanceResidualJ']/increment, 0., places=10)
        self.assertAlmostEqual(rows[-1]['remainingThermalChangeJ']/increment, .75, places=10)
        self.assertEqual(rows[-1]['inferredMeanTerminalVoltageV'], increment/4)


if __name__ == '__main__':
    unittest.main()
