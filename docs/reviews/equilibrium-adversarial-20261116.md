# Adversarial equilibrium audit

Four independent reviewers challenged the physical derivation, numerical edge cases, oracle/qualification coverage and UI/import/export contract. The audit found no force-balance or ordinary-cut formula error within the declared ideal neutral-gas scope. It did find the correctness and interpretation issues below.

## Findings and fixes

**P2 — Positive tiny cuts became empty or lost representable particle counts.** Squaring a microscopic radius, forming βr², or weighting a subnormal species fraction could underflow before later multiplication by the inventory. For example, at zero rotation, x=0.5, r/R=2.3e-162 and N=1e30, the previous result could have positive species counts but zero total count and undefined purity. In plain terms, the calculation rounded away the small quantity too early. The fix evaluates the interval-average relative density `q̄_s = Z(β_s c²)/Z(β_s)`, then computes fractions as `q̄_s c c` and counts as `N x_s q̄_s c c`. Purity is undefined only for a geometrically empty cut. Totals are the sum of species counts. Scaling absolute density before multiplying by a trace feed similarly preserves representable density. This keeps the same analytic physical model, avoids premature underflow and needs neither arbitrary-precision browser arithmetic nor silent cutoffs. Shared transport primitives were not changed.

**P2 — Sparse mass arrays bypassed the domain check.** `Array.forEach` skips missing entries, allowing an absent mass to become NaN downstream. In plain terms, a missing value was never inspected. Iterating values with `for…of` now rejects either missing entry through the existing finite-mass check. This directly enforces the two-finite-ordered-masses invariant instead of patching invalid outputs later.

**P2 — Imported radii were silently rounded.** Accepted configurations retain arbitrary cut fractions, but the calculator's range input used a 0.005 step. The [HTML range specification](https://html.spec.whatwg.org/multipage/input.html#range-state-(type=range)) requires rounding off-step values. Live browser reproduction imported 0.333 as 0.335, changing zero-speed recovery from 11.0889% to 11.2225%; JSDOM instead exposed the step mismatch by disabling export. The fix consistently uses `step='any'`, retaining min/max and core domain validation. It preserves scientific inputs without adding a second state store or custom keyboard handlers. Native keyboard increments remain browser-controlled.

**P2 — The independent oracle also lost tiny intervals.** At fixed 80-digit precision, subtracting exponentials whose arguments differ by roughly 1e-200 yields zero. The old matrix did not probe such tiny cuts. The oracle now independently shifts the integral to its interval origin and evaluates small intervals using a Decimal Taylor series. This preserves interval scale without sharing production's log-normalization formulas. Optional SI references scale densities and counts in Decimal before binary64 conversion, so a fraction that rounds to zero cannot erase a still-representable count in the expected answer.

**P2 — The gas assumption was too easy to miss.** “Ideal neutral gas” was inside collapsed limits while the default lithium case looked like an ordinary operating point. The calculator now identifies itself as an **ideal neutral-gas reference** beside its controls. Gas phase and species identities remain prescribed. The default inventory corresponds to about 10 Pa at 500 K, whereas the [NIST/Hicks lithium vapor-pressure fit](https://webbook.nist.gov/cgi/cbook.cgi?ID=C7439932&Mask=FFFF) gives roughly 7e-7 Pa. Thus this is a conditional all-gas reference, not lithium phase equilibrium. A visible scope statement is preferable to clipping the inventory against vapor pressure, which would silently add an unqualified physical model.

**P3 — Species and qualification wording needed precision.** D/T are atoms and D₂ is one gas particle containing two deuterium nuclei. In fixed He/D₂, molecular and deuterium-nuclei recovery coincide: the factor of two cancels between recovered and original inventory. Gas-particle purity generally differs from nuclei or mass purity because its denominator mixes species. The equations page now makes that distinction and identifies the matrix's density as dimensionless `q_s = n_s/n̄_s`; absolute SI density has separate tests. These changes clarify existing definitions rather than changing mixture physics.

## Physics checked and retained limits

Independent derivations confirm `kT dn_s/dr = n_s m_s Ω²r`, normalization to each species' inventory, the cylindrical volume coordinate `y=r²/R²`, and the axis/wall light-to-heavy odds contrast `exp(βH−βL)`. Integrating the inventory—not sampling its boundary—gives the implemented cut purity and recovery. Zero rotation, equal masses, pure feeds and genuinely empty cuts have distinct, correct meanings. [Primary gas-centrifuge analysis, Eqs. 8–12](https://arxiv.org/html/1506.00823) supports the radial exponential and cylindrical integration; its extraction analysis additionally weights axial flow, which this calculator does not solve.

Uniform temperature, rigid rotation, fixed gas species, ideal equation of state and closed inventory remain assumptions. No condensation, chemistry, plasma electric field, equilibration time, flow throughput or experimental apparatus calibration is qualified. Importing a spatial-temperature state explicitly substitutes its accepted mean; that does not solve non-isothermal equilibrium. Particle counts are ensemble expectations, not necessarily integers. At binary64 limits, a fraction and its scaled count can underflow differently; counts must not be reconstructed from an already-rounded fraction.

## Regression evidence

[Red CI 44005194238](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44005194238) ran the new tests against the old implementation and reproduced four failures: microscopic-cut purity, missing-mass rejection, exact imported-cut export and visible ideal-neutral scope. Its expanded ordinary-domain matrix already passed with the corrected independent oracle.

The qualification now covers:

- 8,640 Decimal-reference cases, including numerical branch thresholds and r/R=1e-100, with every original gate unchanged.
- 113 additional Decimal SI cases covering microscopic positive cuts, pure feeds, inventory scaling and a representable subnormal trace-species density.
- 96 zero-rotation geometry/inventory/feed/cut combinations with independent absolute-density and particle-accounting expectations.
- A one-ulp sweep across β=0.1 with a cut immediately below the wall, plus the existing Simpson refinement study.
- Import → calculation → export regressions at c=0.333 and c=1−1e-8, sparse-array rejection, pending-state isolation and undefined-result behavior.

The extra SI comparisons retain the existing relative tolerance plus a two-smallest-binary64-unit floor for unavoidable final subnormal rounding. The 8,640-case matrix tolerances were not loosened. This is finite numerical qualification; neither plot interpolation nor experimental fidelity follows from it.

## Final release evidence

[Final CI 44006358600](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44006358600) passed at exact runtime commit `b7894bc7b3d0d8f9d12b9e6f20e5ebe93c7d4c7f`. The required checks were:

- `node --import tsx --test --test-concurrency=1 tests/fuel-equilibrium.test.ts tests/fuel-equilibrium-ui.test.ts`: 16 passed.
- Guide/integration, experimental/reference and spatial/worker batches in `.github/workflows/verify.yml`: 41, 24 and 29 passed, respectively.
- `python3 -m unittest discover -s scientific/electron-applicability -p test_screen.py -v` and `python3 -m unittest discover -s tests -p test_argon_reference_export.py -v`: 17 and 3 passed.
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: 1,423 passed.
- `npm run typecheck`, `npm run build`, `npm run check:site` and `npm run check:assets`: passed. `git diff --check`: passed.

The [public qualification receipt](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/equilibrium-qualification.json) passes 8,640 cases. Maximum absolute error is `1.9895196601282805e-13`, relative error `2.2523589547762333e-14`, gain absolute error `1.6216637983950165e-15` and conservation error `7.549516567451064e-15`. All six original gates remain unchanged. Both numerical reviewers independently checked the final CI logs and matched all four receipt source hashes to this commit; neither found a remaining numerical qualification blocker. The physical-assumption and UI-contract reviewers also accepted the corrected execution paths within their stated scope.

The verified CI artifact was deployed to the existing Cloudflare site as version `12a7db73-cce9-4c30-8b79-c5847a191888`. Native deployed-browser checks confirmed:

- A sampled cut of 0.333 remains exactly 0.333; the JSON export gives zero-speed light recovery `0.11088900000000002` rather than the previous rounded-cut result `0.112225`.
- A cut of 0.99999999 remains exact and retains positive outer recovery `2.0000000000495187e-8` and outer particle count.
- A positive cut of 1e-200 retains defined 7.59% inner purity. Counts below binary64 range still round to zero, as documented.
- The ideal-neutral scope is visible; both plots render. At 390×844, the range responds to keyboard input, the collection plot responds to Home, and the page has no horizontal overflow. Desktop viewport overrides were reset afterward.
- The published equations page contains five rendered KaTeX equations, no KaTeX errors and the corrected molecular-recovery statement. No browser console errors were recorded during these checks.
- All eight exported producing-file hashes match current source, as does aggregate SHA-256 `ccdceb92c065d355ae139168774e5f481d2dd2d3ed6f43736cf32fd24b1f6a30`. This binds the observed browser result to the audited numerical/UI implementation.

Proof captures: `/tmp/mass-spinner-equilibrium-adversarial-final.jpg`, `/tmp/mass-spinner-equilibrium-adversarial-mobile.jpg` and `/tmp/mass-spinner-equilibrium-adversarial-mobile-plots.jpg`. Export evidence: `/tmp/mass-spinner-equilibrium-adversarial-export.json`. CI logs: `/tmp/mass-spinner-equilibrium-adversarial-release-full.log`.

No repository application/scientific code was executed on the host; test/build execution used the existing offline, resource-limited GitHub Docker workflow. Host-side standard-library checks only hashed source files and inspected exported JSON. This audit establishes finite numerical and deployed-UI evidence for the declared equilibrium model, not experimental separator performance.
