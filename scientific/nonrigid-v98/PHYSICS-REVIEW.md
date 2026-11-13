# Independent physics review — V98

13 November 2026. Scope: the steady, prescribed-current angular submodel and
its numerical comparison. This review inspected source, retained result JSON
and execution logs; it did not execute the solver or independently replay NPZ
packets. Packet replay is a separate review.

**Verdict:** no blocking weak-form or source-level physics error found within
this conditional scope. Approve the angular-submodel numerical comparison,
subject to the independent packet audit passing. This does not approve native
OpenFOAM, live-playground fidelity or experimental accuracy.

## Verified evidence

- Current `fem98.py`, `apparatus98.py` and `PROTOCOL.md` match their retained
  evidence copies. The symmetric electric/angular blocks follow the weighted
  Joule-plus-viscous weak form, including the negative electric/angular cross
  term and its transpose. Q2 contains the quadratic source-moment test needed
  for the physical torque identity. The full charge residual includes the
  eliminated potential-gauge equation.
- Retained logs report six physics tests and three native admission/parser
  controls passing. The physics controls include independently integrated
  manufactured shear, exact corotation, current/field reversal, gauge,
  passivity, zero magnetic field and the rigid chord operator. These checks
  test implementation; they do not validate the apparatus assumptions.
- Saved results contain all 24 declared cases: four inherited transport
  alternatives, two anode-center interpretations and three meshes. Current
  remains prescribed at 100 A; transport alternatives are retained without a
  velocity-selected winner. FEM versus FV independence concerns discretization;
  their shared constitutive inputs are not an independent transport validation.
- Producer results pass the declared conservation, refinement and independent
  reference gates. Largest fine changes are approximately 4.8152% for the common
  angular field, 0.00588% for local midplane velocity, 0.000489% for uniform
  chords and 0.01292% for viscous work. Largest finest FEM/FV chord difference is
  0.0461%. All declared refinement quantities contract.

## Limits that must remain visible

- The 5% angular-field gate uses a common sampling grid and normalization by
  the fine field's global maximum. It is not a pointwise relative-error bound
  or a certified continuum error, particularly near ideal current contacts.
- Ideal ring loads do not admit a finite-energy contact limit. In the linear
  1 eV, 0.07 m case, Joule power rises from 11.499 to 12.777 kW between n=2 and
  n=4 while viscous work changes from 397.423 to 397.474 W. Algebraic work
  closure cannot qualify physical contact voltage or heating.
- Raw FE coefficients/operators are not retained in result packets; their
  algebraic residuals are producer diagnostics. Packet replay can independently
  check saved fields, comparisons and scalar identities, not reconstruct every
  FE equation from those packets alone.
- Torsional balance omits meridional momentum, continuity and energy closure.
  Fixed historical viscosity, uncertain discharge conditions/contact footprint
  and uniform-emissivity centroids remain conditional assumptions. The centroid
  proxy is not the unresolved experimental Fabry–Perot measurement operator.
- All retained native solver variants fail the existing rigid-control gate.
  Parser/control tests passing does not admit those native PDE calculations.
  Keep `experimentalQualification` and `livePlaygroundQualified` false; this
  campaign has not established measured-profile agreement or predictive current.
