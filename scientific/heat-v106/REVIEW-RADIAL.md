# Independent radial-refinement review

**Radial resolution materially improves the 1 microsecond comparison. Density
still exceeds the unchanged 5% threshold; full qualification has not passed.**

At 48 fixed axial cells, the existing V101 mapping was refined without changing
its cuts, physical inputs, transport, current, initial-profile prescription,
CFL 0.1 or 100 ns cap. No currents, velocities or mesh locations were fitted.

| Radial cells | Density-increment relative RMS | Radial-velocity relative RMS |
|---|---:|---:|
| 40 to 80 | 20.270583% | 6.948714% |
| 80 to 160 | 7.451522% | 2.103733% |

These are the existing exact-panel metrics. Density uses the finer density
increment as its reference; radial velocity uses the finer **total meridional
velocity** norm. They are differences between discrete solutions, not measured
experimental errors. Quadrature orders 2 and 3 agree to roundoff. The separate
conservative-restriction density comparison is also above 5% (6.783446%);
switching comparison methods does not establish passage.

The 2.10% velocity result is below 5% in this supplemental radial comparison
only. It does not replace the original five-case, 0/1/2/4 microsecond matrix.
Its original six spatial failures remain: density 20.7323/22.1807/23.4212%
and radial velocity 7.06468/9.20974/9.63812%. Their gates remain unchanged.

The result supports insufficient radial resolution as an important contributor.
It does not identify one unique mechanism. Each mesh recomputes the initial
steady torsion, so differences include initialization and subsequent evolution.
Retained full initial states allow that distinction to be examined. Initial
pressure jumps and mass-flux defects near 5 cm do not prove the cause of later
density errors; the evolved discrepancy is spatially distributed. No new
density-flux inconsistency or fitted physical closure is established here.

The next justified work is further predeclared refinement of this same mapping,
with axial and timestep checks at the candidate radial resolution, then the
complete original clocks and numerical gates. The finer comparison still has
substantial endwall-localized discrepancy; a fixed 48-row axial result must not
be assumed adequate at every finer radial level or later clock. A new method
or a kink-only mesh is not justified by this evidence alone.

## Evidence checked

Read the actual radial summary in the
[public evidence archive](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v106-density-flow-refinement),
field headers, execution receipts and test logs. Independently verified all
119 exported payload SHA-256 hashes. The reused 40/80-cell packed fields match
their sealed cross packets byte for byte; the new raw field hash also matches.
The saved geometry is 160 by 48, with radial cuts 0/.004/.05/.056/.06 m,
the original axial cuts, six full conserved fields and both 0/1 microsecond
snapshots. Five radial controls pass, including independent Hermite geometry
and exact nesting. The reused comparison is reproduced exactly.

The added run used 1,499 steps, 273.77 s and 385,352 KiB peak resident memory.
The 103-file input transfer is sealed by
`8e4a5b3ab30e6b53f615dd3ff89e575b7885a8f389aeded3289b6140458aaced`.
The candidate-bound combined heat suite passes all 18 tests. Generic discovery
still retains the two separability failures of the old FE heat backend;
those failed controls have not been hidden or reclassified as passing.

This review performed trusted artifact reads and hash checks only. Scientific
execution and the reported test runs were performed by the root agent in
safe-dev; this reviewer did not rerun project code on the host.
