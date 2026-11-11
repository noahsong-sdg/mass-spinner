# Prospective v75 qualification

Freeze this protocol and the exact manifest before execution. This is a
compressible, binary monatomic neutral mixture numerical verification, not an
experimental fit or live-playground qualification. Preserve every failed run.

Evolve integrated mass, radial/axial momentum, angular momentum, total energy
and species-1 mass. Recover density, gas particle count, heat capacity, pressure
and inertia from those inventories. Binary diffusion has equal/opposite mass
fluxes and species enthalpy energy transport. Pressure barodiffusion contains
the shared centrifugal separation mechanism; no duplicate species drift.

Use common conservative Rusanov mass flux for species and specific angular
momentum, SSPRK2 hydrodynamics and binary diffusion, then the sealed v74
FiPy/current endpoint. This is a first-order Lie split. Total energy includes
meridional and swirl kinetic energy. Godunov numerical mixing is not labeled
physical viscous heat. Source backward-Euler loss remains a separate sink.
Azimuthal viscosity is included; meridional viscous stresses are omitted.

Admit finite positive mass/internal energy, each species in [0,total mass],
exact shared current/flow grid, sourced gas 300–418 K and tungsten 300–1900 K.
Reject an invalid step; no positivity clipping, inventory renormalization,
energy correction or silent coefficient extrapolation.

At every step, independent NumPy reconstructions (no production flow/diffusion
imports) must reproduce each SSPRK2 transport stage to relative 1e-8 of local
changes, with separately calculated arithmetic allowances for stored quantities
and cancelling face fluxes. Reuse the sealed independent v74 electrical,
viscous and thermal graphs, replacing gas storage by the exact binary particle
count. Check local angular/thermal rows at the same 1e-8 exchange-scaled gates,
with 64-epsilon storage allowance. A global ledger alone cannot qualify a run.

Closed hydro and diffusion steps conserve total mass, each species, angular
momentum and total energy to their explicit arithmetic bounds. Source steps
leave mass, composition and meridional momentum unchanged, and obey
`delta(Egas+Htungsten)+Qbath+N_BE=Welectrode+Wmovingwall` and
`delta L=dt*(electrical torque+wall torque)`. All admitted substeps must pass.
Record every step's independent receipt, not just the final endpoint. Include
corruptions of density/species, angular momentum, energy, enthalpy flux, and
source numerical heat; they must fail independent local checks.

Required controls: uniform stationary state; common-composition preservation;
actual density/advection/inertia feedback; fresh versus reused FiPy capacities;
zero diffusion; identical species; pressure-diffusion sign; species enthalpy
flux; reflecting boundaries; pressure-force sign; spin reversal; invalid CFL;
analytic standing acoustic wave; isothermal rotating binary equilibrium.
The last equilibrium is not exactly well balanced by Rusanov: measure and
refine its spurious motion rather than claiming exact stationarity.

Compare all scheduled physical times. Use cylindrical volume restriction of
primitive profiles, except Y is restricted by mass. Normalize density by
`max(0.001*rho0,max|rho_reference-rho0|)`, Y by
`max(0.001,max|Y_reference-0.5|)`, gas/wall temperature by
`max(1 K,max|T_reference-Tinitial|)`, Omega by `max(1,max|Omega_ref|)`,
and meridional velocities by `max(1 m/s,max|v_ref|)`. Y RMS uses mass weights;
the other profile RMS values use physical cylindrical volume weights.
Also compare density and composition changes from each trajectory's initial
primitive state. These prevent the imposed initial heterogeneity from masking
transport error. Density-change scale is `max(1e-6*rho0,max|delta rho_ref|)`;
composition-change scale is `max(1e-6,max|delta Y_ref|)`. Restrict density change
by volume; composition change is the difference of separately mass-restricted
final and initial fractions, with final-mass RMS weights. Both receive the
same profile, monotonicity, tolerance and reference gates as the whole fields.
Finest-tested RMS <2%, local <5%, and errors decrease unless all levels <0.2%.
Track total current, Joule/shear heat, separate wall torques, gas/wall peaks,
meridional kinetic energy, and species radial/axial moments; finest observable
errors <2%, scaled by maximum absolute reference value over observation times.
Retain the small wall-response 1 K normalization floor explicitly.

Require separate radial/axial/spatial/time/joint refinements; reference grid
and timestep self-refinements must pass the same gates. Independent linear,
thermal and combined tolerance variations must be <0.1%. These numerical
tests do not validate natural-Ar isotope transport, conductivity, immediate
heavy-particle Joule thermalization, wall films or omitted plasma closures.

Seal all producer, imported physics/current/property, independent checker and
analysis source hashes before execution. Bind each derived report to exact
input hashes; reject missing/migrated manifests and stale green reports.

Meridional motion adds `Jtheta=-sigmaP B ur` to the existing r/z current closure.
Include exact frozen-density local damping `ur'=ur exp(-sigmaP B²dt/rho)`
as another Lie-split stage before the FiPy source. Total energy is unchanged;
lost radial kinetic energy becomes physical Joule heat, with zero external
electrical work. Independently verify exact decay, positive heat, B=0 identity
and unchanged other conserved fields. This assumes Etheta=0, no Hall current
and prescribed B. Joint/timestep gates include this splitting.
