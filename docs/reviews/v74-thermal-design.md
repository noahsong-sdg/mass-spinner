# v74 thermal design and source re-audit

The initial design assessment below is retained as history. The implementation
re-audit at the end supersedes its proposed architecture and current-status
claims, including the earlier sliced-liner option. No project code or tests were
executed by this reviewer; read-only inspection and document edits respect the
safe-dev boundary.

## Verified execution path and root cause

`src/fuel-spatial-operation.ts` repeats a radial angular-speed field across the
electrical axial grid, then sums torque and Joule heat back into radial bins.
`src/fuel-gas-thermal.ts` evolves radial mixture energy and a radial tungsten
liner at a mutually accepted temperature. `scientific/axial-v73/torsion.py`
instead evolves a full r-z angular-speed field, fixed density, and zero radial
and axial velocity using actual FiPy cylindrical finite volumes. It accounts
separately for physical shear heating and backward-Euler numerical loss.

The missing coupling is a state-space mismatch: an axial thermal or mechanical
field cannot pass through the present radial thermal API without projection.
In simple terms, axial slices with different speeds and temperatures are being
forced to share one radial state. Preserving total torque alone cannot preserve
local heating or torque work after such averaging.

`src/fuel-current.ts` already provides the needed discrete adjoint: each radial
current half-link contributes both its motional EMF and the matching cell
torque. Its accepted power identity is
`P_electrode = sum(I² R_half) + sum(torque_cell * omega_cell)`.
The same full angular-speed vector, cell order `j*nr+i`, torque vector, and
endpoint must reach the torsion solve. Do not replace these by axial averages.

## Smallest defensible research extension

Keep density, species inventories and geometry fixed for this stage. Evolve
`omega(r,z)` and gas `T(r,z)`, supplied diagonal conductivity closures, and
local sourced neutral `mu(T)` and `k(T)`. This remains a constrained azimuthal
flow/energy model. It does not solve the pressure balance, meridional flow,
compression work, evolving ionization, or species migration. Temperature
gradients at fixed density can create pressure gradients; the omitted momentum
equations are therefore an explicit physical limitation, not a validated
equilibrium.

Use a cylindrical gas-energy operator with ordinary thermal conductivity:

```
C_cell (T_new - T_old) / dt
    = sum(inward conductive face heat) + P_Joule,cell + P_shear,cell
C_cell = (3/2) k_B N_cell
```

Gas heat capacity has the physical cell volume. The `r²` factor used in angular
inertia and torsional diffusion must not be carried into thermal conduction.
There is no advective enthalpy flux with the stipulated zero meridional flow.
Depositing all Joule heat locally into this one gas temperature assumes rapid
electron-to-heavy-species thermalization; it must be described as an assumption.

Actual FiPy 2D gas conduction plus axial slices of the existing exact radial
tungsten enthalpy model is a coherent first implementation. A direct extension
of the existing conservative thermal graph with axial gas links is also sound.
Choose one operator and independently reconstruct its fluxes; adding an
unnecessary second production implementation increases the verification burden.
The existing radial solver used independently per slice, without reciprocal
axial heat links and a coupled endpoint solve, is insufficient.

For liner slices, use slice length `dz`, exact annular masses, and NIST
`m * h(T)`, never `m * cp(T) * T`. Prescribed **total** film and cooling
conductances in W/K scale by `dz / length`; they are not area coefficients.
Independent radial liner slices omit axial solid conduction. Label that
restriction and test its importance before claiming a resolved endwall/liner
thermal field. A later 2D solid extension is a separate reviewable change.

## Physical shear heating and the numerical ledger

The v73 global shear heat needs a local source field before thermal coupling.
For every viscous face use the exact assembled face torque conductance `G`:

```
torque_face = G * (omega_right - omega_left)
physical_heat_face = G * (omega_right - omega_left)^2 >= 0
```

Count each internal face once. Split its heat between adjacent gas cells in
proportion to the two viscous half-resistances used by that face coefficient;
equivalently each half contributes `torque_face² * R_half`. This reconstructs
where the discrete dissipation occurred and sums exactly to the mechanical
ledger. For nonuniform cells or viscosity, an unconditional 50/50 split is not
that reconstruction. Verify the actual FiPy interpolation weights rather than
assuming equal half-distances.

For a no-slip boundary in v73, the face-to-cell resistance represents fluid
inside the modeled half-cell. Its dissipation heats that adjacent gas cell.
Stationary walls perform zero work, although they exert torque. Moving walls
perform `omega_wall * torque_wall_on_fluid`. Do not also deposit that same
boundary shear heat directly into tungsten. A finite-slip surface with a
separate interfacial heat partition requires a different, specified model.

Retain the positive backward-Euler mechanical defect
`N_BE = sum(0.5 * I_cell * (omega_new - omega_old)^2)` as numerical loss.
It is never a thermal source. With outward reservoir heat positive, the
accepted whole-step identity is

```
delta(K + U_gas + U_liner) + Q_out + N_BE
    = dt * (P_electrode + P_moving_walls)
```

No magnetic-field storage is added to this quasistatic electrical model.
Temperature dependence changes constitutive rates; it does not create an
extra energy source merely because viscosity or conductivity changed.

## Defensible thermal boundaries

At the axis impose regularity/zero radial heat flux. Axial thermal insulation
is a valid controlled first case, independent of stationary mechanical
endwalls. Fixed end temperatures instead represent external heat reservoirs;
log their signed heat in `Q_out`. Do not invent a finite endcap mass or material.

For the curved wall, retain one series chain of gas half-cell, prescribed
film/jump resistance, and solid half-cell. The same interface flux leaves gas
and enters solid. If FiPy already supplies a gas half-cell through a boundary
face, do not add it twice. Endwall annular face area is
`pi * (r_right²-r_left²)`; curved slice area is `2*pi*R*dz`.

The v57 temperature-jump convention is an approximate continuum boundary,
not calibrated Li/W accommodation data or a free-molecular flux cap. At full
accommodation it retains a finite jump resistance. Thermal accommodation
cannot be inferred from mechanical no-slip or the collision-rate slider.
The v60 study found no missing-half-cell/factor-two defect: deleting a real
resistance to improve convergence would change the physical problem.

## Accepted endpoint and minimum gates

Iterate local accepted temperature to properties, full current, torsion, local
heating, and gas/solid energy. Re-evaluate current and all physical sources at
the final temperature and angular speed. Check equation residuals and the
work identity, not only damped iterate differences. If supplied electrical
conductivity is held fixed, say so; a cached frozen operator must be rebuilt
when temperature-dependent electrical coefficients are introduced.

Required numerical evidence before promoting this research path:

- Rigid co-rotation and uniform temperature with insulating, undriven
  boundaries remain unchanged; stress-free walls exert no torque.
- Adiabatic unforced shear decay converts resolved kinetic loss into gas
  heat, with only the separately reported `N_BE` left over. Internal and
  boundary heat partitions reproduce the total face-dissipation sum.
- Moving-wall and electrode work close separately, including field feedback
  from a genuinely axial angular-speed perturbation.
- Independent pure-conduction axial/radial modes and interface fluxes pass
  with frozen properties before testing nonlinear properties.
- Gas/liner interface fluxes are equal and opposite; the isothermal state
  stays stationary; reservoir heating and cooling retain their signs.
- Recover the radial limit with uniform axial data and insulated end faces,
  comparing the same mesh/constitutive/boundary conventions.
- Joint radial, axial and timestep refinement includes early local gas-wall
  and endwall layers, local temperature/heating, wall torque partitions and
  integral budgets. A passing global budget alone is not convergence.
- Use source-supported property domains without silent extrapolation;
  test domain boundaries and preserve failed cases in the report.

These checks establish consistency and numerical accuracy for the stated
closure. They do not validate it against an experimental centrifuge.

## Evidence inspected

`src/fuel-gas-thermal.ts`, `src/fuel-thermal.ts`,
`src/fuel-neutral-transport.ts`, `src/fuel-current.ts`,
`src/fuel-spatial-operation.ts`, `scientific/axial-v73/torsion.py`,
`docs/SPATIAL-GAS-ENERGY-V57.md` accommodation section, and
`docs/JOINT-HOT-WALL-CONVERGENCE-V60.md` root-cause/refinement sections.

This review recommends design and gates only. It does not claim that v74 has
implemented or passed any of them.

## Implemented-source re-audit

Historical source-review status: no new physical equation defect was found
within the stated constrained closure. Numerical evidence was pending at that
time; the subsequent bounded study05 qualification is recorded in the
[final independent review](v74-independent-final.md) and
[physics review closeout](v74-physics.md). This reviewer authored the thermal kernel and
workspace/control tests, so this is adversarial re-review rather than independent
validation of the reviewer's own implementation. A separate physics reviewer
owns the independent reconstruction and final artifact verifier. The parent's
reported 34-control safe-dev pass has not yet been checked against its exported
receipt by this reviewer.

### Implemented thermal operator

The chosen implementation has full r-z gas **and tungsten** conduction,
including axial solid conduction. It does not use uncoupled radial wall slices.
Gas capacity uses exact physical volume and monatomic fixed-inventory argon
`mass * 3 k_B/(2 m_Ar)`. Tungsten storage uses sourced `mass*h(T)` relative to
300 K; sourced `cp(T)` is the increment Jacobian, not a replacement enthalpy.
Both radial and axial internal fluxes are reciprocal.

Radial links use exact series logarithmic half-cell resistances at the declared
arithmetic cell centers. Axial links use half-cell lengths, harmonic material
resistance and exact annular area. The direct physical-flux residual and true
enthalpy difference are the converged equations; the FiPy cylindrical increment
operator encodes these conductances with physical thermal capacity, not torsional
`r²` weights.

The new `contact_h` and `cooling_h` are **W/(m² K)** area coefficients. They
are not the older radial API's total W/K inputs. Contact resistance appears
once between gas and solid half-cells; the outer Robin chain includes the solid
half-cell once. Curved slice area is `2*pi*R*dz`; axial face area is
`pi*(r_right²-r_left²)`. Zero film coefficient insulates. Logged positive bath
power leaves the combined gas/solid domain.

The axis and thermal end faces are insulated. Mechanical no-slip endwalls and
thermal insulation are separate controlled choices. The prescribed films are
conditional inputs, not measured Li/W accommodation or a kinetic jump model.
There is no finite endcap thermal mass, endcap heat loss, radiation, evaporation
or surface chemistry in this experiment.

### Work, sources and reusable geometry

The actual TypeScript current graph receives full `omega(r,z)` and returns the
matching torque/Joule vectors. Its half-link EMF and torque pairing preserves
electrical work. The accepted electrical/mechanical endpoint has both a speed
mismatch gate and a separate torque-work-defect gate. Physical source deposition
is local Joule plus local viscous heat at the accepted temperature.

Face shear heat is allocated by the actual two viscous half-resistances;
boundary no-slip dissipation heats the modeled fluid half-cell. Stationary walls
exert torque with zero wall work; moving-wall work is `omega_wall*torque_wall`.
The backward-Euler mechanical defect remains an external numerical loss and is
not thermalized. The summed ledger is
`delta(K+Ugas+Usolid)+dt*P_bath+N_BE=dt*(P_electrode+P_moving_walls)`.

`Stepper` constructs fixed torsion geometry once and changes viscosity through
a dependency-tracked FiPy CellVariable. Harmonic faces update with viscosity;
every trial resets the mechanical old/current state. The fresh-stock-Torsion
comparison API remains available. Source review finds no stale-temperature
coefficient introduced by this optimization.

### Coverage and admission gaps

Reviewed controls cover absolute interface resistance, bath sign, axial solid
conduction, closed enthalpy budgets, a discrete axial thermal eigenmode, radial
limits, accepted-temperature sources, rigid equilibrium, moving-wall work,
weak torque, changing viscosity and fresh/reused workspace equivalence. No new
runtime pass is claimed here.

The active checker reconstructs properties, primitive fields, currents, local
Joule/shear heat, momentum rows, thermal rows and total ledgers. It does not
comprehensively admit corrupted setup metadata: finite positive dt, ordered
contiguous geometry, positive density/conductivity, film domains and electrical/
thermal grid identity need explicit admission. Producer guards protect actual
runs, but they cannot be assumed for arbitrary serialized inputs. Minimal checks
were sent directly to the independent final-results reviewer for
`verify_results.py` and its tests, without changing the active run checker or
relaxing gates.

Scheduled primitive fields, checked current/heat quantities and independently
reconstructed ledgers are authoritative. Unused producer summaries, including
some residual scores and cached energy totals, receive no additional verification
claim merely because the primitive-state audit passes. Their existence does not
require an expensive scientific rerun when they are not acceptance inputs.

An explicit gas/solid/reservoir entropy check and a passive-temperature maximum
principle would be useful additional controls. Positive capacities, reciprocal
positive conductances and nonnegative physical heating support the expected
behavior; this is a source-level inference, not newly executed evidence.

### Historical source-only scope and numerical prerequisites

This remains fixed-density, single-temperature, pure-argon azimuthal flow with
supplied electrical conductivity. It omits pressure balance, meridional flow,
compression, species migration, ion-neutral slip, electron energy and ionization.
Local Joule deposition assumes rapid electron-to-heavy-species thermalization.
Temperature gradients at fixed density need not satisfy omitted pressure/momentum
equations. Neutral argon transport is not a measured lithium/plasma closure.

The legacy constant-voltage/grounded-endplate corner idealization is a retained
failed verification input. Study03 uses a smooth distributed outer potential
compatible with the grounded endplates. This manufactured boundary is not one
equipotential metal electrode or a Marathon engineering specification. Its static
benchmark and coupled refinement artifacts required separate numerical review;
the linked study05 closeouts above record the completed bounded qualification.

The current source pass inspected `thermal.py`, `coupled.py`, `bridge.ts`,
`bridge.py`, `independent_check.py`, `manifest.json`, `ATTEMPTS.md`, and the
thermal, coupled, wall-work, workspace and checker tests. Joint r/z/dt convergence
requirements covered early/intermediate local fields and wall torque partitions
as well as global ledgers. Their accepted study05 evidence is documented in the
[final independent review](v74-independent-final.md) and
[physics review](v74-physics.md), not independently executed by this reviewer.
Experimental accuracy, live integration and browser/GPU behavior remain separate
and unclaimed here.
