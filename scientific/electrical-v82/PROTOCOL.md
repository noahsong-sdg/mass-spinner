# Absolute-current diagnosis before new predictions

12 November 2026. Freeze before the V82 physical campaign. Existing measured
velocities and the V81 failure are known; this is development-data diagnosis,
not new held-out validation. No current discrepancy may choose a contact radius,
voltage operator, collision coefficient or temperature. Keep V79–V81 sealed and
leave production physics, README and the deployed playground unchanged.

## What is and is not justified

The primary source supports a 24 cm half-length, 6 cm central radius, 4 mm hollow
cathode inner radius, 2 cm anode rings and 100 A per branch. No verified units or
factor-of-two bug was found. The physical cathode protrudes into a tapered region;
the source-theory ring and retained conducting disk are different idealizations.
No finite plasma-current footprint or near-cathode transport map is measured.
Floating steel rings do not identify plasma-side equipotentials without sheaths.
Do not silently replace these unknowns to raise current.

The corrected diffuse-mode voltage is 18.5±2 V, versus 58 V terminal voltage.
The source does not specify a finite-footprint spatial voltage operator or raw
V–I estimator. Power/current is the implemented current-weighted port voltage;
regional power/current is an additive volt-equivalent budget, not a measured
local potential drop. Never delete a layer to make the remaining voltage match.

## Verified mechanisms and frozen challenges

1. Test the known circular-contact spreading law
   `I=4 a V sqrt(sigma_radial sigma_axial)` with an independent FiPy cylindrical
   tensor-diffusion solve. Use the exact half-space potential on distant finite
   boundaries; refine the contact-edge graded mesh at predeclared counts
   16/32/64/128. Require analytical-current error and final current refinement
   below 5%, charge balance below 1e-8. It verifies a mathematical disk model,
   not the physical hollow cathode or any finite-vessel bound.
2. Reconstruct face Joule losses and electromagnetic work from each frozen V81
   solution using physical half-cell resistances and the same motional EMF
   integrals. Independently check regional electrical inflow = Joule + rotor
   work and global totals against solver ledgers, all below 1e-8. Local rotor
   work is not automatically local viscous heating. Report actual mesh-aligned
   cuts and physical units; assess budget mesh changes separately at 5%.
3. Retain both anode-spacing interpretations: centers at ±7 cm (14 cm center
   spacing) and ±8 cm (14 cm clear gap plus 2 cm anode widths). These are labelled
   sensitivities, never selected from residuals. Retain every other dimension.
4. Retain all ten transport scenarios in transport82.SCENARIOS. Both linear and
   quadratic radial shapes have: V81-leading 1 eV reproduction, finite-neutral-
   fraction 1 eV, and finite-fraction 2.5 eV with source-derived electron-neutral
   collision partition plus electron-ion-only and uniform-20% controls. Controls
   are endmembers, not uncertainty bounds. All profiles remain axially uniform.
   Neutral density interpolates Table1 4.3e20→45e20 m^-3. Infer electron/ion
   density from the source sigma*B/(e*beta_e) for covariance; do not claim it is
   a measured local map. Use the actual Eq8 squared neutral mass fraction.
5. At fixed densities, heavy temperature, ion Hall parameter, Qen=4e-20 m² and
   Coulomb logarithm, varying Te gives electron-rate gain
   `g=1/[(1-f) Te^-3/2 + f Te^1/2]`; sigma_parallel and beta_e both multiply by g.
   Recompute ion slip, Pedersen/Hall conductivities and effective beta jointly.
   A sigma-only multiplication at fixed beta_e is not this collision change.
   The source's 2.5 eV alternative and constant cross section remain conditional.

## Campaign and comparison

For each of ten transports and two geometries, solve all three nominal-voltage
refinements (32×48,64×96,128×192), plus 16.5 and 20.5 V at the finest grid:
100 absolute predictions. Use source conductivity normalization 1070 S/m with
its prescribed spatial/collision gain; never condition it on current. Run the
independently assembled V81 reference at identical transport and voltage.
Retain original 5% final flow/current/power refinement and reference gates and
1e-8 conservation/residual gates. Budget diagnostics have their own assessment.

For each geometry/transport also run a nominal finest-grid locked-flow operator
control: suppress motional EMF and torque while retaining the same conductivity
tensor. This is not a physical zero-B plasma; 20 controls test passivity.
Derive the fixed-100 A solution by exact linear drive scaling of the nominal
fixed-property solution. Report its required port voltage and compatibility with
[16.5,20.5] V. This uses the stated current as input, never velocity fitting.
Keep its optical comparison distinct from the absolute-voltage challenge.

Seal all predictions and source hashes before scoring. Reuse unchanged V80
brightness, edge closures, optical meshes, spectral bins and temperature/
instrument/estimator sensitivities. Score every finest-grid absolute-voltage
case and each fixed-100 A case (80 optical cases, 5,760 alternatives) against
the unchanged V79 points/masks and 20% rule. Keep all failures and electrical
incompatibilities visible. Passing these tests never supplies unknown apparatus
or diagnostic inputs and does not establish experimental accuracy.
