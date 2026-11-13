# Prospective stationary-wall reconstruction test

Written before the analytical wall-shear witness or candidate predictions.
Do not replace V90/V91 baseline results or reinterpret their gates.

The current Euler slope stencil copies tangential primitive velocities into
the outer ghost cell. At a stationary no-slip wall, a linear tangential shear
therefore gets a zero forward difference and a zero limited slope in the last
cell. If this is the relevant defect, an analytical zero-normal-advection
linear shear will show a nonzero Rusanov tangential momentum flux at the last
interior face, and a wall-consistent slope stencil will remove it.

Run the analytical witness and regression tests before changing Flow. Only
after observing that mechanism, add an explicit opt-in stationary no-slip
wall trace to reconstruction. Use odd tangential velocity ghosts for slopes
at the outer radius and endwall; leave axis and midplane symmetry unchanged.
Keep the final Euler wall Riemann pair normal-reflected, so inviscid flux
does not duplicate the viscous wall traction. Default slip-Euler behavior
must remain exact, including closed mass/angular/energy/species budgets.

NASA-CR-199562, section 3.3.2 (printed page 45), describes reflecting all velocity components
for stationary viscous-wall ghosts while the inviscid wall flux needs only
wall pressure. This supports the boundary construction; it does not validate
our complete hybrid scheme:
https://ntrs.nasa.gov/api/citations/19960003218/downloads/19960003218.pdf

For the candidate use precisely V90's physical problem and native outputs.
Recompute our backend at n=8,16,32,64 with 512 steps; n=16 and64 also at
256 and1024 steps, and at n=128 with1024 steps if that native case completes.
Use unchanged V90 whole-state/increment norms, conservative restriction,
5% spatial/cross, 2% temporal and strict contraction gates. Keep coarse
8/16/32 and refined16/32/64 audits separate. Include all original native
conservation, wedge and stress-work negative-control checks. Verify the
candidate's closed mass/energy gates on all trajectories. Mark the128
extension as incomplete temporal qualification unless separately refined.

Do not adjust transport coefficients, fit measurements, discard a failing
observable or change the initial condition to make the benchmark pass.
