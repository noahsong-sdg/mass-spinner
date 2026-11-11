# v42 UI source audit

## Anti-pattern verdict

**Qualified pass for the intended minimal dark instrument UI; fail for complete mobile usability.** The workspace is recognizably built around apparatus inspection, rather than a generic marketing template. The scene owns the viewport, controls and plots are docked windows, and prose is usually disclosed through native details. The compact header uses ordinary case and zero tracking (`src/workspace.css:7–10,43`), so the earlier widely spaced caps complaint is addressed. Playground navigation is physically moved beside the brand (`src/workspace-ui.js:8–9`). The internal mechanism picker remains in Controls; whether that also needs to be beside the header is an intent question, not a proven requirement failure.

Dark green panels, copper accents, thin borders and moderate rounding are coherent with the requested instrument workspace. Their mere presence does not establish an AI aesthetic failure. There is no gradient headline, hero-stat grid or decorative sparkline to report. The remaining visual cost is density inside long windows, particularly Models → Model info, where mechanisms, failure modes, references and atlas share one scroll body (`src/workspace-ui.js:111`). That is a prioritization opportunity, not a release-blocking style finding.

## Scope and evidence

This is a static execution-path audit of current host source. No product files were edited. I read the audit/frontend-design skills and safe-dev README. I did not run repository code, tests, dependency installation, build, typecheck, or VM commands. `git rev-parse HEAD` established that this directory is not a Git repository; there is no commit identity to claim. The root audit owns executed checks and timings.

Snapshot fingerprints (SHA-256):

| File | Hash |
| --- | --- |
| index.html | `20a3c29c21df08ff07914936f168f55bf12242fe34379f0514c930e5c57a8829` |
| src/workspace-ui.js | `61483e4fd35647a468a5a4d9de331872cecb0d3fd206dd8483b86c2b14841ddb` |
| src/workspace.css | `ce42bb624a1a9638fd657699ef413d94a27f6a624b3a290f000587e894549bac` |
| src/apparatus-viewer.js | `b0f21ae644fe5a315f23108790ec02d40ced226a10672474bf53e29d38f1a557` |
| src/fusion-ui.js | `3837b59d81497fa0832d51f1408fe8af52e76e823d11fa1e89f35c98c89e87b9` |
| src/laboratory.js | `0bf660edf788109be5b302c29e6e14a0d025692fdc413c2062b369f171e1c3aa` |

Live observations below are explicitly attributed to the separate live-UX auditor; I did not operate CUA. No contrast-ratio claim or blanket WCAG compliance claim is made.

## Findings by severity

No critical source-level UI issue established. Four medium findings and one low finding are established below. Two renderer/performance follow-ups remain unqualified pending a runtime probe.

### Medium / P2 — Exact entry edits the exponent instead of physical heat capacity

**Evidence:** `src/target-exposure-ui.js:15–28`; `src/precise-controls.js:8,12–16,26–35`; augmentation is installed globally at `src/main.js:437`.

**Trigger:** Marathon → Target → References → Exposure, click the default areal heat-capacity output showing 10000 J m⁻² K⁻¹. Its range is 2…6 with value 4; the physical reader computes 10^value. Because this range declares neither `data-range-scale` nor `data-unit`, the exact editor defaults to linear and opens 4 with bounds 2…6. Entering the intended physical value 5000 fails validation. Entering 5 is accepted but means 100000 to the model.

**Technical cause:** A logarithmic range consumer omits the scale contract required by the shared precise-control enhancer. **Plain cause:** The display shows heat capacity, but its editor changes the hidden power of ten. This can alter thermal predictions by orders of magnitude while looking like precise input.

**Live verification:** The live-UX auditor reproduced the wrong-unit editor: a displayed 9727 J m⁻² K⁻¹ opened as 4; applying 5 produced 99730 J m⁻² K⁻¹ and changed the thermal time constant from 1.896s to 18.96s. Screenshots: `docs/reviews/v42-evidence/heat-capacity-precise-before.jpg` and `heat-capacity-precise-after.jpg`. Those slightly different displayed values are reported as observed; this source audit does not infer a cause for their small offset from 10000/100000.

**Smallest preferred fix:** Set `input.dataset.rangeScale = log ? 'log10' : 'linear'` and `input.dataset.unit = unit` when creating exposure controls, matching `src/fusion-ui.js:75`. Keep conversion at the established shared boundary; do not infer logarithmic scale from captions or add a second editor implementation.

**Acceptance gate:** A regression test must open the default editor at 10000, accept physical 5000, assert raw `Math.log10(5000)` and a recomputed 5000 readout/result, and reject values outside 100…1e6. Check Celsius controls remain in displayed Celsius. Browser verification should reopen this exact nested control.

### Medium / P2 — Mobile surface inspector is underneath the dock

**Evidence:** `src/apparatus.css:2,7` places `.apparatus-state` at bottom 16px / mobile 8px with z-index 2; `src/workspace.css:15–16,25,102` anchors the scene to the bottom while putting the dock above it at bottom 12px, z-index 6. `src/surface-layer.js:65–75` creates the inspector inside that scene frame.

**Live verification:** The live-UX auditor reproduced this at 390×844: the closed Surface/time summary sits behind the centered dock; when expanded, the Species 2 ledger and Model info are covered around y779–832. Evidence artifact: `docs/reviews/v42-evidence/spinner-mobile-surface-overlap.jpg` (owned by live auditor).

**Technical cause:** Workspace rails reserve bottom space, but the apparatus-owned overlay still uses its original near-bottom coordinate system. **Plain cause:** Two independently positioned controls occupy the same bottom strip. Users cannot reliably inspect all surface metadata on a phone.

**Smallest preferred fix:** Add an immersive-workspace-specific bottom offset for `.apparatus-state` using the shared dock reserve plus safe-area padding. Preserve the full scene; merely raising z-index would cover the dock instead and transfer the problem.

**Acceptance gate:** At 320×568 and 390×844, closed and expanded surface inspectors, all selects, ledger and Model info must remain reachable above the dock with safe-area insets. Open/close one mobile window and return to the scene to check adjacent layering invariants. Suggested skill: `/adapt`.

### Medium / P2 — Research temperature tensors overflow the mobile layout

**Evidence:** `src/style.css:72` uses two `1fr` tensor columns; `src/research-ui.js:32–36` fills each with three fixed-width numerical columns in a preformatted block, then appends distribution details spanning both tracks (`src/research-distribution-ui.js:8`). The responsive workspace only changes `.live-plots`, not `.replay-tensors` (`src/workspace.css:92,103`).

**Live verification:** The live-UX auditor measured a tensor-grid width of 308px and scrollWidth of about 530px at a 390px viewport; each species column was about 253px and the second began at x317.9. The page/body did not offer horizontal recovery (390px scrollWidth). Screenshot: `docs/reviews/v42-evidence/research-mobile-overflow.jpg` (owned by live auditor).

**Technical cause:** Grid `1fr` tracks retain an automatic min-content minimum, so preformatted numbers widen both tracks beyond their parent. **Plain cause:** A desktop pair of numerical panels is squeezed into a phone without being allowed to stack. The second species and spanning distribution section become clipped.

**Smallest preferred fix:** Use shrinkable `minmax(0,1fr)` tracks, a mobile one-column rule and `min-width:0` on tensor/distribution grid children. Preserve local pre/table horizontal scrolling for actual numerical data; do not wrap tensor rows into ambiguous values or shrink their type to fit.

**Acceptance gate:** Both species tensors and loaded distributions/convergence tables must be fully reachable at 320/390px and 200% text. Check a long recorded-case option as well as the initial case. Desktop should retain two columns when space allows. Suggested skill: `/adapt`.

### Medium / P2 — Mechanism selector loses its accessible name

**Evidence:** `index.html:16` provides the `#system` select with a native `<label for="system">System</label>`. It is moved into the Controls window by `src/workspace-ui.js:106`, then `.world-window .system-bar label{display:none}` hides its sole label (`src/workspace.css:70`). There is no explicit ARIA label on the select.

**Live verification:** In Models → Controls, the live-UX auditor found the popup with the current value “Plasma centrifuge equilibria · §II C” but no AX accessible name/description. This is a naming problem independent of whether the picker belongs in the header.

**Technical cause:** Compact layout removes the semantic label along with its visible pixels. **Plain cause:** A screen reader gets the selected model but no explanation of what the control selects.

**Smallest preferred fix:** Retain the associated label using the existing visually-hidden utility, or add a concise explicit name such as “Physical model.” Prefer retaining the native label because it already establishes the relationship. Do not use placeholder options as labels.

**Acceptance gate:** Browser AX must expose a stable name plus the changing selected value. Add a DOM/style or accessibility regression appropriate to the chosen fix and verify keyboard selection across centrifuge, rotating and ICR. Suggested skill: `/harden`.

### Low / P3 — Reparenting removes the main landmark and page heading

**Evidence:** `src/workspace-ui.js:6` builds the live application as divs, then `:141` hides the original main. The document's h1 (`#level-title`, `index.html:5`) stays inside that hidden main. All panels begin closed (`src/workspace-ui.js:93`), so the interactive scene can initially have neither a main landmark nor an exposed page heading. The existing test explicitly expects the old main to be hidden (`tests/workspace-v25.test.ts:46`) but does not check a replacement landmark.

**Technical cause:** DOM reparenting preserves input nodes but not the original structural semantics. **Plain cause:** Screen-reader users lose their main-content and page-title navigation shortcuts after startup.

**Smallest preferred fix:** Make the live workspace the main landmark and move the existing visually hidden h1 into it (or give the workspace a clear accessible name and retain an h1). Avoid nested main landmarks. This is a focused structural fix, not a second navigation system.

**Acceptance gate:** One visible main landmark and one current playground h1 after startup and each level change; window headings remain h2. Screen-reader landmark navigation reaches the apparatus/research content without tabbing through every header/dock action. Suggested skill: `/harden`.

## Runtime follow-ups, not established latency/failure findings

### Main-thread work is real; long-task impact needs timing

The primary separator and coupled-target solvers do use cancellable workers (`src/main.js:279–281`, `src/worker-client.ts:3–20`, `src/coupled-target-ui.js:110–129`). However, a Marathon source input calls `update()` synchronously (`src/fusion-ui.js:82`), executes one beam model plus a roughly 25-point energy scan (`:35–38`; `src/fusion-playground.ts:7–14`), redraws SVGs and invokes all observers. The observer synchronously updates exposure and loading before scheduling the coupled target (`src/marathon-ui.js:41–42`). `src/target-loading-ui.js:28–29` runs both the ordinary and tighter-tolerance loading calculation even when its References details are closed. Its adaptive loop permits up to 100000 accepted/rejected steps (`src/target-loading.ts:118–137`). These calculations are **not** all moved to workers.

The source path proves synchronous main-thread work; it does not prove a >50ms long task, dropped frames or unacceptable latency for current default/bounded inputs. Root owns the requested whole-source-update timing probe. If timing demonstrates a problem, first defer/reuse the closed reference calculations or remove repeated work for source changes that do not affect a reference. If latency remains high, use the existing cancellable worker protocol. A debounce alone reduces frequency but leaves each heavy task blocking.

Acceptance: measure actual input-handler/long-task durations for default and a demanding valid source, with References closed and open, while rotating the 3D model. Check stale-result/export states after a second input during calculation. Do not claim performance is fixed merely from worker existence.

### Renderer recovery affordance is separated from the error

`src/apparatus-ui.js:14,30–39` places Retry 3D in `.apparatus-toolbar`, which the workspace moves into the normally closed Inspect window (`src/workspace-ui.js:110,115–116`). The error itself is left in the scene frame. This statically predicts poor recovery discoverability when a render fails with Inspect closed. The scene reports “3D unavailable,” but it neither points users to Inspect nor exposes Retry beside that message. A live failure injection was not performed by this auditor; do not promote it to a verified failure-recovery finding without one.

Also, `src/main.js:441` unconditionally calls `initScene()`, which allocates/compiles the legacy WebGPU/WebGL scene (`:174–205`) even when the default apparatus renderer uses a separate WebGL canvas. This is confirmed resource work, but startup cost/GPU-memory impact was not measured. Prefer lazy creation when the user first requests a legacy view if measurements justify a change.

## Positive patterns and adjacent invariants

- **Panel semantics and keyboard dismissal are deliberate.** Each section has an aria-labelledby heading, dock button aria-controls/expanded state, Escape dismissal and focus restoration (`src/workspace-ui.js:73–94`). Resizers accept arrow/Home/End keys and publish values (`:40–59`). No modal trap is imposed on a scene meant to remain interactive.
- **Mobile adaptation preserves functionality.** The layout opens one window at a time and hides desktop resize handles (`src/workspace-ui.js:80–83,136`), rather than removing controls. The live auditor confirmed offscreen header tabs remain semantically reachable and scroll into view on selection; a narrow screenshot alone is insufficient evidence of inaccessible navigation.
- **Surface and component access have keyboard equivalents.** Pointer picking has movement thresholds and cancellation (`src/apparatus-viewer.js:117–134`), while the native component select offers the same catalogue (`src/apparatus-ui.js:43,50–51`). Canvas labels document rotation/zoom and key handlers implement them (`src/apparatus-viewer.js:41,136–143`).
- **Plots are inspectable, not decorative.** Axes/units are named, SVGs are keyboard focusable, arrows/Home/End inspect actual samples, and readouts announce values (`src/laboratory.js:126–127,191–219`). Nonfinite points break paths rather than being bridged (`:178`). Observers are disconnected before rebuilding figures (`:119–121`).
- **Stale solver results are explicitly controlled.** Separator invalidation clears current plots/counts, disables export/refinement, increments the revision and aborts workers (`src/main.js:241–255`). Coupled-target pending state labels the retained snapshot, disables export and rejects superseded responses (`src/coupled-target-ui.js:108–129`). Neutron pending exports are also withheld (`src/neutron-transport-ui.js:96–98`). No stale-data bug was established in those paths by this static review.
- **Exact entry otherwise has a useful boundary.** It validates finite values and bounds, declares logarithmic conversion rather than guessing it, and stops Escape propagation before closing its parent panel (`src/precise-controls.js:26–38`). The heat-capacity bug is a missing integration declaration, not a reason to replace that implementation.
- **Persisted layout is conservative.** Only geometry is saved; version, finite values and bounds are checked and invalid/stale preferences restore defaults (`src/workspace-layout.js:1–13`). Storage failures are caught (`src/workspace-ui.js:14–18`). Existing workspace tests cover invalid layout and focus lifecycle, although they do not constitute this audit's test execution.
- **Materials are qualified honestly.** Component records distinguish specified LiT from illustrative stainless/copper appearances and unspecified construction alloys (`src/component-catalog.ts:3–23`). Selection descriptions do not turn render finish into engineering evidence.

## Priority and verification boundary

Fix exact-entry scale, mobile overlay reserve, tensor layout and accessible naming first; they are narrow, independently reviewable changes. Restore workspace semantics next. Use `/adapt` for the two responsive findings and `/harden` for naming/semantics/recovery; `/optimize` only after the timing probe establishes which work matters.

For each corrected bug, add a regression, inspect adjacent controls/states, then run the repository's required test/build/typecheck final gate inside safe-dev on an explicitly refreshed source snapshot. This auditor ran **no project checks**, so this report grants no build/test approval. Security, deployed artifact identity, numerical validity and physical model coverage are outside this UI source report's claims.
