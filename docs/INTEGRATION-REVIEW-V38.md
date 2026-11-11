# Independent UI integration review — v38

## Findings and verified fixes

1. **Rejected linked geometry could still reach a solver.** The capture-phase
   density-link listener reported a failed derived-control domain check but
   originally left the edited coordinate changed. The existing bubble-phase
   source/target listener could then calculate a pair inconsistent with the
   claimed fixed density. Simply, the warning did not undo the rejected edit.
   Root's fix restores both last valid range coordinates before notifying the
   existing listeners. Regression observations show every notified pair retains
   the linked density. This keeps the native solver input path and rejects the
   bad edit rather than silently clamping a physically different scenario.

2. **Deferred loading could repopulate a disposed apparatus.** The wrapper
   awaited a model load and then applied state/selection without checking
   disposal. Simply, a late model could finish after its window had gone away.
   Root added post-await disposal/instance checks and disposed guards to the
   real viewer's state methods. A deferred-load regression confirms that no
   state, pending flag or selection is applied after disposal. This directly
   protects the existing lazy lifecycle without introducing a second loader.

3. **Component Parameters could focus controls inside collapsed details.** The
   original workspace helper opened Plots but did not expand the two details
   ancestors of the neutron thickness slider. A real browser cannot focus that
   hidden slider. `focusRelated()` now opens the existing ancestor details
   before scrolling/focusing the original element. Regression checks both
   expanded ancestors, original node identity and focused element. Reusing the
   native disclosures avoids duplicate controls and a separate inspector form.

4. **Pin could attach new draft controls to old accepted curves.** The baseline
   update already captured its accepted scenario, but Pin unnecessarily called
   capture again. Root now pins `current` unchanged. A regression changes the
   capture callback's draft after update and verifies that Pin and Restore keep
   the accepted 100 keV scenario with its curves, not the 200 keV draft. This is
   smaller and more reliable than relying solely on all callers' pending guards.

5. **Centrifuge shortcuts used a generic reduced-model destination.** Source
   tracing identified `parameter-magneticT`/`parameter-voltage` destinations for
   a centrifuge that uses separate equilibrium controls. Root replaced these
   with explicit closure-aware component destinations. This mapping was inspected
   in the checked snapshot; the new independent dynamic regressions above focus
   on the lifecycle, provenance, material and native disclosure paths.

The existing Marathon integration assertion that a valid pending edit clears
the target was updated to the requested v38 behavior: the same accepted result
and neutron output remain visible, status says previous completed scenario,
export is disabled, and a newly accepted result atomically replaces them with
the changed replacement probability. Invalid inputs still clear dependent
models, as checked separately.

## Evidence and exact snapshot

All project execution occurred in Apple safe-dev for
`/tmp/mass-spinner-integration-v38`. Its source is a copy of the canonical v36
checked inputs plus the current `src`, `index.html`, and named v38 tests. It has
no host mounts, credentials or forwarded services. The guest was initialized
after the frozen stage was prepared; no later host edits were assumed live.

Manifest: `/tmp/mass-spinner-integration-v38/tested-integration-v38.json`

SHA-256: `58e9d6931cf0d409431244a1f355970864c1591d28182983fd3ff1549deaa9e7`

Follow-up workspace UI SHA-256:
`fdf8633244843488a38c09268353d9bf36a0cdae1152d1bc2503d7f8aeb99f30`

New integration regression file SHA-256:
`17bc2f92e0aa96aa703088bf4b739fd9ffaa9fa4c39dbb3972a59c5f03ce957e`

Commands and observed results:

1. `safe-dev -C /tmp/mass-spinner-integration-v38 init` — copied 414 files,
   including the manifest, approximately 89.3 MiB.
2. `safe-dev -C /tmp/mass-spinner-integration-v38 run --online -- npm ci --ignore-scripts`
   — installed 54 packages; audit reported zero vulnerabilities.
3. `safe-dev -C /tmp/mass-spinner-integration-v38 run -- node_modules/.bin/tsx --test tests/integration-review-v38.test.ts tests/marathon-integration-v35.test.ts tests/workspace-v25.test.ts tests/workspace-layout-v38.test.ts tests/apparatus-state-v38.test.ts tests/apparatus-3d-v24.test.ts`
   — **42 tests passed, zero failures/skips**, approximately 3.35 s test duration.

The new integration suite also verifies the accepted selected-time cell arrays
and plain source configuration used by `targetSceneState`: exact beam energy,
area, film-cell temperature and selected time; pending retains that snapshot,
whereas invalid material input clears it and neutron output. GLB parsing and
viewer adapters verify finite geometry, PBR resources, picking/camera/lifecycle
logic; these are CPU checks, not a real renderer.

No new correctness regression remains in the exercised paths. Full integrated
typecheck/build and deployed desktop/mobile GPU verification remain the parent
task's gates. No browser policy was bypassed. The visualization represents
accepted 1D cell averages in an explicitly expanded conceptual cutaway; exact
beam area/energy are metadata, not a computed 3D beam envelope or lateral
temperature field.

## Follow-up: precision editor composition

Root identified a further integration defect after the 42-test checkpoint:
the target's generic `settings.querySelectorAll('input[type=number]')` admission
check also included the new optional precision editors. Their uncommitted empty
drafts have `NaN` numeric values, so adding exact-entry UI could invalidate an
otherwise valid solver configuration forever. Simply, unfinished popup text was
being treated as a committed physical coefficient.

Root replaced the broad DOM query with the target's registered `numericInputs`:
the actual number controls consumed by `readConfig()`. This is the correct
ownership boundary. Making drafts default to plausible numbers or excluding
only currently hidden controls would leave admission dependent on presentation
state and would not distinguish a committed coefficient from an uncommitted
edit.

The independent follow-up runs real `setupPreciseControls()` together with
`setupMarathonModels()`, not separate mocks of their UI. It verifies empty
optional drafts remain harmless; invalid Apply leaves accepted state unchanged;
an exact replacement probability of `0.123456` reaches the target request; an
exact subsequent source energy of `123.456` keV aborts the older request; stale
completion cannot replace the prior accepted sample; latest completion matches
both committed settings atomically; a real empty diffusivity coefficient still
clears the accepted target and disables export. Deferred request adapters run
the real target solver when resolved, without claiming browser Worker/GPU proof.

This follow-up uses a fresh isolated stage with current source/tests:
`/tmp/mass-spinner-precision-integration-v38`. Manifest:
`/tmp/mass-spinner-precision-integration-v38/tested-precision-integration-v38.json`

SHA-256: `c2f6e46f5972417cda9b02c9d35c52f882998c14dbfd51d17ef9407a66a38b02`

After `safe-dev init` and `run --online -- npm ci --ignore-scripts`, the offline
gate was:

`safe-dev -C /tmp/mass-spinner-precision-integration-v38 run -- node_modules/.bin/tsx --test tests/integration-review-v38.test.ts tests/marathon-integration-v35.test.ts tests/precise-controls.test.ts tests/scenario-state-v38.test.ts tests/apparatus-state-v38.test.ts tests/workspace-v25.test.ts tests/workspace-layout-v38.test.ts`

Observed: **47/47 passed**, zero failures/skips, approximately 4.21 s. No new
correctness issue was found in this exercised composition path. The previous
42-test manifest remains an explicitly earlier checkpoint, not the final source
snapshot.
