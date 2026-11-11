# Heating-rate refinement and independent physics audits, v15

7 November 2026 UTC. All96 frozen initial-state records and15 actual implicit
steps completed. Independent audits confirm the refined initial-rate passes and
explain the remaining finite-width bias. The unchanged coarse evolved backend
still fails. Immutable v14 results remain available; this is an offline
collision-reference study, with finite-time qualification still open.

## What caused the old failures

The traced path is initial particle quadrature → Gaussian-mixture PDF → entropy
gradient → unlike-mass Cartesian Landau mobility → implicit Gonzalez/JFNK step →
temperature increment. The physical benchmark is unchanged: homogeneous 40u/84u,
+e/+e, nominal densities 5e17 m^-3 each, lnLambda12, no drift, smooth initial
temperatures 2/10 eV. The light-ion Maxwellian heating target remains
**27982.16330006834 eV/s**, with the original **2%** gate.

Three different rates must be kept distinct: the physical Landau rate of the
nominal Maxwellian, the physical Landau rate of the actual represented Gaussian
mixture, and the regularized marker dynamics' rate. An endpoint temperature
increment also introduces finite-time averaging. Comparing those quantities
without separating the errors obscured the cause.

| Old initial case | Physical Landau rate of actual PDF | Full-space regularized marker derivative | Old 10 ns endpoint rate |
| --- | ---: | ---: | ---: |
| GH4, alpha .25 | 30791.889916 | 16900.642128 | 16900.180652 |
| GH6, alpha .25 | 28608.756180 | 16587.059558 | 16585.578470 |
| GH4, alpha .125 | 33307.174100 | 24480.226467 | 24480.569232 |
| GH4, alpha .0625 | 39966.089624 | 17318.151348 | 17306.153776 |

All rates are eV/s. The first column was independently derived from Gaussian
bilinearity and actual serialized initial arrays; it imports no producer physics
implementation. The second is an initial full-space score reference, distinct
from the old finite-grid entropy operator. The third is the cancellation-resistant
raw-velocity endpoint reconstruction. Differences between the last two combine
quadrature and finite-step errors, so they are not themselves pure timestep bias.

For the baseline, the independent reference also checked byte-identical actual
initial arrays and decomposed the error without changing inputs:

| Controlled increment | Rate change, eV/s |
| --- | ---: |
| Physical actual-GMM rate minus nominal Maxwellian rate | +2809.726616 |
| Full-space regularized marker rate minus physical actual-GMM rate | -13891.247788 |
| Finite-grid entropy derivative minus full-space marker rate | -1.051349 |
| Actual10ns average minus same-grid instantaneous derivative | +.589874 |

Exact rational arithmetic on the retained binary64 quantities verifies that
these increments telescope to the complete observed discrepancy. The large
second term combines smoothing and finite marker sampling; the joint study below
separates their behavior. This is not a pure-error decomposition for the other
old cases, whose same-grid instantaneous derivatives were not separately studied.

Shrinking width at fixed GH4 makes the actual PDF's physical heating faster than
the Maxwellian reference, while the regularized dynamics remains much slower.
Accurate low moments therefore did not establish either a Maxwellian input or
an accurate collision operator. In plain terms, narrower blobs exposed gaps
between particles; the average temperature concealed the rough distribution.

Finite smoothing is a second, independent error. With normalized masses1/2.1,
variance `epsilon_s=alpha/m_s` and the fixed5eV normalization, maintaining smooth
2/10eV requires marker temperatures `2-5alpha` and `10-5alpha`. Even perfectly
resolved marker Gaussians then have a biased regularized heating rate. At alpha.25
that continuum prediction is14808.737456eV/s, far below the physical target.
Particle refinement at fixed width can consequently move a coarse result farther
from the physical target while converging to its correct *regularized* limit.

## The smallest coherent fix

Add a positive species-scaled uniform Gaussian quadrature family, retaining its
raw trapezoidal weights over ±8 marker thermal standard deviations. Refine its
spacing jointly with kernel variance. Export actual number, moments and full-PDF
shape diagnostics; do not normalize snapshots, adjust the physical coefficient
or fit a width to a single observed rate.

The initial PDF is an exact Cartesian product, so its full-space entropy coordinate
gradient reduces to a 1D Gaussian expectation of a 1D mixture score. A Laplace
identity likewise reduces Cartesian Coulomb pair work to1D weighted moments.
Literal small3V pair sums, exact coincidences and the frozen full3V entropy code
check these reductions. This permits a large, controlled initial-rate study without
materializing `n^3` markers or executing `n^6` pairs.

This choice resolves the representation question with directly refinable positive
weights. Brute huge pair loops are impractical, while a general evolved tensor
closure would require a new unvalidated physical assumption: collisions need not
preserve Cartesian independence. The existing general3V time-evolution kernel
is therefore unchanged. Initial tensor acceleration is not a replacement for
an evolved-state entropy gradient.

[The multispecies method's initialization](https://arxiv.org/html/2310.16143v1)
provides a primary-source basis for species-scaled uniform quadrature.
[The original particle method's mesh/width discussion](https://arxiv.org/html/1910.03080v2)
motivates joint refinement. Its nonlinear-diffusion analogy and empirical width
prefactor are not a Coulomb convergence proof; no such prefactor is fitted here.

## Joint particle/width study

The prospectively accepted matrix has n32/64/128/256/512 per axis and
alpha.25/.125/.0625/.025/.0125/.00625. Each of30 initial states has separate
score2048/4096 and pair512/1024 integration controls; six additional n512
controls test Laplace integration bounds24/30. That is96 frozen records.
Each integration-rate change must be within `2e-4` of the fixed physical target,
100 times tighter than its2% physical gate. Shape integration is checked
separately within1e-6. A definite resolved rate failure remains FAIL even if an
independent shape integral is unresolved.

All96 frozen records completed. The parent verified all316 members of the original
main export against its externally supplied manifest SHA256
`2e0b8c1412a79bd16f40bf780de54c2d4366acbb106050867d516df3d4b92786`:
zero changed, missing or unlisted files. All30 score/pair rate integrations meet
their precision budgets; shape integration has its own status. The producer's
finest-particle results are:

| alpha | n512 initial rate, eV/s | Physical error | Original2% rate gate |
| --- | ---: | ---: | :--- |
| .25 | 14808.736742 | -47.078% | FAIL |
| .125 | 22474.418925 | -19.683% | FAIL |
| .0625 | 25429.509656 | -9.122% | FAIL |
| .025 | 27003.104609 | -3.499% | FAIL |
| .0125 | 27499.185103 | -1.726% | PASS |
| .00625 | 27742.275594 | -0.857% | PASS |

At fixed alpha.0125, n256→512 changes27499.175925→27499.185103eV/s;
at alpha.00625 it changes27742.274821→27742.275594eV/s. Thus the fine results
are stable under particle refinement, and reducing the residual width moves
the rate toward the unchanged physical target. All96 raw records, complete
30-case table and separate numerical status flags are in
[the producer package](../scientific/structure-rate-v15/results/table.md).
The independent numerical reviewer checked all96 raw records, source/plan
identity, exact membership and every separate integration comparison. It then
independently recomputed nine initial states, including **all six scalar-rate
PASS cases**, using component-centered adaptive scores and a distinct adaptive
Coulomb integral. Agreement is within1.14e-7eV/s. Maximum producer score-order
change is.000912893eV/s; pair-order change4.39e-8eV/s; analytic omitted pair-tail
rate bound1.14e-8eV/s. All are below5.59643266eV/s.

Actual adaptive absolute-PDF integration and100-times tighter tolerance controls
resolve every selected shape diagnostic. At n256/alpha.00625 the heavy1D L1
error is1.997e-7 and its product envelope is5.991e-7. n512 is near binary64's
numerical floor. These envelopes include analytic Gaussian tails and estimated
quadrature errors; they are **not machine-interval certificates**. The review
also resolves selected coarse cases that the producer's global GL absolute-PDF
integral conservatively left UNKNOWN. Accurate integration of a large shape
error does not turn it into an accurate initial distribution.

A separate independent Gaussian-mixture calculation checks nine initial inputs,
including n64/128/256/512 at alpha.00625 and all six widths at n512. Their true
physical Landau heating moments match the nominal Maxwellian moment within
4.3e-13 relative, with bounded-integral refinement below6.2e-13 of the target.
Their represented PDFs are still checked separately, as the coarse example below
shows. At n512, regularized marker rates differ from independently derived
finite-width continuum controls by at most.041eV/s across all six widths.
For alpha.00625, the control is27742.273613eV/s versus computed27742.275594eV/s:
residual discretization is about.002eV/s, while the finite-width physical deficit
is about239.89eV/s. The dominant remaining bias is explained; it is not removed
by changing the target or coefficient.

The standalone [Matplotlib convergence figure](../scientific/structure-rate-math-v15/results/heating-rate-convergence.png)
shows all particle/width curves, the unchanged 2% band, an independent finite-width
continuum control and the separate heavy-PDF diagnostic.
[Vector SVG](../scientific/structure-rate-math-v15/results/heating-rate-convergence.svg).
It was generated offline with pinned Matplotlib 3.10.7 from the hash-verified
30-row summary, then visually inspected. Values at the display floor are explicitly
marked; the initial tensor has not been evolved at that encoded particle count.

Rate success alone is insufficient: n128/alpha.00625 gives27788.429897eV/s,
inside2%, but its heavy-species product-PDF error envelope is about.0784 and
its original global absolute-PDF integral fails the separate1e-6 sensitivity
budget. That case is not accepted as an accurate Maxwellian initial state merely
because its rate passes. The coarse n64 case below is an even stronger control.

The physical Gaussian-mixture reference is independent of entropy regularization.
For example, the pilot lattice64/alpha.00625 has a physical Landau heating rate
27982.163300080eV/s, effectively the Maxwellian heating moment, but regularized
marker rate32124.689759eV/s. The independent heavy1D PDF discrepancy is about.49.
Even a matching physical heating moment can hide a badly distorted distribution.

## Actual rate timestep study

All15 frozen actual implicit steps completed. Every step resets to the same
initial GH4/alpha.25 arrays within its operator-quadrature group; these are
independent one-step studies, not an accumulated trajectory. The q48 group spans
2.56µs to.625ns, and q64/q96 each span40ns to.625ns. The core and pinned
CollisionOperators.jl Newton–Krylov file are byte-identical to v14.

| Operator q per axis | Same-state instantaneous rate | 10 ns endpoint rate | .625 ns endpoint rate |
| --- | ---: | ---: | ---: |
| 48 | 16899.590779 | 16900.180652 | 16899.627654 |
| 64 | 16900.529999 | 16901.120237 | 16900.566897 |
| 96 | 16900.641214 | 16901.231493 | 16900.678115 |

The q48 ladder starts17041.310436eV/s at2.56µs and approaches its own initial
derivative. q64→96 changes that derivative by only.111215eV/s. These time and
operator-quadrature effects cannot explain the roughly39.6% physical deficit.
All15 physical rate gates remain FAIL; a converged solve of the wrong-resolution
collision dynamics does not validate its physical rate.

No step accepted its predictor unchanged. Maximum actual nonlinear residual is
2.695e-14 against1e-12 tolerance. Maximum discrete entropy-balance residual is
7.13e-16. Exact rational arithmetic on the serialized binary64 endpoints bounds
rate-calculation roundoff: stable increment arithmetic differs by at most
1.10e-11eV/s; naive printed-temperature subtraction differs by up to5.84e-6eV/s.
Those are endpoint arithmetic checks, not certified implicit solution-error bounds.
An independent implementation reconstructed all15 raw endpoint slopes and
recomputed the initial finite-grid entropy gradients and mass/weight mobility.
Selected full Gonzalez equations were replayed at the largest and smallest q48
steps and the smallest q64/q96 steps. Replayed residuals include1.206e-14 for
q48/2.56µs and1.025e-15 for q96/.625ns; stable entropy increments agree within
3.47e-17. This independently excludes a hidden predictor acceptance or wrong
implicit equation as the dominant cause. Independent initial finite-grid gradients
agree within7.56e-16 at q48 and7.05e-15 at q96; reconstructed initial mobility
agrees within4.44e-16. All15 raw slopes and four selected complete implicit
equations were checked, rather than merely accepting a solver status string.

## Independent review, fixes and provenance

Separate agents own initial-rate implementation, physical Gaussian-mixture
mathematics, actual implicit timesteps and independent numerical/gate replay.
The reviewer imports no producer numerical implementation. The parent additionally
traces changed paths and verifies exported host bytes.

The audit caught and corrected an independent replay assumption before numerical
acceptance: the original engine has separate quadrature grids and entropy
densities for each species. Treating both as a single density would compute a
different entropy. The independent replay was corrected to sum species entropies
and receives explicit mixed-versus-separated and raw-schema regression tests.
This was a reviewer implementation issue; it did not justify changing the solver.

A partial timestep seal initially omitted retained pilot/failure provenance.
The consumer rejected exact membership. The final77-member seal covers all those
files; its SHA256 is
`0083c3b09bf257b25dc360e4a390a49a81f859b1ce8c7233e06ab7274a3034a3`.
The parent checked all77 actual exported host hashes and all77 canonical copies.
Omitted source pins, duplicate/stale/truncated inputs and byte mutations are
regression cases. The final initial-rate producer seal covers331 regular files:
`1109e20f55c53d3ebf29f56b1d3dcf480d15349376b5b5e491996c4b6e7a35b5`.
All331 exported and canonical hashes pass the parent's checks; exported exact
membership has no missing or extra members.

The independent numerical reviewer seal covers558 regular files:
`f0d1367e78ebf011cbf64eeac7181676f16125b9b3f6c863056b24355502644c`.
All558 exported and canonical hashes pass the parent's checks. It retains nine
independently recomputed initial states, all96 raw-case checks, three endpoint
replay reports, selected complete equation replays and correction/failure provenance.
The separate mathematical-reference manifest covers203 canonical members,
including its report; SHA256:
`dcf3cca479dbdf9dad0017d378e86e35f21124597ae267198fc2eec6cc377c8a`.
The parent verified all203 canonical bytes and all202 corresponding guest-export
files. The report is a host-authored explanation outside that guest's copied source.
An exact-membership guard also found a stale prior `ARTIFACTS.sha256` in the guest
export. It was retained as provenance, and a separate complete203-file archive map
was created, without changing scientific source or results. Its external SHA256 is
`85a1ec52bf575108fcb0788903ec519eeff92f0f9867e190301771e9f5d6017c`.
The parent verified every mapped archive byte, exact membership and the identical
canonical `closed-export-sha256.json` copy. The authoritative current scientific
manifest remains the external `dcf3...` seal above. The final PNG SHA256 is
`a6998013a30784861530b8dc68486a1013846ee5473faba1bb28cf699a6ab37b`.
An earlier visual review found an inset covering coarse curves; moving that inset
into empty plot space corrected the presentation without changing scientific data.

All scientific code/tests executed in distinct Apple safe-dev copied-source VMs,
offline except scoped dependency downloads. Host operations were trusted reading,
editing, explicit copying and checksum verification. Valuable outputs were exported
and host-verified before replacement syncs. Numerical failures and earlier parse
failures are preserved. No physical threshold or Coulomb coefficient was relaxed.

## Checks, review units and remaining qualification

Actual timestep checks: unchanged Julia core46 assertions, new runner7 assertions
and Python4 test methods passed. Initial tensor regressions:35 Julia assertions
passed, including actual frozen full3V gradient/entropy equivalence after resolving
its quadrature; seven Python ingestion regressions also pass. Independent physical
mathematics:12 tests pass. Independent raw numerical/gate review:12 tests pass,
including corrected separate-species entropy and actual tensor-schema regressions.

The fresh application gate passes262 tests, typecheck, build and static-site
checks on the exact243-file copied runtime snapshot. The parent compared every
input hash with current corresponding source: no differences.
[Commands, snapshot and exported logs](../scientific/verification-v15/README.md).
The existing renderer chunk-size warning remains. This is distinct from physical
validation; production physics and deployment were not changed.

These versioned evidence packages are reviewable separately: unchanged pinned
source reproduction; initial-rate tensor implementation; actual timestep harness;
independent Gaussian-mixture derivation; independent raw numerical/gate replay.
Keep unchanged vendored copies separate from new harness logic in any future PR
to respect the700-line non-test limit. No PR was created by this study.

Even an accepted initial-rate result does not qualify finite-time physical entropy,
PDF convergence, the previously incomplete500µs horizon, self-consistent fields,
transport, separator throughput or experimental device performance. The n512
initial benchmark encodes134,217,728 markers per species; it has not advanced
that many particles. A practical general3V engine needs a separately validated
fast entropy/pair evaluation before that resolution can be evolved. Existing
cross-code distribution failures are retained rather than declared fixed by an
initial heating-rate comparison.

Detailed evidence: [prospective integration plan](HEATING-RATE-PLAN-V15.md),
[initial-rate producer](HEATING-RATE-PRODUCER-V15.md),
[independent physical derivation](HEATING-RATE-MATH-V15.md),
[actual timestep study](HEATING-RATE-TIMESTEP-V15.md),
[independent numerical audit](HEATING-RATE-AUDIT-V15.md).
