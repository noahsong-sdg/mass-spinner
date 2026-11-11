# General 3V independent WarpX reference

This study uses the installed WarpX26.10 solver as an independent stochastic
moment reference for the new general velocity-space backend. It does not replace
the deterministic physical-H or full-PDF convergence gates. The actual nominal
Gaussian distributions match the Julia initializer; their finite particle samples
are deliberately not projected onto exact nominal moments.

## Why this comparison

Small deterministic Gaussian mixtures have a substantial initial density
resolution error. Comparing only their final moments cannot separate that error
from a wrong collision operator. WarpX supplies a separately implemented,
large-particle full-3V collision reference. In simple terms, it tests the same
physical initial distributions with many independently sampled particles instead
of assuming that a small smooth-particle representation already resolves them.

Reusing the installed solver avoids a new unvalidated collision implementation
or a different fitted relaxation model. It introduces Monte Carlo uncertainty,
so the unit of replication is a complete seeded run. Individual particles and
time checkpoints are not extra independent runs. This choice is useful for
moment/rate cross-checks; it cannot certify a deterministic continuum density.

## Physical and numerical setup

Both singly charged species have density5e17m^-3, masses40/84u and fixed lnLambda12.
The unrestricted velocity space is three-dimensional; the spatial domain is a
single homogeneous1m cell with motion, charge/current deposition, field gathering
and field solving disabled. All six fields are checked at every checkpoint.
The cases include common5eV, unequal2/10eV, non-axis-aligned counterdrift, rotated
SPD pressure tensors, and combined drift/anisotropy.

The separate unlike/self collision operators use WarpX's relativistic elastic
Monte Carlo `pairwisecoulomb` implementation. Equal macro weights permit disabling
the optional energy/momentum correction. Proper momentum and kinetic energy are
measured as P=m*u and E=m*u^2/(gamma+1), with v=u/gamma, avoiding cancellation
in gamma-1 at thermal velocities. These are actual conserved quantities, not a
postprocessed projection. The pinned upstream constructor explicitly recognizes
identical species names as self collisions. [Parameter reference](https://warpx.readthedocs.io/en/26.10/usage/parameters.html#collision-models),
[binary collision constructor](https://github.com/BLAST-WarpX/warpx/blob/26.10/Source/Particles/Collision/BinaryCollision/BinaryCollision.H).

## Prospective campaign and interpretation

The frozen21-case campaign uses three independent whole-run seeds101/202/303:

| Cases | Particles/species | dt | Duration |
|---|---:|---:|---:|
| Combined | 65536 | 0.5us | 100us |
| Combined | 262144 | 0.5us | 100us |
| Combined | 262144 | 0.25us | 100us |
| Thermal, drift, anisotropy | 262144 | 0.25us | 100us each |
| Common-temperature control | 65536 | 0.25us | 500us |

Each row represents three complete runs. Common uses a lower particle count to
retain every initial/final raw velocity array within safe-dev's512MiB export cap.
Its zero physical reference rate receives no fabricated relative denominator.
The separately retained N16384 pilot is not pooled as an independent replicate.

Initial derivatives fit DeltaY=a*t+b*t^2 over0..5us and0..10us, rather than dividing
a100us change by elapsed time. Vector errors use Euclidean norm; full tensor
errors use Frobenius norm, counting offdiagonal terms twice. Frozen independent
Gaussian Landau initial derivatives supply the physical reference, including
the unchanged thermal scalar heating target27982.16330006834eV/s.

The rate confidence family contains3*d coordinates: both window estimates and
their paired difference, d=3 for mean vectors or6 for symmetric tensors.
Bonferroni-adjusted Student-t intervals across three complete runs give a
per-family95% box under the approximate-normal run-estimator assumption.
They are not a campaign-wide confidence statement. Their radius, short-window
reference error and window-sensitivity bound form an engineering2% comparison.
Window agreement is an empirical bias diagnostic, not a rigorous derivative
truncation bound. The independent math agent reviewed this distinction.

Combined particle and timestep rate controls compare paired fitted0..5us rates,
normalized by the same nonzero physical reference-rate norm. Both upper bounds
must fit within2% for rate qualification. Pure scenarios have no independent
particle/time ladder and cannot inherit a complete PASS from combined cases.
Separately,50/100us state controls use fixed positive nominal thermal-velocity
and full-temperature Frobenius scales; those controls are descriptive and do
not establish initial-rate precision.

All cases retain actual raw3V velocities at initial/final time; selected combined
50us states are also retained. Full means, all pressure components, conservation
diagnostics and zero-field checks are saved every0.5us through10us, then50/100us
and the final time. Joint64^3 histograms and five complex characteristic functions
are descriptive distribution data. Their sampling error and finite bins prevent
promoting them to a2e-4 continuum-PDF certificate or1e-8 pathwise physical-H gate.
Entropy of the stochastic law and entropy of a realized density estimate differ.

## Provenance and verification

All execution and tests ran offline in safe-dev VM `safe-dev-03cb133e6ecc3d96`,
using the existing installation and new guest `/work/project/v17-new` only.
Earlier WarpX source/results were neither replaced nor rerun. No host solver,
dependency installation, credentials, live mounts or network fallback was used.
The source was explicitly copied, checked and frozen before main execution.
Each case had a120s/1GiB cap; statuses retain actual exit codes, wall times and
sampled peak RSS. The initial pilot used0.8104s and100996KiB.

Frozen main plan SHA256:
`7a112c75f33de328f3b270626a8e71a860b227c9b9952b7b08173abaf9736c97`.
Runner SHA256:
`b6f80222401282a2364dddd0b3e185bd6cf6d73d2afd15500ebc1e6705401e35`.
Analyzer SHA256:
`7b9b00a4a59bb388d1fdded78ef4a774751014e64d93a793f22e4b31f51dae2b`.
Independent reference snapshot SHA256:
`11d9930b3f3b483a047877d88842544459b9f541de1e8670a9040083c8d01676`.

The package is Python3.12.16, NumPy2.5.4, SciPy1.18.1, pywarpx26.10. The actual
1D3V shared object SHA256 is
`0a8ad485e04dd5158a70a2d1a2e15321d39bb1459e11b411262227a09ef016d2`.
The existing conda package provenance is preserved separately; a version string
alone is not asserted to be a source commit. Main sources, exact inputs and all
six installed geometry-library hashes are recorded in the machine plan.

The nine unit/regression checks passed before freezing the campaign. They cover
full correlated Gaussian units, nested unprojected initialization, proper-velocity
round trips, collision-only deck boundaries, full-tensor norms, initial slope
versus finite-time secant, whole-run uncertainty decisions, paired finite-time
statistics, and refusing to overwrite existing scientific output.

## Results

All21 main cases completed with exit0,326.30s summed wall time, and maximum sampled
RSS241016KiB. No wall/RSS cap was reached. Independent reconstruction checked all
88 raw species snapshots. Maximum relative discrepancies were5.87e-14 for means,
1.84e-15 for tensors,2.44e-15 for energy and1.05e-14 for momentum. Total number
was constant exactly; maximum relative energy/momentum defects were4.41e-13 and
6.74e-15. All saved fields were exactly zero and all pressure tensors SPD.
Uniform weights, exact raw Gaussian initialization, all joint histogram totals,
raw histogram reconstruction and raw characteristic functions also passed.

All20 nonzero physical-rate families remain **UNRESOLVED** at the prospective2%
precision gate. Four zero-drift reference families receive no relative gate.
Fine N262144/dt0.25us point estimates are:

| Scenario | Drift-vector error | Species1 full-tensor error | Species2 full-tensor error |
|---|---:|---:|---:|
| Thermal | zero reference | 3.40% | 4.72% |
| Drift | 4.95% | 3.61% | 6.58% |
| Anisotropy | zero reference | 2.28% | 4.27% |
| Combined | 4.07% | 2.80% | 6.65% |

These are errors of the three-run mean estimate, not confidence bounds. For
example, combined species1 tensor error is2.80%, but its simultaneous sampling
radius is56.55% and the window-difference upper bound adds34.10%, giving93.45%
engineering upper error. The radius equals
`t_(1-0.05/(2*18),2) * ||coordinate whole-run SD|| / sqrt(3) / ||reference||`.
The critical value is18.9341 for tensors,13.3604 for vectors. Thus a roughly5.17%
norm of whole-run tensor-rate standard deviations produces a56.55% simultaneous
radius. The mean error can be small through cancellation while three runs supply
only two degrees of freedom. Short5us derivative fits further amplify noisy
moment changes. Close central estimates therefore do not establish2% accuracy.

As a narrower descriptive check, thermal species1 scalar heating estimates were
27930.73,28115.94,28591.98eV/s, averaging28212.89eV/s:0.825% above the unchanged
27982.16 target. This scalar agreement does not qualify the full tensor or its
uncertainty. Combined particle/timestep initial-rate controls are also unresolved.
Their drift-vector point differences are12.78%/1.87%, with69.11%/32.10% sampling
upper bounds. At100us, the paired timestep-state point differences are0.182%
for species1 drift on the fixed thermal-velocity scale and0.523% for its full
temperature tensor, with descriptive upper bounds0.902% and4.526%. Those use
different denominators and cannot be substituted for initial-rate gates.

The three common-temperature samples start near5eV and finish at
4.985/5.037,5.010/5.028,5.009/5.009eV after500us. These are individual finite-sample
temperatures, not exact stationarity or continuum equilibrium certificates.
A separate prospective collision-off N1024 control also completed:0.219s,
94816KiB, actual initial/final raw velocity arrays exactly unchanged, all fields0.

The standalone [`moment-uncertainty.svg`](../scientific/general3d-warpx-v17/moment-uncertainty.svg)
and `figure-data.json` show physical-rate errors and paired N/dt controls. Blue
ranges are positive norm upper bounds from simultaneous coordinate sampling
boxes; orange adds the empirical window bound. They are deliberately not drawn
as symmetric confidence intervals on a nonnegative norm. Raw data and the exact
plotting source are retained. No seed, fit window or acceptance threshold was
tuned after seeing campaign outcomes.

Final narrow checks: nine unit/regression tests passed again in0.063s; the frozen
analyzer reconstructed21 cases/88 raw snapshots; the supplemental artifact
validator passed21 cases, including all132 joint histogram snapshots. The old
source/results preservation check verified151 shared files byte-for-byte.
An initial checker incorrectly assumed the later host-only `REPORT.md` and
`verification-export-v1` archive existed in the guest. The correction explicitly
identifies those two host-only artifact categories, still rejects any shared-file
hash mismatch or unexpected missing file, and records all unverified host-only
paths. Both failed checker sources are preserved. The bootstrap metadata lookup
also required the actual distribution name `pywarpx`, rather than `warpx`.
These provenance issues changed no scientific input or output.

The complete export was measured at487.6MB before sealing, below the512MiB cap.
All deterministic physical-H/full-PDF gates remain unqualified by this stochastic
study. A collision-only homogeneous reference does not test spatial transport,
self-consistent fields, electron response, boundary losses or separator yield.
No application code or deployment changed in this subtask.

The trusted safe-dev export subsequently completed successfully at
`/tmp/general3d-warpx-v17-final-export`. All164 manifest members were hashed on
the actual export, then again after copying into the canonical package; every
hash passed. Canonical membership is exactly165 regular files:164 members plus
the self-excluded manifest, with428132264 sealed member bytes. External manifest
SHA256 is `66ebff487c5350e9117122bfea8b2c92b4030f03ef8de7e304df919dff294b2f`.
This final export-verification paragraph is outside the sealed package; its
earlier `REPORT.md` copy records the completed scientific checks before export.
