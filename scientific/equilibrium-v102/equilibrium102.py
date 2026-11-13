"""Hydro-only centrifugal-equilibrium controls; no production-method changes."""
import hashlib
import json
from pathlib import Path
import sys
import numpy as np

SCIENCE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCIENCE/'spatial-v101'))
from reconstruction101 import Flow, KB, M_AR, mesh

TEMPERATURE_K = 3000.
WALL_DENSITY_KGM3 = .001
OMEGA_RADS = 20000.
END_S = 1e-7


def radial_moments(flow, omega, temperature=TEMPERATURE_K, order=32):
    """Volume averages of rho and rho*r² for the continuum equilibrium.

    rho(r)=rho_wall*exp[Omega²(r²-R²)/(2*c_T²)], c_T²=kT/m.
    The 2*r cylindrical Jacobian is retained, including the axis cell.
    """
    xi, weight = np.polynomial.legendre.leggauss(order)
    lo, hi = flow.r[:-1, None], flow.r[1:, None]
    radius = .5*((hi+lo)+(hi-lo)*xi)
    a = omega**2/(2*KB*temperature/M_AR)
    rho = WALL_DENSITY_KGM3*np.exp(a*(radius**2-flow.r[-1]**2))
    factor = (hi-lo)/(hi**2-lo**2)
    density = np.sum(factor*radius*rho*weight, axis=1)
    inertia_density = np.sum(factor*radius**3*rho*weight, axis=1)
    return density, inertia_density


def projected_state(flow, omega, representation):
    """Keep native cell-constant primitives separate from conservative moments.

    Exact projected angular momentum uses density-weighted inertia; Flow's
    primitive map instead divides by mass times volume-mean r². Both states
    are admissible, but their derived temperature/rotation are not identical.
    """
    density, inertia_density = radial_moments(flow, omega)
    q = flow.state(density, TEMPERATURE_K, .5, omega)
    if representation == 'conservative-moments':
        inertia = flow.volume*inertia_density
        q[3] = omega*inertia
        q[4] = 1.5*KB*TEMPERATURE_K*q[0]/M_AR+.5*omega**2*inertia
    elif representation != 'native-primitives':
        raise ValueError('Select a declared equilibrium representation')
    flow.primitive(q)
    return q


def rms(value, volume):
    return float(np.sqrt(np.sum(volume*value**2)/volume.sum()))


def initial_residual(flow, q):
    rate = flow.rate(q)
    acceleration = rate[1]/q[0]
    square = flow.volume*acceleration**2
    # The boundary cells have one-sided/reflected reconstruction. Report them
    # separately instead of interpreting their residual as an interior order.
    interior = np.zeros_like(flow.volume)
    interior[:, 1:-1] = flow.volume[:, 1:-1]
    fluxes = flow.fluxes(q)
    return dict(densityRateRMSKgM3S=rms(rate[0]/flow.volume, flow.volume),
        radialAccelerationRMSMPS2=rms(acceleration, flow.volume),
        interiorRadialAccelerationRMSMPS2=rms(acceleration, interior),
        boundaryRadialSquaredResidualFraction=float(
            (square[:, 0].sum()+square[:, -1].sum())/square.sum()) if square.sum() else 0.,
        maximumFaceMassFluxKgS=float(max(np.max(abs(f[0])) for f in fluxes)),
        netMassRateKgS=float(rate[0].sum()))


def short_transient(flow, q, end=END_S):
    initial = q.copy()
    elapsed, steps = 0., 0
    while elapsed < end:
        dt = min(flow.stable_dt(q, .1), end-elapsed)
        q = flow.advance(q, dt)
        elapsed += dt
        steps += 1
    p, p0 = flow.primitive(q), flow.primitive(initial)
    return dict(endS=end, steps=steps,
        relativeDensityChangeRMS=rms(p['densityKgM3']-p0['densityKgM3'], flow.volume)
            /rms(p0['densityKgM3'], flow.volume),
        radialSpeedRMSMPS=rms(p['vrMPS'], flow.volume),
        temperatureChangeRMSK=rms(p['temperatureK']-p0['temperatureK'], flow.volume),
        massRelativeDrift=float(abs(q[0].sum()-initial[0].sum())/initial[0].sum()),
        angularRelativeDrift=float(abs(q[3].sum()-initial[3].sum())/abs(initial[3].sum()))
            if initial[3].sum() else None,
        energyRelativeDrift=float(abs(q[4].sum()-initial[4].sum())/initial[4].sum()))


def run():
    files = ('equilibrium-v102/equilibrium102.py', 'mixture-axial-v75/flow.py',
             'spatial-v101/reconstruction101.py')
    sources = {name: hashlib.sha256((SCIENCE/name).read_bytes()).hexdigest() for name in files}
    result = dict(scope='Hydro-only numerical controls; not apparatus or experimental qualification',
        experimentalQualification=False, productionMethodChanged=False,
        constants=dict(temperatureK=TEMPERATURE_K, wallDensityKgM3=WALL_DENSITY_KGM3,
                       omegaRadS=OMEGA_RADS, endS=END_S, cfl=.1), sourceSHA256=sources, cases=[])
    for kind in ('original', 'smooth-source-aligned'):
        for n in (1, 2, 4):
            flow = Flow(*mesh(n, kind), [M_AR, M_AR])
            for omega in (0., OMEGA_RADS):
                density, inertia_density = radial_moments(flow, omega)
                for representation in ('native-primitives', 'conservative-moments'):
                    q = projected_state(flow, omega, representation)
                    p = flow.primitive(q)
                    result['cases'].append(dict(mesh=kind, refinement=n, nr=flow.nr, nz=flow.nz,
                        omegaRadS=omega, representation=representation,
                        maximumDensityWeightedInertiaDifferenceRelative=float(np.max(abs(
                            inertia_density-density*flow.mean_r2)/inertia_density)),
                        maximumInitialTemperatureDifferenceK=float(np.max(abs(p['temperatureK']-TEMPERATURE_K))),
                        maximumInitialOmegaDifferenceRadS=float(np.max(abs(p['omegaRadS']-omega))),
                        initialResidual=initial_residual(flow, q), transient=short_transient(flow, q)))
    return result


if __name__ == '__main__':
    with Path(sys.argv[1]).open('x') as stream:
        json.dump(run(), stream, indent=2, allow_nan=False)
