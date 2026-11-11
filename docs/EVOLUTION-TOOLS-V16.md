# Practical collision evolution: independent tool and scope review, v16

7 November 2026. This is a source/architecture review. It does not certify a
numerical campaign, a general anisotropic collision solver, or the separator.
No dependency, scientific computation, upstream code or project script was
executed for this review. Host operations were trusted source reads and hashes;
primary literature and upstream documentation were reopened through web tools.

## Root cause and the smallest useful fix

The current executable path is `scientific/structure-preserving-v14/core.jl`:
`advance` (line 172) calls `newton_krylov!`; each nonlinear residual calls
`discrete_gradient`, which calls `entropy` and `entropy_increment`, then
`mobility`. Entropy work visits every Cartesian integration point and every
marker of its species (lines 94–139); mobility visits every particle pair
(144–161). With n points per velocity axis and q quadrature points per axis,
those costs are O(n³q³) and O(n⁶), per residual, not per accepted time step.

In plain terms, narrowing the Gaussian makes the distribution more accurate but
requires many more markers. The implicit solver repeatedly recomputes all their
interactions. The v15 acceleration solves only the factorized **initial** state:
its reported n512 means 134,217,728 implicit markers per species, not a practically
evolved state. The existing v15 report explicitly preserves this limitation.
Changing the linear solver or using a smaller timestep does not remove this
dimensional growth.

Use a separately identified **isotropic, homogeneous collision-reference backend**
for the current zero-drift thermalization studies. Evolve arbitrary radial shell
positions and their full radial distributions; do not constrain each species to
remain Maxwellian. This replaces geometric redundancy with an exact angular
integration, while retaining radial sampling, entropy quadrature, smoothing and
time-integration errors as explicit convergence variables. It is the smallest
coherent fix for these benchmarks, not a general replacement for full-3V work.

## What the radial reduction must mean

For the true Coulomb tensor Q(z)=(I−zzᵀ/|z|²)/|z|, angular integration of a
uniform source shell gives radial diffusion proportional to

    s² C(r,s),    C(r,s) = 2 / (3 max(r,s)³).

This normalization has a primary-source cross-check: Gualdani–Guillen,
[Proposition 3.2, equation 3.2](https://arxiv.org/html/1412.0146), gives the
radial tensor coefficient as an inner second moment divided by 12πr³ plus an
outer inverse-radius moment divided by 12π. Their tensor contains 1/(8π).
Multiplying out that factor gives precisely (2/3)s²/max(r,s)³ per unit shell
mass. The paper also distinguishes this true tensor equation from the
Krieger–Strain scalar-diffusion equation often called “isotropic Landau.” That
modified equation is not the intended backend.

The shell method is new adapter algebra: the source formula checks its angular
coefficient, not its entire discrete update. Required independent checks include
mass/weight and unequal-species factors, pair symmetry, null energy direction,
positive semidefiniteness, the discrete entropy chain rule and finite-time
convergence. At r=s>0 the angular integral is finite and nonzero; it must not be
removed using the point-marker Q(0)=0 convention. A point at zero radius needs a
derived limit and radial regularity treatment, not an arbitrary radius floor.

For Gaussian-smoothed uniform shells the density is the angular average of a
3D Gaussian. Its entropy must be

    H = 4π Σ_s ∫₀∞ r² F_s(r) log F_s(r) dr,

not ∫p log p dr for p=4πr²F. The latter inserts a radius-dependent force and
changes the operator. Stable exponential/sinh evaluations are numerical work,
not permission to clip a density or radius. Fixed positive shell weights provide
nonnegative reconstructed F; they do not prove that it converges to physical
Landau evolution as smoothing vanishes.

[Carrillo–Hu–Van Fleet, Corollary 2.4](https://arxiv.org/html/2310.16143v1)
requires common m_s ε_s for the regularized multispecies equilibrium to have a
common temperature. Thus ε_s=α/m_s is appropriate. Conserved marker energy and
the fixed smoothing-energy offset must both be exported. Common smoothing
energy is necessary here; it is not a proof of correct finite-α heating or a
finite-time Coulomb solution. Their Coulomb examples demonstrate relaxation,
whereas their exact BKW comparisons use Maxwell interactions.

Rotation-equivariant collision dynamics preserve an initially rotationally
invariant state under the usual uniqueness assumptions. Consequently arbitrary
radial non-Maxwellian shapes are allowed throughout the homogeneous test. This
does **not** justify radial closure under the separator's electric acceleration,
RF heating, anisotropic injection, magnetic geometry, spatial gradients or
losses. A uniform B acting on an exactly isotropic local F alone is a special
case with zero magnetic velocity advection; it does not establish radial closure
for a rotating separator. No Cartesian product/tensor closure may be imposed on
general evolved states.

## Existing implementations and acceleration choices

| Route | Evidence checked | Useful role and remaining qualification |
|---|---|---|
| Existing pinned Julia JFNK | Actual local vendor hashes; reopened upstream pinned source and MIT license | Keep unchanged. It solves the new residual; it supplies neither radial physics nor a physical-H certificate. |
| Exact angular shell reduction | Primary radial tensor moment formula above; independent new species adaptation | Best immediate fit for isotropic collision benchmarks. O(nq+n²) direct work and O(n) state; arbitrary radial shape, no angular physics. |
| General3V treecode | Original particle paper's Appendix B explicitly accelerates Gaussian, Gaussian-gradient and tensor sums | Appropriate next deterministic research route when angular dynamics are required. Approximate sums need tolerance sweeps and a symmetric/PSD construction before inheriting the original conservation/H proof. |
| Fourier/NUFFT particle evaluation | Upstream FINUFFT docs and an actual recent author repository | Useful kernel-evaluation building block, not a Landau integrator. Spectral/periodic-domain truncation, positive reconstruction and variational adjoints require separate proof and tests. |
| Random-batch particle dynamics | Primary regularized Landau paper and newer stochastic pair-diffusion paper | Promising scalable general3V option. Adds stochastic/weak-convergence studies; not a substitute for deterministic PDF convergence at one seed. |
| PETSc LANDAU/Rosenbluth grid reference | Official current LANDAU API, example source, earlier project qualification reports | Retain as a genuinely different discretization for cross-checks. Its own PDF, positivity, domain and mesh convergence must pass before treating it as a reference. |

[Carrillo–Hu–Wang–Wu, Appendix B](https://arxiv.org/html/1910.03080v2)
discusses tree acceleration of all five relevant sums, not just final pair
mobility, with O(N log N) target complexity. This addresses the actual Gaussian
entropy bottleneck better than a pair-only optimization. That paper is algorithm
evidence; this review did not establish a licensed, pinned, ready-to-run
multispecies full3V treecode implementation. A generic Laplace FMM also does not
automatically supply Gaussian entropy sums or preserve pairwise dissipation.

[FINUFFT](https://finufft.readthedocs.io/en/latest/) exposes controlled-tolerance
1D/2D/3D nonuniform transforms, Julia interfaces and CPU/GPU paths, under Apache
2.0. No FINUFFT code is installed or vendored by this review. The author
[fast-spectral-particle-landau repository](https://github.com/giacomoborghi/fast-spectral-particle-landau)
currently describes a MATLAB, homogeneous **2D Maxwell-molecule** demonstration
with explicit Euler and a type-II blob comparison. It is not a drop-in 3D
Coulomb, unlike-ion, type-I discrete-gradient implementation. Its front page did
not expose a project license; neither a reproducible pin nor redistribution
permission was established here. Do not import its bodies on the strength of
its bundled FINUFFT notices.

[Carrillo–Jin–Tang](https://arxiv.org/html/2110.06430v1) batches the regularized
deterministic particle model and establishes structural properties for that
construction. Symmetric batching can preserve invariants and regularized-H
dissipation; randomness does not inherently forbid those properties. An
unequal-mass extension still needs correct symmetric sampling/normalization and
batch, timestep, seed-ensemble and distribution convergence. The
[Du–Li–Xie–Yu stochastic method](https://arxiv.org/html/2501.00263v1) instead
uses pair diffusion and spherical Brownian sampling: exact advancement of its
pair process does not make its finite-batch distribution the exact Landau PDE.
These are distinct operators/integrators, not interchangeable speed settings.

Official [PETSc LANDAU documentation](https://petsc.org/release/manualpages/LANDAU/)
exposes adaptive-mesh velocity-space construction and TS function/Jacobian
methods; its [example source](https://petsc.org/release/src/ts/utils/dmplexlandau/tutorials/ex2.c.html)
contains separate axisymmetric and 3V paths. Established tooling and accelerator
support justify keeping it as an independent reference. They do not remove
the project’s already reported failures of particular mesh/PDF/entropy studies.
A full Rosenbluth solver is an equivalent continuum formulation with its own
potential boundary, discretization and conservation corrections, not the same
Gaussian particle residual. This pass did not install another heavy solver.

A particularly relevant independent PDE route is
[Shiroto et al., isotropic multispecies RFP](https://arxiv.org/html/2011.13086)
([journal version](https://doi.org/10.1016/j.jcp.2021.110813)). Equations 9–10
give the true radial multispecies RFP system; equations 3 and 14 expose the
mass-scaled collision coefficient and antisymmetric interspecies energy
exchange. Their DG formulation preserves mass/energy and reproduces equilibrium
to discretization accuracy. Those properties do not establish this project's
positivity and entropy gates. No ready licensed pinned implementation was
established from that paper. It is a strong specification for a genuinely
independent radial PDE reference, as a separate implementation stage.

The newer [Seo et al. multispecies DG RFP article](https://doi.org/10.1016/j.cpc.2025.109983)
describes a gyro-averaged 2V formulation neglecting FLR, B-spline potential
solves, and added conservation/equilibrium corrections. Its publisher-index
content states that only a portion of the collision module and documentation
is public, while complete compilable gyrokinetic code requires KFE agreement.
Direct publisher opening returned 403; bounded title/author/GitHub searches did
not reveal the actual reference-14 repository URL. Consequently this review
cannot establish its commit, license, completeness or compatibility with our
operator. It is a research lead, not a currently qualified implementation.

## Precise reuse and license boundary

The existing pin remains `JuliaPlasma/CollisionOperators.jl` at
`9874021c9edf030fdaa1f62e28c450d63acc361c`:

- [303-line generic Newton–Krylov source](https://github.com/JuliaPlasma/CollisionOperators.jl/blob/9874021c9edf030fdaa1f62e28c450d63acc361c/newton_krylov.jl)
  has actual local SHA256 `71b5530488703f29d113ec57acc778a9910f0d4df01582484043934a2cbec347`.
- [MIT notice](https://raw.githubusercontent.com/JuliaPlasma/CollisionOperators.jl/9874021c9edf030fdaa1f62e28c450d63acc361c/LICENSE.md)
  has actual local SHA256 `3c178022e838d0a8e26874fe5c49902f2a06c772b41ae2a96c131a60e47184e3`.

Both match the earlier independent v14 clone evidence documented in
`STRUCTURE-SOURCE-REVIEW-V14.md`. The notice names Michael Kraus and is retained.
The new shell entropy, angular pair metric, multispecies weights/units and
Gonzalez residual are adapter work. Calling this “using CollisionOperators”
must not imply that its complete upstream 2V spline application or an upstream
radial model was executed or qualified. Previously inspected MATLAB/C++
alternatives retain their v14 pins and limitations; this pass did not recertify
or import them.

## Mandatory finite-time evidence before acceptance

These requirements follow from the intended physics and this project's existing
gates; publication benchmark choices do not relax them.

1. Reproduce the unmodified initial Maxwellian heating target and its original
   2% gate; independently resolve input radial PDF/moments and finite-width bias.
2. Evolve **full radial F_s**, including non-Maxwellian departure during
   unequal-temperature Coulomb relaxation. Compare 50/100µs increments under
   separate radial-resolution, α, entropy-quadrature and timestep refinements.
   An ODE that keeps both F_s Maxwellian is not a finite-time exact solution.
3. Resolve independently integrated physical 3D H on every exported state,
   adjacent and cumulative changes, quadrature/domain tails, positive density,
   number, energy, nonlinear residual and entropy balance. Monotone internal
   quadrature H alone is insufficient. Total vector momentum is identically zero
   by radial symmetry, so reporting it as zero is an accounting check, not an
   independent validation of nonzero-drift momentum exchange.
4. Complete the planned **500µs common-temperature stationarity** study and
   **100µs unequal-temperature finite-time** study, testing distributions as well
   as moments. For equal species densities and initial physical temperatures
   2/10eV, conserved energy fixes the asymptotic common physical temperature at
   6eV. That target does not imply complete equilibration within 100µs; no
   long-time 2/10eV equilibration result is claimed by this scope. Keep
   marker/smooth temperature distinct, hold normalization fixed and do not repair
   snapshots by projection.
5. Preserve arbitrary-radial-shape tests and an independently integrated angular
   kernel check at unequal, equal and near-zero radii. A Maxwell BKW test is
   useful for a separately implemented Maxwell kernel, not proof of Coulomb.
6. State the actual completed horizon, wall time, memory, snapshot hashes and
   unrun controls. An isotropic result cannot qualify anisotropic relaxation,
   drift friction, angular momentum, RF selectivity or separator performance.

The reviewable implementation split is: (a) radial model plus local invariants
and regressions, (b) bounded evolution/provenance runner, (c) independent
finite-time campaign/audits. Keep each non-test slice below the user’s 700-line
limit. A future full3V fast-summation backend is a separate operator/accelerator
qualification stage. Choose it only after an actual anisotropic requirement
and profiling; do not hide a tensor closure inside the present root-cause fix.

## Source-only follow-up: shell-weighted Gonzalez correction

The producer reported failure of JFNK on refined shells with tiny positive tail
weights. Current source inspection traces the relevant amplification:
`mobility` divides g_i by w_i m_i, while an ordinary Euclidean Gonzalez
correction adds a_i=η Δr_i to g_i. Its contribution to the physical score is
therefore η Δr_i/(w_i m_i). Quadrature/noise in the scalar entropy mismatch is
amplified at nearly weightless tail shells. In plain terms, an almost empty
shell can receive a correction sized for a fully occupied shell. This is a
concrete conditioning mechanism, not an independently reproduced attribution
of every observed nonlinear failure in this source-only review.

For fixed strictly positive W=diag(w_i), choose

    ḡ = ∇H((r₀+r₁)/2) + η W Δr,
    η = (H(r₁)−H(r₀)−∇H(mid)·Δr) / (Δrᵀ W Δr).

This is precisely the pullback of the ordinary Gonzalez gradient constructed in
y=√W r: ∇_yH=W^(−1/2)∇_rH and Δy=√W Δr. It satisfies
ḡ·Δr=ΔH, while its score correction becomes η Δr_i/m_i and loses the artificial
1/w_i factor. Strictly positive fixed weights are necessary for that coordinate
equivalence; weights or radii must not be floored to manufacture it. At exact
zero displacement the midpoint gradient supplies the limiting construction.
Nonzero displacements whose weighted norm underflows need numerical scrutiny,
not a physical interpretation as zero motion.

The current `scientific/isotropic-evolution-v16/core.jl` lines 129–133 implement
this weighted correction. This is a small coherent correction to the discrete
gradient geometry, preferable to deleting low-weight shells, clipping their
forces or fitting collision coefficients. It changes the finite-step temporal
discretization; it does not change the continuous Landau kernel or justify a
finite-step accuracy claim. For smooth H, its midpoint consistency still needs
the usual timestep study.

For any supplied gradient, the symmetric pair metric's positive-semidefinite
and energy-null structure is the same. Combining it with the exact discrete
chain rule supports the expected energy/H identities of a **converged** update.
Those algebraic properties do not prove nonlinear convergence, resolved
full-space entropy quadrature, sufficient tail coverage or physical PDE
convergence. Independent physics and numerical agents must test them.

The current JFNK call (line 146) still solves in raw r with its existing
unweighted residual norm and finite-difference step. Thus only the
**discrete-gradient construction** is equivalent to Euclidean Gonzalez in y;
the entire finite-precision nonlinear solve has not been transformed to y.
Separate weighted residual and per-shell score diagnostics remain useful if
tail conditioning persists. This review performed no run or timing comparison
of either correction.

## Checks actually performed

- Read the relevant v14 runtime execution path with exact line numbers and the
  v14 source/reuse and v15 heating-rate reports.
- Recomputed the two local vendor SHA256 values above using trusted host hashing.
- Reopened the cited primary papers, author repository, upstream pin/license,
  FINUFFT docs and PETSc API/example source. Failed version/API web lookups were
  not treated as evidence of a code pin or a usable license.
- Reopened the Shiroto radial RFP equations; inspected the newer Seo article's
  publisher-index content, retaining the direct-403/repository-identity limit.
- No new scientific fixture or numerical result was produced in this source
  review; the independent physics and numerical agents own those checks.

## Frozen implementation audit: read-only findings

The inspected snapshot has SHA256:

```
core.jl             239f0f9aab6a34d0cb81821955c71526fec15cc765ade508afc58ff63d3fd85f
run.jl              d1758e2abf43a225a53af8d3c5ecd3954ab7f17ffafeb11a6a97cb99c42a1452
campaign.py         a5af98fd545e7b4ec9511fc79926414b0249846c2a23df867a57047dc659682e
campaign-plan.json  754fe2d1f3371acffc0e85589b60d7cca06ad374cb2ab08453c57d92363bbaf8
```

Paths below are relative to `scientific/isotropic-evolution-v16/`. The pinned
vendor and MIT notice still match the hashes above. This audit read actual
source and `test_core.jl`; it did not run Julia, Python or numerical experiments.

### Correctness: finite-radius stable-ratio boundary needs a regression

`core.jl:68` evaluates `exp(-2u)*[-expm1(-2du)]` inside the large-u expression.
For valid finite contraction `r=1, R=1000, dR=-999, ε=1`, both endpoints satisfy
the branch's u,v≥0.01 condition, but the factors become zero and infinity in
ordinary Float64 arithmetic. Their product is NaN although the exact log-kernel
ratio is finite. This is an algebraically identified numerical-boundary defect,
not an observed failure of any particular small-step campaign case.

The technical cause is separately evaluating two opposite exponentially large
scales. In simple terms, the code discards the cancellation before multiplying.
A minimal repair is to select the bounded factorization by the sign of du:

    du ≥ 0: exp(-2u) * [-expm1(-2du)]
    du < 0: exp(-2v) * expm1(2du)

Both expressions equal exp(-2u)−exp(-2v), with nonpositive exponential arguments.
Keep the existing denominator and log1p treatment. This preserves the operator
and small-increment strategy, unlike clipping a ratio or accepting nonfinite
entropy. A regression should compare this contraction with the independently
evaluated endpoint log kernels, alongside tiny increments and branch crossings.
Any repair needs a new source identity; old frozen results retain their actual
source hash rather than being silently relabeled. Producer-owned files were
not changed by this reviewer.

### Provenance/data compatibility: normal path is useful but not self-sealing

`run.jl:9–14` records actual core/run/vendor solver hashes and all fixed shell
weights, masses, variances, 3D-measure quadrature points/weights and SI scales.
Histories preserve every accepted radius vector, actual nonlinear diagnostics
and stable cumulative ΔH. `campaign.py:13` binds its status to the plan hash.
This is useful evidence, but the plan does not itself pin source hashes, the
per-case metadata does not contain the plan hash, and the runner does not seal
source copies or an exact case-membership manifest. A final external seal must
bind the frozen plan, runner, actual sources, metadata, raw histories and actual
process records before a reproducibility claim. Compare actual per-case source
hashes with the frozen source snapshot; a status plan hash alone is insufficient.

`run.jl:7,15,17,37` directly overwrites existing case files. The campaign wrapper
protects only an existing `history.jsonl` (`campaign.py:20–21`); a metadata-only
partial directory, stale summary/failure record or direct CLI rerun is not
rejected at the actual writer boundary. This matters for rerun reliability and
stale-data interpretation. The coherent fix is one fresh-case ownership check
at the entrypoint before any case file is written, with the wrapper adjusted
so it does not precreate the owned case directory. Regressions must include
metadata-only, old-summary and previous-history cases. For the existing frozen
campaign, validate exact directory membership and retain the no-reuse evidence;
do not retroactively claim that the entrypoint itself enforces this invariant.

The new radial schema is explicitly separate from v14 Cartesian velocities and
v15 initial tensor metadata. No browser/production migration is present. A
reader must consume shell radii and the exported 4πr² measure, and must not
reinterpret these as point velocities or renormalize weights on load. Fixed
weights remain positive in the planned finite-tail initial grids; no floor,
clipping, force cutoff or state projection appears in the inspected model.

### Resource/failure accounting: distinguish normal exits from missing cases

`campaign.py:15–57` sequentially attempts every configured case after ordinary
nonzero child exits; it records each exit code, reason, elapsed wall time and
sampled peak parent-process RSS. Its wall timer uses monotonic time and includes
startup; the Julia summary's internal wall timer begins later, after model and
initial-entropy construction. Those two times have different scopes and must
remain separately labeled.

The watchdog samples `/proc/PID/status` at 0.25s intervals. Its RSS value is a
sampled process peak, not a proven instantaneous maximum or process-tree bound.
The inspected Julia path does not launch children, so no demonstrated child-RSS
leak is identified. Failure between launch and status write can still leave a
case absent: `Popen` exceptions and a process-exit race at `killpg` escape without
recording the current and remaining cases. There is no initial full pending
ledger. A final reviewer must compare all 13 expected names with actual records
and mark absent cases unrun, never infer completion from the subset present.
Future runner hardening should predeclare all cases and record infrastructure
failure/unrun outcomes in a finally path; keep this separate from physics edits.

No shell command interpolation is used for the scientific child process: its
arguments are an explicit list, and fixed planned names are controlled input.
No external message, credential mount or application write is introduced by
the inspected files. This is a scoped source observation, not an audit of the
whole VM or desktop security environment.

### Physics/invariant and case-coverage assessment

The weighted Gonzalez formula matches the derivation above. The pair metric
uses i<j once, symmetric source weights and the same C(r,s); its algebraic
energy-null and entropy-production properties survive arbitrary supplied
gradients. The factory uses Gaussian-shell variance α/m and radial entropy
weights 4πr²dr. Exact origin evaluations of `logkernel` follow the series
branch; radii are required finite/nonnegative and invalid trial radii fail
openly rather than being clipped. A nonlinear solve may still fail when its
trial leaves the domain; no hidden timestep retry or partial accepted state is
present. Same-radius cross-species interaction is retained by the angular
formula. Momentum is identically zero by the symmetry restriction.

The frozen plan contains 13 explicit cases: 11 nonequilibrium controls through
100µs and 2 common-temperature stationarity cases through 500µs. It includes
radial n128/256/512, a matched-q n512/1024 control, three n512 widths, two n1024
widths, entropy q2048/4096, dt5/2.5µs, radius12/14 and initial tail8/10σ.
The tail control at fixed n also changes shell spacing; a difference cannot be
attributed exclusively to omitted tail mass without a matched-spacing followup.
The radius control also changes q, so inspect the separate q refinement before
attributing a difference exclusively to domain truncation.

`test_core.jl` contains local kernel derivative, angular average, metric,
permutation, ΔH, domain and one-step regressions. This source inventory is not
their execution result. It does not yet cover the valid large-contraction
ratio issue or stale-entrypoint cases identified above. Source-only acceptance
is conditional on the actual independent physics audit, regression execution,
13-case membership accounting and the physical gates applied to saved states.
No physical or complete-package approval is issued by this review.

## Source-audit closeout after the bounded fixes

The preceding implementation findings refer to their explicitly recorded older
snapshot. They are not findings against the following corrected source. Actual
host hashing now verifies:

```
core.jl      60574a6a12dc80cef214c680498bbe8e55c1199722004b96dbd902b85490ab2e
run.jl       f1440dcaf40e829679e33b806f4bbd807f46c8d4888dda735387763cf1109758
campaign.py  266889236f1d9b7a1c101a4923eaaeffc70776195b2639ac57c624c9e00bf25f
```

The prospective plan remains `754fe2d1...`, and the unchanged vendor remains
`71b55304...`. The corrected core identity above is the actual current source;
it must not be confused with any earlier candidate hash. I reread each fixed
execution path and the actual exported logs rather than accepting a summary
alone.

**Closed: finite-contraction exponential overflow.** `core.jl:68` now selects
the bounded factorization according to the sign of du, exactly as derived
above. `test_core.jl` includes finite contraction and reverse-expansion
regressions at u=1000 and v≈1. `test-log.txt` records **41/41** core assertions
passing. The independent Decimal evidence at
`scientific/evolution-math-logratio-export-v16/logratio-results.json` records
all **13** fixtures passing, reproduces NaN for the old arithmetic, and measures
1.49e-16 relative error for the corrected large contraction/expansion. The
independent checker/report also retains the near-zero branch-crossing absolute
rounding floor (~1.11e-15) rather than claiming uniform relative accuracy.
This evidence closes the identified overflow defect, not every possible
finite-precision entropy error.

**Closed: overwriting existing scientific case records through the direct
entrypoint.** `run.jl:7–10` now checks its owned metadata, history, summary and
failure files before model construction or output. It deliberately permits the
wrapper-owned process log. `test_runner.jl` separately exercises all four stale
forms, verifies their unique bytes and directory membership remain unchanged,
and exercises the process-log compatibility path. `runner-test-log.txt` records
**14/14** assertions passing. This locates the invariant at the actual writer
and preserves the wrapper's existing behavior; broad deletion or output
renaming was unnecessary. A concurrent multiwriter guarantee is outside this
sequential runner's demonstrated scope.

**Observed root-cause negative control.** `test_negative_control.jl` changes only
the Gonzalez correction direction. Its exported log records the original
unweighted method exhausting 160 evaluations with residual 0.0035392741654,
while the weighted update converges in 14 with residual 1.8128642592e-13.
The two test assertions precede its final printed result in the inspected
source; the result log demonstrates they were reached successfully. This is
specific evidence for the tail-weight conditioning fix. It does not establish
all-resolution or finite-time physical convergence.

**Improved controlled continuation; final coverage still pending.** The updated
`campaign.py:16–21` retains existing status only when its plan hash matches,
allows an explicitly selected case, and rejects an unknown selection. This
supports sequential per-case exports without overwriting previous status.
It does not silently skip completed cases: attempting an existing history
still raises. The infrastructure-exception and sampled-RSS limitations above
remain. At the actual read snapshot, status lists five ordinary successful
cases with no limit reason; the campaign is in progress. Remaining names are
pending, not demonstrated omissions or failed cases. No 13/13 completion claim
is made here.

**Provenance partially observed, final archive pending.** The new
`provenance/frozen-source` records the corrected source and unchanged plan.
Actual trusted-host commands

```
shasum -a 256 --quiet -c scientific/isotropic-evolution-v16/provenance/source-sha256.txt
shasum -a 256 --quiet -c scientific/isotropic-evolution-v16/provenance/closed-case01-sha256.txt
```

both returned exit 0. The first verifies the five listed frozen source/plan
records; the second verifies the seven listed first-case export records,
including its actual source, plan, metadata, history and process/summary files.
This closes the previously missing evidence for an externally preserved source
snapshot and one per-case transfer. It is not a final exact-membership archive
of all cases, nor does it establish every later export or test-log provenance.
Final campaign sealing, all-case membership/source identity and independently
evaluated H/PDF/convergence gates remain pending responsibilities.

No source-level coefficient, pair-symmetry, weighted-chain-rule, 3D-measure or
production-data migration defect was found in the corrected paths inspected.
No new external-write/security concern arose from these narrowly scoped fixes.
The source review accepts the two specific repairs with their actual regression
evidence while retaining the stated numerical, resource and campaign limits.
No scientific program or project test was executed by this reviewer; execution
evidence above belongs to the producer and independent mathematics guest.

## Integrated-report review while final audits close

I read the actual integrated `EVOLUTION-CONVERGENCE-V16.md` draft after all 13
main histories and the separately frozen finest-width timestep extension were
reported complete. The inspected draft SHA256 was
`4f69111291c7cfc45b54132f8d5b5886eeef28274cf4d5ae409f48d0f034a268`.
This identifies a review snapshot, not its final future text. I also inspected
the separate stability source/plan and the application-gate README. No file in
the closed 139-member main package was edited by this reviewer.

Two wording corrections requested during review are present in that snapshot:

- The weighted correction removes the **explicit inverse individual shell
  weight**; its coefficient still depends on the weighted displacement and
  entropy accuracy. The report now avoids claiming a proved uniform
  conditioning bound.
- The pre-campaign exponential repair removes its specific intermediate
  log-ratio NaN. The report now states that full entropy-increment evaluation
  for large moves needed a separate follow-up, instead of implying universal
  finite-radius robustness of the old main source.

The integrated evidence boundaries are appropriate: radial symmetry is limited
to the homogeneous field-free zero-drift reference; full radial PDFs are
evolved without Maxwellian closure; marker/smooth energy and structural zero
momentum are distinguished; unchanged generic MIT JFNK reuse is separated from
new adapter physics; and selected-state score agreement is not promoted to a
uniform theorem. Actual measured refinement differences are explicitly
distinguished from certified error against an exact unregularized Coulomb
solution. Retaining the failed coarse particle/width gates is necessary and
correct. The new narrowest-width timestep control addresses the relevant
regime, rather than borrowing a wider-kernel temporal result.

The performance paragraph reports differing-resolution process costs and
sampled RSS, expressly avoiding a same-input speedup ratio or a strict peak-RSS
bound. The application gate separately identifies its snapshot and does not
claim browser, deployment or GPU verification. Those distinctions resolve the
principal performance and software-versus-physics overclaim risks in this scope.

The separate `scientific/isotropic-evolution-stability-v16/core.jl` actually
hashes to `52df85de3d4ea8e24496873e0275f744b0846a7164109a9a02e1364b131c3249`;
its prospective plan hashes to
`b1dc26438cc79b5f1126b692036df832418a908d016b533ebececc6941b61c6e`.
Source inspection traces the additional failure from componentwise
`factors .* expm1(ratios)` to a separately scaled two-endpoint mixture
evaluation. The scaled branch uses bounded per-component changes and a
near-equal-total series, retaining the original safe small-change arithmetic.
This is a demonstrated arithmetic-domain repair, not a modified collision
coefficient or an undocumented physical fallback. Its accepted-step bit-identity
and fine full-evolution replay gates are prospective claims until their actual
results and exact source identities are checked. The old main source `60574...`
and its 494 saved states must remain identified as old-source evidence; replay
agreement can connect them to the patch but cannot relabel their provenance.

At this report-review snapshot the final all-state 500µs stationarity/H/PDF
proof, complete new-patch replay/seal and final figures were still pending, as
the integrated draft explicitly states. They must replace the pending wording
before a final completion stamp. No further experiment was requested or run by
this source reviewer. The final numerical auditor owns all-state membership,
tail/root/quadrature sensitivity and physical gate acceptance; this report
review does not duplicate or waive those checks. No additional source-reuse,
scope, security, production-data migration or stated-performance gap was found
in the inspected integrated text after the two wording corrections.

## Final short wording check against completed audit records

Read the updated integrated report, root README and root
`IMPLEMENTATION-STATUS.md` openings, the actual
`scientific/evolution-review-v16/results/final-audit.json`, independent
stability-reference/identity records, and stability documentation. The final
audit's coverage object records 14 cases, 494 states, 42 equation replays and
22 refinement records (16 PASS, 6 coarse FAIL), with no unreviewed cases. The
independent identity record confirms all non-timing fields at 21 physical
states and the unchanged model/quadrature metadata. Actual trusted-host hashing
of `scientific/isotropic-evolution-stability-v16/closed-seal.json` gives
`8806b115f47160ae8e1167dcd96a3a45e02a1cdb00533dc4e141e33c554f816a`.
This last check verifies the seal digest itself; complete member/membership
verification is separately recorded as the parent's work.

One precise numerical-label correction was requested: the stress change
`4.158498409085485` is the independent **frozen q2048** value, whereas the
independent refined physical value is `4.158498409082611`. Their difference is
2.874e-12. The integrated report should label both or round their common value,
rather than attributing the frozen-rule number to whole-space integration.
This is a reporting correction, not a failed arithmetic or physics gate.

The old pending all-state-stationarity wording in the integrated opening/footer
also needs updating now that the actual final audit is complete. Any remaining
pending statement should name only the still-unfinished stress/figure/seal
closeout at that moment. The README/status opening claims otherwise agree with
the actual completed evidence and preserve the radial-only, offline,
refinement-versus-exact-error and unchanged-deployment boundaries. Calling the
scope the “studied homogeneous isotropic two-ion benchmark” is more precise
than suggesting qualification of every possible isotropic collision problem.
No unrelated issue, numerical experiment or production edit was introduced by
this final read-only check.
