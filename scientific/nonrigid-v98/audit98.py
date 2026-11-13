"""Independent saved-packet audit; imports no FEM/flow/optical producer code."""
import hashlib
import json
import os
from pathlib import Path
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
BASELINE = '5654356e7fca335d0bc66c35420eeb2665134e39c84f23a78c7cc625c9d5fc92'
KEYS = ('radiusM', 'halfLengthM', 'cathodeRadiusM', 'anodeCenterM', 'anodeWidthM',
        'magneticT', 'branchCurrentA', 'viscosityPaS', 'chordsM')
SCENARIOS = ('linear-finite-te1', 'linear-finite-te2.5-source',
             'quadratic-finite-te1', 'quadratic-finite-te2.5-source')
RESIDUALS = ('chargeResidualRelative', 'momentumResidualRelative', 'linearResidualRelative',
             'powerResidualRelative', 'torqueResidualRelative', 'wallTorqueResidualRelative')


def require(value, message):
    if not value:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def close(a, b, message):
    require(np.isfinite([a, b]).all() and np.isclose(a, b, rtol=2e-10, atol=1e-12), message)


def relative(a, b):
    denominator = float(np.max(np.abs(b)))
    return float(np.max(np.abs(np.asarray(a)-b)))/denominator if denominator else None


def audit(directory, root=ROOT):
    directory, root = Path(directory), Path(root)
    data = json.loads((directory/'predictions.json').read_text())
    baseline = root/'scientific/axial-v85/results/predictions.json'
    require(sha(baseline) == BASELINE == data['baselineSHA256'], 'Frozen FV baseline identity')
    old = json.loads(baseline.read_text())
    require(data['sourceSHA256'] == json.loads((root/'transfer.json').read_text()), 'Source manifest drift')
    for name, expected in data['sourceSHA256'].items():
        p = Path(name)
        require(not p.is_absolute() and '..' not in p.parts, 'Unsafe source path')
        require(sha(root/p) == expected, 'Source identity: '+name)
    m = data['manifest']
    require(m == {k: old['manifest'][k] for k in KEYS}, 'Apparatus manifest drift')
    require([m[k] for k in ('radiusM', 'halfLengthM', 'cathodeRadiusM', 'magneticT',
                           'branchCurrentA', 'viscosityPaS')] == [.06, .24, .004, .13, 100., 1.14e-4], 'Historical conditions drift')
    require(data['scenarios'] == old['scenarios'] and tuple(s['name'] for s in data['scenarios']) == SCENARIOS, 'Transport family drift')
    require(data['currentFitted'] is False and data['experimentalQualification'] is False and
            data['livePlaygroundQualified'] is False, 'Qualification/current-fitting scope drift')
    require(data['scope'] == 'Conditional angular-only model; uniform-emissivity centroid, not the experimental diagnostic', 'Physical scope drift')
    expected = {(s, c, n) for s in SCENARIOS for c in (.07, .08) for n in (1, 2, 4)}
    cases = {(r['scenario'], r['anodeCenterM'], r['refinement']): r for r in data['cases']}
    require(len(data['cases']) == 24 and set(cases) == expected, 'Incomplete/duplicate 24-case matrix')
    gates, packets, boundary_witnesses = [], {}, []
    def gate(group, name, value, limit):
        passed = value is not None and np.isfinite(value) and value < limit
        gates.append(dict(group=group, name=name, value=value, limit=limit, passed=bool(passed)))
    for key, row in cases.items():
        scenario, center, n = key
        name = f'{scenario}-a{center}-n{n}'
        require(row['packet'] == name+'.npz', 'Unsafe or mislabeled packet')
        path = directory/row['packet']
        require(sha(path) == row['packetSHA256'], 'Packet identity: '+name)
        require(row['currentA'] == 100. and row['magneticT'] == .13 and
                row['experimentalQualification'] is False and row['contactVoltageExperimental'] is False, 'Case scope/drive drift')
        with np.load(path, allow_pickle=False) as raw:
            require(set(raw.files) == {'radialM', 'axialM', 'omegaRadS', 'localMidplaneMS', 'uniformChordMS'}, 'Packet field inventory')
            q = {k: raw[k].copy() for k in raw.files}
        for field, shape in [('radialM', (161,)), ('axialM', (121,)), ('omegaRadS', (121, 161)), ('localMidplaneMS', (161,)), ('uniformChordMS', (11,))]:
            require(q[field].shape == shape and np.isfinite(q[field]).all(), 'Invalid '+field)
        np.testing.assert_allclose(q['radialM'], np.linspace(0, .06, 161), rtol=0, atol=1e-15)
        np.testing.assert_allclose(q['axialM'], np.linspace(0, .24, 121), rtol=0, atol=1e-15)
        np.testing.assert_allclose(q['localMidplaneMS'], q['radialM']*q['omegaRadS'][0], rtol=2e-10, atol=1e-10)
        np.testing.assert_allclose(row['chordVelocityMS'], q['uniformChordMS'], rtol=0, atol=0)
        # Inverse element maps round boundary coordinates; exact constrained DOFs
        # were separately replayed. Normalize this sampling check by field scale.
        field_scale = float(np.max(abs(q['omegaRadS'])))
        wall_error = float(max(np.max(abs(q['omegaRadS'][:, -1])), np.max(abs(q['omegaRadS'][-1]))))
        normalized_wall = wall_error/field_scale if field_scale else 0.
        require(normalized_wall <= 128*np.finfo(float).eps, 'Boundary sampling exceeds roundoff')
        boundary_witnesses.append(dict(case=name, maxSampledWallOmegaRadS=wall_error,
            fieldScaleRadS=field_scale, normalizedWallError=normalized_wall, limit=128*np.finfo(float).eps))
        for metric in RESIDUALS:
            require(np.isfinite(row[metric]) and row[metric] >= 0, 'Invalid residual')
            gate('conservation', name+'/'+metric, row[metric], 1e-8)
        p, j, v = (row[k] for k in ('electrodePowerW', 'jouleW', 'viscousW'))
        require(np.isfinite([p, j, v]).all() and min(p, j, v) > 0, 'Nonpassive drive')
        close(row['powerResidualRelative'], abs(p-j-v)/max(abs(p), abs(j)+abs(v)), 'Work ledger drift')
        torque = 100*.13*(.06**2-.004**2)/2
        close(row['sourceMomentTorqueNm'], torque, 'Source second moment')
        close(row['torqueResidualRelative'], abs(row['driveTorqueNm']-torque)/abs(torque), 'Torque ledger drift')
        close(row['wallTorqueResidualRelative'], abs(row['driveTorqueNm']+row['wallReactionTorqueNm'])/abs(torque), 'Wall ledger drift')
        packets[key] = q
    reported = {(r['scenario'], r['anodeCenterM']): r for r in data['comparisons']}
    require(len(data['comparisons']) == 8 and set(reported) == {(s, c) for s in SCENARIOS for c in (.07, .08)}, 'Comparison matrix drift')
    comparisons = []
    for scenario, center in reported:
        q = [packets[scenario, center, n] for n in (1, 2, 4)]
        rebuilt = dict(scenario=scenario, anodeCenterM=center)
        for label, field in [('chord', 'uniformChordMS'), ('local', 'localMidplaneMS'), ('field', 'omegaRadS'), ('viscous', 'viscousW')]:
            values = [cases[scenario, center, n][field] for n in (1, 2, 4)] if label == 'viscous' else [s[field] for s in q]
            coarse, fine = relative(values[0], values[1]), relative(values[1], values[2])
            rebuilt[label+'CoarseChange'], rebuilt[label+'FineChange'] = coarse, fine
            gate('refinement', f'{scenario}/{center}/{label}/fine', fine, .05)
            gate('refinement', f'{scenario}/{center}/{label}/contraction', fine/coarse if coarse else None, 1.)
        references = [r for r in old['cases'] if (r['scenario'], r['anodeCenterM'], r['refinement']) == (scenario, center, 8)]
        require(len(references) == 1, 'FV n8 reference missing/duplicate')
        rebuilt['independentFVChordDifference'] = relative(q[-1]['uniformChordMS'], np.asarray(references[0]['prediction']['chordVelocityMS']))
        gate('independentReference', f'{scenario}/{center}/FV-n8', rebuilt['independentFVChordDifference'], .05)
        for field, value in rebuilt.items():
            if field not in ('scenario', 'anodeCenterM'):
                close(reported[scenario, center][field], value, 'Comparison drift: '+field)
        comparisons.append(rebuilt)
    groups = {group: all(g['passed'] for g in gates if g['group'] == group) for group in ('conservation', 'refinement', 'independentReference')}
    require(data['numericalGates'] == groups, 'Producer aggregate differs from independent gates')
    return dict(gates=gates, comparisons=comparisons, boundaryRoundoffWitnesses=boundary_witnesses,
        numericalGates=groups, passed=all(groups.values()),
        baselineSHA256=BASELINE, sourceSHA256=data['sourceSHA256'], auditorSHA256=sha(Path(__file__)),
        experimentalQualification=False, livePlaygroundQualified=False,
        scope='Independent packet/refinement replay. Algebraic residuals are producer diagnostics; raw FE coefficients are not archived. Ideal-ring contact power and the actual experimental optical diagnostic remain unqualified.')


if __name__ == '__main__':
    require(sys.platform == 'linux' and os.getuid() == 1000, 'Execute only inside safe-dev')
    require(len(sys.argv) == 4, 'Supply prediction directory, frozen PRODUCER root and NEW audit JSON path')
    output = audit(Path(sys.argv[1]), Path(sys.argv[2]))
    with Path(sys.argv[3]).open('x') as file:
        file.write(json.dumps(output, indent=2, allow_nan=False)+'\n')
    print(json.dumps(dict(gates=len(output['gates']), numericalGates=output['numericalGates'], passed=output['passed'], experimentalQualification=False)))
    raise SystemExit(not output['passed'])
