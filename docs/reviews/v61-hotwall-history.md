# v61 hot-wall integration and history review

Source audit on 2026-11-09, follow-up evidence review on 2026-11-10. This reviewer read the v60 assessment and current
production/test sources. No project code, scientific campaign, test suite, build
or browser session was executed by this reviewer; the parent owns safe-dev and
must attach exact source-snapshot receipts before treating recommendations as
verified behavior. After the initial audit, this reviewer implemented the
coordinated UI/scenario changes and authored focused tests, described below.

## Verified execution path

- `src/fuel-centrifuge-ui.js`: `thermalRead()` constructs the operation's immutable
  thermal setup. Spatial liner currently fixes 16 tungsten cells; spatial gas
  contains prescribed conductivity. `run()` sends operation, config and optional
  accepted transport/time resume to `fuel-centrifuge`.
- `src/worker-client.ts`: each request owns a worker, abort terminates it, and
  replies must match id/kind/schema. These ownership rules already prevent stale
  expensive adaptive responses from replacing a newer accepted run.
- `src/worker.ts`: validates the operation, computes the uniform-inertia reference,
  then calls `simulateFuelOperation(rotor, operation, {}, resume)`. No transport
  options currently cross this worker protocol.
- `src/fuel-operation.ts`: creates the transport grid, stores the operation and
  apparatus setup in the result, optionally constructs liner/gas conserved
  states, advances physical states, and records every accepted step as a
  checkpoint. Plot snapshots are a separate sparse collection.
- `src/fuel-transport.ts`: `sampleFuelTransport` uses checkpoints when available;
  exact knots return the accepted canonical state and unsolved cursors interpolate
  species inventories, angular momenta and energy ledgers before reconstruction.
  Spatial gas temperature is rebuilt from conserved cell energy and particle
  inventory; current switches are right-continuous.
- UI plots, shared playback, 3D temperature sampling and current interventions
  all consume that accepted result. The export click serializes the entire
  accepted `{result, producingCode}`; `pinFuelExperiment` clones and freezes it.
  They already preserve new operation/result metadata without another format.

## Root cause and narrow contract

The v60 report establishes that resolving the rotor timescale and closing
conservation budgets does not resolve gas heating. In technical terms, the
existing spatial gas grid/time policy is selected independently of its much
faster local thermal mode; the history contract records cells/steps but has no
explicit accuracy policy. In simple terms, accurate bookkeeping can still keep
track of an overly blurred temperature profile.

The coordinated contract adds optional `operation.thermal.gas.accuracy` containing
`relativeTolerance` and `temperatureToleranceK`; omission retains the fixed
policy. A single select visible only for enabled
atomic spatial gas is sufficient; no tolerance or mesh sliders are required.
The new opt-in mode may own a tested mesh and adaptive backward-Euler time policy.
Store its accepted policy and actual grid in the result; keep its tolerances
fixed and documented. Distinguish local timestep estimation from experimental
validity and from finite-reference mesh qualification.

This placement is preferable to a separate worker/settings framework: operation
already owns immutable physical setup, saved exports already carry it, and
current-event continuation already compares it. Do not add a regrid operation,
generic migration layer, automatic old-history conversion or hidden fallback to
the coarser mode.

Explicit programmatic `FuelTransportOptions.cells/steps` remain authoritative
for refinement studies; new adaptive runs with no override use 256 gas cells.
The UI retains 16 tungsten cells. The coordinated result metadata is
`timeControl` with method, tolerances, accepted-pair/rejected-step counts, and
maximum accepted error ratio. This metadata reports a temporal error estimate,
not a guaranteed total physical or mesh error.

Implemented UI controls are `fuel-thermal-resolution` with `interactive` and
`refined` values. Only active refined spatial gas adds
`accuracy:{relativeTolerance:6.25e-7,temperatureToleranceK:1e-7}` to the operation.
Inactive setup captures omit this coordinate, while missing-coordinate restore
explicitly resets it to `interactive`. Focused tests live in
`tests/hotwall-adaptive-ui-v61.test.ts`; their request fixture intentionally
uses a cheap isothermal trajectory to isolate UI message/ownership behavior.
It does not replace numerical validation of adaptive physics.

## Persisted scenarios

`src/scenario-state.js` stores shareable control coordinates, not solver states.
Its hard allowlist must include the new select id. Its existing pre-extension
restore block must reset a missing mode to the fixed policy before notifications,
even when the current workspace has an adaptive run selected. That stale-workspace
case is essential: otherwise an old link silently changes numerical meaning.

If an incoming scenario explicitly selects the opt-in mode, validate that it
also enables atomic thermal evolution, a radial liner, and spatial gas. Perform
validation before any mutation, following the existing atomic restore pattern.
Inactive numerical settings should either be reset or omitted from captures,
consistent with conductivity/thickness behavior. A new schema version is not
needed for an optional allowlisted coordinate with an explicit missing-value rule.

No saved-result import path was found in the reviewed centrifuge UI. Exports
remain evidence artifacts; sharing a setup recomputes a new history and does not
claim to resume an imported result.

## Resume invariants and adjacent edge cases

Existing resume validation compares cells, apparatus, thermal setup, accepted
liner grid/material masses, particle inventory, species canonical state and past
current events. The initial audit found no nominal-step comparison. The reviewed
v61 implementation now rejects a `previous.steps` mismatch for adaptive runs;
legacy behavior remains unchanged. Thermal setup equality rejects accuracy-policy
changes, and existing cells/grid checks reject implicit regridding.
An omitted mode in a pre-v61 history means fixed mode; such a history must remain
resumable on its own accepted grid and steps, not be promoted into adaptive mode.

The live worker passes `{}` and therefore resumes the UI's 256-cell/512-step
adaptive policy. Programmatic refinement studies on custom cells/steps must
repeat those explicit options when resuming: incompatible options fail safely
rather than reinterpret old cell energies. Changing the UI mode is
an immutable setup edit and must start a new run through the existing `changed()`
path; power/current controls should retain the accepted policy.

Preserve all checkpoints strictly before a branch and reconstruct the branch
state at its exact cursor. Only current becomes right-continuous at the event.
Accepted adaptive substeps should use the same checkpoint structure, so playback,
plots and 3D need no independent adaptive implementation.

The v61 implementation streams the potentially long checkpoint-prefix append,
resolving the v60 argument-count risk on resumed adaptive histories. Sparse plot
snapshots still use spread append; their size is unrelated to every adaptive
half-step. The thermal plot still computes a maximum with
`Math.max(...data.map(...))`; future histories near argument-count limits need a
scoped streaming reduction. Memory/worker cloning/export cost also grows with retained cells ×
checkpoints, so bound supported work explicitly instead of dropping accepted
states from the result.

## Required targeted evidence

1. Default and omitted mode replay preserves the v60 result exactly; invalid
   mode/thermal combinations fail before work.
2. New control reaches operation, result and accepted export; a policy edit
   starts a new run, while a current event resumes the same accepted mode/grid.
3. New setup links roundtrip. An old spatial-gas link restored over an adaptive
   workspace selects fixed mode; an invalid link leaves all current controls
   unchanged.
4. Resume at both accepted and unsolved times preserves the canonical prefix,
   species inventories, momenta, liner/gas energies and ledgers. Same-mode and
   same-steps succeed; changed mode/cells/steps fail. Include a pre-v61 history
   with no policy field.
5. Export and pinned comparison use accepted metadata while new work is pending.
   Timeline, temperature plot and Show in 3D share one sampled physical time.
6. Attach adaptive numerical evidence separately from source integration tests:
   checked common-annulus reference errors, rejected/accepted-step behavior,
   conservation at accepted states, and the exact producing-source hashes.

Existing useful fixtures: `tests/fuel-centrifuge-scenario-v44.test.ts`,
`tests/fuel-operation-ui-v51.test.ts`, and continuation controls in
`tests/fuel-operation-independent-v51.test.ts`.

## Follow-up source review and inspected execution receipt

The parent executed the focused suite centrally, then this reviewer opened
`scientific/fixes-v43/hotwall61-focused.receipt.json` and its full TAP log.
The exact command was:

```
node --import tsx --test tests/fuel-time-control-v61.test.ts tests/hotwall-adaptive-independent-v61.test.ts tests/hotwall-adaptive-ui-v61.test.ts tests/fuel-hotwall-continuation-v59.test.ts tests/hotwall-entropy-audit-v59.test.ts
```

The inspected receipt records exit code 0, all 14 tests passed with no skips,
633 inputs, and source verified before/after at SHA
`101528bdcfc32ba47831fd95509116c91c1878881e75194a6a2dffeffd4e6ea1`.
This is inspected central safe-dev evidence, not a claim of a duplicate run by
this reviewer. It includes all three authored UI/scenario checks, adaptive
off-knot continuation with metadata removed, accepted fine-half ledger/phase
checks, tolerance contraction, and inherited event/entropy controls.

Follow-up source tracing confirms rejection restores species, gas/solid energy,
rotor momenta, phase/energy ledgers and resolution maxima; rejected candidates
are not appended to history. Accepted half/end knots feed existing sampling.
Event endpoints are captured after applying current, preserving right continuity.
`timeControl.startTimeS` identifies the resumed segment; counters/max accepted
ratio describe only that segment. Missing prior `timeControl` is permitted
because canonical accepted state and operation accuracy policy own continuation,
whereas this optional summary is diagnostic.

No blocking integration/history defect was found in this follow-up source review.
The focused suite does not establish the full hot-wall spatial/time matrix,
browser behavior, export source hashes, required final build/typecheck, or all
slider-domain accuracy; those remain separate parent-owned verification gates.

After the parent identified the tighter qualified candidate, the UI's fixed
refined tolerances were updated to `2.5e-6` relative and `2.5e-7 K` absolute.
Model info now adds one conditional diagnostic item from accepted `timeControl`:
method, tolerances, accepted pairs, rejections, maximum accepted ratio and the
counter segment's start time, explicitly excluding the retained prefix.
The existing refined control help mentions slower runs. The UI test now asserts
the request kind/schema/transport flag and exact tolerance payload, plus the
initial/resumed diagnostic scope and its absence for interactive runs.
These later edits require a new central test receipt; the 14-test receipt above
documents the earlier source snapshot only.

The parent subsequently reported an independent Robin failure for the
`2.5e-6` / `2.5e-7 K` candidate: `0.100928 K` maximum absolute error exceeds the
unchanged `0.1 K` gate, even though that candidate passed the full-mixture
comparison. That negative result is retained rather than relaxed away.
The final coordinated UI choice is `6.25e-7` / `1e-7 K`; the parent reports that
its already-executed full-mixture and Robin controls both pass, at about 63 s
for the full-mixture VM run. This reviewer changed the fixed UI payload and
matching test expectations only and has not independently executed or inspected
those new scientific receipts. The final policy still requires a fresh central
UI/regression receipt and source identity verification. The later UI receipt
below supplies that regression evidence for its recorded snapshot.

## Large-history export and final UI regression evidence

The actual storage campaign exposed a second concrete boundary: the 31,791
accepted checkpoints serialize to `1,408,211,301` bytes, exceeding V8's
`536,870,888` single-string limit. This reviewer opened
`scientific/fixes-v43/hotwall61-export-size.receipt.json` and its log: exit code
0, source verified before/after, 640 inputs, SHA
`e4861889f9005957550dcc031055b9936debdf07183e69334390dd641fddd630`.
The old export created the full JSON string before constructing its Blob, so
valid accepted physics could still fail to export. In simple terms, the file
was too large to fit into one JavaScript string.

`src/fuel-export.js` now chunks only the fuel root/result/transport path and its
checkpoint/snapshot arrays. Ordinary properties retain native serialization and
ordering. Each history state is immediately converted to a Blob; the parent
Blob retains byte chunks instead of an aggregate JSON string. The UI still
exports accepted result/provenance under the same schema, filename and MIME
type, with every accepted knot. This narrow fix avoids changing file formats,
discarding checkpoints, or introducing a general serialization framework.

Tests were authored before this production change. This reviewer opened
`hotwall61-export-before.receipt.json` and its failure log: expected missing
helper, exit code 1, 642 verified inputs, SHA
`8fd5c702b8ae7923a7fa75d4151d73f7af2f64edb8cf9346aa7e6c9ed44d6507`.
The two new export regressions compare exact Blob UTF-8 bytes against native
JSON for ordinary/undefined/sparse-array cases and instrument stringify/Blob
calls to reject whole-history serialization or deferred accumulation of state
strings. The existing UI export test also checks accepted-result ownership and
provenance while replacement work is pending.

The inspected `scientific/fixes-v43/hotwall61-ui-green.receipt.json` and full TAP
log record **44 passed, zero failed/skipped**, exit code 0, 643 inputs, source
verified before/after at SHA
`a0c386a796aed15e50dc6e0d7fc6958fe5d2529a4394b16ae65224eec52e0373`.
The exact command was:

```
node --import tsx --test tests/fuel-export-v61.test.ts tests/large-history-plots-v61.test.ts tests/responsive-plots-v38.test.ts tests/graphics-fidelity-v28.test.ts tests/playground-audit.test.ts tests/audit-product-v7.test.ts tests/fuel-centrifuge-ui-v44.test.ts tests/hotwall-adaptive-ui-v61.test.ts
```

This includes both export tests, the three adaptive UI/scenario tests with the
final `6.25e-7` / `1e-7 K` policy, and adjacent accepted-export, cancellation,
playback, responsive plot and 32,000-sample plotting controls. It is inspected
central safe-dev evidence; this reviewer did not execute the suite.

The parent reports the final 19-command gate is underway on frozen application
source. Its candidate campaign source now constructs the Blob for the actual
full accepted transport history, checks its size against independently summed
per-state JSON bytes, streams all chunks into SHA-256, and checks the byte count
without calling `Blob.text()` or parsing one giant JSON string. This reviewer
inspected that source path but has not yet inspected a completed final-gate
receipt. Final build/typecheck, emitted-worker branch evidence, large-Blob
stream/hash output and deployed browser verification remain unclaimed here.

## Browser export failure and responsive compressed preparation

The C browser evidence supersedes a VM-only Blob success as a usability claim.
This reviewer opened `adaptive61c/browser/accepted-model-info.txt`: the actual
deployed UI reports 256 cells, 512 nominal intervals, 31,790 retained intervals,
15,895 accepted pairs, 7 rejected steps and maximum accepted ratio 0.824, with
the final tolerances. The parent also reports successful 1280/390/320 viewport,
playback, GPU and six-curve inspection. Those observations do not certify export.
The parent reports two failed large uncompressed export attempts: no download
event within 120 s for a programmatic click, then a native input dispatch timeout
at 45 s. A small Interactive native export succeeded in the same browser.
The C evidence and failed attempts remain retained.

The second root cause is synchronous preparation: avoiding one oversized string
still left thousands of Blob constructions and the complete 1.4 GB uncompressed
byte backing inside a click handler. In simple terms, the file fit the Blob API
but preparing it froze the browser. A VM allocation/stream smoke cannot establish
that a live browser click remains responsive.

The smallest coherent correction keeps synchronous Interactive `.json` exports
and uses `.json.gz` / `application/gzip` for an accepted `timeControl` history.
Both paths consume the same bounded native-JSON piece generator. The refined
path feeds each encoded piece directly to native `CompressionStream('gzip')`,
drains its reader concurrently with writes to respect backpressure, and yields
real browser tasks initially and after each 1 MiB batch. Only compressed chunks
are retained for the final Blob; no aggregate uncompressed Blob is constructed.
There is no format fallback or arbitrary file-size cutoff.

The existing Export button is disabled and says Preparing during compression.
Errors use the existing status. Setup changes, replacement runs and disposal
abort preparation; accepted-result/revision checks reject stale completions.
Object URLs are revoked on disposal, replacement, errors after creation, or the
normal download cleanup timer. This preserves accepted-state ownership while
keeping the new behavior confined to export preparation.

New tests cover gzip decompression to exact native JSON UTF-8 bytes; unchanged
legacy synchronous JSON; a zero-buffer identity TransformStream that would
deadlock if reading were deferred; repeated task heartbeats; rejection of an
uncompressed intermediate Blob; already-aborted signals; asynchronous UI filename,
payload and Preparing state; stale/disposed completion suppression; URL cleanup;
and visible codec failure without a JSON fallback. This reviewer authored these
checks but has not executed them. The reviewer subsequently opened the central
`hotwall61-gzip-focused.receipt.json` and TAP summary: all 28 tests passed,
zero failed/skipped, exit code 0, 645 verified inputs, SHA
`a0fd93669afa1385a8d364912dc9a9f7d36e33e317b0688fa39d737230e31119`.
The command was `node --import tsx --test tests/fuel-export-v61.test.ts
tests/hotwall-adaptive-ui-v61.test.ts tests/fuel-centrifuge-ui-v44.test.ts`.
An additional mid-stream cancellation control was then authored: the second
serialized checkpoint triggers abort while its write promise is pending, and
the test requires AbortError, both stream-side cancellations, settled write,
and zero output Blob constructions. That later test needs a new receipt.
Parent-owned final D VM checks and the actual compressed browser export remain
required before claiming this correction works end to end.

Adjacent execution tracing found a concrete error-visibility issue before final
freeze: the registered `animateGas` frame callback overwrites status on every
frame. A compression error could therefore disappear immediately while playback
continued. The active export's error catch now pauses and updates playback before
setting the error, matching the existing current-intervention failure pattern.
The regression starts the real viewer callback, triggers a codec failure and
attempts its next frame, requiring the error to remain visible, the animation
callback to be removed and physics request count to stay unchanged. This is a
focused lifecycle fix rather than a new sticky-status policy. The mid-stream
abort and playback-error controls are later than the 28-test receipt and await
the parent's refreshed narrow gate.

## 2026-11-10 closeout: downloaded history verified

This reviewer inspected the saved D browser `download-observed.json`,
`transfer-receipt.json` and `verification.json`. They record an actual CUA
download of `487,617,620` compressed bytes, retained as
`scientific/centrifuge-v44/adaptive61d/browser/refined-download.json.gz`, with
verified guest-transfer SHA-256
`449703e8ff16c13881f5428a97a39ec5dee24d5c1092adebc1b6677613f8cb20`.
The preceding click timeouts and observation windows did not establish a failed
download. No additional application download fix was needed. The earlier C
uncompressed-export failures remain separate negative evidence.

The first downloaded-file audit failed before scientific checks because
`ijson.items(..., use_float=True)` overflowed on the valid integer
`354631197412543370000` in `fuelCycle.burnTritonsS`. The inspected original
receipt/log retain exit code 1. The minimal auditor correction uses default
arbitrary-integer/Decimal parsing and converts Decimal values to binary64 only
inside the selected metadata record or current checkpoint. In simple terms,
the parser had rejected a valid exported number; the file was not malformed.
This reviewer independently traced the correction: exact integer counters remain
integers, histories remain streamed, and scientific tolerances are unchanged.
The inspected parser regression passes plain and gzip fixtures containing that
integer, alongside malformed-stream, canonical-field, ledger and negative-residual
controls.

`scientific/fixes-v43/hotwall61-browser-export-audit-v2.receipt.json` and its log
record exit code 0 in `96.061` s, all `31,791` knots consumed through valid EOF,
256 cells, 512 nominal intervals, 15,895 accepted pairs and 7 rejections. All 40
producing source files match, with source hash
`a13a2f09e7316019a0cb3fb7b7f1241a179728c10ee347c47ec8a64d4c080270`.
Canonical gas fields, mass-weighted rotor state, endpoint phase quadratures and
independently reconstructed global ledgers pass. Maximum reconstructed relative
errors are `5.33e-15` for species normalization, `2.28e-14` for angular momentum,
`2.59e-14` for mechanical energy and `1.05e-13` for thermal energy.

The audit, parser regression and inspected `hotwall61-post-audit-final` receipt
all identify 645 inputs at SHA
`4b8502fbfbf7e07496068c29a7e63b1c78db17cb4225cb163eeffbc60eb65904`,
verified before/after, exit code 0. The latter runs Python `test_*.py` discovery
in `scientific/hotwall-adaptive-v61` (**10 passed**), `npm run typecheck` and
`npm run build`; the build retains its reported large-chunk warning.
The earlier refreshed `hotwall61-gzip-final-focused` receipt/log also verifies
**30 passed**, including the previously pending mid-stream abort and playback
error controls, at its distinct SHA
`3e6c57102c97b52b88940dd99f7c694a6f62dd45b7ee222c23ee68b04849865f`.
The D final receipt and test log record **1,200 passed** plus successful required
gates at that earlier snapshot; its release SHA matches the browser record.
The inspected post-audit `hotwall61-release-identity` receipt/log verifies all
151 regenerated release files are byte-identical to D, release SHA
`889256c3ef8ae80b934786f1dec45f4b5f1d9a06f39dd787d0245df11390a56d`.

This closes the export/history verification gaps above using inspected
parent-owned safe-dev and browser artifacts; this reviewer ran no project or
browser checks. Approval for this reviewed scope does not extend the scientific
claim: the streaming audit does not independently invert solid enthalpy or
establish local flux accuracy, continuum convergence, phone performance or
calibrated hardware behavior.
