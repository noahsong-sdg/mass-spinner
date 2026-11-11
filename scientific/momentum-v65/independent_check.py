"""Independent fixed-density angular-momentum audit; stdlib only.

Execute only in parent's offline safe-dev guest. No production imports.
CLI: independent_check.py cases.json predictions.json new-audit.json
"""
import hashlib
import json
import math
from pathlib import Path
import sys

LEDGERS = ('driveWorkJ', 'wallWorkJ', 'shearHeatJ', 'numericalLossJ',
           'driveImpulseKgM2S', 'wallImpulseKgM2S')


def finite(x, name):
    if isinstance(x, bool) or not isinstance(x, (float, int)) or not math.isfinite(x):
        raise ValueError(name+' must be a finite number')
    return x


def positive(x, name):
    if finite(x, name) <= 0:
        raise ValueError(name+' must be positive')
    return x


def close(actual, expected, name, scale=0, tolerance=1e-9):
    finite(actual, name)
    denominator = max(abs(expected), abs(actual), abs(scale), 1e-300)
    error = abs(actual-expected)/denominator
    if error > tolerance:
        raise ValueError(name+' differs from independent reconstruction: '+str(error))
    return error


def geometry(spec):
    edges = spec['edgesM']
    n = len(edges)-1
    if n < 2:
        raise ValueError('At least two radial cells required')
    if any(finite(r, 'radial edge') < 0 for r in edges) or any(b <= a for a, b in zip(edges, edges[1:])):
        raise ValueError('Edges must increase from a nonnegative radius')
    if edges[0] == 0 and spec['innerWallRadS'] is not None:
        raise ValueError('An axis is not a rotating solid wall')
    length = positive(spec['lengthM'], 'length')
    rho, mu = spec['densityKgM3'], spec['viscosityPaS']
    if len(rho) != n or len(mu) != n:
        raise ValueError('Material arrays must share the radial grid')
    for value in rho:
        positive(value, 'density')
    for value in mu:
        positive(value, 'viscosity')
    centers = [(a+b)/2 for a, b in zip(edges, edges[1:])]
    inertia = [math.pi*length*r*(b**4-a**4)/2 for a, b, r in zip(edges, edges[1:], rho)]
    conductance = []
    for i in range(n-1):
        left, face, right = centers[i], edges[i+1], centers[i+1]
        resistance = ((1/left**2-1/face**2)/mu[i]+(1/face**2-1/right**2)/mu[i+1])/(4*math.pi*length)
        conductance.append(1/positive(resistance, 'face resistance'))
    wall_g = []
    for which, edge, center, viscosity in [('innerWallRadS', edges[0], centers[0], mu[0]),
                                          ('outerWallRadS', edges[-1], centers[-1], mu[-1])]:
        wall = spec[which]
        if wall is not None:
            finite(wall, which)
        if wall is None or edge == 0:
            wall_g.append(0.0)
        else:
            resistance = abs(1/edge**2-1/center**2)/(4*math.pi*length*viscosity)
            wall_g.append(1/positive(resistance, 'boundary resistance'))
    return centers, inertia, conductance, wall_g


def factor(diagonal, off_diagonal):
    # Symmetric LDL^T, independently derived; factor once per constant case.
    pivots = [diagonal[0]]
    factors = []
    positive(pivots[0], 'first SPD pivot')
    for i, off in enumerate(off_diagonal):
        multiplier = off/pivots[-1]
        factors.append(multiplier)
        pivots.append(positive(diagonal[i+1]-multiplier*off, 'SPD pivot'))
    return pivots, factors


def solve(factors, rhs):
    pivots, multipliers = factors
    forward = [rhs[0]]
    for i in range(1, len(rhs)):
        forward.append(rhs[i]-multipliers[i-1]*forward[-1])
    values = [value/pivot for value, pivot in zip(forward, pivots)]
    for i in range(len(values)-2, -1, -1):
        values[i] -= multipliers[i]*values[i+1]
    return values


def analytic_profile(spec, centers):
    mu = spec['viscosityPaS']
    if max(mu)-min(mu) > 1e-12*max(mu):
        return None
    edges, torques = spec['edgesM'], spec['torqueNm']
    inner, outer = spec['innerWallRadS'], spec['outerWallRadS']
    if all(t == 0 for t in torques) and edges[0] > 0 and inner is not None and outer is not None:
        coefficient = (inner-outer)/(1/edges[0]**2-1/edges[-1]**2)
        base = outer-coefficient/edges[-1]**2
        return {'kind': 'unforced constant-mu Couette steady state',
                'omegaRadS': [base+coefficient/r**2 for r in centers]}
    cutoff = spec.get('driveInnerRadiusM')
    if cutoff is None or not 0 < cutoff < edges[-1] or edges[0] != 0 or inner is not None or outer is None:
        return None
    factors = []
    for a, b, torque in zip(edges, edges[1:], torques):
        span = max(0, b*b-cutoff*cutoff)-max(0, a*a-cutoff*cutoff)
        if span:
            factors.append(torque/span)
        elif torque != 0:
            return None
    if not factors or max(factors)-min(factors) > 1e-10*max(abs(x) for x in factors):
        return None
    coefficient = factors[0]/(2*math.pi*spec['lengthM']*mu[0])
    radius = edges[-1]
    values = []
    for center in centers:
        r = max(center, cutoff)
        values.append(outer+coefficient*(math.log(radius/r)+.5*cutoff**2*(1/radius**2-1/r**2)))
    return {'kind': 'constant-mu full-cylinder steady drive outside cutoff', 'omegaRadS': values}


def audit_case(spec, exported):
    if exported['spec'] != spec:
        raise ValueError('Exported input differs from frozen case '+spec['id'])
    centers, inertia, conductance, wall_g = geometry(spec)
    n = len(inertia)
    dt = positive(spec['dtS'], 'time step')
    steps = spec['steps']
    if isinstance(steps, bool) or not isinstance(steps, int) or steps < 1:
        raise ValueError('Need a positive integer step count')
    old = spec['initialOmegaRadS']
    torques = spec['torqueNm']
    if len(old) != n or len(torques) != n:
        raise ValueError('State and source must share grid')
    for value in old+torques:
        finite(value, 'state/source')
    if len(exported['states']) != steps+1:
        raise ValueError('All steps plus the initial state must be exported')
    inner, outer = spec['innerWallRadS'], spec['outerWallRadS']
    diagonal = [inertia[i]+dt*((conductance[i-1] if i else wall_g[0])+
                             (conductance[i] if i < n-1 else wall_g[1])) for i in range(n)]
    off = [-dt*g for g in conductance]
    decomposition = factor(diagonal, off)
    ledger = {key: 0.0 for key in LEDGERS}
    initial_l = math.fsum(i*w for i, w in zip(inertia, old))
    initial_k = .5*math.fsum(i*w*w for i, w in zip(inertia, old))
    maxima = {'omegaRelative': 0.0, 'equationRelative': 0.0,
              'ledgerRelative': 0.0, 'angularRelative': 0.0, 'energyRelative': 0.0}
    for step, state in enumerate(exported['states']):
        if step:
            rhs = [i*w+dt*t for i, w, t in zip(inertia, old, torques)]
            rhs[0] += dt*wall_g[0]*(inner or 0)
            rhs[-1] += dt*wall_g[1]*(outer or 0)
            current = solve(decomposition, rhs)
            for index, value in enumerate(current):
                terms = [diagonal[index]*value, -rhs[index]]
                if index:
                    terms.append(off[index-1]*current[index-1])
                if index < n-1:
                    terms.append(off[index]*current[index+1])
                equation_error = close(math.fsum(terms), 0, 'independent linear equation residual',
                                       scale=math.fsum(abs(t) for t in terms))
                maxima['equationRelative'] = max(maxima['equationRelative'], equation_error)
            wall_torque = [wall_g[0]*((inner or 0)-current[0]), wall_g[1]*((outer or 0)-current[-1])]
            increments = {'driveWorkJ': dt*math.fsum(t*w for t, w in zip(torques, current)),
                          'wallWorkJ': dt*(wall_torque[0]*(inner or 0)+wall_torque[1]*(outer or 0)),
                          'shearHeatJ': dt*(math.fsum(g*(b-a)**2 for g, a, b in zip(conductance, current, current[1:]))+
                                           wall_g[0]*(current[0]-(inner or 0))**2+
                                           wall_g[1]*(current[-1]-(outer or 0))**2),
                          'numericalLossJ': .5*math.fsum(i*(b-a)**2 for i, a, b in zip(inertia, old, current)),
                          'driveImpulseKgM2S': dt*math.fsum(torques),
                          'wallImpulseKgM2S': dt*math.fsum(wall_torque)}
            for key in LEDGERS:
                ledger[key] += increments[key]
        else:
            current = old[:]
        close(state['timeS'], dt*step, 'shared observation time', scale=dt)
        actual = state['omegaRadS']
        if len(actual) != n:
            raise ValueError('Exported state grid mismatch')
        omega_scale = max(max(abs(w) for w in current), max(abs(w) for w in old), 1e-300)
        for a, b in zip(actual, current):
            maxima['omegaRelative'] = max(maxima['omegaRelative'], close(a, b, 'independent angular velocity', scale=omega_scale))
        momentum = math.fsum(i*w for i, w in zip(inertia, current))
        kinetic = .5*math.fsum(i*w*w for i, w in zip(inertia, current))
        l_scale = math.fsum(abs(i*w) for i, w in zip(inertia, current)) + abs(initial_l)
        e_scale = abs(kinetic)+abs(initial_k)+sum(abs(ledger[k]) for k in LEDGERS[:4])
        close(state['angularMomentumKgM2S'], momentum, 'reported angular momentum', scale=l_scale)
        close(state['kineticJ'], kinetic, 'reported kinetic energy', scale=e_scale)
        for key in LEDGERS:
            scale = l_scale+abs(ledger['driveImpulseKgM2S'])+abs(ledger['wallImpulseKgM2S']) if 'Impulse' in key else e_scale
            maxima['ledgerRelative'] = max(maxima['ledgerRelative'], close(state['cumulative'][key], ledger[key], key, scale=scale))
        angular_residual = momentum-initial_l-ledger['driveImpulseKgM2S']-ledger['wallImpulseKgM2S']
        energy_residual = kinetic-initial_k-ledger['driveWorkJ']-ledger['wallWorkJ']+ledger['shearHeatJ']+ledger['numericalLossJ']
        a_scale = l_scale+abs(ledger['driveImpulseKgM2S'])+abs(ledger['wallImpulseKgM2S'])
        maxima['angularRelative'] = max(maxima['angularRelative'], close(angular_residual, 0, 'angular impulse balance', scale=a_scale))
        maxima['energyRelative'] = max(maxima['energyRelative'], close(energy_residual, 0, 'mechanical energy balance', scale=e_scale))
        old = current
    steady = analytic_profile(spec, centers)
    if steady is not None:
        scale = max(abs(w) for w in steady['omegaRadS'])
        difference = max(abs(a-b) for a, b in zip(current, steady['omegaRadS']))
        steady['lastStateMaxAbsoluteDifferenceRadS'] = difference
        steady['lastStateMaxRelativeDifference'] = difference/scale if scale else None
        steady['qualification'] = 'Steady-reference difference; finite-time residual and discretization both contribute'
    return {'id': spec['id'], 'stepsChecked': steps, 'cells': n, 'maxima': maxima,
            'analyticReference': steady, 'numericalChecksPassed': True,
            'experimentalValidation': False}


def audit(inputs, outputs):
    expected = inputs['cases']
    actual = outputs['cases']
    ids = [case['id'] for case in expected]
    if not ids or len(set(ids)) != len(ids) or len(actual) != len(expected):
        raise ValueError('Need all distinct frozen cases')
    return {'method': 'Independent symmetric LDL^T; no production imports',
            'experimentalValidation': False,
            'cases': [audit_case(spec, result) for spec, result in zip(expected, actual)]}


def invalid_constant(value):
    raise ValueError('Nonfinite JSON constant '+value)


if __name__ == '__main__':
    source, predictions = Path(sys.argv[1]), Path(sys.argv[2])
    raw, predicted_raw = source.read_bytes(), predictions.read_bytes()
    result = audit(json.loads(raw, parse_constant=invalid_constant),
                   json.loads(predicted_raw, parse_constant=invalid_constant))
    result.update({'sourceSHA256': hashlib.sha256(raw).hexdigest(),
                   'predictionSHA256': hashlib.sha256(predicted_raw).hexdigest()})
    encoded = json.dumps(result, indent=2, allow_nan=False)+'\n'
    if len(sys.argv) > 3:
        with Path(sys.argv[3]).open('x') as stream:
            stream.write(encoded)
    print(encoded)
