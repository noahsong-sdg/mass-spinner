# Endwall diagnosis, V91

Frozen before new predictions, 13 November 2026. V90's original and extended
audits remain unchanged. No current/velocity fit and no relaxed tolerances.

Reproduce the four V90 extension failures by rescoring authenticated packets.
Ranked hypotheses: unresolved transient no-slip endwall layer; inconsistent
wall momentum flux; local stress-work/heat allocation; operator splitting.
Compare physical wall length scales with grid spacing; inspect radial/axial
velocity, density and temperature differences at all saved clocks. Probe each
operator independently before changing its implementation. All probes are
diagnostic, not new admission gates or apparatus qualification.

If initial probes support underresolution rather than a discrete defect, add
one unchanged-equation n=128, nz=256 case at 1024 fixed steps to 20 microseconds.
Use n=32,64,128 at 1024 steps for matched-clock spatial comparisons, adding
n=32 at 1024 if absent. Keep V90's conservative restriction, whole/increment
norms and strict contraction, 5% spatial and cross-solver gates, 2% temporal
gate. Never combine different timesteps as a spatial sweep. Check the original
n=64 temporal study independently; a new finest-grid temporal contraction study
is still necessary before claiming full numerical qualification at n=128.

Preserve prior predictions, failed attempts and all new raw physical outputs.
Seal exact source, installed native implementations and input dictionaries.
All scientific execution offline in safe-dev; no full guest replacement.
