# Particle equilibrium audit v13

This audit asks whether selected distribution diagnostics remain compatible
with a nominal, zero-drift 5 eV Maxwellian in four existing equal-temperature
particle runs. It adds no heavy solver campaign and does not accept either code
as a full continuum reference. Full physical equilibrium validity stays UNKNOWN.

## Prospective scope and missing-data recovery

Before numerical computation, `scientific/particle-equilibrium-v13/plan.json`
froze four seeds 1101–1104, N=2048/species, dt=62.5 ns, masses 40/84 u,
5 eV/species, checkpoints 0/100/250/500 microseconds and zero fields. Its SHA256 is
`4be3476650fce47054f3a1559937164ce910ce443c2bf6a164256f4d07da7976`.
The pre-computation revision only added the full production dependency closure:
physics imports collisions at runtime; the reverse import is type-only.

The original TA comparison archive stored scalar moments and a cross-code CDF
distance, but omitted the TA velocity distribution. A scalar temperature cannot
recover tails, component anisotropy or a Maxwellian CDF. Four bounded deterministic
TA replays therefore restore checkpoint arrays from the exact archived initial
arrays, unchanged production collision kernel, RNG and interval time stepping.
Every mean component, centered component temperature, scalar temperature and raw
second moment must match its frozen v12 comparison within 1e-11 relative/absolute
scale before the recovered arrays are accepted. No WarpX rerun is performed.
This is preferable to inventing a Gaussian from the existing temperature, which
would assume away the distributional question. Original ID/weight arrays are
retained as fixed-slot bookkeeping, not cross-code physical particle correspondence.
Recovered files copy `config` from their WarpX input to identify the shared
experiment. Any reference-side cumulative scattering-model metadata describes
WarpX, not the recovered TA angular law: `solver: TA-recovered` executes the actual
production `scatterCoulombPair` Gaussian Takizuka–Abe half-angle law.

## Physical expectation and diagnostic boundaries

For independent common-temperature Maxwellian particles, a pair's product
density depends on total pair kinetic energy. The conservative center-of-mass
relative-velocity rotation preserves that energy and momentum. In the production
source, angular variance depends on relative speed and species; its Gaussian
half-angle law is symmetric, azimuth is uniform and arbitrary perpendicular-basis
orientation drops out. The angular transition is a function of incoming/outgoing
direction dot product and is reversible on the sphere; velocity-independent random
pairing preserves the same product measure. This source-level argument explains
why common-temperature stationarity and agreement during unequal-temperature
relaxation are separate questions. A speed-dependent WarpX cap or different
rotationally symmetric cumulative angle law can preserve the same Maxwellian
while changing finite-time relaxation. It does not establish all numerical
properties of either implementation.

Each finite empirical initial sample has its own conserved energy and momentum.
The conditional invariant measure for that realization need not have exactly
zero drift or precisely 5 eV. This study keeps the nominal reference and reports
initial discrepancies and paired evolution separately; it does not rescale
samples or fit temperature to hide them.

For sigma squared = e*5/m, the component reference is
Phi(x) = [1+erf(x/sqrt(2))]/2. Integrating the radial density
sqrt(2/pi)*r squared*exp(-r squared/2) gives
F(r) = erf(r/sqrt(2)) - sqrt(2/pi)*r*exp(-r squared/2).
The reference second and fourth moments are sigma squared per component,
3 sigma to fourth per component and 15 sigma to fourth for speed. An independent
numerical quadrature test checks the radial CDF and df3 Student-t critical value.

For each code/species/checkpoint, metrics are calculated per complete seeded run,
then four run values give a mean and pointwise two-sided 95% Student-t interval.
Paired changes subtract that same run's initial metric before aggregation.
Checkpoints, species and particles are not independent replicates or pooled.
Speed/component CDF distances, three component second/fourth moments, three
cross-covariances, three bulk components and direct initial-final empirical CDF
distances test complementary aspects of the distribution. These do not exhaust
all angular correlations or tail behavior.

Budgets are prospective educational engineering diagnostics: CDF distances .05,
component second/cross moments and bulk .10 in their nominal dimensionless units,
speed-fourth .15 and component-fourth .20. Entire interval within a budget gives
diagnostic PASS, wholly beyond gives FAIL, overlap gives UNKNOWN. There is no
claim of simultaneous 95% coverage over all metrics and no p-value
non-rejection-to-equivalence conversion. Positive representative weights do not
establish smooth-PDF positivity or the H theorem; histogram/KDE entropy is not used.

## Executed evidence

The study executed in the existing independent-review VM
`safe-dev-b0f7dc7368cabd7f`, staged at
`/tmp/mass-spinner-collision-review-v12`. The final explicitly synced source
snapshot contained 219 files / 62.0 MiB, including four recovered raw trajectories.
No host scientific code executed. npm installation alone used online mode;
recovery, tests, typecheck and aggregation ran offline. The source/input hashes
are recorded in the frozen plan, recovery manifest and results JSON.

Seven regressions passed (exact output is `test-log.txt`): independent analytic
reference integrations, tied/shifted empirical CDFs, known cube second/fourth
moments, three-way interval decisions, stale plan rejection, missing/duplicate/
stale runs, and missing/duplicate/stale particle inventory. The scoped strict
TypeScript check for `recover.ts` and its complete imported dependency graph also
passed, using TypeScript 5.9.3 and the temporary guest-only Node type declarations
22.18.8. This scientific subtask does not run or alter the frontend build; the
parent task owns the repository-wide final build/typecheck gate.

Commands, each prefixed with
`/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-collision-review-v12 run --`:

```
node --import tsx scientific/particle-equilibrium-v13/recover.ts
python3 -m unittest discover -s scientific/particle-equilibrium-v13 -v
python3 scientific/particle-equilibrium-v13/analyze.py
node_modules/.bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext --types node scientific/particle-equilibrium-v13/recover.ts
```

All four TA recovered trajectories matched every archived checkpoint moment.
The archived WarpX collision-off control retained exactly identical physical
velocity/weight/ID arrays at every checkpoint. For TA, the disabled-collision
identity is an execution-path observation, not an additional independently
replayed control. All recovered IDs/weights and initial arrays were checked,
and the raw trajectories were exported and actual host bytes SHA256-verified
against pre-export guest hashes before refreshing the guest.

There are eight separate code-runs, 64 run/species/checkpoint records and 256
identified metric aggregates (2 codes × 2 species × 4 times × 16 metrics).
Every interval has four seeded whole-run observations, not 8192 independent
particles. Excluding initial checkpoints, nominal diagnostic counts are
189 PASS / 0 FAIL / 3 UNKNOWN; paired-change counts are
175 PASS / 0 FAIL / 17 UNKNOWN. These counts summarize overlapping diagnostics,
not independent experiments or a family-wise physical acceptance test.

At 500 microseconds, mean nominal speed-CDF distance ± pointwise 95% half-width:

| Code | 40 u | 84 u |
|---|---:|---:|
| TA | .0192824 ± .0040724 | .0186407 ± .0093431 |
| WarpX | .0180506 ± .0020721 | .0226392 ± .0074684 |
| Shared initial sampling | .0198378 ± .0078193 | .0179090 ± .0021780 |

All chosen CDF diagnostic intervals meet the prospective .05 budget. At the final
checkpoint, direct initial-final empirical CDF maxima are .03088 ± .00699 and
.02856 ± .00925 for TA40/84; WarpX40/84 are .03113 ± .00459 and .03137 ± .01304.
Such nonzero distances are expected when a finite sample evolves; identity of
empirical distributions is not the Maxwellian stationarity requirement.

The three nominal UNKNOWN observations are TA84 component-y fourth moment at
500 microseconds and WarpX40 component-y fourth moment at 100/500 microseconds.
For example WarpX40 at 500 microseconds has normalized fourth-moment bias
.05893 ± .21554 against budget ±.20. Paired axis/fourth moments account for the
17 UNKNOWN paired tests. Four seeds leave these intervals too wide to certify
the prescribed budgets. No diagnostic FAIL was observed; this is evidence limited
to the chosen observables and budgets, not proof of Maxwellian stationarity,
the H theorem, continuum convergence or unequal-temperature equivalence.

Authoritative machine-readable output is
`scientific/particle-equilibrium-v13/results.json`, SHA256
`8571e1a5cdd628a0bdbe4929089f0c870223d37cded0badc3043cd87888ed2be`.
Its `aggregate` rows identify `code`, `massU`, `timeS`, `metric`, and separate
`nominal` / `pairedChange` means, half-widths, bounds and diagnostic gates.
Its `perRun` rows retain `seed` and observed metrics. All four observation times
and the shared initial sampling are present; no entropy values are inferred.

Tested source SHA256:

```
recover.ts       483034265f4dd17d83ad9b50831532e66860dd47f1b0051a765e5899a80d4d4f
analyze.py       6eac96b70a32cb48e758c563ff9a5123ecdb347794faa62f1c0f225d5ef9d59b
test_analyze.py  8c4b7fbee4755e113af0338ed42a82a4e49e3d6864268bae700ab3ccbd3d6122
test-log.txt    2d08bd3c6b4e82adc1762cef5b8df71589efffd7df2cbfd3ca4fc9474c3aa174
```

The recovery manifest SHA256 is
`2c80eada05d9ebd9e3dc370aec93ba43e89e5a729cc7bb20e66494215a713a77`;
it contains each recovered gzip hash. Final full physical verdict: UNKNOWN.
