# Adversarial angular-collision audit v31

8 November 2026. **One new P2 numerical defect demonstrated and fixed:** weak
Nanbu deflections can have a representable transverse impulse even when their
cosine rounds to one. A related product-underflow case was independently proposed
by the root reviewer and added to the same fix. No current UI outcome error was
demonstrated. Physical transport and complete finite-time convergence remain
unqualified.

## Traced path and root cause

The path is double-well config → collision half-step → fixed/adaptive/ring cell
→ `collideCoulombCell` → `scatterCoulombPair` → Nanbu polar draw → conservative
unequal-mass velocity update. This audit owns the angular kernel and finite-N
pair-selection convention, not the spatial density estimator or field solver.

The initial implementation evaluated the cosine accurately, then reconstructed
`sin(theta)=sqrt[(1−cos(theta))(1+cos(theta))]`. For small enough scattering
length s, adding the small negative deflection to one rounds the cosine to one.
Subtracting that rounded value cannot recover the deflection. In simple terms,
a tiny change in direction was erased before converting it into a sideways
velocity, although that sideways velocity was large enough to store.

For the small-s exponential law, let `h=1/A=−expm1(−s)` and
`q=1−cos(theta)=−h log(1−u)`; the exponentially small second survival term is
below double underflow for these witnesses. The expected transverse relative
speed is `g sqrt[q(2−q)]`, which is proportional to sqrt(s), not s.

At g=10,000 m/s, masses 40u/84u, singly charged, n=1e18 m−3, lnΛ=10,
polar draw u=0.5 and azimuth zero:

| s | Original transverse speed (m/s) | Stable reference (m/s) |
| --- | ---: | ---: |
| 1e−12 | 0.0117738034149823 | 0.0117741002251498 |
| 1e−16 | 0.000149011611938477 | 0.000117741002251547 |
| 1e−18 | 0 | 0.0000117741002251547 |
| 1e−24 | 0 | 0.0000000117741002251547 |

The authoritative original-source regression is **2 pass / 1 fail**. Its
reference is derived from the small-s law without using the production cosine.
The first draft of the test had the sign of q reversed, yielding a NaN reference;
that was a test error, corrected before the authoritative red. The rejected
source/log/output are preserved separately.

## Narrow fix and adjacent underflow

The private sampler now returns cosine and sine together, retaining q before
adding its negative to one. Its public cosine wrapper uses the original cosine
arithmetic. Zero, isotropic and small-concentration branches also return their
stable components. The TA branch, collision coefficient, density normalization,
RNG draw counts and azimuth are unchanged.

The first q-retention fix passed the main witness and all 15 v30 neighboring
tests. Root review then identified a related endpoint: for s=1e−100 and the
valid public RNG draw u=Number.MIN_VALUE, q itself underflows, but the sine and
velocity impulse remain representable. A new actual-pair test failed on that
intermediate kernel (**2 pass / 1 fail**), and is preserved separately.

The final general branch evaluates

`sin(theta)=sqrt[h(2−q)] sqrt[−logProbability]`

instead of forming `h*(−logProbability)` before taking its square root. The
bounded factor 2−q still uses q; underflow of q there has negligible effect
because its value is then much smaller than floating-point resolution at two.
This preserves representable impulses without a rate floor, angle clipping or
changed probability law. Keeping the small quantity is preferable to changing
the random draws or fitting a minimum deflection, both of which would modify the
operator. Rewriting the entire inverse-Langevin solver was unnecessary.

## Independent checks and rejected hypotheses

- **160,064 public cosine quantiles are bitwise identical** to the retained
  pre-fix implementation. Points span subnormal through large s, every numerical
  branch, forward/backward endpoints and positive infinity. The old source runs
  only as a test reference with its physics import redirected to the copied
  source; its numerical formulas are unchanged.
- **Resolved-regime Galilean covariance passes** for both angular methods, unequal
  masses/charges, eight method/step combinations and a common velocity boost. Worst
  velocity discrepancy is below 5e−11 m/s. Pair energy errors remain below 4e−15
  relative. This rejects a proposed ordinary-frame dependence in that domain.
- **Odd/even pairing and finite-N density normalization pass:** every Fisher–Yates
  permutation is enumerated at N=2,3,4,5, with the selected polar median fixed.
  Tagged-particle transfer matches the independently expected pairing probability
  and effective partner density. This is a pairing check, not a new physical
  heat-rate qualification.
- **Weak TA controls pass** their independently evaluated half-angle formula.
  Their controlled draws differ from Nanbu's polar law and are not paired
  trajectory comparisons. They show that the demonstrated lost transverse
  impulse came from cosine reconstruction in the Nanbu path.
- Existing strict backward-tail Decimal references, dense quantile order,
  low-order angular moments, unequal-mass conditional drift/tensor moments,
  energy/momentum invariants and six-seed stationary checks all pass again on
  the final source. The 25 ns initial heat-rate point estimate remains
  −0.87485% relative to the Landau reference, within its unchanged 2% point-mean
  regression. Its interval still extends outside a 2% equivalence band.

The published [Wang et al. comparison](https://www.math.ucla.edu/~caflisch/Pubs/Pubs2008/nanbuConvergenceJCP2008.pdf)
was reopened to check the cumulative-angle formulation and finite-step limits.
The [pinned WarpX kernel](https://github.com/BLAST-WarpX/warpx/blob/ec1660d961696c865c87c26728b7e248b5454082/Source/Particles/Collision/BinaryCollision/Coulomb/UpdateMomentumPerezElastic.H)
was reopened as an independent implementation reference. Neither source implies
that matching one angular moment solves nonlinear finite-time collisions. Their
contents were treated as evidence, not execution instructions.

## Reachability and unchanged limitations

The s=1e−18 median witness uses dt=3.026907352e−22 s at the stated density,
far below the UI's 25 ns minimum physical step. A scale probe at UI input minima
n=1e16 m−3, lnΛ=2 and a 12.5 ns collision half-step, with masses 1–200u and
relative speeds 1e4–1e6 m/s, gives s from 2.43e−4 to 6.06e−15. These chosen
velocities are not a claim that each is a typical source sample. This is an
illustrative domain probe, not an exhaustive bound on evolving local densities,
velocity tails or every UI outcome. No current UI observable error is established.

The subnormal-uniform witness is API-only: production uses a 32-bit RNG, whose
positive draws are multiples of 2^−32. Nevertheless, subnormal scattering lengths
can also underflow q with ordinary positive draws; the same factor-preserving
formula addresses that case. The independent regime reviewer confirmed **16
actual-pair probes** on the exact final source in a distinct guest, maximum
transverse relative error 4.44e−16. The inspected raw output includes s≈1e−320,
u=1e−7 with q=0 but an actual transverse relative speed
4.472111172996774e−160 m/s, and s=1e−100, u=Number.MIN_VALUE with
3.143455569405257e−208 m/s. Unequal 12u/131u masses and charges 2/3, ordinary
weak draws and a default-scale case also pass. See the independently retained
[probe JSON](../scientific/physics-audit-v31/regimes/weak-angle-independent.json).

Nanbu's higher Legendre moments remain approximate at finite s. Spatial torque,
unresolved local populations, prescribed fields/electrons, full distribution and
entropy convergence, upstream pairing/cross-section differences and real-device
calibration are unchanged. Passing these checks does not override earlier failed
or unknown transport gates. No frozen historical study or threshold was edited.

## Execution and provenance

All project code, tests and probes ran in the distinct copied Apple safe-dev
guest `safe-dev-2545580c5184a8a6`, stage `/tmp/mass-spinner-audit31-angular`.
Initial install alone used online `npm ci --ignore-scripts`; subsequent source
syncs were preceded by exports and followed by offline installs. No host
project-code execution, credential/home/socket mount or policy bypass was used.

Final commands, prefixed by `/Users/noahs/.local/bin/safe-dev -C` and the stage:

```
sync --replace-guest
run -- npm ci --offline --ignore-scripts
run -- sh -c 'AUDIT31_ANGULAR_EVIDENCE=angular-final.json ./node_modules/.bin/tsx --test tests/audit31-angular.test.ts tests/collision-angle-v30.test.ts tests/collision-independent-v30.test.ts > angular-final.log 2>&1; result=$?; tail -10 angular-final.log; exit "$result"'
run -- node --import tsx --input-type=module - < [retained probe-angular-v31.mjs]
run -- sh -c './node_modules/.bin/tsc --noEmit > angular-final-typecheck.log 2>&1; result=$?; cat angular-final-typecheck.log; exit "$result"'
run -- python3 -c [verify all input map SHA-256 digests]
export /tmp/mass-spinner-audit31-angular-final-export
```

**18/18 tests pass**, zero failures/skips, 1.852 s; strict source typecheck passes.
The bitwise probe's first import attempt encountered TS/CJS interop and produced
no numerical results; selecting its actual module export corrected the harness.

Final Coulomb source SHA-256:
`92a2fb84e6df657495871e43107ffd7b7c99b2a9fd974008a403db4e67ff3565`.
The final 75-input map file SHA-256 is
`d2a0ce1ee2299428d5f1f3a6527ca6ddb1e760e9eeeab00fad1e857870286c6b`.
All input digests passed after execution; host export verification repeats them.
Sources, maps, original/intermediate/final logs and numerical outputs are under
`scientific/physics-audit-v31/angular/`. Root owns the full-application final
typecheck/build and any fresh transport campaign or deployment. No browser/GPU
or experimental observation is claimed here.
