# Full-audit corrections · 17 November 2026

Scope: the five findings in [the full audit](full-audit-20261117.md), plus adjacent state-ownership defects exposed by regression review. Physical equations, scientific acceptance gates and unrelated research files are unchanged.

## Corrections

### F1: input edits own result invalidation

**Problem:** an empty/out-of-range thermal field left the previous answer exportable as current. Component inspector precision fields had the same ownership gap.

**Technical cause:** input listeners checked validity before calling the function that invalidates accepted results. The canonical range retained its old value when an inspector number was invalid. A graphics request already in flight could also resume playback after invalidation.

**Plain explanation:** invalid edits were ignored while the old answer still looked usable.

**Correction:** invalidate before redraw on every edit; validate model-selected thermal fields and inspector drafts before solver dispatch. Mark retained results stale, disable result-dependent actions, and prevent late graphics/playback from reviving them. A canonical slider/restoration event updates its corresponding inspector projection, so Reset can replace an invalid draft. The originating precision field retains its typed decimal text; only peer projections are synchronized.

**Why this approach:** revision/dirty ownership already governs solver replies and exports. Extending that owner is smaller and clearer than adding another draft store, coercing blanks, or independently patching each output button.

**Regressions:** production input events across all six thermal numbers, valid recovery, inspector edits and restoration, stale worker replies and delayed graphics completion.

### F2: links preserve run inputs and drive history

**Problem:** cutting power and sharing the experiment reopened a zero-current experiment from the beginning.

**Technical cause:** the old scenario serialized final control coordinates, while initial current and interventions belonged to the operating-history state.

**Plain explanation:** the link remembered where the slider ended, not the current history.

**Correction:** versioned centrifuge links carry initial current, ordered current events and the selected playback mode/time. Capture requires accepted input ownership. Restore validates the complete payload and reconstructs a fresh run; legacy v2 links retain their constant-drive meaning.

**Why this approach:** reuse the existing bounded event validator and scenario transaction. URLs contain inputs rather than large solver checkpoints. JSON export remains the artifact for inspecting the original accepted trajectory; fresh solving does not promise bitwise replay of a continuation's retained numerical knots. The independent equilibrium calculator and camera are separate from the shared run.

**Regressions:** real power intervention → Copy link → production restoration; canonical fresh-solve comparison; old links; pending/invalid capture; malformed, duplicate, unordered and out-of-bounds events; failed restoration preserving prior history.

### F3: failed model downloads are retryable

**Problem:** a transient GLTF failure made all subsequent attempts fail until page reload.

**Technical cause:** the module-level promise cache retained rejected promises.

**Plain explanation:** one failed download became the permanent cached answer.

**Correction:** clear the failed promise and rethrow its original error. Successful and concurrent loads remain shared.

**Why this approach:** repair the cache lifecycle directly. No additional injection API, automatic retry loop or substitute geometry is needed.

**Regression:** mocked actual loader I/O fails once, concurrent callers share that failure, explicit retry succeeds, and successful loads stay cached.

### F4: published source links identify their producing release

**Problem:** website implementation links pointed to older moving branches.

**Technical cause:** page renderers hardcoded `main` or an earlier feature branch independently of the build source.

**Plain explanation:** the guide linked to different code from the deployed playground.

**Correction:** resolve the full producing Git revision once in the build and use it in guide, qualification and help implementation links. Fail when exact identity is unavailable. Preserve independent literature and explicitly pinned historical references.

**Why this approach:** build ownership provides one release identity. Moving a link to another branch would still make it drift; duplicating a separate configured revision could silently diverge.

**Regressions:** rendered implementation URLs at a known SHA, retained literature/historical links, rejected missing/moving identities, and actual emitted-site checks.

### F5: legacy graphics load at actual first use

**Problem:** default centrifuge startup downloaded rendering code for Advanced views.

**Technical cause:** resource allocation was lazy, but the WebGPU implementation remained statically imported by the application entry.

**Plain explanation:** the browser loaded code for views the user had not opened.

**Correction:** move the existing legacy renderer implementation behind dynamic import at its actual activation boundary. Keep one existing lazy owner for initialization, deduplication and disposal. Recheck activity after download before allocating resources; retain ordinary Three primitives required by the shared inspector.

**Why this approach:** extract the real dependency boundary without changing renderer technology or introducing another loading manager. Camera fit, field/path rendering, picking and keyboard controls remain connected to the same state.

**Regressions:** default static module graph, first-use deduplication, leaving during import, latest accepted-state hydration, cleanup/failure and portrait framing. The emitted bundle and deployed activation must also be checked; source tests alone do not measure startup performance.

## Verification

Implementation review and regression execution are tracked separately. The final source and artifact gates passed at `fa9b3136a9aabdc01c98e4432985807cb52f7024`; the native browser checks below exercised that deployed artifact.

Intermediate verification caught issues without weakening assertions: the new sharing fixture initially omitted the workspace-created apparatus selector; broader existing integration tests then caught precision text normalization (`0.5300` to `0.53`) in the new inspector synchronization. The fixture now follows production initialization order, and synchronization preserves the originating edit while updating its peers.

A later broad run stopped with `SIGKILL` in `audit-spatial-ui-v53.test.ts`. Source review identified an adjacent validation regression: disabled presentation attributes could be stale when `run()` was invoked directly after changing model selection. Validation now selects active thermal fields from the model, independently of those attributes; invalid solver dispatch otherwise cleared the accepted result. The signal itself does not prove the cause of memory pressure. The existing spatial UI regressions are included in the first CI group to expose this path early.


### Final isolated checks

[CI 44066121436](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44066121436) passed at exact `fa9b3136a9aabdc01c98e4432985807cb52f7024`:

- The focused command in [verify.yml](../../.github/workflows/verify.yml), from `tests/audit-spatial-ui-v53.test.ts` through `tests/qualification-page.test.ts`: **51 passed**.
- `node --import tsx --test --test-concurrency=1 tests/fuel-equilibrium.test.ts tests/fuel-equilibrium-ui.test.ts`: **16 passed**, including the 8,640-case reference screen.
- Guide/integration, experimental/reference and spatial/worker commands in that workflow: **41, 24 and 29 passed**.
- `python3 -m unittest discover -s scientific/electron-applicability -p test_screen.py -v`: **17 passed**.
- `python3 -m unittest discover -s tests -p test_argon_reference_export.py -v`: **3 passed**.
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: **1,436 passed**, zero failed/skipped.
- `npm run typecheck`, `npm run build`, `npm run check:site`, `npm run check:assets`: **passed**. `git diff --check`: **passed**.

The shared-run test reproduces the canonical fresh solve exactly. Against the original retained-prefix continuation it stays within the unchanged common-clock gates: maximum edge-speed difference 0.4511 m/s, species L1 difference 0.00017915 and purity/recovery difference 0.000072174. Accumulated phase differs by up to 2.0823 rad, within the existing relative phase gate; a shared fresh solve is not phase-identical checkpoint replay.

Execution used the existing offline, non-root, one-CPU/1-GiB Docker CI. Source/artifact reviewers independently checked the final commit and successful run. No application, test or scientific solver code executed on the host. Host standard-library work inspected static files, JSON and compression sizes. This pass did not rerun every archived research campaign or establish experimental accuracy.

### Measured graphics loading

Independent inspection of the emitted static entry/preload graph found **816,722 bytes**, down from **1,503,350** (45.7%). Consistent per-file stdlib gzip totals are 256,054 versus 442,777 bytes (42.2%). The 616,889-byte legacy renderer is dynamic-only; WebGPU backend markers are absent from the initial static closure.

That is narrower than actual default startup. The native browser also observed the default centrifuge's runtime script resources, including its worker and WebGL viewer. Their unique artifact bytes total **1,488,349 versus 2,102,032** (29.2% less); consistent gzip totals **447,400 versus 614,254** (27.2% less). The baseline and new resource lists were captured before Advanced activation. The new renderer chunk was absent then, and appeared after opening **Live assembly**.

These are artifact-size comparisons for observed scripts, not measured network wire bytes, cold-load latency, frame time or memory use. Other Advanced views can still require substantial downloads. Local receipts: `/tmp/mass-spinner-fixed-bundle-independent.json` and `/tmp/mass-spinner-audit-fixed-runtime-assets.json`.

### Deployed native-browser checks

Deployed the green CI's unmodified `verified-site` artifact using the installed Wrangler with a standalone assets-only config. Cloudflare version: **`711cc089-5329-4f30-9356-d731118a1407`**. Runtime/source links identify **`fa9b313`**. A later documentation-only commit records this evidence and is not a different runtime build.

- **Invalid thermal edit:** accepted thermal run → clear coolant temperature → previous-result label; Export disabled; Copy link refuses capture. Re-entered 500 K; Reset then returned an accepted bath run.
- **Inspector precision/recovery:** typing `0.5300` retains that text and updates the canonical field to 0.53. Emptying it disables Export. Reset restores 0.5 and a newly accepted/exportable run.
- **History sharing:** initial 0.03 A → power cut at 1 s → duration 2 s → Copy link → fresh tab. Native inspected payload is v3 with initial current 0.03 A, event `{timeS:1,currentA:0}`, coupled-separation mode and selected time 1 s. Restored history displays the cut; at 2 s both populations still coast at about 161.3 m/s rather than zero from rest. Legacy v2 semantics are covered in integration tests.
- **Advanced first use:** Live assembly visibly loads; Fields & boundaries and keyboard camera rotation work; Ion trajectories displays the accepted paths together with the collection plots. No legacy chunk appeared before activation.
- **Source provenance:** native public help links use exact `fa9b313`; independent emitted-HTML review verifies all 4 guide, 3 help and 15 qualification implementation links at that revision.
- **Mobile:** 320×740 and 390×844 have document scroll widths 320 and 390 respectively. A slider edit completes a newly accepted run with Export re-enabled; one-sheet controls/plots navigation works, composition plot keyboard inspection reaches the wall, and the 3D stage has a finite fitted viewport. Temporary viewport overrides were reset.
- **Console:** no errors recorded in the main verification tab. Restored default centrifuge inputs and left the accepted spin-up plot with the visible physical cursor at 1 s.

Screenshots: `/tmp/mass-spinner-audit-fixed-desktop.jpg`, `/tmp/mass-spinner-audit-fixed-invalid.jpg`, `/tmp/mass-spinner-audit-fixed-shared-run.jpg`, `/tmp/mass-spinner-audit-fixed-advanced.jpg`, `/tmp/mass-spinner-audit-fixed-mobile-320.jpg`, `/tmp/mass-spinner-audit-fixed-mobile-390.jpg` and `/tmp/mass-spinner-audit-fixed-mobile-3d.jpg`.

The rejected-download retry was verified by regression against mocked actual loader I/O, not native browser network-fault injection. This was a focused re-verification of the changed paths, not another exhaustive sweep of all sliders or all archived physics models. The separate experimental and parameter-range qualification limits remain unchanged.

**Closure:** all five confirmed audit findings are addressed within the checked scope. Independent source/artifact reviews found no remaining confirmed blocker in those fixes. The focused native checks passed, with the loader fault case covered by regression rather than live fault injection. Scientific and experimental limitations are still separate from product-defect closure.
