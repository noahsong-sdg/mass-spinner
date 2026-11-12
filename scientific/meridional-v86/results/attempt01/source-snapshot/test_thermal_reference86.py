"""Analytic and acceptance-control tests for the frozen thermal reference."""
import copy
import unittest
import numpy as np
from scipy.integrate import quad
from scipy.special import j0, j1, jn_zeros
from thermal_reference86 import (GRIDS, STEPS, TIME_STEPS, RADIUS, HEIGHT,
                                 mode_averages, parameters, assessment, metrics)


class ThermalReferenceControls(unittest.TestCase):
    def test_cell_average_matches_independent_quadrature_and_zero_mean(self):
        r = np.linspace(0, RADIUS, 9); z = np.linspace(0, HEIGHT, 12)
        mode = mode_averages(r, z)
        root = float(jn_zeros(1, 1)[0])
        for j, i in ((0, 0), (3, 4), (10, 7)):
            radial = quad(lambda x:x*j0(root*x/RADIUS), r[i], r[i+1], epsabs=1e-14)[0]
            axial = quad(lambda x:np.cos(np.pi*x/HEIGHT), z[j], z[j+1], epsabs=1e-14)[0]
            expected = 2*radial*axial/(np.diff(r*r)[i]*np.diff(z)[j])
            self.assertAlmostEqual(mode[j, i], expected, places=12)
        volume = np.diff(z)[:, None]*np.pi*np.diff(r*r)[None, :]
        self.assertLess(abs(np.sum(mode*volume)), 1e-18)
        self.assertLess(abs(j1(root)), 1e-14)

    def test_metrics_separate_spatial_and_backward_euler_time_error(self):
        r = np.linspace(0, RADIUS, 5); z = np.linspace(0, HEIGHT, 7)
        mode = mode_averages(r, z)
        _, alpha, eigenvalue, duration, dt = parameters(STEPS)
        be = (1+alpha*eigenvalue*dt)**(-STEPS)
        values = 2900+100*be*mode
        volume = np.diff(z)[:, None]*np.pi*np.diff(r*r)[None, :]
        result = metrics(values, 2900+100*mode, mode, volume, STEPS)
        self.assertEqual(result['spatialMaxOverAmplitude'], 0.)
        self.assertGreater(result['finiteTimeMaxOverAmplitude'], 0.)
        self.assertLess(result['energyRelative'], 1e-14)
        self.assertAlmostEqual(alpha*eigenvalue*duration, .1)

    def packet(self):
        def row(n, steps):
            code = dict(spatialMaxOverAmplitude=.1/n**2, energyRelative=1e-15,
                        temperatureK=[[2900., 2901.]])
            return dict(cellsPerCoordinate=n, steps=steps,
                        hybrid=copy.deepcopy(code), fipy=copy.deepcopy(code),
                        crossCodeMaxOverAmplitude=.001)
        return [row(n, STEPS) for n in GRIDS], row(GRIDS[-1], TIME_STEPS)

    def test_frozen_assessment_rejects_corruption_and_changed_inventory(self):
        rows, witness = self.packet()
        self.assertTrue(all(assessment(rows, witness).values()))
        bad = copy.deepcopy(rows); bad[-1]['hybrid']['spatialMaxOverAmplitude'] = .02
        self.assertFalse(assessment(bad, witness)['hybridSpatial'])
        bad = copy.deepcopy(rows); bad[-1]['fipy']['energyRelative'] = 1e-6
        self.assertFalse(assessment(bad, witness)['fipyEnergy'])
        bad = copy.deepcopy(rows); bad[-1]['cellsPerCoordinate'] = 128
        with self.assertRaises(ValueError): assessment(bad, witness)

    def test_domain_boundaries(self):
        for steps in (0, -1, True, 1.5):
            with self.assertRaises(ValueError): parameters(steps)


if __name__ == '__main__':
    unittest.main()
