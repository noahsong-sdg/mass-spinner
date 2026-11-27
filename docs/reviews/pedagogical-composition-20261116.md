# Composition and linked inspection

This change completes five pedagogical gaps: local composition percentages,
visible assumptions, controlled comparisons, tested-input coverage, and a radial
probe shared by the plot and 3D apparatus. It does not qualify a Marathon device.

## Execution path and fixes

| Problem and technical cause | Plain explanation | Fix and choice |
| --- | --- | --- |
| Species density curves normalize each species separately, so their heights are not local percentages. | Density and composition answer different questions. | Add a composition plot using the existing scene sampler: `x nL / (x nL + (1-x) nH)`. Retain the density plot. Sharing the sampler avoids a competing physics implementation. |
| 3D sampling was transient hover state without a retained plot radius. | Moving away lost the connection between gas and graph. | Share a normalized current-vessel probe, physical centimetre cursor, exact percentage output and 3D ring; support click, keyboard, slider and precise entry. Keep it display-only. |
| Pinned vessels can have different radii. Applying the same normalized radius marks different physical positions. | Two rings could disagree with one graph cursor. | Synchronize A/B probes in metres; clamp at a smaller vessel's wall and disclose that the selected radius lies outside it. Never evaluate outside the physical domain. |
| Generic plot readouts select a nearby display point; finite-volume fields are cell averages with jumps. Metre/centimetre conversion can move an exact edge by floating-point roundoff. | A nearby graph label could contradict the actual cell probe. | Show the exact shared-sampler output instead; preserve step curves and use a bounded, right-continuous cell-edge convention. No solver distribution is smoothed or changed. |
| Changing drive current also changes rotation and dissipation, confounding temperature comparisons. | Several causes changed at once. | Add explicitly conditional isothermal equilibrium comparisons at fixed sampled rotation or temperature, plus collection-radius purity/recovery. Use existing stable Boltzmann PDF/CDF functions; do not modify or rerun the accepted drive. |
| Playback advances between throttled plot redraws. | A comparison could use a slightly older time than the displayed clock. | Refresh the current diagnostic state when pausing for comparison; regress the off-redraw-time case. |
| Scope was separated from results, and animation mode can differ from the source of a thermal endpoint plot. | A reference could look like an evolving prediction, or vice versa. | Label the actual plotted calculation: evolving/reference, fixed/evolving temperature, inventory/scenario. Thermal endpoint profiles retain trajectory scope. |
| Historical qualification covers three input nodes, not arbitrary slider values. Pending controls are not an accepted result. | A nearby setting is not automatically tested. | Reuse the authoritative `publicInputCoverage` result, disclose exact screened inputs and limitations, and clear claims/comparisons during pending or failed runs. |
| Chromium serializes native range coordinates to roughly 15 significant digits. Decoding untouched logarithmic coordinates perturbed physical defaults beyond the strict historical-input equality tolerance. | Untouched defaults appeared exploratory. | Retain each declared physical log default while its native serialized coordinate is unchanged; decode changed coordinates normally. A native-serialization regression checks exact worker defaults and changed/reset values. Preserve the authoritative coverage tolerance and legacy classification. |

Null composition means no **resolved** local density; it does not establish that
there are physically no particles. This matters when equilibrium densities
underflow numerically at extreme centrifugal bias.

## Scientific boundary

Composition is a local **number** fraction. Transport arrays are separately
normalized species inventories, not isotope mass fractions. Closed-wall inventory
cuts are not extraction-flow predictions. Comparisons are equilibrium references,
not new coupled trajectories. Spatial-temperature comparisons explicitly replace
the temperature field with its accepted gas mean.

The historical input screen is the default lithium configuration at 0.015,
0.03 and 0.06 A, fixed temperature, no current switches, 64 cells, 512 nominal
intervals and 1 s. Matching one of these nodes does not independently refine the
new run or certify local composition, experimental accuracy, or the slider range.

## Verification

Independent reviewers supplied Boltzmann/inventory oracle tests and UI coverage
tests, and checked the final execution paths. Regression coverage includes pure
feeds, empty cells, cell boundaries, stale legacy metadata, pending/failing runs,
different pinned radii, off-redraw playback time, thermal endpoint scope and
unchanged accepted inputs/source identity.

Checks run in an isolated safe-dev source copy, with no host project-code execution:

- Full TypeScript suite: sorted `tests/*.test.ts`, batches of 25 files, using
  `NODE_OPTIONS=--max-old-space-size=512 node --import tsx --test --test-concurrency=1`.
  Final revision: **1,384 passed**, zero failures/skips/cancellations.
  The cap forces earlier garbage collection; initial unrestricted runs exhausted
  the 2 GiB guest. No tests were omitted and no scientific gates were relaxed.
- Final affected-path run: the integration, learning, centrifuge UI, operation UI,
  precise-control and public-sensitivity suites: **80 passed**, zero skipped.
- `python3 -m unittest discover -s scientific/electron-applicability -p test_screen.py -v`:
  **17 passed**.
- `python3 -m unittest discover -s tests -p test_argon_reference_export.py -v`:
  **3 passed** after restoring the exact original evidence archive to the isolated
  source copy. The initial lightweight copy omitted this archive.
- `npm run typecheck`, `npm run build`, `npm run check:site`,
  `npm run check:assets`, and `git diff --check`: **passed**.

One old display-clock assertion required bitwise equality at the exact 2× packet
sampling boundary. Reading the exact default pump rate rather than its logarithmic
round trip changes that arithmetic by one ULP. The assertion now permits eight
machine epsilons of relative roundoff; the production sampling cap, extreme-pump
inequalities, input-coverage tolerance and scientific convergence gates are
unchanged. The UI reviewer independently checked this distinction.

Browser checks on the built revision: native default inputs match the screened
node, axis/wall keyboard selections, actual 3D gas picking, precise radius entry,
all three comparisons, changed-temperature recomputation, stale-comparison clearing,
fixed/evolving thermal labels and zero captured browser warnings/errors.
At 390 × 844, no horizontal page overflow was observed; comparison buttons were
108 × 45 CSS pixels and the scrollable plot window remained usable.

The build retains its existing large-main-chunk warning (about 1.19 MB minified).
Passing these checks establishes implementation behavior within the stated model,
not experimental accuracy.

## Deployment

Published to [Mass Spinner](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/?level=2),
Cloudflare version `580e0968-7dcd-4dc1-b85c-3f33e40c26c1`.
The vendor CLI published the isolated build's static assets, with superseded
intermediate bundles removed from the disposable release artifact. No additional
project code ran on the host for deployment.

Reopened the deployed site and checked all three comparisons, axis selection,
actual gas picking (8.242 cm at 1 s), precise radius entry (7.2 cm), mobile
comparison access and changed-temperature recomputation/coverage/stale-plot clearing.
No captured browser warnings or errors; 390 px page width at a 390 px viewport.
The separate terminal HTTP checksum check returned 403 before reading the HTML;
byte-for-byte HTTP matching was **not verified**. The deployed behavior and
rendering were verified through the browser. Independent physics/UI reviewers
reported no remaining actionable issues in the inspected changes, explicitly
limiting their signoff to the pedagogical interface and conditional semantics.
