# Joint hot-wall spatial and timestep assessment, v60

Completed joint studies, independent reviews, release checks and deployed
browser verification on 2026-11-09 local time (2026-11-10 UTC). The live **64 gas cells,
16 tungsten cells and 512 nominal intervals do not qualify the local hot-wall
gas field** under the registered numerical targets. Good rotor and integrated
heat accuracy do not establish local boundary-layer accuracy.

## Actual path and root cause

The live UI sends `fuelCentrifuge` to the emitted worker, which calls
`simulateFuelOperation` with default transport options. That constructs 64
equal-volume gas annuli; the UI selects 16 solid cells for spatial tungsten.
The v59 graded time grid retains 872 intervals for the one-second hot-wall
startup. Accepted conserved states drive both plots and 3D temperature samples.

The same path advances `advanceFuelMixtureThermal`, including pressure-driven
species flux, species enthalpy, Fourier conduction, reciprocal rotor work and
temperature-dependent tungsten properties. It is an experimental overdamped
monatomic mixture, not a full radial gas-flow or kinetic solver.

The v59 fix resolved the roughly 99 microsecond rotor mode. Thermal relaxation
over an outer gas cell is faster: initially about 0.268 microseconds at 64 cells,
and roughly 16.6 nanoseconds at 256. Its first 1.55 microsecond live step can
therefore conserve the budgets while smearing the evolving thermal profile.
Increasing cells without jointly refining time makes this disparity worse.

In simple terms, the gas can exchange heat across one thin cell much faster
than its bulk rotation changes. A timestep suitable for rotation is not
automatically suitable for that heat flow.

No omitted gas half-cell or factor-of-two boundary defect was found. In the
equal-volume coordinate `y=r²/R²`, internal Fourier conductances are `4πLκi`.
The boundary correctly uses the following series resistances:

```
R_interface = 1/G_film + 1/(8πLκN_gas)
              + ln(r_solid_center/R)/(2πLκ_solid(T))
```

Removing a resistance to obtain a smaller error would change the represented
boundary condition. The independent reference verifies this boundary instead.

## Preregistered numerical targets and comparison method

The full mixture study crosses gas cells 64/128/256 with nominal intervals
512/2,048/8,192, then adds finer runs and separate wall-mesh checks. The initial
gas is 500 K, initial tungsten 1,000 K, pressure 10 Pa, gas conductivity
0.1 W/(m K), film 0.1 W/K, and geometry radius 0.12 m by length 0.8 m. Other
parameters are the default lithium centrifugal configuration. The benchmark is
startup with fixed discharge current, not every slider combination or a new
joint refinement of all possible current interventions.

All runs use identical physical observations, including dense samples from
0.1 microseconds through the thermal transient and the previous late times.
Accuracy targets were set before observing the output:

- Ion and neutral rotor differences below the existing 3% target, with
  denominator `max(1 rad/s, abs(reference speed))`.
- Maximum common-annulus temperature difference below 0.1 K.
- Maximum local heating-signal difference below 5%, where reference cell rise
  from the initial temperature is at least 0.1 K.
- Instantaneous wall heat-rate difference below 1% where its reference
  magnitude is at least 0.5 W.
- Signed cumulative wall heat difference below 1% where reference magnitude
  is at least `1e-6 J`.
- Species positivity and inventory, mechanical energy, angular impulse and
  thermal budget checks at every accepted state, retaining `2e-8` tolerances.

These are numerical qualification targets, not experimental error bars.
Inactive relative-signal regions are reported as unassessed, never silently
passed. Pressure and species cumulative distributions are separate diagnostics;
passing them does not certify every pointwise species wall feature.

Temperatures at the outermost fine and coarse cell represent different annuli.
The new comparison projects conserved species probabilities and gas energy to
the **same physical volume**, then reconstructs
`T=U/(1.5 kB N)` and `p=U/(1.5 V)`. An arithmetic mean of temperatures is wrong
when particle counts differ. Independent TypeScript and Python projection
implementations have unequal-inventory and corrupt-input regression controls.

The gas first law identifies signed wall heat separately:

```
Q_wall_to_gas = U_gas - U_gas_initial
               - E_slip - E_Ohmic - W_redistribution
```

Total gas energy gain includes those sources and is not wall heat. The study
also distinguishes instantaneous relative heat-rate error from a difference
normalized by the initial 50 W load; the latter can mask a large relative
error when the later flux is small.

## Final joint-reference findings

The independent analyzer audited 19 distinct grid/time/horizon cases. Its
comparison reference uses the actual 512 gas / 128 wall / 32,768-interval
one-second run, replacing observations through 2 ms with a separately computed
512 / 128 / 16,384 run over that shorter horizon. Both windows use exactly the
same recorded physical observation times. The campaign uses the production
`sampleFuelTransport` path, which interpolates canonical states when an
observation lies between accepted integration knots. The independent analyzer
adds **no further interpolation or resampling**; its metadata flag refers to
that construction, not to every observation being an integration knot. This
composite is a comparison dataset, not a newly integrated conserved trajectory.

| Full-duration run, gas / wall / intervals | Max common-annulus ΔT | Max local heating-signal difference | Max instantaneous wall-rate difference | Max cumulative wall-heat difference | All registered accuracy comparisons |
|---|---:|---:|---:|---:|---|
| Live 64 / 16 / 512 | 1.01528 K | 84.02% | 6.267% | 0.3133% | fail |
| 64 / 16 / 8,192 | 0.04863 K | 13.26% | 0.3007% | 0.0443% | fail |
| 64 / 16 / 16,384 | 0.02539 K | 9.169% | 0.1002% | 0.0370% | fail |
| 128 / 32 / 16,384 | 0.02099 K | 5.364% | 0.1003% | 0.0148% | fail |
| 256 / 64 / 16,384 | 0.01868 K | 4.683% | 0.1003% | 0.0088% | conditional pass |
| 512 / 128 / 16,384 | 0.01787 K | 4.203% | 0.1003% | 0.0072% | conditional pass |

The live temperature maximum occurs in the axis-adjacent annulus at 21.752 ms;
the heating-relative maximum is at 0.750 microseconds in annulus 60 of 64
(radii 0.11619–0.11715 m), and the instantaneous rate maximum at 48.697 ms.
The demonstrated time error extends beyond the initial wall layer into bulk
heating. Its ion difference is 1.298%, still below the 3%
rotor gate. An 84% local *heating-signal* difference is not an 84% error in the
absolute 500 K gas temperature. Every case passes the recorded accepted-state
species positivity/inventory and mechanical/angular/thermal conservation gates.

Reference self-checks, retaining the same signal masks:

- At fixed 512 gas / 128 wall cells, full-duration 16,384→32,768 intervals
  changes temperature by 0.01623 K, local heating by 2.304%, wall rate by
  0.1003%, and cumulative heat by 0.0041%; all comparison targets pass.
- Over the separate 2 ms window, 256 gas / 64 wall cells with
  8,192→16,384 intervals changes temperature by 0.001209 K and heating by
  0.3565%. At fixed 16,384 early intervals, 256→512 gas cells changes them
  by 0.001325 K and 0.3394%; all targets pass.
- The full-duration 32,768 run and the early-window reference differ at their
  shared early times by 0.008201 K and 2.000% of local heating; all targets pass.
- Isolating the solid mesh at 64 gas cells / 8,192 intervals, 16→64 tungsten
  cells changes gas temperature by only `4.45e-6 K`. The thin tungsten wall
  is not the dominant source of the demonstrated gas error.

Two alternative full-duration histories pass all comparisons, plus the
32,768-reference-versus-early-window overlap check; the analyzer's pass count
of three includes that overlap and is not three independent replacement runs.
These are finite-reference self-checks, not rigorous error bounds. The 4.683%
candidate has little margin against the 5% heating gate, especially given
remaining reference uncertainty. **Do not promote it to an accuracy-guaranteed
live default.** The 64-cell runs still fail the heating gate even at 16,384
intervals: temporal bias dominates the coarse matrix, but space matters once
time is refined. The initially promising 64/8,192 comparison below was a false
qualification if interpreted without the finer reference. No threshold has
been loosened to make that setting pass.

## Initial matrix findings, superseded by the finer comparison

Against the initial finite 256 gas / 64 solid / 8,192-interval reference:

| Run | Max annulus temperature difference | Max local heating difference | Max instantaneous wall-rate difference | Max cumulative wall-heat difference |
|---|---:|---:|---:|---:|
| Live 64 / 16 / 512 | 0.96664 K | 90.54% | 5.948% | 0.2959% |
| 128 / 32 / 2,048 | 0.19404 K | 29.82% | 1.197% | 0.0628% |
| 64 / 16 / 8,192 | 0.01240 K | 4.451% | 0.0232% | 0.0269% |

The first two rows fail local temperature, heating-signal and instantaneous
rate targets, while rotor and cumulative wall-heat targets pass. The first
row's maximum absolute temperature difference occurs around 21.75 ms; its
local relative-heating maximum is around 1.0145 microseconds. Both early and
later temporal error matter.

The 64 / 8,192 row passes this *initial finite-reference comparison*, which is
not sufficient to certify it. The next time refinement at 512 gas cells,
8,192→16,384 intervals, still differs by 5.146% of early local heating at
0.1 microseconds, although its maximum absolute difference is 0.03244 K.
At fixed 16,384 intervals, 256→512 gas cells differs by only 0.001442 K and
0.3333% of local heating. These checks support temporal error as the dominant
demonstrated problem, but do not turn a finite reference into exact truth.

## Independent cylindrical continuum control

The previous FiPy/Bessel insulated Fourier test did not exercise a hot Robin
wall. The new independent SciPy oracle solves the cold-cylinder/hot-wall step
using `J0` modes with roots `μ J1(μ)=Bi J0(μ)`, exact annulus-integrated modes,
and analytically computed surface temperature, wall heat rate and absorbed heat.
It imports no production conductance, property or integrator helpers. Sources
and derivations are in the independent physics review.

The actual production kernel is run with frozen species, zero rotation and a
thermostatted solid. A recorded positive solid source compensates its heat loss;
this is a test thermostat, not a new physical wall-drag model. The exported
wall temperatures verify that the solid stays fixed.

This control uses a **20 ms quadratic time grid**, different from the live
one-second rotor-graded grid. Its results must not be relabeled as live errors.

| Fourier-limit control | Max temperature error against continuum | Max error / actual reference surface heating | Registered accuracy verdict |
|---|---:|---:|---|
| 64 gas / 512 | 0.36948 K | 9.4565% | fail |
| 128 gas / 512 | 0.36962 K | 12.8263% | fail |
| 256 gas / 512 | 0.36969 K | 14.1131% | fail |
| 64 gas / 2,048 | 0.09234 K | 3.9369% | pass |
| 64 gas / 8,192 | 0.02309 K | 2.7316% | pass |
| 256 gas / 8,192 | 0.02311 K | 1.2241% | pass |

Six of ten controls pass all registered accuracy targets; four failures are
retained. All ten pass heat-rate and absorbed-heat targets. Reference truncation
between 512 and 1,024 modes is at most `6.83e-13 K`, and the finite-solid
half-cell continuum correction is at most `1.52e-5 K`. Neither explains the
failed profile gates. Oracle tests independently check eigenvalue residuals,
annulus integrals against quadrature, heat derivative against boundary flux,
energy consistency and deliberate corrupt energy/flux rejection.

## Bounded implementation changes

The thermal Newton residual tolerance recalculated the same
`Math.max(...values,coolantK)` separately for every row. This was an O(n²)
scan in an otherwise mostly linear-cost kernel, making large refinement runs
needlessly expensive. Hoisting the identical maximum once preserves its operand
order, tolerance and result while making that scan O(n). In simple terms,
every cell was repeating the same search through the whole temperature array.
This change was chosen over loosening tolerances or accepting a coarser reference.
An exact before/after trajectory replay is part of the final checks.

The 512-cell / 32,768-interval reference also exposed a terminal diagnostic
failure after integration: `Math.max(...checkpoints.flatMap(...))` expanded
about 111,000 inventory errors into function arguments, exceeding V8's argument
limit. The physics advance had completed; the summary reduction crashed. In
simple terms, the bookkeeping tried to pass the whole history to one call.
The three terminal maxima now accumulate in one streaming loop with constant
argument count. This preserves the nonnegative maximum and NaN rejection and
avoids the temporary history arrays. It was chosen over truncating checkpoints,
loosening refinement or changing solver equations. A two-cell, 32,768-interval
regression reproduces the original exception and passes after the fix; the
adjacent startup, entropy, event and legacy-continuation checks also pass.
This does not qualify arbitrarily large resumed event histories: the separate
resume-prefix append still uses a spread call and was not implicated in this
startup failure.

The temperature-profile description now explicitly identifies cell averages
and the need for joint mesh/time refinement. It does not promote a cell-center
value to a resolved wall-face temperature or promise qualification for new inputs.
The live numerical defaults are not silently changed by this assessment.

## Physical interpretation and remaining limits

Numerical convergence of this reduced continuum model is distinct from physical
validity. The earlier lithium assessment's mean-free-path proxy is about
0.65 mm, comparable to the modeled 0.577 mm thermal penetration depth at
0.1 microseconds. A radius-based small-Knudsen screen does not establish local
Fourier transport or an equilibrium accommodation law for that perturbation.
Conductivity, mobility, film conductance, drag and friction remain prescribed.
Mechanical collision frequency is not neutral thermal relaxation data.

The model retains local common species temperature and overdamped radial
pressure relaxation. It does not solve radial acoustics, a full multicomponent
gas momentum system, kinetic wall layers, Soret/Dufour terms or surface chemistry.
Thin weak density features can be smaller than the thermal layer. Qualification
of common-annulus temperatures, heat and CDFs is not pointwise kinetic resolution
or a calibrated Marathon-device prediction.

Independent reviews:
[physics](reviews/v60-hotwall-physics.md),
[numerics](reviews/v60-hotwall-numerics.md),
[integration](reviews/v60-hotwall-integration.md).

## Evidence and final status

Initial exact receipts are under `scientific/fixes-v43/hotwall60-*`:

- Projection/scale regressions: three passed; 623 inputs,
  SHA `5be88f8cc24aef31dcc7b272636bb65883cfdadbace74970cb16cbf98bb3d004`.
- Full 3×3 matrix: execution/budget checks passed; accuracy failures retained;
  624 inputs, SHA `5627e1a7001d7279e3645b84026b25f10f1d0159ba6f5775a4080b8d2a749683`.
- Robin emission/reference and three oracle unit tests: passed execution gates;
  624 inputs, SHA `da27314be3d279edf7092538a3d780b58c421802a9a56b67cd6cc81a79e6d3ef`.
- Fine full-mixture runs: 256/16,384, 512/8,192 and 512/16,384; 624 inputs,
  SHA `436905d1e6f94c5b5b5fcb74dde397b5abdb316508b3551d87aced8804058d7b`.
- The first extra batch saved four valid cases, then its 512/32,768 run exhausted
  Node's default ~2 GiB heap. The negative receipt/log remains retained. The
  retry reserves a 3 GiB process heap within the unchanged 4 GiB isolated VM;
  it does not relax a solver tolerance or change the VM isolation boundary.
- That retry completed integration but failed the terminal argument-list
  reduction. `hotwall60-history-before` reproduces it in a cheap regression;
  `hotwall60-history-after` passes all 12 targeted tests with 627 inputs,
  SHA `de763c91bd6d19db45c6e9e2697b417f249d267e704618185820c8aa8482aa85`.
- `hotwall60-reference32-fixed` completes the full 512 gas / 128 wall /
  32,768-interval reference with 55,733 retained intervals in 211.17 s at the
  same 627-input SHA. Maximum inventory, angular, mechanical and thermal
  residuals are respectively `2.25e-14`, `6.72e-14`, `3.59e-14` and `4.01e-14`.
  These are conservation results, not a claim that the finite reference is exact.

Raw cases, JSON results, compression manifests and final release/browser evidence
are preserved under `scientific/centrifuge-v44/boundary60`.
Scientific/project execution occurs only in the offline safe-dev VM. Independent
reviewers derive methods, author checks and inspect actual execution receipts;
this is not a claim that each reviewer separately launched a duplicate VM run.

Final required gate: `python3 scientific/fixes-v43/control.py --timeout 900
v44-final-boundary60 -- python3 scripts/run-final-v44.py boundary60`.
All 18 commands passed against 627 verified inputs, source snapshot
`de763c91bd6d19db45c6e9e2697b417f249d267e704618185820c8aa8482aa85`:

- `npm test`: 1,178 passed, no failed/skipped tests.
- `npm run typecheck`, `npm run build`, `npm run check:site`,
  `npm run check:assets`: passed.
- Emitted release-worker and fuel-worker checks, recorded collision-data check,
  mixture studies, Fourier-input/FiPy control, and inherited hot-wall timestep
  studies: passed execution checks.
- Eight Python reference/adversarial tests, production Robin emission and
  independent spectral reference, independent 19-case joint analysis, and
  wall-grid replay: passed execution/invariant checks. Deliberate accuracy
  failures remain in the results.
- Exact replay: every common-time canonical field of the 64 / 16 / 8,192 case
  is identical before and after the maximum-hoist and diagnostic changes.

The 151-file release hash is
`c6d1860614c29860ff273f6201954444b511e47433883da6e41791dfcd793002`.
Cloudflare confirms 100% deployment of version
`ba666a2e-c7c4-4be2-bb10-cee454d69d8f`. The browser loads
`assets/index-DHzYnwCZ.js`; the checked worker is `assets/worker-BL8gZVWZ.js`.
Provider rollout and passing release checks alone are not browser verification.

The actual deployed browser was then checked through ordinary UI controls:

- Observed new entry file and Model info's 64 gas / 16 wall / 512 nominal /
  872 retained startup intervals, matching the studied configuration.
- Keyboard selection of the first accepted spin-up sample synchronizes the
  timeline at `1.546568779381e-6 s`. Selecting Temperature profile and Show in
  3D keeps that time; the View panel confirms the Temperature field. The
  released cell-average/refinement text is visible. Gas mean is 500.1 K,
  ion speed 0.4088 m/s and neutral speed 0.00006385 m/s.
- Cut power, export and inspect the next accepted sample: ions slow to
  0.4026 m/s while gas initially accelerates to 0.0001267 m/s. The actual
  startup/coast downloads retain 872/873 intervals and pass an offline VM
  audit of positivity, every accepted thermal budget, mechanical/angular
  maxima and exact canonical-prefix preservation. Current alone is
  right-continuous at the intervention.
- Both downloads' 39 producing-source hashes match the checked guest files;
  producing-code aggregate is
  `840dacbaa519eb282372f0934a70e5f744d17ae261f2e689ea319beba2f073e4`.
- Inspected 1280×900 desktop, 390×844 thermal panel and 320×740 playback.
  Mobile document widths equal their viewports. Panels scroll internally;
  no new page overflow or console warning/error was observed. Temporary
  viewport override was reset and the tested hot-wall startup was restored.

Browser evidence: `scientific/centrifuge-v44/boundary60/browser/verified.json`,
`export-check.log`, both compressed actual UI downloads and three screenshots.
This verifies the released centrifuge path; it does not claim a new exhaustive
audit of every other playground or that all user-selected thermal regimes are
resolved. Spatial thermal evolution remains opt-in; “live defaults” here means
its default numerical grid, not that initial site load enables this thermal mode.

The live numerical defaults remain unchanged and unqualified for these local
thermal targets. A replacement should first demonstrate a wider margin on
early heating, then expose numerical resolution with explicit history/grid
compatibility rather than silently regridding a saved experiment. The present
result establishes what fails and what finer comparisons support; it does not
claim a completed high-fidelity kinetic gas-wall model.
