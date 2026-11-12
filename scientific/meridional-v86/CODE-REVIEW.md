# Existing-code assessment for meridional coupling

12 November 2026. Independent source/code review. No solver, installer, PDF
parser, VM or project script was executed. The parent owns the shared safe-dev
stage. This is a recommendation, not evidence that any new code ran.

## Decision

**OpenFOAM's compressible `fluid` module is the strongest complete CFD base;
FiPy is the smallest immediately accessible scalar-transport/reference tool.**
PETSc supplies a strong independent thermofluid verification example and linear
algebra, but does not remove the need to implement cylindrical swirl and the
weakly ionized electromagnetic closure. No reviewed package is a turnkey solver
for this particular experiment. Using an established library does not establish
that the missing boundary data are known.

The V85 execution trace already solves axial electrical/azimuthal viscous
transport. Its missing parts are radial/axial fluid momentum, pressure, advective
mass/angular momentum/energy transport and evolving constitutive state. Preserve
that trace and its optical operator; replacing its solution with a velocity
profile chosen to improve the comparison would be fitting.

## Tools and concrete adaptation

| Tool | Existing implementation | Best use here | Remaining work |
|---|---|---|---|
| OpenFOAM Foundation 13 | Compressible momentum, pressure/continuity coupling, thermophysical evolution | Full finite-Mach rotating-gas apparatus model | Hall/Pedersen current solve, Lorentz force and consistent energy sources; finite contact and thermal/mass boundaries |
| NIST FiPy | Cylindrical scalar FV geometry, transient/convection/diffusion terms; SIMPLE Stokes example | Small conditional meridional response and independent scalar transport checks | Cylindrical vector stress, conservative face mass flux, pressure coupling and regime verification |
| PETSc | `TS`/`SNES`, mixed velocity-pressure-temperature `ex76`, field-split preconditioners | Independent manufactured thermofluid benchmark; scalable algebra for a verified formulation | Axisymmetric geometry/swirl/Hall and actual apparatus closure |

### OpenFOAM: strongest complete base

The pinned-release source shows
[`isothermalFluid::momentumPredictor`](https://raw.githubusercontent.com/OpenFOAM/OpenFOAM-13/master/applications/modules/isothermalFluid/momentumPredictor.C)
assembling `ddt(rho,U)+div(phi,U)+divDevTau(U)`, with a pressure-gradient solve
and an `fvModels` source. This is a concrete place to supply the Lorentz force;
the pre-existing rotating-frame term is not an extra empirical braking law.

The inherited
[`fluid::thermophysicalPredictor`](https://raw.githubusercontent.com/OpenFOAM/OpenFOAM-13/master/applications/modules/fluid/thermophysicalPredictor.C)
contains internal-energy/enthalpy transport, kinetic-energy evolution,
pressure work, conductive heat flux and thermodynamic correction. A custom
electromagnetic source must respect this equation's energy ownership: adding
`J dot E` and an independent `U dot (J cross B)` to the same total-energy
budget can double count mechanical conversion. Derive the energy adapter from
the discrete electrical work ledger first.

Its
[`wedge` implementation](https://raw.githubusercontent.com/OpenFOAM/OpenFOAM-13/master/src/finiteVolume/fields/fvPatchFields/constraint/wedge/wedgeFvPatchField.C)
transforms vector values between wedge and central planes. Verify a rigid-swirl
state and radial force balance before using this for the apparatus; a generic
symmetry-plane boundary can remove the desired azimuthal motion. A small
axisymmetric sector avoids paying for an unrestricted full 3D grid, but a real
runtime/memory measurement inside the 4-CPU/4-GiB VM is still required. No binary
availability, installation size or successful execution was established here.

### FiPy: useful, but its flow example is explicitly limited

NIST's [stable Stokes example](https://pages.nist.gov/fipy/en/stable/generated/examples.flow.stokesCavity.html)
uses SIMPLE pressure correction and Rhie–Chow face interpolation. Its own text
warns that it is rudimentary, with substantial corner pressure errors and
flow-related improvements still needed. Copying its Cartesian component
equations onto a cylindrical mesh does not yield a qualified rotating-flow
solver.

The actual
[`CylindricalNonUniformGrid2D` source](https://raw.githubusercontent.com/usnistgov/fipy/master/fipy/meshes/cylindricalNonUniformGrid2D.py)
weights scalar control-volume areas and volumes by radius, per radian. Thus
multiply integrated budgets by `2*pi` once, and do not multiply source densities
by radius a second time. Scalar diffusion does not automatically supply the
radial vector-curvature stress or the azimuthal geometric/advection terms.
For varying viscosity, use the full Newtonian cylindrical stress divergence,
not just the constant-viscosity `-mu*u_r/r^2` correction.

The [discretization API](https://pages.nist.gov/fipy/en/stable/numerical/discret.html)
provides `TransientTerm(coeff=rho)`, face-vector convection coefficients and
`DiffusionTerm`. Use the **same conservative face mass flux** for continuity,
angular momentum and energy. Check explicitly how changing old/current `rho`
enters each transient coefficient; a successful temperature solve alone does
not establish variable-density conservation. FiPy already appears in this
repository's `electrical-v82/access82.py`; that successful scalar reference is
not independent verification of a new vector-flow implementation.

### PETSc: concrete independent thermofluid reference

Official [`ex76.c`](https://petsc.org/release/src/ts/tutorials/ex76.c.html)
contains mixed velocity/pressure/temperature fields, manufactured quadratic,
cubic and channel-flow controls, and an ideal-gas-like conducting branch. This
is thermal conduction, not the plasma electrical-conductivity model. It is
Cartesian and low-Mach; an axisymmetric swirl adaptation remains scientific
work. [PCFIELDSPLIT](https://petsc.org/release/manualpages/PC/PCFIELDSPLIT/)
supports named field blocks and Schur-complement preconditioning for the
pressure saddle point. It is a solver mechanism, not a physical closure.

## Smallest defensible implementation and comparison gate

1. First implement conservative coupled **conditional** mass/momentum/energy
   transport with specified inputs. A prescribed-density Stokes/anelastic
   response plus transported passive temperature can be a useful numerical
   experiment, but must not be renamed a fully compressible thermofluid model.
   Evolving temperature with frozen density/conductivity is one-way transport.
2. Verify independent manufactured axisymmetric velocity, continuity, swirl
   advection and temperature fields; rigid rotation must have zero viscous
   heating. Verify pressure gauge independence and a conservative-force case
   with zero circulation. Verify per-cell continuity and global mass, angular
   momentum and energy budgets, including boundary work/heat.
3. Before applying incompressible/low-Mach machinery, assess **total** speed
   including azimuthal motion, centrifugal pressure stratification and thermal
   expansion. Small meridional velocity alone is insufficient. Also assess
   mean-free-path versus the actual resolved wall layer and mixture coupling.
4. Freeze all cases, wall/mass/thermal/electrical conditions, initial inventory,
   constitutive alternatives and convergence gates before predicting. No axial
   temperature map, cooling length, circulation amplitude or contact size is
   determined by the measured velocities. The existing ideal-ring Joule
   singularity cannot supply calibrated thermal forcing.
5. Rerun the unchanged optical comparison only after prediction seals. Retain
   all alternatives and failures. If only a conditional closure can be run,
   report that comparison as sensitivity evidence; it cannot demonstrate that
   meridional transport explains the real experiment.

Missing matched thermal/contact/injection data are the main *physical*
identifiability issue; choosing a bigger CFD code does not resolve it. A staged
FiPy/PETSc verification is justified now. A full OpenFOAM adaptation is a
separate reviewable implementation, preferable to hiding nonlinear compressible
flow inside a local patch to the existing torsional solver.
