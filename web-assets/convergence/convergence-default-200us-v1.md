# Convergence case: default-pulse-200us-fixed-v1

Actual 200µs pulse; fixed-cell dt/N/h studies and collision-off control. No physical settings retuned to obtain a pass.

**Gate: FAIL.** This is numerical evidence, not experimental validation.
Model version 9; source hash `7a92e949261c0cb257d44d660d065559f07ffeef661c747fd7d9398ec9e79227`; 48 whole runs; 74.2 seconds.

Predeclared seeds: 101, 202, 303, 404, 505, 606. Observable fraction budget 0.01; survivor radius/a budget 0.01; raw P-scale budget 0.001.

Approximate pointwise 95% Student-t intervals across independent whole-run seeds; refinement differences are paired by seed. Intervals are withheld when no sampling spread is observed above floating resolution; identical finite samples cannot bound rare tails. No independent-ion confidence interval, simultaneous band or experimental validation is implied.

| Level | End A, mean ± 95% half-width | End B | Max raw P residual | Max sampled unresolved exposure |
| --- | --- | --- | --- | --- |
| default | 0.75391 ± 0.030567 | 0.61458 ± 0.026777 | 0.017310 | 0.53394 |
| dt50ns | 0.74089 ± 0.034558 | 0.59115 ± 0.060174 | 0.018313 | 0.51840 |
| dt25ns | 0.72917 ± 0.018455 | 0.61458 ± 0.030087 | 0.025275 | 0.50132 |
| N512 | 0.72982 ± 0.018500 | 0.60254 ± 0.013704 | 0.020216 | 0.17632 |
| N1024 | 0.72673 ± 0.014672 | 0.60628 ± 0.013618 | 0.017523 | 0.091398 |
| h4-N304 | 0.74397 ± 0.029407 | 0.60526 ± 0.025741 | 0.013553 | 0.36826 |
| h6-N1024 | 0.72900 ± 0.0088813 | 0.60482 ± 0.017747 | 0.0096317 | 0.37621 |
| collision-off | 0.76693 ± 0.035706 | 0.60417 ± 0.035041 | 0.0000011322 | 0.52016 |

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
| particle: default → N512 | unknown | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| particle: N512 → N1024 | unknown | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| spatial: default → h4-N304 | unknown | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| spatial: h4-N304 → h6-N1024 | fail | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| alignment: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| orientation: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| effect versus numerical error | unknown | Collision-on/off differences are reported separately; this matrix does not establish a bound on continuum bias relative to the physical effect. |

Missing alignment/orientation experiments remain unknown: this solver does not implement those controls. Their omission cannot be converted into a passing numerical gate. Torque-corrected bookkeeping never repairs trajectories.

Full raw history, impacts, SI conservation scales and sampled regime records: `assets/convergence-default-200us-v1.json`. Compact machine-readable summary: `assets/convergence-default-200us-v1.summary.json`.

Exact executable import graph plus package/lock hashes are recorded; the runner refuses to publish an artifact if these files change during execution. Source identity does not imply hardware-independent bitwise reproducibility.
