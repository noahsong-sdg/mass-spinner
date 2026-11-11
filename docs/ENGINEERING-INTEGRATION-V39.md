# Engineering geometry and quantitative surfaces

The apparatus now has parametric engineering-style construction and a direct accepted-result path into its 3D surfaces. This is a scientific visualization of the implemented models, not fabrication CAD or a calibrated Marathon digital twin. Detailed construction remains explicitly illustrative where public sources and numerical models do not determine it.

## Execution path and reviewable changes

`main.js` accepts a worker result only after its revision check. `surfaceState` then checks the completed model/configuration, actual data support, units and conservation. `setupApparatus` preserves that packet across lazy viewer loading. `createApparatusViewer` uses one SI engineering assembly; `createSurfaceLayer` attaches the raw result geometry. Target history selection passes the exact accepted film/backing sample and its accepted source. Pending or invalid states clear quantitative geometry, controls and values.

The implementation separates three reviewable slices: the result contract (under 300 production lines), engineering geometry/export (under 500), and renderer/UI integration (under 400). Existing solver equations and convergence criteria are unchanged.

## Fixes and rationale

**Display geometry versus physical coordinates.** The old GLBs used arbitrary display lengths and axes, whereas solvers use metres and axial z. In simple terms, a real calculated wall hit did not identify a reliable spot on the picture. Construction and numerical surfaces now share solver SI coordinates and one rigid scene rotation. This removes a second geometric calibration, unlike fitting every result to the bounds of a decorative mesh. True wall/end dimensions and target layer depths remain recoverable.

**Missing result connections.** Accepted separator results previously stopped at plots; the target adapter retained film cells but omitted backing temperatures. The picture therefore showed less than the calculation. The new adapter preserves prescribed E/B/potential, appropriate equilibrium densities/composition/current, effective-energy landscapes, dynamic annular densities, native gyro loci, sampled orbit trajectories and complete positioned orbit impacts. Target temperature spans both materials; isotope occupancies remain film-only. Raw cell boundaries and nearest-point supports avoid inventing interpolated resolution or smoothing a thermal contact jump.

**Invented physical interpretations.** A sampled path is not a density; a radius-only impact cannot locate a wall hotspot; double-well event energy is signed total Hamiltonian, not kinetic heat. In simple terms, the same number can mean very different things in different models. The contract retains original incident denominators, checks exact annular inventory, distinguishes normalized from absolute density, and withholds quantities that lack spatial support. This preserves the existing physics instead of filling unmodeled dimensions with plausible-looking color.

**Construction mismatches.** Fixed source bores could be smaller than injected support. Large beam areas could make an illustrative tube acquire negative depth and move extraction electrodes behind the target. Initial renders also exposed disconnected beamline parts. Apertures now follow the used pulse support; closed equilibrium initialization does not claim to use that pulse radius. Construction length grows explicitly with chamber size, mating surfaces derive from neighboring faces, and acceleration stays upstream. These are direct geometric relationships, preferable to visually concealing gaps or limiting otherwise valid physics inputs.

**Invisible target state.** A true micrometre film cannot be understood at full-apparatus scale. The target/backing have a true-scale half cutaway and a separately labeled depth microscope. The first actual Blender state proof showed its strip hidden inside the housing. It now sits beyond the hardware bounds, with a regression requiring clear separation. Its depth magnification is explicit; physical geometry remains unchanged. Whole-assembly heat and neutron rate remain whole-assembly quantities.

**Picking and navigation.** Three's default point-picking radius is one world metre, while displayed impact dots are five pixels. At small apparatus scales this could select an event far from the cursor. Picking now checks the projected pixel footprint, with regressions spanning three physical scales. Exact sample picking, component materials/provenance, keyboard camera controls and component focus remain available. A smaller minimum zoom and logarithmic depth buffer support the target's multiscale geometry without exaggerating its physical film thickness.

**Lazy-loading camera race.** A result can arrive while the reference GLB is loading. Its SI geometry may already exist when the GLB finishes, so a geometry-key-only check incorrectly keeps the camera fitted to the reference asset. Simply, a correct model could open at the wrong size or location. Fitting on a change of active root, as well as a change of geometry dimensions, fixes the actual lifecycle transition while preserving the camera during ordinary accepted-state refreshes.

**Stale controls and failed-geometry recovery.** An unsupported bend could dispose construction while leaving its cache key, preventing reconstruction when returning to the previous valid setting. Pending states could leave old selectors and values visible. The layer now rebuilds when construction is absent, and clears all quantitative controls/readouts alongside the meshes. This enforces the actual accepted-result invariant without silently substituting a different apparatus.

## Coverage and limits

See [the result contract](../SURFACE-STATE-V39.md) and [geometry definitions](ENGINEERING-GEOMETRY-V39.md) for the per-model table. Curved drift remains a reduced scalar diagnostic rather than an invented full 3D orbit. Research distributions and future blanket references do not become spatial reactor predictions. Coil current, antenna response, bulk field realization, coolant flow, structural stress, manufacturing tolerances and experimental LiT retention are not newly solved.

Controls update numerical surfaces after an accepted live calculation; material-history selection changes the selected target sample. Hardware dimensions change for physical domain/target-area/thickness inputs. Changing B, voltage or isotope loading changes results, not an assumed mechanical assembly.

## Validation evidence

All execution uses the copied Apple safe-dev stage `/tmp/mass-spinner-marathon-v35-final`, guest `safe-dev-d53fa8311a7066e4`. Each iteration is explicitly synchronized. Historical failed fixtures and the expanded component-catalog expectation are retained under `scientific/engineering-v39`; scientific admission and convergence gates were not relaxed.

The required final commands are `npm test`, `npm run typecheck`, `npm run build`, `npm run check:site`, and `npm run check:assets`. The runner hashes every tested input before and after, checks the bundled Random123 notice, and records every released file SHA256. Actual Three geometry is exported into Blender, which produces editable `.blend` files and CPU proofs of both construction and accepted state surfaces. Final counts, hashes and provider deployment evidence are appended after completion.

Live browser verification remains blocked by the browser tool's explicit managed-origin denial. No alternate browser, headless browser, raw CDP or origin-fetch workaround is used. CPU scene/raycast/lifecycle tests, offline Blender images and Cloudflare rollout evidence are separate forms of evidence; none is described as an observed deployed GPU/mobile interaction pass.


## Final checked snapshot

The camera regression first failed as intended (7/8 narrow tests passed); its original TAP and source map are retained in `scientific/engineering-v39/camera-red`. The active-root fix then passed the complete **821/821** suite, with zero failures, skips or cancellations. `npm run typecheck`, `npm run build`, `npm run check:site` and `npm run check:assets` all exited zero. Both engineering-model and actual accepted-state exports also exited zero. `final/final-gates-v39.json` records the exact eight commands, exit codes and durations; `final/final-gate-1-v39.log` is the full test log.

The 478-input snapshot aggregate is `93ac8c83f541bc95ef3514c2ec3eda0def918ab555d24327b7a1f7902c359efd`. Every available canonical input was compared against the copied tested map after export. The complete 148-file checked static release has aggregate `36f2fb3920ff74f09b62f3ddcd12c066ad71d44a5b934f5cf35288686df3aae0`; membership and every individual digest were rechecked on the host. Source and release manifests are retained under `scientific/engineering-v39/final`.

Disk exhaustion interrupted artifact transfer after validation. Unique solver evidence remained in its preserved VM; only hash-identical immutable asset copies and explicitly reproducible temporary dependencies were pruned or deduplicated. Receipts are under `scientific/storage-v39`. One retry produced only two partial export files and was rejected; the subsequent complete export was checked file by file before release preparation. Four unreadable microscope proof files in the separate Blender VM are rejected rather than counted as successful artifacts; readable construction/state proofs and any regenerated microscopy require their own hash receipt.


Final Blender proof recovery completed. All **14 PNGs** passed full PNG CRC verification and were individually inspected; **14 GLBs** parsed, and **14 editable compressed `.blend` files** were read and hashed. The latter were saved by Blender but not independently reopened after transfer. The 48-payload manifest SHA256 is `d0140478696a0ec6aed53916ddc034ebf92b93fbf4ed1567bbced76201adec00`. The proof directory is `scientific/engineering-geometry-v39-proof`. It contains eight apparatus views, four accepted-state views and two regenerated microscopy views. Original unreadable microscopy artifacts remain rejected and retained in the Blender guest; they are not part of this final proof set. Root independently reopened the final beam-target overview and backing-temperature microscope; the latter shows the expected four-cell gradient beyond the housing.


## Published build

Cloudflare deployment succeeded with version `49f916f8-acf8-41da-9117-e7d7b637625d`. An independent provider status read at **2026-11-09 08:06:07 UTC** confirmed that version receives **100%** of production traffic. The deployment command checked membership and every digest of the same 148-file release before publishing; provider verification repeated the release checks. Original logs and the explicit `browserVerified: false` receipt are retained under `scientific/engineering-v39/deployment`.

Public URL: https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/

This confirms publication and provider rollout. It does not change the live-browser/GPU/mobile acceptance limitation above.
