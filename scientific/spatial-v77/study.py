"""Separate spatial and temporal refinement without changing the frozen PDE.

Run offline in safe-dev. This supplementary study retains both v76 verdicts.
Its plan is sealed before either new trajectory. Recorded intermediate audits
are inspected and endpoint observables reconstructed; this is not PDE replay.
"""
import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
import hashlib
from importlib.metadata import version
import json
import multiprocessing
from pathlib import Path
import platform
import sys
import numpy as np

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent/'mixture-axial-v75'
sys.path.insert(0, str(SOURCE))
sys.path.insert(0, str(HERE.parent/'spatial-v76'))
from run import hashes, requests, trajectory
from analyze import FIELDS, compare_rows, primitives, restrict_linear, response_scale
from verify import require, trajectory as admit_trajectory
from common_space import compare_profiles
from parallel_study import check_backup, save_checkpoint

NEW = ((64, 64, 256, 'base'), (96, 96, 256, 'base'))
REUSED = ((48, 48, 256, 'base'), (96, 96, 512, 'base'))
LIMITS = dict(rms=.02, local=.05, observable=.02)
METRIC = HERE.parent/'spatial-v76/common_space.py'


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def runtime():
    return dict(python=platform.python_version(), numpy=version('numpy'),
                scipy=version('scipy'), fipy=version('fipy'))


def key(t):
    return tuple(t[k] for k in ('nr', 'nz', 'nt', 'mode'))


def write(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False)+'\n')


def baseline(path):
    raw = json.loads(path.read_text())
    manifest = json.loads((SOURCE/'manifest.json').read_text())
    require(raw['manifest'] == manifest and raw['sourceHashes'] == hashes(), 'Stale physical source/manifest')
    require(raw['preRunRuntime'] == runtime() and raw['failures'] == [], 'Stale runtime or producer failure')
    keys = [key(t) for t in raw['cases']]
    require(len(keys) == len(set(keys)) and set(keys) == set(requests(manifest)), 'Incomplete baseline')
    return raw


def freeze(base_path, output):
    require(not output.exists(), 'Preserve previous plans')
    raw = baseline(base_path)
    plan = dict(schemaVersion=1, new=[list(k) for k in NEW], reused=[list(k) for k in REUSED],
        limits=LIMITS, fields=list(FIELDS), baselineSha256=digest(base_path),
        producerSourceHashes=hashes(), manifestSha256=digest(SOURCE/'manifest.json'),
        extensionSourceSha256=digest(__file__), commonMetricSha256=digest(METRIC),
        checkpointSourceSha256=digest(HERE.parent/'spatial-v76/parallel_study.py'),
        runtime=raw['preRunRuntime'],
        scope='48/64/96 grids at 256 outer steps; separate 96-grid 256/512 timestep comparison. Both metrics required. No GCI or experimental qualification.')
    write(output, plan)
    return plan


def bind(base_path, plan_path):
    raw, plan = baseline(base_path), json.loads(plan_path.read_text())
    require(plan['schemaVersion'] == 1 and plan['new'] == [list(k) for k in NEW]
        and plan['reused'] == [list(k) for k in REUSED], 'Changed sampling plan')
    require(plan['limits'] == LIMITS and plan['fields'] == list(FIELDS), 'Changed thresholds/fields')
    require(plan['baselineSha256'] == digest(base_path) and plan['producerSourceHashes'] == hashes()
        and plan['manifestSha256'] == digest(SOURCE/'manifest.json'), 'Stale input/source plan')
    require(plan['extensionSourceSha256'] == digest(__file__) and plan['commonMetricSha256'] == digest(METRIC)
        and plan['checkpointSourceSha256'] == digest(HERE.parent/'spatial-v76/parallel_study.py')
        and plan['runtime'] == runtime(), 'Changed study implementation/runtime')
    return raw, plan


def produce(base_path, plan_path, output, backup):
    require(not output.exists(), 'Preserve previous studies')
    require(output.resolve() != backup.resolve(), 'Project and persistent checkpoint must be distinct')
    check_backup(backup)
    raw, plan = bind(base_path, plan_path)
    report = dict(manifest=raw['manifest'], sourceHashes=hashes(), preRunRuntime=runtime(),
        planSha256=digest(plan_path), baselineSha256=digest(base_path),
        extensionSourceSha256=digest(__file__), cases=[], failures=[],
        experimentalQualified=False, liveQualified=False)
    save_checkpoint(report, output, plan['producerSourceHashes'], backup)
    # The small plan/source copies survive replacement of /work/project too.
    proof = backup.with_suffix('.proof')
    proof.mkdir()
    for path in (Path(__file__), plan_path):
        (proof/path.name).write_bytes(path.read_bytes())
        require(digest(proof/path.name) == digest(path), 'Failed pre-run proof copy')
    with ProcessPoolExecutor(max_workers=2, mp_context=multiprocessing.get_context('spawn')) as pool:
        pending = {pool.submit(trajectory, raw['manifest'], *k): k for k in NEW}
        for future in as_completed(pending):
            k = pending[future]
            try:
                report['cases'].append(future.result())
            except Exception as error:
                report['failures'].append(dict(key=list(k), error=repr(error)))
            save_checkpoint(report, output, plan['producerSourceHashes'], backup)
            print(json.dumps(dict(completed=len(report['cases']), failures=report['failures'])), flush=True)
    return not report['failures']


def compare(coarse, reference, manifest, common):
    rows = compare_rows(coarse, reference, manifest, tuple(LIMITS.values()))
    if common:
        for row, c, r in zip(rows, coarse['cases'], reference['cases']):
            require(row['timeS'] == c['timeS'] == r['timeS'], 'Mismatched comparison time')
            row['profiles'] = compare_profiles(coarse, c, reference, r, manifest)
            row['passed'] = (all(p['rmsNormalized'] < LIMITS['rms'] and p['maxNormalized'] < LIMITS['local']
                                for p in row['profiles'].values())
                            and all(v < LIMITS['observable'] for v in row['observablesNormalized'].values()))
    return rows


def evaluations(lookup, manifest):
    require(all(k in lookup for k in (*NEW, *REUSED)), 'Missing fixed-timestep or time-refinement trajectory')
    require(all(key(lookup[k]) == k for k in (*NEW, *REUSED)), 'Wrong comparison resolution')
    result = {}
    for common in (False, True):
        spatial = [compare(lookup[k], lookup[NEW[1]], manifest, common) for k in (REUSED[0], NEW[0])]
        temporal = compare(lookup[NEW[1]], lookup[REUSED[1]], manifest, common)
        gates = []
        for name, comparisons in (('spatial', spatial), ('temporal', [temporal])):
            for level, rows in enumerate(comparisons):
                for row in rows:
                    prefix = f'{name}:{level}:{row["timeS"]}:'
                    for field, p in row['profiles'].items():
                        for label, limit in (('rms', LIMITS['rms']), ('max', LIMITS['local'])):
                            value = p['rmsNormalized' if label == 'rms' else 'maxNormalized']
                            gates.append(dict(name=prefix+field+':'+label, value=value, passed=value < limit))
                    gates.extend(dict(name=prefix+field, value=value, passed=value < LIMITS['observable'])
                                 for field, value in row['observablesNormalized'].items())
        for i, time in enumerate(manifest['timesS']):
            for field in FIELDS:
                values = [rows[i]['profiles'][field]['rmsNormalized'] for rows in spatial]
                gates.append(dict(name=f'spatial:{time}:{field}:decreasing', values=values,
                    passed=max(values) < .002 or values[1] <= values[0]+1e-12))
        result['commonSpace' if common else 'cellAverage'] = dict(spatial=spatial, temporal=temporal,
            gates=gates, passed=all(g['passed'] for g in gates))
    return result


def projection_budget(coarse, reference, manifest):
    """Exact L2 decomposition of represented velocity error, on one grid."""
    r, z = [np.asarray(coarse['setup'][k]) for k in ('r', 'z')]
    rr, zz = [np.asarray(reference['setup'][k]) for k in ('r', 'z')]
    weights = np.diff(zz)[:, None]*np.diff(rr*rr)[None, :]
    weights /= weights.sum()
    prolong = lambda v: restrict_linear(v, zz, z, rr*rr, r*r)
    rows = []
    for c, f in zip(coarse['cases'], reference['cases']):
        a, b = [primitives(t, e)['vz'] for t, e in ((coarse, c), (reference, f))]
        averaged = restrict_linear(b, z, zz, r*r, rr*rr)
        resolved, unresolved = prolong(a-averaged), prolong(averaged)-b
        total = prolong(a)-b
        norm2 = lambda v: float(np.sum(weights*v*v))
        cross = float(2*np.sum(weights*resolved*unresolved))
        defect = abs(norm2(total)-norm2(resolved)-norm2(unresolved)-cross)
        # The subtraction/reconstruction roundoff scales with operand speed,
        # even when the physical error vanishes. This is an identity check,
        # separate from the unchanged physical accuracy limits.
        require(defect <= 1024*np.finfo(float).eps*max(norm2(prolong(a)), norm2(b),
                norm2(resolved)+norm2(unresolved)),
                'Velocity error decomposition does not close')
        scale = response_scale('vz', b, manifest)
        rows.append(dict(timeS=c['timeS'], normalizedResolvedRms=np.sqrt(norm2(resolved))/scale,
            normalizedUnresolvedRms=np.sqrt(norm2(unresolved))/scale,
            normalizedTotalRms=np.sqrt(norm2(total))/scale, crossTermM2S2=cross,
            closureResidualM2S2=defect, normalizationMPS=scale))
    return rows


def observable_budget(coarse, fixed_time, fine_time):
    """Signed space/time contributions on the original observable scale."""
    names = set(fine_time['cases'][0]['observables'])
    scales = {n: max(abs(c['observables'][n]) for c in fine_time['cases']) for n in names}
    rows = []
    for a, b, c in zip(coarse['cases'], fixed_time['cases'], fine_time['cases']):
        require(a['timeS'] == b['timeS'] == c['timeS'], 'Mismatched budget times')
        values = {}
        for n in sorted(names):
            x, y, z = [e['observables'][n] for e in (a, b, c)]
            scale = max(scales[n], 1e-20)
            space, time, combined = (x-y)/scale, (y-z)/scale, (x-z)/scale
            total = abs(space)+abs(time)
            values[n] = dict(spatialNormalized=space, temporalNormalized=time,
                combinedNormalized=combined,
                cancellationFraction=1-abs(combined)/total if total > 0 else None)
        rows.append(dict(timeS=c['timeS'], observables=values))
    return rows


def analyze_study(base_path, plan_path, raw_path, output):
    require(not output.exists(), 'Preserve previous analysis')
    base, plan = bind(base_path, plan_path)
    extra = json.loads(raw_path.read_text())
    require(extra['sourceHashes'] == hashes() and extra['manifest'] == base['manifest']
        and extra['preRunRuntime'] == runtime() and extra['failures'] == [], 'Stale/failed supplemental solve')
    require(extra['baselineSha256'] == digest(base_path) and extra['planSha256'] == digest(plan_path)
        and extra['extensionSourceSha256'] == digest(__file__), 'Unplanned supplemental solve')
    require(len(extra['cases']) == len(NEW) and {key(t) for t in extra['cases']} == set(NEW),
            'Missing, extra or duplicate supplemental trajectory')
    errors = [admit_trajectory(t, base['manifest']) for t in base['cases']+extra['cases']]
    lookup = {key(t): t for t in base['cases']+extra['cases']}
    result = evaluations(lookup, base['manifest'])
    result.update(passed=all(row['passed'] for row in result.values()),
        velocityProjection={str(n): projection_budget(lookup[(48, n, 256, 'base')],
            lookup[REUSED[0]], base['manifest']) for n in (6, 12)},
        observableBudget=observable_budget(lookup[REUSED[0]], lookup[NEW[1]], lookup[REUSED[1]]),
        producerSourceHashes=hashes(), runtime=runtime(),
        inputHashes={p.name: digest(p) for p in (base_path, plan_path, raw_path)},
        extensionSourceSha256=digest(__file__), commonMetricSha256=digest(METRIC),
        admittedTrajectoryCount=len(errors), admittedEndpointCount=sum(len(t['cases']) for t in lookup.values()),
        maximumEndpointObservableError=max(max(e.values()) for e in errors),
        experimentalQualified=False, liveQualified=False,
        scope=plan['scope']+' Original v76 verdicts unchanged. Controls remain in frozen baseline evidence.')
    write(output, result)
    print(json.dumps(dict(passed=result['passed'], failedGates={name:[g for g in result[name]['gates']
        if not g['passed']] for name in ('cellAverage', 'commonSpace')})), flush=True)
    return result['passed']


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('freeze', 'run', 'analyze'))
    for name in ('base', 'plan', 'raw', 'output', 'backup'):
        parser.add_argument('--'+name, type=Path)
    args = parser.parse_args()
    require(args.base is not None and args.plan is not None, 'Need baseline and plan paths')
    if args.action == 'freeze':
        freeze(args.base, args.plan)
    elif args.action == 'run':
        require(args.raw is not None and args.backup is not None, 'Need output and persistent backup paths')
        raise SystemExit(0 if produce(args.base, args.plan, args.raw, args.backup) else 1)
    else:
        require(args.raw is not None and args.output is not None, 'Need raw and analysis output paths')
        require(len({p.resolve() for p in (args.base, args.plan, args.raw, args.output)}) == 4, 'Input/output collision')
        raise SystemExit(0 if analyze_study(args.base, args.plan, args.raw, args.output) else 1)
