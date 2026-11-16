# Thermal increment precision

Status: the retained nine-case study has **66 passing, zero failing and six
unresolved checks**. The former wall-power contraction failure passes the
unchanged gates. Persistent liner heating remains unresolved. This is numerical
solver work, not experimental qualification or a deployment.

## Problems and root causes

1. **Tiny heat disappeared against stored thermal energy.** The previous solve
   formed absolute enthalpies and subtracted old energy, with an acceptance
   floor proportional to that background. A two-cell case returned zero face
   heat instead of the analytical `4.989720997935444e-16 J`; a zero-time step
   could also re-encode the liner's stored energy differently after inversion.
   In plain terms, subtracting two large readings erased the small change.

   The unknown is now temperature change. Gas energy uses the expanded
   `1.5 kB (Nnew ΔT + Told ΔN)` identity; tungsten uses the existing exact
   interval heat capacity integral. Stored energy is anchored to old stored U,
   with its representation defect reported separately. Residual tolerances
   scale with actual increments and exchanged heat, not background energy.

2. **Tiny particle transfers disappeared against stored inventories.** The
   former face transfer was a cumulative difference of old/new probabilities.
   The actual regression returned zero instead of `4e-28` transferred
   probability. Coupling that rounded difference to `Told ΔN` made the tighter
   thermal solve stall. Subtracting two nearly equal inventories cannot resolve
   their much smaller physical exchange.

   Integrated transfers now solve the algebraically equivalent SG face system:
   `(1+a+b) Fᵢ − a Fᵢ₋₁ − b Fᵢ₊₁ = a pᵢ − b pᵢ₊₁`.
   Its pressure forcing is factored, and elimination preserves the diagonal's
   `+1` under stiffness. The existing positive cell solve remains authoritative
   for stored probabilities; `stored Δp − div(F)` is explicitly reported.
   Thermal particle changes, enthalpy and momentum use the same signed F.

3. **Rounded endpoint temperatures lost the pressure-driving gradient.** After
   fixing transfers, all nine fine-grid cases still stalled at their first
   advancing step. Neighboring-temperature probes changed transfer and residual
   discontinuously while heat input remained effectively fixed. The solver
   retained ΔT, but its transport callback rounded it back into absolute T.

   Built-in callbacks now carry the actual old temperature and its increment.
   Pressure differences retain both `Told Δp + pnext ΔTold` and
   `θleft Δp + pnext Δθ`. Positive rate coefficients and material properties
   still use rounded endpoint temperature. A supplied basis must reproduce that
   endpoint exactly. It is transient solve data, not a new persisted schema.

4. **Continuation changed a canonical pressure value by one ULP.** Playback
   averaged cell pressures; observation rescaled mean temperature instead.
   Equivalent real-number formulas can round differently. Spatial observation
   now uses the same cell-pressure average as playback. The existing exact
   stale-history assertion remains; the lumped path and saved schemas do not
   change. This fixes the inconsistency rather than weakening equality.

## Why this approach

These changes preserve the SG/backward-Euler equations, closures, physical
coefficients and frozen convergence gates. They address information loss where
it occurs. Restoring a background-energy tolerance would hide the tiny-heat
regression. Reconstructing all inventories from signed increments would risk
cancellation and negativity in stiff, depleted cells; retaining the positive
cell solve avoids that risk and exposes the representation discrepancy.

Independent 80/120-digit Decimal references are offline validation tools;
arbitrary precision is not added to the interactive time step. The heat
reference solves the isolated linear BE problem. The SG reference solves the
original cell equations, independently of the new face algorithm, and reports
cancellation, rounded-temperature and storage effects without new gate floors.

## Coupled refinement

Producer `8631723313bca31cf6abfc0b2b9e0b47cd2728b4` completed all nine native
trajectories: 1024/2048/4096 gas cells crossed with 64/128/256 steps over 1 μs.
The electrical mesh stays e16/z32 and the liner stays three cells. All six
comparisons retain 2% spatial / 1% temporal limits and strict contraction.

| Comparison | Coarse adjacent error | Fine adjacent error | Result |
| --- | ---: | ---: | --- |
| Spatial wall power, 64 steps | 0.00121124% | 0.000319704% | Pass |
| Spatial density response, 256 steps | 1.48852% | 0.372259% | Pass |
| Temporal density response, 4096 cells | 0.245597% | 0.123852% | Pass |

The former wall-power failure was small but noncontracting. Its adjacent
absolute differences now decrease from 4.11059e-12 to 1.08498e-12 W. All
assessed wall-power, density and other non-liner metrics pass. All six stored
liner-temperature responses are zero and correctly remain unresolved.

An independent audit checked 85 producer source hashes, all native stream
hashes, row counts and clocks, continuity, projection and energy/angular-momentum
accounting. Incremental thermal residuals are below 2.95e-27 J; stored-energy
prefix defects remain about 1.71–1.73e-13 J against 1.523e-9 J electrical input,
dominated by liner storage. These accounting figures are diagnostics, not a new
energy acceptance gate. A temperature increment smaller than the stored
energy's representable spacing can still be lost between steps.

## Independent references

- **162 isolated heat cases pass** the strict 2% nonzero increment/face-heat
  checks against independent 80/120-digit references. Exact-zero controls are
  assessed separately. This is the discrete linear backward-Euler problem,
  not a nonlinear-material or continuum qualification.
- **292 SG cases complete**, which does not mean 292 accuracy passes. The four
  signed sub-ULP temperature-basis cases recover nonzero transfers with worst
  relative error 5.58e-17. The earlier 288 baseline metrics are unchanged.
- Near pressure equilibrium, a tiny reference transfer of about 1.745e-17
  still has **26.9% relative error** (absolute error 4.69e-18). Underflow tails
  and stored-probability jitter also remain visible. No absolute-error floor
  or new acceptance allowance masks them. Full SG relative accuracy remains
  unqualified in this cancellation-dominated regime.

## Execution, regression and provenance

- Actual failing tiny-heat/zero-time run: `43856604968`.
- Actual failing tiny-transfer run: `43860302706`.
- Direct-face candidate `27aa1a6`: 162 isolated heat cases passed the independent
  reference; targeted hot-wall/mixture tests passed. Full regression and all
  nine coupled cases still failed, exposing the temperature-gradient issue.
- Temperature-basis candidate `8631723`: targeted checks, including the
  1,024-cell coupled regression, passed; 1,332/1,333 full tests passed, with the
  pressure-continuation discrepancy as the only failure.
- Source `1c03f14` passes all 1,333 TypeScript and 20 Python tests plus typecheck,
  build, site and asset checks in
  [43863009694](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43863009694).
- Final analysis code `92b398da7117e62cf1a913e8204e1392d4dc73ee` passes
  **1,335 TypeScript and 20 Python tests**, `npm run typecheck`, `npm run build`,
  `npm run check:site` and `npm run check:assets` in
  [43866560948](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43866560948).
  The two added CLI regressions cover old valid input and stale/missing producer
  configurations. Site/asset checks are structural, not browser/GPU verification.
- [Producer 43861655611](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43861655611)
  timed out during postprocessing after all nine trajectories completed. A
  separate offline assessment of those retained streams succeeds in the
  `8631723` job of
  [43866560852](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43866560852).
  Producer and assessor identities are separate; the retained index SHA256 is
  `3c10e8f3d1a29e1c9da2819c27ee93a8399bd5a91c2f02cdec27c94c6996a47e`.
- [Repeat 43863009813](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43863009813)
  at `1c03f14` completed only eight of nine trajectories before its 25-minute
  timeout. All eight compressed stream hashes match the corresponding complete
  producer streams. The missing 4096-cell/256-step case is correctly refused by
  assessment; **there is no complete latest-source replay**. The postprocessing
  workflow is consequently mixed: old complete producer succeeds, partial
  repeat fails admission. Workflow status does not replace scientific status.

Capture and assessment run offline with one CPU and a 1 GiB memory limit.
Splitting assessment avoids discarding completed trajectories or changing
physics/resource limits. Frozen conditions and every case configuration are
checked before reuse; source and stream identities are independently
authenticated before admitting the assessment. The complete capture's peak RSS is unavailable;
assessment RSS is explicitly postprocessing-only. The finest complete native
trajectory took 480.9 s, versus 186.8 s for the earlier implementation: the
precision fix has a cost, not an established interactive-performance benefit.

Compact retained receipts (relative to the repository):

- `scientific/spatial-argon-20261116/heat-precision-results-92b398d.tar.gz`,
  SHA256 `ee26f9a890e89ca82e4edbb0b032e30586555c02ea64e5855c2649bb20d40200`:
  both producer metadata sets, complete/partial indexes, assessments and oracle
  inputs/results. Duplicate verbose SG log omitted; its JSON assessment remains.
  Native complete streams remain in
  [producer artifact 14225445868](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43861655611/artifacts/14225445868).
- `scientific/spatial-argon-20261116/heat-negative-receipts.tar.gz`,
  SHA256 `12a605b1d5130f8c5be143ce8d530807870eb1d765ea7e1a4c8809d418495213`:
  earlier failed coupled attempts, retained without promoting their outcomes.

The separate frozen V122 CFL0.05 run ended in an operational RSS refusal:
900,004 KiB exceeded its unchanged 900,000 KiB guard. It has no completed worker
result or new physical admission. Its independently reviewed negative evidence
is separate from this nine-case result; no retry or resource increase is implied.

Passing these bounded controls does not establish full continuum convergence, resolve
sub-ULP persistent wall storage, validate custom callbacks that ignore the
temperature basis, or establish experimental/device accuracy. Electrical and
liner spatial refinement, longer transients and live-default qualification are
outside this result. No qualification flag or deployed default was promoted.
