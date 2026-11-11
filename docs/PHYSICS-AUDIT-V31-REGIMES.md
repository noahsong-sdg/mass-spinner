# Adversarial regime and Section III audit, v31

8 November 2026. Independent scope: screening/coupling/encounter diagnostics,
Section III coverage, and the homogeneous failure estimates. A follow-up also
checks the final angular fix through actual unequal-mass/charge pair updates.
The reviewer did not change the collision kernel or frozen historical studies.

## Findings and disposition

**P3, API-only numerical domain defect: finite physical budgets could produce
nonfinite plotted times. Fixed.** `failureBudgets` accepts positive finite SI
residence time and checks representability of its physical budgets. With zero
reaction, diffusion, radiation and wall channels and `residenceS=1e304`, all
budgets are finite, but conversion to displayed microseconds overflows: 79 of
the 81 plotted x values become Infinity. This is many orders outside the live
slider's 1e−6 to 1e−2 s range, and is not an observed live physical prediction
error.

Technically, the existing representability guard checked physical outputs before
the independent `t*1e6` display conversion. Simply, an accepted finite number in
seconds was too large for the plot's microsecond units. The narrow fix includes
the finite displayed endpoint in the existing guard. It raises the same explicit
domain error; it neither invents a cutoff time nor clips or replaces plotted
values. This is preferable to silent Infinity/NaN propagation or a physically
arbitrary residence-time cap. The regression rejects 1e304 s while accepting
1e302 s with finite curves and a 1e308 µs endpoint.

The eight owned regressions fail on the original source exactly at the missing
exception: **7 pass, 1 expected failure**. The initial corrected gate with the
neighbor suites is **20/20 pass**, plus production typecheck. Final-source
verification is recorded below.

**No additional physical formula/sign error was demonstrated** in the screened
encounter diagnostic or independent budgets within the tested domain. A status
of `within-supported-domain` is a sampled Coulomb-model proxy, not a guarantee
of quasineutral field feasibility, Maxwellian shape, resolved spatial transport
or device performance. The entrypoints and UI statements preserve these limits.

## Traced execution and independent checks

The kinetic path is `simulateDoublewell` → analytic initial peak reference →
initial Coulomb-domain rejection when collisions are on → sampled occupied
collision cells → per-species mean-flow removal/unbiased thermal trace → regime
history/summary → metrics, result assumptions and `modelValidity`. Convergence
uses the sampled unresolved fraction, separately from raw angular momentum and
observable-equivalence budgets. None of these proxy checks modifies velocities,
charge states or potentials.

The budget path is failure controls → `failureBudgets` → SI dimensional products
and no-event curves → plotting/export. Its inputs and energy/channel estimates
remain independent of separator trajectories. The UI clears failed results and
disables export rather than retaining a stale successful result.

Fresh independent tests cover:

- Unequal charges and unequal observed number fractions: electron screening uses
  `ne=ni Σ fs Zs`; ion coupling uses `Zs² e/(4π ε0 a Ti)` and the actual thermal
  trace. The analytic initial reference remains distinct from evolved local
  composition. No use of mass fraction in electron density was found.
- A common boost plus orthogonal velocity rotation preserves thermal, coupling,
  screened-log and encounter estimates, even with differential species drift.
- The encounter boundary crosses at `max(Ωa,Ωb) λDe/g=0.1`, where `g` combines
  relative thermal and drift energy. Tests independently construct the boundary
  and check 0.099 versus 0.101. Bulk orbit gyroradius is a different scale.
- A coupling value of 0.101 is rejected; a sparse high-density cell cannot hide a
  known electron-screening failure behind an unresolved ion temperature.
- An equal-trace anisotropic state has the same scalar thermal proxy. This is a
  deliberate negative control: the proxy does not validate distribution shape.
- A production collisionless sparse run retains unresolved Coulomb diagnostics,
  zero collision pairs, and the explicit limitation between sampled times.
- Independent channel dimensions and scaling: CX optical depth 0.9,
  recombination optical depth 0.28, radiative power 48000 W/m³, supplied sheath
  power, radiation proportional to residence and diffusion RMS proportional to
  its square root. CX is unchanged when only residence changes at fixed supplied
  path length, as the documented path parameter requires.

## Tutorial comparison and remaining model requirements

The primary [Zweben, Gueroult and Fisch tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf)
was reopened, including III D and III G–K. Its charge-changing mean-free-path,
prescribed diffusion benchmark and wall-energy relations agree with the stated
independent estimates. It treats field creation and mixing as coupled physical
problems. The simulator's eleven-item catalog accurately distinguishes fixed
charge/elastic scattering from omitted reaction, dust and fluctuation evolution.
No diagnostic budget was presented as solved coupled extraction.

The principal remaining requirements are unchanged and substantive:

1. Joint particle, timestep and two-axis locality convergence, with raw torque and
   sparse exposure gates retained. Screening proxies do not certify these.
2. Electron/Poisson/current/sheath/circuit closure before interpreting a specified
   bulk potential as achieved electrode operation.
3. Species/charge/energy-dependent atomic and neutral products, chemistry and
   wall recycling before predicting neutral contamination or feed recovery.
4. Perturbation/instability and energy evolution before predicting turbulent
   mixing, radiation cooling or sustainable power/throughput.

These are documented missing physics or qualification requirements, not new
algebraic bugs to patch with a loss multiplier. A scalar rate, diffusion
coefficient or conservative ledger is not a substitute for those closures.

## Independent check of the angular repair

The angular reviewer found that a weak deflection's cosine may round to one
while its transverse impulse is still representable. Computing its sine only
from that rounded cosine erased the impulse. The final kernel retains the small
deflection and uses factored square roots, also avoiding an underflow in their
product. This reviewer independently tested actual pair outputs, rather than
merely checking the new source expression.

The reference is the small-s exponential angular law, where the concentration
inverse is `−expm1(−s)` and the neglected backward exponential is below floating
resolution for these cases. The expected transverse relative speed is computed
as `g sqrt(invA) sqrt(−log1p(−u)) sqrt(2−q)`. It does not import the production
variance helper or private sampler. The actual returned variance sets s in the
subnormal cases, avoiding a comparison against an unrepresentable ideal input.

Sixteen probes use 12u/131u charges 2/3 and 40u/84u charges 1/1, distinct uniforms
0.125/0.875 at s=1e−18, 1e−10 and 1e−4, plus two underflow cases and two
UI-scale density/timestep cases. All pass a prospective 3e−12 relative
transverse-speed budget; maximum observed error is **4.44e−16**. Pair energy,
momentum and the two-draw RNG contract also pass.

| Actual s, uniform | Stable expected transverse relative speed | Measured speed |
| --- | ---: | ---: |
| 1e−320, 1e−7 | 4.4721111729967754e−160 m/s | 4.472111172996774e−160 m/s |
| 1e−100, Number.MIN_VALUE | 3.143455569405258e−208 m/s | 3.143455569405257e−208 m/s |

Both cases have rounded q=0, demonstrating why retaining q alone was insufficient.
At density 1e18 m−3, dt=25 ns and relative speed 10000 m/s for 40u/84u, the
measured transverse speeds are 51.44646664 and 203.00946262 m/s, agreeing with
the independent law for the two uniforms. This validates the numerical pair
repair, not finite-time Landau accuracy, higher angular moments or transport.

## Exact isolated verification

All execution used copied Apple safe-dev guest `safe-dev-d023ec4a875f4c06`,
stage `/tmp/mass-spinner-audit31-regimes`. Only bounded source/tests/configs were
copied, approximately 1 MiB. Network was enabled only for the initial
`npm ci --ignore-scripts`; all later installs used its offline cache. No host
project code, credentials/home/control-socket mounts, sandbox relaxation or
browser-policy workaround was used. Each source replacement followed an export
of unique prior evidence and an explicit `sync --replace-guest`.

The original clean gate was 19/19. The boundary witness then failed on original
source and passed after the one-line guard fix. That original and intermediate
evidence is retained separately. The final gate also refreshes the owned test's
configuration/species consistency and checks the frozen corrected angular source.

Final gate: **20/20 tests pass, zero failures/skips**, including eight owned
tests and twelve neighboring regressions. Strict production typecheck passes.
The sixteen additional actual-pair probes pass. Tests take 0.390 s; no long
trajectories or new physical convergence campaign were run by this reviewer.
The final input map pins 166 files, SHA-256
`72ecb8e0e253af62bdd9c1007b50525f605248c03aa089a2cb44e857bf1a3376`.
Every mapped digest was checked before/after execution and again after export.

Final Coulomb source SHA-256:
`92a2fb84e6df657495871e43107ffd7b7c99b2a9fd974008a403db4e67ff3565`.
Fixed failure-budget source SHA-256:
`d6e4936e1579d7445dbf3e0e9a0685ae94dd8f39fd13f6acc3ae42f5dc03b3ef`.
Those files, the regime kernel and the owned test match canonical bytes at
handoff. Complete copied final inputs, original and corrected logs, commands,
independent probe/script and manifest are retained under
`scientific/physics-audit-v31/regimes/`. Final export:
`/tmp/mass-spinner-audit31-regimes-final-export`.

Root owns the final merged application build, deployment and any browser
observation; this reviewer claims none of those.
