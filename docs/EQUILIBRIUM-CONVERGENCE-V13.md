# Distribution equilibrium, positivity and entropy convergence, v13

Study results, 7 November 2026 UTC. Completed numerical experiments and
independent audits do not establish full physical acceptance.

The current finite-element references do not yet qualify the complete physical
distribution. Independent audits identify a representation failure that scalar
temperatures miss, and a positive-field PETSc case with increasing physical H.
The selected particle CDF diagnostics pass their frozen budgets; four seeds do
not establish all distribution properties or a smooth physical entropy theorem.
These failures do not erase the earlier bounded rate and moment checks. They
limit the stronger claim that an entire evolved PDF is admissible, converged and
entropy-consistent. Strict sign certification and a small negative-mass budget
are different requirements and are reported separately.

## Evidence and scope

The [prospective coordination plan](EQUILIBRIUM-PLAN-V13.md) separates common
5 eV PETSc, common 6 eV Julia and the existing common 5 eV particle ensembles.
They are homogeneous, field-free, fixed-Coulomb-logarithm controls, not matched
separator simulations. The original v12 cases, gates, failed outcomes and inputs
remain preserved. No production collision kernel, browser behavior or deployment
is changed by this increment.

| Study | Executed scope | Interpretation |
|---|---|---|
| Particle | Four archived WarpX runs and four verified TA recovery replays, 0–500 µs | Selected diagnostics; no smooth-PDF entropy claim |
| Julia | Twelve controlled configurations to 1 µs and a separately frozen 100 µs baseline history | Descriptive spatial/order/time/tolerance/correction sensitivities; longer endpoint checked independently |
| PETSc | Two 10 µs pilots, a full 500 µs baseline and four 100 µs sensitivities | All five main cases independently audited: 195 checkpoints / 390 actual fields |

## Julia: positive nodes already describe a negative initial field

Independent reconstruction uses the saved element bounds, actual node maps,
column-major arrays and cylindrical measure `2*pi*vperp dvperp dvparallel`.
It includes the first reflected Gauss–Radau radial element; the actual baseline
shape is 81×41×2. Independently integrated moments agree with upstream values
to about 1e−13, validating the coordinate/basis interpretation.

Every initial nodal PDF value is positive, yet quartic interpolation is negative
between nodes. At an actual parallel-velocity grid node `vparallel=0`, the heavy
species has five positive radial nodal values on `[1.5,2]` in reference units,
but the interpolant evaluates to **−4.8422e−7** near radius 1.9725. An exact-rational
sign check of the polynomial through the serialized binary64 nodes/coefficients
confirms that evaluation is strictly negative. It certifies this reconstructed
polynomial, not the continuum Maxwellian or every untested field.

![Actual positive nodes and negative interpolant](../scientific/plots-v13/julia-positivity-v13.png)

Negative mass is small but not just a floating-point node-sign artifact. On the
baseline heavy species, quadrature orders 24/32/48 give initial negative-number
fractions about **1.57–1.66e−7** and negative-energy fractions **1.52–1.60e−6**.
The sign failure is robust; these scalar fractions are not precision-converged,
so the range is more honest than many significant digits. Physical `integral
f log f` is undefined for this field even before the first advance.

At 1 µs, independently reconstructed heavy-species L1 drift divided by its fixed
initial number, using Gauss order 16, is approximately:

| Elements / degree | L1 drift |
|---|---:|
| 12×6 / p4 | 2.92e−4 |
| 20×10 / p4 baseline | 2.85e−5 |
| 32×16 / p4 | 3.18e−6 |
| 20×10 / p6 | 8.05e−7 |

Tightening nonlinear tolerance, toggling conserving corrections, changing the
box at fixed spacing, or matching initial discrete moments barely changes the
baseline drift. Analytic-Maxwellian Rosenbluth potentials do not remove the
initial discrete collision residual. Smaller timesteps increase the measured
drift, consistent with less implicit damping of the nonzero discrete operator.
This finite ladder does not establish its semidiscrete limit. The controls
support spatial representation/derivative compatibility as a dominant cause of
this equilibrium error; they do not apportion every remaining error term.
Corrections still serve their intended conservation purpose: their small effect
on this shape error does not imply they are unnecessary for conserved moments.

![Julia controlled sensitivities](../scientific/plots-v13/julia-equilibrium-v13.png)

Higher order and resolution are demonstrated improvements, not a strict
positivity fix: both refined cases retain negative evaluations. All 16 advances
in the twelve-case ladder return nonlinear success. Solver convergence and
distribution admissibility remain separate gates. The p6 control also changes
nodes and collision quadrature, so it does not isolate polynomial degree alone.

The independently audited 100 µs baseline completes all 100 nonlinear advances.
Its 10 µs PDF matches the earlier fresh control bit-for-bit. At 100 µs, order-24
reconstructed L1 drift is **3.2129e−5 / 2.4694e−4** for 40/84 u; density and total
energy remain conserved. The heavy field reaches about **−1.56e−6 between nodes**,
with negative-number/energy fractions approximately **1.19e−6 / 1.16e−5**.
These are order-24 diagnostics with remaining quadrature sensitivity, not exact
negative-mass values. Its nodal minimum is much smaller in magnitude, illustrating
why nodal and reconstructed diagnostics must stay distinct.

The first 100 µs attempt was stopped by its frozen 60-second watchdog after 72
successful advances. That resource FAIL is retained. A separately reviewed,
prospectively frozen 180-second completion run used unchanged physics and
completed in 92.98 seconds below the same 1.5 GiB RSS cap. The earlier 1 GiB pilot
resource failure is likewise preserved. No physical gate was relaxed to obtain
these completed arrays.

Producer evidence: [JULIA-EQUILIBRIUM-V13.md](JULIA-EQUILIBRIUM-V13.md).
Independent full-array reconstruction and control audit:
[JULIA-EQUILIBRIUM-INDEPENDENT-V13.md](JULIA-EQUILIBRIUM-INDEPENDENT-V13.md).

## PETSc: entropy error is not solely a plotting or negative-tail issue

The operator, initialization, Q2 basis and collision quadrature remain unchanged.
The producer evaluates identical saved fields at Gauss orders 3/8/16/32. A separate
standard-library reviewer reconstructs actual closures, checks moments and uses
exact-rational Bernstein bounds or explicit negative witnesses for the serialized
cell polynomials. Unresolved subdivision would remain UNKNOWN.

The mesh-12 pilot starts with all 288 cells of each species certified nonnegative.
Evolution creates 34 negative cell occurrences across the next two checkpoints;
the positive-part H proxy cannot be interpreted as physical H there. Its first
rise is larger at resolved quadrature than at the original order 3, rejecting an
under-integration-only explanation for the proxy increase.

The mesh-16 pilot is more decisive: **all six fields, 512 cells each, are certified
nonnegative**, with no negative or unresolved cells. Its reconstructed order-32
H increases by **7.9147e−8** and **2.6676e−8 per initial total particle** over the
two 5 µs advances, exceeding the frozen v13 per-particle budget of 1e−8.
Each endpoint's independently measured H32−H16 discrepancy is 4.44e−15 per
initial total particle, far below that signal; this is empirical quadrature
resolution, not a rigorous analytic integration-error bound. Reconstructed
species-number changes are zero at these checkpoints, so the fixed physical
reference factor contributes no measured entropy-change correction. Positivity
failure cannot explain this positive-field entropy result. A separately frozen
finite-step slope study and matched nonlinear-solver control test this further.

The independent main audit checks **all 195 checkpoints / 390 fields**, including
native-vector membership, chronology, frozen source/setup/coefficients, geometry,
polynomial moments and H3. It finds no unresolved sign certificates. The fine
mesh-16 case has **all 42 fields certified nonnegative at all 21 saved times to
100 µs**, while retaining the entropy-budget failure. Baseline and both timestep
variants have explicit negative regions at some states; full H is not used for
their signed fields. The coarse mesh has a resolved large sign failure and
under-resolved nonlinear quadrature.
Across these main cases, independently reconstructed maximum number, total
energy and momentum residuals are about **1.33e−15, 3.38e−13 and 8.86e−16**
on their declared positive normalizations. Those conserved quantities can be
excellent while the distribution and entropy gates fail.

The full 500 µs baseline completes 101 saved states in 725.82 solver seconds,
with every state evaluated at orders 3/8/16/32. Its maximum L1 drift is
**6.56e−4**, within the frozen 1e−3 stationarity budget; this diagnostic pass is
not full equilibrium acceptance. Its H+ cumulative rise is **1.84e−6 per initial
total particle**; physical H requires state-specific positivity checks.

At the shared 100 µs horizon, the fine mesh-16 versus mesh-12 **evolution-increment**
L1 difference reaches **4.22e−4**, above the frozen 2e−4 spatial budget. Raw initial
projection differences are reported separately; this increment comparison has
order-16→32 sensitivity about 4.46e−8, so the spatial budget failure is resolved.
Timestep comparisons reach only
**3.86e−6** (10 versus 5 µs) and **1.97e−6** (2.5 versus 5 µs), within that short
comparison budget. These shorter tests do not qualify the 500 µs spatial or
timestep error. The coarse mesh-8 H16→H32 discrepancy is about **3.66e−7** per
particle, failing the 2e−10 diagnostic-resolution gate; finer cases resolve this
particular quadrature diagnostic. A coarse unresolved entropy integral is not
silently treated as a reliable thermodynamic verdict.
The coarse mesh-8 species-1 increment comparison at 100 µs also misses the L1
quadrature-resolution budget and remains UNKNOWN, rather than being promoted
to a resolved failure merely from its large sampled discrepancy.

The separately frozen one-step entropy study retains the same mesh-16 initial
field/native-vector bytes. At steps 1 / 0.1 / 0.01 µs, measured stable H32
increments divided by fixed initial number and timestep are approximately
**+0.03424 / +0.04008 / +0.03765 s−1**. Direct coefficient differences and
`log1p` avoid subtracting two nearly equal total entropies. These are finite-step
slopes over different short horizons, not a common-horizon convergence proof.
The separate reviewer certifies **all 16 endpoint species-fields** across the
three steps and matched strict control as nonnegative, and verifies the frozen
plan, initial bytes, native vectors, runtime sources and configuration identities.
Its independently computed H32 increments agree with the producer; stable
order-16→32 discrepancies are approximately 1e−19–1e−21 per particle, while
aggregate direct-subtraction sensitivity is at most 1.90e−16. These are numerical
cross-checks, not rigorous total quadrature-error bounds.
Shrinking a step can make its absolute H increment small while a positive
production rate persists; adjacent-increment budgets alone would miss that.

The nonlinear stopping criterion was tested explicitly. Default 1 µs stopped
on relative step size at function norm 5.21e−14, above its relative residual
target. A separately frozen matched control disables step-size stopping and
uses `rtol=1e−13`, `atol=1e−14`, and at most 50 iterations. It converges on absolute
function norm **2.11e−15** at iteration six. Its H32 increment remains
**3.42448e−8 per initial particle**, changing by only **9.66e−16**; final PDF L1
differences are about **2.12e−15 / 2.68e−15**. Extra Newton accuracy therefore
does not remove this entropy defect in the matched case. This is controlled
numerical evidence, not a general rigorous residual-to-H bound.

Projection of a Maxwellian into a polynomial space explains why the represented
initial state need not be exactly stationary. That alone does not explain an H
increase: the continuum Landau operator dissipates H for a general admissible
distribution. Separating the spatial collision algebra from the time advance
therefore requires additional evidence, not an assumed time-stepper fix.
More precisely, exact backward Euler cannot increase a convex H if its
semidiscrete ODE dissipates that same H: convexity bounds its change by
`dt * grad(H)(f1) dot C_h(f1)`. Thus the positive-field rise implicates the
semidiscrete entropy structure and/or numerical solve error, rather than generic
backward-Euler truncation alone. The saved nonlinear norms do not by themselves
provide a rigorous residual-to-entropy error bound.

## Particle equilibrium: useful evidence with finite-run uncertainty

Four TA recovery replays start from the exact archived arrays and use the actual
production kernel and RNG. Every archived checkpoint moment must match before
the new arrays are accepted. All four match. This restores missing evidence;
replacing the arrays by fitted Gaussians would assume the desired shape.

At noninitial checkpoints, nominal diagnostics give **189 PASS / 3 UNKNOWN /
0 FAIL** and paired changes **175 PASS / 17 UNKNOWN / 0 FAIL**. All selected
speed/component CDF intervals meet the prospective .05 budget. Fourth-moment
and component-change intervals remain underpowered with four whole-run seeds.
Overlapping observables are not independent experiments, and pointwise intervals
do not have simultaneous coverage.

![Particle equilibrium CDF diagnostics](../scientific/plots-v13/particle-equilibrium-v13.png)

Positive-weight empirical particles have no directly usable smooth differential
H. A histogram/KDE would introduce a distinct regularization, so this study does
not manufacture an entropy verdict from marker positivity or stable temperature.
Details and frozen source/input identities:
[PARTICLE-EQUILIBRIUM-V13.md](PARTICLE-EQUILIBRIUM-V13.md).

## Fixes and justified next implementation

**Distribution admissibility.** Technically, a nodal Lagrange basis is not a
nonnegative basis: positive coefficients do not bound the interpolating field.
In simple terms, a smooth curve can dip below zero between positive grid points.
The implemented diagnostic fix reconstructs actual elements, saves negative
number/energy and L1 drift, and withholds physical H on a negative field.
Exact sign witnesses and polynomial certificates replace node-only assurances.
This addresses the demonstrated blind spot; clipping would change inventories,
energy and the collision dynamics while hiding the evidence.

**Equilibrium drift.** A few conserved moments do not make a projected Maxwellian
an exact null vector of the discrete operator. In simple terms, the totals can
stay right while the shape moves. The controlled mesh/order ladder identifies
the useful improvement and rules against merely tightening Newton tolerance as
the main remedy here. It does not justify subtracting `C[M]` or freezing the
initial state, which could force one control to pass while corrupting other PDFs.

**Entropy diagnostics.** `F log F` and absolute/negative-part integrals are not
polynomials. Reusing moment quadrature can miss their features. Same-field
quadrature refinement fixes that diagnostic ambiguity without altering the
operator being tested. H+, signed-log-absolute functionals and physical H are
labeled separately; changes use fixed initial number. Both endpoints of selected
worst adjacent increments must be independently rechecked, rather than assuming
the worst order-3 step is also the worst order-32 step.

**Evidence membership.** The producer's original raw verifier required the
sealed files to be present but allowed an extra stale checkpoint. In simple
terms, old data could remain beside a supposedly complete run. The corrected
verifier requires exact raw membership, with explicitly identified derived files
kept separate. Mutation, extra-checkpoint and one-bit identity regressions enforce
the real evidence boundary. Dropping unknown files or silently accepting a subset
would hide the stale-data problem.

**Failure propagation and runtime linking.** The Julia watchdog initially saved
failure metadata without setting the process exit code. The fix preserves the
evidence and returns nonzero on child failure, cutoff or incomplete output; three
regressions cover clean success, exit 7 and a watchdog cutoff. Otherwise automation
could call an interrupted run successful. PETSc's first wrapper launch instead
failed before dynamics because cached pkg-config retained the removed project-local
library path. Linking the disjoint wrapper to the existing immutable guest library
fixes the demonstrated path error without altering the Landau operator or rebuilding
the scientific environment. Both failed attempts remain preserved.

**A physical method change remains a separate reviewable stage.** A compatible
exponential-Galerkin representation `f=exp(g)`, collision metric/null space and
discrete-gradient time advance is a coherent published route to positivity,
Maxwellian equilibria and an H theorem. The inspected theory is single-species;
an unlike-ion implementation needs its own derivation and qualification. A log
variable substitution or time-stepper option alone does not supply that algebra.
Existing regularized particle alternatives also need physical 3V, species mass/
charge normalization and smoothing refinement. The new pinned Julia candidate
is Cartesian 2V/single-population and does not currently supply these properties.
See the [primary-source method and implementation review](ENTROPY-METHOD-OPTIONS-V13.md).

The next corrective implementation should therefore be split at the physical
method boundary. First qualify an unmodified existing structure-preserving
implementation against its own published homogeneous benchmarks. Then derive
and test the unequal-mass, physical-3V two-ion normalization and collision
bracket, including exact invariant null spaces. Only then repeat these frozen
equilibrium, positivity, H, non-equilibrium rate and resolution gates before
coupling that backend to separator transport. The inspected maintained Julia
particle code is a useful starting comparison, but its 2V single-population
scope and entropy regularization prevent treating it as a drop-in solution.
This is broader solver work requiring separate reviewable changes, not a
justified local patch to the current collision coefficient.

## Independent review and software gate

Separate agents produce and audit the PETSc and Julia studies; a third
[cross-audit](EQUILIBRIUM-CROSS-AUDIT-V13.md) checks definitions, source identity
and review coverage. The failed physical gates remain failures after the raw
artifact, regression and transfer checks; successful software checks cannot
override them. Selected independent dense checks are not described as an
every-state independent H32 recomputation.

The root application software gate already passes **262 tests**, configured
typecheck, production build and static-site check. Exact commands, tested copied
snapshot identity, exported full logs and their checked hashes are in
[scientific/verification-v13](../scientific/verification-v13/README.md).
The existing large renderer-chunk warning remains. These checks do not establish
physical convergence, a validated rotating separator or live browser/GPU QA.

All computation and test execution uses Apple safe-dev VMs. Host operations
assemble/read/hash reviewed source and exported artifacts and inspect images.
Source is copied, explicitly synchronized and hashed; valuable results are
exported and actual host bytes checked before replacing any guest source.

| Executed check | Result |
|---|---|
| PETSc producer `/work/home/petsc-equilibrium-analysis-v13/bin/python -m unittest test_analysis -v` | 13 regressions pass, including actual exported data and stale/modified evidence |
| PETSc independent `python3 -m unittest -v test_diagnostics` | 17 regressions pass; separate actual-field audits cover 195 main checkpoints, eight cross-mesh/species comparisons and four slope/solver-control cases |
| Julia independent `python3 -m unittest -v test_diagnostics.py` | 16 regressions pass, including serialized-polynomial negative sign |
| Julia watchdog `python3 test_watchdog.py` | 3 regressions pass: success, child failure and cutoff |
| Particle `python3 -m unittest discover -s scientific/particle-equilibrium-v13 -v` and standalone strict TypeScript graph | 7 tests pass; strict compile exits 0 |
| Root `npm test` | 262 tests pass, 0 failed/skipped |
| Root `npm run typecheck`, `npm run build`, `npm run check:site` | All exit 0 |

The PETSc independent report records its current-source regression suite and
separate raw-field, cross-mesh and stable-increment checks. A test count is
software evidence, not a replacement for those physical gates.

The final PETSc producer export has 1,535 SHA256-listed records. The parent
independently checks every exported record against the manifest and compares
the exported package with the authoritative copy; the only extra authoritative
paths are preserved earlier launch diagnostics and pilot-transfer evidence.
The Julia independent export likewise matches its authoritative copy and all
112 listed file hashes. The final PETSc independent export passes all **1,548**
manifest-listed file hashes; its current source, report, accepted outputs, final
manifest and closeout-test log match their authoritative copies. The final
review manifest SHA256 is
`5dec0d4c150cbfc79e37ade21ac573a7a26132e320d52242cc4d0c3957aba565`.
Full commands, input/source identities, regressions and
artifact locations are in the individual producer/reviewer reports.

Review boundaries remain explicit even without a Git repository or PR. PETSc's
producer package is 658 non-test lines; the Julia producer and reviewer packages
are 626 and 682. PETSc's independent package is larger (822 non-test lines), so
it should be reviewed as three dependent, single-purpose changes: polynomial
certification/moment primitives (247), raw case/identity/comparison auditing
(379), and stable entropy/slope/solver-control auditing (196). Each fits the
700-line non-test limit. This documentation does not claim that a single PR
containing the whole reviewer package would meet that requirement.
