"""Analytic controls and independent continuous LOS quadrature; safe-dev only."""
import math
import unittest

from chord import KB, chord_moments

MASS = 39.948*1.66053906892e-27


def continuous_reference(impact, samples=100000):
    """Independent y-midpoint integration of a smooth synthetic cylinder.

    No annular path-length formula or chord_moments calls. The centered second
    pass separates flow broadening from local Maxwellian thermal broadening.
    """
    half = math.sqrt(1-impact**2)
    weights, speeds, thermal = [], [], []
    for j in range(samples):
        y = -half+(j+.5)*2*half/samples
        radius = math.hypot(impact, y)
        weights.append(1+radius)
        speeds.append(impact*2000*(1-radius**2))
        thermal.append(KB*(400+200*radius**2)/MASS)
    total = math.fsum(weights)
    mean = math.fsum(w*u for w, u in zip(weights, speeds))/total
    thermal_var = math.fsum(w*t for w, t in zip(weights, thermal))/total
    shear_var = math.fsum(w*(u-mean)**2 for w, u in zip(weights, speeds))/total
    return (total*2*half/samples, mean, thermal_var, shear_var)


def smooth_cells(count, impact):
    edges = [i/count for i in range(count+1)]
    centers = [(a+b)/2 for a, b in zip(edges, edges[1:])]
    return chord_moments(edges, [2000*(1-r*r) for r in centers],
                         [400+200*r*r for r in centers],
                         [1+r for r in centers], impact, MASS)


class ChordTests(unittest.TestCase):
    def test_rigid_rotation_arbitrary_emissivity_has_no_shear(self):
        for b in (0, -.7, .7, .999):
            m = chord_moments([0, .3, .8, 1], [2000]*3, [650]*3, [1, 7, .2], b, MASS)
            self.assertAlmostEqual(m.centroid_m_s, 2000*b)
            self.assertLess(m.shear_variance_m2_s2, 1e-20)
            self.assertAlmostEqual(m.moment_temperature_k, 650)

    def test_nonemitting_and_tangent_chords_are_unavailable(self):
        for b in (1, -1, 2):
            self.assertIsNone(chord_moments([0, 1], [1], [300], [1], b, MASS))
        self.assertIsNone(chord_moments([0, 1], [1], [300], [0], 0, MASS))

    def test_annular_hole_path_and_signed_symmetry(self):
        plus = chord_moments([.5, 1], [2], [500], [3], .2, MASS)
        minus = chord_moments([.5, 1], [2], [500], [3], -.2, MASS)
        self.assertAlmostEqual(plus.brightness, 6*(math.sqrt(.96)-math.sqrt(.21)))
        self.assertEqual(plus.centroid_m_s, -minus.centroid_m_s)
        self.assertEqual(plus.observed_variance_m2_s2, minus.observed_variance_m2_s2)

    def test_shear_is_not_local_temperature(self):
        # At b=.5, these annuli each have path length 1; u=0 and 1000 m/s.
        middle = math.sqrt(.5)
        m = chord_moments([0, middle, math.sqrt(1.25)], [0, 2000],
                          [500, 500], [1, 1], .5, MASS)
        self.assertAlmostEqual(m.centroid_m_s, 500)
        self.assertAlmostEqual(m.shear_variance_m2_s2, 250000)
        self.assertAlmostEqual(m.thermal_variance_m2_s2, KB*500/MASS)
        self.assertAlmostEqual(m.moment_temperature_k, 500+MASS*250000/KB)

    def test_instrument_variance_and_bulk_boost(self):
        args = ([0, .7, 1], [100, 2000], [500, 800], [1, 4], .3, MASS)
        first = chord_moments(*args)
        second = chord_moments(*args, instrument_variance_m2_s2=2500, bulk_los_m_s=1e6)
        self.assertEqual(first.shear_variance_m2_s2, second.shear_variance_m2_s2)
        self.assertAlmostEqual(second.centroid_m_s-1e6, first.centroid_m_s, places=6)
        self.assertAlmostEqual(second.observed_variance_m2_s2-first.observed_variance_m2_s2, 2500)

    def test_emissivity_scaling_preserves_normalized_moments(self):
        args = ([0, .7, 1], [100, 2000], [500, 800])
        a = chord_moments(*args, [1, 4], .3, MASS)
        b = chord_moments(*args, [7, 28], .3, MASS)
        self.assertAlmostEqual(b.brightness, 7*a.brightness)
        self.assertAlmostEqual(a.centroid_m_s, b.centroid_m_s)
        self.assertAlmostEqual(a.observed_variance_m2_s2, b.observed_variance_m2_s2)

    def test_central_chord_has_no_pure_rotation_broadening(self):
        m = chord_moments([0, .5, 1], [100, -2000], [400, 800], [1, 1], 0, MASS)
        self.assertEqual(m.centroid_m_s, 0)
        self.assertEqual(m.shear_variance_m2_s2, 0)
        self.assertAlmostEqual(m.moment_temperature_k, 600)

    def test_emitter_mass_scales_thermal_width_not_temperature(self):
        args = ([0, 1], [0], [600], [1], .3)
        light = chord_moments(*args, MASS)
        heavy = chord_moments(*args, 2*MASS)
        self.assertAlmostEqual(light.thermal_variance_m2_s2, 2*heavy.thermal_variance_m2_s2)
        self.assertAlmostEqual(light.moment_temperature_k, 600)
        self.assertAlmostEqual(heavy.moment_temperature_k, 600)

    def test_thin_annulus_retains_positive_brightness(self):
        m = chord_moments([1, 1+1e-12], [1], [300], [1], .5, MASS)
        self.assertGreater(m.brightness, 0)
        self.assertAlmostEqual(m.moment_temperature_k, 300)

    def test_invalid_physical_inputs(self):
        valid = [[0, 1], [1], [300], [1], .1, MASS]
        for index, bad in ((0, [0, 0]), (0, [-1, 1]), (1, [math.nan]),
                           (2, [0]), (3, [-1]), (4, math.inf), (5, 0), (1, [])):
            args = valid.copy()
            args[index] = bad
            with self.assertRaises(ValueError):
                chord_moments(*args)
        with self.assertRaises(ValueError):
            chord_moments(*valid, instrument_variance_m2_s2=-1)

    def test_joint_profile_refinement_against_independent_quadrature(self):
        for impact in (.17, .43, .81):
            coarse_ref = continuous_reference(impact, 25000)
            reference = continuous_reference(impact, 100000)
            for a, b in zip(coarse_ref, reference):
                self.assertLess(abs(a-b)/abs(b), 1e-7)
            errors = []
            for count in (32, 128, 512, 2048):
                result = smooth_cells(count, impact)
                values = (result.brightness, result.centroid_m_s,
                          result.thermal_variance_m2_s2, result.shear_variance_m2_s2)
                errors.append(max(abs(a-b)/abs(b) for a, b in zip(values, reference)))
            for coarse, fine in zip(errors, errors[1:]):
                self.assertLess(fine, coarse)
            self.assertLess(errors[-1], 5e-4)


if __name__ == '__main__':
    unittest.main()
