# Restricted H-1 first-capture experiment

The Models lab includes an optional, collapsed **Hydrogen capture** experiment. It follows actual analytic charged and neutral trajectories and computes first-capture probabilities. It does not change the generic-ion separator solver or qualify its collision transport.

## Problem and chosen scope

The existing neutral-pressure diagnostic did not follow reaction products. A local charge switch would omit the newly ionized gas atom; a velocity reset would discard the fast nucleus's momentum and energy. In simple terms, changing a particle's color would not track where both atoms went.

The bounded fix is an explicit H-1 experiment: ground-state stationary H bath, uniform axial B, zero electric/RF fields, monoenergetic on-axis launch at z=0.02L, absorbing cylindrical wall and downstream end. The primary follows an exact helix until first capture or absorption. Capture creates a fast neutral with the incident nuclear velocity and a stationary reservoir-origin ion. The neutral follows an exact ballistic ray to absorption. The slow ion remains at rest under prescribed E=0 fields and is retained separately; subsequent atomic kinetics are unresolved. No cross section is extrapolated to zero relative energy.

This restriction makes the hazard constant and event competition analytically testable. It avoids presenting an unqualified accelerated-hazard integrator, secondary network or identity inferred from atomic mass as finished physics. A generic extension needs explicit multi-origin inventories, integrated optical depth along accelerated paths, both-product re-integration, secondary channels and differential scattering data.

## Source and approximation boundary

The [Janev–Reiter–Samm primary report, Jülich4105](https://juser.fz-juelich.de/record/38224/files/Juel_4105_Reiter.pdf), §2.2.3 Eq.44/Table9, supplies the H+ + H(n=1) **total** capture fit. Reported accuracy is approximately 10–20% over approximately 0.1 eV–2 MeV. Coefficients are pinned in `src/hydrogen-charge-exchange.ts`; the [FIDASIM implementation](https://d3denergetic.github.io/FIDASIM/sourcefile/atomic_tables.f90.html) is a cross-check.

The experiment deliberately uses only 0.1–20 eV/u, explicit H-1 identity and equal nuclear masses with electron inertia omitted. **The total cross section does not validate differential nuclear scattering. Straight-through nuclear product velocities are an explicit approximation.** Neutral scattering, ion-ion collisions, secondary reactions, excitation, electron kinetics, bath response, self-consistent space charge and apparatus calibration are absent. “Analytic survival” means exact evaluation for the prescribed fit and assumptions, not exact empirical probability or full physical transport qualification.

## Equations and inventories

With ω=eB/m, vx(t)=vx₀cos(ωt)+vy₀sin(ωt), vy(t)=vy₀cos(ωt)−vx₀sin(ωt); vz is constant. Stable sinc/cosc expressions preserve B→0. Analytic wall/end times compete with t_capture=−log(1−u)/(nσv); absorbing boundaries win numerical ties. Survival is exp(−nσvt). No timestep is used.

Every trace reports tagged charged/neutral output, reservoir-origin retained ions, reaction nuclear momentum/energy residuals, magnetic impulse, mechanical angular change and magnetic angular impulse, and total canonical angular momentum. After capture the latter includes the **stationary slow ion's** qBr²/2 as well as the neutral's mechanical angular momentum. Mechanical angular momentum alone is not conserved in external B. Recovery keeps the original injected-nucleus denominator; neutral fractions are not purity.

Practical numerical domain: radius 0.001–2 m, length 0.01–10 m, |B|≤0.05 T, pitch 0–85°, density 0–10²⁰ m⁻³, 1–4096 tracers, uint32 seed. UI geometry/count ranges are smaller. Invalid identity, fields, seed and geometry are rejected; blank seed is not silently changed to zero.

## Grazing-boundary correction

An independent test found a tangent-wall roundoff failure: r²−a² rounded to +6.94×10⁻¹⁸ m² just before the charged wall event. The strictly-interior quadratic returned a negative neutral flight time. In simple terms, an atom numerically just outside the wall was propagated backward to it.

The fix admits only a radial arithmetic band 32εa² and axial band 32εL. A product represented on the absorbing surface within that band exits immediately; genuinely exterior input is rejected. Strictly interior rays retain the stable positive root. This enforces forward events without clamping arbitrary roots, moving physical boundaries, changing rates or relaxing scientific gates. The exact witness, signed B and energy-endpoint near-grazing cases, positive interior flight and exterior rejection are regression cases.

## Trajectory display and integration

The UI plots the actual first tracer's x–y footprint with equal physical scales, true charged terminal point, neutral segment and visible slow-ion marker. Identical repeated transverse turns are omitted. Full 3D arrays are supplied only when ≤4096 segments resolve ≤0.05 rad gyrophase each; otherwise that line is explicitly withheld. Analytic results, bounded exact transverse footprint and neutral path remain available. No aliased helix is drawn as a false trajectory. At most twelve sample paths are returned; the current UI displays the first.

`setupHydrogenTracer(container, {onResult})` mounts before precise controls/scenario initialization and returns `run()` and the current result. Eight actual DOM inputs use shared-registry `h1-` IDs. Nothing runs until opened/run. Recomputations read actual inputs; invalid inputs clear stale plots and observers. The existing renderer's selected-point marker displays one-point slow-ion output.

## Verification boundary

Production core SHA-256: `f52a29d88371784a343f85939a6b35265740bea250af268dacd539213e1d7eaf`; UI: `9a2112df692749982d8aa28b9cb0daa23c906652c68c6c599a99341b9e826f1c`; kernel: `763dd176861feaf62306c1a92483c573c3bb7c2b0c9ec869383b56afc32c792d`.

The [independent audit](HYDROGEN-TRACER-INDEPENDENT-V38.md) ran `tsx --test tests/hydrogen-tracer-independent-v38.test.ts tests/hydrogen-tracer-v38.test.ts tests/hydrogen-charge-exchange-v38.test.ts tests/hydrogen-tracer-ui-v38.test.ts` in its explicitly synced Apple safe-dev VM: **20 passed, zero failed**. Strict tracer/kernel `tsc --noEmit` passed. The original independent grazing test failed before the correction and passed unchanged afterward. RK4, signed/zero-B, analytic survival, boundary ties, endpoint energies, practical geometry corners, both-product ledgers, bounded graphics and actual jsdom controls were checked. Repository-wide build/typecheck remain the parent integration gate. Tests/jsdom do not constitute deployed GPU/mobile/browser verification.
