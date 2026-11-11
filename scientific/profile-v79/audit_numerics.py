"""Independent analysis of sealed predictions; no target data or producer imports."""
import hashlib
import json
import math
from pathlib import Path
import sys


def relative(a, b):
    if not (math.isfinite(a) and math.isfinite(b)) or b == 0:
        raise ValueError('Relative comparison needs finite values and nonzero reference')
    return abs(a-b)/abs(b)


def chords(a, b):
    if a['chordsM'] != b['chordsM'] or not a['chordVelocityMS']:
        raise ValueError('Need the same nonempty frozen sight lines')
    return max(relative(x, y) for x, y in zip(a['chordVelocityMS'], b['chordVelocityMS'], strict=True))


def audit(packet):
    m = packet['manifest']
    if packet['targetDataRead'] or packet['qualification']:
        raise ValueError('Expected unqualified predictions sealed before target admission')
    expected = {(b, r, m['bulkVoltageV']) for b in m['effectiveBetaCases'] for r in m['refinements']}
    expected |= {(b, max(m['refinements']), v) for b in m['effectiveBetaCases'] for v in m['bulkVoltageCasesV']}
    cases = {(c['beta'], c['refinement'], c['voltageV']): c for c in packet['cases']}
    if len(cases) != len(packet['cases']) or set(cases) != expected:
        raise ValueError('Missing, duplicated or unexpected prediction cases')
    if any(c['status'] != 'available' for c in cases.values()):
        raise ValueError('An unavailable case prevents complete numerical admission')
    rows, gates = [], []
    for beta in m['effectiveBetaCases']:
        previous = None
        for ref in sorted(m['refinements']):
            c = cases[beta, ref, m['bulkVoltageV']]
            p, independent = c['prediction'], c['independentSameSigma']
            residual = max(independent[k] for k in ('chargeResidualRelative', 'powerResidualRelative', 'torqueResidualRelative'))
            gates.append({'beta': beta, 'refinement': ref, 'metric': 'independent/global ledgers',
                          'value': residual, 'limit': 1e-8, 'pass': math.isfinite(residual) and 0 <= residual < 1e-8})
            row = {'beta': beta, 'refinement': ref, 'sameSigma': {
                'maximumPointwiseChordRelative': chords(independent, p),
                'branchCurrentRelative': relative(independent['branchCurrentA'], p['currentsA']['cathode']),
                'electrodePowerRelative': relative(independent['electrodePowerW'], p['electrodePowerW']),
                'joulePowerRelative': relative(independent['jouleW'], p['jouleW']),
                'viscousPowerRelative': relative(independent['shearW'], p['viscousW'])}}
            row['independentLocalMomentumResidualRelative'] = independent['momentumResidualRelative']
            if previous is not None:
                old = previous['prediction']
                row['refinementChange'] = {
                    'maximumPointwiseChordRelative': chords(old, p),
                    'sigmaRelative': relative(previous['sigmaParallelSM'], c['sigmaParallelSM']),
                    **{key+'Relative': relative(old[key], p[key]) for key in ('electrodePowerW', 'jouleW', 'viscousW')}}
            if ref == max(m['refinements']):
                for group in ('sameSigma', 'refinementChange'):
                    gates.extend({'beta': beta, 'metric': group+'/'+key, 'value': value,
                                  'limit': .05, 'pass': value < .05} for key, value in row[group].items())
            rows.append(row)
            previous = c
    for (beta, ref, voltage), c in cases.items():
        p = c['prediction']
        residuals = [p[k] for k in ('chargeResidualRelative', 'boundaryResidualRelative',
                     'powerResidualRelative', 'angularResidualRelative', 'linearResidualRelative')]
        residuals.append(relative(p['currentsA']['cathode'], m['branchCurrentA']))
        gates.append({'beta': beta, 'refinement': ref, 'voltageV': voltage,
                      'metric': 'ledger/calibration maximum', 'value': max(residuals),
                      'limit': 1e-8, 'pass': all(math.isfinite(x) and 0 <= x < 1e-8 for x in residuals)})
    return {'rows': rows, 'gates': gates, 'numericalPass': all(g['pass'] for g in gates),
            'experimentalQualification': False, 'targetsRead': False}


if __name__ == '__main__':
    source = Path(sys.argv[1]); report = audit(json.loads(source.read_text()))
    report['predictionSHA256'] = hashlib.sha256(source.read_bytes()).hexdigest()
    Path(sys.argv[2]).write_text(json.dumps(report, indent=2, allow_nan=False)+'\n')
    print(json.dumps(report, indent=2, allow_nan=False))
    raise SystemExit(0 if report['numericalPass'] else 1)
