# Practical isotropic collision evolution

## Problem and execution-path trace

The frozen v14 path evaluates a three-dimensional Gaussian-mixture entropy and its
gradient at every tensor quadrature point, then repeats that work inside the
Jacobian-free Newton–Krylov residual. Increasing Cartesian markers from n³ to
512³ per species makes actual evolution impractical. The v15 factorization only
applies to the initial Cartesian product distribution and cannot be carried into
an evolved distribution without imposing a closure.

This implementation instead restricts the **physical problem** to the exact
homogeneous isotropic subspace. Each marker represents a complete spherical shell,
with a positive fixed weight and a nonnegative evolving velocity-speed radius.
These radii are in velocity space, measured in units of V0; they are not positions
in the separator. Angular directions
remain continuous. This reduction does not describe anisotropic relaxation,
spatial transport, magnetic fields, or an operating separator.

## Operator and integrator

`scientific/isotropic-evolution-v16/core.jl` evaluates the Gaussian-smoothed shell
density, H = Σs ∫ 4πr² Fs log(Fs) dr, and its coordinate gradient using the same
fixed radial Gauss–Legendre rule. Shell density uses stable logarithmic formulas
and a small-argument sinh(x)/x series. Entropy increments use componentwise
`expm1` and the analytic Gaussian-shell log ratio, rather than subtraction of two
extensive entropy values.

The exact angular Landau projection is C(r,s) = 2/[3 max(r,s)³]. Every distinct
shell pair participates, including equal-radius pairs and pairs within one
species. The symmetric mobility preserves Σi wi mi ri²/2 and contracts the entropy
gradient negatively. Exact coincident origin shells have zero projected force;
negative/nonfinite trial radii raise a domain error. No radius floor or clipping
is applied.

The midpoint metric and Gonzalez discrete gradient use the unchanged v14 pinned
Newton–Krylov implementation. A regression exposed a further numerical problem:
the Euclidean Gonzalez correction added a comparable coordinate-gradient term to
shells whose weights differ by many orders of magnitude. The mobility divides the
gradient by the shell weight, magnifying the correction in the tiny-weight tails.
In simple terms, almost empty tail shells received disproportionately large
numerical pushes.

The correction now uses direction W Δr and denominator Δrᵀ W Δr. This is Gonzalez
in the natural coordinates y = √W r. It retains the exact discrete chain rule
while avoiding the artificial inverse-weight amplification. It was chosen over
clipping/removing tail particles, changing the Coulomb kernel, relaxing residual
tolerances, or replacing the trusted nonlinear solver because those alternatives
would change the numerical/physical problem rather than fix the coordinate error.

The retained negative control differs only in this correction. At n=64, q=256,
α=.0125 and a 1 µs step it exhausted 160 residual evaluations with residual
0.0035392741654. The corrected method converged in 14 evaluations with residual
1.8128642592e-13. The unweighted initial score correction reached 707077.72495.

A second prelaunch regression reproduced `0*Inf` in the shell log-density ratio
when a valid trial moved from u=1000 to u=1. The density itself remained finite;
factoring an exponential relative to the old radius overflowed during a large
negative radius change. The negative-change branch now factors relative to the
new radius, keeping both exponential factors bounded. Direct kernel-difference
fixtures cover both directions. This algebraic fix preserves the mathematical
ratio, unlike constraining legitimate trial sizes to hide the overflow.

## Initial data, scope, and raw records

Positive midpoint shell weights integrate the actual radial Maxwellian measure
4πR² φσ(R) dR over [0,8σ]. They are not renormalized. Marker variance is
(T/5−α)/m; smoothing variance is α/m, so smoothing adds exactly 5α eV to each
species temperature. Actual number and energy residuals therefore remain visible.
The 10σ control checks the truncated marker domain. The entropy integration
domain is fixed at [0,12/√m], covering heating of the initially 2 eV light species
toward the 6 eV two-species equilibrium. A 14/√m control checks that domain.

All time units in inputs and records are SI seconds. The normalized collision
clock is τ=10858.76324776031 t. Each case records fixed weights, masses, variances,
complete operator quadrature, source hashes, every radius vector, every operator
entropy, stable entropy increments, invariants, nonlinear residual vectors,
discrete gradients, and metric-production/chain-rule contractions. Initial
derivative vectors and heating rates are retained. Public app behavior is unchanged.

## Verification and prospective experiment

The isolated Apple VM uses Julia 1.13.3 downloaded from the official archive and
checked against SHA256
`9ceb053bee6dfb8189bd40afd6925de3a9b7ff8fac8d01a5fcdd84af171ddf03`.
The imported solver remains byte-identical, SHA256
`71b5530488703f29d113ec57acc778a9910f0d4df01582484043934a2cbec347`.
Host operations only edit, copy, inspect and hash trusted files. Exported pilot
history hashes were checked before replacing the copied guest source.

The 41 core regression assertions pass: positive raw weights, shell derivative,
literal transformed angular integral including equal-radius shells, energy and
entropy mobility contractions, stable entropy increments, weighted chain rule and
permutation invariance, invalid-domain rejection, and an actual conservative
implicit step. The separate reproducible unweighted negative control passes its
failure-versus-fix assertions.

The direct case runner also rejected a reproduced persistence bug: invoking the
CLI directly could bypass the campaign's overwrite check and replace an existing
case. The guard now lives at `run_case`, before any write. Four stale-record forms
(metadata only, history, summary, and failure) retain their original bytes; a
campaign-created process log remains allowed. All 14 persistence assertions pass.

Pilot costs after compilation: n128/q512 approximately .15 s per 5 µs step,
n128/q1024 .30 s; n512/q2048/α=.0015625 one actual 5 µs step 4.00 s. The common
5 eV pilot retained 5 eV and changed operator entropy by −3.16e-15 over 10 µs.
These are feasibility observations, not finite-time convergence certification.

The prospective 13-case `campaign-plan.json` separates particle, width,
operator-quadrature, timestep, marker-tail and integration-domain controls. It
requires actual 100 µs nonequilibrium histories and 500 µs common-temperature
histories, including n1024/q4096 refinement. Each process has a 1800 s/3 GiB bound;
there is no aggregate budget that silently prevents later cases. Individual
failures and partial histories are retained. The independent auditor evaluates
full-distribution H/L1 with separate integration and unchanged gates; producer
operator-entropy dissipation alone does not establish those gates.

## Completed execution

All 13 original cases completed with exit code zero, without reaching either
resource limit. Every nonequilibrium case reached 100 µs (20 steps, or 40 for the
2.5 µs control); both common-temperature cases reached 500 µs and 100 steps.
The separate, prospectively reviewed finest-width timestep extension completed
40 steps to 100 µs with byte-identical numerical sources and its own plan/status.
The original 13-case plan/status have not been rewritten to include that extension.

Measured process times include 75.43 s for n512/q2048/α=.0015625, 297.00 s for
n1024/q4096 at that width, 392.19 s for n1024/q4096/α=.00078125, and 602.15 s for
the corresponding 2.5 µs extension. The fine common-temperature case completed
in 220.51 s and retained both temperatures at 5 eV within 9e-12 eV; its accumulated
operator entropy increment was −1.02476e-13. Full physical H and PDF convergence
are evaluated in the separate independent audit, including retained coarse-grid
failures. The coarse n128 initial heavy-species PDF L1 error is approximately
.02464 despite its passing initial heating-rate test.

Do not infer arbitrary-large-trial robustness from these completed trajectories.
A subsequent audit identified another finite-entropy large-radius-jump overflow
in `entropy_increment` (distinct from the corrected log-ratio issue). The frozen
60574a6a core and all these raw studies remain unchanged; the bounded arithmetic
patch and matched replay are being evaluated in a separate stability package.
