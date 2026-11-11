# Movable playback and scientific rendering

The change is presentation-only. The v48 coupled rotor/transport equations,
collision qualifications, finite-time studies and accepted-result identity remain
unchanged. Illustrative hardware is not a Marathon construction drawing.

## Root causes and fixes

| Problem | Technical cause | Plain explanation | Fix | Why this choice |
|---|---|---|---|---|
| Playback cannot move | Absolute CSS coordinates without pointer handlers | The panel was bolted to one screen location | Dedicated captured-pointer grip, keyboard arrows, Home/double-click reset, persisted fractional coordinates and resize clamping | A separate grip leaves sliders/buttons alone; fractional placement survives mobile resize without intercepting camera gestures |
| Imported hardware has uniform surfaces | Constant Blender material roughness and missing UV coordinates on constructed mesh primitives | Metals looked uniformly smooth regardless of manufacturing finish | Owned UV coordinates and shared-per-apparatus deterministic normal/roughness textures, with distinct steel/copper/ceramic physical materials | No external images, random dirt or unsupported temperature coloring; six small textures rather than textures for every bolt |
| Cross-section edges are hollow | Shader clipping discards pixels without creating geometry; the liner was a zero-thickness display surface | Cutting the casing did not expose material thickness | Intersect actual closed shell triangles, weld section contours and triangulate only closed loops. A modest illustrative liner thickness extends outward from the unchanged gas radius | Preserves real bevels/module transforms and the empty gas bore; does not invent numerical boundaries or use a solid disk to conceal missing geometry |
| Shadows remain in old positions | Shadow map updates were disabled after loading | Exploding or opening the model could leave its old shadow | Revision-based shadow invalidation for staging/circuit changes; filtered 2048-pixel hardware shadows and adjusted environment fill | Recompute when construction changes, not on every rotating tracer frame |
| Field/tracer views are hard to distinguish | A slice checkbox and particle animation were independent | Users could not explicitly choose what representation they wanted | Weighted-tracer, field-section and combined selections, retaining SI color domains, shared time and the existing slice checkbox | Reuses accepted radial reconstruction; does not suggest a solved axial fluid field or optical emission |
| Drive has no external return path | Only feedthrough/internal connections existed | Force arrows explained torque but not the electrical circuit | Optional, pickable discharge supply, positive anode lead, cathode return and terminal marks | Correct conventional-current topology without claiming a measured voltage, coil-current-to-B relation, rated electrical design or Maxwell solution |
| Inspection loses spatial context | Focus existed but was not exposed here; jumps were immediate | Parts could be described without being easy to find | Frame-component and show-plot-in-3D actions; cancellable 350 ms camera easing with reduced-motion support | Explicit actions preserve manual orbit; motion stops on user input, reload, hidden tab or disposal |
| Inspection reverses conventional current | Existing component prose described the electron direction as current | The explanation contradicted inward current arrows and anode/cathode labels | State inward conventional current from wall anode to inner cathode | Match the already implemented current vector and circuit without changing torque physics |
| Optional supply is hidden beneath the base | Its center was below the pedestal surface | Enabling wiring did not reveal the box clearly | Place the source outside the vessel radius, above the base, and reroute leads to its terminals | Preserve real electrode endpoints and avoid hiding the source inside other hardware; clearance and terminal alignment have regression coverage |
| GPU reports an obsolete shadow mode | Three.js r187 removed PCFSoftShadowMap and substituted PCFShadowMap | The renderer silently used a different setting | Select the supported PCFShadowMap directly | Uses the effective supported mode explicitly, without relying on a deprecated fallback; live console checks cover the regression |

Cross-section intersection treats vertices on the plane explicitly. Its first
regression exposed a floating-point seam that omitted one side of a symmetric
annulus; snapping plane distances and deduplicating on-plane endpoints fixed the
root cause. Tests check both area and the unfilled gas bore.

## Scientific scope

The discharge circuit depicts supply + → wall anode → gas → inner cathode → supply −.
The shown field remains independently prescribed; no coil electrical circuit or
coil-current-to-field calibration is implied. It is hidden by default.

Material microfinish, liner construction thickness and section-cap appearance are
illustrative optical/construction assumptions. The numerical gas radius, densities,
time, angular momentum, inertia and torque are unchanged. Field sections remain
radial and axially uniform. No new emission, thermal, sheath, extraction or Maxwell
solver is introduced. The deployed Blender hardware GLB remains byte-identical to
v49; these additional finishes, cut faces and wiring are live Three.js geometry.

## Checks

Regression coverage includes pointer ownership/cancellation, keyboard/reset behavior,
pre-version/invalid persisted positions, resize bounds, true triangle section area,
empty bore, actual imported Blender cut faces, owned optical resources, finite UVs,
field/tracer visibility, plot-to-field time consistency, unchanged accepted results,
camera easing/interruption/reduced motion, and existing A/B/picking pathways.

Release receipts and browser evidence are retained in `scientific/centrifuge-v44/render50e/`
and `scientific/render50/` after the corresponding checks are completed. A CPU scene
test does not establish GPU correctness; browser verification is recorded separately.
