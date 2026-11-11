# Full3V collision implementation, v17

This adds an offline Julia reference that evolves arbitrary three-component ion
velocities, including relative drift and non-axis-aligned pressure tensors. The
new source is `scientific/general3d-evolution-v17`. It does not replace the public
browser physics. Conserved quantities and a decreasing discrete entropy do not
qualify its physical collision rates or smooth-distribution convergence.

## Traced problem and chosen split

The old full3V execution path is `advance → Newton–Krylov residual → discrete
gradient → entropy / entropy increment`, plus the unequal-mass pair mobility.
The Cartesian entropy grid becomes expensive when both the spatial extent and
resolution in all three velocity components must increase. The unweighted
Gonzalez correction also becomes large after division by small tail weights.
The isotropic v16 radial reduction cannot represent general drift or anisotropy.

The new adapter uses moving Gaussian expectation quadrature and a weight-aware
discrete gradient, retaining the physical pair projection. Its cost is
O(N² q³), where N is the number of markers and q is the quadrature order per
component. In plain terms, it evaluates density near the particles rather than
covering a large empty velocity box. This preserves arbitrary full3V states but
does not make the direct-pair method suitable for arbitrarily large N.

Reviewable changes are separated into the numerical core (`core.jl`,
`initialization.jl`, `jsonwrite.jl`), the scientific writer and capped campaign
(`run.jl`, `bounded.py`, `campaign.py`), and independently owned mathematics and
diagnostics. Each proposed non-test implementation split is below 700 lines.
The generic MIT Newton–Krylov implementation is reused unchanged from
JuliaPlasma/CollisionOperators.jl commit
`9874021c9edf030fdaa1f62e28c450d63acc361c`; the imported source and license are
SHA-pinned in the main plan. This is reuse of that solver component, not a claim
to run the complete upstream application.

## Functional and equations actually evolved

For species s, the positive smooth distribution is

    F_s(x) = Σ_j w_j K_{ε_s}(x-v_j).

The discrete entropy is the particle-centered Gaussian expectation

    H_Q = Σ_s Σ_i w_i Σ_a ω_a log F_s(v_i + sqrt(ε_s) ξ_a).

The exact derivative of this finite quadrature includes both moving evaluation
nodes and moving mixture centers. For d = v_i + sqrt(ε_s) ξ_a − v_j and
ρ_j = w_j K(d)/F_s, accumulate

    t = w_i ω_a ρ_j d/ε_s;  G_j += t;  G_i -= t.

Terms with i=j cancel in the derivative; their positive density contribution is
retained. Keeping both derivatives is necessary at finite quadrature: a term
that vanishes after exact full-space integration need not vanish for a rule.

For a pair, z=v_i−v_j and Q=(I−zzᵀ/|z|²)/|z|. The velocity-space mobility uses

    b = G_i/(w_i m_i) − G_j/(w_j m_j),
    a_i -= (w_j/m_i) Qb,   a_j += (w_i/m_j) Qb.

The pair contribution to entropy production is w_i w_j bᵀQb ≥ 0. Exact
coincidence uses the explicitly declared finite-marker convention Q(0)=0;
near-coincident tests cover distances from 1 through 1e−12. This convention is
not the physical smooth-Gaussian self-pair integral used by the independent
actual-mixture Landau reference.

The weighted Gonzalez correction is

    Gbar = G(mid) + W Δv [ΔH_Q − G(mid)·Δv]/(Δvᵀ W Δv).

It applies to every raw Cartesian component. There is no radial shortcut,
Maxwellian closure, fitted rate coefficient, clipping, moment projection,
equilibrium subtraction or density floor. Fixed positive weights/variances give
analytic smooth-PDF positivity. The implicit residual and its complete vector,
corrected gradient, entropy increment, production and contraction are exported.

Galilean invariance is exact for the finite functional up to floating-point
arithmetic. Fixed Cartesian quadrature is not exactly rotation invariant.
Rotating both states and offsets checks covariance only. The main study instead
rotates the states against unchanged lab offsets at q5 and q9, so quadrature
orientation error remains measurable.

## Three demonstrated implementation fixes

**Small total density change with a huge minor-component ratio.** The original
unsafe-ratio branch subtracted endpoint log sums whenever an individual Gaussian
ratio exceeded exp(700). The actual mixture could still change by a tiny amount;
endpoint subtraction then lost that change. A full-callsite regression with a
1e−20 component measured a −2.1253% entropy-increment error against 256-bit
arithmetic. In simple terms, a nearly invisible particle moved a long way, and
the calculation mistakenly treated the whole density as changing a lot.

The fix forms signed bounded component differences after scaling both endpoints
by their common peak, then uses `log1p` whenever the total ratio is small. The
corrected relative error is 3.04e−14. This retains tiny contributions without a
density floor or discarding small weights. Source, failing test and failure log
are retained in `provenance/tiny-mixture-beforefix`.

**Captured mutable peaks caused Julia type instability.** Actual profiling found
the entropy increment allocated 11,552,843,160 bytes per n8/q5 call. Two endpoint
sum generators captured reassigned peak variables, producing `Core.Box` values
and propagating `Any` through the hot loop. In simple terms, temporary object
creation dominated the calculation rather than collision work.

Replacing those two generators with explicit scalar sums fixes the root cause
without changing the algorithm or summation order. The callsite regression drops
from 39,436,344 to 10,168 bytes at n4/q3 and inference becomes `Float64`.
All seven pre/post pilot next states and increments compare identically.
An n8/q5 1 us step falls from 82.486 s to 13.173 s; the 5 us step takes 16.843 s
and converges in 18 evaluations. The before-source, compiler report, allocation
failure and pilot results remain in provenance. This narrow fix was chosen over
a new solver or architecture because measured boxing explained the overhead.

**Failed implicit attempts were discarded.** The writer originally threw on a
failed root before writing the candidate state and solver diagnostics. An actual
CLI regression with a two-evaluation limit reproduced that loss. In simple
terms, a failed run preserved its starting point but hid the evidence explaining
the failure.

The writer now records the attempted step, time, raw candidate and complete
returned solver diagnostics before checking convergence. A thrown exception
retains its attempted step and error without fabricating a candidate. Accepted
history remains an accepted-only prefix. Existing scientific records, including
pre-schema files, are rejected rather than overwritten. The smallest fix is at
the actual writer callsite; it introduces no retry or altered solver behavior.
The failing original writer/test/log remain in
`provenance/failed-attempt-beforefix`.

## Initialization and pre-main physical evidence

Masses are 40 u and 84 u, charges +e, density 5e17 m⁻³ per species, lnΛ=12.
The normalization uses V0=sqrt(5 eV/(40 u)); physical fields, transport and
sources are absent. The per-species variance is ε_s=alpha/m_s, so m_s ε_s is
common. Exported energy and all pressure components include their constant
smoothing contribution, alongside the marker energy and actual bulk means.

Positive tensor Gauss–Hermite markers represent covariance
T_s/(5 m_s)−ε_s I. A principal-axis factor is declared and exported, permitting
an independent exact product initial reference without imposing a product form
after evolution. Symmetric eigendecomposition also treats unavoidable
floating-point asymmetry of a rotated SPD target correctly. An earlier direct
positive-definiteness check rejected that mathematical SPD matrix; its failed
source/log remain in `provenance/rotated-covariance-beforefix`.

The independent initial witnesses show why these are finite-resolution studies:
the hot heavy species at alpha .1 has full3D L1 lower bounds at least .645/.532/
.436 for n4/n6/n8. Exact low moments hide substantial PDF ripples. At n8/q5,
combined drift-rate error is about 41% against the actual smooth-mixture physical
Landau reference. These exceed the unchanged physical gates and are retained.

The static q5/q9/q13/q17 probe separates cubature error from physical bias.
Independent adaptive initial entropy-force integration followed by the same
actual point mobility agrees with n8/q17 drift to .00769%, while its physical
rate still differs greatly. This verifies the finite-rule calculation at that
state; it identifies finite-marker/regularization bias rather than qualifying
the physical rate. No rate coefficient is adjusted to make it agree.

A single antithetic scrambled Sobol spacing control uses parent-selected seed
1701, 512 positive uniform markers/species, and the same nominal combined case.
Its actual covariance is retained, without whitening, fitting or clipping.
Independent q9 nominal drift error improves to 9.528%, but light/heavy tensor
errors are 37.744%/32.930%; the heavy tensor worsens relative to GH. Against the
actual smooth-mixture physical rate the errors are 13.652%, 37.784%/29.224%.
All fail the original 2% gates. It remains a static diagnostic rather than a
replacement family or a new time-evolution campaign: selection by the improved
drift observable alone would hide the tensor failure. Generator, input hash,
q5/q9 states and independent nominal-versus-actual references are retained.

For common T5 only, alpha .5 is a broader representation of the same physical
target (marker T2.5). The independent initial full3D L1 upper bound is
4.70596e−4, within the original 1e−3 gate. This distinct-width control does not
establish 500 us stationarity and does not qualify the combined alpha .1 family.
The unresolved common alpha .1 control is retained as well.

## Frozen campaign and verification

`campaign-plan.json` SHA256
`4f534bc934204887c4023983e4cb0f22683b4b55c08deb5a471539bb9ba4664c`
declares all 17 cases, source pins, solver settings and unchanged gates before
main results. Independent diagnostic plan
`2513ca4c8bc9dd6f7767e155f71341af1611199074abcaf0fb8d948f57189501`
binds it prospectively. Every case executes or retains an explicit failure;
there is no aggregate cap that skips fine cases. Each process has a 1800 s /
1 GiB cap, with two single-thread Julia workers in the same isolated VM.

Cases cover 100 us thermal, drift, anisotropy and combined relaxation; particle,
width, cubature and matched finest-width timestep contrasts; common boosts and
fixed-lab rotations; and 500 us common-temperature controls. Full accepted raw
states and all six tensor components are saved at every step. Failed attempts
and process terminations have separate explicit records.

On the frozen copied snapshot, final offline safe-dev checks pass: 54 core
numerical assertions, two 256-bit entropy-increment assertions, two allocation /
type-inference assertions, and four actual CLI/campaign tests. Those include
stale unique evidence, failed candidate retention and both planned children
attempted even when the first root fails. Exact commands and logs are in
`final-checks/`; there is no claim that these tests establish physical accuracy.

All execution, installation and tests ran in the dedicated Apple safe-dev VM
`safe-dev-76f9804a4ef9f70b`, offline except the explicit official Julia download.
Host work was editing, reading, hashing and copying exported bytes. Source is
copied explicitly, with valuable guest results exported before replacement.

All 17 main trajectories completed with 600 accepted steps and no solver or
resource failures. The actual guest export `/tmp/general3d-v17-main-complete`
has 235 closed-seal members plus its externally pinned seal, SHA256
`71eeaa26ee21a571824a7db852a7ec9052ea56cbdec8911135fae53e85cc42f0`.
Every actual member hash and exact file membership were checked before copying
the outcomes to the canonical project and handing them to independent reviewers.

The completed producer inventory confirms 617 saved states. Maximum observed
case wall time is 691.239 s, peak RSS is 454240 KiB, accepted implicit residual
norm is 9.5701e−13, and absolute discrete H_Q balance residual is 5.7788e−14.
These are producer diagnostics rather than independent physical acceptance.

Post-run checks add 38 boost/rotation energy, vector-momentum and full-tensor
metadata assertions, two actual wall/RSS termination tests, and a Float64-bit
comparison confirming all seven pre/post optimization next states and entropy
increments are identical. Together with the frozen snapshot suite, 96 Julia
assertions and six actual Python tests pass. No numerical source changed after
the prospective main freeze.

The final package is closed at `/tmp/general3d-v17-final-sealed`, external seal
SHA256 `56214d77c3234194259e3f4ff8ce01642db9c4bfaa014e07547b0da71769b947`.
All 250 listed members plus the seal itself were verified against the actual
export, and the canonical package has identical membership and bytes. This final
snapshot includes the reproduction README, exact commands/logs, main outcomes,
postchecks, initial static probes and preserved failed controls.

Independent finite-time entropy/distribution classification is still pending.
Passing H_Q balance alone cannot establish the physical-H or full3D distribution
gates.
