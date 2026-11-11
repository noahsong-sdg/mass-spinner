"""Independent 80-digit annular enthalpy solve; run only inside safe-dev.

Usage: audit-numerics.py cases.json fipy.json audit.json [case-name ...]
No production or FiPy modules are imported. The unchanged physical balances
are solved with Decimal arithmetic and a separate Thomas elimination.
"""
from decimal import Decimal, localcontext
import hashlib
import json
import math
from pathlib import Path
import sys


def D(value):
    return Decimal(str(value))


def solve(case):
    c = case['config']
    n = c['cells']
    ri, length, thickness = map(D, (c['radiusM'], c['lengthM'], c['thicknessM']))
    cg, film, cooling, coolant = map(D, (c['gasCapacityJK'], c['gasWallWK'], c['coolingWK'], c['coolantK']))
    material = c.get('material')
    rho = D(material['densityKgM3']) if material else D(19250)
    geometric = 2*D(math.pi)*length
    edges = [ri+thickness*i/n for i in range(n+1)]
    centers = [(edges[i]*edges[i+1]).sqrt() for i in range(n)]
    masses = [rho*geometric*(edges[i+1]**2-edges[i]**2)/2 for i in range(n)]

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

    def k(t):
        if material:
            return D(material['kWMK'])
        return D('149.441')-D('.045466')*t+D('13.193e-6')*t*t-D('1.484e-9')*t**3+D('3.866e6')/(t*t)

    def energy(values):
        return [cg*values[0], *[mass*h(t) for mass,t in zip(masses,values[1:],strict=True)]]

    def conductances(values):
        conductivity = [k(t) for t in values[1:]]
        inner = 1/(1/film+(centers[0]/ri).ln()/(geometric*conductivity[0])) if film else D(0)
        internal = [geometric/((edges[i+1]/centers[i]).ln()/conductivity[i]+(centers[i+1]/edges[i+1]).ln()/conductivity[i+1]) for i in range(n-1)]
        outer = 1/(1/cooling+(edges[-1]/centers[-1]).ln()/(geometric*conductivity[-1])) if cooling else D(0)
        return [inner,*internal],outer

    values = [D(case['initial']['gasK']), *map(D,case['initial']['wallK'])]
    assert len(values) == n+1 and cg > 0
    states, total_cooling, max_residual = [], D(0), D(0)
    for step_index, step in enumerate(case['steps']):
        dt = D(step['dtS'])
        old = list(values)
        old_energy = energy(old)
        deposit = [D(0)]*(n+1)
        deposit[0] = D(step.get('gasEnergyJ',0))
        deposit[1] = D(step.get('linerEnergyJ',0))
        if 'cellEnergyJ' in step:
            deposit = [a+D(b) for a,b in zip(deposit,step['cellEnergyJ'],strict=True)]
        for iteration in range(300):
            capacities = [cg, *[mass*((h(t)-h(t0))/(t-t0) if t != t0 else cp(t)) for mass,t,t0 in zip(masses,values[1:],old[1:],strict=True)]]
            links, outer = conductances(values)
            links = [dt*g for g in links]
            outer *= dt
            diagonal, rhs = [], []
            for i in range(n+1):
                left = links[i-1] if i else D(0)
                right = links[i] if i < n else D(0)
                diag = capacities[i]+left+right+(outer if i == n else D(0))
                b = capacities[i]*old[i]+deposit[i]+(outer*coolant if i == n else D(0))
                if i:
                    multiplier = left/diagonal[-1]
                    diag -= multiplier*left
                    b += multiplier*rhs[-1]
                assert diag > 0
                diagonal.append(diag)
                rhs.append(b)
            candidate = [D(0)]*(n+1)
            candidate[-1] = rhs[-1]/diagonal[-1]
            for i in range(n-1,-1,-1):
                candidate[i] = (rhs[i]+links[i]*candidate[i+1])/diagonal[i]
            new_energy = energy(candidate)
            actual, actual_outer = conductances(candidate)
            flux = [dt*g*(a-b) for g,a,b in zip(actual,candidate[:-1],candidate[1:],strict=True)]
            cooling_energy = dt*actual_outer*(candidate[-1]-coolant)
            residual = [a-b-q for a,b,q in zip(new_energy,old_energy,deposit,strict=True)]
            for i,q in enumerate(flux):
                residual[i] += q
                residual[i+1] -= q
            residual[-1] += cooling_energy
            change = max(abs(a-b) for a,b in zip(candidate,values,strict=True))
            values = candidate
            physical_residual = max(map(abs,residual))
            if physical_residual < D('1e-48') and change < D('1e-48'):
                break
        else:
            raise AssertionError((case['name'],step_index,str(physical_residual),str(change)))
        assert values[0] > 0
        if not material:
            assert all(300 <= t <= 1900 for t in values[1:])
        assert all(k(t) > 0 and cp(t) > 0 for t in values[1:])
        total_cooling += cooling_energy
        max_residual = max(max_residual,physical_residual)
        states.append({'gasK':float(values[0]),'wallK':list(map(float,values[1:])),
                       'coolingEnergyJ':float(total_cooling),'maximumResidualJ':str(physical_residual),
                       'globalResidualJ':str(sum(residual)),'iterations':iteration+1})
    return {'name':case['name'],'states':states,'maximumResidualJ':str(max_residual)}


def main():
    inputs_path, reference_path, output_path = map(Path,sys.argv[1:4])
    selected = set(sys.argv[4:])
    inputs = json.loads(inputs_path.read_text())
    reference = json.loads(reference_path.read_text())
    reference_cases = reference['cases'] if isinstance(reference['cases'],dict) else {case['name']:case for case in reference['cases']}
    cases = [case for case in inputs['cases'] if not selected or case['name'] in selected]
    assert cases and (not selected or selected == {case['name'] for case in cases})
    if 'qualificationPass' in reference:
        assert reference['qualificationPass'] is True
        assert all(reference['physicalChecks'][case['name']]['allPass'] is True for case in cases)
    else:
        assert reference['allPass'] is True
    with localcontext() as context:
        context.prec = 80
        solved = [solve(case) for case in cases]
    max_error = 0.
    for result in solved:
        expected = reference_cases[result['name']]
        assert len(result['states']) == len(expected['states'])
        for actual, want in zip(result['states'],expected['states'],strict=True):
            error = max(abs(actual['gasK']-want['gasK']), *[abs(a-b) for a,b in zip(actual['wallK'],want['wallK'],strict=True)])
            max_error = max(max_error,error)
            assert error <= 2e-7, (result['name'],error)
            assert abs(actual['coolingEnergyJ']-want['coolingEnergyJ']) <= 1e-7+1e-9*abs(actual['coolingEnergyJ'])
    digest = lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
    output = {'allPass':True,'arithmetic':'80-digit Decimal','solver':'Independent absolute-temperature tridiagonal enthalpy iteration',
              'temperatureGateK':2e-7,'maximumFiPyDifferenceK':max_error,'cases':solved,
              'referenceAllPass':reference['allPass'],
              'referenceQualificationPass':reference.get('qualificationPass'),
              'caseNames':[case['name'] for case in solved],'checkedStates':sum(len(case['states']) for case in solved),
              'inputSHA256':digest(inputs_path),'referenceSHA256':digest(reference_path),'scriptSHA256':digest(Path(__file__))}
    output_path.write_text(json.dumps(output,indent=2)+'\n')
    print(json.dumps({key:value for key,value in output.items() if key != 'cases'},indent=2))


if __name__ == '__main__':
    main()
