# Graphics fidelity audit

Status: corrections, asset regeneration, final isolated integration checks and deployment complete. Native deployed browser/GPU verification remains blocked by the previously documented origin-authority denial. This report does not certify an engineering replica or a measured material appearance.

## Accuracy contract

Computed paths and curves must preserve the solver's coordinates, units, sampling semantics and input/result identity. Apparatus meshes must not silently imply measured hardware dimensions, materials, magnetic fields or collection efficiency. A visually plausible metallic finish is not evidence of an alloy, surface condition or operating temperature.

## Demonstrated root causes and corrections

### Spatial plot distortion and inspection

The shared chart renderer independently stretched x and y into an approximately 675 by 205 plot rectangle. A physical circle therefore appeared elliptical. Gyro, POMS-surrogate and azimuthal spatial projections now carry explicit equal-aspect metadata; the renderer gives a physical unit the same display length on both axes. Deflection against arc length remains a response chart, rather than being misrepresented as a Cartesian trajectory map.

Pointer inspection previously inverted a fixed-width chart without accounting for SVG letterboxing, and selected samples using x alone. The corrected mapping accounts for the rendered viewport and plot inset; spatial inspection selects the nearest physical 2D sample. Keyboard inspection follows path order. This fixes the actual coordinate transform rather than cosmetically stretching the resulting SVG.

Cumulative-incidence producers include pre/post samples at the same event time. Response readouts and selected markers now use the last, post-event value at that abscissa, matching the producer's right-continuous contract.

### Prescribed field graphics

The prior field view drew fixed radial arrows and positive axial B arrows, and omitted the ICR RF electric field. It did not represent the field functions used by the solver. Physical field samples now come from the same `fields()` and `rfField()` functions. Directions, radial E dependence, magnetic sign and RF handedness are preserved under the common coordinate permutation.

Electric and magnetic arrows are normalized separately, with their reference magnitudes and units displayed. The RF view explicitly shows a snapshot at t = 0; it is not an animated antenna or electromagnetic-wave solution. Zero fields create no spurious arrows. Invalid field data is rejected before constructing graphical geometry.

### Trajectory display sampling

The integrator previously retained one position every 16 steps, independently of physical rates. At the maximum supported gyro step this allowed a 0.48-rad displayed chord: approximately 2.87% radial sag for a circle. Display stride now resolves gyro, RF and DC electric dynamical rates at a 0.1-rad target, capped at the previous 16-step stride. For a circular gyro-orbit this bounds chord sag below approximately 0.125% of the radius; it is not a global error guarantee for arbitrary driven or collisional trajectories.

Actual collision positions are retained to preserve velocity-change corners. Integration steps, collision random draws, numerical accounting and impacts are unchanged. Six pre-change solver-result records, excluding display paths, are retained as exact regression fixtures. These include 16 actual collection impacts and a seeded case with 24 collisions. The independent reviewer reproduced the added baselines from retained original modules, then verified exact equality of all non-path result fields. This improves data sampling without inventing spline paths through absorbing walls or collision events.

### Apparatus assembly, surface normals and raster provenance

Independent asset-space checks demonstrated a gap between the LiT layer and its backing and a disconnected curved-guide source. A systematic contact pass also found floating cooling connections, a separated source flange and hardware suspended above the base. These are assembly errors even in a conceptual cutaway: independently chosen primitive centers and depths did not meet at their intended interface planes. The correction seats those existing parts and adds two explicitly illustrative supports; it does not invent a solved cooling channel or engineered thermal joint. Actual exported-mesh regressions enforce the interfaces, rather than relying on a favorable camera angle to hide gaps.

The earlier glTF exporter repaired toroidal surface orientation and enabled Blender Auto Smooth for weighted normals, but the source raster pipeline did not apply the same corrections. Fixing the source recipe makes shading and normal orientation consistent across editable scenes, raster renders and exported meshes. Original 1600 by 900, 192-sample Cycles settings are retained; increased sample counts would not repair wrong geometry or normals.

All eight unique scenes have been regenerated: eight GLBs, eight PNGs, eight WebPs and eight editable Blender scenes. Source checks establish enabled Auto Smooth on meshes with Weighted Normal modifiers and correct analytical inner/outer skin orientation at seven gates. The actual exported geometry tests failed four of four on the original assets and pass four of four on the replacements. All eight replacements pass Khronos validation with zero errors, warnings or infos. Reviewers and the parent inspected the regenerated local render outputs; this is not a browser observation.

Some Monte Carlo grain remains in the archived raster reflections. A fresh capability probe confirms this ARM Blender build reports `_cycles.with_openimagedenoise == false`; guided denoising passes were not retained. No blur or invented surface texture was applied. This raster noise does not propagate into the interactive GLB meshes, but the PNGs are not noise-free product photography.

A compact collapsed `Concept model` disclosure now exposes the asset's existing geometry/material qualification without requiring a component to be selected. This keeps provenance available while avoiding repeated explanatory paragraphs in the default view.

### Reference atlas

An independent review found that the atlas drawing canvas stretched x by 1.424 relative to y for its azimuthal annulus. The source now uses equal aspect specifically for that cross-section; its raster and contact sheet have been regenerated. The measured display ratio is 1.0000000000000007. Other schematic compositions and their bytes remain unchanged. The diagram's existing annotations and analytical field laws remain a conceptual reference, not a computed separator-performance result.

## Graphics coverage and limits

| Surface | Evidence and interpretation |
| --- | --- |
| Intro separator | Live numerical trajectories in metres; the legacy assembly's chamber/end-plane geometry has a structural checker. Displayed particle spheres are illustrative sizes. |
| Marathon source | Published RF deuterium source, electrostatic D+ acceleration and LiT on a cooled backing. Beam footprint follows the assumed illuminated area. Neutron rays are symbolic directions, not counts or an angular-distribution solve. |
| Future blanket | Published paper-model material order, distinct from the compact source. The circular cutaway is not the paper's shaped ARC-class engineering geometry and is not to scale. Colors are material-region identifiers, not neutron/temperature results. |
| Model lab | Eight unique Blender GLBs across nine manifest modes. Apparatus geometry is conceptual. Centrifuge equilibrium and double-well energy landscapes do not imply flowing collection performance. |
| Research replay | Saved field-free collision moments and plots; no fabricated reactor mesh or newly solved distribution. |
| Reference atlas | Eleven educational mechanism sketches; equations and direction conventions reviewed against tutorial sections II E–K. No measured efficiency is inferred from schematic paths. |

Company sources do not provide the as-built dimensional drawings or complete material bill needed to certify a faithful Marathon hardware replica. Likewise, PBR parameters and a studio environment do not establish actual optical constants. GPU material appearance, native controls and mobile composition still require live browser observation.

The ICR mesh illustrates one opposing RF plate pair; it is not an engineered antenna realization of the solver's circular prescribed RF. Annular electrodes likewise do not establish bulk field penetration. These distinctions remain in the component catalog and conceptual-geometry disclosure. Replacing them with invented antenna or electrode details would add apparent precision without source evidence.

## Verification record

The first integrated narrow gate passed 31 tests, including pre-change numerical-result equality and actual collision-corner retention. Final regenerated-asset checks, full suite, typecheck, build, structural asset checker and site-resource results are recorded below. All project execution used copied Apple safe-dev VMs. No browser-policy workaround or alternate page-observation surface was used.

The final independent physics-graphics gate passed 21 tests with zero failures/skips. Original solver modules, generator, fixture SHA256, test log and successful reproduction log are retained under `scientific/graphics-fidelity-v28/independent/`. The atlas regression failed on the original stretched drawing (ratio 1.424) and passed on the corrected generator (ratio 1.0000000000000007), in the independent copied VM `safe-dev-17aaaa930cbbc583`; its red/green logs and validation JSON are retained under `scientific/graphics-fidelity-v28/atlas/`.

## Final integration gate

All commands below passed in copied Apple VM `safe-dev-15990600e196c3af`, stage `/tmp/mass-spinner-graphics-v28`, after an explicit final sync and offline `npm ci --ignore-scripts`:

| Exact command | Result |
| --- | --- |
| `npm test` | 398 passed; zero failed, skipped or cancelled |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 |
| `npm run check:site` | exit 0; resources and modules, not browser execution |
| `npm run check:assets` | exit 0; original separator geometry and asset structure |

The 315-file tested source map has SHA256 `90acc4c49f4dacab46b81c0058f9e55aa97b558126631abda870dba2af786713`. Every mapped source file matches the exported tested snapshot; corresponding canonical project files match too. Logs, runner and source map are retained under `scientific/graphics-fidelity-v28/integration/`. Full reviewed guest export: `/tmp/mass-spinner-graphics-v28-final-gates-export`.

The 130-file built release has aggregate SHA256 `f0931643016bb9d8c89ecade6d05ab7a1beb8612f55e18a3d62b5ba0523fddd6` (sorted filename-to-content-hash map, compact JSON). The publisher verifies complete membership and every hash before deployment. Geometry evidence, 36-file asset hash map, source `.blend` files and visual contact sheet are retained under `scientific/graphics-geometry-v28/`; see `docs/GRAPHICS-GEOMETRY-V28.md` for the independent source/asset audit.

## Deployment

Published the exact reviewed release through isolated deployment VM `safe-dev-f5e3965510847418`. Cloudflare accepted version `74b0c36e-55f5-4a06-a5ec-1e7d181bc9b1`; a separate `wrangler deployments status --json` read confirmed that version receives 100% of production traffic at 2026-11-08 09:58 UTC. Existing guest authentication was used; host credentials were not copied or mounted.

Site: [Mass Spinner](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/). Script, dependency lock, release hash map, upload log and sanitized provider receipt are retained under `scientific/deployment-v28/`. Provider deployment state does not establish actual browser loading, GPU rendering, native gestures or mobile layout. Those observations remain unverified.

## Primary references

- [Zweben, Gueroult and Fisch, Plasma mass separation (2018)](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf).
- [Marathon beam-driven-fusion architecture](https://www.marathonfusion.com/beam-driven-fusion/): RF source, D+ accelerator, LiT and cooled substrate; not a dimensional CAD release.
- [Marathon alchemy paper](https://www.marathonfusion.com/alchemy.pdf): future-plant blanket materials and conditional neutron-transport/depletion study, separate from the compact source.
