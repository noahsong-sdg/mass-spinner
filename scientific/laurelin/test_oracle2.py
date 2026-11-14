"""Independent oracle controls; execute in science safe-dev guest only."""
import math
import json
from pathlib import Path
import unittest

import numpy as np

from oracle2 import assess, reference, reactivity

BASE = dict(densityM3=1e22, temperatureKeV=1., speedKmS=200., compression=8., durationUs=200.,
            confinementUs=500., driverEfficiency=.8, recoveryEfficiency=.8, frequencyHz=1.,
            parasiticKW=10., radiusM=.22, lengthM=1.4)


class OracleControls(unittest.TestCase):
    def test_published_rounded_branch_anchor_and_domain(self):
        self.assertAlmostEqual(reactivity(10., 'neutron')/6.02e-25, 1., delta=.005)
        self.assertAlmostEqual(reactivity(10., 'proton')/5.78e-25, 1., delta=.005)
        self.assertIsNone(reactivity(.1999, 'neutron'))
        self.assertIsNone(reactivity(100.001, 'proton'))

    def test_constant_volume_analytic_decay_and_loss(self):
        ref = reference(dict(BASE, compression=1., speedKmS=0.))
        f = np.linspace(0., 1., 41)
        actual = ref['evaluate'](f)['temperatureKeV']
        np.testing.assert_allclose(actual, np.exp(-.4*f), rtol=2e-10, atol=1e-13)
        totals = ref['totals']
        self.assertEqual(totals['compressionJ'], 0.)
        self.assertEqual(totals['expansionJ'], 0.)
        self.assertAlmostEqual((totals['lossJ']+totals['remainingJ'])/totals['initialJ'], 1., delta=2e-10)

    def test_exact_zero_log_temperature_gradient_in_compression(self):
        ref = reference(dict(BASE, speedKmS=0., compression=math.exp(.144)))
        temperature = ref['evaluate'](np.linspace(.32, .56, 31))['temperatureKeV']
        np.testing.assert_allclose(temperature, np.full(31, math.exp(-.128)), rtol=2e-10)

    def test_global_thermal_ledger_and_null_fusion_electricity_scope(self):
        totals = reference(BASE)['totals']
        residual = totals['initialJ']+totals['mergeJ']+totals['compressionJ']-totals['expansionJ']-totals['lossJ']-totals['remainingJ']
        self.assertLess(abs(residual)/totals['initialJ'], 2e-10)
        self.assertLess(totals['netNonfusionJ'], 0.)

    def test_endpoint_crossing_is_not_masked_by_in_range_midpoint(self):
        ref = reference(dict(BASE, temperatureKeV=.5, compression=1., speedKmS=0., confinementUs=600., durationUs=550.))
        self.assertGreater(.5*math.exp(-549.45/600), .2)
        self.assertLess(ref['minimumTemperatureKeV'], .2)
        self.assertFalse(ref['supported'])
        self.assertFalse(ref['diagnosticValid'])
        self.assertIsNone(ref['totals']['neutrons'])

    def test_real_assessment_strict_json_serialization(self):
        ref = reference(BASE)
        fractions = [0., .12, .32, .56, .76, 1.]
        fields = ref['evaluate'](fractions)
        samples = [dict(fraction=f, **{key: float(value[i]) for key, value in fields.items()})
                   for i, f in enumerate(fractions)]
        result = {key: float(value) if value is not None else None
                  for key, value in ref['totals'].items()}
        result.update(config=BASE, samples=samples, diagnosticValid=ref['diagnosticValid'],
                      fusionElectricityJ=None)
        gates = json.loads(Path(__file__).with_name('oracle2-cases.json').read_text())['gates']
        assessment = assess(dict(name='serialization-control', steps=500, result=result), gates)
        self.assertTrue(assessment['passed'])
        self.assertTrue(json.loads(json.dumps(assessment, allow_nan=False))['passed'])
        self.assertTrue(all(type(value) is bool for value in assessment['checks'].values()))


if __name__ == '__main__':
    unittest.main()
