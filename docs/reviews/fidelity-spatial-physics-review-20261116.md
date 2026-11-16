# Optional spatial experiment: independent physics source audit

16 November 2026. Reviewer: energy-closure workstream, independent of the new
spatial adapter and UI authors. Source inspection only: no host scientific
imports, calculation, test execution or new VM. Required runtime checks remain
the coordinator's responsibility. This document does not approve a release.

Reviewed new adapter SHA-256:
`8a91396615cf102aa761ce73e784326082d9d1c5ee2e994561db74588211bb31`.
Reviewed corrected UI SHA-256:
`00dc46ba1f9c54129f2037ad13ea868ceaeed7cdd05b94786dbcd1d09a7fc767`.
Reviewed adapter-test SHA-256:
`d58f40df46d28278f6648548b347f31da192b3c64a31efff5f96a06b28104deb`.

## Actual execution path checked

`simulateFuelSpatialExperiment` → copied on/off `createFuelSpatialStepper`
setups → `advance` in `fuel-spatial-operation.ts` → accepted species face
transfers, projected r–z electrical currents/torques, local angular momentum,
gas enthalpy and liner conduction. Read `fuel-current.ts`,
`fuel-spatial-coupling.ts`, `fuel-gas.ts`, `fuel-gas-thermal.ts`,
`fuel-momentum.ts`, `fuel-neutral-transport.ts`, new adapter/UI and tests.

- **Contacts and signs:** the electrical solver appends outer faces for all
  lower axial rows, then grounded upper-disk faces, then the final outer face.
  The adapter's outer-current extraction matches that actual order. Conventional
  positive current is out of the gas. With positive outer voltage and positive
  axial B, inward radial current gives positive azimuthal torque. Source power
  is `−V_outer I_outer,out`, consistent with the solver's port ledger.
- **Geometry:** equal-r² radial cells make the grounded disk's inner `nr/2`
  cells exactly half the end area on every admitted mesh. This is a conceptual
  1 cm × 10 cm cell, not the 1979 argon apparatus or Marathon's hardware.
- **Momentum and heat:** the endpoint torque/motional-EMF weights are adjoint.
  The accepted conservative species transfers also carry angular momentum and
  species enthalpy. Shear and centrifugal work enter the gas; backward-Euler
  and upwind losses remain numerical ledgers. Cumulative budget signs match
  the existing step identity. Stationary walls remove angular momentum with
  zero mechanical wall work; the model does not invent an external heat sink.
- **Density and species:** equal argon masses and normalized passive-label
  inventories produce the exported mass density consistently. They do not
  represent ions versus neutrals, evolving charge fraction or isotope enrichment.
- **Switching:** the first half evolves at full applied voltage; switching
  grounds both contacts. A zero-time endpoint solve supplies right-continuous
  current without another physical update. Zero volts means a short circuit,
  which permits motional braking current, not an open circuit or plasma quench.
- **Properties and scope:** neutral viscosity/conductivity use their bounded
  source functions; tungsten enthalpy stays within 300–1900 K. Electrical
  conductivity, diffusion and film conductance remain prescribed. No Hall
  momentum, separate electron energy, ionization, axial shear, meridional
  momentum or feed/exhaust is claimed.

## Findings corrected by the authors

The original select described a *voltage amplitude after half the window*,
but its engine argument was a *fraction of the duration driven at full voltage*.
Thus “Half voltage” actually switched to zero at halfway, and “Switch to zero”
meant grounded throughout. The corrected “Driven fraction of window” choices
name the actual boundary history. This is the smallest fix: change the incorrect
UI contract, preserving the existing engine and switch clocks. “Initial neutral
density” was also corrected to “Initial argon number density,” avoiding a charge-
partition claim absent from the common-fluid state.

The adapter's exported `cathodeRadiusM` also assigned a polarity-specific name
to the grounded disk even when negative outer voltage reverses the electrode
roles. The new schema now calls it `groundedDiskRadiusM`. This preserves the
actual geometry without assigning a false cathode identity.

## Required actual checks

Source regression coverage now includes zero drive, B=0 heating without torque,
port power/sign and integrated budgets, conservative equal-mass inventories,
exact pulse-prefix states on matching accepted clocks, zero duration, voltage
polarity symmetry, and grounded-throughout equivalence. The UI must separately
pass cancellation/stale-result and export checks. Execute the admitted material
boundary, especially initial 300 K, to detect roundoff-triggered domain refusal;
do not clamp or extrapolate property functions to conceal it.
The source also includes a three-level short-window angular-speed comparison
under the unchanged 1% time screen plus contraction. A successful result there
would not qualify temperature, density, other windows or spatial resolution.

No additional source blocker was identified in this path after the semantic
correction. Actual regression/build/typecheck evidence is still required.
These checks cannot erase retained startup/refinement failures or qualify the
trajectory experimentally; `numericallyQualified`, `experimentallyQualified`
and `liveDefaultReplaced` correctly remain false.
