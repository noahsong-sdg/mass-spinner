"""Independent saved-state/clock/panel audit; imports no producing flow solver."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import sys
import numpy as np
from numpy.polynomial.legendre import leggauss

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'scientific/meridional-v86'))
from audit86 import primitive, interpolate, FIELDS, BASELINE, TIMES

SOURCES = ('scientific/coupled-v99/campaign99.py', 'scientific/coupled-v99/PROTOCOL.md',
    'scientific/mixture-axial-v75/flow.py', 'scientific/meridional-v86/diffusion86.py',
    'scientific/meridional-v86/electro86.py', 'scientific/electrical-v82/transport82.py',
    'scientific/flow-v81/transport.py', 'scientific/flow-v81/argon-viscosity-source.json',
    'scientific/boundary-v84/results/predictions.json')
JOBS = {(1, .1), (2, .1), (4, .1), (2, .2), (2, .05)}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def edges(n):
    def split(cuts, counts):
        return np.concatenate([np.linspace(a, b, count*n, endpoint=False)
            for a, b, count in zip(cuts[:-1], cuts[1:], counts)]+[np.array([cuts[-1]])])
    return split([0, .004, .056, .06], [4, 8, 4]), split([0, .06, .08, .232, .24], [4, 4, 12, 4])


def unit_clock(r, z, q):
    """Independent volume/acoustic-face CFL bound at an archived state."""
    p = primitive(r, z, q)
    sr, sz = (abs(p[k])+p['soundMPS'] for k in ('vrMPS', 'vzMPS'))
    fr = np.c_[sr[:, 0], np.maximum(sr[:, :-1], sr[:, 1:]), sr[:, -1]]
    fz = np.r_[sz[:1], np.maximum(sz[:-1], sz[1:]), sz[-1:]]
    ar = 2*np.pi*np.diff(z)[:, None]*r[None, :]
    az = np.pi*np.diff(r*r)[None, :]
    volume = np.diff(z)[:, None]*az
    denominator = ar[:, :-1]*fr[:, :-1]+ar[:, 1:]*fr[:, 1:]+az*(fz[:-1]+fz[1:])
    return float(np.min(volume/denominator))


def panels(a, b, order):
    """Union of bilinear reconstruction knots: order2 integrates squares*r exactly."""
    knots = []
    for state in (a, b):
        r, z = (np.asarray(state[k]) for k in ('radialEdgesM', 'axialEdgesM'))
        knots.append((np.r_[0, (2/3)*np.diff(r**3)/np.diff(r*r), r[-1]],
                      np.r_[0, (z[:-1]+z[1:])/2, z[-1]]))
    r, z = (np.union1d(knots[0][i], knots[1][i]) for i in (0, 1))
    x, w = leggauss(order)
    def quadrature(v):
        return ((v[:-1, None]+v[1:, None])/2+np.diff(v)[:, None]*x/2).ravel(), (np.diff(v)[:, None]*w/2).ravel()
    rq, rw = quadrature(r)
    zq, zw = quadrature(z)
    rr, zz = np.meshgrid(rq, zq)
    weight = (2*np.pi*rr*zw[:, None]*rw[None, :]).ravel()
    return np.column_stack((zz.ravel(), rr.ravel())), weight


def metrics(a, b, ti, order):
    points, weight = panels(a, b, order)
    result = {}
    for name in FIELDS:
        for increment in ((False, True) if name in FIELDS[:2] else (False,)):
            av, bv = [interpolate(s, s['snapshots'][ti], name, points, increment) for s in (a, b)]
            tag = name+('/increment' if increment else '')
            result[tag] = dict(errorIntegral=float(weight@((av-bv)**2)),
                referenceIntegral=float(weight@(bv*bv)))
    meridional = result['vrMPS']['referenceIntegral']+result['vzMPS']['referenceIntegral']
    for name, row in result.items():
        denominator = meridional if name in ('vrMPS', 'vzMPS') else row['referenceIntegral']
        row.update(referenceRMS=float(np.sqrt(denominator/weight.sum())),
            absoluteRMS=float(np.sqrt(row['errorIntegral']/weight.sum())),
            value=float(np.sqrt(row['errorIntegral']/denominator)) if denominator else
                (0. if row['errorIntegral'] == 0 else None))
    return result


def audit(path, root=ROOT, cfl_field='actualCfl', expected_edges=None, *,
          jobs=None, reporting_times=None, comparison_groups=None):
    path, root = Path(path).resolve(), Path(root).resolve()
    declared_jobs = JOBS if jobs is None else set(jobs)
    times = TIMES if reporting_times is None else tuple(reporting_times)
    groups = ([('spatial', [(n, .1) for n in (1, 2, 4)]),
               ('timestep', [(2, c) for c in (.2, .1, .05)])]
              if comparison_groups is None else list(comparison_groups))
    require(bool(declared_jobs) and all(type(n) is int and n > 0 and
        np.isfinite(cfl) and cfl > 0 for n, cfl in declared_jobs), 'Invalid declared jobs')
    require(len(times) >= 2 and times[0] == 0 and np.isfinite(times).all() and
        np.all(np.diff(times) > 0), 'Invalid reporting clocks')
    require(all(kind in ('spatial', 'timestep') and len(keys) == 3
        and len(set(keys)) == 3 and set(keys) <= declared_jobs for kind, keys in groups),
        'Invalid comparison layout')
    require(cfl_field in ('actualCfl', 'cflBound'), 'Select explicit configured-CFL metadata schema')
    raw = path.read_bytes()
    packet = json.loads(raw)
    baseline_raw = (root/SOURCES[-1]).read_bytes()
    require(sha(baseline_raw) == packet['baselinePredictionSHA256'] == BASELINE, 'Baseline seal mismatch')
    baseline = json.loads(baseline_raw)
    require(packet['sourceSHA256'] == {p: sha((root/p).read_bytes()) for p in SOURCES}, 'Source seal mismatch')
    require(packet['manifest'] == baseline['manifest'] and packet['scenario'] == baseline['scenarios'][0], 'Changed physical inputs')
    require(packet['timesS'] == list(times), 'Changed reporting clocks')
    for flag in ('targetVelocityRead', 'currentFitted', 'velocityFitted', 'experimentalQualification'):
        require(packet[flag] is False, 'False fitting/qualification claim')
    require(packet['conditionalRelease'] is True, 'Conditional scope missing')
    cases = {(c['refinement'], c['cfl']): c for c in packet['cases']}
    require(len(packet['cases']) == len(declared_jobs) and set(cases) == declared_jobs, 'Incomplete/duplicate job matrix')
    gates, states, sequences, ledgers = [], {}, {}, {}
    def gate(kind, context, value, limit):
        valid = value is not None and np.isfinite(value) and 0 <= value < limit
        gates.append(dict(kind=kind, context=context, value=value if value is None or np.isfinite(value) else None, limit=limit, passed=bool(valid)))
    if not groups:
        gate('missingComparison', 'layout', None, .05)
    for key, case in cases.items():
        n, cfl = key
        name = str(key)
        require(type(n) is int, 'Integer refinement required')
        expected_mesh = edges(n) if expected_edges is None else expected_edges(n)
        require(case['nr'] == len(expected_mesh[0])-1 and case['nz'] == len(expected_mesh[1])-1 and case['maxDtS'] == 1e-7 and case['anodeCenterM'] == .07, 'Job geometry/clock drift')
        if case['completed'] is not True:
            gate('completion', name, None, 1.)
            continue
        p = case['fieldPacket']
        field = (path.parent/p['path']).resolve()
        require(field.parent == path.parent/'fields', 'Invalid field path')
        packed = field.read_bytes()
        require(sha(packed) == p['sha256'], 'Field seal mismatch')
        payload = gzip.decompress(packed)
        require(sha(payload) == p['rawSHA256'], 'Raw field seal mismatch')
        state = json.loads(payload)
        r, z = (np.asarray(state[k], dtype=float) for k in ('radialEdgesM', 'axialEdgesM'))
        for saved, expected in zip((r, z), expected_mesh):
            require(saved.shape == expected.shape and np.isfinite(saved).all() and
                np.allclose(saved, expected, rtol=0, atol=1e-15), 'Changed nested mesh')
        for flag, expected in dict(conditionalRelease=True, thermalSteadyState=False,
                experimentalQualification=False, prescribedCurrent=True, absoluteCurrentPrediction=False).items():
            require(state[flag] is expected, 'State qualification scope drift')
        require(state['cfl'] == cfl, 'State CFL drift')
        snaps, history = state['snapshots'], state['history']
        require([s['timeS'] for s in snaps] == list(times), 'Snapshot clock drift')
        require(len(history) == case['stepCount'] and len(history) > 0, 'Missing step history')
        rc = (2/3)*np.diff(r**3)/np.diff(r*r)
        overlap = np.maximum(0., np.minimum(r[1:], .004)**2-r[:-1]**2)
        discrete = .5*.13*(100*.06**2-np.sum(100*overlap/.004**2*rc**2))
        continuum = .5*.13*100*(.06**2-.004**2/2)
        require(np.isclose(state['discreteTorqueNm'], discrete, rtol=2e-12, atol=0) and
            np.isclose(state['continuumDiskTorqueNm'], continuum, rtol=2e-12, atol=0) and
            np.isclose(state['relativeTorqueFootprintError'], abs(discrete-continuum)/abs(continuum), rtol=2e-10, atol=1e-15), 'Torque footprint drift')
        initial = np.asarray(snaps[0]['q']).sum(axis=(1, 2))
        archived = {s['timeS']: s for s in snaps}
        elapsed, cumulative = 0., {}
        for h in history:
            dt, t, unit = (h[k] for k in ('dtS', 'timeS', 'unitCflStableDtS'))
            target = next((v for v in times if v > elapsed+1e-18), None)
            if elapsed in archived:
                require(np.isclose(unit, unit_clock(r, z, archived[elapsed]['q']), rtol=2e-12, atol=0), 'Independent acoustic CFL mismatch')
            require(target is not None and np.isfinite([dt, t, unit, h[cfl_field]]).all() and
                min(dt, unit) > 0 and abs(t-elapsed-dt) < 1e-16 and
                np.isclose(dt, min(1e-7, target-elapsed, cfl*unit), rtol=2e-12, atol=1e-20) and
                h[cfl_field] == cfl and dt/unit <= cfl*(1+2e-12), 'Invalid accepted clock/CFL')
            elapsed = t
            for metric, limit in [('massRelativeDrift', 1e-10), ('speciesRelativeDrift', 1e-10),
                    ('energyRelativeDefect', 1e-8), ('chargeRelativeResidual', 1e-9), ('angularRelativeDefect', 1e-8)]:
                gate('history', name+'/'+metric+'/'+str(t), h[metric], limit)
            for metric in ('ohmicJ', 'emNumericalHeatJ', 'viscousHeatJ', 'viscousNumericalHeatJ'):
                require(np.isfinite(h[metric]) and h[metric] >= 0, 'Invalid heating ledger')
            require(np.isfinite([h[k] for k in ('maximumTemperatureK', 'minimumTemperatureK', 'maximumTotalMach',
                'electricalWorkJ', 'externalAngularImpulseKgM2S', 'wallAngularImpulseKgM2S', 'hydroAngularDefectKgM2S')]).all()
                and 0 < h['minimumTemperatureK'] <= h['maximumTemperatureK'] and h['maximumTotalMach'] >= 0, 'Invalid physical history')
            require(np.isclose(h['externalAngularImpulseKgM2S'], discrete*t, rtol=2e-12, atol=1e-20), 'Boundary-current impulse drift')
            scale = max(abs(initial[3]), abs(h['externalAngularImpulseKgM2S']), abs(h['wallAngularImpulseKgM2S']), np.finfo(float).tiny)
            gate('hydroAngular', name+'/'+str(t), abs(h['hydroAngularDefectKgM2S'])/scale, 1e-10)
            cumulative[t] = h
        require(abs(elapsed-times[-1]) < 1e-16, 'Truncated trajectory')
        for s in snaps:
            rebuilt = primitive(r, z, s['q'])
            for metric, expected in rebuilt.items():
                actual = np.asarray(s[metric], dtype=float)
                require(actual.shape == expected.shape and np.isfinite(actual).all() and
                    np.allclose(actual, expected, rtol=2e-12, atol=0), 'Corrupt primitive '+metric)
            total = np.asarray(s['q']).sum(axis=(1, 2))
            h = cumulative.get(s['timeS'])
            if h is None:
                require(s['timeS'] == 0 and np.all(np.asarray(s['q'])[1:3] == 0), 'Missing reporting ledger')
                work, external, wall = 0., 0., 0.
            else:
                work, external, wall = (h[k] for k in ('electricalWorkJ', 'externalAngularImpulseKgM2S', 'wallAngularImpulseKgM2S'))
                require(np.isclose(np.max(rebuilt['temperatureK']), h['maximumTemperatureK'], rtol=2e-12), 'Snapshot/history extrema drift')
            for i in (0, 5):
                gate('snapshotMass', name+'/'+str(s['timeS'])+'/'+str(i), abs(total[i]-initial[i])/initial[i], 1e-10)
            gate('snapshotEnergy', name+'/'+str(s['timeS']), abs(total[4]-initial[4]-work)/max(abs(total[4]-initial[4]), abs(work), initial[4]), 1e-8)
            gate('snapshotAngular', name+'/'+str(s['timeS']), abs(total[3]-initial[3]-external-wall)/max(abs(initial[3]), abs(external), abs(wall), np.finfo(float).tiny), 1e-8)
        require(np.isclose(case['maximumTemperatureK'], max(h['maximumTemperatureK'] for h in history), rtol=2e-12), 'Case extrema drift')
        realized = [h['dtS']/h['unitCflStableDtS'] for h in history]
        states[key], sequences[key], ledgers[name] = state, [h['dtS'] for h in history], dict(discreteTorqueNm=discrete, continuumDiskTorqueNm=continuum, realizedCflRange=[min(realized), max(realized)])
    comparisons, quadratures = [], []
    for group_index, (kind, keys) in enumerate(groups):
        limit = .05 if kind == 'spatial' else .02
        repeated = sum(group_kind == kind for group_kind, _ in groups) > 1
        context_kind = kind+'['+str(group_index)+']' if repeated else kind
        group_tag = dict(groupIndex=group_index) if repeated else {}
        if not all(k in states for k in keys):
            gate('missingComparison', context_kind, None, limit)
            continue
        if kind == 'timestep':
            for a, b in zip(keys[:-1], keys[1:]):
                gate('distinctClocks', str((a, b)), 0. if sequences[a] != sequences[b] else 1., 1.)
        for ti, t in enumerate(times):
            pairs = [{order: metrics(states[a], states[b], ti, order) for order in (2, 3)}
                     for a, b in zip(keys[:-1], keys[1:])]
            for field in pairs[0][2]:
                x, y = (pair[2][field]['value'] for pair in pairs)
                contraction = x is not None and y is not None and (y < x or x == y == 0)
                gate('refinement', context_kind+'/'+str(t)+'/'+field, y, limit)
                gate('contraction', context_kind+'/'+str(t)+'/'+field, 0. if contraction else 1., 1.)
                comparisons.append(dict(kind=kind, timeS=t, field=field, coarseChange=x, fineChange=y, contraction=bool(contraction), limit=limit, **group_tag))
                for index, pair in enumerate(pairs):
                    for term in ('errorIntegral', 'referenceIntegral'):
                        a, b = (pair[o][field][term] for o in (2, 3))
                        spread = abs(a-b)/max(abs(a), abs(b)) if a or b else 0.
                        gate('panelQuadrature', context_kind+'/'+str(t)+'/'+field+'/'+str(index)+'/'+term, spread, 1e-10)
                        quadratures.append(dict(kind=kind, timeS=t, field=field, pair=index, term=term, values=[a, b], relativeSpread=spread, **group_tag))
    return dict(predictionSHA256=sha(raw), producerSourceSHA256=packet['sourceSHA256'],
        auditorSHA256=sha(Path(__file__).read_bytes()), caseCount=len(cases), gates=gates,
        primitiveInterpolationSHA256=sha((ROOT/'scientific/meridional-v86/audit86.py').read_bytes()),
        failures=[g for g in gates if not g['passed']], comparisons=comparisons, panelQuadratures=quadratures,
        actualStepSequences={str(k): v for k, v in sequences.items()}, torqueFootprints=ledgers,
        cflMetadataInterpretation=cfl_field+' stores configured bound; realized CFL independently reconstructed as dt/unit',
        allRequiredNumericalPass=all(g['passed'] for g in gates), conditionalRelease=True,
        experimentalQualification=False, opticalScoringPerformed=False,
        scope='Saved-state and producer-step-ledger replay; exact-panel integration of reconstructed fields. No independent PDE assembly, true-step raw-field archive or experimental qualification.')


if __name__ == '__main__':
    require(sys.platform == 'linux' and os.getuid() == 1000, 'Execute only inside safe-dev')
    require(len(sys.argv) in (4, 5), 'Supply predictions JSON, producer root, new output JSON and optional configured-CFL field')
    result = audit(sys.argv[1], sys.argv[2], sys.argv[4] if len(sys.argv) == 5 else 'actualCfl')
    with Path(sys.argv[3]).open('x') as output:
        output.write(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(json.dumps(dict(gates=len(result['gates']), failures=len(result['failures']), passed=result['allRequiredNumericalPass'])))
    raise SystemExit(not result['allRequiredNumericalPass'])
