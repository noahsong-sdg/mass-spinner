# V105: reconstructed radial source and viscous wall traces

Freeze this before producing the full five-case study. This is a conditional
numerical control, not experimental qualification or a live browser update.

Use the identical sealed V84 physical manifest/scenario, V101 independently
checked nested mesh, V103 initialization, contacts and transport coefficients.
Keep clocks 0/1/2/4 microseconds, n=1/2/4 at CFL .1, n=2 at .2/.05,
the 100 ns cap and original accepted-step/CFL checks. No smoothing of source
profiles, electrode changes, measured-current/velocity fitting or changed
mass/energy/angular state map.

The two changes have separate analytic red/green controls and separate 0/1 us
one-variable evolutions: (1) integrate the pressure/density/angular-speed
departures used by V103 radial reconstruction in its body source; (2) enable
the existing stationary no-slip tangential wall reconstruction for this
apparatus, consistent with its viscous wall boundary. Final Euler wall ghosts
remain reflecting/slip; viscous traction is not counted twice. See METHOD.md.
The wall-only probe shows only a small effect; it is not a proposed sole
explanation of the existing six failures.

Use evaluate100 -> audit99 with geometry101.expected_edges, without modifying
either. Keep spatial 5%, timestep 2%, contraction, positivity, exact-panel
quadrature, charge and every mass/species/energy/angular conservation gate.
Density increments still subtract each run's own initial field; radial speed
still uses total meridional speed normalization. Retain all failures and the
V103/V104 results. No diagnostic/source-rate control replaces a gate.

Seal all producer dependencies, fields and histories. Seal optical predictions
before scoring every frozen alternative, retaining the retrospective scope.
Evaluate the actual saved fields independently; an evaluator exit 1 is an
expected recorded outcome when any original numerical gate fails. Passing
analytic controls alone does not authorize adoption or accuracy claims.

Source-only force quadrature does not upgrade the face-positivity limiter to
a whole-cell positivity theorem. Check reconstructed minima on saved states.
Localized heating, fixed transport outside its physical reference range,
unknown electrode/sheath closures and the short closed adiabatic exposure
remain explicit limitations regardless of numerical improvement.
