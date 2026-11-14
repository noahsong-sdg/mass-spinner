"""Supplemental high-precision Q1 norm witness; never changes qualification."""
from bisect import bisect_right
from decimal import Decimal, localcontext
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import sys

import numpy as np

FIELDS = ('densityKgM3', 'temperatureK')
D = Decimal.from_float
TAU = D(2*math.pi)


def require(ok, message):
    if not ok:
        raise ValueError(message)


def grid(state, name, ti=0):
    require(name in FIELDS, 'Witness supports only scalar density and temperature')
    r, z = (np.asarray(state[key], dtype=float) for key in ('radialEdgesM', 'axialEdgesM'))
    require(all(v.ndim == 1 and len(v) >= 2 and np.isfinite(v).all()
                and np.all(np.diff(v) > 0) for v in (r, z)), 'Invalid grid')
    # These binary64 reconstruction knots are exactly those in audit86/99.
    rc = (2/3)*np.diff(r**3)/np.diff(r*r); zc = (z[1:]+z[:-1])/2
    value = np.asarray(state['snapshots'][ti][name], dtype=float)
    require(value.shape == (len(z)-1, len(r)-1) and np.isfinite(value).all(), 'Invalid scalar field')
    padded = np.pad(value, 1, mode='edge')
    return (tuple(map(D, np.r_[r[0], rc, r[-1]])),
            tuple(map(D, np.r_[z[0], zc, z[-1]])),
            tuple(tuple(map(D, row)) for row in padded))


def value_at(data, r, z):
    radial, axial, values = data
    i = min(max(bisect_right(radial, r)-1, 0), len(radial)-2)
    j = min(max(bisect_right(axial, z)-1, 0), len(axial)-2)
    u = (r-radial[i])/(radial[i+1]-radial[i])
    v = (z-axial[j])/(axial[j+1]-axial[j])
    # Difference form preserves identical/axially uniform samples exactly.
    low = values[j][i]+u*(values[j][i+1]-values[j][i])
    high = values[j+1][i]+u*(values[j+1][i+1]-values[j+1][i])
    return low+v*(high-low)


def q1_square(corners, r0, h, k):
    """2π h k dᵀ(Mz⊗Mr)d; scalar tensor Q1 cell mass matrix."""
    one = Decimal(1)
    m0 = ((one/3, one/6), (one/6, one/3))
    m1 = ((one/12, one/12), (one/12, one/4))
    total = Decimal(0)
    for j in range(2):
        for i in range(2):
            for l in range(2):
                for a in range(2):
                    total += corners[j][i]*corners[l][a]*m0[j][l]*(r0*m0[i][a]+h*m1[i][a])
    return TAU*h*k*total


def gauss_rule(order):
    one = Decimal(1)
    if order == 2:
        x = (one/3).sqrt()
        return (((one-x)/2, one/2), ((one+x)/2, one/2))
    require(order == 3, 'Independent Gauss witness requires order 2 or 3')
    x = (Decimal(3)/5).sqrt()
    return (((one-x)/2, Decimal(5)/18), (one/2, Decimal(4)/9),
            ((one+x)/2, Decimal(5)/18))


def gauss_square(corners, r0, h, k, order):
    total = Decimal(0)
    for u, wu in gauss_rule(order):
        low = corners[0][0]+u*(corners[0][1]-corners[0][0])
        high = corners[1][0]+u*(corners[1][1]-corners[1][0])
        for v, wv in gauss_rule(order):
            value = low+v*(high-low)
            total += wu*wv*(r0+h*u)*value*value
    return TAU*h*k*total


def integrals(a, b, name, ti=0, precision=40):
    """Same padded bilinear observable, subtracting before squaring in Decimal."""
    require(type(precision) is int and precision >= 40, 'Use at least 40 decimal digits')
    require(a['snapshots'][ti]['timeS'] == b['snapshots'][ti]['timeS'], 'Different field clocks')
    with localcontext() as context:
        context.prec = precision
        ag, bg = grid(a, name, ti), grid(b, name, ti)
        require(all((x[0], x[-1]) == (y[0], y[-1]) for x, y in zip(ag[:2], bg[:2])),
                'Different physical domains')
        r, z = (sorted(set(x)|set(y)) for x, y in zip(ag[:2], bg[:2]))
        difference, reference = [], []
        for zz in z:
            av = [value_at(ag, rr, zz) for rr in r]
            bv = [value_at(bg, rr, zz) for rr in r]
            difference.append([x-y for x, y in zip(av, bv)])
            reference.append(bv)
        totals = {key: Decimal(0) for key in ('q1ErrorIntegral', 'q1ReferenceIntegral',
                                            'gauss2ErrorIntegral', 'gauss3ErrorIntegral')}
        for j, (z0, z1) in enumerate(zip(z[:-1], z[1:])):
            for i, (r0, r1) in enumerate(zip(r[:-1], r[1:])):
                error = tuple(tuple(difference[j+y][i+x] for x in range(2)) for y in range(2))
                ref = tuple(tuple(reference[j+y][i+x] for x in range(2)) for y in range(2))
                h, k = r1-r0, z1-z0
                totals['q1ErrorIntegral'] += q1_square(error, r0, h, k)
                totals['q1ReferenceIntegral'] += q1_square(ref, r0, h, k)
                for order in (2, 3):
                    totals[f'gauss{order}ErrorIntegral'] += gauss_square(error, r0, h, k, order)
        require(all(value >= 0 for value in totals.values()), 'Negative squared integral')
        return dict(precision=precision, panelCount=(len(r)-1)*(len(z)-1), **totals)


def relative_spread(x, y):
    scale = max(abs(x), abs(y))
    return abs(x-y)/scale if scale else Decimal(0)


def witness(a, b, name, ti=0):
    rows = [integrals(a, b, name, ti, p) for p in (40, 60)]
    with localcontext() as context:
        context.prec = 60
        checks = []
        for row in rows:
            for key in ('gauss2ErrorIntegral', 'gauss3ErrorIntegral'):
                spread = relative_spread(row['q1ErrorIntegral'], row[key])
                checks.append(dict(precision=row['precision'], pair=['q1ErrorIntegral', key],
                    relativeSpread=str(spread), unchangedPanelLimit='1e-10', passed=spread < Decimal('1e-10')))
        for key in ('q1ErrorIntegral', 'q1ReferenceIntegral', 'gauss2ErrorIntegral', 'gauss3ErrorIntegral'):
            spread = relative_spread(rows[0][key], rows[1][key])
            checks.append(dict(pair=[40, 60], integral=key, relativeSpread=str(spread),
                unchangedPanelLimit='1e-10', passed=spread < Decimal('1e-10')))
        return dict(field=name, timeS=a['snapshots'][ti]['timeS'],
            rows=[{key: str(value) if isinstance(value, Decimal) else value for key, value in row.items()}
                  for row in rows], checks=checks, allPrecisionChecksPass=all(c['passed'] for c in checks))


def read(path):
    packed = path.read_bytes(); raw = gzip.decompress(packed)
    return json.loads(raw), dict(path=str(path), packedSHA256=hashlib.sha256(packed).hexdigest(),
                                rawSHA256=hashlib.sha256(raw).hexdigest())


if __name__ == '__main__':
    require(sys.platform == 'linux' and os.getuid() == 1000, 'Execute only inside safe-dev')
    require(len(sys.argv) == 4, 'Supply two compressed state files and a new output JSON')
    (a, ai), (b, bi) = (read(Path(path).resolve()) for path in sys.argv[1:3])
    result = dict(scope='Supplemental initial scalar exact-panel precision witness only',
        inputFields=[ai, bi], originalQualificationChanged=False, experimentalQualification=False,
        liveQualification=False, fields=[witness(a, b, name) for name in FIELDS])
    with Path(sys.argv[3]).open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    print(json.dumps(result, indent=2))
    raise SystemExit(not all(row['allPrecisionChecksPass'] for row in result['fields']))
