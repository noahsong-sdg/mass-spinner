# v75 retained attempts

## Before the full study

The initial targeted tests exposed an environment setup error: moving Node
dependencies to a directory not named `node_modules` broke module lookup.
Dependencies were installed from the offline npm cache in safe-dev and kept at
`/work/home/v75-deps/node_modules`; the guest project uses a symlink to it.
No host installation or project execution was used.

Uniform-state assertions initially demanded bitwise zero after EOS/face-flux
roundtrips. Their residuals were below explicitly derived floating-point face
and storage bounds. Tests/checkers now distinguish these arithmetic allowances
from the unchanged physical local and refinement tolerances. No heat or mass
correction was introduced to enforce conservation.

The first diffusion-control CLI reached output serialization but failed on a
NumPy boolean. Converting the gate value to a Python boolean and adding a JSON
serialization regression fixed reporting only. `diffusion-controls-02.json` is
the rerun; no fit, equation, mesh or gate was changed.

`pilot-01.json` is a 6×6, 32-step coupled smoke test. It is not a complete
refinement study. `controls-01.json` contains the five-mesh analytical flow
controls, whose producer source was byte-compared before reuse.

## Full frozen study01

Safe-dev source snapshot:
`784d880c94090ed8bdd2b4373174df451b4ac5ddd1ef3ff5e6a7058444f78c0a`
(1633 files, 229921027 bytes).

Before execution: all 77 Python tests passed; 24 analytical flow gates,
14 analytical diffusion gates and six deliberately corrupted coupled states
passed their required controls. The study requests 20 trajectories, 4448 steps,
and 60 scheduled endpoints. Its raw pre-run hash map is authoritative for the
producer source, rather than a later checkout's contents.

The original source and its listed scientific dependencies are archived as
portable `frozen-source-01.tar.gz`, SHA-256
`f1c87f9bd0df9a8cc843ab3b3c22ff58dfba22ff34c37247f92b8ad2a399e46c`.
The archive preserves project-relative paths; extract it into an empty project
root to inspect the frozen source. It does not contain an installed dependency
environment or credentials. Runtime package versions are recorded in the raw
study and pinned requirements; package-lock identity is separately sealed.

The initial macOS packaging is retained as `frozen-source-01-macos.tar.gz`,
SHA-256 `a3e780139cf74c7159aba9ba2587e5599a972117386b9b8cf08566f0c4375aed`.
Linux extraction produced 24 extra AppleDouble `._*.py` metadata files.
`supplemental-01.json` correctly rejected this source tree. There were no
missing or changed real producer files. Re-extracting with those metadata
files excluded passed (`supplemental-02.json`); the published portable archive
omits them entirely. This fixes cross-platform packaging rather than ignoring
unrecognized files inside the source-hash checker. No producer hash was changed.

## Post-freeze review corrections

The isolated guest kept running the original copied source while host edits
prepared stricter composite temperature admission and independent checks of the
canonical initial state and every endpoint observable. These later changes
must not be substituted into study01's pre-run hashes. Their tests, supplemental
checks and any new trajectories require an explicitly separate source snapshot.

A later observer check can re-examine saved states; it cannot recreate missing
intermediate states, repair a failed convergence gate or establish experimental
accuracy. Final numeric outcomes are reported in the v75 status document.

The first new-checker test run rejected its own synthetic observations because
the independent graph returned NumPy scalars rather than JSON-native numbers.
The observation reconstruction now explicitly returns Python floats, with a
serialization regression. The same strict saved-artifact admission remains.
All 97 revised tests pass; no physical or convergence tolerance changed.

Full study01 remains unqualified: 74/615 series gates fail and the 96×96
spatial-reference check fails, despite all local audits passing. The original
negative convergence and receipt artifacts are retained. A late independent
check of all 60 endpoints passes; it explicitly does not assess convergence.
The post-review 6×6/32-step pilot passes and has bitwise-identical conserved
and solid-temperature endpoints to pilot01.

## Spatial revision v76

Before modifying transport, replayed the 48→36 linear-field restriction error:
0.0002430555555555658 m. Conservative linear remapping passes its new exactness
and conservation controls. The archived remap-only analyzer and reanalysis
retain their actual source/input hashes; they reduce the original 74 failed
series gates to 67, while the spatial reference still fails.

A smooth linear-density, constant-pressure contact with +3 m/s axial speed
reproduced a negative first-order numerical mass flux. Its regression failed
before primitive MUSCL reconstruction and passed afterward. The revised flow
passes the independent componentwise NumPy reconstruction, closed inventories,
reflection, stationary composition/rotation and analytical wave controls.

The endwall Fourier-series control isolates a developing wall-gradient error
with the same physical coefficients and timestep. At 96 axial cells the early
uniform-grid error is 22.925%; tanh grading reduces it to 0.528%. Uniform
failures are retained. Wall refinement requires transport subcycling; all
inner endpoints are checked and stored separately rather than overwriting
earlier audits. New evidence-admission regressions reject missing time,
missing inner audits, earlier failed audits and stale resume checkpoints.

One intermediate test run lacked the guest node_modules symlink after sync;
restoring the existing isolated dependency link resolved it. Another test
incorrectly treated 0.05 s as the asymptotic single-Fourier-mode limit; the
remaining higher modes were correctly nonzero. The test now uses 0.5 s. No
equation, physical coefficient or numerical tolerance was altered for it.

All 105 tests passed before the full spatial-revision run. See the v76 status
document for actual coupled convergence results; isolated controls alone
cannot qualify the coupled mixture.

Study02 finishes 21 trajectories without producer failures. Series failures
fall to 20/615: joint 0, spatial 10, temporal 0, radial 3, axial 7. Tighter
linear/thermal tolerances, smaller outer dt and transport CFL 0.15 checks pass.
The spatial reference still fails: early density-change local error 5.1217%
at the axis/endwall corner. No qualification claim was made.

The original sequential run was deliberately interrupted after 15 completed
trajectories (exit 130). Its checkpoint was exported before resuming through
three worker processes in the same 4 CPU/4 GiB VM. Physics, source hashes,
manifest and runtime remained identical; its one unsaved trajectory restarted
from t=0. The ordered local audits remain in the raw output. A serial/process
regression later verifies bitwise-equal physical endpoints. Source02 is
archived separately before changing the radial mapping again.

The remaining reference error is at the coarsened axis, not the refined outer
wall. The independent cylindrical J0 acoustic control uses exact cell-average
initial density/pressure and no current/thermal source. On the old 48-radius
mesh it gives 15.12% local density-change error; a symmetric radial tanh mesh
reduces this to 2.148%, and 96 radii to 0.464%. The actual configured-mesh
regression fails before changing the radial map and passes afterward. An
initial diagnostic invocation requested one axial cell, outside Flow's domain;
using two identical axial layers fixes the diagnostic, without a solver change.
Halving acoustic amplitude changes the normalized axis error by 8.40e-7;
halving its CFL changes it by 1.82e-7. No error threshold was altered.

The axis-and-wall revision passes 105 backend, 9 additional spatial and 61
adjacent-model Python tests, plus 15 TypeScript tests, before study03. All four
required npm checks pass. The build retains its pre-existing bundle-size
warning. Diffusion controls and all six deliberate-corruption controls pass.
The same original series and 48→96 reference requests are rerun from t=0;
expensive trajectories are scheduled first without changing their equations.

Study03 finishes all 21 trajectories with no producer failure. All six
reference/tolerance checks pass, including 48→96 spatial refinement. There
are still 21 failed coarse-series gates. A separately frozen three-trajectory
36-cell extension clears all accuracy thresholds and independently admits all
72 endpoints, but retains one failed coarse axial-velocity monotonicity gate.
Its first analysis invocation lacked controls03 in the copied guest. Regenerating
the unchanged flow control passes all 24 gates; subsequent admission reports
the actual remaining failed gate. This missing artifact is not a physics failure.
Source03, its failed extension receipt, and their inputs are preserved.

A pure-Euler initialization ablation reproduces the late axial nonmonotonicity
without current/thermal/source coupling. Integrating the SAME continuum initial
fields removes it in that 40-microsecond ablation; this does not imply that
every early coupled monotonicity gate passes. New tests first fail on midpoint initialization: on a 3×3
graded mesh total angular momentum is 79.23% too high, and the old midpoint
state is still admitted. Conservative 12-point cell quadrature fixes both.
It integrates the full kinetic energy, not the kinetic energy of averaged
velocities. Independent SciPy 16-point quadrature checks the initial state;
12→24 quadrature refinement and exact continuum inventory controls pass.

The independent comparison first rejects arithmetic-scale differences near
vanishing velocity/spin nodes on 12–96 cell grids. Argument/reduction roundoff
is absolute in the prescribed velocity scale, not relative to a vanishing
integral. A local mass-times-speed envelope at 128 epsilon admits roundoff;
a 1e-8 m/s nodal bias remains rejected. All four initialization regressions
then pass. This does not alter physical refinement thresholds.

Study04 uses the integrated initialization, retains all coarse levels and
adds the demonstrated 36-cell spatial/radial/axial samples. The exact pre-run
checks and final outcome belong to spatial-v76/EXECUTION.md; do not infer a
coupled pass from the initialization ablation or analytical controls.

The integrated-initialization study04 completed all 24 trajectories without
producer failures. Console analysis reported all finest accuracy/reference
checks passing but six early coarse velocity monotonicity failures. Its raw
and derived artifacts were then LOST: safe-dev export rejected the guest tree
at the 512 MiB cap, and the agent erroneously proceeded with source sync
without checking export success. Study04 is not available publication evidence;
its original raw hash must not be substituted by a rerun or reconstructed data.
The model source remained saved on the host. This was an execution mistake,
not a solver failure. Study05 reruns the unchanged physical source from t=0.

The worker runner now requires a new backup path in persistent guest /work/home.
It atomically writes that checkpoint BEFORE updating /work/project and checks
byte equality. Regressions simulate deletion of the project copy and failure
of its write; the retained checkpoint survives both. Ephemeral/existing backup
paths and changed source fail closed. Checks, controls, the metric plan and
scientific source are also copied and hash-checked outside the replaceable
source directory before study05 starts. Final export will stage only selected
artifacts after preserving the complete guest project outside that directory.

A separate reference-grid field metric addresses coarse projection masking.
An unresolved two-period sine wave has nearly zero coarse-cell-average
discrepancy but represented-field RMS >0.70 on the reference grid. The original
cell-average norm is valid for its question; its failure verdict is retained.
The added metric counts subcell representation error with the SAME numerical
limits and every existing sample/gate. It is not a relaxed monotonicity gate.
The common-space plan and analyzer hashes are sealed in study05 BEFORE any
trajectory runs. No all-field common-space result was used to choose this plan.

New metric tests first exposed an incorrect use of the scalar/dictionary
finite checker on a list. NumPy finite-array checking fixes the validation;
another assertion incorrectly expected 615 gates in a synthetic fixture with
only three observables, instead of the actual study's fourteen. Coverage now
compares the exact legacy gate set. These test/reporting corrections do not
change physical thresholds or producer equations. All five metric and three
persistent-checkpoint regressions pass before the rerun.

Rerun05 finishes all 24 trajectories (5472 outer steps, 72 endpoints) with no
producer failures. The original cell-average analysis remains false on six
early coarse axial-velocity monotonicity gates; every finest accuracy gate
and all six references pass. The separately planned common-space analysis
passes all 615 gates and six references. Its receipt independently admits
every trajectory and endpoint while retaining the original negative verdict.
The source/model is not changed after this result, and no limit is relaxed.

The full guest source/results are preserved outside the export root. A bounded
21-file export succeeds; its indexed hashes are checked before host copying.
Raw05 SHA is 8e951889c880d477afc81d474a8fd327908ce57eba24ad4c4fe339ae7d5c687d.
The exact source archive, both verdicts, raw gzip, controls and check receipts
are retained. Neither this numerical pass nor its endpoint admission upgrades
experimental accuracy or the public playground's qualification.
