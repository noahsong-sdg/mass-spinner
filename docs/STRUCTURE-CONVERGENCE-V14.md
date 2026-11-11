# Structure-preserving collision adapter and qualification, v14

7 November 2026 UTC. The new scientific method executes and its discrete
identities are independently checked. **Physical qualification remains open:**
all four heating-rate controls fail the unchanged target, the intended baseline
is incomplete, and several refinements remain unrun. Production browser physics
and deployment are unchanged. The bounded solver campaign and independent
distribution studies are closed; actual scopes and unresolved gates follow.

## Reused implementation and new physics

The source search and actual pinned clones establish no ready, qualified full-3V
two-ion drop-in among the inspected implementations. The chosen licensed base is
CollisionOperators.jl at `9874021c9edf030fdaa1f62e28c450d63acc361c` (MIT). Its
generic Jacobian-free Newton–Krylov solver is reused unchanged; the collision
metric and Gonzalez construction are adapted from its 2V single-population path.
Full Cartesian 3V, unlike masses/weights, SI collision normalization and a positive
Gaussian type-I entropy functional are new code requiring independent validation.
This does not claim the entire upstream application or its Mantis dependency graph
was installed or qualified. The exact source review is
[STRUCTURE-SOURCE-REVIEW-V14.md](STRUCTURE-SOURCE-REVIEW-V14.md).

The v13 polynomial representation could be negative between positive nodes, and
resolved physical H increased even in positive fields. A positive Gaussian
mixture removes the first representation failure analytically. A compatible
pair mobility plus a discrete entropy gradient supplies conservation and H
identities for the chosen finite-quadrature functional at an adequately solved
implicit root. Physical full-space H, actual equilibrium fidelity and convergence
to unregularized Coulomb dynamics remain separate numerical tests.

This is the smallest licensed route found that makes positivity and the discrete
entropy identities directly inspectable in the required 3V two-ion setting.
Clipping signed polynomials would alter inventories and the collision equation;
tighter root tolerances would leave the representation problem intact. Reusing
the complete 2V upstream application would still require the same dimensional,
species and entropy changes. Gaussian smoothing has a substantial accuracy/cost
tradeoff, so this selection is an auditable candidate, not a claim of universal
superiority over exponential Galerkin or other structure-preserving methods.

## Independent algebra and limits

The independent derivation checks reciprocal pair coefficients, both species
mass factors and true marker number weights. The velocity-space Landau tensor
annihilates relative velocity; midpoint evaluation preserves the quadratic energy
identity. A Gonzalez gradient imposes the entropy chain rule. Midpoint alone or
merely selecting a discrete-gradient solver name would not supply that identity.

Gaussian epsilon is variance. The adapter keeps `m_s epsilon_s` common across
species and exports both marker and smooth moments. The cost pilot declares
smooth 5 eV, with 1.25 eV smoothing energy and therefore 3.75 eV marker temperature.
It does not initialize marker 5 eV and mislabel the broadened PDF as 5 eV.
Finite positive mixtures with correct moments need not be Maxwellians; actual
initial-shape error and subsequent drift must be reported separately.

Smoothing also changes the initial thermal-transfer rate even at infinite marker
number. The independent unsmoothed 2/10 eV reference is
**27982.16330006834 eV/s** for the light ion. With 1 eV smoothing energy and the
same smooth 2/10 eV targets, the continuum regularized prediction is only
18219.7263 eV/s. This is a physical method bias, not a missing factor to fit away.
The original 2% rate budget remains unchanged; variance and particle refinement
must establish an adequate limit. Details and seven independent executable
algebra regressions are in
[STRUCTURE-MATH-AUDIT-V14.md](STRUCTURE-MATH-AUDIT-V14.md).

## Implementation fixes and numerical requirements

**Quadrature symmetry and the singular kernel.** An eigensolver returned a tiny
nonzero center for an odd Hermite rule whose analytical central node is exactly
zero. Species thermal scaling turned those rounded centers into artificial
near-coincident velocities; the Coulomb `1/|relative velocity|` factor amplified
the discrepancy. In simple terms, rounding moved a shared zero and the singular
kernel magnified it. The fix restores exact odd zero, antisymmetric node pairs
and equal paired weights, which are actual Gaussian-quadrature invariants.
It leaves the nonzero-relative-velocity collision kernel unchanged; no velocity
cutoff is introduced. A cutoff would modify the collision law. The failed test and source remain preserved;
new odd-center/coincident-pair and unequal-weight regressions exercise the fix.

**Tiny entropy differences.** Subtracting two order-one entropies to measure a
small increment can corrupt the Gonzalez correction near equilibrium. The new
path first evaluates Gaussian changes with `expm1`, then uses `log1p` for the
entropy increment at the same quadrature. It keeps the exact-zero displacement
boundary and tests the chain rule down to tiny nonzero increments. An arbitrary
absolute correction cutoff would discard the defining identity.

**Actual command-line execution.** The first pilot launch encountered Julia's
top-level loop soft-scope rule before advancing any distribution. A function
entry point gives state updates ordinary local scope. Actual CLI regressions
cover one-step execution, invalid initial variance and stale output rejection;
the failed launch is retained separately. This is an execution fix, not a
collision-model change or an accepted numerical result.

**Resource and artifact accounting.** The original launcher measured only its
direct child, hiding Julia's memory when a Python CLI test launched it. The
watchdog now measures the complete child process group; a grandchild-allocation
regression verifies the actual boundary. Lossless gzip and streaming matrix
serialization retain all quadrature arrays without repeatedly expanding them in
memory or exceeding the export budget. Old logs retain their original scope.
Case identifiers also reject path traversal before creating an output directory.
These fixes address observed execution and export requirements, with no changes
to the collision equation.

## Pilot evidence: discrete structure versus physical entropy

Two-step controls use the same 64 markers per species, smoothing alpha 0.25,
six-thermal-scale operator box and 1 microsecond timestep. Each is a cost and
diagnostic qualification pilot, not a long-time convergence claim.

| Operator order | Actual elapsed time | Independent physical-H result |
| --- | ---: | --- |
| 12 | 6.647 s | FAIL: maximum adjacent H increase/N0 = 4.4718e-5 |
| 32 | 5.507 s | Two-step increase/N0 about 7.25e-11; within 1e-8 budget |
| 48 | 13.135 s | Cost pilot; separate main saved-prefix audit below |

Order 12 decreases its own H_d at both steps, yet the independently reconstructed
full-space H increases. Orders 160 and 192 agree far below the increase; the
Gaussian tail bound is also negligible. The initial operator quadrature even
integrates a species inventory as 1.68025 instead of its analytic value 1.
This is demonstrated operator-quadrature aliasing, not an entropy-sign convention
or a nonlinear-solver failure. Finer operator quadrature is the direct remedy;
lowering the diagnostic precision or replacing physical H with H_d would obscure
the error. The failed control is retained.

Order 32 sharply reduces that error, but its physical H still increases slightly:
passing a finite error budget is not proof of exact monotonicity. Its two-step
L1 drift is resolved and small. The order-12 L1 diagnostic remains UNKNOWN
because its absolute-value quadrature did not meet the independent resolution
budget. These distinctions are recorded in the gate review.

The main campaign is source-pinned before dynamics in
`scientific/structure-preserving-v14/campaign-plan.json`, SHA256
`0f6a2fe6b9aa381d09c5e2279da502ccf3e0596dc7881a9a5b33adb205043073`.
It specifies a 500 microsecond baseline, shorter particle/operator/timestep/
smoothing controls and nonzero thermal-transfer-rate tests. Actual completed
coverage and resource failures must be read from sealed cases, not inferred
from this prospective list.

The solver campaign is now closed: **8 of 13 cases executed, 7 complete**.
The complete cases are the four rate controls, operator orders 32/64 and the
10 microsecond timestep control. Their equilibrium-control horizons are
100 microseconds; the rate controls each take one 10 nanosecond step.
Coarse n3, fine n6, 2.5 microsecond timestep, and both 100 microsecond
smoothing controls remain **UNRUN / UNKNOWN**. Their declared case caps exceed
the remaining prospective solver budget; neither caps nor steps were reduced
after observing outcomes. The separate n6 rate control is complete and must not
be confused with the unrun longer n6 equilibrium sensitivity.

Actual solver time is 1,234.462076 seconds out of 1,500, leaving 265.537924
seconds; the smallest unrun case cap is 300 seconds. The sealed export is
34,982,364 bytes. All **146** final transfer hashes pass against actual host
bytes. Campaign status SHA256:
`4d38422e5fb1b4177d0b31ee8c0444702b6c7fce0e00f282631c448d055f21a6`.
The transfer manifest SHA256 is
`dad29a5f1ef659333689713302db18c49db42adebfb0cdd8e496116b6f466a43`.

The baseline reached its unchanged 600 second cap at 600.034765 seconds with
461,201,408 bytes peak process-group RSS. It preserves 90 complete states,
steps 0–89 through **445 microseconds**, with `historyComplete=false` and the
watchdog wall failure. All 13 sealed payload/source/log checksums pass against
the actual host transfer. The trusted raw-manifest SHA256 is
`2101782b7137c7b081f546e562eb2e4de838df2d24a1f3ef7d71e52974e22ba6`.
This is a failed resource gate and incomplete intended horizon, not an accepted
500 microsecond run. An explicitly scoped failure-prefix diagnostic may examine
its real saved states; the normal successful-case loader still rejects it.
It cannot produce a 500 microsecond PASS or silently change the planned steps.

The independent reviewer subsequently integrates physical H at orders 128 and
160 for **all 90 saved states**. It finds no adjacent or cumulative increase;
even the least-decreasing adjacent step is -5.55187e-11 per initial particle.
The conservative sum of absolute species quadrature differences is at most
1.823e-13 per particle, with excluded absolute-H tail bound 6.75e-15.
Order 192 also checks actual peak endpoints, states 0, 10, 20, 88 and 89.
Its maximum noncancelling difference from order 160 is 6.284e-14 per particle.
This is resolved physical-entropy evidence for the saved 445 microsecond prefix,
not an inference from H_d. The main integration takes 426.323 seconds, and the
192-order recheck 26.12 seconds, below the diagnostic budget.

Across every saved state, independently reconstructed relative number/energy/
momentum residuals are at most 0 / 2.22e-16 / 4.50e-17. Exact-rational L1 upper
bounds peak at 5.98885e-4 and 5.77216e-4 for the two species, below the unchanged
1e-3 stationarity budget. Strict positivity holds analytically for the actual
positive Gaussian-mixture representation; its negative number fraction is zero.
These results establish conserved, positive and nearly stationary saved PDFs.
They do not establish that the initial PDF is a Maxwellian or complete the
missing 500 microsecond horizon. The 114-record independent evidence manifest
passes every actual transferred host hash, SHA256
`56646c3891f5371aa2e0892deba4616751d043184f523a36bf8d9b39eab63e2f`.

## Distribution certificates and equilibrium interpretation

The independent reviewer reconstructs physical entropy from exported particles
without importing producer diagnostics. It separately bounds full-space Gaussian
tails, refines the integration and checks both endpoints of the worst resolved
entropy increase. Every saved baseline state is required for a global pass.

For fixed positive Gaussian components, their displacement gives an analytic
upper bound on mixture L1 drift. The reviewer evaluates a conservative version
with exact rational arithmetic on serialized binary64 velocities and weights.
A bound below the unchanged stationarity threshold certifies a pass; a bound
above it cannot establish failure. Numerical absolute-value quadrature quality
is still reported separately. The same triangle bound certifies sufficiently
small differences of evolution increments across resolutions.

All **12** numerical short-control evolution-increment comparisons pass the
unchanged 2e-4 L1 budget at shared 50/100 microsecond times, with the separate
1e-6 integration-resolution gate satisfied. Maximum differences from the q48
baseline are 1.86465e-4 for operator q32, 4.37309e-5 for q64, and 1.14417e-7
for the 10 microsecond timestep control. The worst 128-to-160 sensitivity is
8.624e-8; excluded tails are below 6.85e-16. The seven inconclusive q32/q64
analytic upper bounds remain recorded as UNKNOWN alongside these resolved numerical
comparisons. This is output-increment agreement for the declared short cases,
not an initial-shape, zero-smoothing, particle or 500 microsecond convergence
claim. The independent 196-record cross-comparison export passes actual host
hashes, manifest SHA256
`4d4b783e8c8b33c357a5cc19f15f6f5bb0cefeaf561e4f08ae9ed778906786ee`.

The final independent audit covers every saved short-control state, not only
selected times: 21 q32 states, 21 q64 states and 11 coarse-timestep states.
All three pass the unchanged adjacent/cumulative/legacy-relative physical-H
budgets and the all-state analytic L1 stationarity gate through 100 microseconds.
Every physical/discrete peak selection is rechecked at order 192; the largest
noncancelling sensitivity across these cases is 6.306e-14 per particle.
The q32 physical H nevertheless increases by 4.23273e-9 per particle cumulatively.
That is a budget PASS, not exact monotonicity. q64 and the timestep control
have decreasing physical H. Initial represented PDFs are identical across these
controls and the baseline; this does not make them exact Maxwellians.

At the saved 445 microsecond baseline endpoint, independently integrated L1
drifts are 2.59039e-4 and 2.54108e-4, with 128/160 sensitivities 4.54e-9 and
1.23e-7 respectively. Both satisfy the separate numerical resolution budget.
The exact-rational bounds, rather than endpoint sampling, cover stationarity
over all 90 saved baseline states. The planned 500 microsecond gates remain
UNKNOWN throughout the final machine-readable summary.

An additional initial-state diagnostic for the narrowest rate kernel remains
underresolved: physical-H order sensitivities are 2.73e-7 and 6.73e-8 per
particle, above the unchanged 2e-10 budget. Operator quadrature integrates both
species numbers to about 1e-13 accuracy, yet H_d differs from the order-192
physical-H estimate by about -4.99e-5 per particle. Accurate number integration
therefore does not qualify entropy or its gradient. This diagnostic is UNKNOWN;
it cannot uniquely assign the rate error to operator quadrature. Its actual
12.09 second run peaks at 714 MiB, below the 1 GiB diagnostic budget.

Total main numerical diagnostics take **870.267 seconds**, below the reserved
1,200 seconds. The 216-record numerical-stage manifest passes all actual host
hashes, SHA256
`b2e880b0e7b6258f6dd0fc5b03704a62aa52f21722d17f556576b3d47ed4a20a`.
Final numerical summary SHA256:
`ab88955393fb90279f35b006839c4e69938fcdfd3d62f4759a44903282d1eb1b`.
After documentation closeout, the accepted 216-record reviewer manifest is
`679d0574ca49de6512a336338815015400df76047bf6fb0fc22354b02e5a643c`.
Every record passes parent verification in both the actual accepted export and
the canonical project package. The final 38-test log reports PASS in 0.016 s.

Correct initial temperature does not establish a Maxwellian. The initial
finite mixture has measurable shape error; its near-stationarity can only
establish stationarity of that declared mixture. A characteristic-function
discrepancy supplies a separate lower bound on initial Maxwellian-shape error.
That diagnostic is not substituted for the existing stationarity gate.

## Independently reconstructed nonzero thermal-transfer rates

The four completed 10 nanosecond controls start from declared smooth targets
2/10 eV. The mathematical reviewer recomputes each slope directly from the
actual velocity increments using stable kinetic-energy differences and removes
species bulk motion. It does not rely on producer temperature subtraction.
The unchanged unsmoothed Maxwellian target is 27,982.1633 eV/s, with a 2% budget.
These are one-step endpoint rates, not a rate-timestep convergence study. The
completed equilibrium timestep control does not validate the nonzero-rate
derivative.

| Case | Light-ion slope, eV/s | Relative error | Physical rate gate |
| --- | ---: | ---: | --- |
| n4, alpha .25, q48 | 16,900.18065 | 39.604% | FAIL |
| n6, alpha .25, q48 | 16,585.57847 | 40.728% | FAIL |
| n4, alpha .125, q64 | 24,480.56923 | 12.514% | FAIL |
| n4, alpha .0625, q96 | 17,306.15378 | 38.153% | FAIL |

This failure is not evidence of a missing Coulomb constant: SI normalization and
the pair prefactors were independently derived. Two demonstrated approximation
problems remain. First, the continuum smoothed method itself predicts only
14,808.73746 / 22,474.45928 / 25,429.50999 eV/s at the three respective alphas,
even with infinitely many Gaussian-distributed markers. Second, finite tensor
marker mixtures do not reproduce those Maxwellian inputs. At n4 the heavy-ion
initial characteristic-function L1 lower diagnostic worsens from 0.3407 to
0.5799 to 0.7512 as smoothing shrinks; n6 at alpha .25 improves it to 0.2037.
The rate therefore does not converge monotonically under the present coupled
smoothing/operator changes. These diagnostics identify separate smoothing and
initial-shape limitations; they do not allocate the remaining rate discrepancy
uniquely among finite markers, operator quadrature and finite-step error.

In simple terms, narrowing the Gaussian blobs without adding enough particles
makes a bumpier initial plasma rather than a better Maxwellian. Both particle
number and smoothing must be refined, with operator integration resolved
independently. Fitting the rate coefficient or calling the smoothed continuum
prediction the new acceptance target would conceal the error. All four physical
FAIL results are retained. Six independent actual-rate regressions pass; the
62-record reviewer manifest matches every actual transferred host file.

The candidate therefore remains unaccepted as a physical collision reference.
The next useful qualification work is joint particle/width refinement that first
resolves the actual initial Maxwellian PDF, independently resolved entropy
operators at each width, and a separate nonzero-rate timestep ladder. Completing
the longer horizon also requires reducing measured computational cost or a new
prospectively reviewed resource plan. The existing failed and unrun cases remain
immutable. Further conserved-moment passes cannot substitute for these missing
distribution and physical-rate requirements.

## Gate definitions and evidence ownership

The [prospective coordination contract](STRUCTURE-PLAN-V14.md) and
[independent gate review](STRUCTURE-GATE-AUDIT-V14.md) retain the v13 numerical
budgets. In particular, positive density does not replace the entropy integration
gate, monotone finite-quadrature H does not replace full-space H, and short
sensitivities do not qualify a 500 microsecond trajectory. Missing or unresolved
comparisons remain UNKNOWN. Original controls and failed outcomes are preserved.

The producer owns the Julia adapter and numerical campaign. Separate agents own
source provenance, algebra/source correctness and reconstructed-distribution gate
audits. Parent checks actual transferred artifact hashes and report consistency.
No independent reviewer imports the producer's numerical diagnostics.

The application software gate passes 262 tests, typecheck, build and static-site
checks on the exact unchanged runtime source graph. Those checks do not exercise
or qualify the new Julia collision method. Exact commands, snapshot and logs are
in [scientific/verification-v14](../scientific/verification-v14/README.md).

All scientific execution below uses explicitly synced safe-dev source copies.
Actual commands and individual source/log hashes are in each linked package;
these software checks are separate from the failed or unknown physical gates.

| Check | Actual result |
| --- | --- |
| Julia `test_core.jl` | 46 assertions PASS, including unchanged JFNK, quadrature parity, entropy derivative/chain rule and unlike-mass/weight identities |
| `python3 -m unittest test_campaign.py test_bounded.py` | 8 tests PASS, including stale plan/source/output and descendant-memory enforcement |
| Actual `test_cli.py JULIA` | CLI, gzip/content checksum, stale output, invalid variance and traversal checks PASS |
| Independent mathematical `test_reference` | 7 tests PASS |
| Independent actual-step `test_audit` | 5 tests PASS; two raw q12 steps reconstructed without producer diagnostics |
| Independent `rate_bias` and `compare_rates` | 6 tests PASS; all four intended physical rate comparisons FAIL |
| Independent distribution `unittest discover -v` | 38 tests PASS on current reviewer snapshot; numerical gate outcomes reported separately |
| Root `npm test` | 262 passed, zero failed/skipped |
| Root `npm run typecheck`, `npm run build`, `npm run check:site` | All exit 0; existing renderer chunk-size warning |

At final closeout, every one of the 243 staged application source/input files
matches current project bytes. New scientific code has its own source-bound
checks; documentation additions do not turn the root gate into scientific
qualification. The upstream reuse/source audit finds no licensing or provenance
blocker and verifies actual successful case sealing as well as failure retention.

## Reviewable delivery boundaries

No Git metadata or PR is present. Do not combine the imported vendor, adapter,
campaign infrastructure and all independent diagnostics into one oversized PR.
The unchanged MIT vendor is 303 lines; the new Julia core/entrypoint is 323 lines.
Keep vendor qualification separate from the 514-line adapter/runner slice.
Independent mathematical/rate checks, Gaussian integration/bounds, and sealed
artifact/history/gate readers form separate review slices. Tests and evidence
belong with the slice they verify. Each proposed PR must be checked against the
700-line non-test limit before publication.
