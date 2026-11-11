# Practical finite-time collision evolution, v16

7 November 2026 UTC. All 13 prospective main cases and the separately frozen
finest-width timestep control completed. Independent all-state physical and
selected-equation checks pass, as do the fine-width and matched fine-timestep
PDF gates. The separate arithmetic repair, independent stress checks and closed
artifact verification are complete. This is an
offline Julia collision reference, not a deployed change to the browser separator.

## Why time evolution was impractical

The v14 path `advance → discrete_gradient → entropy / entropy_increment →
mobility` evaluates every 3D quadrature point against every marker, then all
marker pairs, on every implicit residual. With n samples per velocity axis and
q per integration axis, the work scales as O(n³q³ + n⁶). The previous baseline
stopped at its 600-second cap after 445 µs rather than completing 500 µs.

In plain terms, narrowing the Gaussian enough to obtain the correct heating
rate created far more particles than the time integrator could move. The v15
134,217,728-markers-per-species reference computed initial rates only. Its
Cartesian-product shortcut is not valid for arbitrary evolved distributions.

The fix uses exact rotational symmetry of the present homogeneous, field-free,
zero-drift benchmark: angularly uniform spherical shells with an analytically
integrated Coulomb tensor. It evolves arbitrary radial shapes rather than
constraining each species to remain Maxwellian. Entropy work is O(nq), direct
pair work O(n²), and the dynamical state is O(n). Radial resolution, smoothing,
quadrature and timestep errors still require separate convergence evidence.

This is the smallest coherent change for the observed benchmark. Accelerating
only pairs would leave the entropy bottleneck; changing Krylov tolerances would
leave both dimensional costs. General 3V tree/NUFFT/GPU methods retain angular
physics but require their own conservation, positivity and entropy qualification.
The radial backend does not qualify drift, anisotropy, rotation, fields or losses
in a separator. [Tool and source review](EVOLUTION-TOOLS-V16.md).

## Why the first radial solve still failed

Raw positive shell weights span many orders of magnitude. An ordinary Euclidean
Gonzalez correction adds an unweighted component to the entropy gradient; the
physical mobility divides that component by the shell weight. This gives tiny
tails artificially large numerical forces and makes the implicit solve stiff.
Simply put, a total-entropy correction was kicking nearly empty tails too hard.

The fix constructs Gonzalez's discrete gradient in coordinates `y = sqrt(W) r`:

    gbar = gradH(mid) + W dr [deltaH - gradH(mid)·dr] / (drᵀ W dr).

The correction to `gbar_i / w_i` has no explicit inverse individual shell weight.
The global coefficient still depends on the weighted displacement and accurate
entropy increments; no uniform conditioning bound is claimed. This preserves
the same entropy, continuous collision force, exact discrete chain
rule and symmetric positive-semidefinite pair metric. It is preferable to
dropping tails or clipping weights because those change the represented PDF;
ordinary midpoint would not guarantee the entropy chain rule. Stable entropy
increments remain essential. JFNK still solves the raw radius residual, so only
the gradient construction is equivalent to the scaled coordinates.

In the producer's retained 1 µs regression, ordinary Gonzalez exhausted 160
evaluations at residual 0.0035393. The weighted version converged in 14 at
1.81e-13. Independently, an analytic entropy fixture with weight 1e-20 gives an
ordinary per-weight correction 9.146e16 versus 0.001875 after weighting, with
chain-rule error at roundoff. [Independent mathematics](EVOLUTION-MATH-V16.md).

## Two additional defects caught before the main campaign

For a large valid shell contraction, a stable-density-ratio expression could
still multiply an underflowed exponential by an overflowing `expm1`, giving
`0 * Inf = NaN`. A sign-dependent factorization keeps both factors bounded and
preserves the same expression. Regression fixtures cover both contractions and
expansions; an independent 100-digit reference also checks the series boundary.
This removes that intermediate ratio NaN without flooring the PDF. Complete
entropy-increment evaluation for large moves required the separately versioned
follow-up described below. Near a zero-sized ratio change, absolute rounding error is the relevant
limit; uniform relative accuracy is not claimed.

The direct case writer also overwrote existing metadata when called outside the
campaign wrapper. A reproduced stale-metadata case demonstrated actual data
loss. The writer now rejects existing metadata, history, summary or failure
files before writing; it permits the wrapper's pre-created process log. The
regression preserves original stale-file bytes. This enforces scientific-data
immutability at the writing boundary instead of relying on one caller's guard.

## Resolving the independent PDF diagnostic

The first global Gauss–Legendre L1 integration was underresolved: absolute PDF
differences have corners where the signed difference crosses zero. Increasing
the integration order changed some answers beyond the unchanged 1e-6 diagnostic
budget. In plain terms, averaging a curve with unresolved corners missed area;
that was a diagnostic failure, not evidence of a physical entropy failure.

The reviewer now locates sign-changing roots and integrates each signed interval
using analytic Gaussian-shell CDFs. A second independent checker derives the CDF,
verifies its derivative against `4 pi r² K`, its central/noncentral chi-square
limits, and its tail bound. Eighty-four CDF fixtures agree with adaptive PDF
integration to 6.3e-14 absolute error; seventy derivative fixtures also pass.
An independent signed-mixture L1 fixture agrees to 4.5e-16.

Review also caught a scanner defect: multiplying adjacent signs misses a root
exactly on a sample node and can underflow for small values. The correction
brackets consecutive nonzero samples using sign bits, with a retained failing
regression. Scout refinement and selected adaptive-integration comparisons
quantify remaining numerical sensitivity; they are not a proof that every root
has been enclosed. Original failed diagnostics and their sources remain saved.
No physical data or acceptance threshold changes in this correction.

Near-stationary equation replay exposed a second reviewer arithmetic defect.
The stable log-kernel increment was selected using the largest displacement
over every shell. In one actual common-temperature step, 246 of 256 components
move less than 1e-4 kernel widths, but tails move by .03066 widths. That global
decision therefore sent almost unchanged bulk components through subtraction
of nearly equal log kernels. A roughly 1e-17 entropy error is amplified by the
weighted Gonzalez denominator of about 4.01e-19, creating a false root residual.
In simple terms, moving tails disabled the accurate calculation for the bulk.

A mixed-motion static regression reproduces the problem before correction.
The reviewer now selects its independently derived score-integral increment
per component. All six affected common-temperature equation replays pass the
original unweighted 2e-11 root tolerance after that correction. The failed
report and checker remain preserved; no solver states, tolerances or physical
H/PDF results were changed. Applying the stable expression only at its actual
cancellation boundary avoids changing the nonlinear solver or weakening the
tail residual check to compensate for a diagnostic error.

## Separately versioned full-increment arithmetic repair

An adjacent full-callsite stress test found another defect after the ratio fix:
for a narrow shell moved from radius 8 to 1, `expm1` can overflow before the
mixture is weighted. A relative density change can also round to -1, producing
`0 log(0)` in the remainder. The actual entropy change remains finite. The
independently generated q2048 rule gives 4.158498409085485; a higher-order
physical reference gives 4.158498409082611, differing by 2.87e-12. Ordinary endpoint
quadrature is well conditioned for a change this large. This stress fixture is
not an accepted collision step or a failure of the completed 14 studies.

The repair uses common endpoint-log scaling and bounded component differences
only when the original intermediate arithmetic is unsafe. If the total mixture
change remains small, it retains a stable relative-change formula; it subtracts
endpoint contributions only when those densities are well separated. In plain
terms, large intermediate ratios no longer overflow before their tiny weights
are applied. No PDF floor, radius clipping or physical coefficient changes.
This preserves the original ordinary-step calculation and is preferable to
arbitrarily rejecting positive-radius trial states needed by a nonlinear solver.

The patch lives in a [separate package](../scientific/isotropic-evolution-stability-v16/core.jl),
with source SHA256 `52df85de3d4ea8e24496873e0275f744b0846a7164109a9a02e1364b131c3249`.
Its prospective replay plan has SHA256
`b1dc26438cc79b5f1126b692036df832418a908d016b533ebececc6941b61c6e`.
The 14 original histories remain tied to core `60574a6a...`. Qualification of
the patch requires regression passes, bit-identical entropy increments for all
480 saved consecutive-state pairs, and a fresh finest-case 100 µs run with all
21 physical states identical to the original. Both comparisons now pass: all
480 increments are bit-identical, and the fresh 100 µs run has identical times,
radii and static physical/quadrature metadata at all 21 states. An independent
raw-data checker confirms all non-timing history fields and seven physical
metadata arrays/objects match. The old source pin is not silently replaced in
historical evidence.

Independent large-move references pass the unchanged 2e-11 comparison budget
using a separately generated q2048 rule on the same domain. Its Float64 nodes
are not asserted identical to Julia's nodes. Higher-order physical integration
is reported separately; the producer's origin-move physical-reference difference
is about 2.02e-11. This distinction prevents a quadrature change being mistaken
for an arithmetic defect. The tiny 1e-20-weight contribution agrees with an
independent 80-digit Decimal calculation within 6.93e-14 relative error.

The patch's 14 stability assertions, 41 existing core assertions and 14
persisted-record assertions pass. The fresh replay takes 391.78 seconds of
solver time. Concurrent replay/compatibility validation takes 395.22 seconds
with aggregate sampled RSS 842,828 KiB. Every non-timing history field also
matches; only the measured `solver.stepWallS` differs. The parent verifies all
86 sealed members plus the seal against actual bytes and the exact copied
export. Seal SHA256
`8806b115f47160ae8e1167dcd96a3a45e02a1cdb00533dc4e141e33c554f816a`.
[Exact patch, regressions and reproduction](EVOLUTION-STABILITY-V16.md).

## What is reused, and what is new

The generic MIT Newton–Krylov implementation from CollisionOperators.jl at
`9874021c9edf030fdaa1f62e28c450d63acc361c` is reused unchanged. Its source SHA256
is `71b5530488703f29d113ec57acc778a9910f0d4df01582484043934a2cbec347`;
the retained license SHA256 is
`3c178022e838d0a8e26874fe5c49902f2a06c772b41ae2a96c131a60e47184e3`.
The shell KDE, angular reduction, two-ion normalization and weighted discrete
gradient are new adapter work. This does not qualify the complete upstream
application or turn a published algorithm into independent empirical evidence.

The physical parameters and original gates are unchanged. Equal-density smooth
2/10 eV ions have an asymptotic common temperature of 6 eV; a 100 µs run is not
assumed to have reached it. Positive fixed Gaussian shell weights imply positive
reconstructed PDFs. Entropy uses the full 3D measure `4 pi r² dr`, separately for
each species. Conserved marker energy and the fixed smoothing-energy offset are
reported separately. Momentum is structurally zero by isotropy, rather than an
independent anisotropic-momentum test.

## Prospective studies and independent checks

The [narrative plan](EVOLUTION-PLAN-V16.md) has SHA256
`d704055b3944d67b2ce7bdf3e39ce8f3ebbbe1f57e6d9bc89408a7ae277c2385`.
The [exact 13-case JSON](../scientific/isotropic-evolution-v16/campaign-plan.json)
has SHA256 `754fe2d1f3371acffc0e85589b60d7cca06ad374cb2ab08453c57d92363bbaf8`.
The [independent prospective gate contract](EVOLUTION-AUDIT-V16.md) was written
before main outcomes. It retains the original physical entropy, distribution,
invariant and 2% initial-heating budgets.

The matrix contains eleven 100 µs nonequilibrium histories and two 500 µs common
5 eV histories. It separates fixed-width particle refinement, fixed-count width
refinement, entropy quadrature and timestep. Radius and initial-tail controls
also change their discretization spacing; their differences cannot be assigned
exclusively to truncation. Every declared case must execute or remain explicitly
failed/unknown, with no aggregate budget silently excluding fine cases.

A separately frozen [finest-width timestep extension](../scientific/isotropic-evolution-v16/extensions/finest-dt/campaign-plan.json)
adds one 100 µs, 2.5 µs-step run at n1024, q4096 and alpha .00078125.
Its prospective plan SHA256 is
`92e13f1f64442e51e010806d595a236f6162e591fdf0b1da499f8b62e83991ec`.
The original 13-case plan remains unchanged. This checks time accuracy in the
actual narrowest-width regime rather than assuming that the wider-kernel
timestep control applies uniformly.

The independent mathematical checker verifies the angular integral, Gaussian
shell normalization/moments, entropy gradient, unequal-mass pair energy and
entropy identities, common-mass-times-variance equilibrium, continuum heating
and weighted discrete-gradient transformation. It imports no producer code.
The separate finite-time reviewer reconstructs physical H and PDFs on every
saved state, selected complete implicit equations and refinement increments.
Neither monotone internal quadrature entropy nor conserved moments substitutes
for these physical-distribution gates.

## Source identities and application regression gate

The final main numerical source is frozen before the main studies:

| File | SHA256 |
| --- | --- |
| `core.jl` | `60574a6a12dc80cef214c680498bbe8e55c1199722004b96dbd902b85490ab2e` |
| `run.jl` | `f1440dcaf40e829679e33b806f4bbd807f46c8d4888dda735387763cf1109758` |
| `campaign.py` | `266889236f1d9b7a1c101a4923eaaeffc70776195b2639ac57c624c9e00bf25f` |

The extension uses byte-identical numerical sources and vendor solver, with its
own plan, VM, status and results. Source and archive membership checks remain
separate from physical acceptance.

The application import graph is unchanged. Its final software gate ran offline
against 243 actual guest files checked against the current corresponding host
inputs, 66,193,292 bytes, with zero mismatches. `npm test` passed all 262 tests;
`npm run typecheck`, `npm run build`, and `npm run check:site` exited 0. The existing
renderer-chunk warning remains. [Exact snapshot, commands and exported logs](../scientific/verification-v16/README.md).
These are regression checks, not a browser, deployment or physics claim.

## Completed histories and resolved refinement results

The original matrix completed every case without a resource, domain or nonlinear
failure. Eleven nonequilibrium histories reach 100 µs; two common-temperature
histories reach 500 µs. The additional finest-width timestep control reaches
100 µs in 40 steps. Together these retain 494 saved states, including initial
states. The two complete 500 µs histories close the earlier missing-horizon gate;
their independent physical-distribution results are reported separately below.

All 494 independently reconstructed states pass the physical-H, number,
energy, analytic-positive-PDF and diagnostic-integration gates. The largest
relative energy drift is 1.67e-14, compared with the unchanged 1e-8 budget.
Nonequilibrium physical H decreases at every saved step. The common-temperature
histories have at most 8.89e-16 per-particle positive roundoff in physical H,
also below the unchanged 1e-8 budget; exact floating-point monotonicity is not
claimed. Both complete 500 µs equilibrium histories remain stationary to
3.19e-13 in full-PDF L1, versus the 1e-3 stationarity budget. A changing
nonequilibrium PDF is not subjected to that stationarity criterion.

The finest dt5 endpoint has smooth species temperatures 3.68031945 and
8.31968055 eV; the matched dt2.5 endpoint has 3.68011205 and 8.31988795 eV.
They conserve the equal-density mean of 6 eV without assuming full thermal
equilibrium at 100 µs. These moment checks supplement the distribution checks.

Representative process costs: 75.43 seconds for n512/q2048/alpha .0015625;
297.00 seconds for n1024/q4096 at that width; 392.19 seconds at alpha .00078125;
602.15 seconds for the matched 2.5 µs-step control. Sampled peak RSS stays below
0.6 GiB. The fine common-temperature 500 µs history takes 220.51 seconds. These
are actual costs of different resolutions, not a same-input speedup ratio against
the older Cartesian method.

Independent full-PDF evolution-increment comparisons use common physical speed
coordinates and actual initial species numbers. Each entry below is the maximum
over both species; the unchanged budget is **2e-4**.

| Comparison | 50 µs L1 | 100 µs L1 | Result |
| --- | ---: | ---: | --- |
| Particle n128 → n256, fixed alpha .0015625 | .0268695 | .0299937 | FAIL |
| Particle n256 → n512, fixed alpha .0015625 | 4.1313e-6 | 3.3268e-6 | PASS |
| Particle n512 → n1024, fixed q4096/alpha .0015625 | 2.4638e-7 | 3.1447e-7 | PASS |
| Width .00625 → .003125, fixed n512 | 6.7781e-4 | 4.8806e-4 | FAIL |
| Width .003125 → .0015625, fixed n512 | 3.3428e-4 | 2.425e-4 | FAIL |
| Width .0015625 → .00078125, fixed n1024/q4096 | 1.66027e-4 | 1.20902e-4 | PASS |
| Timestep 5 → 2.5 µs, n1024/alpha .00078125 | 1.19179e-4 | 6.68238e-5 | PASS |
| Entropy quadrature q2048 → q4096, n512 | 1.1378e-13 | 1.2052e-13 | PASS |
| Timestep 5 → 2.5 µs, n512/alpha .0015625 | 1.1896e-4 | 6.6785e-5 | PASS |
| Integration radius 12 → 14, n512 | 1.7021e-13 | 1.8000e-13 | PASS |
| Initial marker tail 8 → 10 widths, n512 | 5.11e-7 | 5.96e-7 | PASS |

The ten main pairs at two times produce 20 comparison records: 14 pass and six
fail. The separate finest-width timestep extension adds two passes. Overall,
the eleven pairs have 22 records: **16 PASS, 6 FAIL**. The six failures belong
to the coarse particle pair and the two coarser width pairs, at both times.

These are measured refinement differences, not certified errors against an exact
unregularized Landau solution. Initial-rate passes alone were insufficient:
the coarse n128 narrow-kernel heavy PDF has initial Maxwellian L1 error .02464,
and its subsequent distribution refinement fails despite a passing rate.
Finite smoothing remains a real source of error; the earlier width failures
are retained. The finest independently reconstructed initial rate is
27952.3493365 eV/s, about .1065% below 27982.1633001 eV/s, passing the original
2% physical gate without a fitted coefficient.

Selected finest-state entropy gradients at 0/50/100 µs agree between the actual
q4096 operator and independent full-space q8192 rules to 3.58e-12 in weighted
relative norm. Induced initial/heating diagnostics differ by at most 1.68e-8 eV/s.
The independent q6144 → q8192 comparison reaches the same floating-point floor.
This supports those selected states; it is not a uniform quadrature theorem for
all possible evolved PDFs. The gradient-tail inequality is independently checked;
its reported numerical bound is computed by the finite-time reviewer.

## Remaining qualification boundaries

This closes the declared radial finite-time studies, not every earlier
PETSc/full-3V code disagreement. A separately implemented isotropic PDE
reference would provide a stronger cross-discretization comparison; current
refinement differences do not certify continuum error. Angular anisotropy,
relative drift, fields, spatial transport and losses require a general 3V or
appropriate device solver with its own convergence gates. The offline backend
has not been wired into the public browser worker or deployed as a service.
Those are separate implementation and validation steps.

## Closed evidence and independent audit

The parent verified every one of the main immutable export's 101 actual file
hashes and corresponding canonical copies, plus exact archive membership. Its
map SHA256 is `efc59110f5f9c3edbd802d44aea5031e58d69c65d5b6bc36345129c6eb8fe212`.
The extension's 16-member canonical seal is
`ab66c1319333aa9cf44c9cbc8cdef06afb979ce3a1ea2bdca2c6c05d716afeec`;
all 15 raw-export members match their canonical copies, with the explanatory
README separately included in that canonical seal.

A complete outer map covers all 139 canonical files, including both inner seals,
the extension, pilot-source identities and host explanatory overlays. Only the
outer map excludes itself. Every actual hash and exact membership pass;
SHA256 `c0745c36bd7447d8fb0680a4f2023334fb0c3b3d5af292d93c2b30104357a27c`.
No source or raw study in that closed package is subsequently rewritten.

The final independent audit has exact membership of 14 cases and 494 states,
with no unreviewed case. All 42 selected implicit-equation replays, 56 adaptive
entropy checks and 28 adaptive PDF checks pass. Maximum physical-H integration
sensitivity is 3.23e-12/N, below the unchanged 2e-10 budget; maximum L1 diagnostic
sensitivity is 3.17e-9, below 1e-6. Its final regression suite passes 32/32 tests,
including stale/mutated/truncated inputs and the retained reviewer arithmetic
regressions. [Independent audit](EVOLUTION-AUDIT-V16.md).

The parent verifies all 423 sealed members plus the seal against actual canonical
and exported bytes, including exact membership and zero mismatches. Audit seal
SHA256 `f203d99e290690ef8fd136a692895dd8f4f9c0b140e8529a15cd83525293c194`.
The [merged result](../scientific/evolution-review-v16/results/final-audit.json)
has SHA256 `8cdbf2320c1c612f05e443680c52b7687698d7d4bfa1957c1572a77a2c822f93`.
Original failed controls, original and repaired review sources, actual source
pins and complete raw histories remain in the closed packages.

The final figures were visually inspected after export:
[100 µs evolution, actual PDFs and refinement failures](../scientific/evolution-review-v16/results/evolution-v16.png),
[500 µs equilibrium preservation](../scientific/evolution-review-v16/results/evolution-v16-common.png).
Each also has a standalone SVG beside its PNG. These figures use independent
physical diagnostics and actual raw second moments, not a temperature-only fit.
