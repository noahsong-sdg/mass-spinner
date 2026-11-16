import copy
import json
from pathlib import Path
import unittest
import numpy as np
from study import extract_pressure, pressure_ratios


class PressureClosureTests(unittest.TestCase):
    def test_zero_rotation_and_normalization(self):
        np.testing.assert_array_equal(pressure_ratios([.01, .06], [0, 0], [400, 400], [.02, .05]), [1, 1])

    def test_rigid_isothermal_exact_pressure_ratio(self):
        r = np.linspace(.01, .06, 101); omega, t = 12000, 1800
        q = np.array([.02, .03, .05])
        expected = np.exp(6.6335209e-26*omega**2*(q**2-q[-1]**2)/(2*1.380649e-23*t))
        np.testing.assert_allclose(pressure_ratios(r, omega*r, r*0+t, q), expected, rtol=1e-12)

    def test_unsupported_radius_and_invalid_temperature_rejected(self):
        for r, t, q in [([.01,.06],[400,0],[.02,.05]), ([.06,.01],[400,400],[.02]),
                         ([.01,.06],[400,400],[.005]), ([.01,.06],[400,400],[np.nan])]:
            with self.assertRaises(ValueError):
                pressure_ratios(r, [100,200], t, q)

    def test_extracts_all_admitted_pressure_points_with_unknown_errors(self):
        data = json.loads((Path(__file__).parent/'observations.json').read_text())
        points = extract_pressure(data)
        self.assertEqual(len(points), len(data['pressure']['markers']))
        self.assertTrue(all(p['extractionRangeTorr'][0] <= p['pressureTorr'] <= p['extractionRangeTorr'][1] for p in points))
        for edit in [lambda d: d['pressure'].update(experimentalUncertainty=0),
                     lambda d: d['pressure']['markers'][-1].update(centerPx=[1500,608]),
                     lambda d: d['pressure']['markers'][-1].update(id='p01')]:
            changed = copy.deepcopy(data); edit(changed)
            with self.assertRaises(ValueError): extract_pressure(changed)


if __name__ == '__main__': unittest.main()
