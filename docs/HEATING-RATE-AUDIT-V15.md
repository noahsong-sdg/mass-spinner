# Independent heating-rate study contract, v15

Prospective contract, 7 November 2026 UTC, before v15 main-case outcomes.
The reviewer owns `scientific/structure-rate-review-v15` and imports no producer
numerical implementation. Existing v14 failures, source pins and artifacts stay
immutable. This is an initial-rate and short-step study, not a claim of finite-time
separator or full-3V engine qualification.

## Physical target and fixed gates

The physical problem is homogeneous 40u/84u, charge +e each, nominal number
density 5e17 m^-3 each, zero bulk drift and nominal smooth temperatures 2/10 eV.
The Coulomb logarithm is fixed at 12. The unsmoothed Maxwellian initial light-ion
rate remains 27982.16330006834 eV/s. Its relative acceptance budget stays **2%**.
The heavy-ion rate has the opposite sign at equal actual species numbers.
Density, Coulomb coefficient, masses and target cannot be fitted to outputs.

Actual time-step outputs retain the 1e-8 species-number, total-energy and
positive-scale momentum budgets. Positive Gaussian mixture weights and variances
establish strict mathematical PDF positivity; numerical underflow is separate.
The v14 entropy and distribution gates are not waived. A study that only computes
initial derivatives cannot pass a missing finite-time H/L1/horizon gate.

To separate numerical and physical errors, score and pair-integral resolution are
checked independently on identical encoded initial states. Each finest-order
rate change must be at most 2e-4 of the fixed physical target. This prospective
diagnostic precision budget is 100 times smaller than the physical 2% gate;
it is not a replacement physical target. Independent implementation agreement
uses the same budget, with tighter algebra/fixture tolerances where feasible.
Unresolved integrations yield UNKNOWN; resolved rates outside 2% yield FAIL.
A physical pass is not accepted merely because two unresolved errors cancel.

The nonzero-rate timestep ladder must retain the same initial arrays, kernel
variance, entropy operator, source and solver policy. It compares actual stable
raw-velocity endpoint slopes to the infinitesimal derivative of that same
operator. A successful common-temperature timestep study is not such evidence.
The finest timestep change must meet the same 2e-4 relative diagnostic budget.
Recorded root residuals and entropy/energy/momentum residual contractions must
be checked; a solver success string alone is insufficient.

## Representation and initial-shape controls

The type-I entropy is H=sum_s integral F_s log F_s d3v for the declared smooth
Gaussian-mixture PDF. A factorized initial tensor mixture permits exact algebraic
separation of the full-space entropy gradient, using a one-dimensional Gaussian
expectation of each one-dimensional mixture score. This shortcut is valid at
that factorized state. It is not an entropy-gradient implementation for a general
evolved 3V particle distribution and must not be substituted into arbitrary
Gonzalez residuals without the missing derivative terms.

The producer may use positive raw trapezoidal Gaussian weights on a uniform
velocity grid over the declared truncated marker Gaussian. No post-hoc weight
normalization, fitted velocities or temperature correction is allowed. Every
case exports raw number and moment errors. With one-dimensional weight sum S,
the represented 3D number is S^3, not exactly 1. Its temperature denominator is
the actual S^3. For a unit-number target g, a valid product-shape bound is
integral abs(product f-product g) <= (S^2+S+1) integral abs(f-g).
Alternatively a target with the fixed actual initial number must be named
explicitly; normalizing each changed output snapshot is excluded.

Initial shape is reported independently of subsequent stationarity. Actual 1D
absolute-PDF integration is refined and its Gaussian tails bounded. Its
integration-sensitivity budget remains 1e-6. A small characteristic-function
discrepancy alone cannot establish a small full-PDF error. Joint particle/width
cases must include independent operator-resolution controls at fixed particle
count and width. The printed particle count is n^3 per species even when the
tensor is encoded implicitly; such a result does not show that a time-evolving
engine has advanced that many particles.

## Pair kernel, coincidences and provenance

The Landau kernel is full Cartesian 3V: Q(z)=(I-zz'/abs(z)^2)/abs(z). A positive
Laplace representation can reduce initial tensor pair work to one-dimensional
moments. Its quadrature and infinite-tail treatment require separate checks.
The convention Q(0)=0 must be retained exactly. Generic coincident pairs need
the corresponding discrete point contribution removed from the Laplace
representation; setting a nonzero speed cutoff would change the physical law.

Independent direct 3V cross-pair sums on small actual tensor cases check the
separated algorithm, signs, both mass factors, raw weights and temperature
normalization. Independent one-dimensional adaptive integration checks selected
exported score expectations. Analytic Maxwellian, equal-temperature, density
scaling and conservation fixtures check SI normalization separately.

Each immutable case must export its exact 1D nodes, raw weights, variances,
mass and SI scales, calculated score-gradient arrays, all score/pair quadrature
identities, actual rates, source/plan hashes and resource status. These values
encode the actual initial 3V PDF. Time-step cases additionally require complete
actual initial/final 3V velocities. Raw data are accepted only against externally
trusted seals with exact membership, source equality and finite chronology.
Stale, duplicate, truncated and one-byte-mutated inputs must be regression-tested.

All scientific computation and tests execute offline in this reviewer's distinct
Apple safe-dev VM. Source is copied and explicitly synced. Valuable guest output
is exported and actual host bytes hash-verified before replacement sync. Host
actions are reviewed reading, editing, copying and checksum verification only.
The main plan and resource caps must be frozen before large-case outcomes.

## Independent evidence obtained

The prospective text above was frozen with SHA256
`1765bd791967a8d09c85dc2c045bc83252b3b45fc71d28814658ac2f7764c07c`
before the large cases. The reviewer directly accepted the initial-rate plan
`48691aab98e13e973d0a225dae1813e32598fb8cfd3266b43881c22a74a009f5`
and timestep plan
`17b64bf6b75bb8b3a4e3e8f37a356b756eacc4d1ea8929db9230bd85853c2947`
before their main outcomes. The lattice producer's final pre-main source is
`8c888537b2672191b7039956dd62203eeb9309d42460cbc8032558614afe31d5`.

All calculations below run in the reviewer's separate offline Apple safe-dev
VM `safe-dev-4c6cb3e9b7cf3de6`, using NumPy 2.2.6 and SciPy 1.15.3.
Those two pinned dependencies were downloaded in explicit online setup calls;
scientific tests and calculations were offline. No producer numerical module is
imported. Source snapshots were explicitly synced and every valuable preceding
guest export was checked against actual host SHA256 bytes before replacement.

The first independent replay reproduced all four frozen v14 raw endpoint slopes:
16900.18065242916, 16585.578469701035, 24480.569232430687 and
17306.153775691502 eV/s. They remain physical FAILs. The old outputs and reports
are unmodified; replay inputs are checked against their previously frozen seals.

Independent adaptive, component-centered Gaussian score expectations and adaptive
log-Laplace integration reproduced all five producer pilots within 7.4e-7 eV/s.
Direct actual Cartesian-3V sums on the small GH tensors agreed with this separate
pair integral within 1.6e-12 in normalized work. Coincident, unequal-weight and
unequal-mass fixtures independently verify Q(0)=0 and energy/momentum conservation.

The coarse lattice n=64, alpha=.00625 pilot is particularly instructive. The
regularized marker rate is 32124.68975853 eV/s, 14.804% above the target. Raw
species numbers differ from one by only about 1e-14 and temperatures are 2/10 eV,
but adaptive absolute-PDF integration gives light/heavy 1D errors
.01067095257/.49000088501. The heavy product-envelope is about 1.4700. Agreement
of a scalar physical GMM heating rate with the Maxwellian target therefore cannot
establish a Maxwellian input PDF. Correct moments conceal strongly oscillatory
inputs. This is verified input error, not a conservation or root-solver failure.

## Actual timestep replay

The final timestep archive seal
`0083c3b09bf257b25dc360e4a390a49a81f859b1ce8c7233e06ab7274a3034a3`
passes exact membership and every-file SHA checks. The reviewer independently
reconstructs species-scaled GH initial arrays, GL quadrature, physical scales,
initial entropy gradients/mobility, all 15 raw endpoint slopes and changes in
energy/momentum. On the largest and smallest q48 steps and smallest q64/q96
steps it also recomputes the full finite-H_d Gonzalez residual and contractions
from complete raw state/quadrature arrays.

Initial-gradient disagreement is 7.56e-16 at q48 and 7.05e-15 at q96; mobility
disagreement is at most 4.44e-16. The independently recomputed residual norms are
1.206e-14 at q48/2.56us, 7.782e-16 at q48/.625ns and 1.025e-15 at q96/.625ns.
The stable entropy increment agrees within 3.47e-17. Independently computed
entropy balances and residual contractions agree at roundoff scale.

The q48 light initial derivative is 16899.59077870642 eV/s. Its endpoint slope
changes from 17041.31043562611 at 2.56us to 16899.62765424909 at .625ns.
At q96 the derivative and smallest endpoint slope are 16900.64121394912 and
16900.67811471011. These controls converge to the same discretized-operator
derivative, while retaining roughly 39.6% physical error. A converged nonlinear
root and refined timestep therefore do not repair the physical-rate failure.
Rates are finite-step averaged derivatives; their O(dt) approach does not imply
the state integrator has only first-order accuracy.

## Audit fixes and regression coverage

The independent reviewer initially assumed one common quadrature and a combined
species density. The actual code uses two species quadratures and H=sum H_s;
combining densities would introduce an unphysical mixing contribution. The first
raw attempt stopped at an earlier manifest guard and produced no such numerical
outcome. The reviewer now integrates each species separately. A collapsed-center
regression explicitly distinguishes separate entropy from combined-mixture
entropy, and an actual n2/q2 species-scaled tensor fixture is checked against a
scalar reference. This matches the defined entropy directly without altering the
collision metric. The pre-correction reviewer source and passing but incomplete
earlier test log are retained under `scientific/structure-rate-review-v15/provenance`.

The first timestep partial seal covered primary artifacts but omitted retained
pilot/parse-failure provenance. Exact-membership verification rejected it. The
producer subsequently sealed every retained regular file in the complete export;
the reviewer uses that closed archive. This avoids silently trusting an unsealed
part of the evidence. The initial-rate producer likewise supplied a closed raw
archive with seal
`2e0b8c1412a79bd16f40bf780de54c2d4366acbb106050867d516df3d4b92786`.

The reviewer's 12 regression tests pass: SI normalization; exact coincidence and
unlike-weight/mass pair identities; nonfinite input rejection; external manifest
mutation, truncation, stale extra and duplicate membership; missing source pins;
duplicate JSON fields; raw-number shape bounds; stable slopes; finite entropy
gradient/increment; separate-species entropy and n2/q2 tensor; and conservative
mobility. These tests establish implementation checks; they do not certify full
finite-time Coulomb convergence or a separator simulation.

## Joint particle/width results

The closed initial-rate raw archive passes exact membership and every-file SHA
verification. An independent consumer found exactly the prospectively planned
96 records. Every rate-integration comparison is resolved: the maximum separate
score-order rate change is .000912893 eV/s, the maximum pair-order change is
4.39e-8 eV/s, and the largest exported analytic omitted-pair-tail rate bound is
1.14e-8 eV/s. Each is below the unchanged 5.59643266 eV/s diagnostic budget.
Rate status is separate from shape-integration status: a definite rate FAIL
remains FAIL when the global GL absolute-PDF diagnostic is unresolved.

The reviewer then independently recomputed nine representative cases with
component-centered adaptive score integration, adaptive log-Laplace integration
and actual adaptive absolute-PDF integration. The source imports no producer
numerical routine. Every rate agrees with the producer within 1.14e-7 eV/s;
all selected shape integrations refine within 1e-6. Seven prospectively selected
cases took .82–11.44s each. Two additional independent checks requested by the
parent cover the remaining scalar-rate PASSes; both complete within the same
180s cap. Thus all six scalar-rate PASS cases have independent adaptive rate
recomputations, in addition to the 96-record sealed-data convergence checks.

| n per axis | alpha | Independent light rate, eV/s | Physical 2% gate | Heavy 1D PDF error |
| --- | --- | --- | --- | --- |
| 32 | .00625 | 17337.06807818 | FAIL | 1.08769898 |
| 64 | .00625 | 32124.68975853 | FAIL | .49000089 |
| 128 | .00625 | 27788.42989722 | PASS for this moment | .02612577 |
| 128 | .0125 | 27499.09608851 | PASS for this moment | .00053608 |
| 256 | .00625 | 27742.27482045 | PASS | 1.997e-7 |
| 256 | .0125 | 27499.17592476 | PASS | near binary64 floor |
| 512 | .00625 | 27742.27559410 | PASS | near binary64 floor |
| 512 | .0125 | 27499.18510289 | PASS | near binary64 floor |
| 512 | .25 | 14808.73674186 | FAIL | near binary64 floor |

This isolates the two main causes. At fixed narrow width, inadequate particle
spacing produces gross input-shape errors and nonmonotone rates; the n128 rate
can pass while its heavy marginal still differs by 2.61%. At resolved spacing,
the broad alpha=.25 input is accurately Maxwellian but the regularized marker
rate still fails. It approaches the independently derived finite-width limit,
not the physical unsmoothed target. Both particle spacing and kernel variance
must therefore be refined. Only the initial tensor representation is compressed:
n512 means 134,217,728 logical markers per species and no evolved run of that size.

The independently audited regularized-continuum limits use the same smooth
2/10 eV targets, hence marker variances a=.4-alpha and b=(2-alpha)/2.1.
The score/mass bracket is -2.5*v_a+.5*v_b. Conditioning on relative velocity and
using Q(z)z=0 gives normalized work
`-4*a*b/(a+b)*sqrt(2/(pi*(a+b)))`, with rate `-10*kappa*work/3`.
At alpha .25/.0125/.00625 the limits are
14808.7374556333/27499.1867064148/27742.2736133111 eV/s. Independent n512 rates
are within .002 eV/s of these controls. The remaining .857% narrow-width physical
bias is therefore explained, not fitted away. The physical target stays
27982.16330006834 eV/s.

The adaptive product-PDF envelopes include Gaussian tails, estimated numerical
quadrature errors and the analytic raw-number product inequality. They are not
machine-interval certificates at the binary64 floor. The n256 heavy envelope is
5.991e-7; the n128 envelope is .0783773. These distinguish an accurately sampled
input from a fortuitously acceptable single moment. The independent adaptive
integrations resolve the selected n128/64/32 shape diagnostics that the producer's
global fixed GL absolute-value integration had conservatively left UNKNOWN.

## Acceptance and retained limits

The initial-reference heating-rate gate is repaired on the jointly refined
inputs at alpha .0125 and .00625. The original coarse evolved-state backend is
unchanged and still fails its physical heating-rate gate by about 39.6%.
Time-step/root convergence, initial-reference convergence, and finite-time
physical validity are separate conclusions. No new finite-time full-space H,
distribution, stationary state or 500us horizon has been qualified here.

The reviewer slice contains 591 non-test source lines across its five modules.
Final source pins include `review.py` d051ce8184d8f90991cbd4185893993737718693274a13da976fc97abdbf3505,
`review_steps.py` 495b4854e3d183e510f0edd4af928848a3469a0e0cb85f2bf73fdf34c1e68c6d,
`review_campaign.py` a607e7e9630779712538724d91bf2effa2ebfcbdfb2bcac0d41617607439e87f,
and `audit_selected.py` 7da74b19bc8972fb025c01eef2b0a6b22e8b77f65adb4ae834903a3f766eaf29.
All 12 tests were rerun on this exact copied source snapshot. Root application
build/typecheck remains the parent's final gate; this reviewer changes no app code.

Final immutable reviewer export: `/tmp/mass-spinner-review-v15-final-export-03`.
Its `SHA256SUMS-review` external seal is
`f0d1367e78ebf011cbf64eeac7181676f16125b9b3f6c863056b24355502644c`.
All 558 listed regular files pass actual host checksum verification; exact export
membership differs only by the manifest itself. The canonical reviewer directory
also passes all 558 checks after copying the reviewed export. The archive retains
all raw inputs, accepted source snapshots, 12-test log, 96-record independent
convergence table, nine independently recalculated initial states, three raw-step
replay reports, and failed-attempt/correction provenance.
