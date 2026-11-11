# Stage 9 independent product review

6 November 2026. Source-unit review of the added workbenches and their integration. **This is not deployed-page, native-worker, download, accessibility-layout or GPU verification.** No browser, origin request, alternate browser, CDP or fetch workaround was used. Commands used the user's previously authorized scoped host exception, with `login:false`; no policy, hooks or credentials changed.

## Result and remaining delivery gate

No new blocking controls-to-physics, stale-export, variable-field-potential or adaptive-control defect was reproduced in the reviewed source paths. The targeted tests below passed. This permits a source-level product assessment; root still owns the repository-wide typecheck/build and final packaging gate.

One delivery gap was observed and reported to root: six new documentation links in `index.html` referenced files present in `docs/` but absent from `web-assets/` at review time: `SECTION3-COVERAGE.md`, `STAGE5-CONVERGENCE.md`, `STAGE6-LOCALITY.md`, `STAGE7-FIELD-CLOSURE.md`, `STAGE8-VALIDATION.md`, and `MARATHON-SIMULATOR-SCOPE.md`.

Technical cause: Vite publishes `web-assets/` as its public directory, and `scripts/build.mjs` only invokes Vite. `docs/` is not automatically copied. In plain terms, a correct source link does not put the linked report into the website. The smallest fix is to stage these referenced reports during the existing final packaging step and verify the release files. This retains the current publishing architecture without introducing a second documentation system. Root confirmed this packaging step is pending scientific-report freeze. The gap is **pending packaging verification**, not a demonstrated deployed 404; no remote request was made.

## Execution paths checked

- Main changes run through `changed()` → `invalidate()` → revision increment, controller aborts, `latest=null`, disabled export/refinement and cleared plots/metrics/assumptions. The worker response is accepted only for the current revision. Closure and magnetic-boundary controls occur in the actual input-listener list. The new panels have independent local state; their controls do not invoke the separator worker or mutate its configuration.
- Failure inputs → explicit SI/logarithmic conversion → `failureBudgets()` → actual `renderPlots()` → current metrics/notes → export containing config, assumptions, budgets and curves. All 13 sliders were exercised individually at both declared endpoints, restoring defaults between sliders.
- Fusion inputs → explicit SI/logarithmic conversion → `simulateFusionBeam()` → actual `renderPlots()` and current metrics/schematic labels → export containing config, assumptions, sources, profiles and curves. All eight sliders were exercised individually at both declared endpoints. Area, efficiency and exposure appropriately change their scalar outputs rather than changing a prescribed cross-section curve.
- The two new workbench error paths clear plots/metrics, set `latest=null` and disable export. Existing source-unit tests execute valid → invalid transitions. Retained notes describe the same fixed model assumptions; they do not retain an enabled prior result export. Native range-input sanitization and real anchor downloads are outside this DOM stub's coverage.
- Equilibrium controls → `equilibriumConfig()` → worker's `solveEquilibrium()` → coupled `magneticCentrifuge()` → `equilibriumPresentation()`. Both axis/wall magnetic boundaries were tested with both central/bulk composition boundaries. The selected B boundary equals the input. The plotted field is the actual solved B(r), and the plotted effective potential satisfies `ψ = φ − Ω∫B(r)r dr`; it is not mislabeled with a uniform-B expression. Bulk composition retains the requested whole-cylinder fraction. Wall-pressure failure remains an explicit error rather than a fallback to the axis branch.
- Fixed collision cells disable the adaptive target. Adaptive cells disable Cartesian `cellsAcross`; the selected target remains an integer in the actual kinetic engine. Two adaptive runs differing only in the disabled Cartesian resolution produced identical curves and collision diagnostics. Collisionless runs still use spatial cells for local-regime diagnostics, so a cell-method control is not entirely ignored when scattering is off.
- `modelValidity()` derives the coupled-equilibrium and kinetic status from the current result. Its text retains imposed density/rotation, omitted stability/discharge evolution, unresolved sampling and raw angular-momentum residual limitations. Independent budgets and fusion output explicitly avoid calibrated separator purity, measured Marathon operating conditions and net-electric claims.

## Additional comparison-contract review

Read `experimental-validation.ts` and `scripts/validate-experiment.ts`, then independently reran its eight tests. Model/case/version/hash mismatches block before stale residuals are shown; exact unit/settings matching and in-range coordinate interpolation precede scoring. The contract separates predictive uncertainty from a numerical bound, rejects obsolete schemas, blocks declared held-out fitting and duplicate calibration/held-out physical settings, and rejects nonfinite derived arithmetic. The CLI parses JSON as data and uses exclusive file creation (`wx`), so a pre-existing report cannot be overwritten by that path.

No additional correctness or security defect was reproduced in this pure path. A source SHA, `source.kind='measured'` and convergence declaration remain supplied attestations: this reader cannot authenticate measurements, recompute the declared source hash, prove convergence, or detect undeclared calibration leakage. The report and stage-eight documentation state that limitation. The synthetic example is not experimental evidence.

## Exact checks

```sh
./node_modules/.bin/tsx --test tests/review-workbenches.test.ts tests/workbenches-ui.test.ts tests/equilibrium-controls.test.ts tests/equilibrium-model.test.ts tests/doublewell-ui.test.ts
# 19 passed, 0 failed; 42 individually exercised slider endpoints.

./node_modules/.bin/tsx --test tests/experimental-validation.test.ts
# 8 passed, 0 failed.
```

The added tests call real builders, adapters, solvers, plot rendering and export handlers against a small DOM substitute. They verify finite generated SVG coordinates, export config matching current controls, four coupled-boundary combinations, generalized-potential plotted data and adaptive inactive-setting invariance. They do not reproduce browser event dispatch, native workers, layout, GPU rendering or a user opening a downloaded file. No production file was edited by this reviewer.

Reviewed module snapshot (SHA-256):

```text
7f4870fd7fa896f83243c2d2dd8809516e5e78129413bb70fa89e23288ac9fb9  src/limitations-ui.js
8acd58334559af31f64b6a1452e736c1ba0b68d2f42fc015599f74a2909a9c05  src/fusion-ui.js
bf73d487f28301d1963e330241bb175a7a2a9b4f5c56c91bb1429c93b7c9097a  src/equilibrium-controls.js
74c06b1f46070c20193eb5f3aad3b5c76abacb8dbb0170152c51187021da6853  src/equilibrium-model.ts
531aefde49f598b823470b993180aa96cda8018996a9a4fa61c37098ba3786b3  src/focused-diagnostics.js
c275ace68794df00c00451ed81a6c6dfea74909652dd91ce8afaf247d68964ef  src/doublewell-ui.js
13a27dabb294a4f8563f16591be3ce18b0adf9351c4ef8b11bdfca6eee2fc51c  src/experimental-validation.ts
b909cda32177fc1b01392e519ebd12ca4adf26499f324131a709d61e3f9e9cb3  tests/review-workbenches.test.ts
```

## Acceptance still required

Package the linked evidence and check the final release artifact. Rerun root's required full suite/typecheck/build after all production edits freeze. When legitimate origin access becomes available, inspect the actual deployed controls, generated plots, native workers, error/recovery transitions, exported file contents and mobile/GPU appearance. Until then these remain unverified product claims. Numerical convergence, experimental consistency and browser success are separate gates.
