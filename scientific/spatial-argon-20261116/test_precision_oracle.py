from decimal import Decimal as D, localcontext
import unittest
from precision_oracle import advance


class OracleTests(unittest.TestCase):
    def test_rotating_two_cell_exact_flux(self):
        case = {'dtS': 1, 'diffusivityM2S': .125, 'radiusM': 1, 'speciesMassKg': 1.380649e-23}
        sample = {'temperatureK': [1, 1], 'omegaRadS': [1, 1]}
        with localcontext() as context:
            context.prec = 80
            z = D(1)/4
            b = z/(z.exp()-1)
            outward, inward = b+z, b
            mass, transfers = advance([D(1), D(0)], sample, case)
            expected = outward/(1+outward+inward)
            self.assertLess(abs(mass[1]-expected), D('1e-78'))
            self.assertLess(abs(mass[0]-(1-expected)), D('1e-78'))
            self.assertLess(abs(transfers[0]-expected), D('1e-78'))

    def test_two_cell_exact_backward_euler(self):
        case = {'dtS': 1, 'diffusivityM2S': .125, 'radiusM': 1, 'speciesMassKg': 1e-26}
        sample = {'temperatureK': [500, 500], 'omegaRadS': [0, 0]}
        with localcontext() as context:
            context.prec = 80
            mass, transfers = advance([D(1), D(0)], sample, case)
            self.assertLess(abs(mass[0]-D(2)/3), D('1e-78'))
            self.assertLess(abs(mass[1]-D(1)/3), D('1e-78'))
            self.assertLess(abs(transfers[0]-D(1)/3), D('1e-78'))

    def test_uniform_equilibrium_and_reference_precision(self):
        case = {'dtS': 1e-6/256, 'diffusivityM2S': .001, 'radiusM': .01, 'speciesMassKg': 6.63e-26}
        initial = [D(1)/8]*8
        sample = {'temperatureK': [1000]*8, 'omegaRadS': [0]*8}
        results = []
        for precision in [80, 100]:
            with localcontext() as context:
                context.prec = precision
                uniform, transfers = advance(initial, sample, case)
                self.assertLess(max(abs(a-b) for a, b in zip(uniform, initial)), D('1e-78'))
                self.assertLess(max(map(abs, transfers)), D('1e-78'))
                weak = {'temperatureK': [1000+i*1e-6 for i in range(8)], 'omegaRadS': [1e-3]*8}
                results.append(advance(initial, weak, case))
                self.assertLess(abs(sum(results[-1][0])-1), D('1e-78'))
                self.assertTrue(all(value > 0 for value in results[-1][0]))
        with localcontext() as context:
            context.prec = 100
            self.assertLess(max(abs(a-b) for a, b in zip(results[0][0], results[1][0])), D('1e-70'))


if __name__ == '__main__':
    unittest.main()
