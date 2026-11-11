# Centrifuge presentation and electromagnetic drive

The interactive Marathon centrifuge now loads a nine-module Blender assembly
containing 261 hardware meshes. Runtime geometry supplies the accepted-radius
electrodes, cathode, lithium liner, collection cut, plumbing and numerical overlays.
The isolated toolchain is Blender 3.4.1 (preserved Debian installation), Cycles CPU
for editable proofs, and the existing Three.js 0.187 WebGL renderer for interaction.
No host Blender execution, new container volume, browser-policy bypass, or CDP
automation was used.

## Physical basis

Primary topology: [WO2026064411A1](https://patents.google.com/patent/WO2026064411A1/en).
This disclosure describes partial ionization, magnetic driving, neutral entrainment,
and gas-processing arrangements. It does not provide an as-built mechanical design.
Our alloy choices, winding dimensions, fasteners, seals, cooling connections,
feedthrough construction and their dimensions are illustrative. This is an editable
parametric **mesh** assembly, not toleranced fabrication CAD or a qualified pressure vessel.

The displayed drive is exactly the solver's prescribed closure:

\[
J_r=-\frac{I}{2\pi rL},\quad \mathbf B=B\mathbf e_z,
\quad\mathbf f=\mathbf J\times\mathbf B
=\frac{IB}{2\pi rL}\mathbf e_\phi,
\quad fR\le r\le R.
\]

Here positive conventional current travels inward, from wall anode to inner cathode.
Integrating \(r f_\phi\,dV\) gives
\(\tau=IB(R^2-f^2R^2)/2\), the accepted rotor torque.
The arrows are direction glyphs; their lengths are not a common quantitative scale
across T, A/m² and N/m³. SI values are retained in the adapter and the View panel
reports B, I and torque. Zero current removes current/force arrows; zero B removes
field/force arrows. The UI's B range starts at 0.05 T; its zero-drive browser check
therefore uses zero current. Zero B is covered at the solver/adapter test level.

This does not add a Maxwell solve, coil-current-to-B calculation, electrode sheath
solution, local current distribution, thermal field or magnetic end/fringe field.
Ion-neutral momentum transfer and evolving neutral inertia still use the v48
coupled rotor/transport backend. Hardware remains stationary. Fast azimuthal motion
is averaged in Coupled separation; Coupled spin-up retains the physical phases on
its explicitly displayed slow clock. Optical gas opacity is illustrative and does
not represent photon emission or measured plasma brightness.

## Root causes and choices

| Problem | Technical cause / plain explanation | Fix and why this choice |
|---|---|---|
| Internals hard to read | Opaque shell, conservative camera fit, fine lines against metal; the casing dominated the view. | Open/ghost housing, closer horizontal framing, brighter averaged tracers and solid unlit direction glyphs. Narrow views retain more fit margin. This changes presentation, not physical results. |
| Generic hardware | Runtime construction had no authored detail asset. | Blender modules add beveled flanges, recessed seals, studs/washers/hex nuts, ceramic feedthrough ribs, coil bus terminals, rising continuous windings and isolation saddles. Modular placement preserves accepted SI dimensions better than scaling an entire fixed machine GLB. |
| Shell clipping disappeared after import | glTF loaders sanitize object names; the clipping adapter could no longer identify the wall. Simply, the wall's imported name differed. | Explicit `renderName` extras restore the stable render contract during instantiation. An actual-GLB regression checks clipping. |
| Exploded imported parts moved incorrectly | Nested module positions are local, but the original offset assumed direct SI parents. | Transform SI axial offsets into each parent frame and determine end direction in the apparatus frame. This handles both old procedural and new nested parts without changing numerical boundaries. |
| Pinned arrows could share disposed geometry | Three.js ArrowHelper uses global shared geometries; clearing one viewer could affect another. | Clone the helper geometry and own each overlay's GPU resources. Test independent scenes and idempotent disposal. |
| Narrow camera cropped the pump | A closer fit that worked at 390 px did not leave enough width at 320 px. | Limit presentation zoom for aspect ratios below one, preserving relative user zoom on resize. The full viewport remains available without hiding hardware. |
| Old tests assumed equilibrium by default | The default is now Coupled separation. | Assert that new default, and explicitly select equilibrium when checking reference-only statements. Both behaviors remain covered. |

The four coil packs follow radius and axial anchor fractions. Their axial detail
scale is limited for short/wide chamber settings so neighboring packs do not overlap.
Such detail scaling is an illustration, not a manufacturing constraint solution.
Complete interference analysis, stress qualification and electrical insulation design
are outside this model.

## Assets and reproducibility

- Recipe: `blender/build_fuel_assembly.py`.
- Deployed hardware kit: `web-assets/models/centrifuge-assembly.glb`.
- Editable authored modules and render: `scientific/drive49/blender-d/`.
- Complete assembled hardware export and editable scene: `scientific/drive49/complete/`.
- Additional editable display cutaway: `scientific/drive49/complete-b/`.
- Complete-scene GLB is from the first checked full-assembly export; later live
  changes affect camera fit, tracer opacity and direction-glyph thickness only.
  The deployed hardware kit is byte-identical. The display cutaway bakes a shell
  opening in the Blender copy; its accompanying GLB retains the original geometry.
- Safe-dev build/export receipts record exact source/asset SHA256 values. Earlier
  failed or superseded checks and images are retained rather than presented as success.

Final release and live verification evidence is recorded separately in
`DRIVE-ASSEMBLY-RELEASE-V49.md`.
