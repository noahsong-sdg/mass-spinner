# V89 independent review

Status: orchestration, fresh V86/V87 flow/optics, all six fresh expert-code
exports, the native-example audit supplement and the final application gate
reviewed. No outstanding
evidence blocker found within these bounded replay claims; scientific failures
remain failed. This reviewer has launched no VM,
run no scientific producer or test,
and changed no scientific source, protocol, input, result or acceptance gate.

## Execution and provenance

Read `flow-rerun/{rerun,pack,test_rerun,test_pack}.py`,
`expert-rerun/{guest,compare,test_compare,warm-eligibility}.py`, both READMEs,
the benchmark plan, and the trusted host expert transfer/export controllers.

- Fresh destinations reject reuse. Physical producers are explicitly invoked;
  a cached workflow admission is additional to the fresh fine DAG.
- V86/V87 field comparison authenticates compressed and decoded raw packets,
  requires the full original case inventory and completed trajectories, and
  reports numerical differences separately from qualification.
- Expert preflight checks frozen producer/input identities against original
  packet seals or Git commit `ce57170038bfff66a6521883a70042aa1294e8d3`.
  Baseline packets must match that commit. Guest receipts seal transferred
  files and subsequently require them to remain unchanged.
- Native runtime checks and actual producer commands are present. Retained
  scientific failures remain visible; `executionCompleted` describes finished
  execution, not successful physical qualification.
- Export authenticates the complete guest artifact inventory and rejects
  unsafe or duplicate archive members. Omitted OpenFOAM raw ZIPs are explicitly
  local-only with hashes. Flow deduplication requires exact SHA256 and a pinned
  Git blob, preserving unique bytes in the archive.

No demonstrated blocking defect found in these paths. The exported-evidence
reviews below inspect actual commands, logs, native identities, full case
coverage, source seals, failed gates and exported bytes. Source review or repeated software tests
cannot substitute for genuine fresh physical execution. The flow wrapper's
allowed exit1 paths require particular attention to complete scientific JSON
and logs rather than treating an existing JSON file alone as proof.

## Fresh flow export reviewed

Independently verified `flow-rerun/evidence-20261112-01.tar.gz`:
608,410 bytes, SHA256
`86881d0c159c40bdf1b72c8edbab25e7e8a4eaf05d89aa50d4802fec85fc8f94`.
The actual archive member inventory matches its manifest. Every one of its 58
included artifact hashes was checked from both archive member bytes and the
extracted file. All 531 recovery records match the named canonical file and the
actual pinned Git blob's OID, size and SHA256. The freshly read Git tree hash
matches the manifest. All 568 sealed run source/output paths are covered by the
included/recovery inventories; the run receipt hash also matches.

The execution receipt records a new full run from `01:41:23` to `02:11:05` UTC
on 2026-11-13 (`flowOnly=false`). Its producer logs, complete packets and replay
comparisons support:

| Fresh work | Observed result |
|---|---|
| V86 flow | 26 completed trajectories; 26 logged completions; all raw fields and predictions reproduce exactly |
| V87 active CFL | Three completed trajectories; 654 / 1,310 / 2,621 steps; all raw fields and predictions reproduce exactly |
| V86 optics | 64 completed groups; 64 logged completions; four times with 576 alternatives each; zero all-point experimental matches |
| Fourier witnesses | 84 witnesses; passed; measured target velocities not read |
| FiPy thermal comparison | All nine recorded gates pass; command exit0 |
| New orchestration controls | Four rerun + four packing + five material-transfer tests pass; tested sources match current hashes |

Actual producer wall times are approximately 932 seconds for V86 flow,
130 seconds for optics and 696 seconds for V87. These logs and invocation
receipts establish fresh physical execution; identical resulting bytes alone
would not establish it.

Failures remain explicit: V86 has 85 field and 335 original quadrature failures;
the panel supplement retains 85 field failures and has zero panel quadrature
failures. Both auditors return exit1. Their complete saved JSON is hash-bound,
and their actual source paths write that final result immediately before the
boolean `SystemExit`; there is no traceback or post-result computation that
would explain these statuses as crashes. V87 passes all 28 temporal and 112
quadrature checks, while both its full-model and all-required qualification
flags remain false. The aggregate correctly records `allCommandsPassed=false`
and `fullModelNumericallyQualified=false`.

No blocker found in this export's bounded replay claim. This is a provenance,
coverage and retained-gate review, not an independent solver rerun or an
experimental qualification. The six fresh expert-code campaigns are separate
and require their own exports to be checked.

## Fresh expert exports reviewed

For OpenFOAM, LoKI-B++, FESTIM, WarpX and Snakemake/FiPy, independently checked
all five durable bundle hashes, exact member inventories and regular-file
types. Every sealed member was SHA256-read directly from its archive; available
public copies also match. The five bundles contain 643 regular members in total.
All declared source aliases match current canonical SHA256; frozen aliases
also match their recorded original Git blob. Preflight receipts record checks
before native execution. Public source omission is therefore explicit
deduplication, not absent provenance. OpenFOAM's 13 raw ZIPs were independently
hashed directly from its durable bundle and match the local-only declarations;
they are not falsely presented as public repository payloads.

| Durable bundle | SHA256 |
|---|---|
| OpenFOAM | `101eecc975385ba72c3b2aa0c9a20d7ee00854555292b82060e092609b3f6d83` |
| LoKI-B++ | `675f8e11080666452b13512667c40de0f7046e0fe74c8395ddea9198c97f8c7e` |
| FESTIM | `0da21e707a278e55432b6e15187210146a74bc7305b1805a59fb5ce8b5d0f8cc` |
| WarpX | `a0af68abc61909ff6f296837de13c674232028d43922e5e66a1c112e558dbdc8` |
| Snakemake/FiPy | `e5147c8ab2cea618f084fa2fa252f3358b30a0a7da0308b8bc8771036b3f470b` |

The actual invocation/log/result evidence supports these bounded results:

- OpenFOAM: 13 fresh completed native cases; 86 gates and four helper tests
  pass. Executed binary hashes and producer seals match the original packet.
- LoKI-B++: 24 original and 20 extension cases complete; eight adapter/admission
  tests pass. Native binary and cross-section identities match their original
  seals. Eight exact-grid bulk observable rows remain separately admitted;
  four original ionization and two extension mean-energy refinement failures
  remain failed. Both global qualification flags remain false. The three
  upstream executable invocations return zero; this alone is not a physical
  qualification of their printed diagnostics.
- FESTIM: 36 native cases, 94 gates and nine tests pass. Protocol, native Python
  source hashes and the complete sorted conda distribution identity match the
  original. This remains the synthetic constant-Cp, one-way coupling control.
- WarpX: 12 original cases plus matched warm collision-off control execute;
  nine tests pass. Pinned native distribution identity is recorded. Six angular
  and eleven strict-energy failures remain failed. Warm-off initial arrays
  match; 55 heavy-particle unbounded endpoints exceed the reflecting wall, so
  free-space orbit comparison remains ineligible.
- Snakemake/FiPy: logs show the physical producer runs in the fresh fine DAG;
  eight integration tests pass, followed separately by cached admission.
  `globalQualification` remains false; cached admission is not counted as a
  second physical solve.

All five declared physical projections reproduce their originals exactly,
without numerical, structural or nonnumeric differences. This statement covers
the explicitly selected projections, not unexamined experimental predictions.

### Target/Radau export

The sixth durable bundle SHA256 is
`383dcff4702a13d6e84814df264d306010fe1045d3d389234208200a4a9161d5`.
All 177 regular members, their exact inventory and every sealed member/public
copy hash were checked. Its 155 source aliases match current canonical hashes
and their original Git blobs. Across all six bundles this accounts for 820
regular members and 204 declared source aliases.

The actual new browser invocation reproduces packet
`63e73efb9bcebbe4364da335c8635179d0fe75383516fb7cc482dd4c989838b4`:
eight of nine trajectories complete; the continuous finest trajectory retains
its packing admission failure. All three Radau cases run at both original
tolerances. Nine reference controls pass, including the separately logged
continuation repeat; four zero-rate controls pass and all 45 zero-current
samples remain exactly zero. The case outcomes remain beam-off false,
continuous false, pulsed true. Overall numerical qualification remains false.

Radau is **not bitwise identical**: 1,175 selected numeric scalars differ,
without structural or nonnumeric differences. The largest absolute difference
is `3.4924596548080444e-10` in an energy ledger near 300,000, a relative change
of approximately `1.16e-15`. The apparently large maximum relative change of
18 comes from a near-zero budget residual changing from `3.64e-12` to
`6.91e-11`, still below its unchanged `1e-8` gate. Solver statistics and all
case outcomes are identical.

Reviewed the separately executed `radau-replay-diagnostic.py`, its receipt and
result: it uses the unchanged `Model.scale`, reports a maximum normalized
state change of `5.093170329928398e-11`, and changes no original acceptance
norm. Python, NumPy and SciPy version strings match the original; those strings
do not establish identical native-library bytes. The precise cause of the
small differences has not been isolated and is not attributed to a specific
library or platform by this review.

### Confirmed upstream-example numerical failure

LoKI's unchanged 100-field example returns CLI exit0 but its log explicitly
reports lookup-table overflow/clipping and failure of iterative temporal
growth. At `electrons/logs/upstream-example.log:97838`, the native solver says
the 1020.66 eV grid exceeds its 1000 eV lookup table and the simulation is
unreliable; the following line reports nonconvergence. Its EEDF output contains
3,000 NaN rows. This is a **numerically failed example**, not a passing physical
control. The 44 bounded adapter cases and their frozen gates are separate.
The separately sealed `upstream-example-admission/` supplement was reviewed:
five regression tests pass, while the actual log audit correctly returns exit1
and `numericalPass=false`. It reports 3,000 nonfinite rows, one lookup-domain
warning and three nonconvergence warnings. Its transferred hashes, current
auditor/test source identities, original log hash and native execution receipt
hash all match; the emitted audit log and saved result are byte-identical.
The reporting/admission finding is closed; the native example remains failed.
No original example, protocol, gate or receipt was rewritten to hide it.

## Final application gate and report

Read the trusted host controller
`/private/tmp/mass-spinner-v89-app-final-control.py` and the exported
`app-final/{execution,expected-source,source,launch}.json` and logs. The controller
preserves prior guest bytes before refreshing authenticated copied inputs,
rejects an unpreserved guest edit, executes all project commands only inside
safe-dev and checks the source map both before and after those commands.

Independently verified every recorded command-log hash. The actual final logs
show:

| Command | Observed result |
|---|---|
| `npm test` | 1,238 passed; zero failures, cancellations, skips or todos |
| `npm run typecheck` | exit0 |
| `npm run build` | exit0; existing large-chunk warning remains visible |
| `npm run check:site` | exit0; explicitly structural, not browser runtime |
| `npm run check:assets` | exit0; asset parsing/presence checks |

Three executed overlay controls pass. The expected and tested source maps are
exactly equal at 2,666 paths. Independently recomputed their canonical tree hash
and SHA256-read **all 2,666 current host files**: no mismatches. Every currently
listed file under `src/`, `tests/`, `scripts/` and `blender/` is covered; the root
package manifest, lock and HTML entry point are covered too. Tested tree SHA256:
`b066b4388152183e1714bbe5b4dedac2ca106adf0a57f43e960db893e9340b6e`.
The prior-overlay archive's whole hash, exact member inventory and all preserved
member hashes also match its manifest. These checks authenticate the reported
snapshot; this reviewer did not rerun the application commands.

Read `CLEANUP-AND-BENCHMARKS-V89.md` against the reviewed receipts and results.
No unsupported qualification or completion claim found: it distinguishes
numerical replay from experiment, preserves the LoKI example failure and all
original failed gates, describes the small Radau differences separately from
exact replay, and explicitly excludes browser/GPU verification. No deployment
or live rendering outcome is established by this application gate.

## Target identities clarified

Rehashed the current producer and original execution, continuation and result
packets. The reference **result packet** hash is
`8612bcfbd3ef0395ad48bf23bbc50d497b81e00d6b67079786c145df32b55418`.
The final producer **source** hash is
`64ca1b7815595591edc6ad984decd79adef417039b8c0071baeb270a6bc96463`,
matching both final source maps. The original aborted execution sealed earlier
source `f3b86762e6a49a117378eea4f32c76897346e45199c7a081c4e6da639176fca1`.
The two V88 README labels now distinguish these identities explicitly; the
result bytes and retained failed scientific status were correct and unchanged.
`git diff --check` passed after this documentation-only clarification.

## Cleanup evidence checked

Independently rehashed the secondary cleanup's retained external archive,
receipt and maintenance source. All match the project receipt:

| Artifact | SHA256 |
|---|---|
| `preserved-content.zip` | `65a914bdf554b6c42607a8875b47037dc81ba93c6416d8e449530b75118fbf35` |
| External `receipt.json` | `849ab8e4e9f7f447d01af842bb69967b4d9e603293b8ebe54e1ca7e2ab447d0c` |
| `maintenance.py` | `7593fc07ed3dea550cb7b52338ac315104f88c98a9043570b68b3dae44cd11d5` |

All 18 recorded target paths were checked and remain absent. The receipt records
complete blob readback, metadata inventory, open-file checks and preservation;
this reviewer did not repeat its archive extraction or pre-deletion checks.
Filesystem free-space changes are not attributed solely to this cleanup.

Independently rehashed all 34 retained historical release archives: every hash
matches `cleanup-execution.json`. Its admission hash also matches the current
`generated-release-duplicates.json`:
`a2a1cdba62b9b6ef8ef93a4fd510762cbffdca9c534e55df44d3c9161bed8159`.
These checks authenticate preservation receipts and archive bytes; they do not
repeat the original per-file duplicate assessment or imply a scientific rerun.
