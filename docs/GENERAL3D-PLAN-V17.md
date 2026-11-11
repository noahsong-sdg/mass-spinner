# General 3D collision evolution, v17

Prospective coordination plan, 7 November 2026 UTC. Extend the offline collision
reference to arbitrary three-component velocities, relative drift and anisotropy.
The public browser and closed v14–v16 evidence remain unchanged. Exact isotropy
is no longer available as a cost reduction. No main outcomes existed when this
plan was written; a measured pilot precedes the exact production case manifest.

## Traced problem and falsifiable checks

The v14 path is `advance → residual → discrete_gradient → entropy / increment`
plus pair mobility, repeated inside the Newton–Krylov solve. Global Cartesian
quadrature costs O(N q³), while pairs cost O(N²). With n points per velocity
axis, N grows as n³. Its Euclidean Gonzalez correction also divides an
unweighted entropy correction by tiny particle weights inside the mobility.

Three ranked hypotheses guide the pilot. Replacing the global entropy grid
should remove its q³-domain cost. Weighting the discrete-gradient correction
should remove explicit inverse-tail-weight amplification. Narrow smoothing may
still leave too few markers to resolve the PDF and physical rates; a fast solver
or conserved moments cannot cure that representation failure. Test runtime,
actual implicit residuals, full PDFs and independent rates separately.

## Candidate method and reviewable split

Retain positive Gaussian mixtures with fixed weights/variance and the physical
unequal-mass Coulomb pair projection. Evaluate type-I entropy by particle-centered
Gaussian cubature: H_Q = Σ_i w_i Σ_a ω_a log F_s(v_i + sqrt(ε_s) ξ_a).
Its exact finite-rule derivative includes moving quadrature locations AND all
mixture-center contributions. Omitting a term because it vanishes only under
exact full-space integration changes the differentiated functional.

This work costs O(N² p), where p is the number of cubature points per marker.
It still requires measured resolution and quadrature convergence. Evolve full
3D centers with the weighted Gonzalez discrete gradient and unchanged pinned
MIT Newton–Krylov solver. No Maxwellian closure, radial shortcut, fitted collision
coefficient, clipping, moment projection, equilibrium subtraction or density floor.
Use stable relative-coordinate increments and preserve real nonlinear failures.

Review separately: (1) numerical core and licensed provenance, (2) case runner
and measured campaign, (3) independent mathematics/rate references, (4) independent
physical-state and convergence diagnostics. Each proposed PR stays below 700
non-test lines. This workspace has no Git metadata; no PR is presumed created.

## Physics and mandatory controls

Retain 40 u / 84 u, singly charged positive ions, density 5e17 m⁻³ per species,
lnΛ = 12, no fields, sources or spatial transport. Export SI normalization and
the covariance convention, with m_s ε_s common. Report both marker and smooth
energy/tensors, including the constant smoothing offset.

The exact case manifest must include common-temperature equilibrium, unequal
temperature relaxation, relative drift, anisotropy, and simultaneous non-axis-
aligned drift/anisotropy. Check common boosts and general rotations separately.
Export actual mean velocity vectors and all six independent pressure-tensor
components; scalar temperatures and marginal PDFs cannot qualify full3D dynamics.
For a drifting initial state the equilibrium temperature includes drift energy
relative to the common center of mass; it is not assumed to remain 5 eV.

Baseline relaxation horizons are 100 µs; equilibrium controls reach 500 µs.
At 50/100 µs separate particle, smoothing, entropy-cubature and timestep controls.
Pilot cost determines practical counts and cubature, not relaxed physical gates.
The prospective machine-readable main plan must pin all cases, source hashes,
solver controls and per-case wall/RSS caps before execution. Every planned case
executes or is explicitly failed/unknown; no aggregate cap silently skips fine
cases. Preserve all attempts and initial/full accepted velocity arrays.

## Unchanged acceptance gates and independent evidence

Number, energy and positive-scale vector momentum: 1e-8. Maximum adjacent and
cumulative physical H rise per fixed initial total number: 1e-8. Same-state
physical-H diagnostic sensitivity: 2e-10 per particle. Full3D equilibrium L1
stationarity: 1e-3. Full3D evolution-increment refinement L1 at common 50/100 µs:
2e-4. L1 diagnostic sensitivity: 1e-6. Existing unequal-temperature initial-rate
relative error: 2%. New independent drift/anisotropic physical rate references
must declare comparisons prospectively. No arbitrary shape/rate tolerance is
selected after seeing the new dynamics.

Positive fixed weights and Gaussian variances give analytic smooth-PDF positivity;
this does not prove a physical H theorem for finite cubature. Check all saved
states independently. Full3D L1 upper bounds can establish a pass; a resolved
marginal lower bound can establish a failure, never a full3D pass. Preserve
numerical integration uncertainty and Gaussian tails. Missing or underresolved
results remain UNKNOWN. Refinement differences are not exact continuum errors.

Independent agents derive the moving-node gradient, pair null spaces, Galilean
and rotational behavior, rate/pressure tensors and accepted implicit equations.
Their code imports no producer physics. Freeze diagnostic contracts before main
outcomes; retain failed tests, source snapshots, stale/corrupt-data fixtures and
actual file-membership/hash evidence. An H_Q decrease alone is insufficient.

All scientific code, dependency installation, pilots, studies and tests execute
inside Apple safe-dev VMs. Host work is trusted editing, reads, copies, checksums
and inspecting exported figures. Sync source explicitly, export valuable guest
data before replacement, and never mount credentials, home or control sockets.
The final application test/typecheck/build/site gate is separate from numerical
qualification and runs once against an identified copied snapshot.
