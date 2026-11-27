# Code audit corrections — 24 November 2026

This record follows [the audit](CODE-PERFORMANCE-AUDIT-20261124.md).
It separates implementation changes from measured results.
The physical evolution equations and numerical convergence limits remain unchanged.

| Finding | Cause and effect | Correction and reason |
| --- | --- | --- |
| 1. Duplicate motion work | A geometry update supplied the clock, then another update supplied the final time. Each update sampled several trail times. | A pure clock query precedes one geometry update. Each trail time supplies phases, speeds, and composition together. This removes repeated work without changing paths. |
| 2. Repeated field validation | Each of three cell meshes validated and sampled the same arrays. Fine grids increased repeated scans. | Validate one accepted state, then sample each radius once. Apply that value to the three meshes. Public sampling still checks inputs. |
| 3. Plot focus and closed plots | Refresh replaced the focused SVG. Closed plots still built histories and paths. | Retain the figure, SVG, and observer. Defer closed plots until opening. This preserves the actual focus owner without a focus-restoration workaround. |
| 4. Obsolete exact-input limits | The editor captured limits before another control changed them. | Read live limits at open, commit, and keyboard input. Check disabled state before edits. The slider remains the only limits owner. |
| 5. Geometry copies | Each repeated bolt received a separate geometry clone. | Clone each source shape once per apparatus. Separate apparatus instances retain independent ownership and disposal. |
| 6. Repeated material updates | Identical staging settings repeatedly marked materials for shader updates. | Skip unchanged settings. Update each material once. A changed world transform still updates clipping planes. |
| 7. Hidden reactor scans | Closed neutron diagnostics calculated transport and thickness scans. Scaling-only beam edits repeated the probability scan. | Defer closed diagnostics. Cache one probability curve by its physical dependencies. Combine source input events within a frame. Explicit calculations flush the current inputs. |
| 8. Reference edits reset evolution | All numeric controls used the physical-input invalidation path. Editing an estimate discarded time and drive events. | Project reference outputs onto the accepted run. Preserve trajectory arrays, events, momentum, and energy. Recompute collection integrals when the cut changes. |
| 9. Dense history display | Paths used all solver knots even when several occupied one display pixel. | Reduce display paths by pixel buckets. Retain extrema, gaps, event neighbors, and canonical moving endpoints. Keep full scientific histories and exports. |
| 10. Picking overhead | Ray tests ran before excluded objects were removed. Every pointer move repeated the tests. | Remove invisible or non-pickable branches first. Combine hover moves within one frame. Keep click and drag tests immediate. |
| 11. Small-part tessellation | Small washers used the same ring detail as large visible surfaces. | Use size-specific washer and coil meshes. Keep main dimensions, bores, component IDs, and detailed large surfaces. This reduces geometry at its source. |
| 12. Inactive startup work | Reactor setup calculated hidden source and diagnostic results during centrifuge startup. | Register controls immediately. Calculate source and nested diagnostics when their active context needs them. No general lazy-loading framework is needed. |
| 13. Mobile obstruction | Secondary playback text occupied much of the scene. Fixed height limits omitted dock offsets. | Keep primary controls visible. Put secondary controls in Details. Measure available space and camera inset. Preserve focus across layout changes. |
| 14. Browser CI checkout | Browser jobs downloaded scientific campaigns that the prepared release did not need. | Use a sparse checkout of browser tooling and dependencies. Test the static import closure. The immutable release artifact still supplies site assets. |
| 15. Hidden guide interface | A hidden legacy guide constructed cards and listeners beside the current reader. | Remove its unused DOM and listeners. Retain current reader actions and supported old links. |

## Independent review corrections

The review found additional issues in the changed paths:

- Plot-only resets now release retained controllers and disconnect their observers.
- Reference edits restore Export after cancellation and refresh result warnings and assumptions.
- Result identity includes the reference-projection calculation source.
- Reference calculations require explicit event history when operation metadata is absent.
- Compact layout changes move focus before a disclosure hides its focused control.
- Reference modes show “Reference” instead of presenting animation time as physical run time.
- Nested reactor diagnostics defer calculations as well as their parent panel.

## Endplate reflection defect

The audit also recorded unexplained black patches on the metal endplates.
The Blender hole cuts left collapsed texture coordinates on their broad faces.
The added metal finish needs those coordinates to define reflection directions.
The old code checked whether coordinates existed. It did not check whether they defined usable triangles.

A controlled browser comparison held the camera, geometry, lighting, and physical result constant:

| Case | Observed endplates |
| --- | --- |
| Original coordinates, full finish | Black patches and white flecks |
| Shadows disabled | Same defect |
| Generated finish disabled | Clean metal |
| Plate coordinates repaired; full finish and shadows enabled | Clean metal |

The correction checks texture coordinates before adding the generated finish.
It replaces a collapsed mapping with the existing planar/cylindrical mapping.
It checks each owned geometry once and preserves valid authored mappings.
Positions, normals, indices, materials, shadows, and physical dimensions stay unchanged.
The existing GLB remains suitable for its uniform base material; the generated finish owns its stricter mapping requirement.
This fixes the material input instead of weakening shadows or removing surface detail throughout the apparatus.

The production path passed the same browser comparison after the correction.
Three regression tests check the actual GLB plates, valid shared mappings, and zero-area spatial triangles.
Together with adjacent scene and finish tests, 27 tests passed in the isolated guest.
The [before](code-performance-20261124/plate-baseline.jpg) and
[after](code-performance-20261124/plate-production-repair.jpg) images record the same camera.

## Measurements

The regenerated Blender asset has 316 mesh nodes and 327,404 instantiated triangles.
The previous asset had 609,964 triangles. The reduction is 46.3%.
The lossless qualified GLB is 1,001,808 bytes.
The qualification checks node metadata, hierarchy, transforms, exact streams, and Khronos validation.
The Blender preview and deployed browser appearance were inspected.

The isolated CPU study uses the same 64-cell and 256-cell, one-second, isothermal cases as the audit.
Both retain 946 checkpoints and 87 snapshots.
These measurements concern display preparation, not browser frame rate or experimental accuracy.

| Mean time | 64 cells: before → after | 256 cells: before → after |
| --- | --- | --- |
| Motion preparation per UI tick | 0.665 → 0.215 ms | 1.968 → 0.418 ms |
| Field preparation | 0.119 → 0.00219 ms | 1.129 → 0.00794 ms |

The motion comparison uses the old two-update path and the new clock-plus-one-update path.
The field comparison uses three checked samples per cell and one validated sampler per state.
These are warm Node CPU measurements. They do not measure total application speed or GPU memory.
The SVG refresh still rebuilds its internal paths. Retaining the outer SVG preserves focus and observer ownership.
Temporal cursor movement avoids that complete refresh; radial data refresh still draws new paths.

## Verification

The deployed runtime is commit `a1a25b26154c9a5eb6a1660d943939da00d12106`.
Independent reviewers traced reference updates, reactor activation, geometry ownership, and the final UV repair.
They found no remaining correctness blocker. Runtime checks followed those source reviews.

The [exact-source Verify run](https://github.com/noahsong-sdg/mass-spinner/actions/runs/45498360465) passed:

- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: 1,755 passed; none failed, skipped, or cancelled.
- `npm run typecheck`, `npm run typecheck:infrastructure`, `npm run typecheck:boundaries`, and `npm run typecheck:tests`: passed.
- `npm run lint`: passed.
- Python unit suites for electron applicability, argon reference export, development snapshots, and deployment credentials: passed.
- `npm run build`, `npm run check:site`, `npm run check:assets`, `npm run check:gltf`, `npm run release:seal`, and `npm run release:verify`: passed.
- Chromium browser checks: 98 passed across desktop and phone layouts; no retries.
- `git diff --check`: passed.

The [pinned Blender qualification](https://github.com/noahsong-sdg/mass-spinner/actions/runs/45495651898) passed.
Cloudflare received the browser-qualified artifact without a rebuild.
Old hashed chunks remain available for open tabs from the previous release.
The production verifier checked 475 served files against the prepared release and one deployment control file locally.
The Cloudflare version is `4352423d-6924-4f06-9849-cf7e350c4482`.

Personal browser checks on the deployed site confirmed:

- Increasing Ideal stages to 12 changes the exact Feed stage limit to 12. Setting Feed stage to 8 preserves physical time.
- Composition retains SVG keyboard focus across Home and repeated ArrowRight probe changes. The radius and composition readouts update.
- The repaired endplates show clean metal with the full generated finish and shadows.
- At 390 × 844, primary playback controls occupy 170.5 px. Details starts closed and opens with secondary controls and the clock. The page has no horizontal overflow.
- At 520 × 390, the collapsed playback panel remains within the available scene bounds.
- Reactor activation loads the apparatus. Opening Initial source shows its calculated output and energy curves.
- A current change increases beam power from 1,000 to 2,512 W and neutron output from 2.855e11 to 7.171e11 s⁻¹. Per-ion fusion probability remains 4.574 per million. This checks the expected current scaling.
- Closing Controls and Plots restores the reactor scene. Neither tested playground logged console errors.

The in-app browser did not apply its requested viewport override. Responsive checks used the supported Brave viewport capability instead. The override was reset after testing.

Live evidence: [desktop](code-performance-20261124/live-desktop.jpg), [phone](code-performance-20261124/live-phone.jpg), and [reactor](code-performance-20261124/live-reactor.jpg).
No new experimental accuracy claim follows from these corrections.
