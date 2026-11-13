"""Supplemental FV restriction witness; does not replace V99's original gates."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import numpy as np


def geometry(state):
    r, z = [np.asarray(state[k], dtype=float) for k in ('radialEdgesM', 'axialEdgesM')]
    if any(v.ndim != 1 or len(v) < 2 or not np.isfinite(v).all() or
           np.any(np.diff(v) <= 0) for v in (r, z)) or r[0] < 0:
        raise ValueError('Ordered finite cylindrical edges required')
    return r, z, np.pi*np.diff(z)[:, None]*np.diff(r*r)[None, :]


def overlap(source, target):
    """Fraction of each source interval in each target interval."""
    if not np.allclose(source[[0, -1]], target[[0, -1]], rtol=0, atol=1e-15):
        raise ValueError('Restriction requires the same closed domain')
    length = np.maximum(0., np.minimum(target[1:, None], source[None, 1:])-
                        np.maximum(target[:-1, None], source[None, :-1]))
    return length/np.diff(source)[None, :]


def restrict(q, source, target):
    """Exactly redistribute piecewise-constant integrated quantities by volume."""
    sr, sz, volume = geometry(source)
    tr, tz, _ = geometry(target)
    q = np.asarray(q, dtype=float)
    if q.shape != (6, *volume.shape) or not np.isfinite(q).all():
        raise ValueError('Six finite cell-integrated fields required')
    return np.einsum('ai,kij,bj->kab', overlap(sz, tz), q, overlap(sr*sr, tr*tr))


def fields(q, initial, volume):
    if np.any(q[0] <= 0) or np.any(initial[0] <= 0):
        raise ValueError('Positive mass required')
    return {'densityKgM3': q[0]/volume,
            'densityKgM3/increment': (q[0]-initial[0])/volume,
            'vrMPS': q[1]/q[0], 'vzMPS': q[2]/q[0]}


def regions(state):
    r, z, volume = geometry(state)
    # Fractions integrate the piecewise-constant squared error exactly.
    def box(rlo, rhi, zlo, zhi):
        radial = np.maximum(0., np.minimum(r[1:], rhi)**2-np.maximum(r[:-1], rlo)**2)
        axial = np.maximum(0., np.minimum(z[1:], zhi)-np.maximum(z[:-1], zlo))
        return np.pi*axial[:, None]*radial[None, :]
    return {'whole': volume,
            'cathodeColumn': box(0, .004, 0, z[-1]),
            'sourceKink': box(.048, .052, 0, z[-1]),
            'outerWall': box(.056, r[-1], 0, z[-1]),
            'endwall': box(0, r[-1], .232, z[-1]),
            'anode': box(.056, r[-1], .06, .08),
            'cathodeEnd': box(0, .004, .232, z[-1])}


def compare(coarse, fine, ti):
    _, _, volume = geometry(coarse)
    ci = np.asarray(coarse['snapshots'][0]['q'])
    fi = restrict(fine['snapshots'][0]['q'], fine, coarse)
    a = fields(np.asarray(coarse['snapshots'][ti]['q']), ci, volume)
    b = fields(restrict(fine['snapshots'][ti]['q'], fine, coarse), fi, volume)
    meridional = sum(float(np.sum(volume*b[k]**2)) for k in ('vrMPS', 'vzMPS'))
    result = {}
    for key in a:
        square = (a[key]-b[key])**2
        error = float(np.sum(volume*square))
        reference = meridional if key in ('vrMPS', 'vzMPS') else float(np.sum(volume*b[key]**2))
        result[key] = dict(relativeRMS=float(np.sqrt(error/reference)) if reference else
                          (0. if error == 0 else None),
                          absoluteRMS=float(np.sqrt(error/volume.sum())),
                          regionalErrorFractions={name: float(np.sum(v*square)/error) if error else 0.
                              for name, v in regions(coarse).items()})
    return result


def load(path):
    packet = json.loads(path.read_bytes())
    states = {}
    for case in packet['cases']:
        if not case['completed']:
            raise ValueError('Incomplete case')
        entry = case['fieldPacket']
        file = (path.parent/entry['path']).resolve()
        if file.parent != path.parent.resolve()/'fields':
            raise ValueError('Unexpected field path')
        packed = file.read_bytes()
        raw = gzip.decompress(packed)
        if hashlib.sha256(packed).hexdigest() != entry['sha256'] or \
                hashlib.sha256(raw).hexdigest() != entry['rawSHA256']:
            raise ValueError('Field seal mismatch')
        states[(case['refinement'], case['cfl'])] = json.loads(raw)
    return states


def main():
    source, destination = map(Path, sys.argv[1:])
    states = load(source)
    result = dict(predictionSHA256=hashlib.sha256(source.read_bytes()).hexdigest(),
                  method='Exact cylindrical volume-overlap restriction of integrated q',
                  originalGatesReplaced=False, experimentalQualification=False, comparisons=[])
    for nc, nf in ((1, 2), (2, 4)):
        a, b = states[nc, .1], states[nf, .1]
        for ti, snapshot in enumerate(a['snapshots']):
            result['comparisons'].append(dict(pair=[nc, nf], timeS=snapshot['timeS'],
                                               fields=compare(a, b, ti)))
    with destination.open('x') as stream:
        stream.write(json.dumps(result, indent=2, allow_nan=False)+'\n')


if __name__ == '__main__':
    main()
