# Spatial revision execution

All project execution is offline in the Apple container VM through:

```
/Users/noahs/.local/bin/safe-dev -C /private/tmp/mass-spinner-public-20261110 run -- COMMAND
```

Guest source is a copy, never a host mount. Python is
`/work/home/diagnostic-v72-venv/bin/python`; dependencies are FiPy 4.0.3,
NumPy 2.4.6, SciPy 1.17.1, Matplotlib 3.11.2 and Node 22.23.4.
Existing guest-only Node dependencies are linked from
`/work/home/v75-deps/node_modules` after every sync.

## Remap and wall-only mesh

The linear restriction, smooth contact and actual acoustic controls reproduce
their defects before the corresponding fixes. The initial v76 snapshot is
`388744586d65ed768f4725ae26e15580ad8e20ef96948b8eb81baa72e3b1deef`
(1651 files, 263449115 bytes). All 105 tests pass before production (14.378 s).

```
python scientific/mixture-axial-v75/run.py --output scientific/mixture-axial-v75/study-02.json
python scientific/spatial-v76/parallel_study.py --output scientific/mixture-axial-v75/study-02.json --workers 3
python scientific/mixture-axial-v75/analyze.py scientific/mixture-axial-v75/study-02.json scientific/mixture-axial-v75/convergence-02.json
python scientific/spatial-v76/diagnostics.py scientific/mixture-axial-v75/study-02.json scientific/mixture-axial-v75/convergence-02.json scientific/spatial-v76/diagnostics-02.json
```

The sequential producer was deliberately interrupted with SIGINT after 15
completed trajectories (exit 130); its checkpoint was exported before the
identical-source worker resume. One unfinished trajectory restarted from t=0.
The raw output binds the runner SHA, prior checkpoint SHA and pending cases.
All 21 trajectories finish, with no producer failures. Analysis exits **1**:
20/615 series gates and the spatial reference fail. Diagnostics exit zero;
they are post-processing, not qualification. Raw02 and its full source tree
were exported before any physical-source replacement.

`frozen-source-02.tar.gz` SHA-256 is
`3d9199a7fd5ecd155c702f245623b1077b02834133193a965d9c9c1a609d9689`.
It contains 206 source files and a `source-index.json` with sealed/extra source
hashes, raw input digest and runtime. The archive is portable, without
AppleDouble files. It preserves the exact failed physics source independently
of the later axis-grid fix.

## Axis-and-wall mesh

Snapshot `11d25d220353865f1c065913e33165956a6ddd9fed84565463800b0fc25ca12f`:
1664 files, 315131845 bytes. `checks-03.json` records every exact subprocess
argument vector, exit code, elapsed time, stdout/stderr and the unchanged
scientific source map. Results:

- v75 Python tests: 105 pass, 13.590 s.
- Additional spatial tests: 9 pass, 12.217 s.
- Adjacent v74 tests: 61 pass, 32.298 s.
- Relevant TypeScript tests: 15 pass.
- `npm run typecheck`, `build`, `check:site`, `check:assets`: all exit zero.
  Build retains the existing bundle-size warning. Site parsing is not browser
  verification, and asset parsing is not visual verification.
- `diffusion_controls.py --output scientific/mixture-axial-v75/diffusion-controls-03.json`:
  all 14 analytical/conservation gates pass.
- `audit.py --output scientific/mixture-axial-v75/audit-03.json`:
  the actual positive step and all six deliberate-corruption controls pass.
- `radial_control.py scientific/spatial-v76/radial-control-03.json`:
  six mesh runs plus amplitude/timestep controls finish. Halving amplitude
  changes normalized axis error by 8.40e-7; halving CFL changes it by 1.82e-7.

The actual reference-mesh acoustic regression first failed on the old map
(0.1512053 > 0.05). It passes on the symmetric map; no test limit was changed.
The first acoustic diagnostic used one axial cell and was rejected by Flow's
two-cell domain requirement; it now uses two identical layers.

```
python scientific/mixture-axial-v75/run.py --output scientific/mixture-axial-v75/study-03.json --only 6:6:32
python scientific/spatial-v76/parallel_study.py --output scientific/mixture-axial-v75/study-03.json --workers 3
```

The 6×6 pilot finishes all 32 steps. The worker queue schedules the largest
remaining trajectories first; a serial/worker regression gives bitwise-equal
physical endpoints. Every checkpoint rechecks exact scientific source hashes.
All 21 trajectories finish without producer failure. Standard analysis fails
21 series gates; all six reference/tolerance checks pass. The versioned
36-cell extension adds three trajectories, admits all 72 endpoints and leaves
one failed coarse-axial monotonicity gate. Its first analysis lacked the flow
control artifact in the copied guest; regenerating the unchanged flow control
passes all 24 gates, after which extension admission completes and reports
the actual remaining failed gate. No physics/gate was changed for that omission.

Source03 archive SHA-256:
`33f5016aaffdb9218fa0bda24f4ccc8b82e49467014afb7e0799697d036edd50`.
The 207-file archive includes its source index and exact extension plan/runner.

## Conservative initial projection

`initial_probe.py scientific/spatial-v76/initial-probe-03.json` runs ten
pure-hydro trajectories, isolating midpoint versus exact cell integration of
the same continuum fields. The midpoint sequence reproduces the coarse axial
nonmonotonicity; the integrated sequence decreases. It is an ablation, not a
canonical coupled trajectory or qualification. Replay with the archived
source03, not a later initializer. `initial-ablation-source-03.tar.gz` includes
the exact probe and its imported source, SHA-256
`53f54d38ac842f990961e15e2408c488ef6e371a9273bb691f982c4124a5204e`.

An intermediate progress message mislabeled the probe's normalized RMS errors
as m/s. The artifact explicitly records both, plus the reference scale; the
status report now uses percentages. Old absolute RMS is 0.03147→0.04026 m/s
on 6→12 cells; integrated initialization gives 0.05552→0.05118 m/s. No
numerical result, solver or threshold changed for this reporting correction.

Two continuum-inventory/stale-state regressions first fail on midpoint
initialization. After conservative integration, the independent 16-point check
exposes relative-roundoff comparisons near vanishing trigonometric velocity
nodes on 12–96 cell grids. Their absolute errors are at arithmetic scale, not
the physical scale; the checker now uses a componentwise local mass/speed
envelope at 128 epsilon. A deliberately added 1e-8 m/s nodal bias is still
rejected. All four projection regressions pass (0.027 s).

Final copied snapshot:
`c037d94d9d397c311440172677a97006fdedafd775d66e0541b154ab6e1cea69`
(1681 files, 376224216 bytes). `checks.py` records exact commands, stdout/stderr,
exit codes and unchanged scientific hashes. Study04 finished, but its export
failed safe-dev's 512 MiB content cap. I then mistakenly synced the source
before verifying a successful export. Its only raw/derived outputs, check
receipt and source archive were lost. They are unavailable for audit and are
not published. The observed study04 values are not used as available evidence.

## Persistent-checkpoint rerun05

The tested/produced copy is safe-dev snapshot
`79e48646cf411738da009248a514f25058504a1653bb9f77009a3d998ca2e010`
(1686 files, 376246971 bytes), on volume `safe-dev-0b0443eadcbe4bd8`.
The complete canonical source map in raw05 and plan06 is authoritative;
later host documentation edits are outside this copy.

The physical producer and manifest remain byte-identical to study04. The
orchestrator now requires a new backup path in persistent **guest** `/work/home`,
outside replaceable `/work/project`. Every checkpoint serializes once, atomically
writes that backup first, writes the project copy second, and verifies byte
equality. Three regressions cover source-copy loss, a failed project write,
stale source and invalid/existing backup locations. Before running, small
source/control/plan/check artifacts were separately copied and hash-verified
under `/work/home/mass-spinner-v76-proof05`. No host directory is mounted.

Before the first rerun05 trajectory, `common-plan-06.json` froze all nine fields,
unchanged thresholds, the complete producer source map and analyzer SHA. Its
SHA and analyzer SHA are stored in the raw study. No all-field real-data
common-space outcome was inspected before this plan. A preceding velocity-only
diagnostic motivated it; synthetic cancellation and exact-linear tests check
the implementation. The previous cell-average verdict is retained explicitly.

```
python scientific/spatial-v76/checks.py scientific/spatial-v76/checks-05.json
python scientific/spatial-v76/parallel_study.py --output scientific/mixture-axial-v75/study-05.json --workers 3 --backup /work/home/mass-spinner-v76-study05.json
python scientific/mixture-axial-v75/analyze.py scientific/mixture-axial-v75/study-05.json scientific/mixture-axial-v75/convergence-05.json
python scientific/spatial-v76/common_space.py --raw scientific/mixture-axial-v75/study-05.json --plan scientific/spatial-v76/common-plan-06.json --controls scientific/mixture-axial-v75/controls-05.json --diffusion-controls scientific/mixture-axial-v75/diffusion-controls-05.json --audit scientific/mixture-axial-v75/audit-05.json --output scientific/spatial-v76/convergence-06.json --receipt scientific/spatial-v76/receipt-06.json
```

The first two commands are production steps, not a replay command to run over
existing output files. The older study02/03 runner commands above refer to
their archived runner, which predates the required backup flag.

`checks-05.json` binds the canonical source and every additional Python tool.
All eleven commands pass: 109 v75 tests, 17 spatial tests, 61 adjacent v74 tests,
15 TypeScript tests, `npm run typecheck`, `build`, `check:site`, `check:assets`,
24 flow gates, 14 diffusion gates and the positive/six negative corruption
controls. The build retains the existing bundle-size warning. No browser,
experimental or public-playground qualification is claimed.

The bounded-export procedure preserves the entire guest project in a new
persistent guest directory first, copies only explicitly selected evidence
into an empty export root, verifies hashes, and checks the export exit status
before copying results back. Neither the raw checkpoint nor full project
backup is deleted. No source replacement may follow an unverified export.

Rerun05 starts at 20:27:18 UTC and finishes at 20:54:17 UTC on 2026-11-11.
All 24 trajectories, 5472 outer steps and 72 endpoints finish without producer
failures. Original analysis and admission exit **1**, correctly retaining six
coarse velocity monotonicity failures. Common-space analysis/admission exits
**0**: 615/615 series gates and all six references pass. The diagnostics and
original-metric plot exit zero. `analysis-execution-05.json` preserves all five
exact command vectors, outputs, timings and exit codes. The original negative
receipt is not replaced by the common-space receipt.

`frozen-source-05.tar.gz` SHA-256:
`9ed42d01e5888215d778dbb2979bc31efa322c99c5d4d62b6278693dba87f171`.
Every indexed member is checked against its digest after archive creation.
Raw05 SHA-256:
`8e951889c880d477afc81d474a8fd327908ce57eba24ad4c4fe339ae7d5c687d`.
Plan06 SHA-256:
`afec183c1af82d629eb77ad483c4005caa43fd49004e823fad05a1f4cb2b1c2d`.
The common-space analyzer is sealed before production at
`2b6bb1700fb64920e046446607bd56bf8a3888b24ffc25ef853a53d6faeaa3c8`.

The full guest tree is retained under `/work/home/mass-spinner-v76-full05`;
the separately updated raw checkpoint and pre-run proof directory are also
retained. Moving children rather than the root directory requires no privilege
change. The selected export has 21 files and approximately 103 MiB of content,
well below the 512 MiB cap. `safe-dev export
/private/tmp/mass-spinner-v76-final05-export` exits zero; all 20 indexed payload
digests are checked on the host before copying the reviewed payload into the
project. No source sync follows. Deterministic gzip copies are decompressed
and compared byte-for-byte with their raw inputs in the guest before export.

Replay old02/03 from their respective frozen source archives, not current
physical code. The loose `initial_probe.py` and `common_probe.py` prototypes
are not publication entry points; the former requires its historical ablation
archive. They remain available in the appropriate archived source snapshots.
