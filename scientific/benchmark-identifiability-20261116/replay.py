"""Fresh, no-fit diagnostic replay of sealed V82 fields; not a PDE rerun."""
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
PRED = 'scientific/electrical-v82/results/predictions.json'
INDEX = 'scientific/electrical-v82/results/optical-index.json'
TARGET = 'scientific/profile-v79/results/score.json'
SCORER = 'scientific/electrical-v82/compare82.py'
SEALS = {
    PRED: '8b4041c7db6ee606db57dca695da350919c7a6f0c29727f2dbd3ac010ecd857e',
    INDEX: '7b92089143a8c092ae0d37e88d87b33e93796d2dae3e13db7672547d25735f90',
    TARGET: '1e4f542dab2cdd777673f724ec3038e0223589797fa290765c0e1c8f047b4741',
    SCORER: '9777991b6409a886d7827c11bc1d3708249365beb6a0138bdb0b22129930ae96',
    'scientific/optical-v80/compare.py': '75cfcc0ee62e0f80a986897b0e23b87e5d8846d81bda28afbd4ca4c996958bc4',
}
SCENARIOS = tuple(f'{shape}-{suffix}' for shape in ('linear', 'quadratic') for suffix in
    ('v81-leading-te1', 'finite-te1', 'finite-te2.5-source', 'finite-te2.5-ei-only', 'finite-te2.5-uniform20'))
GROUPS = tuple(f'{name}-anode-{center}' for name in SCENARIOS for center in (.07, .08))
VOLTAGES = (16.5, 18.5, 20.5)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def checked_bytes(root, name, expected):
    raw = (root / name).read_bytes()
    require(sha(raw) == expected, 'Sealed bytes changed: ' + name)
    return raw


def validate_packets(prediction, index):
    for key in ('experimentalQualification', 'targetVelocityRead', 'currentConditioning'):
        require(prediction.get(key) is False, 'Invalid prediction conditioning/qualification: ' + key)
    for key in ('experimentalQualification', 'targetVelocityRead'):
        require(index.get(key) is False, 'Invalid optical conditioning/qualification: ' + key)
    require(index['predictionSHA256'] == SEALS[PRED], 'Optical prediction identity changed')
    entries = index['groups']
    require(len(entries) == 20 and len({g['group'] for g in entries}) == 20
            and {g['group'] for g in entries} == set(GROUPS), 'Incomplete or duplicate optical groups')
    require(all(g['path'] == 'optics/' + g['group'] + '.json.gz' for g in entries), 'Invalid optical path')
    rows = prediction['cases']
    require(len(rows) == 100 and all(c['drive'] == 'absolute-voltage' for c in rows),
            'Primary predictions must retain all 100 absolute-voltage cases')
    identities = [(c['group'], c['refinement'], c['voltageV']) for c in rows]
    expected = {(g, n, 18.5) for g in GROUPS for n in (1, 2, 4)}
    expected |= {(g, 4, v) for g in GROUPS for v in (16.5, 20.5)}
    require(len(set(identities)) == 100 and set(identities) == expected, 'Missing or duplicate electrical cases')
    m = prediction['manifest']
    require((m['radiusM'], m['halfLengthM'], m['magneticT'], m['branchCurrentA'])
            == (.06, .24, .13, 100), 'Apparatus/target-current mapping changed')


def load_inputs(root=ROOT):
    blobs = {name: checked_bytes(root, name, seal) for name, seal in SEALS.items()}
    prediction, index = json.loads(blobs[PRED]), json.loads(blobs[INDEX])
    validate_packets(prediction, index)
    sources = {**prediction['inputSHA256'], **prediction['sourceSHA256']}
    sources.update({'scientific/optical-v80/' + f: h for f, h in index['operatorSHA256'].items()})
    sources.update({'scientific/optical-v80/' + f: h for f, h in index['diagnosticSHA256'].items()})
    for name, seal in sources.items():
        checked_bytes(root, name, seal)
    groups = {}
    for entry in index['groups']:
        name = 'scientific/electrical-v82/results/' + entry['path']
        raw = checked_bytes(root, name, entry['sha256'])
        data = gzip.decompress(raw)
        require(sha(data) == entry['rawSHA256'], 'Raw optical packet changed: ' + name)
        group = json.loads(data)
        require(group['predictionSHA256'] == SEALS[PRED]
                and group['operatorSHA256'] == index['operatorSHA256']
                and group['diagnosticSHA256'] == index['diagnosticSHA256'], 'Optical packet source mismatch')
        groups[entry['path']] = raw
    return blobs, prediction, index, groups, sources


def validate_rows(rows):
    expected = {(g, v, edge, t, instrument, estimator)
        for g in GROUPS for v in VOLTAGES for edge in ('linear', 'sqrt')
        for t in (1400, 1800, 2900, 5950, 7250, 'linear')
        for instrument in (0., 500., 1000.) for estimator in ('centroidMS', 'modeMS')}
    identities = [(r['group'], r['voltageV'], r['edgeClosure'], r['temperatureK'],
                   r['instrumentSigmaMS'], r['estimator']) for r in rows]
    require(len(rows) == 4320 and len(set(identities)) == 4320 and set(identities) == expected,
            'Incomplete or duplicate absolute-voltage diagnostic alternatives')
    require(all(r['drive'] == 'absolute-voltage' and r['beta'] == 'absolute-voltage' for r in rows),
            'Current-conditioned prediction entered absolute-voltage replay')


def validate_result(result):
    require(result.get('temperaturePredictionAvailable') is False
            and result.get('temperatureStatus') == 'prescribed-not-predicted'
            and result.get('jointQualification') is False
            and result.get('experimentalQualification') is False
            and result.get('fieldProducerReexecuted') is False
            and result.get('parametersRefitted') is False
            and result.get('observationsPreviouslyExamined') is True,
            'Unsupported joint/temperature/experimental validation claim')
    validate_rows(result['cases'])


def replay(root=ROOT):
    blobs, prediction, index, groups, sources = load_inputs(root)
    spec = importlib.util.spec_from_file_location('sealed_compare82', root / SCORER)
    scorer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(scorer)
    points = json.loads(blobs[TARGET])['points']
    comparison = scorer.compare(blobs[PRED], index, groups, points)
    rows = [r for r in comparison['cases'] if r['drive'] == 'absolute-voltage']
    validate_rows(rows)
    electrical = []
    for case in prediction['cases']:
        if case['refinement'] != 4:
            continue
        current = case['prediction']['currentsA']['cathode']
        electrical.append(dict(group=case['group'], scenario=case['scenario'],
            anodeCenterM=case['anodeCenterM'], voltageV=case['voltageV'], predictedCurrentA=current,
            reportedBranchCurrentA=100, currentRelativeDiscrepancy=abs(current-100)/100))
    result = dict(kind='sealed-v82-absolute-voltage-diagnostic-replay', schemaVersion=1,
        sourceSeals={**SEALS, **sources}, opticalIndexSHA256=SEALS[INDEX], points=points,
        predictionSHA256=SEALS[PRED], fieldProducerReexecuted=False, parametersRefitted=False,
        observationsPreviouslyExamined=True, temperaturePredictionAvailable=False,
        temperatureStatus='prescribed-not-predicted', jointQualification=False,
        experimentalQualification=False, electricalCases=electrical, cases=rows,
        opticalAllPointMatches=sum(r['allPointGate'] for r in rows),
        opticalEligiblePointMatches=sum(r['eligiblePointGate'] for r in rows),
        electricalAcceptanceThreshold=None,
        scope='Retrospective conditional rotation/electrical diagnostic replay. Corrected arc voltage to finite-disk port mapping is unresolved. No current/velocity fitting, PDE rerun or independent thermal prediction.',
        temperatureCaveat='Heavy temperature is prescribed in transport. Per-case temperatureK is a spectral line-width sensitivity input, not a predicted gas temperature. Measured brightness constrains emissivity; estimator and edge closures remain alternatives.',
        nominalPolicy='All ten original scenarios, both anode geometries, three voltage choices and all 72 optical alternatives retained. No residual-selected winner. Optical pass counts do not establish joint current/rotation agreement.')
    validate_result(result)
    result['replayCodeSHA256'] = sha(Path(__file__).read_bytes())
    return result


def main():
    output = Path(sys.argv[1]).resolve()
    require(not output.exists(), 'Output directory must be new')
    result = replay()
    payload = json.dumps(result, indent=2, allow_nan=False) + '\n'
    output.mkdir(parents=True, exist_ok=False)
    (output / 'replay.json').write_text(payload)
    print(json.dumps(dict(cases=len(result['cases']), electricalCases=len(result['electricalCases']),
        opticalAllPointMatches=result['opticalAllPointMatches'],
        temperatureStatus=result['temperatureStatus'], jointQualification=False,
        replaySHA256=sha(payload.encode())), indent=2))


if __name__ == '__main__':
    main()
