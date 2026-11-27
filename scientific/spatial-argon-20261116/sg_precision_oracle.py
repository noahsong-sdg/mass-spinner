"""Independent cell-BE SG reference; execute only in bounded offline CI.

Schema 1: cases[{id,mass,temperatureK,omegaRadS,speciesMassKg,radiusM,
diffusivityM2S,dtS,native:{mass,faceTransfers,storageDefect,failure}}].
Optional temperatureBasis:{referenceK:[...],incrementK:[...]} defines physical
T as the exact lifted sum; its rounded binary64 sum must match temperatureK.
Inputs are binary64 primitives, not rounded production SG coefficients.
Ratios are exact decimal strings or null, with no floors or accuracy waiver.
"""
import argparse
from decimal import Decimal as D, DecimalException, localcontext
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path

KB = D.from_float(1.380649e-23)
EPS = D.from_float(2.220446049250313e-16)


def lift(value):
    if type(value) not in (int, float) or not math.isfinite(float(value)):
        raise ValueError('Finite binary64 primitives required')
    return D.from_float(float(value))


def vector(values, n):
    if not isinstance(values, list) or len(values) != n:
        raise ValueError(f'Expected {n} values')
    return list(map(lift, values))


def divergence(face):
    return [(face[i-1] if i else D(0))-(face[i] if i < len(face) else D(0))
            for i in range(len(face)+1)]


def solve(case, precision):
    with localcontext() as context:
        context.prec = precision
        n = len(case['mass'])
        if not 2 <= n <= 4096:
            raise ValueError('Need 2–4096 species cells')
        old, temperature = vector(case['mass'], n), vector(case['temperatureK'], n)
        rounded = list(temperature)
        physical = list(map(Fraction, temperature))
        if 'temperatureBasis' in case:
            basis = case['temperatureBasis']
            reference, increment = vector(basis['referenceK'], n), vector(basis['incrementK'], n)
            if min(reference) <= 0 or any(float(a)+float(b) != float(t) for a, b, t in zip(reference, increment, rounded)):
                raise ValueError('Temperature basis must reproduce the supplied positive endpoint')
            physical = [Fraction(a)+Fraction(b) for a, b in zip(reference, increment)]
            temperature = [a+b for a, b in zip(reference, increment)]
        offset = [a-b for a, b in zip(rounded, temperature)]
        omega = case['omegaRadS']
        rotation = vector(omega if isinstance(omega, list) else [omega]*n, n)
        species, radius, diffusivity, dt = map(lift, (
            case['speciesMassKg'], case['radiusM'], case['diffusivityM2S'], case['dtS']))
        if min(old) < 0 or abs(sum(old)-1) > lift(2e-8) or min(temperature) <= 0 or min(species, radius) <= 0 or min(diffusivity, dt) < 0:
            raise ValueError('Need normalized nonnegative mass, positive T/m/R and nonnegative D/dt')
        if dt == 0 or diffusivity == 0:
            zero = [D(0)]*(n-1)
            return dict(mass=old, faceTransfers=zero, divergence=divergence(zero), activity=zero,
                        exactStationaryControl=True, rawStationaryCellSolveLeakage=zero, roundedTemperatureOffsetK=offset)
        outward, inward = [], []
        for i in range(n-1):
            inverse = (1/temperature[i]+1/temperature[i+1])/2
            z = species*radius**2*(rotation[i]**2+rotation[i+1]**2)*inverse/(4*KB*n)
            # exp(-z) avoids a positive-exponent overflow for strong drift.
            with localcontext() as extra:
                extra.prec += max(0, -z.adjusted())+8 if z else 0
                decay = (-z).exp()
                b = z*decay/(1-decay) if z else D(1)
            b = +b
            scale = dt*4*diffusivity*(i+1)*n*inverse/radius**2
            outward.append(scale*temperature[i]*(b+z))
            inward.append(scale*temperature[i+1]*b)
        # Original CELL equations: (I + divergence of SG rates) p' = p.
        diagonal = [1+(inward[i-1] if i else 0)+(outward[i] if i < n-1 else 0) for i in range(n)]
        rhs = list(old)
        for i in range(1, n):
            factor = -outward[i-1]/diagonal[i-1]
            diagonal[i] += factor*inward[i-1]
            rhs[i] -= factor*rhs[i-1]
        mass = [D(0)]*n
        mass[-1] = rhs[-1]/diagonal[-1]
        for i in range(n-2, -1, -1):
            mass[i] = (rhs[i]+inward[i]*mass[i+1])/diagonal[i]
        face = [a*mass[i]-b*mass[i+1] for i, (a, b) in enumerate(zip(outward, inward))]
        activity = [abs(a*mass[i])+abs(b*mass[i+1]) for i, (a, b) in enumerate(zip(outward, inward))]
        # A symbolic zero control, independently proven from exact input ratios.
        pressure = [Fraction(p)*t for p, t in zip(old, physical)]
        stationary = not any(rotation) and all(p == pressure[0] for p in pressure)
        leakage = list(face) if stationary else None
        if stationary:
            mass, face = old, [D(0)]*(n-1)
        return dict(mass=mass, faceTransfers=face, divergence=divergence(face),
                    activity=activity, exactStationaryControl=stationary, rawStationaryCellSolveLeakage=leakage,
                    roundedTemperatureOffsetK=offset)


def metric(native, reference):
    errors = [a-b for a, b in zip(native, reference)]
    norm, error = max(map(abs, reference)), max(map(abs, errors))
    return dict(signedError=list(map(str, errors)), maximumAbsoluteError=str(error), referenceNorm=str(norm),
                errorOverReferenceNorm=str(error/norm) if norm else None,
                exactZeroReference=not norm, exactZeroControlSatisfied=error == 0 if not norm else None)


def assess(packet):
    if packet.get('schemaVersion') != 1 or not isinstance(packet.get('cases'), list) or not packet['cases']:
        raise ValueError('Nonempty schemaVersion 1 packet required')
    rows = []
    with localcontext() as context:
        context.prec = 120
        for case in packet['cases']:
            row = {'id': case['id'], 'nativeFailure': case['native'].get('failure')}
            try:
                low, ref = solve(case, 80), solve(case, 120)
            except (ValueError, DecimalException, OverflowError) as error:
                row.update(oracleFailure=str(error), complete=False)
                rows.append(row)
                continue
            row['reference120'] = {k: list(map(str, v)) if isinstance(v, list) else v for k, v in ref.items()}
            row['precision80Versus120'] = {k: metric(low[k], ref[k]) for k in ('mass', 'faceTransfers', 'divergence')}
            if 'temperatureBasis' in case:
                rounded = solve({k: v for k, v in case.items() if k != 'temperatureBasis'}, 120)
                row['roundedTemperatureOperatorDifference'] = {k: metric(rounded[k], ref[k]) for k in ('mass', 'faceTransfers', 'divergence')}
            row['referenceNetToGrossRatio'] = [str(abs(f)/a) if a else None for f, a in zip(ref['faceTransfers'], ref['activity'])]
            if row['nativeFailure'] is None:
                n, native = len(case['mass']), case['native']
                mass, face, stored = vector(native['mass'], n), vector(native['faceTransfers'], n-1), vector(native['storageDefect'], n)
                row['nativeErrors'] = dict(mass=metric(mass, ref['mass']), faceTransfers=metric(face, ref['faceTransfers']),
                                          divergence=metric(divergence(face), ref['divergence']))
                row['faceErrorOverOneWayActivity'] = [str(abs(a-b)/s) if s else None for a, b, s in zip(face, ref['faceTransfers'], ref['activity'])]
                row['faceErrorOverEpsilonActivity'] = [str(abs(a-b)/(EPS*s)) if s else None for a, b, s in zip(face, ref['faceTransfers'], ref['activity'])]
                defect = [p-q-d for p, q, d in zip(mass, vector(case['mass'], n), divergence(face))]
                row['storedContinuityDefect'] = list(map(str, defect))
                row['reportedStorageDefectError'] = metric(stored, defect)
                row['storedMassResponseError'] = metric([p-q for p, q in zip(mass, vector(case['mass'], n))], ref['divergence'])
            row['complete'] = row['nativeFailure'] is None
            rows.append(row)
    return dict(schemaVersion=1, kind='independent-cell-BE-SG-precision', precisionDigits=[80, 120], cases=rows,
                allComplete=all(r['complete'] for r in rows), numericallyQualified=False, experimentallyQualified=False,
                scope='Binary64-input discrete SG arithmetic only; no accuracy gate, floors, continuum or coupled-model qualification. Optional basis uses exact reference+increment T; production coefficients use rounded endpoint T, whose separate operator difference is reported. Activity is one-way probability transfer, not an error allowance. Divergence is per-particle inventory change; multiply by species inventory for particle count.')


def self_test():
    import unittest
    class Tests(unittest.TestCase):
        def case(self, n=2):
            return dict(mass=[1/n]*n, temperatureK=[1.]*n, omegaRadS=0., speciesMassKg=1.380649e-23,
                        radiusM=1., diffusivityM2S=.5, dtS=.25)
        def test_two_cell_closed_form_depletion_and_signed_flux(self):
            with localcontext() as context:
                context.prec = 120
                for old in ([.75, .25], [0., 1.]):
                    case = self.case(); case['mass'] = old
                    ref = solve(case, 120)
                    expected = (lift(old[0])-lift(old[1]))/3
                    self.assertLess(abs(ref['faceTransfers'][0]-expected), D('1e-115'))
                    self.assertLess(abs(sum(ref['mass'])-1), D('1e-115'))
        def test_exact_stationarity_and_zero_time_diffusion(self):
            for n in (2, 8, 32):
                for dt, diffusivity in ((.25, .5), (0., .5), (.25, 0.)):
                    case = self.case(n); case.update(dtS=dt, diffusivityM2S=diffusivity)
                    ref = solve(case, 120)
                    self.assertTrue(ref['exactStationaryControl'])
                    self.assertEqual(ref['faceTransfers'], [D(0)]*(n-1))
                    self.assertIsNone(metric(ref['faceTransfers'], ref['faceTransfers'])['errorOverReferenceNorm'])
        def test_weak_temperature_stiffness_and_precision(self):
            with localcontext() as context:
                context.prec = 120
                for n in (2, 8, 32):
                    case = self.case(n); case['temperatureK'][0] = math.nextafter(1., 2.)
                    for diffusivity in (.5, 1e12):
                        case['diffusivityM2S'] = diffusivity
                        low, high = solve(case, 80), solve(case, 120)
                        self.assertGreater(high['faceTransfers'][0], 0)
                        self.assertLess(max(abs(a-b) for a, b in zip(low['faceTransfers'], high['faceTransfers'])), D('1e-40'))
                        self.assertTrue(all(p >= 0 for p in high['mass']))
        def test_near_drift_equilibrium_and_wrong_flux_control(self):
            with localcontext() as context:
                context.prec = 120
                case = self.case(); case['omegaRadS'] = 1.
                odds = math.exp(.25); case['mass'] = [1/(1+odds), odds/(1+odds)]
                ref = solve(case, 120)
                self.assertFalse(ref['exactStationaryControl'])
                self.assertLess(abs(ref['faceTransfers'][0])/ref['activity'][0], D('1e-12'))
                self.assertNotEqual(ref['faceTransfers'][0], 0)
                wrong = D(metric([-ref['faceTransfers'][0]], ref['faceTransfers'])['errorOverReferenceNorm'])
                self.assertLess(abs(wrong-2), D('1e-110'))
        def test_subulp_basis_signed_flux_and_mismatch_refusal(self):
            for mass, temperature, pattern in (([.5, .5], [1000., 1000.], [1, 0]), ([.75, .25], [500., 1500.], [1, 1])):
                for delta in (2**-50, -(2**-50)):
                    case = self.case(); case.update(mass=mass, temperatureK=temperature, diffusivityM2S=.001, dtS=.01)
                    case['temperatureBasis'] = dict(referenceK=temperature, incrementK=[delta*p for p in pattern])
                    ref = solve(case, 120)
                    self.assertFalse(ref['exactStationaryControl'])
                    self.assertGreater(ref['faceTransfers'][0]*lift(delta), 0)
                    self.assertTrue(all(float(a)+b == a for a, b in zip(temperature, case['temperatureBasis']['incrementK'])))
            case['temperatureBasis']['incrementK'][0] = 1.
            self.assertRaises(ValueError, solve, case, 120)
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
    with (args.output or args.input.with_name('sg-precision-assessment.json')).open('x') as output:
        output.write(encoded)
    print(json.dumps({'cases': len(result['cases']), 'allComplete': result['allComplete'], 'diagnosticOnly': True}))
    return 0 if result['allComplete'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
