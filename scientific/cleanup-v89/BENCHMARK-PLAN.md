# V89 benchmark rerun plan

Prepared 2026-11-12 by read-only execution-path inspection. This is a plan, not a new benchmark result. No VM, dependency installation, solver, test or Git operation was performed while preparing it. The root coordinator owns VM scheduling and execution receipts.

## Required scope

Rerun physical producers, then independent audits and software controls. Re-reading sealed historical outputs or passing tests alone does not count as a physical rerun.

| Campaign | Complete bounded physical work | Independent scoring / controls |
|---|---|---|
| Current V86 meridional release | 26 flow cases: four scenarios × two anode positions × three meshes, plus two nominal-cap controls; full declared optical replay | Fourier witnesses, every saved field replay, original and panel audits, thermal reference, optical comparison |
| V87 active acoustic CFL | Three full 64×96 trajectories at CFL .2/.1/.05 | Frozen V86 .2 exact packet identity; active-step schedules; independent temporal auditor; report admission |
| V88 OpenFOAM | All 13 native heat/swirl cases | Analytic Bessel controls, refinement and wall-stress/energy/inventory audits; four helper tests |
| V88 LoKI-B++ | Original 24 native electron cases, separate 20-case frozen extension, upstream example and three upstream test executables | Original/extension receipts, bulk-admission-v2 and eight adapter/admission tests |
| V88 FESTIM | All 36 native cases: four manufactured families × three meshes × three timesteps | Analytic/FV/Radau controls, 94 numerical gates, nine adversarial tests |
| V88 WarpX | Twelve original active-push cases plus separately frozen one-case warm collision-off control | Raw-array/deck/source checks, unchanged strict and feasibility screens, nine tests; matched-initial-array eligibility |
| V88 full target/Radau | All nine browser trajectories (three cases × three caps), and both Radau tolerances for all three cases | Nine Radau controls; exact-zero beam supplement and its tests; all original reaction/state/ledger gates |
| V88 Snakemake/FiPy | Fresh fine physical DAG, not its existing cached field | Eight real integration tests including an actual separate coarse physical run, corruption/interruption/cache controls, repeated final admission |
| Current application | Entire current root TypeScript test set | Required typecheck/build once at final gate; existing site/asset checks where their inputs are present |

These are separate numerical controls. None establish experimental/device qualification. Do not substitute the OpenFOAM smooth neutral operators for the missing matched compressible Hall/stress-work comparison, or FESTIM manufactured primitives for the complete target.

## Immutable staging and execution boundary

1. Record a SHA256 manifest of selected host source/config/lock inputs, frozen baseline packets and expected native package receipts. Use fresh, uniquely named stage/export directories and retain those names in the execution receipt. Do not delete or overwrite canonical outputs to make a producer accept a rerun.
2. Each stage is a COPY. Build a minimal source-only layout, preserving repository-relative paths where `ROOT`/imports require them. Omit only generated outputs in the new stage. Keep required frozen baseline/reference inputs explicitly listed below. Include no environments, host credentials, home mounts or control sockets.
3. After the root grants the serial slot: `/Users/noahs/.local/bin/safe-dev --memory 2G -C /absolute/new-stage init`, then `... run -- COMMAND`. Use a 4G ceiling only for a measured requirement; global cooperating ceilings cannot exceed 8GiB. Every install/script/test/build/native command runs inside safe-dev. Online is only for necessary downloads. No VM operation is authorized by this plan itself.
4. Preserve valuable guest outputs before any `sync --replace-guest`; replacement deletes guest source and project dependencies. Never resync an active or evidence-bearing guest blindly. Prefer retaining installed guest-only environments and making a fresh source/output copy inside that same owned guest, provided the runtime and tested-source identity are explicitly verified.
5. Export to a new host directory, hash-verify transferred evidence, reopen receipt/results and check expected case counts and all gates before claiming completion. Capture command, cwd, start/end UTC, exit code, source/protocol hashes, native distribution/build hashes, Python/Node/library versions, image/volume identity, output inventory and artifact hashes.
6. Existing OpenFOAM originals alone are 452,082,880 bytes. This is near safe-dev's 512MiB regular-file export limit: export that campaign separately and account for all additional files. Do not create a whole-repository export or a second large compressed copy merely for convenience. Check host APFS free space before native installs or raw-field exports; FESTIM's retained failed install demonstrates that logical guest space is insufficient evidence of physical disk headroom.

There is no universal `--output` option. The scripts below commonly bind output to `Path(__file__).parent/results` or the current directory. Fresh stage directories, rather than source edits or threshold changes, provide isolation.

## Exact entrypoints and dependencies

Commands in the following blocks are **guest commands**. The coordinator wraps them in `safe-dev -C STAGE run -- ...`; each command receives its own recorded exit status. Names such as `PY` and `MM` denote a verified interpreter/native launcher, never host Python.

### Application and shared Python flow environment

The root package pins jsdom31.0.0, tsx4.20.6, TypeScript5.9.3, Vite8.3.6 and three0.187.0. Install from the current lock inside the guest with `npm ci` (online only when downloading). The current scripts are:

```text
npm test
npm run typecheck
npm run build
npm run check:site
npm run check:assets
```

`test` is `tsx --test tests/*.test.ts`; `build` is `node scripts/build.mjs`, which locates Vite in the project or `.tools/frontend`. Asset checking reads existing Blender assets; native Mac Blender rendering is not part of a scientific benchmark rerun. Test the exact final source snapshot after edits; an earlier test gate does not cover later source changes.

The V86/V87 recorded Python stack is Python3.11.2, NumPy2.4.6, SciPy1.17.1, scikit-fem12.0.2, FiPy4.0.3; reporting also uses matplotlib3.10.8. Retained public runtime path: `/work/home/diagnostic-v72-venv/bin/python`, historical stage `/private/tmp/mass-spinner-public-20261110`, historical volume `safe-dev-0b0443eadcbe4bd8`. These are documentary pointers, not live existence/ownership verification.

### V86 full current flow/optical campaign

Preserve repository layout and imported `mixture-axial-v75`, `electrical-v82`, `flow-v81`, `boundary-v84`, `profile-v79` and other explicitly read baseline assets. The producer authenticates `boundary-v84/results/predictions.json`; do not regenerate/replace this input. Retain `meridional-v86/results/attempt01/` and its exact fields/source snapshot as baseline inputs in the new stage: independent Fourier and field-replay tools require these. Omit other V86 generated results from the stage.

From `scientific/meridional-v86`:

```text
PY run86.py flow
PY run86.py optics
PY run86.py final
```

`flow` runs current/main and independent tests, `validate_fourier86.py`, the complete `campaign86.py flow`, then `replay_fields86.py`. `optics` runs `compare86.py optics`. `final` runs tests, wall-reaction/hydro controls, FiPy `thermal_reference86.py`, `audit86.py`, independent `panel86.py`, optical comparison, summarization and the app gate.

Important: `campaign86.py` catches numerical case failures, writes them, and does not itself return a failure for incomplete rows. Independently require exactly 26 declared cases with `completed=true`; a zero producer exit is insufficient. `run86.py final` deliberately continues after original audit, thermal-reference and panel-audit scientific failures, and returns nonzero if any command failed. Keep those original failures. Its summary does not itself admit Fourier/field-replay receipts: inspect the flow receipt, 84 witnesses and all 26 raw-packet matches separately. Avoid duplicate final app builds by running this final phase before the one authoritative final application gate or explicitly documenting which invocation is authoritative.

### V87 active CFL

Use a different copied root with its original V86 `results/` preserved. V87 requires the precise frozen V86 prediction SHA256 `70e0923e8ac9a53a476e439a9df3e670fb52467ee9d3d6ab5aa62ad9eae5e5c7` and verifies its physical source seals. Do not assume a newly serialized V86 prediction is interchangeable even if fields agree. Omit V87 `results` entirely, or make it an empty directory; the guarded launcher rejects partial or complete prior outputs.

From root:

```text
PY -m unittest discover -s scientific/timestep-v87 -p 'test_*87.py' -v
PY -m unittest discover -s scientific/timestep-v87-independent -p test_audit87.py -v
PY -m unittest discover -s scientific/tooling-v87 -p test_check_report87.py -v
PY scientific/timestep-v87/launch87.py
PY scientific/tooling-v87/check_report87.py
PY scientific/timestep-v87-independent/audit87.py scientific/timestep-v87/results/predictions.json scientific/timestep-v87/results/audit.json
PY scientific/timestep-v87/summarize87.py
```

Never invoke unguarded `study87.py` against retained output. It can overwrite; `launch87.py` supplies the actual immutable-output boundary. Python/zlib identity is required for compressed-byte replay; raw-state hashes are the numerical equality check.

### OpenFOAM

Retained runtime stage `/private/tmp/mass-spinner-openfoam-v87-20261112`, volume `safe-dev-f5ca2e0a435a6e1a`; verify ownership/state before use. Adapter expects prefix `/work/project/tools/opt/openfoam14`; source has no alternate prefix argument. Native version Foundation14 build14-a4867fc914c1, official ARM64 deb SHA256 `a0867f4f6509460315921629cea44620f9f9ca3f59591d93009d5e9cd2927ea6`. Helper stack NumPy2.3.5/SciPy1.16.3, Python3.11.2. Use recorded authenticated package, not `pilot.py`'s latest-package selector for historical replay.

Make a fresh sibling `/work/project/v89-openfoam-RUNID` containing only current `reference88.py`, `audit88.py`, `test_reference88.py`, `PROTOCOL.md`. From that directory:

```text
../.venv/bin/python -m unittest -v test_reference88
../.venv/bin/python reference88.py
../.venv/bin/python audit88.py
```

The producer itself does not reject existing results. Ensure the new directory has no generated case/result trees. Native serial dummy Pstream is intentional. Recreated ZIP byte hashes may differ due to timestamps; each new packet must seal its own archives. Compare numerical gates and admitted native inputs rather than inventing a byte-equality requirement for ZIP containers.

### LoKI-B++

Historical stage `/private/tmp/mass-spinner-electrons-v88-20261112`, volume `safe-dev-94a72a564d4c875a`; runtime was moved guest-only to `/work/home/loki-runtime-v88` and linked to project `upstream`/`build`. A fresh adapter directory must have its own `upstream`/`build` links inside the guest, the exact upstream/data inputs, and no `results`, `extension-results`, `output` or prior admission. `adapter.py` verifies upstream Git HEAD, so its native source Git metadata must remain guest-local rather than relying on safe-dev's stripped project metadata.

Native commit `add55181430adec223efcf56233c7139ed40b8d2`, binary SHA256 `b8e74938edaba606175bc9a70160a26e76a92a7745dca91246faef8bcadd3a66`. Cross-section SHA256 `4bcb328eff01c147a1ebb9cb31e01253344ae10fc9fa4bff508d76bce0f9d444`; do not export raw cross sections contrary to their terms. Build exact commands are in `electrons/BUILD.md`: CMake3.31.10, GCC12.2, bundled Eigen/JSON, OpenMP off, `-isystem` for bundled include paths, targets `loki loki_test_eedf_utilities test_trans_coefs test_grid`, `-j1`. No solver source patch.

From the fresh adapter directory:

```text
build/tests/test_grid
build/tests/loki_test_eedf_utilities
build/tests/test_trans_coefs
build/app/loki upstream/input/Argon/Ar_swarm_setup.in
python3 adapter.py
python3 extension.py
python3 admission.py
python3 -m unittest -v test_adapter test_admission
```

The original and extension campaign commands deliberately exit1 for unchanged global qualification failures even when all 44 native cases complete. Execute subsequent independently meaningful commands explicitly with separate status receipts, not blanket `|| true` or a success-only chained shell. Preserve original global false status; bulk admission remains a separately bounded eight-point observable subset.

### FESTIM

The authoritative executed adapter is `festim/validated/`, not the failed-install packet. Historical stage `/private/tmp/mass-spinner-festim-v88-retry-20261112`, volume `safe-dev-413f05df90daf334`. Actual runtime: FESTIM2.2, dolfinx0.11.0, PETSc3.25.6, Python3.12.16/SciPy1.18.1, one MPI rank. Environment was ~2.0GiB plus 28MiB cleaned cache. Prefer the existing verified environment over another large install on a nearly full APFS disk.

`campaign.py` enforces UID1000, **cwd exactly `/work/project`**, one rank and frozen protocol/runtime versions. It writes `results.json` and `response.json` in cwd and can overwrite. Therefore this campaign needs a fresh dedicated project root, or preservation/movement of existing guest evidence followed by a verified empty output boundary at that root. Merely running from a new subdirectory will fail its actual domain guard. Do not patch the guard.

```text
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 .cache/bootstrap/bin/micromamba run -p /work/project/.venv python campaign.py
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 .cache/bootstrap/bin/micromamba run -p /work/project/.venv python -m unittest test_campaign -v
```

Public-download bootstrap is `sh install.sh` online in the fresh project. Its native version selectors are not an immutable distribution solve: for exact replay, use retained conda package URLs/hashes and pip wheel receipts rather than silently accepting newly solved builds. Preserve the original protocol SHA256 `be8b8542dcc565f9ef600e551034eebb1b69148a0c985ddf0ed26b432831fa00` and all 36/94 coverage.

### WarpX

Exact distribution replay derives from `scientific/warpx/installation.json`'s 82-package record, not the newer adapter installation receipt substituted arbitrarily. `install.py` reads cwd `previous-installation.json` and writes `explicit-linux.lock`/`installation.json`; supply that copied original input in a fresh stage. Installer uses `/work/home/warpx88-tools`, environment `/work/home/warpx88-env`, root `/work/home/warpx88-mamba`. Distribution WarpX26.10 `np2py312hded7337_0`, SHA256 `a442e121ea53b32cdd6443fd1aa413247496ab7b34da756bd067363e65b4348c` is authoritative even when native banner says Unknown.

Fresh adapter cwd must omit `results`, case `.log` files, `campaign-protocol.sha256`, `summary.json`, `warpx_used_inputs`. Preserve protocol/reference/analyzer/test bytes unchanged. Run:

```text
/work/home/warpx88-env/bin/python -m unittest -v test_reference
/work/home/warpx88-env/bin/python reference.py campaign
/work/home/warpx88-env/bin/python analyze.py
```

Then in a fresh `supplemental-warm-off` cwd with its separately frozen `reference.py` and `protocol.json`:

```text
/work/home/warpx88-env/bin/python reference.py campaign
```

Reconstruct the existing eligibility witness against the new warm baseline/raw arrays before making an attribution claim; the saved historical eligibility JSON is not a witness for new files. The original analyzer returns0 after writing scientific failures; inspect every gate and strict energy screen. It expects the twelve-case orbit family, so do not run it unmodified on the single warm-off protocol. Do not score the warm reflected trajectory as an unbounded analytic Lorentz orbit.

### Full target/Radau

Requires repository layout, current `src` kernel, cases/protocol, atomic-reference JSON, and the native Geant4 atomic input parsed by `reference.py` (`NATIVE` constant). Previous execution initially failed for missing native source: include that exact file explicitly, not just precomputed atomic JSON. SciPy1.17.1/NumPy2.4.6 in shared diagnostic environment.

`run.py`/`continue.py` hardcode tsx `/work/home/v75-deps/node_modules/.bin/tsx`. Satisfy that dependency inside the guest; do not edit frozen producer paths merely to use a different install. `export.ts` imports actual current `src/coupled-target.ts`. Fresh root stage has no target `results`.

```text
PY scientific/expert-v88/target-radau/run.py
```

This runs nine controls, all nine actual browser trajectories, then Radau **only if the browser command exits0**. Browser export retains failed trajectory rows and exits1 when any is incomplete. For that demonstrated partial-case branch, the canonical explicit continuation is:

```text
PY scientific/expert-v88/target-radau/continue.py
PY -m unittest discover -s scientific/expert-v88/target-radau -p test_audit_zero_beam.py -v
PY scientific/expert-v88/target-radau/audit_zero_beam.py scientific/expert-v88/target-radau/results/browser.json scientific/expert-v88/target-radau/results/zero-beam-admission.json
```

Continuation authenticates the retained browser bytes and performs diagnosis plus full Radau assembly without silently rerunning/replacing browser evidence. Run it only when partial browser output exists and the continuation receipt is absent. Retain initial nonzero execution and continuation statuses. Historical continuous-case packing abort and beam-off energy norm failure remain possible scientific failures; never loosen admission or normalization to obtain a green rerun.

### Snakemake/FiPy

Use a fresh standalone copy of workflow source/config/lock files with no `results` or `.snakemake`. Historical runtime `/work/home/workflow-v88-venv/bin/python`, volume `safe-dev-233308a0e8df7ba1`; verify before reuse. Install `requirements-lock.txt` online only if needed. Exact top-level pins Snakemake9.27.1, FiPy4.0.3, NumPy2.4.6, SciPy1.17.1.

```text
PY -m unittest test_workflow -v
PY -m snakemake --cores 1 --executor local --scheduler greedy --printshellcmds
PY -m snakemake --cores 1 --executor local --scheduler greedy --printshellcmds
```

The first DAG in the clean copy must actually run `producer.py`; the repeated DAG verifies always-run cached-evidence admission. The eight tests create independent fresh temporary campaigns, including the exact 8-cell/5-step negative control, and preserve fine/coarse evidence in a new verification directory. Coarse qualification exits1 intentionally; tests assert that state and retain its report. Physical case key hashes producer/seals/config/protocol/lock; audit/report descendants use separate hashes. Existing immutable outputs cannot be overwritten, even when asking Snakemake to force a rule.

## Older campaigns: avoid redundant reruns, retain distinct evidence

The latest current campaigns above are the required first pass. V81 neutral flow, V82 electrical, V83 regional, V84 boundary and V85 axial are historical alternative/successive physics models. Their baseline packets remain needed by current source/admission paths; do not regenerate them under a newer model or imply that V86 proves those distinct studies. Rerun their focused imported-kernel tests and preserved admissions as dependencies, then rerun a full older campaign only if source comparison shows a relevant current change, its result is a current delivered claim, or the user explicitly requests the entire historical catalog.

Likewise, old v12–v17 Julia/PETSc/Landau campaigns, v24 well-mixed loading, v30–v38 collision/transport/collector/neutron controls, and v53–v75 thermal/centrifuge studies are not replaced by the V88 references. They are distinct historical experiments, often with costly native runtimes and frozen failed gates. Preserve original packets and use the full current app tests plus targeted imported-operator regressions as the first compatibility gate. A full historical reproduction should be a separately enumerated second campaign, retaining its original source snapshot, native versions and all negative controls. Do not claim that it ran as part of this bounded current rerun.

## Final reporting requirements

Report separately: solver completion counts; unit/integration software checks; numerical/control gates; comparison to old frozen evidence; experimental qualification (false). Missing native jobs, incomplete cases, stale sources, absent raw fields, or failed gates remain failures/unexecuted work. Never use a passing npm build, a producer exit0 that only writes metrics, or a caught nonzero process as evidence that the scientific campaign passed. Record exact final build/typecheck commands and tested source manifest once the code snapshot is final.
