# Two-ion references and collision convergence, v12

7 November 2026 UTC. The matched PETSc two-ion adapter is implemented. The
41-case particle campaign and independent audit are complete. All eight planned
PETSc cases have completed and their raw histories have been independently
audited. The replacement full-field replay passes transfer integrity and separate
reconstruction checks, with all 101 moment checkpoints identical to the main run.

## What is being validated

This increment isolates homogeneous, isotropic Coulomb relaxation of 40 u and
84 u singly charged ions, each at 5×10¹⁷ m⁻³, initially at 2 and 10 eV, with fixed
Coulomb logarithm 12. There are no fields, sources, collectors, spatial gradients
or neutral collisions. The follow-on horizon is 500 µs. It supplements the
previous 1000 µs study rather than silently shortening that study's contract.

The browser's production collision kernel is exercised directly. Its physics has
not been retuned to match another code. These studies cannot by themselves
validate rotating transport, separation purity, discharge stability or an
experimental separator. Relative bulk-drift friction and anisotropy relaxation
also need dedicated matched cases; this isotropic, zero-drift study does not
qualify them merely by checking the collision prefactors.

## Why the codes disagree

### Different finite collision steps

The traced production path is `collideCoulombCell` → shuffled mixed-ion pairs →
`scatterCoulombPair`, with Gaussian Takizuka–Abe sampling of tan(θ/2). WarpX 26.10
uses separate self/unlike processes and defaults to Bobylev cumulative angles.
The default was checked in source and against the installed binary: explicit
Bobylev reproduces the prior omitted-option run bitwise at all four compared
checkpoints.

Independent derivations agree that the infinitesimal unlike-ion density and
mass factors match. In the mixed schedule, an unlike pair is selected roughly
half as often and receives roughly twice the selected-pair angular variance.
The angular response is nonlinear, so those schedules differ at finite step.

In simple terms, taking fewer, larger random collision steps is not equivalent
to taking more, smaller ones. This explains a measured initial-heating bias
without inventing a missing factor of two in the Coulomb coefficient.

Deterministic integration of the initial Maxwellian angular moment gives:

| Timestep | Mixed production TA initial heating | Difference from uncapped Landau |
| --- | ---: | ---: |
| 1 µs | 24093.3791 eV/s | −13.9% |
| 0.25 µs | 26138.4052 eV/s | −6.59% |
| 0.0625 µs | 27161.7402 eV/s | −2.93% |
| 0.015625 µs | 27631.9921 eV/s | −1.25% |

The independent analytic uncapped initial rate is **27982.1633 eV/s**. Separate
pairing and angular-law controls isolate both contributions. An additional test
integrates the actual production `scatterCoulombPair`, connecting the analytic
diagnostic to the code used by the app.

The independently implemented Julia direct operator agrees with that analytic
rate within about **0.0011%**, and the PETSc 10 ns probe within **0.047%**.
Together with the actual cached-coefficient checks, these support the shared
uncapped normalization while exposing the production method's finite-step
initial bias. They are not a finite-time distribution-equivalence result.

This is a causal result for the initial one-step expectation. It does not assign
the entire evolved 250/500 µs discrepancy to that mechanism. The low-relative-speed
singularity also makes an assumed linear timestep extrapolation unsafe: this
specific uncapped continuum initial-rate integral supports leading dt^(2/3)
behavior. That is not a universal order for finite-marker histories.

### Different low-speed operators

WarpX applies a low-speed transport-cross-section cap even when the Coulomb
logarithm is fixed. Production TA and the ideal Landau reference are uncapped.
Their strict limiting operators therefore differ in that tail.

For the initial population Maxwellians here, the cap reduces the analytic
heating rate to **27959.6645 eV/s**, a **0.0804041%** change. That is much smaller
than the measured coarse-step angular/scheduling bias. It does not establish
that the cap is negligible later or in colder plasmas. Finite empirical velocity
sets can have a different signed change because the uncapped initial-rate
estimator is sensitive to rare low-relative-speed pairs.

The coherent correction is to identify and control these differences explicitly,
then refine each method. Changing rates, clipping large collisions or fitting
one code to the other would obscure the physical question. No such production
change was made.

Full derivations, source links, exact-array controls and scope limits:
[kernel controls](COLLISION-KERNEL-CONTROLS-V12.md),
[independent disagreement audit](COLLISION-DISAGREEMENT-AUDIT-V12.md).

## Expanded particle study

All **41 WarpX executions and 41 production replays** completed under a plan
frozen before the new dynamics. They include eight fresh whole-run seeds across
three timesteps at 2048 markers/species; four seeds at 8192; explicit Nanbu
controls; common-temperature stationarity; and collision-off controls. Repeated
TA realizations used against different WarpX laws are not additional samples.

The predeclared primary equivalence budget is ±0.1 eV for the 40 u raw second
moment at 250 and 500 µs. A whole-run paired, pointwise 95% Student-t interval
must fit entirely inside that budget to pass. All twelve primary cross-code
gates remain **UNKNOWN**. These small-ensemble intervals are approximate and
pointwise, not simultaneous guarantees for every curve or a distribution-free
coverage claim.

At 500 µs, 2048 markers/species and 62.5 ns, TA−Bobylev is
**−0.037524 ± 0.083930 eV**. Its interval crosses zero but extends beyond the
equivalence budget. It therefore proves neither agreement to ±0.1 eV nor a
disagreement larger than that budget. Some coarser transient intervals exclude
zero. Marker refinement remains unresolved.

Both codes conserve the quantities checked to near floating-point precision;
that does not eliminate timestep bias, finite-marker error or model mismatch.
The independent auditor checked all 41 raw runs and all **176 reported
intervals**, as well as source membership, initial arrays and collision-off
identities. It found a small t-critical precision difference, which was corrected
and regression-tested; no verdict changed. Membership/stale-plan regressions
also prevent a valid hash/count from concealing substituted physical cases.

[Executed campaign](COLLISION-STUDY-V12.md),
[independent raw-data audit](COLLISION-CAMPAIGN-INDEPENDENT-V12.md).

![Initial bias and finite-time uncertainty](../scientific/plots-v12/collision-evidence-v12.png)

The figure is generated from the exported results using pinned Matplotlib in its
own safe-dev VM. The left panel is a deterministic initial expectation; the
right panel is finite-time stochastic evidence. Neither is a full-distribution
validation.

## PETSc two-ion adaptation

The shipped PETSc setup assumes an electron-first normalization. Merely changing
species labels or physical masses after setup leaves derived thermal velocities,
collision times and cached collision coefficients inconsistent. In simple terms,
the solver would evolve the wrong physical clock and coefficient matrix even
if the displayed labels looked correct.

The small opt-in adapter sets both species' exact SI masses, charges and eV
temperatures before those derived quantities are computed. It requires explicit
fixed positive Coulomb logarithms and checks the real cached CPU assembly
coefficients. The unmodified Landau collision kernel remains the reference.
With the option omitted, the checked upstream setup and five-step output remain
bitwise identical. This is preferable to rewriting the kernel or maintaining a
fork of the full library: the changed physical boundary is small and independently
auditable.

The 10 ns probe measures **27969.0747 eV/s**, within **0.047%** of the independent
analytic initial heating rate. This supports the adapted normalization, not
acceptance of the later distribution.

PETSc projects an analytic Maxwellian, whereas each paired particle run starts
from its actual finite empirical velocity sample. The nominal 2/10 eV labels do
not make those initial distributions identical. A quantitative cross-method
comparison must include projection and sampling error; the deterministic curve
cannot be pooled as another stochastic seed.

The coarse finite-element case fails its projection and negativity budgets.
Every initial nodal coefficient can be positive while the interpolating
polynomial is negative between nodes; quadrature detects that failure. The next
mesh still misses the initial temperature/anisotropy budgets. Excellent energy
conservation does not repair an inaccurate or negative distribution. No clipping,
thermostat or positive projection was used to conceal these failures.

All eight cases completed at their frozen physical durations. The independent
offline audit checks **759 checkpoints / 1518 species records**, exact plan
membership, six numerical source hashes, raw-log/JSON identity, normalization,
moments, inventories and entropy labels. Maximum total-energy residual across
the cases is about 1.23×10⁻¹².

| Refinement | Largest temperature change across all three primary times | Frozen 0.05 eV comparison |
| --- | ---: | --- |
| 4×8 → 8×16 cells, R6 | Above budget; initial projections also fail | FAIL |
| 8×16 → 12×24 cells, R6 | <0.00795 eV | PASS |
| 10 → 5 µs, 12×24/R6 | 0.01859 eV | PASS |
| 5 → 2.5 µs, 12×24/R6 | 0.009515 eV | PASS |
| R6 → R8 at fixed spacing | 0.001876 eV | PASS |

The fine 5 µs/R6 final temperatures are **5.38295622 / 6.61494653 eV**;
the 2.5 µs/R6 case gives **5.38695964 / 6.61094311 eV**; R8 gives
**5.38483266 / 6.61307260 eV**. The common-5-eV control's maximum measured
temperature drift is **0.000673568 eV**. These are declared moment checks,
not an error bound for the full distribution or a proof of continuum convergence.

The fine R6 cases have no negative values at the original recorded
coefficient/quadrature samples and have a defined sampled entropy diagnostic.
Denser full-field reconstruction is a separate test of that sampling limit.
The larger-domain case
reaches a negative-number fraction **7.99445×10⁻¹⁰**, above the frozen diagnostic
budget of 10⁻¹⁰. Its full entropy is withheld. Between-node/global positivity
also remains separate from those sampled tests. **The full reference remains
unaccepted/UNKNOWN**, despite passing fine moment-refinement comparisons.

The common-temperature control also fails its sampled-entropy budget: maximum
relative one-step H increase is **8.85539×10⁻⁸**, above the frozen 10⁻⁸ limit,
despite small temperature/anisotropy drift and sampled nonnegative values. This
is a measured quadrature-diagnostic failure; interpreting it as the exact
continuous entropy requires its own quadrature/representation study. It prevents
an all-checks-pass claim.

[Adapter, executed plan and tests](PETSC-TWOION-V12.md),
[independent actual-history audit](PETSC-INDEPENDENT-AUDIT-V12.md).

The accepted R6/12×24 full-field replay takes 986.760 s and reproduces all 101
main-run moment checkpoints and setup bitwise. All 103 pre-export file hashes
match the actual host copies. A separate reviewer reconstructs all eight fields
without importing exporter code, using exact polynomial Gauss3 moment integration
and a different 33×33 per-cell sample grid.

That reviewer confirms an 84 u negative tail at 100 µs: minimum normalized
F≈−1.372×10⁻¹⁶ at (v_perp/v0,v_parallel/v0)≈(8.26970,8.26970).
Its magnitude is about 3.65×10⁻⁴ of the cell's largest coefficient, rather than
relative floating-point roundoff. The exporter's dense16 negative-number fraction
is about 6.88×10⁻¹⁷, far below the 10⁻¹⁰ diagnostic budget. Small integrated
negative mass can therefore pass that magnitude budget while the represented
field is not globally positive. Original quadrature and Gauss3 samples missed
this region. Full physical H is not justified for that field; a positive-part
diagnostic must retain its label. Other sampled fields being positive establishes
only sampled absence. See the [field export and integrity report](PETSC-DISTRIBUTION-V12.md).

An additional descriptive comparison uses these deterministic curves alongside
the actual eight-seed fine-particle and four-seed larger-particle ensembles.
At 500 µs the 40 u raw moment is 5.38696 eV for PETSc's 2.5 µs case,
5.37876 ± 0.02734 eV for fine TA and 5.41628 ± 0.09392 eV for fine WarpX
(pointwise 95% Student-t intervals). Initial hot-species means differ by group;
subtracting initial moments does not match their partner distributions or total
energies. These comparable relaxation scales do not qualify PETSc as ground
truth or introduce another acceptance gate. See the
[descriptive triangulation](COLLISION-TRIANGULATION-DESCRIPTIVE-V12.md).

## Stack decision and scientific limits

[The stack decision](TECH-STACK-DECISION.md) gives the selection criteria,
alternatives and revisit conditions. This is a collection of independent
references around a shareable interactive app, not a claim that one language or
package is the universal industry standard. Julia/SciML supplies the adaptive
orbit reference; WarpX supplies particle collision evidence; PETSc supplies a
deterministic velocity-space comparison. Method independence helps expose errors
but costs setup, normalization, data interchange and multiple environments.

The discovered Julia `FokkerPlanck.jl` implementation is being qualified as
another Coulomb operator candidate. Its default branch exposes self-species
implicit evolution, but its non-default `multi-species` branch contains a coupled
implicit driver and two-/three-species tests. An isolated upstream smoke is in
the qualification package: **100/100 nonlinear-success returns and 12/12
distribution/moment assertions pass**. The upstream loop originally discarded
the solver's success return, so the qualification harness now asserts that
existing contract without changing the solver. The computed final nodal minimum
is **−2.1719994×10⁻⁴**, despite conserved moments near machine precision.

This makes it a working coupled nonlinear Coulomb reference candidate, with a
demonstrated coarse-grid positivity failure. It is not yet the matched 40/84 u
finite-time campaign. A separate, prospectively planned SI initial-rate probe
now matches the 40/84 u physical case: finest direct corrected heating slopes are
**+27981.8657 / −27981.8630 eV/s**, about **0.0011%** from the analytic rate.
The final projection error is below 2.93×10⁻⁷ relative; raw/corrected operator
differences and fixed-spacing domain sensitivity pass the declared budgets.
Three backward-Euler steps from identical initial states give cold-ion slopes
27587.465, 27881.280 and 27956.589 eV/s at 1, 0.25 and 0.0625 µs. All nonlinear
success returns pass; the finest step is about 0.0914% below the initial rate.

These are bounded initial-rate checks. The earlier grid ladder is diagnostic;
there is no separate accepted full-grid-convergence claim. The zero-collision
control is exactly unchanged. Common-6-eV temperature changes are only about
1.91×10⁻⁸ eV at 1 µs, but its maximum nodal distribution change is 6.88×10⁻⁵
and its minimum becomes negative. The unequal-temperature finest step also
contains negative values. Temperature stationarity is therefore narrower than
distribution stationarity, and no physical full-entropy claim follows.

The explicit conservation corrections and `log(abs(f)+epsilon)` diagnostic
require separate accuracy/entropy checks. A language migration alone would not
establish those properties or convergence. See the
[executed qualification](JULIA-FOKKERPLANCK-REVIEW-V12.md) and
[independent derivation](JULIA-FOKKERPLANCK-INDEPENDENT-V12.md), followed by the
[matched SI probe](JULIA-FOKKERPLANCK-SI-PROBE-V12.md) and its
[independent source/output review](JULIA-FOKKERPLANCK-SI-REVIEW-V12.md).

The next scientific decisions follow the evidence:

1. Qualify the deterministic distribution, not just conserved moments: projection,
   between-node negativity, velocity-tail/domain sensitivity, timestep and entropy
   validity remain separate checks. Retain failed cases.
2. Extend the qualified Julia SI initial-rate bridge to full-distribution
   equilibrium and a separately frozen finite-time study. Measure correction
   size, grid/domain/time sensitivity and negative mass throughout; the initial
   probe does not establish those later properties.
3. Freeze any new cross-method study before execution. Account for smooth versus
   empirical initialization, raw versus centered moments, Monte Carlo uncertainty
   and the capped versus uncapped operator. Do not pool deterministic curves with
   stochastic seeds or count two energy-constrained species as independent wins.
4. Consider a production collision-method change only after full-time controlled
   comparisons support it. Separate pairing and alternative angular sampling are
   testable candidates; the initial-rate result alone does not choose between
   them or establish an optimal method.
5. Return to spatial/ring-cell convergence and rotating transport independently.
   A homogeneous collision reference does not resolve those existing gates.

Keep the SI adapter, particle study/audit, controlled diagnostics, output export
and Julia qualification as separate reviewable increments. No combined solver
rewrite or oversized single-purpose PR is proposed.

## Software gate and execution boundary

Root production `src/`, `scripts/` and `tests/` are byte-identical to the
explicitly synced tested snapshot `/tmp/mass-spinner-reference-gate.YWQxyJ`
(243 files, 63.1 MiB, guest `safe-dev-e3cc6ae2874726e4`). Guest `npm ci` preceded
these checks:

- `npm test`: **262 passed**, zero failed/skipped, 21.973 s.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; existing large-renderer-chunk warning remains.
- `npm run check:site`: exit 0; structural assets/module checks, not browser QA.
- `node --import tsx --test scientific/collision-kernel-v12/production-moment.test.ts`:
  **1 passed**.
- Separate strict NodeNext TypeScript check of that production-moment test:
  exit 0, with guest-only `@types/node@24.10.1`.

Each scientific package records its own additional tests, source hashes, pinned
environment and exported raw evidence. Key executed checks are:

| Workflow | Exact check | Result / evidence scope |
| --- | --- | --- |
| PETSc | `python3 -m unittest -v` | 16 passed in 5.729 s, including 12 two-ion and four legacy parser tests |
| PETSc | `python3 assess_twoion.py`, `python3 provenance_twoion.py` | Exit 0; all eight cases assessed, 90 pinned installed packages, actual compiled/source/header graph and 21 artifact hashes checked |
| Independent PETSc audit | `python3 audit_normalization.py`, `python3 audit_artifacts.py` in the separate staging VM | Exit 0; seven normalization assertions and 759 checkpoints / 1518 species records, including honest failed/unknown physical outcomes |
| Full-field export | `python3 -m unittest -v test_reload`, optimized and sanitizer pilots, fresh frozen fine replay and bundle checks | Ten regressions pass; solver exit 0; eight fields/eight native vectors, all 103 host export hashes match; main source/cache hashes unchanged |
| Independent FE audit | `python3 audit_fe_exact.py` on the accepted field directory | Eight fields reconstructed/integrated, moment identities pass, independent between-node negative sample retained |
| Particle campaign | Five Python tests, two TypeScript regressions, strict standalone TypeScript check; actual suite/compare/audit/analyze | All pass/exit 0; 41 planned runs and production replays |
| Independent particle audit | Five regressions and full raw audit | Pass/exit 0; 41 raw cases and all 176 intervals |
| Descriptive triangulation | `python3 -m unittest -v test_triangulate`, `python3 triangulate.py . --output descriptive-triangulation.json` | Three passed; aggregation exit 0, distinct ensembles/initial conditions retained, no acceptance gate |
| Angular controls | `python3 -m unittest -v`, `python3 diagnostics.py` | Five passed; strict C++ compilation and deterministic actual-input expectations complete |
| Julia upstream | Checked-return `smoke.jl` under the pinned project | 12 assertions plus all 100 nonlinear-success checks pass; negativity is retained |
| Julia SI | `si-probe.jl` under that same pinned project | Four direct cases and all five short nonlinear advances complete, bounded gates pass; distribution validity remains unqualified |

An audit's exit 0 establishes that it correctly reproduces the reported evidence;
it does not turn a failed physical budget into a pass. Dependency installation, compilation,
tests and scientific computation ran inside dedicated Apple safe-dev VMs.
Host operations were limited to agent/editor control, reviewed source/data
copying and scoped VM lifecycle recovery. Long PETSc runs required changes to
their orchestration: pipe backpressure and a zero-RSS probe were fixed and
regression-tested before the memory-qualified concurrent run. The physical
driver and frozen plan were unchanged by those scheduling fixes.

The separate full-field exporter initially passed an uninitialized pointer to
`DMPlexVecGetClosure`. That input/output API allocates borrowed storage only when
the pointer is NULL; otherwise it treats the pointer as caller-provided storage.
In simple terms, garbage stack contents were being mistaken for an allocated
array. Initializing the pointer and size for each cell fixes the demonstrated
contract violation. Optimized original/export-off/export-on equality and
sanitizer short-run regressions pass. Sanitizer success alone had missed the
optimized failure, so both are retained. An earlier DM-reset explanation was
disproved and withdrawn; no solver mesh workaround was used.
[Official PETSc API contract](https://petsc.org/release/manualpages/DMPlex/DMPlexVecGetClosure/)

The first full-field transfer subsequently failed independent parsing: two host
JSON files contained NUL-filled headers. The original guest had already been
reset, preventing a conclusive source-versus-transfer integrity check. The byte
corruption's cause is unknown; concurrent disk pressure does not prove causality.
The demonstrated workflow defect was resetting before checking every exported
file. The replacement workflow durably closes and syncs artifacts, validates
their complete requested set and contents, writes an atomic SHA/size completion
manifest, and verifies all actual host bytes before any guest reset. Regression
tests reject NUL/truncated files and mutations after manifest creation. This
fixes the evidence boundary without silently repairing damaged scientific data.

After host verification, the twelve temporary replay source copies under the
main package were compared byte-for-byte with the authoritative distribution
package and removed. The accepted export, authoritative sources/results and
actual guest snapshot remain preserved; the main guest was not resynchronized
or reset during this cleanup.

No production behavior or public deployment changed in this increment. No live
browser/GPU verification or experimental validation is claimed.

## Resource recovery

The optional Julia SI probe initially could not start: macOS reported ENOSPC,
with only 117 MiB free. No SI dynamics had run at that failure. The completed
WarpX-study owner confirmed that every unique source, deck, raw output, all 41
run logs, summaries and qualification records had been exported; the parent
rechecked all 150 manifest entries successfully from the project root. A fresh
container inventory confirmed its exact volume was inactive.

Only `safe-dev-fa0af76635bd6f32` was retired through the macOS container lifecycle
tool. Its remaining contents were the regenerable pinned environment and caches,
plus duplicate source/results. Authoritative project artifacts and
`/tmp/mass-spinner-collision-v12-export-final` remain. No running PETSc, Julia or
unrelated volume was removed. Fresh disk measurement showed 2.5 GiB available.
This scoped lifecycle action is separate from scientific execution inside VMs.
Reproduction of that retired study should use a new minimal staging directory
and `safe-dev init`, replaying the retained locks. Its old safe-dev state record
is historical and does not make the removed environment available.
