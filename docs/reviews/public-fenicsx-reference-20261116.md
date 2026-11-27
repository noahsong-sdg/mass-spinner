# Independent FEniCSx reference review

The public notebook supplies a useful tool choice but cannot be treated as a
matched experimental reference. Source tracing found unequal integrated
cathode/anode source currents and a missing cylindrical azimuthal viscous term.
Those are reasons to adapt its DOLFINx toolchain to the already verified V98
weak equations, rather than tune its physical coefficients or execute it blindly.

The [frozen protocol](../../scientific/public-fenicsx-reference/PROTOCOL.md)
defines exact geometry, source normalization, boundary conditions, equations,
mesh family, versioned tools and unchanged 5%/1e-8 screens. The new harness
compares independent DOLFINx and existing scikit-fem Q2 assemblies using physical
sample points, work and source-moment torque. It retains all meshes and failures.

**Executed in isolation:** five tests passed and all three meshes satisfy the
frozen angular-field/conservation screen. Fine angular-field change is 0.4662%,
down from 8.5263%; maximum cross-code difference is 1.621e-10 relative. The final
receipt in `scientific/public-fenicsx-reference/results/reference.json` records
current source hashes. The independent reviewer recomputed the field differences
and conservation gates from the retained arrays.

Point-contact electrode power rises 2578.52 → 2872.99 → 3157.32 W. Discrete work
conservation does not establish continuum contact voltage or Joule convergence.
Only the bounded angular-field screen passes; finite contact footprints remain
necessary before qualifying those electrical/heating observables.

This is a conditional stationary angular-system check: no meridional momentum,
energy closure, measured optical estimator, finite electrode footprint, live
model qualification or experimental accuracy claim follows from agreement.
No observations are read and no parameters are fitted. The test has useful
independence at the mesh/assembly/linear-algebra implementation level; it shares
the mathematical model, so shared physical omissions remain possible.
