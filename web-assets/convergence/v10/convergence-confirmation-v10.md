# Convergence case: axisymmetric-pulse-200us-fresh-confirmation-v10

Prospectively fixed 16 fresh whole-run seeds1001–1016; source-fitted fixed annular r-z c8/N2048 versus c12/N4096 and matched c12 collision-off. Physical case200us,dt100ns and original budgets unchanged. All48runs mandatory; no optional stopping or post-hoc pooling with exploratory seeds.

**Gate: FAIL.** Numerical evidence only; not experimental validation.
Model 10; executed graph `8fb6f995e56e9fe0e2f80a75e0c6cabf1b042a72efb432694cd52397afc5b11a`. Forty-eight whole runs, sixteen fresh seeds per level. Four concurrent four-seed CLI chunks were aggregated without changing the frozen solver/statistics.

Approximate pointwise 95% Student-t intervals across independent whole-run seeds; refinement differences are paired by seed. Intervals are withheld when no sampling spread is observed above floating resolution; identical finite samples cannot bound rare tails. No independent-ion confidence interval, simultaneous band or experimental validation is implied.

| Level | End A mean ± 95% half-width | End B | Maximum raw P residual | Maximum unresolved exposure |
| --- | --- | --- | --- | --- |
| rz8-N2048 | 0.723419 ± 0.00480416 | 0.603394 ± 0.00462957 | 0.00114941 | 0.243671 |
| rz12-N4096 | 0.722427 ± 0.00323214 | 0.608490 ± 0.00293172 | 0.000467367 | 0.247322 |
| rz12-N4096-off | 0.742508 ± 0.00263107 | 0.605774 ± 0.00357461 | 0.00000109197 | 0.242720 |

| Check | Status | Reason |
| --- | --- | --- |
| executed source identity | pass | Every supplied run must match the declared executed-source hash. |
| rz8-N2048: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| rz8-N2048: raw angular-momentum budget | fail | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| rz12-N4096: sampled local coverage | unknown | Local representative coverage is absent or exceeds the declared unresolved-exposure budget. |
| rz12-N4096: raw angular-momentum budget | pass | Maximum raw residual is compared with the declared positive-scale diagnostic budget, not the torque-corrected ledger. |
| spatial: rz8-N2048 → rz12-N4096 | unknown | Paired whole-run seed difference intervals must lie entirely within predeclared observable budgets. Undefined populations remain unknown. |
| timestep: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| particle: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| alignment: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| orientation: required coverage | unknown | This case has not supplied this independent refinement/sensitivity comparison. |
| effect versus numerical error | unknown | Collision-on/off differences are reported separately; this matrix does not establish a bound on continuum bias relative to the physical effect. |

All original error budgets and configurations are in the JSON. Aggregation records original-plan, part-file and code hashes, configurations, timestamps and timing semantics. Each part retains the full executed graph. The exact aggregation source is archived separately from production code.

Full evidence: `assets/convergence-confirmation-v10.json`; compact evidence: `assets/convergence-confirmation-v10.summary.json`. No optional stopping, seed removal or tolerance adjustment was used.
