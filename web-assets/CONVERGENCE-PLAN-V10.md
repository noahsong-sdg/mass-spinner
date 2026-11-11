# Independent convergence audit and predeclared version-10 comparison plan

7 November 2026 UTC. Read-only audit of the released version-9 executable path and its actual artifacts, followed by a prospective plan. This report does not certify an unexecuted improvement. Method parameters must be frozen and recorded before executing the corresponding confirmatory matrix.

## Evidence and actual failing statements

Traced `scripts/run-convergence.ts → executeSeed → simulateDoublewell → observeDoublewell → summarizeConvergence` and reopened the full declared case in `assets/convergence-default-200us-v1.summary.json`. Read `STAGE5-CONVERGENCE.md`, `STAGE6-LOCALITY.md`, and the independent stage-5/6 review. No production source was changed by this reviewer.

The observed hard failures are:

- Every collisional numerical level exceeds the **0.001 raw canonical-angular-momentum residual / positive initial scale** budget. The finest spatial level has maximum 0.0096316800; the default maximum is 0.0173097961. The collision-off control's maximum is 0.0000011322.
- The paired six-seed species-B angular-transfer change from 4 cells/304 markers per species to 6 cells/1024 is **−0.0037273595 ± 0.0024772666**, approximate pointwise 95% t half-width, outside the 0.001 budget.

Other refinement families are **UNKNOWN**, not demonstrated passes or definite failures. Sampled local coverage is unresolved. Raw-P maxima are over recorded snapshots, not rigorously every substep. The finest total unresolved active-time exposure can reach 37.6%. These are separate issues: better torque accounting alone cannot repair density smoothing, source dilution, velocity shear, sparse thermal estimates or collector bias.

The full summary also remains UNKNOWN for unsupported alignment/orientation controls and an unbounded numerical-bias/physical-effect ratio. A correct version-10 implementation must retain those unknowns unless it actually implements and executes the missing experiments. Removing required checks, narrowing the reported observable set after inspection, loosening thresholds, or substituting a torque-corrected ledger would not fix convergence.

## What the old matrix can and cannot establish

The time refinements change only dt; particle refinements change only representatives; spatial refinements increase representatives along with cells to roughly retain initial full-column occupancy. These are valid named comparisons, but the spatial family is a **joint N/h path**, not a fixed-N discretization estimate. Axial rounding and the localized pulse mean the actual local occupancy differs substantially from the full-column estimate. Increasing N at fixed h removes neither histogram smoothing nor nonlocal collisional torque. Increasing h-resolution at fixed N worsens empty/sparse neighborhoods. Both physical locality and enough independent velocity samples must improve.

Shared seed labels do not mean two different marker counts represent the identical initial cloud: the initializer consumes a different number of random draws before initializing species B. Paired differences are still statistically legitimate because each whole seed pair is the sampling unit, but their covariance may be weak. Do not describe the pair as an exact common-particle realization or use independent-ion errors. Spatial observables and source-sink bookkeeping remain correlated across a run.

Student-t intervals with six whole runs are approximate, pointwise and potentially sensitive to skew/tails. They are neither simultaneous bands over the many radial bins nor distribution-free guarantees. The existing no-spread interval withholding correctly prevents an unobserved finite-sample rare tail from being certified absent. More seeds can narrow Monte Carlo uncertainty, but cannot remove a spatial or algorithmic bias.

## Primary replay: preserve the existing comparison

Freeze the chosen collision method, rate derivation, all numerical options, versioned source hashes and declared case before the replay. Preserve **all physical settings**, including density 1e18 m⁻³, ion/electron temperatures 5 eV, logΛ=10, 40+/84+ ions, source radius 0.08 m, pulse length 0.15 m, chamber radius 0.2 m/length 0.6 m, B=0.06 T, V=20 V, quadratic shape 1.2, open boundaries, zero-canonical initializer, 5 eV axial beam and the **200 µs** horizon.

Replay the same six whole-run seeds **101,202,303,404,505,606** and these eight numerical levels, changing only the declared collision-method choice relative to the released case:

| Level | Markers/species | Cells across | dt |
| --- | ---: | ---: | ---: |
| default | 128 | 3 | 100 ns |
| dt50ns | 128 | 3 | 50 ns |
| dt25ns | 128 | 3 | 25 ns |
| N512 | 512 | 3 | 100 ns |
| N1024 | 1024 | 3 | 100 ns |
| h4-N304 | 304 | 4 | 100 ns |
| h6-N1024 | 1024 | 6 | 100 ns |
| collision-off | 128 | 3 | 100 ns |

Keep the original declared budgets: fractions/CDFs 0.01, radius/a 0.01, temperature 0.1 eV, impact-time/duration 0.02, species angular transfer 0.001, maximum raw-P residual 0.001, unresolved exposure 0.01 and minimum six seeds. Preserve all observables and null conditional outputs. A method for which `cellsAcross` no longer controls actual locality must **not** call the h4/h6 labels spatial refinement; instead preserve the legacy replay for historical comparison and add real executed locality-scale comparisons under that method's explicit settings. The validator must reject placebo refinement controls.

Keep the released v9 artifact immutable and use a new output path. Source hashes must identify the actual executable graph before and after each campaign; a current source hash cannot authenticate a historical result computed under another implementation. Compare both raw SI scales and normalized residuals, since marker counts and realization-dependent initial normalizations differ. Report every replay level, including regressions and invalid/unresolved cases.

## Additional experiments required by a new method

1. **Matched method control:** compare legacy and candidate with identical physical and numerical settings. Keep the old artifact as provenance; if the legacy code path remains executable, rerun it in the same source snapshot too. A method change is not itself continuum refinement.
2. **Source-density/torque mechanism probes:** homogeneous mixed Maxwellians, known sharp cylindrical pulse, prescribed velocity shear and closed common-rotation equilibrium. Inspect initial self-excluded density-squared integrals against analytic or independent geometry quadrature, actual pair distances, collision rates, energy/linear momentum, and raw species/total Pθ. Correcting the initial pulse alone is insufficient: the source evolves.
3. **Actual locality limit:** select at least three genuine decreasing spatial/neighborhood scales while increasing N/occupancy appropriately. Record maximum/RMS physical pair distance and density-estimator parameters, not an unused nominal grid. Hold physical density and initial volume fixed; changing marker weight follows from fixed physical inventory.
4. **Timestep limit:** at the candidate's selected high-resolution locality settings, execute 100/50/25 ns with the same seeds and horizon. Rate normalization, pair reuse and close-relative-speed behavior may have changed; the old dt result cannot be inherited.
5. **Collision-off and domain controls:** verify method selection does not alter collisionless trajectories/source draws. Keep sampled weak-coupling/screening/encounter assumptions, finite-angle diagnostics and sparse-coverage thresholds visible. Do not introduce a rate floor, thermostat, artificial rotation projection or acceptance-only diagnostic change.
6. **Independent finite-time reference:** retain the homogeneous Landau candidate's own spatial/time/cutoff errors and finite-time distribution comparison separately from the spatial separator. Pair energy conservation alone does not establish collision-rate accuracy.

## Fixed follow-up uncertainty campaign

If resources allow, predeclare and execute **16 new whole-run seeds 1001–1016** for the two finest genuine locality levels at the same selected dt, plus an exactly matched candidate collision-off pair. Execute the complete declared batch regardless of early results; no optional stopping when intervals first fit. Use this batch as a fresh confirmation set rather than silently pooling it with exploratory seeds after tuning. Keep the original budgets. If its intervals still overlap the tolerance boundary, retain UNKNOWN. It is acceptable to publish a failed or inconclusive result with its precision and cost; it is not acceptable to narrow the claim by hiding negative bins after execution.

Any subsequent larger-N, longer-run or altered-source study is a newly declared case. New engineering budgets must be distinguished from the unchanged version-9 comparison and must not retroactively convert its failure into a pass.

## Coordinated candidate and exact commands

Before any version-10 convergence execution, the parent selected an **axisymmetric annular r–z method**. `cellsAcross` becomes the number of radial intervals, with Δr=a/c and axial count ceil(L/Δr). Therefore the same c3/c4/c6 sequence is a genuine r–z refinement. The dimensionality differs from the legacy Cartesian grid: its N∝c³ path increases occupancy faster than a c² path, and its nominal width and source-density smoothing are not directly equal to the old Cartesian widths. Compare measured pair distances and analytic-density probes as well as labels. The physical case remains axisymmetric; this method cannot validate nonaxisymmetric modes.

Analytic geometry inspection then found that plain annular c3 cells still dilute the initial pulse. A separate **source-interface-aligned fixed partition** appends the known initial source-radius and pulse-length interfaces to the uniform radial/axial faces. These fixed interfaces are determined by the declared source, not selected from particle positions or moved with the cloud. This design permits an exact initial density step without multiplying the collision density by a guessed support fraction. It does not resolve later source evolution or density shear. Compare plain and source-aligned candidates separately, and preserve negative results.

The runner now uses modelVersion 10, defaults to the unchanged fixed method and accepts `--method axisymmetric`; `--source-aligned` adds the source-interface choice only for that method. New output names preserve v9 evidence. Custom plans require an explicit output and cannot silently combine a method/interface override. Existing raw, compact or Markdown output paths reject before running, avoiding accidental evidence replacement.

After the parent declares a frozen, independently checked source snapshot:

```sh
./node_modules/.bin/tsx scripts/run-convergence.ts --method fixed
./node_modules/.bin/tsx scripts/run-convergence.ts --method axisymmetric
./node_modules/.bin/tsx scripts/run-convergence.ts --method axisymmetric --source-aligned
./node_modules/.bin/tsx scripts/run-convergence.ts --plan assets/convergence-axisymmetric-refinement-plan-v10.json --output assets/convergence-axisymmetric-refinement-v10.json
./node_modules/.bin/tsx scripts/run-convergence.ts --plan assets/convergence-axisymmetric-fine-dt-plan-v10.json --output assets/convergence-axisymmetric-fine-dt-v10.json
```

The first three are 48 runs each with the original eight levels. The source-aligned higher-locality plan is **24 runs**: c6/N1024, c8/N2048, c12/N4096 and matched c12/N4096 collision-off. This original physical case, 200 µs horizon, seeds 101–606 and all budgets are unchanged. The source-aligned finest dt plan is **18 runs** at c12/N4096, 100/50/25 ns, again unchanged physical settings/seeds/budgets. Every configuration remains below the existing 80-million-particle-step domain bound. Actual radial and axial face spacing, source interfaces and measured pair distances must accompany nominal c labels. These plans were written before their results; execution may be resource-limited and must be reported as executed or not executed explicitly.

## Acceptance language

Report three levels separately: **implementation invariants checked**, **specified numerical observables converged or unresolved**, and **experimental device validity unestablished**. A substantially reduced residual is improvement evidence only when collision rates/density, independent moments, pair locality and intended output observables agree as well. The release-wide overall gate cannot become PASS while required sensitivity experiments and physical-effect/continuum-error bounds remain unknown.

This audit involved read-only source/artifact inspection and a local JSON extraction using the parent's documented scoped host exception; no production tests or matrices were rerun by this report. No policy, hook, credentials or deployed-origin access was changed. The parent owns the final coordinated study and repository checks.
