"""Published dilute-Ar viscosity with explicitly conditional temperature profiles.

Source-derived conductivity shapes are conditional; no self-consistent discharge
or velocity closure is inferred.
Spatial fields are radial only: their axial extension is an assumption, not data.
"""
import json
from pathlib import Path

import numpy as np

SOURCE = json.loads((Path(__file__).parent/'argon-viscosity-source.json').read_text())
ENDPOINTS = {'nominal': (5950.,1800.), 'low-low': (4650.,1400.),
             'low-high': (4650.,2200.), 'high-low': (7250.,1400.),
             'high-high': (7250.,2200.)}
CASES = ('legacy','nist-2900')+tuple(f'{shape}-{name}' for shape in ('quadratic','linear') for name in ENDPOINTS)


def viscosity(temperature_k):
    """NIST Eq.2/Table3, in Pa s; reject unsupported extrapolation."""
    t = np.asarray(temperature_k,dtype=float)
    lo,hi = SOURCE['temperatureRangeK']
    if not np.isfinite(t).all() or np.any(t<lo) or np.any(t>hi):
        raise ValueError('Dilute-Ar viscosity correlation requires 84 <= T <= 10000 K')
    x = np.log(t/SOURCE['referenceTemperatureK'])
    coefficients = [0.]+SOURCE['coefficientsAscendingFromPower1']
    return SOURCE['referenceViscosityPaS']*np.exp(np.polynomial.polynomial.polyval(x,coefficients))


def profile(case, radius_m):
    """Return prescribed T and mu arrays; no velocity target enters this API.

    Linear and quadratic interpolants share the source's two endpoint estimates.
    Only the quadratic has a regular scalar derivative at r=0. Both are declared
    sensitivities; the four endpoint corners are not a joint confidence region.
    """
    r = np.asarray(radius_m,dtype=float)
    if not np.isfinite(r).all() or np.any(r<0) or np.any(r>.06):
        raise ValueError('Experimental radial profiles apply only to 0 <= r <= 6 cm')
    if case not in CASES:
        raise ValueError('Undeclared transport scenario')
    if case in ('legacy','nist-2900'):
        temperature = np.full_like(r,2900.)
        mu = np.full_like(r,1.14e-4) if case=='legacy' else viscosity(temperature)
        return temperature,mu
    shape,name = case.split('-',1)
    core,edge = ENDPOINTS[name]
    x = np.minimum(r/SOURCE['probeRadiusM'],1.)
    temperature = edge+(core-edge)*(1.-x**(2 if shape=='quadratic' else 1))
    return temperature,viscosity(temperature)


def source_collision_profile(shape, radius_m):
    """Source Eq.7-9 shapes, conditional on the leading weak-ionization limit.

    Rounded source endpoints are interpolated before the nonlinear Hall map.
    Retaining these Hall parameters while electrically scaling sigma is only a
    phenomenological shape study, not a self-consistent microscopic closure.
    """
    r = np.asarray(radius_m,dtype=float)
    if shape not in ('linear','quadratic') or not np.isfinite(r).all() or np.any(r<0) or np.any(r>.06):
        raise ValueError('Declare linear/quadratic shape on experimental radius 0 to 6 cm')
    source = SOURCE['collisionProfile']
    x = np.minimum(r/source['endpointRadiusM'][1],1.)**(2 if shape=='quadratic' else 1)
    def interpolate(name):
        a,b = source[name]
        return a+(b-a)*x
    sigma = interpolate('parallelConductivitySM')
    electron,ion = interpolate('electronHallParameter'),interpolate('ionHallParameter')
    slip = electron*ion*source['neutralMassFractionAssumed']
    denominator = (1.+slip)**2+electron**2
    return dict(parallelShape=sigma/source['parallelConductivitySM'][0],
                effectiveBeta=np.sqrt(slip+electron**2/(1.+slip)),
                sourceParallelSM=sigma,sourceHallSM=sigma*electron/denominator,
                sourcePedersenSM=sigma*(1.+slip)/denominator,
                electronBeta=electron,ionBeta=ion,ionSlipFactor=slip)
