# Interface adversarial review — v36 source

## Anti-pattern verdict

**Source-supported verdict: the interface still has a form-first simulation architecture under a scene-first shell. Live appearance remains ungraded.** It has real GLB geometry, PBR lighting, orbit controls, picking, accessible component selection and keyboard camera controls. Calling it a static image would be false. The most consequential problem is that the polished scene and the computed physical state remain largely separate. Making the meshes shinier or adding more animated cards would preserve that problem.

The supplied screenshots predate the current header and immersive shell. They are not evidence of the deployed v36 appearance. No current deployed desktop/mobile/GPU render was observed because of the managed origin-policy denial. I did not try to bypass that boundary.

Skills applied: `audit`, `critique`, and their required `frontend-design` guidance. The user's dark-mode, compact-window preferences take precedence over generic stylistic prohibitions in those skills.

## Summary

Seven material findings: three high priority, four medium priority. No critical security defect or verified WCAG conformance failure is asserted. Biggest wins: show physical response in the scene; stop shrinking chart typography with the entire SVG; permit the target and neutron plots to coexist. These improve scientific exploration more than adding decorative complexity.

This is a read-only code/asset review plus current primary-source research. No project code, tests, installation, build or runtime scripts were executed, so no new runtime pass is claimed. Exact source locations below refer to the current v36 files. Only this report was added.

## High priority

### UI-1 — The main scene has no general connection to computed state

**Evidence:** `src/apparatus-ui.js:42–50` chooses a fixed manifest asset by mechanism; its public operations are show/select/dispose. `src/apparatus-viewer.js:68–77` loads and frames that mesh; `111–114` exposes load/select/reset/resize/dispose, without a physical-state update operation. `src/marathon-ui.js:10,30–33` already emits an `onState` callback, but `src/main.js:392` calls it without a callback, leaving that path as the default no-op. The scalar feedback for Marathon is presently in `src/fusion-ui.js:42–60`, updating a separate SVG footprint and labels. `src/workspace-ui.js:54` moves that schematic into Model info. All floating windows begin hidden (`30`), and selecting a playground closes them (`75`).

**Root cause, technically:** the scene renderer consumes geometry and selection, while source/target results flow into separate plot renderers. The immersive shell changed placement without joining those data paths. **In plain language:** changing a setting can produce substantial numerical changes while the reactor in front of the user appears unchanged.

**Impact:** reduced discoverability of cause and effect, especially in Marathon and non-orbital Model modes; users reasonably interpret the mesh as decorative. This is a verified execution-path gap. How dead or confusing the first frame actually feels remains an observational hypothesis.

**Fix:** add a narrow, typed scene-state adapter driven by the same accepted numerical result as the plots. Begin with beam footprint/power, a target cutaway with cell-average temperature and T/D fractions at the selected time, and a neutron source/first-flight overlay. Use an explicit scalar legend with units and selection markers. For separator equilibria, show composition/density on a cutaway and the collector/inventory partition. Offer one unobtrusive selected-variable cue or restore the user's last useful panel layout; opening panels automatically is a usability hypothesis to test, not a correctness requirement. Reserve detailed assumptions for disclosure.

**Why this fix:** state-linked representation addresses the learning problem directly. A full CAD rebuild, polygon increase, or renderer rewrite does not. Magnetic field/current settings should change physical overlays while hardware remains fixed; only dimensions actually used by the solver should change corresponding geometry. Thermal overlays must be visibly analytical color maps rather than physically unjustified glowing casing. Microscopic film thickness needs an explicitly exaggerated cutaway scale.

**Acceptance:** numeric integration checks assert that the accepted result/configuration and selected history time drive both scene adapter and plots; invalid or superseded results cannot update either. Live desktop/mobile checks must show one obvious response to each primary control, beam-off clearing, correct units/color scales, and an understandable initial state with no instructions paragraph. [PhET's primary research](https://phet.colorado.edu/publications/prst-per-2010.pdf) supports linked representations and implicit guidance; [ParaView's visualization guide](https://docs.paraview.org/en/latest/UsersGuide/displayingData.html) gives a concrete precedent for scalar and comparative views. Suggested work: `/animate` for physical state feedback, `/distill` for default information.

### UI-2 — Responsive chart scaling makes the numerical typography extremely small

**Evidence:** `src/laboratory.js:101–103` uses an 800-unit SVG width. Axis/legend labels use font sizes 11/12 (`121–137`). `src/style.css:88` sets `.live-plots svg{width:100%}`. The main right window is at most 560 CSS px (`src/workspace.css:31`) with 40 px body padding (`35`); mobile sheets lose additional horizontal space (`89–90`).

**Root cause, technically:** scaling the entire 800-unit viewBox scales the text along with the graph. **In plain language:** the chart gets narrower by shrinking everything, including numbers that need to remain readable.

**Impact:** this is source-derived, not a screenshot measurement: a roughly 500 px SVG turns an 11-unit label into about 6.9 CSS px; a roughly 300 px SVG produces about 4.1 px. Container height or intrinsic-ratio constraints can make it smaller. The browser must confirm the actual bounds. No arbitrary minimum-font WCAG requirement is being invented here.

**Fix:** size the plot coordinate system from its container and preserve text sizes in CSS pixels; reduce tick count and wrap/move legends as needed. Start with the existing SVG implementation, retaining keyboard sample inspection, uncertainty bands, discontinuity handling, and equal-aspect orbit plots. Provide a maximize-plot action and optional data table/download.

**Why this fix:** hiding labels would remove scientific meaning; widening every window would fail mobile. A chart-library migration is justified only if the existing implementation cannot supply container-aware axes, zoom and linked cursors cleanly.

**Acceptance:** at 320/375/768/1440 px viewports and 200%/400% zoom, measured axis/legend text remains at the agreed product size (e.g. 12–13 CSS px), ticks and legends do not collide, units remain available, equal spatial scaling remains correct, and keyboard inspection yields the same samples as pointer inspection. Include the existing number-fraction chart, which has a separate 800-unit SVG (`index.html:19`, `src/main.js:261–267`). Provide a collapsed data representation for charts following [W3C's complex-image guidance](https://www.w3.org/WAI/tutorials/images/complex/) and verify reflow under [WCAG 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Suggested work: `/adapt`, then `/verify`.

### UI-3 — “Windows” cannot be tiled, resized or compared on the same side

**Evidence:** `src/workspace-ui.js:19` closes every other window on the same side; `33` assigns Plots, Target and Model info to the right, Controls and Inspect to the left. `src/workspace.css:29–31` fixes overlay position/width. There are no move/resize/split/pin operations in `workspace-ui.js:1–76`.

**Root cause, technically:** panels are exclusive overlays assigned to two slots, not dockable groups. **In plain language:** opening neutron plots hides the evolving target; inspecting a component hides its controls. This deliberate restriction is a product/requirements gap against the requested tiled comparison workflow, not an event-handling regression.

**Fix:** first prototype two resizable desktop side groups, each with tabs, and allow one pinned comparison plot/target view. Preserve the existing mobile one-sheet behavior and node identity. Keep a reset-layout action; add persisted layout only after reliable sizing/focus behavior exists.

**Why this fix:** a small split/group implementation may satisfy the actual need. If robust drag docking and saved layouts become requirements, [Dockview's official docs](https://dockview.dev/docs/overview/introduction/) support vanilla JavaScript as well as framework integrations, groups/tabs, floating panels and serialization. A React migration is not required. [ParaView's multiple-view model](https://docs.paraview.org/en/latest/UsersGuide/displayingData.html) is a better domain precedent than indiscriminately copying an IDE's chrome.

**Free-project constraint:** [Dockview's current licence split](https://dockview.dev/docs/overview/licence/) puts core splitters, floating groups, layouts, tabs and focus navigation under MIT; pinned tabs, auto-hide groups and keyboard docking/spatial navigation are Enterprise features. Do not assume every Cursor-like behavior is free. An ordinary application comparison panel or baseline “Pin” action need not use Enterprise pinned tabs. Prototype the actual required layout before installing a docking framework.

**Acceptance:** on desktop, target state, neutron plots and relevant controls can coexist without obscuring the important target/beam region; resizing preserves plot legibility and the current result; keyboard users can select/resize/reset groups; mobile retains all capabilities without overlapping sheets. Suggested work: `/adapt` and `/prototype` before committing to a dependency.

## Medium priority

### UI-4 — Component picking explains the part but does not expose its scientific controls

**Evidence:** `src/component-inspector.js:13–20` renders name, purpose, materials and provenance. Apparatus selection opens the Inspect window (`src/apparatus-ui.js:17–24`), while independent control/target windows remain separate (`src/workspace-ui.js:42–54`). This implements the user's original component explanation request, but not a component-centered scientific workflow.

**Cause:** selection is descriptive state, separate from control/observable ownership. Simply: the target can be clicked, yet its relevant temperature/loading settings and plots must be found elsewhere.

**Fix:** use the selected component to choose a compact inspector with purpose/material plus Parameters and Results tabs. Reuse the existing control nodes rather than cloning them. Keep a global all-controls route for expert workflows. Name fields/overlays distinctly from physical hardware.

**Why:** this removes navigation work and repeated prose without removing detail. Adding tooltips to every paragraph would not connect the existing concepts. [Babylon's editor documentation](https://editor.babylonjs.com/documentation/basics/composing-scene) is a current concrete reference for selection-driven property inspection, not a reason to replace Three.js.

**Acceptance:** select target → relevant target settings/results become reachable in one action; select coil/field source → relevant field controls; keyboard component selection offers the same route. Material provenance remains explicit where specifications are assumed or unknown. Suggested work: `/distill` and `/clarify`.

### UI-5 — Useful settings cannot be shared or resumed consistently outside playground 1

**Evidence:** `src/experience-ui.js:26` hides Copy link outside playground 1. `38–39` resets the model selector to centrifuge whenever Models is re-entered. `44–46` encodes only the level in other playground URLs. Separate JSON exports exist, e.g. `src/coupled-target-ui.js:147`, but they do not restore the visual experiment from a link.

**Cause:** only the basic spinner has a serializable experiment-link contract. In plain language, a useful Marathon setup or model comparison cannot be sent to a friend as the same playground state, and model navigation loses context.

**Fix:** version and validate a compact scenario state for each supported playground, including model/closure, physical inputs, numerical choices and selected saved time. Preserve model choice on re-entry. Add an explicit Reset. Keep full raw exports separate from small shareable links.

**Why:** a bounded state contract builds on existing share/export behavior without introducing accounts, a database or a server. It directly improves the personal-project sharing goal.

**Acceptance:** configure → copy link → fresh reload reproduces numerical inputs/closure and current model; invalid/out-of-domain state is rejected visibly; old v1 links retain their supported behavior. No credentials or private filesystem paths enter links. Suggested work: `/harden`.

### UI-6 — Coupled-target updates erase the last completed view before the new result exists

**Evidence:** `src/coupled-target-ui.js:105` clears metrics and both plot containers. Every scheduled update calls it before the 250 ms debounce (`107–111`). Revision and abort handling (`113–122`) correctly prevent superseded results from appearing.

**Cause:** pending computation and invalid/no-result states share the same clearing operation. Simply: while dragging, the user repeatedly gets an empty plot instead of a stable view with a clear pending indication.

**Fix:** separate pending and invalid states. Retain the last completed snapshot during a valid pending calculation, visibly label its configuration/time and “Updating,” and replace atomically when the matching result arrives. Clear invalid inputs/results explicitly; never label old data as current. Reserve chart space during the update.

**Why:** cancellation/revision protection is already good and should remain. A pending snapshot is presentation state, not a numerical fallback. Rendering every intermediate heavy solve would waste work and can reduce responsiveness.

**Acceptance:** rapid slider changes preserve a stable, explicitly pending plot; the final accepted snapshot matches all controls; invalid input clears/gives an actionable error; no aborted reply clears or overwrites a newer valid result. Test with delayed workers and verify on a real phone. Suggested work: `/harden`, then `/animate` for restrained pending feedback.

### UI-7 — Primary range controls do not support precise numerical entry

**Evidence:** primary spinner values are range-only with output labels (`index.html:24–27`). Marathon's source fields are ranges (`src/fusion-ui.js:7–18,65–75`), including logarithmic sliders where a step of 0.1 in log10 changes the physical value by about 26%. Coupled-target kinetics do have numeric inputs (`src/coupled-target-ui.js:66–77`), showing that this need is already handled in some advanced controls.

**Cause:** exploration controls and precise scientific parameter entry have separate implementations. Simply: it is easy to slide around and harder to set an exact value from a paper or reproduce a marginal regime.

**Fix:** make the displayed numeric value editable or reveal a compact number field on demand; synchronize it with the slider, units and domain constraints. Keep logarithmic semantics explicit and preserve zero as an absent process where the model supports it. Provide a quick reset per parameter group rather than additional explanatory paragraphs.

**Why:** dual range/numeric entry supports both play and technical work with little persistent chrome. Globally increasing slider resolution would make touch manipulation worse and still not make exact entry obvious.

**Acceptance:** mouse/touch/keyboard users can enter exact in-domain values, escape edits, and reset; range and numeric values agree after unit conversion; nonfinite/out-of-domain inputs show errors without silently clipping physical values. Measure actual hit areas before asserting a WCAG failure; [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) uses a 24 px minimum with defined exceptions, while 44 px is the stronger touch target, not the universal AA requirement. Suggested work: `/clarify` and `/harden`.

## What should be retained

- Real interactive glTF/PBR display, picking threshold, nearest-visible-surface selection, lazy loading, generation checks, disposal, retry, and keyboard camera controls (`src/apparatus-viewer.js:29–115`, `src/apparatus-ui.js:26–40`).
- Nonmodal windows, Escape dismissal and focus return; explicit disclosure of unavailable controls; original node identity (`src/workspace-ui.js:12–37,64–75`).
- Plot keyboard sample inspection, units in captions, uncertainty-band gaps, and equal-aspect spatial axes (`src/laboratory.js:97–172`). These are already substantive and should not be replaced by decorative sparklines.
- Model/scenario/evidence distinction, explicit frozen OpenMC references versus live first-flight calculations, and source provenance. Minimalism should move evidence behind deliberate disclosure rather than deleting it.
- Current restrained sage/copper dark palette and normal-case header. A blue/purple glow redesign or generic icon-card grid would ignore user feedback and add no scientific meaning.

## Release gates and ordering

1. Fix UI-2 first: it affects the readability of every further addition and is independent of physical qualification.
2. Add one correct scene-state adapter and useful default readout (UI-1), preserving explicit scale/provenance. Validate it on accepted numerical results, not invented visual motion.
3. Prototype actual comparison layout (UI-3); then integrate selection-driven controls (UI-4).
4. Add exact entry, stable pending snapshots and versioned scenario sharing (UI-5–7).

Before calling the result visually clean/high fidelity, obtain an authorized browser render at the deployed version and inspect all playgrounds at desktop/mobile sizes, keyboard-only navigation, zoom/reflow, focus visibility, screenshot-state consistency, color-vision differentiation, loading/error/retry, stale/cancelled solver results, GLB picking, and frame/interaction timing. Do not turn the previous 664-test pass into an observed mobile/GPU audit. No benefit is claimed for changing frameworks before these gates are met.
