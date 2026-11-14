"""Same exact-panel norm, subtracting exact-float Q1 interpolants before rounding."""
from bisect import bisect_right
from fractions import Fraction
from pathlib import Path
import sys

import numpy as np
from scipy.interpolate import RegularGridInterpolator

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'coupled-v99'))
import audit99


def knots(state):
    r, z = (np.asarray(state[key], dtype=float) for key in ('radialEdgesM', 'axialEdgesM'))
    audit99.require(all(v.ndim == 1 and len(v) >= 2 and np.isfinite(v).all()
        and v[0] == 0 and np.all(np.diff(v) > 0) for v in (r, z)), 'Invalid cylindrical domain')
    # Preserve the existing binary64 centroid computation; only its subsequent
    # interpolation arithmetic is exact. Recomputing rational centroids changes
    # the declared observable.
    return (np.r_[r[0], (2/3)*np.diff(r**3)/np.diff(r*r), r[-1]],
            np.r_[z[0], (z[1:]+z[:-1])/2, z[-1]])


def samples(state, name, ti, increment):
    values = np.asarray(state['snapshots'][ti][name], dtype=float)
    expected = len(state['axialEdgesM'])-1, len(state['radialEdgesM'])-1
    audit99.require(values.shape == expected and np.isfinite(values).all(), 'Invalid observable samples')
    # The existing metric defines increments in binary64 before interpolation.
    if increment:
        values = values-np.asarray(state['snapshots'][0][name], dtype=float)
    values = np.pad(values, 1, mode='edge')
    if name in ('omegaRadS', 'vrMPS', 'vzMPS'):
        values[-1, :] = 0; values[:, -1] = 0
    if name == 'vrMPS':
        values[:, 0] = 0
    if name == 'vzMPS':
        values[0, :] = 0
    audit99.require(np.isfinite(values).all(), 'Invalid observable increment')
    return values


def interpolate_line(native, values, query):
    """Exact rational piecewise-linear interpolation, including exact knots."""
    result = []
    for point in query:
        i = min(bisect_right(native, point)-1, len(native)-2)
        audit99.require(0 <= i and native[0] <= point <= native[-1], 'Interpolation outside domain')
        if point == native[i]:
            result.append(values[i])
        elif point == native[i+1]:
            result.append(values[i+1])
        else:
            result.append(values[i]+(point-native[i])*(values[i+1]-values[i])/(native[i+1]-native[i]))
    return result


def exact_regrid(native, values, common):
    r, z = (tuple(map(Fraction, coordinate)) for coordinate in native)
    qr, qz = (tuple(map(Fraction, coordinate)) for coordinate in common)
    radial = [interpolate_line(r, tuple(map(Fraction, row)), qr) for row in values]
    # Separable tensor interpolation is the same Q1 polynomial, not a projection
    # or an averaged field. Keep rational values until the two fields subtract.
    return list(zip(*(interpolate_line(z, column, qz) for column in zip(*radial))))


def difference_grid(a, b, name, ti=0, increment=False):
    audit99.require(name in audit99.FIELDS, 'Unsupported observable')
    ak, bk = knots(a), knots(b)
    audit99.require(all((x[0], x[-1]) == (y[0], y[-1]) for x, y in zip(ak, bk)),
                    'Different physical domains')
    audit99.require(a['snapshots'][ti]['timeS'] == b['snapshots'][ti]['timeS'], 'Different field clocks')
    common = tuple(np.union1d(x, y) for x, y in zip(ak, bk))
    av = exact_regrid(ak, samples(a, name, ti, increment), common)
    bv = exact_regrid(bk, samples(b, name, ti, increment), common)
    difference = np.array([[float(x-y) for x, y in zip(ar, br)] for ar, br in zip(av, bv)])
    return common, difference


def metrics(a, b, ti, order):
    points, weight = audit99.panels(a, b, order)
    result = {}
    for name in audit99.FIELDS:
        for increment in ((False, True) if name in audit99.FIELDS[:2] else (False,)):
            (r, z), difference = difference_grid(a, b, name, ti, increment)
            delta = RegularGridInterpolator((z, r), difference)(points)
            reference = audit99.interpolate(b, b['snapshots'][ti], name, points, increment)
            tag = name+('/increment' if increment else '')
            result[tag] = dict(errorIntegral=float(weight@(delta*delta)),
                               referenceIntegral=float(weight@(reference*reference)))
    meridional = result['vrMPS']['referenceIntegral']+result['vzMPS']['referenceIntegral']
    for name, row in result.items():
        denominator = meridional if name in ('vrMPS', 'vzMPS') else row['referenceIntegral']
        row.update(referenceRMS=float(np.sqrt(denominator/weight.sum())),
            absoluteRMS=float(np.sqrt(row['errorIntegral']/weight.sum())),
            value=float(np.sqrt(row['errorIntegral']/denominator)) if denominator else
                (0. if row['errorIntegral'] == 0 else None))
    return result
