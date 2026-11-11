# Second audit: UI, workers, plots and reproducibility

Reviewed 6 November 2026 against the version-7 source. This review inspected the actual paths and ran source-unit regressions; it did not use a browser, inspect GPU output, access the deployed origin or independently rerun the transport convergence experiments. The parent owns the final full-suite/typecheck/build and publication gates.

## Findings corrected in this pass

### P2: constant scientific curves lost their physical display scale

**Problem.** A constant `2×10⁻²³ kg m²/s` curve produced y ticks `−1, −0.5, 0, 0.5, 1`, visually collapsing a nonzero quantity to zero. The issue also applies to an actual zero-ion-rotation Gaussian equilibrium: its omitted-electron-inertia ratio is constant and small but nonzero.

**Technical cause.** `laboratory.js/renderPlots` padded a constant y domain by `max(1, |y|×0.05)`. The one-unit lower bound is dimensionally arbitrary across SI momenta, currents, field estimates and dimensionless diagnostics. The data/readout were retained, but the plotted magnitude was obscured.

**Simple explanation.** A ruler spanning two whole units cannot show a quantity that is many orders of magnitude smaller.

**Fix.** Nonzero constant domains now receive relative 5% padding, with the smallest representable positive padding as the numeric lower bound. Identically zero curves keep the existing finite `[-1,1]` fallback. Nonconstant domains, uncertainty bands and grouping are unchanged.

**Why this choice.** It preserves native units and the normal plotting path, rather than hiding constant curves, inventing a unit-specific scale table, normalizing away the physical magnitude or changing all chart limits. Regression coverage executes the actual SVG generator for positive/negative tiny constants and an actual Gaussian equilibrium → presentation → inertia curve, and checks unchanged zero behavior.

### P2: failed worker submission leaked the created worker

**Problem.** A synchronous `Worker.postMessage` failure rejects the promise automatically, but the newly allocated worker and abort listener were not released. A fault-injected `DataCloneError` reproduced zero termination calls; aborting later would only then clean up the leaked task.

**Technical cause.** The wrapper cleaned up asynchronous worker/model errors and cancellation, but called `postMessage` outside a cleanup-protected submission boundary.

**Simple explanation.** Failure to send the job left its unused worker running.

**Fix.** Synchronous submission errors now invoke the existing cleanup routine and reject with the original error. The regression verifies one termination and that a later abort does not terminate again, demonstrating removal of the abort listener.

**Why this choice.** The existing worker ownership invariant is enforced at the missing failure boundary. No retry, alternate worker or replacement error is introduced. Normal completion/cancellation and model-error behavior remain covered by adjacent tests. This is a proven resource-failure path; ordinary current UI settings are serializable, so this review does not claim that normal users were repeatedly triggering `DataCloneError`.

## Paths and invariants checked

- **Single run:** actual control mapping → main `config/calculate` → dedicated typed worker kind → solver result → plots/metrics/assumptions → private `latest` snapshot → version-7 run export. The main module was source-traced, not executed in a browser.
- **Kinetic isolation:** `doublewell-dynamics` does not dispatch as the fixed-Pθ landscape. Orbit hardware, hidden orbit-frequency output, independent-ion uncertainty studies and the unrelated half-step action are suppressed. The actual dynamic controls execute through the real kinetic engine in the source-unit suite.
- **Stale study results:** changing settings or cancelling aborts the current study, clears its private export state, and prevents a late worker from rendering or exporting partial/stale output. An obsolete study settling during a newer run cannot release its buttons. Existing tests execute these deferred-result paths.
- **Undefined quantities:** actual plots break across missing values/bounds. Missing uncertainty segments do not bridge gaps. Empty populations remain undefined rather than acquiring zero means. Plot omission of an entirely undefined series remains a presentation limitation, not a fabricated zero result.
- **Compare/refinement:** comparisons use independent configurations and model-specific observables; input invalidation suppresses old revisions. Refinement compares the stored snapshot and reruns the bulk inverse at the finer grid. A new main run does not actively abort an already-running refinement worker; its old result is revision-suppressed, so this is avoidable resource use rather than a demonstrated stale-output bug.
- **Data compatibility:** main exports have modelVersion 7; the unchanged orbit-study format retains version 6, as documented. There is no persisted state or historical-file import/migration contract in the examined path. Configurations/results and the kinetic regime/torque metadata are retained.
- **Security scope:** examined control/error/result text is displayed with text nodes or numeric formatting; no new user-controlled HTML execution, credentials, backend account access or persistence was found in these paths. This is a limited source review, not a penetration test.

## Executed evidence

The new two-test regression initially produced **2 failures**: the ±1 tiny-domain axis and un-terminated worker. After the narrow fixes:

```sh
./node_modules/.bin/tsx --test tests/audit-product-v7.test.ts tests/worker-client.test.ts tests/study-ui.test.ts tests/doublewell-ui.test.ts tests/ui-contract.test.ts
```

**18 passed, 0 failed**. Ran under the user's existing scoped host exception after safe-dev was inaccessible, with `login:false`. No hooks, isolation settings, credentials or browser policy were changed. Only `src/laboratory.js`, `src/worker-client.ts`, `tests/audit-product-v7.test.ts` and this report were changed by this reviewer. Final project build/typecheck and remaining agents' changes are not retroactively covered by this narrow result.

## Next stages from the product/reproducibility side

1. **A reproducible coupled-convergence workflow, before more machine types.** Provide an explicit case artifact carrying physical settings, numerical resolution, seeds, model/build identity and raw outlet/flux/torque/regime data. Run an independent-seed × timestep × cell/particle matrix outside UI timing. Acceptance: no stale/partial result publication; complete case metadata; outlet/survivor/flux comparisons reported with seed variability and numerical bias kept separate; no independent-ion confidence interval attached to interacting particles. The spatial convergence decision itself belongs to the physics review.
2. **Promote numerical/model status beside results.** The exploratory notice is already prominent and local-regime status is present in assumptions/exports; a compact persistent status near plots would make unsupported/unresolved cases easier to recognize. Acceptance: a cooling/dense case is visibly unsupported, sparse/all-exited cases visibly unresolved/undefined, and successful integration cannot be mistaken for physical validation. Preserve the raw observations instead of silently clipping rates or replacing distributions.
3. **Reopen the exact deployed runtime once legitimate browser access is available.** Verify all seven selections, control response, successful/error/cancel paths, JSON downloads, narrow-screen plot legends and WebGPU/WebGL/failure presentation. Measure load/worker cost at declared supported resolutions. Acceptance requires actual deployed screenshots/interaction and native worker/download evidence, not another source-only harness. Effective policy currently denies that access; no alternative browser, CDP or origin fetch was attempted. This review does not resolve the policy conflict or claim fresh browser permission evidence.

The current ~1 MB renderer bundle and missing deployed browser/GPU verification are known limitations; they are not independently reproduced runtime failures here. Their prioritization should follow the transport correctness/convergence gate, while preserving a separately measurable browser release gate.
