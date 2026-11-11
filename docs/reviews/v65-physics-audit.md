# v65 independent physics/path audit

Reviewed source on 10 November 2026. This is a read-only source/math audit;
no project code, tests, dependency installation or VM command was executed by
this reviewer. Parent owns source synchronization and all safe-dev execution.
No production change or experimental accuracy approval is made here.

## Verified execution path and current boundaries

`simulateFuelCentrifuge` in `src/fuel-centrifuge.ts` constructs neutral inventory
from prescribed mean pressure, full-cylinder volume and uniform temperature.
Uniform reference inertias, prescribed ion fraction/collision frequency and
prescribed wall-drag frequency define the analytic two-rotor response. The drive
inner fraction changes integrated current torque and Ohmic resistance, not gas
volume or a solid inner boundary.

`simulateFuelOperation` constructs a transport result, then uses
`advanceFuelCoupledStep` for each accepted step. State contains two species
probability arrays, one ion angular momentum and one neutral angular momentum.
The neutral inertia follows their radial second moment; ion inertia and the
integrated collision coefficient stay prescribed. A scalar nonlinear root
couples endpoint species redistribution to a single neutral angular speed.

`advanceFuelGasMass` in `src/fuel-gas.ts` uses a positive conservative SG flux
with prescribed diffusivity, common local temperature and **one** angular speed.
Its pressure-driven radial transport is overdamped, not barycentric fluid
momentum or Maxwell–Stefan diffusion. Both species inventories are normalized
separately; no extracted material leaves the domain.

For spatial gas energy, `src/fuel-operation.ts:177–196` routes slip/Ohmic heat
by particle inventory, and routes signed centrifugal redistribution work from
the same conservative face transfers. Drag energy enters the innermost solid
cell. `advanceFuelMixtureThermal` evolves gas U and liner enthalpies together,
with species enthalpy transport and conservative Fourier links. Mechanical BE
dissipation remains separate. Those are coherent ledgers for the implemented
rigid/overdamped closure; they do not solve the missing physical mechanisms.

## Highest-leverage blockers

### 1. Radial angular momentum cannot be added as a plotting correction

The observed velocity profile turns over before the wall. A single rigid Omega
cannot produce that behavior. The v64 held-out profile challenge already finds
about 60% RMS/observed-peak error. A local velocity array must be a conserved
state, not a different rendering of the existing global Omega.

For fixed density, axisymmetric pure rotation, define Omega = vtheta/r and the
cell angular momentum `L_i = integral_cell rho*r^2*Omega dV`. Then

```
rho*r^2 * dOmega/dt = (1/r) d/dr(mu*r^3*dOmega/dr) + r*f_theta
dL_i/dt = 2*pi*length*[mu*r^3*dOmega/dr]_faces
           + integral_cell 2*pi*length*r^2*f_theta dr
```

The stress is `tau_rtheta=mu*r*dOmega/dr`, not `mu*dvtheta/dr` alone.
Rigid rotation has zero shear even though dvtheta/dr is nonzero; a missing
`-vtheta/r` term would spuriously dissipate rigid rotation.

The existing equal-volume grid is useful. With physical `y=r^2`, the equation is

```
rho*y*dOmega/dt = 4*d/dy(mu*y^2*dOmega/dy) + r*f_theta
```

A 1D finite-volume FiPy equation using transient coefficient `rho*y` and
diffusion coefficient `4*mu*y^2` is a plausible independent oracle. That
recommendation is an inference from the transformed PDE, not an executed
FiPy verification. Production can retain a small browser solver after genuine
cross-checking; changing implementation language alone does not change physics.

For constant mu, an exact no-body-torque Couette face conductance between radii
rL and rR is `C=4*pi*length*mu/(1/rL^2-1/rR^2)`. This follows from integrating
radial viscous resistance and exactly preserves `Omega=A+B/r^2`. A midpoint
conductance can also converge, but needs an explicit refinement gate.

### 2. Wall torque is not automatically wall heating

Stationary no-slip walls remove gas angular momentum through stress, but their
mechanical boundary power is zero: `Omega_wall * torque_wall = 0`. Viscous
dissipation heats the gas at `mu*(r*dOmega/dr)^2` per unit volume. Reusing the
old global `dragDissipation = torque*Omega_global` as solid heating after
introducing no-slip spatial rotation would place shear heat in the wrong
material. Heat subsequently reaches the wall through the gas energy model.

For reciprocal FV torques `C_f*(Omega_R-Omega_L)` with fixed cell inertias, a
backward-Euler step must satisfy

```
Delta K = W_drive + W_moving_walls
          - dt*sum_faces C_f*(Delta Omega_endpoint)^2
          - 0.5*sum_cells I_i*(Omega_new-Omega_old)^2
```

Include wall half-cell faces in the physical shear sum. The final term is BE
numerical dissipation; it must not be called measured or physical heating.
Reciprocal internal torques must telescope in the angular impulse ledger.
Inner and outer wall torque signs differ because their outward normals differ.

### 3. Species redistribution must carry angular momentum locally

The current model reassigns a single Omega after inertia changes. A spatial
model instead needs radial angular-momentum flux from the **accepted** mass
transfers. At a face, the advected specific angular momentum is `r_face^2*
Omega_face`, with a declared face reconstruction. Species mass flux is
`sum_s m_s*Ndot_s`. Moving species without this reciprocal angular-momentum
transfer is unphysical even if a global scalar conservation correction is used.

Gas energy, centrifugal work, pressure/enthalpy work and kinetic-energy flux
must be derived consistently for the new closure. The existing rigid
redistribution-work formula cannot simply be reused with one representative
local Omega. A prescribed-density/temperature momentum benchmark is a clean
first milestone; fully coupling it to the present overdamped mixture is a
separate, larger scientific change.

### 4. Full cylinder, driven region and annular gas are different domains

For axial positive B and radially outward positive Jr,
`f_theta=(J cross B)_theta=-Jr*B`. Existing torque uses a positive IB magnitude;
a new signed PDE must either adopt the same declared magnitude convention or
preserve the cross-product sign. Reverse-current/field controls should test it.

In a true annular, purely radial current, `Jr=I/(2*pi*r*length)`. This law cannot
represent finite current all the way to r=0. The gas can be a true excluded
annulus with two walls, or a full cylinder with an explicitly driven outer
region and an understood current injection/return geometry. The two are not
interchangeable. In the true annulus, volume/inertias, gas boundary conditions,
pressure normalization and optical path must all use the inner radius.

For the signed radial current above, `r*f_theta=-IB/(2*pi*length)`, constant in
physical y inside the driven region. Its integrated torque is
`-IB*(R^2-a^2)/2`. This is a useful dimensional/sign gate against the existing
integrated magnitude.

### 5. A diagnostic map and regime assessment are required for validation

For a chord coordinate x and line-of-sight coordinate z, apparent neutral
centroid velocity is an emissivity-weighted integral of
`x*Omega(sqrt(x^2+z^2))`. Rigid rotation reduces to Omega*x independently of
emissivity, assuming no extra chord-dependent flow. A spatial local velocity
must be projected before comparison with the historical non-Abel-inverted
measurements. Peak local speed, peak apparent speed and wall speed differ.

For a hollow gas annulus, chords through the central hole have two disconnected
emitting intervals. A constant-emissivity approximation is a conditional
observation model, not an emission-physics solution. Missing emissivity data
must remain a structural sensitivity, not a fitted per-point correction.

Steady radial viscous momentum does not supply electron temperature,
ionization, Pedersen/Hall conductivity or chemistry. Prescribed collision
frequency, fraction and scalar conductivity are still major predictive inputs.
Changing them independently at every held-out point is calibration leakage.

The lithium default is also a prescribed state, not a demonstrated stable
equilibrium vapor. The [NIST WebBook lithium vapor-pressure fit](https://webbook.nist.gov/cgi/cbook.cgi?ID=C7439932&Mask=224)
already used in the code gives pressure of order 1e-6 Pa at500 K, far below
the nominal10 Pa. Hot walls, transient injection and nonequilibrium chemistry
can alter the interpretation, so this is a regime warning, not a justified
universal hard rejection or a calculated condensation rate. A helium/argon
mechanism benchmark cannot certify Li phase behavior.

## Literature cross-check

[Hood-McFadden et al., arXiv2607.28208v2](https://arxiv.org/pdf/2607.28208),
especially Appendix A, independently supports the required azimuthal shear
operator, no-slip annulus and separate viscous/Joule heat terms. Its charged
species are algebraic drift closures, not separate momentum fluids. Its claimed
improvements therefore cannot be recreated by swapping our two scalar rotors
for a scalar viscosity alone. It is a preprint and does not provide a complete
experimental reconstruction; model curves are not new measurements. The
current audit's discrete conservation identities above are independently
derived, not quoted from its code.

## Minimum gates before a live replacement

1. Rigid rotation gives zero internal shear; Couette steady state and analytic
   forced constant-mu profiles converge; no-drive stationary walls spin down.
2. Signed source integration matches geometry; internal impulses cancel;
   stationary/moving-wall power and physical/numerical dissipation separate.
3. Independent solver agreement is demonstrated across joint mesh/time
   refinement, including half-cell walls and the central regularity limit.
4. Synthetic Doppler tests recover rigid projection exactly and correctly
   integrate a nonrigid profile and hollow annular sightline.
5. Unchanged calibration/holdout definitions are used; source/transport and
   observation uncertainty remain distinct. Do not certify current-to-speed
   prediction from a fit to a measured velocity profile.
6. Coupled species transport is introduced only with conservative angular
   advection and a rederived energy identity; then rerun coupled momentum,
   thermal and species refinement rather than assuming old gates transfer.

No security or data-migration defect is asserted by this read-only pass. A new
spatial state will require explicit snapshot/share/export version handling;
old scalar histories must retain their original interpretation.

## Independent review of the first executed campaign

Reviewed exported evidence in
`scientific/centrifuge-v44/momentum65/studies/first/{analysis,audit,diagnostic,cases}.json`
and the source of `analyze.py`, `reference_fipy.py`, `diagnostic_reference.py`,
the frozen fixture generator, and `src/fuel-momentum.ts`. This reviewer did not
execute those scripts. The parent-run receipt
`scientific/fixes-v43/momentum65-tests2.receipt.json` records exit 0, source hash
`8c63060f8dd59ed42ffce16104e19bd9e35d7ac6e0994c46fbaff1192d4f279c`,
and source verification before/after. Its logs record six TypeScript tests and
fourteen independent Python regression tests passing, followed by the complete
discrete reconstruction. Final frozen-snapshot build/typecheck and campaign
repeat remain the parent's responsibility.

Verified from those artifacts: seventeen cases include 3,500 accepted evolution
steps. Independent reconstruction maxima are 1.63e-13 for angular speed,
1.99e-16 for equation residual, 1.13e-13 for ledgers, 3.50e-13 for angular impulse
and 4.77e-14 for mechanical energy, all below the prospective 1e-9 gate. The
actual FiPy 4.0.3 reference uses its cylindrical mesh, transient/diffusion terms
and SciPy LU; it does not import the production solver. Its cell capacity
correctly uses the cylindrical cell-average r², while its harmonic face
viscosity differs from the production integrated-resistance assembly.

The finest cross-code errors normalized by the declared physical peak are
0.000254 (Couette), 0.0000447 (regular core with annular forcing), 0.003311
(discontinuous viscosity/variable density), and 0.000131 (Bessel transient).
All pass 0.005; retained coarse variable-viscosity results fail until the finest
grid and must remain visible. Bessel final analytic error falls from 0.002524
to 0.000362 as the timestep decreases eightfold; successive final-state
differences approximately halve. The finest analytical Doppler error is
0.000149. These support numerical qualification of the fixed-density neutral
momentum kernel, rather than experimental or coupled-backend qualification.

The historical challenge still fails: held-out profile RMS/observed peak is
0.3998 against 0.20; extraction-corner sensitivity spans 0.3830–0.4167 with no
passing corner. The constant-viscosity steady model predicts pressure ratio 1
against the reported approximate 2/3. Uniform emissivity, ideal radial current,
unknown current distribution/endwall losses and missing discharge closure
remain structural assumptions. A fitted amplitude cannot certify current-to-
speed prediction, isotope output, mixture heat flow or Marathon performance.

Two additional pre-freeze checks were requested of the parent:

1. Link analysis packets cryptographically: assert the independent audit's
   prediction hash and diagnostic's states hash match the actual production
   bytes, and its frozen-input hash matches the campaign's input hash. The
   first displayed hashes agree, but the analysis loader must reject stale
   successful packets after output changes; length-only inventory checks are
   insufficient.
2. Reject radial-current forcing through r=0. The helper currently accepts a
   zero drive cutoff on a full cylinder, although its 1/r current law is
   singular there and its Ohmic integral diverges. Require a finite injection
   radius; forcing may start exactly at a true annulus's positive inner wall.
   This is a physical domain invariant. Add a targeted regression before the
   final source freeze.

No further material error was found in the reviewed fixed-density shear PDE,
wall-work signs, reciprocal internal torque, exact cylindrical resistance or
separation of physical shear heat from backward-Euler numerical loss. This
conclusion does not waive the local mass/momentum/energy coupling requirements
above or the unpassed experimental screens.

## Final frozen-campaign review

Read-only review of `scientific/centrifuge-v44/momentum65/studies/final/receipt.json`,
the three test logs, `study/{analysis,audit,diagnostic,cases,tested-inputs}.json`,
the final analysis/fixture/runner source, the packet-link regression tests and
the radial-current source/test confirms both pre-freeze blockers are resolved.
The current helper requires a positive injection radius, rejects zero-radius
current forcing in its regression, and still permits injection at a true
annulus's positive inner boundary. Analysis now checks actual byte hashes for
frozen inputs, both numerical outputs, diagnostics and marker input, together
with exact case identity/order. Three additional tests cover stale links and
case mismatch. This reviewer ran no project code or VM command.

The parent's final receipt identifies snapshot
`3fcb32e12530d647df61d354f351c45ad4753538d2f34d5a95857d06023733bc`.
Its logs confirm 32 targeted TypeScript regressions, 17 momentum Python tests
and 16 benchmark Python tests pass. Study execution, typecheck, production
build, site checks and asset checks each have exit code 0. These are the
checked targeted suites, not a claim that every historical repository test
was rerun. The receipt explicitly records no new live backend, no fresh browser
test and no experimental validation; preserve those distinctions.

The final campaign contains 29 cases and 5,300 accepted steps. Added cases
exercise stretched radial grids, a material interface at radius 1.37 with
nonuniform cells, and a shifted viscosity interface on odd grids. The variable
families now normalize against prescribed initial amplitude rather than the
computed solution peak. This stricter independent normalization gives finest
cross-code errors 0.003798 and 0.003815, both below 0.005. The added stretched
Couette and material-interface finest cross-code errors are 0.0000205 and
0.0000105. Every reported numerical gate passes. Maximum independent angular
impulse, energy and ledger discrepancies are respectively 2.97e-12, 2.50e-13
and 2.46e-12, below the unchanged 1e-9 gate.

No additional material numerical/physics blocker was found for releasing this
**standalone, fixed-density neutral momentum qualification**. This conclusion
does not qualify the live coupled dynamics or the device model. The unchanged
experimental profile and pressure screens still fail; discharge/current-map,
emissivity, local species momentum advection and coupled energy closure remain
the next substantive physics requirements. Updating this review note after
the run adds documentation only; it does not represent an additional executed
snapshot or deployed change.
