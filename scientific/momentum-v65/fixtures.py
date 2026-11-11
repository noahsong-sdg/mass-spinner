"""Frozen independent physical fixtures; execute offline inside safe-dev."""
import json
import math
from pathlib import Path
import sys
from scipy.special import j1, jn_zeros

cases = []


def add(name, n, a, b, mu, rho, inner, outer, dt, steps, kind, stretch=1):
    edges = [a+(b-a)*(i/n)**stretch for i in range(n+1)]
    radius = [(edges[i]+edges[i+1])/2 for i in range(n)]
    field = lambda value: [value(r) if callable(value) else value for r in radius]
    case = {'id': name, 'kind': kind, 'edgesM': edges, 'lengthM': 1.,
            'densityKgM3': field(rho), 'viscosityPaS': field(mu),
            'innerWallRadS': inner, 'outerWallRadS': outer,
            'torqueNm': [0.]*n, 'initialOmegaRadS': [0.]*n,
            'dtS': dt, 'steps': steps}
    cases.append(case)
    return case, radius


for n in (16, 32, 64, 128):
    add(f'couette-n{n}', n, 1., 2., 1., 1., 100., 0., .01, 200, 'couette')
    add(f'couette-stretched-n{n}', n, 1., 2., 1., 1., 100., 0., .01, 200, 'couette-stretched', 1.7)
for n in (32, 64, 128, 256):
    c, _ = add(f'couette-material-n{n}', n, 1., 2., 1., 1., 100., 0., .01, 200, 'couette-material')
    m, interface = n//2, 1.37
    c['edgesM'] = [1+.37*(i/m)**1.3 for i in range(m+1)]+[interface+.63*(j/m)**1.2 for j in range(1, m+1)]
    c['viscosityPaS'] = [1. if (a+b)/2 < interface else 5. for a, b in zip(c['edgesM'][:-1], c['edgesM'][1:])]
    c.update({'viscosityInterfaceM': interface, 'innerViscosityPaS': 1., 'outerViscosityPaS': 5.})
for n in (32, 64, 128, 256, 512):
    c, radius = add(f'core-annulus-n{n}', n, 0., .06, 1., 1., None, 0.,
                    .000036, 200, 'core-annulus')
    c['driveInnerRadiusM'] = .0075
    # Choose K=IB/(4π L mu)=1, with signed current producing positive torque.
    c['currentA'], c['magneticT'] = -4*math.pi, 1.
    c['torqueNm'] = [2*math.pi*max(0., ro**2-max(ri, .0075)**2)
                     for ri, ro in zip(c['edgesM'][:-1], c['edgesM'][1:])]
for kind, counts in (('variable', (32, 64, 128, 256)), ('variable-shifted', (31, 63, 127, 255))):
    for n in counts:
        c, radius = add(f'{kind}-n{n}', n, 0., 1., lambda r: .2 if r < .5 else 1.,
                        lambda r: 1+r*r, None, 0., .002, 50, kind)
        c['initialOmegaRadS'] = [math.cos(math.pi*r/2) for r in radius]
        c['torqueNm'] = [math.pi*(ro**2-ri**2)*(.1*math.sin(2*math.pi*r))
                         for ri, ro, r in zip(c['edgesM'][:-1], c['edgesM'][1:], radius)]
k = float(jn_zeros(1, 1)[0])
for count in (100, 200, 400, 800):
    c, radius = add(f'bessel-t{count}', 256, 0., 1., 1., 1., None, 0., .1/count, count, 'bessel')
    c['initialOmegaRadS'] = [float(2*j1(k*r)/(k*r)) for r in radius]
    c['eigenvalue'] = k
destination = Path(sys.argv[1]); destination.parent.mkdir(parents=True, exist_ok=True)
with destination.open('x') as stream:
    json.dump({'schemaVersion': 1, 'cases': cases}, stream, indent=2, allow_nan=False)
print(json.dumps({'cases': len(cases), 'file': str(destination)}))
