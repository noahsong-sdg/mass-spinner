# Live cumulative-angle collision method v30

8 November 2026. This work adds an explicit Nanbu cumulative-angle option to the
existing equal-weight mixed-ion pair operator. **It removes the TA large-step
backward-scattering limit, but does not make a finite timestep exact Landau
evolution, and does not repair finite-cell angular momentum.** Those require
separate unchanged convergence gates owned by the parent and independent reviewer.

## Execution path and root cause

The live double-well solver groups ion representatives in spatial cells, chooses
random pairs, computes the density-weighted Coulomb scattering variance, rotates
the pair's relative velocity, then reconstructs velocities around the unchanged
center of mass. `src/coulomb.ts` owns that angular law and random matching;
`src/axisymmetric-collisions.ts` rotates local cylindrical frames and reports cell
torque. This patch changes the angular law only when explicitly requested.

Previously the only law was Takizuka–Abe: `tan(theta/2)` is Gaussian with variance
`v`. It correctly approaches the infinitesimal Coulomb generator. At large `v`,
however, most draws have large half-angle tangent, so `cos(theta)` approaches −1.
In simple terms, an unresolved large collision step tends to reverse velocities
instead of randomizing directions. Conservation of pair energy/momentum does not
detect this wrong distribution. The retained old-kernel witness at `v=10` has
mean cosine **−0.3741847**, while fixed-speed angular diffusion gives
`exp(-20)=2.061×10⁻⁹`.

The change preserves TA as the omitted-argument/default baseline. It adds
`CoulombScatteringMethod = 'takizuka-abe' | 'nanbu'` as the final optional argument
to both `scatterCoulombPair` and `collideCoulombCell` (after the optional impulse
observer for the latter). The observer, representative weights, finite-N
normalization, density, reduced mass, charges and Coulomb logarithm are unchanged.
The zero-relative-speed case still has no pair exchange; no speed floor or rate
cap is added. Invalid method names reject even empty or inactive cells.

## Existing method and provenance

Nanbu's established cumulative distribution in `mu=cos(theta)` is

```
p(mu) = A exp(A mu) / (2 sinh A),   -1 <= mu <= 1
coth(A) - 1/A = exp(-s)
s = 2 v = (Za Zb e²/(epsilon0 mu_reduced))² n_eff lnLambda dt / (4 pi g³).
```

The `mu_reduced` in the SI coefficient denotes reduced ion mass, not angle cosine.
Its dimensions are those of mass; `s` is dimensionless. The factor of two relative
to TA variance follows the independent Rutherford pitch-angle generator and is
not a fitted rate correction.

This is the method described by [Nanbu (1997), DOI
10.1103/PhysRevE.55.4642](https://journals.aps.org/pre/abstract/10.1103/PhysRevE.55.4642)
and given explicitly in [Wang et al. (2008), §2.3, DOI
10.1016/j.jcp.2007.12.027](https://www.math.ucla.edu/~caflisch/Pubs/Pubs2008/nanbuConvergenceJCP2008.pdf).
The original Nanbu abstract was accessible; publisher full text required
authorization. The accessible Wang primary paper supplies the equations and
separates deterministic timestep error from particle statistics.

The method is also present in [WarpX 26.10's pinned Perez
kernel](https://github.com/BLAST-WarpX/warpx/blob/ec1660d961696c865c87c26728b7e248b5454082/Source/Particles/Collision/BinaryCollision/Coulomb/UpdateMomentumPerezElastic.H),
commit `ec1660d961696c865c87c26728b7e248b5454082`. That implementation uses a fitted
inverse parameter over part of the domain and an isotropic shortcut above `s=6`.
This browser implementation instead solves the published moment equation and
keeps the exponentially small anisotropy until floating-point underflow. It does
not transplant WarpX's relativistic transformations, unequal-weight selection or
physical cross-section cap, which would change the declared operator.

The TypeScript is independently written from these equations. No WarpX source
code is incorporated into the production module. A complete unmodified upstream
kernel and its BSD-3-Clause-LBNL license are retained together as research
provenance; they are not advertised as the browser's runtime dependency.

## Stable numerical realization

The sampler solves the monotone Langevin moment equation, using a bracketed
Newton iteration with at most eight evaluations and absolute moment residual
4×10⁻¹⁵. A series avoids cancellation at small A. For `s<=0.05`, A is at least
20.5 and `1/A = -expm1(-s)` omits a coth correction below 3×10⁻¹⁸. For very small
`exp(-s)`, the inverse-Langevin series and then a quantile expansion preserve the
uniform limit without overflowing `1/A` or degrading subnormal scattering inputs.
These are bounded numerical asymptotes, not a cap on the physical rate.

The inverse survival CDF is

`mu = 1 + log[(1-U) + U exp(-2A)] / A`, with uniform `U in [0,1)`.

Forward draws/small A use `log1p(U expm1(-2A))`. Backward-tail draws with A>1 use
the positive sum directly. Independent review found that using only the log1p
form lost precision in an extremely rare backward tail: at `s=.0635` and
`U=1-epsilon`, the first candidate gave −0.99799887555 instead of the independent
80-digit −0.99823513641. The positive-sum branch fixes the actual cancellation;
there is no quantile clipping or relaxed tolerance. Old candidate source and the
failing high-precision comparison are retained. Uniform zero maps exactly to the
forward endpoint; s=0 draws no RNG; positive infinity is the isotropic limit,
including overflow of twice an otherwise finite variance.

Only the relative direction changes; relative speed and the center of mass are
preserved. Nanbu uses two uniform draws per pair instead of TA's three. The TA
branch retains its original draw order and arithmetic when omitted or explicitly
selected. Cross-method stochastic paths are therefore not paired particle paths;
whole-run seed ensembles are required for physical comparisons.

## What the angular law guarantees, and what it does not

Nanbu's first Legendre moment is `E[P1]=exp(-s)` by construction. Its second is
`E[P2]=1-3 exp(-s)/A`, generally **not** the exact fixed-speed angular-diffusion
`exp(-3s)`. At s=1 the single-step discrepancy exceeds 0.02 absolute; composing
32 smaller steps reduces it below 0.001 in the independent formula check.
Thus removing the spurious backscatter limit does not justify arbitrary collision
timesteps, nor prove unlike-ion heating, drag, anisotropy, finite-time distribution
or transport convergence. Angular diffusion itself is only a fixed-speed
reference; pair re-selection and evolving g remain separate finite-step errors.

Nanbu does not alter the finite-radius pair torque. Numerical energy/momentum
conservation cannot establish angular-momentum conservation for separated spatial
representatives. The raw torque budget and spatial refinement gates must remain
independent; subtracting measured torque from a ledger does not repair paths.

## Verification and reproducibility

All execution used bounded copied Apple safe-dev guest
`safe-dev-5d0460921e9fedaf`, stage `/tmp/mass-spinner-collision-angle-v30`.
Dependencies were downloaded once using `npm ci --ignore-scripts` in an online
guest. Later installs were offline after explicit source sync. Guest-only logs,
probes and source downloads were exported before any replacement. No project
code ran on the host; no home/credentials/agent/socket mounts were used.

The original large-angle witness failed on legacy source (0 pass, 1 fail). The
first candidate passed 15/15 narrow and neighboring tests plus TypeScript, before
independent dense-tail fuzz exposed the quantile bug described above. The first
attempt to run tests concurrently with a source download was rejected by the
safe-dev project lock (`Resource temporarily unavailable`); its sequential retry
passed and no overlapping project execution was used thereafter.

Final corrected source: `276385adc07eecbf454973feea4490d7898392ec6bc797811b398d5c46c5de6e`.
Final corrected gates: **15/15 tests pass, zero skips/failures**, in 17.582 s;
production `tsc --noEmit` passes. This includes six new owned tests, the original
physical witness run unchanged, and eight existing Coulomb/independent-rate
neighbors. The unchanged TA-rate/statistical tests remain TA tests, not Nanbu
rate acceptance. A separate corrected seven-test narrow run also passes. Strict
80-digit-reference tail checks at s=.062/.0635 pass the unchanged 2×10⁻¹² budget
with actual errors approximately 2–3×10⁻¹⁶.

The independent reviewer reports **17/17 tests pass**, including 160000 quantile
domain/order/stochastic-order evaluations and independent first/second moments,
unequal-mass tensors, rates, stationarity and Decimal tail checks. See that
reviewer's separate report for exact coverage/limits. These statements are not
whole-run transport acceptance.

Retained evidence is under `scientific/live-collisions-v30/angles/`. The parent
owns the final integrated build, complete suite, whole-run convergence campaign
and publication decision. Final reviewed guest export:
`/tmp/mass-spinner-collision-angle-v30-final-export`.

Commands (prefix `/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-collision-angle-v30`):

```
init
run --online -- npm ci --ignore-scripts
sync --replace-guest
run -- npm ci --offline --ignore-scripts
run -- sh -c 'node_modules/.bin/tsx --test tests/collision-angle-v30-red.test.ts > angular-red.log 2>&1; ...'
export /tmp/mass-spinner-collision-angle-v30-red-export
# candidate source sync, offline install, targeted tests/typecheck, source fetch
export /tmp/mass-spinner-collision-angle-v30-candidate-export
# independent tail witness, retained candidate source, failing reference check
export /tmp/mass-spinner-collision-angle-v30-tail-red-export
sync --replace-guest
run -- npm ci --offline --ignore-scripts
run -- sh -c 'node_modules/.bin/tsx --test tests/collision-angle-v30.test.ts tests/collision-angle-v30-red.test.ts tests/coulomb.test.ts tests/coulomb-independent.test.ts > angular-final-green.log 2>&1; ...'
run -- sh -c 'node_modules/.bin/tsc --noEmit > angular-final-typecheck.log 2>&1; ...'
export /tmp/mass-spinner-collision-angle-v30-final-export
```

Each `...` above denotes capturing/printing the command's exact exit code rather
than another scientific operation. The logs retain the actual test names,
diagnostics, failures and exit results. Exact snapshots are hash-pinned beside
the retained original/candidate sources; tested kernel bytes match canonical.

The retained microbenchmark measures 100000 identical-initial-pair calls per
method/variance and includes its checksum to prevent dead-code elimination. The
first candidate measured approximately 0.70–0.97 µs per Nanbu pair versus
0.71–1.29 µs per TA pair. This is a local CPU microbenchmark, not a browser or
full-pulse performance promise. The final tail correction is separately checked;
campaign runtime determines live practicality.
