"""Reference-grid field error, alongside the unchanged cell-average verdict.

Conservative linear reconstructions are integrated on ONE reference grid so
coarse-cell averaging cannot remove unresolved structure from the error norm.
This measures represented fields, not just finite-volume cell-average error.
Execute only in safe-dev; recorded audits are admitted, not PDE-replayed.
"""
import argparse
import hashlib
from importlib.metadata import version
import json
from pathlib import Path
import platform
import sys
import numpy as np

SOURCE = Path(__file__).resolve().parents[1]/'mixture-axial-v75'
sys.path.insert(0, str(SOURCE))
from analyze import FIELDS, SERIES, analyze, primitives, restrict_linear, response_scale
from run import hashes
from verify import control, finite, require, trajectory as admit_trajectory

LIMITS = dict(rms=.02, local=.05, observable=.02, tight=.001)
REFERENCES = ('linearTolerance', 'thermalTolerance', 'bothTolerances',
              'referenceSmallerDt', 'referenceSpatial', 'referenceTransportCfl')


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def compare_profiles(coarse, coarse_case, reference, reference_case, manifest):
    cf, rf = [primitives(t, e) for t, e in ((coarse, coarse_case), (reference, reference_case))]
    ci, ri = [primitives(t, dict(q=t['initialQ'], solidK=t['initialSolidK']))
              for t in (coarse, reference)]
    for fields, start in ((cf, ci), (rf, ri)):
        fields['densityChange'] = fields['density']-start['density']
        fields['YChange'] = fields['Y']-start['Y']
    result = {}
    for name in FIELDS:
        region = 'wall' if name == 'solid' else 'r'
        cr, rr = [np.asarray(t['setup'][region]) for t in (coarse, reference)]
        prolong = lambda field: restrict_linear(field, reference['setup']['z'],
            coarse['setup']['z'], rr*rr, cr*cr)
        weight = np.diff(reference['setup']['z'])[:, None]*np.diff(rr*rr)[None, :]
        if name in ('Y', 'YChange'):
            rho, initial_rho = prolong(cf['density']), prolong(ci['density'])
            require(np.all(rho > 0) and np.all(initial_rho > 0), 'Nonpositive reconstructed density')
            value = prolong(cf['density']*cf['Y'])/rho
            if name == 'YChange':
                value -= prolong(ci['density']*ci['Y'])/initial_rho
            weight = weight*rf['density']
        else:
            value = prolong(cf[name])
        error = value-rf[name]
        scale = response_scale(name, rf[name], manifest)
        rms = float(np.sqrt(np.sum(weight*error*error)/np.sum(weight)))
        maximum = float(abs(error).max())
        require(np.all(np.isfinite([rms, maximum, scale])) and scale > 0, 'Invalid common-space error')
        result[name] = dict(rmsAbsolute=rms, maxAbsolute=maximum, scale=scale,
            rmsNormalized=rms/scale, maxNormalized=maximum/scale,
            weighting='mass' if name in ('Y', 'YChange') else 'cylindrical volume')
    return result


def replace_profiles(rows, coarse, reference, manifest, tight=False):
    rms, local, observable = (LIMITS['tight'],)*3 if tight else (
        LIMITS['rms'], LIMITS['local'], LIMITS['observable'])
    for row, ce, re in zip(rows, coarse['cases'], reference['cases']):
        require(row['timeS'] == ce['timeS'] == re['timeS'], 'Mismatched physical times')
        row['profiles'] = compare_profiles(coarse, ce, reference, re, manifest)
        row['passed'] = (all(p['rmsNormalized'] < rms and p['maxNormalized'] < local
                              for p in row['profiles'].values())
                         and all(v < observable for v in row['observablesNormalized'].values()))


def common_analysis(raw):
    result = analyze(raw)  # Recompute and retain the original metric verdict.
    result['cellAverageVerdict'] = dict(numericallyQualified=result['numericallyQualified'],
        failedGates={name: [g for g in series['gates'] if not g['passed']]
                     for name, series in result['series'].items()})
    lookup = {(t['nr'], t['nz'], t['nt'], t['mode']): t for t in raw['cases']}
    m = raw['manifest']
    require(set(result['series']) == set(SERIES) and not result['requirementsGaps'], 'Incomplete study')
    for name, series in result['series'].items():
        ref = lookup[tuple(series['reference'])]
        for comparison in series['comparisons']:
            key = tuple(comparison[n] for n in ('nr', 'nz', 'nt'))+('base',)
            replace_profiles(comparison['cases'], lookup[key], ref, m)
        gates = []
        for i, time in enumerate(m['timesS']):
            samples = [c['cases'][i] for c in series['comparisons']]
            for field in FIELDS:
                errors = [row['profiles'][field]['rmsNormalized'] for row in samples]
                decreasing = max(errors) < .002 or all(b <= a+1e-12 for a, b in zip(errors, errors[1:]))
                gates.extend([dict(name=f'{time}:{field}:rms', value=errors[-1], passed=errors[-1] < .02),
                    dict(name=f'{time}:{field}:decreasing', values=errors, passed=decreasing),
                    dict(name=f'{time}:{field}:max', value=samples[-1]['profiles'][field]['maxNormalized'],
                         passed=samples[-1]['profiles'][field]['maxNormalized'] < .05)])
            gates.extend(dict(name=f'{time}:{field}', value=value, passed=value < .02)
                         for field, value in samples[-1]['observablesNormalized'].items())
        require([g['name'] for g in gates] == [g['name'] for g in series['gates']], 'Changed gate coverage')
        series.update(gates=gates, passed=all(g['passed'] for g in gates))
        # Old orders use a different norm. No formal order/GCI estimate is made.
        series.pop('observedOrders')
    for name in REFERENCES:
        check = result[name]
        base = (*m['tighterTolerance'], 'base') if 'Tolerance' in name else (*m['joint'][-1], 'base')
        replace_profiles(check['cases'], lookup[base], lookup[tuple(check['reference'])], m,
                         tight='Tolerance' in name or name == 'referenceTransportCfl')
        check['passed'] = all(row['passed'] for row in check['cases'])
    result['numericallyQualified'] = (not result['failures'] and
        all(s['passed'] for s in result['series'].values()) and all(result[n]['passed'] for n in REFERENCES))
    result['metric'] = 'Reference-grid conservative-linear field representation; cell-average verdict retained'
    return result


def bind(raw, plan):
    require(plan['schemaVersion'] == 1 and plan['limits'] == LIMITS and plan['fields'] == list(FIELDS),
            'Changed metric plan or thresholds')
    require(raw['sourceHashes'] == plan['producerSourceHashes'] == hashes(), 'Changed physical source')
    require(raw['manifest'] == json.loads((SOURCE/'manifest.json').read_text())
            and plan['manifestSha256'] == digest(SOURCE/'manifest.json'), 'Changed manifest')
    runtime = dict(python=platform.python_version(), numpy=version('numpy'), scipy=version('scipy'), fipy=version('fipy'))
    require(raw['preRunRuntime'] == runtime and raw['failures'] == [], 'Changed runtime or producer failure')
    require(plan['analysisSha256'] == digest(__file__)
            and raw.get('plannedAnalysisSha256') == digest(__file__), 'Changed or unplanned analyzer')


def execute(args):
    paths = (args.raw, args.plan, args.controls, args.diffusion_controls, args.audit, args.output, args.receipt)
    require(len({p.resolve() for p in paths}) == len(paths), 'Input/output paths must be distinct')
    require(not args.output.exists() and not args.receipt.exists(), 'Preserve prior reports')
    raw, plan = [json.loads(p.read_text()) for p in (args.raw, args.plan)]
    bind(raw, plan)
    require(raw.get('plannedPlanSha256') == digest(args.plan), 'Changed or unplanned metric plan')
    endpoint_errors = [admit_trajectory(t, raw['manifest']) for t in raw['cases']]
    control(json.loads(args.controls.read_text()), ('controls.py', 'flow.py'), SOURCE)
    control(json.loads(args.diffusion_controls.read_text()),
            ('diffusion_controls.py', 'diffusion.py', 'flow.py', 'controls.py'), SOURCE)
    audit = json.loads(args.audit.read_text())
    require(audit['passed'] is True and audit['sourceHashes'] == hashes()
            and audit['manifest'] == raw['manifest'], 'Stale corruption controls')
    require(set(audit['positiveChecks']) == {'hydro', 'diffusion', 'magnetic', 'source'}
            and finite(audit['positiveChecks']), 'Missing positive corruption baseline')
    negatives = audit['negativeControls']
    require(len(negatives) == 6 and {r['name'] for r in negatives} == {
        'mass', 'species', 'angularMomentum', 'energy', 'enthalpyFlux', 'sourceNumericalHeat'}
        and all(r['rejected'] is True for r in negatives), 'Missing corruption rejection')
    result = common_analysis(raw)
    inputs = (args.raw, args.plan, args.controls, args.diffusion_controls, args.audit)
    require(len({p.name for p in inputs}) == len(inputs), 'Ambiguous input names')
    result['inputHashes'] = {p.name: digest(p) for p in inputs}
    result['analysisSha256'] = digest(__file__)
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    receipt = dict(passed=result['numericallyQualified'], cellAverageVerdict=result['cellAverageVerdict'],
        trajectoryCount=len(raw['cases']), stepCount=sum(t['nt'] for t in raw['cases']),
        endpointCount=sum(len(t['cases']) for t in raw['cases']), producerSourceHashes=hashes(),
        artifactHashes=dict(result['inputHashes'], **{args.output.name: digest(args.output)}),
        analysisSha256=digest(__file__), maximumEndpointObservableError=max(max(e.values()) for e in endpoint_errors),
        experimentalQualified=False, liveQualified=False,
        scope='Common-space represented-field accuracy; original cell-average verdict retained. Audits admitted, no PDE replay.')
    args.receipt.write_text(json.dumps(receipt, indent=2, allow_nan=False)+'\n')
    print(json.dumps(dict(passed=receipt['passed'],
        failedGates={n: [g for g in s['gates'] if not g['passed']] for n, s in result['series'].items()},
        references={n: result[n]['passed'] for n in REFERENCES})))
    return 0 if receipt['passed'] else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('raw', 'plan', 'controls', 'diffusion-controls', 'audit', 'output', 'receipt'):
        parser.add_argument('--'+name, type=Path, required=True)
    raise SystemExit(execute(parser.parse_args()))
