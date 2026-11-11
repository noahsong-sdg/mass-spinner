"""Independent Decimal80 annular transient audit; run only inside safe-dev.

Usage: audit-numerics.py CASES.json FIPY.json OUT.json CASE_NAME [CASE_NAME ...]
Selected cases must retain every step (normally five early fine-grid steps).
No production, FiPy, or other project solver module is imported.
"""
import argparse
from decimal import Decimal, getcontext, localcontext
import hashlib
import json
from pathlib import Path

D = lambda value: Decimal(str(value))
PI = D('3.141592653589793238462643383279502884197169399375105820974944592307816406286')
ZERO = D(0)


def passive_bounds(bounds, values):
    """Decimal arithmetic allowance, not a rigorous accumulated error bound."""
    unit = D(10)**(max(abs(t).adjusted() for t in bounds)-getcontext().prec+1)
    allowance = 8*len(values)*unit
    undershoot = max(ZERO, min(bounds)-min(values))
    overshoot = max(ZERO, max(values)-max(bounds))
    assert max(undershoot, overshoot) <= allowance, {
        'invariant': 'Decimal passive bounds', 'precision': getcontext().prec,
        'undershootK': str(undershoot), 'overshootK': str(overshoot),
        'arithmeticAllowanceK': str(allowance)}
    return overshoot, undershoot, allowance


def self_checks():
    bounds = [D(500), D(1000)]
    unit = D(10)**(D(1000).adjusted()-getcontext().prec+1)
    accepted = passive_bounds(bounds, [D(1000)+unit]*129)
    rejected = False
    try:
        passive_bounds(bounds, [D(1000)+D('1e-30')]*129)
    except AssertionError:
        rejected = True
    assert rejected, 'A physically larger passive-bound violation must reject'
    return {'oneULPOvershootAcceptedK': str(accepted[0]),
            'arithmeticAllowanceK': str(accepted[2]),
            'overshoot1eMinus30KRejected': rejected}


def solve(case):
    c = case['config']
    n = c['cells']
    ri, length, thickness = map(D, (c['radiusM'], c['lengthM'], c['thicknessM']))
    edges = list(map(D, c['radiusEdgesM'])) if 'radiusEdgesM' in c else [ri+thickness*i/n for i in range(n+1)]
    assert len(edges) == n+1 and all(b > a for a, b in zip(edges, edges[1:]))
    assert abs(edges[0]-ri) < D('1e-14') and abs(edges[-1]-ri-thickness) < D('1e-14')
    cg, film, cooling, coolant = map(D, (c['gasCapacityJK'], c['gasWallWK'], c['coolingWK'], c['coolantK']))
    assert cg > 0 and film >= 0 and cooling >= 0
    material = c.get('material')
    rho = D(material['densityKgM3']) if material else D(19250)
    factor = 2*PI*length
    centers = [(a*b).sqrt() for a, b in zip(edges, edges[1:])]
    masses = [rho*factor*(b-a)*(b+a)/2 for a, b in zip(edges, edges[1:])]
    left_log = [(x/a).ln()/factor for a, x in zip(edges[:-1], centers)]
    right_log = [(b/x).ln()/factor for b, x in zip(edges[1:], centers)]

    def cp(t):
        if material:
            return D(material['cpJKgK'])
        u = t/1000
        return (D('23.95930')+D('2.639680')*u+D('1.257750')*u*u-D('.254642')*u**3-D('.048407')/u**2)/D('.18384')

    def h(t):
        if material:
            return D(material['cpJKgK'])*(t-300)
        def primitive(u):
            return D('23.95930')*u+D('2.639680')*u*u/2+D('1.257750')*u**3/3-D('.254642')*u**4/4+D('.048407')/u
        return (primitive(t/1000)-primitive(D('.3')))*1000/D('.18384')

    def conductivity(t):
        if material:
            return D(material['kWMK'])
        return D('149.441')-D('.045466')*t+D('13.193e-6')*t*t-D('1.484e-9')*t**3+D('3.866e6')/(t*t)

    def energy(v):
        return [cg*v[0], *[m*h(t) for m, t in zip(masses, v[1:], strict=True)]]

    def conductances(v):
        ks = [conductivity(t) for t in v[1:]]
        inner = 1/(1/film+left_log[0]/ks[0]) if film else ZERO
        links = [inner, *[1/(right_log[i]/ks[i]+left_log[i+1]/ks[i+1]) for i in range(n-1)]]
        outer = 1/(1/cooling+right_log[-1]/ks[-1]) if cooling else ZERO
        return links, outer

    values = [D(case['initial']['gasK']), *map(D, case['initial']['wallK'])]
    states, cumulative_cooling = [], ZERO
    maximum_overshoot = maximum_undershoot = maximum_allowance = ZERO
    for step in case['steps']:
        dt, old = D(step['dtS']), values.copy()
        assert dt > 0 and len(old) == n+1
        old_energy = energy(old)
        deposit = [D(step.get('gasEnergyJ', 0)), D(step.get('linerEnergyJ', 0))]+[ZERO]*(n-1)
        if 'cellEnergyJ' in step:
            deposit = [a+D(b) for a, b in zip(deposit, step['cellEnergyJ'], strict=True)]
        for iteration in range(300):
            capacities = [cg, *[m*((h(t)-h(t0))/(t-t0) if t != t0 else cp(t)) for m, t, t0 in zip(masses, values[1:], old[1:], strict=True)]]
            gs, go = conductances(values)
            links, outer = [dt*g for g in gs], dt*go
            diagonal, rhs = [], []
            # Independent absolute-temperature Thomas elimination.
            for i in range(n+1):
                left, right = links[i-1] if i else ZERO, links[i] if i < n else ZERO
                pivot = capacities[i]+left+right+(outer if i == n else ZERO)
                load = capacities[i]*old[i]+deposit[i]+(outer*coolant if i == n else ZERO)
                if i:
                    ratio = left/diagonal[-1]
                    pivot -= ratio*left
                    load += ratio*rhs[-1]
                assert pivot > 0
                diagonal.append(pivot)
                rhs.append(load)
            new = [ZERO]*(n+1)
            new[-1] = rhs[-1]/diagonal[-1]
            for i in range(n-1, -1, -1):
                new[i] = (rhs[i]+links[i]*new[i+1])/diagonal[i]
            new_energy = energy(new)
            actual_gs, actual_go = conductances(new)
            flux = [dt*g*(a-b) for g, a, b in zip(actual_gs, new[:-1], new[1:], strict=True)]
            cooling_j = dt*actual_go*(new[-1]-coolant)
            residual = [a-b-q for a, b, q in zip(new_energy, old_energy, deposit, strict=True)]
            for i, q in enumerate(flux):
                residual[i] += q
                residual[i+1] -= q
            residual[-1] += cooling_j
            change = max(abs(a-b) for a, b in zip(new, values, strict=True))
            values = new
            if max(map(abs, residual)) < D('1e-44') and change < D('1e-44'):
                break
        else:
            raise AssertionError((case['name'], 'Decimal iteration failed', str(max(map(abs, residual)))))
        assert new[0] > 0 and all(conductivity(t) > 0 and cp(t) > 0 for t in new[1:])
        if not material:
            assert all(300 <= t <= 1900 for t in new[1:])
        if not any(deposit):
            bounds = [*old, *([coolant] if cooling else [])]
            overshoot, undershoot, allowance = passive_bounds(bounds, new)
            maximum_overshoot = max(maximum_overshoot, overshoot)
            maximum_undershoot = max(maximum_undershoot, undershoot)
            maximum_allowance = max(maximum_allowance, allowance)
        cumulative_cooling += cooling_j
        q_w = actual_gs[0]*(new[0]-new[1])
        surface_k = new[0]-q_w/film if film else new[1]
        states.append({'gasK': float(new[0]), 'wallK': list(map(float, new[1:])),
                       'surfaceK': float(surface_k), 'gasToWallW': float(q_w),
                       'gasExchangeJ': float(flux[0]), 'coolingEnergyJ': float(cumulative_cooling),
                       'maximumResidualJ': str(max(map(abs, residual))), 'iterations': iteration+1})
    return {'name': case['name'], 'states': states,
            'maximumPassiveOvershootK': str(maximum_overshoot),
            'maximumPassiveUndershootK': str(maximum_undershoot),
            'maximumPassiveArithmeticAllowanceK': str(maximum_allowance)}


def main():
    parser = argparse.ArgumentParser()
    for name in ('cases', 'reference', 'output'):
        parser.add_argument(name, type=Path)
    parser.add_argument('names', nargs='+')
    args = parser.parse_args()
    inputs, reference = json.loads(args.cases.read_text()), json.loads(args.reference.read_text())
    assert reference['inputSHA256'] == hashlib.sha256(args.cases.read_bytes()).hexdigest(), 'Exact independent case packet'
    records = reference.get('cases', [reference])
    lookup = records if isinstance(records, dict) else {c['name']: c for c in records}
    chosen = [c for c in inputs['cases'] if c['name'] in args.names]
    assert set(args.names) == {c['name'] for c in chosen}
    assert all(len(c['steps']) <= 10 for c in chosen), 'Only selected short early-time cases qualify for this audit'
    with localcontext() as context:
        context.prec = 80
        checks = self_checks()
        solved = [solve(c) for c in chosen]
    maximum_temperature = maximum_cooling = 0.
    for result in solved:
        wanted = lookup[result['name']]['states']
        assert len(wanted) == len(result['states'])
        for actual, want in zip(result['states'], wanted, strict=True):
            error = max(abs(actual['gasK']-want['gasK']), *[abs(a-b) for a, b in zip(actual['wallK'], want['wallK'], strict=True)])
            maximum_temperature = max(maximum_temperature, error)
            maximum_cooling = max(maximum_cooling, abs(actual['coolingEnergyJ']-want['coolingEnergyJ']))
            assert error <= 2e-7, (result['name'], 'temperature K', error)
            assert abs(actual['coolingEnergyJ']-want['coolingEnergyJ']) <= 1e-7+1e-9*abs(actual['coolingEnergyJ'])
    digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    output = {'allPass': True, 'arithmetic': '80-digit Decimal',
              'solver': 'Independent absolute-temperature Thomas / exact enthalpy secants',
              'scope': 'Selected early fine-mesh steps, not full-history independent advancement',
              'temperatureGateK': 2e-7, 'maximumFiPyDifferenceK': maximum_temperature,
              'maximumCoolingDifferenceJ': maximum_cooling, 'cases': solved,
              'selfChecks': checks,
              'maximumPassiveOvershootK': str(max(D(c['maximumPassiveOvershootK']) for c in solved)),
              'maximumPassiveUndershootK': str(max(D(c['maximumPassiveUndershootK']) for c in solved)),
              'maximumPassiveArithmeticAllowanceK': str(max(D(c['maximumPassiveArithmeticAllowanceK']) for c in solved)),
              'passiveArithmeticAllowance': '8 * node count * Decimal ULP at bound temperature; not a rigorous accumulated error bound',
              'caseNames': [c['name'] for c in solved], 'checkedStates': sum(len(c['states']) for c in solved),
              'inputSHA256': digest(args.cases), 'referenceSHA256': digest(args.reference),
              'scriptSHA256': digest(Path(__file__))}
    args.output.write_text(json.dumps(output, indent=2)+'\n')
    print(json.dumps({k: v for k, v in output.items() if k != 'cases'}, indent=2))


if __name__ == '__main__':
    main()
