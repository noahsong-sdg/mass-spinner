# V95: separate radial/axial error and rigid-rotation stress

Prospective follow-up to V94, registered before these predictions. Retain V93
and V94 failures and all existing physical coefficients and acceptance limits.
No experimental or live-playground qualification is implied.

The adapter currently forces nz=2nr. Add optional axialCells to the existing
geometry, mesh and extraction helpers, preserving the default exactly. Do not
replace Flow, scikit-fem Diffusion or native OpenFOAM operators. Verify the old
default geometry, generated native inputs and stored native extraction, and
rerun the old deterministic custom control. Reject invalid cell counts.

## Analytic decay

Same V94 mode, amplitude, material constants, boundary conditions, grade 4,
half-angle 0.5 degrees, 20 microsecond horizon and 0/5/10/20 reporting clocks.
Five native/custom pairs, all at 256 steps:

- nr32/nz128, nr64/nz128, nr128/nz128: radial sweep at fixed axial coordinates.
- nr64/nz64, nr64/nz128, nr64/nz256: axial sweep at fixed radial coordinates.

The shared case is run once. Compare whole and response point fields to the
analytic mode using actual cylindrical volumes and the original upper-wall
physical band with partial-cell overlap. Report analytic errors and directional
contraction diagnostically: the fixed other direction can impose an error floor,
so contraction in both directions is not an admission requirement. Fixed 5%
analytic checks apply separately to the two finest directional cases. Custom
mass drift <1e-8, total-energy drift <1e-6; native saved-clock meridional/A <1e-4.
This is a fixed-step spatial study, not a new joint/time convergence certificate.

## Rigid rotation and existing reconstruction counterfactual

Native-only rigid rotation U=(-Omega*y,Omega*x,0), Omega=A/R, same cylinder,
with both solid walls co-rotating (native rotatingWallVelocity, no supplied
value so the constructor evaluates physical face velocities). Lower symmetry
and wedge patches are unchanged. Initial kinematic p=Omega²r²/2 balances
centrifugal acceleration in the continuum. Run nr16/nz32, nr32/nz64,
nr64/nz128 at 256 steps using the existing Gauss linear gradient, plus
nr64/nz128 with the existing OpenFOAM leastSquares gradient.

At t=0 and the three saved positive clocks, native grad(U) gives the symmetric
deviatoric strain, analytically zero. Report max and volume-RMS strain/Omega,
including the first radial cell. Fixed zero-strain diagnostic threshold 1e-6.
Also report swirl change/A and meridional/A, each with fixed 1e-6 bounds.
This probes both gradient exactness and time evolution; it is not by itself a
certificate for the complete native stress-divergence operator.

Run one extra native-only nr64/nz128 Bessel decay with leastSquares to test
whether that reconstruction changes the known error. Compare to the same exact
mode and fixed 5% limits. It is an explicitly declared counterfactual, not a new
default. No scheme or coefficient search after outcomes; further candidates
need a new protocol. Keep failed gates in the report.

## Evidence and controls

Freeze sources, prior result references, native module/utility identities,
inputs and versions; rehash after execution. Reject partial campaigns, malformed
shapes/clocks, nonfinite fields, bad initial samples and changed packet hashes.
Export raw cases and an inventory, with reproducible immutable guest snapshots.
Add rectangular mesh/volume/nesting/default-identity regressions, verify stale
square-grid metadata rejection, run retained controls, then application test,
typecheck, build, site and asset checks. All computation stays offline in safe-dev.
