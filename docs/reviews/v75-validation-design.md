# v75 independent validation design

This is a prospective source/equation review, not a numerical or experimental
signoff. No project code was executed by this reviewer. Source reads and web
research were performed on the host; any future execution belongs in safe-dev.

## Execution paths checked

Read the v74 protocol, `coupled.py`, `thermal.py`, independent checker,
analyzer, verifier, coupled controls, checker controls and provenance controls;
also v73 `torsion.py`, and the existing TypeScript `fuel-transport.ts`,
`fuel-gas.ts` and `fuel-momentum.ts` paths.

The v74 mechanical workspace fixes its density/inertia at construction.
`Thermal.mass` and its gas heat capacity are likewise constructed once.
The total-energy calculation uses the same density before and after a step.
This is correct within v74's explicit frozen-density boundary, but not an
evolving-density implementation. Updating a displayed density, or only the
new transient coefficient, would leave stale old storage and missing work.

The existing radial species kernel conserves each normalized species and
uses an independent-species overdamped drift closure. Its own assumptions
explicitly exclude a barycentric zero-diffusive-mass constraint and local
angular-momentum transport. It is not an existing complete multicomponent
fluid model that can be inserted without new equations and checks.

## First require a declared physical closure

In a barycentric continuum, species diffusion cannot by itself change total
mass density: its mass fluxes sum to zero. Density is evolved by the bulk
velocity. Cantera's official
[governing equations](https://www.cantera.org/3.1/reference/onedim/governing-equations.html)
show the mixture-averaged correction that enforces this constraint.

The [PeleLM model](https://amrex-combustion.github.io/PeleLM/manual/html/Model.html)
provides a useful expert-code reference: conservative species storage,
continuity from their sum, and species enthalpy in the energy flux. Its
spatially constant thermodynamic-pressure approximation cannot simply be
assumed in a strong centrifugal pressure gradient. These references support
the bookkeeping constraints; neither validates this simulator's materials,
centrifugal closure, or operating point.

An alternative independent-species overdamped model may have a nonzero total
mass flux, but must explicitly identify its eliminated momentum/pressure
physics and its energy/work exchange with the bath or drag mechanism. Do not
call that flux a barycentric diffusive flux. A sum-of-ledgers pass cannot make
the two physical closures equivalent.

FiPy's documented
[exponential convection term](https://pages.nist.gov/fipy/en/latest/generated/fipy.terms.exponentialConvectionTerm.html)
is an available existing exponential-fitting discretization. Method reuse
does not supply the physical transport force, energy flux or boundary data.

## Primitive conservation quantities

Use species particle inventories `N[s,i]` or species masses, never normalize
each species back to one after an update. With known species masses `m[s]`,
cell volume `V[i]`, and cylindrical-volume mean `a[i] = <r^2>[i]`:

```
M[i] = sum_s m[s] N[s,i]
rho[i] = M[i] / V[i]
I[i] = a[i] M[i]
L[i] = I[i] Omega[i]
Ugas[i] = (3/2) kB T[i] sum_s N[s,i]       (monatomic one-T closure)
Ktheta[i] = L[i]^2 / (2 I[i])
```

For mixtures, gas heat capacity is determined by particle number, not by a
fixed argon specific heat multiplied by the new total mass. A composition
change at fixed particle number changes inertia but not this heat capacity.
A composition change at fixed mass generally changes both. This is a direct
way to expose a stale mean-mass assumption.

Save old and new species, temperature and angular momentum. Recover old/new
inertia, heat capacity and storage independently from those primitives.
Do not accept producer-computed old density as the independent reference.

## Local balances required at every accepted step

For oriented face particle flux `F[s,f]` (positive from cell a to b), the same
face occurrence must enter one species row negatively and the other positively:

```
N1[s,i] - N0[s,i] + dt sum_f outward F[s,f] = dt S[s,i]
L1[i] - L0[i] + dt sum_f outward F_L[f]
    = dt (electrical_torque[i] + viscous_torque[i] + other_declared_torque[i])
```

Boundary outflow must carry species, angular momentum and energy consistently.
For a closed vessel, every exterior species flux is zero and each species
inventory is separately constant. In a barycentric model also check
`sum_s j_s[f] = 0` on every face, not only globally.

The thermal/total-energy equation must include the selected closure's
species energy flux, compressive or pressure work, centrifugal exchange,
and any eliminated-flow dissipation. Do not determine a missing local heat
source by subtracting the final total-energy residual.

For changing inertia the exact endpoint identity is:

```
K1 - K0 = Omega1 (L1 - L0)
          - (1/2) Omega1^2 (I1 - I0)
          - (1/2) I0 (Omega1 - Omega0)^2
```

This is algebra, not a new constitutive model. It exposes the additional
inertia work and the correct old-inertia backward-Euler remainder. Reusing
the fixed-density formula misses the inertia term. Species angular-momentum
flux and its kinetic-energy flux must be derived together with the radial
force/work closure; advecting an angular speed without its inertia is not
conservative. For a full fluid, include meridional kinetic energy and the
corresponding momentum/pressure work as well.

Numerical upwind kinetic mixing and temporal damping must be individually
reported. If an energy-conservative total-energy method converts an identified
numerical mixing loss to internal energy, label it numerical and show it
vanishes under refinement. Do not silently call it physical viscous heating.

The existing actual electrical solver should still satisfy
`Pelec = Pjoule + sum(torque * Omega)` at the same accepted angular speed.
With prescribed conductivity it has no direct density input; density changes
current through rotation feedback only. A claimed additional density/chemical
conductivity response needs a separately justified closure and controls.

## Minimal adversarial controls

1. Zero transport coefficient recovers v74 primitive fields and ledgers at
   the same grid/dt. Explicitly cover multiple consecutive steps.
2. A two-cell particle transfer updates each density, old/new inertia,
   particle-number heat capacity, angular momentum and transported energy.
   Use unequal species masses and unequal cell radii/volumes.
3. Repeat that transfer with equal angular speeds, then equal specific
   angular momenta. These are different physical states and must not be
   conflated by the transport rule.
4. An axial face between equal radial cells has no radial inertia-geometry
   change. Distinguish pure angular mixing from centrifugal radial work.
5. Uniform equilibrium stays stationary, including zero flux at the axis
   and vessel walls. A passive species-label swap with identical masses and
   transport data swaps species fields but preserves every total field.
6. A fixed-number mixture-composition perturbation changes mass/inertia
   without changing monatomic number heat capacity; a fixed-mass perturbation
   changes particle heat capacity. Check both independently.
7. Closed, unforced, adiabatic evolution conserves each species and total
   angular momentum. The declared total-energy ledger closes with only its
   explicitly identified numerical losses. Verify every local row too.
8. Prescribed-temperature rigid-rotation equilibrium has the exact
   barometric/isotope profile for the chosen closure. Test detailed-balance
   face flux, inventory normalization and finite-time relaxation separately.
   An isothermal control has an external heat bath and cannot be claimed
   adiabatic by omitting that bath work.
9. Nonuniform temperature with no forcing exercises species-energy flux.
   Compare an independent sparse linear reference where coefficients freeze;
   do not accept only a repeated implementation of the same face helper.
10. Smooth axial perturbations must evolve axially; a radial average is a
    deliberately incorrect negative control. Include axial-shear/endwall
    braking with spatially evolving composition and current feedback.
11. Reject negative/nonfinite species, degenerate geometry, invalid sourced
    properties and nonpositive total heat capacity. Admit a zero abundance
    only if the selected equations explicitly support a disappearing species.
    Never clip or renormalize an accepted trajectory to hide a failed solve.
12. Corrupt species in one cell, face-transfer sign, old inertia, species
    energy flux, numerical mixing heat and current endpoint independently.
    Each corruption must fail the appropriate local check even where totals
    cancel by construction.

## Independent checker and artifact admission

Keep the v74 electrical, viscous and conductive graph reconstruction outside
production imports. Add independent species-flux assembly from primitive
endpoints, geometry and declared coefficients, plus independent transported
angular momentum/energy and the selected radial-work closure. Serialize
or reconstruct every term needed to check local rows. A checked global
normalization is insufficient evidence for local mass/angular transport.

Reject nonfinite *derived* quantities, residuals and tolerance scales before
comparison. Report storage roundoff separately from physical exchange scales.
Do not reuse a large tungsten background energy as the only tolerance scale
for a tiny species-transport heat balance.

Bind checker/analyzer outputs to exact raw bytes and bind raw data to the
actual complete source/dependency snapshot before the run. Save requested
times, accepted per-step checks, any substeps, and their physical durations.
Do not relabel the closest available step as a requested time. Reject old
v74 schema records without species/old storage rather than interpreting them
as fully coupled evidence. Reused green audits must fail after one raw byte
changes. Keep each failed study and its source/manifest identity.

## Prospective refinement gates

Retain the v74 profile gates: response-normalized RMS below 2%, local maximum
below 5%, each tracked observable below 2%, decreasing errors unless all
compared errors are below the predeclared 0.2% floor. Tighter endpoint/linear
tolerances must change observables by less than 0.1%. Freeze new species and
density normalizations before running; use the physical transport response
scale with an explicit absolute floor, not the background inventory alone.

Add density and each independent species field to r-only, z-only, timestep,
and joint studies. Compare conservative species inventories/densities across
grids before reconstructing fractions. Ratios of separately restricted
inventories preserve mixture identity; averaging purity ratios does not.
Conservatively restrict total internal energy and inertia/angular momentum
before recovering temperature/speed if the quantities themselves are the
coarse physical states. Also report primitive-profile differences explicitly
so a large common background cannot hide a failed boundary layer.

Track density extrema, species variance/centroids, inner inventory purity,
species flux, current, Joule/shear heat, interface heat, wall torques,
transported angular momentum, pressure/centrifugal work and numerical mixing
loss separately. Include early diffusion and hot-wall/endwall transients.
Require a finer spatial reference and smaller-dt repeat on the reference grid.
No isothermal equilibrium match alone qualifies nonisothermal time evolution.

The numerical result, if these gates pass, is still limited to the declared
closure and coefficients. It cannot qualify an omitted pressure equation,
measured binary transport, lithium ionization, or a Marathon operating point.

## Implemented independent stage checker

The selected extension now evolves compressible meridional flow, total energy
and species masses, rather than attributing total-density changes to binary
counterdiffusion. `independent.py` reconstructs primitive EOS, reflected-ghost
Rusanov faces, cylindrical sources, contact-consistent angular/species
transport, binary pressure diffusion and species enthalpy flux. Its only
imports are NumPy and the standard library. It independently reconstructs both
SSPRK2 stages and compares all local conserved endpoints. It also checks closed
mass, angular momentum, energy and species totals. Reflected ghost states
provide a distinct boundary implementation from production's explicit wall
formula. A separately reported face-arithmetic allowance covers the ULP error
of independently cancelling pressure fluxes and geometric sources; it never
modifies a flux or heat source.

The equations review identified an additional current path once radial flow
exists. With axial B, no azimuthal electric field and diagonal perpendicular
conductivity, `Jtheta = -sigma_P B ur`; its radial force is
`-sigma_P B^2 ur` and Joule heating is `sigma_P B^2 ur^2`. The independently
checked frozen-inventory operator therefore has exponential radial-momentum
decay, unchanged total energy, and lost radial kinetic energy entering internal
energy. `check_magnetic` reconstructs that analytic result and checks every
unchanged conserved component, zero external work/angular impulse, and local
positive Joule heat. `expm1` evaluates tiny heat that would disappear when two
rounded kinetic energies are subtracted. Its receipt is checked against that
analytic integral even when the momentum change itself is below one ULP.

Hand controls exercise local corruptions whose totals cancel, species-dependent
heat capacity, meridional/swirl kinetic-energy subtraction and diffusion-data
domain admission. Test-only imports additionally compare actual production
flow and diffusion stages against the independent reconstruction. Magnetic
controls compare the actual implementation with analytic density-dependent
decay, zero/reversed B, sub-ULP heat and deliberately corrupted receipts.

This reviewer authored the checker and these controls; their existence is not
independent validation of their own implementation. The parent owns execution
inside safe-dev and must report the copied snapshot, actual test results and
convergence studies. No such numerical signoff is made in this design note.

## Independent source review of analyzer and coupled admission

Reviewed the separately authored `analyze.py`, `audit.py`, `mixcheck.py`,
`coupling.py`, `run.py`, `verify.py`, canonical manifest and prospective
protocol. No blocking equation or gate-logic defect was found in the analyzer:
it requires the declared physical times; reconstructs EOS from conserved
fields; uses cylindrical overlap, density-weighted fraction restriction and
mass-weighted fraction RMS; and applies the frozen profile, observable,
decreasing-error, tolerance and reference gates. The protocol explicitly
chooses primitive-volume restriction for temperature, speed and density. It
does not claim that restricting primitive temperature/speed is equivalent to
restricting total internal energy/angular momentum first.

Density and fraction normalizations include the initial nonuniform pattern
relative to uniform reference values. Thus a passing field-error gate does
not automatically establish fractional accuracy of a much smaller *change*
in separation during the short history. This scope must remain explicit.

The source graph audit now admits primitives, requires exact unchanged mass,
species and meridional momenta, checks derived tolerance finiteness, and
reconstructs local angular/thermal rows with fresh binary heat capacity and
inertia. The current graph retains same-endpoint work consistency; magnetic
radial damping is a separate local stage and is not double-counted as r/z
current heat. The actual coupled corruption control exercises all four stage
audits, then challenges mass, species, angular momentum, total energy,
diffusion enthalpy and incorrectly deposited backward-Euler loss.

One concrete reporting defect was sent to the parent before the full study:
radial species centroids used the arithmetic radial midpoint. For a
piecewise-constant cylindrical density, the inventory's exact mean radius is
`(2/3) delta(r^3)/delta(r^2)`, giving `2R/3` for a uniform full cylinder. The
recommended root fix uses `flow.mean_r` for radial moments, retains axial
midpoints, and adds that analytic regression. This is a geometric observation
operator correction; it does not alter the governing fluxes or properties.

The tagged-species Fick cosine control and binary rotating pressure-diffusion
control were also source-reviewed. The former uses cell-averaged initial and
exact profiles; the latter scales a species-density *rate* by a physical
diffusion timescale rather than by shrinking cell mass. No diffusion sign or
analytic-reference equation error was found. These are source-review findings;
the parent owns all reported runtime results and experimental qualification
remains outside this review.
