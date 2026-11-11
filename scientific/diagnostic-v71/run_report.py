"""Emit the synthetic LOS refinement study as JSON; run only in safe-dev.

Uses the direct-y reference and frozen smooth profiles exercised by the tests.
No measurement is fitted, and no production or experimental accuracy is claimed.
"""
import hashlib
import json
from pathlib import Path

from test_chord import continuous_reference, smooth_cells

FIELDS = ('brightness', 'centroid_m_s', 'thermal_variance_m2_s2',
          'shear_variance_m2_s2')
COUNTS = (32, 128, 512, 2048)


def build_report():
    cases = []
    for impact in (.17, .43, .81):
        low = continuous_reference(impact, 25000)
        reference = continuous_reference(impact, 100000)
        reference_errors = {key: abs(a-b)/abs(b)
                            for key, a, b in zip(FIELDS, low, reference)}
        rows = []
        for count in COUNTS:
            actual = smooth_cells(count, impact)
            errors = {key: abs(getattr(actual, key)-want)/abs(want)
                      for key, want in zip(FIELDS, reference)}
            maximum = max(errors.values())
            rows.append({'radialCells': count, 'relativeErrors': errors,
                         'maximumRelativeError': maximum,
                         'withinOriginalTolerance': maximum < 5e-4})
        decreasing = all(b['maximumRelativeError'] < a['maximumRelativeError']
                         for a, b in zip(rows, rows[1:]))
        cases.append({'impactM': impact, 'reference': dict(zip(FIELDS, reference)),
                      'referenceRefinementRelativeErrors': reference_errors,
                      'rows': rows,
                      'referenceResolved': max(reference_errors.values()) < 1e-7,
                      'maxErrorDecreases': decreasing,
                      'finestWithinTolerance': rows[-1]['withinOriginalTolerance']})
    folder = Path(__file__).parent
    sources = {name: hashlib.sha256((folder/name).read_bytes()).hexdigest()
               for name in ('chord.py', 'test_chord.py', 'PROTOCOL.md', 'run_report.py')}
    passed = all(c['referenceResolved'] and c['maxErrorDecreases']
                 and c['finestWithinTolerance'] for c in cases)
    return {'study': 'v71-synthetic-optical-moments', 'sourcesSha256': sources,
            'profileRelativeTolerance': 5e-4, 'referenceRelativeTolerance': 1e-7,
            'syntheticRefinementPassed': passed,
            'matchedExperimentalValidation': False, 'liveQualified': False,
            'cases': cases,
            'limits': 'Specified single-transition optically thin synthetic profiles; '
                      'no recovered spectral fit, emissivity or real-machine qualification. '
                      'The retained 512-cell outer-chord failure motivated 2048-cell refinement.'}


if __name__ == '__main__':
    report = build_report()
    print(json.dumps(report, indent=2, allow_nan=False))
    raise SystemExit(0 if report['syntheticRefinementPassed'] else 1)
