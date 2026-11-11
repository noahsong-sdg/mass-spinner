# Level 1 adversarial audit — v19

7 November 2026. Independent source review; no application edits or project
execution. The implementation is changing concurrently, so findings apply to
the source identities below, not automatically to a later revision.

## Findings

### P2 — Preset state can contradict the actual electric field

Evidence: `src/main.js:290–295` sets `aria-pressed` only inside `preset()`.
`changed()` at line 58 updates readouts and invalidates results but does not
reconcile presets. `experience-ui.js:33–40` restores a shared experiment or
reset and updates level buttons, but does not reconcile orbit preset buttons.

Source-predicted reproductions:

- Click **No electric field**, then move potential to 400 V. The model receives
  400 V while **No electric field** stays pressed.
- Click **No electric field**, then **Reset this experiment**. The default
  400 V is restored while **No electric field** stays pressed.
- Open a valid Level 1 link with `voltage=0`. The initial HTML still marks
  **Separation** pressed, though the field equation gets zero potential.

Technical cause: preset selection is stored as independent mutable button state
instead of being derived from the same controls consumed by `config()`.
In plain terms, the label remembers an earlier button click after the physical
settings change. This misleads the central Level 1 field experiment and its
screen-reader state.

Smallest fix: reconcile both preset buttons when controls are restored or
changed; either mark a preset only if all of its defining settings match, or
treat the buttons as stateless actions and remove toggle semantics. Choose one
consistent meaning. Test slider edits, reset, and initial zero-potential links.

### P2 — Exposed share URL remains stale after controls change

Evidence: `experience-ui.js:50–53` exposes the generated URL and a success
message. `sync()` at lines 16–20 updates species-B output and saved controls
only. `main.js:177–193` clears stale numerical outputs but does not clear the
share field/message. Only a level entry hides the field (`experience-ui.js:44`).

Reproduction inferred directly from those handlers: copy an experiment link,
change B mass or another Level 1 control, then manually select/copy the still
exposed URL. It describes the previous settings while the visible success text
says it opens the same four settings. The copy button itself correctly reads
the current controls when clicked again; URL serialization is not the defect.

Smallest fix: invalidate or regenerate the visible share field and status when
the experiment changes, including presets. Hiding an invalidated share field
is sufficient and avoids promising automatic clipboard updates. Add a test
for edit-after-copy and preset-after-copy. A pending clipboard completion must
also avoid restoring a stale success message after such an edit/level change.

### P2 — Curve inspection is unavailable from the keyboard

Evidence: `src/laboratory.js:97–136` creates an SVG with `role="img"` and an
accessible title, but its sample readout changes only in a `pointermove`
handler at lines 128–131. No focusable sample navigator, keyboard listener or
equivalent data table exposes the computed values. `main.js:259` tells users
to hover over curves. These plots are visible in Level 1.

Axes and aggregate collector text remain readable, and the 3D canvas has arrow
and zoom keyboard handlers. However, those do not provide the curve-sample
inspection offered to pointer users. This limits a shareable playground for
keyboard and assistive-technology users.

Smallest fix: provide keyboard sample selection with a focusable, named control
and textual readout, or a compact equivalent data table. Preserve pointer
interaction. Verify the actual focus/readout path in a permitted browser;
source tests alone cannot establish screen-reader behavior.

## Traced invariants that held in this review

- Level 1 selects `rotating` before scheduling its run. Fixed source restoration
  pins 40-u A, singly charged A/B, 20-eV axial drift, 1-eV axial temperature,
  a thermal pulse, 4-cm source radius, seed 42, 96 particles per species,
  20-ns timestep and zero neutral density. Source controls are hidden by CSS.
- The four public controls map directly to `magneticT`, `voltage`,
  `perpendicularEV` and species-B `massU` in `main.js` configuration.
- Rotating mode explicitly omits the RF force in `physics.ts:204`; stale
  advanced RF values therefore cannot secretly drive this playground.
- `fields()` uses outward radial E for positive potential coefficient and
  uniform axial B. `cutoffMassU()` matches the displayed cold discriminant;
  the introduction identifies it as a guide, not finite-temperature purity.
- `readExperience()` checks version, numeric bounds and slider steps. Invalid
  recognized settings revert the whole set. Serialization drops advanced
  query parameters and fragments, and the copy action reads current controls.
- The common random source produces paired samples, with species-dependent
  velocity scaling at fixed energy. Outcomes are finite-pulse counts, not
  a steady flowing-device throughput calculation.
- Input/level invalidation aborts current run, comparison, refinement and study
  work, clears pending live timers and discards old results by revision.
  `worker-client.ts` terminates the associated worker on abort and settles its
  promise. This review found no hidden advanced collision computation in
  Level 1's live-slider path.
- The corrected species-color wording now says species B is shown in copper;
  it no longer describes arbitrary 84-u ions as elemental copper.

## Evidence checked and verification limits

Read source: `index.html`, `src/experience-ui.js`, `src/experience-state.ts`,
`src/main.js`, `src/physics.ts`, `src/worker-client.ts`, `src/view-state.ts`,
`src/laboratory.js`, the invalidation path in `src/study-ui.js`, level CSS in
`src/style.css`, `tests/experience.test.ts`
and `tests/ui-contract.test.ts`. These test files were inspected, **not run**.
The experience tests cover link round trips, stale/invalid link parsing,
advanced-to-Level-1 pinning and the button-only level selector. They do not
cover the stale preset/share or keyboard-plot paths identified above.

No dependencies, scripts, builds, numerical tests, browser automation or GPU
render were executed by this reviewer. Managed deployed-origin denial remains
in force; no alternate fetch or policy workaround was attempted. Source
reasoning supports the findings; live layout, actual browser event ordering,
clipboard permissions, responsive usability and screen-reader behavior remain
unverified. This is not independent numerical convergence qualification.

Audited SHA-256 identities:

```text
5a87e78568dd7528f056e385b8c2d0979921cdeebc8f795340d832d8c5d8c203  src/experience-ui.js
01de6a00700fb06d449729e8e73b1f4c18113a76c8cec47fd193c89a6d59a989  src/experience-state.ts
95574e968715457857627a7edd50f67877e04ddd7f281b3393e5f94ae494fd17  src/main.js
ae14e254b428efbf9be7a8fa3117ae13a8e7d12b3ca923a920ba098fe79a8d88  src/physics.ts
abcdd04add46ae935726a9f4e4c3da64ada174f95e4d7c04ca01304bbefe1c4d  src/laboratory.js
9b44d47ca80411706a9a541083cec2d87939718056d09ff7d7b6ed09090fec03  src/style.css
c072dc538d6db56fac692d984d694f2bfd2ed2e5aa47458bc3d0e1a01283425e  index.html
6a4ea90d50f6b89054af570071ee563f432d03ba39c020c8db9a0a1d4daf29f6  tests/experience.test.ts
```
