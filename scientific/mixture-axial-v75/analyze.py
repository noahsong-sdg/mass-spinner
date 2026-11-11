"""Independent primitive/mass-aware restriction and prospective refinement gates.

No production solver imports. Execute only in safe-dev. CLI: raw.json output.json
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np

KB = 1.380649e-23
FIELDS = ('density', 'gas', 'solid', 'omega', 'vr', 'vz', 'Y', 'densityChange', 'YChange')
SERIES = ('joint', 'spatial', 'temporal', 'radial', 'axial')


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def key(trajectory):
    return trajectory['nr'], trajectory['nz'], trajectory['nt'], trajectory['mode']


def requested(manifest):
    runs = {(*level, 'base') for name in SERIES for level in manifest[name]}
    runs.update((*manifest[name], 'base') for name in ('referenceSmallerDt', 'referenceSpatial'))
    runs.update((*manifest['tighterTolerance'], mode) for mode in ('base', 'linear', 'thermal', 'both'))
    if 'referenceTransportCfl' in manifest:
        runs.add((*manifest['referenceTransportCfl'], 'transport'))
    return runs


def edges(value):
    out = np.asarray(value, dtype=float)
    require(out.ndim == 1 and len(out) >= 2 and np.all(np.isfinite(out))
            and np.all(np.diff(out) > 0), 'Need ordered finite comparison edges')
    return out


def overlap(coarse, fine):
    c, f = edges(coarse), edges(fine)
    weights = np.maximum(0., np.minimum(c[1:, None], f[None, 1:])
                         - np.maximum(c[:-1, None], f[None, :-1]))
    require(np.allclose(weights.sum(axis=1), np.diff(c), rtol=1e-12, atol=1e-18),
            'Reference grid does not cover comparison domain')
    return weights/np.diff(c)[:, None]


def restrict_linear(field, coarse_z, fine_z, coarse_s, fine_s):
    """Integrate conservative linear reconstructions in z and s=r².

    Partial overlaps need first moments: piecewise-constant restriction is
    only exact for whole fine cells and aliases nonnested smooth profiles.
    This smooth-field comparison operator is not a positivity/TVD transport
    scheme. Its cell-centered slopes integrate to zero in every donor cell.
    """
    out = np.asarray(field, dtype=float)
    for axis, coarse, fine in ((1, coarse_s, fine_s), (0, coarse_z, fine_z)):
        c, f = edges(coarse), edges(fine)
        require(out.shape[axis] == len(f)-1, 'Restriction field/grid mismatch')
        centers = (f[1:]+f[:-1])/2
        width = np.diff(c)[:, None]
        lo = np.maximum(c[:-1, None], f[None, :-1])
        hi = np.maximum(lo, np.minimum(c[1:, None], f[None, 1:]))
        moments = ((hi-centers)**2-(lo-centers)**2)/(2*width)
        slope = (np.gradient(out, centers, axis=axis, edge_order=min(2, len(centers)-1))
                 if len(centers) > 1 else np.zeros_like(out))
        values, derivatives = [np.moveaxis(a, axis, -1) for a in (out, slope)]
        out = np.moveaxis(values@overlap(c, f).T+derivatives@moments.T, -1, axis)
    require(np.all(np.isfinite(out)), 'Nonfinite reconstructed restriction')
    return out


def primitives(trajectory, endpoint):
    setup = trajectory['setup']
    r, z, wall = [edges(setup[name]) for name in ('r', 'z', 'wall')]
    require(r[0] == 0 and wall[0] == r[-1], 'Invalid comparison cylinder/solid contiguity')
    nr, nz, nw = len(r)-1, len(z)-1, len(wall)-1
    require((nr, nz) == (trajectory['nr'], trajectory['nz']), 'Comparison mesh metadata mismatch')
    q = np.asarray(endpoint['q'], dtype=float)
    masses = np.asarray(setup['masses'], dtype=float)
    require(q.shape == (6, nz, nr) and np.all(np.isfinite(q)), 'Invalid comparison conserved fields')
    require(masses.shape == (2,) and np.all(np.isfinite(masses)) and np.all(masses > 0), 'Invalid comparison species masses')
    mass, mr, mz, angular, energy, light = q
    require(np.all(mass > 0) and np.all(light >= 0) and np.all(light <= mass), 'Invalid comparison species inventory')
    volume = np.pi*np.diff(z)[:, None]*np.diff(r*r)[None, :]
    inertia = mass*(r[:-1]**2+r[1:]**2)/2
    with np.errstate(over='ignore', invalid='ignore', divide='ignore'):
        internal = energy-(mr*mr+mz*mz)/(2*mass)-angular*angular/(2*inertia)
        number = light/masses[0]+(mass-light)/masses[1]
        gas = internal/(1.5*KB*number)
        solid = np.asarray(endpoint['solidK'], dtype=float).reshape(nz, nw)
        fields = dict(density=mass/volume, gas=gas, solid=solid, omega=angular/inertia,
                      vr=mr/mass, vz=mz/mass, Y=light/mass)
    require(np.all(internal > 0) and np.all(solid > 0)
            and all(np.all(np.isfinite(v)) for v in fields.values()), 'Nonpositive/nonfinite comparison primitive')
    return fields


def response_scale(name, field, manifest):
    if name == 'densityChange':
        return max(1e-6*manifest['densityKgM3'], float(np.max(abs(field))))
    if name == 'YChange':
        return max(1e-6, float(np.max(abs(field))))
    if name == 'density':
        return max(.001*manifest['densityKgM3'], float(np.max(abs(field-manifest['densityKgM3']))))
    if name == 'Y':
        return max(.001, float(np.max(abs(field-.5))))
    if name in ('gas', 'solid'):
        return max(1., float(np.max(abs(field-manifest['initialGasK' if name == 'gas' else 'initialLinerK']))))
    return max(1., float(np.max(abs(field))))


def compare_profiles(coarse, coarse_case, reference, reference_case, manifest):
    cf, rf = primitives(coarse, coarse_case), primitives(reference, reference_case)
    initial = lambda t: primitives(t, dict(q=t['initialQ'], solidK=t['initialSolidK']))
    ci, ri = initial(coarse), initial(reference)
    for fields, start in ((cf, ci), (rf, ri)):
        fields['densityChange'] = fields['density']-start['density']
        fields['YChange'] = fields['Y']-start['Y']
    result = {}
    for name in FIELDS:
        region = 'wall' if name == 'solid' else 'r'
        cr, rr = [np.asarray(t['setup'][region]) for t in (coarse, reference)]
        restrict = lambda field: restrict_linear(field, coarse['setup']['z'],
            reference['setup']['z'], cr*cr, rr*rr)
        volume = np.diff(coarse['setup']['z'])[:, None]*np.diff(cr*cr)[None, :]
        if name in ('Y', 'YChange'):
            rho = restrict(rf['density'])
            require(np.all(rho > 0), 'Reconstructed reference density must be positive')
            target = restrict(rf['density']*rf['Y'])/rho
            if name == 'YChange':
                target -= restrict(ri['density']*ri['Y'])/restrict(ri['density'])
            weight = volume*rho
        else:
            target, weight = restrict(rf[name]), volume
        error = cf[name]-target
        scale = response_scale(name, rf[name], manifest)
        rms = float(np.sqrt(np.sum(weight*error*error)/np.sum(weight)))
        maximum = float(np.max(abs(error)))
        require(np.all(np.isfinite([rms, maximum, scale])) and scale > 0, 'Invalid comparison error/scale')
        result[name] = dict(rmsAbsolute=rms, maxAbsolute=maximum, scale=scale,
                            rmsNormalized=rms/scale, maxNormalized=maximum/scale,
                            weighting='mass' if name in ('Y', 'YChange') else 'cylindrical volume')
    return result


def observable_history(trajectory):
    history = [case['observables'] for case in trajectory['cases']]
    require(bool(history) and bool(history[0]), 'Missing comparison observables')
    names = set(history[0])
    require(all(set(row) == names and all(type(v) in (int, float) and np.isfinite(v) for v in row.values())
                for row in history), 'Nonfinite/inconsistent comparison observables')
    return {name: max(abs(row[name]) for row in history) for name in names}


def compare_rows(base, reference, manifest, limits):
    prior = {case['timeS']: case for case in base['cases']}
    scales = observable_history(reference)
    observable_history(base)
    rows = []
    for case in reference['cases']:
        coarse = prior[case['timeS']]
        profiles = compare_profiles(base, coarse, reference, case, manifest)
        require(set(coarse['observables']) == set(scales), 'Observable names differ across refinement')
        obs = {name: abs(coarse['observables'][name]-case['observables'][name])/max(scale, 1e-20)
               for name, scale in scales.items()}
        passed = all(p['rmsNormalized'] < limits[0] and p['maxNormalized'] < limits[1] for p in profiles.values())
        passed = passed and all(value < limits[2] for value in obs.values())
        rows.append(dict(timeS=case['timeS'], profiles=profiles, observablesNormalized=obs, passed=passed))
    return rows


def analyze(raw):
    manifest = raw['manifest']
    require(manifest.get('schemaVersion') == 1, 'Missing or migrated mixture manifest')
    require(set(manifest['independentTolerances']) == {'linear', 'thermal', 'both'}, 'Missing independent tolerance modes')
    trajectories = {}
    for trajectory in raw['cases']:
        k = key(trajectory)
        require(k not in trajectories, 'Duplicate mixture trajectory')
        primitives(trajectory, dict(q=trajectory['initialQ'], solidK=trajectory['initialSolidK']))
        times = [case['timeS'] for case in trajectory['cases']]
        require(times == manifest['timesS'], 'Missing, extra, duplicate or unordered physical outputs')
        for endpoint in trajectory['cases']:
            primitives(trajectory, endpoint)
        observable_history(trajectory)
        trajectories[k] = trajectory
    require(set(trajectories) <= requested(manifest), 'Unexpected mixture trajectory')
    result = dict(manifest=manifest, failures=raw.get('failures', []), requirementsGaps=[], series={},
                  experimentalQualified=False, liveQualified=False)
    for name in SERIES:
        levels = [(*level, 'base') for level in manifest[name]]
        ref_key = (*manifest['joint'][-1], 'base') if name in ('spatial', 'radial', 'axial') else levels[-1]
        compared = levels if name in ('spatial', 'radial', 'axial') else levels[:-1]
        if any(k not in trajectories for k in [ref_key, *compared]):
            result['requirementsGaps'].append('Missing '+name+' trajectory')
            continue
        comparisons = [dict(nr=k[0], nz=k[1], nt=k[2], cases=compare_rows(
            trajectories[k], trajectories[ref_key], manifest, (.02, .05, .02))) for k in compared]
        gates = []
        for i, time in enumerate(manifest['timesS']):
            samples = [comparison['cases'][i] for comparison in comparisons]
            for field in FIELDS:
                errors = [row['profiles'][field]['rmsNormalized'] for row in samples]
                decreasing = max(errors) < .002 or all(b <= a+1e-12 for a, b in zip(errors, errors[1:]))
                gates.extend([dict(name=f'{time}:{field}:rms', value=errors[-1], passed=errors[-1] < .02),
                              dict(name=f'{time}:{field}:decreasing', values=errors, passed=decreasing),
                              dict(name=f'{time}:{field}:max', value=samples[-1]['profiles'][field]['maxNormalized'],
                                   passed=samples[-1]['profiles'][field]['maxNormalized'] < .05)])
            gates.extend(dict(name=f'{time}:{field}', value=value, passed=value < .02)
                         for field, value in samples[-1]['observablesNormalized'].items())
        coordinate = 2 if name == 'temporal' else 1 if name == 'axial' else 0
        orders = []
        for i, time in enumerate(manifest['timesS']):
            for a, b, ka, kb in zip(comparisons, comparisons[1:], compared, compared[1:]):
                refinement = kb[coordinate]/ka[coordinate]
                values = {}
                for field in FIELDS:
                    ea, eb = [row['cases'][i]['profiles'][field]['rmsNormalized'] for row in (a, b)]
                    values[field] = float(np.log(ea/eb)/np.log(refinement)) if ea > 0 and eb > 0 and refinement > 1 else None
                orders.append(dict(timeS=time, before=list(ka), after=list(kb), rmsOrders=values))
        result['series'][name] = dict(reference=list(ref_key), comparisons=comparisons,
                                     observedOrders=orders, gates=gates, passed=all(g['passed'] for g in gates))
    for name, level, mode, limits in (
            ('linearTolerance', manifest['tighterTolerance'], 'linear', (.001,)*3),
            ('thermalTolerance', manifest['tighterTolerance'], 'thermal', (.001,)*3),
            ('bothTolerances', manifest['tighterTolerance'], 'both', (.001,)*3),
            ('referenceSmallerDt', manifest['referenceSmallerDt'], 'base', (.02, .05, .02)),
            ('referenceSpatial', manifest['referenceSpatial'], 'base', (.02, .05, .02))):
        base = (*manifest['tighterTolerance'], 'base') if mode != 'base' else (*manifest['joint'][-1], 'base')
        ref = (*level, mode)
        if base not in trajectories or ref not in trajectories:
            result['requirementsGaps'].append('Missing '+name)
            continue
        rows = compare_rows(trajectories[base], trajectories[ref], manifest, limits)
        result[name] = dict(reference=list(ref), cases=rows, passed=all(row['passed'] for row in rows))
    required = ('linearTolerance', 'thermalTolerance', 'bothTolerances', 'referenceSmallerDt', 'referenceSpatial')
    if 'referenceTransportCfl' in manifest:
        base = (*manifest['referenceTransportCfl'], 'base')
        ref = (*manifest['referenceTransportCfl'], 'transport')
        required += ('referenceTransportCfl',)
        if base not in trajectories or ref not in trajectories:
            result['requirementsGaps'].append('Missing referenceTransportCfl')
        else:
            rows = compare_rows(trajectories[base], trajectories[ref], manifest, (.001,)*3)
            result['referenceTransportCfl'] = dict(reference=list(ref), cases=rows,
                passed=all(row['passed'] for row in rows))
    result['numericallyQualified'] = (not result['failures'] and not result['requirementsGaps']
        and set(result['series']) == set(SERIES) and all(s['passed'] for s in result['series'].values())
        and all(result.get(name, {}).get('passed') is True for name in required))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('raw', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    raw = json.loads(args.raw.read_text())
    canonical = Path(__file__).with_name('manifest.json')
    require(raw['manifest'] == json.loads(canonical.read_text()), 'Stale or migrated canonical manifest')
    result = analyze(raw)
    result['inputHashes'] = {args.raw.name: hashlib.sha256(args.raw.read_bytes()).hexdigest()}
    result['sourceHashes'] = {'analyze.py': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    result['manifestHash'] = hashlib.sha256(canonical.read_bytes()).hexdigest()
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(json.dumps(dict(numericallyQualified=result['numericallyQualified'], gaps=result['requirementsGaps'])))
    raise SystemExit(0 if result['numericallyQualified'] else 1)
