import unittest
from axis_calibration import tick_value


class AxisRegressionTests(unittest.TestCase):
    def test_temperature_tick_is_below_frame(self):
        ticks = [(495.8789978, 15000), (521.5352173, 7500), (547.1914673, 0)]
        self.assertAlmostEqual(tick_value(521.5352173, ticks), 7500, delta=.01)
        self.assertAlmostEqual(tick_value(495.8789978, ticks), 15000)
        self.assertAlmostEqual(tick_value(494.16818, ticks), 15500.1, delta=.2)
        self.assertGreater(tick_value(518.5269165, ticks), 8300)

    def test_reversed_or_nonuniform_ticks_rejected(self):
        with self.assertRaises(ValueError):
            tick_value(1, [(0, 0), (1, 2), (2, 1)])
        with self.assertRaises(ValueError):
            tick_value(1, [(0, 0), (0, 1)])
