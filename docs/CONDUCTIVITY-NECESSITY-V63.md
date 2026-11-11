# Conductivity necessity assessment

Status: bounded sensitivity screen complete. Eight coupled trajectories and
joint space/time refinement completed; no production change or new κ(T) law.

Question: does a more defensible conductivity materially affect this playground,
and is a temperature-dependent law needed beyond correcting a constant?

Execution path: `fuel-centrifuge-ui.js` constructs the optional spatial thermal
configuration → `simulateFuelOperation` → `advanceFuelMixtureThermal`. Its constant
conductivity multiplies conservative internal gas heat links and enters the gas
half-cell wall resistance. Endpoint temperature feeds species pressure drift and
centrifugal redistribution, which feeds the neutral inertia and rotor dynamics.
The default thermal switch is off, so this parameter has no effect there.

The v62 coefficient discrepancy does not measure output sensitivity. We therefore
use the unchanged production solver with four prescribed constants: legacy
0.1 W/(m K), and the published theoretical Li fit evaluated at 500, 750 and 1000 K.
The source is Bouledroua (2006),
https://www.jspf.or.jp/JPFRS/PDF/Vol7/jpfr2006_07-217.pdf:
κ=1.398e-4 T^0.863 W/(m K), 100–3000 K, dilute monatomic lithium.
This is a neutral-gas proxy, not plasma/electron conductivity, isotope-resolved
measurement, or an endorsement of equilibrium gaseous lithium at every input.

All runs use the default 1 s lithium setup, spatial 1 mm/16-cell tungsten liner,
500 K initial gas, 1000 K initial liner, 10 Pa initial pressure, nominal 0.1 W/K
wall film and 1 W/K coolant coupling. Primary cases use 128 gas cells and
2.5e-6 adaptive relative tolerance, 512 nominal base steps. Observe the same
physical times (181 log points from 1e-7 to 1 s plus 101 linear points).
Compare temperature fields, mean temperature, spin, species CDFs, collection
purity/recovery, heat uptake and wall heat rate. Peaks are over those observation
times, not independently proven continuous-time extrema. Retain every run's
conservation/positivity checks and adaptive-control diagnostics.

Relevance screens fixed prospectively: 1 K local temperature, 0.5% spin difference
normalized to the baseline peak spin, 0.5 percentage-point recovery change, or
0.01 percentage-point purity change. These are interpretation screens for the
playground, not experimental accuracy requirements or physical qualification.
Refine spatial/time settings for the strongest contrast before drawing a decision.

Frozen-k comparisons cannot prove a bound for the nonlinear coupled κ(T) solution.
The 500/1000 K constants isolate variation across a nominal heating interval;
actual simulated temperatures may exceed it because the drive also heats gas.
Compare the 750 K constant to the endpoints to assess whether a better constant
alone plausibly suffices. An actual temperature-dependent comparison is a later
implementation gate, not silently substituted by this screen.

## Observed results

The primary four trajectories completed in 41.11 s. Repeating all four with
256 cells and 6.25e-7 relative tolerance completed in 177.49 s. Temperature
absolute tolerance is 2.5e-7 K primary / 1e-7 K refined. The simulated gas stayed
between 500 and 1000.201 K; all species populations stayed nonnegative. Maximum
recorded relative thermal residual across all eight runs is 1.52e-13; species,
mechanical energy and angular-momentum residuals are each below 1.34e-14.
These are numerical balances, not physical model qualification.

The following maxima use matched observation times in the refined trajectories.
Spin differences are normalized to the baseline peak spin, not instantaneous
startup speed. Recovery is the inventory inside the virtual collection cut;
the closed vessel does not physically extract a product stream.

| Comparison | Local temperature change | Mean temperature change | Neutral spin change | Light recovery change |
|---|---:|---:|---:|---:|
| Legacy 0.1 → fit at 500 K (0.029834 W/m K) | 48.499 K | 19.264 K | 0.029714% | 0.283082 percentage points |
| Legacy → fit at 750 K (0.042334 W/m K) | 29.306 K | 11.452 K | 0.017082% | 0.167309 percentage points |
| Legacy → fit at 1000 K (0.054263 W/m K) | 18.552 K | 7.179 K | 0.010527% | 0.104664 percentage points |
| Fit at 750 K → fit at 500 K | 19.505 K | 7.846 K | 0.012649% | 0.115988 percentage points |
| Fit at 750 K → fit at 1000 K | 10.845 K | 4.273 K | 0.006555% | 0.062706 percentage points |

The largest temperature contrast is at 4.642 ms; the largest mean-temperature
contrast is at 12.429 ms. At 1 s the largest remaining mean-temperature difference
between legacy and the three fit-based constants is only 0.005236 K.
Do not quote these maxima as changes produced by an actual evolving κ(T) law.

For each frozen constant, comparison of primary versus refined trajectories
conservatively restricts fine-cell U and N onto the coarse equal-volume grid,
then reconstructs temperature. Maximum matched-cell refinement changes are
0.0386–0.0404 K. The two meshes' reported peak *conductivity contrasts* differ
by up to 0.159 K because the finer grid also samples different cell centers.
The 10–48 K thermal effects are large compared with these numerical differences.
This is one joint refinement, not an independent asymptotic convergence study
or separate proof of spatial and temporal orders for every conductivity.

Spin refinement changes are about 0.0072% of peak spin, and recovery refinement
changes stay below 0.00080 percentage points. Purity contrasts are smaller than
the purity refinement differences; they are not resolved quantitative predictions.
Only the temperature relevance screen is exceeded. All spin, purity and recovery
screens remain below their prospectively stated thresholds.

## Why it matters, and what it does not establish

Fourier heat flux is `q = −κ ∇T`. With the initial ideal monatomic gas,
volumetric heat capacity is `3p/(2T)=0.03 J/(m³ K)`. The radial conduction scale
`R² Cv,volume/κ` is about 4.32 ms for the legacy value and 14.48 ms for the
500 K fit value. The total-gas nominal film-heating scale `Cv,total/Gfilm` is
about 10.86 ms. These are order-of-magnitude continuum scales, not kinetic
collision times or exact coupled eigenvalues. They explain why conductivity
changes the startup profile even when final temperatures nearly coincide.

In plain terms, the wall heats the gas on roughly the same timescale that heat
spreads across the vessel. A larger prescribed conductivity makes that spreading
too fast relative to this Li proxy. The rotor and virtual-cut separation in this
particular case change much less than the temperature field does.

Recommendation: add a sourced temperature-dependent **neutral Li** option to the
advanced spatial thermal model, retaining prescribed conductivity for controlled
experiments and unsupported species. It is worthwhile for startup heat-flow plots;
it is not required for the default isothermal playground or a demonstrated major
separation-performance correction. A better constant is adequate for a narrow
temperature interval: `dκ/κ ≈ 0.863 dT/T`. The present 500→1000 K heating interval
is wide enough that the fit changes by a factor of about 1.82, so a single
reference-temperature constant is a substantial approximation for thermal detail.

This minimal constitutive increment is preferable to introducing a new CFD stack
for one coefficient. Reuse the conservative coupled energy path; evaluate the
temperature-dependent flux consistently in its nonlinear residual and Jacobian,
including the gas half-cell at the wall. For the power-law fit, a Kirchhoff
primitive `F(T)=1.398e-4 T^1.863/1.863` provides an exact temperature integral for
the face law. Merely changing κ once at the initial or average temperature would
leave the spatial constitutive issue unresolved. That future implementation needs
constant-law regression, nonlinear heat-flow references, positivity/energy/entropy
checks and renewed joint refinement before live use.

The source fit is theoretical dilute monatomic Li transport over 100–3000 K;
its applicability to an isotope mixture and partially ionized device remains
conditional. The nominal wall film is still uncalibrated; radial momentum,
acoustics, chemistry/condensation and electron/ion energy exchange remain absent.
The 500 K / 10 Pa initialization is a prescribed gas state, not a demonstrated
equilibrium lithium-vapor operating point. Neither eight numerical runs nor a
more detailed coefficient validate those assumptions. Results are case-specific;
other slider combinations have not been screened here.

Marathon's [partial-ionization centrifuge disclosure](https://patents.google.com/patent/WO2026064411A1/en)
provides architecture and operating concepts, not a measured conductivity closure
that would calibrate this coefficient. No additional device-specific value was
inferred from it. A separate [lithium vapor-box study](https://arxiv.org/abs/1808.02908)
also illustrates temperature-sensitive Li mass transport and experimental DSMC
validation; its geometry, temperature accuracy requirement and wall data are not
transferred into this centrifuge.

## Verification and provenance

All project execution was offline inside the existing safe-dev source copy
`/work/home/fix-v43-source` at stage
`/private/tmp/mass-spinner-marathon-v35-final`. The reviewed controller explicitly
copied new scientific files and verified each input manifest before and after.
The VM's valuable prior outputs were not replaced or deleted.

Exact controller commands, receipts and input manifests are under
`scientific/fixes-v43/conductivity63-*`:

- `conductivity63-primary`: `node_modules/.bin/tsx scientific/conductivity-v63/campaign.ts /work/home/conductivity-v63-primary 128 0.0000025 all`;
  653 inputs, SHA256 `b1302495565e42ad771253609bf8a893d553c9de68c212953f4697892d2c517c`.
- `conductivity63-screen`: `compare.py` primary observation comparison;
  655 inputs, SHA256 `219762aff10768f308b34570e413d1222557ec4a2d29e43575f6aebf7b159429`.
- `conductivity63-refined`: the same campaign with destination `/work/home/conductivity-v63-refined`,
  256 cells / 6.25e-7 tolerance; the same 655-input hash. Solver arithmetic
  is unchanged between all cases; only existing conductivity/resolution inputs differ.
- `conductivity63-final`: `/work/home/gas-regime-v56-venv/bin/python scientific/conductivity-v63/final.py`;
  656 inputs, SHA256 `8c3c10e8937d5487bf34f3f1cf8a9e7f0e9ec42f64818ac0fe3392d198c1d116`.
  The additional file is final-gate orchestration, not a production-law change.

Final checks: `python -m unittest discover -s scientific/conductivity-v63 -p 'test_*.py'`
**3/3 pass**; analogous spatial-regime v62 suite **11/11 pass**; `npm run typecheck`,
`npm run build`, `npm run check:site`, and `npm run check:assets` all exit zero.
Metric fixtures cover identity/nested conservative restriction, known perturbations,
peak-spin normalization, and mismatched times/setup/mesh rejection. No production
bug was corrected, and no complete application test rerun or new independent-agent
audit is claimed for this assessment-only change.

All 151 rebuilt release files are byte-identical to the deployed v61 Final D,
release SHA256 `889256c3ef8ae80b934786f1dec45f4b5f1d9a06f39dd787d0245df11390a56d`.
There is no new deployment or fresh browser verification. The scoped export
preserves 20 artifacts (35,879,978 raw bytes) under
`scientific/centrifuge-v44/conductivity63/studies/`, including all eight sampled
trajectories, both comparison tables, refinement, individual gate logs, final
receipt and PNG/SVG plots with a per-artifact SHA256 manifest. Raw trajectory
JSON is losslessly gzip-compressed. The PNG was reopened and visually inspected.
