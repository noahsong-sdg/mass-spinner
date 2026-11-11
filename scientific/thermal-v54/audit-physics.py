"""Independent Decimal physics audit of FiPy case/output packets; safe-dev only.

No production or FiPy solver implementation is imported. Decimal80 reconstructs
annular masses, temperature integrals, every energy row, and passive entropy.
For short low-inventory thick-wall cases it also independently advances the
nonlinear equations with a high-precision tridiagonal solve.
"""
import argparse
from decimal import Decimal, getcontext
import hashlib
import json
import math
from pathlib import Path

getcontext().prec = 80
D = lambda x: Decimal(str(x))
ZERO, ONE, TWO = D(0), D(1), D(2)
# Independent SI transcription of the first NIST tungsten solid Shomate branch.
MOLAR = D('.18384')
A, B, C, DD, E = map(D, ['23.95930', '.002639680', '.000001257750',
                       '-.000000000254642', '-48407'])
PI = D('3.141592653589793238462643383279502884197169399375105820974944592307816406286')


def cp(t, material=None):
    if material:
        return D(material['cpJKgK'])
    return (A+B*t+C*t*t+DD*t*t*t+E/(t*t))/MOLAR


def heat(a, b, material=None):
    """h(b)-h(a), factored before evaluation rather than subtracting energies."""
    if material:
        return D(material['cpJKgK'])*(b-a)
    mean = (A+B*(a+b)/2+C*(a*a+a*b+b*b)/3
            +DD*(a*a*a+a*a*b+a*b*b+b*b*b)/4+E/(a*b))/MOLAR
    return (b-a)*mean


def entropy(a, b, material=None):
    """Integral Cp(T)/T from a to b, J/kg/K."""
    if material:
        return D(material['cpJKgK'])*(b/a).ln()
    return (A*(b/a).ln()+B*(b-a)+C*(b*b-a*a)/2
            +DD*(b*b*b-a*a*a)/3-E*(ONE/(b*b)-ONE/(a*a))/2)/MOLAR


def conductivity(t, material=None):
    if material:
        return D(material['kWMK'])
    return (D('149.441')-D('.045466')*t+D('.000013193')*t*t
            -D('.000000001484')*t*t*t+D('3866000')/(t*t))


def geometry(config):
    n = config['cells']
    ri, thick, length = map(D, [config['radiusM'], config['thicknessM'], config['lengthM']])
    edges = [ri+thick*D(i)/n for i in range(n+1)]
    centers = [(a*b).sqrt() for a, b in zip(edges, edges[1:])]
    density = D(config.get('material', {}).get('densityKgM3', 19250))
    masses = [PI*length*density*(b-a)*(b+a) for a, b in zip(edges, edges[1:])]
    return edges, centers, masses, TWO*PI*length


def conductances(config, geo, temperatures):
    edges, centers, _, factor = geo
    material = config.get('material')
    ks = [conductivity(t, material) for t in temperatures[1:]]
    film = D(config['gasWallWK'])
    links = [ZERO if not film else ONE/(ONE/film+(centers[0]/edges[0]).ln()/(factor*ks[0]))]
    for i in range(len(ks)-1):
        links.append(factor/((edges[i+1]/centers[i]).ln()/ks[i]
                            +(centers[i+1]/edges[i+1]).ln()/ks[i+1]))
    cooling = D(config['coolingWK'])
    outer = ZERO if not cooling else ONE/(ONE/cooling+(edges[-1]/centers[-1]).ln()/(factor*ks[-1]))
    return links, outer


def energy_rows(config, geo, old, new, step):
    material = config.get('material')
    dt = D(step['dtS'])
    changes = [D(config['gasCapacityJK'])*(new[0]-old[0])]
    changes.extend(m*heat(a, b, material) for m, a, b in zip(geo[2], old[1:], new[1:]))
    deposits = [D(step.get('gasEnergyJ', 0)), D(step.get('linerEnergyJ', 0))]+[ZERO]*(len(new)-2)
    if 'cellEnergyJ' in step:
        deposits = [a+D(b) for a, b in zip(deposits, step['cellEnergyJ'], strict=True)]
    residual = [a-b for a, b in zip(changes, deposits)]
    links, outer = conductances(config, geo, new)
    for i, g in enumerate(links):
        q = dt*g*(new[i]-new[i+1])
        residual[i] += q
        residual[i+1] -= q
    cooling = dt*outer*(new[-1]-D(config['coolantK']))
    residual[-1] += cooling
    return residual, changes, deposits, cooling


def precise_step(config, geo, old, step):
    """High-precision nonlinear backward Euler, independent of FiPy/production."""
    dt, coolant = D(step['dtS']), D(config['coolantK'])
    material = config.get('material')
    values = old.copy()
    count = len(old)
    for iteration in range(200):
        links, outer = conductances(config, geo, values)
        heatcaps = [D(config['gasCapacityJK'])]
        for m, a, b in zip(geo[2], old[1:], values[1:]):
            heatcaps.append(m*(cp(a, material) if a == b else heat(a, b, material)/(b-a)))
        links = [dt*g for g in links]
        diagonal, rhs, upper = [], [], []
        for i in range(count):
            left = links[i-1] if i else ZERO
            right = links[i] if i+1 < count else ZERO
            diag = heatcaps[i]+left+right+(dt*outer if i == count-1 else ZERO)
            load = D(step.get('gasEnergyJ', 0)) if i == 0 else D(step.get('linerEnergyJ', 0)) if i == 1 else ZERO
            if 'cellEnergyJ' in step:
                load += D(step['cellEnergyJ'][i])
            if i:
                load += left*(old[i-1]-old[i])
            if i+1 < count:
                load += right*(old[i+1]-old[i])
            if i == count-1:
                load += dt*outer*(coolant-old[i])
            if i:
                multiplier = -left/diagonal[-1]
                diag -= multiplier*upper[-1]
                load -= multiplier*rhs[-1]
            diagonal.append(diag)
            rhs.append(load)
            upper.append(-right)
        increment = [ZERO]*count
        increment[-1] = rhs[-1]/diagonal[-1]
        for i in range(count-2, -1, -1):
            increment[i] = (rhs[i]-upper[i]*increment[i+1])/diagonal[i]
        new = [a+b for a, b in zip(old, increment)]
        residual = energy_rows(config, geo, old, new, step)[0]
        if max(abs(a-b) for a, b in zip(new, values)) < D('1e-40') and max(map(abs, residual)) < D('1e-35'):
            return new, iteration+1
        values = new
    raise AssertionError('Independent Decimal nonlinear iteration failed')


def audit(case, output):
    config, material = case['config'], case['config'].get('material')
    geo = geometry(config)
    old = list(map(D, [case['initial']['gasK'], *case['initial']['wallK']]))
    precise = old.copy()
    cooling_total = ZERO
    eligible = D(config['gasCapacityJK']) < D('.01') and D(config['thicknessM']) >= D('.012') and len(case['steps']) <= 10
    metrics = {'name': case['name'], 'steps': len(case['steps']), 'maxGasRowResidualJ': 0.,
               'maxNormalizedNodeResidual': 0., 'maxGlobalEnergyResidualJ': 0.,
               'maxConditionalGasTemperatureErrorK': 0., 'minimumEntropyProductionJK': None,
               'maxHighPrecisionTemperatureDifferenceK': 0., 'highPrecisionSteps': 0}
    for step, state in zip(case['steps'], output['states'], strict=True):
        new = list(map(D, [state['gasK'], *state['wallK']]))
        assert len(new) == len(old)
        assert new[0] > 0 and all(D(300) <= t <= D(1900) for t in new[1:])
        residual, changes, deposits, cooling = energy_rows(config, geo, old, new, step)
        cooling_total += cooling
        assert abs(cooling_total-D(state['coolingEnergyJ'])) < D('1e-7')+D('1e-9')*abs(cooling_total), 'Signed coolant ledger'
        # Same 1e-11 acceptance threshold as the FiPy oracle; no hidden budget.
        energies_old = [D(config['gasCapacityJK'])*old[0]]+[m*heat(D(300), t, material) for m, t in zip(geo[2], old[1:])]
        energies_new = [D(config['gasCapacityJK'])*new[0]]+[m*heat(D(300), t, material) for m, t in zip(geo[2], new[1:])]
        normalized = max(abs(r)/(ONE+max(abs(a), abs(b), abs(q), D('1e-9'))) for r, a, b, q in zip(residual, energies_old, energies_new, deposits))
        assert normalized < D('1e-11'), (case['name'], 'Decimal node residual', str(normalized))
        links, _ = conductances(config, geo, new)
        weight = D(step['dtS'])*links[0]
        conditional = (D(config['gasCapacityJK'])*old[0]+deposits[0]+weight*new[1])/(D(config['gasCapacityJK'])+weight)
        delta_s = D(config['gasCapacityJK'])*(new[0]/old[0]).ln()
        delta_s += sum(m*entropy(a, b, material) for m, a, b in zip(geo[2], old[1:], new[1:]))
        production = delta_s+cooling/D(config['coolantK'])-sum(q/t for q, t in zip(deposits, new))
        # Propagated double-temperature evaluation scale, not a convergence gate.
        entropy_roundoff = D(8)*D(str(math.ulp(1.0)))*(ONE+sum(m*cp(t, material) for m, t in zip(geo[2], new[1:]))+D(config['gasCapacityJK'])+abs(cooling/D(config['coolantK']))+sum(abs(q/t) for q, t in zip(deposits, new)))
        assert production >= -entropy_roundoff, (case['name'], 'negative entropy', str(production), str(entropy_roundoff))
        if not any(deposits):
            bound = [*old, *([D(config['coolantK'])] if D(config['coolingWK']) else [])]
            assert all(min(bound)-D('1e-8') <= t <= max(bound)+D('1e-8') for t in new), 'Passive maximum principle'
        if eligible:
            precise, _ = precise_step(config, geo, precise, step)
            difference = max(abs(a-b) for a, b in zip(precise, new))
            assert difference < D('1e-7'), (case['name'], 'Decimal oracle difference K', str(difference))
            metrics['maxHighPrecisionTemperatureDifferenceK'] = max(metrics['maxHighPrecisionTemperatureDifferenceK'], float(difference))
            metrics['highPrecisionSteps'] += 1
        metrics['maxGasRowResidualJ'] = max(metrics['maxGasRowResidualJ'], float(abs(residual[0])))
        metrics['maxNormalizedNodeResidual'] = max(metrics['maxNormalizedNodeResidual'], float(normalized))
        metrics['maxGlobalEnergyResidualJ'] = max(metrics['maxGlobalEnergyResidualJ'], float(abs(sum(changes)-sum(deposits)+cooling)))
        metrics['maxConditionalGasTemperatureErrorK'] = max(metrics['maxConditionalGasTemperatureErrorK'], float(abs(new[0]-conditional)))
        p = float(production)
        metrics['minimumEntropyProductionJK'] = p if metrics['minimumEntropyProductionJK'] is None else min(metrics['minimumEntropyProductionJK'], p)
        old = new
    return metrics


def self_checks():
    """Qualify the independent oracle against analytic two-reservoir BE."""
    c = {'radiusM': .12, 'lengthM': .5, 'thicknessM': .012, 'cells': 1,
         'gasCapacityJK': .000678584, 'gasWallWK': 1000, 'coolingWK': 0,
         'coolantK': 500, 'material': {'densityKgM3': 19250, 'cpJKgK': 150, 'kWMK': 120}}
    geo = geometry(c)
    old = [D(500), D(1000)]
    step = {'dtS': 1/512}
    actual, _ = precise_step(c, geo, old, step)
    cg, cw = D(c['gasCapacityJK']), geo[2][0]*D(150)
    g = D(step['dtS'])*conductances(c, geo, old)[0][0]
    denominator = cg*cw+g*(cg+cw)
    exact = [old[0]+g*cw*(old[1]-old[0])/denominator,
             old[1]-g*cg*(old[1]-old[0])/denominator]
    error = max(abs(a-b) for a, b in zip(actual, exact))
    assert error < D('1e-60'), ('Decimal oracle analytic self-check', str(error))
    c = {**c, 'cells': 4, 'gasWallWK': 0}
    geo = geometry(c)
    old = list(map(D, [500, 500, 800, 1000, 1200]))
    new, _ = precise_step(c, geo, old, {'dtS': .1})
    rows, changes, _, _ = energy_rows(c, geo, old, new, {'dtS': .1})
    assert max(map(abs, rows)) < D('1e-35') and abs(sum(changes)) < D('1e-35')
    assert sum(m*entropy(a, b, c['material']) for m, a, b in zip(geo[2], old[1:], new[1:])) > 0
    assert new[0] == old[0]
    return {'analyticTwoReservoirDifferenceK': float(error), 'closedAnnularRedistribution': 'passed'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('cases', type=Path)
    parser.add_argument('results', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--case', action='append', help='Audit only named cases; repeat to select more.')
    args = parser.parse_args()
    inputs, results = json.loads(args.cases.read_text()), json.loads(args.results.read_text())
    records = results['cases'] if isinstance(results['cases'], dict) else {c['name']: c for c in results['cases']}
    selected = inputs['cases']
    if args.case:
        requested = set(args.case)
        known = {case['name'] for case in selected}
        assert requested <= known, ('Unknown audit cases', sorted(requested-known))
        selected = [case for case in selected if case['name'] in requested]
    rows = []
    for i, case in enumerate(selected, 1):
        print(f"Auditing {i}/{len(selected)}: {case['name']}", flush=True)
        rows.append(audit(case, records[case['name']]))
        print(f"Passed {case['name']}", flush=True)
    output = {'auditor': 'Independent Decimal80 equations, no production/FiPy imports',
              'allPass': True, 'selfChecks': self_checks(), 'cases': rows,
              'caseNames': [case['name'] for case in selected],
              'casesSHA256': hashlib.sha256(args.cases.read_bytes()).hexdigest(),
              'resultsSHA256': hashlib.sha256(args.results.read_bytes()).hexdigest(),
              'scriptSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    args.output.write_text(json.dumps(output, indent=2)+'\n')
    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
