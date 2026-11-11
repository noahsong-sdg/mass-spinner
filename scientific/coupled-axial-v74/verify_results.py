"""Admit only complete results tied to the current producer snapshot."""
import argparse
import hashlib
import json
import math
import platform
from importlib.metadata import version
from pathlib import Path

HERE = Path(__file__).resolve().parent
PRODUCERS = ('bridge.py', 'bridge.ts', 'coupled.py', 'thermal.py', 'run_report.py', 'independent_check.py')
NEGATIVES = {'potential', 'localShear', 'temperature', 'numericalLoss', 'bathHeat', 'interfaceHeat'}
PUBLICATION_DEPENDENCIES = ('scientific/axial-v73/torsion.py', 'src/fuel-neutral-transport.ts',
                            'src/fuel-thermal.ts', 'src/fuel-momentum.ts')


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def finite_metrics(value):
    if isinstance(value, dict):
        return bool(value) and all(finite_metrics(v) for v in value.values())
    return type(value) in (int, float) and math.isfinite(value)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def request_key(level, mode=False):
    if len(level) == 2:
        n, nt = level
        return n, n, nt, mode
    nr, nz, nt = level
    return nr, nz, nt, mode


def finite_number(value):
    return type(value) in (int, float) and math.isfinite(value)


def vector(value, count, label):
    require(isinstance(value, list) and len(value) == count and all(finite_number(v) for v in value), 'Invalid primitive '+label)


def primitive_domains(case):
    c, e = case['setup'], case['setup']['electrical']
    for key, minimum in (('r', 3), ('wall', 2), ('z', 3)):
        edges = c[key]
        require(isinstance(edges, list) and len(edges) >= minimum and all(finite_number(v) for v in edges)
                and all(b > a for a, b in zip(edges, edges[1:])), 'Invalid primitive ordered '+key)
    r, wall, z = c['r'], c['wall'], c['z']
    require(r[0] == 0 and wall[0] == r[-1] > 0, 'Invalid primitive cylinder/wall contiguity')
    vector(e['radialEdgesM'], len(r), 'electrical radial grid')
    vector(e['axialEdgesM'], len(z), 'electrical axial grid')
    require(e['radialEdgesM'] == r and e['axialEdgesM'] == z, 'Electrical/thermal primitive grid mismatch')
    nr, nz, nw = len(r)-1, len(z)-1, len(wall)-1
    ng, ns, total = nr*nz, nw*nz, (nr+nw)*nz
    require(finite_number(case['dtS']) and case['dtS'] > 0, 'Invalid primitive timestep')
    density = [c['rho']]*ng if finite_number(c['rho']) else c['rho']
    for key, values in (('rho', density), ('sigmaPerpSM', e['sigmaPerpSM']), ('sigmaParallelSM', e['sigmaParallelSM'])):
        vector(values, ng, key)
        require(min(values) > 0, 'Nonpositive primitive '+key)
    for key in ('contactH', 'coolingH'):
        require(finite_number(c[key]) and c[key] >= 0, 'Invalid primitive '+key)
    require(finite_number(c['bathK']) and 300 <= c['bathK'] <= 1900, 'Invalid primitive bath temperature')
    require(finite_number(e['magneticT']), 'Invalid primitive magnetic field')
    for key in ('outer', 'lower', 'upper'):
        require(c['walls'][key] is None or finite_number(c['walls'][key]), 'Invalid primitive wall speed')
    potentials = []
    for key, count in (('innerVoltageV', nz), ('outerVoltageV', nz), ('lowerVoltageV', nr), ('upperVoltageV', nr)):
        values = e[key]
        require(isinstance(values, list) and len(values) == count and all(v is None or finite_number(v) for v in values), 'Invalid primitive '+key)
        potentials.extend(v for v in values if v is not None)
    require(bool(potentials) and all(v is None for v in e['innerVoltageV']), 'Invalid primitive electrode reference/axis')
    state = case['result']['mechanical']
    for values in (case['oldOmegaRadS'], state['omegaRadS'], state['currentOmegaRadS']):
        vector(values, ng, 'angular speed')
    gas_indices = [j*(nr+nw)+i for j in range(nz) for i in range(nr)]
    solid_indices = [j*(nr+nw)+i for j in range(nz) for i in range(nr, nr+nw)]
    for values in (case['oldTemperatureK'], case['result']['temperatureK']):
        vector(values, total, 'temperature')
        require(all(300 <= values[i] <= 20000 for i in gas_indices) and all(300 <= values[i] <= 1900 for i in solid_indices), 'Primitive temperature outside sourced domain')
    for props in (case['props'], case['oldProps']):
        for key in ('mu', 'k', 'solidK', 'solidCp', 'solidH'):
            vector(props[key], ng if key in ('mu', 'k') else ns, key)
            require(min(props[key]) >= 0 if key == 'solidH' else min(props[key]) > 0, 'Invalid primitive property '+key)


def verify(paths, source_dir=HERE, project_root=HERE.parents[1]):
    records = {key: json.loads(Path(path).read_text()) for key, path in paths.items()}
    raw, static, independent, convergence = [records[k] for k in ('raw', 'static', 'independent', 'convergence')]
    manifest = json.loads((source_dir/'manifest.json').read_text())
    require(raw['manifest'] == manifest == convergence['manifest'] == static['manifest'], 'Stale or migrated manifest')
    require(raw.get('failures') == [], 'Producer failures remain')
    hashes = {}
    for name in PRODUCERS:
        hashes[name] = digest(source_dir/name)
        require(raw.get('sourceHashes', {}).get(name) == hashes[name], 'Stale/missing producer hash: '+name)
    static_paths = [source_dir/name for name in ('bridge.py', 'bridge.ts', 'static_current.py', 'manifest.json')]
    for path in [project_root/'src/fuel-current.ts', *static_paths]:
        name = str(path.relative_to(project_root))
        hashes[name] = digest(path)
        require(static.get('sourceHashes', {}).get(name) == hashes[name], 'Stale/missing static hash: '+name)
    static_path = Path(paths['static'])
    require(raw.get('sourceHashes', {}).get(static_path.name) == digest(static_path), 'Static artifact differs from producer-bound artifact')
    trajectories = raw.get('cases', [])
    require(bool(trajectories), 'No trajectories')
    required_runs = {request_key(level) for series in ('joint', 'spatial', 'temporal', 'radial', 'axial') for level in manifest[series]}
    required_runs.update(request_key(manifest[name]) for name in ('referenceSmallerDt', 'referenceSpatial'))
    required_runs.update(request_key(manifest['tighterTolerance'], mode) for mode in (True, *manifest['independentTolerances']))
    actual_runs = [(t['n'], t.get('nz', t['n']), t['nt'], t['tight']) for t in trajectories]
    require(len(actual_runs) == len(set(actual_runs)) and set(actual_runs) == required_runs, 'Missing, extra or duplicate required trajectory')
    for trajectory in trajectories:
        nt, checks = trajectory['nt'], trajectory.get('independentStepChecks', [])
        require(type(nt) is int and nt > 0, 'Invalid step count')
        require([c.get('step') for c in checks] == list(range(1, nt+1)), 'Missing/duplicate/out-of-order step checks')
        require(all(finite_metrics(c.get('metrics')) for c in checks), 'Nonfinite or missing per-step metrics')
        times = [c['timeS'] for c in trajectory.get('cases', [])]
        require(len(times) == len(manifest['timesS']) and set(times) == set(manifest['timesS']), 'Incomplete scheduled outputs')
        for case in trajectory['cases']:
            primitive_domains(case)
    expected = len(trajectories)*len(manifest['timesS'])
    require(independent.get('passed') is True and independent.get('failures') == [] and independent.get('inputFailures') == [], 'Independent audit failed')
    require(len(independent.get('cases', [])) == expected, 'Independent scheduled-case count mismatch')
    require([c.get('index') for c in independent['cases']] == list(range(expected)), 'Duplicate/missing independent case index')
    require(all(finite_metrics(c.get('checks')) for c in independent['cases']), 'Invalid scheduled audit metrics')
    negative = independent.get('negativeControls', [])
    require(len(negative) == 6 and {c['name'] for c in negative} == NEGATIVES and all(c.get('rejected') is True for c in negative), 'Missing/failed corruption controls')
    require(static.get('passed') is True and static.get('failures') == [] and bool(static.get('gates')) and all(g.get('passed') is True for g in static['gates']), 'Static control failed')
    require(convergence.get('numericallyQualified') is True and convergence.get('staticCurrentPassed') is True and convergence.get('electricalBoundaryAdmissible') is True and convergence.get('requirementsGaps') == [], 'Convergence not qualified')
    series = convergence.get('series', {})
    require(set(series) == {'joint', 'spatial', 'temporal', 'radial', 'axial'}, 'Missing refinement series')
    require(all(s.get('passed') is True and bool(s.get('gates')) and all(g.get('passed') is True for g in s['gates']) for s in series.values()), 'Refinement gate failed')
    for check in ('tighterTolerance', 'referenceSmallerDt', 'referenceSpatial'):
        require(convergence.get(check, {}).get('passed') is True, 'Missing/failed '+check)
    require(all(convergence.get('independentTolerances', {}).get(mode, {}).get('passed') is True for mode in ('linear', 'thermal')), 'Missing independent tolerance variation')
    artifact_hashes = {key: digest(Path(path)) for key, path in paths.items()}
    raw_name, static_name = Path(paths['raw']).name, Path(paths['static']).name
    require(raw_name != static_name, 'Input artifact filenames collide')
    raw_input = {raw_name: artifact_hashes['raw']}
    require(independent.get('inputHashes') == raw_input, 'Independent input artifact binding mismatch')
    require(convergence.get('inputHashes') == {**raw_input, static_name: artifact_hashes['static']}, 'Convergence input artifact binding mismatch')
    return {'passed': True, 'trajectoryCount': len(trajectories), 'scheduledCaseCount': expected,
            'stepCount': sum(t['nt'] for t in trajectories), 'sourceHashes': hashes,
            'primitiveAdmissionCases': expected,
            'publicationSnapshotDependencyHashes': {name: digest(project_root/name) for name in PUBLICATION_DEPENDENCIES},
            'publicationSnapshotScope': 'Current dependency files at verification only; no pre-run dependency hash is recorded or matched by this receipt.',
            'artifactHashes': artifact_hashes,
            'runtime': {'python': platform.python_version(), 'numpy': version('numpy'), 'scipy': version('scipy')},
            'experimentalQualified': False, 'liveQualified': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for name in ('raw', 'static', 'independent', 'convergence', 'output'):
        parser.add_argument('--'+name, type=Path, required=True)
    args = parser.parse_args()
    try:
        receipt = verify({k: getattr(args, k) for k in ('raw', 'static', 'independent', 'convergence')})
    except (AssertionError, KeyError, ValueError, OSError) as error:
        receipt = {'passed': False, 'error': str(error)}
    args.output.write_text(json.dumps(receipt, indent=2, allow_nan=False)+'\n')
    print(json.dumps(receipt))
    raise SystemExit(0 if receipt['passed'] else 1)
