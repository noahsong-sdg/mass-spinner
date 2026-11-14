# V103 fixed-input radial-force-balance study

Freeze this protocol before executing the coupled transient. Repeat V101's
physical manifest, first scenario, source profiles, contacts, initial torsion,
smooth source-aligned nested geometry and all four reporting clocks
(0, 1, 2, 4 microseconds). Run all five jobs: n=1/2/4 at CFL .1 and n=2 at
CFL .2/.05. The maximum timestep remains 1e-7 seconds. Existing results are
retained; every trajectory must be recomputed with the corrected operator.

The sole numerical intervention is radial equilibrium-plus-perturbation
reconstruction and its consistent geometric/centrifugal source in the shared
Euler flow operator. It addresses artificial motion caused by inconsistent
face pressure and cellwise sources. The local reference is isothermal;
perturbations and spatially varying rotation/temperature remain evolved.
No physical coefficient, cooling term, current or measured velocity is fitted.

Reuse `evaluate100.evaluate` and `audit99.audit` unchanged, with V101's independent
`geometry101.expected_edges` callback. Retain exact-panel observables, 5% spatial
and 2% timestep bounds, contraction, positivity, charge, mass/species, angular
momentum and energy checks. Seal the actual producer source inventory and field
packets; old V101 source packets or absent method metadata are not V103 evidence.

Seal optical predictions before scoring measured velocities. Retain all 72
diagnostic alternatives at each clock and the 20% all-point compatibility
screen. This is a retrospective comparison, not a new held-out experiment.
Four microseconds is not a steady discharge; thermal and ionization closures
remain conditional. Hydrostatic controls cannot waive full-study failures.
This research change is not automatically adopted by the live playground.
