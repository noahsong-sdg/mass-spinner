# What to build next in Mass Spinner

Evaluation date: 2026-11-09. Planning only; no application changes or new numerical qualification.

## Recommendation

Make the centrifuge an operating experiment with memory, and make its physical state easier to see. Then introduce a coupled thermal model. More exterior detail, additional menus, or a new solver language would not address the strongest observed gaps.

Four independent reviews covered product direction, physics, rendering, and ergonomics. Product and physics ranked state-continuous operation first; rendering and ergonomics ranked visibility of the existing physical state first. These are complementary, but they should remain two reviewable changes rather than one large rewrite.

The desired interaction is: power up, see ions lead neutrals, watch separation develop, cut power, watch the gas coast and the distribution relax, then restart without discarding the existing state. No lessons or prescribed completion sequence are needed.

## Evidence checked

- Current centrifuge UI, transport stepper, reference physics, motion rendering, diagnostic section, inspection, comparison, camera, and playground navigation paths.
- Latest render50 desktop, mobile, component-inspection, and comparison captures, plus the v50 verification documentation.
- Parent reopened the deployed centrifuge and inspected its current presentation without manipulating controls. This was a presentation observation, not a new end-to-end controls test.
- No project scripts, tests, builds, or scientific studies were run for this evaluation. Previously recorded passes do not establish the proposed functionality.

The existing simulator already has component controls, exact numeric input, movable playback, cutaway/explode, synchronized A/B comparisons, an operating map, quantitative sections, and plot-to-3D navigation. Those are not missing features.

## 1. Operate the machine over time

**Verified problem.** Current sliders generate replacement scenarios from rest. In `src/fuel-centrifuge-ui.js`, `changed()` disables animation and schedules `run()`, which requests a new config-only trajectory. Geometry replacement then retains/clamps the old elapsed cursor. A zero-current replacement viewed at an old time is not a coastdown experiment.

**Technical cause.** The UI owns configurations and precomputed trajectories, not a sequence of interventions on one evolving state. The transport backend already advances species distributions and two angular momenta through `advanceFuelCoupledStep` in `src/fuel-transport.ts`, so this does not initially require a different solver.

**Simple explanation.** A knob currently asks, “What if we had started with this setting?” It cannot yet ask, “What happens if I change this now?”

**Smallest coherent implementation.** Allow current steps during an existing run, with a power switch on the discharge supply, recorded event times, and one shared history. Keep geometry, magnetic field, inventory, and temperature fixed within that first operating run. Preserve setup changes as explicit new experiments. Connect controls to the supply/electrodes; do not imply that the separate magnetic coil is the discharge current source.

The existing reduced mechanics are of the form

\[
\dot L_i=\tau(t)-\Gamma(\Omega_i-\Omega_n),\qquad
\dot L_n=\Gamma(\Omega_i-\Omega_n)-\nu_dL_n,
\qquad \Omega_s=L_s/I_s.
\]

The neutral inertia follows the evolving distribution. Preserve the accepted species distributions and both angular momenta at an event. Integrate the event-dependent drive work and external impulse; do not silently reset them.

**Why first.** It creates a qualitatively new experiment with the existing model: lag, coastdown, memory, and reversal of slip become observable. Adding presets would only provide more independent starts. Defer live changes to B: induced electric fields and coil energy are outside the present model.

**Acceptance gates.** Constant-current histories reproduce the current solver; state is continuous at current steps; zero external torque and drag conserve total angular momentum; species remain positive with conserved inventories; event/timestep refinement converges; physical and numerical energy losses are distinguished. Replay and seek must be deterministic, obsolete worker replies must not replace newer history, and existing config-only links must remain compatible. Verify actual desktop/mobile power, scrub, restart, and setup-change behavior.

## 2. Show the separation clearly

**Verified problem.** Hardware dominates the scene. Default transport replaces point motion with a full circle for every tracer (`src/fuel-motion.js:89–103`), producing dense circumferential lines. This is an intentional average over fast rotation, but it is difficult to interpret. The saved narrow-phone capture gives the horizontal apparatus only a small fraction of the available height.

**Fix.** Make a clean density/composition cutaway the default scientific presentation, with subdued hardware and sparse motion cues. Reuse accepted finite-volume species masses to construct a radial density layer. Keep its axial uniformity consistent with the model. A labelled change-from-start view can reveal small enrichment without silently rescaling every frame.

Use the same quantitative scale across time and pinned comparisons. The layer is a scientific diagnostic, not a prediction of optical plasma emission. Start with bounded shells or a modest shader, then measure transparent overdraw on mobile. A portrait-specific oblique/end-on camera should show a larger interior while preserving user camera adjustments.

Selection should put the component name, valid control, and one relevant response before collapsed material/construction details. Reuse the current instrument rail. Improve existing A/B by displaying the selected observable's difference, rather than requiring users to spot a tiny change between two complete steel assemblies.

**Why this approach.** It reveals state already computed instead of inventing dramatic particle motion or adding another mode hierarchy. Preserve the averaged view where rotation is unresolved.

**Next extension.** A direct action on the gas can open a short rotation-time inspection using accepted phases and angular speeds. Both species must share one physical clock. An explicitly identified co-rotating frame is useful; arbitrary independent slow-spin speeds are not. If the slowly evolving density is frozen during this inspection, quantify and identify that approximation. This is optional after the first operating release, not another permanently visible playback panel.

**Acceptance gates.** Density integrates to the accepted species inventories; zero drive/uniform initialization creates no artificial enrichment; slice, volume, and plot agree at matched radius/time; fixed scales survive A/B and seeking; view changes never recompute physics. Rotation inspection must preserve phase differences and sampling limits. Check real GPU output, frame time, reduced motion, touch targets, and portrait framing.

## 3. Let heating compete with separation

**Verified limitation.** Gas temperature is prescribed. The model reports drive/slip/drag loads and cooling requirements but does not evolve a gas/wall thermal state. Equilibrium separation depends strongly on

\[
\beta_s=\frac{m_s\Omega_n^2a^2}{2k_BT}.
\]

**New experiment.** Increase drive or reduce cooling and watch rotation, temperature, and enrichment respond together. Stronger rotation can help separation while its associated heating works against it. The size and outcome of that competition must come from the coupled model, not a prewritten failure threshold.

**Implementation boundary.** Derive an energy closure, then introduce gas and liner thermal reservoirs with justified heat capacities, cooling, and power deposition. Hold particle inventory fixed for a closed system and evolve pressure; reusing the initial pV/kT inventory calculation at each new temperature would change mass inadvertently. Do not automatically treat redistribution work or backward-Euler dissipation as physical heat.

**Why later.** This adds constitutive physics and requires a defensible first-law ledger. A red temperature overlay driven by power alone would look convincing without representing a thermal solution.

**Acceptance gates.** Positive temperatures, independently reconstructed total-energy accounting, analytic cooldown limits, convergence under timestep refinement, and the old isothermal solution in the strong-cooling limit. Keep physical heat distinct from numerical dissipation and identify uncalibrated transport coefficients.

## Across the other playgrounds

- **Intro:** retain a large, readable orbit experiment. Use the same select-object → adjust-valid-control → inspect-consequence pattern, with optional contextual transfer of compatible ion/field inputs into Models.
- **Models:** make mechanism differences and validity boundaries directly comparable using existing trajectories and diagnostics. Do not pretend equilibrium calculations support live state interventions.
- **Research replay:** make retained distributions and qualification failures accessible through the same timeline, while keeping recorded evidence distinct from live prediction. More moment curves alone would conceal distribution-level disagreements.

These are improvements to continuity and existing tools, not a proposal for additional playgrounds.

## Defer

- More bolts, glow, thousands of trails, or external service hardware until the process is readable.
- More permanent panels, lesson flows, and redundant presets.
- A framework/language migration without a measured bottleneck.
- Live geometry/temperature/field changes without their work, inventory, and electromagnetic accounting.
- Actual extraction/refill until boundary species, angular-momentum, and enthalpy fluxes are modeled. The current cut is an inventory diagnostic, not a solved product stream. Resolve the independent-species diffusion/barycentric-flux closure before claiming a coupled flowing mixture.
- Growing lithium deposits as decoration. Gas-wall transfer needs an evolving wall inventory, thermal coupling, and justified kinetic data.

## Decision

First release: current-only stateful operation with a compact supply control and recorded history. Second: a readable default gas field, portrait framing, and clearer existing comparison/inspection. Third: coupled thermal feedback. This sequence turns the simulator into something that can be operated and interrogated before adding deeper predictive claims.
