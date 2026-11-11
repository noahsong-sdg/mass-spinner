# Immersive workspace

The apparatus is the primary surface in playgrounds 01–03. The compact dock opens nonmodal Controls, Plots, Target, Inspect, View and Model info windows as applicable. Opposite-side windows can coexist on desktop; mobile uses one sheet at a time. Clicking an apparatus component opens Inspect. Running a separator or comparison opens Plots. Marathon offers separate beam-target and future-blanket scenes. Research remains recorded data, not a fabricated machine simulation.

## Execution path and design choice

`main.js` constructs the existing numerical UIs and apparatus viewers, then `setupWorkspace()` moves those same DOM nodes into the scene/window shell. `setupExperience.refresh()` explicitly informs the shell of level changes. `selectMode()` informs it of view availability. Component callbacks open Inspect without resetting the camera or numerical inputs. Existing ResizeObservers resize the same canvases to the new scene bounds.

The old scrolling hierarchy and viewport-sized CSS breakpoints caused the document appearance: a fixed-height apparatus, controls and full-width plot sections competed for the page. In simple terms, the model was one section of a webpage. The fix gives the existing model the viewport and puts existing tools around it. Moving nodes retains their event listeners, values and closed-over producer references. This is smaller and less risky than replacing validated simulation UIs, duplicating their state, or adopting a new framework for a layout change.

## Audit corrections

- **Hidden controls.** A later `display:block!important` cutoff rule could override the native hidden contract at equal specificity. In simple terms, changing models could reveal an irrelevant rotating-filter readout. One stronger shell-scoped `[hidden]` rule enforces that real domain invariant, rather than patching each model independently. A regression exercises the actual stylesheet's hidden/visible cascade.
- **Narrow panel grids.** Scan, thermal and loading grids retained desktop column counts based on the browser width, while their floating panel was narrower. In simple terms, they were still laying out for a full page. Shell-scoped single-column rules stack these controls and plots. This preserves the original producers and avoids unrelated global layout changes.
- **Empty View window.** Five Models modes have no orbital view tools, but the dock originally offered View for every mode. Availability now follows the real tools' hidden state, updated through the explicit mode-change hook. An unavailable action closes and disappears. This avoids an empty panel without inventing unsupported trajectory views.
- **Short mobile sheets.** A pure percentage height could place the sheet header behind navigation in landscape. The maximum height now also subtracts the reserved top and dock spaces. This encodes the actual available viewport rather than adding device-specific breakpoints. Native short-screen layout is still an unobserved acceptance case.
- **Duplicate inspector choices.** The old fusion layout's ancestor selector stopped applying after reparenting. The shell now keeps its component dropdown and hides the duplicate choice list and redundant disclosure heading. The inspector stays open within its already optional window.

The 3D GLBs and numerical kernels are unchanged. This is interface work, not additional scientific qualification.

## Verification boundary

`tests/workspace-v25.test.ts` constructs the actual HTML and actual Marathon, loading, thermal, geometry, blanket, apparatus-wrapper and inspector UIs in pinned JSDOM. Tests check every existing control is retained, node/event/value identity, desktop panel coexistence, mobile one-sheet state, keyboard close/focus, context switching, component-to-inspector callbacks, View availability and CSS hidden state. JSDOM is a DOM test environment: it does not establish rendered dimensions, native gestures, GPU appearance or deployed operation.

An independent source auditor checked all four levels and reported the hidden-control, panel-grid and empty-View defects above. Corrections were read back. See [acceptance matrix](LIVE-BROWSER-ACCEPTANCE-V25.md); native browser rows remain NOT RUN.

## Browser access diagnostic

The fresh supported browser attempt to acquire the existing deployed tab was explicitly denied by the effective managed origin gate. No blocked content was retrieved. No alternate browser, raw CDP, proxy, page fetch or local browser clone was used to obtain the blocked observation.

The saved exact-origin allowance is present. Standard local managed-configuration paths checked were absent. A read-only invocation of the installed official Codex binary's `app-server --print-startup-config` returned version `0.167.0-alpha.3.2` and `configRequirements.requirements: null`. That separate local process does not establish the effective desktop browser-authority policy or its source. The denial remains unresolved; neither a local settings rewrite nor a bypass is justified by this evidence.

Official diagnostic references: [Browser](https://learn.chatgpt.com/docs/browser), [managed configuration](https://learn.chatgpt.com/docs/enterprise/managed-configuration), [App Server](https://learn.chatgpt.com/docs/app-server).

Final test/build and provider deployment receipts are recorded separately with source and release hashes.
