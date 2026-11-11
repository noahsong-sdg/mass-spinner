# Mass Spinner: second audit synthesis

6 November 2026. Three independent reviewers examined collision physics/local regimes, orbit/event transport and UI/worker/plot execution, with a further cross-review of the contact fix. Source paths and reproducible tests were checked. This is not experimental validation or deployed browser verification.

## Verdict and priorities

**Keep the kinetic mode explicitly exploratory.** Its SI collision coefficient and pair conservation survive the review, but the default's spatial collision representation is not converged. The next implementation is the [Stage 5 convergence workbench](NEXT-STAGES.md), followed by a measured spatial-method improvement and independent finite-time relaxation reference. Additional separator families are outside the present II A–D focus.

| Priority | Finding | Disposition |
| --- | --- | --- |
| P1 | Default 200 µs transport has 1.7246% raw Pθ residual of the positive initial scale; all 155 sampled local regimes are unresolved. | Open scientific gate; do not equate torque-corrected accounting with repaired trajectories. |
| P1 | Sharp-source cell-density smoothing survives infinite marker count and is nonmonotonic with grid alignment. | Open spatial-method gate; more markers alone cannot fix it. |
| P2 | Fixed wall-event samples miss a narrow leave/re-enter excursion under the timestep guard. | Contact algorithm corrected; regression and adjacent boundary tests required. |
| P2 | The fast path retains an axial arrival exactly at the end of a timestep. | Strict endpoint classification and a regression correct the boundary invariant. |
| P2 | Constant tiny scientific values acquire arbitrary ±1 plot limits. | Relative padding for nonzero constants; actual equilibrium-to-plot regression. |
| P2 | Synchronous worker submission failure leaves the worker/listener allocated. | Existing cleanup now covers the failed submission boundary. |
| P2 | Residual percentages lacked exported dimensional scale denominators. | Additive SI normalization metadata and a completed-pulse flux-balance regression. |
| Open corner | A closed gyro-orbit exactly coincident with the wall repeats zero-time contacts. | Explicitly unsupported; ordinary resolved reflection is covered. Reducing dt cannot repair exact coincidence. |
| Open release gate | Exact deployed controls, downloads and GPU appearance have not been exercised. | Browser policy still denies access; no alternate-origin/browser/fetch workaround used. |

The previous 0.27–0.35% raw-Pθ range concerned finer **20 µs** experiments. It was not the actual **200 µs** default, a percentage of near-zero signed initial Pθ, an error bound on separation, or a convergence certificate. The corrected default accounting closes near 10⁻⁶ of the scale, which checks measured torque bookkeeping only.

## Fix explanations

### Wall contact

The old event search sampled eight subintervals, so a grazing orbit could leave and return between every sample. In simple terms, the camera never saw the particle outside. Raising the sample count cannot guarantee finding an arbitrarily narrow excursion.

The correction derives the radius-contact polynomial of the actual synchronized **partial Boris numerical step**, isolates roots using derivative extrema, and reintegrates the earliest contact. Axial motion stays ballistic. Normalized coordinates improve conditioning, the far-from-wall exclusion avoids unnecessary root solves, and unresolved floating-point grazing is reported explicitly. It is preferable to denser fixed sampling because it addresses the demonstrated omission; it does not claim exact physical orbit timing without timestep convergence. See [transport report](AUDIT2-TRANSPORT.md) for tangent/near-miss/reflection semantics and tests.

The adjacent axial fast path also treated arrival exactly on an end plane as still inside. Strict directional endpoint classification now sends that case through the existing exact ballistic contact calculation. This preserves forward launches from the source plane while collecting outgoing arrivals at the correct horizon; no extrapolated impact state is introduced.

Cross-review independently rederived the polynomial and checked 2,000 sampled interior states, finding no missed sampled contacts among 715 contacts. This is supporting evidence, not a completeness proof for floating-point polynomial roots. Exact tangent timing is ill-conditioned even when the returned radius rounds to the wall. A separately identified **closed wall-coincident** pure-gyro path remains unsupported: radial specular reflection changes no velocity, so the caller stops after repeated zero-time events. It was reproduced through the orbit API, not demonstrated as a default-UI failure. Absorbing contacts and ordinary inward reflected continuations are distinct, tested cases; an explicit radial grazing-contact policy is future work.

### Scientific plots

The constant-domain padding used `max(1, 0.05|y|)`, which imposes a dimensionally arbitrary unit-sized ruler on tiny SI quantities. Relative 5% padding now preserves a nonzero constant's scale; identically zero curves retain finite existing limits. This is a local display correction, preserving data and native units rather than introducing unit-specific rules or renormalizing all plots. See [product report](AUDIT2-PRODUCT.md).

### Worker ownership

The promise rejected on a synchronous `postMessage` exception, but cleanup only covered asynchronous errors/completion/abort. The unused worker survived the failed send. A catch invokes the same cleanup and preserves the original error. This closes a real ownership boundary without a retry or fallback. The regression checks worker termination and listener removal. It is a demonstrated failure path, not a claim that ordinary serializable sliders routinely caused it.

### Dimensional normalization metadata

The solver already divided raw residuals by positive initial scales, but exported only signed initial H/P and the normalized residual. A reader could mistake a fraction of the scale for a fraction of signed net Pθ, especially with zero-mean-Pθ initialization.

Exports now include `conservation.energyScaleJ` and `conservation.canonicalMomentumScale` in SI units. The completed-pulse regression reconstructs normalized residuals from outgoing and initial budgets. This additive change makes the denominator inspectable without changing the trajectories, imposing conservation or redefining historical signed quantities. Main run exports advance to modelVersion **8** because contact timing changes; the unchanged independent-orbit-study format remains version **6**. Historical version-7 files remain distinguishable. There is no persisted-state/import migration contract in this path.

## Review scope and requirements

Correctness: traced controls → typed worker dispatch → solver → diagnostics/plots/export, the collision cell/pair map and absorbing/reflecting event paths. Checked source/sink counts, physical weights, signed fluxes, undefined populations, cancellation/stale-result behavior, local applicability and numerical torque. The collision audit reopened Wang et al.'s primary formula rather than inferring validity from pair conservation.

Security: the changes add no accounts, persistence, backend input, remote script loading or credentials. The worker fix reduces leaked resources. This limited source review is not a penetration test. No credential files or browser-policy workaround were used.

Data compatibility: normalization fields are additive; changed contact results are versioned; orbit-study numerics/schema stay unchanged. No stale persisted data requires migration. Adjacent source-unit tests cover stale/cancelled study suppression.

Requirements: II A–D remain the interactive scope, with II C/D emphasis. The E–K atlas remains reference-only. No throughput, power, engineered purity, full-PIC, universal maximal-fidelity or experimental-validation claim is supported. Passing code tests does not close the spatial convergence or browser-runtime gates.

Independent detail: [collision audit](AUDIT2-COLLISIONS.md), [transport audit](AUDIT2-TRANSPORT.md), [product audit](AUDIT2-PRODUCT.md). Exact final commands, source snapshot and CLI publication are recorded in IMPLEMENTATION-STATUS.md at the project root. Execution uses the user's scoped host exception after safe-dev service access failed; no sandbox/hook/policy setting was weakened.
