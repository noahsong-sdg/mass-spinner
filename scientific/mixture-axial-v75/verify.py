"""Result admission, not a second PDE solve. Execute only inside safe-dev.

Checks complete frozen evidence, primitive domains, global ledgers and exact
input/source identity. Recorded intermediate audits are not rerun here.
"""
import argparse
import hashlib
import json
import platform
from importlib.metadata import version
from pathlib import Path
import numpy as np
from independent import geometry, primitives
from endpoint_admission import check_initial, check_observables
from mixcheck import graph

HERE = Path(__file__).resolve().parent
SERIES = ('joint', 'spatial', 'temporal', 'radial', 'axial')
FIELDS = ('density', 'gas', 'solid', 'omega', 'vr', 'vz', 'Y', 'densityChange', 'YChange')
OBS = {'currentA', 'jouleW', 'shearW', 'gasPeakK', 'wallPeakK', 'meridionalKineticJ',
       'lightRadialMomentM', 'heavyRadialMomentM', 'lightAxialMomentM', 'heavyAxialMomentM',
       'torque_outer', 'torque_lower', 'torque_upper', 'radialMotionalJouleW'}
EPS = np.finfo(float).eps


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def finite(value):
    if isinstance(value, dict):
        return bool(value) and all(finite(v) for v in value.values())
    return type(value) in (int, float) and np.isfinite(value)


def source_hashes(source_dir, root):
    files = [*source_dir.glob('*.py'), source_dir/'manifest.json', source_dir/'PROTOCOL.md', source_dir/'requirements.txt', root/'package.json', root/'package-lock.json']
    files += [source_dir.parent/'coupled-axial-v74'/name for name in
              ('bridge.py', 'bridge.ts', 'coupled.py', 'thermal.py', 'independent_check.py')]
    files += [source_dir.parent/'axial-v73/torsion.py']
    files += [root/'src'/name for name in ('fuel-current.ts', 'fuel-neutral-transport.ts', 'fuel-thermal.ts', 'fuel-momentum.ts')]
    return {str(p.relative_to(root)): digest(p) for p in sorted(files)}


def requested(m):
    runs = {(*level, 'base') for name in SERIES for level in m[name]}
    runs.update((*m[name], 'base') for name in ('referenceSmallerDt', 'referenceSpatial'))
    runs.update((*m['tighterTolerance'], mode) for mode in ('base', 'linear', 'thermal', 'both'))
    return runs


def setup_grid(c, m, nr, nz):
    r, z, masses, volume, a2, _, _ = geometry(c)
    wall = np.asarray(c['wall'], dtype=float)
    expected = (np.linspace(0, m['radiusM'], nr+1), np.linspace(0, m['lengthM'], nz+1),
                np.linspace(m['radiusM'], m['radiusM']+m['linerThicknessM'], max(2, nr//3)+1))
    require(all(np.array_equal(a, b) for a, b in zip((r, z, wall), expected)), 'Primitive grid differs from manifest')
    require(np.array_equal(masses, np.asarray(m['massesU'])*1.66053906892e-27), 'Primitive isotope masses differ')
    require(all(c[k] == m[k] for k in ('contactH', 'coolingH', 'bathK'))
            and c['walls'] == dict(outer=0., lower=0., upper=0.), 'Primitive boundaries differ')
    e = c['electrical']
    require(e['radialEdgesM'] == r.tolist() and e['axialEdgesM'] == z.tolist(), 'Current grid mismatch')
    require(e['sigmaPerpSM'] == [m['sigmaPerpSM']]*nr*nz and e['sigmaParallelSM'] == [m['sigmaParallelSM']]*nr*nz
            and e['magneticT'] == m['magneticT'] and e['innerVoltageV'] == [None]*nz
            and e['lowerVoltageV'] == [0.]*nr and e['upperVoltageV'] == [0.]*nr
            and np.array_equal(e['outerVoltageV'], m['outerVoltageV']*np.sin(np.pi*(z[:-1]+z[1:])/(2*z[-1]))),
            'Primitive electrical inputs differ')
    wall_mass = 19250*np.pi*np.diff(z)[:, None]*np.diff(wall*wall)[None, :]
    return volume, a2, masses, wall_mass


def state(q, solid, grid):
    volume, a2, masses, wall_mass = grid
    p = primitives(q, volume, a2, masses)
    solid = np.asarray(solid, dtype=float).reshape(wall_mass.shape)
    require(np.all(np.isfinite(solid)) and np.all((solid >= 300) & (solid <= 1900))
            and np.all((p['temperature'] >= 300) & (p['temperature'] <= 418)), 'Primitive temperature outside source domain')
    t, ref = solid, 300.
    h = (23.95930*(t-ref)+2.639680e-3*(t*t-ref*ref)/2+1.257750e-6*(t**3-ref**3)/3
         -.254642e-9*(t**4-ref**4)/4+.048407e6*(1/t-1/ref))/.18384
    q = np.asarray(q, dtype=float)
    totals = np.array([q[0].sum(), q[5].sum(), q[3].sum(), q[4].sum()+np.sum(wall_mass*h)])
    require(np.all(np.isfinite(totals)), 'Nonfinite global primitive ledger')
    return totals


def trajectory(t, m):
    nr, nz, nt = t['nr'], t['nz'], t['nt']
    require(all(type(v) is int and v > 0 for v in (nr, nz, nt)), 'Invalid trajectory resolution')
    grid = setup_grid(t['setup'], m, nr, nz)
    initial = state(t['initialQ'], t['initialSolidK'], grid)
    check_initial(t, m)
    cases, checks = t['cases'], t['stepChecks']
    require([c['timeS'] for c in cases] == m['timesS'], 'Missing or unordered physical outputs')
    require([c.get('step') for c in checks] == list(range(1, nt+1)), 'Incomplete or unordered step audits')
    dt = max(m['timesS'])/nt
    output = {round(c['timeS']/dt): c for c in cases}
    require(len(output) == len(cases) and all(abs(i*dt-c['timeS']) <= 64*EPS*max(m['timesS']) for i, c in output.items()),
            'Physical output not aligned to a step')
    totals = dict(electrodeJ=0., wallWorkJ=0., bathJ=0., numericalLossJ=0., radialMotionalJouleJ=0.)
    impulse = energy_allowance = 0.
    observation_errors = {name: 0. for name in OBS}
    for index, row in enumerate(checks, 1):
        require(finite(row.get('timeS')) and abs(row['timeS']-index*dt) <= 64*EPS*max(m['timesS']), 'Wrong step physical time')
        c = row['checks']
        require(set(c) == {'hydro', 'diffusion', 'magnetic', 'source'} and finite(c), 'Missing/nonfinite local audits')
        for name in ('hydro', 'diffusion'):
            require(0 <= c[name]['maxLocalScore'] <= 1 and c[name]['minimumDensityKgM3'] > 0
                    and c[name]['minimumInternalJ'] > 0, 'Failed local transport audit')
        source, ledger = c['source'], c['source']['energy']
        require(ledger['exchangeScale'] >= 0 and ledger['storageAllowance'] >= 0, 'Invalid source ledger allowance')
        allowed = 1e-8*ledger['exchangeScale']+ledger['storageAllowance']
        require(abs(ledger['residual']) <= allowed and source['numericalLossJ'] >= 0
                and c['magnetic']['jouleJ'] >= 0 and c['magnetic']['externalWorkJ'] == 0
                and c['magnetic']['angularImpulseKgM2S'] == 0, 'Failed source or magnetic ledger')
        energy_allowance += allowed
        impulse += source['angularImpulseKgM2S']
        for name in ('electrodeJ', 'wallWorkJ', 'bathJ', 'numericalLossJ'):
            totals[name] += source[name]
        totals['radialMotionalJouleJ'] += c['magnetic']['jouleJ']
        if index in output:
            endpoint = output[index]
            current = state(endpoint['q'], endpoint['solidK'], grid)
            require(set(endpoint['observables']) == OBS and finite(endpoint['observables']), 'Invalid endpoint observables')
            require(np.all(abs(current[:2]-initial[:2]) <= 128*EPS*index*(abs(current[:2])+abs(initial[:2]))), 'Closed species inventory changed')
            require(abs(current[2]-initial[2]-impulse) <= 1e-8*abs(impulse)+128*EPS*index*(abs(current[2])+abs(initial[2])), 'Global angular ledger failed')
            defect = current[3]-initial[3]+totals['bathJ']+totals['numericalLossJ']-totals['electrodeJ']-totals['wallWorkJ']
            require(abs(defect) <= energy_allowance+128*EPS*index*(abs(current[3])+abs(initial[3])), 'Global energy ledger failed')
            for name, error in check_observables(t, endpoint, graph).items():
                observation_errors[name] = max(observation_errors[name], error)
    require(set(t['integrals']) == set(totals) and finite(t['integrals'])
            and all(abs(t['integrals'][k]-v) <= 128*EPS*max(abs(v), 1e-300) for k, v in totals.items()), 'Cumulative ledger mismatch')
    return observation_errors


def control(record, files, source_dir):
    require(record.get('schemaVersion') == 1 and record.get('passed') is True, 'Unqualified analytical controls')
    require(record.get('sourceHashes') == {name: digest(source_dir/name) for name in files}, 'Stale control source hashes')
    meshes = [6, 12, 24, 48, 96]
    require(record.get('meshes') == meshes, 'Incomplete control meshes')
    diffusion = 'tagged' in record
    specs = [('tagged', ('normalizedRms',), .02), ('rotating', ('normalizedMaxSpeciesDensityRate',), .05)] if diffusion else [
        ('acoustic', ('density', 'pressure', 'axialVelocity'), .05), ('rotating', ('density', 'radialVelocity', 'temperature', 'angularSpeed'), .02)]
    expected = set()
    for name, fields, limit in specs:
        rows = record[name]
        require([r['n'] for r in rows] == meshes, 'Missing analytical control rows')
        for field in fields:
            values = [r[field] if diffusion else r['normalizedRms'][field] for r in rows]
            require(all(finite(v) and v >= 0 for v in values) and values[-1] < limit
                    and (max(values) < .002 or all(b <= a+1e-12 for a, b in zip(values, values[1:]))), 'False analytical error gate')
            prefix = name if diffusion else name+':'+field
            expected.update((prefix+':finest', prefix+':decreasing'))
        for r in rows:
            invariant = diffusion and name == 'rotating'
            values = [r['rotationInvariantNormalizedFlux']] if invariant else list(r['relativeLedgerResidual'].values())
            require(bool(values) and all(finite(v) and 0 <= v < (512*EPS if invariant else 1e-10) for v in values), 'Failed analytical conservation/rotation control')
            expected.add(f'{name}:{r["n"]}:'+('noExtraRotationForce' if invariant else 'closedLedgers'))
    require(len(record['gates']) == len(expected) and {g['name'] for g in record['gates']} == expected
            and all(g.get('passed') is True for g in record['gates']), 'Missing or failed control gates')

def verify(raw_path, conv_path, controls_path, diffcontrols_path, audit_path, source_dir=HERE, projectroot=HERE.parents[1]):
    paths = dict(raw=Path(raw_path), convergence=Path(conv_path), controls=Path(controls_path), diffusionControls=Path(diffcontrols_path), audit=Path(audit_path))
    raw, conv, controls, diff, audit = [json.loads(paths[k].read_text()) for k in paths]
    m = json.loads((source_dir/'manifest.json').read_text())
    require(m.get('schemaVersion') == 1 and raw['manifest'] == m == conv['manifest'], 'Stale or migrated manifest')
    require(set(m['independentTolerances']) == {'linear', 'thermal', 'both'}, 'Missing tolerance modes')
    hashes = source_hashes(source_dir, projectroot)
    require(raw.get('sourceHashes') == hashes, 'Stale or incomplete producer source hashes')
    require(raw.get('failures') == [], 'Producer failures remain')
    require(set(raw['preRunRuntime']) == {'python', 'numpy', 'scipy', 'fipy'} and all(isinstance(v, str) and v for v in raw['preRunRuntime'].values()), 'Missing pre-run runtime provenance')
    keys = [(t['nr'], t['nz'], t['nt'], t['mode']) for t in raw['cases']]
    require(len(keys) == len(set(keys)) and set(keys) == requested(m), 'Missing, extra or duplicate trajectory')
    for t in raw['cases']:
        trajectory(t, m)
    require(conv.get('inputHashes') == {paths['raw'].name: digest(paths['raw'])}
            and conv.get('manifestHash') == digest(source_dir/'manifest.json')
            and conv.get('sourceHashes') == {'analyze.py': digest(source_dir/'analyze.py')}, 'Stale convergence input or analyzer binding')
    require(conv.get('numericallyQualified') is True and conv.get('requirementsGaps') == []
            and conv.get('failures') == [] and set(conv.get('series', {})) == set(SERIES), 'Unqualified convergence')
    names = {f'{time}:{field}:{gate}' for time in m['timesS'] for field in FIELDS for gate in ('rms', 'max', 'decreasing')}
    names |= {f'{time}:{name}' for time in m['timesS'] for name in OBS}
    for series in conv['series'].values():
        gates = series['gates']
        require(series.get('passed') is True and len(gates) == len(names) and {g['name'] for g in gates} == names
                and all(g.get('passed') is True for g in gates), 'Missing or failed refinement gate')
        for g in gates:
            if g['name'].endswith(':decreasing'):
                v = g['values']
                require(bool(v) and all(finite(x) and x >= 0 for x in v)
                        and (max(v) < .002 or all(b <= a+1e-12 for a, b in zip(v, v[1:]))), 'False monotonic refinement gate')
            else:
                require(finite(g['value']) and 0 <= g['value'] < (.05 if g['name'].endswith(':max') else .02), 'False refinement threshold')
    for name in ('linearTolerance', 'thermalTolerance', 'bothTolerances', 'referenceSmallerDt', 'referenceSpatial'):
        check = conv.get(name, {})
        require(check.get('passed') is True and [r['timeS'] for r in check.get('cases', [])] == m['timesS']
                and all(r.get('passed') is True for r in check['cases']), 'Missing or failed tolerance/reference gate')
        for row in check['cases']:
            tight = 'Tolerance' in name
            require(set(row['profiles']) == set(FIELDS) and set(row['observablesNormalized']) == OBS
                    and all(finite(p['rmsNormalized']) and 0 <= p['rmsNormalized'] < (.001 if tight else .02)
                            and finite(p['maxNormalized']) and 0 <= p['maxNormalized'] < (.001 if tight else .05) for p in row['profiles'].values())
                    and all(finite(v) and 0 <= v < (.001 if tight else .02) for v in row['observablesNormalized'].values()), 'False tolerance/reference threshold')
    control(controls, ('controls.py', 'flow.py'), source_dir)
    control(diff, ('diffusion_controls.py', 'diffusion.py', 'flow.py', 'controls.py'), source_dir)
    require(audit.get('passed') is True and audit.get('manifest') == m and audit.get('sourceHashes') == hashes, 'Stale or failed corruption controls')
    require(set(audit['positiveChecks']) == {'hydro', 'diffusion', 'magnetic', 'source'}
            and finite(audit['positiveChecks']), 'Missing positive corruption-control baseline')
    negatives = audit['negativeControls']
    require(len(negatives) == 6 and {r['name'] for r in negatives} == {'mass', 'species', 'angularMomentum', 'energy', 'enthalpyFlux', 'sourceNumericalHeat'}
            and all(r.get('rejected') is True for r in negatives), 'Incomplete corruption controls')
    return dict(passed=True, trajectoryCount=len(keys), stepCount=sum(t['nt'] for t in raw['cases']),
                endpointCount=sum(len(t['cases']) for t in raw['cases']), sourceHashes=hashes, preRunRuntime=raw['preRunRuntime'],
                artifactHashes={k: digest(p) for k, p in paths.items()},
                provenanceScope='Exact producer and derived-input bindings; intermediate audit receipts inspected, not PDE reruns. Dependency versions below are publication-time, not a pre-run environment seal.',
                experimentalQualified=False, liveQualified=False)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('raw', 'convergence', 'controls', 'diffusion-controls', 'audit', 'output'):
        parser.add_argument('--'+name, type=Path, required=True)
    args = parser.parse_args()
    try:
        receipt = verify(args.raw, args.convergence, args.controls, args.diffusion_controls, args.audit)
        receipt['publicationRuntime'] = dict(python=platform.python_version(), numpy=version('numpy'), scipy=version('scipy'), fipy=version('fipy'))
    except (AssertionError, KeyError, ValueError, TypeError, OSError) as error:
        receipt = dict(passed=False, error=str(error))
    args.output.write_text(json.dumps(receipt, indent=2, allow_nan=False)+'\n')
    print(json.dumps(receipt))
    raise SystemExit(0 if receipt['passed'] else 1)
