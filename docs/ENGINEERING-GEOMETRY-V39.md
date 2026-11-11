# Parametric apparatus geometry

The live apparatus can now be constructed from accepted SI domain dimensions instead of positioning quantitative results on a fixed display-scale GLB. `src/engineering-geometry.js` supplies the hardware and a separate registry of physical numerical surfaces. It does not supply an engineering-certified drawing or a Marathon bill of materials.

## Corrected execution path

The former Blender vessels were approximately 3.9 display units long, whereas the default numerical column is 2.8 m. Their axial display direction was unrelated to the solver's axial z. In simple terms, a calculated wall hit could not reliably identify the corresponding spot on the illustrated apparatus. The fix constructs the relevant surfaces directly in solver coordinates, rather than guessing a scale or translating an image hotspot. This avoids introducing an independent geometric calibration that could drift when sliders change.

The shared local frame is `[x,y,z]` in metres, with radius `hypot(x,y)` and axial extent `0 ≤ z ≤ lengthM`. The renderer may apply a single rigid rotation to the complete hardware-plus-results group. Optional helpers implement the exact invertible rotation `[x,y,z] → [z−L/2,y,−x]`; they never change scale.

`buildEngineeringGeometry(options)` returns `{group, surfaces, domain, dispose}`. Every mesh has an inspector `componentId`, `geometryBasis`, and `materialBasis`. Quantitative meshes additionally have `surfaceId`, `surfaceRole`, and `quantitativeOnly: true`. They start hidden. Display cutaways do not change numerical boundary conditions.

## Numerical surfaces and construction

| Mode | Registered numerical surfaces | Construction meaning |
| --- | --- | --- |
| Rotating / ICR | Full cylinder `wall`, complete `source` and `end` disks | Exact accepted cylinder dimensions. Coil windings, wall thickness, flanges, bolts, ports and materials are illustrative. |
| Collisional double well | Same surfaces, with required accepted `boundary` | Open means absorbing. Closed means specular radial wall and periodic axial ends; it is not a collector prediction. |
| Equilibrium centrifuge / double-well landscape | None | Reference hardware only. A radial density or potential calculation does not solve collection. |
| Gyro | None | Ideal orbit diagnostic; no physical collector acceptance is inferred. |
| Curved drift | None | Curved guide follows nominal arc length and curvature. Aperture is illustrative. No solved toroidal orbit, wall interception or slit acceptance is inferred. |
| Beam target | `target-film`, `beam-footprint`, `target-interface`, `target-backing`, and separate true-depth section planes | Film and backing thicknesses and illuminated area come from accepted inputs. Circular beam shape and lateral support extent are conventions, not solved beam optics. |

The target front is z=0 and deuterons travel toward +z. Film occupies `[0,h]`; backing occupies `[h,h+b]`. The front normal is −z and the cooled back normal is +z. Separate depth planes preserve the material interface; a temperature jump across contact resistance must not be smoothed into one material. The visible film/backing have their +y halves removed to reveal the y=0 section, with all physical z dimensions unchanged. The numerical illuminated area remains the complete disk. A 1 µm film is genuinely 1 µm thick; a separately labeled inspection view is necessary to resolve it.

The accepted source support now sets the source body's clear aperture, ceramic opening and inner bias-ring radii. Previously the fixed illustrative aperture could be smaller than the injected disk. Matching the actual support is preferable to drawing trajectories through an apparently opaque source part; it does not establish extraction optics.

The first offline beam render exposed a floating RF envelope and an unconnected target end. Source location now derives from the beam-tube inlet, with a vacuum adaptor; the tube meets an annular target mounting plate. A public maximum beam-area input also made the former short illustrative tube acquire negative depth and placed extraction electrodes beyond the target. The illustrative construction length now grows with aperture and keeps all extraction electrodes upstream. No beam flight time or optics quantity depends on that length. These mating relationships are tested over the supported area extremes.

RF source windings, resonant ion-heating electrodes and static bias rings remain separate components. Their metal appearance does not imply a solved antenna field, breakdown limit, coil-current calculation or bulk-potential penetration. Cooling hardware is a conceptual manifold and connections: only the accepted one-dimensional target thermal boundary is quantitative, not channel flow or a three-dimensional coolant field.

Curved guides with aperture ≥ curvature radius or more than one complete turn explicitly decline this hardware representation. The reduced drift diagnostic may still be available; the renderer must not silently clamp those settings into a different device.

The existing published blanket remains a separate reference asset; it is not connected to compact beam-target surface predictions.

## Reproducible Blender route

`scripts/export-engineering-models.mjs` exports the same procedural meshes with Three.js `GLTFExporter`. `blender/render_engineering.py` imports those GLBs into the preserved Linux Blender cache, saves editable `.blend` scenes, and renders Cycles CPU proofs. These proofs validate exported geometry and construction readability, not the deployed browser renderer.

All project execution occurs in Apple safe-dev copied-source guests. The preserved v28 Blender source was checked against its existing host export before any replacement: 55 files, canonical hash-map SHA256 `2836a4b41472057b8136ff25c35b7074f4a3eabe2b4b799953b047c307994382`. Its tool cache remains outside copied source. Old v28 guest source is also preserved at `/work/home/engineering-v39-preserved-v28-source`.

Two demonstrated tool-integration failures were corrected: Blender 3.4's importer requires the NumPy scalar alias removed by NumPy 1.26, and Blender saves require absolute paths. The renderer restores only the identical boolean scalar alias for that older importer and resolves output paths. Physics and cached packages are unchanged. The preserved Blender lacks compiled OIDN, so proofs use 96 CPU samples without denoising.

The first seven-mode render export is `/tmp/mass-spinner-engineering-v39-renders-first`; all 24 retained files match `render-source-sha256.json`. It predates the corrected beam mating, target half-section and accepted source aperture, and must not be presented as the final target geometry. A subsequent four-state proof exposed an actual visibility failure: the depth microscope at twice the beam radius was inside the vessel/end plate. The live layer now derives its inspection height from the complete hardware bounds. Its regression requires the microscope to clear the hardware.

The final proof is `scientific/engineering-geometry-v39-proof/`: eight mechanism-specific apparatus exports, four actual accepted-state exports, and two target microscope crops. All 14 PNGs pass Pillow CRC verification at 1200×800. All 14 retained GLB files parse with correct container length; these comprise 12 distinct exports plus two copied inputs for the recovered microscope renders. All 14 editable compressed `.blend` files are readable and hash-checked. The actual state GLBs match their producer SHA256 records. Every final image was visually inspected: the backing microscope shows its actual four-cell temperature gradient, and the film microscope faithfully shows nearly uniform loading without invented texture or extra variation.

The 49-file final transfer was constrained to an explicit regular-file allowlist, rejected links/traversal/duplicates and enforced a 50 MiB cap. All 48 payload SHA256 values match `render-source-sha256.json`, whose SHA256 is `d0140478696a0ec6aed53916ddc034ebf92b93fbf4ed1567bbced76201adec00`. The geometry source is `4c996fb51c2e51ef430e95a6f208f62fdd455c19025e74f5730c953548bd449d`; the accepted surface-layer source is `7da5ca017b908c4484c0fdf06d7a8b745c1338a789c272001fdcc6a0915f1723`. The separately audited renderer with microscope camera and lossless compressed scene saves is retained in `scientific/engineering-v39-render-tool/`; frozen application inputs were preserved.

Host disk exhaustion damaged the first two microscope PNGs and two scene files after their render commands completed. They failed actual reads with filesystem error 117 and are explicitly rejected in `render-proof.json`. The four unreadable originals remain in the retained Blender guest; none was deleted, accepted or silently repaired. After space recovery, the same SHA-verified input GLBs were copied to a fresh subdirectory and the two microscopes were rerendered successfully. The final export excludes those four corrupt originals. No filesystem repair, sandbox weakening, VM retirement or host Blender execution was used.

## Verification boundaries

`tests/engineering-geometry.test.ts` checks real Three.js meshes: SI bounds and invertible rigid transforms; full numerical boundaries independent of cutaway; outward solid triangle winding and source/end normals; finite buffers; inspector IDs; raycast picking; exact target film/backing positions; nondegenerate half-section faces; absence of invented collection on reduced models; source-support clearance; and upstream/mating invariants across beam-area extremes. The ten geometry regressions pass in the parent's final isolated suite, which reports 821 tests passing and successful required build/typecheck gates. The parent implementation report records the complete tested application snapshot.

Materials, tolerances, pressure design, electromagnetic realization, cooling flow, shielding and structural integrity are not qualified by this geometry. Live deployed GPU appearance and gestures remain a separate browser acceptance gate, subject to the existing origin policy.
