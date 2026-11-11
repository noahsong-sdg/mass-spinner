"""Independent physical inner-wall surface comparison; parent runs in safe-dev.

CLI: python surface.py PACKET.json CONFIG.json NEW_OUTPUT.json
The hash-bound explicit pairs use the unchanged v67 setup/time validator. Surface
gates are separate from the original cell-mean gates; no production imports.
Solid conductivity: https://arxiv.org/abs/1703.06302 (Tolias2017).
Neutral Li: https://www.jspf.or.jp/JPFRS/PDF/Vol7/jpfr2006_07-217.pdf.
"""
import hashlib
import json
import math
from pathlib import Path
import re
import sys

import analyze as baseline

EPS = sys.float_info.epsilon


def tungsten_k(temperature):
    """Tolias2017 solid-W polynomial in SI, as documented by the v66 sources."""
    if not math.isfinite(temperature) or not 300 <= temperature <= 1900:
        raise ValueError('Surface reconstruction needs solid W300-1900K')
    return (149.441 - .045466*temperature + 13.193e-6*temperature**2
            - 1.484e-9*temperature**3 + 3.866e6/temperature**2)


def lithium_k(temperature):
    """Bouledroua2006 neutral monatomic Li conductivity, W/(m K)."""
    if not math.isfinite(temperature) or not 100 <= temperature <= 3000:
        raise ValueError('Surface flux audit needs neutral Li100-3000K')
    return 1.398e-4*temperature**.863


def require_close(actual, expected, name):
    allowance = 512*EPS*(abs(actual)+abs(expected))
    if not math.isfinite(actual) or abs(actual-expected) > allowance:
        raise ValueError(name+': inconsistent accepted thermal state')


def surface_history(plan):
    case = plan['case']; setup = case['setup']; liner = setup['liner']
    if setup['material'] != 'lithium':
        raise ValueError('Surface study is restricted to the frozen Li material')
    radius, length = setup['radiusM'], setup['lengthM']
    if not math.isfinite(length) or length <= 0 or not math.isfinite(radius) or radius <= 0:
        raise ValueError('Surface geometry needs positive R and L')
    ns = len(liner['massesKg']); ng = len(plan['q'])-1
    centers = baseline.array(liner['radiusCentersM'], ns, 'liner centers', positive=True)
    for i, center in enumerate(centers):
        expected = math.sqrt(liner['radiusEdgesM'][i]*liner['radiusEdgesM'][i+1])
        if not baseline.close(center, expected):
            raise ValueError('Liner centers do not match the declared logarithmic geometry')
    initial = plan['linerT'][0]
    if any(not baseline.close(value, initial[0]) for value in initial):
        raise ValueError('Nonuniform initial wall has no justified initial surface reconstruction')
    film = setup['boundary']['gasWallWK']
    if not math.isfinite(film) or film < 0:
        raise ValueError('Gas-wall film conductance must be finite and nonnegative')
    initial_resistance = math.log(centers[0]/radius)/(2*math.pi*length*tungsten_k(initial[0]))
    initial_gas_resistance = 1/(8*math.pi*length*lithium_k(plan['t'][0][-1])*ng)
    initial_g = 0. if film == 0 else 1/(initial_resistance+1/film+initial_gas_resistance)
    initial_power = initial_g*(plan['t'][0][-1]-initial[0])
    rows = [{'timeS': 0., 'surfaceK': initial[0], 'cellCenterK': initial[0],
             'surfaceRoundoffAllowanceK': 512*EPS*abs(initial[0]), 'powerGasToWallW': None,
             'initialAlgebraicSurfaceK': initial[0]+initial_power*initial_resistance,
             'initialAlgebraicPowerGasToWallW': initial_power,
             'initialBoundaryReconstructionMismatchK': initial_power*initial_resistance}]
    for index, record in enumerate(case['steps'], 1):
        thermal = record['result']['thermal']; dt = record['dtS']
        solid = baseline.array(thermal['linerSolveTemperatureK'], ns, 'accepted solid solve T', positive=True)
        gas = baseline.array(thermal['gasTemperatureK'], ng, 'accepted gas solve T', positive=True)
        for actual, expected in zip(solid, plan['linerT'][index]):
            require_close(actual, expected, 'Canonical/solve solid temperature')
        for actual, expected in zip(gas, plan['t'][index]):
            require_close(actual, expected, 'Canonical/solve gas temperature')
        resistance = math.log(centers[0]/radius)/(2*math.pi*length*tungsten_k(solid[0]))
        gas_resistance = 1/(8*math.pi*length*lithium_k(gas[-1])*ng)
        power = plan['heat'][index-1]/dt
        conductance = 0. if film == 0 else 1/(resistance+1/film+gas_resistance)
        expected_power = conductance*(gas[-1]-solid[0])
        power_allowance = 512*EPS*(abs(power)+abs(expected_power)
                                 + conductance*(abs(gas[-1])+abs(solid[0])))
        if abs(power-expected_power) > power_allowance:
            raise ValueError('Gas-wall heat/dt disagrees with the accepted thermal resistance')
        surface = solid[0]+power*resistance
        if not math.isfinite(surface):
            raise ValueError('Nonfinite reconstructed surface temperature')
        rows.append({'timeS': plan['times'][index], 'surfaceK': surface,
                     'cellCenterK': solid[0], 'powerGasToWallW': power,
                     'solidHalfResistanceKW': resistance,
                     'surfaceRoundoffAllowanceK': 512*EPS*(abs(solid[0])+abs(power*resistance))
                         + resistance*power_allowance,
                     'heatPowerConsistencyAllowanceW': power_allowance})
    return rows


def compare_surfaces(coarse, fine, spec):
    baseline.validate_setup(coarse, fine, spec['axis'])
    shared = baseline.shared_indices(coarse, fine)
    a, b = surface_history(coarse), surface_history(fine)
    baseline.same(a[0]['surfaceK'], b[0]['surfaceK'], 'initial physical surface temperature')
    scale = max(abs(row['surfaceK']-history[0]['surfaceK'])
                for history in (a, b) for row in history)
    causal_scale = []
    excursion = 0.
    for row in b:
        excursion = max(excursion, abs(row['surfaceK']-b[0]['surfaceK']))
        causal_scale.append(excursion)
    trace = []
    causal = {'gated': False, 'resolvedComparisons': 0, 'unresolvedSignalComparisons': 0,
              'unresolvedAboveRoundoffComparisons': 0, 'maximumResolvedRelativeError': 0.,
              'maximumUnresolvedRawErrorK': 0.}
    for ia, ib in enumerate(shared):
        error = abs(a[ia]['surfaceK']-b[ib]['surfaceK'])
        allowance = math.fsum(row['surfaceRoundoffAllowanceK']
                             for row in (a[ia], b[ib], a[0], b[0]))
        signal = causal_scale[ib]
        row = {'timeS': a[ia]['timeS'], 'coarseSurfaceK': a[ia]['surfaceK'],
               'fineSurfaceK': b[ib]['surfaceK'], 'rawDifferenceK': error,
               'fineCausalExcursionK': signal, 'roundoffAllowanceK': allowance,
               'roundoffDominatedReferenceSignal': signal <= allowance,
               'causalRelativeError': baseline.ratio(error, signal)}
        if ia:
            if signal <= allowance:
                causal['unresolvedSignalComparisons'] += 1
                causal['unresolvedAboveRoundoffComparisons'] += int(error > allowance)
                causal['maximumUnresolvedRawErrorK'] = max(causal['maximumUnresolvedRawErrorK'], error)
            else:
                causal['resolvedComparisons'] += 1
                if error/signal > causal['maximumResolvedRelativeError']:
                    causal['maximumResolvedRelativeError'] = error/signal
                    causal['worstResolvedLocation'] = dict(row)
        trace.append(row)
    worst = max(trace, key=lambda row: row['rawDifferenceK'])
    relative = baseline.ratio(worst['rawDifferenceK'], scale)
    limit = .01 if spec['axis'] == 'time' else .02
    gates = [{'name': 'physicalSurfaceTemperatureErrorOverHeating', 'value': relative,
              'limit': limit, 'passed': relative is not None and relative <= limit},
             {'name': 'physicalSurfaceTemperatureAbsoluteErrorK',
              'value': worst['rawDifferenceK'], 'limit': .05, 'passed': worst['rawDifferenceK'] <= .05}]
    compatibility = {}
    for name, history in [('coarse', a), ('fine', b)]:
        initial_algebraic = history[0]['initialAlgebraicSurfaceK']
        jump = history[0]['initialBoundaryReconstructionMismatchK']
        dynamic = max(abs(row['surfaceK']-initial_algebraic) for row in history[1:])
        compatibility[name] = {'initializedUniformSolidSurfaceK': history[0]['surfaceK'],
                               'initialAlgebraicSurfaceK': initial_algebraic,
                               'initialBoundaryReconstructionMismatchK': jump,
                               'maximumSubsequentChangeFromInitialAlgebraicSurfaceK': dynamic,
                               'mismatchOverPrimaryExcursionScale': baseline.ratio(abs(jump), scale),
                               'initialMismatchDominatesSubsequentChange': abs(jump) > 0 and abs(jump) >= dynamic}
    compatibility['interpretation'] = ('Uniform initialized solid trace and finite-cell algebraic boundary '
        'reconstruction need not agree at t=0. Their mismatch is not resolved physical heating; it may '
        'contaminate the primary whole-history surface-excursion normalization. Inspect both spatial and time refinement.')
    return {**spec, 'surfaceRadiusM': coarse['case']['setup']['radiusM'],
            'surfaceErrorK': worst['rawDifferenceK'], 'surfaceHeatingScaleK': scale,
            'surfaceScaleInterpretation': 'Total excursion from initialized solid surface, including initial boundary-reconstruction incompatibility; not a pure physical-heating scale.',
            'relativeSurfaceError': relative, 'worstTimeS': worst['timeS'],
            'sharedAcceptedTimes': len(shared)-1,
            'fineOnlyAcceptedTimesNotCompared': len(b)-len(shared),
            'gates': gates, 'allSurfaceGatesPassed': all(gate['passed'] for gate in gates),
            'causalPerTimeDiagnostics': causal, 'initialBoundaryCompatibility': compatibility, 'trace': trace,
            'coarseSurfaceHistory': a, 'fineSurfaceHistory': b}


def analyze_surfaces(packet, config, prediction_sha256):
    for name, actual in [('sourceSHA256', packet['sourceSHA256']),
                         ('predictionSHA256', prediction_sha256)]:
        value = config[name]
        if not isinstance(value, str) or not re.fullmatch('[0-9a-f]{64}', value) or value != actual:
            raise ValueError('Stale or invalid '+name+' hash')
    cases = packet['cases']; ids = [case['id'] for case in cases]
    if not ids or len(set(ids)) != len(ids):
        raise ValueError('Duplicate or missing case identity')
    pairs = config['pairs']; seen = set(); needed = set()
    if not pairs:
        raise ValueError('Explicit surface comparison pairs required')
    for pair in pairs:
        if set(pair) != {'coarseID', 'fineID', 'axis'} or pair['axis'] not in baseline.AXES:
            raise ValueError('Invalid explicit surface comparison pair')
        identity = (pair['coarseID'], pair['fineID'], pair['axis'])
        if identity in seen or identity[0] == identity[1] or any(value not in ids for value in identity[:2]):
            raise ValueError('Duplicate, missing or self surface comparison')
        seen.add(identity); needed.update(identity[:2])
    plans = {case['id']: baseline.prepare(case) for case in cases if case['id'] in needed}
    comparisons = [compare_surfaces(plans[pair['coarseID']], plans[pair['fineID']], pair) for pair in pairs]
    return {'study': 'v67 physical inner-wall surface qualification',
            'sourceSHA256': packet['sourceSHA256'], 'predictionSHA256': prediction_sha256,
            'comparisons': comparisons, 'unpairedCaseIDs': [value for value in ids if value not in needed],
            'allSurfaceGatesPassed': all(row['allSurfaceGatesPassed'] for row in comparisons),
            'definition': 'Accepted endpoint solid cell T plus signed gas-to-wall power times logarithmic solid half-cell resistance at common physical R.',
            'normalization': 'Raw maximum shared-time surface difference / maximum surface excursion from initialized uniform solid over BOTH complete histories; no signal floor or roundoff subtraction. Initial algebraic boundary mismatch reported separately and is not resolved physical heating.',
            'causalAssessment': 'Fine-reference causal excursion at each shared time; no floors, roundoff-dominated signals flagged; diagnostic only.',
            'fineOnlyAcceptedTimesCompared': False, 'conservationAuditIncluded': False,
            'experimentalValidation': False, 'liveBackendChanged': False}


if __name__ == '__main__':
    raw = Path(sys.argv[1]).read_bytes(); config_raw = Path(sys.argv[2]).read_bytes()
    result = analyze_surfaces(json.loads(raw), json.loads(config_raw), hashlib.sha256(raw).hexdigest())
    result['configurationSHA256'] = hashlib.sha256(config_raw).hexdigest()
    with Path(sys.argv[3]).open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    print(json.dumps({'allSurfaceGatesPassed': result['allSurfaceGatesPassed'],
                      'comparisons': [{key: value for key, value in row.items()
                                       if key not in ('trace', 'coarseSurfaceHistory', 'fineSurfaceHistory')}
                                      for row in result['comparisons']]}, indent=2))
    if not result['allSurfaceGatesPassed']:
        raise SystemExit(1)
