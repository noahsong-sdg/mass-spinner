# Second transport/orbit audit

6 November 2026. This is a fresh source and execution audit, not an endorsement based on the previous review. **Two wall/axial event defects were reproduced and corrected. Quantitative inhomogeneous collisional transport remains unvalidated.** No deployed browser, GPU, or experimental verification was performed.

## Evidence and scope

Traced `simulateDoublewell → initialization/equal weights → collisionCells → orbit advance → wall reflection or source/wall/end absorption → collision updates → signed H/Pθ flux ledgers → cylindrical density/CDF metrics`. Independently read `src/doublewell-dynamics.ts`, `src/doublewell-orbits.ts`, the shared `step` pusher in `src/physics.ts`, and the orbit/dynamics tests. Recomputed source/cell overlap moments using exact cylinder-cut volumes. Existing passing tests were supporting evidence, not assumed proof.

This audit changed only `src/doublewell-orbits.ts`, added `tests/audit-transport-v7.test.ts`, and wrote this report. The user explicitly authorized host execution outside the inaccessible container earlier in this chat; commands used `login:false`. No hooks, security settings, credentials, or browser restrictions were changed.

## Verified P2: a narrow wall excursion evaded every event sample

**Problem.** The old eight-subinterval event search could silently retain a particle which crossed an absorbing wall and returned inside between samples. This happened within the supported gyro timestep, not just at an unresolved large timestep. The new regression failed against the old helper: required wall destination was `undefined`.

**Technical cause.** Bisection was entered only after sampled inside/outside classification. A narrow excursion with both sampled endpoints inside supplied no bracket, even when the fractional-step trajectory had two real wall roots. The returned Boris velocity is not generally the derivative of the reintegrated fractional-time position in a nonlinear field, so substituting that velocity for the numerical-path derivative would be incorrect.

**Plain explanation.** A particle briefly touched the wall between camera frames. Taking a fixed number of frames could miss it entirely.

**Minimal reproduction.** Use 40 u, +e, a=1 m, B=±0.1 T, V=0, L=2 m; let Ω=qB/m, Δt=0.079/|Ω|, ρ=0.1, c=0.9000001 and θ=2 atan(ΩΔt/32). Start at `(c+ρ cosθ, ρ sinθ, 1)` with velocity `(Ωρ sinθ, −Ωρ cosθ, 0)`. All nine old samples at iΔt/8 are inside, but r(Δt/16)=1.0000001 m. The uniform-B synchronized Boris position follows the circle with phase θ−2 atan(Ωt/2), giving an independent analytic first-contact time.

**Fix.** Isolate contact roots of the actual synchronized partial-step Boris position. Normalize transverse positions by a and fractional time u=t/Δt. With b=(q/m)BΔt/2, D=1+b²u², ballistic midpoint M, and normalized electric impulse J=(q/m)VΔt²u(κ−2|M|²)M/a²:

```
Nx = x D + u [vx + b u vy + Jx + b u Jy]
Ny = y D + u [vy − b u vx + Jy − b u Jx]
G  = Nx² + Ny² − D²
```

Here x,y and vx,vy denote radius-normalized position and displacement over Δt. G has degree at most twelve. Recursively isolated derivative roots partition monotone intervals; sign-bracketed roots are bisected. Stationary candidates are also checked on the reintegrated numerical path because coefficient roundoff can obscure a multiple tangent root. Actual impact position/velocity are reintegrated at the first contact time. Axial ballistic contact and wall candidates are considered chronologically; later hypothetical motion is irrelevant after a valid exit.

This addresses the missing-bracket root cause. Increasing the fixed sample count would retain the same failure mechanism for narrower excursions. An unchanged conservative far-from-wall exclusion preserves the ordinary single-push fast path. Normalization and direct path checks improve numerical conditioning; they do not prove machine-precision root completeness for every ill-conditioned polynomial.

**Semantics and limits.** An exact numerical tangency collects at an absorbing wall. A resolved interior near miss survives. A near-miss/contact distinction within floating uncertainty fails explicitly instead of arbitrarily collecting or retaining the particle. Surface-coordinate roundoff is snapped only at an already declared wall to permit ordinary inward specular continuation. These are contacts of the numerical partial-step trajectory, not exact physical orbit times; timestep convergence remains required.

## Verified P2: exact axial endpoint contact bypassed absorption

**Problem.** The fast path treated an endpoint exactly on z=0 or L as safely interior. For B=V=0, a=10 m, L=2 m, z=1 m, vz=±1 m/s, Δt=1 s, the old helper returned `hit:null` at the exact absorbing surface.

**Cause and fix.** Inclusive `0 ≤ z ≤ L` classification bypassed the analytically known axial event at t=Δt. In simple terms, reaching the finish line precisely when the clock stopped did not count. The fast exclusion now requires strict axial interior. Existing launch-plane inward/outward semantics and periodic mode are preserved. Source and end endpoint regressions pass. This is preferable to moving a particle past the surface or applying a timing epsilon, which would alter a well-defined exact boundary event.

## Explicit unsupported boundary corner

Closed specular wall-coincident grazing is not resolved by this patch. For V=0, p=(a,0,z), v=(0,−Ωa,0), the gyro-circle coincides with the cylinder wall. The absorbing helper correctly reports t=0 contact; radial specular reflection imparts zero impulse, so the closed caller repeats the same contact until its reflection guard fails. Reducing Δt cannot resolve exact coincidence. Slightly supercritical tangential speed also requires a declared contact/constraint model rather than a numerical nudge.

Ordinary nonzero-radial-speed reflection and inward continuation are tested and pass. Supporting sustained wall contact would need explicit radial boundary semantics; the helper currently receives only an axial mode. Overloading periodic axial mode or silently moving the particle inward would hide a different physical boundary model. Keep this measure-zero corner explicitly unsupported until that model is specified. The current generic suggestion to reduce timestep is insufficient for coincident data.

## Verified deterministic source/cell bias; convergence remains open

The exact cylinder-cut cell volumes partition the physical domain, and equal representative weights plus annular volumes correctly recover declared inventory. However, correct cell geometry does not make a coarse spatially averaged collision density correct for a sharp pulse.

For an initial uniform pulse at n₀ with physical volume Vp, the true density-squared moment is n₀²Vp. Let Vj be each full collision-cell volume and Oj its overlap with the source pulse. The piecewise-constant density moment relative to the true value is

```
R = Σj Oj² / Vj / Vp ≤ 1.
```

This follows directly from the exact overlap geometry and does not vanish by increasing marker count at fixed grid. It isolates a spatial density moment; it is **not** the complete Coulomb collision-rate error, which also depends on relative velocity and distributions.

For a=0.2 m, L=0.6 m, source radius 0.08 m and source length 0.15 m, using the current grid construction and exact cylinder/source intersections:

| Cells across diameter | Density-squared moment ratio R | Initially intersected cells |
| --- | ---: | ---: |
| 2 | 0.120000 | 4 |
| 3, default | 0.685858 | 10 |
| 4 | 0.418879 | 8 |
| 6 | 0.746030 | 39 |
| 8 | 0.735445 | 48 |
| 12 | 0.806642 | 160 |

Integrated overlap volume reconciled to the physical pulse volume to approximately 10⁻¹⁵ relative precision. The nonmonotonic sequence is a real grid/source alignment effect. More cells by itself is not evidence of monotonic improvement.

With the maximum 8192 total markers, approximately uniform full-column expansion would give mean full-interior-cell occupancies of 869.2, 231.8, 108.7, 32.2, 13.6 and 4.0 total markers respectively for these grids. The finest grid therefore has only about two markers per species per full cell under that estimate. Actual concentrated/cut-cell populations differ. This estimate explains why the current browser limit cannot generally support both fine spatial resolution and robust local moments after expansion. It is not a proof that every run is sparse.

Finite-cell nonlocal pair impulses also introduce torque `(ra−rb)×Δpa`. The signed torque ledger explains measured raw Pθ drift; subtracting that torque from the residual does not restore the trajectories. The default 200 µs run measured a maximum sampled raw Pθ residual of 0.0172459944 of the engine's positive initial scale, while H balance was 1.2539345×10⁻⁶. Earlier 0.27–0.35% results were different finer 20 µs runs, not a bound on this default.

The Pθ normalization is the positive initial sum `Σ(|Pθi| + mi a sqrt(e Ti/mi))`, rather than initial signed net Pθ, which can be near zero. A percentage of that scale must not be described as fractional loss of initial net angular momentum or error in collector purity.

## Verification after the patch

Executed against the current host files after the final endpoint/candidate-order edits:

```
./node_modules/.bin/tsx --test tests/audit-transport-v7.test.ts tests/doublewell-orbits.test.ts tests/doublewell-dynamics.test.ts
```

**22 passed, 0 failed; 1.861 s.** The six new tests cover both B signs of a narrow excursion, exact numerical tangency, resolved and unresolved near misses, ordinary reflection continuation, exact axial endpoints, earliest axial precedence, and nonlinear quartic contacts against an independent dense-bracketed fractional-step reference. The existing nonlinear H/Pθ convergence, turning-time quadrature, flux, common-rotation equilibrium and repeated-reflection tests also passed without relaxed tolerances.

The common-Ω radial-CDF discrepancies remained 0.01429551 and 0.01785439; residual temperatures remained 10.52526→10.52750 eV and 10.59916→10.61539 eV. These are short-time stationarity observations, not arbitrary-pulse equilibration.

Three default simulation executions took 778, 692 and 659 ms and produced identical destination counts: species A active/wall/end/source = 36/0/83/9; B = 36/5/74/13. This demonstrates no observed severe regression for this default on this host, not a controlled cross-machine performance guarantee. The conservative interior fast path remains present.

An independent cross-review rederived the polynomial and checked 2000 randomized supported interior states, including both B signs and nonlinear fields, against 256 fractional-step samples each: 715 sampled-contact cases, no missed sampled contact, no later event than the first sampled outside point, and no throws. Dense scanning is useful falsification evidence, not a completeness proof. Required repository-wide typecheck/build are recorded by the root final gate separately.

## Recommended next work and acceptance gates

1. **Stage 5: reproducible convergence workbench.** First add inexpensive deterministic source-overlap/density-moment and grid-origin-shift checks. Separate fixed-grid marker convergence from fixed-occupancy spatial refinement. Add an offline runner so browser particle limits do not determine scientific accuracy. Persist exact physical parameters, seed, Δt, grid origin/spacing, marker weights and measured costs with every run.
2. **Stage 6: improve collision locality and finite-time accuracy.** First use a homogeneous no-field benchmark to separate SI collision-rate accuracy from density gradients. Then test the actual sharp pulse and intended 200 µs horizon. Refine h while increasing markers approximately as h⁻³ to retain cell occupancy; vary Δt and independent seeds separately. Compare radial CDFs, outlet fractions, escape time and species moments, alongside raw torque and its quadratic variation. Consider a physically derived axisymmetric/local method only after measuring which approximation dominates; do not invent a torque subtraction that changes the dynamics without derivation.
3. **Stage 7: reference relaxation and device closure.** Verify finite-time relaxation against an independent kinetic reference and the documented common-rotation equilibrium before inferring arbitrary-pulse sorting. Collector geometry, electron/field closure and specified source/loss budgets are separate model extensions requiring their own reference problems. More separator families do not close these gates.

**Concrete gate.** Before running the expensive ensemble, declare the intended operating point/horizon and acceptable changes in each transport observable. Require the finest two spatial/particle levels and timestep levels to agree within those predeclared tolerances across independent-seed uncertainty, with adequate occupancy/local-state coverage and a raw torque defect small enough for those observables. Require grid-origin shifts not to change the conclusion. If no resolved plateau is achieved, record failure/unknown rather than adjusting tolerances after observing results. Ledger closure, small orbit H error, or an attractive plot alone does not pass this gate.
