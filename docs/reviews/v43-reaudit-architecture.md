# v43 architecture, provenance and lifecycle re-audit

Status: software re-audit passed on the final-zoom snapshot. No blocking finding
remains in the assigned architecture/provenance/lifecycle/camera paths. The
reset-to-zoom-out regression below is corrected and freshly verified. This reviewer made
no product edits and ran no project code or VM operations. Root performed isolated
execution; this reviewer independently read logs and hashed source/release bytes
using trusted Python standard-library operations without importing project code.
The current accepted snapshot is `final-zoom`, recorded at the end; it supersedes
the earlier final-success, final-live and interim final-camera snapshots.

## Contract and execution paths inspected

- v42 central report and detailed reproducibility/tooling findings; global
  `AGENTS.md`, implementation-choices-audit skill and safe-dev README.
- Main source selection → worker client → worker solver dispatch → revision
  admission → accepted `latest` result → download. Adjacent value-only clients
  include comparison, radial/timestep refinement, orbit studies and coupled target.
- Initial experience selection and view changes → legacy rendering visibility;
  fields/path generation, picking, camera reset and renderer resource ownership.
- Marathon source update → target worker plus reference exposure/loading adapters;
  parent/nested disclosure activation, dirty state, numerical comparison and export.

## Source review: no remaining blocking finding in assigned paths

### Producing-code identity

The original downloads recorded inputs and results but no unique producing
solver identity. Technically, the generic model version was independent of the
worker build. Simply, a saved answer did not identify its calculator.

`workerIdentityPlugin` obtains the actual worker module graph from Vite, hashes
its local source files plus package/lock/build configuration and plugin source,
and injects the deterministic identity into the worker. The worker sends that
identity beside its result. `requestSimulationWithIdentity` validates/clones it;
the existing result-only API delegates to that API and returns only the result,
preserving study/refinement/comparison consumers.

The actual `main.run` requests the identity-bearing reply and binds it to
`latest` only after the existing revision admission. Download serializes that
accepted object. The coupled-target default request similarly binds identity to
its own accepted history while retaining the existing injected request shape.
Its selected-time export uses the accepted history's identity. Missing/malformed
metadata serializes as null; old/unbundled artifacts gain no invented source.

This is the right ownership boundary: the producing worker identifies itself,
and acceptance carries answer plus provenance together. A UI-current constant,
timestamp or manual version bump could attribute an old answer to newer code.
No solver equations or legacy RNG identity are rewritten.

### Lazy legacy scene

The original app created its legacy renderer/environment/model even when a
different apparatus was displayed. Technically, global startup owned a
view-specific resource. Simply, opening one display prepared an unused second
display.

The new explicit level/model/view predicate gates initialization; concurrent
first visits share one pending creation, and hiding before the queued creation
rechecks that predicate. Deferred fields/paths build from current settings and
the latest accepted orbital result. A failed attempt disposes scene, renderer,
controls, observer, environment and keyboard ownership and permits retry.
An in-progress initialization may finish after switching away and is retained
for reuse, but visibility and animation gates prevent it displaying the wrong
view. This is deliberate cached ownership, not cancellation of a started load.

One preliminary failure-path issue was found and corrected during this review:
block-local RoomEnvironment/PMREMGenerator resources escaped cleanup if
environment generation threw. The final code encloses PMREM construction and
generation in immediate try/finally, disposing both temporary owners. This is
preferable to swallowing GPU errors or permanently disabling retries: it
restores the lifetime invariant at the allocation site.

Keeping the existing Three renderers, worker boundary and plain UI adapters is
appropriate for these fixes. No demonstrated requirement calls for a framework,
GPU physics rewrite, generic scheduling layer or backend service.

## Reference computation changes inspected

The current reference adapters retain the newest source, clear the cached result
on input invalidation and defer numerical work until active/open or export demand.
Exposure and Loading retain distinct visibility boundaries: Exposure follows the
parent References disclosure; Loading additionally follows its own disclosure.
Loading preserves both original and tighter-tolerance solves. Export calculates
dirty state before serializing the current source/settings. This addresses the
actual unnecessary synchronous work without changing equations or tolerances.

`tests/reference-controls-v43.test.ts` exercises the production adapters and
Marathon DOM wiring with numerical call counters and serialized Blob contents.
Its closed-source change, clean reopen, dirty export, null-source invalidation
and nested-loading cases are meaningful behavioral regressions. These tests are
present; their successful execution has not yet been evidenced to this reviewer.

The source energy scan remains immediate; this review does not infer a measured
browser responsiveness improvement, a zero-cost closed path, or any physical
qualification from the deferred reference behavior.

## Regression depth inspected

- `identity-renderer-v43.test.ts` builds a real Vite worker fixture, executes the
  emitted handler, independently hashes a transitive solver file and aggregate,
  checks repeat-build determinism, and changes source then lock to require new
  identities. It executes the actual extracted main run/download callbacks,
  including two deferred distinct-identity replies arriving newest then obsolete;
  the pending export is disabled and the accepted download stays newest.
- The same file executes the actual extracted scene initializer with injected
  graphics boundaries. Environment, GLB and compile failures require disposal;
  successful deferred creation hydrates current fields and accepted paths.
  The lazy helper tests additionally exercise unused levels/models/views,
  concurrent first use, hiding before queued creation, reuse and retry.
- `coupled-identity-v43.test.ts` drives the default Worker/client path with the
  real target solver and captures the actual exported Blob. Moving selected
  time preserves producing identity; changed inputs disable export until the
  next acceptance; absent/malformed metadata remains null.
- Existing `integration-review-v38.test.ts` drives the production coupled
  orchestration with deferred requests: stale middle completion stays obsolete,
  the newest source/config accepts atomically, and invalid input clears state.

These are behavioral CPU/DOM/bundler checks rather than source-text assertions.
The injected graphics tests do not execute browser shader compilation or measure
GPU memory. Root's production emitted-worker dispatch after the required build
additionally confirms that the actual application entrypoint is identity-bound.

## Fresh final evidence and independent integrity checks

This reviewer reopened `scientific/fixes-v43/final/receipt.json`, each extracted
command log, `final-success.receipt.json`, `final-success.inputs.json`, the final
runner, and the actual emitted-worker witness script. The runner verifies the
source manifest before and after every command and moves the prior generated
release aside before building, preventing an old worker from satisfying the new
worker witness. The receipt identifies guest source `/work/home/fix-v43-source`.

Independent read-only byte hashing found:

- All 495 available canonical inputs match the 497-entry tested manifest; only
  the two declared guest-only old final-gate runners are absent on the host.
  Every assigned product/test/build entrypoint is included and matches.
- Input aggregate:
  `15f25d8fec054eb3e0d25f4efd2601054fb782c5be3033fb485a02485cdf66b1`.
- All 148 extracted checked-release members match, with no extra/missing members.
  Release aggregate:
  `5531ce3c3ec3835fb1c8c3207f376c789cb2f2c470228c8cea6e381c020c8421`.
- The emitted worker's recorded artifact digest matches the checked-release
  worker. All 31 producing-code source-map digests independently match canonical
  bytes, and the source-map aggregate recomputes to
  `4a70790287edd574c249a874628c46a0134e38900338698c961a27f77fa88cb6`.

| Fresh isolated command | Observed result |
| --- | --- |
| `npm test` | Exit 0; 864/864 pass; zero fail/cancel/skip/todo |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0; retained nonfatal large-chunk warning |
| `npm run check:site` | Exit 0; explicitly resource/parse checks |
| `npm run check:assets` | Exit 0; GLB v2, 176 meshes, PNG 1600×1000, scene present |
| `node --import tsx scientific/fixes-v43/verify-release-worker.mjs` | Exit 0; actual emitted orbit dispatch, one particle/species, identity and every source digest verified |
| `python3 docs/reviews/v42-collision-data-probe.py` | Exit 0; saved-data reconstruction retained the unresolved qualification decisions |

Relevant raw TAP entries include the real Vite fixture at test 462, identity
retention at 463, lazy concurrency/retry at 464–465, actual main acceptance/export
at 466, actual deferred initialization at 467, default coupled identity at 264,
and reference deferral/export at 672–674. These are corrected-behavior tests,
unlike the earlier v42 defect-reproducing witnesses.

## Remaining limits

The receipt explicitly records `browserVerified:false`; deployment/browser
reopening follows separately. This review does not certify WebGPU shader/device
behavior, mobile memory, frame/input latency or live-origin resource delivery.
Static renderer imports and two empty CPU groups remain at startup; the change
removes unused renderer/environment/GLB initialization, not every rendering byte.
The energy scan still runs synchronously. None of these changes qualifies the
scientific models or changes retained UNKNOWN/withheld physical conclusions.

Earlier failed/test-tooling attempts remain retained by root. This approval is
based on the fresh final-success snapshot and logs above, not those attempts or
historical v41/v42 green suites. There is no Git metadata in this review target;
the manifest-bound edited snapshot, rather than a rebased commit, was reviewed.

## Final live heading correction and renewed acceptance

Live review exposed a startup heading regression. `top.append` moved the
learning-path parent out of the document before the code queried its `h1`.
Technically, a document-scoped query then returned null and `append(null)`
inserted a text node. Simply, the app moved the heading's container and then
searched its old location. The fix captures the existing heading reference
before reparenting and appends that same node. This is the smallest ownership
correction: no duplicate heading, alternate selector or missing-heading fallback
is needed. The actual workspace startup test now checks the original `h1` is
the shell's first child before experience initialization and rejects stray text;
all four experience transitions retain the one named main landmark/heading.

This reviewer reopened `scientific/fixes-v43/final-live/receipt.json` and all
seven command logs, then independently compared both tested source manifests.
Only `src/workspace-ui.js` and `tests/workspace-v43.test.ts` changed. Every
available input still matches; the same two declared guest-only runners remain
absent on the host. All assigned provenance/lifecycle paths are byte-unchanged.

The final-live source aggregate is
`39809a3e6a2cb6e9144d0ff39988a3f5a6e92420d1f7143f7436bfe7a1dd94b5`.
The 148-member checked-release-live directory has exact matching membership and
bytes, aggregate
`c70470dbe2972fe1f935ccd22484dd23bc77fb209788c3fd4b780790273c2f38`.
The emitted worker artifact hash is unchanged; all 31 producing-source digests
and their aggregate independently reverify. The actual emitted dispatch passes.

The renewed full suite passes 864/864 with zero failures/cancellations/skips/todo.
Typecheck, build, site, assets, emitted worker and saved-data reconstruction all
exit zero. The known nonfatal build-size warning remains. Software acceptance
therefore applies to this final-live snapshot. The receipt still separately
records `browserVerified:false`; actual live interaction evidence belongs to
the browser review and is not inferred from these gate logs.

## Subsequent camera review: zoom headroom blocker

The legacy first-use fit now uses loaded hardware bounds and the limiting
horizontal/vertical field of view, resolving the narrow allocated-stage clipping
mechanism. Resize scales the target-relative offset and orbit limits by the fit
ratio, preserving panned target, orbit and relative zoom; keyboard controls use
the current limits. The added production-helper/initializer tests meaningfully
check projected corners and hidden-size behavior.

However, source inspection found a new adjacent interaction regression:
`resetCamera` set `maxDistance = max(10, fitDistance)`. For narrow layouts whose
fit exceeds 10, reset places the camera exactly at that maximum. Immediate '-'
then cannot zoom out. Technically, the new initial radius saturates the upper
orbit bound; simply, the user starts at the far end of the zoom dial. The test
pressed '+' before '-', so it proved recovery of prior zoom but missed this
reset-state boundary. Root agreed this needs correction before final acceptance.

The smallest fix preserves meaningful reset-to-upper-limit headroom relative to
the fitted distance and adds immediate '-' from narrow reset. This retains the
original navigation contract without abandoning aspect-aware fitting or widening
the limit through a context-free fallback. The implementation owner is applying
that correction; this reviewer made no product edits.

The interim `final-camera` receipt itself passes 865/865 and all seven commands.
Independent hashing confirms its 497-entry source aggregate
`1dd398c165c48b87891e6dcbed0fe7c85336ba160313ae38b60803242f26b38f`,
all available input bytes, all 148 exact release members with aggregate
`144e60dfabaf733fc5319e21c883834c0dd97bb1d13155fd74e936cfd3e1b582`,
and the unchanged worker artifact plus all 31 producing-source hashes. Only
`src/main.js`, `tests/identity-renderer-v43.test.ts` and
`tests/playground-audit.test.ts` changed from `final-live`. Those passing gates
do not discharge the newly identified interaction boundary.

## Final zoom-headroom correction and current acceptance

The owner corrected the actual boundary: reset permits an upper orbit distance
of `max(10, 2*fitDistance)`, and both reset and resize give the far plane room for
that permitted range. Resizing scales the target-relative camera offset and
orbit bounds together. Immediate '-' from the fitted reset can now increase the
radius; subsequent orbit/pan/zoom and round-trip resize retain their framing.
This preserves fitted visibility and useful zoom navigation with a small local
correction rather than reverting the fit or weakening unrelated geometry checks.

The actual initialized scene regression invokes its registered keydown handler
with '-' before any '+' and requires outward growth within the orbit/far bounds.
The production helper test independently checks the same initial boundary,
projected hardware corners, and panned/orbited/zoomed resize continuity.

This reviewer reopened all seven `scientific/fixes-v43/final-zoom/` command logs
and receipt, then performed trusted read-only integrity checks. All 495 available
canonical inputs match the 497-entry manifest; the same two declared guest-only
runners are absent. The source aggregate is
`5d33233f0a960682f6c3308aa5f3bb8a33a864e5cfc301ad2a4af288168b6c48`.
Only main and the two camera regression files changed from interim final-camera.
All 148 checked-release-zoom members and bytes match, aggregate
`02817e4029b3aecc24fed8c09a0a4bcd5ed66f6cd8a18171eef15ee4b8145a28`.
The worker artifact remains unchanged; its 31 source-file digests and aggregate
independently match. The actual emitted-worker dispatch still passes.

`npm test` passes **865/865**, with zero failures/cancellations/skips/todo.
Typecheck, build, site, assets, emitted-worker and saved-data reconstruction all
exit zero on the same manifest-bound source, verified before/after each command.
The known nonfatal chunk-size warning remains. The camera blocker is resolved;
software acceptance now applies to final-zoom. Deployment/live interaction proof
remains separately root-owned and is not inferred from these offline gates.
