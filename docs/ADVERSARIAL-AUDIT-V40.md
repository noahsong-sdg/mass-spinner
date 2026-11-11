# Mass Spinner adversarial audit

9 November 2026. Four independent reviewers examined physics/result contracts, geometry/picking, interface integration and release provenance. Root reproduced the principal defects inside the preserved safe-dev environment. This is an audit; application source, scientific gates and deployment were not changed.

The current work does not pass end-to-end acceptance. Six actionable findings follow. No new numerical arithmetic defect was established in the reviewed solvers; that bounded result does not qualify their physical approximations.

## Findings, ordered by impact

### 1. P1: the basic playground's component inspector is empty

**Problem:** clicking a component in level 1 opens Inspect without its description; the component selector, reset and focus controls are also unavailable.

**Technical cause:** `src/experience-ui.js:38` now defaults level 1 to the apparatus render. `src/workspace-ui.js:110` moves that render's description and toolbar into a group eligible only for level 3. `src/main.js:96` hides the alternate separator inspector in render mode. The useful content is generated but hidden by an ancestor.

**Simple cause:** the new basic view uses controls that the workspace still treats as advanced-only.

**Recommended fix and choice:** allow the existing model-inspection group in levels 1 and 3, preserving the same nodes and handlers. Test actual component selection at both levels. This is smaller and safer than creating a second inspector or changing the basic view back to an older renderer. The production workspace witness confirmed the populated description is hidden after selection.

### 2. P2: trajectories swallow clicks far from the pointer

**Problem:** with trajectories shown, a hardware click can do nothing; hiding the trajectories makes the same click select the vessel.

**Technical cause:** `src/apparatus-viewer.js:125` accepts the first visible ray intersection. Three's line tolerance remains one world metre, while the geometry uses SI metres. `src/surface-layer.js:43–46` creates lines without an inspection action. The point-specific pixel check does not constrain lines.

**Simple cause:** an invisible picking region around a thin trajectory intercepts a click intended for hardware.

**Recommended fix and choice:** exclude non-actionable trajectory lines from component picking. If trajectory inspection is implemented, give it an explicit action and a pixel-based hit test. Merely shrinking a fixed metre tolerance remains scale-dependent. The actual viewer pointer handler reproduced this with an interior trajectory more than 40 pixels from the pointer.

### 3. P2: the default camera hides central numerical surfaces

**Problem:** central radial field samples are behind opaque hardware in the tested default camera orientation.

**Technical cause:** `src/apparatus-viewer.js:75` uses a world-space SI camera direction which, after the assembly rotation, falls outside the removed wall quadrant defined by `src/engineering-geometry.js:58`. Camera fitting checks bounds, not interior visibility.

**Simple cause:** the camera looks at the closed side of the cutaway.

**Recommended fix and choice:** define the camera direction relative to the cutaway in assembly coordinates, then apply the same scene transform. Add visibility rays for representative interior samples. This preserves opaque materials and physical scale instead of making all hardware transparent. All three tested central sample rays hit the pressure wall before the field. This proves CPU geometric occlusion, not deployed GPU appearance.

### 4. P2: the 3D neutron rate loses its reaction identity

**Problem:** Marathon's 3D ledger calls D–T-only production a generic neutron rate. In a D-rich, zero-T case it displays generic zero even though D–D production is omitted from the calculation.

**Technical cause:** `src/surface-state.ts:232–236` drops the solver's `reactionOutput: DT_ONLY_OUTPUT`; `src/surface-layer.js:136–138` derives a generic label from `neutron-rate`. The surface's own Model info also loses the omitted-reaction caveat.

**Simple cause:** the copied number kept its value but lost the name of the reaction it describes.

**Recommended fix and choice:** carry the existing D–T label and omitted-reaction metadata through the surface contract and inspector. Reuse the solver's authoritative scope; do not invent a D–D model or rely on a warning elsewhere. A real zero-T coupled-target calculation and actual surface layer reproduced the loss.

### 5. P2: component-to-control shortcuts disappear

**Problem:** rendered separator descriptions do not receive Parameters/Results buttons, including in level 3 where the description is visible.

**Technical cause:** workspace reparenting moves the description outside `#model-apparatus`, but `src/main.js:79` still queries `#model-apparatus .component-description`. `appendComponentActions` silently returns for that null target.

**Simple cause:** the handler looks for the description where it used to be.

**Recommended fix and choice:** expose and retain the actual description reference through the apparatus API. Exercise the real inspection callback after workspace construction and verify each action's destination. A stable reference respects ownership better than another document-wide selector or duplicate readout. The current production selector was reproduced as null.

### 6. P2: the published coverage matrix describes an older Marathon model

**Problem:** `web-assets/CORE-COVERAGE.md:10–12`, linked from the UI, still says bulk heating, fixed stopping and no resolved diffusion or renewal. Current 02 runs the coupled depth model with temperature-dependent diffusion/release, renewal and recomputed stopping.

**Technical cause:** the static coverage map was not updated when the earlier models moved into References.

**Simple cause:** the help page describes the previous simulator.

**Recommended fix and choice:** update the authoritative coverage rows to distinguish the live conditional model from recorded and legacy references, retaining calibration limits. Add a content check. This fixes the information source without adding banners or more text to the playground.

## Lower-priority observation

The field overlay is now batched, but `src/surface-layer.js:86` still checks `mesh.userData.sampleIndex` to highlight the selected sample. The index lives in a vertex attribute, so all cells dim together and the selected cell has no distinct highlight. Numeric selection/readout still works. This is a source-confirmed interaction gap, not a demonstrated numerical error; it was not independently exercised in the diagnostic batch.

## Verification and exact scope

All fresh project execution used `safe-dev -C /tmp/mass-spinner-marathon-v35-final run -- …`, with working directory `/work/home/surface-v39-final-checked-source` inside the preserved guest. The source was not replaced or synchronized over valuable guest artifacts. Only new audit witness files were copied in; application files were unchanged.

- `./node_modules/.bin/tsx --test tests/surface-viewer-v39.test.ts tests/surface-independent-v39.test.ts tests/engineering-geometry.test.ts tests/surface-state.test.ts`: **38 passed**, zero failures/skips; 1.564 seconds reported test duration.
- `npm test`: **821 passed**, zero failures/skips/cancellations; 21.578 seconds reported test duration.
- `./node_modules/.bin/tsx --test docs/reviews/v40-scene-repro.test.ts audit-tests/v40-interface-repro.test.ts audit-tests/v40-physics-repro.test.ts`: **5 diagnostic witnesses passed**, exit zero; 0.729 seconds. These assert the defects are present. They are not desired-behavior acceptance tests and are outside the normal test glob.
- Fresh trusted-host hashes: **148 release files** exactly match the release manifest; **476 available canonical inputs** match the 478-entry tested-source manifest. The other two entries are stage-only gate runners. All application, test, script and Blender source files are covered.

The reviewed source aggregate is `93ac8c83f541bc95ef3514c2ec3eda0def918ab555d24327b7a1f7902c359efd`; release aggregate is `36f2fb3920ff74f09b62f3ddcd12c066ad71d44a5b934f5cf35288686df3aae0`. Witness SHA256 identities:

| Witness | SHA256 |
|---|---|
| Scene, final two cases | `818a872a159722a322ab7ea99ae4cde76ab979e96572161111de03ade2e8d0ef` |
| Interface | `ad9369e551e2d85289ed37f42cdac2e02651192d48b4aaf54b80d47e7d3a38f6` |
| Physics scope | `ab881855e09d831508d8f3d7a2c8e3e7b49df8893b2ee522149cc7bf6efd84d8` |

Historical v39 logs also record successful typecheck, build, site and asset checks. Those four commands were inspected, not rerun in this audit because production inputs were unchanged. No live site or fresh provider rollout check was performed.

## Scientific and browser acceptance still open

The saved public collision study is explicitly **unqualified**: 59/60 collisional runs exceed unresolved-exposure budget, 28/60 exceed raw angular-error budget, and 265 comparisons remain UNKNOWN. Current classification preserves these facts. No new collision campaign or experimental validation was run in this audit.

Marathon remains a conditional scenario model with uncalibrated LiT coefficients and retention assumptions. The 3D construction is illustrative engineering geometry, not measured device CAD. No new arithmetic defect was established in the reviewed orbit, equilibrium, density-normalization or coupled-target paths; this is not a universal correctness proof.

Live deployed WebGL/GPU, mobile touch/layout and resource loading remain unverified. The explicit managed-origin browser denial prohibits alternate browser/CDP/headless/origin-fetch workarounds, and none was attempted. CPU rays and offline Blender renders cannot close this gate.

## Review split

Address the workspace eligibility/reference defects first, then picking/camera visibility, then scientific labels/current coverage. Give each fix a desired-behavior regression that fails on the current implementation. Keep numerical-model qualification as a separate scientific workstream. Do not describe the interface as end-to-end validated until the real deployed browser acceptance matrix has passed.

Independent reports: [interface](reviews/v40-interface.md), [scene](reviews/v40-scene.md), [physics](reviews/v40-physics.md), [provenance](reviews/v40-provenance.md).

Subsequent disposition: [v41 fixes and checked evidence](AUDIT-FIXES-V41.md) resolve the six actionable findings and selection highlight. The audit above is retained as the original failure record; scientific qualification and deployed browser acceptance remain separate open gates.
