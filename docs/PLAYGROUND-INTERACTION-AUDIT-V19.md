# Adversarial interaction audit — v19

7 November 2026. Independent cross-level source review. Application code is
read-only for this reviewer. This records the original findings, checked
repairs and final source review. Executed-check snapshots are distinguished
from subsequent presentation-only source review below.

## Findings

**P2 — hiding the apparatus produces a nonfinite camera projection.**
`src/main.js:135–138` observes the stage and assigns `width/height` directly to
`camera.aspect`. Levels 2 and 4 set its workspace ancestor to `display:none`,
which makes the stage 0×0. Thus a normal level transition or a deep link into
a hidden-apparatus level can cause `camera.aspect = 0/0 = NaN`. The one-time
initial size is clamped; the actual observer callback is not. Simply, hiding
the apparatus is treated as resizing it into a valid camera with zero height.
Ignore nonpositive dimensions in that callback, retaining its last valid size.
That enforces the real rendering boundary without inventing a replacement
aspect or changing physical state. Rendering the hidden zero-size canvas or
guessing an arbitrary ratio is unnecessary. Browser impact beyond the invalid
camera state remains unobserved.

**P2 — exact plotted output is available only to pointer users.**
`src/laboratory.js:97–134` generates each chart as an SVG with `role="img"`
and an axis-label description. Its computed-sample inspector exists only in
`pointermove`; there is no focus target, keyboard handler or data table.
Keyboard users can change the physical controls but cannot inspect the exact
sample response that pointer users can read. Add shared chart sample navigation
or a tabular alternative in `renderPlots`, rather than per-level fixes. A shared
focus/Arrow/Home/End path can reuse the existing sample selection and readout;
make those instructions and announced values accessible. The smallest coherent
fix should preserve every existing numerical sample.

**P3 — preset buttons retain stale pressed-state semantics.**
`src/main.js:290–295` updates `aria-pressed` only when invoking the Separation
or No electric field command. Adjusting voltage afterward never clears it.
For example, No electric field remains pressed after voltage is raised above
zero. These are commands that load several inputs, not reliable persistent
selection states. Remove their pressed semantics or derive a full current-input
match in the existing readout update. Do not suppress ordinary input events.
This is a concrete source-level state inconsistency, not a claim that the
underlying field calculation uses the wrong voltage.

## Checked adjacent invariants

- Level navigation is bound to `button[data-level]`; the body no longer receives
  a level-entry click listener.
- A level change invokes the actual invalidation path. That clears the live
  timer, aborts run/comparison/refinement and study controllers, increments the
  result revision and clears exportable separator output.
- Worker-client abort terminates the worker and rejects its promise. Results
  are revision-checked; stale runs do not overwrite current separator output.
- Level 1 restores the full pinned source/species/collision/resolution inputs
  before selecting the rotating model; versioned links contain four bounded
  settings rather than leaking hidden advanced settings.
- Continuous orbital GPU rendering skips Levels 2 and 4. Initial GPU and beam
  calculation still occur; no offline Julia, PETSc or WarpX job is started.
- CSS hides inactive sections with `display:none`; their ordinary controls
  are removed from the focus/accessibility tree by the browser's normal rule.
- The canvas itself has keyboard orbit/zoom controls and visible focus styling.

## Evidence and limits

Read the actual experience controller, main event/cancellation paths,
study controller, worker client, model selectors, SVG renderer, HTML and CSS.
Existing tests were inspected, not adopted as independently executed results.
The 268-test v18 gate is parent evidence, not this reviewer's execution.

Initial reviewed source SHA256:

| File | SHA256 |
| --- | --- |
| `src/main.js` | `95574e968715457857627a7edd50f67877e04ddd7f281b3393e5f94ae494fd17` |
| `src/laboratory.js` | `abcdd04add46ae935726a9f4e4c3da64ada174f95e4d7c04ca01304bbefe1c4d` |
| `src/experience-ui.js` | `5a87e78568dd7528f056e385b8c2d0979921cdeebc8f795340d832d8c5d8c203` |
| `src/study-ui.js` | `60798ed63b4a1a9fb52dcdb498de59474ddacd462abab1d4764a5c3e21d38fa8` |

Independent source-unit probes are retained in
[`scientific/interaction-audit-v19`](../scientific/interaction-audit-v19/README.md).
The separate safe-dev guest ran four checks: all passed. They execute the
archived v18 code to reproduce both P2 findings and the captured patched code
to check the repairs. The resize check preserves the previous valid camera
through hidden → 640×480 → hidden states. Chart inspection starts at the
selected sample, reaches both endpoints, bounds Arrow navigation and does not
prevent Tab. The original and patched data samples are unchanged.

The first attempted probes expected the original defects, but the source copy
raced the parent's patches and already contained both fixes. Both expectations
failed (0/2); that stale-probe attempt and its actual observation file are
retained. This was not an application regression. The corrected independent
check separates frozen v18 and patched source explicitly rather than changing
the acceptance condition until a run happens to pass.

These checks do not open a browser, fetch the deployed origin or use a GPU.
Live origin access is denied by managed policy; no alternate browser,
CDP, Playwright or indirect-fetch workaround was attempted. Rendered appearance,
native focus/resize timing and screen-reader announcements require later browser
verification. Final application checks and review of the actual final source
remain necessary.

Captured repaired component SHA256:

- `src/main.js`: `4e0c1c8b36938c977ccbea1ab6e5c05427c2a7469356e949a48692c36aa30b31`.
- `src/laboratory.js`: `3be385f795bfde7bb487818fda1abd27215c26caa48dfce366ab05d764574ce8`.

## Final playground review

The final source pass covered `index.html`, `style.css`, `fusion-ui.js`,
`fusion-playground.ts`, `research-ui.js`, the experience controller and the
main/laboratory/limitations changes. Presets now use command semantics, fixing
P3 without introducing a second inferred input-selection state. Level 2 places
the apparatus, controls and computed plots ahead of optional explanation;
lesson cards and lesson-progress scaffolding are removed.

**Additional P2 found and repaired — stale physical glyphs after an error.**
The Level 2 catch path cleared readouts, plots and export but left the previous
beam and neutron glyphs visible. Technically, only part of the output DOM was
invalidated; simply, the drawing could still show a successful previous case
while the numbers reported failure. The parent now hides both glyph groups in
that catch path. A valid update restores them from current input and output.
This extends the existing output invalidation boundary rather than manufacturing
replacement physics or allowing a stale drawing to impersonate current output.

Independent final guest commands:

    node --import tsx --test audit.test.ts ui-final.test.ts
    node check-final.mjs

All **7/7 source-unit checks passed**. Alongside the four original/repair checks,
the final checks exercise actual beam/tritium off/on control handlers, retained
slider values and disabled states, output glyph visibility, invalid-input
clearing and recovery; all three research cases and all 63 saved tensor states;
and removal of lesson/pressed-preset markup. Research replay selects exact saved
states, resets time on case change and displays its WITHHELD qualification.
It remains a recording viewer, not a live collision solver or distribution
reconstruction.

All **13 captured JavaScript modules passed `node --check`**. An isolated Vite
8.3.6 build importing the exact stylesheet passed CSS parsing/minification
(3 modules); this is not a rendered-layout or color-contrast measurement.
Actual logs and probes are in `final-checks/`. That checked source map SHA256 is
`51eeaecc820a375e8dd338e0d201db5628e7d4f08ea2025a5d15bde5fda886da`.
Deletion of the subsequently unused `marathon-lessons.ts` does not change the
runtime imports checked here.

After those executed checks, the parent wrapped the unchanged `#method-guide`
section in native `<details class="method-guide-panel">`, with summary
“Mechanism, tradeoffs & model assumptions”. A subsequent read-only source check
confirmed `renderMethodGuide` still replaces only that section's children, so
it cannot delete the outer summary. The outer wrapper is hidden outside Level
3. This presentation-only index/CSS revision is retained separately under
`final-wrapper-source/`; the executed CSS check above predates it. The parent
is rerunning the full application gate on the latest snapshot.

No further blocking source-level interaction finding was identified in these
paths. Full application tests, typecheck and build are separate parent evidence;
this report does not approve their unobserved outcome. Native browser effects,
screen-reader behavior, deployed appearance and GPU output remain unverified.
