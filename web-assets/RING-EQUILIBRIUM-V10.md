# Independent intended-horizon closed-equilibrium falsification

7 November 2026 UTC. This is a bounded **stationary-equilibrium check**, not validation of arbitrary expanding pulses, non-equilibrium Landau distributions, extraction purity or real machinery. Its distinct source snapshot is recorded in the artifact. No existing production file was edited by this reviewer.

## Predeclared case and criteria

The physical configuration is the existing `common-Omega closed equilibrium` test in `tests/doublewell-dynamics.test.ts`, extended from 20 to **200 microseconds**: 40/84-u singly charged species, equal inventories, total volume-mean density `1e18 m^-3`, common ion temperature 10 eV, imposed electron temperature 5 eV, supplied Coulomb logarithm 10, common rotation `-12000 rad/s`, B=0.02 T, potential coefficient 2 V, quadratic shape 1.2, radius 0.2 m and length 0.6 m. Closed boundaries mean specular radial reflection and periodic axial wrapping; no continuous source or collectors.

Axisymmetric **uniform** ring grids are used; pulse fitting is disabled. The three levels are 6 radial cells / 1024 markers per species, 12 radial cells / 4096 markers per species, and the latter with collisions switched off. All use dt=100 ns, 200 microseconds, and independent whole-run seeds **713, 1427, 2857, 5717, 11447, 22897**: 18 executions total. The refined comparison jointly changes radial/axial cells and marker count; it is not an independent separation of their errors.

Criteria were encoded before the final execution:

- Every history sample retains exactly the injected species inventories; zero wall/end/source counts, impacts and exit fluxes.
- Each run's maximum recorded raw P-theta residual is at most **0.001** of its positive initial scale; maximum H residual at most **1e-5**.
- Whole-run mean initial-to-final residual-temperature changes must have an approximate pointwise 95% Student-t interval entirely inside **+/-0.1 eV**.
- Whole-run mean initial-to-final fitted-rotation changes divided by `abs(Omega)` must have their interval inside **+/-0.01**.
- For each species and interior radial-histogram edge, the mean final CDF minus theory, and final minus reconstructed initial CDF, must have intervals entirely inside **+/-0.01**. The outer endpoint is handled by the exact inventory invariant, not a spurious zero-width sampling interval.

These are selected educational engineering budgets, not literature standards. Six independent whole runs supply df=5 intervals; collisions correlate ions within a run. Intervals are pointwise, not simultaneous CDF bands. Empirically identical outcomes withhold uncertainty bounds. Undefined collision-off pair distances are null, not zero locality. A code test passing, a small corrected ledger or the intended stationary solution does not override failed or unresolved criteria.

## Independent expected radial distribution

The reference uses direct midpoint quadrature in `u=r^2/a^2`, where the cylindrical Jacobian is constant, for each species:

```
w_s(u) = exp({-Z_s V (u^2-kappa u)
           + [m_s Omega^2 + Z_s e Omega B] a^2 u/(2e)} / Ti).
F_s(r) = integral_0^((r/a)^2) w_s(u) du / integral_0^1 w_s(u) du.
```

The script does not call the production equilibrium initializer or orbit/potential helpers for this expectation. Both 40000- and 80000-point midpoint quadratures are evaluated, with a predeclared maximum CDF difference of 1e-8 before any physics run starts. Independent expected total-density-squared integral is also calculated; the declared density is a volume mean, so this shaped equilibrium's density-squared ratio is not generally one.

The engine exports a final histogram but not its initial particle list/histogram. Initial CDFs are therefore reconstructed from each seed's radial uniform variates and independent 80000-point theoretical CDF thresholds, consuming the known nine initialization draws per marker. This is labeled reconstruction, not an observed initial-histogram export. The production initializer uses a 4096-point piecewise-linear-weight quadrature, so threshold-borderline initial counts could differ. Both final-to-theory and reconstructed-change comparisons are retained; no exact initial-CDF claim is made.

## Execution and provenance

```
./node_modules/.bin/tsx scripts/check-ring-equilibrium-v10.ts > assets/ring-equilibrium-v10.log 2>&1
```

The runner captures its full local import graph, package manifests and its own script before execution; it refuses to write mixed-snapshot evidence if any executed file changes. Output is exclusive-create `assets/ring-equilibrium-v10.json`, with physical configurations, all seeds, raw moment histories, local-regime histories, conservation scales/ledgers, actual mesh, pair distances, density moments and whole-run summaries. Whole-run paired differences compare coarse/fine and collision-off/on levels without interpreting different N as identical source realizations.

An incomplete preliminary execution was stopped to correct only the new runner's no-pair metadata: the collision-off case initially would have used zero as a placeholder RMS pair distance. The completed execution uses null and withholds its interval. Criteria, physics and production files were unchanged; the incomplete log remains separately named `assets/ring-equilibrium-v10-incomplete-pilot.log` and is not used as the final campaign.

## Actual result: UNKNOWN, with improved angular locality

All **18 runs completed**, runner exit 0, in **480.69 seconds** on the shared host while another matrix ran. All **12 captured source hashes** matched after execution and again during independent extraction. Executed source identity:

`f7e78bd6545561606b79cf37675981c3a3233f76ef5c622c77fb2ebf4c389522`.

**Overall gate: UNKNOWN.** None of the predeclared checks conclusively fails, but this is not a pass: several intervals are too wide to establish the requested equivalence. Per-level counts are 24 pass / 59 unknown at c6-N1024, 53 pass / 30 unknown at c12-N4096, and 60 pass / 23 unknown for the matched collisionless control. There are 83 pointwise/invariant checks per level; these counts are not independent probabilities or simultaneous confidence levels.

The table gives means and approximate pointwise 95% half-widths across six whole runs. P-theta percentages divide by each run's positive normalization scale; they do not describe percentage separator error or percentage of signed net angular momentum. Rotation changes divide by the absolute imposed common Omega.

| Case | Mean maximum raw P-theta, % | Delta T A, eV | Delta T B, eV | Delta rotation A, % | Delta rotation B, % |
| --- | ---: | ---: | ---: | ---: | ---: |
| c6-N1024 | 0.04839 +/- 0.00951 | +0.00545 +/- 0.12800 | -0.00459 +/- 0.14323 | +0.806 +/- 5.804 | -0.512 +/- 2.634 |
| c12-N4096 | 0.02084 +/- 0.00973 | -0.02951 +/- 0.08143 | +0.02972 +/- 0.08860 | -1.792 +/- 2.939 | +0.674 +/- 1.201 |
| c12-N4096 off | 7.87e-8 +/- 2.14e-8 | +0.00055 +/- 0.00808 | +0.00413 +/- 0.00458 | -0.0076 +/- 0.8675 | -0.0440 +/- 0.0426 |

Every run remains below the 0.1% raw-P budget: coarse maximum **0.06352%**, refined maximum **0.03001%**, and collisionless maximum **1.037e-9** as a fraction of positive scale. The paired coarse-to-fine mean raw-P change is **-0.02755 +/- 0.01005 percentage points**. Mean meridional pair distance decreases **19.164 -> 9.611 mm**, and mean radial pair distance **13.490 -> 6.789 mm**. This shows actual geometric locality improvement alongside smaller raw torque; it does not alone bound transport bias.

All closed inventories remain exactly intact with zero impacts and exit fluxes. The largest recorded H residual is **1.946e-8** among coarse runs, **9.327e-9** among refined runs and **8.779e-9** in the collisionless control. Corrected P residuals remain separate bookkeeping diagnostics; they do not replace the raw-P criterion.

At the refined collision-on level, mean residual temperatures change from **10.00041 to 9.97090 eV** for A and **10.01884 to 10.04855 eV** for B. Their mean changes are small, but the complete intervals extend slightly outside +/-0.1 eV. Both species' rotation-change intervals include zero and extend beyond the selected 1% target. Thus no resolved systematic temperature or rotation defect is demonstrated, and equivalence at those budgets is also not established. The matched collisionless temperature and rotation checks pass their budgets.

### Radial distribution and density

The 40000-to-80000 midpoint-quadrature maximum CDF change is **6.07e-13**, comfortably below the declared 1e-8 resolution target. Pooled final-CDF maximum discrepancies from independently integrated theory are:

| Case | A | B |
| --- | ---: | ---: |
| c6-N1024 | 0.009405 | 0.009193 |
| c12-N4096 | 0.008454 | 0.002236 |
| c12-N4096 off | 0.002533 | 0.006136 |

These point estimates are below 0.01, but several complete pointwise CDF intervals still extend beyond +/-0.01, including in the collisionless control. A pooled discrepancy or an interval containing zero cannot be substituted for the predeclared equivalence criterion. Mean per-run maximum CDF errors are different quantities and remain exported separately.

An additional independent arithmetic cross-check of the production initializer's 4096-point piecewise-linear-weight CDF gives at most **1.55e-10** A and **9.42e-11** B difference from the 80000-point midpoint thresholds at these histogram edges. The minimum regenerated source-uniform threshold margin across all final campaign runs is **3.86e-8**, substantially larger. No initial-bin ambiguity is indicated for these seeds at the checked numerical discrepancy; the artifact still labels initial CDFs reconstructed, not direct particle exports.

The independently expected continuum density-squared ratio is **1.005412**. The refined self-excluded histogram ratios are **1.006953 +/- 0.004304** initially and **1.008141 +/- 0.002131** finally. These are diagnostics, not a full collision-rate or distribution proof; ring averaging and finite occupancy remain.

Every recorded local-regime snapshot is labeled unresolved in all three levels. This does **not** mean every representative is unresolved. Trapezoidal time-averages of the recorded unresolved representative fraction are **6.540 +/- 0.191%** at c6-N1024, **6.301 +/- 0.066%** at c12-N4096, and **6.292 +/- 0.087%** in its collisionless control. These are sampled exposure estimates; unrecorded times are not bounded. A few sparse ring cells suffice to keep a complete snapshot unresolved.

### Checks, limitations and interpretation

The complete runtime command above exited 0; all source hashes and exact closed inventories were independently rechecked from its artifact. No thresholds, source inputs, sample exclusions or collision rates were changed after looking at the final results. The incomplete preliminary log does not contribute to these statistics.

A standalone strict utility-script typecheck was also attempted:

```
./node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict scripts/check-ring-equilibrium-v10.ts
```

It did **not** pass: this repository lacks Node type declarations, and strict checking of this offline runner also flags its inferred runs-array type and nullable metric extraction. The runtime campaign completed, but a standalone strict script-typecheck pass is not claimed. The repository's configured typecheck covers `src/**/*.ts`; the parent owns that required final gate and the full suite/build. The executed runner remains unchanged so its source identity stays reproducible.

The evidence supports a smaller spatial angular defect for this bounded closed equilibrium and rejects a simplistic claim that six seeds establish 1%-rotation/0.1-eV/CDF equivalence. Required next evidence includes tighter whole-run uncertainty, independent timestep and spatial/particle refinements, resolved local occupancy and non-equilibrium distribution benchmarks. These closed results do not repair the original open-pulse convergence gate or establish experimental accuracy.
