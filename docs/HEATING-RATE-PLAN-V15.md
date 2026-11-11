# Heating-rate diagnosis and refinement plan, v15

7 November 2026 UTC. This integration contract precedes the main v15 refinement
campaign. Each producer additionally freezes its executable case list, exact
sources and resource policy before running those cases. The independent reviewer
checks those contracts before accepting their results. Pilots and failed attempts
are retained separately. Existing v14 sources, results and failed gates are immutable.

## Reproduction and traced cause

The actual path is `run.main → advance → entropy/mobility predictor → implicit
Gonzalez residual → pinned Newton–Krylov solve → raw velocity temperatures`.
The independent timestep pilot reproduced the v14 10 ns light-ion slope:
16900.180652429 eV/s against the unchanged physical target 27982.16330006834 eV/s.
The instantaneous derivative of the same discretized operator is
16899.5907787064 eV/s. Thus this pilot already excludes a large timestep bias as
the explanation of that roughly 40% failure. The initial predictor residual was
7.668e-8, above the 1e-12 tolerance; an actual nonlinear correction reached
1.243e-15. Predictor acceptance is not the cause in this reproduced case.

The remaining ranked, falsifiable hypotheses are:

1. Finite Gaussian smoothing changes the collision operator. At sufficiently
   resolved particle count, a fixed-width rate should approach the regularized
   continuum prediction rather than the physical unsmoothed target. Reducing width
   jointly with particle spacing should remove this bias.
2. Initial Maxwellian projection error matters despite accurate low moments.
   Refining particle spacing at fixed width should reduce initial PDF error and
   change the rate toward a fixed-width limit. Shrinking width at fixed particle
   count can instead expose isolated blobs and worsen both errors.
3. Entropy-gradient quadrature aliases narrow peaks. Refining that quadrature at
   fixed initial arrays and width should change the instantaneous rate until a
   resolved limit is reached. A full-space factorized initial gradient provides
   a distinct reference, not an automatic replacement for the finite-grid operator.
4. Finite-step and nonlinear errors could affect other cases. Same-state actual
   implicit step ladders must approach the derivative of that same operator;
   larger steps and actual residual contractions distinguish nonlinear correction
   from roundoff or tolerance limitations.

## Small coherent change and study axes

Keep the existing full-3V evolution kernel unchanged. Add an offline initial-rate
reference that exploits the *initial* tensor-product Gaussian mixture. Its score
expectations reduce to 1D integrals, and a Laplace representation separates
Cartesian Coulomb pair work. Validate those identities against direct small-tensor
3V sums before any large encoded tensor campaign. This shortcut is valid at the
factorized initial state only; evolving a general 3V distribution is a separate
requirement.

Retain Gauss–Hermite controls. Add a positive uniformly spaced Gaussian quadrature
family over a declared marker-thermal domain, with raw fixed weights and no fitted
normalization or temperature. Gauss–Hermite central spacing decreases slowly with
order, whereas a fixed-domain uniform mesh directly refines spacing. The latter
is suited to resolving progressively narrower kernels without an enormous
explicit 3V pair loop. Species have distinct velocity scales. Every result reports
the implicit `n^3` particle count per species; encoded initial-rate work is not
advertised as an evolved run of that size.

The particle/width campaign varies both axes and includes fixed-width particle
refinement, fixed-particle width controls, and independent score/Laplace integration
refinements. Candidate widths span the old 0.25/0.125/0.0625 controls and smaller
values; exact nodes, widths and orders belong to the prospectively frozen executable
plan after cost/algebra pilots. No multiplier is fitted to the physical rate.

The actual full-3V timestep campaign uses identical initial arrays within each
group. After the reproduced pilot, the planned groups are `q=48,64,96` with
`dt=40,10,2.5,0.625 ns`, plus `q=48` steps of `2.56,0.64,0.16 µs` to expose
genuine implicit corrections. Export complete initial/final velocities, initial
gradient/acceleration, static quadrature, source identity and nonlinear residual
contractions. Any subsequently justified additional control needs a dated,
prospective amendment before its outcome is known.

## Unchanged physical gate and diagnostic precision

The physical problem remains homogeneous, field-free 40u/84u ions, charges +e/+e,
nominal density 5e17 m^-3 each, Coulomb logarithm 12, zero bulk drift and smooth
temperatures 2/10 eV. Normalized masses are 1/2.1 and Gaussian *variance* is
`epsilon_s=alpha/m_s`. Smooth temperature includes the fixed `5 alpha eV`
kernel contribution. State both marker and smooth temperatures.

The Maxwellian light heating target remains **27982.16330006834 eV/s**, with the
original **2%** physical acceptance gate. A finite-width continuum prediction is
an explanation/control, not a replacement target. Compare separately with the
unregularized physical Landau rate of the *actual represented Gaussian mixture*
where an independent calculation is available. This distinguishes input-shape
error from regularized dynamics. Keep the SI Coulomb coefficient fixed.

Following the independent prospective contract, finest score and pair-integration
rate changes, independent numerical agreement and finest timestep rate changes
must each be at most `2e-4` of the physical target. This diagnostic precision is
100 times tighter than the physical gate. Unresolved integrations are UNKNOWN;
resolved out-of-budget rates are FAIL. Agreement from cancellation is insufficient.

Initial PDF shape is a separate diagnostic. Integrate actual 1D absolute PDF
differences, refine them within `1e-6`, and bound Gaussian tails. For raw 1D weight
sum S, actual 3D number is S^3. For a unit-number target the product bound is
`||F-M||1 <= (S^2+S+1)||f-g||1`; state any alternative fixed-actual-number target
explicitly. Export raw number/moment errors and do not renormalize snapshots.
Correct low moments or a small characteristic-function *lower* bound cannot
establish small full-PDF error.

Actual steps retain the `1e-8` number, total-energy and positive-scale momentum
budgets. Strict PDF positivity follows from positive mixture weights/variances;
numeric underflow is distinct. Original finite-time physical entropy, distribution
and horizon gates remain open unless actually rerun and passed. Initial-rate success
cannot stand in for those studies.

## Independent work, resources and provenance

One agent implements the compressed initial-rate reference. A second derives an
independent Gaussian-mixture physical Landau rate and audits masses, signs,
regularization and SI conversion. A third executes actual implicit 3V timestep
ladders using the unchanged pinned v14 kernel/vendor. A fourth independently
checks raw inputs, calculations, convergence and integrity, without importing the
producer numerical implementation.

All scientific execution and tests run in their distinct Apple safe-dev VMs.
Host operations are trusted editing, reading, copying and checksum verification.
Copied-source identities, actual command logs, raw arrays and finite chronology
are required. Export valuable guest artifacts and verify actual host hashes before
replacement sync. Retain parse failures and resource failures beside final evidence.
The original Q(0)=0 convention stays exact; a nonzero-speed cutoff is excluded.
Laplace coincidence contributions and infinite tails require explicit checks.

Use measured cost pilots and per-invocation watchdogs, not an arbitrary global
ledger that silently leaves the required refinement axes unrun. A resource-limited
case remains explicitly incomplete. Freeze source/case/resource identities before
main outcomes; regress stale, duplicate, truncated and mutated inputs. The parent
checks exported bytes, integrates actual results and runs the root application's
required tests, typecheck, build and static-site checks at the final gate.

## Primary method references

[Carrillo, Hu and Van Fleet, multispecies method, §3.1](https://arxiv.org/html/2310.16143v1)
uses species-scaled uniform quadrature and positive initial weights. Our raw
trapezoidal variant must be validated on its own. The authors' regularized
equilibrium analysis explains why the mass/variance relation matters.
[Carrillo, Hu, Wang and Wu, single-species method, §4](https://arxiv.org/html/1910.03080v2)
discusses coupled mesh/width refinement. Its cited convergence condition comes
from a nonlinear-diffusion analogy; its empirical width prefactor is not a proved
Coulomb accuracy rule and is not adopted or fitted here.
