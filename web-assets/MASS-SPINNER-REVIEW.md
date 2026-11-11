# Mass Spinner stages 1–3: independent integration review

Reviewed 6 November 2026. This review traced the live source execution paths before assessing the changes. It independently ran the narrow tests below. It did not exercise a browser, inspect GPU output, deploy, perform experimental calibration, or independently retrieve the literature. The parent integration owns the final build, typecheck, full test gate and public deployment verification.

## Execution paths examined

- Orbit results: `main.js/config → calculate → worker-client.ts/requestSimulation → worker.ts → physics.ts/simulate → ensemble.ts/collectionSummary, arrivalCurves → laboratory.js/renderPlots`.
- Repeated seeds/scans: `study-ui.js/start → experiments.ts/runOrbitStudy → calculate/worker → ensemble.ts/summarizeEnsemble → study-presentation.ts → renderPlots`.
- Equilibria: `main.js/config → worker.ts → equilibrium-model.ts/solveEquilibrium → centrifuge.ts or gaussian-centrifuge.ts → centrifuge-diagnostics.ts → focused-diagnostics.js`.
- Bulk and refinement: `solveEquilibrium → solveBinaryBulk → repeated forward solves → cylindrical quadrature`; the refinement action passes the original requested bulk boundary to a new, finer-grid worker solve.
- Cancellation: input changes call the main invalidator, which aborts simulation/study requests, clears stored results and disables export. Worker termination settles promises; study publication requires the still-current controller. A completed obsolete computation cannot pass the post-await abort and controller checks.

## Corrected finding: bootstrap purity at an unobserved component

**Problem.** A finite ensemble with no observed contamination displayed a point estimate of 100% purity and a nominal 95% interval `[100%, 100%]`. The reciprocal zero-purity case had the same defect. Four actual independent-seed runs of `DEFAULT_CONFIG`, with sixteen ions per species, reproduced perfect observed separation and these degenerate intervals for both target collectors.

**Technical cause.** The paired whole-batch percentile bootstrap correctly preserves within-batch species dependence, but resampling observed batches cannot introduce a collector component that was absent from every batch. Its empirical distribution therefore has no information about that missing tail. The existing sparse guard caught empty-total collector resamples, not missing numerator or contaminant components.

**Simple explanation.** Repeatedly rearranging clean samples cannot reveal contamination that the samples never happened to contain. The sample purity remains useful; a zero-width interval would overstate the information obtained.

**Fix.** `summarizeEnsemble` retains the zero/one point purity, suppresses its bounds when either component is unobserved, and exports `intervalUnavailableReason`. Empty collectors and empty bootstrap resamples retain their separate reasons. Wilson intervals for per-species recovery remain available, including their finite zero-count upper bounds. Regression tests cover zero and one purity in both end and wall streams, and preserve the valid-resample accounting.

**Why this fix.** Withholding an unidentifiable bootstrap tail is the smallest honest change. Inventing a pseudocount, silently assuming independent mixed-collector counts, or adding an unvalidated parametric joint model would change the statistical assumptions and could discard the deliberate species pairing.

## Verified conclusions and limits

- **Destination accounting:** arrival plots use cumulative incidence per injected species, including source returns and ions still inside. The four categories sum to one at each shared pre/post event sample. The energy CDF is explicitly conditional on collected ions; end-radius bins are normalized per injected ion.
- **Uncertainty:** recovery intervals are pointwise Wilson intervals under the Monte Carlo Bernoulli sampling assumption. Purity uses paired whole-batch resampling. Neither is a simultaneous scan band or an allowance for model discrepancy, numerical bias or systematic input uncertainty. Four batches provide limited bootstrap resolution even when bounds exist.
- **Bulk boundary:** the inverse constrains the integrated species ratio using the cylindrical Jacobian, not a flowing feed or absolute common-corotation inventory. Independent axis fractions retain representable minority species below subtraction precision. The fine-grid path solves the inverse again at the finer resolution rather than reusing coarse central fractions.
- **Compatibility:** omitted closure and composition-boundary fields preserve the old common-corotation/central profile. The existing `centrifuge` worker kind supports both new closures; unsupported Gaussian unequal-charge mixtures fail explicitly.
- **Gaussian equilibrium:** the retained ion/electron radial force equations, potential signs, equal-charge enrichment and current expression agree with independent finite-difference and analytic-limit tests. The magnetic estimate uses `dBz/dr = −μ0 Jθ`; it is not fed back into the imposed field. The electron-inertia diagnostic measures an omitted force relative to retained force magnitudes, not an instability rate or a universal validity threshold.
- **Stage four:** the double-well UI remains an effective-potential landscape, with explicit warnings against inferring populations or product purity. `DOUBLEWELL-DYNAMICS-SPEC.md` is a specification, not an implemented transient collision model. No transient-fidelity claim is supported by these changes.
- **Security:** no new service calls, credential reads, remote execution or HTML construction from user-controlled study values were found in the examined study/equilibrium paths. This is a scoped source review, not a penetration test.
- **Data:** no persisted-state migration was introduced. Run/study exports retain their settings and model version; the new nullable interval reason is an additive field. The app still has no import/migration promise for arbitrary historical exported files.

## Requirement follow-up handed to the parent

At the initially reviewed snapshot, the scan presentation had collection/purity bands but lacked the recommended analytic cutoff/stability context. The parent is adding that context. It must remain an infinite-domain cold reference rather than being presented as a collector-efficiency prediction. The parent should also surface the unavailable-interval reason so missing purity bands are understandable.

Browser control interaction, responsive layout, actual public asset loading and GPU appearance remain unverified here because the browser origin was previously denied by effective policy. Source inspection and tests do not close those requirements. No browser-access workaround was attempted.

## Executed checks

Run under the user's existing scoped host exception, without changing hooks or security settings:

```sh
./node_modules/.bin/tsx --test tests/ensemble.test.ts tests/experiments.test.ts tests/equilibrium-model.test.ts tests/centrifuge-bulk.test.ts tests/gaussian-centrifuge.test.ts tests/worker.test.ts tests/worker-client.test.ts tests/focused-diagnostics.test.ts tests/ui-contract.test.ts
```

**44 passed, 0 failed**, after the boundary-interval fix. The initial pre-fix run had 43 passing tests; that passing suite did not detect the demonstrated boundary-information defect. The added regression accounts for the new test.

The project has no Git metadata. For the corrected files, the post-test SHA-256 snapshot was:

```text
6b8b44fbaf1fc452ebdfcfe73923bb2ca3f772be598277c65088db86ef9fc54f  src/ensemble.ts
0e290199bbd6032968f8aa0f0899b4ee129d5cd0d270e9243ebc31e63b208bfa  tests/ensemble.test.ts
```

The parent was editing integration and presentation files concurrently. This scoped result does not approve later changes or substitute for the final complete build/typecheck and required test set.

## Parent integration follow-up

The parent added an ideal cold-stability ratio and marginal threshold alongside each rotating scan, with full cold wall/axial-flight references retained in the export. A regression checks voltage scaling and Wilson bounds through the actual study runner/presentation. The UI now explains `intervalUnavailableReason`. Final integrated checks are recorded in IMPLEMENTATION-STATUS.md; these additions are not retroactively attributed to the independent reviewer.

Parent final gate: 123/123 tests passed, typecheck/build/site/assets exit 0. Added actual HTML-default control mapping, study cancellation/staleness/export and finite uncertainty-band segmentation regressions. No deployed browser/GPU validation is implied.
