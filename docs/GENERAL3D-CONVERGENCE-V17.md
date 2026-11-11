# General 3D collisions: drift, anisotropy and convergence, v17

7 November 2026 UTC. The general three-velocity-dimensional backend and all
17 planned Julia trajectories and their independent entropy/distribution studies
are complete. The backend remains physically unqualified: distribution, rotation
and rate convergence fail, and most physical-entropy decisions remain unresolved.
The separately frozen 21-run WarpX comparison has unresolved rate precision. This is
offline scientific work; the browser runtime and deployment are unchanged.

## What changes from the radial backend

The v16 angular reduction is exact only for rotationally invariant, zero-drift
distributions. Relative flow, rotated anisotropy and their coupling require
three-component velocities. The new backend evolves every exported 3D marker
freely. It assumes spatial homogeneity and absent fields/sources/losses, not a
Maxwellian, radial distribution or Cartesian product during evolution.

The v14 execution path repeats global Cartesian-grid entropy integration and
all-pairs mobility inside each nonlinear residual. Its O(N q³ + N²) cost becomes
prohibitive when marker count and velocity-grid resolution are both refined.
In plain terms, every implicit iteration rebuilds a large three-dimensional
integral over mostly empty space.

The new type-I Gaussian-mixture entropy uses particle-centered positive Gaussian
quadrature: H_Q = Σ_i w_i Σ_a ω_a log F_s(v_i + sqrt(ε_s) ξ_a).
The cost is O(N² p), with p quadrature points per marker. It removes the global
box grid and its truncation without claiming that direct pairs or narrow-width
particle resolution have become cheap. The unchanged MIT Newton–Krylov solver
is reused from the pinned CollisionOperators.jl source; the new 3D entropy
adapter is separately derived and tested.

This is a reviewable extension of the already audited pair/discrete-gradient
method. A different velocity PDE or accelerated particle method would need new
positivity, conservation and physical-entropy qualification. Merely changing
language or loosening a nonlinear tolerance cannot resolve the observed costs
or a poorly represented PDF. [Prospective plan](GENERAL3D-PLAN-V17.md).

## Correct finite-rule derivatives and stable increments

Moving quadrature points contribute to the entropy derivative, alongside motion
of every Gaussian mixture center. The extra term vanishes only under exact
full-space integration; dropping it at finite quadrature differentiates a
different scalar. In simple terms, both the sampled curve and the sample locations
move. The implementation includes both terms as a paired gradient scatter.
An independent finite-difference fixture has error 2.29e-13 with both terms;
omitting the term has error about .06795.

The unequal-mass Coulomb pair projection retains its momentum and quadratic-
energy null spaces and positive semidefiniteness. Weighted Gonzalez correction
uses sqrt(W)-scaled velocity coordinates, removing explicit inverse individual
tail-weight amplification without claiming uniformly bounded conditioning.
Finite H_Q dissipation still requires a solved implicit equation and does not
prove that the physical full-space H of the represented PDF decreases.
Here H is the Boltzmann functional Σ_s ∫ F_s log F_s. Thermodynamic entropy
has the opposite sign at fixed normalization: a falling H means entropy
production. The entropy plots use this H convention.

A full-callsite regression reproduced cancellation when a 1e-20-weight component
had a huge density ratio but the total mixture changed slightly. Endpoint-log
subtraction lost 2.1253% of that tiny entropy increment. Common endpoint scaling,
bounded signed component differences and a small-total-change log1p expression
reduce the relative discrepancy to 3.04e-14 against a 256-bit reference.
This preserves small changes without clipping density or rejecting valid trials.

Rotated covariance construction also exposed a domain-classification issue:
floating-point products of symmetric factors are not bitwise symmetric. The
positive-definiteness check now uses the intended symmetric covariance rather
than rejecting roundoff antisymmetry. It does not change eigenvalues to make an
inadmissible tensor pass. The initializer declares its principal-axis Gaussian
quadrature and exports actual means, factors and tensors; evolved distributions
are never refitted or projected to those initial tensors.

## Demonstrated performance defect

The largest initial pilot took 82.49 seconds for one 1 µs step, although a full
entropy gradient took only .339 seconds. Profiling isolated about 4.43 seconds
and 11,552,843,160 allocated bytes per entropy-increment call. Julia's inference
diagnostic identified boxed captured variables and an Any result: two endpoint
sum generators captured reassigned peak values.

In simple terms, a short numerical loop had accidentally become allocation-heavy
dynamic code. Replacing those two closures with explicit loops addresses that
measured cause without changing the physical model or adding another solver.
The allocation/inference regressions pass. At n4/q3, allocation drops from
39,436,344 to 10,168 bytes per increment call, and inference returns Float64.
All seven retained pilot entropy increments and next-state arrays are identical
before and after the fix. The same n8/q5 step drops from 82.49 to 13.17 seconds,
with the same 14 residual evaluations. These are same-input measured comparisons,
not a claim of uniform scaling. Final campaign costs are recorded below.

The actual CLI also discarded the attempted state when a nonlinear solve failed:
it raised before writing the step, and its failure record kept only the accepted
prefix. That made a failed root difficult to diagnose. A forced two-evaluation
regression reproduces the missing evidence. Failed attempts now retain their
trial velocities, residual vector, solver status and attempted time separately
from accepted history. An exception before a trial exists records that exception
with a null attempt. This preserves the acceptance rule and the original failure,
rather than accepting a bad step. Stale-output regressions verify that earlier
metadata, histories, summaries and failures are never overwritten.

## Independent physics references and initial resolution

Independent code derives initial drift vectors and all six independent pressure-
temperature tensor components from the physical Landau weak moments. Gaussian
references use a one-dimensional Laplace integral and a separate polar check.
Actual exported Gaussian mixtures have closed-form pair moments, so their
physical rates can be evaluated independently of the producer entropy or ODE.
This separates nominal input shape, smoothing and particle-operator errors.
[Mathematical derivations and evidence](GENERAL3D-MATH-V17.md).

The initial input matrix already demonstrates a representation limit. Correct
density, mean and covariance do not make a small Gauss–Hermite mixture a resolved
Maxwellian. Characteristic-function lower bounds prove large full3D PDF shape
errors for the hot species. These are real lower witnesses, not full-PDF passes
inferred from a marginal. Reducing smoothing at fixed count can worsen them.
The main campaign must retain these controls rather than relabel the largest
affordable count as a converged continuum solution.

The actual initial ODE rates reveal a separate approximation error. At n8/q5,
the combined-case drift-vector error is 41.64% against the nominal physical
Gaussian and 41.08% against the actual mixture's physical Landau rate. Thus
initial-shape error alone is insufficient. A frozen same-state cubature probe
through q17 changes the drift vector by only about 1.5% from q5, leaving the
large physical deficit. Greater particle resolution and the regularization
limit remain necessary; selecting a convenient quadrature order cannot repair
the finite model. The original physical reference and 2% budget are unchanged.

The independent q17 check differs from an initial-only full-space finite-marker
force by just .0077% in drift. The full-space reference itself is converged
through order 1024. This isolates entropy cubature as small for that state;
it does not isolate all remaining marker and regularization contributions from
one another. The underlying finite model still needs a joint particle/width
limit. [Sealed independent evidence](../scientific/general3d-math-v17/closed-seal.json).

A separate common-temperature control uses alpha .5 with the same physical
5 eV target and explicitly compensated marker covariance. Independent integration
gives a full-3D initial L1 upper estimate of 4.706e-4 for each species, below
the original 1e-3 budget, with 1.90e-12 sensitivity. The bound includes the
serialized weight-factorization defect and all three marginal contributions;
it is not a full-PDF pass inferred from one marginal. This better-resolved
equilibrium control and its boost do not qualify the narrow-width drifting or
anisotropic family. The coarse equilibrium negative control remains in the plan.

One prospectively fixed antithetic Sobol spacing control uses seed 1701 and
512 equally weighted markers per species, without whitening or moment fitting.
Its q9 nominal drift-rate error improves to 9.528%, but its light/heavy tensor
errors are 37.744%/32.930%; the heavy tensor becomes worse than the GH control.
Against its actual smooth-mixture physical reference, the errors are
13.652%/37.784%/29.224%. All fail the unchanged 2% gates. Actual tensor input
biases are .437%/1.642%, so exact nominal covariance is not assumed.
The static spacing control is retained; it was not promoted to a replacement
evolving family on the strength of one improved observable. This shows a
representation tradeoff, not a qualified cure for general 3D convergence.
[Separate physical references](../scientific/general3d-math-extension-v17/sobol-physical-results.json).

The finite-time auditor also independently reconstructs initial ODE rates from
all 17 actual raw inputs. Every evaluated nonzero nominal-Gaussian and actual-
mixture physical 2% vector/tensor comparison FAILS; symmetry-zero references
remain absolute-only, and regularized-target comparisons do not count as
physical passes. All 17 complete case-audit rate dictionaries agree exactly with
this direct reconstruction. The original direct artifact retains its historical
nine-complete/eight-pending fields; a separate final cross-check records all 17
exact matches without rewriting that evidence. The parent verified both actual
exported artifacts. The original direct artifact has SHA256
`5cf1de5bbdb09858006a6f469b3c7c8482595fec1b6b3d57858432463f871871`.
[Direct initial-rate evidence](../scientific/general3d-review-v17/results/direct-initial-rates.json).
[Final 17-case identity check](../scientific/general3d-review-v17/results/rate-dictionary-crosscheck.json).

Near equilibrium, relative rate errors need their absolute scale. The broad q5
control has light scalar temperature rate −.284719075 eV/s, while its actual
mixture's physical Landau rate is −.229218751 eV/s. The full-tensor relative error
is 24.213%, with absolute Frobenius error .0961294 eV/s against reference magnitude
.397019 eV/s. The separate full-space finite-marker ODE rate is only
−.004322842 eV/s. These are three different targets: finite cubature can cancel
part of another approximation error. A nearly stationary control or a closer
single observable does not qualify its physical collision operator.

The separately evaluated ideal regularized-Gaussian limit at alpha .1 differs
from the physical Gaussian by 14.055% in drift and 37.177%/28.107% in the
light/heavy full tensor. Thus this width cannot deliver the physical 2% rates
merely by improving marker integration. The Sobol light tensor agrees with
that different regularized target to 1.533%, while missing the physical target
by 37.744%. Conversely, a coarse GH heavy-tensor rate can look closer to the
physical target through cancellation of finite-marker and smoothing errors.
The signed vector/matrix decomposition is retained; scalar error norms are not
subtracted to assign causal percentages.
[Pinned bias calculation](../scientific/general3d-math-extension-v17/regularization-bias-results.json)
and [derivation/report](GENERAL3D-MATH-EXTENSION-V17.md).

For the nominal drifting 2/10 eV setup, relative bulk kinetic energy raises the
eventual common temperature to 6.23680556 eV. Total bulk plus thermal energy,
the full momentum vector and all pressure components are checked separately;
opposite scalar heating rates are not expected while bulk flow becomes heat.

## Established-code cross-check

The existing isolated WarpX 26.10 installation supports full 3V velocities in a
homogeneous one-cell spatial setup. A bounded combined drift/anisotropy pilot
with 16,384 particles per species reaches 100 µs in .81 seconds process time,
with zero fields and unchanged inventories. A separately frozen multi-seed,
particle-count and timestep campaign supplies physical-moment cross-checks.
Its raw endpoint velocities, complete tensors and seed-level uncertainty are
separate evidence from deterministic Gaussian-mixture H_Q.

All 21 frozen main WarpX runs complete in 326.30 seconds summed wall time,
with sampled peak RSS below 236 MiB. Independent raw-array reconstruction
checks all 88 species snapshots and 132 joint histograms. Number is constant;
relative energy and positive-scale momentum defects are at most 4.41e-13 and
6.74e-15. The separate collision-off control preserves velocities exactly.

| Fine WarpX input | Drift-vector point error | Light full-tensor point error | Heavy full-tensor point error |
| --- | ---: | ---: | ---: |
| Thermal | Zero reference | 3.40% | 4.72% |
| Drift | 4.95% | 3.61% | 6.58% |
| Anisotropy | Zero reference | 2.28% | 4.27% |
| Combined | 4.07% | 2.80% | 6.65% |

All 20 nonzero rate families remain **UNRESOLVED**, not accepted at 2%.
These are three-run mean errors at 262,144 particles per species and .25 µs
steps. For example, the combined light tensor's 2.80% mean error accompanies
a 56.55% simultaneous sampling radius and a 34.10% fit-window upper contribution.
Three replicates give only two degrees of freedom; the conservative simultaneous
Student-t multiplier is 18.9341 for a tensor family. A small average error can
therefore coexist with a wide uncertainty bound. Particle/time rate controls
also remain unresolved. More particles or pooled checkpoints do not substitute
for independent run-level uncertainty control.

Stochastic-law entropy dissipation does not imply monotone entropy of each
realized finite-sample KDE. Three whole-run seeds are not thousands of independent
particle trials. Statistical uncertainty, initial-slope fit-window sensitivity
and finite timestep must be resolved before any 2% physical-rate acceptance.
[WarpX study](GENERAL3D-WARPX-V17.md).
[Actual-data uncertainty figure](../scientific/general3d-warpx-v17/moment-uncertainty.svg).
The parent verified all 164 sealed WarpX members, exact membership and byte-
identical exported/canonical copies; seal SHA256 is
`66ebff487c5350e9117122bfea8b2c92b4030f03ef8de7e304df919dff294b2f`.

The source reviewer also examined MIT SBM author code for a recent O(N) stochastic
method. Its shipped 3V example skips sufficiently close collisions and needs
sampler and unlike-mass work. It is useful source material, not an unmodified
Coulomb oracle. [Primary-source and tool review](GENERAL3D-TOOLS-V17.md).

## Acceptance and completion status

The independent audit covers all **17 cases and 617 saved states**, with **51
selected complete-equation replays** of the 600 accepted steps. Number, energy,
momentum, positive continuous PDFs and selected equation replays pass. These
checks establish consistency of the finite model, not its continuum accuracy.

| Independently reconstructed quantity | Largest observed defect |
| --- | ---: |
| Relative total energy | 9.526e-14 |
| Momentum / positive initial scale | 4.593e-15 |
| Selected complete-equation residual | 4.361e-13 |
| Discrete-gradient chain-rule residual | 2.776e-17 |
| Finite H_Q balance residual | 1.227e-14 |

Physical-H integration has **217 state PASS and 400 UNKNOWN** decisions. The
case-level H-increase budget gives **two PASS and 15 UNKNOWN**. Both passes are
the broad common-temperature controls, whose estimated H rises by about
4.442e-9 per initial particle within the original 1e-8 allowance. Their H_Q
decreases. Thus a tolerance pass does not establish monotone physical H.

A separately planned posthoc endpoint check forces order 13 for the broad base
case. It confirms an estimated physical-H change of **+4.441512935e-9/N**, against
a q9/q13 numerical-sensitivity envelope of **6.280633843e-13/N**. That envelope
is not an interval certificate. The supplement strengthens the evidence for the
small positive estimate; it changes neither the original gates nor the 17-case
decisions. [Sign check, exact commands and source pins](GENERAL3D-ENTROPY-SIGN-V17.md).

Both broad common controls pass all 202 species/time stationarity checks each,
**404 PASS total**, with maximum full-3D L1 upper estimate 4.2421e-4 under the
1e-3 budget. The coarse common negative control instead has 189 FAIL, 11 UNKNOWN
and two PASS cells; its case fails. Stationarity of a broad mixture does not
qualify drift or anisotropy relaxation.

[Actual means and all pressure-tensor components](../scientific/general3d-review-v17/figures/drift-and-full-pressure-tensor.png),
[full-3D refinement matrix](../scientific/general3d-review-v17/figures/full3d-refinement-gates.png),
and [boost/rotation matrix](../scientific/general3d-review-v17/figures/full3d-symmetry-gates.png)
plot actual exported data. [Independent metrics](../scientific/general3d-review-v17/results/metrics-summary.json).

The [physical H versus finite H_Q figure](../scientific/general3d-presentation-v17/figures/entropy-physical-vs-discrete.png)
explicitly labels the H-rise budget and Boltzmann sign convention. Its separate
presentation source changes exactly two strings; all numerical inputs are
unchanged and its other two plots reproduce the main PNGs byte for byte. This
corrects the ambiguous original title "physical H PASS" while preserving the
closed main evidence. All 38 supplement members, exact membership and actual
export/canonical identities pass the parent's hash checks; seal
`1f37aa91f6a5cbd780c4f0e6fa62d72e821cd1c608d04ae9c9d93b3ce3b87dd4`.
[Presentation sources, diff and rendering evidence](../scientific/general3d-presentation-v17/README.md).

The completed independent full-3D PDF study does **not** establish convergence.
Its eight evolution-increment comparisons at 50/100 µs yield 32 species/time
records: **30 FAIL, two UNKNOWN, zero PASS** under the original 2e-4 L1 budget.
Twenty-eight failures have characteristic-function lower witnesses, including
both particle pairs, both width pairs and all entropy-cubature pairs. These
are lower bounds on the complete signed four-PDF increment difference, not
values of its L1 integral or comparisons of initial shape alone.

The narrow-width 5→2.5 µs timestep pair also remains unqualified. The heavy-species
full-3D QMC estimates are 2.9833e-4 and 2.2392e-4 at 50/100 µs, with respective
diagnostic uncertainty/sensitivity estimates 6.30e-7 and 4.49e-7: both FAIL.
The light-species estimates are about 5.3722e-4 and 6.0399e-4, but sensitivity
2.44e-6/2.51e-6 exceeds the original 1e-6 diagnostic budget, so both remain
UNKNOWN. The apparently clear point-estimate separation does not override that
frozen prerequisite. QMC uncertainty is empirical, not an interval certificate.

The four symmetry pairs supply 18 species/time records: **10 boost PASS** by
exact coupling upper bounds and **eight rotation FAIL** by full-3D lower
witnesses. Both q5 and q9 fixed-laboratory rotation controls fail. Thus Galilean
behavior is resolved for these controls, while rotational error is not resolved
at the tested cubature. Initial and final coordinate-rounding/covariance
allowances are included; no co-rotation of the producer cubature was used to
make the symmetry test pass.

The unchanged scripts complete in 314.93 seconds for the eight PDF comparisons
and 1.90 seconds for symmetry; maximum recorded process RSS is 281104 KiB.
[Raw results and exact execution](../scientific/general3d-pdf-execution-v17/README.md).
The parent checked all 298 sealed members, exact membership and every copied
export/canonical byte; the seal SHA256 is
`e1943bc87a2e7217d9c55740c8d89c726d7994be21559f80366a74641d687c35`.

Parallel execution introduced a real provenance boundary: imported reports must
match the assigned cases, actual numerical sources, physical input seal, plans,
runtime and executed commands before aggregation. Separate orchestration checks
validate every sealed member and all report identities before copying anything;
they reject stale or duplicate evidence rather than overwriting it. Frozen
numerical modules and physical acceptance rules are unchanged.

The actual exported runtime log exposed a parser bug. NumPy writes an unbuffered
warning to stderr before Python flushes its version JSON to stdout; both streams
are retained together. The first line is therefore a warning, not the version
record. The importer now requires exactly one JSON object with the expected
runtime schema and verifies its pinned values. This fixes the reader while
preserving the actual sealed log, rather than editing evidence or rerunning a
scientific command just to reorder its output. The original first-line parse
failure is retained. Eight isolated regressions pass, including warning order,
stale source/input/plan/case identities, duplicate/nonfinite JSON and changed
membership; ingestion of the actual closed PDF packet also passes.
The parent verified all 320 members, exact membership and copied bytes of the
[separate ingestion-check results](../scientific/general3d-ingestion-validation-v17/validation-results.json),
seal `86d6b10e74b8f5e05912210266b7620ebfc3c30f135a56398d819711fff347c0`.

The [independent prospective contract](GENERAL3D-AUDIT-V17.md) preserves all
original physical H, number/energy/momentum, full3D L1 and initial-rate gates.
New nonzero drift-vector and pressure-tensor rates use separately normalized
2% Euclidean/Frobenius comparisons; zero reference components are not relative
denominators. Full3D L1 upper bounds can establish PASS; lower witnesses can
establish FAIL. Unresolved numerical integration or missing histories remain
UNKNOWN. Refinement differences are not exact continuum error certificates.

All scientific code, installation, tests and studies execute in Apple safe-dev
VMs with explicitly copied sources. The unchanged application gate passes all
262 tests, typecheck, build and site checks; its exact 243-file source map agrees
with current host inputs. [Exact commands and exported logs](../scientific/verification-v17/README.md).

The frozen numerical snapshot passes 54 core assertions, two 256-bit increment
assertions, two allocation/inference assertions and four actual CLI/campaign
tests. Post-run transform checks add 38 Julia assertions and two actual wall/RSS
termination tests: **96 Julia assertions and six Python tests** pass in total.
Independent mathematics passes seven original fixtures and three followup tests;
the WarpX reference passes nine unit/regression checks. The finite-time diagnostic
suite passes **29 frozen numerical tests and eight orchestration tests**, and all
final Python sources compile. These are separate from the producer tests.

The parent independently verified all 175 members of the closed mathematical
packet, its exact membership and the exported/canonical byte identities; the
self-excluded seal is `31de487b64cea15424ce8111d340190bbbbfed95ae026ca76c7084b48b265563`.
It also rechecked every member of the prior v16 main (139), stability (86) and
review (423) maps: no changed bytes, and all three seal identities are unchanged.
Preserving those results does not transfer isotropic qualification to full 3V.

All 17 Julia histories complete: 600 accepted steps and 617 saved states, including
three 500 µs common-temperature controls. No solver or wall/RSS failure occurred.
The parent independently verified every one of the 235 actual main-export member
hashes, exact membership (236 files including the seal), and byte-identical
canonical history/check copies. Main input seal SHA256 is
`71eeaa26ee21a571824a7db852a7ec9052ea56cbdec8911135fae53e85cc42f0`.
The mathematical reviewer separately computed physical references directly from
all 17 actual serialized initial states, binding metadata/history/source hashes.

| Actual trajectory | Duration | Case wall time |
| --- | ---: | ---: |
| Combined n8/q5, alpha .1 | 100 µs | 304.81 s |
| Combined n8/q5, alpha .05, dt 2.5 µs | 100 µs | 561.04 s |
| Broad common-temperature control | 500 µs | 690.72 s |
| Its common-boost control | 500 µs | 691.24 s |

Maximum sampled case RSS is 454240 KiB, accepted implicit residual norm
9.5701e-13, and absolute finite-H_Q balance residual 5.7788e-14. These are
producer execution diagnostics, not independent physical acceptance.

The final producer package has 250 members plus its self-excluded seal,
SHA256 `56214d77c3234194259e3f4ff8ce01642db9c4bfaa014e07547b0da71769b947`.
The mathematical followup has 120 members plus its self-excluded seal,
SHA256 `4a9869eaecdb86474131e79709b45f5e1481859126c1c86cd85bfb39bdcc870b`.
The parent checked every actual file hash, exact exported/canonical membership
and every copied byte for both packages, with no differences.

Independent diagnostics became the dominant cost. Source tracing found that
each entropy order repeats identical adaptive marginal integrals for the same
state. A separate local-reuse prototype preserves every output field bit for bit
on two actual evolved states, including numerical-error estimates and decisions.
The paired entropy-ladder timings improve from 3.835 to 2.724 seconds at n4 and
46.776 to 37.444 seconds at narrow-width n8. Full joint-density work dominates
the latter; this is a modest profiling result, not a physical-model fix.
The main audit retains its original numerical sources rather than adopting this
prototype during the study. Its execution was split into bounded four-worker
VM phases with the original cases, budgets and gate definitions unchanged.
[Profiling, source pins and measured memory](GENERAL3D-DIAGNOSTIC-PERFORMANCE-V17.md).
The parent verified the profiling packet's 28 member hashes, exact membership
and all exported/canonical bytes; seal SHA256 is
`e1e769600ea9d5889ac43baf7f2ed93e9eaf7879c05b1afef2bc85cb747bf4f2`.

The parent independently checked all 1,322 members of the final combined audit,
exact membership and all exported/canonical byte identities. Its self-excluded
seal is `51b7fef7862527194b4508bda97aec804e9ab0cb8c8ca0701a0eb4540d2890fa`.
The separate entropy-sign packet has 15 members, independently checked the same
way, with seal `da889fac2d188d16cc58d2f66c66824e708a61446ce365836e9e85a679043600`.
[Final independent audit](GENERAL3D-AUDIT-V17.md) and
[independent source and results review](GENERAL3D-REVIEW-SUMMARY-V17.md).
The independent source/results review is separately closed with 1,881 members,
seal `d9f4f6082f9c43e082e577fbd68bb391f62f951ec7f78332c474730904164b51`.
The parent checked every member, exact exported/canonical membership and byte
identities, including both final review documents. Its retained duplicate-input
exclusion and exact repopulation instructions are documented in the
[review packet](../scientific/general3d-tools-v17/README.md); original sealed raw
evidence is unchanged.

The requested backend and studies are complete; continuum physical qualification
is not. The next useful work is a jointly refined marker/width/timestep family
with a rotation-resolved entropy rule. Gaussian forward/adjoint acceleration
could make that affordable, but would need its own tail-error, derivative and
conservation qualification before replacing the direct sums. Increasing quadrature
alone cannot remove the demonstrated regularization bias, and fitting a rate
multiplier would conceal rather than resolve it. The browser remains unchanged.
