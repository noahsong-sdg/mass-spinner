# Convergence case: axisymmetric-pulse-200us-joint-N-rz-v10

Prospective intended-horizon axisymmetric radial/axial locality refinement. Physical case, six seeds and all v9 budgets unchanged. N increases along the spatial path; not a fixed-N error estimate. Source-interface-aligned fixed r-z faces; interfaces remain fixed throughout the run.

**Gate: FAIL.** This is numerical evidence, not experimental validation.
Model version 10; source hash `8fb6f995e56e9fe0e2f80a75e0c6cabf1b042a72efb432694cd52397afc5b11a`; 24 whole runs; 301.8 seconds.

Predeclared seeds: 101, 202, 303, 404, 505, 606. Observable fraction budget 0.01; survivor radius/a budget 0.01; raw P-scale budget 0.001.

Approximate pointwise 95% Student-t intervals across independent whole-run seeds; refinement differences are paired by seed. Intervals are withheld when no sampling spread is observed above floating resolution; identical finite samples cannot bound rare tails. No independent-ion confidence interval, simultaneous band or experimental validation is implied.

| Level | End A, mean ± 95% half-width | End B | Max raw P residual | Max sampled unresolved exposure |
| --- | --- | --- | --- | --- |
| rz6-N1024 | 0.73096 ± 0.014329 | 0.60563 ± 0.016287 | 0.0012005 | 0.31467 |
| rz8-N2048 | 0.72713 ± 0.012985 | 0.60848 ± 0.0085279 | 0.00096351 | 0.23806 |
| rz12-N4096 | 0.72831 ± 0.0054625 | 0.60815 ± 0.0071261 | 0.00057226 | 0.24494 |
| rz12-N4096-off | 0.74658 ± 0.0055569 | 0.60547 ± 0.0083006 | 0.0000010749 | 0.24839 |

| Check | Status | Reason |
| --- | --- | --- |
| executed source identity | pass | Every supplied run must match the declared executed-source hash. |
| rz6-N1024: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| rz6-N1024: raw angular-momentum budget | fail | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| rz8-N2048: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| rz8-N2048: raw angular-momentum budget | pass | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| rz12-N4096: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| rz12-N4096: raw angular-momentum budget | pass | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| spatial: rz6-N1024 → rz8-N2048 | unknown | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| spatial: rz8-N2048 → rz12-N4096 | unknown | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| timestep: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| particle: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| alignment: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| orientation: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| effect versus numerical error | unknown | Collision-on/off differences are reported separately; this matrix does not establish a bound on continuum bias relative to the physical effect. |

Missing alignment/orientation experiments remain unknown: this solver does not implement those controls. Their omission cannot be converted into a passing numerical gate. Torque-corrected bookkeeping never repairs trajectories.

Full raw history, impacts, SI conservation scales and sampled regime records: `assets/convergence-axisymmetric-refinement-v10.json`. Compact machine-readable summary: `assets/convergence-axisymmetric-refinement-v10.summary.json`.

Exact executable import graph plus package/lock hashes are recorded; the runner refuses to publish an artifact if these files change during execution. Source identity does not imply hardware-independent bitwise reproducibility.
