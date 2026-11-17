# Equilibrium composition and collection qualification

This completes the bounded equilibrium calculator: prescribed rigid gas rotation, uniform temperature, two ideal neutral species and a closed cylindrical inventory. It predicts radial number composition and the purity/recovery tradeoff for partitioning that inventory. It does not qualify the evolving discharge model, Marathon apparatus, continuous extraction or experimental accuracy.

## Calculation and independence

The force balance is `kT dn_s/dr = n_s m_s Ω²r`. Each exponential density is normalized to its own inventory using cylindrical volume coordinate `y = (r/R)²`. A cut is integrated over volume, not sampled at its boundary. Composition and purity are number fractions, not mass fractions. Empty-cut purity and absent-species recovery are undefined; genuine zero recovery is zero.

The calculator reuses the existing stable radial PDF/CDF primitives. A separately written 80-digit Python Decimal oracle uses direct exponential integrals without importing production code. An independent Simpson integral refines through 1,024, 4,096 and 16,384 intervals. The 5,280-case matrix covers six preset pairs, equal and nearly equal masses, extreme mass contrast, zero/weak/strong rotation, trace and pure feeds, empty/full cuts and cuts next to the wall. Gates are frozen in `tests/fuel-equilibrium.test.ts` and published in `/equilibrium.html`.

The numerical receipt records these maxima:

| Quantity | Observed maximum | Gate |
| --- | ---: | ---: |
| Absolute fraction/density error | 1.98952e-13 | 2e-12 |
| Relative positive PDF/CDF/survival error | 1.98308e-14 | 2e-11 |
| Absolute enrichment-gain error | 1.62166e-15 | 2e-14 |
| Species inventory split error | 1.11022e-15 | 2e-13 |

The separate small-gain relative gate and quadrature refinement gates also pass. These finite tests do not prove every real-valued input or qualify interpolation between plotted samples. The numerical screen is not a gas-phase or physical operating envelope. Input scenarios are explicit endpoint combinations, not confidence intervals or guaranteed extrema.

## Root-cause fixes and choices

**Tail and weak-enrichment arithmetic.** Subtracting an almost-unit CDF erases a small outer inventory; subtracting nearly equal normalization logs erases a weak enrichment signal. In simple terms, ordinary subtraction loses the small quantity we want to measure. Direct outer-tail integration, `expm1`/`log1p`, a factored small-rotation series and mass-difference arithmetic retain it. This is preferable to clipping results or increasing browser arithmetic precision: it avoids cancellation in evaluating the formulas, keeps the existing primitives and passes the independent oracle without a runtime dependency.

**Sample import followed an old plot redraw.** Playback can advance the clock and 3D scene without redrawing a time-history plot. The optional import originally cached that plot's state, so a running timeline could import time zero. The fix reads `diagnosticState(r)` on the explicit import click. This small read-only callback preserves playback, prescribed edits, worker state and the lazy calculator lifecycle; forcing plot redraws or pausing playback would change unrelated behavior. The integration regression advances playback without a redraw and asserts the imported state and continued playback.

**Mixture naming and gas-speed wording.** The native select's nested label/option structure made exact label lookup ambiguous; its explicit accessible name is now `Mixture`. This is an automation/naming improvement, not evidence of a demonstrated screen-reader failure. Residual “wall speed” wording now says “gas edge speed,” because the prescribed rotating gas is not the metal vessel.

## Interface and provenance

Open **Plots → Equilibrium**, independently of whether an evolving run is ready. Manual prescribed inputs are never overwritten by timeline redraws. **Use sampled state** is disabled while an accepted run is pending and copies the selected state only when clicked. Spatial gas temperature is explicitly reduced to its accepted mean; the import uses initial PVT neutral inventory and does not imply equality with the transient composition profile.

Two separate plots show local composition and all four cut purity/recovery curves. JSON export includes exact inputs, SI quantities, densities, selected species counts, full curves, scenario cases, model version and hashes of the producing calculator sources. The calculator has its own build identity rather than borrowing the worker identity. Invalid values clear owned outputs and disable stale export; prior valid output is not relabeled as current.

Independent numerical and ergonomics reviewers traced the final source and found no blocker within this scope. Final release evidence follows below.

## Release evidence

Final source: `c2d5f3dfe2525f20805deb8d57500121fbfba8a5`. [CI run 44001863876](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44001863876) passed the following exact checks:

- `node --import tsx --test --test-concurrency=1 tests/fuel-equilibrium.test.ts tests/fuel-equilibrium-ui.test.ts`: 11 passed, including the oracle and independent quadrature.
- Focused guide/integration, reference-domain and spatial-worker batches from `.github/workflows/verify.yml`: 41, 24 and 29 passed, respectively.
- `python3 -m unittest discover -s scientific/electron-applicability -p test_screen.py -v`: 17 passed.
- `python3 -m unittest discover -s tests -p test_argon_reference_export.py -v`: 3 passed.
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: 1,418 passed, zero failures/skips.
- `npm run typecheck`, `npm run build`, `npm run check:site`, `npm run check:assets`: passed. The existing large-JavaScript-chunk build warning remains; it is not a scientific qualification result.

No repository application or scientific code was executed on the host; CI runs tests/build offline in its restricted Docker container. Its exact `verified-site` artifact was deployed to [Mass Spinner](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev), Cloudflare version `b65ebcdd-b641-474c-86b7-fc34daf01040`. The independent numerical reviewer separately checked final CI, the 5,280-case receipt and all four receipt source hashes, and approved this bounded numerical scope.

Live browser checks on that final deployment:

- After a fresh run completed, import copied gas edge speed `1024.0774406765188 m/s` at the displayed 1 s. Import during active playback also produced a nonzero speed and preserved `aria-pressed=true` on Play. The integration regression separately advances the clock without a plot redraw and checks exact sampled values.
- At 500 K, increasing prescribed speed 1,000→2,000 m/s changed log α 0.12038→0.48151 (×4); then increasing temperature to 1,000 K halved it to 0.24076. Timeline playback did not overwrite the prescribed values.
- Empty and full cuts preserved undefined purity, zero recovery and full-inventory recovery as appropriate. A 200,000 m/s out-of-screen case cleared both plots and disabled export; valid inputs restored them.
- At a 390×844 mobile viewport, page width and scroll width both measured 390 px. Number inputs, the cut slider, plots and keyboard probes remained operable. Desktop plots and the 3D scene were visibly checked; temporary viewport overrides were reset. No captured browser console errors remained.
- Final JSON export at 1,000 m/s, 500 K and c=0.65 gave inner light purity `0.0788363371589518` and recovery `0.3367931117947634`. All eight producing-source hashes and aggregate identity `56e9494a5a5d88f197b348b3ef79f5537695f50e40165688ed2497c02d821533` matched final source. All four numerical-receipt hashes also matched.
- The published equations page displayed five rendered KaTeX equations and no KaTeX errors. Its return link was exercised. The six preset mixtures, pure-feed limits, scenario curves and timeline isolation were also exercised on the preceding deployment with the same numerical core.

Screenshots from final verification: `/tmp/mass-spinner-equilibrium-final-desktop.jpg` and `/tmp/mass-spinner-equilibrium-final-mobile.jpg`. This report is a documentation-only follow-up; the deployed runtime and qualification identity above remain the release under review.
