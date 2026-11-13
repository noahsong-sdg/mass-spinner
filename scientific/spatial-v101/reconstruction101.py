"""Small FV reconstruction probes; no replacement acceptance gates or fitted data."""
import json
from pathlib import Path
import sys

import numpy as np
from scipy.interpolate import CubicHermiteSpline, PchipInterpolator

SCIENCE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCIENCE/'mixture-axial-v75'))
from flow import Flow, KB

M_AR = 39.948*1.66053906660e-27


def edges(cuts, counts, n, smooth=False):
    """Nested geometric grids; PCHIP makes the coordinate map monotone and C1.

    Counts and cuts are geometric inputs, never inferred from velocity data.
    Additional .056/.232 cuts retain the original wall-resolution transitions.
    """
    cuts, counts = np.asarray(cuts), np.asarray(counts)
    parameter = np.r_[0, np.cumsum(counts)]
    samples = np.arange(parameter[-1]*n+1)/n
    if not smooth:
        return np.interp(samples, parameter, cuts)
    derivative = PchipInterpolator(parameter, cuts).derivative()(parameter)
    # PCHIP may set endpoint derivatives to zero after a strong spacing change,
    # producing an unnecessary O(n^-2) first/last cell and acoustic timestep.
    secant = np.diff(cuts)/counts
    derivative[0], derivative[-1] = secant[0], secant[-1]
    return CubicHermiteSpline(parameter, cuts, derivative)(samples)


def mesh(n, kind):
    if kind == 'original':
        return (edges([0, .004, .056, .06], [4, 8, 4], n),
                edges([0, .06, .08, .232, .24], [4, 4, 12, 4], n))
    if kind == 'smooth-source-aligned':
        return (edges([0, .004, .05, .056, .06], [4, 8, 4, 4], n, True),
                edges([0, .06, .08, .232, .24], [4, 4, 12, 4], n, True))
    raise ValueError('Unknown diagnostic mesh')


def moments(f, axis):
    if axis == 2:
        return f.mean_r, f.mean_r2, f.r
    return ((f.z[:-1]+f.z[1:])/2,
            (f.z[:-1]**2+f.z[:-1]*f.z[1:]+f.z[1:]**2)/3, f.z)


def quadratic_average_slope(average, mean, second):
    """Derivative at each interior centroid from three quadratic FV averages.

    A mathematical control only: changing the MUSCL slope to this derivative
    does not supply the missing quadratic face term or a monotone limiter.
    """
    center = mean[1:-1]
    variance = second-mean**2
    dl, dr = mean[:-2]-center, mean[2:]-center
    el = dl**2+variance[:-2]-variance[1:-1]
    er = dr**2+variance[2:]-variance[1:-1]
    al, ar = average[:-2]-average[1:-1], average[2:]-average[1:-1]
    return (al*er-ar*el)/(dl*er-dr*el)


def analytic_faces(f, axis, degree):
    """Use actual polynomial cell averages, not polynomial centroid samples."""
    mean, second, bounds = moments(f, axis)
    length = bounds[-1]-bounds[0]
    a, b, c = 100., 20./length, (30./length**2 if degree == 2 else 0.)
    average = a+b*mean+c*second
    pressure = average[None, :] if axis == 2 else average[:, None]
    rho = .001
    q = f.state(rho, pressure*M_AR/(rho*KB), .5, 0.)
    left, right = f._face_states(f.primitive(q), axis)
    # Exclude the two outer faces and their boundary-limited adjacent cells.
    lv = left[1, 0, 2:-2] if axis == 2 else left[1, 2:-2, 0]
    rv = right[1, 0, 2:-2] if axis == 2 else right[1, 2:-2, 0]
    exact = a+b*bounds[2:-2]+c*bounds[2:-2]**2
    scale = np.max(abs(exact))
    return dict(maximumRelativeFaceError=float(max(np.max(abs(lv-exact)), np.max(abs(rv-exact)))/scale),
                maximumRelativeFaceJump=float(np.max(abs(lv-rv))/scale),
                nr=f.nr, nz=f.nz)


def source_projection(f, order):
    """Compare centroid sampling with cylindrical averages of frozen profiles.

    Split at the prescribed 5 cm clamp before quadrature. This is a zero-swirl
    initializer diagnostic, not a change to the campaign's steady-torsion state.
    """
    sys.path.insert(0, str(SCIENCE/'electrical-v82'))
    from transport82 import profile
    xi, weight = np.polynomial.legendre.leggauss(order)
    def values(r):
        fields = profile('linear', r, 1., 'source', False)
        rho = M_AR*(fields['neutralDensityM3']+fields['impliedElectronDensityM3'])
        return np.array([rho, rho*KB*fields['heavyTemperatureK']/M_AR])
    sampled = values(f.mean_r)
    integrated = np.zeros_like(sampled)
    for i, (lo, hi) in enumerate(zip(f.r[:-1], f.r[1:])):
        split = [lo]+([.05] if lo < .05 < hi else [])+[hi]
        for left, right in zip(split[:-1], split[1:]):
            radius = (right+left)/2+(right-left)*xi/2
            integrated[:, i] += np.sum(values(radius)*radius*weight, axis=1)*(right-left)
        integrated[:, i] /= hi**2-lo**2
    return sampled, integrated


def phase_zero(f, average, uniform_pressure=False):
    """Zero meridional velocity has exact continuum instantaneous rho_dot=0.

    Report finite-volume truncation, including region overlaps; none of these
    initial-rate diagnostics replaces evolved spatial or experimental gates.
    """
    rho, pressure = average
    if uniform_pressure:
        pressure = float(np.sum(f.volume*pressure)/f.volume.sum())
    q = f.state(rho, pressure*M_AR/(rho*KB), .5, 0.)
    rate = f.rate(q)
    square = (rate[0]/f.volume)**2
    integral = float(np.sum(f.volume*square))
    def box(rlo, rhi, zlo, zhi):
        radial = np.maximum(0., np.minimum(f.r[1:], rhi)**2-np.maximum(f.r[:-1], rlo)**2)
        axial = np.maximum(0., np.minimum(f.z[1:], zhi)-np.maximum(f.z[:-1], zlo))
        return np.pi*axial[:, None]*radial[None, :]
    regions = {'whole': f.volume, 'sourceKink': box(.048, .052, 0., f.z[-1]),
               'cathodeColumn': box(0., .004, 0., f.z[-1]),
               'outerWall': box(.056, f.r[-1], 0., f.z[-1]),
               'endwall': box(0., f.r[-1], .232, f.z[-1]),
               'anode': box(.056, f.r[-1], .06, .08),
               'cathodeEnd': box(0., .004, .232, f.z[-1])}
    fluxes = f.fluxes(q)
    return dict(densityRateRMSKgM3S=float(np.sqrt(integral/f.volume.sum())),
                densityRateVolumeIntegratedSquare=integral,
                densityRateVolumeMeanAbsoluteKgM3S=float(np.sum(abs(rate[0]))/f.volume.sum()),
                densityRateNetIntegratedKgS=float(np.sum(rate[0])),
                maximumFaceMassFluxKgS=float(max(np.max(abs(flux[0])) for flux in fluxes)),
                radialAccelerationRMSMPS2=float(np.sqrt(np.sum(f.volume*(rate[1]/q[0])**2)/f.volume.sum())),
                squaredDensityRateFractions={name: float(np.sum(volume*square)/integral) if integral else 0.
                    for name, volume in regions.items()})


def main():
    output = dict(scope='Supplemental reconstruction/projection controls; not qualification',
                  experimentalQualification=False, cases=[])
    for kind in ('original', 'smooth-source-aligned'):
        for n in (1, 2, 4):
            f = Flow(*mesh(n, kind), [M_AR, M_AR])
            sampled, projected = source_projection(f, 16)
            _, lower_order = source_projection(f, 8)
            row = dict(mesh=kind, refinement=n, nr=f.nr, nz=f.nz,
                       maximumAdjacentWidthRatio={name: float(np.max(np.maximum(np.diff(v)[1:]/np.diff(v)[:-1],
                           np.diff(v)[:-1]/np.diff(v)[1:]))) for name, v in (('r', f.r), ('z', f.z))},
                       polynomialFaces={str(axis): {str(degree): analytic_faces(f, axis, degree)
                           for degree in (1, 2)} for axis in (1, 2)},
                       initialZeroMeridional={name: phase_zero(f, average) for name, average in
                           (('centroidSampled', sampled), ('volumeProjected', projected))},
                       uniformPressureControls={name: phase_zero(f, average, True) for name, average in
                           (('centroidSampled', sampled), ('volumeProjected', projected))},
                       maximumProjectionDifferenceRelative=np.max(abs(sampled-projected)/projected, axis=1).tolist(),
                       projectionQuadratureDifferenceRelative=np.max(abs(projected-lower_order)/projected, axis=1).tolist())
            output['cases'].append(row)
    print(json.dumps(output, indent=2, allow_nan=False))


if __name__ == '__main__':
    main()
