"""Locate spatial errors in saved states; not a PDE solver or admission check.

Run only in safe-dev. CLI: raw.json convergence.json output.json
"""
import hashlib
import json
from pathlib import Path
import sys
import numpy as np

SOURCE = Path(__file__).resolve().parents[1]/'mixture-axial-v75'
sys.path.insert(0, str(SOURCE))
from analyze import compare_profiles, primitives, restrict_linear, response_scale


def locations(coarse, reference, manifest):
    result = []
    r, z = [np.asarray(coarse['setup'][k]) for k in ('r', 'z')]
    rf, zf = [np.asarray(reference['setup'][k]) for k in ('r', 'z')]
    initial = lambda t: primitives(t, dict(q=t['initialQ'], solidK=t['initialSolidK']))
    ci, ri = initial(coarse), initial(reference)
    for c, f in zip(coarse['cases'], reference['cases']):
        cp, fp = primitives(coarse, c), primitives(reference, f)
        for p, start in ((cp, ci), (fp, ri)):
            for name, raw in (('densityChange', 'density'), ('YChange', 'Y')):
                p[name] = p[raw]-start[raw]
        for name in ('density', 'gas', 'solid', 'omega', 'vr', 'vz', 'Y', 'densityChange', 'YChange'):
            cr, fr = ([np.asarray(t['setup']['wall']) for t in (coarse, reference)]
                      if name == 'solid' else (r, rf))
            restrict = lambda f: restrict_linear(f, z, zf, cr*cr, fr*fr)
            target = restrict(fp[name])
            if name in ('Y', 'YChange'):
                target = restrict(fp['density']*fp['Y'])/restrict(fp['density'])
                if name == 'YChange':
                    target -= restrict(ri['density']*ri['Y'])/restrict(ri['density'])
            error = cp[name]-target
            index = np.unravel_index(np.argmax(abs(error)), error.shape)
            j, i = map(int, index)
            scale = response_scale(name, fp[name], manifest)
            result.append(dict(timeS=c['timeS'], field=name, maxNormalized=float(abs(error[index])/scale),
                signedError=float(error[index]), responseScale=scale, cell=[j, i],
                radialIntervalM=cr[i:i+2].tolist(), axialIntervalM=z[j:j+2].tolist(),
                coarseValue=float(cp[name][index]), restrictedReferenceValue=float(target[index])))
    return result


if __name__ == '__main__':
    raw_path, conv_path, output = map(Path, sys.argv[1:])
    raw, conv = [json.loads(p.read_text()) for p in (raw_path, conv_path)]
    digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    if conv.get('inputHashes') != {raw_path.name: digest(raw_path)}:
        raise ValueError('Convergence input binding mismatch')
    if conv.get('sourceHashes') != {'analyze.py': digest(SOURCE/'analyze.py')}:
        raise ValueError('Convergence analyzer binding mismatch')
    m = raw['manifest']
    lookup = {(t['nr'], t['nz'], t['nt'], t['mode']): t for t in raw['cases']}
    base = lookup[(*m['joint'][-1], 'base')]
    reference = lookup[(*m['referenceSpatial'], 'base')]
    initial = lambda t: dict(q=t['initialQ'], solidK=t['initialSolidK'])
    report = dict(inputHashes={p.name: digest(p) for p in (raw_path, conv_path)},
        sourceHashes={p.name: digest(p) for p in (Path(__file__), SOURCE/'analyze.py')},
        initialErrors=[dict(mesh=[t['nr'], t['nz'], t['nt']], profiles=compare_profiles(
            t, initial(t), base, initial(base), m)) for t in raw['cases'] if t['mode'] == 'base'],
        referenceErrorLocations=locations(base, reference, m),
        failedGates={name: [g for g in row['gates'] if not g['passed']] for name, row in conv['series'].items()},
        scope='Postprocessing only; qualification belongs to the convergence/admission reports',
        convergenceQualified=conv['numericallyQualified'], experimentalQualified=False, liveQualified=False)
    output.write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
    print(json.dumps(dict(failedGates={k: len(v) for k, v in report['failedGates'].items()},
        worstReferenceLocations=sorted(report['referenceErrorLocations'], key=lambda r: -r['maxNormalized'])[:6])))
