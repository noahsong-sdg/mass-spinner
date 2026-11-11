# Playground apparatus renders

These are editable, ray-traced **conceptual hardware illustrations**. They are
not engineering drawings or calculated plasma/particle/field outputs. Nothing
emitting light is baked into the beam path, neutron source or plasma region.
Consequently a disabled source cannot leave a misleading glowing beam in the image.

## What is represented

- `beam-target`: a compact RF ion source, electrostatic acceleration electrodes,
  vacuum path, LiT target layer and cooled substrate. The target-layer thickness
  is exaggerated. Unspecified metal alloys, coolant and engineering dimensions
  are illustrative; this is not a tokamak.
- `gyro`, `icr`, `curved`, `centrifuge`, `rotating`, `doublewell`: apparatus for
  the corresponding tutorial mechanisms. `doublewell-dynamics` shares the
  double-well hardware image. Coils, bias electrodes and collector arrangements
  communicate the mechanism rather than reproduce a specific experimental build.
- `blanket`: a **separate future power-plant concept** from the alchemy paper,
  not the compact neutron source. The sequence is empty D–T plasma region,
  tungsten armor, inner V–4Cr–4Ti structure, Hg/Li channel, outer V–4Cr–4Ti
  structure, FLiBe blanket and Eurofer97 tank. The primary-source reviewer checked
  §4.1, p.11. The paper’s materials are distinguished from the illustrative
  optical finishes. Layer widths and machine proportions are not to scale.

The six blanket inspector IDs are `plasma`, `armor`, `structure`, `multiplier`,
`breeder`, `tank`; `structure` describes **both** V-alloy walls. No transport,
neutronics, depletion or plant-performance calculation is implied by this image.

Two geometry corrections followed the source review. A shared axial source could
imply injection parallel to B in the gyro apparatus, where v × B would vanish.
In plain terms, ions launched straight along the field would not turn into the
separating circles. The gyro asset now has a transverse inlet and collectors in
the gyro plane. Changing that hardware arrangement communicates the correct
mechanism directly without inventing a calculated orbit.

The first blanket illustration omitted the outer V-alloy wall because the initial
summary collapsed the structure into one layer. The primary-source reviewer
reopened the actual radial sequence and identified the second wall surrounding
the Hg/Li channel. It is now included explicitly, rather than hidden in an
unlabeled generic shell. The inspector's single `structure` entry covers both
walls, preserving the six-component UI while accurately representing the paper.

## Runtime and isolation

All downloaded tools and executed recipe/conversion code ran inside the Apple
safe-dev VM associated with `/tmp/mass-spinner-renders-v21`:
`safe-dev-e6ee51fc540e8bfb`. No host Blender, GPU process, browser automation,
host home mount, credentials or control socket was used.

The guest is native Linux `aarch64`. Debian bookworm Blender
`3.4.1+dfsg-2+b1` was downloaded with its dependencies, then extracted using
`dpkg-deb --extract` into `.venv/blender`; nothing was installed into the
read-only runtime image and no package maintainer scripts ran. The extracted
library directories, including nested PulseAudio libraries, are explicitly
included in `LD_LIBRARY_PATH`. The system scripts/data paths point into that
same extracted prefix. Downloads required `safe-dev run --online`; rendering
and image conversion ran offline.

The first startup failed because the extracted `/lib/aarch64-linux-gnu` and
nested library directories were absent from the loader search path. In plain
terms, the files were present but Blender could not locate them. Including the
extracted shared-library directories fixes that actual dependency lookup and
retains the native CPU renderer; changing the runtime image was unnecessary.

The first scene then exposed that this Debian ARM build has no OpenImageDenoiser.
The recipe disables this unavailable optional feature and renders more samples.
That addresses the demonstrated build capability instead of requiring a host
renderer or silently substituting a different graphics pipeline.

## Reproduction

Read `/Users/noahs/.local/share/safe-dev/README.md` first. Use a small staging
directory containing `blender/build_playgrounds.py`; initialize it using
`safe-dev -C /absolute/staging init`. After host edits, explicitly refresh the
guest with `sync --replace-guest`, exporting valuable guest files first. This
deletes dependencies, which must then be re-created.

Within the guest, create private apt list/cache directories under `.venv/apt`.
Run `apt-get update` and `apt-get --download-only --no-install-recommends -y
install blender` with `Dir::State::lists`, `Dir::Cache::archives`,
`Debug::NoLocking=true` and `APT::Sandbox::User` set to the non-root guest user.
Extract all resulting `.deb` files into `.venv/blender`. Build `LD_LIBRARY_PATH`
from the parent directories of the extracted `*.so*` files. Set
`BLENDER_SYSTEM_SCRIPTS=.venv/blender/usr/share/blender/scripts` and
`BLENDER_SYSTEM_DATAFILES=.venv/blender/usr/share/blender/datafiles` using
absolute guest paths.

Run the extracted binary offline:

```sh
RENDER_WIDTH=1600 RENDER_SAMPLES=192 \
  .venv/blender/usr/bin/blender --background --python blender/build_playgrounds.py
```

`RENDER_MODES=beam-target` selects a single mode for a quick proof or correction.
Defaults render all eight unique apparatus images. The production images use
Cycles CPU, four threads, 192 samples, Filmic color management and 1600×900
resolution. PNGs are the lossless masters. Pillow 12.0.0 converts them to WebP
with quality 91, method 6; it does not alter or generate the scene content.

`web-assets/renders/manifest.json` records each image, caption and normalized
camera-projected hotspot coordinate. Coordinates are percentages of the native
16:9 image rectangle, not the surrounding CSS box. Editable `.blend` scenes
are retained separately from the public web assets.

## Verification boundaries

The 1000px compact-source proof was opened and visually inspected after actual
Cycles execution. Final image dimensions, file signatures, manifest coverage,
hotspot bounds and `.blend` headers are checked in the render guest. Final
production images are opened individually for composition review. These checks
establish that the apparatus assets rendered and exported correctly; they do not
validate simulation physics, proprietary CAD, measured optical properties or the
browser’s GPU/UI behavior.

## Final evidence

Final reviewed export: `/tmp/mass-spinner-renders-v21-final-export`.
The parent preserved its sources, logs, contact sheet, verification JSON and all
eight editable scenes under `scientific/render-assets-v21` in the project.
The canonical recipe and all published images/manifest are byte-identical to
the actual export; trusted host `diff -qr` and source SHA256 checks passed.

Final recipe SHA256:
`3f162732fe9c5e5567567eecf0796be3fb9f3b07eb997eeaa3b703588da4c5a2`.

Exact narrow checks ran offline inside the render guest:

- `py_compile.compile('blender/build_playgrounds.py', doraise=True)`: PASS.
- Actual Cycles CPU production execution: all eight unique scenes completed;
  corrected gyro and blanket frames completed separately at the same settings.
- Pillow decode/format/dimension checks: eight PNGs and eight WebPs, all
  **1600×900**, PASS.
- Manifest mode/alias coverage: **nine entries / eight unique images**, PASS.
- Camera-coordinate/ID checks: **46 finite in-bounds hotspots**, unique IDs
  within each asset; six required compact-source and six blanket IDs, PASS.
- All eight editable scene signatures begin `BLENDER`, PASS.
- Combined WebP payload: **768,874 bytes**. Per-file sizes and PNG/WebP hashes
  are retained in `render-verification.json` in the evidence export/archive.

All eight final PNGs were opened individually and visually inspected after
export. The parent independently inspected and accepted all eight, including
the corrected gyro and blanket frames. Grain remains visible at full resolution;
the selected 192-sample budget and lack of ARM denoising are explicit.

Reopening the blanket scene for hotspot projection emitted nonfatal Blender
modifier warnings: the optional Weighted Normals modifiers are ignored because
Auto Smooth is not enabled in this version. Polygon smoothing and bevels still
render; no missing geometry, failed frame or alternate image was substituted.
The actual warnings are preserved in the render evidence. They do not establish
engineering accuracy or a calibrated material appearance.

This asset-only work does not run the application's build/typecheck or claim
browser/GPU verification. The parent runs those required final integration gates
against the merged application snapshot.
