"""Independent constant-property gas/film/semi-infinite-solid benchmark.

No finite-volume solver is imported. The half-space Laplace admittance is
A*sqrt(k*rho*Cp)*sqrt(s), in W/K. The inverse uses the transform pair in
NIST DLMF 7.14 and scipy.special.erfcx (complex arguments supported).
https://dlmf.nist.gov/7.14
https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.erfcx.html
Run only inside safe-dev. This is a short-time planar benchmark, not the
nonlinear cylindrical tungsten solution or a gas spatial model.
"""
import cmath
import math
from scipy.integrate import quad
from scipy.special import erfcx


def response(config, initial, time_s, depths_m=()):
    """q is signed gas -> wall, total W. Surface is the film/solid interface."""
    material = config['material']
    k, rho, cp = (material[key] for key in ('kWMK', 'densityKgM3', 'cpJKgK'))
    cg, film = config['gasCapacityJK'], config['gasWallWK']
    assert min(k, rho, cp, cg, film, config['radiusM'], config['lengthM']) > 0
    assert time_s >= 0 and all(x >= 0 for x in depths_m)
    wall0 = initial['wallK'][0]
    assert all(t == wall0 for t in initial['wallK']), 'Initially uniform half-space'
    gas0 = initial['gasK']
    area = 2*math.pi*config['radiusM']*config['lengthM']
    alpha, a = k/(rho*cp), film/cg
    b = film/(area*math.sqrt(k*rho*cp))
    root = cmath.sqrt(b*b-4*a)
    assert abs(root) > 1e-12*math.sqrt(a), 'Distinct-root benchmark domain'
    r1, r2 = (-b+root)/2, (-b-root)/2
    if time_s == 0:
        return {'timeS': 0., 'gasK': gas0, 'surfaceK': wall0,
                'gasToWallW': film*(gas0-wall0), 'gasToWallEnergyJ': 0.,
                'wallK': [wall0 for _ in depths_m]}
    st = math.sqrt(time_s)
    e1, e2 = erfcx(-r1*st), erfcx(-r2*st)
    f = (r2*e1-r1*e2)/(r2-r1)
    derivative = a*(r1*e1-r2*e2)/(r2-r1)
    assert abs(f.imag) < 1e-12 and abs(derivative.imag) < 1e-8
    gas = wall0+(gas0-wall0)*f.real
    flow = -cg*(gas0-wall0)*derivative.real
    surface = gas-flow/film
    wall = []
    for depth in depths_m:
        xi = depth/math.sqrt(alpha)
        def shifted(r):
            return math.exp(-xi*xi/(4*time_s))*erfcx(xi/(2*st)-r*st)
        theta = (gas0-wall0)*b*(shifted(r1)-shifted(r2))/(r1-r2)
        assert abs(theta.imag) < 1e-10
        wall.append(wall0+theta.real)
    return {'timeS': time_s, 'gasK': gas, 'surfaceK': surface,
            'gasToWallW': flow, 'gasToWallEnergyJ': -cg*(gas-gas0),
            'wallK': wall}


def self_checks():
    """Independent heat-kernel convolution and integrated gas energy checks."""
    config = {'radiusM': .12, 'lengthM': .5, 'gasCapacityJK': .000678584,
              'gasWallWK': 1000.,
              'material': {'kWMK': 120., 'densityKgM3': 19250., 'cpJKgK': 150.}}
    initial = {'gasK': 500., 'wallK': [1000.]}
    tau = config['gasCapacityJK']/config['gasWallWK']
    area = 2*math.pi*config['radiusM']*config['lengthM']
    effusivity = math.sqrt(120*19250*150)
    maximum_surface, maximum_profile, maximum_energy = 0., 0., 0.
    for scale in (1/64, 1/8, .5, 1, 2, 5):
        time = scale*tau
        state = response(config, initial, time, [0.])
        assert abs(state['surfaceK']-state['wallK'][0]) < 1e-9
        # u=t-w² removes the integrable surface heat-kernel singularity.
        integral = quad(lambda w: 2*response(config, initial, time-w*w)['gasToWallW'],
                        0., math.sqrt(time), epsabs=1e-10, epsrel=1e-11)[0]
        surface = 1000+integral/(area*effusivity*math.sqrt(math.pi))
        maximum_surface = max(maximum_surface, abs(surface-state['surfaceK']))
        alpha = 120/(19250*150)
        for depth in (.5*math.sqrt(alpha*time), 2*math.sqrt(alpha*time)):
            # The spatial heat kernel supplies an independent check on the
            # exponentially shifted erfcx profile, not only its x=0 limit.
            convolution = quad(lambda w: 2*response(config, initial, time-w*w)['gasToWallW']
                               *math.exp(-depth*depth/(4*alpha*w*w)),
                               0., math.sqrt(time), epsabs=1e-10, epsrel=1e-11)[0]
            wall = 1000+convolution/(area*effusivity*math.sqrt(math.pi))
            analytic_wall = response(config, initial, time, [depth])['wallK'][0]
            maximum_profile = max(maximum_profile, abs(wall-analytic_wall))
        energy = quad(lambda u: response(config, initial, u)['gasToWallW'],
                      0., time, epsabs=1e-11, epsrel=1e-11)[0]
        maximum_energy = max(maximum_energy, abs(energy-state['gasToWallEnergyJ']))
        assert 500 < state['gasK'] < state['surfaceK'] < 1000
        assert state['gasToWallW'] < 0
    assert maximum_surface < 1e-8 and maximum_profile < 1e-8 and maximum_energy < 1e-10
    equilibrium = response(config, {'gasK': 1000., 'wallK': [1000.]}, tau)
    assert equilibrium['gasK'] == equilibrium['surfaceK'] == 1000.
    assert equilibrium['gasToWallW'] == equilibrium['gasToWallEnergyJ'] == 0.
    return {'surfaceConvolutionMaximumDifferenceK': maximum_surface,
            'interiorProfileConvolutionMaximumDifferenceK': maximum_profile,
            'gasEnergyQuadratureMaximumDifferenceJ': maximum_energy,
            'stationarity': True, 'allPass': True}


if __name__ == '__main__':
    import json
    print(json.dumps(self_checks(), indent=2))
