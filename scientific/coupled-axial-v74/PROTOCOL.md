# v74 prospective coupling qualification protocol

Frozen before coupled studies. Passing this protocol establishes numerical
consistency for fixed-density argon azimuthal transport, prescribed diagonal
electrical conductivity, and one-temperature immediate Joule deposition. It
does not establish experimental accuracy, ionization equilibrium, complete
fluid force balance, or a Marathon operating point. No experimental parameter
fit is permitted.

## Model and evidence boundary

Use the actual TypeScript electrical half-link solver and sourced neutral
argon viscosity/conductivity, FiPy r,z torsion, and FiPy r,z gas plus tungsten
energy with insulated end faces and an outer Robin heat reservoir. Retain
full axial solid conduction. Frozen density and heavy-particle number imply
no meridional advection, compression work, or species redistribution.

Mechanical endwall speeds and thermal boundary conditions are independent.
Viscous fluid boundary half-cell heat heats gas. Stationary no-slip walls do
no mechanical work. Record moving-wall work separately. Backward-Euler loss
is a numerical sink, never a physical heat source.

An initial illustrative scale is `R=0.06 m`, `L=0.14 m`, argon
`rho=0.001 kg/m^3`, tungsten thickness `0.003 m`, gas `400 K`, wall `600 K`,
`B=0.2 T`, prescribed `sigma_P=0.03 S/m`, `sigma_parallel=0.3 S/m`,
electrode patterns of order `3–10 V`, and initial rotation of order
`1000 rad/s`. These are numerical test inputs, not experimental estimates.
Exact cases, meshes, dt, final times, tolerances and output times must be
serialized in a manifest before that study executes. Tractability changes
may change numerical inputs or illustrated forcing, with the reason recorded,
but must not silently replace an already failed case.

## Independent checker

The checker may use NumPy/SciPy but must not import the production coupled,
torsion or thermal modules. Reconstruct from serialized primitive geometry,
inputs and endpoint fields:

1. Electrical radial logarithmic and axial planar half-resistances; cell
   torque weights and matching motional EMFs; boundary voltages and insulating
   total-current faces. Solve its independent grounded sparse graph, compare
   potential up to the declared voltage reference, currents, torque and Joule
   heat. Do not reconstruct heating from a reported power total.
2. FiPy torsional face conductances, using actual harmonic-viscosity and
   distance weights. Recover all boundary torques, moving-wall work, local
   resistance-weighted shear heat, angular momentum and backward-Euler loss.
3. Thermal gas/solid finite-volume face fluxes, gas inventory and tungsten
   enthalpy storage. Recompute interface heat leaving gas and entering solid,
   outer Robin reservoir heat, and every endpoint energy row. Use the exact
   admitted constitutive table/formula and domain; independence lies in graph
   assembly and residual reconstruction, not arbitrary alternative properties.

Finite inputs are insufficient: reject nonfinite derived energies, face
conductances, rates, residuals and residual scales before tolerance checks.
All physical face conductances, thermal capacities and local dissipation must
be nonnegative, with positive storage capacity. No residual may be turned into
a heat correction.

## Conservation and consistency gates

At every accepted step independently verify

```
P_electrode = P_Joule + sum(torque_cell * omega_cell)
delta L = dt (sum(torque_cell) + sum(wall_torque))
delta K + H_shear + N_BE = W_electrical_mechanical + W_wall
delta(K + U_gas + H_solid) + Q_reservoir + N_BE
    = W_electrode + W_wall
```

Signed outward reservoir heat is positive. Gas/solid interface flux is
internal and cancels globally. Local heat sums must equal their independently
assembled face sums. For each ledger use a tolerance of `1e-8` times the sum
of absolute exchanged terms plus `64 * machine_epsilon` times the absolute
before/after storage scale. Report the storage roundoff allowance separately.
Cell residual norm is normalized by the corresponding sum of absolute
storage-change, face-flux and source terms, not by total stored wall energy.
Electrical graph agreement and torque/heat reconstruction must reach
`1e-7` relative to nonzero solution/source scales, with separately reported
floating-point absolute floors. Tightened tolerances must not change accepted
physical observables by more than `0.1%` of the profile scales below.

## Required controls

- `B=0`: zero electromagnetic torque and rotation-dependent current feedback;
  voltage-driven Joule heat may remain.
- Add a common voltage offset: same current, torque and heat. Compare relative
  potential to avoid claiming a gauge-dependent discrepancy.
- Apply an axial speed perturbation at fixed radial mean: verify the full r,z
  current/torque response differs where expected from a radial projection.
- Rigid co-rotation, no drive, stress-free walls, uniform temperature: unchanged
  mechanical/thermal state and zero wall torque.
- Adiabatic unforced shear decay: kinetic energy becomes physical gas heat
  apart from the explicitly recorded numerical sink. Run stationary no-slip
  endwalls and a moving-wall case to distinguish torque from wall work.
- Equal electrode potentials with rotating gas: verify motional-current
  braking, nonnegative Joule heat and the whole-step energy balance.
- Pure axial/radial thermal conduction at frozen properties: compare an
  analytic eigenmode or independent sparse transient solution. Uniform thermal
  equilibrium must remain stationary.
- Gas/solid temperature step and outer-reservoir heating/cooling: equal/opposite
  interface flux, correct reservoir signs, and no extra source at a stationary
  mechanical endwall.
- Nonuniform grid and unequal neighboring viscosity: verify local shear-heat
  partition against half-resistances, including one-sided wall faces.

## Refinement studies and prospective acceptance

Use at least three successively refined meshes plus a strictly finer reference
for a nonuniform axial drive/endwall-braking case and an initially hot-wall
case. Include independent radial, axial and timestep refinements, followed by
a joint series with `dt proportional to h^2`. The manifest fixes the exact
sequence and physical output times before execution. A reference is numerical,
not truth: report its own further refinement or independent-discretization
check. Never compare different physical final times or only each run's last
step. Include early output times that resolve the gas-wall/endwall layer,
intermediate evolution and the final observation time.

Compare nested grids by cylindrical-volume-conservative restriction of the
fine field onto each coarse cell. For each field, report volume-weighted RMS
and maximum absolute difference. Normalize angular-speed error by
`max(1 rad/s, max_abs(omega_reference))`. Normalize temperature error by
`max(1 K, max_abs(T_reference - T_initial))`, separately for gas and tungsten;
also report absolute kelvin error. This response scale prevents the large
absolute baseline temperature from hiding a missed transient. For a nonuniform
initial state use its same conservative cell representation in both terms.

For acceptance, the finest tested grid must have less than `2%` normalized
RMS error in gas temperature, solid temperature and angular speed, and less
than `5%` maximum response-normalized local field error at every scheduled
noninitial output. Errors must decrease from the first through finest levels,
unless all compared errors are already below `0.2%`. Report observed orders
without requiring an asymptotic order where boundary singularities prevent it.
Track gas/wall peak temperature, endwall/curved-wall torque, physical shear
heat, Joule heat and total current as separate observables. Each nonzero
observable's finest-reference difference must be below `2%`, normalized by
its maximum absolute reference value over the full observation history.
For identically zero controls use the conservation absolute floor rather than
divide by zero. Retain sign changes; an integral cancellation is not an error
normalization scale.

Vary nonlinear and linear solve tolerances independently of mesh/dt and pass
the `0.1%` invariance gate above. Include a smaller-dt repeat on the finest
mesh to rule out compensating spatial and temporal errors. Only cases whose
entire scheduled trajectory passes may be called numerically qualified.

## Reporting

Store every attempted manifest, failure, solver exception and raw result. A
failed run may be followed by a justified root-cause fix and rerun, but its
original record remains. Separate implementation defects, unresolved
discretization error, and missing physical closures. Passing a ledger, a unit
test set, or a synthetic reference is never described as experimental
validation. Production/live qualification requires its own integration and
browser checks; this protocol qualifies the research backend only.

## Analytical electrical admissibility screen added before acceptance

The original uniform outer potential meeting grounded end faces has a
Dirichlet jump at each corner. Independent analysis establishes infinite
continuum Joule energy, even though each finite network balances. This is a
newly identified invalid qualification setup, not a reason to loosen any
numerical threshold. Preserve studies 01/02 as failed/negative evidence.

For the revised control freeze `outerVoltageProfile='sin(pi*z/L)'`, sampled at
axial face midpoints, with grounded ends and unchanged physics/property
closures. This is a manufactured distributed-potential boundary, not a
single equipotential electrode. Require the analyzer to reject legacy
constant-corner traces and withhold qualification without a matching analytic
static-current report.

Before expensive coupled reruns use the actual TypeScript current solver
with `B=0`, `Omega=0`, prescribed constant conductivities and the same cylinder.
At frozen meshes 6, 12, 24, 48 and 96, compare against

```
k=pi/L; a=k sqrt(sigma_parallel/sigma_P)
phi=V0 I0(a r)/I0(a R) sin(k z)
P=pi R L sigma_P V0^2 a I1(a R)/I0(a R)
```

Potential uses the production electrical collocation radius
`sqrt((r_left^2+r_right^2)/2)` and axial midpoint. Its relative RMS is weighted
by physical cylindrical volume and normalized by the exact field's RMS.
Finest relative RMS potential and total-power errors must each be below
`0.005`, with decreasing errors unless all are already below `0.002`.
Conservation and all original coupled refinement gates remain unchanged.
Failed mesh levels remain in the static report. The revised observation
schedule may add aligned intermediate times, but may not remove earlier
failed observations or silently combine reports with different manifests.
