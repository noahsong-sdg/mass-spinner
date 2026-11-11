# v40 independent scene and interaction audit

Scope: engineering-geometry.js → surface-layer.js → apparatus-viewer.js → apparatus-ui.js, plus existing geometry, surface and viewer tests. No production source was changed. CPU witnesses are in `v40-scene-repro.test.ts`; the root ran them in the cached safe-dev VM. These are actual Three geometry/raycast and production pointer-handler checks with injected renderer/controls, not a browser/GPU acceptance pass.

## Confirmed findings

### P2: trajectories can consume clicks far from their visible line

**Problem.** Hardware inspection stops working at some otherwise valid pixels in the Trajectories layer. The same pixel selects the vessel in Hardware mode.

**Technical cause.** `src/apparatus-viewer.js:125` chooses the first visible Three intersection. It constrains Points to their projected pixels, but accepts Lines without an equivalent test. Three's default Line raycast tolerance is in world units (one metre). `src/surface-layer.js:45` creates SI trajectories as `THREE.Line`, and line metadata at line 46 supplies neither a component ID nor a supported result-pick action. An off-pixel line can therefore become the first hit, after which both `stateLayer.pick(hit)` and component lookup do nothing. The viewer never examines the valid hardware hit behind it.

**Simple cause.** An invisible one-metre-wide click zone surrounds each thin trajectory and swallows component clicks.

**Evidence.** Root freshly executed the production-handler witness with a line at solver `[x,y]=[0.1,0.15] m`, entirely inside the declared 0.2 m-radius cylinder. The camera looks through the actual cutaway. The line is more than 40 screen pixels from the click; Trajectories yields no selected component, while Hardware selects `vessel`. The existing 821 tests also pass, demonstrating an uncovered case rather than a current-suite failure. Exact tested script hashes and VM logs belong to the root's consolidated receipt.

**Recommended fix and choice.** Since trajectories currently have no inspection action, exclude them from the inspection candidate set and retain hardware behind them. If trajectory inspection is added, make its hit tolerance a projected screen footprint and require an actual supported action. Merely shrinking a fixed metre threshold remains scale-dependent, and selecting the next hit only after arbitrary failures leaves the oversized hit zone unresolved.

### P2: default SI camera is outside the cylindrical cutaway's open quadrant

**Problem.** Central samples on the radial field section can be hidden behind the opaque pressure wall immediately after the accepted-state camera reset.

**Technical cause.** `src/engineering-geometry.js:58` removes local azimuths 45°..135° for the vessel cutaway. The SI root rotates +90° about world y (`src/surface-layer.js:63`), but `src/apparatus-viewer.js:75` uses world direction `[-1.2,0.65,1]`. In local transverse coordinates this is `[-1,0.65]`, azimuth approximately147°, outside the removed quadrant. The renderer correctly depth-tests the section, so the remaining opaque wall obscures it.

**Simple cause.** The camera opens on the closed side of the cutaway rather than looking through its opening.

**Evidence.** Root freshly ran the appended CPU witness in safe-dev. It mirrors the production fitted bounds and reset camera distance/direction and confirmed an earlier opaque `Vessel pressure wall` intersection before the real radial overlay for all three central interior sample rays. The combined five-witness audit batch passed in729.2ms; passing here means the asserted defects were reproduced. The scene witness file SHA256 is `818a872a159722a322ab7ea99ae4cde76ab979e96572161111de03ade2e8d0ef`. This establishes bounded geometric occlusion, not that all field values are hidden or that a browser render has been observed.

**Recommended fix and choice.** Choose the SI camera in the geometry's documented local coordinates and transform that direction with the assembly, so it lies inside the actual open quadrant. Add a visible-interior-sample ray regression. This preserves opaque engineering materials and the numerical field's real depth; forcing fields through walls or disabling depth testing would conceal the camera error and misrepresent geometry.

## Additional lower-priority behavior

At `src/surface-layer.js:86`, selected-sample opacity compares `child.userData.sampleIndex`, but the batched radial/physical field mesh stores its index only as a geometry attribute (lines37,41). Consequently that mesh always receives opacity0.72 after inspection, and changing the sample does not distinguish its cell in3D. The exact numerical readout still updates. This is a small interaction gap, not evidence of wrong field values; a per-cell highlight would require a deliberate batched-mesh mechanism rather than the previous per-child check.

## Positive evidence and boundaries

- Engineering construction and quantitative overlays share one rigid transform and SI inputs; numerical wall/source/end geometry remains distinct from removed display panels.
- Native target film/backing depths and thermal interfaces are retained; the microscope labels its independent magnification.
- Positioned orbit impacts and radius-only dynamic events are separated rather than inventing event azimuths.
- Resource cleanup, stale asynchronous GLB release, camera preservation during field refresh, pending-state clearing and unsupported-bend recovery have targeted existing tests.
- Neither the reviewed CPU tests nor the offline Blender proofs establish deployed GPU appearance, mobile touch behavior, clipping on real devices or frame rate. The explicit managed-origin browser denial remains a verification limitation; no alternate browser workaround was used.

No application fixes or deployment were made during this audit.
