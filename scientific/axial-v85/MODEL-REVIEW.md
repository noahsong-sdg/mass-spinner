# Independent axial-transport and meridional-model review

12 November 2026. Read-only code/source review. No scientific code, project
scripts, PDF parser or shared safe-dev VM was executed by this reviewer. The
parent owns numerical execution. No parameters were selected from velocity
targets.

## Execution path and supported diagnosis

`boundary-v84/campaign84.py` loads the frozen V83 manifest/scenarios, calls
`electrical-v82/model82.properties`, and passes its fields to both V84 solvers.
`model82.properties` evaluates `transport82.profile(..., r)` and adds `z*0`.
Consequently viscosity, parallel conductivity and effective anisotropy vary
radially but are **uniform along z**. The radial thermal/collision inputs are
not an independently measured two-dimensional transport map.

`model84.solve` already assembles both radial and axial viscous conductances,
stationary no-slip side/end walls, and reciprocal electric/motional coupling.
The velocity field is not axially uniform: it responds to localized drive and
endwall braking. What is omitted is poloidal mass/momentum advection and the
density/pressure/energy evolution that would determine it. Adding an empirical
endwall drag would duplicate existing resolved viscous stress.

`optics84.velocity_grid` passes the saved first axial row and actual graded
radial edges into frozen V80 sightline/spectral reconstruction. It does not
replace a failed centroid with a local peak. First-row sampling approaches the
symmetry plane under refinement. The 4/8 optical-flow comparison tests this
sampling/discretization, not the missing physical circulation closure.

At prescribed current the exact uniform-field torque is

`tau = B I (R² − a²)/2`.

Changing bulk conductivity redistributes the drive, but cannot add total torque
with the same current/radius moments. The ring implementation includes the radial
boundary half-face contribution and tests this invariant. Thus a new transport
model must explain where angular momentum travels and is dissipated, not create
additional drive to repair the measured-speed residual.

This is not proof that axial uniformity or absent meridional flow causes the
velocity discrepancy. Both are plausible omitted mechanisms; the source/theory
comparison leaves important constitutive and boundary evidence missing.

## Smallest justified implementation: resolved torque/work diagnostics

Implement an independent postprocessor on the sealed V84 fields before adding
an unmeasured axial profile. Reconstruct the existing finite-volume face laws
using the actual producer centers and source fields; do not change the solve.
For each shear edge with conductance `g`, the torque is
`g (Omega_a − Omega_b)` and dissipation is
`g (Omega_a − Omega_b)²`. At a stationary wall replace `Omega_b` by zero.

Report separately:

- internal radial shear work and sidewall shear work;
- internal axial shear work and endwall shear work;
- signed sidewall and endwall torque;
- axial viscous angular-momentum flux through each axial face;
- cumulative sidewall torque and Lorentz drive between fixed axial planes.

The exact discrete axial-face flux is
`Fz[j+1/2] = sum_i g_z[i,j] (Omega[i,j] − Omega[i,j+1])`.
At the symmetry plane it is zero; at the endwall it is the endwall torque.
The sum of wall torques must reproduce the existing global drive torque, and
the four positive work partitions must reproduce `viscousW`. Local slice
balance follows by reconstructing internal electric currents from saved
potential differences, reciprocal EMF weights and resistances, including known
radial port torque. Gauge choice must leave every result unchanged.

This directly tests whether the center is supplied from the anode region, how
much drive reaches the endwall, and which resolved stress consumes work. It
does not convert any measured velocity into an input. It is preferable to a
new fitted axial viscosity, residence time or circulation coefficient because
all its inputs and conservation identities already exist in the sealed model.

For refinement, compare integrated budgets on shared physical axial cuts and
torque fluxes on coincident faces. Do not compare mesh-center slices whose
physical domains move. Ring-local derivative maxima may diverge as the delta
source narrows; keep them distinct from far-field or fixed-region budgets.
Do not interpret the singular-ring electrical contact power as finite heating.

Tests should include rigid rotation/internal-work zero, constant-viscosity
analytic shear, zero/reversed current and field, gauge invariance, wall/work
partition closure, local slice balance, nested physical-cut invariance and
corrupted field/source seal rejection. Failure retains the result but withholds
qualification; it must not alter a constitutive coefficient.

## Meridional equations and limits

Let `ell = r² Omega` and `up=(ur,uz)`. For one axisymmetric mixture, the
conservative angular-momentum equation is

`d_t(rho ell) + (1/r) d_r(r rho ur ell) + d_z(rho uz ell)`
`= (1/r) d_r(mu r³ d_r Omega) + d_z(mu r² d_z Omega) − r B Jr`.

Meridional advection can redistribute angular momentum without changing its
closed-volume global source. With impermeable boundaries, it is not a new net
torque. It can change a particular sightline centroid in either direction.

Purely azimuthal flow requires pressure compatibility

`d_z(rho r Omega² + Jtheta B) − d_r(fz) = 0`.

For the imposed axial field with no other axial body force, `fz=0` in this
simplified balance. This condition must be checked with force units. Dividing
by nonconstant density and omitting the resulting baroclinic term changes the
question. The old centrifugal-only `d_z(r Omega²)` diagnostic is useful but
does not determine circulation speed or establish failure of the full force
balance. Hall force and density/thermal variation can change the residual.

The V82 transport profile already returns `pedersenSM`, `hallSM`, electron/ion
Hall parameters, and implied density. Therefore the effective-beta information
gap alone no longer forbids a conditional full-tensor calculation: use the
declared collision model's separately computed Hall conductivity. Do not infer
Hall conductivity by substituting the effective beta for electron beta. The
source collision/density construction is still conditional and axially extended.

For a fixed sign convention
`Jperp = sigmaP E'perp + sigmaH zhat cross E'perp`,
`E'r = −phi_r + r Omega B`, `E'theta = −ur B`, and `E'z = −phi_z`.
Nonzero radial flow then affects radial current as well as radial Hall force.
Adding circulation only to momentum while retaining the zero-radial-flow
electrical relation is not a consistent general extension.

**Verified source-sign mapping:** this reviewer visually inspected the complete
parent-rendered journal p.675 in `source-review/page-675.png`. Equations 6 and 7
define the paper's `sigma_H` as **negative**, while `transport82.hallSM` stores
the corresponding positive magnitude for the declared positive field. Equation
3c has `−sigma_H B E'r`; therefore its mapped force is
`+B (hallSM/pedersenSM) Jr` in the producer's standard cylindrical orientation.
No reversal of the paper's velocity coordinate is needed. The initial negative
force in the new diagnostic incorrectly combined the paper's signed formula
with the code's positive magnitude. The parent is correcting this before new
predictions, with an explicit protocol erratum; the independent Drude and
manufactured-force regressions require the positive mapped sign.

A quantitatively defensible coupled solve also needs mass conservation,
pressure/temperature closure, heavy/electron energy ownership and cathode gas
injection/exhaust conditions. A constant-density incompressible secondary-flow
calculation is a declared approximation requiring its own Mach/stratification
assessment, not an experimentally identified correction. Resolving endwall
layers does not identify these missing physical inputs.

## Primary-source check

The [1979 article](https://doi.org/10.1515/zna-1979-0602), inspected as a complete
[publisher-provided OCR rehost](https://www.researchgate.net/publication/276453995_A_Study_of_a_Weakly_Ionized_Rotating_Plasma),
places its principal measurements at the symmetry plane. Its §4.5 suggests
viscous transport from the anode plane could drive midplane neutrals and reports
unexplained ion/neutral slip. This supports testing axial stress transport; it
does not supply an axial material map or secondary-flow amplitude. The existing
V81 source assessment records the paper's §3 circulation argument and missing
closure. This reviewer inspected OCR/code and the subsequently supplied complete
p.675 image; other source equations were not newly visually inspected.

No independently measured axial viscosity/conductivity map was recovered in
this model review. The separate source investigators should determine whether
additional apparatus records identify one before any new physical profile is
promoted beyond sensitivity.

## Historical uniform-viscosity control

A new comparison with uniform `mu=1.14e-4 Pa s` is admissible as a historical
published-theory control: this is the independently pre-existing V79 protocol's
source estimate at mean 2900 K, not a value selected from V84 residuals. Keep
the same four electrical transport alternatives, geometry/current inputs and
all optical alternatives. Freeze this before new predictions and retain both
the uniform and radial-viscosity results.

It does not establish an axial temperature map or show which viscosity field
is physically correct. The radial alternative combines an apparent core ArII
width temperature with an outer heavy-particle/probe estimate; its use for
neutral-dominated viscosity is conditional. The collision/electrical field and
optical broadening temperature remain separately declared, not silently changed
to whichever values improve agreement.

For a fixed imposed current distribution and negligible motional feedback,
azimuthal speed scales inversely with a common viscosity factor. That is not an
exact law for the full coupled solve: changing viscosity changes velocity and
motional EMF, which can redistribute current even though total source torque
remains fixed. Re-solve the coupled equations rather than rescaling velocities.

## Post-implementation adversarial source review

Reviewed the written `campaign85.py`, `diagnostics85.py`, `replay85.py`,
`run85.py`, `summarize85.py`, `audit85.py` and final protocol/erratum without
execution. No material scientific-code or overfitting blocker was found in
these paths:

- The new control changes viscosity alone; the four electrical transports,
  two anode positions, source current and every refinement remain explicit.
  Baseline field/source seals are checked before loading the frozen fields.
- Diagnostic source torque includes the radial boundary half-face contribution;
  radial/axial work and slab balances use the frozen reciprocal face laws.
- The Hall sign now follows the visually checked source-to-code convention.
  Pressure loops use force density with the prescribed radial density; they do
  not silently apply a uniform-density acceleration-curl criterion.
- The replay changes only input/output directory bindings of the frozen optical
  and scoring modules. Both complete viscosity families and all alternatives
  remain in the summary, with no parameter selected from a residual.
- Audit failure is retained as a nonzero final runner status even when the
  runner proceeds to independent optical scoring and required software checks.

The paired summary's `allRequiredNumericalPass` is inherited from the flow and
diagnostic audit; optical numerical acceptance is recorded separately by the
optical auditor. Reports must not call either one alone complete experimental
qualification. No result of the uniform-viscosity comparison proves the actual
axial transport map or identifies meridional circulation as the mismatch cause.

The parent reports completed new prediction SHA256
`5654356e7fca335d0bc66c35420eeb2665134e39c84f23a78c7cc625c9d5fc92`
and 14 passing initial controls. These execution results were not independently
inspected by this reviewer at this source-review stage; final exported receipts
and audits remain required.

## Vanishing wall-halfcell partition: independent asymptotic diagnosis

The parent subsequently reported 32 final relative partition failures in
`radialWallW` and `endWallW`, approximately 300%, despite passing flow, torque
and total-work checks. These are shrinking halfcell regions, not fixed physical
heat-loss domains. For smooth no-slip flow at distance `h` from the wall,
`Omega_cell = h*d_n Omega + O(h²)`, shear conductance `g=K/h+O(1)`, and

`tau_half = g*Omega_cell -> K*d_n Omega`,

`W_half = g*Omega_cell² = K*(d_n Omega)²*h + O(h²) -> 0`.

Cosine-graded boundary cell widths scale as `h_n ~ n^-2`; therefore
`W_n/W_(2n) -> 4` and `abs(W_n-W_(2n))/W_(2n) -> 3`.
An approximately 300% relative difference is the expected asymptote of this
vanishing-domain observable. It does not establish divergence of physical
wall torque or whole-volume viscous dissipation. At singular contacts the
approach may differ; this smooth asymptote is not a theorem for every contact.

Moreover the halfcell quantity is viscous dissipation in gas adjacent to the
wall, not mechanical power delivered to a stationary solid. Mechanical boundary
power is `tau_wall*Omega_wall=0`; conduction/accommodation is needed to predict
heat transferred into the wall.

Retain all original failures and `allRequiredNumericalPass=false`. The smallest
honest post hoc supplement compares the fixed-volume directional sums
`radialInteriorW+radialWallW` and `axialInteriorW+endWallW`, and reports absolute
halfcell changes normalized to total fine-grid dissipation alongside the actual
halfcell shares. These sums preserve the original total-work identity and do
not select a new diagnostic cutoff from the residuals. A passing supplemental
screen must not be called a retroactive pass of the original partition gates.

Added an analytic regression using `Omega=A*(1-z²/L²)` on successively refined
cosine grids. It compares actual diagnostic axial work with the exact
fixed-volume integral `mu*(pi*R⁴/2)*4*A²/(3*L)`, checks finite endwall torque
`mu*(pi*R⁴/2)*2*A/L`, and deliberately expects approximately 300% relative
changes in vanishing end-halfcell dissipation. This regression is written but
requires parent execution in safe-dev.

## Final exported-evidence review

Read-only inspection of the final exported results and root
`AXIAL-TRANSPORT-V85.md` found no material scientific or reporting blocker.
The sealed prediction hash matches `5654356e...9d5fc92`; all nine current V85
Python source hashes match the final execution receipt. The final log records
27 passing scientific regressions, including the new analytic halfcell limit;
the application log records 1,238 passing tests. Typecheck/build exit codes
are zero. The scientific audit correctly exits 1, retaining its original
32 final halfcell failures and false overall qualification flag.

The actual paired summary supports the reported ranges: sidewall torque
92.44–93.58%, endwall torque 6.42–7.56%, axial viscous dissipation 4.03–5.55%,
and conditional pressure loops 1.51–19.27 Pa. Final loop-refinement change is
0.1055% using the stated component-sum normalization. Both 576-alternative
families retain zero all-point matches; the new optical audit has no numerical
failures and reports a maximum flow-to-optics change of 0.2772%.

The supplemental fixed-volume work change, 0.0798%, is kept separate from
the original failed relative halfcell gates. Actual width/work ratios approach
four while wall-torque gates pass, consistent with the independent vanishing-
domain derivation. This numerical explanation does not promote either viscosity
choice, circulation diagnosis or live device to experimental qualification.

These are independent checks of exported hashes, receipts, logs and saved
summary/audit fields, not a new numerical run or independent reassembly of all
scientific outputs by this reviewer.
