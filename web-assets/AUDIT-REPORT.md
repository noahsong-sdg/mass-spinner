# Version 5 — focused C/D literature and integration audit

Four subagents completed complementary primary-literature, independent-derivation, integration and diagram work. Reports: IIC-LITERATURE-REVIEW.md, IID-LITERATURE-REVIEW.md, CD-INDEPENDENT-REVIEW.md and REFERENCE-ATLAS.md.

No blocking algebra defect was found in the existing C/D kernels. The audit identified interpretation and presentation gaps: central fractions differed from bulk inventory; E×B was only an approximation to exact ion branches; double-well landscapes needed a fixed-Pθ boundary and no populated-purity claim; reduced modes displayed frequencies from hidden unrelated orbit settings. The integrated changes add independent diagnostics, explicit labels, shape/momentum controls, radial inventory/convergence and a corrected mode-dependent readout. All 80 source/numerical tests passed.

Core scope is A–D. E–K is an eleven-diagram reference atlas. Remaining physical limitations include current-carrying VAC closure, collisional double-well equilibration, self-consistent fields and electrons, experimentally calibrated source/collision/collector inputs, statistical ensemble uncertainty and curved boundary-event convergence. These are not papered over with heuristic efficiency penalties.

Live browser verification is blocked by an admin-enforced origin denial, even after a user permission change. Build publication is not evidence of browser controls or GPU appearance. No bypass attempted. Historical all-section audits follow.

---

# Team audit — Section II workbench, version 4

The team independently reviewed the tutorial inventory, geometric models, transport/atomic models, existing orbit/equilibrium physics, and UI/GPU source. Every subsection A–K is represented; this is not a claim of complete engineered-device simulation. Fifteen numerical entries use fourteen model families (end-plug and MCMF entries share an endpoint-barrier solver); three brief proposals are overview-only. POMS is a surrogate, double-well is illustrative, and mirror results are invariant diagnostics. Live deployed GPU/control verification remains blocked by managed browser policy.

Root integration gate: 61 tests passed; typecheck, build, deployment structure and Blender asset checks passed. Tests include actual control-adapter→solver sensitivity for all twelve added numerical entries, all worker dispatches, cancellation/error settlement, and GPU readiness visibility state. These are numerical/source-unit checks, not browser interaction or experimental validation.

Resolved numerical findings: collision-resolution checks now precede absorption; impact velocity/RF work use fractional-step Boris integration with a separate impact residual. Resolved UI findings: renderer-ready state, successful first-frame gate, failure recovery, hidden-render skip, refinement budget, stale worker cancellation and inert controls. Final root trace also aborts comparisons on settings changes/new runs and prevents stale completion from overriding current run state.


---

# Section II inventory and physical-claim audit

Reviewed source: Zweben, Gueroult & Fisch, *Plasma mass separation*, Physics of Plasmas 25, 090901 (2018), DOI [10.1063/1.5042845](https://doi.org/10.1063/1.5042845). Evidence checked: the user-provided PDF, its local `assets/tutorial.txt` extraction (Section II and relevant Section III), plus the existing `src/physics.ts`, `src/centrifuge.ts` and `src/collisions.ts`. This review is a source/equation/coverage audit, not an execution test or experimental validation. Other agents/root own numerical execution and browser verification.

## Exact scope: 11 subsection headings, 18 directory entries

The paper has **11 Section II headings (A–K)**. It does not define a unique number of “separator types,” because several headings discuss multiple configurations or subsidiary mechanisms. The directory splits these into **18 educational entries** so named alternatives do not disappear inside a generic setting. These counts are an editorial classification, not a number quoted by the paper.

| Heading and printed paper page | Mechanisms/variants represented | Directory IDs |
|---|---|---|
| II A, Ion gyro-orbit separation, pp. 4–5 | Passive gyroradius interception; selective ICR heating with gyroradius-sensitive/biased collection | `gyro`, `icr` |
| II B, Ion drift orbit separation, pp. 5–6 | Curvature/gradient drift through a magnetic bend; selective heating is an optional enhancement | `curved` |
| II C, Plasma centrifuge (vacuum arc centrifuge), pp. 6–7 | Rotating radial force balance; vacuum-arc implementation combines source and rotation | `centrifuge` |
| II D, Rotating plasma separation (uniform magnetic field), p. 7 | Wall-versus-axial rotating filter/Archimedes geometry; shaped-potential double-well radial separation | `rotating`, `doublewell` |
| II E, Rotating plasmas (variable magnetic fields), pp. 7–8 | Centrifugal end plug; rotation-modified magnetic mirror and combined MCMF; brief separate rotating-magnetic-field proposal | `centrifugal`, `mirror`, `rotatingmagnetic` |
| II F, Alternative magnetic/electric field geometries, p. 8 | Strong-core plasma-optical mass separation (POMS); distinct central-conductor azimuthal-B/radial-E geometry | `poms`, `azimuthal` |
| II G, Radial advection, pp. 8–9 | Neutral-friction advection of rotating ions; collisionality-gradient advection with diamagnetic flow | `advection`, `collisionality` |
| II H, Radial diffusion, p. 9 | Magnetized collisional diffusion; unmagnetized limit and possible slower neutral/electron contributions discussed | `diffusion` |
| II I, Ion mobility, pp. 9–10 | Collisional electric mobility; capillary isotope enrichment with ion wind and competing explanations | `mobility`, `ionwind` |
| II J, Ionization energy, p. 10 | Differential atomic/molecular ionization followed by ion extraction | `ionization` |
| II K, Transit time separation, p. 10 | Pulsed near-fixed-energy flight with synchronized moving/segmented collection | `transit` |

**There is no magnetic-cusp separator in this Section II.** A proposed `cusp` entry would misidentify the Fig. 7 geometry. That geometry has azimuthal B decreasing as 1/r around a central conductor and an assumed logarithmic radial electric potential. It is distinct from POMS.

`mirror` groups the standalone rotation-modified mirror and the combined MCMF concept. `centrifugal` exposes the other end-plug component separately. The brief rotating-magnetic-field, collisionality-gradient and ion-wind entries are explicitly catalogued as unresolved standalone numerical models; merely listing them must not imply their physics has been implemented.

## Advantages and disadvantages: evidence versus inference

`src/methods.ts` supplies a mechanism description, advantages, disadvantages, fidelity boundary and relevant parameters for each entry. Benefits deduced rather than explicitly established by the tutorial carry an `[Inference]` label. Historical statements about experimental status are attributed to the **2018 tutorial**, not asserted as present-day literature conclusions.

The strongest distinctions to make visible in the app are:

- **Gyro-orbit/ICR:** comparatively simple geometry and spectral heating control, but thermal gyroradius overlap, scattering, RF coupling and heating cost limit resolution and throughput. Uniform imposed RF is a heating model, not an antenna/extraction apparatus.
- **Curved-field drift:** no externally imposed E is required in the ideal proposal, but self-generated charge-separation E can oppose the useful relative drift. Source slit acceptance matters.
- **Centrifuge:** can tolerate relatively high collisionality and a vacuum arc integrates the source, but instability-driven mixing, source compatibility and historical energy costs are serious constraints. The conducting-target limitation belongs to the illustrated vacuum-arc implementation, not every mathematical rotating equilibrium.
- **Uniform-B rotation:** externally adjustable and geometrically simple, but density/throughput, attainable plasma potential, neutral effects and fluctuations limit the ideal orbit advantage.
- **Variable-B/MCMF:** different end conditions can favor different masses. The needed collision window is narrow: enough pitch-angle scattering to refill a loss cone, little enough perpendicular transport to preserve separation.
- **POMS and azimuthal-B:** distinct field topologies. Historical reported POMS separation does not validate an arbitrary magnetic-core toy; proposed central-conductor separation does not establish current/electrode engineering performance.
- **Advection:** may occur spontaneously and compete with other methods, but neutral-friction mass dependence is weak and useful separation is poorly constrained experimentally in the tutorial.
- **Diffusion:** high-density/low-temperature transport is attractive, but the specific classical heavy-ion estimate in the paper gives **little or no heavy-mass separation**. The null result is a core lesson, not a reason to inject artificial mass dependence.
- **Mobility:** no B is required, but diffusion and shielding compete with directed drift. Commercial buffer-gas ion mobility spectrometry is not proof of equivalent performance in a quasineutral plasma.
- **Ionization:** elemental/molecular thresholds can help, but broad cross sections and thermal averaging limit sharpness. Mass is not an ionization-rate input.
- **Transit time:** arrival-time differences provide a direct coordinate and moving collectors can segregate products, but source energy spread, collisionlessness, slits, duty cycle and vacuum mechanics constrain throughput.

## Equation and units audit constraints

1. **Thermal radius convention (§II A, Eq. 1).** The paper uses a typical speed sqrt(kT/m). A simulation can instead specify a perpendicular kinetic energy and use sqrt(2E/m), but it must not call the two inputs identical temperatures. A 2D Maxwellian with component variance kT/m has mean perpendicular kinetic energy kT.
2. **Curvature drift (§II B, Eq. 2).** The half-torus estimate assumes comparable characteristic parallel/transverse speeds. General guiding-center drift depends on both components; equal energy inputs and equal velocity inputs have different mass scalings. Require gyroradius/curvature radius small. A mass-dependent drift in imposed fields omits ambipolar cancellation.
3. **Rotating cutoff (§II D).** The potential convention matters. For phi=V(1−r²/a²), m_c=qB²a²/(8V) is the cold infinite-device radial stability threshold. Actual finite-device collection is not a step function of this threshold. The exact marginal solution can grow, and finite axial transit can intercept before the wall.
4. **Variable-field barriers (§II E, Eqs. 5–6).** Centrifugal energy is mΩ²(r_start²−r_end²)/2 for inward motion at imposed rigid Ω; magnetic mirroring adds μΔB under adiabatic conditions. A complete MCMF has two different outlets and a loss-cone refilling problem. A barrier plot alone is not a complete separator or recovery prediction.
5. **Neutral-friction advection (§II G, Eq. 7).** The printed estimate uses E in V/cm, n0 in cm^-3 and B in gauss; the output is cm/s. Its sample values E=1, n0=3e13, relative polarizability≈11, masses 40/137 and B=1000 give about 5.2e3 cm/s, or 52 m/s. Reduced-mass dependence is weak. Do not omit unit conversion or substitute ion mass for reduced mass.
6. **Classical radial diffusion (§II H, Eq. 8; III F, Eq. 13).** This is a **minority heavy ion in a much denser light-ion background**, with common temperature and Z=1, in a magnetized regime. D≈1.2e−3 n_l[cm^-3] lnΛ sqrt(M_l) Ti[eV]^-1/2 / B[G]^2 cm²/s. Heavy-ion mass cancels between gyroradius squared and collision frequency. The example n_l=1e13, lnΛ=5, M_l=40, Ti=10, B=1000 gives about 1.2e5 cm²/s = 12 m²/s. This formula is not a symmetric 50/50 mixture closure. It also must not be extrapolated into ν≫Ω, where the paper says isotropic transport gives no spatial separation.
7. **Mobility (§II I, Eqs. 9–11).** μ=q/(mν) is conditional on a specified collision frequency. ν varies with species and regime; equal ν is not a universal gas law. Include compatible diffusion when claiming a spatial distribution, and flag field shielding. The capillary ion-wind observations even have the opposite enrichment direction to a naive mobility argument.
8. **Ionization (§II J).** Ionization fractions require rate coefficients obtained from species cross sections and the electron energy distribution, density, exposure time and recombination. The textbook threshold alone does not supply k_ion(T_e); a mass-based guessed rate is invalid. If rates are assumed controls, label the result a kinetics sensitivity study, not an elemental prediction.
9. **Transit time (§II K).** L sqrt(m/(2E)) is a fixed-kinetic-energy result. With electrostatic acceleration E=qV, charge also enters. Distribution width and pulse width must propagate to arrival-time or moving-collector width; otherwise the apparent resolution is artificial.

## Current reduced-model audit observations

The pre-expansion orbit kernel resolves imposed-field Lorentz trajectories, finite source distribution, ideal first-hit collection, optional elastic scattering and RF work. Its definitions and sign conventions are consistent with an Ohkawa-style ideal potential and circular-RF single-particle heating. This statement is from source inspection; independent numerical tests are owned by the execution audit.

The centrifuge source resolves a quasineutral isothermal rotating equilibrium using Boltzmann electrons and an effective potential. Its composition inputs are axis densities, not feed fractions or volume inventory. Its effective potential is not the laboratory electrostatic potential. Those distinctions must survive UI/export integration.

The cold-neutral collision source uses an isotropic elastic two-body collision with recoil and a stationary neutral bath. It is not the charge-exchange, Coulomb or empirical ion–neutral operator needed to reproduce the generic tutorial regime. At the illustrative n0≈1e14 cm^-3, tutorial §III D estimates a charge-exchange mean free path of order centimetres. A metre-scale collisionless device cannot represent those same gas conditions. “A collision slider exists” is not evidence that high-density plasma physics is represented.

The tutorial's §III G explicitly explains why bulk electric fields cannot normally be computed by copying electrode voltage into a fixed function: current closure, electron response, sheath physics, cross-field conductivity and full geometry are coupled. §III H explains why fluctuations can mix species and why a convenient Bohm coefficient is not a first-principles turbulence solution. These omissions bound every maximal-fidelity claim.

## Acceptance criteria for this expansion

- Every A–K heading and the named additional variants is visible, with a clear distinction among simulated modes, reduced diagnostics and directory-only proposals.
- Every method has advantages, drawbacks, relevant adjustable parameters and its governing approximation visible beside the output.
- Each quantitative curve identifies its observable and units. Equilibrium enrichment, RF absorption, diffusion spreading and product recovery must not share a fabricated common score.
- Live sliders recompute the model rather than move pre-authored traces. Invalid or out-of-regime parameters produce explicit applicability messages, not visually plausible silent fallbacks.
- Distinct modes have independent limiting-case benchmarks. Additive source/collision physics preserves inventory and the appropriate work/loss accounting; deterministic timestep tests are separate from stochastic ensemble convergence.
- No claim of experimental calibration, high-throughput engineering performance, comprehensive atomic data or full plasma self-consistency is made without that evidence.
- GPU appearance and deployed-control behavior require an actual permitted browser observation. Structural build tests cannot substitute for that verification.

This audit supplies coverage and model-boundary criteria. It does not approve future solver implementations, numerical checks or browser behavior that were not examined here.


---

# Independent physics audit — 2026-11-06

## Scope and verdict

Reviewed the tutorial's Section II and relevant Section III, `src/physics.ts`, `src/collisions.ts`, `src/centrifuge.ts`, their tests, and the new `src/geometries.ts` and `src/transport.ts` implementations. Traced configuration → force/equilibrium/closure → numerical step → collection → diagnostics. No browser interaction or experimental data was available to this reviewer.

The core signs, units and reduced-model equations are internally consistent. The audit found and corrected two concrete numerical defects, documented below. Independent analytic tests support limited claims about these equations; they do not validate every separator as an engineered plasma device. Do not describe the collection of reduced diagnostics as maximal physical fidelity or as reconstruction of every apparatus in Section II. A catalogue can cover all named concepts while the implementation status remains mixed.

## Corrected finding 1: absorbing steps bypassed collision resolution

**Severity:** medium for public API; high if dense/coarse runs were interpreted physically.

The old boundary branch returned before evaluating the optical-depth guard. A finite-step chord could cross the end plane and record perfect transmission even when the particle would almost certainly collide before reaching that end. Reproduction: B=V=0, dt=duration=0.0006 s, one particle per species, n=1e25 m^-3 and sigma=1e-19 m². Both species were accepted at the end with zero collisions even though n sigma L ≈ 2.8e6.

**Fix:** the optical-depth resolution invariant now runs on every proposed step before boundary routing (`src/physics.ts:208–213`). The speed estimate uses the larger initial/final speed; collision sampling otherwise retains the documented final-speed, operator-split approximation. This is a narrow domain-boundary correction, not an invented dense-plasma fallback. The regression requires the unresolved case to fail explicitly.

**Remaining limitation:** at most one collision is sampled after a full orbit step. The last fractional flight before absorption does not sample collisions. With per-step optical depth <=0.02 this is a controlled small-step approximation, not an exact event-driven Monte Carlo method. Timestep and ensemble convergence remain necessary.

## Corrected finding 2: impact energy was not validated by endpoint energy residual

**Severity:** medium for impact-energy diagnostics; the orbit's full-step energy check itself was not wrong.

The old code linearly interpolated velocities between synchronized step endpoints. Interpolating two rotated vectors shortens their length, so it spuriously removed kinetic energy even in a uniform magnetic field. Meanwhile the energy residual inspected only the full, unabsorbed step. A half-step end interception with an exact kinetic energy of 40 eV produced 39.9955309488 eV while reporting an energy residual of zero.

**Fix:** reintegrate the fractional interval with Boris and evaluate RF at that interval's temporal midpoint (`src/physics.ts:223–238`). RF work is recomputed over the same fractional numerical displacement. Added `maxRelativeImpactEnergyError`, which compares impact velocity plus the recorded boundary position against energy/work/loss accounting separately from the full-step diagnostic. This fixes the interpolation's root cause while retaining the existing crossing approximation and explicit diagnostics.

**Tests:** exact uniform-B kinetic energy at several fractional impacts; resonant RF energy gain and fractional RF-work consistency against an independent analytic solution; second-order RF timestep refinement. All three new audit regressions passed.

**Remaining limitation:** first crossings still use a straight chord and impact time derives from its fraction. Recomputed fractional-step positions need not exactly coincide with that chord point in electric/curved motion; the separate impact residual reveals this. A dense trajectory root solve would be a broader future event-location change. No claim of exact mesh or curved-orbit interception is justified.

## Existing orbit and centrifuge models

- `fields()` has E=-grad(phi) outward for phi=V(1-r²/a²). Positive-ion rotation sign and circular RF polarization are consistent with v×B. The cold cutoff is an infinite-device radial stability threshold, not a collection efficiency.
- Maxwellian source velocities recover specified component variances and drift. The source is a pulse at the plane, not a steady reservoir flux distribution; negative axial velocities immediately return to the source. Equal m/q is degenerate only for equal velocity distributions, not automatically for equal fixed energies.
- Elastic scattering conserves both-body momentum/energy with recoil and isotropic outgoing relative velocity. The model assumes a cold stationary bath, a constant cross section and no neutral heating feedback. It has no measured cross-section calibration, charge exchange or Coulomb dynamics.
- The centrifuge's effective potential psi=phi−Omega B r²/2 is consistent with radial force balance for imposed rigid rotation. Quasineutral closure and Boltzmann electron pressure are solved, including unequal ion charges. Central fractions are not the feed/inventory composition. No relaxation time or throughput is calculated.
- Near-zero numerical energy residual is necessary for some benchmarks but insufficient to validate the prescribed fields, electron response, collision rates or an actual separator. Energy conservation can hold in a physically inapplicable model.

## New geometry diagnostics

Reviewed exact gyro curves, ideal toroidal curvature/grad-B deflection, the quartic radial Hamiltonian at Ptheta=0, and the adiabatic centrifugal/mirror barrier algebra. These are consistent as reduced benchmarks with their stated input conventions.

Important qualifications that must remain visible in the UI:

- Curved guiding-center drift requires rho/R << 1 and many gyroperiods during the bend. At fixed kinetic energies the drift speed is mass-independent for equal charges; differing transit speeds create the mass-dependent net displacement. Self-generated electric fields can remove the separation (tutorial §II B).
- The double-well model chooses an illustrative quartic potential; it does not reconstruct the referenced apparatus or solve collisional redistribution.
- The mirror diagnostic accepts B and radius endpoint ratios independently. It does not reconstruct a divergence-consistent full mirror field or demonstrate the topology/current closure needed for a real MCMF.
- Azimuthal-B/radial-E trajectories use the ideal Btheta∝1/r and logarithmic potential law in an annulus. No conductor, sheath, source or calibrated collector response is solved.
- POMS is explicitly a magnetic-core surrogate, not a reconstruction of the POMS azimuthator. A divergence-free authored field is not sufficient evidence that it reproduces the experiment or proposal. This mode must not be labeled a validated POMS device simulation.
- The rotating-magnetic-field proposal and other named subvariants in the metadata do not acquire a valid solver merely by being catalogued.

## New transport/atomic diagnostics

Independent algebra review found the Drude mobility and Einstein diffusion coefficients, Maxwellian step-cross-section ionization average, and bounded-energy time-of-flight CDF/pulse convolution internally consistent.

The tutorial's Eq.8 uses D≈(1/2)rho²nu with a typical rho²=kTi/(m Omega²). This is half the full Drude/Einstein coefficient when the same numerical nu is inserted. It is an approximate random-walk/collision-frequency convention difference, not evidence of a paper error. After this cross-check, the transport author implemented the tutorial Eq.8 coefficient directly for the Coulomb-diffusion option, kept Drude for the fixed momentum-transfer option, and rejected reuse of the Coulomb convention in drag/mobility. I reviewed those final equations (`src/transport.ts:52–58,111–117,134–139`); the convention difference is now explicit. This is still not quantitative Coulomb transport calibration. The tutorial's leading heavy-mass cancellation is robust to this factor of two and should be demonstrated rather than implying that all classical diffusion sharply separates mass.

Diffusion curves describe long-time guiding-center diffusive spread; at nu=0 a zero diffusion coefficient does not mean finite-temperature ion gyro-orbits have zero spatial extent. Drude startup inertia, boundaries, sheaths and turbulent transport are absent. The density input means electron density in ionization and light-background density in the Coulomb closure; those meanings must be labeled per mode.

The ionization model needs empirical atomic rates before element-specific predictive claims. A thresholded constant cross section is a useful teaching assumption, not measured cross-section physics. Ballistic TOF uses a bounded energy packet and source pulse; extraction optics, rotating collector acceptance, space charge and collisions remain unresolved.

## Evidence executed

Under the project's scoped host-execution authorization, with no sandbox/profile/credential changes:

- `node --import tsx --test tests/audit-regressions.test.ts`: 3 passed.
- `node --import tsx --test tests/physics.test.ts tests/realism.test.ts tests/collisions.test.ts tests/centrifuge.test.ts tests/audit-regressions.test.ts`: 35 passed.
- `npm run typecheck`: passed after the physics corrections.
- `node --import tsx --test tests/transport.test.ts tests/geometries.test.ts`: 17 passed after reviewing the final geometry/transport formulas, including the explicit Eq.8 coefficient convention.
- Independent before/after reproduction of the boundary collision bypass and uniform-B impact interpolation.
- Representative default thermal orbit runs at 20 ns and 10 ns, 96 particles/species. Ar 96 end and Kr 96 wall at both steps. Maximum Kr full-step residual fell from 3.8988e-7 to 9.7470e-8; impact residual from 3.7135e-7 to 9.3229e-8. These are numerical convergence observations, not real-device purity evidence.

Parent must run the final integrated suite/build/publication checks after merging all concurrently authored modules and UI. This review does not approve GPU appearance, live controls, atomic calibration or engineering prediction.


---

# Independent UI/GPU audit

Audit scope: application source, HTML control contracts, worker interface, and installed Three.js 0.187 implementation. Managed browser policy rejected the deployed origin in this task; no browser, raw CDP, alternate browser, HTTP retrieval or screenshot workaround was attempted. This is **not** a verification of deployed controls or GPU appearance.

## Initial concrete findings

1. **Failed GPU visibility can be undone by a mode switch.** The initial `initScene()` error handler hides the canvas, but `selectMode()` unconditionally makes it visible for orbit modes. A failed context can therefore cover the static poster with an empty canvas after switching from centrifuge back to an orbit mode. Root cause: canvas visibility derives only from physics mode, not renderer readiness. The smallest fix is an explicit renderer-ready state and one visibility function using both states. A fake renderer/state regression should cover failure → chart mode → orbit mode.
2. **“Live assembly” is declared before a successful application frame.** The initial code hides the poster immediately after registering `setAnimationLoop`; the actual application render occurs later in a callback outside the initialization try/catch. Compilation/render failure may leave a blank canvas and an inaccurate live status. Render or compile and render a first application frame before hiding the poster, and catch subsequent callback failures to restore the poster. This improves failure correctness; it does not establish visual quality.
3. **The finest selectable orbit resolution has no valid half-step run under the current budget.** 0.6 ms / 5 ns = 120,000 steps, while `validate()` rejects more than 100,000. The initial UI enabled refinement after a 10 ns run, then returned an avoidable error. Disable/explain refinement when the derived request exceeds budget, or deliberately review a larger budget. Do not silently shorten the physical duration.
4. **Hidden 3D scenes continue rendering.** The original animation loop renders on every frame even when centrifuge charts hide the canvas. Chart-only modes should skip rendering. This is resource use, not a numerical physics defect.

Initial locations were `src/main.js` initialization around lines 103–121, mode visibility around lines 210–220, and refinement around lines 236–244; `src/physics.ts` compute-budget check was line 152. Root is actively editing these paths, so locations/status need final reinspection.

## Checks that did not establish a defect

- `await renderer.init()` precedes `PMREMGenerator.fromScene()`, as required by the installed renderer.
- Installed `PMREMGenerator.dispose()` disposes the generator's source target/internal materials and geometry, not the returned PMREM output target. Keeping `scene.environment=environment.texture` after disposing the generator is therefore not evidence of an invalid environment texture.
- Metals have a PMREM studio environment, plus environment intensity and explicit key/fill lighting. Exposure/roughness/appearance remain unverified without an allowed GPU/browser session.
- Worker tasks use dedicated workers that terminate after completion. UI revision checks discard stale run/comparison/refinement results. This is a sound basic contract; live slider scheduling/cancellation changes require reinspection.
- `toScene` maps solver axial z to display X and subtracts half the chamber length. The GLB is authored with axial X, so this mapping is consistent.
- Export uses a local JSON Blob with full settings/results; no backend data submission occurs in this path.
- Values inserted into the initial generated plot markup are numerical solver outputs and static strings. No demonstrated user-controlled HTML injection was found in the inspected initial paths. New catalog text should continue to use textContent or an explicit escaping function.

## Source-contract tests

`tests/ui-contract.test.ts` checks unique control identifiers, associated labels, and numeric defaults respecting declared min/max/step. These are useful source contracts, not browser interaction tests. Exact initial check:

```
node --import tsx --test tests/ui-contract.test.ts
2 passed, 0 failed
```

## Unverified requirements

Actual public-origin asset loading, GPU backend negotiation, shader compilation, hardware material appearance, orbit dragging/keyboard interaction, responsive layout and live control/plot interaction require an allowed browser surface. A successful production build or source-contract suite does not approve those requirements.

## Final source reinspection

The initial GPU-state defects are addressed in the inspected final source:

- `src/view-state.ts` derives canvas/poster/loading visibility from physics mode **and** successful renderer readiness. Failure → chart → orbit preserves the poster. Its regression tests passed.
- `initScene()` now awaits `renderer.compileAsync(scene,camera)` and performs an application render before setting `gpuReady=true`. The animation callback catches render failures and restores the poster. This is source-level failure handling, not proof of successful shader compilation on an actual deployed device.
- Chart-only modes skip the 3D render call.
- Orbit refinement checks the step budget before enabling the control and explains why the finest requested refinement is unavailable.
- The reduced-model assumptions list is replaced before rendering a repeated result, preventing duplicate notes on manual reruns.
- Field-arrow geometry returns early outside orbit modes, avoiding undefined transport-model radii producing NaN geometry.

Additional control sensitivity findings were corrected: gyro mode no longer offers an unused reference-radius slider, advection/mobility no longer offer an unused channel-length slider, and transit duration is explicitly labeled **Minimum plot horizon** rather than implying a physical interaction-time effect. Azimuthal geometry now exposes the channel length that actually bounds its orbit integration.

`requestSimulation` now owns worker termination and Promise settlement on abort/error. Main-run generation/owner checks prevent stale results and old `finally` handlers from replacing a newer run's output/state. Parallel-comparison cancellation/status was still receiving its final root pass at the time of this inspection; that path needs the root's final check before publication.

The numerical boundary is exercised by a tiny source-unit element stub: actual `setupLaboratory` → `reducedConfig` → actual geometry/transport solvers. A representative advertised slider changes a plotted numerical output in **all 12 new numerical mode IDs**. This includes the centrifugal alias using the mirror barrier solver. The harness allocates no browser, network connection or GPU context; it is not a workaround for the blocked live browser action.

Exact independent final narrow check:

```
node --import tsx --test tests/ui-contract.test.ts tests/view-state.test.ts tests/worker-client.test.ts
7 passed, 0 failed
```

No source-level security or persisted-data compatibility defect was demonstrated in these paths. Generated method prose uses textContent, and plot markup is created using SVG elements/attributes from numerical outputs. This does not replace an external security review.

## Remaining acceptance and fidelity gaps

- Live public controls, GPU backend negotiation, shader success, material appearance, responsive layout and pointer/keyboard behavior remain unverified because of the managed origin restriction. They are not approved by this audit.
- The method directory contains explicit overview-only variants. A directory entry is not a numerical implementation; the final user-facing scope must preserve that distinction.
- Numeric modes use different fidelities: exact analytic diagnostics, guiding-centre/effective-barrier reductions, prescribed-field test-particle integration, and equilibrium closure. The UI now explains boundaries but cannot honestly describe all modes as maximal-fidelity device simulations.
- The live 3D viewer has no inspected floor/contact-shadow rendering setup equivalent to the Blender still. Correct PBR inputs and environmental reflections do not establish equivalent visual realism.

