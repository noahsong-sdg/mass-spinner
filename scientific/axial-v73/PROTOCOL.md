# v73: constrained axial torsional transport

Freeze before execution, 10 November 2026. Research-only FiPy extension; no live
source, controls, apparatus assets or defaults change. This is numerical
verification, not an experimental qualification or a complete hydrodynamic model.

Trace: fuel-spatial-operation.ts solves electrical current in r,z but projects
torque into radial bins and repeats one Omega(r) over all z. That reduction
cannot represent axial shear or endwall braking. Add a separate reviewable
research solver rather than silently changing a live closure or fitting new drag.
Use NIST FiPy4.0.3 CylindricalGrid2D, TransientTerm, DiffusionTerm and SciPy LU;
reuse the established cylindrical formulation, not a new hand-written PDE solver.

For fixed prescribed rho,mu>0 and ur=uz=0, solve
rho*r²*dOmega/dt = (1/r)*d(mu*r³*dOmega/dr)/dr
                  + d(mu*r²*dOmega/dz)/dz + r*f_theta.
Input source is integrated torque per cell. Fields are piecewise constant in
each annulus/axial cell. Exact inertia is pi*rho*dz*(r_right⁴-r_left⁴)/2.
Under FiPy's r dr dz measure use cell-average r²=(r_left²+r_right²)/2 for capacity
and axial faces, literal face r² on radial faces. Use harmonic face mu. This
averaging is exact geometrically for cellwise constant properties; it is not
an exact average of arbitrary unresolved mu(r,z)*r².

Axis regularity is natural zero torque. Other faces prescribe constant angular
speed or zero stress, with no unique all-Neumann steady solution. Frozen rho
must not be updated without separate mass/momentum transport. Variable-z swirl
is only a constrained theta-momentum problem: centrifugal and axial pressure
balance generally require meridional flow, which this extension does not solve.

Keep boundary torque/work, body torque/work, physical discrete shear dissipation
and backward-Euler numerical loss separate. For each step require angular
momentum balance and kinetic change + shear heat + BE loss = body work + wall
work to 1e-9 of the exchange scale plus 64-epsilon storage roundoff. Positive
heat and BE loss are invariants, not experimental evidence. No energy is fed
into the existing gas/liner solver at this stage.

Prospective controls:
- Arbitrary rigid rotation with all faces stress-free, nonuniform prescribed
  rho and mu: unchanged state, zero shear, conserved angular momentum.
- Rotating axial walls and prescribed cell torque with variable rho,mu: verify
  nonnegative dissipation and both discrete ledgers.
- No-slip outer/endwalls, Omega=(1-r²/R²)*sin(pi*z/L): exact volume-integrated
  manufactured torque, joint 8/16/32/64 radial/axial steady refinement. Maximum
  cell-center error / exact peak must decrease; final error <0.005.
- Stress-free radial/axial walls, initial cos(pi*z/L): compare with the exact
  BE discrete axial eigenmode and continuum exponential decay. Fixed 4x32 mesh,
  8/32/128 timesteps to fixed t: discrete error <1e-9, decreasing continuum
  error and final continuum error <0.01. This detects a wrong axial r² weight.
- Stress-free axial faces: radial-core/annulus steady solution stays identical
  between z rows and approaches the previously derived one-dimensional limit.
- Compare free and stationary endwalls on an identical 64x32 grid and identical
  positive core/annulus torque. Report the axial field and wall torque partition;
  stationary ends must not increase angular speed. No fitted experimental length
  or velocity target is used; these are illustrative mechanical boundary choices.
- Invalid grid/properties/time/axis boundary, and singular all-free steady
  request are rejected rather than silently substituting another model.

Freeze R=.06m, L=.14m, rho=.001kg/m³, mu=.0001Pa*s for manufactured/decay
controls. Their dimensional choices are illustrative, not an admitted apparatus
fit. Existing experimental profile failures remain untouched; no parameter is
selected using their heldouts.

Primary bases: Wijnakker & Granneman1980 Eq1 (constant-mu steady theta equation),
https://www.degruyterbrill.com/document/doi/10.1515/zna-1980-0815/pdf
NIST FiPy cylindrical grid and boundary-condition documentation,
https://pages.nist.gov/fipy/en/stable/generated/fipy.meshes.cylindricalGrid2D.html
https://pages.nist.gov/fipy/en/stable/USAGE.html#boundary-conditions
