"""Replay the unchanged V99 gates, then predict optics before reading targets."""
import json
from pathlib import Path
import sys
import numpy as np
import campaign100
import independent100

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'coupled-v99'))
import audit99
import optics99


def audit_sources(campaign=campaign100):
    baseline = 'scientific/'+campaign.old.SOURCE_FILES[-1]
    # The legacy auditor identifies its baseline by the final inventory entry.
    return tuple('scientific/'+p for p in campaign.FILES
                 if 'scientific/'+p != baseline)+(baseline,)


def evaluate(directory, producer, campaign=campaign100, expected_edges=None):
    audit99.SOURCES = audit_sources(campaign)
    audit = audit99.audit(directory/'predictions.json', producer, 'cflBound', expected_edges)
    with (directory/'audit.json').open('x') as stream:
        json.dump(audit, stream, indent=2, allow_nan=False)
    states = independent100.load(directory/'predictions.json')
    restricted = [dict(pair=[a, b], timeS=t,
        fields=independent100.compare(states[a, .1], states[b, .1], ti))
        for a, b in ((1, 2), (2, 4)) for ti, t in enumerate(campaign100.old.TIMES)]
    with (directory/'restriction.json').open('x') as stream:
        json.dump(restricted, stream, indent=2, allow_nan=False)
    print('AUDIT', len(audit['failures']), flush=True)
    # The first operation seals spectra; only score() opens measured velocities.
    optics99.predict(directory)
    optics99.score(directory)
    comparison = json.loads((directory/'comparison.json').read_text())
    packet = json.loads((directory/'predictions.json').read_text())
    summary = dict(predictionSHA256=campaign100.old.sha((directory/'predictions.json').read_bytes()),
        auditSHA256=campaign100.old.sha((directory/'audit.json').read_bytes()),
        comparisonSHA256=campaign100.old.sha((directory/'comparison.json').read_bytes()),
        failureCount=len(audit['failures']), failures=audit['failures'],
        comparisons=audit['comparisons'], caseResources=[{k: c[k] for k in
            ('label', 'stepCount', 'elapsedS', 'peakResidentKiB')} for c in packet['cases']],
        allRequiredNumericalPass=audit['allRequiredNumericalPass'],
        experimentalQualification=False, optical=[])
    for group in comparison['groups']:
        cases = group['cases']
        summary['optical'].append(dict(timeS=group['timeS'], alternatives=len(cases),
            allPointMatches=sum(c['allPointGate'] for c in cases),
            minimumWorstPointDiscrepancy=min(c['worstRelative'] for c in cases),
            maximumWorstPointDiscrepancy=max(c['worstRelative'] for c in cases),
            numericalDiagnosticFailures=sum(not all(c[k] for k in ('spectralGate',
                'opticalCentroidMeshGate', 'opticalSpectrumMeshGate', 'losQuadratureGate')) for c in cases)))
    ledgers = ('massRelativeDrift', 'speciesRelativeDrift', 'energyRelativeDefect',
               'angularRelativeDefect', 'chargeRelativeResidual')
    summary['maximumLedgerDefects'] = {k: max(h[k] for s in states.values()
        for h in s['history']) for k in ledgers}
    finest = states[4, .1]
    summary['finestFrames'] = [dict(timeS=s['timeS'], maximumTemperatureK=float(np.max(s['temperatureK'])),
        maximumMeridionalSpeedMS=float(np.max(np.hypot(s['vrMPS'], s['vzMPS'])))) for s in finest['snapshots']]
    with (directory/'summary.json').open('x') as stream:
        json.dump(summary, stream, indent=2, allow_nan=False)
    print(json.dumps(summary, indent=2), flush=True)
    return audit['allRequiredNumericalPass']


if __name__ == '__main__':
    raise SystemExit(not evaluate(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()))
