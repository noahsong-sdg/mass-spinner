# Drive guide visualization

The previous end view required a beginner to mentally construct the cylinder,
infer torque from one force arrow, and imagine how ions transfer rotation to
neutral gas. The prose and ASCII chain repeated the mechanism without showing it.

Execution path: `understandingPage` inserts `guideDiagram('drive')`; the build
publishes the reader and stylesheet; `setupGuideReader` enhances the figure in
both standalone and iframe views. Embedded links still dispatch the existing
same-origin, allowlisted parent actions. Numerical simulation code is unchanged.

## Changes and rationale

- Place a perspective cylinder beside its end view. Label stationary electrodes
  and the gas-filled gap. This establishes the geometry before the force law.
- Separate current, ion rotation and neutral entrainment into three selectable
  stages. Keep an explicit pause control and start paused for reduced motion.
- Draw inward conventional current with an axial field toward the viewer. All
  four force arrows and animated groups give counterclockwise rotation. The
  perspective field arrow follows the axis through both cylinder-face centers.
- Give each current/force path its own arrowhead. Native browser inspection
  exposed that a marker on a path with multiple subpaths appeared only on its
  final segment. Separate paths fix the actual SVG rendering semantics.
- Use hollow ion markers and filled neutral markers, matching the live 3D view.
  Label both explicitly; the diagram does not encode isotope composition.
- Stack the views on narrow screens and retain enough cylinder height for labels.
  Replace the ASCII chain with a short description of the visible sequence.

SVG with CSS animation is sufficient for this explanatory geometry: it scales
with the reader, remains accessible as a static figure, and adds no graphics
dependency or duplicate physical solver. The existing interactive 3D apparatus
remains available through the guide links.

The motion is illustrative bulk rotation, with arbitrary slowed animation rates.
It is neither a live simulation result nor microscopic charged-particle orbits.
The staged neutral entrainment is conceptual, not a solved collision transient.

## Verification

Release source: `60515516cc4fea9b90cd05c2a160dac902863b99`.
CI [44186899581](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44186899581)
passed for this exact source in the offline, memory-limited verification container:

- `npm run typecheck` (application and contract TypeScript configurations).
- Focused guide/integration groups and the complete `tests/*.test.ts` suite:
  1,446 passed, zero failed; the guide-page file contains eight tests.
- Python electron-applicability and argon-export suites: 17 + 3 passed.
- `npm run build`, `npm run check:site`, `npm run check:assets`.
- `git diff --check HEAD~4 HEAD` passed on the host.

The final local source refresh was blocked by safe-dev's host-memory admission
check; it was not bypassed. CI independently tested and built the final source.

Cloudflare version: `0ed8603a-b04a-46cb-b2ef-80071a91bfec`.
The published guide links to the exact release source above. Twelve previous
hashed assets were retained unchanged so existing tabs can still load their chunks.

Native in-app browser checks on the public deployment:

- Desktop cylinder/end-view layout and all eight arrowheads inspected visually.
- Current: both groups paused, forces hidden. Ions: ions moving, neutrals paused.
  Gas: both moving. Exactly one stage selected in each case; captions update.
- Pause stops both groups; resume restores motion. Computed transform matrices
  changed between observations, confirming actual animation rather than styling alone.
- Standalone layouts at 390 and 320 CSS pixels stack the views without horizontal
  overflow. Cylinder, force, field and particle-key labels inspected visually.
- Embedded reader at 298 CSS pixels has no horizontal overflow. Its stage button
  works; Show gas & drive opens the gas view; Adjust current opens Controls and
  focuses the visible `fuel-currentA` slider on the deployed desktop app.
- No new console errors on the deployed guide or app during these checks. The
  reused preview tab retained one earlier local-preview MutationObserver error;
  it did not recur in the public checks. Browser viewport override was reset.

Evidence saved locally as `/private/tmp/mass-spinner-drive-browser-verification.json`
and `mass-spinner-drive-deployed-{desktop,mobile}.jpg` in the same directory.
These are browser checks of this guide change, not experimental physics validation.
