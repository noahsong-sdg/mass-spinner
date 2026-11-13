# Coupled finite-contact argon release

Frozen 13 November 2026 before V99 predictions. This repairs the demonstrated
inactive-timestep refinement in V86 and tests its existing coupled backend on
contact/wall-refined meshes. It does not introduce another fluid solver.

Reuse V75 conservative axisymmetric compressible transport, V86's scikit-fem
cylindrical Newtonian stress/heat and implicit charge/Hall/transverse momentum
solve. Evolve mass, both meridional momenta, angular momentum and total energy.
Never overwrite evolving rotation with a stationary torsion solution. Preserve
the electrical identity Q + u dot (J cross B) = J dot E and stress-work transport.

Bounded first scenario in the frozen V84 inventory (linear-finite-te1), selected
by inventory order, not agreement: B=0.13 T, current=100 A per half-device,
R=0.06 m, half-length=0.24 m, anode center=0.07 m, width=0.02 m, uniform cathode
disk radius=0.004 m. The disk is an unmeasured regularization, not a measured
emission footprint. Other source-transport/anode alternatives remain unresolved;
this bounded campaign cannot replace the full eight-alternative envelope.

Initialize the finite-contact charge/torsion problem, source radial density and
heavy temperature, zero meridional velocity. This is not pressure equilibrium.
Closed impermeable stationary walls, midplane symmetry, adiabatic heat boundary.
Constant historical viscosity 1.14e-4 Pa s; monatomic Eucken conductivity.
Eulerian electrical coefficients and electron temperature are prescribed.
All Ohmic heat enters heavy temperature: a conditional one-temperature control,
not the paper's electron/heavy partition or an ionization model. No artificial
cooling, fitted heating fraction or borrowed measured wall temperature. Sustained
positive power prevents thermal steady state in this closed adiabatic system.

Nested physical mesh cuts: radial [0,.004,.056,.06] m, counts [4,8,4]*n;
axial [0,.06,.08,.232,.24] m, counts [4,4,12,4]*n. n=1,2,4 at actual CFL=.1.
At n=2 also CFL=.2,.05, five unique trajectories. Max dt=1e-7 s; actual dt is
min(cap, acoustic CFL, remaining time). Record unit-CFL stability limit before
each step and require genuinely distinct step sequences. Fixed reporting times
0,1,2,4 microseconds; retain every time, failure and constitutive limitation.

Independent reconstruction of saved primitives, mass/species (<1e-10), energy
(<1e-8), charge (<1e-9), and angular momentum including wall traction (<1e-8).
Record both exact discrete nodal-current torque and continuum disk torque
IB(R^2-a^2/2)/2; their difference is a spatial approximation, not roundoff.
Use union-of-interpolation-panel cylindrical RMS, Gauss orders2/3 witnesses.
Existing 5% spatial and2% temporal gates with contraction, including density
and temperature increments. Zero initial meridional fields are legitimate;
inactive timestep sequences must never qualify. Numerical success does not
establish constitutive or experimental accuracy.

The spatial sequence jointly shrinks mesh and CFL timestep; the separate
three-clock test is on n=2, not an independent time qualification of n=4.
Retained producer source01 calls its configured bound `actualCfl`; the accepted
acoustic CFL is always reconstructed as dt/unitCflStableDtS. Source02 renames
that metadata to `cflBound`, with identical equations and timestep selection.
Do not mutate source01 raw packets or silently reinterpret artifact versions.

After sealing fields, rerun the existing two-sided Doppler diagnostic on all
four reporting times of the finest spatial run. Keep both emissivity closures,
all six thermal proxies, three instrument widths, centroid/mode alternatives,
and unchanged20% measured-velocity criterion. No current, velocity, clock,
contact width or transport fitting; no choice of a favorable timestamp.
Viewed development measurements are not a fresh held-out test. This transient
is not the measured steady discharge, even if a diagnostic score passes.
The optical velocity input is the first axial cell layer, a near-midplane
proxy, not an exact z=0 trace. Its frozen thermal proxies do not describe the
evolved hot gas; a velocity-screen pass alone cannot qualify this model.

Primary apparatus: Wijnakker et al. (1979), DOI10.1515/zna-1979-0602;
conference companion DOI10.1051/jphyscol:19797236; heavy energy caveats:
Wijnakker (1980), DOI10.1515/zna-1980-0815. scikit-fem12.0.2/SciPy1.17.1
are reused established assembly/linear solvers. OpenFOAM14 remains unqualified
for this coupled prediction; Elmer26.1 is a source-reviewed independent
cylindrical compressible/swirl candidate, not an executed validation.
