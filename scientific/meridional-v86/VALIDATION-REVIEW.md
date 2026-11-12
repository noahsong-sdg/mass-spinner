# Independent meridional-coupling validation plan

12 November 2026. Prospective review, before V86 predictions. Read-only source
trace; no numerical execution or pass is claimed. The parent owns safe-dev.

## What the existing evidence establishes

V85's coupled current/torsion solver already includes axial viscous and electrical
transport. Its nonzero Hall-inclusive pressure loop is conditional on prescribed
radial density/transport profiles extended axially. It does not identify the
circulation, its direction, or the cause of the measured-speed mismatch.

The V75 `flow.py` is a conservative compressible Euler/swirl operator, with
reflecting slip meridional boundaries; its external FiPy source supplies swirl
viscosity and heat transport. It explicitly omits meridional viscous stresses.
Its `magnetic.py` supplies diagonal-conductivity, Hall-free radial damping.
Those components can supply controls, but cannot by themselves resolve the
stationary-wall circulation of this apparatus. V75 also uses a different gas,
temperature domain and electrical model; source reuse is not physical admission.

## Defensible closures and their limits

1. **Full transient heavy-particle fluid:** evolve mass, radial/axial momentum,
   angular momentum and total energy with an equation of state and full
   cylindrical viscous stress. Specify electron temperature, ionization,
   heavy/electron energy partition and coefficient laws independently. A frozen
   electron transport profile is a conditional external coefficient, not a
   self-consistent discharge solution. Density changes must reach inertia and
   any explicitly density-dependent transport laws without hidden renormalizing.
2. **Constant-density incompressible control:** continuity is `div u=0` and
   pressure is a constraint; temperature is passive only if density/transport
   feedback is deliberately excluded. This can test circulation machinery, not
   establish compressible thermally coupled experimental accuracy. Report Mach,
   density and temperature variations before proposing it as an approximation.
3. **Anelastic control:** `div(rho0 u)=0` is different from `div u=0` for the
   existing radial density. Its pressure/energy consistency and low-Mach domain
   need a derivation. Freezing rho(r) while imposing arbitrary incompressible
   radial motion violates mass continuity and is not an acceptable shortcut.

Existing singular ideal-ring electrode power cannot supply a converged global
thermal source. Finite contact dimensions, energy deposition and wall thermal/
mass boundary conditions must be independently supplied. Declared smooth-source
or finite-contact families may verify the backend; do not select their width,
cooling or ionization from the velocity residual. An off-contact comparison does
not cure an unbounded heat source that feeds back nonlocally.

## Coupled invariants to test independently

Use conventional cylindrical (r,theta,z), imposed B=B ez, E=-grad(phi),
`Eprime=E+u cross B`, with positive Hall magnitude h for positive B:

```
Eprime_r = -phi_r + B utheta; Eprime_theta = -B ur; Eprime_z = -phi_z
Jr = sigmaP Eprime_r - h Eprime_theta
Jtheta = h Eprime_r + sigmaP Eprime_theta; Jz = sigmaParallel Eprime_z
fr = B Jtheta; ftheta = -B Jr; fz = 0
qOhmic = J dot Eprime = sigmaP(Eprime_r^2+Eprime_theta^2)
                              + sigmaParallel Eprime_z^2 >= 0
J dot E = qOhmic + u dot (J cross B)
```

Thus `Jtheta=(h/sigmaP)Jr-B(sigmaP+h^2/sigmaP)ur`. Reusing the old
`Jtheta=(h/sigmaP)Jr` when ur is nonzero omits real magnetic braking. Reversing
B must also reverse signed Hall response; h is not an unsigned coefficient for
both field directions. Confirm this tensor matches the chosen neutral-relative
single-fluid closure rather than importing signs from another convention.

Integrate with actual cylindrical volumes/areas. Advect specific angular
momentum `ell=r utheta`, not utheta as a Cartesian scalar. For closed walls,
advection creates no net angular momentum. Include centrifugal geometry once,
the radial stress term `-tau_theta_theta/r`, and the matching full viscous work.
Internal energy receives `-p div u + tau:grad u + qOhmic - div q`; total energy
instead receives electrical work `J dot E` and viscous/conductive boundary flux.
Do not add qOhmic on top of J dot E in the total-energy equation. Stationary
no-slip walls exert torque but have zero mechanical boundary power; gas shear
dissipation and conductive wall heat are separate terms.

## Controls before the experimental rerun

- Zero-drive uniform gas: exact stationary mass/energy and zero current/velocity.
  Axis parity must give ur,utheta=O(r), finite uz, and zero radial T/uz gradients.
- Smooth manufactured viscous circulation: use mass-flux streamfunction
  `psi=r^2(1-r^2/R^2)^2 sin^2(pi z/L)`,
  `rho ur=-psi_z/r`, `rho uz=psi_r/r`. It is regular and no-slip on the
  side/end boundaries. Add smooth swirl/temperature and analytically derived
  forcing. Independently derive every cylindrical geometric and energy source.
- Nonuniform-density version of that control detects using volume velocity
  divergence instead of mass-flux divergence. Require zero net boundary mass.
- Isothermal rigid-rotation equilibrium with co-rotating walls and B=0:
  `rho=rho_axis exp(Omega^2 r^2/(2 Rgas T))`. Measure/refine spurious meridional
  motion; do not claim exact well balancing unless the discrete scheme has it.
- Zero-Hall radial damping: with zero electrostatic field and zero swirl,
  `ur(t)=ur0 exp(-sigmaP B^2 t/rho)`; kinetic loss becomes positive heat.
  Also test the complete two-component Hall response, Joule positivity and
  pointwise electrical/mechanical identity above. Isolated current/voltage
  boundary experiments must account for source work, not impose both as inputs.
- Pure shear/thermal diffusion: independent analytic planar/endwall limits;
  full meridional stress work nonnegative for Newtonian admitted properties.
  An independent established-code cavity/disk control should check circulation
  and wall torque. Matching two copies of the same assembly is insufficient.
- Acoustic/adiabatic compression control for a compressible implementation;
  conductive equalization with zero flow for the energy operator. Resolve the
  acoustic CFL, diffusion restriction and split-source timestep independently.
- Mutate saved mass, angular momentum, heat/work, Hall sign, boundary flux or
  source hashes one at a time; the independent auditor must reject each case.

## Prospective gates and no-fitting comparison

Freeze equations, all constitutive/boundary inputs, observation times, grids,
solver tolerances and normalizers before prediction. Recommended inherited
numerical screens: local exchange-scaled residuals <1e-8 plus independently
derived arithmetic storage allowance; smooth profile RMS <2%, local <5%;
fixed-support integral observables <2%; tighter-solver changes <0.1%.
These are proposed V86 gates, not already accepted or passed. Use independent
radial, axial, timestep and joint refinement, including reference self-refinement.
Normalize evolving increments as well as total background fields. Track mass,
pressure, density/T extrema, meridional/swirl kinetic energy, torque partition,
current, electrical work, Joule heat and optical centroids at every declared time.

Evaluate wall heat/torque and flow over fixed physical supports. V85's shrinking
half-cell relative gates remain archived failures, not overwritten by a new
metric. Preserve new coarse failures, nonmonotonicity, negative states, stale
receipts and failed steady-state searches. Reject invalid states; no clipping,
artificial cooling or inventory/energy corrections concealed as stabilization.

Only a genuinely converged stationary state can be compared with steady data.
A finite-time transient is a different conditional prediction unless the
experimental observation time is known. Never select its timestamp from speed
agreement. Predeclare stationarity tests and demonstrate time-window extension.

Seal predictions before scoring the unchanged V80/V84 optical operator, retaining
all transport/contact interpretations, both brightness-edge closures and all
temperature/instrument/centroid alternatives. Prescribed 100 A per branch stays
an input, not a predicted-current match. Keep the 20% measured-speed criterion,
all-point/eligible-point distinctions and original failures. These previously
examined measurements are development data, not a fresh held-out dataset.

Passing verification would establish the admitted PDE/backend accuracy. A closer
optical prediction would be a conditional improvement, not proof that circulation
caused the old mismatch. Unknown axial, thermal, contact and discharge closure
must remain separate from statistical/numerical error and device qualification.
