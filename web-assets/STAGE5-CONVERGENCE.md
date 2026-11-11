# Stage 5: reproducible numerical convergence workbench

Implemented 6 November 2026 for Mass Spinner model version 9. **The workbench is implemented; the collisional transport convergence gate remains open.** Experimental validation is a separate stage and is not manufactured by this tool.

## Traced problem and implementation

The actual path is controls → `DoublewellConfig` → `simulateDoublewell` → complete per-run history, destination counts, signed physical H/P budgets, pair/locality statistics and sampled local regime → plots/exports. The previous path had no reproducible multi-resolution case artifact or independent-whole-run uncertainty. A single attractive trajectory, small corrected ledger or seed-fixed collector count could not establish the intended observable's accuracy.

`src/convergence.ts` now extracts physical observations, aggregates independent whole-run seeds and compares declared numerical levels. `scripts/run-convergence.ts` executes a sequential offline CPU case, records its exact source graph and dependency manifests, and writes full and compact machine-readable results plus Markdown. No browser/backend dependency or cloud compute service is involved. No solver limits were silently removed.

Run from the project root under the existing scoped host exception:

```sh
./node_modules/.bin/tsx scripts/run-convergence.ts
./node_modules/.bin/tsx scripts/run-convergence.ts --plan /absolute/case.json --output assets/convergence-custom.json
```

For future isolated execution, use the project's documented safe-dev workflow and explicitly sync the host snapshot before running; source is copied, not mounted. Do not infer that this host run happened inside a VM.

## Default declared case

- Same physical **200 µs** pulse, fields, density, temperatures, species and source geometry as `DEFAULT_DOUBLEWELL`.
- Six independently chosen run seeds: **101, 202, 303, 404, 505, 606**. Seeds are paired between numerical levels to retain common-source covariance; different seed pairs are the independent samples.
- Timestep levels: 100, 50 and 25 ns at 128 representatives/species, three cells across.
- Particle levels: 128, 512 and 1024 representatives/species at fixed grid/timestep.
- Spatial levels: 3/128, 4/304 and 6/1024 cells-across/representatives-per-species. This approximately preserves volume occupancy as resolution increases. Axial-cell rounding makes the exact occupancy differ; base cell geometry and full-column occupancy estimates are recorded per run. Fine sparse grids are not labelled resolved merely for having more cells.
- A collision-off control changes **only** the collision enable switch.

These are **48 whole runs**. Before execution, the case declares educational budgets of 0.01 on destination/CDF fractions, 0.01 on survivor radius/a, 0.1 eV on survivor temperature, 0.02 on impact-time/duration, and 0.001 on species angular transfer relative to the positive P scale. The chosen maximum raw-P residual budget is 0.001 and sampled unresolved-exposure budget 0.01. These are chosen engineering/learning targets, not universal plasma-physics standards.

## Artifacts and observables

Default outputs:

- `assets/convergence-default-200us-v1.json`: full per-seed raw histories, species impacts, physical conservation scales/fluxes, collision/locality diagnostics, sampled regime and radial density.
- `assets/convergence-default-200us-v1.summary.json`: source identity, declared case, resource/timing metadata, per-seed observations, ensemble statistics and acceptance checks, with large raw arrays removed.
- `assets/convergence-default-200us-v1.md`: inspectable level/check table.
- `assets/convergence-run-v1.log`: execution log.

Schema version 1 and model version 9 are separate. `sourceHash` identifies the actual imported solver/statistics/runner files plus package/lock manifests; `sourceFiles` lists each hash. Node, OS, architecture, CPU, memory, timing, full config/seeds and approximate particle-step cost are recorded. The runner checks its executed source graph again after the matrix and refuses to publish a mixed-snapshot artifact. This does not promise cross-hardware bitwise reproducibility.

Observations include all four destination fractions, unconditional survivor radial CDFs, conditional survivor radius/temperature, species canonical-angular-momentum transfer including exit flux, and impact-time quantiles. Mean **impact Hamiltonian** is retained as `impactHamiltonianEV`: the engine's signed `energyJ` is K+qφ, not deposited wall heat. Empty conditional populations stay undefined. Raw SI values remain available; normalized values do not replace physical scales.

Unresolved exposure is a trapezoidal, active-representative-time-weighted average of sampled local unresolved fractions. After all particles exit, undefined local estimates add no active exposure. It is not a proof of applicability between samples. Unpaired exposure and raw torque remain distinct diagnostics.

## Statistical and acceptance semantics

The displayed intervals are **approximate pointwise 95% Student-t intervals over whole-run seed outputs**, assuming run means/differences are sufficiently approximately normal. They are not independent-ion intervals and are not simultaneous confidence bands across all plots. Six seeds provide limited information about non-Gaussian tails. No convergence gate should be used as a calibrated rare-event guarantee.

Refinement comparisons use paired seed differences. A pass requires the entire estimated difference interval inside the predeclared tolerance; a fail means the interval lies outside; overlap/insufficient samples are unknown. If finite samples show no variation above relative floating resolution, the interval is withheld. Identical finite outlet counts cannot establish absence of an unseen tail. Point means and descriptive standard errors remain available.

Independent review caught and corrected several false-acceptance paths:

1. **Ignored controls.** The engine does not implement grid translation or initial orientation controls. Accepting those arbitrary JSON fields would compare identical paths and certify a sensitivity experiment that never ran. Such comparison kinds are now rejected; required alignment/orientation coverage remains explicitly unknown. This is better than inventing controls that the engine ignores.
2. **Stale results.** A supplied result with another level's density, seed/config or source identity could otherwise contribute to a passing comparison. Exact declared settings and expected source hash are checked; stale, failed, missing and duplicate runs are excluded and fail batch completeness. No partial batch is certified.
3. **Fake refinements/effects.** Two names for identical numerical settings are rejected. Timestep/particle/spatial levels must actually refine their advertised parameter. A collision-on/off effect must have opposite switches and otherwise identical settings/horizon. This prevents relabelling a different physical experiment as numerical improvement.
4. **Unobserved variance.** Zero empirical seed spread cannot support a zero-width uncertainty claim. Withholding its interval is the conservative local correction; no pseudocount or independent-ion assumption is introduced.

Raw angular-momentum error is checked against the declared budget. The torque-corrected ledger never supplies a transport pass. Outside-supported-domain states fail the applicability check; excessive sparse exposure remains unknown. Missing alignment/orientation experiments and an unbounded continuum-error/physical-effect comparison keep the overall gate open even if selected timestep observables agree.

## Verification

New targeted tests cover Student-t reference values, pass/fail/unknown equivalence, independent paired-run statistics, missing/failed/duplicate/stale batches, forbidden physical changes, undefined all-exited observables and real production source/flux behavior. Independent review adds its own regressions in `tests/review-stage56.test.ts`.

The initial targeted run found a test-fixture error: it assumed every sampled cell in a small ballistic control was sparse. The production diagnostics correctly showed partial sparse exposure, so the test now checks positive partial exposure and undefined final all-exited estimates. No solver tolerance or assertion of physical accuracy was weakened to obtain a pass.

Executed targeted commands: `./node_modules/.bin/tsx --test tests/convergence.test.ts tests/review-stage56.test.ts` and strict standalone `tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext src/convergence.ts`. Required full repository checks and publication are the parent integration gate. See the generated case report for actual numerical results and failures; this implementation document does not promote a successful matrix execution into continuum validation.

## Executed numerical evidence

The declared default matrix completed **48/48 runs in 74.2 s**, with source/dependency identities unchanged before/after. Exact source hash: `7a92e949261c0cb257d44d660d065559f07ffeef661c747fd7d9398ec9e79227`. **Overall gate: FAIL.** No physical input or tolerance was retuned after seeing the result.

| Level | Maximum raw P residual / positive scale | Maximum sampled unresolved active-time exposure |
| --- | ---: | ---: |
| Default 3 cells / 128 markers/species | 0.017310 | 0.53394 |
| 50 ns timestep | 0.018313 | 0.51840 |
| 25 ns timestep | 0.025275 | 0.50132 |
| 512 markers/species at fixed grid | 0.020216 | 0.17632 |
| 1024 markers/species at fixed grid | 0.017523 | 0.091398 |
| 4 cells / 304 markers/species | 0.013553 | 0.36826 |
| 6 cells / 1024 markers/species | 0.0096317 | 0.37621 |
| Collision-off default control | 0.0000011322 | 0.52016 (not a collision-applicability gate) |

Even the finest spatial level exceeds the chosen raw-P budget 0.001, and local kinetic estimates remain sparsely sampled. Increasing markers at fixed cells improves sampling but does not resolve spatial bias; shrinking cells approximately preserves occupancy while retaining substantial sparse exposure.

At the coarse default the mean end fractions are A=0.75391 ± 0.03057 and B=0.61458 ± 0.02678 (approximate pointwise whole-run 95% half-widths). Paired collision-on minus off changes are A=−0.01302 ± 0.02627 and B=+0.01042 ± 0.01845; both intervals include zero. This six-seed calculation therefore does not cleanly distinguish those outlet collision effects from stochastic variability. It does not imply that all species separation is absent.

The 4-cell→6-cell species-B angular-transfer change is −0.003727 ± 0.002477 of the positive P scale, failing its chosen 0.001 **pointwise** criterion. This is not a simultaneous confidence statement over every reported observable. All other refinement families remain unknown at the declared joint observable budgets; missing alignment/orientation experiments and the continuum-error/effect bound remain explicitly unknown.

A separately declared controlled zero-field, collisionless all-exited pulse completed **18/18 runs** through `--plan assets/convergence-ballistic-case-v1.json --output assets/convergence-ballistic-v1.json`. It preserves signed fluxes and undefined survivor observables. Its matrix gate remains **UNKNOWN**, correctly withholding rare-tail intervals and missing spatial/particle/other coverage rather than turning deterministic finite output into a general transport certificate. The independent production regression also checks its physical flux identities.

Full default raw output is 26,225,594 bytes; the compact summary is 410,514 bytes. Keep the raw file local or intentionally compress/split it: [Cloudflare's current individual static-asset limit is 25 MiB](https://developers.cloudflare.com/workers/platform/limits/). The compact summary and Markdown are suitable publication artifacts. Successful CLI publication of these files would still not verify browser/GPU behavior.
