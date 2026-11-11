# Interaction fixes, V38

## Pending target snapshots

**Problem:** every input emptied target plots, metrics and downstream neutron output before its replacement finished. **Technical cause:** `schedule()` reused `clear()` for cancellation, so debounce/pending and physical invalidation shared the same destructive transition. In plain terms, moving a slider threw away the previous answer while the next answer was still being calculated.

The UI now separates cancellation, pending, invalid and accepted states. Pending retains the last completed history, accepted source configuration and selected time, labels it explicitly, and disables export. The exact accepted source and target inputs are included in Balances. Invalid input/source and worker failure still clear live output immediately. An explicit export-phase guard also prevents synthetic clicks from exporting a retained stale snapshot. Revision checks and aborts reject obsolete worker success and failure, including completion after invalidation.

This is preferable to hiding pending work, recomputing synchronously or displaying the previous result as current: observers receive an explicit state, no second physics path is introduced, and accepted provenance stays attached to the result.

Additive observer contract:

```js
onStatus({phase: 'pending' | 'accepted' | 'invalid', revision,
 snapshot: null | {result, state, source}})
```

`onUpdate` remains accepted-result/null-invalid only, with additive `source` and `status: 'accepted'` fields. Pending never emits a current-result update. `ui.status` exposes the same status record. Orchestration must forward pending status to retained neutron/scene displays so they cannot imply the snapshot is current. The time range dispatches a bubbling `coupled-accepted` event only after a current revision has completed and rendered; scenario hydration can restore its selected time deterministically.

For target baseline comparison, optional `transformPlots(curves,{host,observable})` transforms the rendered curves (identity default), and `onPlot({host,curves,observable})` observes the original physical curves after rendering. Observable keys distinguish `target:source`, `target:isotopes`, `target:energy`, `target:depth:film` and `target:depth:assembly` so comparison must not mix quantities or depth scope. The source metric is explicitly labeled D–T neutrons.

## Numeric precision

**Problem:** a slider/readout cannot accept a desired scientific value precisely. **Technical cause:** a native range sanitizes values against its `step`; assigning a more precise value while preserving the original step can silently quantize it. In plain terms, typing more digits would still land on a nearby slider tick.

`setupPreciseControls(root, {describeRange})` enhances existing `.control` ranges with clickable and keyboard accessible readouts. Apply, bounded Reset and Cancel exist only while editing. Entry uses the physical value and displayed unit. Finite bounds and optional integer domains reject invalid values without clipping or dispatching a model update. Escape cancels. Existing range `input` handlers remain the sole model-input path.

Log transformations require `data-range-scale="log10"` or descriptor `{scale:'log10'}`; they are never guessed from a caption. `data-unit`/`{unit}` and `data-integer="true"`/`{integer:true}` provide units and integer constraints. Descriptors may also supply `label`. Integer domains must be declared by the caller. `data-precision="off"` excludes an unsuitable range.

Exact entry sets `step='any'` so the stored native value genuinely retains the representable floating-point input. A subsequent explicit pointer gesture restores the original slider step; Arrow/Page/Home/End keys choose the original stepped lattice. This deliberately avoids a hidden parallel value store, which would disagree with existing `range.value` consumers. “Exact” means a JavaScript representable number, not arbitrary decimal precision. The helper's `reset(scope)` only affects ranges initialized by that instance inside the given subtree.

## Verification

All dependency and test execution occurred in the dedicated Apple VM created from `/tmp/mass-spinner-interaction-v38-agent`, guest `safe-dev-e4ebf316234b5513`, with no host mounts or credentials. Its 95-file source copy was synced explicitly after edits. Initial dependency acquisition alone used `--online`; final install/test were offline. No valuable guest source edits were present before replacement sync.

Exact final checks:

```sh
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-interaction-v38-agent sync --replace-guest
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-interaction-v38-agent run -- npm ci --ignore-scripts --offline
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-interaction-v38-agent run -- node --import tsx --test tests/marathon35-ui.test.ts tests/precise-controls.test.ts
```

Result: **18 tests passed, 0 failed**, including delayed stale replies/errors, pending retention/export blocking, invalid local input, accepted-event ordering, selected physical plot observer/transform hooks, off-step linear input, physical log input, invalid numbers, integer domains, Escape, focus, bounded reset and pointer step restoration. Final merged build/typecheck and broad integration are the parent task's gate. JSDOM checks are not evidence of deployed GPU, real browser range sanitization, touch behavior or mobile appearance; browser verification remains separately constrained by the managed origin denial.

Final checked host/stage SHA-256 matches:

| File | SHA-256 |
| --- | --- |
| src/coupled-target-ui.js | 1c0e8dd7741e346530d8d86421b7c8a1e7d9709544d50606c1ab864c2440b727 |
| src/precise-controls.js | 379a8d68856e7932a935b1bb8974fd6e4fca708ac5bf63fb4658fed3fe44fa25 |
| src/precise-controls.css | f0eedac52df2c4fdcde1e7c6e99121cd2e7ae2fb0dc52eb402159414e317b017 |
| tests/marathon35-ui.test.ts | 06dd1e439f1e4f19d7474214fb760a6eb9451d7b5b59c9d2238a9a851084b099 |
| tests/precise-controls.test.ts | 0091a3466a23f2fcc26304562f3ef0411e003c56692f61cec3141ee409f8ffdb |

## Final integration audit

Two further reproducible interaction bugs were corrected:

- Escape cancelled a precision draft and then closed its enclosing workspace window. Technically, the handled input keydown still bubbled to the panel's Escape handler; plainly, one keypress dismissed two nested UI layers. The draft handler now stops propagation only for its handled Escape. A second Escape from the restored readout still reaches the window. This keeps the fix local to the consumed interaction instead of changing every window's keyboard policy.
- The ICR electrode shortcut selected the rotating model's hidden DC-voltage slider. Technically, the shared electrode fallback did not branch on ICR; plainly, the shortcut led to a control unavailable in this model. ICR electrodes now focus the existing RF-amplitude slider. Its source shortcut already correctly focuses transverse energy. Passive separator seals, fittings and supports join vessel/insulators in opening Controls without suggesting an unrelated input; fusion beamline/support likewise have no parameter selector. Fusion source/current, beam and accelerator retain explicit physical mappings. This uses the actual model inputs without adding controls or changing physics.

The current execution path was traced from `main.js` to Marathon orchestration, target acceptance, retained pending state, scene source coordinates, finite-film packet mount, plot baseline capture, scenario hydration, precision and reset. Small copied integration VM `/tmp/mass-spinner-interaction-integration-v38-agent`, guest `safe-dev-041006f9db1e82b6`, contained **122 files / 0.9 MiB**, no full graphical assets or scientific directory. Initial test attempt failed because this deliberately minimal fixture omitted the render manifest; adding only `web-assets/renders/manifest.json` resolved the fixture omission. No production fallback was added.

Final offline check after explicit `sync --replace-guest` and `npm ci --ignore-scripts --offline`:

```sh
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-interaction-integration-v38-agent run -- node --import tsx --test tests/integration-review-v38.test.ts tests/marathon-integration-v35.test.ts tests/scenario-state-v38.test.ts tests/apparatus-state-v38.test.ts tests/experience.test.ts tests/finite-film-ui-v38.test.ts tests/marathon35-ui.test.ts tests/precise-controls.test.ts
```

**47 passed, 0 failed.** Covered accepted scene depth/source/time, retained pending and invalidation, exact scientific entry reaching requests, obsolete completion rejection, finite-film references, structural window focus, accepted baseline snapshot preservation, immutable baseline data, V2 sharing, deferred accepted-time restoration, Models state retention and reset. This is execution/DOM evidence; GPU appearance, actual deployed interactivity and native mobile/pointer behavior remain unverified. All 03 model selection paths were source-traced; this subset does not instantiate their real GPU viewers or solve every model.

After the final passive-component mapping extension only, the same small source copy was synced again and the narrow command `node --import tsx --test tests/apparatus-state-v38.test.ts tests/precise-controls.test.ts` passed **10/10**. The 47-test combined result precedes that last mapping-only extension; parent full gate must cover the final merged state.

Final host/stage matching SHA-256:

| File | SHA-256 |
| --- | --- |
| src/main.js | acfbb56e7288f971ac4c32eb0c75b433f9f70c9455337181baa2ce7549127374 |
| src/marathon-ui.js | bac203d8440dac800c1481e8e467e68d878a09ffbbd084d068f24c07b101b3ca |
| src/coupled-target-ui.js | a2af0749e5563d2c7ffa1e8550e7eff229288447ca48a116805780a043138d61 |
| src/precise-controls.js | 52df2bed63ff34b3aa80ba57784b2bfc944ebc4299ace15e6a992f75b46daaf2 |
| src/component-actions.js | 56bb87a2cd449bbc58819ba7b1976cf277ad00aac38e48a498a3985ea285158b |
| src/scenario-state.js | cb6eefb4bde665597d71219f86e2695d20593fe88648f8217227494b595b9b9b |
| src/experience-ui.js | ce300d6f2d76d3d94cbea220b707a2452bd230cff7ed836ff6705944da7fe5ed |
| src/baseline-ui.js | 0495d73a02da3e1f140cb6ebda48aea51260fcf2e1cd562042d786760816338f |
| tests/precise-controls.test.ts | bda8280200fdeb491f1c1470e1c50644e42a4d22acaf18939e05bfb82c680088 |
| tests/apparatus-state-v38.test.ts | 5fc3e36d1ca8308172373b0898f646a1da97e75712afe0a0e0d02b6ff9493510 |
| web-assets/marathon-reference/finite-film-v38.json | 74dfbf4e330059322742125e4fd62c0ec8ed927c07db09af316d48dfe4b1998f |

## Baseline capture boundary

The final adjacent audit found that a valid solver result could be rejected because an unrelated playground draft was invalid. `targetPlots → setupBaseline.update → experience.capture → captureScenario` attempted to serialize the entire level while rendering accepted curves. An invalid coating or neutron draft threw from capture, escaped the baseline UI and reached the target's worker-error path. In plain terms, a broken optional side experiment could erase an otherwise valid target answer.

The baseline UI now catches only the scenario-capture call. Accepted physical curves still render; Pin and comparison stay unavailable with the exact capture reason. Existing pinned evidence remains intact and can be restored or cleared. No replacement scenario is fabricated. A subsequent accepted update with a valid capture re-enables pinning/comparison. Plot validation/rendering remains outside this catch so malformed curves still throw. This small UI boundary fix keeps scenario sharing separate from physics acceptance instead of weakening input validation or inventing a scientific fallback.

Regression `tests/baseline-capture-v38.test.ts` was first run against the old implementation and failed with `Invalid setting: coating-duration`. After the fix, the synced 123-file / 0.9 MiB snapshot passed **17/17** using the offline command:

```sh
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-interaction-integration-v38-agent run -- node --import tsx --test tests/baseline-capture-v38.test.ts tests/integration-review-v38.test.ts tests/scenario-state-v38.test.ts
```

The regression verifies retained physical curves, explicit reason, disabled synthetic Pin, preserved existing baseline, successful next-update recovery and propagation of malformed-curve errors. Parent owns the separate `main.js` change removing its pre-initialization fabricated `{}` capture.

Final matching host/stage SHA-256 for this last boundary fix: `src/baseline-ui.js` = `b4b7682e82f085674294ef5c1319b3d8269d9d35a907f1bcbee2a1e7aa8d4903`; `tests/baseline-capture-v38.test.ts` = `40c89dc3b652ef5b8d709e7be150533656d44834697b0f36d0012af22a41c77e`.
