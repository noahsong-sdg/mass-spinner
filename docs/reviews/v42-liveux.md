# v42 deployed UX audit — 2026-11-09

## Verdict

The ordinary Brave browser successfully renders the deployed playgrounds after a fresh reload. The earlier stale-tab “3D unavailable” state was not reproduced. No error or warning console entries were captured during this audit. This is evidence of the paths below, not a guarantee that WebGL cannot fail.

The design has a coherent, restrained laboratory workspace: an apparatus-led canvas, small persistent navigation, collapsible tools, and useful keyboard focus. Dark mode is an explicit user preference and is not a finding. There is no actionable generic “AI appearance” finding. However, mobile overlays obscure data, a precise editor uses the wrong numerical domain, and selected-model/material context is incomplete. These materially affect the requested playground experience.

Audit only: no source changes, deployment, VM execution, authentication changes, or project scripts. Screenshots are in `v42-evidence/` beside this report. Source reads were used to distinguish verified behavior from inferred cause.

## Tested matrix and evidence

Browser: normal extension-backed Brave, browser ID `1`, tab `923039329`. Origin: https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/ . Ordinary reload first at `?level=2`; initial viewport 739×778 CSS px, DPR 2. Temporary viewport overrides 1440×900 and 390×844 were used and reset at closeout.

| Playground | 1440×900 | 390×844 | Actions checked |
|---|---|---|---|
| Mass Spinner | Render, Controls + Plots dock columns, computed result | Render, sheet open/close, Surface disclosure | Initial result, controls, plots, surface units and sample menu |
| Marathon | Beam target reference and accepted numerical geometry; 3 panels; material result; Inspect | Beam target render; Inspect sheet; fidelity disclosure | Use material model, exact energy edit, stale-result messaging, target exposure exact edit, component click, camera reset/keyboard |
| Models | ICR reference and accepted geometry; Controls open/closed | Centrifuge controls, select ICR, close Controls | Native model selection, accessible name, selected-model context |
| Research | Tensor readouts and plots at final saved step | Initial tensor readouts, Controls sheet | Saved-time slider End changes tensor values and chart samples |

Keyboard: camera ArrowRight visibly rotates and receives a strong outline; Resize left windows End changes width 346→420; saved-time End changes research samples from t=0 to t=100 µs. Native input precise entry and focus return work on the checked energy control. Header navigation semantic clicks scroll the narrow tab strip to Models/Research, so hidden initial tabs were not counted as unreachable.

Limits: no physical mobile device, screen reader, 200% text zoom, exhaustive keyboard tab traversal, forced GPU failure, Future blanket, every model choice, or exhaustive hidden reference panels. No numerical/physics correctness conclusion follows from this UX audit. The live deployment was inspected; an immutable deployed commit SHA was not exposed in the inspected UI.

## Findings

### P1 — Exposure exact editor edits a logarithmic exponent as though it were a physical value

- **Verified sequence:** Marathon → Target → References → Exposure → click the Areal heat capacity value. The displayed physical output was `9727 J m⁻² K⁻¹`; the precise number input opened as `4`. Enter `5` → Apply produced output `99730 J m⁻² K⁻¹` and changed the thermal time constant from `1.896 s` to `18.96 s`.
- **Impact:** a control advertised as exact entry silently operates in a different numerical domain. A user cannot enter the shown physical quantity and may materially change a thermal scenario while believing they entered an ordinary value.
- **Technical root cause:** verified in `src/target-exposure-ui.js:15–28`: the areal-capacity range stores log10 values but does not declare `dataset.rangeScale` or units. `src/precise-controls.js:8–12` consequently defaults to linear and presents/stores the exponent. The physical model then exponentiates it. The cause of the observed slight differences from exact powers of ten remains unverified; AX reports integer4/5 and can round a fractional value. The wrong numerical domain is independently established by source and UI.
- **Simple explanation:** the slider's internal dial position is being presented as the measured value.
- **Minimal remedy:** declare the existing logarithmic domain and unit at this range's construction, using the established precise-control contract. This avoids a new heuristic that guesses scales from captions.
- **Gate:** regression covers open/apply/reset with a known physical capacity and unit; type a valid off-grid physical value and verify the resulting model capacity. Check the other exposure fields retain linear/temperature semantics.
- **Evidence:** `heat-capacity-precise-before.jpg`, `heat-capacity-precise-after.jpg`.

### P2 — Research mobile clips the second ion tensor and convergence disclosure

- **Verified sequence:** select Research at 390×844 with Controls closed. The second tensor starts near x318 and extends past the right edge. DOM measurements: `#replay-tensors` width308, scrollWidth530; each tensor child width252.9; disclosure width529.7. Document/body scrollWidth390, so ordinary page horizontal scrolling cannot recover the missing tensor.
- **Impact:** mobile users lose the 84 u ion's numeric state and part of the associated disclosure. This is data loss through layout, not merely a dense appearance. Relevant WCAG 1.4.10 reflow concern.
- **Technical root cause:** `src/style.css:72` uses `grid-template-columns:1fr 1fr`; auto minimum track sizes follow monospaced row content. The immersive/mobile rules fix plots but do not collapse this tensor grid.
- **Simple explanation:** two desktop-width number blocks are squeezed into one narrow screen without stacking.
- **Minimal remedy:** one tensor column at the mobile breakpoint, zero-minimum tracks/children, and local scrolling on genuinely tabular/preformatted values. Keep the desktop two-column view.
- **Gate:** 320/390 px and 200% text show both complete tensors and reachable convergence content; long numeric rows scroll locally without page overflow. Use `/adapt` for the scoped layout correction.
- **Evidence:** `research-mobile-overflow.jpg`; desktop comparison `research-desktop.jpg`.

### P2 — Surface controls occupy the same bottom band as the dock

- **Verified sequence:** Mass Spinner computed result at 390×844 → close Controls → expand Surfaces. Closed summary time text is behind the centered dock. Expanded Species 2 text and Model info lie under the dock around y779–832. The overlap also exists at restored739×778 when the disclosure is expanded.
- **Impact:** result time/provenance and part of the component controls are obscured exactly where users inspect computed surfaces.
- **Technical root cause:** `src/apparatus.css:2` anchors `.apparatus-state` bottom16/z-index2; `src/workspace.css:25` anchors the dock in the same band at bottom20 (mobile12)/z-index6. The surface panel has no dock exclusion space.
- **Simple explanation:** two independent panels are assigned the same screen space and the toolbar wins.
- **Minimal remedy:** reserve the dock's measured band for surface disclosure placement, with a bounded scrollable disclosure on short screens. Avoid simply raising its z-index, which would cover the primary window controls instead.
- **Gate:** closed and expanded disclosure, all available dock button counts, 390×844/739×778, with and without a sheet: every label/control is visible and pointer-reachable. Use `/adapt` or `/harden`.
- **Evidence:** `spinner-mobile-surface-overlap.jpg`, `spinner-mobile-resized.jpg`.

### P2 — Current Models selection disappears when Controls closes; chooser is unnamed

- **Verified sequence:** Models → Controls → select Ion cyclotron resonance → close Controls. Header only identifies the playground as Models; the current ICR choice is absent. On mobile the same selection is visible only inside the sheet. AX for `#system` is a native popup with Value but no accessible Description/name.
- **Impact:** users cannot identify which model they are viewing while exploring the canvas; the chooser is less understandable to assistive technology. The earlier request for header model selection is ambiguous between playground tabs and this internal mechanism chooser. The playground tabs are already beside the brand; this finding rests on observed missing mechanism context and accessible naming, not a categorical header-requirement violation.
- **Technical root cause:** `src/workspace-ui.js:106` moves `.system-bar` into Controls; `src/workspace.css:70` hides its label with display:none. There is no persistent current-model control in the header.
- **Simple explanation:** closing the settings window removes the model's identity and its only selector.
- **Minimal remedy:** give the existing model chooser an explicit accessible name and preserve compact selected-mechanism context with Controls closed, potentially by moving the single chooser into a persistent context area; do not duplicate stateful selectors.
- **Gate:** every model selection is visible and changeable with Controls closed on desktop/mobile; AX names it; switching updates the existing model state exactly once. Relevant WCAG 4.1.2 concern.
- **Evidence:** `models-desktop-no-current-model.jpg`, `models-mobile-hidden-selection.jpg`; AX snapshots in the audit session.

### P2 — Clicked engineering-part material is absent from visible Inspect

- **Verified sequence:** accepted Beam target at1440×900 → click the copper extraction disc. Inspect opens with generic Electrostatic acceleration gap text: “The gap is vacuum; electrode alloys and insulators are publicly unspecified.” AX also contains figure-only “Extraction electrode” and “Assumed copper winding / electrode”, but neither specific item is visible in the screenshot.
- **Impact:** the clicked physical part is replaced by a broad conceptual category, defeating the requested material/construction inspection. The visible generic vacuum statement is especially confusing after clicking an electrode solid.
- **Technical root cause:** `src/apparatus-ui.js:19–27` writes part-specific name/materialBasis to the apparatus readout. `src/workspace-ui.js:115` moves only the Beam-target toolbar and generic `#fusion-inspector` into Inspect; unlike Models/blanket it omits the apparatus `.component-description`. The remaining figure is viewport-clipped.
- **Simple explanation:** the click creates the detailed description, but the visible window displays a different, more general description.
- **Minimal remedy:** include the selected engineering part's description in the existing Inspect content path, with generic role context secondary. Avoid another inspector or duplicated selection state.
- **Gate:** click extraction electrode, RF winding, film/backing and fitting; visible Inspect must preserve clicked name, declared material and geometry basis, also when selected by keyboard dropdown.
- **Evidence:** `marathon-picked-part-metadata.jpg`.

### P2 — Accepted geometry retains a reference-only fidelity caption

- **Verified sequence:** Marathon → Use material model → wait for Surfaces0s → expand Concept model. The caption still states “Hardware only; layer thickness exaggerated”, while accepted numerical surfaces and engineering geometry are active.
- **Impact:** users cannot determine which geometry/provenance claims apply to the shown computation. This undermines precise fidelity boundaries even though the caption is cautious.
- **Technical root cause:** `src/apparatus-ui.js:48` fills provenance from the Blender asset caption; accepted-root transition in `src/apparatus-viewer.js:58–66` changes the displayed geometry without changing that disclosure.
- **Simple explanation:** the picture changes to a computed model, but its explanatory label belongs to the earlier picture.
- **Minimal remedy:** derive the disclosure from the active geometry/result state, retaining explicit assumptions and true-scale versus exaggerated-layer distinctions.
- **Gate:** reference, pending, ready and error transitions each show the matching geometry basis and numerical-surface status. Use `/clarify` for the scoped copy/state correction.
- **Evidence:** `marathon-fidelity-caption.jpg`; source geometry reviewer independently traced the transition.

## Render continuity observations for geometry reviewer

These are verified observations with interpretation delegated to the geometry source review, not an additional wrong-dispatch P1:

1. Fresh Beam target reference is a horizontal detailed apparatus; Use material model replaces it with a vertically projected engineering assembly. It is not evidence that the wrong playground was dispatched. The parent/source review established that accepted engineering geometry is intentional; camera-up/inspection direction should explain the projection transition.
2. Reset3D at1440×900, close Inspect, resize390×844: accepted cylinder spans approximately y196–759. Open Inspect → Reset3D → close Inspect: same state now spans approximately y325–608. Screenshots `marathon-fit-wide.jpg`, `marathon-fit-narrow-before-reset.jpg`, `marathon-fit-narrow-after-reset.jpg`. Source `apparatus-viewer.js:68–82` resizes aspect only while reset recomputes distance from horizontal/vertical FOV. A minimal fix must preserve intentional user zoom/orientation while maintaining a fit after viewport/panel allocation changes; blindly resetting every resize would be disruptive.
3. Before numerical acceptance, opening Controls+Plots+Target at1440×900 clipped both ends of the horizontal Beam-target reference in the reduced center stage. Later vertical accepted geometry fit the same column. This supports testing reference and accepted roots separately.

## Positive findings and priorities

Maintain the compact apparatus-first default, independent desktop columns, one-sheet mobile adaptation, visible keyboard focus, named splitter controls, exact energy-entry focus return, and explicit previous-result status. Changing energy100→200keV immediately showed “Updating… Showing last completed scenario … source100keV,0.01A”, disabled baseline/export, and marked the plot previous-run: a good stale-result pattern.

Fix the numerical-domain defect first. Then restore mobile data/control visibility and clicked-part provenance. Finish persistent model context and geometry/caption continuity before claiming the requested UX complete. No style-only refactor or new visual framework is justified by these findings.
