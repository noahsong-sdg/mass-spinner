# Apparatus geometry and render audit

This pass corrects demonstrated assembly/shading defects and regenerates eight unique Blender models and their PNG/WebP images. It does not turn conceptual geometry into engineering CAD, calibrate materials, or verify a deployed GPU frame. The collisional double-well mode continues to share the double-well model.

## Physical source check

Marathon's [published beam-driven architecture](https://www.marathonfusion.com/beam-driven-fusion/) identifies an RF deuterium source, electrostatic acceleration and a solid LiT target on a cooled substrate. It does not supply a public dimensional drawing or construction-material bill of materials for the rendered assembly. The unspecified alloys, target optical finish and channel layout remain illustrative.

The [alchemy paper](https://www.marathonfusion.com/alchemy.pdf), §4.1 and Table 1, supports the existing tungsten / inner V–4Cr–4Ti / Hg–Li / outer V–4Cr–4Ti / FLiBe / Eurofer97 material ordering. Its representative ARC-class geometry is shaped, with R = 4.2 m, a = 1.2 m, elongation 1.6 and triangularity 0.25. The circular toroidal asset depicts material ordering; it is not that paper's dimensional CAD or a neutronics calculation. These are separate from the compact beam-target apparatus.

The [plasma-separation tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf) supports the mechanism-specific orientations, not the assets' assumed fabrication details. A circular imposed RF field is not an antenna solution; annular electrodes do not establish bulk-potential penetration; static collector geometry does not establish aperture acceptance.

## Corrected execution paths

- **LiT/backing gap.** The recipe independently placed two boxes, leaving 0.0425 conceptual units between the target rear and backing front. Simply, the target floated in front of its heat sink. Its center now derives from the backing face and exaggerated target thickness, so the surfaces meet without inventing a thermal interface model.
- **Curved inlet gap.** The source outlet ended at x = −1.65 while the bend began at x = −1.3. Its location now derives from the guide entrance and inlet depth. This joins the existing shapes on the entrance tangent, rather than concealing the gap with additional invented hardware.
- **Beam assembly contact.** Cooling connectors missed the backing; pipe ends missed connector outlets; the source flange, standoffs and fasteners were unseated. Existing pieces now mate at their intended interfaces. Two explicitly illustrative mounting pads support the otherwise floating source/backing, using the existing support catalogue ID. The gas feed is within the full chamber's axial span and crosses its intentionally removed upper wall region. Plumbing routing remains conceptual; no coolant flow or pressure-vessel design is inferred.
- **Weighted-normal shading.** All 426 weighted-normal meshes in the old eight saved scenes had Auto Smooth disabled. Blender 3.4 therefore rejected those modifiers. The exporter already enabled it for GLBs, but raster rendering did not. The shared recipe now enables Auto Smooth before adding the modifier on Blender versions that require it. All saved replacement scenes pass that invariant. Keeping the intended modifier fixes shading at its source.
- **Toroidal shell winding.** Inner and outer skins used identical face winding. The exporter repaired GLBs, while source renders retained incorrect surfaces. The recipe now generates opposite winding for the outer skin and correct start-cap winding. Analytic gates on the saved source curved channel and all six blanket layers require inner normal/radial dot < −0.99 and outer > +0.99; observed means are approximately −1 and +1.

The beam target's additional pads are semantic support meshes, not inferred proprietary mounting hardware. No new optical materials, calibration dimensions, beam envelopes, particle tracks or field solutions were added.

## Isolated reproduction and verification

All project/tool execution occurred in new bounded Apple safe-dev guests, without host Blender, home mounts or credentials:

- Render source: `/tmp/mass-spinner-geometry-v28`, guest `safe-dev-e1d20fcb54e3cb9b`.
- Independent asset tests: `/tmp/mass-spinner-geometry-tests-v28`, guest `safe-dev-4e1669fa4ecd476a`.

Debian Blender 3.4.1 and dependencies were downloaded/extracted inside the render guest; no package maintainer scripts modified the runtime image. NumPy 1.26.4 and Pillow 12.0.0 were installed in guest-only directories. Toolchain libraries were preserved outside copied source before explicit synchronizations. Unique render output was exported before replacement; no running job was interrupted.

The full eight-mode batch uses Cycles CPU, four threads, 192 samples, 1600×900, Filmic, original exposure and no denoising. After the systematic beam assembly pass, only beam-target was rerendered; the seven other images retain their bounded full-batch results. All eight saved models were then reexported through Blender.

Commands executed in the respective safe-dev stages:

```text
safe-dev -C /tmp/mass-spinner-geometry-v28 init
safe-dev -C /tmp/mass-spinner-geometry-v28 run --online -- python3 install_blender.py
safe-dev -C /tmp/mass-spinner-geometry-v28 run --online -- python3 -m pip install --target /work/home/blender-python-v28 numpy==1.26.4 Pillow==12.0.0
safe-dev -C /tmp/mass-spinner-geometry-v28 sync --replace-guest
safe-dev -C /tmp/mass-spinner-geometry-v28 run -- python3 launch_geometry_v28.py
safe-dev -C /tmp/mass-spinner-geometry-v28 run -- env GEOMETRY_MODES=beam-target python3 launch_geometry_v28.py
safe-dev -C /tmp/mass-spinner-geometry-tests-v28 run --online -- npm ci
safe-dev -C /tmp/mass-spinner-geometry-tests-v28 run -- node_modules/.bin/tsx --test tests/apparatus-geometry-v28.test.ts
safe-dev -C /tmp/mass-spinner-geometry-tests-v28 run --online -- npm install --no-save --package-lock=false gltf-validator@2.0.0-dev.3.10
safe-dev -C /tmp/mass-spinner-geometry-tests-v28 run -- node validate-glb.mjs
```

The first installer probe exposed missing extracted shared-library search paths, including PulseAudio and LAPACK. The scoped launcher includes the actual extracted library directories; it does not change host libraries or runtime protections.

The four geometry regressions parse actual GLBs with the production Three.js GLTFLoader and evaluate world-space mating surfaces, pipe-end rings, footprint, source plane and supports. All four fail on the old assets and pass on the final assets. The [Khronos validator](https://github.com/KhronosGroup/glTF-Validator) reports zero errors, warnings and infos for each of eight unique GLBs. All current manifest binary hashes, recipe hash and exporter hash match their canonical files. The parent task owns the final integrated suite/typecheck/build.

## Evidence and remaining limits

`scientific/graphics-geometry-v28/` contains eight corrected editable scenes, both batch logs, source-orientation gates, original shading counts, exporter validation, red/green test logs, Khronos reports, a contact sheet and `asset-hashes.json` binding 36 source/asset files. The complete reviewed export is `/tmp/mass-spinner-geometry-v28-final-proof-export`; independent test evidence is `/tmp/mass-spinner-geometry-tests-v28-final-evidence`.

The final contact sheet and all eight full-resolution raster images were visually reviewed. Assembly and material-order illustrations are readable and retain their conceptual qualification. Broad reflections retain visible Monte Carlo grain. A fresh in-guest Blender probe reports `_cycles.with_openimagedenoise = false`; no guided normal/albedo render passes are retained. PNG-only results cannot supply guided denoising after rendering. No blur, invented textures or AI image replacement was used to disguise that limitation. This raster noise does not affect the interactive GLB geometry, which uses its browser renderer.

No result here establishes as-built Marathon dimensions, actual alloy choices, measured LiT/Hg–Li optical properties, coil field maps, electrode/plasma coupling, mechanical clearance qualification, coolant routing, shielding performance or hardware validation. No denied browser content was retrieved through another surface. Native deployed GPU appearance, orbit gestures and mobile layout remain separate acceptance gates.
