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
