"""Exact ledger oracle for optional high/low liner-energy storage.

Schema 1: cases[{id,initial:{highJ:[...],lowJ:[...]},
steps:[{highJ:[...],lowJ:[...],energyChangeJ:[...]}]}].
Run only in bounded offline CI. This checks accumulation of captured binary64
increments, not their physical accuracy, temperature inversion or wall flux.
"""
import argparse
from decimal import Decimal, localcontext
from fractions import Fraction as F
import hashlib
import json
import math
from pathlib import Path


def lift(value):
    if type(value) not in (int, float) or not math.isfinite(float(value)):
        raise ValueError('Finite binary64 energy words required')
    return F.from_float(float(value))


def vector(values, n):
    if not isinstance(values, list) or len(values) != n:
        raise ValueError(f'Expected {n} energy values')
    return list(map(lift, values))


def pair(row, n):
    high, low = vector(row['highJ'], n), vector(row['lowJ'], n)
    if any(float(h)+float(l) != float(h) for h, l in zip(high, low)):
        raise ValueError('High/low pair must be normalized: binary64(high+low)==high')
    return [h+l for h, l in zip(high, low)]


def decimal(value):
    with localcontext() as context:
        context.prec = 80
        return str(Decimal(value.numerator)/Decimal(value.denominator))


def ratio(a, b):
    return decimal(a/b) if b else None


def assess_case(case):
    n = len(case['initial']['highJ'])
    if not 1 <= n <= 4096 or not isinstance(case['steps'], list) or not case['steps']:
        raise ValueError('Need 1–4096 cells and at least one recorded step')
    initial = pair(case['initial'], n)
    expected, activity, prefixes = list(initial), F(0), []
    for step, row in enumerate(case['steps'], 1):
        increments = vector(row['energyChangeJ'], n)
        expected = [a+b for a, b in zip(expected, increments)]
        activity += sum(map(abs, increments))
        represented = pair(row, n)
        defect = [a-b for a, b in zip(represented, expected)]
        error = sum(map(abs, defect))
        net = [a-b for a, b in zip(expected, initial)]
        net_l1, net_signed = sum(map(abs, net)), sum(net)
        prefixes.append(dict(step=step,
            exactExpectedJ=list(map(str, expected)), exactRepresentedJ=list(map(str, represented)),
            exactSignedDefectJ=list(map(str, defect)), exactActivityJ=str(activity),
            absoluteDefectSumJ=decimal(error), maximumCellAbsoluteDefectJ=decimal(max(map(abs, defect))),
            totalAbsoluteActualIncrementsJ=decimal(activity), signedTotalNetChangeJ=decimal(net_signed),
            netChangeL1J=decimal(net_l1), relativeToAbsoluteIncrements=ratio(error, activity),
            relativeToNetChangeL1=ratio(error, net_l1), relativeToSignedTotalNet=ratio(error, abs(net_signed)),
            zeroActivity=not activity, zeroNetChange=not net_l1, zeroSignedTotalNetChange=not net_signed,
            strictTwoPercentPass=(error*50 < activity) if activity else None,
            exactZeroActivityControlSatisfied=(error == 0) if not activity else None,
            requiredCheckPass=(error*50 < activity) if activity else error == 0))
    return dict(id=case['id'], cells=n, steps=len(prefixes), exactInitialPairJ=list(map(str, initial)),
                prefixes=prefixes, final=prefixes[-1], allRequiredChecksPass=all(p['requiredCheckPass'] for p in prefixes))


def assess(packet):
    if packet.get('schemaVersion') != 1 or not isinstance(packet.get('cases'), list) or not packet['cases']:
        raise ValueError('Nonempty schemaVersion 1 packet required')
    rows = []
    for case in packet['cases']:
        try:
            rows.append(assess_case(case))
        except (ValueError, OverflowError) as error:
            rows.append(dict(id=case['id'], failure=str(error), allRequiredChecksPass=False))
    return dict(schemaVersion=1, kind='exact-binary64-increment-liner-storage', cases=rows,
        allRequiredChecksPass=all(r['allRequiredChecksPass'] for r in rows),
        gate='At every stored prefix, exact L1 defect*50 < cumulative sum of absolute actual increments. Zero activity requires exact equality; ratios null, no floor.',
        numericallyQualified=False, experimentallyQualified=False,
        scope='Paired storage accumulation only. Fraction arithmetic decides gates; Decimal80 formats reports. No temperature, nonlinear constitutive, wall-exchange, continuum or coupled-model qualification.')


def self_test():
    import unittest
    class Tests(unittest.TestCase):
        def case(self):
            return dict(id='dyadic', initial=dict(highJ=[1.], lowJ=[0.]), steps=[
                dict(highJ=[1.], lowJ=[2**-55], energyChangeJ=[2**-55]),
                dict(highJ=[1.], lowJ=[2**-54], energyChangeJ=[2**-55])])
        def test_exact_dyadic_accumulation(self):
            result = assess_case(self.case())
            self.assertTrue(result['allRequiredChecksPass'])
            self.assertEqual(result['final']['relativeToAbsoluteIncrements'], '0')
            self.assertEqual(result['final']['exactSignedDefectJ'], ['0'])
        def test_dropped_low_word_refuses(self):
            case = self.case(); case['steps'][0]['lowJ'] = [0.]
            result = assess_case(case)
            self.assertFalse(result['allRequiredChecksPass'])
            self.assertEqual(result['prefixes'][0]['relativeToAbsoluteIncrements'], '1')
            self.assertTrue(result['final']['requiredCheckPass'])
        def test_initial_low_signed_cancellation_and_zero_activity(self):
            case = self.case(); case['initial']['lowJ'] = [2**-55]
            case['steps'] = [dict(highJ=[1.], lowJ=[3*2**-55], energyChangeJ=[2**-54]),
                             dict(highJ=[1.], lowJ=[2**-55], energyChangeJ=[-(2**-54)])]
            result = assess_case(case)
            self.assertTrue(result['allRequiredChecksPass'])
            self.assertTrue(result['final']['zeroNetChange'])
            self.assertIsNone(result['final']['relativeToNetChangeL1'])
            case['steps'] = [dict(highJ=[1.], lowJ=[2**-55], energyChangeJ=[0.])]
            result = assess_case(case)['final']
            self.assertIsNone(result['strictTwoPercentPass'])
            self.assertTrue(result['exactZeroActivityControlSatisfied'])
        def test_strict_boundary_and_unnormalized_pair_refuse(self):
            case = dict(id='boundary', initial=dict(highJ=[0.], lowJ=[0.]),
                        steps=[dict(highJ=[51.], lowJ=[0.], energyChangeJ=[50.])])
            self.assertFalse(assess_case(case)['allRequiredChecksPass'])
            case['initial'] = dict(highJ=[1.], lowJ=[1.])
            self.assertRaises(ValueError, assess_case, case)
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
        parser.error('input packet required')
    data = args.input.read_bytes()
    result = assess(json.loads(data))
    result.update(inputSha256=hashlib.sha256(data).hexdigest(), oracleSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
    encoded = json.dumps(result, indent=2, allow_nan=False)+'\n'
    with (args.output or args.input.with_name('liner-storage-assessment.json')).open('x') as output:
        output.write(encoded)
    print(json.dumps(dict(cases=len(result['cases']), allRequiredChecksPass=result['allRequiredChecksPass'])))
    return 0 if result['allRequiredChecksPass'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
