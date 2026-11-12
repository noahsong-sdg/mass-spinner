# Independent full-stress and heat review

12 November 2026. Reviewer did not author `diffusion86.py`. Read its complete
source, seven diffusion controls, `electro86.py`, `campaign86.py`, the frozen
V75 hydro operator and V86 protocol. No project code or numerical test was run
by this reviewer. The parent's reported test/run results are not independent
execution evidence here. No Python files changed during the campaign seal.

## Finding

No demonstrated source-level stress-sign, omitted global work or energy
double-counting defect was found. The hybrid FE/FV method is a defensible
conditional backend to investigate, subject to spatial/time verification.
The current controls establish algebraic/manufactured integrals and conservation
properties; they do not establish the local coupled PDE accuracy or actual
experimental transport/thermal closure.

## Full cylindrical stress

The unknowns are `(ur,uz,Omega)`, not three Cartesian velocity components.
`strains` correctly returns `ur_r`, `uz_z`, `ur/r`,
`(ur_z+uz_r)/2`, `r Omega_r/2`, `r Omega_z/2`. The last two follow from
physical `utheta=r Omega`; the `utheta/r` connection cancels the derivative
of r for rigid rotation. The trace contains the three normal strains, and
twice the shear products gives the correct tensor contraction.

The weak bilinear form is `integral 2 mu dev(Su):dev(Sv) 2 pi r dr dz`.
Thus the hoop contribution and the radial `-tau_theta_theta/r` geometric
force are present through variation; they need not appear as a separate
strong-form line. Spatially varying mu is kept inside this stress integral.
Zero bulk viscosity is an explicit monatomic/Stokes material assumption; it
does not describe ionization/reaction relaxation at arbitrary temperatures.

Using FV inertia `mass*mean(r^2)` for Omega agrees with the stored FV swirl
energy and angular momentum. It differs from a conventional consistent FE
mass matrix; this hybrid mass choice needs convergence rather than an assertion
of standard FE error order. Raw-node rigid rotation/translation/dilation tests
are appropriate strain tests, not claims that those flows satisfy stationary
wall boundary conditions.

## Boundary traces, regularity and null modes

Outer/endwall velocity traces are fixed to zero. At the axis ur is zero;
the other components are natural traces. At the midplane uz is zero and
ur/Omega have natural traction conditions. These match the intended parity.
Axis quadrature points have r>0, while Q1 ur vanishes at axis nodes, so ur/r
has a finite first-strip limit. Scalar heat has no essential boundary values,
giving the stated adiabatic natural condition.

Boundary traces carry zero storage. They are solved from their stiffness
rows rather than advanced as extra material. Arbitrary old values at those
traces have no inertial energy or backward-Euler defect. Their endpoint
natural rows vanish; fixed wall traces have zero velocity and hence zero
mechanical boundary power. This is consistent static condensation in principle,
not hidden wall mass or a thermal reservoir.

Rigid motions and isotropic dilation are null strains before applying walls.
The imposed stationary outer/endwall constraints remove those admissible
mechanical null modes. Adiabatic conduction retains its constant-temperature
stiffness nullspace, while positive interior heat capacities remove the
transient-system singularity. The reported positive-eigenvalue control is
useful; no independent spectrum was computed here.

## Mechanical and thermal energy ownership

For the implicit stress step, kinetic change equals endpoint stress work
minus `D_BE=.5 sum(capacity*(new-old)^2)`. Physical viscous heat is
`dt integral 2 mu dev(Snew):dev(Snew) dV`. The method separately deposits
this heat and positive D_BE, then changes each cell's total energy by its
kinetic change plus both heat terms. Keeping old total energy cell by cell
would omit stress-mediated energy redistribution; the present code does not
make that mistake. Stationary-wall torque dissipates gas kinetic energy
without mechanical power delivered through a moving wall.

The heat solve uses the current FV particle inventory for capacity. It changes
only internal energy and preserves mechanical momentum. Constant temperature
lies in the adiabatic stiffness nullspace; summing the scalar rows gives zero
net thermal exchange. Hydro supplies conservative pressure work and transport
of total kinetic/internal energy. Electromagnetics separately supplies actual
electrical work once. These operators therefore have compatible global energy
ownership. Their first-order Lie composition still needs timestep refinement;
separate operator conservation does not certify the coupled trajectory.

## Qualification gaps to retain

- **Local heat/work accuracy:** FE elements join FV centroids and boundary
  nodes. Dissipation is assigned to physical FV cells by classifying FE Gauss
  points, not exact FE/FV overlap integration. Summed heat equals the same
  quadrature stiffness work, but that identity cannot certify local heat
  placement or `div(tau dot u)` accuracy. Local manufactured total-energy
  residuals and joint refinement remain required. This is a consistency/error
  question, not a demonstrated global conservation failure.
- **Maximum principle:** positive conductivity and symmetric stiffness do not
  automatically make the Q1 hybrid thermal operator monotone for every radial
  weight/aspect ratio. No discrete maximum-principle or entropy proof was found.
  The primitive-state check rejects nonpositive internal energy, but does not
  prove absence of unphysical overshoot. Preserve extrema and failed states;
  do not clip them. Verify pure conduction on actual meshes and capacity ratios.
- **Angular reaction ledger:** full FE stress should obey angular-momentum
  change equal to fixed-wall theta reaction, with zero meridional-advection
  net torque in the closed vessel. The campaign records energy/heat histories
  but not that independent full-stress wall-reaction ledger. The source-level
  structure supports the identity; the campaign has not measured it here.
- **PDE reference:** analytic strain integrals and the same-library stiffness
  identity do not replace an independent cavity/disk or manufactured transient
  solution checking velocity, pressure and heat together. An established package
  assembling a form is not independent validation of the chosen form or hybrid
  FV projection.
- **Physical regime:** reported pilot temperatures above 5e5 K are outside
  the initial weakly ionized heavy-gas interpretation. Fixed monatomic Ar,
  fixed microscopic electrical profiles and all Ohmic power deposited in one
  heavy-temperature field are deliberately conditional. Lack of radiation,
  ionization energy and electron/heavy exchange prevents experimental thermal
  qualification, irrespective of numerical conservation or an optical score.

These gaps should remain visible in the result report. None licenses selecting
cooling, deposition fraction, contact width, circulation amplitude or reporting
time to improve agreement with the measured velocities. New evidence or fixes
must form a separately sealed study rather than modifying running predictions.
