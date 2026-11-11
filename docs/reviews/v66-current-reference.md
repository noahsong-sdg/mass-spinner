# v66 independent FiPy electrical reference

10 November2026. Source derivation and implementation by the independent
reviewer. No project code, VM commands, tests or dependencies executed by this
reviewer; the parent exclusively owns safe-dev synchronization/execution.

## Equations and scope

For axisymmetric azimuthal flow and axial magnetic field, `u cross B` is radial.
With prescribed positive Pedersen/radial and parallel/axial conductivities:

```
Jr = sigmaP (-dphi/dr + B*r*Omega)
Jz = -sigmaParallel*dphi/dz
(1/r)*d(r*Jr)/dr + dJz/dz = 0
```

The reference solves the actual FiPy cylindrical anisotropic diffusion equation
`div(sigma grad(phi)) = div(sigma (u cross B))`, using its cylindrical mesh,
`DiffusionTerm`, `FaceVariable` source divergence, harmonic face conductivities,
arithmetic face Omega and SciPy direct LU. It imports no production functions
or matrix. FiPy's face-area/center-distance geometry differs from production
exact-log radial resistance and cellwise motional-emf integration; convergence
is expected, not same-grid equality.

The diagonal reduced conductivity applies to axisymmetric electrostatics with
axial B and purely azimuthal flow. A Hall azimuthal current can exist, but its
divergence is zero under axisymmetry and it performs no work on an azimuthal
fluid when B is purely axial. Its `Jtheta*Bz` radial Lorentz force can still
affect radial pressure/species balance, which this electrical oracle does not
solve. This does not justify neglecting Hall physics in radial mechanics,
nonaxisymmetric or general-field configurations. Conductivity is an input;
electron energy, ionization, non-LTE populations and sheath drops are not solved.

## Boundary condition and power audit

Null boundary voltage means electrical insulation, `n dot J=0`. It does not
mean `n dot grad(phi)=0` where motional emf has a normal component. The reference
therefore constrains the normal potential gradient to normal `u cross B` on
insulating faces, retaining the full motional flux divergence. Prescribed
voltage faces constrain phi. At least one specified electrode voltage is
required to set the gauge; a wholly insulated/gauge-free case is outside this
input contract, not silently regularized.

A full cylinder is supported with r=0 as an insulating symmetry axis and no
inner electrode. The cylindrical axis face has exactly zero physical area,
current and work. Joule work is evaluated as `Jn^2*A*d/sigma`, algebraically
equivalent to `I^2*R` away from the axis, so the axis limit does not form the
undefined numerical product `0^2*infinity`. Finite axis-voltage electrodes are
rejected because a zero-area face cannot specify a physical current terminal.

For each FiPy face's oriented current I, normal separation d, surface A and
normal conductivity sigma, R=d/(sigma A), emf=e_normal*d. The discrete work is

```
Joule = sum I^2 R >= 0
Lorentz mechanical work = -sum I*emf
electrical power entering gas = -sum_electrodes phi_e * I_out,e
electrical power = Joule + Lorentz work
```

This is a face-dual discrete work definition, not a claim that a separate
cell-center `J dot E` quadrature must be exactly identical at finite resolution.
The boundary sign gives positive input power for current from a high-potential
electrode into gas. Positive azimuthal rotation and outward radial current in
positive axial B give negative mechanical work (electromagnetic braking).
Mechanical power is not added to Joule heating again.

For a uniform-conductivity annulus with rigid Omega, full radial electrodes and
insulating ends, a separate exact check is

```
emf = B*Omega*(R^2-a^2)/2
Rohmic = log(R/a)/(2*pi*L*sigmaP)
Iout = (Vinner-Vouter+emf)/Rohmic
phi(r) = Vinner - Iout*log(r/a)/(2*pi*L*sigmaP)
                     + B*Omega*(r^2-a^2)/2
```

For a full cylinder with only a grounded outer wall and rigid Omega, the exact
open-circuit solution is `phi(r)=B*Omega*(r^2-R^2)/2`, `J=0`. If Omega varies
axially, internal motional eddy currents can exist even with a grounded outer
wall and insulating ends: the zero external electrical power is balanced by
positive Joule heat and negative mechanical work. These provide meaningful
boundary/power tests without choosing arbitrary conductivity calibration.

A future common-fluid thermal coupling must not also add an independent legacy
ion-neutral slip loss to the same energy budget without a new derivation:
Pedersen dissipation already contains collisional drift embodied in the input
conductivity. Separate ion/neutral momenta require explicit multifluid frame and
collision-power definitions rather than counting both closures as independent.

The exported max cell residual and net boundary current use FiPy's independent
face-flux divergence and exact cylindrical volumes. Signed radial/axial face
currents are also exported in geometry-indexed arrays, independent of FiPy's
native face numbering. Parent must inspect refinement and complete power/charge
gates before qualification. No experimental accuracy is claimed by this code.

## Official sources checked

- [FiPy4.0.3 boundary conditions](https://pages.nist.gov/fipy/en/stable/USAGE.html#boundary-conditions):
  native fixed-value/gradient constraints and source-flux divergence semantics.
- [FiPy anisotropic diffusion example](https://pages.nist.gov/fipy/en/stable/generated/examples.diffusion.anisotropy.html):
  tensor diffusion in the existing framework.
- [Pinned cylindrical mesh source](https://raw.githubusercontent.com/usnistgov/fipy/4.0.3/fipy/meshes/cylindricalNonUniformGrid2D.py):
  cylindrical face areas/volumes, radial-fast cells and origin handling.
- [Pinned mesh factory](https://raw.githubusercontent.com/usnistgov/fipy/4.0.3/fipy/meshes/factoryMeshes.py):
  public `CylindricalGrid2D(dr,dz,origin)` interface.
- [Pinned diffusion-term source](https://raw.githubusercontent.com/usnistgov/fipy/4.0.3/fipy/terms/abstractDiffusionTerm.py):
  tensor face coefficients and fixed-gradient contributions.

All source claims above are checked from primary NIST project documentation or
its pinned source, not inferred from a generic diffusion package description.

## Pre-analysis qualification clarification

The protocol's `1e-8` exact coaxial identity is interpreted as a production
exact-log integration check. A standard FiPy area/distance radial operator
instead approximates the logarithmic resistance and has finite mesh error;
requiring its finite-grid analytic difference to be1e-8 would incorrectly
identify ordinary discretization error as a source-law defect. Before reading
the campaign scores, the reviewer flagged this distinction from the equations
and recommended retaining all FiPy analytic errors with a1% finest continuum
bound. The separate originally stated1% cross-code potential and2% work gates
are unchanged. This clarification was requested after solver execution but
before independent score analysis, not represented as an earlier frozen gate.

`analyze.py` independently reconstructs all currents, physical work, production
cell heat/torques and each code's charge residuals from supplied potentials,
constitutive inputs and geometry. It also checks FiPy's supplied face currents
against its own standard geometric reconstruction. The extra same-discretization
audit does not replace the distinct FiPy continuum/refinement comparison.
Three analysis regressions cover stale input hashes, case identity/order, and
zero-scale handling without an arbitrary absolute tolerance. Parent execution
and evidence inspection remain required.

## Coupled-coordinate defect and correction

The first electrical-only parent run passed 362 gates across 16 cases at source
snapshot `5771e1bd3e1208a590e15988036632fad75792c74b2e90fe940f7348b6efe53c`;
the reviewer inspected its receipt and log, not yet the exported raw results.
That run does not qualify a later source snapshot. Coupled refinement then
exposed a radial coordinate inconsistency: the electrical graph used arithmetic
radius centers while gas/momentum storage uses the midpoint of `q=r^2`.

For current varying linearly in q near the axis, the old torque split applies
unequal q-widths to the two face currents. In the first shell with zero axis
current this gives `-3*B*Iouter*h^2/8`, versus the integral
`-B*Iouter*h^2/4`: a 50% excess. In plain terms, current from the outer face was
assigned too much of the shell's lever arm. Setting
`rc=sqrt((rin^2+rout^2)/2)` gives equal q-widths and the trapezoidal integral
`-B*(qout-qin)*(Iinner+Iouter)/4`, exact for current linear in q. Using this same
split for emf, resistance and torque preserves the discrete work identity.
This is the midpoint in the cylindrical volume coordinate q, also the
uniform-area RMS radius; it is not the volume-weighted mean radius.
The correction directly reconciles existing coordinates and work quadrature;
an independent empirical torque factor would break that consistency.

The independent production reconstruction and analytic potential locations now
use those q-centers. FiPy retains its native arithmetic-r centers and its
original operator. Cross-code potential comparisons interpolate the FiPy
potential linearly in physical r to production points, with its specified
outer electrode potential or insulating-gradient boundary value. Comparing
raw array indices would incorrectly include the offset between physical sample
locations. The raw-index difference is retained as a diagnostic. The existing
1% potential and 2% work gates are unchanged; interpolation error is part of
the measured finite-resolution comparison, not removed using a fitted model.
New independent regressions cover regular-axis open-circuit balance and
coordinate interpolation with both electrode and insulating outer boundaries.
The coordinate correction and these regressions require a fresh parent-run
qualification before any updated pass claim.

## Executed q-center electrical qualification

The parent subsequently ran `scientific/current-v66/final_gate.py` in safe-dev
against 709-input snapshot
`1dae90685feda10518ec604e7af0d1275a6ebd1506a60f37bec7592a2b9fde6c`.
The reviewer inspected the exported electrical JSON and regression log in
`scientific/centrifuge-v44/current66/studies/review-1/current66-final/`.
The current kernel, FiPy oracle, analyzer, analysis tests, fixture generator
and protocol hashes each match that tested input ledger. Actual exported file
hashes also match the analyzer's recorded links:

- cases: `920cfab92fbbf630eb862ea4d2a626799e1500722ba610b32f8130369d700a4e`
- production: `cd09c4bb7736d7bb72297a2b21d8ffe0eac5bdd88c0db3140e3bdd153fa0afbe`
- FiPy: `401fe1f9b042c842c4785892ffd667ed2b6f145ee8e4e24adfb6dd7711b672aa`

All 16 electrical cases and 362 numerical gates passed. Both output inventories
match the input identities/order. The five independent-analysis regressions
passed. The reference records FiPy4.0.3, NumPy2.4.6 and SciPy1.17.1. All four
families retain 12/24/48/96 radial and 6/12/24/48 axial cells; potential and work
differences decrease monotonically over these retained refinements.

At 96 radial by 48 axial cells:

| Family | Potential difference / prescribed voltage scale | Largest work difference / combined power scale |
| --- | ---: | ---: |
| Coaxial | 0.001933% | 0.0004892% |
| Motional coaxial | 0.002359% | 0.0004892% |
| Annular electrode patch | 0.0008301% | 0.005407% |
| Axis electrode patch | 0.005490% | 0.004920% |

These denominators are the protocol's voltage range plus motional bound, and
the combined magnitudes of Joule/mechanical/electrical power, respectively.
They are not relative errors of an arbitrarily small individual output. The
potential comparison includes linear-interpolation error at common physical
points. Limits remain 1% and 2%. FiPy's finest exact coaxial current/work error
is 0.0009784%; the production exact-log identity's largest relative error across
all coaxial resolutions is `6.19e-14`. Analytic potential arrays are computed
but are not a separate gate; potential qualification here is cross-code.

Across all cases, reconstructed cell charge residual/current-scale maxima are
`3.37e-11` for production and `3.02e-14` for FiPy. Work-identity residual/combined
power-scale maxima are `5.03e-14` and `2.09e-14`, respectively. The maximum net
boundary-current ratio across both codes is `1.34e-10`, below `1e-9`. FiPy's
exported face currents agree with independent reconstruction within `4.34e-15`
of current scale; all exported insulating-face currents are exactly zero.
Independent production torque/heat reconstruction passes without changing
the original `1e-9` limits.

This supports numerical qualification of the prescribed-conductivity
axisymmetric electrical kernel within these cases. It does not qualify a
self-consistent discharge, Hall radial mechanics, sheaths, measured material
conductivity or a real centrifuge. The umbrella `current66-final` receipt has
**exit code1**, because the coupled refinement campaign still fails a rotation
convergence gate. The electrical pass must not be presented as a whole coupled
backend pass or as experimental validation. This reviewer ran only read-only
artifact inspection and hashing on the host; all project execution was by the
parent in safe-dev.

## Final accepted snapshot

The later safe-dev acceptance run supersedes the failed umbrella receipt above.
Its 711-input snapshot is
`ad08c16e86729d6b94190e349de1c4117bf37844dca74540c32767569f1b517c`.
The reviewer inspected
`scientific/centrifuge-v44/current66/studies/final-accepted/acceptance.receipt.json`,
its input ledger, and `current66-final-volume/` outputs. The receipt records
source verification before/after execution and exit code 0. All 11 recorded
commands exited 0: electrical study, five analysis regressions, FiPy q-momentum,
coupled campaign, independent coupled audit, coupled refinement, repository
tests, typecheck, build, site check and asset check.

The electrical kernel, oracle, analyzer, analysis tests and fixture generator
hashes remain identical to the independently reviewed q-center source above.
The revised protocol's current hash matches the acceptance ledger. Actual
exported cases/production/FiPy SHA256 values are unchanged and match the final
analysis links exactly. Thus the same 16 cases, 362 gates and finest electrical
errors tabulated above are reproduced in the final accepted run; the five
analysis tests pass again.

The reviewer also inspected the actual executed FiPy q-momentum JSON:
`rho*q*dOmega/dt = d/dq(4*mu*q^2*dOmega/dq)`, at 4/16/64 cells and 4/16 timesteps.
All six manufactured polynomial cases pass, maximum absolute Omega error
`1.710e-14 rad/s`, against the stated `2e-10 rad/s` bound. This checks a
specific regular-axis polynomial transient and does not by itself establish
general nonlinear momentum convergence.

The final coupled artifacts report 448 accepted steps independently audited and
all six finest radial/time gates passed. The inspected finest rotation
differences are 0.008131% for 32-to-64 radial cells and 0.09772% for 32-to-64 time
steps. Those results supersede the earlier 4.72% radial failure following the
separate q-coordinate shear correction; their source-level review belongs to
the coupled-physics review. Axial electrical and liner grids remain fixed in
that refinement campaign. Numerical acceptance still does not establish
experimental calibration, predicted conductivity or deployment/live-backend
verification.
