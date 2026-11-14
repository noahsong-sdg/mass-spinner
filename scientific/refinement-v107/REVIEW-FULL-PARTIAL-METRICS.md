# V107 partial full-clock and initial-clock review

The supplemental diagnostic establishes a blocker to passing the unchanged full
matrix: the initial-clock axial density and temperature differences do not
strictly contract. It does **not** establish a finite-time flow failure or finish
the full numerical qualification. No thresholds, producer inputs, saved states,
or original failures were changed.

## Evidence and independence

Reviewed `retained/full-partial-evidence-20261113/` through trusted file, JSON,
gzip, hash, and arithmetic readers only. I did not run project code, Python,
tests, or a VM. I authored `stable107.py` and the supplemental diagnostic, so
this is an artifact/provenance review by their author, not an independent
implementation of their numerical norm.

All **277** exported payload hashes match `export-inventory.json` (82,474,219
payload bytes). The following actual artifact seals match:

| Artifact | SHA256 |
| --- | --- |
| Diagnostic JSON | `7bd41151c8d843acd238af9c64f92652c0b6696612409d0ff11fa967e93e773d` |
| Diagnostic driver | `8dd80a3eae3dcb2e429e5c11a92b7a331da5f8911ce693a730a019dca604739d` |
| Frozen checker transfer | `993dc1e78b42aefa79c8261f6b335115ad4476ed06a5f8304a0a214e6a4e6836` |
| Frozen producer transfer | `31d24d7550a869e830e561c5276270b8daedeb8b948da30c54107cb801997cef` |
| Full r8z2 CFL 0.1 prediction | `05b1dd693327557767ae4bc8f14211d874323acc53dac343e254849626ac476f` |

The execution receipt records exit **0**, 6.829544045 s, the expected driver and
checker seals, and the matching diagnostic log hash. The diagnostic reports
6.772704337 s and 273,608 KiB peak RSS. The reviewed transport checks every
frozen checker source before and after execution. Diagnostic and both admitted
saved packets have exactly equal producer-source inventories, physical manifests,
and scenarios. The norm implementation seal remains
`5b54757cb1fc08eeffd70a0b62167cafb149fe4b101057e5c5bd4b3f54c9708b`.

## Actual initial-clock results

The unchanged initializer generated r8z1 (160 radial × 24 axial cells), using
`campaign105.CoupledFlow` and `heat106.FVDiffusion`. Its archive contains only
clock **0** and an empty evolution history. Its compressed and decompressed
hashes match the receipt. The driver does not call `evolve` or `advance`; the
initializer still performs the production steady-torsion solve.

The two saved comparison states are the full r8z2 CFL 0.1 trajectory and the
pinned r8z4 preflight. The actual order-2 relative norms are:

| Observable | r8z1 → r8z2 | r8z2 → r8z4 | Strict contraction |
| --- | ---: | ---: | --- |
| Density | `3.1657282912882755e-17` | `3.201790156772644e-17` | **FAIL** |
| Temperature | `1.168507693378509e-16` | `1.1776439379494985e-16` | **FAIL** |
| Angular speed | `0.013339343292115443` | `0.0032107479831615746` | PASS |

Density/temperature increments and both meridional velocities have exactly zero
initial difference and pass the existing zero/zero contraction predicate. Of
**42** diagnostic gates, **40 pass and 2 fail**. The spatial limit is still
**0.05**. Contraction still requires `fine < coarse`, or both exactly zero.
All **28** order-2/order-3 integral checks pass the unchanged **1e-10** limit;
their largest relative spread is `3.1794781346233884e-15`. Direct arithmetic
reproduces each reported nonzero scalar/angular norm from its error and reference
integrals.

The full r8z2 initial snapshot is identical to the earlier radial r8z2 initial
snapshot after canonical JSON serialization (SHA256
`27ffd23f94a5e3727dd486ef9708833802dca8ad36c01f4802ba5f9075371dab`).
Every order-2 and order-3 r8z2→r8z4 metric object equals the earlier finest
preflight record exactly. These differences were not introduced by running the
longer trajectory or changing the metric.

## Meaning and remaining scope

Static source tracing explains the initial scalar differences: the prescribed
density and temperature depend only on radial position, while their conserved
encoding and primitive recovery use axial-cell volume and floating-point
energy addition/subtraction. These operations leave mesh-dependent rounding
differences. The stable norm accurately retains those differences; they are not
the former separately rounded interpolant-subtraction artifact.

For the unchanged initializer and checker, this is a **structural initial-clock
blocker**: extending trajectories or refining their later time steps cannot
change their saved initial states. A production full r8z1 run would use the same
initializer and geometry; the progress wrapper changes only subsequent advance
logging. That execution-path inference is separate from the actually observed
supplemental gate failures. Tiny physical magnitude does not turn a failed
declared contraction test into a pass.

The export contains three completed full-clock packets: r4z2 CFL 0.1, r8z2 CFL
0.2, and r8z2 CFL 0.1. The latter has clocks **0/1/2/4 μs**, 9,937 accepted
steps, and matching packed/raw field seals. This review did not replay their
finite-time ledgers or score a complete three-level finite-time comparison.
Six of the nine declared full jobs are absent from this export; completed jobs
are not a full-matrix audit. Finite-time radial, temporal, joint, and axial
qualification therefore remains unestablished. No experimental or live-model
accuracy approval follows from this diagnostic.
