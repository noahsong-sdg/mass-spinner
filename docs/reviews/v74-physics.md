# v74 independent coupling physics review

Status: source inspection and analytical derivation only. No project code or
tests were executed by this reviewer. The gates below are requirements, not
claimed results. No parameters were fitted to an experiment.

## Verified path and root cause

Inspected `src/fuel-current.ts`, `src/fuel-spatial-operation.ts`,
`src/fuel-gas-thermal.ts`, `src/fuel-thermal.ts`,
`src/fuel-neutral-transport.ts`, and `scientific/axial-v73/torsion.py`.

The existing spatial operation passes a radial angular-speed field repeated
across the electrical axial grid, then sums torque and Joule heating back to
radial cells. The gas/liner energy solver is radial. In contrast, v73 evolves
full r,z angular speed with fixed prescribed density and viscosity, zero
meridional velocity, and actual FiPy cylindrical finite volumes. Its shear
heating is currently a global scalar.

The missing coupling is therefore a dimensional state mismatch, not a missing
drag multiplier. Axial variation in speed changes current, braking, and where
heat is produced. Axial averaging destroys that information and generally
changes torque work. The smallest coherent research extension shares the full
cell array between current, torsion and gas energy, with local shear heating.

## Required mechanical/electrical identity

Let `q_i` be electrical torque on cell i, `I_i` its fixed moment of inertia,
`w_i` accepted angular speed, and `D_i >= 0` its physical viscous heating rate.
All terms below use the same accepted endpoint and timestep:

```
P_electrode = P_Joule + sum(q_i w_i)
delta K + dt sum(D_i) + N_BE = dt sum(q_i w_i) + W_wall
N_BE = sum(I_i (w_new,i - w_old,i)^2 / 2)
W_wall = dt sum(w_wall * torque_wall_on_fluid)
```

The first identity is supported by the electrical half-link implementation:
its torque and motional EMF use identical cell weights. Preserve that
adjointness. Pass the entire `j*nr+i` angular-speed array, without axial
averaging or independent torque interpolation. The current solver's
inertia-weighted radial collocation and FiPy's arithmetic centers differ on a
finite mesh; use the same degrees of freedom and demonstrate continuum
refinement rather than claiming identical finite-grid operators.

`N_BE` is backward-Euler numerical loss. Report it separately; depositing it
as heat would make numerical damping look like physical thermalization.
Temperature-dependent viscosity changes the accepted dissipation rate; it
does not create an additional stored-energy term.

## Where physical shear heat belongs

Use the actual assembled viscous face conductance `G_f`. Count each internal
face once, with `D_f = G_f (w_b - w_a)^2`. Its cell allocation must reconstruct
the actual two fluid half-resistances: `D_a = D_f R_a/(R_a+R_b)`, similarly for
b. For FiPy harmonic viscosity this requires its distance/interpolation
weights, not an assumed equal split. On nonuniform grids or unequal viscosity,
50/50 is generally wrong. Do not combine an exact radial resistance from a
different discretization with FiPy's global dissipation and call it exact.

The cellwise source must be nonnegative and sum to the already independently
checked global face dissipation, including boundary faces. A one-sided
no-slip boundary resistance models fluid between the cell and boundary: its
dissipation belongs to that gas half-cell. A stationary endwall has nonzero
braking torque but zero mechanical power because its speed is zero. Do not
also put `torque * cell_speed` into the wall's thermal source. That duplicates
the boundary dissipation. A moving wall supplies the work stated above;
thermal transfer across its surface is a separate flux.

A finite-slip interface would require a separate surface friction and heat
partition law. No such law is justified by the existing no-slip code.

## Thermal coupling and bounded physical scope

For fixed monatomic heavy-particle inventory, use ordinary cell volume:

```
C_i = (3/2) k_B N_i
C_i (T_new,i - T_old,i)/dt
    = conductive_heat_into_i + Joule_i + D_i
```

Do not use the torsional `r^2`-weighted capacity as thermal capacity. There is
no species enthalpy advection or centrifugal redistribution work in the
stipulated frozen-density, zero-meridional-flow problem. Updating density or
inertia alone would invalidate both the torsional equation and its ledger;
that requires conservative mass, angular-momentum and energy transport.

The existing sourced neutral `mu(T)` and `k(T)` may provide constitutive
feedback within their admitted temperature domains. Prescribed diagonal
electrical conductivity remains prescribed: this does not predict electron
temperature, ionization, Hall forces or discharge sustainment. Putting all
Joule heat immediately into heavy gas is an explicit one-temperature energy
deposition assumption. It is not a demonstrated electron-to-gas closure.

The minimum spatial gas model needs both radial and axial conductive links.
A radial projection can conserve total energy but cannot resolve axial gas
hotspots. Reusing radial tungsten shells separately per axial slice is a
bounded intermediate solid model, provided total W/K conductances scale with
slice length and missing axial solid conduction is disclosed. Tungsten
storage uses sourced enthalpy `m h(T)`, not `m cp(T) T`.

Mechanical and thermal endwall conditions are independent. Thermally
adiabatic stationary no-slip endwalls are a defensible controlled first
problem. Prescribed-temperature endwalls are external reservoirs: include
their signed heat in the ledger. Do not invent an endcap material, mass, or
accommodation coefficient. Gas/liner flux must leave one subsystem and enter
the other equally; include each gas/film/solid half-resistance once.

For an explicit outward-reservoir heat convention, the full acceptance
identity is:

```
delta(K + U_gas + H_solid) + Q_out + N_BE
    = dt P_electrode + W_wall
```

Fixed density plus spatial heating can violate the omitted pressure-balance
equations; axial variation in rotation can also drive meridional circulation.
This is therefore constrained azimuthal transport with energy, not a complete
Navier-Stokes centrifuge or experimentally qualified device.

## Nonlinear and finite-domain traps

Converge accepted temperature, transport properties, current, torque,
angular speed and heat together. An electrical solve at `w_guess` followed by
torsion at `w_new` leaves the endpoint work mismatch
`dt sum(q_i(w_guess) (w_new,i - w_guess,i))`. That is a nonlinear residual,
never a corrective heat source. Check physical equation residuals after
re-evaluating all accepted sources, not only small damped iterate changes.

Require finite derived capacities, inertia, conductances, face powers,
kinetic/internal/solid energies, residuals and their scales. Finite input
values alone do not prevent overflow in a square or product. A NaN compared
to a tolerance can silently evade a rejection. Use exchange-scale tolerances
plus separately justified storage roundoff, not a tolerance dominated by a
large unchanging wall enthalpy.

## Independent gates to run

- Preserve rigid co-rotation, uniform temperature, and zero forcing with
  stress-free boundaries. Check stress-free torque separately.
- In an adiabatic unforced shear decay, resolve `delta K + delta U + N_BE=0`
  and reconstruct local face heat independently, including variable viscosity
  and nonuniform half-cell distances.
- Check stationary and rotating no-slip wall work separately; verify that
  braking heat is counted exactly once.
- With `B=0`, torque vanishes but voltage-driven Joule heating can remain.
  With equal electrode potentials and rotating gas, verify motional braking
  and nonnegative Joule heating without an invented power source.
- Shift all electrode voltages by a constant: current, torque and heat remain
  unchanged. Exercise a genuinely axial speed perturbation to reject hidden
  radial projection.
- Independently reconstruct the electrical, viscous and thermal graphs and
  compare fields and local fluxes, not only each solver's own global totals.
- Recover frozen-property analytic conduction/torsion controls and the radial
  limit with the same boundary conventions before nonlinear studies.
- Refine radial mesh, axial mesh and timestep independently, then jointly.
  Compare at fixed physical output times and include early endwall/gas-wall
  boundary layers, local maxima, torque partitions, and electrical heating.
  Demonstrate nonlinear-tolerance independence. A global ledger is necessary
  but cannot establish convergence of local temperature or speed.
- Preserve failed cases and property-domain rejections. Numerical acceptance
  does not establish agreement with a public experimental data set.

## Literature cross-check

The primary [Wijnakker and Granneman (1980) paper](https://www.degruyterbrill.com/document/doi/10.1515/zna-1980-0815/pdf),
section 4, explicitly treats axial viscous transport, neutral-dominated
transport in weakly ionized gas, heavy-particle energy, and electron/heavy
energy exchange. This supports separating viscous heat from other heating
and retaining the constrained-flow limitation. It does not supply a universal
local all-Joule-to-heavy-gas closure. Equations and discrete requirements above
are this reviewer's derivation from the checked implementation, rather than a
claim that the publication validates the proposed simulator.

## First executed coupling finding

Inspected exported `scientific/coupled-axial-v74/diagnostic-01.json` after the
parent's safe-dev run. At the 24-by-24, four-step case, cell 168 has independent
mechanical residual `1.4363081e-18 N m` against the frozen local allowance
`1.8640476e-19 N m`. Substituting the TypeScript torque reduces that residual
to `2.13e-25 N m`. The TypeScript/independent electrical torques differ by
`1.4363079e-18 N m`, accounting for the failure; the independent viscous face
sum and sparse-matrix form agree to roundoff. This isolates the electrical
linear-solve accuracy, rather than a torsional geometry or heat-partition
defect, for this witness.

Technically, the existing electrical PCG stopping rule controls a global
current-equation residual. It can leave a larger relative error in a weak
local torque. In simple terms, a solve that is accurate for the device's large
currents can still miss a small local force needed by a stricter coupled
balance.

The proposed smallest fix is a stricter optional relative electrical solve
tolerance used by this research bridge, preserving the live/default value.
Retain the true-residual check and every independent local acceptance gate.
This targets the demonstrated source of error without changing constitutive
physics or turning a residual into heat. Tightening the coupled gate's
tolerance or modifying viscosity would conceal the discrepancy instead. A
passing tighter-solve rerun and captured-case regression are still required;
the original failed study must remain in evidence. A stricter global solve
alone is not a universal guarantee for all future weak local torques.

## Fatal continuum boundary issue in the original illustrative case

Source inspection of the original manifest/runner establishes a uniform
positive outer-cylinder potential and grounded end faces, with no insulating
gap where they meet. This is a discontinuous Dirichlet trace at both outer/end
corners. A finite network solution is valid for its finite graph, but its total
Joule power has no finite continuum limit under the stated model.

Independent derivation: near either corner let `x=R-r`, `y` be distance from
the end, `X=x/sqrt(sigma_P)`, and `Y=y/sqrt(sigma_parallel)`. To leading order
the operator is the planar isotropic Laplacian in a quadrant. At scaled polar
radius `s`, the boundary values differ by `DeltaV` across angle `pi/2`.
Cauchy-Schwarz gives

```
integral_0^(pi/2) (d_phi/d_theta)^2 d_theta >= 2 DeltaV^2/pi
integral |grad_scaled(phi)|^2 dX dY >= (2 DeltaV^2/pi) log(ell/epsilon)
```

The harmonic leading field is `phi=(2 DeltaV/pi) theta`. Restoring the
axisymmetric volume factor, the leading dissipative power per corner is
`4 R DeltaV^2 sqrt(sigma_P sigma_parallel) log(ell/epsilon)`.
Positive finite conductivities therefore do not regularize the jump.

This conclusion survives the coupled rotation: finite kinetic energy at
fixed positive density implies `B r Omega` is square-integrable. If the
conductive field also had finite Joule energy, their difference would make
`grad(phi)` square-integrable, contradicting the lower bound above. A finite
rotation field cannot cancel the missing electrical gap. Temperature feedback
in viscosity/thermal conductivity does not alter the prescribed electrical
conductivities. Changing one corner value, dropping a corner cell, or
improving the linear solver does not repair the continuum boundary condition.

This angular potential is also described in the primary MIT course text,
*Electromagnetic Fields and Energy*, [section 5.7](https://web.mit.edu/6.013_book/www/chapter5/5.7.html),
section 5.7. The anisotropic rescaling, energy bound and application to this
case are this reviewer's derivation. The finite-network studies should be
retained as a negative boundary-control example, with no continuum
qualification even if particular finite-reference differences happen to pass.

### Smallest legitimate revised numerical control

Prescribe `phi_outer(z)=V0 sin(pi z/L)` with grounded ends and regular axis.
This is a smooth manufactured distributed-potential boundary, not one
equipotential metal electrode. It has a smooth finite-energy extension
`phi_trial=V0(r/R)^2 sin(pi z/L)` and avoids the incompatible corner trace.
Sample this one fixed physical profile at each face's axial midpoint; do not
retain a grid-sized smoothing width or adjust forcing to improve a result.

For zero rotation and constant diagonal conductivity there is an exact
cylindrical control, with `k=pi/L`, `a=k sqrt(sigma_parallel/sigma_P)`:

```
phi(r,z) = V0 I0(a r)/I0(a R) sin(k z)
P_Joule = P_electrode = pi R L sigma_P V0^2 a I1(a R)/I0(a R)
```

This permits a cheap static electrical refinement screen before repeating the
expensive coupled histories. A hardware-like alternative is a fixed finite
insulating gap between separate equipotential electrodes, or a specified
finite electrical contact/sheath law. Those require explicit geometry or
additional physical data; neither should be fitted to convergence results.

Most efficient defensible rerun order: freeze the revised boundary and all
unchanged gates, verify the static Bessel control, run the 24/48 joint pair
and tightened local-current witness, then complete the frozen radial, axial,
timestep and finer-reference matrix. Fail early and retain raw failures if
the cheap controls or finest candidate already violate a necessary gate.
Passing only the staged subset must remain partial qualification.

### Checked finite-network evidence

Inspected exported `study-02.json`: at fixed 256 timesteps, final Joule powers
for 6, 12, 24 and 48 cells per coordinate are respectively
`2.48585498644`, `3.44494656590`, `4.43703629778`, and `5.44120764197 W`.
Their successive increments approach one watt rather than zero. Both the
radial sine map and axial cosine map have smallest corner-cell widths
proportional to `n^-2`. The independently derived two-corner asymptote therefore
predicts an increment
`16 R V0^2 sqrt(sigma_P sigma_parallel) log(2)`, approximately `1.010 W` per
doubling for the frozen inputs. Its agreement with the observed increasing
increments supports the singularity diagnosis without fitting any coefficient.
The exported report retains 18 completed trajectories and no recorded solver
failures; interruption left the remaining reference runs incomplete. Passing
the finite-network balance checks is compatible with this physical
nonconvergence and must not be promoted into continuum qualification.

## Final independent review: accepted study 05

**Decision: accept bounded numerical qualification for the frozen v74
research model. This is not experimental, live-browser, or Marathon-device
qualification.** No remaining blocking discrepancy was found in the inspected
accepted artifacts and source path.

### Evidence checked

Read the accepted manifest, summary, static electrical report, independent
endpoint report, convergence report, provenance receipt and retained-attempt
record. Checked the raw report's empty failure list, step-record count and
producer/static hashes. Recomputed SHA-256 using the host file utility for
the six producer files, actual TypeScript current solver, static checker,
manifest, four additional published dependencies, and all four result files;
they agree with the receipt. Checked that the endpoint report binds exactly
the accepted raw artifact and that the convergence report binds exactly the
accepted raw and static artifacts. In particular:

```
study-05.json
cb57006163950c2a37cb800b4cb4472540b37d816ea23b3816ca416bb4af5d16
static-current-05.json
ba6745cfd21f61282f5f2c72665c01e37919439ff61781ffcd735f6945aa0698
independent-05.json
f982ccba6d308e5fd2c54b778aa9b21388e4ae4b3e1b6a72577ae13eac01f607
convergence-05.json
475b4437f424fbf7198b1b8565f09ba2e1adab3ed248f13642cb4108b63ff5f6
```

The receipt admits 22 complete trajectories, 3,896 independently checked
accepted steps and 66 scheduled endpoints. The endpoint artifact has no
failures or producer-input failures; all six deliberate corruptions are
rejected, including interface heat. The convergence artifact has no missing
requirements and passes the separate radial, axial, temporal, spatial and
joint series, both finer references, and separate and combined tolerance
checks. The publication-only dependency hashes are a current source snapshot;
they do **not** establish pre-run dependency identity where the producer did
not record that identity.

The parent reports execution in safe-dev of 61 Python controls, 15 adjacent
TypeScript tests, the required typecheck and build, and site/assets checks.
This reviewer inspected the resulting scientific artifacts and source but
did not rerun those commands. The standalone verification figure was also
visually inspected; that establishes figure readability, not deployed GPU or
browser behavior.

### Quantitative result and limits of convergence

The static actual-current-solver control converges monotonically to the
independent Bessel solution over 6, 12, 24, 48 and 96 cells per coordinate.
At 96, relative potential RMS error is `0.005536%` and total-power error is
`0.018088%`, both below the prospective `0.5%` screen.

At the finest evaluated joint level, the worst scheduled gas-temperature RMS
error is `0.2565%` and angular-speed RMS error is `0.4079%` on the protocol's
response-normalized scales. Worst pointwise angular-speed error is `1.6560%`;
the worst accepted observable error across all series is `0.8978%`. The
48-to-96 spatial-reference comparison has maximum field RMS error `0.08793%`
and maximum profile error `0.30500%`. The halved-timestep reference comparison
has maximum field RMS error `0.07018%` and maximum profile error `0.18894%`.
Separate linear and nonlinear tolerance changes are negligible relative to
the frozen `0.1%` tolerance-invariance requirement.

The joint wall-temperature RMS sequence is **not monotone**. Its errors are
all below the prospective `0.2%` already-small exception, so the stated gate
passes without claiming an asymptotic wall convergence order. The wall
temperature normalization has a `1 K` floor; these percentages must not be
represented as fractions of the much smaller actual wall-temperature change.
The plot retains the nonmonotonicity rather than hiding it.

### Root-cause repairs reviewed

The near-axis electrical force was too small for the original global current
residual tolerance to guarantee the independent local torque balance. In
plain terms, resolving the large device currents did not necessarily resolve
the tiniest local force. Same-state precision witnesses retained the failures
at `1e-14`, `4e-15` and `2e-15`, and passes at `1e-15` and `4 epsilon`.
The research bridge now requests `4 epsilon`; the live default and independent
physical gates are preserved. This targets the demonstrated precision error
without modifying viscosity, adding heat, or loosening the force balance.

The later thermal line-search failure occurred when the necessary temperature
increment was smaller than half an ULP at approximately `400 K`. Tiny flux
differences still inherit the rounding of both absolute temperatures. The
reviewed solver now includes a separately returned per-row conduction-roundoff
allowance, `16 epsilon sum(G max(abs(T_left), abs(T_right)))`, including the
reservoir link, alongside its existing storage-roundoff term. Source tracing
confirms this affects acceptance only: it is absent from the energy equation,
fluxes, physical heat sources and stored energy. It therefore repairs an
unrepresentable endpoint demand without converting numerical noise into heat.
The independent physical residual gates were unchanged. Failed studies and
their distinct causes remain recorded in `ATTEMPTS.md`.

### Scope of signoff

This establishes consistency and finite-reference convergence for the frozen
`4 ms` illustrative argon history: fixed density, prescribed diagonal
electrical conductivity, azimuthal flow without meridional transport,
one-temperature immediate Joule deposition, sourced temperature-dependent
neutral properties, stationary no-slip mechanical walls, insulated thermal
ends, and finite-contact gas/tungsten conduction with outer Robin cooling.
The sine voltage is a manufactured distributed boundary, not a single
equipotential metal wall or a reconstructed Marathon electrode design.

Momentum and energy balances, refinement and analytic controls are necessary
numerical evidence; they cannot validate the omitted density, ionization,
electron-energy, sheath, species-transport or meridional-flow closures.
No experimental parameter was fitted. The checked evidence supports using
this as a constrained research coupling, with no claim that the deployed
playground already implements it or that it predicts an experimental machine.
