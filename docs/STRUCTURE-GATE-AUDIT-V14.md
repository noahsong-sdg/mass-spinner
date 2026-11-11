# Independent gate contract for the structure-preserving collision adapter, v14

Prospective review, 7 November 2026 UTC, before any v14 producer dynamics.
This reviewer has not yet accepted a new solver or its output. The user requests
the same distribution-level convergence gates, not merely a new solver name.
This document maps those gates across representations without relaxing them.

## Fixed physical problem and comparison boundary

The common-temperature control is homogeneous, field-free, physical three-velocity
dimensional Landau relaxation: 40/84 u, charge +e each, number density
5e17 m−3 each, common 5 eV, zero common drift, fixed Coulomb logarithm 12.
Its v13 baseline horizon is 500 µs; sensitivity checkpoints are 50/100 µs.
Existing v13 PETSc results and failed gates remain unchanged controls.

Cartesian 2V is a different physical equation from either full Cartesian 3V or
an axisymmetric `(vperp,vparallel)` representation with cylindrical measure.
No 2V-to-3V reinterpretation is an acceptable adapter. Physical SI collision
time/prefactors must be independently checked before a relaxation-rate claim.
An unequal-temperature control is necessary: freezing all velocities can pass
equilibrium stationarity, positivity and conservation while implementing no
collisions. A method also needs a non-Maxwellian control to exercise its entropy
structure beyond a Gaussian ansatz.

## Unchanged primary gate values

Values below are copied from the frozen v13 PETSc producer plan, not inferred
from v14 output. They are engineering acceptance budgets for this project.

| Quantity | Definition | Budget / rule |
|---|---|---|
| Species number | Maximum relative change of each actual initial species inventory | 1e−8 |
| Total kinetic energy | Raw physical three-component particle or represented-PDF energy, relative to its actual initial total | 1e−8 |
| Total momentum | Vector residual divided by a prospectively declared positive momentum scale; never divide by a zero initial drift | 1e−8 |
| Strict represented-PDF positivity | Analytic structural proof or whole-domain certificate for the actual exported representation | Any negative witness invalidates physical H, regardless of small negative mass |
| Negative number fraction | Negative represented mass divided by fixed actual initial species number | 1e−10 |
| Negative-integral integration sensitivity | Same coefficients/particles and representation, refined integration only | 1e−12 |
| Maximum adjacent H rise | `max_t (H(t)−H(previous))/sum_s N_s(0)` | 1e−8 |
| Maximum cumulative H rise | `max_t (H(t)−H(0))/sum_s N_s(0)` | 1e−8 |
| H integration sensitivity | Same represented distribution and fixed reference convention, refined integration | 2e−10 per initial total particle |
| Equilibrium stationarity | `integral abs(F_s(t)−F_s(0)) d³v / N_s(0)` | 1e−3 |
| Representation/time refinement | L1 difference of evolution increments at shared 50/100 µs, divided by baseline actual initial species number | 2e−4 |
| L1 integration sensitivity | Same represented distributions, integration refinement only | 1e−6 |

The old v12 relative-adjacent-H gate 1e−8 is preserved as a separate historical
diagnostic. It has a different denominator and must not be substituted for the
fixed-initial-number v13 gate. For tiny steps retain H rise divided by dt and
cumulative excursion: shrinking dt can make an absolute per-step defect pass
while leaving a positive production rate.

A physical-H gate is only meaningful for a nonnegative, declared smooth PDF.
Unresolved integration, positivity, missing configurations, or incomplete
horizons yield UNKNOWN, not PASS. A resolved excess yields FAIL. Different
short horizons do not qualify 500 µs convergence. Full baseline acceptance
requires all relevant gates; conserving moments is insufficient.

## Representation, smoothing and entropy identities

The continuum convention is `H=sum_s integral F_s log(F_s/Fstar_s) d³v` with
fixed reference constants and fixed initial-number normalization. Export the
normalization, measure, physical velocity mapping and reference constants.
Any state-dependent density/temperature fitting or snapshot normalization would
change the question and is excluded.

For a particle method, distinguish the empirical measure from the declared
smooth approximation. Positive weights guarantee positive empirical mass; they
do not supply finite differential H. A finite mixture of positive normalized
Gaussians with finite centers, positive covariance and nonnegative fixed weights
is, however, an everywhere-nonnegative smooth represented PDF. Its sign can be
certified structurally without sampling. Underflow to zero is a numerical
evaluation issue, so log-density should be evaluated stably without adding a
density floor that changes the functional.

[Carrillo, Hu and Van Fleet](https://arxiv.org/html/2310.16143v1) define a
convolution-regularized entropy and derive a species-dependent smoothing condition
for common physical equilibrium temperature. The actual covariance convention
must be mapped from code, not guessed from an `epsilon` parameter name. Their
functional `integral (psi*f) log(psi*f)` is Boltzmann H of the explicitly declared
smooth representation `F=psi*f`. It is not the H of the singular empirical measure
or a proof of convergence to the unregularized Landau equation.

Consequently, a compatible type-I method can meet the H-of-represented-PDF gate
if its exact same smooth PDF is independently reconstructed and integrated.
This must still be accompanied by particle/regularization refinement, physical
normalization and rate tests. A different type-II functional such as evaluating
`log(psi*f)` only at particle centers cannot be relabeled as this integral.

For isotropic Gaussian covariance `sigma_s² I`, smoothed raw energy equals
particle raw energy plus `3/2 sum_s m_s N_s sigma_s²`. Export and independently
check that known offset. Use the unsmoothed particle invariants for the particle
ODE, and state whether reported species temperature refers to centers or smooth
PDFs. An epsilon fixed in time gives a constant energy offset; changing epsilon
during a run can change reconstructed energy and H without collisions.

The alternative [exponential-Galerkin formulation](https://arxiv.org/html/1804.08546v1)
chooses a positive PDF and compatible metric/null space/discrete gradients.
The paper develops the single-species case; an unlike-ion adapter needs its own
checked algebra. Neither a logarithmic output transform nor a time-integrator
option alone establishes those identities.

## Independent comparisons and finite computational budgets

For a time-step control preserve identical initial bytes, particle weights,
regularization, operator quadrature and pair structure. Only time advance and
explicitly frozen nonlinear-solver controls may change. Compare actual initial
and final PDFs and evolution increments separately. Changing smoothing width,
particle number or initialization is a representation comparison, not a pure
timestep study.

Across representations integrate both initial/current raw differences and
`[F_a(t)−F_a(0)]−[F_b(t)−F_b(0)]` on a shared physical velocity measure. Do not
equate individual marker identities across resolutions. If species grids use
different thermal scales, reconstruct in the common physical coordinates before
integrating. Gaussian full-space cubature or a bounded domain with quantified
tails are valid diagnostic choices; silently dropping tails is not.

Quadrature refinement evaluates identical saved states. Operator-quadrature
changes are separately labeled method controls. Increasing diagnostic order
until a convenient answer appears, without preserving failed attempts, is not
a prospective test. Any resource cap must be frozen before the production
study; retain incomplete cases as UNKNOWN. A cheaper pilot may establish cost,
not replace missing same-horizon cases.

The v13 four-seed particle CDF budgets remain complementary statistical
diagnostics. Their .05 CDF budget does not imply the much tighter 1e−3 full-PDF
L1 gate. Repeated checkpoints, velocity components and particles are not
independent whole-run realizations. Deterministic weighted quadrature particles
are not independent Monte Carlo samples; no fictitious sampling confidence
interval will be attached to them.

## Output/provenance contract and review plan

Before dynamics the producer should freeze the selected upstream commit/license,
adapter source hashes, normalization, complete case list, solver settings,
representation parameters, quadrature refinements, physical gates and resources.
Export actual initial and every accepted evolved state, not fitted Maxwellians;
retain failures, nonlinear diagnostics and attempted steps. For particle methods
this includes all velocities, species, fixed weights and smoothing covariances.
For log-Galerkin it includes log coefficients, basis and domain metadata.

Independent review checks the sealed raw file set exactly, including stale or
extra checkpoint rejection; source/setup equality; finite data; species/weight
inventory; chronological and horizon completeness; invariant reconstruction;
strict positivity; H/L1 integration resolution; and common-horizon comparisons.
Tests must include a stale prior-schema/input case and a one-byte mutation case.
The reviewer imports no producer diagnostic implementation. A final manifest
binds actual reviewer source, inputs, tests and accepted outputs.

All numerical computation, installation and tests must run in this reviewer's
distinct Apple safe-dev VM. Host actions are reading, editing, copying and
hashing exported bytes. Source is an explicitly synced copy; valuable output is
exported and its actual host hashes verified before any replacement sync.
No scientific code had executed when the preceding prospective contract was
written. Its original SHA256 was
`2bedd84855097e21bbf44288c0c7ba0a49574c3c4b57a02b448c825940d70980`.

## Recorded execution and retained negative controls

All reviewer calculations below ran inside distinct Apple VM
`safe-dev-52b7779bf8d40465`, with NumPy 2.4.6 and one BLAS thread. Host actions
were source editing, byte copying and SHA256 verification. Every accepted guest
export was checked against the actual host bytes before guest replacement.

The initial full-space Gauss-Hermite absolute-L1 prototype was inadequate:
the known translated-Gaussian fixture failed its guessed accuracy requirement.
The failed test, source snapshot and actual outputs remain under
`scientific/structure-gate-review-v14/provenance/diagnostic-first`. Differences
between successive orders are empirical resolution diagnostics, not a rigorous
error enclosure, especially for the nonsmooth absolute-value integrand. The
physical L1 resolution budget remains 1e-6. Streamed Cartesian Gauss-Legendre
integration was chosen after a separate bounded cost/accuracy pilot; analytical
Gaussian tails include the quadratic growth of the log density.

The accepted q12 producer pilot contains the actual initial state and two 1us
steps with 64 markers per species, alpha .25 and radius6. Independent H orders
128/160/192 for all three states took 27.632s and about39MiB. Full-space summed H
at order192 was -7.319438158633345, -7.319401643936121 and
-7.319312207967924. The maximum adjacent rise per fixed initial total number
was 4.4718e-5 and cumulative rise6.2975e-5: both FAIL the unchanged1e-8 budget.
Same-state order160/192 differences were about6e-14 per particle, with analytical
tail bounds about1e-14. Meanwhile H_d decreased from -10.41318580272222 to
-10.426456064453905. Independent H_d reproduction agreed within3.6e-15;
its initial operator quadrature species number was1.6802549189154958 instead
of the analytical1. The demonstrated cause is severe aliasing of the finite
entropy functional, rather than failure of the discrete chain-rule theorem.
This negative control remains a physical-H FAIL despite its decreasing H_d.

The q32 pilot, with the same initial represented distributions, reduced this
aliasing substantially. Full H order192 was -7.319438158633345,
-7.319438158488346 and -7.319438158345136; the 2us cumulative rise per particle
1.4410e-10 stays within the1e-8 short-pilot budget, while remaining positive.
Operator-quadrature species number was .9999956721462272. This is evidence
about a short pilot, not an exact full-space H theorem or500us qualification.
Independent H128/160/192 took25.765s and56MiB. Selected final L1 drifts for the
40u/84u species were3.5340e-7/1.5570e-7 with128/160 sensitivities
2.0652e-10/5.1629e-12. Complete raw/source/output manifests remain in
`pilot-review-manifest.json` and `pilot-q32-review-manifest.json`.

Initial finite KDE versus nominal5eV Maxwellian L1 was approximately .23155
for the40u species, but its quadrature sensitivity3.54e-4 exceeded1e-6.
That numerical shape integral remains underresolved. Exact number and second
moments do not make this finite mixture an exact Maxwellian. The analytically
bounded characteristic-function diagnostic was therefore added separately;
it is not substituted for the actual-initial stationarity gate.

## Frozen main campaign and exact L1 certificates

The accepted frozen main producer plan SHA256 is
`0f6a2fe6b9aa381d09c5e2279da502ccf3e0596dc7881a9a5b33adb205043073`.
Baseline uses q48,64 markers/species, alpha .25,100 fixed5us steps. The plan
includes separate operator-resolution, particle-count, timestep, coupled
smoothing/resolution, and nonzero2/10eV rate controls. Every baseline state gets
independent physical H128/160; selected192 includes BOTH endpoints of the worst
adjacent H128/H160/H_d rises and their cumulative maxima. Other cases have
selected coverage and cannot pass a global H gate without complete coverage.
All computations retain their120s/batch and1GiB bounds and the frozen campaign
resource budget. Unfinished/resource-failed studies remain UNKNOWN.

An exact rational upper certificate complements the numerical L1 integrations.
For two equal-variance Gaussian components, their L1 distance is at most
min(2, norm(delta-v,1)/sigmaLower), where sigmaLower is positive and its square
is verified with exact Fraction arithmetic to be no greater than the serialized
variance. The sum weighted by the exact serialized component weights bounds
mixture drift. Every saved state is checked using exact rational endpoint
differences, weights, normalization and decimal gate comparison. A bound below
1e-3 certifies stationarity; a bound above it gives UNKNOWN, never FAIL.
For cross-case evolution increments, the raw case and baseline bounds are
summed and divided by the fixed actual initial baseline species number; the
unchanged2e-4 gate applies. This triangle inequality permits different marker
counts and variances between cases and does not compare their initial PDFs as
if they were identical. Numerical L1 integration-resolution outcomes remain
reported separately, including underresolved failures.

The compressed campaign envelope is accepted only with its independently
trusted raw-manifest SHA, frozen plan SHA and all pinned source bytes. Exactly
one metadata format is permitted. Gzip decompression must match the declared
uncompressed-content SHA; corrupt compressed input never falls back to old
plain metadata. Old plain pilot artifacts remain immutable and tested.

Before main data execution,34 reviewer tests PASS in0.018s. They include stale
schema/files, source and raw mutations, compressed/legacy formats, failed
resolution, exact rational bounds, normalization, complete/partial coverage,
and peak endpoint selection. A prior selection fixture incorrectly omitted the
cumulative discrete-H maximum at index2. Its failed run/source manifest are
retained under `provenance/selection-failure`; correcting the expected index
set preserved the stronger selection algorithm. The H batch execution path
also originally re-integrated every H_d state in every batch; restricting it to
explicit batch indices removes repeated work while the full baseline union
still reconstructs every H_d checkpoint. A regression verifies that coverage.
The pre-main34-test manifest SHA is
`74f2147eff99b8b2e0e6b8f993ca5007fd7110ccc7e3ec99760f25407bcade94`.

## Main baseline wall-cap failure and explicitly scoped diagnostics

The baseline hit its frozen600s wall cap: elapsed600.034765108s, peak process
group RSS461201408 bytes, solver exit-9/watchdog reason `wall`. The runner exit
was1. The sealed history has90 actual accepted states0..89, through445us;
the planned100 steps/500us were not completed. The frozen plan and declared
steps are unchanged. Full500us qualification is UNKNOWN. Trusted raw-manifest
SHA is `2101782b7137c7b081f546e562eb2e4de838df2d24a1f3ef7d71e52974e22ba6`;
all13 listed payload/source/runtime files passed actual host SHA verification.

The normal successful-case loader continues to reject this artifact. An explicit
failed-wall-prefix diagnostic mode separately verifies the exact failed exit,
wall reason/cap, trusted seal, pinned sources, chronological finite prefix and
convergence of every saved step. It does not alter steps or promote the prefix
to a complete case. Tests cover both default rejection and explicit partial
inspection. Collector coverage now compares against the declared planned state
count, so complete saved-prefix coverage cannot pass the500us H or L1 gate.
The updated37-test suite PASSed in0.019s. These changes address the demonstrated
resource-failure case; no solver settings or physical budgets changed.

Parent review identified a diagnostic cancellation risk: using the absolute
change in summed species H could hide opposite species quadrature errors. The
collector now sums each species' absolute128/160 difference before dividing by
fixed initial total number; a regression preserves this conservative check.
The retained v12 relative adjacent-H diagnostic is reported alongside the
per-initial-particle adjacent and cumulative gates, with its original
max(1,abs(initialH)) denominator.

The first independent H128/160 batch at0,5,50,100,445us took22.450s and114MiB.
Summed H160 decreased from -7.31943815863347 to -7.319438332359094. All90 saved
states independently reconstructed N/E/P with maximum residuals
0/2.22e-16/4.50e-17. Exact rational saved-prefix L1 upper maxima were
.0005988849006655424 and .00057721594669726, below1e-3 for both species.
The500us gate remains UNKNOWN. Initial characteristic-function lower
discrepancies .10659340667974705/.11015076144477656 independently demonstrate
the finite initial mixtures' departure from exact Maxwellians, with the stated
binary64 transcendental-evaluation limitation.

## Final independently checked scope

The main numerical diagnostic ledger is 870.267s, below the frozen 1200s
reserve. Every scientific invocation stayed within 120s. Maximum measured
reviewer RSS was 730820KiB for the optional q96 metadata/initial-PDF diagnostic,
below 1GiB; that invocation also had a 1GiB virtual-address limit. Ordinary
baseline diagnostics peaked near 114.5MiB. Thirty-eight reviewer tests PASS;
no producer diagnostic implementation was imported. `final-summary.json` binds
the numerical outputs with hashes; its SHA256 is
`ab88955393fb90279f35b006839c4e69938fcdfd3d62f4759a44903282d1eb1b`.

| Case | Actual H128/160 coverage | Maximum adjacent rise/N0 | Cumulative rise/N0 | Declared-horizon H decision |
| --- | ---: | ---: | ---: | --- |
| Baseline, planned 500us | 90 saved states through 445us | -5.55187e-11 | 0 | UNKNOWN: incomplete |
| Operator q32, 100us | 21/21 | 3.53787e-10 | 4.23273e-9 | PASS unchanged 1e-8 budgets |
| Operator q64, 100us | 21/21 | -1.25165e-9 | 0 | PASS |
| dt10us, 100us | 11/11 | -2.69155e-9 | 0 | PASS |

The retained v12 relative adjacent-H gate also passes for all three complete
100us controls, and remains UNKNOWN for planned 500us. The q32 physical H does
increase: passing its finite tolerance is not an exact full-space H theorem.
Independent order192 refinement covered actual selected indices:
baseline 0/10/20/88/89, q32 0/1/10/19/20, q64 0/10/19/20, dt10us 0/5/9/10.
These include both endpoints of every selected worst physical/discrete rise.
Maximum noncancelling 160/192 sensitivity was 6.3061e-14 per particle. The H
statements use numerical order-ladder resolution and analytical Gaussian-tail
inequalities, not a rigorous quadrature error enclosure.

All 143 saved states across these four cases independently preserve species
number, total energy and positive-scale momentum within 1e-8. Maximum
number/energy/momentum residuals are 0/2.22e-16/4.50e-17. All represented mixtures
are analytically strictly positive, so their negative-number fraction is exactly
zero; floating-point density underflow is not a negative PDF.

Exact rational all-state drift bounds pass 1e-3 for complete 100us controls.
Largest species bounds are q32:2.2057e-5, q64:5.2655e-4, dt10us:4.2262e-4.
Baseline saved-prefix bounds pass, but missing 500us states remain UNKNOWN.
Numerical baseline final 445us drift is 2.59039e-4/2.54108e-4 for 40u/84u,
with 128/160 sensitivities 4.54e-9/1.23e-7, passing separate 1e-6 resolution.
These tests concern drift from the actual finite initial KDE, whose departure
from an exact Maxwellian remains explicitly recorded.

All 12 numerical species/time cross-increment comparisons at 50/100us PASS 2e-4
and 1e-6 integration resolution. Maximum differences are q32:1.86465e-4,
q64:4.37309e-5, dt10us:1.14417e-7. Worst resolution sensitivity is8.624e-8,
with excluded-number tails below 6.85e-16. Exact triangle upper certificates
above 2e-4 remain UNKNOWN alongside these resolved numerical results; they are
not relabeled failures. Actual serialized initial PDFs of all three controls
are exactly identical to baseline, verified by equal centers, weights and
variance. Raw initial L1 is exactly 0, and raw current L1 difference equals
evolution-increment L1 difference. This 100us pairwise agreement does not
establish asymptotic convergence or qualify missing particle-count/variance/
fine-timestep studies.

The optional initial alpha .0625/q96 rate diagnostic is a retained
underresolution result. Operator-quadrature species numbers are
.9999999999999061/.9999999999999225, yet H128/160 and H160/192 sensitivities are
2.73e-7/6.73e-8 per particle, exceeding 2e-10. Physical-H resolution is UNKNOWN.
H_d minus the order192 estimate is about -4.99e-5 per particle. This discrepancy
is consistent with entropy-functional aliasing, but the unresolved diagnostic
is not a rigorous full-space H error bound and does not prove gradient
resolution. Number agreement alone does not establish entropy resolution.
The independent physical-rate study's four 2% gate failures remain failures;
no smoothing prediction replaces its physical target.

No further dynamics were run or caps extended. The 500us baseline, unrun
particle-count/variance/fine-timestep controls, exact Maxwellian equilibrium,
zero-smoothing limit and full unregularized Landau qualification remain
unestablished. Positive results validate specified finite-representation
properties and short comparisons, preserving physical-rate failures and
coverage limits.
