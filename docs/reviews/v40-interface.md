# Interface audit, v40

2026-11-09. Read-only application review. This report does not claim a live browser, GPU, touch or pixel-layout pass. The browser policy blocks the deployed origin and expressly prohibits alternate browser paths. Production source paths and a minimal jsdom witness are the evidence below; root owns execution of that witness in safe-dev.

## Anti-pattern verdict

No honest visual pass/fail is available without seeing the running composition. Source implements the requested restrained, dark apparatus workspace: compact navigation, independently opened nonmodal windows, progressive disclosure, and no repeated lesson framing. Translucent floating panels alone are not a material defect. The two issues below concern broken user workflows, not taste.

## Findings

### P1: The default playground opens an empty component inspector

- Location: `src/workspace-ui.js:109–110`, `src/experience-ui.js:38`, `src/main.js:94–98`.
- Problem: In Mass Spinner (level 1), clicking a component opens Inspect but hides its useful description. The component dropdown, reset-view and focus-view buttons are hidden with it. This removes the keyboard alternative to component picking and makes recovering an awkward camera unnecessarily difficult.
- Technical cause: Workspace construction moves the rendered separator's `.apparatus-toolbar` and `.component-description` into `.model-inspect`, a group whose allowed levels are only `['3']`. Level 1 now defaults to the same rendered separator. The alternate `#separator-inspector` is explicitly hidden in render view. Both candidate descriptions are therefore unavailable.
- Simple cause: The new basic playground uses the detailed viewer, but its inspector is still restricted to the advanced playground.
- Reproduce: Open level 1, remain in its default render view, click a coil, then inspect the left panel. Production `setupApparatus.select('coils')` creates the description and opens the panel, while its `.world-group` ancestor remains hidden. The two controls in the same toolbar are similarly unreachable.
- Minimal recommendation: Allow the rendered inspector group in levels 1 and 3. Preserve the hidden alternate inspector for the old orbit/hardware renderer. Test actual description/toolbar reachability in both contexts and at the mobile breakpoint.
- Why this fix: Both levels intentionally use the same viewer; changing the existing group's level eligibility reuses its complete state and event handlers. Creating another inspector would duplicate selection and camera state; reverting level 1 to the old renderer would defeat the requested geometry integration.
- Category: functional/accessibility. Severity high because it breaks an expressly requested core interaction in the first playground. No specific WCAG conformance conclusion is asserted from source alone.

### P2: Rendered separator components lose Parameters and Results shortcuts

- Location: `src/main.js:79–81`, `src/workspace-ui.js:110`, `src/component-actions.js:20–24`.
- Problem: Even in Models (level 3), rendered components cannot offer the promised direct connection to their parameter and result windows.
- Technical cause: `inspectComponent` queries `#model-apparatus .component-description`. Workspace construction has already moved that exact description outside `#model-apparatus` into the Inspect rail. The query returns `null`; `appendComponentActions` explicitly returns without adding the two buttons. Visible selection/material text can still work, masking the missing integration.
- Simple cause: The description moved, but the shortcut code still looks in its old location.
- Reproduce: In level 3 render view select coils. The populated description lives under `#window-inspect`, the old selector matches nothing, and no `.component-actions` bar is attached. This applies to all rendered separator modes; the separate Marathon inspector retains its own descendant selector and is not implicated by this finding.
- Minimal recommendation: Expose or retain a direct reference to the apparatus description and use it in `inspectComponent`. Add a production-shaped test that runs workspace reparenting, selects a rendered component and activates both buttons to assert destination panel, expanded ancestor details and input focus.
- Why this fix: A retained DOM reference survives the intended reparenting and identifies the correct viewer. A broader `.component-description` query is ambiguous because several live playgrounds own descriptions; duplicate markup would require synchronizing another state holder.
- Category: functional navigation. Severity medium: manual Controls and Plots navigation still works.

## Evidence and test gap

`docs/reviews/v40-interface-repro.test.ts` contains two audit witnesses. Their assertions intentionally prove the current defects; a pass must not be presented as correct product behavior. Root copied this exact file into `audit-tests/v40-interface-repro.test.ts` in the preserved safe-dev source (SHA-256 `ad9369e551e2d85289ed37f42cdac2e02651192d48b4aaf54b80d47e7d3a38f6`). Both witnesses freshly passed: **2/2 defects confirmed**. Root also reran the existing suite: **821/821 passed in 21.58 s**, demonstrating the integration coverage gap rather than disproving either defect. No application edits were made by this review.

The existing `tests/workspace-v25.test.ts:39–48` checks that controls remain under the workspace and retain event identity; that does not establish whether their level-specific ancestors are visible. Existing component-action tests exercise destination selection and focus helpers separately; they do not execute the stale main-entrypoint selector after reparenting.

## Positive findings

- Windows reuse original inputs rather than rebuilding solver controls. This preserves event handlers and input identity.
- Window dismissal restores focus, hidden resize handles relinquish focus, and desktop separators support keyboard bounds and increments (`workspace-ui.js:38–78`).
- Mobile mode allows one open sheet at a time and removes desktop scene-width reservations (`workspace-ui.js:79–84,136`; `workspace.css:95–105`). This is implementation evidence, not a mobile visual acceptance pass.
- Target tabs implement roving focus and arrow/Home/End navigation (`coupled-target-ui.js:12–22,106`).
- Plots expose keyboard sample inspection, explicit units, responsive SVG geometry and live value readouts (`laboratory.js:119–228`).
- Exact-value editors reject out-of-domain values before emitting model input events (`precise-controls.js:26–31`).
- Reduced motion disables window entrance animation (`workspace.css:106`).

## Remaining verification boundary

All four playgrounds still require a real deployed-browser acceptance matrix: each model's default camera, actual WebGL shader output/depth precision, picking, sliders, plot inspection, window resizing, narrow mobile layout, touch orbit/zoom and browser zoom. Source inspection and jsdom do not establish GPU appearance, touch hit targets or pixel overflow. Prior offline Blender images are evidence of exported geometry, not screenshots of the interactive browser composition.

Fix the two integration defects first, then perform that acceptance matrix when browser origin access is available. A mobile aesthetic verdict or numeric performance grade would currently be speculation.
