# Kinetic and collision tooling audit — v87

12 November 2026. Read-only execution-path/source audit and current primary-source
review; no solver installation, numerical execution, physics change or deployment.
Existing numerical results below are checked repository evidence, not new reruns.

## Decision

We have already used established collision codes. The avoidable duplication is
continuing to develop custom *reference* solvers before extending the existing
external references to spatial rotating transport. Keep the browser's small,
inspectable teaching kernels, but do not promote their conserved totals or an
offline homogeneous benchmark into device accuracy. For the current weakly
ionized argon experimental comparison, electron/neutral closures and apparatus
inputs are more relevant than replacing everything with electromagnetic PIC.

For collision-backend qualification, recommended order:

1. Extend the existing pinned WarpX adapter to a prescribed-field axisymmetric
   transport benchmark; measure raw torque, locality and collector convergence.
2. Adopt an independently checked electron-transport table workflow using
   LoKI-B++ or BOLSIG+ and identified cross-section data. It must first pass the
   physical applicability checks below; it cannot simply replace a constant
   conductivity with a fitted table.
3. Retain PETSc and upstream Julia FokkerPlanck as independent deterministic
   references with their observed positivity/entropy limitations. Stop treating
   another custom Landau implementation as the shortest route to first-order
   experimental accuracy.
4. Use PICLas DSMC/MCC or WarpX DSMC only for a demonstrated kinetic-neutral
   question. Keep fluid transport in the collisional continuum where justified.

For the active argon rotation experiment, the separate fluid/energy-closure
assessment takes priority: the present one-temperature, fixed-coefficient model
is not rescued by a better homogeneous ion–ion collision reference. The existing
`scientific/meridional-v86/NEXT-ENERGY-CLOSURE.md` already identifies BOLSIG+/LoKI
as prospective closure tools; this review does not claim they are installed.

## Actual execution paths and evidence

| Path checked | What actually runs | Evidence and remaining boundary |
| --- | --- | --- |
| `src/physics.ts` → `src/collisions.ts` | Browser Lorentz orbits plus isotropic elastic scattering against initially stationary neutrals; `1-exp(-nσvΔt)` selects at most one event per step | Valid restricted cold-bath teaching model. Constant cross section, no charge exchange, no neutral feedback in this kernel. The at-least-one probability is not a multiple-collision sampler. |
| `src/doublewell-dynamics.ts` → collision cells → `src/coulomb.ts` | Equal-weight, mixed-species random pairs; selectable Takizuka–Abe or Nanbu cumulative angular law; conserved pair energy/momentum | Own implementation of published methods. Pairing, finite occupancy and finite-step angular law differ from continuum Landau and from a species-separated external implementation. |
| Axisymmetric branch → `src/axisymmetric-collisions.ts` | Fixed full-volume annular r–z cells, velocities transformed into each ring's local cylindrical basis | Raw physical angular impulse is `(ra-rb) Δpθ`; energy and axial momentum conservation do not eliminate it. Adaptive Cartesian and fixed Cartesian branches also exist and must not share a certificate automatically. |
| `src/landau-reference.ts` | Own isotropic homogeneous Rosenbluth finite-volume candidate, exponential fitting and tridiagonal solve | No drift/anisotropy/spatial transport. Positive number transport does not ensure exact energy or physical entropy. Keep as a diagnostic/counterexample; do not expand it as the authoritative reference. |
| `scientific/warpx/` | **Executed** WarpX 26.10 Linux ARM CPU package, upstream thermalization test and nine unequal-temperature two-ion runs | Upstream temperature error 0.6785%; homogeneous collision-only adaptation turns off fields, deposition, gathering and motion. Not a spatial separator simulation. See its `REPORT.md` and explicit package lock. |
| `scientific/general3d-warpx-v17/` | **Executed** 21-case homogeneous 3V drift/anisotropy/thermal campaign, raw arrays retained | Independent moment/rate evidence; 2% precision remains unresolved. Whole-run seeds are replicates; markers/checkpoints are not independent experiments. See `docs/GENERAL3D-WARPX-V17.md`. |
| `scientific/petsc/` | **Executed** PETSc 3.26.1 upstream example plus opt-in audited exact-SI two-ion adaptation | All eight V12 cases reach 0.5 ms; initial exchange slope agrees within 0.0468%. Fine moments converge, but enlarged-domain negative tails and common-temperature entropy failures leave reference acceptance UNKNOWN. |
| `scientific/julia-fokkerplanck-v12/` | **Executed** pinned upstream nonlinear multispecies Rosenbluth branch `869e22d…` | 12/12 smoke assertions and 100/100 nonlinear success flags; observed `min(f)=-2.172e-4`. SI initial rates pass bounded gates, while negative values and common-temperature distribution drift remain. |
| `scientific/structure-preserving-v14/`, `isotropic-evolution-v16/`, `general3d-evolution-v17/` | Custom positive Gaussian-mixture Landau adapters in Julia, not an imported complete established collision backend | The reused CollisionOperators.jl component is its unchanged **generic Newton–Krylov solver**. Our unequal-mass 3V metric, smoothing, quadrature and evolution remain our scientific responsibility. V16 has a narrower successful isotropic finite-time scope; V17 full3V physical shape/rate gates remain distinct from completion. |
| `scientific/formulary/` | **Executed** pinned PlasmaPy formula/regime fixtures | Valuable unit/mass/rate checks; a formula library does not advance a self-consistent plasma. |

The live transport boundary is explicit in
[`docs/COLLISION-QUALIFICATION-V38.md`](../../docs/COLLISION-QUALIFICATION-V38.md):
66/66 planned runs completed, but 59/60 collisional runs exceed 1% unresolved
representative-time exposure and 28/60 exceed 0.1% raw angular error. The 540
numerical decisions contain 275 PASS and 265 UNKNOWN; no continuum-bias bound
exists. These are failures of qualification, not evidence all configurations
are physically wrong. None can be cured by labeling an external package SOTA.

## Reuse choices, ranked by the question they answer

### 1. Adopt more of WarpX before writing another particle engine

**Problem:** external validation stops at homogeneous velocity relaxation.
**Technical cause:** existing adapters deliberately disable movement and all
fields, so they never exercise cell crossing, orbit/collision splitting, radial
shear or collectors. Simply, testing collisions in a box of unmoving markers
does not test transport through a rotating machine.

**Fix:** use the already established adapter and pinned CPU toolchain for a
small prescribed-field rotating cylinder with collision-off controls, then add
collisions, boundaries and refinement separately. This isolates disagreement
without introducing an unnecessary electromagnetic field solve. WarpX supports
RZ Coulomb collisions with one azimuthal mode, particle-applied prescribed
fields, separate collision subcycling and cumulative angular-law selection.
These controls are already documented for 26.10; no version upgrade is required
just to investigate them. [WarpX 26.10 parameters](https://warpx.readthedocs.io/en/26.10/usage/parameters.html),
[particle-field implementation documentation](https://github.com/BLAST-WarpX/warpx/blob/development/Docs/source/usage/parameters.rst).

**Why this choice:** it reuses an executed, versioned code and attacks our missing
spatial qualification. A full new PIC installation or another homogeneous solver
would have lower diagnostic value. However, a common-frame finite-cell binary
collision still need not conserve physical angular momentum at separated radii.
Ordinary cell energy/momentum corrections are not proof of canonical-angular
conservation. Measure raw torque and its mesh/occupancy limit in both codes;
agreement between two locality-biased schemes is insufficient.

**Specific audit gap:** `scientific/warpx/run_reference.py` and V17 `run_case.py`
set `pairwisecoulomb` and fixed logΛ but do not explicitly set the cumulative
angular model. Current 26.10 documentation says the default is **Bobylev**,
whereas a browser Nanbu run selects a different finite-step law. The official
[26.10 constructor source](https://github.com/BLAST-WarpX/warpx/blob/26.10/Source/Particles/Collision/BinaryCollision/Coulomb/PairWiseCoulombCollisionFunc.H)
was also checked: it initializes `BOBYLEV` before querying the optional setting.
The actual conda package's patch/source-recipe identity still needs checking;
tag source does not prove every binary build detail. Freeze
an explicit-law/subcycle campaign rather than silently relabeling old evidence.
Convergence to the same continuum target matters more than pointwise stochastic
agreement at a finite timestep.

### 2. Adopt electron transport/chemistry tools at the closure boundary

**Problem:** a Hall-current/heavy-energy fluid calculation with prescribed
microscopic coefficients is not an electron-energy or atomic-kinetics model.
Changing the macroscopic PDE solver cannot manufacture those missing closures.
Simply, knowing total electric current does not tell us how electrons divide
their energy among heat, excitation and ionization.

**Fix:** test LoKI-B++ or BOLSIG+ on an identified argon cross-section set and
public swarm measurements; export versioned transport/rate tables with explicit
units, density, neutral temperature, field and composition domains. LoKI-B++ is
open-source GPL3, has a C++/Eigen path and an existing WebAssembly deployment;
that is stronger reuse than writing an electron Boltzmann solver in TypeScript.
BOLSIG+ independently supplies electron transport/rate coefficients from cross
sections, including optional crossed E/B fields. Both use a two-term angular
approximation and local/uniform assumptions; they are closure candidates,
not electrode/sheath or spatial discharge solvers.
[LoKI-B++ source](https://github.com/LoKI-Suite/LoKI-B-cpp),
[BOLSIG+ author description](https://www.bolsig.laplace.univ-tlse.fr/),
[original LoKI-B paper](https://doi.org/10.1088/1361-6595/ab0537).

**Why this choice:** it replaces missing atomic/electron microphysics with an
existing specialist implementation while preserving a reviewable fluid model.
Before coupling, assess magnetic anisotropy, energy-relaxation length/time,
two-term validity and discharge nonlocality. The original nonmagnetized LoKI-B
paper is not authority for arbitrary magnetized applicability. Neither tool
infers the cathode current footprint, sheath voltage or optical emissivity.
Use dataset-level provenance and redistribution terms; LXCat is a collection
of contributed data, not a universal endorsed cross section.
[LXCat retrieval, previous versions and citation rules](https://us.lxcat.net/instructions/).

### 3. Retain established deterministic references; bound custom Landau work

PETSc Landau implements the nonlinear operator in DMPlex/DMForest and TS; it is
an appropriate independent deterministic reference. Its conserved moments do
not imply pointwise positivity of our Q2 polynomial, as the retained evidence
already demonstrates. Fixing/adopting representation and entropy structure is
different from changing Newton tolerance or a timestepper name.
[PETSc Landau manual](https://petsc.org/main/manualpages/LANDAU/).

The pinned upstream [FokkerPlanck.jl](https://github.com/KineticsforTransport/FokkerPlanck.jl)
is a real reused nonlinear Coulomb solver, but remains a research package with
limited published documentation. The inspected branch and executed local
evidence, not the Julia language, establish its scope. Current upstream page was
checked; fetching the exact branch page failed, so this audit does not claim a
new branch/source comparison beyond the retained pin.

Current [CollisionOperators.jl](https://github.com/JuliaPlasma/CollisionOperators.jl)
describes a 2D particle/B-spline Landau/LB implementation with GPU options. That
is not a ready-made unlike-mass full3V replacement. Our custom positive-mixture
research was justified as an investigation of observed negative-PDF/entropy
failures, but extending it further has substantial validation cost: smoothing
bias, quadrature bias and physically correct rates remain after conservation
and discrete entropy pass. Retain its successful restricted reference scope;
do not make it the default route to macroscopic experimental agreement.

### 4. Use PICLas / DSMC when neutral kinetics actually matters

PICLas is a credible existing DSMC implementation for rarefied gas transport,
collision and wall-model studies. Its documented Fokker–Planck feature is an
ES/cubic approximation for gas-flow continuum/transitional regimes; the current
manual lists single-species gas support. It is not the required nonlinear
multispecies Coulomb Landau golden reference. Validate the selected neutral
collision and accommodation laws, geometry and Knudsen regime before reuse.
[PICLas DSMC](https://piclas.readthedocs.io/en/latest/userguide/features-and-models/DSMC.html),
[PICLas FP](https://piclas.readthedocs.io/en/latest/userguide/features-and-models/Fokker-Planck.html).
The existing WarpX stack also documents DSMC/charge-exchange options; compare
that lower-install-cost path first if it meets the specific neutral test.

### Useful alternatives, not automatic upgrades

| Candidate | Appropriate role | Why not replace our current work wholesale? |
| --- | --- | --- |
| Smilei | Independent homogeneous/cartesian Nanbu–Pérez particle check | Official 5.1 namelist still warns AM collisions are unsupported, while its unreleased changelog lists single-mode AM support. Pin a demonstrated commit before relying on that geometry; no new local execution exists. [Manual](https://smileipic.github.io/Smilei/Use/namelist.html), [changelog](https://smileipic.github.io/Smilei/Overview/releases.html). |
| Gkeyll | Eulerian full-f kinetic/sheath/transport studies when its ordering and collision closure fit | Its documented BGK/Dougherty operators are model collision operators, not the full nonlinear Landau distribution target. Conservation can coexist with different relaxation/transport. [Collision models](https://gkeyll.readthedocs.io/en/latest/dev/collision-models.html). |
| ASCOT5 | Test-particle orbit, fast-ion wall-load and prescribed-background transport reference | Its own manual states no population feedback/inter-marker interaction and a constant-source interpretation of marker weights. Those assumptions differ from an evolving two-ion pulse. [Physics/limitations](https://ascot4fusion.github.io/ascot5/physics.html). |
| PlasmaPy | SI/unit/mass/regime and collision-rate fixtures | Maxwellian population formulas assume slowly flowing Maxwellians; test-particle slowing, energy loss and pitch-angle scattering rates are different quantities. Do not substitute a single scalar frequency for the complete operator. [Formulary](https://docs.plasmapy.org/en/stable/formulary/index.html), [single-particle rates](https://docs.plasmapy.org/en/stable/api/plasmapy.formulary.collisions.frequencies.SingleParticleCollisionFrequencies.html). |

## Proof gates before migration or live qualification

Keep existing prospective tolerances; a tool migration must not weaken them.

1. **Identity:** pin source/build, constants, units, species mass/charge, collision
   law, logΛ, initialization, boundary conditions and actual step schedule. Record
   whether fields, backgrounds and neutral populations evolve or are prescribed.
2. **Controlled equivalence:** upstream smoke first; collision-off orbit/control;
   matched SI homogeneous initial rates and full moments; one change at a time.
   A changed pairing law gets an independent sampling/step study.
3. **Spatial transport:** jointly refine particles per physical cell, r/z mesh
   and dt over the full pulse. Preserve full annular volume, source inventory,
   exit ledgers, raw angular impulse and species energy/momentum accounting.
   Include orientation/face-shift controls and whole-run independent seeds.
4. **Reference scope:** deterministic PDF positivity, equilibrium and physical
   entropy remain separate from moments; particle entropy estimators need their
   own bias/resolution treatment. No shared-cell agreement substitutes for a
   justified continuum remainder or a physical encounter-domain check.
5. **Experiment:** freeze diagnostic forward model and apparatus inputs before
   held-out velocity/current comparisons. Missing electrode emission, sheath
   drop, electron temperature and neutral/atomic losses remain physical input
   uncertainty; an HPC solver cannot identify them without extra observations.

## Deployment and safety implications

Retain browser Three.js/TypeScript for rendering and bounded reduced dynamics;
use CPU Linux ARM references offline in isolated safe-dev copies. WarpX/PETSc/
MPI/CUDA workloads are not a Cloudflare static-site runtime and Apple VMs do not
provide an NVIDIA GPU. LoKI's existing WASM version makes interactive closure
exploration feasible in principle; that is a separate qualified integration and
license/distribution review, not a reason to ship an unbounded solver now.
Hash-pinned exported tables, reference trajectories and explicit validity
domains are the practical boundary between expert tools and a shareable app.

This audit ran no project tests or scientific jobs and changed no public
behavior. It does not claim live-browser verification or a new numerical result.
