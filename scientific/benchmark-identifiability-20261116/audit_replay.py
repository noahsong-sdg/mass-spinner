"""Independent scalar audit; authenticates receipts, not experimental accuracy."""
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
BASE = 'scientific/electrical-v82/results/'
PINS = {
    BASE+'predictions.json': '8b4041c7db6ee606db57dca695da350919c7a6f0c29727f2dbd3ac010ecd857e',
    BASE+'optical-index.json': '7b92089143a8c092ae0d37e88d87b33e93796d2dae3e13db7672547d25735f90',
    'scientific/profile-v79/results/score.json': '1e4f542dab2cdd777673f724ec3038e0223589797fa290765c0e1c8f047b4741',
}
FIELDS = ('group', 'voltageV', 'edgeClosure', 'temperatureK', 'instrumentSigmaMS', 'estimator')


def require(ok, message):
    if not ok:
        raise ValueError(message)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def same(actual, expected, path='value'):
    if isinstance(expected, dict):
        require(isinstance(actual, dict) and set(actual) == set(expected), path+' keys')
        for key in expected:
            same(actual[key], expected[key], path+'.'+key)
    elif isinstance(expected, list):
        require(isinstance(actual, list) and len(actual) == len(expected), path+' length')
        for i, value in enumerate(expected):
            same(actual[i], value, path+f'[{i}]')
    elif isinstance(expected, bool) or expected is None or isinstance(expected, str):
        require(type(actual) is type(expected) and actual == expected, path+' mismatch')
    else:
        require(type(actual) in (int, float) and math.isfinite(actual)
                and math.isclose(actual, expected, rel_tol=2e-12, abs_tol=1e-12), path+' number')


def optical_rows(packet, points, group, states):
    same([[p['id'], p['radiusM']] for p in packet['locations']],
         [[p['id'], p['radiusM']] for p in points], 'locations')
    measured = [p['velocityMS'] for p in points]
    eligible = [max(abs(v-p['velocityMS']) for v in p['extractionVelocityRangeMS'])
                < .05*abs(p['velocityMS']) for p in points]
    same([p['extractionUnderFivePercent'] for p in points], eligible, 'extraction mask')
    for case in packet['cases']:
        if case['beta'] != 'absolute-voltage':
            continue
        state = states[group, case['voltageV']]
        for closure in case['closures']:
            coarse, fine = closure['centroidMeshes'][-2:]
            change = max(abs(f-c)/max(abs(f), 1e-12)
                         for f, c in zip(fine['velocityMS'], coarse['velocityMS']))
            for temp in (1400, 1800, 2900, 5950, 7250, 'linear'):
                for width in (0., 500., 1000.):
                    spectra = [s for s in closure['spectra']
                               if s['temperatureK'] == temp and s['instrumentSigmaMS'] == width]
                    require(len(spectra) == len(points), 'Incomplete spectral locations')
                    for estimator in ('centroidMS', 'modeMS'):
                        values = [s['refinements'][-1][estimator] for s in spectra]
                        errors = [abs(v-y)/abs(y) for v, y in zip(values, measured)]
                        mesh = all(s['opticalSpectrumMeshGate'] for s in spectra)
                        spectral = all(s['spectralGate'] and s['fluxGate'] for s in spectra)
                        gate = all(e <= .2 for e in errors)
                        compatible = 16.5 <= case['voltageV'] <= 20.5
                        yield dict(group=group, scenario=state['scenario'], anodeCenterM=state['anodeCenterM'],
                            drive='absolute-voltage', currentA=state['prediction']['currentsA']['cathode'],
                            voltageWithinReportedRange=compatible,
                            opticallyResolvedVoltageCompatiblePointMatch=bool(compatible and change < .01 and spectral and mesh and gate),
                            beta='absolute-voltage', voltageV=case['voltageV'], edgeClosure=closure['edgeClosure'],
                            temperatureK=temp, instrumentSigmaMS=width, estimator=estimator, predictionMS=values,
                            errorRelative=errors, worstRelative=max(errors),
                            rmsOverMeasuredPeak=math.sqrt(sum((v-y)**2 for v, y in zip(values, measured))/len(measured))/max(measured),
                            eligiblePointGate=all(e <= .2 for e, use in zip(errors, eligible) if use), allPointGate=gate,
                            opticalCentroidMeshChange=change, opticalCentroidMeshGate=change < .01,
                            spectralGate=spectral, opticalSpectrumMeshGate=mesh)


def audit(result, root=ROOT):
    sealed = {}
    for name, pin in PINS.items():
        raw = (root/name).read_bytes()
        require(digest(raw) == pin, 'Changed original input: '+name)
        sealed[name] = json.loads(raw)
    pred, index, target = (sealed[k] for k in PINS)
    require(result['predictionSHA256'] == PINS[BASE+'predictions.json']
            and result['opticalIndexSHA256'] == PINS[BASE+'optical-index.json'], 'Input receipt')
    receipts = {**PINS, **pred['inputSHA256'], **pred['sourceSHA256']}
    for key in ('operatorSHA256', 'diagnosticSHA256'):
        receipts.update({'scientific/optical-v80/'+k: v for k, v in index[key].items()})
    require(set(receipts) <= set(result['sourceSeals']), 'Missing source receipts')
    for name, pin in result['sourceSeals'].items():
        require(digest((root/name).read_bytes()) == pin, 'Changed receipt: '+name)
    for name, pin in receipts.items():
        require(result['sourceSeals'][name] == pin, 'Changed source identity')
    require(result['replayCodeSHA256'] == digest((Path(__file__).parent/'replay.py').read_bytes()), 'Replay code identity')
    same(result['points'], target['points'], 'targets')
    for key in ('fieldProducerReexecuted', 'parametersRefitted', 'temperaturePredictionAvailable',
                'jointQualification', 'experimentalQualification'):
        same(result[key], False, key)
    same(result['observationsPreviouslyExamined'], True, 'target exposure')
    same(result['temperatureStatus'], 'prescribed-not-predicted', 'thermal status')
    same(result['electricalAcceptanceThreshold'], None, 'electrical acceptance')
    states = {(c['group'], c['voltageV']): c for c in pred['cases'] if c['refinement'] == 4}
    expected = []
    for entry in index['groups']:
        raw = (root/BASE/entry['path']).read_bytes()
        payload = gzip.decompress(raw)
        require(digest(raw) == entry['sha256'] and digest(payload) == entry['rawSHA256'], 'Optical packet identity')
        packet = json.loads(payload)
        require(packet['predictionSHA256'] == result['predictionSHA256'], 'Packet prediction identity')
        for field in ('operatorSHA256', 'diagnosticSHA256'):
            same(packet[field], index[field], 'Packet '+field)
        expected.extend(optical_rows(packet, target['points'], entry['group'], states))
    key = lambda row: tuple(row[k] for k in FIELDS)
    actual = {key(row): row for row in result['cases']}
    require(len(actual) == len(expected) == len(result['cases']) == 4320, 'Optical inventory')
    for row in expected:
        same(actual.get(key(row)), row, str(key(row)))
    electrical = [dict(group=c['group'], scenario=c['scenario'], anodeCenterM=c['anodeCenterM'],
        voltageV=c['voltageV'], predictedCurrentA=c['prediction']['currentsA']['cathode'],
        reportedBranchCurrentA=100, currentRelativeDiscrepancy=abs(c['prediction']['currentsA']['cathode']-100)/100)
        for c in pred['cases'] if c['refinement'] == 4]
    require(len(electrical) == 60, 'Electrical inventory')
    same(result['electricalCases'], electrical, 'electrical results')
    for field, gate in (('opticalAllPointMatches', 'allPointGate'), ('opticalEligiblePointMatches', 'eligiblePointGate')):
        same(result[field], sum(r[gate] for r in expected), field)
    return dict(opticalRowsChecked=len(expected), electricalRowsChecked=len(electrical),
                arithmeticAuditPassed=True, experimentalQualification=False, jointQualification=False,
                temperaturePredictionAvailable=False, replaySHA256=digest(json.dumps(result, sort_keys=True).encode()))


if __name__ == '__main__':
    directory = Path(sys.argv[1])
    outcome = audit(json.loads((directory/'replay.json').read_text()))
    (directory/'independent-audit.json').write_text(json.dumps(outcome, indent=2)+'\n')
    print(json.dumps(outcome, indent=2))
