# Prospective refinement extension

Written after source05's seven-case seal and before any 64x128 predictions.
The original audit is retained: 118/119 gates pass. Its failed gate is native
16x32 to 32x64 swirl-increment self-change, 6.2736% against 5%. The change
contracts but is not small enough. No measured velocities were consulted.

Add n=64, nz=128 at 256,512,1024 fixed steps to 20 microseconds. Compare
spatial meshes n=16,32,64 at 512 steps and temporal n=64 at all three clocks.
Use the original whole/increment norms, conservative restriction, contraction
and 5% spatial / 2% temporal limits. Write a separate extended audit. Passing
it cannot turn the original n<=32 audit green or qualify the plasma discharge.

Also stop writing unchanging mesh centres/volumes on every native timestep.
Initial `foamPostProcess` already writes and verifies those fixed-mesh fields.
The original function objects generated 22,273 archived files / 419.8 MB across
attempts, mostly redundant geometry. Keep all their raw bytes in a verified
local archive. Retain native torque at every actual timestep and physical
fields at the original write times. Rerun the original seven cases with this
output-only change and require every conserved-state packet to match source05
exactly before combining it with the extension. Do not change physical
equations, boundary values, schemes, solver controls or original gates.
