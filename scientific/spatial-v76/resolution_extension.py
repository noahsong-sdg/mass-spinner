"""Append prospective mesh samples without relabeling a failed frozen study.

Run only in safe-dev. Physical source and canonical physical manifest must be
byte-identical for every reused/new trajectory. Only the analysis sampling
lists are extended, retaining all original comparisons and fixed thresholds.
"""
import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
from copy import deepcopy
import hashlib
from importlib.metadata import version
import json
import multiprocessing
from pathlib import Path
import platform
import sys

SOURCE = Path(__file__).resolve().parents[1]/'mixture-axial-v75'
sys.path.insert(0, str(SOURCE))
from run import hashes, requests, serial, trajectory
from analyze import analyze, requested
from verify import control, finite, require, trajectory as admit_trajectory


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def extended_manifest(base, plan):
    require(plan['schemaVersion'] == 1 and plan['limits'] == dict(rms=.02, local=.05, observable=.02),
            'Changed extension schema or thresholds')
    require(set(plan['levels']) == {'spatial', 'radial', 'axial'}, 'Missing extension direction')
    result = deepcopy(base)
    reference = base['joint'][-1]
    for name, level in plan['levels'].items():
        require(len(level) == 3 and all(type(v) is int and v > 0 for v in level), 'Invalid mesh extension')
        old = base[name][-1]
        dimensions = (0, 1) if name == 'spatial' else (0,) if name == 'radial' else (1,)
        require(level[2] == old[2] and all(old[d] < level[d] < reference[d] for d in dimensions),
                'Extension must refine the terminal mesh at fixed timestep')
        require(all(level[d] == reference[d] for d in (0, 1) if d not in dimensions),
                'Extension changed an uncontrolled direction')
        result[name].append(level.copy())
    return result


def bind(raw, manifest):
    runtime = dict(python=platform.python_version(), numpy=version('numpy'), scipy=version('scipy'), fipy=version('fipy'))
    require(raw['manifest'] == manifest and raw['sourceHashes'] == hashes(), 'Changed physical source or manifest')
    require(raw['preRunRuntime'] == runtime and raw['failures'] == [], 'Changed runtime or producer failures')


def keys(raw):
    result = [(t['nr'], t['nz'], t['nt'], t['mode']) for t in raw['cases']]
    require(len(result) == len(set(result)), 'Duplicate origin trajectory')
    return set(result)


def inputs(base_path, plan_path):
    require(base_path.name != plan_path.name, 'Input filenames must be distinct for hash binding')
    base, plan = [json.loads(p.read_text()) for p in (base_path, plan_path)]
    manifest = json.loads((SOURCE/'manifest.json').read_text())
    bind(base, manifest)
    require(keys(base) == set(requests(manifest)), 'Incomplete baseline sampling')
    require(plan['baseManifestSha256'] == digest(SOURCE/'manifest.json'), 'Stale extension plan')
    extended = extended_manifest(manifest, plan)
    origins = {p.name: digest(p) for p in (base_path, plan_path)}
    return base, manifest, extended, origins


def write(path, value):
    temporary = path.with_suffix('.partial.tmp')
    temporary.write_text(json.dumps(value, default=serial, indent=2, allow_nan=False)+'\n')
    temporary.replace(path)


def run_extension(base_path, plan_path, output):
    require(not output.exists(), 'Extension output must be new; preserve prior attempts')
    base, manifest, extended, origins = inputs(base_path, plan_path)
    pending_keys = sorted(requested(extended)-keys(base))
    report = dict(manifest=manifest, sourceHashes=hashes(), preRunRuntime=base['preRunRuntime'],
        inputHashes=origins, extensionSourceSha256=digest(__file__), cases=[], failures=[],
        experimentalQualified=False, liveQualified=False)
    write(output, report)
    with ProcessPoolExecutor(max_workers=3, mp_context=multiprocessing.get_context('spawn')) as pool:
        futures = {pool.submit(trajectory, manifest, *key): key for key in pending_keys}
        for future in as_completed(futures):
            key = futures[future]
            try:
                report['cases'].append(future.result())
            except Exception as error:
                report['failures'].append(dict(zip(('nr', 'nz', 'nt', 'mode'), key), error=repr(error)))
            require(report['sourceHashes'] == hashes(), 'Physical source changed during extension')
            write(output, report)
            print(f'EXTENSION {len(report["cases"])}/{len(pending_keys)} failures={len(report["failures"])}', flush=True)
    return 1 if report['failures'] else 0


def analyze_extension(base_path, plan_path, extra_path, output, receipt):
    paths = (base_path, plan_path, extra_path, output, receipt)
    require(len({p.name for p in paths}) == len(paths), 'Input/output filenames must be distinct')
    base, manifest, extended, origins = inputs(base_path, plan_path)
    extra = json.loads(extra_path.read_text())
    bind(extra, manifest)
    require(extra['inputHashes'] == origins and extra['extensionSourceSha256'] == digest(__file__),
            'Stale extension source/input binding')
    require(keys(extra) == requested(extended)-keys(base), 'Incomplete or unexpected extension')
    trajectories = base['cases']+extra['cases']
    errors = [admit_trajectory(t, manifest) for t in trajectories]
    for filename, files in (('controls-03.json', ('controls.py', 'flow.py')),
        ('diffusion-controls-03.json', ('diffusion_controls.py', 'diffusion.py', 'flow.py', 'controls.py'))):
        control(json.loads((SOURCE/filename).read_text()), files, SOURCE)
    audit = json.loads((SOURCE/'audit-03.json').read_text())
    require(audit['passed'] is True and audit['manifest'] == manifest and audit['sourceHashes'] == hashes(),
            'Stale or failed corruption controls')
    require(set(audit['positiveChecks']) == {'hydro', 'diffusion', 'magnetic', 'source'} and finite(audit['positiveChecks']),
            'Missing positive corruption baseline')
    negative_names = {'mass', 'species', 'angularMomentum', 'energy', 'enthalpyFlux', 'sourceNumericalHeat'}
    require(len(audit['negativeControls']) == 6 and {r['name'] for r in audit['negativeControls']} == negative_names
            and all(r['rejected'] is True for r in audit['negativeControls']), 'Incomplete corruption controls')
    result = analyze(dict(manifest=extended, cases=trajectories, failures=[]))
    result.update(inputHashes=dict(origins, **{extra_path.name: digest(extra_path)}),
        sourceHashes={'analyze.py': digest(SOURCE/'analyze.py'), Path(__file__).name: digest(__file__)},
        scope='Extended sampling plan; original baseline convergence outcome remains unchanged')
    write(output, result)
    evidence = dict(passed=result['numericallyQualified'], trajectoryCount=len(trajectories),
        endpointCount=sum(len(t['cases']) for t in trajectories), physicalSourceHashes=hashes(),
        artifactHashes=dict(result['inputHashes'], **{output.name: digest(output),
            **{n: digest(SOURCE/n) for n in ('controls-03.json', 'diffusion-controls-03.json', 'audit-03.json')}}),
        extensionSourceSha256=digest(__file__), maximumEndpointObservableError=max(max(r.values()) for r in errors),
        experimentalQualified=False, liveQualified=False,
        scope='Recorded inner audits and independent endpoint/ledger admission; no PDE replay or experimental qualification')
    write(receipt, evidence)
    print(json.dumps(dict(passed=evidence['passed'],
        failedGates={k: sum(not g['passed'] for g in v['gates']) for k, v in result['series'].items()})))
    return 0 if evidence['passed'] else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('run', 'analyze'))
    for name in ('base', 'plan', 'output'):
        parser.add_argument('--'+name, type=Path, required=True)
    parser.add_argument('--extra', type=Path)
    parser.add_argument('--receipt', type=Path)
    args = parser.parse_args()
    if args.action == 'run':
        raise SystemExit(run_extension(args.base, args.plan, args.output))
    require(args.extra is not None and args.receipt is not None, 'Analysis needs extension and receipt paths')
    raise SystemExit(analyze_extension(args.base, args.plan, args.extra, args.output, args.receipt))
