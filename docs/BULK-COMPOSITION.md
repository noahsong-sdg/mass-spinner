# Fixed whole-cylinder composition for the centrifuge benchmark

The existing path is `centrifuge(config) → quasineutral radial profiles → centrifugeDiagnostics(result)`. `axisFraction` specifies local composition at the axis. Because rotation changes radial density weighting differently for each species, keeping this central fraction constant while varying rotation changes the integrated number ratio. This is a boundary-condition distinction, not an algebra defect in the central-composition solver.

`fixedBulkCentrifuge(config, targetA)` solves for the two central fractions that recover the requested species-A whole-cylinder number fraction. It leaves the original `centrifuge` API and its central-composition behavior unchanged. Inventory uses the same exact cylindrical integral of the piecewise-linear profiles as the existing diagnostics, so a radial-refinement comparison must solve the inverse again at each grid resolution.

The generic helper is:

```ts
solveBinaryBulk((axisA, axisB) => equilibrium(axisA, axisB), targetA)
```

Its result contains the original equilibrium under `result`, independently represented `axisFractionA` and `axisFractionB`, the target and actual bulk fractions, the number-fraction residual, and the log-odds residual. The generic type retains additional fields on the equilibrium result, allowing a separately defined Gaussian/current equilibrium to use the same binary inversion without changing either physical closure.

The inversion bisects central log odds and compares integrated log odds. Both logistic tails are evaluated independently. This matters when a steep heavy-ion enrichment requires a central minority fraction much smaller than machine epsilon: computing that fraction as `1 - axisA` would erase it even though the nonzero minority is representable. Pure-species targets use exact absent-species endpoints. Unrepresentable central fractions, non-monotone sampled maps, invalid fractions, and non-converged inverses fail explicitly rather than clipping to a pure mixture. Underlying equilibrium parameter/exponent guards remain active.

This fixes **bulk composition only**. Density retains its existing normalization to the total ion density on axis; absolute particle number is not fixed because that normalization is not an absolute density input. The output is a static equilibrium with a specified integrated species ratio, not a transient, flowing feed, collector-recovery model, or throughput calculation.

## Checks

`./node_modules/.bin/tsx --test tests/centrifuge-bulk.test.ts` — 7 tests passed. Covered changing rotation at fixed bulk ratio without mutating the original input; zero rotation and equal mass/charge identities; forward/inverse round trips with unequal charges; absent-species endpoints; steep representable minority fractions below machine epsilon; independently finer-grid inventory convergence; invalid and unrepresentable domains. No experimental validation or browser verification is implied. The parent integration owns the final full build/typecheck.
