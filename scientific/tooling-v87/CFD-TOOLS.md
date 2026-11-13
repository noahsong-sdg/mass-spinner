# CFD and plasma-fluid tooling: adversarial review

12 November 2026. The tooling review uses source inspection and primary
documentation; its V86 results refer to existing exported evidence, not an
independent rerun. A subsequent separately authorized installation pilot now
verifies rootless serial OpenFOAM 14 execution in a separate safe-dev project:
see [actual commands, inputs and logs](openfoam-pilot/README.md). That upstream
smoke does not provide new matched-flow or plasma qualification.

## Decision

**Retain the sealed V86 research baseline, but stop treating its assembly
libraries as an established CFD solver. Add an independent OpenFOAM Foundation
14 neutral-fluid reference before extending the custom hydrodynamics further.**
Use PETSc TS if a stage-consistent coupled time integrator becomes the next
demonstrated numerical need. Investigate MOOSE plus Zapdos/CRANE for the missing
electron-energy/chemistry closure separately. None of these supplies this
apparatus's weakly ionized Hall transport, emitting footprint or thermal
boundary conditions automatically.

This is a recommendation about capability and verification burden, not a claim
that a popular package would agree with the experiment. V86 remains numerically
and experimentally unqualified; changing packages cannot turn its prescribed
conductivities and conditional all-heavy heating into measured material laws.

## What actually runs

| Execution path | Established component | Physics/discretization still owned here |
|---|---|---|
| [V75 `Flow`](../mixture-axial-v75/flow.py#L18), especially [`_fluxes`/`rate`](../mixture-axial-v75/flow.py#L121) | NumPy array operations | Cylindrical MUSCL/Rusanov fluxes, geometry and centrifugal source, EOS, reflecting ghosts, positivity rejection, SSPRK2, mass/angular/energy ledgers |
| [V86 `Diffusion`](../meridional-v86/diffusion86.py#L37) | Actual scikit-fem Q1 assembly and SciPy sparse direct solve | Full cylindrical stress weak form, centroid/boundary mesh, FV diagonal capacities, FE-to-FV heat placement, mechanical/thermal boundary conditions and energy coupling |
| [V86 `Electro.advance`](../meridional-v86/electro86.py#L88) | SciPy sparse block solve | Finite-contact Hall network, charge/motional EMF, radial force and swirl torque, port work, Joule heat and numerical kinetic defect |
| [Campaign loop](../meridional-v86/campaign86.py#L44) | Existing operators above | Explicit hydro followed by backward-Euler Hall and diffusion: a first-order Lie split overall |

The Q1 stress includes radial, axial and hoop strain, radial/axial cross strain,
and both swirl shears. It is not the common erroneous scalar Laplacian for
three velocities. Exact FV mass/inertia and stationary-wall conditions make
the hybrid a rational small research implementation. It is nevertheless a
new discretization that we must qualify, rather than an upstream Navier–Stokes
solver that we have merely configured.

## Confirmed weaknesses and smallest useful fixes

### 1. Global energy conservation does not locate heat correctly

**Problem.** [`dissipation_cells`](../meridional-v86/diffusion86.py#L105)
assigns each positive FE quadrature contribution to its containing FV cell.
The mechanical step returns both physical dissipation and exact backward-Euler
kinetic damping to internal energy, and retains local stress redistribution.
However, FE elements straddle FV boundaries, and this mapping is not exact
FE/FV-overlap integration or an explicit common-face stress-energy flux.

**Technical cause.** The kinetic-energy identity constrains the global sum;
it does not establish consistency of each cell's approximation to
`div(tau.u)`. In plain terms, the correct total heat can still be deposited in
the wrong locations. Existing FiPy/analytic conduction agreement tests scalar
conduction, not this coupled mechanical redistribution.

**Fix.** First compare a constant-property manufactured compressible flow and
a decaying swirl control against an independent face-flux implementation.
OpenFOAM Foundation 14's actual
[`viscousHeating` source](https://raw.githubusercontent.com/OpenFOAM/OpenFOAM-14/master/src/fvModels/general/viscousHeating/viscousHeating.C)
uses a face divergence of stress work. Its
[header and dictionary example](https://raw.githubusercontent.com/OpenFOAM/OpenFOAM-14/master/src/fvModels/general/viscousHeating/viscousHeating.H)
explicitly distinguish conservative total-energy redistribution from additional
energy generation. Enable this model explicitly when constructing the control;
the base fluid solver alone is not evidence of a matching stress-energy term.

**Why this choice.** An independent discretization distinguishes heat placement
error from thermal-closure error. Another global energy test or an unrelated
FEM library swap cannot do that. If the comparison fails, repair the overlap
integration or adopt a common-face conservative formulation; do not adjust
heating fractions to improve measured velocities. No defect in the current
stress sign or global energy identity has been demonstrated by this review.

### 2. The timestep study does not actually refine the timestep

**Problem and cause.** The campaign sets
`dt=min(cap, remaining_time, stable_dt(q,0.2))`. Existing finest schedules have
654, 654 and 655 steps across three nominal caps. The acoustic CFL limit wins;
smaller displayed caps mostly change nothing. SSPRK2 hydro also does not make
the surrounding first-order operator composition second order.

**Fix.** At fixed mesh, refine the *active* CFL factor and record actual step
sequences, then repeat spatial refinement with suitably smaller timesteps.
Keep the existing field-increment and fixed-time gates. Only after this
diagnosis consider PETSc TS with a genuine semidiscrete residual and
stage-consistent stiff/nonstiff operators. Wrapping completed `advance()`
steps in TS would preserve the splitting error.

**Why this choice.** Active refinement is the smallest causal experiment. A new
time-integrator dependency before that experiment obscures whether the current
failure is the test contrast, splitting error or spatial truncation.

### 3. Better numerics cannot close the missing plasma thermodynamics

**Problem and cause.** V86 evolves heavy density and energy while microscopic
electrical coefficients, electron temperature and ionization stay prescribed.
The stress/conduction matrices are assembled once with constant coefficients;
support for a spatial callable is not temperature-dependent reassembly.
Closed adiabatic positive-power operation and all-heavy Ohmic heating generate
conditional extreme local temperatures. These are not a prediction of the
experiment's actual gas temperature.

**Fix.** Specify and verify separate electron/heavy energy exchange,
ionization/recombination and boundary loss terms before treating this as an
experimental thermal model. Begin with a standalone zero-dimensional energy
and chemistry ledger using existing low-temperature-plasma kernels/data, then
couple only terms justified for the measured regime. Keep contact footprint
uncertainty explicit. **Do not solve a different thermal problem by fitting a
cooling coefficient or a heat partition to rotation.**

**Why this choice.** It addresses missing equations/data rather than changing
the algebra library. Frozen-property numerical controls should remain available
to distinguish constitutive changes from discretization changes.

### 4. Linear-solver replacement is a profiling question

`spsolve` refactorizes the evolving Hall and capacity-dependent diffusion
matrices. That is a plausible scaling bottleneck, not a measured one in this
review. PETSc KSP/field splits and reusable preconditioners become justified
after timings identify factorization cost or memory as limiting. Replacing
SciPy solely for prestige adds setup and tolerance risks without demonstrating
a physics gain.

## Ranked tool decisions

Effort ratings below are engineering judgments. No full package build or
matched-argon case has been qualified. The subsequent binary pilot verifies
only serial installation and the unchanged upstream 400-cell cavity in the
4-CPU/4-GB safe-dev guest.

| Rank and decision | Verified primary capability | Important gap / bounded role | Effort |
|---|---|---|---|
| **1. Adopt OpenFOAM Foundation 14 as an independent neutral-CFD reference** | Current [release 14](https://openfoam.org/release/14/); documented [`fluid`, `multicomponentFluid`, `shockFluid` modules](https://doc.cfd.direct/openfoam/user-guide-v14/solvers-modules). Actual [momentum](https://raw.githubusercontent.com/OpenFOAM/OpenFOAM-14/master/applications/modules/isothermalFluid/momentumPredictor.C) and [energy](https://raw.githubusercontent.com/OpenFOAM/OpenFOAM-14/master/applications/modules/fluid/thermophysicalPredictor.C) implementations expose viscous stress, thermal transport and source hooks. | Match laminar compressible monatomic gas and stress-work model first. A [wedge mesh](https://doc.cfd.direct/openfoam/user-guide-v14/boundaries) represents axisymmetry; swirl/axis regularity still require explicit verification. No demonstrated ready-made weak-ionization Hall/contact closure. | Medium for small fixed-property reference; high for full coupled migration. Prefer guest package availability over an unmeasured full source build. |
| **2. Retain scikit-fem hybrid as a conditional research backend** | Inspected full stress, physical cylindrical quadrature, FV capacities and exact global kinetic-loss heating identity. Existing scalar FiPy/analytic controls provide independent conduction evidence. | Local stress-energy placement, joint convergence and arbitrary-grid thermal positivity remain our burden. Do not expand its CFD scope before independent controls. | Low to retain; medium for overlap/common-face correction if demonstrated necessary. |
| **3. Adopt PETSc TS only for a defined coupled-integration task** | [`TS`](https://petsc.org/release/manual/ts/) supports ODE/DAE residuals and mass matrices; [`TSARKIMEX`](https://petsc.org/release/manualpages/TS/TSARKIMEX/) separates stiff implicit and explicit residuals; [`TSAdapt`](https://petsc.org/release/manualpages/TS/TSAdapt/) controls steps. | Does not supply our fluxes, Hall closure, positivity or energy consistency. Its [ex76 thermofluid example](https://petsc.org/release/src/ts/tutorials/ex76.c.html) is low-Mach; it is not a direct replacement for the current compressible heated flow. | Medium/high: consistent residual/Jacobian, field scaling, boundary DAEs and new conservation tests. |
| **4. Evaluate MOOSE + Zapdos/CRANE for plasma closure** | MOOSE's [Navier–Stokes module](https://mooseframework.inl.gov/modules/navier_stokes/index.html) has FE/FV alternatives including compressible HLLC; [Zapdos kernels](https://shannon-lab.github.io/zapdos/syntax/Kernels/) and the [CRANE authors' paper](https://arxiv.org/abs/1905.10004) address plasma transport/chemistry coupling. | The cited HLLC option uses piecewise-constant data; it is not automatically higher order than current MUSCL. The documented [`LinearFVRZViscousSource`](https://mooseframework.inl.gov/source/linearfvkernels/LinearFVRZViscousSource.html) is explicitly swirl-free. Verify a full swirl formulation and magnetized closures before claiming coverage. Drift-diffusion plasma species are not an automatic replacement for rotating inertial bulk momentum. | High for unified migration; lower for standalone energy/chemistry reference. |
| **5. Use Basilisk for a low-Mach swirl control if needed** | Actual [`swirl.h`](https://www.basilisk.fr/src/navier-stokes/swirl.h) adds azimuthal transport, centrifugal force, variable-viscosity terms and axis conditions to axisymmetric incompressible flow. | A concrete independent swirl implementation, but incompressible. It cannot replace the current compressible thermal release without deriving and checking that limit. | Low/medium for a bounded benchmark; substantial additional work for energy/plasma coupling. |
| **6. Retain FiPy scalar controls; defer MFEM migration** | Existing actual FiPy cylindrical conduction control already exists. MFEM's [example 18 source](https://docs.mfem.org/4.9/ex18_8cpp_source.html) provides DG compressible **Euler**, a useful inviscid reference. | Replacing an assembly library with another leaves stress/energy/Hall ownership. Neither example is a complete matched rotating plasma solver. | Low to retain controls; high to rebuild multiphysics on MFEM. |
| **7. Use Dedalus for smooth independent mathematical controls** | [Authors' framework paper](https://arxiv.org/abs/1905.10388) and a documented [heated vector-flow example](https://dedalus-project.readthedocs.io/en/latest/pages/examples/ivp_ball_internally_heated_convection.html) establish spectral PDE and curvilinear capabilities. | That example is Boussinesq, not our compressible Hall system. Finite contact edges and unresolved localized heating make immediate spectral migration unattractive; this is an inference about our problem's regularity, not a measured Dedalus failure. | Medium for smooth manufactured/stability controls; high for this full apparatus. |
| **8. Reference FLASH algorithms; do not migrate now** | Documented [ion/electron/radiation heat exchange](https://flash.rochester.edu/site/flashcode/user_support/flash_ug_devel/node123.html) and [implicit thermal conduction](https://flash.rochester.edu/site/flashcode/user_support/flash_ug_devel/node128.html). | Those channels and Spitzer/Lee–More options are not a justified neutral-Ar exchange law. [Access requires an application](https://flash.rochester.edu/site/flashcode/download.html); no downloaded implementation or turnkey weakly ionized match was verified. | High and presently unjustified. |
| **Exclude RACCOON from CFD candidates** | Its [own module list](https://hugary1995.github.io/raccoon/modules/index.html) concerns thermal/mechanical fracture, solid mechanics and phase fields. | Potential future rotor structural analysis; not a meridional plasma-fluid replacement. | No CFD adoption recommended. |

### Commercial tools: credible alternatives, access and scope unverified

**COMSOL 6.4 Plasma/CFD:** this is a substantive candidate for a licensed
independent plasma-closure reference. Its
[Nonisothermal Plasma Flow coupling](https://doc.comsol.com/6.4/doc/com.comsol.help.plasma/plasma_ug_plasma.09.35.html)
joins plasma transport, fluid momentum and gas heat transfer with shared
properties; its [Laminar Flow interface](https://doc.comsol.com/6.4/doc/com.comsol.help.mfl/mfl_ug_fluidflow_single.06.04.html)
explicitly supports axisymmetric swirl. Unlike a scalar-conductivity MHD
shortcut, the Plasma Module documents
[magnetized electron transport tensors](https://doc.comsol.com/6.4/doc/com.comsol.help.plasma/plasma_ug_drift_diffusion.07.21.html).
That does **not** establish our complete two-carrier Hall/motional-EMF/contact
and energy ledger. The standard Laminar Flow interface documents a low-Mach
compressible regime, typically below 0.3; it cannot be substituted for the
heated compressible release without checking actual Mach numbers and the
selected formulation. The
[license feature list](https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_installation.02.030.html)
separately identifies `PLASMA`, `CFD` and heat-transfer features; needed add-ons
depend on the selected interfaces. A base license is not proof of access to
all of them. Our license availability, price, installation and guest-platform
support are unknown. Recommendation: consider a small licensed electron/heavy
energy and chemistry reference if access exists; no immediate migration or
claim that COMSOL supplies missing material/boundary data.

**Ansys Fluent/CFX, inspected 2026 R1 documentation:** Fluent documents
[swirl, compressible flow and heat transfer](https://ansyshelp.ansys.com/public/Views/Secured/corp/v261/en/flu_ug/flu_gs_sec_gs_capabilities.html);
its [MHD add-on implementation](https://ansyshelp.ansys.com/public/Views/Secured/corp/v261/en/flu_ug/flu_mhd_chp_mhd_implementation.html)
uses UDF/UDS machinery for potential or induction with Lorentz-force and Joule
heat fields. CFX documents
[electromagnetic body-force/resistive-heating coupling](https://ansyshelp.ansys.com/public/Views/Secured/corp/v261/en/cfx_thry/ch_mhd.html)
and [rotating-frame momentum/total energy](https://ansyshelp.ansys.com/public/Views/Secured/corp/v261/en/pdf/Ansys_CFX-Solver_Modeling_Guide.pdf).
These make them credible neutral-flow and conventional-MHD references.
**Verified gap:** Fluent's documented
[anisotropic electrical-conductivity option](https://ansyshelp.ansys.com/public/views/secured/corp/v251/en/flu_ug/flu_ug_sec_e-conductiv.html)
is for solids, not evidence of an antisymmetric fluid Hall tensor. A turnkey
weak-ionization Hall closure or compatibility of every swirl/MHD combination
was not established here; require vendor equations and a small manufactured
test before adoption. Licensing is consequential:
[Fluent 2026 R1 limitations](https://ansyshelp.ansys.com/public/views/secured/corp/v261/en/flu_ug/flu_gs_limitations.html)
state that CFD Pro cannot load UDFs, while the documented MHD add-on uses
them. Do not assume Pro is sufficient; confirm the exact MHD/CFX entitlement
with the vendor. Available licenses, costs and ARM64 guest support are unknown,
not assumed free. Recommendation: useful licensed cross-code comparator if
access exists; the already demonstrated open-source serial path remains the
most concrete near-term route. No commercial package was installed or run.

### Two misleading shortcuts to avoid

OpenFOAM forks have different APIs and model names. The cited ESI
[`mhdFoam` implementation](https://api.openfoam.com/2212/mhdFoam_8C.html)
is incompressible, constant-isotropic-property MHD and explicitly lacks the
required electric-field/current boundary treatment. Its
[`electricPotential`](https://api.openfoam.com/2212/classFoam_1_1functionObjects_1_1electricPotential.html)
uses scalar isotropic conductivity. Neither establishes Hall tensor transport
with `u×B` and finite current-conditioned electrodes. These observations refer
to the cited version, not an uninspected claim about every later ESI release.
Do not mix its `fvOptions/viscousDissipation` instructions with Foundation 14's
`fvModels/viscousHeating` implementation.

Likewise, “RZ supported” does not establish azimuthal momentum, centrifugal
balance, hoop stress and stress-work consistency. Test those equations and
boundary conditions explicitly in any chosen framework.

## Smallest reviewable adoption plan

### Feasibility inside the actual safe-dev boundary

No Docker, nested VM or alternate runtime is needed. A separate project in the
existing Apple safe-dev runtime protects the parent's concurrently running
scientific campaign; it uses its own ordinary Apple guest and volume. The
safe-dev guest is ARM64 Linux, non-root, read-only system image,
4 CPUs/4 GiB RAM with a 12 GiB writable project volume. The local
`/Users/noahs/.local/share/safe-dev/README.md` explicitly forbids modifying that
system image with a package manager during project runs. The official
[Ubuntu installation instructions](https://openfoam.org/download/14-ubuntu/)
use `sudo apt`; those commands are **not directly applicable** to a safe-dev
project invocation.

There is a concrete binary route: the Foundation's own
[Noble ARM64 package index](https://dl.openfoam.org/ubuntu/dists/noble/main/binary-arm64/Packages)
lists `openfoam14` version `20261008`, a 121,685,764-byte download with
644,393 KiB installed size (about 629 MiB), SHA256
`42a384ebb4a289a94376ea8644c03d8bb081a147ce67d5847ba8feb1d60c086d`.
It depends on glibc ≥2.38, libstdc++ ≥13.1 and OpenMPI 4.1.6-era libraries;
ParaView is a recommendation, not required for headless runs. A separate
[Jammy ARM64 build](https://dl.openfoam.org/ubuntu/dists/jammy/main/binary-arm64/Packages)
has older glibc/OpenMPI requirements and may be a better guest-ABI match. Do not
assume that an Ubuntu package works on any Debian-based image merely because
both use `.deb` files.

The smallest proposed installation experiment, owned by the parent, is:

1. Inspect guest architecture, distro, free volume and existing runtime
   libraries. Download only a matching, version-pinned package and necessary
   dependency packages inside an explicitly online safe-dev invocation;
   authenticate repository metadata and verify package hashes.
2. Extract packages into a guest project-local tool prefix without running
   maintainer scripts or writing `/usr`/`/opt`. Check actual ELF dependencies,
   linker resolution and package environment paths before executing. Upstream
   [`etc/bashrc`](https://raw.githubusercontent.com/OpenFOAM/OpenFOAM-14/master/etc/bashrc)
   derives installation paths from its location, and its
   [platform settings](https://raw.githubusercontent.com/OpenFOAM/OpenFOAM-14/master/etc/config.sh/settings)
   explicitly handle AArch64; this makes relocation plausible, **not tested**.
   Do not substitute a bundled glibc into the process environment to conceal
   an ABI mismatch.
3. Offline, run only `foamRun -help`, a tiny `blockMesh`/mesh check, then a
   laminar headless wedge control: start at 8×12×1 cells, save only fixed
   reporting times and scalar ledgers, and measure peak RSS and disk use before
   16×24×1 and 32×48×1 refinement. Run serially initially; MPI is an additional
   installation/partitioning variable, not a requirement for this tiny pilot.
   Package size plus those meshes is plausibly within 12 GiB; actual dependency
   footprint and runtime must be measured before claiming feasibility.
4. If required system libraries cannot be supplied safely, stop the extraction
   experiment. A reviewed, digest-pinned safe-dev runtime image addition is the
   appropriate alternative. Do not weaken non-root/read-only settings or mount
   host libraries/control sockets. A full source build under 4 GiB is a less
   predictable route and is not the first recommendation.

The ~629 MiB installed package also exceeds safe-dev's 512 MiB export/import
content limit. Keep regenerable tools in the guest; export only small cases,
receipts, source/version metadata and scientific results. Never delete unique
existing results to make room for the pilot.

**Subsequent observed pilot:** actual Debian 12/AArch64/glibc 2.36 guest;
authenticated official Jammy ARM64 OpenFOAM 14 `20261008`, build
`14-a4867fc914c1`. The package's `/opt`-hardcoded shell initialization failed
after extraction. Explicit project-local environment paths and the upstream
serial dummy Pstream library then ran `foamRun -help`, `blockMesh -help`,
`blockMesh`, `checkMesh` and the complete unchanged 400-cell compressible air
RAS cavity successfully, all exit zero. The case ran 100 steps to 1 s in
about 0.173 s wall time; the harness recorded 128,600 KiB peak child RSS.
The guest volume used 814 MiB including the package, extracted prefix and case.
Exact authenticated metadata, inputs, source hashes, failed initialization and
successful logs are [exported](openfoam-pilot/README.md). This proves a small
serial execution path fits, not parallel operation or a matched neutral-flow
benchmark. Actual FiPy conduction/analytic controls remain the present independent
physics reference; matched OpenFOAM argon/swirl/stress-work controls come next.

### Numerical adoption gates

1. **Repair the temporal contrast first.** Keep V86 frozen as the baseline;
   run active-CFL refinement at fixed physical times without changing inputs,
   transport laws, scoring or experiment-derived parameters.
2. **Build one neutral-fluid cross-code case.** Use Foundation 14 with matched
   ideal monatomic EOS, constant viscosity/conductivity, stationary no-slip and
   adiabatic walls, correct midplane/axis conditions, laminar transport and
   explicit viscous stress-work redistribution. No electromagnetic source yet.
   Compare fields and mass/angular/energy budgets, not screenshots or a single
   final rotation number.
3. **Establish independent controls before the heated release.** Include the
   existing analytic cylindrical conduction mode; linearized Stokes swirl decay
   with regular axis and no-slip end/outer walls; then a manufactured
   compressible `(rho,u_r,u_z,u_theta,T)` solution with analytically generated
   forcing. The swirl decay is a *linearized* control: finite-amplitude
   centrifugal pressure effects cannot be silently omitted from a claimed
   nonlinear exact solution. Include variable-coefficient stress and local
   stress-energy transport, not just global dissipation.
4. **Only then compare the same conditional release.** Preserve geometry,
   capacities, initial fields, duration, source coefficients and positive-power
   energy ledger. A prescribed body-force/heat replay is a useful one-way
   reference, not validation of electromechanical backreaction. Full adoption
   needs jointly tested Hall current, motional EMF, force, heat and port work:
   `J.E = Q + u.(J×B)` with compatible face/contact geometry.

Retain the existing spatial 5% and temporal 2% field gates, test actual
refinement/contraction, reject nonphysical states without clipping, and retain
failures. Add an explicit wall-torque trajectory ledger and local energy-flux
comparison before claiming the cross-code flow is qualified. Pin code versions,
case dictionaries, material laws, source hashes and mesh/time histories. A
successful neutral-fluid control would qualify a numerical subsystem; it would
still not validate missing plasma closure or establish experimental accuracy.

## Scope of confidence

Verified here: the current execution path and custom-discretization ownership;
the cited upstream capabilities and important exclusions; the existing report's
unresolved spatial/time contrast and physical-closure limitations. Inference:
the recommended adoption order, effort estimates and expected utility of the
cross-code controls. Unverified: parallel execution, a matched neutral-fluid
comparison, cross-code agreement, any new physics benchmark result, or the cause of every existing
field-convergence failure. No tool ranking should be presented as evidence
that those failures have been fixed.
