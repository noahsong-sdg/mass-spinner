# Code and performance audit — 24 November 2026

## Scope and result

This audit covers rendering, workers, UI state, plots, memory use, startup, and repository structure.
Four independent agents reviewed these areas. The primary agent checked the strongest findings and reproduced two UI defects.
This review changes no production code. The findings below describe proposed changes.

- Reviewed HEAD: `fc9bbbb13c2277828e526e57e6398c60f71abf68`.
- Live runtime source: `9bc86a851ff60b531f1174749de0527fd8f180cc`.
- HEAD adds documentation to that runtime source.
- Live site: <https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev>.

The largest confirmed costs come from repeated display calculations and copied geometry.
They do not require a new framework or a different physics solver.
No unbounded memory leak was established.
Two live defects remain: Composition loses keyboard focus, and exact-value controls retain obsolete limits.

“Collapse now” means remove repeated work within its current owner.
“Move next” means change an ownership boundary in a separate patch.
“Keep for now” means retain a useful boundary or defer an unmeasured risk.

## Execution paths and owners

| Path | Current owner | Boundary that matters |
| --- | --- | --- |
| Controls → request → worker → accepted result | `fuel-centrifuge-ui.ts`, `worker-client.ts` | A revision rejects an obsolete result. Abort terminates its worker. |
| Accepted result → physical time → transport sample → geometry | `fuel-motion.ts`, `fuel-transport.ts` | Display time must select the same accepted physical state. |
| Transport sample → field samples → rings and gas volumes | `fuel-scene-tools.ts`, `fuel-field.ts` | Field values must retain the solver's cellwise density. |
| Plot selection → probe → playback → plot construction | `laboratory.ts`, `fuel-centrifuge-ui.ts` | A probe change must preserve the focused plot. |
| View selection → clipping and materials → frame | `fuel-view-ui.ts`, `apparatus-viewer.ts` | Display changes must not change the physical result. |
| Scenario restore → controls → feature startup | `experience-ui.ts`, `main.ts` | Shared links need controls before restored values can be applied. |
| Pin → cloned result → second apparatus | `fuel-experiments.ts`, `fuel-assembly.ts` | Each apparatus must own the resources that it can change or dispose. |

## Measurements

The primary agent ran a temporary TypeScript harness in safe-dev with 1 GiB of guest memory.
The guest used Node 26.13.1 on Linux ARM64.
The tested source hashes matched the host source.
The harness used default lithium inputs, a one-second isothermal operation, and 512 nominal steps.
Both cases retained 946 checkpoints and 87 snapshots.

Each timed operation had 30 warm-up calls and 180 measured calls, except full-result cloning, which had ten measured calls.
The table gives mean / 95th-percentile time in milliseconds.

| Operation | 64 cells | 256 cells |
| --- | ---: | ---: |
| One transport sample | 0.0307 / 0.0382 | 0.0442 / 0.0557 |
| One motion update | 0.4110 / 0.5755 | 1.0922 / 1.1565 |
| Current pair of motion updates | 0.6652 / 0.7474 | 1.9682 / 2.0480 |
| Three field samples per cell | 0.1186 / 0.3006 | 1.1292 / 1.1690 |
| Clone the complete result | 8.9955 / 9.2045 | 33.9603 / 44.7326 |

One solve took 45.19 ms at 64 cells and 127.32 ms at 256 cells.
These are single solve observations, not statistical latency estimates.
Serialized result sizes were 5,371,070 and 14,545,321 UTF-8 bytes.
These sizes are not JavaScript heap measurements.

These measurements exclude the browser, DOM, GPU, and spatial thermal preset.
They establish calculation costs, not frame rates or expected speed gains.
The order of execution and runtime compilation can affect these small timings.

The retained harness and raw output are in [code-performance-20261124](code-performance-20261124/).
The harness records the tested calls. It was executed from `output/` in the isolated project.

## Collapse now

### 1. Remove the duplicate motion update

**Impact:** High repeated CPU and allocation cost. Source-confirmed and measured.

**Problem and cause:** `animateGas()` calls `motion.update()` first for clocks, then again for the final physical time.
A visible transient update makes 21 transport samples, including trail history.
An interior transport sample builds two full snapshots with profiles, species distributions, and energy totals.
The current pair therefore makes 42 samples per apparatus before other diagnostics.

In simple terms, the code rebuilds the picture to ask how fast its clock should move.

**Fix:** Read the clocks without updating geometry. Update motion once at the selected time.
Reuse each sampled state for its speed, phase, and species distribution.
This removes repeated work without changing the accepted result or reducing trail quality.
A global result cache would add ownership and invalidation problems that this fix does not need.

**Required checks:** Compare positions, integrated phases, radii, direction, rewind, and pinned timing.
Add a sampler-call regression test.
Preserve event interpolation and the recorded energy defect.

Source: `src/fuel-centrifuge-ui.ts:312–342`, `src/fuel-motion.ts:108–130`, `src/fuel-transport.ts:252–309`.

### 2. Validate field state once, then sample it

**Impact:** High repeated CPU cost at finer grids. Source-confirmed and measured.

**Problem and cause:** Each gas cell has three display meshes.
Every field sample scans the full profile and copies and checks both species arrays.
Spatial thermal checks also scan the complete temperature and pressure arrays.
At 256 cells, one repaint checks 393,216 species values before the separate thermal checks.

In simple terms, each cell checks every other cell before it reads its own value.

**Fix:** Validate an accepted state once. Use a checked local sampler for that state.
Sample each radius once and apply the value to its three meshes.
Keep validation at the public sampling boundary.
This preserves input checks while removing quadratic display work.
Defer hidden field repainting until the field becomes visible.

**Required checks:** Test cell edges, pure species, malformed arrays, and unchanged accepted states.
Compare every displayed field with the existing sampler.
Check that rejected input cannot leave a partially updated display.

Source: `src/fuel-field.ts:25–43`, `src/fuel-scene-tools.ts:137–164`, `src/fuel-learning.ts:7–12`.

### 3. Keep plot nodes and stop updating closed plots

**Impact:** Repeated DOM work and a confirmed keyboard defect.

**Problem and cause:** Playback can rebuild radial plots 80 times during a run, even when Plots is closed.
Plot construction replaces the host contents and reconnects its observers.
Composition probe selection calls playback, which can rebuild the focused SVG immediately.
The browser then moves focus to the document body.

In simple terms, selecting a point removes the chart that has keyboard focus.

**Live evidence:** Open Composition, focus its chart, and press Home.
The probe moves to the axis, but `document.activeElement` becomes `BODY`.
Existing tests pass because they send events without testing this focused interaction.

**Fix:** Retain the plot controller and SVG.
Update probe, cursor, readouts, and series through that controller.
Mark closed plots as changed and refresh them when opened.
Build history rows only for plots that need them.
This fixes the cause and also removes repeated work.
Restoring focus after each replacement would leave the underlying problem in place.

**Required checks:** Focus the real chart and send two arrow keys.
Require the same connected SVG, retained focus, and two probe changes.
Require no hidden SVG or observer reconstruction during playback.
On reopening, require the plot endpoint to match the current 3D time.

Source: `src/laboratory.ts:138–158,232–254`, `src/fuel-centrifuge-ui.ts:347–348,523,580`, `src/fuel-learning-ui.ts:39–54`.

### 4. Read current limits in the exact-value editor

**Impact:** Confirmed live input defect.

**Problem and cause:** `setupPreciseControls()` captures minimum and maximum values once.
The stage control later changes the feed-stage range maximum.
The exact editor and keyboard handler continue to use the original maximum.

In simple terms, the slider learns the new limit, but its text editor does not.

**Live evidence:** Set Ideal stages to 12.
The feed-stage range has maximum 12, but its exact editor has maximum 5.
Entering 8 gives “Enter an integer from 1 to 5.”
Reducing the stage count can leave an editor that advertises values the slider cannot accept.

**Fix:** Read current bounds when opening, committing, and handling a keyboard step.
Check the current disabled state before a commit.
Keep the original slider gesture step.
One live range must own the limits; a second set of rules will become obsolete again.

**Required checks:** Expand and reduce limits after setup.
Change limits while the editor is open.
Require invalid commits to emit no input event.

Source: `src/precise-controls.ts:18–20,31–51`, `src/fuel-centrifuge-ui.ts:394`.

### 5. Preserve shared geometry within each apparatus

**Impact:** Confirmed excess geometry allocation; GPU savings remain unmeasured.

**Problem and cause:** Assembly loading clones geometry for each mesh node.
The GLB contains 316 mesh nodes but only 46 unique mesh streams.
Position, normal, and index data total 873,760 bytes when shared.
Per-node copies increase that total to 11,342,472 bytes, about thirteen times as much.
These figures exclude UV data and GPU overhead.

In simple terms, identical bolts receive separate copies of the same shape.

**Fix:** Clone each source geometry once per apparatus, then reuse it within that apparatus.
Keep separate ownership between the cached template, current apparatus, and pinned apparatus.
Keep distinct materials where selection or clipping requires them.
This retains independent disposal without repeated shape data.
Sharing mutable resources across apparatus instances would weaken that boundary.

**Required checks:** Verify internal sharing and independent apparatus ownership.
Dispose one apparatus and confirm that the template and comparison still render.

Source: `src/fuel-assembly.ts:44–65`.

### 6. Do not invalidate unchanged materials

**Impact:** Repeated render-state work; hardware cost not yet measured.

**Problem and cause:** View application always calls staging updates.
The staging path marks materials for update even when its settings did not change.
Shared material instances can receive the same update several times.

In simple terms, the renderer is told that unchanged surfaces need new setup.

**Fix:** Skip identical staging changes and update each affected material once.
Retain plane updates when world transforms change.
This is smaller than a new render scheduler and preserves the existing frame owner.

**Required checks:** Identical view settings must not increase material versions.
Actual clipping, world-transform, and shadow changes must still appear.

Source: `src/fuel-view-ui.ts:47–53`, `src/fuel-scene-tools.ts:166–182`.

### 7. Calculate reactor scans only when needed

**Impact:** Confirmed unnecessary execution; isolated latency not measured.

**Problem and cause:** Target updates calculate neutron transport and thickness scans while that panel is closed.
Beam inputs also rebuild a 25-energy scan when only a scaling input changes.
Examples include current and illuminated area.

In simple terms, the application redraws an unused comparison after every relevant input event.

**Fix:** Retain the latest source identity and mark closed diagnostics as changed.
Calculate them when opened.
For the beam curve, define the inputs that change its probability calculation.
Retain only the latest curve and combine repeated visible input updates within a frame.
Energy and material changes must invalidate the curve.
This avoids a general cache with unclear keys and lifetime.

**Required checks:** Opening must show the latest source.
Scaling changes must retain the correct curve and update totals.
Exports must use the same source identity as the displayed result.

Source: `src/coupled-target-ui.ts:181`, `src/marathon-ui.ts:47`, `src/neutron-transport-ui.ts:70–87`, `src/fusion-ui.ts:39–42,87`.

## Move next

### 8. Separate physical evolution from reference calculations

All numerical controls enter the same change path.
Except for current changes, that path clears elapsed time and drive events and requests a complete operation.
Stage count, feed stage, pumping references, and plant inventory inputs do not all change the evolving rotor.
The live stage-count edit reset the timeline from one second to zero.

In simple terms, editing an estimate can discard a run that the estimate does not affect.

Give physical evolution, reference calculations, and presentation explicit owners.
Retain the accepted trajectory and drive history for reference-only edits.
Recalculate only their dependent outputs.
Review collection cut separately because continuation compatibility currently includes it.
Test unchanged trajectories and events alongside changed reference outputs.
This is preferable to a broad state-machine rewrite before transition ownership is clear.

Source: `src/fuel-centrifuge-ui.ts:155,394–415,503–505`, `src/fuel-centrifuge.ts:174–203`.

### 9. Bound plot display work independently of solver precision

History plots construct paths and readouts from complete checkpoint histories.
Adaptive refinement can retain both accepted half-steps, so display cost can grow with scientific resolution.

Use width-bounded display samples after stable plot updates are in place.
Preserve extrema, gaps, event times, and the exact current endpoint.
Keep complete scientific and export histories.
Test an event discontinuity and a refined history against the full data.
This reduces display work without weakening convergence gates.

Source: `src/laboratory.ts:150–158,232–245`, `src/fuel-operation.ts:268,280–281`.

### 10. Reduce picking work before adding an acceleration structure

The pointer handler intersects the full apparatus tree before it filters visibility and excluded components.
This includes objects that cannot become valid hits.

Maintain an eligible pick list that respects ancestor visibility.
Combine hover updates within one frame, but keep pointer-down handling immediate.
Test clipped, exploded, excluded, and dragged components.
Measure the remaining cost before adding a spatial acceleration structure.
Bounding-volume checks already reject some meshes, so total triangle count is not the actual cost of each pick.

Source: `src/apparatus-viewer.ts:361–378`.

### 11. Reduce small-part tessellation

The apparatus has 609,964 instantiated triangles.
Washers account for 196,608 triangles, or 32.2%.
Copper turns and insulation each account for another 90,384 triangles.
The Blender helper uses 96 ring segments and three bevel segments by default.

Set tessellation from visible size and required close-up detail.
Retain dimensions, bores, and component identifiers.
Compare close and distant views before accepting a lower count.
Add detail levels only if one mesh cannot support both views.
Asset compression alone will not reduce triangle processing.

Source: `blender/build_fuel_assembly.py:52–88,131–133`.

### 12. Defer inactive feature calculations at startup

`main.ts` statically imports and constructs reactor and advanced interfaces before the experience selects its active level.
Reactor initialization performs a beam solve, an energy scan, and plot work during a centrifuge visit.
The main asset is 750,888 bytes; the preloaded Three.js core asset is 263,581 bytes before transfer compression.

Separate control registration from initial calculation, then load feature groups on entry.
Make scenario restoration and tutorial actions wait for the required controls.
Test direct links, restored values, and first entry.
Manual bundle chunks alone will not stop inactive calculations.

The 3D apparatus already uses visibility-based lazy loading and generation checks.
Do not replace that working boundary under the assumption that all 3D models load at startup.

Source: `src/main.ts:20–47,404–426`, `src/marathon-ui.ts:56–60`, `src/fusion-ui.ts:104`, `src/apparatus-ui.ts`.

### 13. Give the mobile scene more space

At 390 × 844, the playback panel occupies 275.5 vertical pixels, or about 32.6% of the viewport.
The apparatus is small and partly behind it.
The header, dimension display, legends, and playback details compete for the remaining scene area.
The document width remains 390 pixels, so this is not a horizontal-overflow defect.

Use a compact transport strip and an expandable details area.
Fit the camera to the usable scene area after open-panel dimensions are known.
Show the relevant field legend without duplicate explanations.
Keep the same physical timeline and access to all controls.
Test portrait, narrow landscape, keyboard focus, panel dragging, and access to Play and current.
Reducing all text sizes would retain the space conflict and make reading harder.

Evidence: [mobile screenshot](code-performance-20261124/phone.jpg).
This is a layout observation, not a beginner comprehension study.

### 14. Exclude unused research files from browser CI checkout

Tracked files total 1,403,295,082 bytes.
The `scientific/` subtree accounts for 1,283,956,642 bytes across 4,930 files.
Four browser jobs check out the repository before they use a downloaded, verified site build.

Trace test imports, then use a sparse checkout for those jobs.
Keep required fixtures and the verified build identity.
A separate archival change can move large evidence to immutable storage with hashes and retrieval instructions.
Do not delete unique results or rewrite history as part of a performance patch.
Checkout time savings have not been measured.

Source: `.github/workflows/verify.yml:65–76` and the current Git index.

### 15. Remove the hidden legacy tutorial interface

The guide hides its old reader, navigation, and view chooser but still builds the old seven-step interface.
Some tests continue to operate those hidden controls.

Remove the unused interface in a separate cleanup patch.
Retain stable action identifiers, old tutorial links, and the current reader bridge.
Test old links and current visible navigation.
This removes a duplicate UI owner without reorganizing unrelated tutorial code.

Source: `src/playground-guide.ts:28–55,225–242`.

## Keep for now

- Keep worker termination, versioned replies, and request revision checks. The reviewed abort paths reject and release workers.
- Keep continuation compatibility checks, canonical thermal state, and accepted-history checks.
- Keep one independent pinned result. Cloning has a measured cost, but no accumulating cache was found.
- Keep bounded export pieces and asynchronous compression backpressure.
- Keep versioned scenario validation, migrations, and source identity.
- Keep current geometry and material disposal. No missing-release defect was demonstrated in the reviewed replacement path.
- Keep shared physical time, comparison colors, and camera synchronization.
- Keep coalesced normal render invalidation and hidden-document animation suspension.
- Keep current scientific resolution and convergence thresholds.
- Keep the current framework and strict TypeScript. The recorded Vite build took 887 ms; framework replacement has no demonstrated benefit.

The assembly cache is intentional. It needs resource ownership checks, not automatic removal.
Pinning and continuation can cause temporary allocation peaks. Those peaks are not proof of a leak.
Focus and exploded-view animation have separate frame owners in a bounded paused-view case.
Measure that smaller overlap after the larger repeated work is removed.

Endplate stippling remains a visual defect with an unknown cause.
Compare shadows disabled against fine surface detail disabled before assigning it to a driver, material, or shadow setting.

## State and code organization

The central issue is ownership of changes, not module length alone.
Define these transitions before splitting the main UI module:

| Change | Work that it should own |
| --- | --- |
| Physical setup edit | Abort obsolete work, request a new physical result, reset incompatible time and history. |
| Current event | Continue from the accepted state and preserve the preceding drive history. |
| Reference edit | Recalculate dependent estimates without replacing the physical trajectory. |
| Seek or probe | Select an accepted state and update retained scene and plot controllers. |
| View edit | Change camera, visibility, clipping, or field display only. |
| Panel open | Build or refresh that panel from the latest accepted result. |
| Pin or unpin | Create or dispose one independently owned comparison. |

Use explicit input groups and handlers before introducing a state-machine library.
Do not replace local conditions with a generic event layer unless a demonstrated transition problem requires it.
Do not move functions into files solely to reduce line counts.
Keep numerical code, display sampling, resource ownership, and UI transitions separate where they already have distinct invariants.

## Patch order and acceptance gates

Keep each patch single-purpose and below 700 non-test lines.

1. Fix live exact-value limits and add changing-limit tests.
2. Retain Composition focus and plot nodes; stop work in closed plots.
3. Remove duplicate motion updates and repeated state samples.
4. Validate field state once and sample each cell once.
5. Share owned geometry and avoid unchanged material updates in separate patches.
6. Separate reference edits from physical evolution.
7. Reduce picking, small-part triangles, and inactive feature work in separate measured patches.
8. Improve mobile transport layout, then remove hidden tutorial UI.
9. Narrow browser CI checkout after checking all fixture dependencies.

For performance patches, compare the same input, source build, browser, device, viewport, and display settings.
Record frame-time percentiles, input-to-result latency, retained heap after repeated replacement, and rendering counts.
Test cold entry and a warm run separately.
Require unchanged physical arrays, event handling, plot endpoints, and convergence gates where the algorithm is unchanged.
Do not choose a speed target from the isolated Node timings.

## Checks and limits

Fresh checks in this audit:

- Safe-dev microbenchmarks described above completed for both grids.
- `node --import tsx --test --test-concurrency=1` ran the six test files below: **77 passed, zero failed or skipped**.
- Live Composition keyboard test reproduced focus loss.
- Live stage-count and exact feed-stage test reproduced obsolete editor bounds.
- Live mobile layout check found no horizontal overflow at 390 × 844.
- Live browser console returned no errors during these checks.
- `git diff --check` passed. The report has no trailing whitespace.

Test files:

```text
tests/worker-client.test.ts
tests/precise-controls.test.ts
tests/viewer-frame-v43.test.ts
tests/fuel-centrifuge-ui-v44.test.ts
tests/fuel-motion-transport-v47.test.ts
tests/fuel-scene-tools-v47.test.ts
```

The fresh passing tests do not cover the two reproduced live defects.
Their regression cases are specified above.

The exact runtime source also has an existing passing [CI run](https://github.com/noahsong-sdg/mass-spinner/actions/runs/45386873784).
Its records show 1,707 TypeScript tests, four type checks, lint, four Python tests, build checks, and 94 browser tests without retries.
Those full checks were not rerun for this read-only audit.
The report adds no runtime or dependency changes.

The inspected desktop container peaked at 1,568,673,792 bytes, with no out-of-memory event.
The inspected phone container peaked at 1,498,591,232 bytes, also with no out-of-memory event.
These are whole-container values, not application heap measurements.
Browser CI uses software rendering, so these records do not establish hardware GPU performance.

The review does not establish experimental accuracy or qualify a new physical model.
Performance changes must preserve the existing scientific checks and their stated limits.
