# OpenFOAM cylindrical neutral-Ar operator controls

Prospective, 12 November 2026. Freeze this protocol and producer source before
the first predictions. No measured current/velocity, tuning or experimental
qualification. Native Foundation 14 `laplacianFoam` and `incompressibleFluid`,
official Jammy ARM64 package 20261008/build 14-a4867fc914c1, run serially in the
dedicated safe-dev guest. These are independent linearized neutral-fluid
operator controls, not the complete V86 compressible Hall release.

## Fixed equations and inputs

Radius R=0.06 m, axial length H=0.24 m; these dimensions and constant viscosity
mu=0.000114 Pa s are inherited from the V86 mathematical control. Uniform
rho=0.001 kg/m3 is a declared synthetic control input, not measured density.
Natural Ar mass m=39.948u, kB=1.380649e-23 J/K, Cv=3kB/(2m),
k=15kB mu/(4m), nu=mu/rho, alpha=k/(rho Cv)=2.5nu.
Using Cp in this fixed-volume scalar energy control would solve a different
equation. Fixed properties do not represent the experiment's evolving plasma.

1. Heat: native scalar solver advances dT/dt=alpha laplacian(T), with closed
   adiabatic axial/outer walls, axis regularity and wedge symmetry. Initial
   T=2900+100 J0(chi r/R) cos(pi z/H) K, chi=first positive zero of J1.
   Exact mode decays exp(-alpha lambda t), lambda=(chi/R)^2+(pi/H)^2.
   This is the frozen-density, zero-motion linear internal-energy subproblem;
   there is no assertion of compressible pressure equilibrium at finite deltaT.
2. Swirl: native laminar incompressible Navier–Stokes retains advection,
   centrifugal terms, vector viscosity and pressure projection. Stationary
   outer/endwalls no slip; regular axis, wedge planes. Initial
   u_theta=A J1(chi r/R) sin(pi z/H), ur=uz=0,
   A=1e-4 nu/R (Re based on amplitude=1e-4). The analytic **linearized Stokes**
   mode decays exp(-nu lambda t). Finite-amplitude centrifugal response is not
   silently removed or called an exact nonlinear solution. A half-amplitude
   witness reports normalized changes and meridional velocities. There is no
   thermal equation in this separate incompressible mechanical control; its
   kinetic-energy loss is a dissipation ledger, not evolved gas heating.

Use a one-cell angular wedge with half-angle 0.5 degrees, uniform 8x16, 16x32,
32x64 radial/axial cells. Native cell centers/volumes, not guessed structured
indices, determine initial fields and all inventories. Wedge straight-sided
geometry is an approximation to the cylinder; repeat 16x32 at half-angle
0.25 degrees, same physical time and radial/axial spacing.

## Fixed studies, evidence and gates

End time=0.2/(nu lambda), backward Euler, fixed timesteps end/128 for the three
meshes. On 32x64 repeat with end/64 and end/256. All runs save every step to
permit independent integration of budgets; raw case inputs/fields/logs are
archived, not replaced by scored summaries. Solver absolute tolerance 1e-14,
relative tolerance zero; no clipped values or fitted floors. Both native
solvers use the same geometry and reporting clock.

At every saved time independently parse fields and check finite values,
positive T, actual step count/time, temperature heat inventory and mechanical
kinetic/angular inventories. Heat inventory normalized drift <1e-10. Swirl
wall torque is native `forces` moment on all stationary outer/endwalls; use
its force-on-wall sign: L(t)-L(0)+integral(torque_wall dt). Native `grad(U)`
gives positive 2mu dev(sym gradU):dev(sym gradU) volume dissipation. Report the
BE velocity-change defect separately. Global mechanical energy defect is
K(t)-K(0)+integral(dissipation dt)+BE defect; the gradient-volume ledger is
an independently reconstructed continuum diagnostic, not assumed algebraically
identical to the native face operator.

Freeze gates: each case analytic final relative volume-RMS perturbation error
<5%; finest spatial error <1% and contraction <0.8 for both mesh halvings;
finest timestep-pair RMS difference <0.2% and contraction <0.8. At finest
mesh/128, torque and energy ledger defects each <5% of the respective loss,
and energy nonincreasing. Half-angle normalized field change <0.2%; normalized
half-amplitude swirl difference <0.1%, meridional speed/A <0.1%. Analytic
continuous cylindrical angular/kinetic inventories and wedge volume error
are also reported; they do not replace actual FV inventories.

No gate is weakened after inspecting predictions. Any missing field,
unexpected native failure, insufficient contraction or exceeded budget is
retained as failure. Baseline time/space pairs must exist before claiming
qualification. Passing establishes only these declared smooth constant-property
operators and this regime. It does not qualify V86, Hall contacts, compressible
coupling, experimental fidelity or the live playground.
