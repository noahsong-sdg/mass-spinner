# v42 geometry and scientific visual integrity audit

Audit date: 2026-11-09. Source review only in this agent; no product edits, project execution, VM operations, deployment, or independent browser operation. The exclusive live-UX agent supplied the separately attributed observations below. Read `/Users/noahs/.local/share/safe-dev/README.md`; any executable reproduction/regression gate must run in the root-coordinated safe-dev copy. No P1 found in this bounded geometry review. Five P2 findings follow; GPU/ray-picking execution remains a gate for finding 5.

## Execution path and verified boundaries

`main.js:423–431` creates apparatus viewers and sends completed-request settings/results to `surfaceState`. `surface-state.ts:243–268` compares model/config/source provenance and withholds invalid or pending state. The active contract stores solver positions in metres, axial local z (`surface-state.ts:4–5`). `surface-layer.js:140–158` builds runtime engineering hardware from that packet and places overlays in the same rigid transform. `apparatus-viewer.js:59–66` hides the Blender reference when a ready engineering assembly is available. The GLB therefore supplies the initial/reference illustration; it does not become the solved surface mesh.

Checked current source invariants, without treating their existing tests as newly executed evidence:

- Film, backing, beam-area disk and depth sections use accepted dimensions at scale 1 (`engineering-geometry.js:88–129`; `surface-state.ts:209–239`). The separate depth microscope expands only the selected material region and states its magnification (`surface-layer.js:119–130`). Thermal region bounds/contact jumps are preserved. No evidence here of a stale numerical target painted over new geometry.
- Finite-cylinder impacts are checked against their named boundaries and exported positions, whereas radial-only double-well events receive no invented 3D positions (`surface-state.ts:103–108,166–180`; `surface-layer.js:49–55`). Traces are sampled trajectories rather than density/flux, as their scope text says.
- Equilibrium fields remain radial samples; collection/throughput and axial variation are explicitly unsupported. Closed double-well population support is not assigned the unused pulse aperture (`surface-layer.js:144`; corresponding existing test is `tests/surface-viewer-v39.test.ts:112–116`). These are source observations, not convergence validation.
- The future blanket has its own reference viewer, with no accepted compact-target spatial state (`main.js:426–427`). Runtime blanket construction, if used, distinguishes its assumed FLiBe thickness from cited layer thickness (`engineering-geometry.js:144–148`). The primary [Alchemy paper, section 4.1 and Table 1](https://www.marathonfusion.com/alchemy.pdf#page=12) supports 5 mm tungsten, 10/30 mm inner/outer V alloy and 30 mm Eurofer; its geometry is a tokamak and its outer blanket dimensions are not established by a schematic cylindrical display. No material-order contradiction was found. Level 04 is recorded data rather than a fabricated apparatus (`workspace-ui.js:121–123`).

## 1. P2 — Active geometry retains a false static-GLB fidelity caption

**Trigger/evidence:** Accept the material model in Beam target, then open Concept model. `apparatus-ui.js:45–48` assigns `asset.caption` only on mode selection. `apparatus-viewer.js:64–66` subsequently substitutes true-scale runtime engineering hardware and accepted numerical overlays, without notifying provenance. `web-assets/renders/manifest.json:10` still says “Hardware only; layer thickness exaggerated.” Centrifuge/rotating/ICR/double-well captions similarly say no calculated density/field/trajectory is embedded (`manifest.json:211,391,486,581,779`). The exclusive live-UX agent verified the Beam target caption with Surfaces 0 s active and saved `v42-evidence/marathon-fidelity-caption.jpg`.

**Technical root cause:** Reference-asset metadata is bound to playground selection, while displayed-root state changes independently. **In simple terms:** the label describes the machine picture that has just been hidden.

**Minimal correction and choice:** Publish the active representation to the existing provenance control. Reference, accepted engineering state, and pending/reference state need accurate short descriptions; preserve a separate statement that source/electrodes/fittings and optical materials are illustrative. Updating this one existing control is preferable to adding more caveat panels or changing the correctly dispatched machine. Do not solve this by describing all geometry as exaggerated, because accepted film/backing geometry is deliberately true scale.

**Validation gate:** DOM/lifecycle regression through GLB → accepted film field → hardware-only → pending/reference, checking that the active caption correctly describes scale and numerical-overlay status at each step. Reopen the live disclosure after the gate passes.

## 2. P2 — Picking a detailed beamline part loses its specific material/geometry metadata in Inspect

**Trigger/evidence:** Click a runtime extraction electrode in accepted Beam target. The selected mesh carries `materialBasis` and `geometryBasis` (`engineering-geometry.js:53–56,105–109`); `apparatus-ui.js:19–25` receives those values and writes the named part to its local readout. But `workspace-ui.js:115` moves only the toolbar and the *separate generic* `#fusion-inspector` into Inspect, leaving `#fusion-apparatus .component-description` inside the scene figure. The callback in `main.js:425` selects the generic component catalog first. The stage frame is absolute and fills its clipped parent (`workspace.css:17–18`). The live-UX agent clicked an extraction electrode and observed generic “Electrostatic acceleration gap”/publicly unspecified alloy text in Inspect; AX contained the separate “Extraction electrode”/assumed-copper record, but the specific record was not visibly available. Screenshot: `v42-evidence/marathon-picked-part-metadata.jpg` (file existence checked).

**Technical root cause:** Semantic component selection and mesh-detail inspection update two different readout owners, and only the generic owner is moved into the visible panel. **In simple terms:** the click knows which piece was selected, but the panel shows the broader category.

**Minimal correction and choice:** Route clicked part name, illustrative material basis and geometry basis into the one visible fusion Inspector; keep dropdown selection usable when no particular mesh was clicked. Consolidating the result at the existing inspector boundary is preferable to exposing a second scene readout or guessing real alloys from render finishes. Continue to distinguish an assumed copper appearance from a verified proprietary electrode alloy.

**Validation gate:** Integration regression using the actual setupApparatus → fusion select callback → workspace relocation path: click an extraction electrode and a cooling fitting, then assert one visible inspector presents their correct specific names/bases while retaining the published architecture purpose. Check dropdown and keyboard selection afterward. Reopen both live selections.

## 3. P2 — Accepting numerical geometry changes projected machine orientation through camera roll

**Independent source derivation:** `surface-layer.js:63–64` rotates local z onto world x. `apparatus-viewer.js:77` transforms local inspection direction `(0,1,-0.2)` into approximately `(-0.196,0.981,0)` while `PerspectiveCamera` retains default world-Y up (`apparatus-viewer.js:48`). Consequently the projected axial world-x direction aligns mostly with screen vertical. Reference GLBs use another direction from their manifest cameras. This independently supports the earlier rendering investigation; it is not evidence of a beam-target/blanket dispatch error. The live-UX agent observed the same selected Beam target transition from horizontal GLB to tall vertical accepted assembly.

**Technical root cause:** The inspection direction transforms with hardware, but the camera up/reference orientation does not. **In simple terms:** accepting results rolls the view instead of preserving the familiar machine orientation.

**Minimal correction and choice:** Define a consistent camera frame for reference/runtime geometry while preserving the local +y cutaway sightline. Account for OrbitControls caching its up-axis transform at construction. Fixing the camera frame is preferable to replacing the correct runtime beamline, changing physics dispatch, or scaling thin films to hide the change.

**Validation gate:** Project source→target/local axial direction before and after accepting state and assert the intended consistent screen orientation, using real OrbitControls or an adapter that models its up-axis behavior. Live gate must include the cutaway, target/microscope visibility, reset and orbit rotation at desktop/mobile sizes.

## 4. P2 — Resizing the available scene changes field of view without refitting its camera distance

**Trigger/evidence:** Reset at a wide layout, then narrow the viewport or open/widen dock panels without manually resetting again. `apparatus-viewer.js:68–70` updates only aspect/projection; distance fitting exists only in `reset` at lines 78–82. Panels alter `.world-stage` reserves (`workspace.css:15`; layout controller), so this is an ordinary in-app trigger. The live-UX agent observed the *same* accepted Beam target at about 563 px high after 1440→390 resize versus about 283 px after narrow-layout Reset, with no numerical input change. Evidence: `v42-evidence/marathon-fit-narrow-before-reset.jpg`, `marathon-fit-narrow-after-reset.jpg`, and `marathon-fit-wide.jpg`. It also observed a horizontal reference GLB clipped when multiple panels narrowed the stage. No clipping is claimed for the vertical accepted case in that observation.

**Technical root cause:** The camera fitting invariant depends on min(horizontal FOV, vertical FOV), but resize invalidates that invariant while preserving the old distance. **In simple terms:** the viewing window gets narrower while the camera stays at its old zoom.

**Minimal correction and choice:** Preserve user orbit direction/target and adjust fit distance when the available aspect shrinks, with an explicit policy for a user-focused/zoomed view. Avoid blindly calling full reset on each resize, which would discard user rotation and component focus; avoid merely clipping the scene behind controls.

**Validation gate:** CPU projection regression wide → panel-narrow → portrait for a horizontal reference and runtime assembly. Check projected visible bounds after the resize itself, before pressing Reset, and verify that field/time refresh still preserves the user's camera. Live-check each layout transition.

## 5. P2 — Impacts drawn through hardware can be intercepted by hardware when clicked

**Source-confirmed conflicting policies:** Impact dots are rendered with `depthTest:false` (`surface-layer.js:49–55`), making rear/occluded impacts visible over foreground hardware. Pointer picking instead takes the first nearest visible intersection of hardware plus overlay (`apparatus-viewer.js:127–134`) and only then asks `stateLayer.pick`. A nearer vessel/source/flange hit therefore wins before the visibly superimposed impact; the screen-space point filter only rejects off-pixel point hits, it does not reprioritize a visible point. There is no event dropdown equivalent to the field-sample selector (`surface-layer.js:66,111,159–165`).

**Technical root cause:** Raster visibility and interaction ordering use different depth policies. **In simple terms:** a dot can look on top of the wall, but clicking it selects the wall. This audit did not execute a synthetic ray probe or establish the frequency of this case in a particular current run; that is the remaining gate.

**Minimal correction and choice:** Apply one explicit policy consistently: if impacts intentionally remain visible through hardware, prioritize screen-space point hits in the active impacts layer before solid hardware, using the existing pixel threshold and a deterministic rule for overlapping points. This preserves the intended display and fixes the interaction boundary. Turning all component picking off or adding an unbounded metre-scale tolerance would create unrelated behavior changes. A keyboard-accessible event selector can separately satisfy parity if required.

**Validation gate:** Root-coordinated safe-dev viewer/ray regression with an accepted positioned event behind a known opaque mesh, another event outside the 4 px threshold, a foreground event, and overlapping events. Assert a click on the visible dot opens its exact species/destination/time/position, while a click away from dots still selects hardware. Confirm through a live orbit/pick after CPU checks.

## Evidence limits and exact reviewed source

No tests/build/typecheck ran in this agent. Existing tests reviewed: `tests/engineering-geometry.test.ts`, `tests/surface-state.test.ts`, `tests/surface-independent-v39.test.ts`, `tests/surface-viewer-v39.test.ts`, and viewer/UI tests. They cover SI bounds, source apertures, layer thickness/contact, exact sample selection, lifecycle withholding and CPU mocked rendering; they do not establish current browser/GPU behavior or the interaction gaps above. Root must run required final gates for any eventual implementation, after syncing its exact source snapshot. No security or persisted-data migration issue was found in these paths.

Read-only SHA-256 snapshot (not a Git checkout; `git status` returned “not a git repository”):

| Source | SHA-256 |
| --- | --- |
| `src/apparatus-ui.js` | `c1dbd708ccbb9c6960acd026796004eccaa68c213ffb86165689a499a6ef7ba4` |
| `src/apparatus-viewer.js` | `b0f21ae644fe5a315f23108790ec02d40ced226a10672474bf53e29d38f1a557` |
| `src/engineering-geometry.js` | `fcbb541f29b7c3a47ce972d7fd820275f240062107c25099f3a6aa0a8c13f442` |
| `src/surface-state.ts` | `c60d505f45ea0020b4471badb3578057b2d655d3fa4aae62d4f47d3b6c9800da` |
| `src/surface-layer.js` | `f749641608496c63aaf7b21984347b0f333fa088c0fc9ad891067082e6e1153f` |
| `src/workspace-ui.js` | `61483e4fd35647a468a5a4d9de331872cecb0d3fd206dd8483b86c2b14841ddb` |
| `web-assets/renders/manifest.json` | `70f6fd42bf2d1f1e111d43c0cf83fea8ba0e0f3adab32e2a95917ecd8e22d1b0` |
