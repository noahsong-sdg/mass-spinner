# Graded endwall reference

This continues [V92](WALL-TRANSIENT-V92.md). It is a neutral-argon numerical
reference, with the same coupled momentum, stress work and energy equations.
It does not validate a measured plasma apparatus or change the live simulator.

## Problem and change

V92 passed its finest-grid timestep tests but failed early/local spatial
checks. At 5 microseconds, sqrt(nu*t) occupied less than one axial cell on
the finest uniform grid. In plain terms, the cells were wider than the thin
region where the wall rapidly changes the flow. Agreement between two codes
on that grid could still share the same resolution error.

The existing finite-volume Flow and scikit-fem Diffusion operators already
accept graded coordinates. The remaining obstacle was the reference adapter:
it generated uniform axial cells and identified native cells by uniform-grid
division. The small opt-in change adds the fixed exponential map
z(s)=H*(1-exp(-4s))/(1-exp(-4)) to the native mesh and custom geometry, and
maps native centres using the actual cell edges. Native extraction from the
stored uniform case and rerun custom uniform evolution remain bitwise
unchanged. New graded predictions are run in both solvers.

The expansion ratio follows the Foundation OpenFOAM 14
[blockMesh convention](https://doc.cfd.direct/openfoam/user-guide-v14/blockmesh):
last-cell width divided by first-cell width. For N=2n cells it is
exp(-4*(N-1)/N). Using exp(-4) directly would subtly change the coordinate map
on refinement and break exact nesting. Native centre and per-cell-volume
checks verify the actual mesh, including the retained finite-wedge correction.

This targets the axial wall layer at lower cost than refining every cell
uniformly. It also coarsens the bulk axial mesh; that tradeoff must pass the
same global and local tests. The mesh strength is fixed before predictions;
neither physical coefficients nor comparison thresholds are adjusted.

## Registered study

The [protocol](scientific/graded-endwall-v93/PROTOCOL.md) was published in
commit `24e24c1` before the new coupled trajectories. The campaign has exactly
five native/custom pairs: n=16/32/64 at 2048 steps, plus n=64 at 1024 and
4096 steps. Radial cells stay uniform; axial cells are nested and graded.
The existing acoustic CFL check remains active during evolution.

Score density, temperature, swirl and two-component meridional flow at
5/10/20 microseconds, both whole states and response increments. Sum
integrated conserved fields before recovering common-grid primitives. Local
norms use the same physical H-4sqrt(nu*t)<z<H band as V92 and exact fractional
cell-volume overlaps. Keep 5% spatial/cross-code and 2% temporal limits, strict
contraction, and the previous mass, energy and native wall-angular budgets.
Fixed-coarse projection diagnostics cannot override admission failures.

## Results

| Admission set | Passed | Failed |
|---|---:|---:|
| Global spatial, all saved clocks | 142 | 2 |
| Wall-local spatial, all saved clocks | 140 | 4 |
| Global temporal | 96 | 0 |
| Wall-local temporal | 96 | 0 |
| Mass, energy and native wall-angular budgets | 25 | 0 |

All five native/custom pairs completed. Every spatial contraction check
passes; the largest ratio is 0.99069. All whole-state spatial checks pass.
These overlapping gates are not independent experiments. The scorer correctly
exits **1** and retains numerical, experimental and live qualification false.

At 5 microseconds the local meridional 32→64 change is **0.750% native,
0.939% custom**. V92 reported 7.455%/7.404% on its uniform 64→128 pair.
The meshes and timestep settings differ, so this is not a matched estimate
of the isolated grading effect. The new study nevertheless passes every
meridional gate; both timestep studies meet their declared temporal limits.
The separate radial/axial diagnostics at this clock are 0.748%/2.432% native
and 0.936%/3.383% custom. These component diagnostics are not new admission sets.

The finest endwall cell is 0.14214 mm; sqrt(nu*t) spans about 5.31 such cell
widths at 5 microseconds, versus 0.81 on V92's finest uniform mesh. Initial
CFL margins exceed one in every case, and the existing evolving-state CFL
guard never rejects a step. The largest fine temporal change is 0.0941%
(native local density increment at 5 microseconds), below 2%.

All six failures concern **swirl response increments**. Native spatial
changes are 10.450%/5.120% globally at 5/10 microseconds and
14.705%/9.721%/5.557% locally at 5/10/20 microseconds. Native/custom local
disagreement is 6.567% at 5 microseconds. For scale, the worst local native
spatial error is **0.000602 m/s**, compared with a 0.004093 m/s swirl change;
the local cross-code error is 0.000264 m/s. Small absolute errors still fail
the unchanged response-relative requirement.

This supports the axial-resolution explanation for meridional flow, but does
not identify a unique cause of the remaining native swirl error. Initial
global swirl sampling differences are 0.0863 m/s native and 0.0890 m/s custom
on the fine spatial pair; they contract and are subtracted in the response
norm, but can still affect subsequent evolution. An early-time analytic swirl
control and separate radial/axial refinement are the next discriminating
tests, including native point-velocity versus integrated-inertia conventions.
No new grid, coefficient or normalization was tried after seeing these failures.

The old V90-92 failures remain evidence about their own discretizations.
Any new campaign pass concerns these equations, conditions, norms and saved
clocks. It does not establish a dense-time error bound, earlier startup
accuracy, optical-measurement agreement or experimental fidelity.

## Verification and provenance

The pre-change regression snapshot reproduced five missing-support errors;
its 40 remaining controls passed. The corrected immutable source02 snapshot
passed all 51 controls. These include native mesh centres/volumes, nesting,
graded primitive/norm recovery, initial CFL limits for every declared case,
stale uniform metadata rejection, and exact legacy native/custom replays.
The Flow and Diffusion physical operators and native installation are unchanged.

All project execution ran offline in safe-dev. The scientific copy was
`/work/project/v93-graded-source02`; complete source/reference maps are recorded
in every execution receipt. The same nine native source/binary/library hashes
as V92 were verified before and after predictions. Python 3.11.2, NumPy 2.4.6,
SciPy 1.17.1 and scikit-fem 12.0.2 were reused without upgrades. Supplemental
initial-sampling/component diagnostics were added during execution and cannot
alter admission. Both failed source01 and successful source02 controls survive.

Final application checks on the separately authenticated 2666-file copy passed:
`npm test` (1238/1238), `npm run typecheck`, `npm run build`,
`npm run check:site`, `npm run check:assets`. Its source-tree SHA-256 remains
`ccfc2619fbc2509e31034c4b9a86535a5d8e623f7f68a3c6f8510023fba1ab7c`.
These are application/build checks; no deployed browser verification is claimed.

## Evidence

- [Study and scoring sources](scientific/graded-endwall-v93/README.md),
  [registered protocol](scientific/graded-endwall-v93/PROTOCOL.md),
  [all admission details](scientific/graded-endwall-v93/evidence/v93-graded-source02/scientific/graded-endwall-v93/score-results/audit.json).
- [Predictions and native identity](scientific/graded-endwall-v93/evidence/v93-graded-source02/scientific/graded-endwall-v93/study-results/predictions.json),
  [51 controls](scientific/graded-endwall-v93/evidence/v93-graded-source02/scientific/graded-endwall-v93/tests-results/controls.json),
  [diagnostics](scientific/graded-endwall-v93/diagnostics.json),
  [application receipt](scientific/graded-endwall-v93/app-final/execution.json).
- [Full immutable sources, dictionaries, raw native fields and packets](scientific/graded-endwall-v93/evidence.tar.gz):
  30,794,344 bytes, SHA-256
  `062d82529f4240abffdfae9dbdd23f04622da0ead98eed010225a62d972c5515`.
  The [export receipt](scientific/graded-endwall-v93/export.json) records rehash
  verification of all 318 archive members. Historical source-bound replay
  requires its archived snapshot or recorded Git revision.
