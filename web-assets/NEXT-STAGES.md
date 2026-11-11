# Mass Spinner: stages after the second audit

**Version-10 collision follow-up:** [current root causes, independent checks and rerun evidence](COLLISION-CONVERGENCE-V10.md) supersedes the collision implementation proposals below. The new axisymmetric/source-fitted branch targets finite-distance torque and initial support dilution. The next numerical requirement is joint spatial/particle refinement with increasing local occupancy, together with independent fresh-seed output equivalence and timestep evidence. Holding N proportional to the number of r–z cells does not make local sampling arbitrarily resolved; shrinking cells alone cannot close the remaining coverage gate. Preserve the homogeneous Landau reference and experimental acceptance as separate, still-open gates.

Evaluated 6 November 2026. Scope remains the tutorial's Section II A–D, with emphasis on II C and II D. The other separator families remain an illustrated reference atlas. This is a ranked plan, not an assertion that the stages below are implemented or validated.

**Version-9 update:** the Stage-5 workbench now ran 48 intended-horizon cases and reports FAIL; Stage 6 adds an off-default adaptive comparison and an independent finite-time Landau reference candidate; Stage 7 adds bounded radial magnetic feedback; Stage 8 adds an honest held-out comparison contract. Their scientific acceptance gates remain open. [Current implementation and evidence](STAGES-5-8-STATUS.md) supersedes the original implementation sequence below. The separate beam-target teaching lab is grounded in Marathon's public architecture, with assumed target/beam inputs.

## Decision

**Stage 5 should establish numerical trust at the intended operating point.** Stage 4 has a working collisional double-well experiment, but its continuum spatial/particle convergence gate is open. Adding more machines, a full PIC engine or more visually impressive particle paths would not close that gate.

Stages 1–3 supplied rotating-filter seed studies, fixed bulk composition and a prescribed-Gaussian/current centrifuge equilibrium. Stage 4 added prescribed-field quartic full orbits with local ion–ion scattering and open/closed boundaries. These are useful educational models with different assumptions; they are not calibrated machine predictions.

## What the fresh audit changes

Three independent reviewers checked transport, collision physics and product execution. See [collision audit](AUDIT2-COLLISIONS.md), [transport audit](AUDIT2-TRANSPORT.md) and [product audit](AUDIT2-PRODUCT.md).

- No new charge, reduced-mass, sign or SI rate-coefficient defect was demonstrated in the collision kernel. Pair conservation and independent homogeneous benchmarks are useful evidence, but do not establish spatial transport accuracy.
- The unchanged **200 µs default** reaches **1.7246% raw canonical-angular-momentum residual relative to its positive initial normalization scale**. The earlier 0.27–0.35% figure described finer **20 µs** cases. Neither is a percentage of the near-zero initial net angular momentum or an error bar on separation.
- All **155 sampled local-regime snapshots** of that default remain unresolved; unpaired marker exposure is **10.75%**. More samples are needed locally, not merely globally.
- Independent geometry integration gives an initial marker-averaged cell-density multiplier of **0.685858** for the default sharp pulse. This survives infinite marker count at fixed cells and changes nonmonotonically with grid alignment. It is not automatically a 31.4% error in every collision moment, because the actual source also has velocity shear.
- A narrow leave/re-enter wall excursion can evade the old fixed event samples. This is a demonstrated contact-detection bug, separate from collision-model uncertainty. The audit patch replaces the sampled search with roots of the actual partial-step Boris path; it still requires timestep convergence and floating-point grazing checks.
- Tiny constant scientific values could disappear against arbitrary ±1 plotting limits; synchronous worker-submission failures leaked resources. Both have narrow fixes and regression coverage.
- Exact axial timestep-end arrivals also need collection. The audit corrects that fast-path corner. A closed pure-gyro orbit exactly coincident with the wall remains unsupported: specular reflection cannot change its tangent velocity, causing repeated zero-time contacts. This is distinct from ordinary reflected continuation and is an explicit boundary-policy task, not something more particles or a smaller timestep necessarily fix.

The raw angular-momentum defect arises because paired impulses act at distinct positions. Their artificial torque is `(r_a−r_b)×Δp_a`. Subtracting measured torque closes an accounting identity; it does not restore the trajectories. Increasing particle count without resolving cell locality and source geometry cannot fix this.

## Stage 5 — reproducible convergence workbench

**Deliverable:** a batch runner and inspectable case artifacts for the actual default and a small controlled benchmark set. Keep this as a separate reviewable increment before changing the collision discretization.

Each artifact should contain physical settings, source/boundary definitions, model/build hash, seeds, timestep, particle count, grid geometry, runtime, raw outputs and dimensional normalization scales. Export whole-run statistics, not an independent-ion binomial interval for interacting particles.

Run independent timestep, particle and cell refinements at the **same physical horizon**, with independent seed ensembles. Include source/grid-alignment and orientation tests. As cells shrink, increase particle count enough to preserve local occupancy; in three dimensions the basic occupancy cost scales approximately with inverse cell volume. A fine grid with mostly empty or singleton cells is not a refinement of the same collision process.

Measure end/wall/source/survivor fractions, radial CDFs and moments, residence/impact distributions, species angular-momentum transfer, raw SI H/P balances, pair separation/torque, unpaired exposure and unresolved local-regime exposure. Keep stochastic spread, time error, spatial bias and physical model discrepancy separate.

**Acceptance:** predeclare tolerances for the chosen educational observables; demonstrate agreement across the two finest independent resolutions with sufficiently narrow uncertainty, and error smaller than the collision-on/off or species-separation effect being interpreted. For example, a one-percentage-point outlet-fraction target is a possible chosen target, not a universal plasma-physics standard. Report a no-go when the available resources cannot distinguish the effect from error.

The browser's present 4096-marker/species and 80-million-particle-step limits cannot generally maintain adequate occupancy in a finely resolved expanded pulse. Use a reviewed offline CPU validation runner/reference case; do not simply remove browser limits or assume a free Cloudflare worker is a scientific compute backend. Keep the interactive preset exploratory until its own gate passes.

## Stage 6 — close collision locality and finite-time accuracy

**Deliverable:** compare the fixed-cell baseline against a genuinely more local method and an independent reference, using Stage 5's identical cases and observables.

Evaluate adaptive spatial cells/local matching or a carefully derived conservative reduced representation. Preserve physical density, equal-weight accounting and pair conservation. Check grid translation/rotation sensitivity, source-edge dilution, raw angular momentum and the separation observables jointly. Do not repair a dynamic pulse by permanently dividing rates by its initial overlap fraction; that correction becomes wrong as the pulse expands. Do not project angular momentum after scattering without deriving and validating the changed operator.

In parallel, compare finite-time homogeneous relaxation over several relaxation times against an independent Landau solver. Existing initial-rate and Rutherford tests remain valuable. A cumulative-angle method such as Nanbu is worth benchmarking only if finite-step accuracy/cost improves; switching pair maps alone cannot repair spatial torque.

Useful independent references include [Wang et al. 2008](https://doi.org/10.1016/j.jcp.2007.12.027), [Zonta et al. 2022](https://arxiv.org/abs/2212.00663) and [Carrillo, Hu & Van Fleet 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11493796/). The last develops a **spatially homogeneous** multispecies method; its exact BKW example uses a Maxwell kernel, not an exact Coulomb separator solution. Conservation of homogeneous mass/linear momentum/energy does not by itself prove angular-momentum correctness for spatially separated marker collisions.

**Acceptance:** retain SI-rate, thermal-equilibrium and conservation tests; independently establish time/locality/particle/seed convergence for declared transport observables. Publish the validated operating envelope and remaining failures. A good torque-subtracted ledger alone does not pass this stage.

## Stage 7 — physical field, source and boundary closure

**Deliverable:** one explicitly bounded physics increment for II C or II D, based on a documented operating point rather than guessed realism.

For **II C**, a coupled radial current/magnetic-field equilibrium is a reasonable next increment when the existing estimated self-field is appreciable. State the axis/wall magnetic boundary, electron approximation, normalization and prescribed source/profile inputs. Check radial force balance, quasineutrality and Ampère's law together. Do not infer spin-up, electrical power or throughput from a stationary column.

For **II D**, add measured or otherwise justified `φ(r,z)`, source phase-space/charge-state distributions and collector acceptance. Continuous injection requires an explicit reservoir and particle/current/energy/angular-momentum budgets. Compare interspecies drag, radial redistribution and residence times before interpreting sustained separation.

Electron response, sheaths, neutrals/charge exchange and imposed versus self-consistent fields should enter as separately derived closures with applicability tests. [Gueroult et al. 2024](https://arxiv.org/abs/2401.06480) shows why end-electrode voltage cannot simply be equated with the resulting bulk potential profile.

**Acceptance:** solve the declared boundaries and budgets; verify limiting cases and numerical convergence; attach input provenance and uncertainty. Preserve reduced educational modes alongside the new closure.

## Stage 8 — experimental validation

**Deliverable:** reproduce one documented experimental condition with uncertain inputs, then test a held-out condition without retuning every parameter.

Separate calibration, numerical agreement and predictive validation. Compare measured radial composition/density, rotation/potential and collector distributions as available. Only attach throughput, power, engineered purity or device-design claims to outputs supported by this evidence.

**Acceptance:** predefined observables and uncertainty; traceable measurements; held-out agreement inside the declared envelope; explicit negative results and missing measurements.

## Parallel release gate — actual browser and GPU verification

Source-unit control/worker tests and static asset checks do not execute the deployed browser. Once legitimate exact-origin access is available, verify all seven modes, live sliders, cancellation/error handling, downloads, mobile layout, actual asset loading, GPU backend/failure presentation and supported-resolution performance.

The effective browser policy currently denies the public origin despite the local allowance/restart. No alternate browser/CDP/origin-fetch workaround is authorized by that denial. This remains an open release gate, separate from successful CLI publication and scientific validation.

## Recommended next implementation

The workbench and first comparisons now exist. Next resolve the demonstrated spatial/source-density and occupancy defects, add actually executed grid-origin/orientation sensitivity and improve the independent finite-time benchmark's uncertainty/distribution checks. Preserve the failed default gate. Measured source/electron/collector inputs and a genuine calibration/held-out dataset are required before completing device closure and experimental validation. More controls or a different collision partition cannot substitute for those results.
