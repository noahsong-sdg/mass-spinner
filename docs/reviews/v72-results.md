# v72 independent results review

10 November 2026. **Computational checks pass; experimental profile screens
still fail.** No blocking defect found in the reviewed two-operator study.
This disposition does not qualify the simulator experimentally.

## Evidence reviewed

Read `brightness.py`, `run_report.py`, `independent_check.py`, `test_brightness.py`,
`PROTOCOL.md`, accepted `report.json`, `independent-check.json`, and
`verification.log`, plus the retained failed-run log. This reviewer executed no
project code on the host. Numerical execution evidence is the parent's isolated
safe-dev output, including execution of this reviewer's independent checker.

The marker artifact is bound to SHA256
`0cfb21edd1debf57ce7d62351b11d4f628fac84f5e44cfc87f21d84f1554de33`.
The report binds five scientific input files plus that marker artifact. The
checker rejects changed hashes, altered coordinates/splits, incomplete grid
sequences, corrupted numerical results and promoted qualification flags. The
accepted log records its successful source-binding and numerical checks; this
review did not separately recompute host hashes.

## Numerical and experimental results

The retained profile is the 3-Torr, 0.17-T, 100-A argon case reproduced from the
1980 experiment in the 2026 paper. It is separate from the prospective 1979
1-Torr diffuse-profile admission. No new original-figure digitization occurred.
Both operators retain exactly the same eight markers, fixed flow and three
inner calibration / five outer holdouts.

| Final 2048-point operator | Held-out RMS / observed peak | Largest individual held-out error | Every holdout within 20% |
|---|---:|---:|---|
| Uniform local emissivity | 39.9808% | 62.6061% | No |
| Ideal flat projected brightness | 38.8526% | 61.2509% | No |

Every outer residual is negative for both final records. The brightness change
reduces RMS/peak by about **1.13 percentage points**, not 1.13% relative, and
does not repair the discrepancy for this fixed flow. Neither score is a new
uncertainty-qualified accuracy estimate.

All four prescribed quadrature counts are retained. The largest final
fixed-fit projection error against independent QUADPACK is
`1.4305091951527771e-8` of the observed peak, below the unchanged `1e-6` gate.
The corresponding independently refitted prediction error is
`3.818087414263915e-9`. The analytic flat-brightness centroid also agrees with
QUADPACK. Thus quadrature error is far too small to explain these residuals.

## Root-cause and claim checks

Uniform local emissivity and flat projected brightness are distinct observation
assumptions. The new transform integrates the latter exactly in its optical
measure without sampling or clipping its integrable wall singularity. This is
a coherent, limited sensitivity rather than an emissivity inversion.

The primary source's nearly constant measured intensity motivates the ideal;
it does not establish exact flatness over the entire open disk, a physical
divergent wall emissivity, optical thinness or the historical shift estimator.
The results therefore establish only that **this specific change of photon
weights does not fix this fixed-flow comparison**. They do not establish that
all diagnostic uncertainty is small, identify a unique missing mechanism, or
exclude combined thermal, electrical and axial-flow effects.

No fitted electrical forcing, viscosity or emissivity profile was introduced;
the fitted amplitude still prevents an unfitted current-to-speed claim.
Root and per-record experimental-validation and uncertainty flags remain false.
No production defaults, deployment or live behavior are qualified here.

## Verification and runner correction

Accepted logs record these exact check families:

- `python -m unittest discover -s scientific/diagnostic-v72 -p 'test_*.py' -v`:
  7 passed, including source/stale-marker, corruption and path regression cases.
- The corresponding `scientific/diagnostic-v71` suite: 11 passed.
- `run_report.py MARKERS REPORT` and `independent_check.py MARKERS REPORT`:
  report generated and independent reconstruction passed.
- `npm run typecheck`, `npm run build`, `npm run check:site`, and
  `npm run check:assets`: passed; the existing large-bundle warning remains.

The first runner attempt passed the then-current tests but failed while binding
a relative marker path against an absolute project root. In simple terms, it
tried to describe a relative filename as though it were already absolute.
Resolving the input path before serialization is the smallest coherent fix;
the new regression requires identical reports for absolute and relative input
paths. The failed runner/log and source hashes remain under `failed/`. This
runner fix changes provenance serialization, not the physical result.

Static build/site/asset checks are not browser or GPU verification. Passing the
numerical and software checks does not convert the failed experimental screens
into a scientific pass.
