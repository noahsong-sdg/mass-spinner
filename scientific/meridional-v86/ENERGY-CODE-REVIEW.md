# Conditional meridional energy ownership review

12 November 2026. Source trace of `campaign86.evolve ->
Flow.advance_with_receipt -> Electro.advance -> Diffusion.advance`. No execution
by this reviewer. The reviewer authored the diffusion adapter; its discussion
here is an author trace, not independent approval of that implementation. The
electromagnetic/campaign implementations were independently inspected. The
parent reports a coarse pilot reaching approximately
555,374 K by 4 microseconds; that number was not independently recomputed here.

## Energy ownership is internally coherent

The V75 Euler operator evolves cell-integrated **total** energy, including both
meridional and swirl kinetic energy. Its pressure/centrifugal momentum conversion
therefore changes internal energy without adding extra total-energy forcing.

`Electro.advance` updates transverse momenta implicitly, then adds
`dt*(Qohm + Omega_new*torque + ur_new*radial_force)` once to total energy.
The exact backward-Euler kinetic change differs from that endpoint mechanical
work by the nonnegative kinetic increment defect. Consequently internal energy
receives physical Ohmic heat **plus** that numerical defect. The receipt's
`BEdefectByCellJ` is diagnostic; the campaign does not add it again. Port work
is reconstructed from the same segment law and is not a second thermal source.
This matches `J dot E = Qohm + u dot (J cross B)` at the discrete-source level.

`Diffusion.advance` reduces kinetic energy through a symmetric Newtonian stress
operator. It deposits integrated nonnegative strain dissipation and the exact
backward-Euler kinetic defect as heat. It additionally changes each FV cell's
total energy by `DeltaK_cell+heat_cell`, retaining stress-energy redistribution;
keeping every cell's total energy fixed would omit that transport. Its global
sum vanishes up to the linear-solve/integration residual. This is a hybrid
FE/FV local reconstruction, not an explicitly stored FV face stress-energy
flux. Its local consistency still requires spatial refinement. The subsequent
adiabatic conduction redistributes internal energy with no wall reservoir.

## What the high temperature means

The pilot does not show that the real neutral gas reaches this temperature.
The new case is an adiabatic one-temperature release with all modeled Ohmic
heat retained in a small closed gas inventory. Electrical coefficients remain
prescribed, there is no evolving ionization/electron-energy exchange, radiation,
wall cooling, mass injection or exhaustion. The steady torsional initialization
is not a thermal or radial-pressure equilibrium. Constant viscosity/conductivity
are declared source-conditioned controls, not qualified properties at the pilot's
large temperatures. These assumptions can fail physically while algebraic
mass/energy conservation passes.

Therefore retain the hot pilot and report the constitutive/thermal failure.
Do not choose a heavy-particle heating fraction, circulation gain or cooling
coefficient using measured velocities. Contact-footprint refinement also remains
necessary: a finite declared cathode disk regularizes the ideal ring but does
not turn its unmeasured geometry or port power into experimental calibration.

## Independent thermal reference, frozen before its execution

`thermal_reference86.py` compares actual FiPy and the actual hybrid adapter to
the closed cylindrical Neumann mode
`2900+100 J0(xi*r/R) cos(pi*z/H) exp(-alpha*lambda²*t)` K, with the first positive
J1 root, R=.06 m, H=.14 m, rho=2e-4 kg/m³ and the published constant viscosity.
Initial conditions and scoring use exact FV cell averages. There are 16/32/64
cells per direction, 24 backward-Euler steps and one finest-grid 12-step witness.
The fixed decay exponent is .1, independent of the experiment. Spatial error
is measured against continuum backward-Euler decay; finite-time error against
the exponential is separately reported. Gates are fixed in source: finest
spatial/cross-code errors below 1% of initial amplitude, time change below .1%,
energy drift below 1e-10 and spatial contraction below .8 per grid doubling.
All failures remain in the output. This tests conduction, not the missing plasma
thermal closure or full apparatus energy accuracy.
