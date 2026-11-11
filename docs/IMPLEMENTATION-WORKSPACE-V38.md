# Comparison workspace — v38

The snapshot table below records the initial comparison checkpoint. A subsequent
independent integration review expanded native ancestor details before component
focus; its exact follow-up snapshot and 42-test result are recorded in
`docs/INTEGRATION-REVIEW-V38.md`.

## Problem and traced cause

Audit R3 is a real interaction limitation: `setupWorkspace.open()` closed every
other window with the same `side`. Target, Plots and Model info all occupied the
right side, so opening neutron output necessarily hid the evolving target.
The stylesheet also placed each window absolutely with fixed side widths.
In plain terms, there was one slot per side and no way to compare two outputs.

The path checked was dock button → `open()` → native `hidden`/`aria-expanded`
state → existing relocated controls/results. No simulation nodes needed to be
rebuilt. Main's renderer already observes its stage dimensions, so reserving a
central stage follows the existing renderer resize path.

## Fix and choice

- Two desktop rails hold the original window nodes. The left rail switches
  Controls/Inspect/View; the right rail switches Plots/Model info while retaining
  Target as a separate tile. Controls, neutron output and Target can coexist.
- Both rail widths and the results/target split support pointer dragging, arrow
  keys and Home/End. Escape dismisses the active rail from a resize handle.
  Reset window layout restores geometry without changing any physical inputs.
- Open rails reserve actual scene space instead of obscuring the camera center.
  Their combined width and gutters leave at least 32% of the desktop viewport
  for the scene, subject to one-pixel integer rounding.
- Mobile retains one sheet. Resize handles leave the focus order; geometry
  reservations disappear. Native controls, handlers, IDs and input state remain
  the same objects. Focus moves off a resize handle or action when it is hidden.
- `focusRelated(panelKey, selector?)` opens an existing panel and optionally
  focuses/scrolls its existing control. Component inspectors can use this for
  Parameters/Results without duplicating controls or importing simulation state.

This bounded split meets the demonstrated comparison requirement with the
existing DOM. A general docking framework would add arbitrary window-placement
state and integration work without improving this specific three-way comparison.
No framework or package was added. Dock actions remain the window selectors;
the prototype does not claim arbitrary drag docking or baseline-run comparison.

Geometry-only persistence uses `mass-spinner.workspace-layout` with schema
version 1 (`left`, `right`, `split`). Unknown/pre-migration versions, malformed
JSON, non-numeric or out-of-range values restore default geometry. Only the
known geometry fields are admitted. Simulation inputs/results and open panels
are never saved in this preference. Unavailable browser storage disables saving
while leaving resizing usable; this is the real private/embedded-storage boundary.

## Exact tested snapshot and checks

All dependency installation and test execution took place inside the Apple
safe-dev VM for `/tmp/mass-spinner-workspace-v38` (guest source copy, no mounts).
The snapshot starts from the v36 checked export's canonical input manifest and
overlays only these five workspace implementation/test files. After the focus
edge-case edits, the host stage was explicitly synchronized with
`sync --replace-guest`; dependencies were reinstalled from the guest npm cache.

Snapshot manifest:
`/tmp/mass-spinner-workspace-v38/tested-workspace-v38.json`

SHA-256: `ff377365666fe0ff8e5ee4d7966dcd144fb4558899f4f28c116458d88c704803`

| Checked file | SHA-256 |
| --- | --- |
| `src/workspace-ui.js` | `3b500d27119dea9e5fb876de1abadcd4165e1e0156666d7019a1559195fdb05c` |
| `src/workspace-layout.js` | `920424b6a8957f7aabeb2dc725245018673cfbaa44479572d72cb12fdfbbe6d7` |
| `src/workspace.css` | `ce42bb624a1a9638fd657699ef413d94a27f6a624b3a290f000587e894549bac` |
| `tests/workspace-v25.test.ts` | `e69a1f8015cc32651de7957cafb37f35d1f1e644faf039a39f802633f5899b27` |
| `tests/workspace-layout-v38.test.ts` | `5210062304251a8b61832c2656765e644814838da23825747f4c031660dbfb8b` |

Commands and observed results:

1. `safe-dev -C /tmp/mass-spinner-workspace-v38 init` — copied isolated snapshot.
2. `safe-dev -C /tmp/mass-spinner-workspace-v38 run --online -- npm ci --ignore-scripts`
   — 54 packages installed, audit reported zero vulnerabilities.
3. Initial narrow workspace gate — 18/18 tests passed.
4. `safe-dev -C /tmp/mass-spinner-workspace-v38 sync --replace-guest` — refreshed
   snapshot after the adjacent focus fix; no valuable guest edits existed.
5. `safe-dev -C /tmp/mass-spinner-workspace-v38 run -- npm ci --offline --ignore-scripts`
   — installed from guest cache, zero network access.
6. `safe-dev -C /tmp/mass-spinner-workspace-v38 run -- node_modules/.bin/tsx --test tests/workspace-v25.test.ts tests/workspace-layout-v38.test.ts tests/marathon-integration-v35.test.ts`
   — **22/22 passed**, zero failures/skips. This covers original identity/events,
   comparison coexistence, pointer/fractional movement and release, keyboard
   resize/reset, reload and stale/corrupt storage, bounds at 741–2560 px, hidden
   control contracts, focus/Escape, level changes, mobile one-sheet behavior,
   inline header navigation and real Marathon orchestration.

The combined implementation still needs the parent's final integrated build and
typecheck. JSDOM has no layout/GPU engine: these checks establish DOM state and
geometry invariants, not measured deployed legibility or visual correctness.
Managed browser policy was not bypassed and no live/GPU verification is claimed.
