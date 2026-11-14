# Independent thermal review

**Verdict:** the isolated heat-method correction has supporting runtime
evidence. The coupled research model remains numerically unqualified and
experimentally unvalidated. This is not an all-clear.

## Evidence checked

Read `retained/evidence-20261113/{v106-red01,v106-candidate02,v106-cross01}`:
execution records, source/transfer manifests, control logs, saved-study audit,
summary and directional-comparison output. Trusted host SHA-256 checks match
the four heat/method/coupled/extraction logs to their execution records, all
five compressed field packets to the prediction manifest, and the current
heat implementation, base hook and independent tests to transferred sources.
The prediction packet hashes to
`96098e86f874d1d5f65317a882a5f14df75685afc06ecc8a98cbd7a76e48a7b4`.
I did not rerun project code or independently recompute the saved-field audit.

The retained old-method run executes four test methods and fails the two
axial-separability subcases: 0.653856 K spread on uniform axial cells and
1.995961 K on graded cells after 1 µs. The other three methods pass.
The candidate passes all four heat controls, both method controls and both
coupled controls. Its corresponding axial spreads are 9.09e-13 and 2.27e-12 K.
The base-hook extraction control reports three byte-identical legacy steps.

Independent annular-average Bessel-mode increment errors decrease from
1.8976% to 0.4802%, 0.1236%, and 0.03430% under joint spatial refinement.
The 4/8/16/32-step temporal errors are 6.6156%, 3.4753%, 1.7896%, and 0.9148%.
These are isolated analytic controls, not experimental calibration.

## Physics and execution-path assessment

The base hook remains after mechanical redistribution and before the thermal
energy update. The candidate receives current post-mechanical thermal energy
`E` and mixture capacity `C = 1.5*k_B*(M1/m1 + M2/m2)`. It resets `T_old=E/C`
on every call and uses current `C/physical_volume`, without old-capacity history.
The reused-versus-fresh mixed-mass control exercises changed incoming energy,
density and species; no stale temperature/capacity is supported by that test.

FiPy's per-radian cylindrical volumes match physical FV volumes divided by
`2*pi`; radial-fast cell ordering is checked. Positive scalar conductivity
and native zero-flux faces give conservative cell heat transport without
massless thermal boundary nodes. Energy changes by `C*T_new-E`; electromagnetic
and viscous heating are not added again. FV-cell temperature traces and the
actual linear residual in joules are explicitly identified in receipts.
The inherited `thermal_stiffness` is inactive and is not a candidate heat-flux
oracle; audits must use the active FiPy operator or independent references.

The checked `sum(C*ln(T))` increase applies to each isolated heat substep with
its mass/species fixed. It does not establish a full plasma entropy law.
Walls remain adiabatic; this method adds neither wall heat exchange nor a
temperature-dependent plasma conductivity closure.

## Retained failures and limits

The unchanged five-case audit retains six failures against its 5% spatial gate:

| Clock | Density-increment discrepancy | Radial-velocity discrepancy |
|---|---:|---:|
| 1 µs | 20.7323% | 7.0647% |
| 2 µs | 22.1807% | 9.2097% |
| 4 µs | 23.4212% | 9.6381% |

These are original n2-to-n4 discrete comparison norms, not continuum errors.
Radial velocity uses the original combined meridional reference norm.
The original timestep, contraction and inventory/charge gates pass. The
directional 1 µs diagnostic remains supplemental: radial-only density
discrepancies are about 20.3%, axial-only about 2.93–2.95%; it does not replace
the failed qualification matrix or prove a unique remaining cause.
Optical comparisons retain zero complete matches among 288 alternatives.
`REGIME-REVIEW.md` is outside this verdict: its manual scale estimates and
primary-equation verification remain pending, not qualification evidence.
