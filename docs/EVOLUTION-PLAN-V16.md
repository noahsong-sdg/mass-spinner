# Finite-time collision evolution plan, v16

Prospective contract, 7 November 2026 UTC. Acceptance budgets were written by
the independent reviewer before the main campaign; see
[the independent contract](EVOLUTION-AUDIT-V16.md). Pilot and regression outcomes
are separate from main scientific outcomes.

## Execution path and diagnosed causes

The v14 `advance → discrete_gradient → entropy / entropy_increment → mobility`
path repeats a three-dimensional marker–quadrature sum and all marker pairs in
every Newton–Krylov residual. Its baseline stopped after 600.035 seconds at
445 µs, short of the intended 500 µs. The v15 tensor/Laplace shortcut evaluates
factorized initial states only; using it after evolution would impose an
unjustified Cartesian-independence closure.

For the present homogeneous, initially isotropic, field-free problem, rotational
symmetry is a physical invariant. The new, separately identified Julia backend
integrates the angular variables analytically and evolves positive weighted
spherical shells. It retains arbitrary radial, non-Maxwellian distributions and
the three-dimensional entropy measure. This removes redundant dimensions
without claiming to accelerate general anisotropic separator dynamics.

The first actual-step regression exposed a second cause: Euclidean Gonzalez
correction components divided by very small shell weights produce artificial
tail stiffness. The candidate instead constructs the discrete gradient in
coordinates `y = sqrt(W) r`, yielding

    gbar = gradH(mid) + W dr (deltaH - gradH(mid)·dr) / (drᵀ W dr).

This preserves the original entropy chain rule and symmetric pair metric. It
changes neither the entropy nor the zero-timestep collision force. Stable
entropy increments remain necessary. No weights, densities, temperatures or
collision coefficients are fitted, clipped or projected. The unchanged pinned
MIT Newton–Krylov solver still solves the radius residual; it is not claimed to
have been transformed to weighted coordinates.

The hypotheses tested in order are dimensional entropy/pair cost, general
three-dimensional evaluation cost, and nonlinear-solve conditioning. Exact
isotropy addresses the first for this benchmark. The failed variable-weight
regression identifies a concrete instance of the third. General 3V acceleration
remains a separate stage rather than a hidden closure in this change.

## Fixed physical problem and gates

Masses are 40u and 84u, charges +e, nominal number density 5e17 m⁻³ per species,
and Coulomb logarithm 12. Existing SI normalization and the physical initial
heating target **27982.16330006834 eV/s** are unchanged. Smoothing satisfies
`m_s epsilon_s = alpha`; initial marker temperatures subtract the corresponding
5 alpha eV smoothing contribution.

Complete common-temperature histories must reach 500 µs from smooth 5/5 eV.
Unequal-temperature histories must reach 100 µs from smooth 2/10 eV, saving every
accepted state. The equal-number asymptotic temperature is 6 eV; 100 µs is not
assumed to be complete equilibration. Static integration nodes cover evolving
tails, with an independent larger-domain control.

| Gate | Unchanged budget |
| --- | --- |
| Relative species number and total energy residual | 1e-8 |
| Adjacent/cumulative physical H increase per initial total number | 1e-8 |
| Physical H quadrature sensitivity per initial total number | 2e-10 |
| Common-temperature full-PDF L1 stationarity | 1e-3 |
| Evolution-increment L1 refinement at 50 and 100 µs | 2e-4 |
| L1 diagnostic quadrature sensitivity | 1e-6 |
| Initial physical heating-rate relative error | 2% |

Momentum is identically zero by the isotropic representation; this does not
independently validate anisotropic momentum exchange. Positive shell weights
and Gaussian variance imply strictly positive reconstructed density. Floating
underflow and finite numerical integration are reported separately. Entropy is
`sum_s 4 pi integral r² F_s log(F_s) dr`, not entropy of the radial probability
density. Species distributions remain separate, and normalization uses actual
initial raw numbers throughout.

## Campaign and review requirements

The producer freezes exact cases, source hashes, horizons, timesteps and measured
per-case resource limits before main execution. Particle count and width require
joint refinement plus fixed-width particle controls. Operator quadrature,
timestep, initial truncation and integration domain receive distinct controls.
All declared cases must be attempted; no aggregate budget may silently discard
the expensive fine cases. A failed or incomplete case remains FAIL or UNKNOWN.
Any extension must receive its own prospective freeze.

Every saved state retains radii, original weights, masses, variances, physical
time, nonlinear residual and entropy-balance diagnostics. Independent reviewers
import no producer numerical functions: one derives and checks the angular
kernel, KDE measure, mass factors and weighted discrete gradient; another
reconstructs physical entropy and PDFs, selected complete implicit equations,
refinement differences and raw evidence provenance. Initial-rate agreement alone
cannot establish finite-time qualification.

Each implementation, campaign and independent-review slice remains separately
reviewable. Scientific execution, installation and tests run in distinct Apple
safe-dev VMs; sources are copied explicitly. Valuable guest artifacts are
exported and hash-checked before source replacement. Final evidence requires
actual-byte checksums and exact archive membership, plus stale, truncated,
mutated and missing-source rejection tests. Root application tests, typecheck,
build and static-site checks run once at the final gate on an identified copied
runtime snapshot. No public deployment is implied by this offline study.
