# Convergence case: axisymmetric-pulse-200us-fine-dt-v10

Prospective 100/50/25 ns refinement at 4096 markers/species and 12 radial cells; same 200 us physical case, seeds and all v9 budgets. Source-interface-aligned fixed r-z faces; interfaces remain fixed throughout the run.

**Gate: UNKNOWN.** Numerical evidence only; not experimental validation.
Model 10; executed graph `8fb6f995e56e9fe0e2f80a75e0c6cabf1b042a72efb432694cd52397afc5b11a`. Eighteen whole runs, six seeds per level. Three concurrent two-seed CLI chunks were aggregated without changing the frozen solver/statistics.

Approximate pointwise 95% Student-t intervals across independent whole-run seeds; refinement differences are paired by seed. Intervals are withheld when no sampling spread is observed above floating resolution; identical finite samples cannot bound rare tails. No independent-ion confidence interval, simultaneous band or experimental validation is implied.

| Level | End A mean ± 95% half-width | End B | Maximum raw P residual | Maximum unresolved exposure |
| --- | --- | --- | --- | --- |
| rz12-N4096-dt100 | 0.728312 ± 0.00546254 | 0.608154 ± 0.00712614 | 0.000572261 | 0.244939 |
| rz12-N4096-dt50 | 0.725382 ± 0.00798852 | 0.608724 ± 0.00619936 | 0.000409411 | 0.245414 |
| rz12-N4096-dt25 | 0.724609 ± 0.00568301 | 0.607544 ± 0.00526510 | 0.000398264 | 0.244374 |

| Check | Status | Reason |
| --- | --- | --- |
| executed source identity | pass | Every supplied run must match the declared executed-source hash. |
| rz12-N4096-dt100: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| rz12-N4096-dt100: raw angular-momentum budget | pass | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| rz12-N4096-dt50: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| rz12-N4096-dt50: raw angular-momentum budget | pass | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| rz12-N4096-dt25: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| rz12-N4096-dt25: raw angular-momentum budget | pass | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| timestep: rz12-N4096-dt100 → rz12-N4096-dt50 | unknown | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| timestep: rz12-N4096-dt50 → rz12-N4096-dt25 | unknown | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| particle: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| spatial: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| alignment: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| orientation: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| effect versus numerical error | unknown | Collision-on/off differences are reported separately; this matrix does not establish a bound on continuum bias relative to the physical effect. |

All original error budgets and configurations are in the JSON. Aggregation records original-plan, part-file and code hashes, configurations, timestamps and timing semantics. Each part retains the full executed graph. The exact aggregation source is archived separately from production code.

Full evidence: `assets/convergence-axisymmetric-fine-dt-v10.json`; compact evidence: `assets/convergence-axisymmetric-fine-dt-v10.summary.json`. No optional stopping, seed removal or tolerance adjustment was used.
