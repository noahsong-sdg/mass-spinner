"""Prospective physical-volume refinement gates; independent of production code."""
import argparse
import hashlib
import json
import sys
from pathlib import Path
import numpy as np


def overlap(coarse, fine):
    c, f = np.asarray(coarse), np.asarray(fine)
    weights = np.maximum(0., np.minimum(c[1:, None], f[None, 1:])-np.maximum(c[:-1, None], f[None, :-1]))
    if not np.allclose(weights.sum(axis=1), np.diff(c), rtol=1e-12, atol=1e-18):
        raise AssertionError('Reference grid does not cover comparison domain')
    return weights/np.diff(c)[:, None]


def fields(case):
    c, out = case['setup'], case['result']
    nr, nz, ngr = len(c['r'])+len(c['wall'])-2, len(c['z'])-1, len(c['r'])-1
    temperature = np.asarray(out['temperatureK']).reshape(nz, nr)
    return {'gas': temperature[:, :ngr], 'solid': temperature[:, ngr:],
            'omega': np.asarray(out['mechanical']['omegaRadS']).reshape(nz, ngr)}


def observables(case):
    f, out = fields(case), case['result']
    mechanical = out['mechanical']
    result = {'gasPeakK': float(f['gas'].max()), 'wallPeakK': float(f['solid'].max()),
              'shearHeatW': mechanical['shearHeatW'], 'jouleHeatW': mechanical['current']['jouleW'],
              'interfaceIntoGasW': case['interfaceIntoGasW'],
              'totalCurrentA': float(sum(abs(v) for v in mechanical['current']['boundaryCurrentsA'])/2)}
    result.update({'torque_'+key: value for key, value in mechanical['boundaryTorqueNm'].items()})
    return result


def compare_cases(coarse, reference):
    cf, rf = fields(coarse), fields(reference)
    result = {}
    for name in cf:
        region = 'wall' if name == 'solid' else 'r'
        cr, rr = np.asarray(coarse['setup'][region]), np.asarray(reference['setup'][region])
        cz, rz = np.asarray(coarse['setup']['z']), np.asarray(reference['setup']['z'])
        restricted = overlap(cz, rz)@rf[name]@overlap(cr*cr, rr*rr).T
        volume = np.diff(cz)[:, None]*np.diff(cr*cr)[None, :]
        initial = reference['initialLinerK' if name == 'solid' else 'initialGasK']
        scale = max(1., float(np.max(abs(rf[name])) if name == 'omega' else np.max(abs(rf[name]-initial))))
        error = cf[name]-restricted
        rms = float(np.sqrt(np.sum(volume*error*error)/np.sum(volume)))
        maximum = float(np.max(abs(error)))
        if not np.isfinite(rms+maximum+scale):
            raise AssertionError('Nonfinite profile comparison')
        result[name] = {'rmsAbsolute': rms, 'maxAbsolute': maximum, 'scale': scale,
                        'rmsNormalized': rms/scale, 'maxNormalized': maximum/scale}
    return result


def key(trajectory):
    return trajectory['n'], trajectory.get('nz', trajectory['n']), trajectory['nt'], trajectory['tight']


def request(level, tight=False):
    if len(level) == 2:
        return level[0], level[0], level[1], tight
    if len(level) == 3:
        return (*level, tight)
    raise AssertionError('Refinement level must contain n,nt or nr,nz,nt')


def comparison_rows(base, reference, rms_limit, maximum_limit, observable_limit):
    base_by_time = {c['timeS']: c for c in base['cases']}
    reference_obs = [observables(c) for c in reference['cases']]
    scales = {name: max(abs(o[name]) for o in reference_obs) for name in reference_obs[0]}
    rows = []
    for case in reference['cases']:
        prior = base_by_time[case['timeS']]
        profiles = compare_cases(prior, case)
        a, b = observables(prior), observables(case)
        obs = {name: abs(a[name]-b[name])/max(scales[name], 1e-20) for name in a}
        passed = (all(p['rmsNormalized'] < rms_limit and p['maxNormalized'] < maximum_limit for p in profiles.values())
                  and all(error < observable_limit for error in obs.values()))
        rows.append({'timeS': case['timeS'], 'profiles': profiles, 'observablesNormalized': obs, 'passed': passed})
    return rows


def static_accepted(report, manifest):
    if not report or report.get('boundaryProfile') != 'sin(pi*z/L)' or report.get('failures'):
        return False
    physical = ('radiusM', 'lengthM', 'sigmaPerpSM', 'sigmaParallelSM', 'outerVoltageV', 'outerVoltageProfile')
    if any(report.get('manifest', {}).get(k) != manifest.get(k) for k in physical):
        return False
    levels = report.get('levels', [])
    if [level['n'] for level in levels] != [6, 12, 24, 48, 96]:
        return False
    for metric in ('relativePotentialRms', 'relativePowerError'):
        errors = [level[metric] for level in levels]
        if not np.all(np.isfinite(errors)) or min(errors) < 0 or errors[-1] >= .005:
            return False
        if max(errors) >= .002 and not all(b <= a+1e-12 for a, b in zip(errors, errors[1:])):
            return False
    return report.get('passed') is True


def analyze(reports, static_report=None):
    manifest = reports[0]['manifest']
    trajectories, producer_failures = {}, []
    for report in reports:
        if report['manifest'] != manifest:
            raise AssertionError('Manifest changed across raw reports')
        producer_failures.extend(report.get('failures', []))
        for trajectory in report['cases']:
            times = [case['timeS'] for case in trajectory['cases']]
            if len(times) != len(set(times)) or set(times) != set(manifest['timesS']):
                raise AssertionError(f'Missing, extra or duplicate scheduled output in {key(trajectory)}')
            k = key(trajectory)
            if k in trajectories:
                # Duplicate timing/receipt metadata may differ; endpoint evidence must not.
                if trajectory['cases'] != trajectories[k]['cases']:
                    raise AssertionError(f'Conflicting repeated trajectory {k}')
            trajectories[k] = trajectory
    result = {'manifest': manifest, 'series': {}, 'failures': producer_failures,
              'requirementsGaps': [], 'experimentalQualified': False, 'liveQualified': False}
    result['electricalBoundaryAdmissible'] = manifest.get('outerVoltageProfile') == 'sin(pi*z/L)'
    if not result['electricalBoundaryAdmissible']:
        result['requirementsGaps'].append('Unqualified electrical boundary: legacy constant outer/grounded end corner has infinite continuum Joule energy')
    result['staticCurrentPassed'] = static_accepted(static_report, manifest)
    if not result['staticCurrentPassed']:
        result['requirementsGaps'].append('Matching five-level analytic static current control not passed')
    available_series = [s for s in ('joint', 'spatial', 'temporal', 'radial', 'axial') if s in manifest]
    for series in available_series:
        levels = [request(level) for level in manifest[series]]
        ref_key = request(manifest['joint'][-1]) if series in ('spatial', 'radial', 'axial') else levels[-1]
        compared = levels if series in ('spatial', 'radial', 'axial') else levels[:-1]
        if any(k not in trajectories for k in [*compared, ref_key]):
            result['requirementsGaps'].append(f'Missing {series} trajectory')
            continue
        reference = trajectories[ref_key]
        ref_by_time = {case['timeS']: case for case in reference['cases']}
        obs_history = [observables(case) for case in reference['cases']]
        scales = {name: max(abs(o[name]) for o in obs_history) for name in obs_history[0]}
        comparisons = []
        for k in compared:
            cases = []
            for case in trajectories[k]['cases']:
                time = case['timeS']
                ref = ref_by_time[time]
                profiles = compare_cases(case, ref)
                a, b = observables(case), observables(ref)
                obs = {name: abs(a[name]-b[name])/max(scales[name], 1e-20) for name in a}
                cases.append({'timeS': time, 'profiles': profiles, 'observablesNormalized': obs})
            comparisons.append({'nr': k[0], 'nz': k[1], 'nt': k[2], 'cases': cases})
        gates = []
        for time in ref_by_time:
            samples = [next(c for c in comparison['cases'] if c['timeS'] == time) for comparison in comparisons]
            for name in ('gas', 'solid', 'omega'):
                errors = [c['profiles'][name]['rmsNormalized'] for c in samples]
                decreasing = max(errors) < .002 or all(b <= a+1e-12 for a, b in zip(errors, errors[1:]))
                gates.append({'name': f'{time}:{name}:rms', 'passed': errors[-1] < .02, 'value': errors[-1]})
                gates.append({'name': f'{time}:{name}:decreasing', 'passed': decreasing, 'values': errors})
                maximum = samples[-1]['profiles'][name]['maxNormalized']
                gates.append({'name': f'{time}:{name}:max', 'passed': maximum < .05, 'value': maximum})
            for name, value in samples[-1]['observablesNormalized'].items():
                gates.append({'name': f'{time}:{name}', 'passed': value < .02, 'value': value})
        # Finite-reference observed RMS orders describe errors, never gate them.
        coordinate = 2 if series == 'temporal' else 1 if series == 'axial' else 0
        orders = []
        for time in ref_by_time:
            samples = [next(c for c in comparison['cases'] if c['timeS'] == time) for comparison in comparisons]
            for i in range(len(samples)-1):
                refinement = compared[i+1][coordinate]/compared[i][coordinate]
                values = {}
                for name in ('gas', 'solid', 'omega'):
                    a, b = [sample['profiles'][name]['rmsNormalized'] for sample in samples[i:i+2]]
                    values[name] = float(np.log(a/b)/np.log(refinement)) if a > 0 and b > 0 else None
                orders.append({'timeS': time, 'from': list(compared[i]), 'to': list(compared[i+1]),
                               'rmsOrders': values})
        result['series'][series] = {'reference': list(ref_key), 'comparisons': comparisons, 'gates': gates,
                                     'observedOrders': orders,
                                     'passed': all(g['passed'] for g in gates)}
    base_key, tight_key = request(manifest['tighterTolerance']), request(manifest['tighterTolerance'], True)
    if base_key in trajectories and tight_key in trajectories:
        rows = comparison_rows(trajectories[base_key], trajectories[tight_key], .001, .001, .001)
        result['tighterTolerance'] = {'cases': rows, 'passed': all(r['passed'] for r in rows)}
    else:
        result['requirementsGaps'].append('Missing tighter-tolerance repeat')
    result['independentTolerances'] = {}
    for mode in ('linear', 'thermal'):
        mode_key = request(manifest['tighterTolerance'], mode)
        if mode not in manifest.get('independentTolerances', []) or mode_key not in trajectories or base_key not in trajectories:
            result['requirementsGaps'].append(f'Independent {mode} tolerance variation not completed')
            continue
        rows = comparison_rows(trajectories[base_key], trajectories[mode_key], .001, .001, .001)
        result['independentTolerances'][mode] = {'cases': rows, 'passed': all(r['passed'] for r in rows)}
    for axis in ('radial', 'axial'):
        if axis not in result['series']:
            result['requirementsGaps'].append(f'Independent {axis}-only refinement not completed')
    reference_key = request(manifest['joint'][-1])
    for name in ('referenceSmallerDt', 'referenceSpatial'):
        target_key = request(manifest[name]) if name in manifest else None
        if target_key not in trajectories or reference_key not in trajectories:
            result['requirementsGaps'].append(f'{name} self-refinement not completed')
            continue
        rows = comparison_rows(trajectories[reference_key], trajectories[target_key], .02, .05, .02)
        result[name] = {'cases': rows, 'passed': all(r['passed'] for r in rows)}
    result['comparisonGatesPassed'] = (len(result['series']) >= 3 and all(s['passed'] for s in result['series'].values())
                                        and result.get('tighterTolerance', {}).get('passed', False) and not producer_failures)
    result['numericallyQualified'] = (result['comparisonGatesPassed'] and not result['requirementsGaps']
                                    and all(result['independentTolerances'].get(n, {}).get('passed', False) for n in ('linear', 'thermal'))
                                    and all(result.get(n, {}).get('passed', False) for n in ('referenceSmallerDt', 'referenceSpatial')))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('output', type=Path)
    parser.add_argument('reports', type=Path, nargs='+')
    parser.add_argument('--static', type=Path)
    args = parser.parse_args()
    static = json.loads(args.static.read_text()) if args.static else None
    output = analyze([json.loads(path.read_text()) for path in args.reports], static)
    inputs = [*args.reports, *([args.static] if args.static else [])]
    if len({path.name for path in inputs}) != len(inputs):
        raise AssertionError('Input artifact basenames must be unique for hash binding')
    output['inputHashes'] = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in inputs}
    args.output.write_text(json.dumps(output, indent=2, allow_nan=False)+'\n')
    print(json.dumps({'comparisonGatesPassed': output['comparisonGatesPassed'],
                      'numericallyQualified': output['numericallyQualified'], 'gaps': output['requirementsGaps']}))
    sys.exit(0 if output['numericallyQualified'] else 1)
