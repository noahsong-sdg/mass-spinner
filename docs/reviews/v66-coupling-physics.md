# Independent v66 mixture / angular momentum / energy coupling review

10 November2026. Source tracing, independently derived discrete identities and
implementation authored by this reviewer. **No project code, tests, dependencies
or VM commands have been executed by this reviewer.** The parent owns safe-dev
synchronization, execution and acceptance. This document does not certify the
coupled live backend or experimental accuracy.

## Traced execution path and problem

`advanceFuelGasMass` in `fuel-gas.ts` evolves each species probability with a
positive backward-Euler Scharfetter–Gummel flux. Its radial force is centrifugal
drift plus a partial-pressure gradient, with prescribed mobility/diffusivity.
It returns cumulative signed face transfers derived from exact accepted cell
continuity. The current force uses a single angular speed.

`advanceFuelCoupledStep` in `fuel-transport.ts` updates one ion and one neutral
angular momentum. Species redistribution changes a global neutral inertia;
an implicit scalar speed root closes that particular rigid-rotation model.
Its energy ledger contains signed redistribution work and numerical BE loss.

`advanceFuelMixtureThermal` in `fuel-gas-thermal.ts` consumes the same accepted
species transfers, transports monatomic enthalpy with a reciprocal logarithmic
face temperature and couples gas energy to the solid. A supplied source callback
accounts for mechanical work and heating. This is not compressible Navier–Stokes.

The v65 `fuel-momentum.ts` evolves fixed-density cell angular momenta with
reciprocal viscous torques, boundary work, physical gas shear heat and separate
backward-Euler numerical loss. It has no mass advection.

The root cause of a naive coupling failure is that **both cell inertia and cell
angular momentum move with species mass**. In simple terms, gas crossing a face
brings spin with it, and changing a cell's mass changes the kinetic energy of a
given angular momentum. Substituting endpoint density in the v65 matrix without
the matching accepted mass flux does not model either effect correctly.

## Minimum physically explicit scope

The existing species fluxes may be retained as a **conditional overdamped
pressure-relaxing mixture closure**, with prescribed radial mobility and common
azimuthal velocity/temperature. They are not automatically Maxwell–Stefan
diffusion relative to a mass-averaged velocity. Their summed kg flux can be
nonzero; that is barycentric radial mass transport in this conditional model,
not a zero-mass-flow counterdiffusion model.

For comparison, expert multicomponent frameworks explicitly distinguish bulk
advection from species diffusion and enforce zero summed diffusive mass flux in
the barycentric frame. Cantera's documented correction addresses the failure of
unadjusted mixture-averaged fluxes to meet that constraint; COMSOL makes the same
distinction. These sources support the terminology and missing closure, not the
new formulas derived below. [Cantera governing equations](https://www.cantera.org/3.1/reference/onedim/governing-equations.html),
[COMSOL mixture-averaged diffusion](https://doc.comsol.com/6.3/doc/com.comsol.help.chem/chem_ug_chemsptrans.08.241.html).

A predictive free-gas mixture needs an additional radial momentum/pressure
closure, barodiffusion, appropriate species cross coefficients and, where
significant, Soret/Dufour terms. Correcting a numerical ledger does not establish
those physical coefficients. Preserve this distinction in controls and claims.

## Conservative accepted-transfer formulation

This section is an independent finite-volume derivation. Let cell `i` have
volume `V_i`, total mass `M_i`, and constant-in-cell angular speed `Ω_i`. Define

```
q_i = (r_inner²+r_outer²)/2
I_i = M_i q_i
L_i = I_i Ω_i
K_i = L_i²/(2I_i)
F_f = Σ_s m_s N_s Δp_s,f       [kg crossing face outward over one accepted step]
```

The existing equal-volume radial grid is uniform in `r²`, so
`q_f=r_face²=(q_i+q_j)/2`. This geometric identity is essential to the simple
centrifugal-work expression below. The implementation rejects arbitrary unequal
volume grids rather than silently extending the identity beyond its derivation.

Use accepted continuity exactly:

```
M_i,new = M_i,old + F_left − F_right
L_i,new = L_i,old + F_left q_left Ω_up,left,new
                       − F_right q_right Ω_up,right,new
                       + dt*(applied torque + reciprocal viscous torques)
```

The upwind angular speed is selected by the sign of **total mass** transfer.
All species share that same reconstructed face angular speed. Species carrying
equal and opposite kg flux then have zero net angular advection, as required by
the common-velocity closure. Independent per-species upwinding would add angular
mixing even when total mass transfer vanishes; it would need its own justified
diffusive-stress interpretation rather than being hidden inside advection.

For prescribed accepted mass transfers, this is a nonsymmetric tridiagonal
implicit solve with positive diagonal and nonpositive off-diagonals. Endpoint
mass must remain positive; no mass clipping or renormalization is permitted.
The v65 viscosity/geometry conductances remain reciprocal.

## Exact kinetic-energy identity

The cell identity with changing inertia is

```
K_new−K_old = Ω_new*(L_new−L_old)
            − 0.5*Ω_new²*(I_new−I_old)
            − 0.5*I_old*(Ω_new−Ω_old)².
```

Summing all closed-boundary faces gives

```
ΔK = W_drive + W_moving_walls − Q_shear − W_centrifugal − D_advection − D_BE

W_centrifugal,f = 0.25 F_f (q_j−q_i) (Ω_i,new²+Ω_j,new²)
D_advection,f   = 0.5 |F_f| q_f (Ω_j,new−Ω_i,new)²
D_BE            = 0.5 Σ_i I_i,old (Ω_i,new−Ω_i,old)²
```

`W_centrifugal` is a **signed gas-work source**. Outward transfer generally
removes azimuthal kinetic energy; inward transfer can return energy from gas
internal energy to rotation. It is not a nonnegative dissipation term.

`D_advection` is first-order upwind mixing loss, and `D_BE` is temporal numerical
loss. They are reported separately and must **not** be added to physical heat.
An arbitrary global kinetic-energy residual deposited as heat could make an
energy ledger pass while hiding a wrong flux, geometry factor or timestep.
The explicit face formulas make the physical and numerical roles inspectable.

Split signed centrifugal work equally between adjacent gas cells. Physical
internal viscous face heating is partitioned according to the two integrated
half-cell viscous resistances: if torque is `T_f`, each half deposits
`dt*T_f²*R_half` in its gas cell. A wall half-cell's viscous heat goes to its
adjacent gas cell; its boundary mechanical work is wall speed times wall torque.
Equal splitting is only correct when the two resistances agree.

## Compatibility with species enthalpy and entropy

Let `ΔN_s,f` be accepted outward particle transfer. Define work per particle

```
w_s,f = m_s*(q_j−q_i)*(Ω_i,new²+Ω_j,new²)/4
W_centrifugal,f = Σ_s ΔN_s,f w_s,f
```

If signed work is split equally between adjacent cell energies, the compatible
SG face bias is

```
z_s,f = (w_s,f/kB) * (0.5/T_i + 0.5/T_j).
```

This reduces to the existing rigid-Ω bias. It is second-order consistent with
`(m_s/kB)∫Ω² r/T dr`; importantly, it uses the **same finite-grid quadrature**
as the mechanical work identity. Independently trapezoiding `Ω²/T` produces a
different finite-grid work/entropy relation when both Ω and T vary.

With existing monatomic enthalpy transfer
`H_s=(5/2)kB*T_star*ΔN_s` and
`T_star*(1/T_j−1/T_i)=−ln(T_j/T_i)`, the face entropy contribution simplifies to

```
kB ΔN_s * [ln(n_s,i*T_i/(n_s,j*T_j)) + z_s,f].
```

The SG flux has the sign of this affinity, so that product is nonnegative.
This is the relevant discrete entropy check, distinct from mere energy closure.
The concavity of ideal-gas entropy gives the corresponding lower-bound entropy
inequality for a converged backward-Euler number/internal-energy step. Strictly
positive component densities admit the logarithmic derivation; zero-component
cells require the appropriate `n ln n→0` limits rather than arbitrary density
floors.

The continuum reason for enthalpy plus centrifugal work is also explicit. For
an overdamped radial species force balance,
`u_s ∂r p_s = n_s m_s u_s Ω²r − friction_s*u_s²`. Converting internal-energy
advection/pressure work to an enthalpy flux adds `u_s ∂r p_s`; together with
radial frictional heating this leaves the centrifugal-work source. Adding a
second frictional heating source on top of that transformed equation would
double count it. This is a conditional derivation, not measured mobility data.

## Additional coupling invariants

- Ion-neutral friction, if separately retained, must use reciprocal local torque.
  If the ion inertia/distribution is held prescribed, keep that limitation
  explicit. Friction mechanical loss is `Γ(Ω_ion−Ω_neutral)²≥0`; allocate physical
  heat according to a justified heavy/electron model, not a global average.
- A2D current solution can feed1D neutral momentum only if its Ω(r) is the same
  field extruded through z. Then summing local torques over z preserves
  `ΣτΩ`. Multiplying independently averaged Ω by summed torque does not generally
  preserve electrical/mechanical power. Sum actual local Joule heat before radial
  projection; the heat of an averaged current is not generally the same.
- Electrical work must satisfy `J·E = u·(J×B)+J·E_star`; do not count both full
  electrical power and Lorentz work as independent gas heating.
- The species, momentum and energy endpoint must converge together. A stalled
  fixed-point iterate is not an accepted conservative coupling. Signed inward
  centrifugal work can make gas energy leave its positive domain on a large
  step; refine time rather than clip temperature or discard work.

## Authored minimal kernel and required execution

`src/fuel-spatial-coupling.ts` exports
`advanceFuelAdvectedMomentum(oldGrid,oldOmega,massTransfersKg,torqueNm,dtS)`.
It reuses the v65 grid/state definitions, updates density/inertia from accepted
mass transfers, solves the implicit advected angular momentum and returns
per-cell signed centrifugal work, per-cell physical shear heat, numerical
losses and independent angular/energy residuals. It rejects stale derived grid
fields, zero-time mass transport, mass depletion, invalid arrays and unsupported
nonuniform-volume geometry.

`tests/fuel-spatial-coupling-v66.test.ts` provides five unexecuted regression
tests covering: a direct two-cell matrix oracle and explicit work split; accepted
mass/global angular conservation; zero total mass flux/counterdiffusion reducing
to v65; moving/stationary wall work; signed rotation/flux; resistance-weighted
gas heating; and invalid/stale inputs. Parent must execute these in safe-dev.

Further acceptance before any live replacement: an independent reconstruction
of every coupled accepted step, species continuity using exactly the supplied
transfers, the entropy inequality above, null-drive/closed-boundary limits,
thermal positivity and joint space/time refinement. The new momentum helper by
itself does not establish a self-consistent discharge, radial hydrodynamics,
calibrated diffusion, extracted product purity or first-order device accuracy.

## Independent coupled-path source audit and reconstruction

The new `fuel-spatial-operation.ts` couples accepted SG transfers, the current
solve, the advected momentum kernel and the mixture thermal solve at endpoint
temperature. Source inspection confirms the centrifugal-work/SG quadrature
above; exact axial summation using the same extruded Ω; Joule heat plus physical
shear plus signed centrifugal work; and separate numerical loss. It does not
add the full electrode power or a second slip/friction heat source to gas.
Density is independently rebuilt from accepted species inventories and checked
against momentum inertia. The spin fixed-point mismatch and electrical versus
mechanical endpoint work defect are exported. Global energy uses a dynamic
scale with an explicit stored-enthalpy ULP allowance. These are source-level
findings, not experimental validation.

`scientific/current-v66/check_coupled.py` is an independent stdlib-only accepted
trajectory reconstruction with no production imports. It requires complete
requested trajectories, the exact source snapshot digest, accepted source Ω,
species face transfers and actual solid solver temperatures. It rebuilds the
SG system by direct tridiagonal elimination, mass/inertia, local angular
momentum, physical shear/centrifugal work, BE/upwind numerical losses, sourced
neutral μ/κ, species enthalpy, conduction, boundary heat, local gas/solid energy,
global electrical/mechanical/thermal energy and ideal-mixture entropy including
coolant. Its prospective comparison tolerance is 1e−9 of each natural dynamic
scale; explicit 64-epsilon stored-energy or boundary-temperature subtraction
allowances are reported separately. It rejects eight deliberate corruptions,
including missing endpoint data, altered inertia/density/spin/heat/torque,
background energy masquerading as dynamic scale and partial trajectories.
This independently checks implementation consistency, not transport-fit data
quality or the adequacy of prescribed discharge/mobility closures.

The current checker additionally requires the explicit `volume-coordinate`
shear scheme described below and a ninth negative control rejects reverting
to the old scheme. Retained earlier audits remain evidence for their own
source/checker snapshots; they do not automatically qualify this changed
operator.

## Axis torque reconstruction defect and coherent correction

The original current solver locates radial potential nodes at arithmetic-r
centers. It assigns a link's constant current to its center-to-face half-shell
when integrating Lorentz torque. With axial current divergence, the regular
axis current instead satisfies `I_r(q)=a*q`, `q=r²`. In a first cell `[0,h]`,
the physical torque is `−B*I_outer*h²/4`. The old center at `h/2` assigns
`−3*B*I_outer*h²/8`, which is 50% too large. In simple terms, a current that
smoothly falls to zero at the axis is treated as constant over only part of
the cell, overestimating that cell's rotational forcing.

Use `q_center=(q_inner+q_outer)/2`, or
`r_center=sqrt((r_inner²+r_outer²)/2)`, consistently in current resistance and
EMF/torque geometry. Then each half-cell coefficient is `−B*Δq/4`, so a full
cell's torque is `−B*Δq*(I_inner+I_outer)/4`, exactly integrating any current
linear in q. This also handles the axis with `I_inner=0`. Applying the same
geometry to motional EMF preserves its electrical/mechanical power adjoint;
editing torque alone would break it. Exact logarithmic coaxial resistance is
still integrated rather than approximated. This small shared geometry fix is
preferable to an axis-only torque multiplier, a convergence-gate relaxation
or unexplained residual heating.

`tests/fuel-current-axis-v66.test.ts` independently manufactures regular
`I_r(q)=a*q*dz` by prescribed nodal voltages and axial electrode supplies,
checks the complete-cell torque at every radial/axial cell on two grids, and
checks variable-Ω power consistency. It is authored, not executed by this
agent. A nonzero viscosity can regularize a coarse-axis source defect over
`h²/ν`, so this derivation establishes the local quadrature defect rather than
proving that it alone explains every observed finite-time convergence error.

Execution boundary: this agent performed source inspection and authored files
only. Parent reported the five momentum-kernel tests passing; the independent
checker, axis regression and fresh joint convergence exports still require
parent execution in the isolated safe-dev VM. No live replacement or device
fidelity approval follows from this note.

## Remaining radial failure: isolated shear-operator inconsistency

The retained `current66-final` export contains 12 complete runs / 448 accepted
steps and its independent audit reports all eight then-current negative
controls rejected. However, n32→n64 at 64 time steps still differs by
`0.04719384085` of the initial peak angular speed, above the 0.02 gate.
Temperature and species CDF pass. The electrical q-center correction barely
changes this failure, so it must not be described as resolving the coupled
rotation convergence problem.

The failure is concentrated at the axis: n32 final first Ω is 149804.55,
whereas interpolating n64 at the same q midpoint gives
`(145349.73+135529.32)/2 = 140439.53` rad/s. Density is smooth
(first n32/n64 cells 0.00343110/0.00342834 kg/m³), temperature is smooth,
and the species CDF error is only 3.2033e−5. These observations support a
local momentum-operator defect rather than a density concentration or thermal
instability. They do not alone exclude all advection errors.

The old integrated-r⁻³ resistance assumes locally constant transmitted torque
through each half-shell. Coupled Ω is instead represented at cell q midpoints,
and regular-axis transient viscous torque is not constant there. Consider
constant μ,ρ and `Ω=A+Bq`: the physical equation requires `dΩ/dt=8νB` in
every cell. With arithmetic-r resistance centers, the old first-cell operator
gives only `2.41421356νB`; even replacing its centers by q midpoints while
retaining the integrated resistance gives `6νB`. This O(1) axis local
truncation error explains weak central diffusion and slow refinement. In simple
terms, a steady constant-torque shell formula was reused where the torque
changes rapidly across the central cell during the transient.

For this coupled representation use the conservative q-coordinate FV flux:

```
I_i = π L ρ_i q_i Δq_i
T_f = 4π L μ_f q_f² (Ω_j−Ω_i)/(q_j−q_i)
R_left  = (q_f−q_i)/(4π L μ_i q_f²)
R_right = (q_j−q_f)/(4π L μ_j q_f²)
G_f = 1/(R_left+R_right)
```

The axis torque is zero. A wall uses the corresponding center-to-wall half
distance and its prescribed wall Ω. For `Ω=A+Bq`, the face derivative B and
the integrated torque difference are exact; dividing by exact shell inertia
gives `8νB` at every cell. Positive reciprocal G retains angular conservation,
nonnegative physical shear heat, resistance-weighted local heat allocation
and the mechanical BE identity. Keep the v65 integrated-resistance scheme as
the explicit unchanged default for its separately qualified point-state cases;
opt into `volume-coordinate` for the coupled q representation. This is an
operator correction, not a relaxed gate or numerical residual converted to heat.

`tests/fuel-momentum-volume-v66.test.ts` tests analytic instantaneous diffusion,
balanced counter-torque, an exact evolving quadratic-r profile with moving
outer wall, reduction through zero-flux advected momentum, and variable-μ
half-resistance/heat consistency. `reference_q_momentum.py` separately invokes
actual FiPy for `ρq Ω_t = ∂q(4μq² Ω_q)` with the same exact transient on
three grids and two timestep counts. Both were authored without execution by
this agent; parent must run the before/after witness, FiPy reference, complete
coupled audit and unchanged joint convergence gates before claiming resolution.

## Final retained evidence and scoped acceptance

Independently inspected the raw accepted results, command receipts and hashes
under `scientific/centrifuge-v44/current66/studies/final-accepted/` after parent
execution. This agent executed no project/scientific code; inspection used
read-only JSON extraction and SHA256 verification.

- All 39 exported payload hashes match `export-manifest.json`.
- All 709 available host source inputs match `acceptance.inputs.json`. The two
  explicitly listed historical guest-only runners cannot be independently
  inspected on the host. Canonically sorting/compacting that complete 711-input
  manifest reproduces source SHA256
  `ad08c16e86729d6b94190e349de1c4117bf37844dca74540c32767569f1b517c`.
  Parent's receipt verifies the source before and after its isolated execution.
- All 11 command groups have exit code zero: electrical study, five Python
  analyzer tests, FiPy q-momentum reference, coupled evolution, independent
  coupled audit, convergence analysis, 1226 project tests, typecheck, build,
  site check and asset check. The raw test log reports 1226 passed, zero failed,
  cancelled or skipped.
- FiPy 4.0.3 independently executes all six q-momentum manufactured cases.
  Maximum absolute Ω error is `1.7097434579e−14 rad/s`, below the prospective
  `2e−10 rad/s` gate.
- The coupled export has exactly 12 requested trajectories and 448 accepted
  steps, all reaching 1 ms. Its SHA256 is
  `a92320f3dd5fa7b043d82ced94bb0f0c504b78df8f72c44406174e38d706335d`,
  matching both the independent audit's input digest and the convergence
  report's prediction digest. The independent audit accepts every step and
  rejects all nine corruption controls. Minimum total entropy increment,
  including coolant, is `9.6970e−8 J/K`; the largest Ω endpoint mismatch is
  `1.99915e−11` relatively, and largest electrical/mechanical endpoint work
  defect is `4.7573e−18 J`. Stored-enthalpy ULP allowances remain explicit;
  conservation within those allowances is not an experimental error estimate.

The unchanged **1 ms endpoint** refinement gates now pass:

| Comparison | Ω / initial peak | T difference / heating scale | Species CDF |
| --- | ---: | ---: | ---: |
| n32→n64, 64 steps | 0.0081309% | 0.0169798% | 4.69193e−6 |
| 32→64 steps, n64 | 0.0977227% | 0.6193234% | 3.27717e−5 |

Raw near-axis profiles corroborate the operator correction. At n32, first Ω
is 136277.50 rad/s; n64 interpolation at the same q midpoint is
`(137794.31+134792.97)/2 = 136293.64 rad/s`. The former central spike and
4.71938% radial discrepancy are absent. Together with the analytic polynomial
negative control and independent FiPy reference, this supports the shear
representation mismatch as the dominant root cause of that tested failure.
It does not establish that all possible operating regimes are converged.

**Acceptance:** no remaining blocking source/ledger inconsistency was found
for delivery as an experimental numerical foundation under the tested input
family. Every-step conservation/entropy checks and endpoint refinement are
different evidence: early-time profile-error norms have not been qualified.
Axial and liner grids were not jointly refined. The model still prescribes
electrical conductivity and independent species mobility, shares one neutral
Ω along z, and omits radial hydrodynamics, separate charged/electron energy,
chemistry and outlet collection. The unresolved historical experimental
profile/pressure challenges remain. No live backend promotion, deployment,
browser verification or first-order Marathon device calibration is approved by
this review. Shared-time, axial/liner and operating-envelope studies plus
benchmark calibration remain necessary before broader fidelity claims.
