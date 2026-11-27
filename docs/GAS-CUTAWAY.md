# Gas cutaway

The hardware is already a Blender-authored illustrative assembly. It is not an
as-built Marathon machine. The old fast-playback gas display drew a complete
orbit for every tracer; these hoops were sampling aids, not physical objects.

The gas now uses a Blender-authored quarter-annular cell, reflected into a
half-cylinder cutaway. Each cell maps to the accepted solver's radius edges and
vessel length in metres. The movable cross-section uses the same equal-volume
grid. Colors and probes still consume the accepted numerical state, with fixed
shared color scales. Diagnostic colors are not predicted optical emission.

`blender/build_gas_domain.py` writes both `gas-cell.glb` and `gas-cell.json` from
the same mesh. The live renderer imports the JSON topology so it can map any
accepted radial grid without another network request. Tests compare the GLB and
JSON vertices and triangle counts. The 32-segment quarter arc has under 0.05%
geometric volume error; conservation diagnostics use exact analytic cell volumes.

The editable scene is `blender/scenes/gas-cutaway.blend`. Its uniform gas color
previews the geometry only. To regenerate in the checksum-pinned isolated Blender
environment, run `python3 blender/render.py assembly <new-output-directory>`,
then Blender with `--background --factory-startup --threads 2 --python-exit-code 1
--python blender/build_gas_domain.py -- <same-output-directory>`. The Blender LTS
qualification workflow performs both steps and retains the rendered PNGs.

Weighted samples replace full orbit hoops. Their neutral radial distribution
comes from the solved species inventories. Independent azimuth/axial sampling
avoids artificial helical sheets; species offsets prevent coincident markers.
Spin-up uses the computed phase;
fast separation and flow views show an azimuthally sampled distribution, avoiding
aliased rotations. Ions remain an enlarged, oversampled population with prescribed
uniform radial sampling; they are not kinetic particle trajectories. Axial gas
structure, turbulent eddies, visible emission and fringe magnetic fields are not
predicted by the radial model.

Regression checks cover SI bounds, mirrored winding, thin-wall cells, mesh
provenance, inventory mapping, cell-grid changes, resource disposal, species
focus, mode transitions and shared physical clocks. Browser evidence captures
the cutaway and weighted samples in desktop and phone layouts.
