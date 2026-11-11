"""Run one actual-FiPy case; all execution belongs in offline safe-dev.

Preserve the full accepted history compressed and a small sampled JSON with
physical observables and previous/step rows for independent audits.
"""
from pathlib import Path
import gzip
import hashlib
import importlib.util
import json
import math
import sys
import numpy as np

ORACLE = Path(__file__).resolve().parents[1]/'thermal-v53/reference-fipy.py'
spec = importlib.util.spec_from_file_location('fast_fipy', ORACLE)
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)


def geometry(c):
    e = np.asarray(c.get('radiusEdgesM', np.linspace(c['radiusM'], c['radiusM']+c['thicknessM'], c['cells']+1)), dtype=float)
    x = np.sqrt(e[:-1]*e[1:])
    rho = c.get('material', {}).get('densityKgM3', 19250.)
    mass = rho*math.pi*c['lengthM']*np.diff(e)*(e[1:]+e[:-1])
    return e, x, mass


def changes(new, old, material=None, entropy=False):
    d = new-old
    if material:
        return material['cpJKgK']*(np.log1p(d/old) if entropy else d)
    a,b,c,d3,e = 23.95930, .002639680, .000001257750, -.000000000254642, -48407.
    if entropy:
        return (a*np.log1p(d/old)+b*d+c*d*(new+old)/2
                +d3*d*(new*new+new*old+old*old)/3
                +e*d*(new+old)/(2*new*new*old*old))/.18384
    return d*(a+b*(new+old)/2+c*(new*new+new*old+old*old)/3
              +d3*(new**3+new*new*old+new*old*old+old**3)/4+e/(new*old))/.18384


def observables(c, state, exchange, depths):
    e,x,_ = geometry(c)
    wall = np.asarray(state['wallK'])
    k = reference.conductivity(wall, c.get('material'))
    factor = 2*math.pi*c['lengthM']
    inner = 1/(1/c['gasWallWK']+math.log(x[0]/e[0])/(factor*k[0]))
    outer = 0. if c['coolingWK'] == 0 else 1/(1/c['coolingWK']+math.log(e[-1]/x[-1])/(factor*k[-1]))
    power = inner*(state['gasK']-wall[0])  # positive gas -> solid
    surface = state['gasK']-power/c['gasWallWK']
    outer_surface = wall[-1] if c['coolingWK'] == 0 else c['coolantK']+outer*(wall[-1]-c['coolantK'])/c['coolingWK']
    xp = np.r_[0., x-e[0], e[-1]-e[0]]
    yp = np.r_[surface, wall, outer_surface]
    assert min(depths) >= xp[0] and max(depths) <= xp[-1], 'No profile extrapolation'
    return {'innerSurfaceK': float(surface), 'outerSurfaceK': float(outer_surface),
            'interfacePowerW': float(power), 'cumulativeGasExchangeJ': exchange,
            'depthProfileK': np.interp(depths, xp, yp).tolist()}


def analyze_steps(case, result, packet):
    c, initial = case['config'], case['initial']
    _,_,masses = geometry(c)
    cg, coolant, material = c['gasCapacityJK'], c['coolantK'], c.get('material')
    initial_wall = np.asarray(initial['wallK'])
    old = np.asarray([initial['gasK'], *initial['wallK']])
    scale = 1+cg*old[0]+float(np.dot(masses, reference.cp(old[1:], material)*old[1:]))
    exchange, cooling_old, max_energy, max_gas = 0., 0., 0., 0.
    minimum_entropy, maximum_entropy_budget = math.inf, 0.
    dt = case['steps'][0]['dtS']
    indices = {round(t*packet['gasFilmTimeS']/dt): t for t in packet['checkpointsTau']
               if t*packet['gasFilmTimeS'] <= case['study']['durationS']*(1+1e-12)}
    assert all(abs(i*dt-t*packet['gasFilmTimeS']) < 1e-18 for i,t in indices.items())
    # The continuum right limit is known despite the incompatible initial Robin
    # gradient; a finite-cell half resistance is not treated as exact t=0 data.
    samples = [{'timeS': 0., 'gasK': initial['gasK'], 'wallK': initial['wallK'],
                'innerSurfaceK': 1000., 'outerSurfaceK': 1000.,
                'interfacePowerW': -500000., 'cumulativeGasExchangeJ': 0.,
                'depthProfileK': [1000.]*len(packet['profileDepthsM']),
                'initialContinuumRightLimit': True}]
    for index, (step, state) in enumerate(zip(case['steps'], result['states'], strict=True), 1):
        new = np.asarray([state['gasK'], *state['wallK']])
        assert np.all(np.isfinite(new)) and np.min(new) >= 500-1e-8 and np.max(new) <= 1000+1e-8
        exchange += state['gasExchangeJ']
        max_gas = max(max_gas, abs(cg*(new[0]-initial['gasK'])+exchange))
        cooling = state['coolingEnergyJ']
        balance = cg*(new[0]-initial['gasK'])+float(np.dot(masses, changes(new[1:], initial_wall, material)))+cooling
        max_energy = max(max_energy, abs(balance)/scale)
        bath = (cooling-cooling_old)/coolant
        ds = cg*math.log1p((new[0]-old[0])/old[0])+float(np.dot(masses, changes(new[1:], old[1:], material, entropy=True)))
        budget = 8*np.finfo(float).eps*(1+cg+float(np.dot(masses, reference.cp(new[1:], material)))+abs(bath))
        assert ds+bath >= -budget, ('Passive entropy decrease', case['name'], index, ds+bath, budget)
        minimum_entropy = min(minimum_entropy, ds+bath)
        maximum_entropy_budget = max(maximum_entropy_budget, budget)
        if index in indices:
            samples.append({**state, **observables(c, state, exchange, packet['profileDepthsM']),
                'timeS': indices[index]*packet['gasFilmTimeS'],
                'previous': {'gasK': float(old[0]), 'wallK': old[1:].tolist()}, 'step': step})
        old, cooling_old = new, cooling
    assert max_energy < 1e-9 and max_gas < 1e-9, (case['name'], max_energy, max_gas)
    return samples, {'maximumRelativeEnergyBalance': max_energy,
        'maximumGasLedgerResidualJ': max_gas, 'minimumEntropyIncrementJK': minimum_entropy,
        'maximumEntropyRoundoffBudgetJK': maximum_entropy_budget,
        'acceptedSteps': len(result['states']), 'passiveBoundsK': [500,1000], 'allPass': True}


source, directory, name = sys.argv[1:4]
packet = json.loads(Path(source).read_text())
case = next(c for c in packet['cases'] if c['name'] == name)
out = Path(directory); out.mkdir(parents=True, exist_ok=True)
target = out/(name+'.json'); assert not target.exists()
result = reference.run_case(case)
states_file = name+'.states.json.gz'
with gzip.open(out/states_file, 'wt') as stream:
    json.dump(result, stream, separators=(',', ':'))
samples, physical = analyze_steps(case, result, packet)
record = {'name': name, 'config': case['config'], 'initial': case['initial'],
          'study': case['study'], 'stepsUniform': case['steps'][0],
          'profileDepthsM': packet['profileDepthsM'],
          'samples': samples, 'statesFile': states_file, 'physicalChecks': physical,
          'maximumNonlinearResidual': result['maximumNonlinearResidual'],
          'inputSHA256': hashlib.sha256(Path(source).read_bytes()).hexdigest(),
          'oracleSHA256': hashlib.sha256(ORACLE.read_bytes()).hexdigest(),
          'scriptSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'statesSHA256': hashlib.sha256((out/states_file).read_bytes()).hexdigest(),
          'allPass': True}
if case['study']['family'] == 'audit-graded':
    record['states'] = result['states']
target.write_text(json.dumps(record, separators=(',', ':'))+'\n')
print(json.dumps({k:v for k,v in record.items() if k not in ('samples','states','initial','config')}, indent=2))
