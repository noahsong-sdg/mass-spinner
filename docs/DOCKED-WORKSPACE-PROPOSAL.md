# Docked workspace proposal

Status: design evaluation grounded in current source. Not implemented or verified in a native browser. Existing deployed browser authorization remains unresolved.

## Direction

A compact scientific instrument workspace: the 3D apparatus remains central, with tabbed sidebars and a tiled plot tray. Dark opaque surfaces, thin separators, restrained copper selection marks and compact typography. The apparatus supplies the visual character; the surrounding controls stay quiet.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Mass Spinner   [playground ▾]              Run / Pause   Reset   Share     │
├───┬────────────────┬───────────────────────────────────┬───────────────────┤
│   │ Parameters    ×│                                   │ Selection       × │
│ P │ [Main|Advanced]│                                   │ Target            │
│   │                │          INTERACTIVE 3D           │ Material          │
│ C │ Energy   100 keV│                                   │ Role              │
│   │ ━━━━━●━━━━━━━━ │                                   │ [Focus] [Isolate] │
│ V │ Current   1 mA │                                   │                   │
│   │ ━━━●━━━━━━━━━━ │                                   │                   │
│   │                ├───────────────────────────────────┤                   │
│   │                │ [Response] [Loading] [+]     ⛶  ×  │                   │
│   │                ├─────────────────┬─────────────────┤                   │
│   │                │ Output vs input │ Loading vs time │                   │
│   │                │                 │                 │                   │
├───┴────────────────┴─────────────────┴─────────────────┴───────────────────┤
│ Ready / calculating / stale inputs       Model status             Time    │
└────────────────────────────────────────────────────────────────────────────┘
```

This depicts available regions, not a requirement to open them all. Default: parameter sidebar and one useful plot visible; inspector closed until a component is selected. Collapsed regions become small edge tabs. Desktop widths begin around 280 px left and 300 px right, with a 220–280 px plot tray; actual minima must be checked in the browser.

## Source-grounded critique

1. `setupWorkspace.open()` closes any other panel on the same side. Controls, Inspect and View share the left side; Plots, Target and Model info share the right. Selecting a part therefore displaces parameter controls, while target analysis competes with other plots. Stable regions with tabs resolve this conflict.
2. `.world-window` and `.world-stage` use absolute positioning. Windows cover the apparatus instead of allocating it a smaller visible canvas. Docked grid regions make the remaining scene rectangle explicit. Existing renderer ResizeObservers can respond to real container changes; aspect ratio, picking and camera framing still require runtime checks.
3. `.world-window .live-plots` forces one column. Marathon's Plots group combines readouts, response, geometry and ledger; Target combines exposure and loading. This creates scrolling and hides causal comparisons. Named plot tabs plus an optional two-tile split make chosen outputs visible together.
4. The bottom dock gives six tools equal visual weight. Parameters, component inspection and evidence have different roles and frequencies. A small activity rail, contextual inspector and optional model-information tab provide a clearer hierarchy.

The current design has useful foundations: one persistent 3D scene, reused live control nodes and keyboard-aware panel dismissal. Preserve those state and interaction guarantees.

## Interaction decisions

- Left rail: Parameters, Components and View, each with a text tooltip and accessible label. One sidebar tab at a time; allow collapse and width adjustment.
- Right sidebar: selected component, material and role. Selection in 3D highlights the corresponding component entry. Inspection preserves parameters, plots and camera. Focus/isolate controls need explicit state and a clear restore action.
- Plot tray: meaningful named tabs, at most two visible plot tiles by default. Add, replace, split, maximize and close through buttons; dragging is optional. Keep axis titles, units and legends visible.
- Splitters: pointer and keyboard operation, minimum sizes and a reset layout action. Resizing must stop at usable canvas/plot widths rather than crushing all panes together.
- Double-clicking a plot tab maximizes/restores that plot; a visible maximize button provides the same action. Escape restores a maximized view, then dismisses the active transient surface.
- Compact controls: label, editable numeric value and unit on one row; slider below. Advanced parameters stay in a disclosure. Values retain their existing physical ranges and validation.
- Execution state: distinguish changed inputs from last computed results. Show a compact calculating/stale/error state beside plot tabs; never present old curves as current. Slider input can preview immediately while expensive computation follows the existing solver's execution contract.
- Comparisons: pin a completed result with its parameters and units, then overlay a new compatible run. Share axis cursors only for plots with compatible independent variables. This is a separate feature after basic docking.
- Model information: compact persistent qualification indicator with details on demand. Distinguish specified materials from illustrative or inferred materials in the inspector. Reduce prose without erasing scientific provenance.
- Navigation: one playground selector and short tool labels; remove repeated page/section headings and introductory subtext.
- Visual treatment: flat warm charcoal surfaces, modest corner radii, clear active tabs and fine dividers. Use color consistently for species, selection and physical status. Avoid decorative plot effects or animations that imply uncomputed physics.

## Responsive behavior

Wide screens support both sidebars and the plot tray. Before minimum plot/canvas sizes are violated, collapse the right sidebar to a tab. On narrow screens use a 3D view with a single selectable Parameters / Plots / Inspect sheet. A full-height plot view is available for detailed reading. Keep all parameters, inspection and plots reachable through buttons; no hover-only or drag-only interactions. Preserve touch targets, safe areas and visible close/restore controls.

## Reviewable implementation order

1. Replace absolute overlay placement with docked grid regions and side tabs; reuse existing controls and viewer nodes. Add keyboard-accessible splitters and reset. Preserve one-sheet mobile behavior. Keep this layout change separate from physics and chart-feature changes.
2. Divide the existing output groups into named plot tabs and allow two tiles. Preserve plot producers and numeric state. Make stale/current result status explicit where the execution path supports it.
3. Connect component selection, inspector and scene focus/isolation; add pinned run comparison as a separate feature. Persist only validated layout preferences, with versioned defaults and reset.

A framework migration is not required for the layout: CSS Grid and a small region/tab controller fit the existing vanilla JavaScript and persistent DOM ownership. A general docking library warrants evaluation only if arbitrary pane rearrangement becomes a demonstrated requirement.

## Acceptance gates

- Opening Inspect leaves parameters and selected plots available; closing panels preserves values, results and camera.
- Every original control exists once and still reaches its original producer.
- Dock resizing updates canvas aspect ratio, pointer picking and plot dimensions; hidden-to-visible transitions render correctly.
- Numerical result identity and units survive tab switches, region resizing and playground/context changes.
- Keyboard users can select tabs, adjust splitters, restore focus and reset layout. Touch users can perform all essential actions without dragging.
- Test default, all-open, collapsed, maximized and reset states at narrow portrait, short landscape, laptop and wide desktop sizes. Invalid/stale saved layout data returns to valid defaults.
- Native deployed GPU, controls, charts and touch layout require actual browser access. DOM tests alone do not establish these results.
