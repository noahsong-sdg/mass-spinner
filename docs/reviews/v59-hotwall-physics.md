# Independent hot-wall timestep physics audit, v59

## Verified source path

`simulateFuelOperation` constructs an initial uniformly occupied mixture, then
advances `advanceFuelMixtureThermal`. Each trial endpoint temperature calls
`advanceFuelCoupledStep`; accepted species inventories determine neutral inertia,
and the two angular momenta are advanced by backward Euler (BE). The nonlinear
thermal solve reevaluates this coupled endpoint. Accepted states are captured in
`checkpoints`; `sampleFuelTransport` interpolates conserved quantities only when
the requested time is between those checkpoints.

The v58 comparison uses common times `t_j=duration*(j/64)^2`. For 512, 1,024 and
2,048 quadratic-grid steps these are exactly the respective accepted indices
`8j`, `16j` and `32j`. The reported **3.224%** maximum difference therefore is
not caused by off-knot playback interpolation. It is a difference to a finite
2,048-step reference, not an established absolute error.

## Independently derived stiffness

At fixed inertia, write `a=gamma/I_i`, `b=gamma/I_n`, `d=drag/I_n`. The decay rates
of the two-rotor homogeneous ODE satisfy

```
lambda_fast + lambda_slow = a+b+d
lambda_fast * lambda_slow = a*d
```

With initial ion fraction 0.01, collision frequency 10,000/s and drag frequency
2/s, `a=10000/s`, `b≈101/s`, and `d=2/s`. Thus the fast equilibration time is
approximately **99 microseconds**, while the slow spin-up time is approximately
**0.505 seconds**. These values are analytic estimates from the source-defined
mechanics, not new executed simulation results.

The first common v58 observation is 244.140625 microseconds. At that time the
512-step quadratic grid has just taken its eighth step, whose width is
57.220459 microseconds. Hence `lambda_fast*dt≈0.578`: BE is stable but poorly
resolved on the fast slip mode. For a scalar decay, BE multiplies the amplitude
by `1/(1+lambda*dt)` instead of `exp(-lambda*dt)`; it retains too much of the
initial decaying mode. Exact angular-momentum and mechanical-energy ledgers do
not remove this time-discretization error.

The initial whole-gas heat capacity is `1.5*P*V/T≈0.001086 J/K`; the prescribed
0.1 W/K film gives a whole-gas heating scale of about **10.9 ms**, over 100 times
longer than the fast rotor scale. This makes fast BE mechanical error a strong
candidate for the earliest ion-speed discrepancy. Spatial gas conduction and
species redistribution are also stiff; this timescale comparison alone does
not prove their contribution negligible.

## Smallest coherent fix and validation requirements

Retain positive, conservative BE steps and their existing signed-work and
numerical-dissipation accounting; refine accepted steps around the fast rotor
transient. A startup-only grading exponent can trade early error against later
resolution and misses new fast slip transients following a current intervention.
If a time-grid fix is chosen, it should explicitly include event-relative
refinement and continuation from the accepted branch time.

Increasing the global default step count can cross a particular 3% gate but
does not itself identify the cause or ensure later interventions are resolved.
Richardson-extrapolating accepted states is inappropriate here without a new
positivity/entropy/work proof: it can destroy the structure being preserved.

Before approval, execute the following independently meaningful controls:

1. Freeze inertia using zero radial diffusivity. Set gas conductivity and film
   to zero so thermal evolution cannot drive radial redistribution. Compare
   accepted rotor knots to an independent analytic 2×2 matrix exponential.
2. Locate the actual hot-wall maximum error, report its enclosing accepted step
   and rotor timescale, then compare refined and original grids on unchanged
   common times. Preserve the original failure.
3. Include all accepted times through the first millisecond, later current
   switches, off-knot conservative sampling and resume/branch histories.
4. Retain species positivity, per-species inventory, angular impulse, total
   energy, signed rotor redistribution work and reduced entropy gates.
5. Distinguish convergence to a finite reference from a converged independent
   trajectory. Preserve the prescribed-coefficient, common-temperature,
   overdamped-radial model limitations.

This initial audit is source and analytic reasoning only. No project code was
executed on the host or in the shared VM by this reviewer. Final corrected
execution evidence is required before approval.

## Candidate re-audit

The candidate retains each original nominal grid target, inserting BE substeps
with `h <= (8/steps)*(transient_age + 1/rotor_trace)`. The transient origin and
accepted-inertia trace are restarted at initialization, continuation and every
current event. Every accepted interior substep is retained for playback. This
changes the integration partition, not the force, species, heat, entropy or
rotor-work equations. Summing the existing conservative substep identities
therefore preserves the global mechanical and thermal ledgers. No extrapolated,
potentially negative mixture state is introduced.

Parent-executed `hotwall59-baseline-oracle.log` demonstrates the original error
against an independent exact fixed-inertia solution: 7.689% ion / 11.174% neutral
startup discrepancy, and 83.39% / 110.25% following late switches from rest.
These denser, off-knot checks expose error that the earlier 64-time comparison
missed. The mobility is 1e−30 m²/s, with directly asserted unchanged inventories;
hot-wall heating remains active but cannot influence the frozen-inertia rotor.

The same two unchanged tests pass after the candidate, with maximum startup
differences 1.030% ion / 0.956% neutral and switched differences
1.030% / 0.978%. The receipt verifies 615 inputs, SHA-256
`579d2bffa9d35c1ae76c16fb8ae689390aea814927ecc24919260ca39143c652`.
All ten tests in that narrow batch passed, including the existing reduced
entropy/work, hydrostatic and independent RK4 checks. This reviewer inspected
the actual logs and source rather than executing a second shared-VM job.

The trace is evaluated at each transient origin, not continuously recomputed
as inertia changes. The new grid is a physically motivated refinement schedule,
not a local-error estimator or an all-parameter accuracy guarantee. The full
hot-wall finite-reference study, continuation checks and final release gates
remain separate acceptance requirements. New independent all-knot hot-wall
gas/solid/coolant entropy and first-law tests are provided in
`tests/hotwall-entropy-audit-v59.test.ts`.

## Executed closing physics review

Inspected actual parent-run `hotwall59-entropy.log` and its before/after verified
618-input receipt (SHA-256
`5a36064518d83a3befab0e16c30224dddbddde2e5937964f90bba82f3d68bc9d`).
Both independent tests passed. The startup case contains 873 accepted knots;
the late-switch case contains 2,187. Across all accepted intervals:

- Minimum total gas/solid/coolant entropy increase was **3.83158e−7 J/K**.
- Minimum entropy-production lower-bound margin was **−1.53e−13 J/K**, inside
  the propagated solid-energy floating-point budget. Total entropy itself
  increased at every step.
- Maximum independently reconstructed per-step first-law residual was
  **2.28e−10 J**.
- Species inventory/positivity and per-cell ideal-gas energy/pressure identities
  passed. The audit integrates tungsten Cp/T analytically and reconstructs the
  species, conduction, film, friction and Ohmic entropy terms independently;
  it does not call production entropy/property/step helpers.

The deeper `hotwall59-deep-refinement.log` executes 512, 1,024, 2,048, 4,096 and
8,192 nominal intervals for actual 64-cell gas / 16-cell tungsten cases. Against
the finite 8,192 reference, startup ion-speed differences decrease
**1.242% → 0.4934% → 0.1513% → 0.04714%** across 166 common times. The
late-switch case decreases **1.2338% → 0.4842% → 0.1757% → 0.05734%** across
472 common times. Neutral speed, gas temperature, local pressure and species
CDF differences also contract. This is stronger evidence than merely crossing
the original 3% gate against 2,048 intervals. It is still finite-reference
convergence, not an absolute-error proof for the full mixture.

**Physics review passes within scope.** The fix preserves the reduced model's
equations and resolves the demonstrated transient error without weakening the
existing gates. The original failing analytic controls remain retained.
Prescribed coefficients, common local species temperature, overdamped radial
dynamics and finite radial resolution remain limitations. Final full-suite,
release and deployed-browser verification are separate parent-owned gates.
No project execution was performed by this reviewer outside the prescribed VM.
