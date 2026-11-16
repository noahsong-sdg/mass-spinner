"""Independent Decimal BE oracle for supplied binary64 linear heat coefficients.

Execute only in bounded offline CI. This tests coefficient-frozen arithmetic,
not coefficient assembly, nonlinear tungsten, continuum error or applicability.
"""
import argparse
from decimal import Decimal as D, localcontext
import hashlib
import json
import math
from pathlib import Path


def lift(value):
    if type(value) not in (int, float) or not math.isfinite(float(value)):
        raise ValueError('Finite binary64 numbers required')
    return D.from_float(float(value))


def vector(value, length):
    if not isinstance(value, list) or len(value) != length:
        raise ValueError(f'Expected {length} coefficients/values')
    return list(map(lift, value))


def solve(case, precision):
    with localcontext() as context:
        context.prec = precision
        n = case['n']
        if type(n) is not int or not 2 <= n <= 4096:
            raise ValueError('Need 2–4096 heat cells')
        capacity = vector(case['capacityJK'], n)
        conductance = vector(case['conductanceWK'], n - 1)
        old = vector(case['oldEnergyJ'], n)
        rhs = vector(case['sourceJ'], n)
        dt = lift(case['dtS'])
        if min(capacity) <= 0 or min(old) <= 0 or min(conductance) < 0 or dt < 0:
            raise ValueError('Positive capacity/energy and nonnegative conductance/time required')
        # Keep the actual stored U/C baseline; backgroundK is only a label.
        temperature = [u / c for u, c in zip(old, capacity)]
        links = [dt * g for g in conductance]
        diagonal = list(capacity)
        for i, link in enumerate(links):
            diagonal[i] += link
            diagonal[i + 1] += link
            forcing = link * (temperature[i + 1] - temperature[i])
            rhs[i] += forcing
            rhs[i + 1] -= forcing
        for i in range(1, n):
            factor = -links[i - 1] / diagonal[i - 1]
            diagonal[i] += factor * links[i - 1]
            rhs[i] -= factor * rhs[i - 1]
        increment = [D(0)] * n
        increment[-1] = rhs[-1] / diagonal[-1]
        for i in range(n - 2, -1, -1):
            increment[i] = (rhs[i] + links[i] * increment[i + 1]) / diagonal[i]
        change = [c * t for c, t in zip(capacity, increment)]
        heat = [g * (temperature[i] - temperature[i + 1] + increment[i] - increment[i + 1])
                for i, g in enumerate(links)]
        return {'oldTemperatureK': temperature, 'temperatureIncrementK': increment,
                'energyChangeJ': change, 'faceEnergyJ': heat,
                'storedEnergyJ': [u + du for u, du in zip(old, change)]}


def compare(native, reference):
    errors = [a - b for a, b in zip(native, reference)]
    scale, error = max(map(abs, reference)), max(map(abs, errors))
    return {'signedError': list(map(str, errors)), 'referenceNorm': str(scale),
            'maximumAbsoluteError': str(error), 'relativeError': float(error / scale) if scale else None,
            'withinTwoPercent': error < D('0.02') * scale if scale else None,
            'zeroReferenceControlSatisfied': error == 0 if not scale else None}


def assess(packet):
    if packet.get('schemaVersion') != 1 or not isinstance(packet.get('cases'), list) or not packet['cases']:
        raise ValueError('Nonempty heat precision schemaVersion 1 packet required')
    cases = []
    with localcontext() as context:
        context.prec = 120
        for case in packet['cases']:
            if lift(case['backgroundK']) <= 0:
                raise ValueError('Positive background label required')
            low, reference = solve(case, 80), solve(case, 120)
            native, n = case['native'], case['n']
            failure = native.get('failure')
            if failure is not None and not isinstance(failure, str):
                raise ValueError('Native failure must be a string or null')
            row = {'n': n, 'backgroundK': case['backgroundK'], 'dtS': case['dtS'],
                   'nativeFailure': failure, 'nativeIterations': native.get('iterations'),
                   'reference120': {k: list(map(str, v)) for k, v in reference.items()},
                   'precision80Versus120': {k: compare(low[k], v) for k, v in reference.items()}}
            # Binary64 recovery is a separate baseline offset, not a heat increment.
            recovered = [lift(float(u) / float(c)) for u, c in zip(case['oldEnergyJ'], case['capacityJK'])]
            row['binaryRecoveryOffsetK'] = list(map(str, (a - b for a, b in zip(recovered, reference['oldTemperatureK']))))
            row['checks'] = {} if failure is not None else {
                key: compare(vector(native[key], len(reference[key])), reference[key])
                for key in ('temperatureIncrementK', 'energyChangeJ', 'faceEnergyJ')}
            if failure is None:
                stored = vector(native['storedEnergyJ'], n)
                old = vector(case['oldEnergyJ'], n)
                row['storedEnergyChangeDiagnostic'] = compare([a - b for a, b in zip(stored, old)], reference['energyChangeJ'])
            row['requiredChecksPass'] = failure is None and all(
                m['withinTwoPercent'] is not False and m['zeroReferenceControlSatisfied'] is not False
                for m in row['checks'].values())
            cases.append(row)
    return {'schemaVersion': 1, 'kind': 'coefficient-frozen-linear-heat-precision', 'precisionDigits': [80, 120],
            'relativeGate': 'strict max-norm error < 0.02 for each nonzero increment/face-heat reference',
            'cases': cases, 'allRequiredChecksPass': all(c['requiredChecksPass'] for c in cases),
            'numericallyQualified': False, 'experimentallyQualified': False,
            'scope': 'Discrete coefficient-frozen BE arithmetic only. Zero ratios are null; exact-zero controls do not establish relative accuracy. Stored-energy quantization is reported separately.'}


def self_test():
    import unittest
    class Tests(unittest.TestCase):
        def fixture(self):
            return dict(n=2, backgroundK=400, dtS=.25, capacityJK=[1., 1.],
                        conductanceWK=[2.], oldEnergyJ=[400., 400.], sourceJ=[1e-15, 0.])
        def test_two_cell_closed_form_and_precision(self):
            case = self.fixture()
            with localcontext() as context:
                context.prec = 120
                a, b = solve(case, 80), solve(case, 120)
                q = lift(case['sourceJ'][0])
                expected = [3 * q / 4, q / 4]
                for actual, value in zip(b['temperatureIncrementK'], expected):
                    self.assertLessEqual(abs(actual - value), D('1e-110') * q)
                self.assertLessEqual(abs(b['faceEnergyJ'][0] - q / 4), D('1e-110') * q)
                for key in ('temperatureIncrementK', 'energyChangeJ', 'faceEnergyJ'):
                    self.assertLess(max(abs(x - y) for x, y in zip(a[key], b[key])), D('1e-70') * q)
        def test_wrong_flux_sign_and_missing_dt_refuse(self):
            with localcontext() as context:
                context.prec = 120
                case = self.fixture()
                heat = solve(case, 120)['faceEnergyJ']
                for wrong in ([-heat[0]], [heat[0] / lift(case['dtS'])]):
                    self.assertFalse(compare(wrong, heat)['withinTwoPercent'])
        def test_actual_baseline_zero_control_and_signed_source(self):
            with localcontext() as context:
                context.prec = 120
                case = self.fixture()
                case.update(capacityJK=[.1, .1], oldEnergyJ=[40., 40.], sourceJ=[0., 0.])
                result = solve(case, 120)
                self.assertNotEqual(result['oldTemperatureK'][0], D(400))
                self.assertEqual(result['faceEnergyJ'], [D(0)])
                metric = compare([D(0)], [D(0)])
                self.assertIsNone(metric['relativeError'])
                self.assertTrue(metric['zeroReferenceControlSatisfied'])
                case['sourceJ'] = [-1e-15, 1e-15]
                result = solve(case, 120)
                self.assertLess(result['faceEnergyJ'][0], 0)
                self.assertLess(abs(sum(result['energyChangeJ'])), D('1e-80'))
        def test_threshold_and_nonfinite_input(self):
            self.assertFalse(compare([D('1.02')], [D(1)])['withinTwoPercent'])
            case = self.fixture()
            case['capacityJK'][0] = float('nan')
            self.assertRaises(ValueError, solve, case, 80)
    return unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Tests)).wasSuccessful()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', nargs='?', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return 0 if self_test() else 1
    if args.input is None:
        parser.error('an input packet is required')
    data = args.input.read_bytes()
    result = assess(json.loads(data))
    result.update(inputSha256=hashlib.sha256(data).hexdigest(), oracleSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
    encoded = json.dumps(result, indent=2, allow_nan=False) + '\n'
    with (args.output or args.input.with_name('heat-precision-assessment.json')).open('x') as output:
        output.write(encoded)
    print(json.dumps({'cases': len(result['cases']), 'allRequiredChecksPass': result['allRequiredChecksPass']}))
    return 0 if result['allRequiredChecksPass'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
