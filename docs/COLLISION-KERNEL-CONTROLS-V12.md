# Controlled initial collision moments

7 November 2026 UTC. These deterministic controls establish a concrete cause of
different **initial one-step heating**: the angular laws and pairing schedules
differ at finite timestep. The low-speed cross-section cap also changes the
limiting collision operator, but its population initial-heating effect is much
smaller in this plasma. Neither result establishes the fraction of an evolved
250/500 microsecond discrepancy attributable to each cause.

## Traced paths and model identity

Production `src/coulomb.ts` shuffles all equal-weight ions together, assigns the
selected pair the mixed-cell effective density, and Gaussian-samples
delta=tan(theta/2). WarpX26.10 uses separate self/unlike collision processes.
Its default cumulative-angle model is **BOBYLEV**, not NANBU, and its transport
cross section is capped even with a positive fixed Coulomb logarithm.

These are established source differences, not a reproduced charge, mass or
infinitesimal-rate normalization bug. The diagnostic changes no production file
and does not add a cap to obtain better agreement.

Pinned primary sources:

- [WarpX angle-model selection](https://raw.githubusercontent.com/BLAST-WarpX/warpx/26.10/Source/Particles/Collision/BinaryCollision/Coulomb/PairWiseCoulombCollisionFunc.H), constructor lines73–80.
- [WarpX momentum update](https://raw.githubusercontent.com/BLAST-WarpX/warpx/26.10/Source/Particles/Collision/BinaryCollision/Coulomb/UpdateMomentumPerezElastic.H), cross-section cap and angle lines182–200.
- [WarpX collision pairing](https://raw.githubusercontent.com/BLAST-WarpX/warpx/26.10/Source/Particles/Collision/BinaryCollision/Coulomb/ElasticCollisionPerez.H), physical cap lines79–87 and effective density lines97–107.

## Independent derivation

Let each species contain N markers and physical density n, with equal weights.
The production mixed-pair effective density is 2n(2N−1)/(2N); each A marker chooses
a particular B partner with probability 1/(2N−1). Its expected unlike-partner
density is therefore exactly n. WarpX's unlike pairing uses density n and a
particular partner probability 1/N. The infinitesimal cross generators match.
The corresponding self generator has density n(N−1)/N in both methods.

This does not imply finite-step equality: the selected mixed pair gets nearly
twice the unlike-pair angular variance, at roughly half the collision frequency.
Nonlinear angular sampling sees that difference.

For relative velocity g and center-of-mass velocity V, let
mu=ma*mb/(ma+mb), D=E[1−cos(theta)]. Azimuthal averaging of conservative pair
rotation gives E[delta(Ea)]=−mu*D*(V dot g). Thus the expected A raw-temperature
increment is 2/(3eN) times the sum of these pair energy increments. Self collisions
change neither species' total raw kinetic energy. Centered temperature is not
used as the primary control because stochastic mean-flow changes introduce a
finite-N term.

With TA variance S, the independent Gaussian angular integral is

```
D_TA(S) = E[2 S Z²/(1 + S Z²)], Z ~ Normal(0,1)
        = 2 - 2 sqrt(pi/(2S)) exp(1/(2S)) erfc(1/sqrt(2S))
        = 2S - 6S² + 30S³ - ...
```

For matched selected-pair density and in the nonrelativistic uncapped limit,
WarpX's scattering parameter s=2S and Bobylev D=min(s,2). The first terms agree;
TA has a negative finite-step correction. The implementation evaluates the
small-S series to avoid cancellation/overflow and checks it against independent
adaptive Gaussian quadrature. No fitted coefficient is used.

The cap is sigma_max=1/(n_max*rmin), rmin=(3/(4*pi*n_max))^(1/3).
In these cross collisions n_max=5e17/m3. The speed below which the cap applies is

```
g_cap = [ e^4 lnLambda / (4 pi epsilon0^2 mu^2 sigma_max) ]^(1/4)
```

Computed thresholds are **230.9282, 198.3961 and 159.3556 m/s** for 40/40,
40/84 and 84/84 u, respectively. Cross-species relative thermal component width
is 4038.6403 m/s at 2/10 eV.

For independent initial Maxwellians, conditional E[V dot g | g] is proportional
to g². The initial Landau heating integral reduces to a one-dimensional radial
Gaussian integral. Its uncapped value is independently checked against the
standard Maxwellian thermal-exchange moment. With
z=g_cap²/(2*sigma_g²), the capped/uncapped rate ratio is

```
R = exp(-z) + integral_0^z x² exp(-x) dx / z²
  = 2 [1 - (1+z)exp(-z)] / z²
  = 1 - 2z/3 + z²/4 - z³/15 + ...
```

Adaptive radial quadrature and this independent stable series agree within
2e-12 in the executed test. This ratio applies to the initial population
Maxwellians; it is not a closure for the later non-Maxwellian distributions.

## Executed continuum-initial controls

40u+/84u+, n=5e17/m3 each, lnLambda=12, isotropic 2/10 eV. Rates below are the
initial A raw-temperature increment per timestep divided by that timestep,
in **eV/s**. They are exact expectation diagnostics to the tested numerical
quadrature precision, not stochastic trajectory measurements.

| Step | Mixed TA, uncapped | Separate TA, uncapped | Separate Bobylev, uncapped |
| --- | --- | --- | --- |
| 1 microsecond | 24093.3791 | 25278.6649 | 27476.0683 |
| 0.25 microsecond | 26138.4052 | 26744.3753 | 27780.0012 |
| 0.0625 microsecond | 27161.7402 | 27443.9502 | 27901.7262 |
| 0.015625 microsecond | 27631.9921 | 27755.8357 | 27950.2089 |

The analytic uncapped Landau initial rate is **27982.1633 eV/s**. Mixed TA is
13.9%, 6.59%, 2.93% and 1.25% below that rate across the ladder. Holding pairing
separate while changing TA to Bobylev isolates the angular-law contribution;
holding the TA law while changing mixed to separate pairing isolates selected
pair strength/schedule. Both effects are visible without collision RNG noise.

The capped Landau initial rate is **27959.6645 eV/s**, a **0.0804041%** reduction.
At the two coarse steps, angular saturation largely masks that tiny speed-tail
change. Full capped variants are retained in the JSON. This does not show that
the cap is unimportant for colder plasmas or later distributions.

The low-g Landau singularity means a naive regular-power timestep extrapolation
need not apply to the continuum Maxwellian initial moment. The characteristic
transition speed scales as dt^(1/3), while the lost radial heating weight scales
as its square. This supports a dt^(2/3) leading-bias interpretation for this
specific uncapped initial continuum calculation, not a universal convergence
order for finite-N particles or full trajectories.

## Exact initialized velocity controls

Three existing v11 N2048 initializations, seeds101/202/303, each contribute all
**4,194,304** cross pairs. No new independent seed is claimed. Their finite-step
conditional expectations also show about 12% lower mixed-TA heating than separate
Bobylev at 1 microsecond. These expectations retain the exact finite-N mixed
selection probability and effective density, unlike the continuum table's
N→infinity limit.

Only 113–146 pairs per initialization lie in the cap regime, 0.00269–0.00348%.
Pair counts alone are misleading: their absolute uncapped energy-transfer
contribution removed by the cap is 1.45–2.69% of the absolute total contribution.
Signed empirical Landau slopes are noisy: cap application changes the three
rates from 27481.8/28288.7/29050.5 to 27651.4/28079.0/28566.8 eV/s. The first
increases because finite empirical COM/relative correlations need not have the
population Maxwellian sign at each speed. Do not replace the analytic 0.0804%
population statement with a blanket claim about every finite realization.

The finite-step capped/uncapped differences at 1 microsecond are only about
0.0001–0.0066 eV/s for mixed TA, versus angular/schedule differences of thousands
of eV/s. This directly limits the cap explanation for the initial coarse-step
disagreement in these cases. It does not quantify evolved-history causality.

All variants, actual-input hashes, source hashes and angular moment fixtures are in
[results.json](../scientific/collision-kernel-v12/results.json).

## Verification and reproducibility

All compilation, tests and scientific execution used Apple safe-dev VM
`safe-dev-189fa7f32c8c0fc0`, no host mounts, offline. No downloads were required.
Python3.11.2 and GCC12.2.0 (Debian12.2.0-14+deb12u1) came from the pinned image.
The final synced runtime snapshot contained seven files, 3.6 MiB.

- `python3 -m unittest -v`: **5 tests passed**, exit0, 0.621s. Checks independent
  Gaussian quadrature against the closed angular integral and C++ implementation,
  cap-speed equality, exact mixed density, energy-transfer sign/normalization,
  Maxwellian refinement and closed-form cap ratio.
- `python3 diagnostics.py`: exit0; compiles with strict C++17 warnings-as-errors,
  processes three exact initializations and emits deterministic expectations.
- `safe-dev export /tmp/mass-spinner-kernel-controls-v12`: exit0. C++, Python
  runner and Python tests compare byte-for-byte with host source. The generated
  JSON was reviewed before copying to the package.
- Parent root safe-dev gate `node --import tsx --test scientific/collision-kernel-v12/production-moment.test.ts`:
  **1 test passed**, exit0, 36.65ms test time. It integrates **actual production**
  `scatterCoulombPair` outputs through independent Gaussian quadrature. The
  explicitly synced root snapshot is `/tmp/mass-spinner-reference-gate.YWQxyJ`,
  guest `safe-dev-e3cc6ae2874726e4`, 243 files / 63.1 MiB, followed by guest
  `npm ci`. This verifies the connection to the real production angular law;
  it does not establish full-mixture finite-time accuracy.

An independent physics agent checked the pair selection probabilities, mass and
energy factors, angular normalization and Maxwellian reduction against a separate
derivation. This source review is distinct from the execution evidence above.
Package reproduction commands are in its [README](../scientific/collision-kernel-v12/README.md).

The original disagreement was an overly broad expectation of equality between
different finite-step kernels. In simple terms, the codes take different-sized
random collision steps even when their infinitesimal physics matches. Explicit
diagnostic variants and independent refinement address that cause; altering
production rates or fitting one code to another would hide it. The correct
production change, if any, must follow the finite-time convergence and independent
Landau study rather than this initial-moment result alone.
