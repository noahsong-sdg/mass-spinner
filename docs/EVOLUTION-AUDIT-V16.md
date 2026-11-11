# Independent finite-time evolution audit, v16

Prospective review contract, 7 November 2026 UTC, before main v16 outcomes.
The reviewer owns `scientific/evolution-review-v16`, imports no producer numerical
implementation and executes scientific calculations in its distinct Apple safe-dev
VM. Prior v14/v15 artifacts remain immutable.

## Physical scope and unchanged gates

The candidate is the exact isotropic subspace of homogeneous, field-free Cartesian
3V Landau dynamics, represented by positive Gaussian-convolved spherical shells.
Rotational symmetry is preserved by this physical problem; Cartesian independence
is not assumed during evolution. This is not a replacement for anisotropic or
field-driven separator dynamics. The masses are 40u/84u, charges +e/+e, nominal
numbers 5e17 m^-3 each, lnLambda12, with the frozen v14 SI normalization.
The 2/10eV Maxwellian light heating target remains27982.16330006834eV/s, tolerance2%.
Common-temperature stationarity uses smooth5eV targets; finite-time relaxation
uses smooth2/10eV targets. Marker temperatures subtract5alpha eV at initialization.

Unchanged v14 acceptance budgets:

| Quantity | Budget |
| --- | --- |
| Relative species number / total energy / positive-scale momentum | 1e-8 |
| Adjacent and cumulative full-space H increase per initial total number | 1e-8 |
| Physical H integration sensitivity per initial total number | 2e-10 |
| Common-temperature normalized full-PDF L1 stationarity | 1e-3 |
| Cross-evolution-increment L1 refinement at50/100us | 2e-4 |
| L1 quadrature sensitivity | 1e-6 |
| Initial physical heating-rate relative error | .02 |

The physical entropy is sum_s4pi integral r² F_s(r)log F_s(r)dr, not entropy of
the radial probability density4pi r²F. Number is sum of the original raw positive
shell weights. No post-step normalization, clipping, rate fitting or temperature
projection is permitted. A Gaussian shell with positive variance/weight produces
a strictly positive3D PDF; numerical underflow is a separate implementation issue.
All species numbers, scales and initial temperatures are independently checked.

## Evidence and decision rules

Every saved state of the500us common-temperature baseline and100us relaxation
baseline is checked for physical entropy, positivity, number and energy. Distribution
stationarity applies only to the common-temperature case; a changing relaxation
distribution is instead tested by refinement of actual evolution increments.
Time, radial count, width, fixed entropy-operator quadrature and diagnostic quadrature
must be separately identifiable. A monotone finite-grid H_d does not establish
monotone full-space physical H. Missing, incomplete or underresolved outcomes remain
UNKNOWN; resolved violations remain FAIL, including retained old negative controls.

Before main cases the implementation agent freezes source hashes, exact inputs,
case counts, timesteps/horizons and measured-cost resource caps. The reviewer
independently reviews that plan. Each saved state exports all radii, raw weights,
species, masses, variances, times and actual nonlinear residual diagnostics. Static
operator nodes/weights and source/plan identities must be retained. Selected complete
Gonzalez equations are independently reconstructed; every endpoint's invariants
and physical diagnostics are checked without importing producer diagnostic code.

Independent fixtures check the spherical angular kernel, equal radii, origin,
unlike-mass pair mobility, raw-weight density scaling, physical3D entropy measure,
finite-difference shell gradients and stable entropy increments. Artifact consumption
requires an externally trusted seal, exact file/case membership and checksums of
actual bytes. Duplicate, stale, truncated, one-byte-mutated and missing-source-pin
inputs are regression cases. The manifest itself is excluded by name from its own
membership; unrelated or stale manifests are retained and separately sealed.

Numerical integration error estimates and refinement checks are reported as such,
not as interval arithmetic certificates. Gaussian omitted tails require explicit
bounds. An initial-rate pass cannot qualify missing finite-time H, PDF, horizon or
general3V anisotropy gates. Finite smoothing bias remains visible beside the original
physical target.

## Implementation problem and review choice

The old path evaluates3D entropy quadrature against every marker inside every
implicit residual and evaluates every pair. In plain terms, each nonlinear solve
repeats an enormous3D calculation. The candidate uses exact isotropy to remove
unnecessary angular dimensions while preserving full3D physical measures and
pair invariants. It is preferred to an evolved Cartesian tensor closure because
Landau collisions preserve isotropy but generally destroy coordinate independence.
Its correctness and finite-time performance still require the studies above.

## Completed independent audit

The prospective contract above is preserved verbatim in
`scientific/evolution-review-v16/provenance/EVOLUTION-AUDIT-V16-contract.md`
(SHA256 `ae43ac5cb7af337d946853001707b197f20b78c959874362a961b392195c4155`).
No acceptance budget was relaxed. The closed merged result is
`scientific/evolution-review-v16/results/final-audit.json`:
14 cases, 494 saved states, 42 independently reconstructed selected implicit
equations, 56 adaptive physical-entropy checks and 28 adaptive final-PDF checks.
The original 13-case campaign contributes 10 refinement pairs at two times
(20 records: 14 PASS, 6 FAIL); the separately frozen finest-width timestep
extension adds one pair at two times (2 PASS). Total: 22 records, 16 PASS, 6 FAIL.

Every actual saved state passes number, energy, physical full-space entropy and
diagnostic integration gates. Momentum vanishes by exact isotropy; positive raw
weights and Gaussian variances prove strictly positive continuous PDFs. This does
not imply floating-point evaluation remains nonzero in arbitrarily distant tails.
Common-temperature distributions remain stationary through 500 µs: maximum L1
departure is 3.187e-13 versus 1e-3. The maximum positive adjacent/cumulative H
increment is 8.882e-16 per initial total number versus 1e-8, so the result is
preservation within tolerance, not exact floating-point monotonicity.

The table gives the maximum species L1 difference between actual distribution
evolution increments, normalized by each run's actual initial species number.
The unchanged limit is 2e-4 at each time.

| Refinement pair | 50 µs | 100 µs | Result |
| --- | ---: | ---: | --- |
| N128 → 256, fixed width | .0268695 | .0299937 | FAIL |
| N256 → 512, fixed width | 4.1313e-6 | 3.3268e-6 | PASS |
| N512 → 1024, fixed width | 2.4638e-7 | 3.1447e-7 | PASS |
| α .00625 → .003125 | 6.7781e-4 | 4.8806e-4 | FAIL |
| α .003125 → .0015625 | 3.3428e-4 | 2.4252e-4 | FAIL |
| α .0015625 → .00078125, N1024 | 1.6603e-4 | 1.2090e-4 | PASS |
| Operator q2048 → 4096, baseline width | 1.138e-13 | 1.206e-13 | PASS |
| Δt5 → 2.5 µs, baseline width | 1.1896e-4 | 6.6785e-5 | PASS |
| Operator radius12 → 14 | 1.703e-13 | 1.800e-13 | PASS |
| Initial marker tail8 → 10σ | 5.1097e-7 | 5.9620e-7 | PASS |
| Δt5 → 2.5 µs, finest width | 1.1918e-4 | 6.6824e-5 | PASS |

The coarse N128 initial heavy-ion PDF has L1 distortion .0246416 despite passing
the initial heating-rate test. Both that distortion and the six coarse refinement
failures remain in the report. The finest initial heating rate is independently
27952.3493365 eV/s, approximately .10655% below the frozen physical target. At
100 µs the finest matched-timestep raw second moments give temperatures
3.6801120472 and 8.3198879528 eV. Evolved PDFs depart from moment-matched
Maxwellians; the solver does not constrain them to Maxwellian shapes.

At finest-width states0/50/100 µs, an additional independent q6144/8192 physical
gradient comparison finds weighted relative differences below4.38e-12 and
induced heating differences below3.57e-8 eV/s; the Gaussian omitted-tail bound
on per-weight gradients is1.47e-20. This is selected-state evidence, not uniform
finite-time quadrature qualification for every width and parameter.

## Reviewer arithmetic failures and corrections

Global Gauss-Legendre integration of an absolute PDF difference missed its cusps,
producing a false integration-sensitivity failure. Root-split integration of the
signed difference, followed by exact Gaussian-shell CDF differences, resolves
those cusps. The scanner brackets consecutive nonzero sign samples, so a root
exactly on a scout node and sign-product underflow cannot erase a crossing.
Scouts are refined through32 samples per minimum Gaussian standard deviation;
adaptive quadrature and explicit Gaussian tail bounds provide separate controls.
These are numerical resolution checks, not a proof that every root was isolated.
Earlier failed diagnostics and an intentionally failing old-scanner regression
remain in provenance.

Near common-temperature equilibrium, subtracting nearly equal kernel logarithms
lost the tiny bulk-shell displacement. A first repair used a global maximum
displacement predicate, but finite motion of extremely small-weight tail shells
disabled that repair for246 of256 tiny bulk components. In simple terms, one
moving tail switched off precision protection for the stationary bulk. The lost
entropy increment was divided by the very small weighted step norm in the
Gonzalez correction, amplifying a1e-17 error into false residual failures.
The final reviewer integrates the analytic radius score separately for each tiny
component, while retaining the original expression for finite moves. This keeps
the independent implementation distinct from the producer's log-ratio formula
and preserves the original unweighted residual norm and2e-11 gate. The mixed
bulk/tail regression fails before this correction and passes afterward. All six
common replays then have residuals at most7.82e-13. The original failed report,
its source snapshot, and an explicit repaired overlay are retained; no physical
state diagnostic was replaced.

## Separate stability-patch qualification and reproducibility

The original14 runs retain frozen core60574a6a… and their original source seals.
A separately sealed package uses core52df85de… to repair valid large-move
entropy-increment overflow and0log0 cancellation. Independent physical-PDF
references cover8→1,1→8,0→8 and a1e-20-weight mixture, including80-digit
Decimal arithmetic for the tiny contribution. Frozen-q operator values and
full-space refined physical values are reported separately: the origin stress
move has a roughly2.02e-11 q2048 physical-entropy error. This is not an evolved
production-state failure. An independent raw-data comparison verifies all21
fine replay states, excluding only the wall-clock timing field, and all static
physical metadata are identical. Thus the existing21-state physical diagnostics
transfer by state identity. The producer's separately sealed all-history replay
also records bitwise compatibility for all480 accepted entropy increments.

All reviewer scientific execution used the reviewer's distinct safe-dev VM,
offline after pinned dependencies were installed. No producer numerical module
was imported. The final source regression suite has32 passing tests, including
stale/mutated/truncated inputs, exact source/plan ancestry, positivity boundaries,
origin/angular kernels, physical measures, weighted pair invariants and the
reviewer arithmetic regressions. Host work was trusted source editing, inspection,
copying and actual-byte hashing. Runtime limits, commands, per-batch source copies,
failed controls, exact raw-input memberships and report seals are retained in the
review package. The figures `results/evolution-v16.{png,svg}` and
`results/evolution-v16-common.{png,svg}` use independently computed physical
diagnostics and actual raw moments.

Qualification remains limited to these homogeneous isotropic cases and horizons.
It does not qualify anisotropic separator transport, electromagnetic coupling,
longer evolution, arbitrary parameter ranges, or agreement with an external
finite-time full-3V kinetic solver.
