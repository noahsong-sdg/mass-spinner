# Convergence case: default-pulse-200us-axisymmetric-v10

Actual 200µs pulse; axisymmetric dt/N/h studies and collision-off control. No physical settings or tolerances retuned to obtain a pass.

**Gate: FAIL.** This is numerical evidence, not experimental validation.
Model version 10; source hash `8fb6f995e56e9fe0e2f80a75e0c6cabf1b042a72efb432694cd52397afc5b11a`; 48 whole runs; 98.1 seconds.

Predeclared seeds: 101, 202, 303, 404, 505, 606. Observable fraction budget 0.01; survivor radius/a budget 0.01; raw P-scale budget 0.001.

Approximate pointwise 95% Student-t intervals across independent whole-run seeds; refinement differences are paired by seed. Intervals are withheld when no sampling spread is observed above floating resolution; identical finite samples cannot bound rare tails. No independent-ion confidence interval, simultaneous band or experimental validation is implied.

| Level | End A, mean ± 95% half-width | End B | Max raw P residual | Max sampled unresolved exposure |
| --- | --- | --- | --- | --- |
| default | 0.74479 ± 0.029637 | 0.57552 ± 0.047993 | 0.0050938 | 0.47034 |
| dt50ns | 0.73698 ± 0.056960 | 0.59505 ± 0.039970 | 0.0049221 | 0.45265 |
| dt25ns | 0.73438 ± 0.030677 | 0.60807 ± 0.046788 | 0.0052149 | 0.46171 |
| N512 | 0.72396 ± 0.011498 | 0.61979 ± 0.018681 | 0.0041553 | 0.10957 |
| N1024 | 0.72624 ± 0.026588 | 0.60954 ± 0.021256 | 0.0036510 | 0.055152 |
| h4-N304 | 0.73849 ± 0.019375 | 0.59759 ± 0.024475 | 0.0030254 | 0.36244 |
| h6-N1024 | 0.72835 ± 0.013051 | 0.60824 ± 0.023445 | 0.0013585 | 0.23596 |
| collision-off | 0.76693 ± 0.035706 | 0.60417 ± 0.035041 | 0.0000011322 | 0.47366 |

| Check | Status | Reason |
| --- | --- | --- |
| executed source identity | pass | Every supplied run must match the declared executed-source hash. |
| default: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| default: raw angular-momentum budget | fail | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| dt50ns: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| dt50ns: raw angular-momentum budget | fail | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| dt25ns: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| dt25ns: raw angular-momentum budget | fail | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| N512: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| N512: raw angular-momentum budget | fail | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| N1024: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| N1024: raw angular-momentum budget | fail | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| h4-N304: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| h4-N304: raw angular-momentum budget | fail | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| h6-N1024: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| h6-N1024: raw angular-momentum budget | fail | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| timestep: default → dt50ns | unknown | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| timestep: dt50ns → dt25ns | unknown | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| particle: default → N512 | fail | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| particle: N512 → N1024 | unknown | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| spatial: default → h4-N304 | fail | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| spatial: h4-N304 → h6-N1024 | unknown | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| alignment: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| orientation: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| effect versus numerical error | unknown | Collision-on/off differences are reported separately; this matrix does not establish a bound on continuum bias relative to the physical effect. |

Missing alignment/orientation experiments remain unknown: this solver does not implement those controls. Their omission cannot be converted into a passing numerical gate. Torque-corrected bookkeeping never repairs trajectories.

Full raw history, impacts, SI conservation scales and sampled regime records: `assets/convergence-default-200us-axisymmetric-v10.json`. Compact machine-readable summary: `assets/convergence-default-200us-axisymmetric-v10.summary.json`.

Exact executable import graph plus package/lock hashes are recorded; the runner refuses to publish an artifact if these files change during execution. Source identity does not imply hardware-independent bitwise reproducibility.
