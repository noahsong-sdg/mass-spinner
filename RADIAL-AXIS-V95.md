# Directional swirl resolution and rigid-rotation stress

Independent refinement locates the dominant native early swirl error in the
radial direction. Existing least-squares reconstruction improves the analytic
response, but neither tested scheme preserves strict zero strain near the axis
under rigid rotation. This follows [V94](SWIRL-CONTROL-V94.md); it is a neutral
fluid numerical diagnostic, not an experimental-accuracy claim.

## Adapter limitation and fix

The reference path was `make_control` → `make_case` → `geometry`, followed by
native extraction or custom Diffusion evolution. Each stage assumed nz=2nr;
grading, field lengths and output shapes inherited that assumption. Thus the
earlier refined result could not distinguish radial from axial resolution.
In plain terms, both mesh directions changed whenever we requested more cells.

The fix threads optional `axialCells` through the existing geometry, native
mesh/input builder and extractors. Geometry supplies the actual cell count and
shape; native mapping uses the existing verified cell-edge search when explicit
dimensions are supplied. Defaults retain nz=2nr, old coordinates, grading and
inputs. Positive integer counts are a mesh invariant; booleans and nonintegral
or nonpositive values are rejected. Physical operators and coefficients are
unchanged. This small opt-in extension keeps one adapter for the same apparatus;
duplicating its geometry or altering the physics would not isolate the error.

## Registered comparisons

The [protocol](scientific/radial-axis-v95/PROTOCOL.md) was published at `f894781`
before the new predictions. Five native/custom pairs hold either axial or
radial coordinates fixed: nr=32/64/128 with nz=128, and nz=64/128/256 with
nr=64, sharing the middle case. All use 256 steps, the same grade 4,
half-angle 0.5 degrees, coefficients and analytic mode as V94.

The two finest directional cases have separate 5% whole/response analytic
checks at 5/10/20 microseconds, globally and in the same physical upper-wall
band. Directional contraction is reported diagnostically: error from the fixed
other coordinate can impose a floor. There is no new joint/timestep convergence
certificate. Custom mass/energy and native weak-meridional-flow checks remain.

Four native rigid-rotation controls use U=Omega*(-y,x,0), analytic zero strain,
and continuum centrifugal pressure. The native rotating-wall condition supplies
co-rotating face velocities; no `value` overrides its constructor evaluation.
The source and installed library were checked. The native
[gradient function](https://cpp.openfoam.org/v14/grad_8H_source.html) supplies
grad(U) initially and at each saved clock. Symmetric deviatoric strain/Omega,
swirl change/A and meridional/A each have a predeclared 1e-6 diagnostic bound.
Strain exactness is not alone a proof of the full stress-divergence nullspace.

The existing native leastSquares gradient is tested once for rigid rotation
and once for Bessel decay at nr64/nz128. This is a registered reconstruction
counterfactual; the default Gauss linear gradient remains unchanged. In the
[native Gauss implementation](https://cpp.openfoam.org/v14/gaussGrad_8C_source.html),
interpolated face fields enter a surface sum divided by volume. Boundary traces
and collapsed-axis geometry can therefore matter even when bulk cells look
accurate. The counterfactual tests that possibility without fitting drag.

## Results

All ten native and five custom trajectories completed. Global response errors
at 5 microseconds are:

| Directional comparison | Meshes | Native error | Custom error |
|---|---|---|---|
| Radius only, fixed nz128 | nr32 / 64 / 128 | 18.9441 / 6.7539 / 2.2156% | 0.4955 / 0.3851 / 0.3771% |
| Axial only, fixed nr64 | nz64 / 128 / 256 | 6.7539 / 6.7539 / 6.7539% | 1.4895 / 0.3851 / 0.1283% |
| Native leastSquares, nr64/nz128 | Same base grid | 2.3281% | Not rerun |

Native radial error contracts with ratios 0.3565 and 0.3280. Axial-only native
changes are negligible and do not contract: the ratios are slightly above one.
Custom global error is predominantly axial at these resolutions. Thus a single
shared refinement prescription would misattribute the two methods' error floors.
Local norms support the same native radial finding; every finest radial analytic
check passes, while the finest axial case retains the two early native failures.
The shared nr64/nz128 base packet is bitwise identical to V94 in both methods,
including native sample coordinates.

| Predeclared diagnostic set | Passed | Failed |
|---|---:|---:|
| Finest radial analytic accuracy | 24 | 0 |
| Finest axial analytic accuracy | 22 | 2 |
| Native least-squares analytic accuracy | 12 | 0 |
| Rigid-rotation zero strain / unchanged swirl / meridional flow | 8 | 28 |
| Custom mass and energy | 10 | 0 |
| Native weak meridional flow | 10 | 0 |

The scorer correctly exits **1**, keeping `diagnosticPass=false`. Failed gates
are retained, not reclassified by the passing reconstruction comparison.

Rigid rotation exposes a more specific inconsistency before any evolution:
Gauss linear gives max symmetric deviatoric strain/Omega **0.47133** in the
first radial cell, essentially unchanged across nr16/32/64. Analytically this
strain is exactly zero. Least squares reduces the nr64 initial maximum to
**0.008067**, also at the axis, but does not reach the fixed 1e-6 bound.
At 20 microseconds, maximum swirl change/A is 0.0020611 for Gauss and
0.000057263 for least squares. Both still fail the 1e-6 invariance requirement;
all rigid meridional checks pass. A passing whole-domain decay norm can coexist
with a persistent pointwise defect in the shrinking first cell.

Verified: the discrete gradient/boundary representation on this collapsed
wedge does not preserve the rigid-rotation strain nullspace. That initial
gradient defect cannot be caused by later timestep evolution or the pressure
solve. The reconstruction counterfactual demonstrates sensitivity to the
gradient choice, without uniquely separating wedge traces, centre/face geometry
and stress-divergence consistency. It is not evidence that every OpenFOAM mesh
or solver has this defect, or that all coupled V93 errors share one cause.

The next correction should target near-axis reconstruction and its native
boundary traces, with rigid rotation as a regression and Bessel decay as a
separate check. A pointwise-consistent operator must then be tested in the
coupled compressible release, with temporal, spatial and energy/torque gates.
The single least-squares counterfactual has no independent time/grid certificate
and is not adopted as the default. No coefficients, gates or live model changed.

## Controls and execution

The pre-change snapshot reproduced five unsupported-argument errors, with
61 controls passing. After the adapter extension, all 66 controls passed.
The final immutable snapshot `/work/project/v95-axis-source03` passed all
70 controls, including native rectangular centres/volumes, exact nesting,
old input identity and deterministic replays, stale-square-packet rejection,
zero-strain algebra, native moving-wall initialization and analytic norms.
The original failing snapshot and the intermediate corrected snapshot survive.

Scientific computation ran offline in safe-dev. Ten native source/binary
identities were checked before/after trajectories. Python 3.11.2, NumPy 2.4.6,
SciPy 1.17.1 and scikit-fem 12.0.2 were reused without installation changes.
This is a single-agent implementation/review, with no new independent agent audit.

Final application verification used the unchanged 2,666-file snapshot with tree
SHA256 `ccfc2619fbc2509e31034c4b9a86535a5d8e623f7f68a3c6f8510023fba1ab7c`.
`npm test` passed **1,238/1,238**; `npm run typecheck`, `npm run build`,
`npm run check:site` and `npm run check:assets` each exited 0, offline in
safe-dev. Build retains its existing chunk-size warning. This was a numerical
reference change; no deployed browser or experimental verification was performed.

## Evidence and replay

The original single export hit the existing 512 MiB raw-content boundary.
Its failed receipt, stderr and controller are retained under
[`export-failure01`](scientific/radial-axis-v95/export-failure01/receipt.json).
The corrected controller partitions the same inventory into bounded **80 MiB**
transfers, without raising the limit or deleting intermediate fields. Seven
partition controls passed inside safe-dev. All **1,570 files**, totaling
**1,114,519,775 raw bytes**, were rehashed in the guest and after transfer.
Fourteen compressed archive parts preserve the frozen sources, native cases,
intermediate gradients and failed/corrected test snapshots.

Raw archives are [GitHub release assets](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v95-scientific-evidence)
to avoid adding about 417 MB to every repository clone. Download all fourteen
parts; verify each against the [export receipt](scientific/radial-axis-v95/export.json),
then verify extracted members against the
[complete inventory](scientific/radial-axis-v95/evidence/ARCHIVE-MANIFEST.json).
Each part also carries its own manifest. Replay requires the recorded native
stack; historical source-admission checks must use the archived source snapshot.

Compact evidence remains in Git:

- [Final scientific source and test receipt](scientific/radial-axis-v95/v95-axis-source03-tests.json)
- [Predictions](scientific/radial-axis-v95/evidence/v95-axis-source03/scientific/radial-axis-v95/study-results/predictions.json)
- [Fixed-gate audit, including all failures](scientific/radial-axis-v95/evidence/v95-axis-source03/scientific/radial-axis-v95/score-results/audit.json)
- [Directional ratios and historical replay comparison](scientific/radial-axis-v95/diagnostics.json)
- [Export regression receipt](scientific/radial-axis-v95/export-controls.json)
- [Application checks](scientific/radial-axis-v95/app-final/execution.json)
- [Published release and verified server asset digests](scientific/radial-axis-v95/publication.json)

Review checked the changed mesh generation, native mapping, custom geometry and
scoring paths against the controls above. Legacy inputs and base packets retain
exact identity; stale packet shapes fail admission. Archive members are restricted
to regular files and relative paths and checked against their declared hashes.
The outstanding correctness gap is the rigid-rotation nullspace failure and the
unqualified coupled reference. Passing adapter/application checks does not close it.
