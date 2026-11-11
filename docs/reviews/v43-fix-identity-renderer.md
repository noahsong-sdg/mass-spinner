# v43 producing-code identity and legacy-renderer lifetime

## Producing-code identity (audit finding 5)

**Problem and technical cause.** The production worker returned its answer through
`requestSimulation`, which discarded the response envelope. `main.run` retained
only model/settings/result, and the download serializer supplied the old constant
`modelVersion:10`. That version did not identify one immutable solver snapshot.

**Plain explanation.** Saved answers had their inputs but did not identify the
calculator that generated them.

**Fix and choice.** Vite's worker build now hashes the actual loaded module graph,
package and lock files, and the build configuration/plugin. The worker emits that
identity beside its result. A separate identity-preserving client entry point
lets the accepted main run retain the emitting worker's metadata; existing
result-only clients keep their contract. The download serializer carries the
accepted metadata. Old or direct-source results without metadata retain explicit
`producingCode:null`; the UI never supplies the current build to fill that gap.
The source hash is SHA-256 of the sorted path-to-file-digest map included in the
identity. This is code provenance, not a physical qualification claim or a promise
of hardware-independent bitwise arithmetic.

This uses the bundler's resolved graph rather than a separate import-regex graph,
a hand-maintained release number, or a timestamp. The identity travels with the
answer rather than being looked up at download time, so later UI state cannot
attribute an old result to a newer worker.

## Legacy renderer lifetime (audit finding 13)

**Problem and technical cause.** The startup tail called `initScene` regardless
of the chosen experience/view. Hidden-canvas checks occurred only after renderer,
PMREM environment, model load and shader compilation had already run.

**Plain explanation.** Opening the new apparatus, Marathon or Research still
started an older 3D viewer that the user could not see.

**Fix and choice.** The legacy scene now starts only for hardware/orbits/fields
views of rotating or ICR models at levels 1/3. Concurrent first-use requests share
one initialization promise. Hiding the view before queued creation prevents
allocation; hiding it during initialization does not start another initialization.
Successful setup is reused. Failed setup disposes renderer, controls, environment,
scene geometry/materials, observer and keyboard listener; a later eligible view
selection retries. PMREM/studio cleanup also runs when environment generation
throws. Deferred setup restores current fields and the latest accepted orbit
paths. Field/path geometry is deferred until the legacy scene exists; the two
empty CPU groups and static renderer imports remain present at startup.

The existing apparatus renderer, supported legacy views and renderer backend
selection remain intact. Matching lifetime to the established view boundary is
smaller than renderer consolidation or adding another rendering framework.

**First-use fitting follow-up.** Root's live browser first-use screenshot
`docs/reviews/v43-evidence/spinner-legacy-first-use.png` showed the legacy hardware
clipped at an approximately 460-pixel allocated stage. The old initializer fixed
camera distance before loading the hardware, then changed only projection aspect.
In plain terms, side windows narrowed the visible scene without moving the camera
back. The legacy initializer now fits the loaded hardware's bounding sphere using
the smaller horizontal/vertical field of view, retaining its original viewing
direction. Resizing scales camera-to-target distance and orbit distance limits by
the fitted-distance ratio, preserving the user's relative zoom, orbit and target.
The keyboard uses those same current limits; its former fixed maximum of 10 could
otherwise make the minus key zoom inward after a narrow fit beyond that distance.
The reset maximum is now at least twice the fitted distance, preserving outward
zoom headroom comparable to the old approximately 5.9 reset / 10 maximum ratio.
The far plane includes this maximum plus the geometry margin. Setting the maximum
equal to a narrow fitted distance would instead disable an immediate minus-key
zoom; the actual initializer regression invokes minus before any inward zoom.
This reuses the established apparatus fitting policy without changing that viewer
or introducing another camera system. Actual initializer/resize/keyboard handler
regressions cover narrow first use, projected containment, hidden dimensions,
relative framing and the greater-than-10 keyboard case.

## Adjacent integration owned in main

The numerical agent's radial-refinement helper is now used by both button state
and the actual click callback. At the supported cap no identical-grid computation
is launched; the status explicitly leaves convergence unassessed. Successful
comparisons name both distinct grids.

The visible fusion apparatus readout now receives Parameters/Results actions.
Generic inspector synchronization finishes before those actions are appended.
Apparatus-origin synchronization suppresses the generic notification and emits
one final action publication after the physical part readout has been written.
Generic selection still publishes once after replacing stale part content.

## Verification boundaries and requested gates

This agent read the safe-dev README and changed files only. It ran no project
code, dependency installation, tests, build, typecheck, or VM mutation. Root owns
the exact tested guest snapshot and execution receipts; this note does not claim
passing execution before those receipts exist.

New regression files:

- `tests/identity-renderer-v43.test.ts`: real Vite worker emission/execution;
  deterministic graph identity and solver/lock change sensitivity; identity
  retention and unidentified legacy downloads; view gating, concurrency and retry;
  actual extracted main run/download callbacks; actual extracted scene initializer
  with environment/model/compile failures and deferred accepted-path hydration.
- `tests/fusion-inspector-main-v43.test.ts`: actual main callback/setup wiring
  against real apparatus/inspector wrappers, visible physical-part metadata,
  one action bar, original parameter/results destinations, and generic selection.

Requested narrow command inside the root-controlled safe-dev snapshot:

```sh
npm exec -- tsx --test tests/identity-renderer-v43.test.ts tests/fusion-inspector-main-v43.test.ts tests/worker-client.test.ts tests/worker.test.ts tests/marathon35-worker.test.ts tests/radial-refinement-v43.test.ts
```

Root also runs the repository-required final suite/typecheck/build/site/assets
gates and an emitted production worker dispatch/identity check. Injected graphics
boundaries verify JavaScript ownership/cleanup; they do not establish deployed
WebGPU shader behavior or browser/mobile frame performance.
