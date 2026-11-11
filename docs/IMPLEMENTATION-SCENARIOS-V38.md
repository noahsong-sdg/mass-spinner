# Scenario sharing, model continuity and exact baselines

## Root causes and fixes

The old Copy link handler existed only in 01 and serialized four controls. Other playgrounds wrote only `?level=N`. Technically, the URL contract had no representation for mechanism, equilibrium closure, kinetic numerics, material assumptions or replay selection. Simply, sharing another playground discarded the experiment. `scenario-state.js` adds a bounded v2 control-coordinate contract using explicit IDs for each playground and current native control domains. Unknown IDs, invalid versions/types, unsupported selections and out-of-domain values are rejected. Existing v1 links retain their original strict step checks through the unchanged `experience-state.ts` reader. This is preferable to raw result URLs or server storage: small input snapshots remain portable and inspectable without an account or backend.

The Models entry handler always selected centrifuge, while entering 01 rewrote shared source controls to its fixed demonstration defaults. Simply, visiting the introductory spinner erased the advanced operating point. Experience now snapshots Models independently, restores its selected mechanism and complete hidden/visible source controls on return, and exposes explicit `reset()`. Local unfinished number edits remain editable after navigation; public share/pin capture still requires valid domains. This addresses the shared-control ownership boundary without duplicating the control tree or introducing a global state framework.

Restoring a linked form requires more than assigning values. Model/material selection changes dependent controls; replay case selection resets time; a newly accepted target history resets its index. Values are assigned before notifications, material mode/density/stopping notifications run first, and research time applies after its case is ready. Target time waits for the existing solver's `coupled-accepted` event, with cancellation on navigation. Pending old target selections are excluded from new shares. Native range step becomes `any` during restoration so exact linear/log coordinates survive on fresh loads; the precision controller retains its original gesture step. These rules prevent rounded inputs and stale selected-time output without guessed delays.

Baselines previously had no immutable accepted-result contract. `createBaselineStore()` clones and freezes a bounded scenario, versioned observable identity, curves and metadata. It restores the exact scenario and compares only the same model/observable/version/units and exact plot axes/equal-aspect convention. Baseline curves retain their saved samples and use the plot renderer's actual dashed-line syntax. No interpolation, fitted output, distribution reconstruction or solver qualification is implied. The parent integration owns accepted-result feeds and UI pending state.

## Integration API

- `setupExperience(...)` returns `capture()`, `restore(scenario): boolean`, `reset()`, `refresh()`, `sync()` and `level`.
- `captureScenario(document, level)` produces `{version:2, level, controls}` with actual DOM control coordinates, including log10 coordinates rather than formatted readout text.
- `scenarioLink(href, scenario)` creates a clean bounded URL. `readScenario(search)` checks its versioned structure; `restoreScenario` checks all currently available domains before changing them. Deferred recording/history selections receive an explicit unavailable-selection status when their later domain does not support them.
- `createBaselineStore().pin({scenario, identity:{model,observable,xUnit,yUnit,version}, curves, metadata})`, `read()`, `scenario()`, `clear()` and `compare(candidate)` are the baseline API. `compare` returns `{compatible, reason, curves}`. Actual observables and accepted configuration must come from the producing model, not pending sliders.
- The whitelist includes parent-provided material/coating IDs. New future scientific controls must be added deliberately rather than automatically importing arbitrary page inputs.

## Checks and limitations

All dependency installation and test execution for this slice use the copied, unique Apple VM stage `/tmp/mass-spinner-scenarios-v38-agent`, guest `safe-dev-26b62e635ef3954e`. Host operations were trusted reads, source edits and scoped file copies. No home/credentials/socket mount, host project execution or browser-policy workaround was used. Dependencies were downloaded once with `safe-dev ... run --online -- npm ci`; subsequent refreshes use offline npm cache.

The narrow test command is `safe-dev -C /tmp/mass-spinner-scenarios-v38-agent run -- node --import tsx --test tests/experience.test.ts tests/scenario-state-v38.test.ts`. It covers legacy links and source pinning, bounded/stale/malformed links, exact fresh-load linear/log coordinates, native coherent events, target acceptance/cancellation, loaded and initially loading replay cases, immutable compatible baselines, model/source continuity, invalid-link rollback and unfinished local edits. The final result and input digests are recorded below after the final run. The parent owns the complete repository build/typecheck and integrated checks. This document makes no deployed/GPU/mobile verification claim.

Final narrow result: **12 passed, 0 failed**, after explicit `sync --replace-guest` and offline `npm ci --offline`. The exact tested owned files and static fixture/dependency inputs were:

```text
b046babb27b44f643dc98d4424ff394e9d2b773fbade2630e6bf7e327bb8f85c  src/experience-ui.js
c8b54dc5d59b681d3df2223a119ec956c51e965744d9f3cea2180f7a6bf19977  src/scenario-state.js
50bd1debb144696ddd10b86391f0bbd4b51d03688f59646443bd22e5ae3394c3  src/baseline-state.js
28d3cd8902a6e7fd0fc5a42a815814206edd3b7dd54473a052a27b3bce98212e  tests/scenario-state-v38.test.ts
bb5db07354e4f29bf2d3ccde3c44c556b99224b7dbf6dc9de849034c56adaeea  tests/experience.test.ts
0b2c427a7ec0dac60b5601c16ee5f09d126ca406658c9834e958d8070ffb8dd8  index.html
c57d6ce8321fe63b664fb11f3794f1ac58b14c662930cfbe19076e9b55e425d9  package-lock.json
```

## Collector follow-up

The collector aperture UI had no stable input IDs, so its passive postprocessing settings could not enter a shared scenario. Its null-result branch also displayed an unavailable-model paragraph when the main execution path deliberately passed null outside positioned orbit modes. Simply, switching models left an irrelevant collector panel and sharing lost the selected aperture. Three stable IDs now identify the inner/outer radius fractions and surface; 01 and Models both include them. The panel hides and clears its readouts for null or non-positioned results. Its saved-impact acceptance function, count normalization and input-event semantics are unchanged.

The adjacent ownership check found that adding a shared mask without a separate 01 snapshot would make Models' mask leak into the introductory spinner. 01 now preserves its own mask and Reset restores the original full aperture; Models keeps its own selection. Hydration validates ordered inner/outer bounds before changing either coordinate, so an invalid link cannot trigger the UI's intentional drag-time bound adjustment and silently become a different aperture. This extends the existing state boundary without another collector or solver.

Follow-up source review of `coupled-target-ui.js` found no correctness issue in the registered `numericInputs` validation change: only the ten number fields that feed `reads` are registered. `schedule()` checks native validity plus finite `valueAsNumber` on those nodes. Optional precision editor drafts are excluded, while an empty actual diffusivity input remains invalid. The existing integration regression covers both cases; this follow-up did not execute that broader integration suite.

After another explicit sync and offline dependency installation, the isolated follow-up command `node --import tsx --test tests/experience.test.ts tests/scenario-state-v38.test.ts tests/collector-acceptance-v38.test.ts tests/collector-ui-v38.test.ts` passed **19 tests, 0 failures**. It checks exact 01/Models mask roundtrips, ordered-domain rejection, independent navigation/reset, hiding stale/non-positioned data, and the existing zero/full/radial/axial incident-normalized acceptance gates. Updated tested input hashes (the original receipt above remains historical):

```text
ce300d6f2d76d3d94cbea220b707a2452bd230cff7ed836ff6705944da7fe5ed  src/experience-ui.js
cb6eefb4bde665597d71219f86e2695d20593fe88648f8217227494b595b9b9b  src/scenario-state.js
ef970e77ed28edfb266ca0617b289be273d6e57724abe78f675dd6db085b9c06  src/collector-acceptance-ui.js
dc05db3487322e4eaf13d82b01965edea55ce364e0fa70eef4bb9b80cba5747a  src/collector-acceptance.ts
135bab5772e01f46e14d2dac0905c01f883d1dda09b2b9c66bbf997bcd2be463  tests/collector-ui-v38.test.ts
71f86b00139ddbea94c366e6a7b92c0a2bf5d08657ce72bf0b1a2dc4042909cd  tests/collector-acceptance-v38.test.ts
```

## Restricted H-1 tracer follow-up

The new independent H-1 experiment has eight real controls that were absent from the Models registry. Without adding them, a link or Reset would retain the separator while losing the tracer conditions. The explicit 03 whitelist now includes `h1-energy`, `h1-field`, `h1-pitch`, `h1-neutral-density`, `h1-radius`, `h1-length`, `h1-particles` and `h1-seed`. Mounted DOM bounds enforce its actual UI domain; marker count and uint32 seed must be integers. Mounting the tracer before Experience captures the actual default configuration. It remains an independent first-capture experiment, never an undocumented reaction channel in the generic separator model.

The follow-up also exposed an adjacent atomicity problem: public scenario restoration first entered Models and emitted input events for the old saved context, before applying the incoming batch. Simply, restoring a link could briefly recompute a previous tracer configuration. Experience now suppresses only those intermediate context notifications; normal navigation still notifies its restored controls. The final batch still sets every coordinate before native input events. The real-UI regression observes all eight tracer inputs plus a separator source input and confirms that every notification sees the incoming model and complete incoming tracer values, with no extra intermediate notifications. This is smaller than adding a new state manager or changing either scientific backend.

`tests/hydrogen-scenario-v38.test.ts` uses the actual mounted, collapsed tracer UI. It checks exact off-step coordinates, selected-model continuity, real DOM notifications, Reset to mounted defaults, invalid fit/seed/count bounds and exclusion from 01 links. It deliberately does not run a new tracer physics study or claim that this interaction test validates the reaction approximation. The depth agent owns those scientific tests.

Final tracer follow-up receipt: the same isolated VM, refreshed explicitly and reinstalled offline, passed **21 tests, 0 failures** with `node --import tsx --test tests/experience.test.ts tests/scenario-state-v38.test.ts tests/collector-acceptance-v38.test.ts tests/collector-ui-v38.test.ts tests/hydrogen-scenario-v38.test.ts`. This receipt uses the depth agent's final UI (including integer descriptors, unit annotations and blank-seed rejection). Updated source/test hashes:

```text
539574633d281d45181906bb2d6da1392d3051937fb80b75b0b18ecfaf2fef07  src/experience-ui.js
2dd1e989d14bf43a45ae093469db297f425daffbe99bb34bfd570711c5106e4b  src/scenario-state.js
9a2112df692749982d8aa28b9cb0daa23c906652c68c6c599a99341b9e826f1c  src/hydrogen-tracer-ui.js
076e66b3a909c136cd445df394c27412948c5e4107c89904f93640150c64defe  src/hydrogen-tracer.ts
763dd176861feaf62306c1a92483c573c3bb7c2b0c9ec869383b56afc32c792d  src/hydrogen-charge-exchange.ts
ad29acdb2a229a0fd00482c6aea93bb78cb9878f1e4ec42cff692e3cab73a36c  tests/hydrogen-scenario-v38.test.ts
```

## Recorded finite-film selection follow-up

The new native finite-film reference selector was missing a registered ID, unlike the existing implantation reference selector. Once the parent added `finite-film-reference-case` to the real select, the remaining cause was its absence from the 02 whitelist. Simply, sharing or resetting Marathon omitted which recorded case was displayed. Adding that single ID lets the existing native-option domain check, default capture and change-event restoration handle it consistently. No new state abstraction, solver behavior or live retention law is needed.

The actual public `finite-film-v38.json` packet is used by the regression. It selects a real case, checks its incident partition and input-hash provenance, shares it, resets to the first mounted case, restores the link and confirms that a missing native-case name leaves the accepted selection intact. The reference stays collapsed throughout.

After explicit sync/offline installation in the same dedicated safe-dev VM, `node --import tsx --test tests/experience.test.ts tests/scenario-state-v38.test.ts tests/finite-film-ui-v38.test.ts tests/finite-film-scenario-v38.test.ts` passed **15 tests, 0 failures**. No native scientific campaign was executed. Exact updated inputs:

```text
7d27838ae0758b8f42a1cd5309b239f3d78d413b34b0f45aed945925b7cc9d1d  src/scenario-state.js
83cbd3964858ab839ccd5a8f4544fb1dae4966e27db15d6c15310d129170093d  src/finite-film-ui.js
8821498eb032cdda13efdadd9d274a7ae0540d78289e3951891f76a2a8763d36  tests/finite-film-scenario-v38.test.ts
8f34d72e413f0681a127afaaa3ca3145974e0f546feb03f7f6e2fb1235da74e7  tests/finite-film-ui-v38.test.ts
74dfbf4e330059322742125e4fd62c0ec8ed927c07db09af316d48dfe4b1998f  web-assets/marathon-reference/finite-film-v38.json
```
