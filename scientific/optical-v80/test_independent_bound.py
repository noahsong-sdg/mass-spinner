"""Analytic controls for the independent necessary optical-center bounds."""
import unittest

from independent_bound import center_hull, minimum_relative_disagreement


class BoundControls(unittest.TestCase):
    def fixture(self, omega):
        import math
        m = dict(radiusM=.06, cathodeRadiusM=.004)
        edges = [i*.004/4 for i in range(4)]+[.004+i*.056/28 for i in range(29)]
        r = [math.sqrt((a*a+b*b)/2) for a,b in zip(edges, edges[1:])]
        case = dict(refinement=1, prediction=dict(radialCentersM=r,
                    localMidplaneVelocityMS=[x*omega for x in r]))
        return m, case

    def test_rigid_rotation_upper_bound_is_omega_times_largest_impact(self):
        m, c = self.fixture(10000.)
        low, high = center_hull(c,m,[.01,.02])
        self.assertEqual(low, 0.)
        self.assertAlmostEqual(high, 200.)

    def test_signed_rotation_lower_bound_is_omega_times_largest_impact(self):
        m, c = self.fixture(-10000.)
        low, high = center_hull(c,m,[.01,.02])
        self.assertAlmostEqual(low, -200.)
        self.assertEqual(high, 0.)

    def test_only_intersected_annuli_can_enlarge_hull(self):
        m, c = self.fixture(10000.)
        c['prediction']['localMidplaneVelocityMS'][0] = 1e7
        low, high = center_hull(c,m,[.01,.02])
        self.assertEqual(low, 0.)
        self.assertAlmostEqual(high, 200.)
        self.assertGreater(center_hull(c,m,[0.,.002])[1], 1000.)

    def test_signal_and_falsification_threshold(self):
        self.assertEqual(minimum_relative_disagreement([0.,60.],[100.,120.]), .4)
        self.assertEqual(minimum_relative_disagreement([90.,110.],[100.,120.]), 0.)
        self.assertGreater(minimum_relative_disagreement([-100.,-80.],[100.,120.]), 1.)
        with self.assertRaises(ValueError):
            minimum_relative_disagreement([0.,100.],[0.,120.])

    def test_domain_rejects_nonintersecting_or_reversed_range(self):
        m, c = self.fixture(10000.)
        for impact in ([.06,.06],[-.01,.02],[.02,.01]):
            with self.assertRaises(ValueError):
                center_hull(c,m,impact)


if __name__ == '__main__':
    unittest.main()
