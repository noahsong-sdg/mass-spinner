"""Independent stable-norm replay of sealed V107 fields; no new trajectories."""
import argparse
import json
import os
from pathlib import Path
import sys

import audit107 as admission
import stable107


def audit(out, phase, original, radial, cases, producer=admission.ROOT, prior_audit=None):
    """Single-process CLI scope; restore the frozen checker's metric afterward."""
    out = Path(out).resolve()
    saved = admission.audit99.metrics
    try:
        admission.audit99.metrics = stable107.metrics
        result = admission.audit(out, phase, original, radial, cases, producer)
    finally:
        admission.audit99.metrics = saved
    if prior_audit is not None:
        raw = Path(prior_audit).read_bytes()
        prior = json.loads(raw)
        admission.audit99.require(all(prior[key] == result[key] for key in
            ('casePackets', 'producerSourceSHA256')), 'Prior audit describes different saved fields')
        result.update(rawAuditSHA256=admission.audit99.sha(raw),
                      rawComparisonFailures=prior['failures'])
    # Full jobs include phase and reporting clocks, not just geometry/CFL keys.
    # Keep the frozen component's old key list visible without counting short
    # preflights as completed full trajectories.
    result['rawMissingFullJobKeys'] = result['missingFullJobs']
    if phase == 'preflight':
        result['missingFullJobs'] = [list(job) for job in admission.FULL_JOBS]
    result.update(
        metricImplementationSHA256=admission.audit99.sha(Path(stable107.__file__).read_bytes()),
        analysisSourceSHA256={path.name: admission.audit99.sha(path.read_bytes())
                             for path in (Path(__file__), Path(stable107.__file__))},
        componentAuditSHA256=admission.audit99.sha((out/'audit.json').read_bytes()),
        normMethod='Exact-float rational Q1 difference before binary64 Gaussian quadrature',
        producerFieldsRewritten=False,
        scope='Stable numerical postprocessing of the declared saved-state matrix. '
              'Frozen producer and thresholds unchanged. No experimental or live qualification.')
    with (out/'stable-audit.json').open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    return result


if __name__ == '__main__':
    admission.audit99.require(sys.platform == 'linux' and os.getuid() == 1000,
                             'Execute only inside safe-dev')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('out', type=lambda p: Path(p).resolve())
    parser.add_argument('phase', choices=('preflight', 'full'))
    parser.add_argument('original', type=lambda p: Path(p).resolve())
    parser.add_argument('radial', type=lambda p: Path(p).resolve())
    parser.add_argument('cases', nargs='+', type=lambda p: Path(p).resolve())
    parser.add_argument('--producer', type=lambda p: Path(p).resolve(), default=admission.ROOT)
    parser.add_argument('--prior-audit', type=lambda p: Path(p).resolve())
    args = parser.parse_args()
    result = audit(args.out, args.phase, args.original, args.radial, args.cases,
                   args.producer, args.prior_audit)
    print(json.dumps({key: result[key] for key in
        ('status', 'qualificationStatus', 'missingFullJobs', 'failures')}, indent=2))
    raise SystemExit(not result['fullDeclaredMatrixPass'])
