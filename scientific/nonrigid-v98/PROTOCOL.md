# Non-rigid argon continuation

Freeze 13 November 2026, before V98 predictions. V97 rejected rigid rotation;
this is research, not a change to the qualified live equations.

Reuse Foundation OpenFOAM 14, V96 rotational cyclic/leastSquares geometry and
V84 prescribed-current charge/torsional-flow equations. Never fit current,
velocity, conductivity or drag to the benchmark. Keep measured 100 A per opposed
branch and 0.13 T; R=0.06 m, half-length=0.24 m, cathode source-theory ring
r=0.004 m. Retain both anode-center interpretations 0.07/0.08 m. The 1 Torr
behind-cathode fill is not a measured local discharge density. The 4 mm aperture
is not a measured emission footprint. Ideal rings cannot qualify contact voltage
or heating. Homogeneous viscosity 1.14e-4 Pa s at the paper's mean 2900 K is a
documented conditional approximation, not a thermal solution. Retain all four
V84 independently sourced transport alternatives; no velocity-selected winner.

First isolate the V96 small-step requirement on the unchanged 16x32 rigid
control, 256 steps over 20 microseconds. Baseline is segregated smoothSolver U,
PCG/DIC pressure. Change one algebraic choice at a time: vector-coupled U using
native PBiCCCG/DILU, pressure PCG/diagonal, and pressure GAMG/GaussSeidel.
No tolerance relaxation, native library changes, added physical damping or
discarded failed cases. Preserve field-specific solver records, intermediate
iteration caps, last pressure correction residuals, continuity, native/source
hashes and all raw fields. A successful executable exit is not qualification.
Pressure intermediate caps must be distinguished from final correction failure.
All rigid frames require max deviatoric strain/Omega, swirl change/amplitude
and meridional velocity/amplitude below the existing 1e-6 gates.

Any candidate must then pass the same rigid spatial and Bessel decay tests
before apparatus use. Candidate selection is diagnostic; passing a control
does not validate coupled thermodynamics, electrodes or experimental accuracy.
For the steady apparatus family, reuse V84 primary and independent u-coordinate
assemblies, SciPy sparse direct solvers, and retain optical measurement operators
separately. Torsional balance alone does not establish radial/axial momentum or
energy closure (V85 already exposed pressure incompatibility).

Independent reference: scikit-fem 12 Q2 quadrilateral weak assembly and SciPy
sparse direct solution, symmetric Joule/viscous work-adjoint blocks. Minimize
half the discrete dissipation minus the prescribed electrical load. The ring
point functional is not a bounded H1 continuum load: finite-energy contact
voltage/Joule limits are not claimed. Compare off-contact velocity, uniform
midplane Doppler centroids and viscous work separately. Exact Q2 corotation
nullspace, independently integrated manufactured shear, source second-moment
torque, current/field reversals, B=0, gauge and passivity controls precede runs.
Use nested 16n by24n element meshes (radial split2n/14n at aperture; axial
split8n/16n at anode), n=1,2,4, quadrature order6. Keep all four V85 source
transports and both anode centers, fixed historical viscosity. Gate charge,
free momentum/linear, work and torque residuals at1e-8; common physical local
and uniform-emissivity chord profile changes at5%, with contraction, and
finest FEM versus retained V85 FV(n8) chords at5%. No contact-power convergence
gate and no measured-velocity fitting. Sampling uses161 radial by121 axial
points; centroid integral uses256-point Gauss quadrature. This optical proxy
cannot replace the unresolved experimental Fabry-Perot/emissivity operator.

Before completing the initial campaign, add5% and contraction gates for viscous
work and common-grid angular fields, keeping all outputs. The first snapshot
passed exact controls and completed n1/n2 of the first scenario; its process
ended before producing n4. Bulk element-finding allocates points-by-elements
temporaries, so sample in128-point batches instead of one large query. This
changes memory use, not equations, mesh, quadrature or observation coordinates;
test batched against direct sampling. Retain that incomplete snapshot. Raw
native GAMG diagnostic was manually stopped after245s with diverging residuals,
not counted as a successful run. No solver variant passed the rigid gate.

Sources: Wijnakker & Granneman (1979), DOI 10.1051/jphyscol:19797236;
Wijnakker et al. (1979), DOI 10.1515/zna-1979-0602; retained V84/V85 source
reviews. Native vector coupling: OpenFOAM-14 fvMatrixSolve.C and Foundation
release documentation https://openfoam.org/release/2-2-0/matrix-solvers/.
