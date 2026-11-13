# V101 fixed-input geometry study

Frozen before transient execution. Retain V99's physical manifest, first
scenario, source profiles, contacts, initial torsion, equations, all four clocks
(0, 1, 2, 4 microseconds), and five jobs: n=1/2/4 at CFL .1 plus n=2 at .2/.05.
Only geometry changes: the nested C1 map in `reconstruction101.mesh` puts an
edge at the existing 5 cm source clamp and smooths cell-width transitions.
Radial counts are 20n rather than 16n; axial counts remain 24n. This is a joint
alignment/grading/resolution intervention, not a pure alignment experiment.

Keep all original exact-panel observables, 5% spatial and 2% timestep limits,
contraction tests, positivity, charge, mass/species, angular and energy gates.
The audit's explicit expected-geometry callback admits the new grid; its
independent Hermite implementation must reject stale old meshes or altered
counts/edges. Default legacy admission remains unchanged.

Seal every prediction before reading optical velocities; retain all 72
diagnostic alternatives at each time and the 20% all-point compatibility
screen. No fitted current, velocity, cooling, transport, reporting clock or
diagnostic alternative. The experimental data were previously inspected;
this remains a retrospective comparison. Four microseconds is not a steady
discharge. Single-heavy-temperature/frozen-ionization energy closure remains
unqualified. The study is not adopted by the live playground automatically.

Performance changes must preserve per-cell heat and whole conserved fields
under independent comparisons. Benchmark original/candidate in alternating
fresh processes with one BLAS thread and identical physical/numerical inputs.
Use the established 1e-10 per-component relative field-equivalence screen;
report elapsed time and worker peak RSS separately from configured VM RAM.
