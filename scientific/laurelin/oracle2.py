"""Independent adaptive ODE/quadrature oracle for the specified educational model.

No production imports. Temperature is integrated logarithmically in pulse fraction,
not by the production exact-energy recurrence. Work/loss are independent ODE states;
fusion yields use adaptive quadrature rather than production midpoint sums.
"""
import hashlib
import json
import math
from pathlib import Path
import sys

import numpy as np
import scipy
from scipy.integrate import quad, solve_ivp

KEV = 1.602176634e-16
MEV = KEV * 1000
MD = 3.3435837724e-27
EDGES = np.array([0., .12, .32, .56, .76, 1.])
# Full Padé rows independently transcribed from PlasmaPy's official data file,
# Bosch–Hale table VII: C1..C7, output cm³/s; URL and access date in ORACLE2.md.
COEFFICIENTS = {
    'neutron': (5.43360e-12, 5.85778e-3, 7.68222e-3, 0., -2.96400e-6, 0., 0.),
    'proton': (5.65718e-12, 3.41267e-3, 1.99167e-3, 0., 1.05060e-5, 0., 0.),
}


def reactivity(temperature, branch):
    if not .2 <= temperature <= 100:
        return None
    c1, c2, c3, c4, c5, c6, c7 = COEFFICIENTS[branch]
    numerator = temperature * (c2 + temperature * (c4 + temperature*c6))
    denominator = 1 + temperature * (c3 + temperature * (c5 + temperature*c7))
    theta = temperature / (1 - numerator/denominator)
    xi = (31.397**2/(4*theta))**(1/3)
    return 1e-6*c1*theta*math.sqrt(xi/(937814*temperature**3))*math.exp(-3*xi)


def reference(c):
    volume0 = 2*math.pi*c['radiusM']**2*c['lengthM']/3
    inventory = c['densityM3']*volume0
    energy0 = 3*inventory*c['temperatureKeV']*KEV
    merge = inventory*MD*(1000*c['speedKmS'])**2/2
    duration = c['durationUs']*1e-6
    decay = c['durationUs']/c['confinementUs']
    logc = math.log(c['compression'])
    state = np.zeros(4)  # log(T/T0), compression/E0, expansion/E0, loss/E0
    segments = []
    for phase, (left, right) in enumerate(zip(EDGES[:-1], EDGES[1:])):
        volume_gradient = -logc/.24 if phase == 2 else logc/.24 if phase == 4 else 0.
        forcing = merge/(energy0*.2) if phase == 1 else 0.

        def rhs(fraction, y):
            u = math.exp(y[0])
            work = -(2/3)*u*volume_gradient
            return [-(2/3)*volume_gradient-decay+forcing/u,
                    max(work, 0.), max(-work, 0.), decay*u]

        sol = solve_ivp(rhs, (left, right), state, method='DOP853',
                        rtol=2e-12, atol=1e-13, max_step=(right-left)/8,
                        dense_output=True)
        if not sol.success or not np.isfinite(sol.y).all():
            raise ValueError('Independent ODE failed')
        segments.append(sol.sol)
        state = sol.y[:, -1]

    def evaluate(fractions):
        fractions = np.asarray(fractions)
        phase = np.minimum(np.searchsorted(EDGES[1:], fractions, side='right'), 4)
        y = np.empty((4, fractions.size))
        for index, sol in enumerate(segments):
            selected = phase == index
            if selected.any():
                y[:, selected] = sol(fractions[selected])
        log_volume = np.zeros(fractions.shape)
        selected = (fractions >= .32) & (fractions < .56)
        log_volume[selected] = -logc*(fractions[selected]-.32)/.24
        log_volume[(fractions >= .56) & (fractions < .76)] = -logc
        selected = fractions >= .76
        log_volume[selected] = -logc*(1-fractions[selected])/.24
        volume = volume0*np.exp(log_volume)
        temperature = c['temperatureKeV']*np.exp(y[0])
        density = inventory/volume
        return dict(temperatureKeV=temperature, volumeM3=volume, densityM3=density,
                    radiusM=c['radiusM']*np.exp(log_volume/2), energyJ=energy0*np.exp(y[0]),
                    balanceFieldT=np.sqrt(8e-7*math.pi*2*density*temperature*KEV))

    endpoints = evaluate(EDGES)['temperatureKeV']
    supported = bool(np.all((endpoints >= .2) & (endpoints <= 100)))
    totals = dict(initialJ=energy0, mergeJ=merge, compressionJ=energy0*state[1],
                  expansionJ=energy0*state[2], lossJ=energy0*state[3],
                  remainingJ=energy0*math.exp(state[0]))
    errors = {}
    for branch in COEFFICIENTS:
        total, error = 0., 0.
        if supported:
            for left, right in zip(EDGES[:-1], EDGES[1:]):
                def rate(fraction):
                    sample = evaluate(np.array([fraction]))
                    return .5*sample['densityM3'][0]*duration*reactivity(sample['temperatureKeV'][0], branch)
                scale = max(rate(f) for f in np.linspace(left, right, 17))
                value, uncertainty = quad(lambda f: rate(f)/scale, left, right,
                                          epsabs=1e-12, epsrel=1e-10, limit=100)
                total += value*scale*inventory
                error += uncertainty*scale*inventory
        key = 'neutrons' if branch == 'neutron' else 'protons'
        totals[key] = total if supported else None
        errors[key] = error if supported else None
    totals.update(driverJ=(energy0+merge+totals['compressionJ'])/c['driverEfficiency'],
                  recoveredJ=c['recoveryEfficiency']*totals['expansionJ'],
                  parasiticJ=1000*c['parasiticKW']/c['frequencyHz'])
    totals['netNonfusionJ'] = totals['recoveredJ']-totals['driverJ']-totals['parasiticJ']
    totals['chargedJ'] = (totals['protons']*4.03+totals['neutrons']*.82)*MEV if supported else None
    totals['neutronJ'] = totals['neutrons']*2.45*MEV if supported else None
    totals['burnFraction'] = 2*(totals['neutrons']+totals['protons'])/inventory if supported else None
    valid = supported and totals['burnFraction'] < .01 and totals['chargedJ']/(energy0+merge+totals['compressionJ']) < .1
    return dict(evaluate=evaluate, totals=totals, supported=supported, diagnosticValid=bool(valid),
                quadratureError=errors, minimumTemperatureKeV=float(endpoints.min()),
                maximumTemperatureKeV=float(endpoints.max()))


def assess(row, gates):
    actual = row['result']
    oracle = reference(actual['config'])
    samples = actual['samples']
    expected = oracle['evaluate']([s['fraction'] for s in samples])
    state_errors = {}
    for key, values in expected.items():
        floor = max(abs(values[0]), 1e-300)*1e-12
        state_errors[key] = float(np.max(abs(np.array([s[key] for s in samples])-values)/np.maximum(abs(values), floor)))
    totals = oracle['totals']
    energy_errors = {key: abs(actual[key]-value)/max(totals['initialJ'], abs(value))
                     for key, value in totals.items() if key.endswith('J') and key not in ('chargedJ', 'neutronJ')}
    yield_errors = {key: abs(actual[key]-totals[key])/max(totals[key], 1e-300)
                    for key in ('neutrons', 'protons', 'chargedJ', 'neutronJ', 'burnFraction')
                    if oracle['supported'] and actual[key] is not None}
    domain = all((actual[key] is None) == (totals[key] is None)
                 for key in ('neutrons', 'protons', 'chargedJ', 'neutronJ', 'burnFraction'))
    flags = domain and actual['diagnosticValid'] == oracle['diagnosticValid'] and actual['fusionElectricityJ'] is None
    checks = dict(domainAndFlags=bool(flags),
                  states=bool(max(state_errors.values()) <= gates['stateRelative']),
                  energy=bool(max(energy_errors.values()) <= gates['energyInitialNormalized']),
                  yields=bool(not oracle['supported'] or (len(yield_errors) == 5 and max(yield_errors.values()) <= gates['yieldRelative'+str(row['steps'])])))
    return dict(name=row['name'], steps=row['steps'], checks=checks, passed=all(checks.values()),
                stateErrors=state_errors, energyErrors=energy_errors, yieldErrors=yield_errors,
                referenceQuadratureError=oracle['quadratureError'],
                referenceTemperatureRangeKeV=[oracle['minimumTemperatureKeV'], oracle['maximumTemperatureKeV']])


def run(export_path, output_path):
    protocol_path = Path(__file__).with_name('oracle2-cases.json')
    protocol_raw = protocol_path.read_bytes()
    protocol = json.loads(protocol_raw)
    raw = Path(export_path).read_bytes()
    payload = json.loads(raw)
    if payload['protocolSHA256'] != hashlib.sha256(protocol_raw).hexdigest():
        raise ValueError('Wrong frozen protocol')
    wanted = [(case['name'], steps) for case in protocol['cases'] for steps in protocol['steps']]
    if [(r['name'], r['steps']) for r in payload['rows']] != wanted:
        raise ValueError('Missing, reordered or extra matrix rows')
    for row in payload['rows']:
        spec = next(case for case in protocol['cases'] if case['name'] == row['name'])
        if any(row['result']['config'][key] != value for key, value in spec['input'].items()):
            raise ValueError('Scenario inputs changed')
    rows = [assess(row, protocol['gates']) for row in payload['rows']]
    report = dict(scope='Independent numerical checks of prescribed 0D equations, not Laurelin-device validation',
                  productionSourceSHA256=payload['productionSourceSHA256'],
                  productionExportSHA256=hashlib.sha256(raw).hexdigest(),
                  oracleSourceSHA256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                  protocolSHA256=payload['protocolSHA256'], scipyVersion=scipy.__version__,
                  gates=protocol['gates'], rows=rows, passed=all(r['passed'] for r in rows))
    with Path(output_path).open('x') as stream:
        json.dump(report, stream, indent=2, allow_nan=False)
        stream.write('\n')
    print(json.dumps(dict(passed=report['passed'], rows=len(rows), failures=[(r['name'], r['steps'], r['checks']) for r in rows if not r['passed']])))
    return report['passed']


if __name__ == '__main__':
    sys.exit(0 if run(*sys.argv[1:]) else 1)
