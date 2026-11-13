# Coupled neutral momentum/energy reference

Frozen before predictions, 13 November 2026. No experimental data or fit.
This is a bounded research comparison, not a live-backend replacement.

## Execution path and missing comparison

V88 runs constant-density conduction and nearly linear incompressible swirl
separately. V86 uses V75 conservative compressible Euler transport followed by
Q1 Newtonian stress/work and conduction. The missing reference is their coupled
neutral release. Reuse Foundation 14 `fluid`, constant-property perfect gas and
its existing `viscousHeating` fvModel; write no new native equation solver.
The latter supplies conservative divergence of viscous stress work to the
total-energy equation, not an additional independent heat source.

Match mass, full momentum and total energy:

```
dt rho + div(rho U) = 0
dt(rho U) + div(rho UU) = -grad(p) + div(tau)
dt(rho E) + div((rho E+p)U) = div(tau.U + k grad(T))
tau = 2 mu (sym(grad(U)) - I div(U)/3)
p = rho Rgas T; E = Cv T + |U|²/2
```

No Hall source, ionization, turbulence, radiation, injection or fitted drag.
Closed cylinder r=0..0.06 m, z=0..0.24 m: symmetry at z=0, stationary no-slip
side/endwall, adiabatic temperature. Native axisymmetric wedge half-angle
0.5 degrees; repeat n=16 at 0.25 degrees. Full-cylinder normalization for
inventories, using actual native cell volumes and centroid coordinates.

Argon molecular weight 39.948 g/mol, gamma=5/3, mu=1.14e-4 Pa s,
k=15 Rgas mu/4, Cv=1.5 Rgas. Native universal gas constant must be read and
compared against V86's kB/(39.948 u), without tuning either EOS. Initial
rho=0.001 kg/m³; T=2900+100 J0(chi r/R) cos(pi z/H) K;
Utheta=400 J1(chi r/R) cos(pi z/(2H)) m/s; Ur=Uz=0;
chi is the first positive J1 zero. This smooth non-equilibrium release has
pressure acceleration, centrifugal response, viscous heating and conduction.
Initial values are evaluated at each method's physical cell centroids;
V86's integrated swirl inertia and native point-value kinetic energy differ
at finite resolution and must be reported, not silently equated.

## Prospective campaign and admission

End time 20 microseconds. Nested (nr,nz)=(8,16),(16,32),(32,64), each
512 fixed steps; n=16 also 256 and 1024 steps. A V86 step exceeding its
existing acoustic bound fails; do not clip a state or silently change its clock.
Native Euler time discretization, second-order spatial linear interpolation,
laminar stress and conduction, PIMPLE 3 outer / 2 pressure correctors and one
nonorthogonal correction; linear tolerance 1e-12, relative tolerance zero.
Native writes t=0,5,10,20 microseconds. A separate n=16 case omits viscousHeating
as an explicitly ineligible stress-work negative control, not a replacement.
All attempts, source hashes, input dictionaries, final fields and logs retained.

Require complete finite positive rho/T, exact requested clock and case inventory.
Closed mass relative drift <1e-8 and total-energy drift <1e-6 for the native
reference; V86 retains its existing tighter operator conservation checks.
Native angular loss must agree with integrated wall torque to <1% of initial
angular momentum; torque timestamps must match every actual solver step.
No global energy test substitutes for local temperature/pressure comparisons.

For each of rho,T,Utheta and the meridional vector: same-grid cross-solver RMS
difference <5% of the final-state RMS scale; also score density/temperature
increments relative to initial data, and velocity changes, against a 5% gate.
Cross-solver error must contract from n=16 to n=32 versus the preceding pair.
Spatial self-differences use conservative 2x2 restriction of integrated mass,
momenta, angular momentum and total energy, recovering primitives afterwards.
Finest self-change <5% with contraction. Timestep changes use identical grids,
require <2% and contraction. A zero signal is unresolved, never a relative pass.
Report peak temperature, meridional speed, whole-state and increment metrics
even on failure. Wedge-halving field change must be <0.1% on whole-state scales.
Preserve any failed gates; these thresholds do not confer experimental accuracy.

## Primary implementation sources

- [Native energy equation](https://cpp.openfoam.org/v14/fluid_2thermophysicalPredictor_8C_source.html)
- [Native conservative viscous-work model](https://cpp.openfoam.org/v14/classFoam_1_1fv_1_1viscousHeating.html)
- [Native compressible fluid module](https://cpp.openfoam.org/v14/fluid_8H_source.html)

Installed source/binary hashes and actual EOS constants are sealed during execution.
