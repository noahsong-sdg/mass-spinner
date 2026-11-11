# Distribution-level equilibrium, positivity and entropy studies, v13

Prospective coordination plan, 7 November 2026 UTC. Each producer freezes its
own numerical cases, budgets and source identities before its first dynamics.
The v12 cases, failed budgets and accepted artifacts remain unchanged.

## Questions and scope

The previous work qualifies several initial rates and moment sensitivities, but
does not qualify the complete evolved distributions. The next studies ask:

1. Does a projected common-temperature Maxwellian remain stationary as a
   distribution, and does its error decrease with resolution?
2. Are negative values confined to sampled points, or does the actual
   represented polynomial contain a demonstrably negative region?
3. How much of the reported entropy increase comes from evaluating a nonlinear
   functional with low-order quadrature, and how much remains in the numerical
   evolution after quadrature refinement?
4. Can a small, demonstrated correction fix a failure, or does it require a
   different collision representation with stronger mathematical structure?

These are homogeneous, field-free, fixed-logarithm, equal-density two-ion
controls. PETSc uses common 5 eV; Julia uses common 6 eV to retain its previous
control. They are separate equilibrium studies, not directly matched curves.
No new rotating-separator, electron, neutral, collector or experimental
qualification follows.

## Independent work packages

- `petsc-equilibrium-v13`: unchanged Landau kernel and operator quadrature;
  full 0.5 ms replay of the previous common-5-eV case, with every-step actual
  fields, plus a separately identified 0.1 ms mesh/timestep sensitivity ladder.
  Cost/memory/artifact pilots precede long runs. Its own plan fixes cases and
  gates before execution.
- `petsc-equilibrium-review-v13`: independently reconstructed polynomial
  moments, exact-rational Bernstein positivity bounds or negative witnesses,
  distribution drift and independent nonlinear quadrature checks. Unknown
  subdivision cases remain UNKNOWN. The reviewer does not alter the producer's
  fields, operator or acceptance plan.
- `julia-equilibrium-v13`: saved full distributions and collision increments,
  raw versus conserving operator controls, mesh/order/domain/timestep and
  nonlinear-tolerance diagnostics. A bounded pilot selects execution scale;
  an accepted short-step study is not a 0.5 ms qualification.
- `julia-equilibrium-review-v13`: independent normalization, velocity measure,
  reconstruction, equilibrium residual, correction and entropy review using
  the actual saved states and pinned source.
- `particle-equilibrium-v13`: existing four common-temperature WarpX runs and
  recovery of only the four corresponding TA trajectories from exact archived
  initial arrays. Recovered moments must match the frozen records before the
  new distribution diagnostics are used. Whole-run uncertainty remains
  separate by code/species; no additional WarpX campaign or particle pooling.

Plans may be amended before new dynamics to correct source membership or a
methodological defect; preserve the original and final identities. After
dynamics, new hypotheses/cases require a separately labeled follow-on plan.
Do not retrospectively relax a failed gate.

## Physical and numerical distinctions

For fixed positive species reference factors, the physical H functional is
`sum_s integral f_s log(f_s/fstar_s) d^3v`. For axisymmetric velocity coordinates,
`d^3v = 2*pi*vperp dvperp dvparallel`. Nonnegative zero values use the continuous
limit `0 log 0 = 0`. A sign-changing distribution has no such physical H;
positive-part or `log(abs(f))` quantities must never substitute for it.

The v12 relative-H budget retains its original result. A new fixed-convention
per-particle H change helps interpretation because the magnitude of differential
H depends on its reference normalization. Report adjacent increases and total
excursions, not only final-minus-initial cancellation. Same-field quadrature
refinement isolates diagnostic error without changing the evolved operator.

Distribution stationarity includes density-normalized L1 and relative L2 drift,
shape/tail changes, negative number and energy, and actual conserved moments.
Nodal maxima and a few temperatures do not determine distribution fidelity.
Initial interpolation/projection error and unequal measured discrete moments
are recorded separately from subsequent evolution. A discrete-moment-matched
control changes the initial distribution and must be labeled accordingly.

For finite elements, nonnegative nodal coefficients do not generally imply
nonnegative interpolation. A negative witness disproves positivity. A successful
exact polynomial bound certifies only the serialized reconstructed polynomial,
not the continuum solution or a different resolution. Sampled absence alone
does not certify global positivity.

Positive-weight empirical particle measures do not directly have a finite smooth
differential H functional. Histograms/KDEs introduce their own representation
and regularization and will not be promoted to physical entropy checks here.
Likewise, replacing Q2 by Q1 would remove some interpolation overshoots only
when all relevant coefficients stay nonnegative; it can lose exact quadratic
energy representation. Any such method change needs fresh invariant tests.

## Fix and evidence rules

Trace the actual driver/operator/diagnostic path before edits. Prefer a small
diagnostic or setup correction when a controlled experiment demonstrates it.
Do not clip negative fields, renormalize inventories, freeze the Maxwellian by
subtracting a residual, fit rates or tighten/loosen tolerances without a stated
physical/numerical hypothesis. A structural representation change is a separate
reviewable implementation, not a hidden local patch.

Dependency installation, scientific scripts, compilation and tests execute in
Apple safe-dev VMs. Explicitly sync reviewed host source copies; export valuable
guest work before replacement. Each accepted bundle needs completion, input/
source/config identity, checksums and actual post-export verification before
source-guest reset. Reusing an existing pinned environment is disjoint and
read-only with respect to the previous study.

Each package records exact commands, tested snapshot, returned nonlinear/linear
status, resource costs, regressions, raw arrays/fields, failed cases and independent
audit outcomes. The root application build/typecheck is a separate software gate.
Passing software checks or artifact audits does not change a failed physics gate.

## Structural alternatives

The [method-options review](ENTROPY-METHOD-OPTIONS-V13.md) examines existing
entropy-based particle and discrete-gradient approaches. These require a
compatible collision representation, smoothing and species conventions;
selecting a time-stepper name does not supply them. Any replacement must earn
its own equilibrium, positivity, entropy and physical-rate qualification.
