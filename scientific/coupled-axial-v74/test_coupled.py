import unittest
import json
from pathlib import Path
import numpy as np
from bridge import Bridge
from coupled import Torsion, local_shear, mechanical, step
from thermal import Thermal
from independent_check import check_case


def electrical(r, z, magnetic=.2, shift=0., voltage=4.):
    nr, nz = len(r)-1, len(z)-1
    return dict(radialEdgesM=list(r), axialEdgesM=list(z), sigmaPerpSM=[.03]*(nr*nz),
                sigmaParallelSM=[.3]*(nr*nz), magneticT=magnetic,
                innerVoltageV=[None]*nz, outerVoltageV=[voltage+shift]*nz,
                lowerVoltageV=[shift]*nr, upperVoltageV=[shift]*nr)


class CouplingControls(unittest.TestCase):
    def test_study_import_uses_its_own_checker(self):
        import run_report
        self.assertEqual(run_report.check_case.__module__, 'independent_check')
        self.assertIn('coupled-axial-v74', run_report.check_case.__code__.co_filename)

    def test_study_never_relabels_a_nearby_timestep_as_requested_time(self):
        from run_report import trajectory
        with self.assertRaisesRegex(ValueError, 'physical output time'):
            trajectory({'timesS': [.001, .004]}, 6, 3)
        with self.assertRaisesRegex(ValueError, 'timestep count'):
            trajectory({'timesS': [.001, .004]}, 6, 0)

    def setUp(self):
        self.r = np.array([0., .01, .027, .06])
        self.z = np.array([0., .02, .075, .14])

    def test_nonuniform_half_resistance_heat(self):
        mu = np.geomspace(2e-5, 1e-4, 9)
        m = Torsion(self.r, self.z, .001, mu, outer=0., lower=0., upper=100.)
        out = m.step(np.linspace(100., 900., 9), np.zeros(9), .002)
        heat = local_shear(m, mu)
        self.assertAlmostEqual(sum(heat), out['shearHeatW'], delta=1e-13)
        self.assertTrue(np.all(heat >= 0))
        self.assertGreater(abs(out['boundaryPowerW']), 0.)
        # All boundaries of this test are mechanically no-slip, independent
        # of the thermal boundary; numerical loss is not part of local heat.
        self.assertGreater(out['numericalLossJ'], 0.)

    def test_stationary_braking_and_rigid_control(self):
        for walls in [dict(outer=None, lower=None, upper=None),
                      dict(outer=0., lower=0., upper=0.)]:
            with Bridge(electrical(self.r, self.z, magnetic=0., voltage=0.)) as b:
                out = mechanical(b, self.r, self.z, .001, 3e-5, [500.]*9, .002, walls)
            self.assertEqual(out['current']['jouleW'], 0.)
            self.assertEqual(out['boundaryPowerW'], 0.)
            if walls['outer'] is None:
                np.testing.assert_allclose(out['omegaRadS'], 500., rtol=1e-12)
                self.assertLess(sum(out['shearByCellW']), 1e-24)
            else:
                self.assertLess(max(out['omegaRadS']), 500.)
                self.assertGreater(sum(out['shearByCellW']), 0.)

    def test_b_zero_gauge_and_axial_feedback(self):
        w = np.linspace(100., 1100., 9)
        with Bridge(electrical(self.r, self.z, magnetic=0.)) as b:
            zero_b = b.current(w)
            np.testing.assert_array_equal(b.current(np.arange(9, dtype=np.int8))['torqueNm'], 0.)
        np.testing.assert_array_equal(zero_b['torqueNm'], 0.)
        self.assertGreater(zero_b['jouleW'], 0.)
        with Bridge(electrical(self.r, self.z)) as a, Bridge(electrical(self.r, self.z, shift=19.)) as b:
            x, y = a.current(w), b.current(w)
            np.testing.assert_allclose(x['torqueNm'], y['torqueNm'], rtol=1e-10, atol=1e-16)
            flat = np.tile(w.reshape(3, 3).mean(axis=0), 3)
            self.assertGreater(np.linalg.norm(np.array(x['torqueNm'])-a.current(flat)['torqueNm']), 1e-8)
            self.assertAlmostEqual(x['electrodePowerW'], x['jouleW']+x['mechanicalW'], delta=1e-11)

    def test_invalid_property_domain_and_step(self):
        with Bridge(electrical(self.r, self.z)) as b:
            with self.assertRaises(ValueError):
                b.props([299.]*9, [400.]*3)
            with self.assertRaises(ValueError):
                b.props([400.]*9, [1901.]*3)
            with self.assertRaises(ValueError):
                mechanical(b, self.r, self.z, .001, 3e-5, [500.]*9, -1., {})

    def test_closed_coupled_decay_and_scalar_initial_speed(self):
        with Bridge(electrical(self.r, self.z, magnetic=2., voltage=0.)) as b:
            m = Thermal(self.r, self.z, [.06, .061, .063], .001, b, contact_h=0., cooling_h=0.)
            out = step(m, b, 400., 900., .002, dict(outer=0., lower=0., upper=0.))
        self.assertGreater(out['deltaThermalJ'], 0.)
        self.assertLess(out['deltaKineticJ'], 0.)
        self.assertEqual(out['mechanical']['boundaryPowerW'], 0.)
        self.assertAlmostEqual(out['mechanical']['current']['electrodePowerW'], 0., delta=1e-15)
        self.assertLess(abs(out['totalEnergyResidualJ']), 1e-10)
        self.assertGreater(out['mechanical']['current']['jouleW'], 0.)
        self.assertGreater(out['mechanical']['numericalLossJ'], 0.)

    def test_weak_cell_torque_regression(self):
        case = json.loads((Path(__file__).parent/'failed-24-24-4-False-1.json').read_text())
        c = case['setup']
        with Bridge(c['electrical']) as b:
            m = Thermal(c['r'], c['z'], c['wall'], c['rho'], b,
                        contact_h=c['contactH'], cooling_h=c['coolingH'], bath_k=c['bathK'])
            case['result'] = step(m, b, case['oldTemperatureK'], case['oldOmegaRadS'], case['dtS'], c['walls'])
            case['props'] = m.properties(case['result']['temperatureK'])
        check_case(case)  # Same independent local gates that rejected the captured run.

    def test_fine_axis_cell_torque_precision_regression(self):
        case = json.loads((Path(__file__).parent/'failed-96-96-256-False-1.json').read_text())
        c = case['setup']
        with Bridge(c['electrical']) as b:
            m = Thermal(c['r'], c['z'], c['wall'], c['rho'], b,
                        contact_h=c['contactH'], cooling_h=c['coolingH'], bath_k=c['bathK'])
            case['result'] = step(m, b, case['oldTemperatureK'], case['oldOmegaRadS'], case['dtS'], c['walls'])
            case['props'] = m.properties(case['result']['temperatureK'])
        check_case(case)  # Retains the failed96 local tolerance, including storage roundoff.

    def test_captured_fine_thermal_plateau_passes_unchanged_independent_rows(self):
        witness = json.loads((Path(__file__).parent/'thermal-diagnostic-04.json').read_text())
        c = witness['setup']
        with Bridge(c['electrical']) as b:
            m = Thermal(c['r'], c['z'], c['wall'], c['rho'], b,
                        contact_h=c['contactH'], cooling_h=c['coolingH'], bath_k=c['bathK'])
            out = step(m, b, witness['oldTemperatureK'], witness['oldOmegaRadS'], witness['dtS'], c['walls'])
            case = dict(setup=c, oldTemperatureK=witness['oldTemperatureK'], oldOmegaRadS=witness['oldOmegaRadS'],
                        dtS=witness['dtS'], props=m.properties(out['temperatureK']),
                        oldProps=m.properties(witness['oldTemperatureK']), result=out)
        check_case(case)


if __name__ == '__main__':
    unittest.main()
