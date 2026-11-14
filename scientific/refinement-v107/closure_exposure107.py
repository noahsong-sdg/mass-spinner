"""Read-only exposure to neutral-Ar property reference bounds; no qualification."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import sys

import numpy as np

KB, M_AR = 1.380649e-23, 39.948*1.66053906660e-27
TIMES = [0., 1e-6, 2e-6, 4e-6]
REFERENCE = 'https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=960065'


def require(ok, message):
    if not ok:
        raise ValueError(message)


def sealed(path, digest):
    raw = Path(path).read_bytes()
    require(hashlib.sha256(raw).hexdigest() == digest, 'SHA-256 mismatch: '+str(path))
    return raw


def array(value):
    raw = np.asarray(value)
    require(raw.dtype.kind in 'fiu' and np.isfinite(raw).all(), 'Finite numeric array required')
    return raw.astype(float)


def budgets(state):
    r, z = (array(state[k]) for k in ('radialEdgesM', 'axialEdgesM'))
    require(all(v.ndim == 1 and len(v) >= 2 and np.all(np.diff(v) > 0) for v in (r, z))
            and r[0] == z[0] == 0, 'Positive axisymmetric cell geometry required')
    volume = np.diff(z)[:, None]*(np.pi*np.diff(r**2))[None, :]
    mean_r2 = (r[:-1]**2+r[1:]**2)/2
    require(np.isfinite(volume).all() and np.all(volume > 0), 'Invalid cell volume')
    require([s['timeS'] for s in state['snapshots']] == TIMES and
            all(type(s['timeS']) in (int, float) for s in state['snapshots']), 'Require all four clocks')
    result = []
    for s in state['snapshots']:
        q = array(s['q'])
        require(q.shape == (6, len(z)-1, len(r)-1), 'Six conserved cell fields required')
        m, pr, pz, angular, energy, species = q
        require(np.all(m > 0) and np.all((species >= 0) & (species <= m)), 'Invalid mass/species')
        inertia = m*mean_r2
        swirl = .5*angular*angular/inertia
        kinetic = .5*(pr*pr+pz*pz)/m+swirl
        thermal = energy-kinetic
        number = species/M_AR+(m-species)/M_AR
        temperature = thermal/(1.5*KB*number)
        require(all(np.isfinite(v).all() for v in (inertia, swirl, thermal, temperature))
                and all(np.all(v > 0) for v in (inertia, thermal, temperature)),
                'Positive finite thermal state required')
        require(np.array_equal(array(s['thermalJ']), thermal) and
                np.array_equal(array(s['temperatureK']), temperature), 'Saved primitive mismatch')
        weights = dict(volumeM3=volume, massKg=m, thermalJ=thermal,
                       inertiaKgM2=inertia, absoluteAngularKgM2S=abs(angular), swirlKineticJ=swirl)
        totals = {k: float(v.sum()) for k, v in weights.items()}
        require(all(np.isfinite(v) for v in totals.values()), 'Nonfinite total')
        masks = dict(below84K=temperature < 84., above10000K=temperature > 10000.)
        fractions = {name: {k: float(v[mask].sum())/totals[k] if totals[k] else None
                           for k, v in weights.items()} for name, mask in masks.items()}
        j, i = np.unravel_index(np.argmax(temperature), temperature.shape)
        result.append(dict(timeS=s['timeS'], maximumTemperatureK=float(temperature[j, i]),
            maximumCell=dict(axialIndex=int(j), radialIndex=int(i),
                radialBoundsM=r[i:i+2].tolist(), axialBoundsM=z[j:j+2].tolist()),
            denominators=totals, fractions=fractions))
    return result


def inspect(prediction, digest, source_root):
    """Require an externally SHA-pinned, already-admitted V107 full equal-Ar case.

    Seals verify provenance, not generic solver/material admission. The caller
    must establish that precondition with the separate V107 case auditor.
    """
    prediction, source_root = Path(prediction).resolve(), Path(source_root).resolve()
    packet = json.loads(sealed(prediction, digest))
    require(packet['phase'] == 'full' and packet['timesS'] == TIMES and
            len(packet['cases']) == 1 and packet['cases'][0]['completed'] is True, 'Complete full case required')
    require(bool(packet['sourceSHA256']), 'Producer source seals required')
    for relative, expected in packet['sourceSHA256'].items():
        path = (source_root/relative).resolve()
        require(path.is_relative_to(source_root), 'Source path escapes snapshot')
        sealed(path, expected)
    entry = packet['cases'][0]['fieldPacket']; path = (prediction.parent/entry['path']).resolve()
    require(path.parent == prediction.parent/'fields', 'Field path escapes case')
    raw = gzip.decompress(sealed(path, entry['sha256']))
    require(hashlib.sha256(raw).hexdigest() == entry['rawSHA256'], 'Raw field seal mismatch')
    return dict(scope='Reference-domain exposure only; no experimental or numerical qualification',
        reference=REFERENCE, referenceTemperatureRangeK=[84., 10000.],
        interpretation='Bounds describe neutral zero-density reference data, not an ionization cutoff.',
        material='Fixed equal-mass argon components; no constitutive sensitivity or source reconstruction',
        zeroWeightFraction=None, predictionPath=str(prediction), sourceSnapshot=str(source_root),
        predictionSHA256=digest, fieldPacket=entry,
        producerSourceSHA256=packet['sourceSHA256'],
        diagnosticSHA256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        snapshots=budgets(json.loads(raw)))


if __name__ == '__main__':
    require(sys.platform == 'linux' and os.getuid() == 1000, 'Execute only inside safe-dev')
    result = inspect(*sys.argv[1:4])
    with Path(sys.argv[4]).open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
