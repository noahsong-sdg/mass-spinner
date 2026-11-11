# Interactive apparatus assets

The v21 source scenes contained real editable geometry, but the UI mounted their
rendered images and screen-coordinate hotspots. Images cannot support orbiting,
zooming or selecting the actual visible mesh. V24 exports the same hardware to
binary glTF, retaining PBR metallic/roughness materials and semantic mesh IDs.
This avoids a second hand-built geometry implementation and preserves the
inspectable Blender source.

## Frontend contract

`web-assets/renders/manifest.json` retains the previous image metadata and adds:

- `model`: self-contained `/models/{mode}.glb` URL.
- `modelBounds`: world-space `min`, `max`, `center`, `size` in glTF Y-up axes.
- `modelCamera`: initial `position`, `target`, `up`; fit the actual geometry's
  bounding sphere for the viewport, using this direction rather than its distance.
- `componentIds`: the complete catalog, including empty regions.
- `modelMeshComponentIds`: IDs present on visible hardware mesh nodes.
- `modelRegionComponentIds`: concepts selectable from the catalog, without a mesh.
- `modelSHA256`: exact binary digest.

Every exported mesh has `extras.componentId` and `extras.apparatusMode`. Three's
GLTFLoader places extras on `Object3D.userData`; raycast the imported model and
resolve the nearest object's component ID. Mesh names retain Blender part names.
No cameras, lights, floor, baked particle tracks or plasma proxies are exported.
All coordinates are conceptual apparatus coordinates, not engineering dimensions.

`beam-target` introduces honest hardware IDs `beamline` (vacuum tube) and `support`
(base and fasteners). These must have catalog entries distinct from `beam`, which
is empty vacuum space. Beam and neutron reaction regions are catalog-only.
The blanket's plasma region is empty. The current centrifuge, rotating and
double-well scenes do not contain a separate collector mesh; their collection
regions remain catalog-only. Do not label a vessel flange as a collector.

`doublewell-dynamics` aliases the doublewell GLB. The shared hardware appearance
does not imply identical electric fields or dynamical models. Level 01 already
has a separate live separator visualization; research replay is plots, without a
physical machine requiring a model.

## Export and verification

All Blender and Python dependency execution ran in Apple safe-dev guest
`safe-dev-e6ee51fc540e8bfb`, staged at `/tmp/mass-spinner-renders-v21`.
The bounded source snapshot comprised 8 `.blend` files, the exporter and manifest;
no host mounts or credentials. Valuable prior guest render output was exported to
`/tmp/mass-spinner-renders-v21-before-model-v24-export` before synchronization.
Existing extracted Debian Blender 3.4.1 was retained under guest-only
`/work/home/blender-v24`; pinned NumPy 1.26.4 was installed under guest-only
`/work/home/blender-python-v24` for Blender's glTF add-on. Export ran offline.

Blender must receive the extracted library directories in `LD_LIBRARY_PATH`, its
scripts and datafiles in `BLENDER_SYSTEM_SCRIPTS`/`BLENDER_SYSTEM_DATAFILES`, and
the pinned NumPy directory in `PYTHONPATH`; use `--python-use-system-env`.
Run `blender -b --threads 4 --python-use-system-env --python-exit-code 1
--python blender/export_playgrounds_v24.py` inside that guest. Source `.blend`
files are copied into `render-editable/`, not modified in place. Exported files
were reviewed from `/tmp/mass-spinner-models-v24-final-export` before copying back.

The source's weighted-normal modifiers lacked Blender 3.4's required Auto Smooth.
The exporter enables it on affected meshes before converting evaluated geometry.
Otherwise the modifier silently fails and broad machined faces shade poorly.
This is a shading-pipeline correction; source shape and physics are unchanged.

The source blanket's outer skin used the same inward winding as its inner skin.
An analytic surface audit measured normal dot toroidal radial direction near
`-1` on both skins; the outer skin must be `+1`. Recalculating consistent closed
shell normals fixes that without moving vertices. The curved guide has separate
open skins, so its inner skin is explicitly reversed after consistency repair.
Regression gates require inner mean dot below `-0.99` and outer above `0.99` on
all six blanket layers and the curved channel, before modifier evaluation.

The exporter checks glTF 2.0 binary header/length, embedded buffers, finite
accessor bounds, triangles, material ranges, node ID coverage, and absence of
studio cameras/lights. `scientific/model-assets-v24/validation.json` records the
exporter, source and GLB hashes, per-part IDs, counts, Blender version and sizes.
`export.log` contains the full run. Blender logs source-file modifier warnings at
load before Auto Smooth is enabled; optional Draco is unavailable, and these
small assets deliberately require no Draco decoder.

| Model | Mesh nodes | Triangles | Binary bytes |
| --- | ---: | ---: | ---: |
| beam-target | 39 | 52,460 | 695,032 |
| gyro | 29 | 46,772 | 616,916 |
| icr | 82 | 111,808 | 1,438,512 |
| curved | 12 | 23,736 | 378,404 |
| centrifuge | 78 | 114,044 | 1,462,416 |
| rotating | 96 | 151,936 | 1,936,308 |
| doublewell | 96 | 151,936 | 1,936,508 |
| blanket | 6 | 118,656 | 1,547,568 |

Every binary is below 2 MB without geometry decimation or external texture
fetches. These checks establish usable geometry and metadata, not a deployed
GPU appearance or a calibrated apparatus. Independent glTF/Three loader audit
and frontend verification are separate gates.
