# Entropy-method options, v13

Read-only primary-source review, 2026-11-06. No new solver was installed,
compiled or run for this report. Current PETSc scientific results remain
unqualified; a published structural theorem is not a result for our setup.

## Decision

Do not present a time-stepper change as a complete fix for the Q2 Landau FEM
positivity, common-temperature stationarity and entropy failures. The smallest
coherent next step is a bounded upstream-example/source qualification, followed
by a separately reviewed collision-representation change if qualification
succeeds. The inspected pinned examples do not provide a demonstrated,
ready-to-run 40u/84u entropy-preserving substitute.

The existing V12 evidence is documented in `PETSC-TWOION-V12.md` and
`PETSC-DISTRIBUTION-V12.md`: the Q2 polynomial can contain negative tails between
the original quadrature samples, and the common-temperature H diagnostic fails
its prospective budget despite tight conservation. Number/momentum/energy
conservation therefore does not establish positivity or entropy monotonicity.
In simple terms, preserving a few totals does not ensure that the whole
distribution remains physically admissible.

## What the primary literature establishes

[Pusztay et al. 2023](https://arxiv.org/html/2306.12606v1) distinguishes the
conservative FEM operator from a regularized particle-basis operator. The latter
uses entropy gradients and an implicit midpoint-like collision construction;
the paper discusses two species and 2V/3V tests. It explicitly notes that the
entropy-gradient evaluation used there is unsuitable for ordinary equal-weight
Monte Carlo/quasi-Monte Carlo sampling without further treatment. Its statement
that examples are public in PETSc does not identify a complete present-day
multispecies release configuration.

[Finn et al. 2026](https://arxiv.org/html/2602.13068v1) couples compatible
discrete-gradient integrators with an already structured particle collision
operator. Its demonstrated collision test uses equal-mass electrons/positrons.
The paper reports nonlinear-solver difficulty and small entropy fluctuations
near equilibrium; mathematical guarantees require appropriate algebra and
adequately solved implicit equations. Appendix B gives the collisionless
Hamiltonian `ex2` command, not a complete unlike-ion collision reproduction.

[Carrillo, Hu and Van Fleet 2024](https://arxiv.org/html/2310.16143v1),
Corollary 2.4, identifies a further equilibrium requirement for its Gaussian
regularization family: species share the physical equilibrium temperature only
when `m_s * epsilon_s` is species independent. Consequently equal smoothing
variances are generally inappropriate for unequal masses. This condition must
be mapped to the actual implementation's convention and tested, not transferred
by parameter name alone. Energy conservation and monotone regularized entropy
can coexist with the wrong species temperatures.

## Structural alternative: exponential Galerkin

[Hirvijoki, Burby and Kraus 2018](https://arxiv.org/html/1804.08546v1),
Sections II–VI, derives `f_h=exp(g_h)` with polynomial Galerkin `g_h`.
Positivity then holds pointwise. A compatible weighted mass matrix and symmetric
negative-semidefinite collision form preserve density, momentum and energy.
The basis must exactly represent `1`, velocity and velocity-squared; its null
space makes Maxwellians exact equilibria on the represented domain.
Compatible discrete gradients preserve these properties and entropy
monotonicity in time, subject to the algebraic solve's accuracy.

The paper explicitly treats **single-species**, homogeneous, normalized 3V
relaxation. An unlike-ion extension needs derivation and qualification; its
theorem is not evidence for our 40u/84u adapter. No maintained implementation
link was established from the paper.

Our assessment: this is a coherent structural alternative addressing the
representation, metric operator and time advance together. Merely replacing
current coefficients by their logarithms leaves the discretized collision
algebra and equilibrium null space unproved. Changing TS alone likewise cannot
supply the required entropy identity. It therefore warrants a separate method
implementation proposal after the bounded FEM studies, rather than a local
transformation of the current Rosenbluth residual.

## Existing Julia candidate: source qualification

[`JuliaPlasma/CollisionOperators.jl`](https://github.com/JuliaPlasma/CollisionOperators.jl)
contains an actual particle/B-spline collision implementation. The official
[commit API](https://api.github.com/repos/JuliaPlasma/CollisionOperators.jl/commits/9874021c9edf030fdaa1f62e28c450d63acc361c)
pins this review to **`9874021c9edf030fdaa1f62e28c450d63acc361c`**, dated
2026-11-03. Recent repository activity is established; sustained maintenance
and scientific acceptance are not established by that fact.

- Geometry/operator: inspected
  [`MantisWrappers.jl`](https://github.com/JuliaPlasma/CollisionOperators.jl/blob/9874021c9edf030fdaa1f62e28c450d63acc361c/MantisWrappers.jl)
  constructs a Cartesian tensor-product **2V** space.
  [`Parameters.jl`](https://github.com/JuliaPlasma/CollisionOperators.jl/blob/9874021c9edf030fdaa1f62e28c450d63acc361c/Parameters.jl)
  selects Landau or Lenard–Bernstein, with one particle population and no
  species/mass/charge configuration. The inspected Landau pair kernel likewise
  has no unlike-species physical prefactors. This is not axisymmetric 3V.
- Positivity: inspected
  [`functions.jl`](https://github.com/JuliaPlasma/CollisionOperators.jl/blob/9874021c9edf030fdaa1f62e28c450d63acc361c/functions.jl)
  linearly L2-projects particles into a B-spline density, not `exp(g_h)`.
  `compute_negative_part_l1` measures negative reconstructed density. Default
  entropy and its seed omit values at or below `1e-30`; optional `use_logsq`
  uses a signed `f*log(abs(f))` expression above its floor. Neither supplies
  pointwise positivity of the reconstructed distribution or physical
  Boltzmann entropy for negative density. Positive particle weights and a
  negative spline reconstruction are distinct properties. The direct
  `grad(f)/f` floor and gradient clamp belong to the LB branch.
- Time integration: inspected
  [`solver.jl`](https://github.com/JuliaPlasma/CollisionOperators.jl/blob/9874021c9edf030fdaa1f62e28c450d63acc361c/solver.jl)
  chains the projection through its computed entropy gradient, then applies a
  Gonzalez correction in a particle metric update. It is a concrete structured
  particle-method candidate, **not** the exponential-Galerkin method above.
  The compatible discrete-gradient identity concerns its chosen functional
  and adequately converged implicit solve; it does not establish physical
  positivity, exact Maxwellian stationarity or unlike-ion relaxation rates.
- Provenance/effort: pinned
  [`LICENSE.md`](https://github.com/JuliaPlasma/CollisionOperators.jl/blob/9874021c9edf030fdaa1f62e28c450d63acc361c/LICENSE.md)
  is MIT; inspected
  [`Project.toml`](https://github.com/JuliaPlasma/CollisionOperators.jl/blob/9874021c9edf030fdaa1f62e28c450d63acc361c/Project.toml)
  is `1.0.0-DEV`, requiring Julia 1.12 and Mantis 0.6, with plotting dependencies.
  CPU source exists; CUDA acceleration is optional. No build was attempted.
  Inspected `test/runtests.jl` and `test/integration/main_helpers.jl` cover
  driver/moment/LB helper checks, not a demonstrated unlike-ion Landau
  qualification. The pinned `docs/src/gonzalez_vs_midpoint.md` reports author
  studies, including unconverged steps; those results were not reproduced here.

Assessment: retain as a useful existing **2V single-species method study** and
potential implementation discussion with its authors. A 3V unlike-ion adapter
would require broader geometry, collision and qualification work; substituting
it now would not resolve our acceptance gates. No code was installed or run,
and README setup/hook instructions were treated as source data only.

## Pinned PETSc source audit

The package pins PETSc **3.26.1**. The following URLs explicitly select that tag;
moving `main`/`release` documentation is supplementary, not the reproducibility
pin.

- [`src/ts/tests/ex27.c`](https://gitlab.com/petsc/petsc/-/raw/v3.26.1/src/ts/tests/ex27.c)
  is a single-species particle demonstrator. Its context exposes N/L/h/epsilon,
  with no species mass or charge arrays. The residual supports Cartesian 2V/3V;
  the shipped test uses three particles and one theta=0.5 step. Its entropy
  gradient deserves verification: the implementation uses an absolute
  coordinate difference where a signed Gaussian derivative is expected, and
  does not visibly include the quadrature-volume/particle-weight factors
  described by its own comment. These are source-audit concerns, not reproduced
  numerical bug claims. Do not adopt it as our reference without resolving them.
- [`src/ts/tutorials/hamiltonian/ex2.c`](https://gitlab.com/petsc/petsc/-/raw/v3.26.1/src/ts/tutorials/hamiltonian/ex2.c)
  includes a discrete-gradient Landau-damping test. Landau damping is a
  collisionless phenomenon; this source does not supply the needed collision
  residual.
- `src/ts/tests/ex30.c` is the grid Landau operator with particle/FEM projection;
  projection does not replace the FEM entropy structure.
- [TSDISCGRAD documentation](https://petsc.org/release/manualpages/TS/TSDISCGRAD/)
  requires a functional-gradient formulation. Selecting its name does not
  automatically factor our existing FEM residual into a positive metric
  operator acting on a discrete entropy gradient.

PETSc is [BSD-2-Clause](https://petsc.org/release/install/license/); dependencies
retain their own licenses. `ex27` uses PETSc TS/DMPlex/DMSwarm; its test metadata
requires Triangle and real nonsingle precision. This has not been compiled
against our pinned environment, so dependency/API availability remains a gate.
No main study VM, binary, source override or scientific result was modified.

## Geometry and adaptation boundary

Cartesian **2V** particles represent two physical velocity components and use
their corresponding measure and energy partition. Our FEM grid is two
coordinates `(v_perp, v_parallel)` representing **three physical components**
with measure `2*pi*v_perp dv_perp dv_parallel`. These are different equations.
An unmodified 2V relaxation curve cannot validate our 3V collision problem.
Use full Cartesian 3V for the first matching particle benchmark, or derive and
independently review a genuinely axisymmetric particle collision operator.

A 40u/84u particle adaptation needs species-dependent physical masses, charges,
weights, collision prefactors, normalization and smoothing conventions before
any rate comparison. It also needs an independent initial-rate test and
finite-time distribution export. These requirements change the representation,
entropy functional, residual and diagnostics together: broader collision-method
work, not a local option/guard fix.

## Reviewable implementation order

1. Keep the existing Q2 result and failures as the numerical control. Bound
   quadrature/domain/time sensitivity of H and equilibrium residuals; report
   positivity separately. Do not clip negative values or redefine the budget.
2. Freeze a source-audit/smoke plan for unmodified pinned `ex27`, explicitly
   including gradient parity, quadrature scaling and conservation checks.
   Stop if the implementation cannot be reconciled with its cited method.
3. Locate and pin the exact authors' multispecies collision implementation
   underlying the 2023/2026 figures, if distinct from the release demonstrator.
   Prefer a verified existing implementation over locally recreating the paper.
4. Only then propose a separate minimal homogeneous **3V** unlike-ion adapter.
   Freeze particle/regularization/time refinements, common-temperature control,
   positivity and regularized-entropy checks, exact initial-rate budget, and
   computational limits before execution. Compare distributions in addition to
   temperatures. Passing a smoothed entropy test alone does not establish the
   unregularized Landau limit.
5. Integrate with spatial separator transport only after that reference is
   qualified. Homogeneous positivity or entropy says nothing by itself about
   angular-momentum transfer between spatially separated collision partners.

No runnable, maintained drop-in alternative satisfying all these requirements
was established by this bounded review. That is an evidence limit, not a claim
that no such implementation exists.
