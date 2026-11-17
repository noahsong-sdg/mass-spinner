# Motivation and menu coverage · 17 November 2026

## Evidence and root cause

Reviewed the editable guide, topic map, HTML generator, guide-action adapter,
`fuelMotionState`/`createFuelMotion`, native menu definitions, and plot producers.
The earlier guide described many mechanisms but introduced the drive before
establishing why rotation would improve a sample. Its renderer also placed
illustrations and controls before the motivating paragraph. The menus exposed
four gas views and seventeen plots without a complete reader-facing map.

Read the opening worked examples and progression in
[Naklecha's RL guide](https://naklecha.notion.site/a-reinforcement-learning-guide).
Its approach introduces a concrete task, tries a simple model, identifies an
unanswered question, and adds the next concept to resolve it. Applied that
teaching structure to the centrifuge; no RL scientific claims are used as
plasma-physics evidence.

## Fix and rationale

- One continuing task: produce a light-enriched sample and retain a useful
  share of the original light atoms. The opening integer counts are explicitly
  illustrative, not claimed simulation or experimental results.
- Reorder the argument: composition → strength of equilibrium sorting →
  electrical route to rotation → momentum over time → heat cost → finite-time
  transport and inventory cuts. Each section starts from the gap in the
  preceding model and includes a prediction to try against the native controls.
- Render the motivating paragraph before its diagram and actions. Every mapped
  section begins with prose; a regression enforces that authoring contract.
- Add a separate menu reference and six-guide reading plan to the chapter picker.
  Only 01 and 02 are available; 03–06 are clearly planned. Cover extensions
  without turning the first journey into an explanation of seventeen graphs.
- Keep same-page links in the reader. Previously the generator resolved every
  link against a GitHub source URL and opened a new tab. Fragment destinations
  now remain ordinary local anchors; they cannot operate simulator controls.
- Preserve all eight existing deep-link IDs, every native action and every
  scientific equation. No solver, worker, stored-data or export changes.

This is smaller and more reviewable than adding another onboarding framework
or changing the simulation to match a narrative. The guide uses the existing
Markdown, HTML builder and native actions.

## Scientific boundaries checked

- Coupled spin-up and Coupled separation sample the same accepted transport
  state; presentation timescale and azimuthal averaging differ. Neither menu
  choice freezes species transport or enables a different collision model.
- Equilibrium and Flow references use the uniform-inertia bulk reference's
  endpoint state, not the actual finite-time coupled endpoint. Throughput
  packets do not establish a solved open fluid flow.
- Ideal isothermal rigid-rotation formulas are conditional neutral-gas
  references; density is distinguished from composition, and the separation
  exponent from purity. A stationary vessel is not assigned the gas edge speed.
- Collision transfer cancels from total angular momentum. Ohmic and mechanical
  input, physical dissipation, signed redistribution work and numerical loss
  retain their previously audited distinctions.
- Time histories, radius profiles and hypothetical parameter scans are
  distinguished. Spatial energy assumes common local temperature; pressure
  is not an independently verified radial momentum solution.
- Inventory cuts are not outlet throughput. Cascades, pumping and D–T fuel
  inventory retain separate assumptions and do not demonstrate reactor performance.

## Verification

A stdlib comparison against the pre-edit source confirms all fifteen math
blocks are preserved byte for byte (order may differ). `git diff --check` passes.
GitHub Actions run [44201356877](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44201356877)
passed on source `01d0b00b5048fb9cf2c8b85173602da4384cda01`:

- `npm run typecheck` — passed.
- Six focused TypeScript/Node test groups — 30, 52, 16, 70, 24 and 29 passed.
  The guide group includes the native-menu coverage regression.
- `python3 -m unittest discover -s scientific/electron-applicability -p test_screen.py -v`
  — 17 passed.
- `python3 -m unittest discover -s tests -p test_argon_reference_export.py -v`
  — 3 passed.
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts` — 1,456 passed,
  zero failures, skips or cancellations.
- `npm run build`, `npm run check:site`, `npm run check:assets` — passed.
  Vite retains its existing large-chunk advisory; build succeeds.

Downloaded that run's `verified-site` artifact and checked its full source pin,
new sections, prose-before-diagram markup and main bundle
`/assets/main-CG-XH2et.js`. Retained 25 old hashed assets for already-open clients,
asserting matching names have identical bytes. No old document overwrites.
Published the verified artifact to the existing Cloudflare project, version
`25c4684f-11e6-4c59-9fd5-f8d2e1458cb3`.

Native in-app browser checks on the deployed site:

- The app loads `/assets/main-CG-XH2et.js`; the guide's source links contain
  the verified full commit. All ten stable chapter IDs render in teaching order.
- Each chapter begins with a motivating paragraph. The drive paragraph precedes
  its figure and actions. All four gas views and seventeen plots have table rows.
- Native mouse and keyboard activation of same-page links move to the reference
  and reading plan and synchronize the chapter picker. Keyboard activation also
  works inside the simulator iframe without navigating the parent.
  The automation locator's `.click()` did not activate fragment-only links;
  native accessibility clicks and Enter did. No site change was justified.
- Embedded Replay spin-up starts playback and selects the speed plot; Show
  angular momentum selects its rendered SVG plot while paused. No native
  simulator actions or solver equations were changed.
- No `.katex-error` nodes or captured browser console errors in either view.
- Standalone guide at 390 × 844: document width and scroll width both 390 px.
  Wide reference/plan tables scroll locally within 358 px tracks. At desktop,
  document width and scroll width both 1,280 px. Viewport override reset.
- Screenshots saved as `/private/tmp/mass-spinner-guide-motivation.jpg` and
  `/private/tmp/mass-spinner-guide-motivation-phone.jpg`.

This verifies the guide's rendering, links and selected native action paths,
not experimental validity of the simulator or comprehension by a novice reader.
Guides 03–06 remain explicitly planned.
Local safe-dev initialization was refused by its host-memory-pressure gate;
repository code is executed only in the isolated CI environment.
