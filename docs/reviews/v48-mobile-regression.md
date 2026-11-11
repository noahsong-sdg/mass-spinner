# Mobile comparison motion-bar regression

## Observed failure and root cause

The deployed pre-fix screenshot `scientific/centrifuge-v44/coupled48/mobile-models.jpg` at 390 × 740 shows the playback bar obscuring the center of B's reactor. This reviewer inspected that image directly; the root agent captured it in the live browser.

At widths at or below 600 px, `src/fuel-playground.css` changes the two comparison apparatus frames from horizontal halves into vertical 50%-height rows. The playback bar still inherits the ordinary whole-stage bottom anchor from `src/style.css`: `bottom: calc(var(--world-bottom, 96px) + 46px)`. The canvases move but their shared controls do not follow their new relationship. In simple terms, controls intended to sit near the bottom of one large scene land across the lower of two smaller scenes.

The narrow fix places the shared bar at the comparison-row seam only in the existing mobile comparison media rule: `bottom: auto; top: 50%; transform: translateY(-50%)`. Percentage translation uses the bar's own rendered height, so wrapping controls remain centered at the seam without JavaScript measurements or a hard-coded height. Single-model and desktop placement retain their existing rules. This is a display-layout fix; it must not alter accepted results, physical time, cameras or simulation requests.

## Live acceptance procedure

Use the exact deployed candidate and record its source/version identity, viewport, browser tool, mode, and the observed geometry. Root executes these checks with the authorized live browser; a jsdom/CSS-string check cannot establish rendered layout.

1. At both **320 × 740** and **390 × 740**, open Marathon's centrifuge, pin accepted A, then change a physical input and wait for accepted B. Open the View dock to pin as needed, then close it so the model stage is exposed.
2. Check both **Coupled separation** and **Coupled spin-up**. Let rendering and resize settle before reading the visible A/B canvas and `.fuel-motion` bounding rectangles. Preserve a screenshot of each mode/width.
3. Require both visible canvas center points to lie **outside** the motion-bar rectangle. Require the motion-bar center Y to match the frame seam within 1 CSS px. The seam is the lower edge of A / upper edge of B, not a guessed viewport midpoint. Record raw rectangles and computed assertions; the before image is a visual witness, not invented pre-fix rectangle data.
4. Require the bar to remain inside the viewport horizontally and all mode/Play/Restart/seek controls to remain visible and keyboard reachable after wrapping. Check page scroll width for unintended horizontal overflow. An overlap-free bar with a clipped slider does not pass.
5. Seek to a non-endpoint physical time and inspect the plotted cursor, clock and both scenes. They must still share that time; playback and seeking must consume the accepted output without a new physical solver request. Do not infer this from a static screenshot alone.
6. Clear A. Require the baseline to be hidden, the remaining canvas to recover the single-model frame, and the bar to return to the ordinary bottom placement. Check the model remains accessible and the retained accepted B is unchanged.
7. At a desktop width above 600 px, repeat pin/compare/clear. Require side-by-side A/B canvases and unchanged ordinary bar anchoring. Confirm the mobile seam transform is absent.

For each case, record failed assertions as failures with the actual rectangles and screenshot. Do not count an unexecuted or tool-blocked check as passed. Center clearance is a useful quantitative guard; inspect the screenshot as well for obstruction of salient reactor parts, docking controls, text and focus outlines.

## Verification status

The root cause and candidate CSS strategy are independently source-reviewed. The root agent executed the live checks. This reviewer independently read `scientific/centrifuge-v44/coupled48b/browser-regression.json`, `provider-verified.json` and the empty `console.json`, inspected the resulting image files and their dimensions, and compared the recorded rectangles directly. This reviewer did not operate the browser.

The recorded final browser entry is `/assets/index-yLOg-eXd.js`, deployed version `0b94d871-fe2d-4507-b09b-e9c678bc9374`, on the public Workers site. Provider metadata records that version at 100%; browser evidence is recorded separately rather than inferred from provider deployment.

- At **320 × 740**, both coupled modes have canvas centers at Y = 233 and 571 px. The bar spans Y = 340.25–463.75 px and is centered at the 402 px seam. Its horizontal extent is 8–312 px, with page scroll width 320 px. Both model centers are clear; wrapping controls remain inside the viewport.
- At **390 × 740**, both coupled modes have the same canvas-center Ys and seam. The bar spans Y = 350.5–453.5 px and X = 8–382 px, with page scroll width 390 px. The changed-current B comparison retains the same valid layout. Screenshots show the bar between the actual visible reactor assemblies as well as between the canvas centers.
- At **601 px**, the live record confirms side-by-side full-height 300.5 px canvases and ordinary bottom anchoring. Clearing A at 390 px restores one 390 × 676 px canvas beginning at Y = 64 px, with the bar back at Y = 513–616 px.
- The final-release record includes synchronized timeline Home/endpoint readouts and finite output from all twelve plot choices. Native plot-panel scrolling reaches the controls and the complete legend. Independently viewed `mobile-plot-controls.jpg` and `mobile-plot-legend.jpg` confirm the initially clipped legend word came from scroll position, not inaccessible content. The checked console artifact is empty.

The first 320 px capture had an incorrect 320 × 165 image aspect; it was explicitly rejected during review. The root agent reset/set the browser viewport and replaced it with the valid **320 × 740** `mobile-320-comparison.jpg`. The final 390 px comparison and mobile plot images are **390 × 740**. `desktop-inertia.jpg` is **1512 × 778**. These final images were individually inspected; none is being represented as a physical calibration or full-browser compatibility study.

Also independently inspected `scientific/fixes-v43/v44-final-coupled48b.receipt.json` and the corresponding log: the exact 528-input snapshot `014e23bc52a1008a636e27973b956004ca31a7867b50528b81034bb1f83137d7` passes **1021/1021 tests**, typecheck, build, site/assets checks, both bundled-worker probes and the saved collision-data probe. All eight commands exit 0 and source identities are verified before and after execution. This supersedes the earlier narrow batch's pending joint-refinement gate; its failure remains retained in the earlier log.

No outstanding model-center obstruction remains in the recorded mobile comparison cases. The artifact set establishes the tested widths/modes and documented interactions; it does not establish every device, landscape height, assistive-technology combination or a separate recorded keyboard traversal of every playback control.
