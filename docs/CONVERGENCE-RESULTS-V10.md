# Independent convergence results for the version-10 collision changes

7 November 2026 UTC. **The candidate substantially reduces the measured raw angular-momentum defect and resolves several refinement observables. Full intended-horizon convergence remains unestablished.** The legacy fixed method remains unchanged. No result here establishes experimental machine accuracy.

## Scope, execution and provenance

This reviewer audited the existing convergence path before implementation, wrote the prospective plan in `CONVERGENCE-PLAN-V10.md`, added four CLI/provenance regressions, ran the uniform/source-fitted/higher-resolution/fine-dt studies, and independently re-evaluated the artifacts in Python. The parent ran the fixed replay; another agent ran the fresh-seed confirmation and independently reviewed the temporary fine-dt aggregator.

All six open-pulse campaigns use the same frozen executed graph:

`8fb6f995e56e9fe0e2f80a75e0c6cabf1b042a72efb432694cd52397afc5b11a`

All **13 executable/dependency source hashes** match the final audited files. The physical case remains the original **200 µs** pulse: chamber a=0.2 m/L=0.6 m, B=0.06 T, V=20 V, quadratic shape 1.2, density 1e18 m⁻³, Ti=Te=5 eV, logΛ=10, 40+/84+ ions, source radius 0.08 m/length 0.15 m, zero-canonical rotation and 5 eV axial beam, open absorption. No density, source, species or horizon was retuned to obtain a passing result.

Original budgets are unchanged: fractions/CDFs 0.01, mean radius/a 0.01, survivor temperature 0.1 eV, impact-time/duration 0.02, species angular transfer 0.001, maximum sampled raw Pθ residual 0.001, and sampled unresolved exposure 0.01. These are declared educational engineering budgets, not universal physical standards.

| Campaign | Actual executed runs | Whole-run seed units per level | Recorded gate |
| --- | ---: | --- | --- |
| Fixed Cartesian replay | 48 | 101,202,303,404,505,606 | FAIL |
| Uniform annular r–z | 48 | Same six | FAIL |
| Fixed source-fitted annular r–z | 48 | Same six | FAIL |
| Source-fitted c6/1024 → c8/2048 → c12/4096 plus finest collision-off | 24 | Same six | FAIL |
| Source-fitted c12/4096, dt100/50/25 ns | 18 | Same six | UNKNOWN |
| Fresh c8/2048 → c12/4096 plus finest collision-off | 48 | 1001–1016, declared before execution | FAIL |

That is **234 actual open-pulse executions**, not 234 independent confidence samples. Some configuration/seed combinations repeat across campaigns and reproduce identical trajectories; they are never pooled to increase n. Inference uses six or sixteen independent whole-run seed units within the specified comparison. A separate closed-equilibrium campaign is reported by its owner and is not included in these 234.

The fine-dt study ran in three concurrent two-seed CLI chunks, then aggregated all 18 original level/seed observations with the frozen `summarizeConvergence`. Its **451.747 s** aggregate wall span differs from **1351.238 s** summed chunk wall times; neither sum is measured CPU time. Every part SHA/config/seed/source identity, original plan hash, aggregation-code hash and timing interpretation is retained. All eighteen planned runs completed; no optional stopping occurred. The fresh confirmation used four four-seed chunks under the same preservation rules.

## Root causes and the bounded changes

### Nonlocal collision impulses, rather than an orbit-timestep defect

The old Cartesian method kicks ions at different positions and mixes azimuthal flow directions within a box. The resulting physical angular impulse is `(xA−xB)Δpy−(yA−yB)Δpx`. Exact pair kinetic energy and linear momentum do not conserve the point-pair angular momentum. Shrinking dt did not cure this: the old default's maximum raw-P residual rises from **1.731% at 100 ns to 2.527% at 25 ns**, while the collision-off control remains near **0.000113%** of the same positive scale. Increasing N at a fixed coarse grid also leaves the systematic spatial approximation.

In plain terms, two particles too far apart are exchanging momentum as though they meet locally. A smaller timestep repeats that approximation more often; a corrected accounting ledger cannot move the particles back onto the correct paths.

The candidate treats the declared axisymmetric distribution as rings, transforms each velocity into its own cylindrical frame, uses exact annular r–z volumes and applies the unchanged mixed-ion pair generator there. Pair kinetic energy and axial momentum remain conserved. Cartesian transverse point-pair momentum is not an invariant of the ring representation; this requires the present axisymmetric source/fields. Finite radial gaps still produce **Δr·Δpθ**, which is measured without projection. This is a physically bounded symmetry reduction, not an angular-momentum repair or a general nonaxisymmetric model.

### Initial sharp-source dilution

Exact geometric cell volumes do not mean the occupied density is resolved. A cell partly filled by the initial pulse spreads its density over the full cell. Plain annular cells retain that error. Across the six default seeds, the normalized initial self-excluded density-squared proxy is **0.6777 fixed Cartesian / 0.6638 uniform annular / 0.9895 source-fitted annular**. This proxy is a density-integral diagnostic, not the complete velocity-weighted Coulomb operator.

The source-fitted branch inserts the declared initial source radius and pulse-end faces into an otherwise fixed annular mesh. It uses full physical volumes, not a particle-dependent support estimate or a guessed collision-rate multiplier. For the exact initial continuum step this removes support averaging; finite samples retain noise/self-exclusion, and later evolving profiles still smooth over cells. At c12/4096 the observed six-seed density proxy is **1.00040** and the fresh sixteen-seed proxy **1.00006**.

This is the narrow supported fix for a known initial discontinuity. It was chosen over changing physical density, adapting the support from the same sampled particles, or projecting velocities to force a small residual. Additional faces also increase the sparse-cell burden, which the results expose rather than hide.

## Raw residual and coverage evidence

Percentages below divide by each realization's **positive initial canonical-momentum scale**. They are not percentages of signed net initial Pθ, separator sorting error or experimental uncertainty. Maxima are across recorded snapshots and the specified seed batch, not a guarantee between samples or over unseen seeds. U is the maximum sampled active-representative-time unresolved exposure; it is not the percentage of physically invalid ions.

| Method / settings | Seeds | Maximum raw Pθ / positive scale | Maximum U |
| --- | ---: | ---: | ---: |
| Fixed c3/N128, 100 ns | 6 | 1.73098% | 53.394% |
| Uniform annular c3/N128, 100 ns | 6 | 0.50938% | 47.034% |
| Source-fitted annular c3/N128, 100 ns | 6 | 0.51041% | 58.746% |
| Fixed c6/N1024, 100 ns | 6 | 0.96317% | 37.621% |
| Source-fitted c6/N1024, 100 ns | 6 | 0.12005% | 31.467% |
| Source-fitted c8/N2048, 100 ns | 6 | 0.09635% | 23.806% |
| Source-fitted c12/N4096, 100 ns | 6 | 0.05723% | 24.494% |
| Source-fitted c12/N4096, 50 ns | 6 | 0.04094% | 24.541% |
| Source-fitted c12/N4096, 25 ns | 6 | 0.03983% | 24.437% |
| Fresh c8/N2048, 100 ns | 16 | 0.11494% | 24.367% |
| Fresh c12/N4096, 100 ns | 16 | 0.04674% | 24.732% |

The c12 candidate passes the original **0.1% raw-P budget in both specified batches**, whereas c8 passes the original six-seed batch and fails in three of sixteen fresh runs. The extra seeds therefore reveal a real limit to selecting a resolution from an attractive six-seed maximum. No budget was changed.

Sparse coverage remains the decisive open issue: c12's unresolved exposure stays around **24–25%**, versus the chosen **1%** target. Increasing nominal locality resolution while roughly retaining occupancy cannot resolve that sampling problem. Source fitting improves the initial density representation but can worsen sparse exposure; a smaller torque residual alone is not sufficient evidence of better overall transport.

### Physical SI normalization

For the six c12 initial clouds, Pθ's positive physical scale ranges **2.06238e−7–2.06926e−7 kg·m²/s** and Hamiltonian scale **8.06656e−3–8.17740e−3 J**. Maximum sampled raw angular defects at dt100/50/25 ns are respectively **1.18227e−10 / 8.46472e−11 / 8.24111e−11 kg·m²/s**; corresponding maximum Hamiltonian defects are **8.90425e−9 / 2.24513e−9 / 5.50913e−10 J**. At the fresh sixteen-seed c12 level the P scale spans **2.06124e−7–2.07106e−7 kg·m²/s**, with maximum raw defect **9.63354e−11 kg·m²/s**.

`assets/convergence-physical-metrics-v10.json` records **every one of the 234 runs'** positive P/H scales, signed initial P, raw/corrected sampled defects, initial density proxy, actual pair distances and finite-angle fraction. Accumulated legacy `collisionTorque`/pair-impulse fields have angular-momentum units kg·m²/s; they are not instantaneous N·m torque. The corrected ledger remains bookkeeping, never the physical acceptance criterion.

## Observable refinement and physical effects

All intervals below are **approximate pointwise 95% Student-t whole-run intervals**, not independent-ion intervals, simultaneous plot bands or rare-event guarantees. Refinement differences are fine minus coarse with paired seeds. Shared labels do not imply the same finite source cloud at different N because the initializer consumes a different number of draws. Fresh confirmation seeds are not pooled with the original six.

| Comparison | End-A change, pp | End-B change, pp | Original 1-pp equivalence |
| --- | ---: | ---: | --- |
| c8/2048 → c12/4096, six seeds | +0.1180 ± 0.9098 | −0.0326 ± 1.1322 | Both UNKNOWN |
| c8/2048 → c12/4096, sixteen fresh seeds | −0.0992 ± 0.4410 | +0.5096 ± 0.5399 | A PASS; B UNKNOWN |
| c12 dt100 → 50 ns, six seeds | −0.2930 ± 0.3014 | +0.0570 ± 0.4398 | Both PASS |
| c12 dt50 → 25 ns, six seeds | −0.0773 ± 0.3867 | −0.1180 ± 0.3954 | Both PASS |

The fresh B spatial interval reaches **1.0495 pp**, slightly outside the unchanged 1-pp equivalence target. A small mean is not enough for a pass. Both fresh species' angular-transfer comparisons pass their 0.001 positive-scale budgets, but both survivor-temperature intervals remain UNKNOWN at 0.1 eV.

The finest dt comparison has **53 PASS / 7 UNKNOWN / 0 FAIL** among 60 gated observables; its forty radial-CDF comparisons have **37 PASS / 3 UNKNOWN**. The fresh spatial comparison has **31 PASS / 9 UNKNOWN** among the forty CDF points. The other unknowns and missing sensitivity coverage remain visible; zero observed seed spread never becomes a zero-width certificate for an unseen tail. Mean impact Hamiltonian is retained without an invented acceptance tolerance.

At matched c12/N4096/100 ns, collision-on minus off changes the axial fractions as follows:

| Seed batch | End A, pp | End B, pp |
| --- | ---: | ---: |
| Original six | −1.8270 ± 0.3686 | +0.2686 ± 0.2593 |
| Sixteen fresh | −2.0081 ± 0.3619 | +0.2716 ± 0.1891 |

Those are nonzero **within this prescribed model and pointwise inference**. The original B result is marginal; none is a multiplicity-adjusted statement. The fresh angular transfers are A **+0.00735668 ± 0.00035091**, B **−0.00706454 ± 0.00035277** of the positive scale. These measurable effects do not bound continuum trajectory bias or turn the separator into an experimentally validated device.

## Independent verification and compatibility

- **Legacy exactness:** 48 matched v9/v10 fixed runs have **447,330 identical pre-existing config/observable/diagnostic/geometry/raw history/impact/conservation leaves**. Only additive keys, timing and source/model metadata differ. Evidence: `assets/fixed-v9-v10-identity.json`. This is exact snapshot behavior, not a convergence claim.
- **Independent arithmetic/provenance:** `assets/convergence-independent-audit-v10.py` imports no simulator code. It independently integrates the Student-t PDF to obtain inverse-CDF quantiles, rounded to the precision of the frozen declared table. All source maps, run memberships, physical settings, seeds/budgets, **2108 level-summary intervals**, **1426 paired observable intervals/verdicts**, and **310 physical-effect intervals** match the TS artifacts. Audit: `assets/convergence-independent-audit-v10.json`.
- **CPU aggregation:** archived `assets/convergence-fine-dt-aggregate-v10.mts` validates complete part/source/config identity before using the unchanged statistics function. The confirmation agent independently reviewed it and found no blocking issue. This reviewer also read the separate confirmation aggregator/verifier and found no blocking preservation defect. Part/code hashes remain distinct from the executed engine hash.
- **Runner regression checks:** `./node_modules/.bin/tsx --test tests/convergence-cli-v10.test.ts`: **4 passed, 0 failed**, 1.071 s. Cases cover historical raw/compact/Markdown preservation, invalid or ambiguous method overrides, unchanged prospective physical settings/budgets, and an actual tiny two-seed model-10/source-identified export whose gate remains UNKNOWN. Parent owns the final whole-repository typecheck/build/tests and publication.

The source graph was frozen for all campaigns; no physical/statistical source edit occurred between cases. Execution used the documented scoped user-authorized host exception after safe-dev access denial. No hooks, security settings, credentials, browser policy or deployed-origin workaround were changed. These are offline CPU/source checks, not live browser/GPU verification.

## What remains unresolved

The overall replay gates intentionally retain coarse raw-P failures, the fresh c8 raw-P failure, unresolved local-state sampling, unidentified orientation/alignment sensitivity, undefined or insufficient-precision observables and the unbounded continuum-bias/physical-effect ratio. It is incorrect to call these full convergence passes simply because selected finest budgets improved.

The next decisive numerical experiment increases **independent velocity samples per actual physical neighborhood while keeping that neighborhood local**, at the intended horizon, then rechecks density/shear/local-state estimates and outputs. Any higher-N resource-domain change or different estimator requires an explicit new reviewable increment and predeclared study. Do not remove the sparse-state criterion, reset temperatures, renormalize density from sampled support, or project angular momentum merely to close the gate. Nonaxisymmetric collective dynamics and experimental measured/held-out comparison remain separate missing validations.
