"""Conserved restriction, common-state domain and signed decomposition controls."""
import unittest
import numpy as np
from force105 import SourceFlow
from heat106 import FVDiffusion
from electro86 import Electro
import source_commutator107 as diagnostic

M_AR = 39.948*1.66053906660e-27


class CommutatorControls(unittest.TestCase):
    def setUp(self):
        self.coarse = SourceFlow([0., .02, .06], [0., .08, .24], [M_AR]*2, noSlipWalls=True)
        self.fine = SourceFlow([0., .01, .02, .04, .06], [0., .08, .24], [M_AR]*2, noSlipWalls=True)

    def test_extensive_children_inventory_and_geometry(self):
        values = np.arange(1., 49.).reshape(6, 2, 4)
        expected = np.array([[[3., 7.], [11., 15.]]])+16*np.arange(6)[:, None, None]
        actual = diagnostic.restrict(self.coarse, self.fine, values)
        np.testing.assert_array_equal(actual, expected)
        np.testing.assert_array_equal(actual.sum(axis=(1, 2)), values.sum(axis=(1, 2)))
        np.testing.assert_array_equal(diagnostic.restrict(self.fine, self.fine, values), values)
        self.fine.z[-1] = .25
        with self.assertRaises(ValueError): diagnostic.restrict(self.coarse, self.fine, values)

    def test_uniform_primitive_state_and_rigid_swirl(self):
        qf = self.fine.state(.001, 3000., .5, 3000., 3., 4.)
        before = qf.copy(); collapsed, receipt = diagnostic.common_input(self.coarse, self.fine, qf)
        expected = self.coarse.state(.001, 3000., .5, 3000., 3., 4.)
        np.testing.assert_allclose(collapsed, expected, rtol=2e-15, atol=0.)
        np.testing.assert_array_equal(qf, before)
        np.testing.assert_allclose(self.coarse.primitive(collapsed)['temperatureK'], 3000., rtol=2e-15)
        energy_scale = expected[4].sum()
        self.assertLess(abs(receipt['thermalChangeJ'])/energy_scale, 2e-15)
        self.assertLess(abs(receipt['kineticChangeJ'])/energy_scale, 2e-15)

    def test_nonpositive_collapsed_thermal_is_not_repaired(self):
        density = np.array([[1e-9, 1e-9, 1e-9, 1.], [1e-9, 1e-9, 1e-9, 1.]])
        qf = self.fine.state(density, 1., .5, 1e6)
        before = qf.copy()
        with self.assertRaises(ValueError): diagnostic.common_input(self.coarse, self.fine, qf)
        np.testing.assert_array_equal(qf, before)

    def test_signed_algebra_and_equal_level_identity(self):
        a = np.arange(-12., 12.).reshape(6, 2, 2)
        b, c = 3*a-2, -2*a+5
        terms = diagnostic.decomposition(a, b, c)
        np.testing.assert_array_equal(terms['total'], terms['archivedInputDifference']+terms['restrictionCommutator'])
        self.assertLess(terms['restrictionCommutator'][0].sum(), 0.)
        for value in diagnostic.decomposition(a, a, a).values():
            np.testing.assert_array_equal(value, 0.)

    def test_actual_sources_preserve_incoming_native_inventories(self):
        f = self.fine; q = f.state(.001, 3000., .5, 2000., 20., -3.)
        operators = [('electromagnetic', Electro(f, 100., 30., 2000., .1, 10.)),
                     ('stressHeat', FVDiffusion(f, 1.14e-4))]
        for kind, operator in operators:
            for h in diagnostic.STEPS:
                before = q.copy(); rate, receipt = diagnostic.source_step(f, operator, q, h, kind)
                np.testing.assert_array_equal(q, before)
                np.testing.assert_array_equal(rate[[0, 5]], 0.)
                self.assertTrue(receipt['nativeInvariantsBitwisePreserved'])
                self.assertIn('energyResidualJ', receipt['nativeScalarReceipt'])

    def test_regional_constant_density_and_global_cancellation(self):
        f = self.fine; constants = np.arange(1., 7.)
        rates = constants[:, None, None]*f.volume
        result = diagnostic.regions(f, rates)
        for region in result.values():
            for field, constant in zip(region['fields'].values(), constants):
                self.assertAlmostEqual(field['mean'], constant)
                self.assertAlmostEqual(field['signedIntegral']/region['volumeM3'], constant)
        rates *= np.array([[1.], [-.5]])
        self.assertLess(abs(rates[0].sum())/abs(rates[0]).sum(), 1e-15)
        regional = diagnostic.regions(f, rates)
        self.assertAlmostEqual(regional['domain']['fields']['massKgSPerM3']['mean'], 0.)
        self.assertAlmostEqual(regional['endwall']['fields']['massKgSPerM3']['mean'], -.5)
        self.assertAlmostEqual(regional['densityRing']['fields']['massKgSPerM3']['mean'], -.5)

    def test_staged_actual_equal_level_commutator_and_input_pin(self):
        f = self.fine; q = f.state(.001, 3000., .5, 2000., 20., -3.)
        d, e = FVDiffusion(f, 1.14e-4), Electro(f, 100., 30., 2000., .1, 10.)
        p = {key: value.tolist() for key, value in f.primitive(q).items()}
        state = dict(radialEdgesM=f.r.tolist(), axialEdgesM=f.z.tolist(),
            snapshots=[dict(timeS=t, q=q.tolist(), **p) for t in diagnostic.TIMES])
        cache = diagnostic.freeze_sources(f, d, e, state)
        result = diagnostic.diagnose(f, d, e, state, f, state, cache)
        for row in result['snapshots']:
            for term in row['terms'].values():
                self.assertTrue(all(value['maximumAbsolutePerVolume'] == 0. for value in term.values()))
        cache[0., 'electromagnetic', diagnostic.STEPS[0]][1]['inputSHA256'] = '0'*64
        with self.assertRaises(ValueError): diagnostic.diagnose(f, d, e, state, f, state, cache)


if __name__ == '__main__': unittest.main()
