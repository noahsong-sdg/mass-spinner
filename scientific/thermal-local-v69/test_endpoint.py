"""The new local gate must reject resolved errors and unresolved references."""
import unittest
from assess import endpoint_gas


class EndpointGateTests(unittest.TestCase):
    def evaluate(self, fine, coarse):
        b = {'t': fine, 'times': [float(i) for i in range(len(fine))]}
        a = {'t': [fine[0], coarse], 'times': [0., b['times'][-1]]}
        return endpoint_gas(a, b)

    def test_reversal_uses_causal_excursion(self):
        report = self.evaluate([[1000., 1000.], [1000.1, 999.9], [1000.2, 1000.001]], [1000.2, 1000.0015])
        self.assertTrue(report['qualified'])
        self.assertAlmostEqual(report['cells'][1]['relativeError'], .005, places=8)

    def test_resolved_error_rejects(self):
        report = self.evaluate([[1000., 1000.], [1001., 1001.]], [1001., 1001.02])
        self.assertFalse(report['qualified'])
        self.assertFalse(report['allResolvedEndpointGatesPassed'])

    def test_zero_signal_and_missing_reversal_never_qualify(self):
        for fine in ([[1000., 1000.], [1000., 1000.]], [[1000.], [1001.]]):
            with self.subTest(fine=fine):
                report = self.evaluate(fine, fine[-1])
                self.assertFalse(report['qualified'])
                self.assertFalse(report['knownReversalCellResolved'])


if __name__ == '__main__':
    unittest.main()
