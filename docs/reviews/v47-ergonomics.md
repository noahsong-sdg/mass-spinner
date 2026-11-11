# V47 independent ergonomics and requirements audit

Status: source-level integration review in progress. This is not deployed-browser, screen-reader, GPU, or performance evidence. The root agent owns live verification and isolated test execution. No project code was executed for this review.

Reviewed baseline paths: `fuel-centrifuge-ui.js` → accepted worker reply → `buildFuelCentrifugeGeometry`/gas-motion adapter → `apparatus-viewer.js`; `workspace-ui.js` panel movement and focus; `workspace.css`; `laboratory.js:renderPlots`; `docs/GAS-MOTION-V46.md`. Review scope is the seven centrifuge interaction enhancements, not requalification of the unrelated collision backend.

## Early integration findings

These are demonstrated baseline constraints and release requirements for the incoming integration; they are not claims that an unimplemented feature has failed.

| Priority | Evidence and root cause | Required integration |
| --- | --- | --- |
| P1 | `apparatus-viewer.js:load` resets the camera after a new geometry loads. Ordinary slider changes rebuild the accepted geometry in `fuel-centrifuge-ui.js:showGeometry`. A pinned comparison would therefore lose shared framing unless integration changes this path. Simply, each result currently points the camera home. | Preserve the live camera across accepted recomputations and coordinate A/B changes without recursive change events. Explicit Reset remains intentional. Recheck panel-resize framing and a geometry-radius change. |
| P1 | `laboratory.js:renderPlots` calls `replaceChildren`, disconnects observers, and recreates keyboard inspection/readouts on every call. Using that function at playback frequency loses focused SVGs and the selected keyboard sample. | Keep timeline cursor updates local. Rebuild plots on accepted data/topic/domain changes, not each animation frame. Do not announce continuous animation through the polite plot readout. |
| P1 | Controls, Inspect and View share the left panel group in `workspace-ui.js:open`; mobile permits one panel total. Component selection currently opens Inspect. Opening Controls immediately afterwards replaces Inspect and may move focus twice. | Use the existing `focusRelated('controls', selector)` path after a deliberate contextual action. Select/highlight should not silently yank a keyboard user between panels. Keep the component name and a visible control shortcut together. |
| P1 | The current axial closure is uniform; packets are external schematic throughput, and equilibrium inventory cuts are not solved outlet purity. A movable slice, time cursor, or drag handle can visually suggest unsupported axial/local transport. | Name the sampled quantity with units, expose the closure in Model info/Inspect, and retain a concise visible reference tag where necessary. Slice motion must not manufacture axial variation. Product-cut control changes the inventory diagnostic, not an asserted outlet flow solver. |
| P1 | The native `output` clock is continuously updated in `animateGas`; native output commonly carries status semantics. Plot readout explicitly uses polite live announcements. | Set continuous clock live announcements off. Preserve readable physical time and keyboard scrubber values; deliberate selection may announce once. Screen-reader behavior still requires verification. |
| P2 | Centrifuge is excluded from the View window allowlist (`workspace-ui.js:refresh`), and View also depends on legacy `.viewport-tools` visibility. Merely constructing new tools does not make them reachable. | Register centrifuge-specific View content and availability coherently. Verify context switching does not leave unavailable buttons/focus behind. |
| P2 | `fuel-motion` is a wrapping overlay with playback, mode, legend and two-line clock; the baseline 320–390 px layout already needs wrapping. | Put view/layer/staging and operating-map controls behind a dock tab, not into this overlay. On phones keep playback/scrubbing usable without covering the reactor and do not hide essential comparison reset/unpin actions. |
| P2 | Canvas picks currently permit a click only below a 5 px drag threshold and OrbitControls handles drags. New drag handles share the same pointer stream. | Prioritize the handle, capture its pointer, suspend orbit only during its active gesture, and restore it on pointerup/cancel/lost capture. Offer a named numeric/range equivalent. Escape should cancel the gesture rather than unexpectedly close a panel. |

## Acceptance matrix for the first seven

1. **Movable diagnostic slice:** physical position control, visible location in 3D, correct supported domain and units; density/composition/speed labels are distinct. Slice endpoints and equal-mass/zero-drive limits are finite. Axially uniform model does not acquire fabricated axial gradients. Position is accessible without a pointer.
2. **Component controls and collection drag:** body click identifies the actual component/material; a deliberate shortcut opens the existing controlling slider. Drag and keyboard input agree exactly, including cut 0/1 and hidden-product states. Drags do not also orbit; ordinary hardware selection and mobile orbit remain functional.
3. **Pinned comparison:** freeze accepted inputs/result/provenance together; pending controls cannot relabel the pin. A/B share physical time, camera framing, color normalization, and plot axes. Missing/incompatible series are explicit rather than silently compared. Unpin/dispose releases geometry, listeners and animation work.
4. **Shared timeline:** scene motion, transient slice and applicable plot cursor agree on physical seconds. Time-domain plots respond to the same cursor; static reference curves are not misleadingly presented as a time solution. Pause/scrub/restart work without worker reruns; update/rejection/context switch cannot mix accepted snapshots. Reduced-motion and hidden-tab handling remain intact.
5. **Transient radial closure:** neutral density/composition evolves from an explicitly defined initial condition using the accepted radial solution; ions retain their actual modeled meaning. Equilibrium reference remains visually distinguishable from a finite-time state. No claim of fully coupled neutral backreaction, resolved axial flow or outlet recovery.
6. **Operating map:** axes and selected cell have units; keyboard and touch can select the same settings as desktop pointer. Map colors have a readable legend and shared normalization. CIV and timescale ratios are diagnostics, not proven stability boundaries. Applying a cell updates the canonical sliders and worker; hover alone must not rerun the model. Current pending/accepted selection is distinguishable.
7. **Ghost/cutaway/explode:** staging changes presentation only and preserves physical geometry state used in the solver. Keep material identity, cut plane orientation and reference location clear. Hidden/ghosted apparatus must not intercept picks incorrectly; do not put all exploded components in an apparent solved flow field. Reset must restore a coherent normal view.

## Required root-only live checks

- Desktop: actual GPU visibility, component picks/material descriptions, keyboard controls, drag-vs-orbit arbitration, slice endpoints, pause/scrub scene/plot consistency, accepted-result provenance, A/B camera sync and color/axis equality, pending/failing reply, map application, unpin and repeated context switches.
- Phone 390×844 and 320×740: no horizontal overflow; usable stage after opening/closing each tab; reachable map/comparison/slice controls; one-panel focus behavior; no overlay collisions with dock/chooser; pinch/orbit and cut drag remain distinct.
- Keyboard: named controls, visible focus, panel Escape/restore, slice/cut alternatives, map cell selection, SVG inspection survives playback, no focus loss on accepted rebuild. Test reduced-motion enabled initially and changed while active.
- Scientific visual controls: zero current, zero torque, equal mass, minority species, changed radius, cut zero/full, pump vs separation, non-lithium vs lithium, transient start/end, extreme timescale ratios. These are representation checks and do not replace numerical convergence studies.

## What already works well in the source

The workspace moves canonical controls rather than cloning them, preserves disclosure and focus through `focusRelated`, labels panel buttons, and restores focus on dismissal. Accepted worker replies are revision/abort guarded and exports retain producing-code identity. Tracer geometry cannot steal hardware picks. Reduced-motion, inactive and hidden-tab paths are already considered. These contracts should be reused rather than rebuilt in parallel.

## Verification record

Source read only at the initial pass. No approval or deployed verification claimed. Numerical checks, build/typecheck and live deployment observations belong to the root release record and must identify the tested source snapshot.

## Incoming-module adversarial pass

Source reviewed while implementation was ongoing; exact line locations may move before the final receipt.

- **P1, zero-speed comparison domain mismatch:** `fuel-experiments.ts:comparisonDomain` deliberately returns `[0,0]` when both cases have zero neutral speed. `fuel-scene-tools.js:setDomains` initially rejected `hi <= lo`. Reproduce by pinning a zero-current case, comparing another zero-current case, and applying shared speed domains to the two slice adapters. The helper contract throws before rendering. Required fix is a shared constant-domain policy that retains a physically zero legend and uses one finite color, rather than displaying an invented positive speed range. Reported to root and both module owners; final resolution and regression pending.
- **P2, pin outside transient horizon:** `pinFuelExperiment` only accepts `timeS <= durationS`; baseline Equilibrium and Flow playback are not capped by that duration. Reproduce by running Flow until the physical clock exceeds the selected duration, then pinning with that clock. UI integration must choose an explicit, consistent time-domain behavior; otherwise a normal Pin action throws. Root notified. This is an integration risk until the caller is implemented, not an observed UI failure.
- **P2, collection-handle hit size:** the incoming collection torus is constructed with radius 1 and tube `R × .006`, then scaled in x/y by `cutFraction × R`. Its radial tube width therefore scales approximately as `R² × cutFraction`, becoming very thin at the default small physical radius and near zero cut. Numeric/range controls are required regardless. Owner notified to inspect physical geometry and root to verify actual mouse/touch targeting; visibility is not established from source alone.
- **P1, drag lifecycle and multiple pointers:** the first viewer draft used a boolean drag state. Any second pointer could move/end the gesture; pointer cancellation called the commit-like `end` phase; Escape and lost pointer capture did not end the active gesture. Required invariant is one captured active pointer, explicit cancel/commit phases, prior-value restoration on cancellation and OrbitControls recovery on every exit. Root notified; integration still in progress.
- **P2, highlighted shell ignores new staging:** `viewer.select` clones the active shell material for highlighting, while `setStaging` changes its separately retained originals. Select Vessel, then change Cutaway/Ghost: the visible highlight can retain stale clipping/opacity. Root notified to clear/rebuild highlights around staging or update the actual active material. This is a shared execution-path issue, not a cosmetic preference.

Confirmed source corrections in the next incoming scene-tools revision: constant `[0,0]` domains now produce a finite single color while retaining a true zero legend; the collection torus now uses native physical radius R before dimensionless cut scaling. These corrections are source-observed only; root owns their regression/GPU execution evidence.

### UI integration pass

Reported while the root was actively editing; resolution must be checked against the final source receipt.

| Severity | Reproducible case / root cause | Required fix and verification |
| --- | --- | --- |
| P1 | First `showGeometry` initially captured the new viewer's default zero-distance camera before loading, then restored it after a valid fit. | Preserve pose only after an earlier accepted geometry existed. Root has source-corrected this to test `tools` before saving pose. Verify actual first load and later slider camera retention. |
| P1 | Pinned A=.03 A, current B=.06 A; select Spin-up and speed slice. The first `diagnosticState(pinned.result)` called current `motion.update`, so A's slice used B's speed. | Root changed this to result-owned `rotorResponse`. Add A/B slice-vs-particle numerical regression. |
| P1 | Select Separation plot, which is the first/default topic. Initially no matching `draw` branch existed and the plot was blank. | Supply the actual transient collection-vs-time curves and bounded metrics; root notified. |
| P1 | Pin low-density A; increase B pressure; select Density. `applyViews` sets the legend from each adapter in turn (A last), then `animateGas` installs common color domains without updating the legend. The displayed range can disagree with the actual color range. | Derive visible legend from the shared domain after installing it; include a compact color ramp or swatches. Verify with deliberately different maxima and zero-speed constant domains. |
| P1 | Transport mode increases physical time to seconds but incoming motion initially averaged azimuth only in Flow mode, leaving fast rotating points undersampled. | Average both modes explicitly and label the representation. Verify no apparent reversed/slow point rotation at transport clock scales. |
| P2 | Pump/Feed contextual number inputs showed raw logarithms under physical labels; default .02 m³/s appeared as approximately −1.699. | Display physical units/value; convert at the canonical log slider boundary. Reuse canonical controls if possible instead of introducing a second input interpretation. |
| P2 | Hold a component slider while its worker reply returns. `showGeometry` always calls `describe`, which replaces the active cloned slider. | Keep same-component control DOM stable or use `focusRelated` to canonical controls. Verify pointer drag and keyboard focus across accepted recomputation. |
| P2 | Keyboard-focus the radial Profile SVG while Transport playback runs. Automatic `draw` about ten times/s replaces the focused SVG. | Pause on deliberate plot inspection or update profile data without rebuilding focusable DOM. Verify keyboard Arrow/Home/End focus persists. |
| P2 | Scrub Spin-up/Heat at t=0 while gas mode remains Equilibrium: time cursor moves but scene stays at final speed. | Make final-reference mode explicit or switch to the matching transient mode on deliberate scrub. Never imply a final-reference frame is the t=0 time solution. |
| P2 | Inspector Gas motion still said radial transport was not solved, while Separation now solves a reduced prescribed-rotation radial closure; render status always said conditional equilibrium. | Update mode-aware scope text without adding persistent prose. Keep closure detail under Inspect/Model info. |

Mobile/source observations: split comparison stacks A above B below 600 px and keeps numeric alternatives for slice/staging. A per-frame A/B label is needed because a single centered “A pinned · B current” line does not identify top/bottom to a new user. Map native buttons expose numeric/diagnostic accessible names, but visible axis endpoint units and a current/selected marker would avoid reliance on hover titles. Forty-nine map buttons are keyboard reachable; arrow-key roving focus is a useful later improvement rather than a claimed standards failure. No computed-contrast, hit-target or actual viewport result is inferred from CSS alone.

### Adjacent invariants checked during fixes

- **Slice-handle click:** the outer torus has `componentId:'slice'` without the numerical fields expected by `showSample`; passing its metadata to `toPrecision()` initially threw. Root changed slice selection to avoid that invalid readout path. Hover still samples actual world position.
- **Transport → Flow:** azimuthally averaged ring geometry initially refreshed only in Transport. Switching an already-created average to Flow could retain the former transient radii while the underlying points had changed to equilibrium radii. Root notified to refresh averages whenever their distribution changes, including entering Flow.
- **Stable component DOM vs fresh metadata:** preserving component inputs is appropriate, but the first same-id early return skipped updated mesh name/material/purpose. Two selected meshes can share a component id, and accepted liner metadata can change. Refresh stable text nodes independently of control DOM. Root notified.
- **Selection/material cleanup ordering:** clear highlight selection before disposing scene tools. Tools restore original shell materials, whereas highlight cleanup restores its remembered pre-highlight clones; reversing that order can resurrect an already disposed clone and omit the true original from final traversal. Check repeated selected-Vessel recomputations, unpin and disposal.

Later source-observed improvements include result-owned A/B spin response, mode-aware transport status, deliberate time-plot scrub switching to a transient mode, canonical physical contextual number entry, direct A/B viewport labels, a color ramp with comparison-domain legend refresh, explicit pointer identity and cancel phases, and a real Separation plot branch. These are not test or live-browser results.

### Second source pass

Root corrections observed in the shared source: the previous list's first-camera, A/B speed source, constant-domain, selected staging, shared legend, fast transport averaging, Transport→Flow average refresh, component metadata/control preservation, selection cleanup, native clock live announcements, handle click crash and pointer cancellation paths have concrete fixes. The time plots now commit on pointerdown/held drag or keyboard rather than passive hover; focus entering plots pauses playback to preserve inspection. Geometry Inspector text now describes the reduced radial closure. Centrifuge View is explicitly registered.

Last reported integration gaps pending source/test closure:

- **P2, stale Separation metrics:** during playback the cursor and slice advance, but `draw()`-created Time/inertia metrics remain at the last draw time; only Profile automatically redraws. Update small metric text nodes from the same sample, or remove the redundant clock and explicitly label a final/max inertia reference. Do not rebuild the entire focused plot just to change a number.
- **P2, A/B plot series colors:** default colors are assigned by concatenated curve index, so corresponding A/B species/metrics can get different colors even though A already has dashed styling. Assign the same explicit color to each matched metric/series before concatenation; dash identifies the pinned case.

No remaining source-level P1 issue was identified in that second snapshot beyond fixes actively reported above. This is not a blanket approval: root execution, exact snapshot, cross-component regressions and deployed GPU/mobile evidence are still required. The map current-point marker, visible endpoint axes and roving-grid keyboard navigation remain optional ergonomic improvements unless live testing shows an actual navigation failure.

### Final-c integration review

The previously outstanding stale Separation metrics and A/B series colors are source-corrected: playback updates the existing Time/inertia text nodes from its same physical-time sample, and metric-index colors are assigned before A/B concatenation. The cursor setter silently updates numerical readout without replacing SVG/path/readout nodes. Contextual numeric inputs now update live while preserving the user's focused text. The root reports 38 focused checks passing and a paired real-OrbitControls regression for the live-discovered resize/load camera-broadcast bug; those executions were not performed by this reviewer.

Three additional adjacent paths were reported for final closure:

| Priority | Root cause / reproducible case | Small coherent fix |
| --- | --- | --- |
| P2 | View preset uses `viewer.setCamera`, which intentionally suppresses camera broadcasts. With A pinned, choose Assembly → Axial: B changes without A. | Explicitly apply the same requested preset pose to both viewers; keep programmatic fit/resize suppression. |
| P1 | Contextual exact physical number and map application assign native range values without disabling step quantization. `precise-controls.js:22–24` already documents this browser boundary and sets `step='any'`. A Coil input .53 T or map point .375 T can run at rounded .55/.4 T while its visible point/entry states the unrounded value. | Use exact physical assignment at canonical noninteger ranges (`step='any'`), preserving actual integer stage constraints. Check real browser accepted values; do not rely on a DOM shim to model step sanitization. |
| P2 | Error path sets `latest=null` but retains `tools` and the pin. Clear then accesses `latest.result` during domain reset. | Require a current accepted snapshot before restoring its domains, or dispose the invalid accepted display coherently. Regression: accept → pin → rejected request → Clear without exception. |

Map accessibility is improved in the final source: visible axis endpoint labels include units, cells have 44 px column tracks inside a horizontal scroll region, one grid item is tabbable with Arrow/Home/End navigation, and selected state is explicit. This remains source evidence, not a mobile-screen observation.

All three final-c adjacent source findings above are now corrected: deliberate presets explicitly set both viewers, canonical noninteger exact/map assignments use `step='any'`, and Clear restores domains only when `tools && latest`. The pinned integration regression now includes the Axial preset.

One final accessibility path was reported: `setCursor` turns the numeric readout's live region off, but subsequent keyboard inspection never restores a deliberate announcement. The focused SVG label itself is static. Keep RAF-driven values silent while explicitly announcing Arrow/Home/End inspection through a controlled status path. This is a source-level assistive-technology risk, not a claimed screen-reader test result.

Source closure: the keyboard handler now restores a polite announcement and refreshes the explicitly chosen sample after the shared-clock callback, which may have silently updated it. Automatic playback stays silent. Real screen-reader announcement behavior remains unobserved. Final source-pass conclusion: no outstanding P1/P2 finding identified in the reviewed changes; execution and deployed verification remain root release gates.
