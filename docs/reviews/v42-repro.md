# v42 reproducibility and verification audit

9 November 2026. Read-only production review. No application, scientific data,
release or deployment was changed. The reviewer used trusted file reads and
independent file/archive hashing, not host execution of repository code. No VM
was started, created, synchronized or deleted by this reviewer. Root coordinates
all project execution in the existing safe-dev guest. The small CLI witness is
`docs/reviews/v42-cli-probe.py`; root's fresh guest execution reproduced the
defect. This reviewer read the resulting raw log and command receipt.

## P2: general convergence CLI discards a declared research execution mode

**Problem.** A valid custom plan with `executionMode: 'research'` cannot be
executed faithfully through `scripts/run-convergence.ts`. A tiny plan admitted
in both modes still acquires an artificial failed batch; a research-only
particle count is rejected under interactive ceilings. This affects this CLI,
not existing transport results produced by the separate v33/v34 runners.

**Technical cause and execution path.** The CLI parses and validates the custom
plan at `scripts/run-convergence.ts:32–37`, but calls
`executeSeed(level,seed,sourceHash)` at line 58. The omitted fourth argument
defaults to `interactive` in `src/convergence.ts:101–102`, and the run saves
that value at line 121. `summarizeConvergence` correctly requires the recorded
mode to equal the plan at lines 208–214, so it rejects the CLI's own research
batch. The plan validator explicitly admits both modes at lines 148–151.
`src/doublewell-dynamics.ts:46–47` also chooses particle/work ceilings using
this argument. `scripts/transport-run-v34.ts:14` correctly forwards the
requested mode; archived v34 research evidence is not invalidated by this bug.

**Simple explanation.** The command accepts the research instruction, then
forgets to give that instruction to the solver. The result checker catches the
disagreement instead of certifying it.

**Minimal correction.** Forward `selected.executionMode` as the fourth argument
to `executeSeed`. Preserve omission's existing interactive meaning. This is
preferable to changing result admission, widening interactive limits, or
rewriting the artifact's recorded mode after execution: those alternatives
would hide which boundary actually governed the solve.

**Regression gate.** Extend the real subprocess CLI test in
`tests/convergence-cli-v10.test.ts` with a tiny research plan and the omitted-mode
control. Require complete runs with recorded research mode and no complete-batch
failure; overall qualification must remain UNKNOWN because a one-step fixture
supplies no convergence study. Add a small admitted-above-interactive-N case if
needed to verify admission as well as labeling. API-level research tests in
`tests/transport-research-v33.test.ts` already exercise correct direct calls,
while the current CLI test at lines 54–70 supplies no execution mode. Passing
those separate tests does not cover this missing connection.

**Fresh execution evidence.** `scientific/audit-v42/cli-witness.log` records the
real existing CLI on identical one-step N=8 control/research plans, without
mocking the solver. The control produced two complete interactive runs, overall
UNKNOWN and no batch failure. The research plan also produced two complete
interactive runs, then overall FAIL and `tiny: complete batch` failure. Both
record executed-source hash
`99e809a0a7724968411d4bf0b24230df33390c2be56b18906771424959bb6cb3`.
The probe exited zero because its assertions demonstrate the observed defect;
this is not a passing corrected-behavior regression. The receipt pins the
probe itself to
`e08bf2a851c91662f567b26563bf67eab00fb276bee601dc77600e5319c2ea6b`.

## P2: downloaded live runs lack immutable producing-code identity

**Problem.** The public `mass-spinner-run.json` download cannot identify the
solver/release that produced it. This limits repeatability of shared results
even though the local deployment itself has strong hash receipts.

**Technical cause.** Accepted worker results become
`latest={kind:selected,settings,result}` at `src/main.js:305–307`; presentation
adds diagnostics, but no producing-code identity. The download at lines 416–419
adds only the constant `modelVersion:10`. The identical version tag existed in
`scientific/verification-v21/source/src/main.js:367`. That retained older solver
predates the current versioned Philox initialization in
`src/doublewell-dynamics.ts:8–16,29–33,122`; version 10 therefore does not select
one unique numerical implementation. By comparison, the offline convergence
CLI records the actual import-graph source map and source hash at lines 39–65.
The v41 release receipt is stored separately and is not carried by the download.

**Simple explanation.** A saved calculation has its inputs and answers, but
does not say which calculator version created them. An unchanged generic
version number cannot recover that missing provenance later.

**Minimal correction.** Add a deterministic producing solver/build identity to
the downloaded artifact, bound to the actual bundled worker's source and locked
dependencies. Retain inputs/results and any existing schema/version semantics.
Use one authoritative generated identity for the actual build; hand-maintained
new numeric tags or an unbound deployment timestamp do not solve this problem.
This is a small metadata fix, not a numerical model change. Existing downloads
without this identity must remain explicitly unidentified rather than being
silently attributed to the current implementation.

**Regression gate.** Exercise the production export serializer and assert that
the downloaded artifact carries the build/solver identity corresponding to its
accepted result. Verify a different solver snapshot yields a different identity,
and a pre-metadata download remains a legacy artifact with unknown producing
code. Retain the existing stale-input/export-invalidation checks. This finding
does not claim current saved answers are wrong or that old outputs were
relabelled during this audit.

## Fresh integrity checks: no source, release or recording mismatch found

Independent trusted-host Python code read bytes and used SHA-256/JSON/archive
standard-library operations only. It did not import repository modules.

| Check | Observed result |
| --- | --- |
| v41 tested-input manifest | 481 entries; all 479 currently available canonical inputs match; only the known stage-only `run-final-gates-v38.py` and `run-final-gates-v39.py` are absent |
| Canonical sorted-map input aggregate | `4f85060ae4393b8c17ecb616b56cc1be1599162e27820c822a398b0fc7a2a6a4` |
| v41 current release membership and bytes | All 148 files match; no missing, extra or mismatched files |
| Canonical sorted-map release aggregate | `89d7cb3d6c289900641f678318d5c5f3d5f6ccdcd335aae15e1955e66f60ee0d` |
| Recorded distributions | All 20 source-file digests match; stored exporter digest matches current exporter; public/release copies are byte-identical |
| Recorded moments | All nine referenced selected case-audit, metadata and raw-history file digests match |
| Cleanup recovery sample | `safe-dev-0183b3b87047e9e2.tar.gz` matches receipt SHA; all 330 embedded payload hashes and byte counts match; no extra/missing payloads; no exclusions |

The sample archive is the retired independent effective-confirmation v33 stage.
This freshly checks one complete research archive, not all 132 archives or a
fresh VM restoration. Other retirement/restore checks in `final-inventory.json`
and `recovery-checks.json` are retained historical evidence. Nothing inspected
demonstrates loss of canonical scientific data. Reinstalling explicitly excluded
dependencies after restoration remains necessary; a valid archive does not
establish the availability of future upstream package downloads. No cleanup or
restore was attempted in this audit.

## Test strength and claim boundaries

The historical v41 raw TAP log ends with **831 tests, 831 pass, zero failures,
skips or cancellations**. `scientific/audit-v41/final/final-gates-v41.json`
records exit zero for `npm test`, `npm run typecheck`, `npm run build`,
`npm run check:site` and `npm run check:assets`. Its runner verifies the input
hashes before execution and after each gate. Those are historical successful
executions of the currently byte-matching source, and the added v42 witness/report
are outside that old manifest.

Root subsequently reran the required gates offline in the existing safe-dev
source `/work/home/audit-v41-check-source`, without replacing the source tree or
creating a new VM volume. The v41 481-entry baseline was checked before and after
each command; the two stage-only runners remain available in that guest. The
canonical source aggregate remains the value above. This reviewer read the fresh
`scientific/audit-v42/receipt.json`, `tests.log`, `typecheck.log`, `build.log`,
`site.log`, `assets.log` and `cli-witness.log`.

| Fresh guest command | Result |
| --- | --- |
| `npm test` | Exit 0; 831/831 pass; zero failures/skips/cancellations; 22.90 s command duration |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0; retained non-fatal large-chunk warning |
| `npm run check:site` | Exit 0; explicitly a parse/resource check |
| `npm run check:assets` | Exit 0; GLB v2, 176 meshes, PNG 1600×1000, Blender scene present |
| `python3 docs/reviews/v42-cli-probe.py` | Exit 0; assertions reproduced the research-mode defect described above |

This is fresh software/witness execution on the unchanged v41 baseline, distinct
from both the old v41 logs and native scientific solver reexecution. It does not
rerun Julia/OpenMC/Geant4/WarpX or confer physical qualification. No product fix
was made, so the fresh suite passing alongside the witness confirms the specific
test-coverage gap.

The test suite is not solely mocks or implementation mirrors. For example,
`tests/research-distribution-v38.test.ts` independently integrates all 378 saved
species/axis marginals, compares their mean/variance with the separate moment
packet, pins the original data digests and retains archived entropy/refinement
decisions. `tests/random-source-v34.test.ts` checks frozen legacy trajectories
and rejects mode/RNG relabeling. The native neutron checks compare all knots and
midpoints with independently parsed ENDF tables and preserve raw HDF5 readout
statistics. These are useful independent arithmetic/integrity checks; they do
not freshly rerun Julia, ENDF parsing, OpenMC or physical experiments during
`npm test`. Some other UI tests intentionally inject a renderer or worker; their
passing status only establishes their stated source/CPU/DOM boundary.

`tsconfig.json` checks `src/**/*.ts`, not most UI JavaScript or the CLI scripts.
The CLI subprocess tests do execute the script; their omitted research-mode
case is a specific demonstrated blind spot, not a reason to dismiss the whole
suite. `scripts/check-site.mjs:32` explicitly labels its resource/parse checks
as not a browser runtime check.

The qualification labels checked are appropriately conservative:

- The v17 replay states qualification WITHHELD, selects exact saved case/step
  keys, and does not run a solver on time scrubbing. Distribution exports
  distinguish v16 isotropic evidence from unqualified v17 general-3D evidence;
  their source hashes currently match retained arrays.
- `src/convergence.ts` keeps missing orientation/alignment and continuum-effect
  evidence UNKNOWN. `src/observable-evidence.ts` assesses the actual current
  collision result and always retains unqualified continuum status; it does not
  import a static certificate for changed slider results.
- `docs/COLLISION-QUALIFICATION-V38.md:134–143` and the current public packet
  retain 59/60 unresolved-exposure budget exceedances, 28/60 raw-angular budget
  exceedances, 275 PASS / 265 UNKNOWN decisions and no continuum-bias bound.
  A green software suite cannot discharge these physical qualification gates.

The recorded provider receipt identifies version
`893305a3-d0d2-4485-b82c-c0c4bcfa41c4` at 100% traffic at
`2026-11-09T16:12:24.473370+00:00`, with the matching release aggregate and
explicit `browserVerified:false`. This reviewer read the receipt; it did not
query current provider state or reopen the live origin. Deployed resource
loading, actual WebGL shader behavior and mobile interaction therefore remain
unverified here. This is an acceptance limit, not evidence of a deployed bug.

No product corrections or deployments were made by this reviewer.
