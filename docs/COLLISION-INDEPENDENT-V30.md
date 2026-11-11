# Independent live-collision audit v30

8 November 2026. Scope: actual pair/cell samplers, unequal-mass normalization,
finite-angle moments, stationary distributions and ring torque. The reviewer did
not edit production. **Nanbu improves the large-step angular law but is not an
exact finite-time Landau solver. Radial-cell torque remains a spatial consistency
error; a new angular sampler cannot remove it.** Full transport qualification
still requires the frozen convergence gates.

## Prospective gates, preserved

The retained v10 plan declares six independent whole-run seeds, temperature
0.1 eV, population/CDF fraction 0.01, radius/a 0.01, impact time/duration 0.02,
species normalized angular transfer 0.001, maximum raw angular residual 0.001,
and sampled unresolved exposure 0.01. It requires separate timestep, particle,
spatial, alignment and orientation coverage. Missing comparisons remain UNKNOWN.
No gate or frozen study was changed by this reviewer.

The independent initial Maxwellian heat-rate regression retains its 2% final
rate gate. Deterministic new checks require pair energy/momentum errors below
3e-12, l1 angular moments within 1.2e-5 and l2 within 4e-5 of the declared
Nanbu law; these latter allowances cover the stated midpoint angular quadrature,
not a physical tolerance for every separator run.

## Independent derivations and tests

For reduced mass μ and relative speed g, define
`b90 = qa qb / (4π ε0 μ g²)`. Independent Rutherford normalization gives
`s = 4π b90² n g lnΛ dt = 2 × TA half-angle variance`.
The checker covers different masses and charges directly in SI units.

The isotropic fixed-g angular diffusion generator has Legendre moments
`E[P_l(cosθ)] = exp[-l(l+1)s/2]`. Nanbu instead chooses an exponential-family
angular law with concentration A satisfying `coth A − 1/A = exp(−s)`.
Consequently its l1 is exp(−s), while its l2 is
`1 − 3 exp(−s)/A`. The two l2 expressions are not identical. At s=1 the
Nanbu value is 0.0853048531 versus angular diffusion 0.0497870684, an absolute
difference 0.0355177848. A successful Nanbu l1 check does not prove exact
anisotropy relaxation or exact finite-step nonlinear collisions.

Independent bisection, without importing the producer's inverse-Langevin code,
forms the reference A. Actual production-sampler quadrature uses 65536
stratified uniforms at each of ten s values from 0.001 through 1000. Unlike-pair
velocity and full second-moment tensors use four azimuths and 8192 polar samples
at each of four s values; azimuth cubature integrates the conditional first and
second moments exactly. Expected lab-frame moments come from the independently
derived center-of-mass/relative-velocity decomposition, not production helpers.

The six-seed stationary study uses 8192 markers, equal 40u/84u inventories,
T=5 eV, sixteen 1 µs collisions and n=1e18 m−3. It preserves both a temperature
and a component-CDF observable per species. Exact pair rotations admit detailed
balance for common-temperature Maxwellians: the joint Gaussian density is
constant on each fixed-energy, fixed-momentum collision sphere, and the angular
transition kernel depends only on the symmetric dot product. Sampling noise
still requires whole-run uncertainty intervals.

| Stationary change | Six-run mean | 95% half-width | Fixed budget | Result |
| --- | ---: | ---: | ---: | --- |
| 40u temperature | −0.002765 eV | 0.016599 eV | 0.1 eV | PASS |
| 84u temperature | +0.002765 eV | 0.016599 eV | 0.1 eV | PASS |
| 40u velocity-component CDF at one thermal σ | +0.002116 | 0.004271 | 0.01 | PASS |
| 84u velocity-component CDF at one thermal σ | +0.001790 | 0.007268 | 0.01 | PASS |

Opposite temperature changes are constrained by conserved total energy; they
are not two statistically independent validation successes. One component-CDF
point is not complete distribution equivalence.

For 2/10 eV initial unlike-ion heat exchange, the exact Maxwellian Landau slope
is 27982.16330 eV/s at partner density 5e17 m−3 and lnΛ=12. Independent Gaussian
relative-velocity integration analytically averages the zero-mean conditional
CM residual; actual production angle/velocity updates remain under test. Six
16384-pair samples give:

| Timestep | Mean initial slope | Relative error |
| --- | ---: | ---: |
| 100 ns | 27474.04411 eV/s | −1.8159% |
| 25 ns | 27737.36088 eV/s | −0.8749% |

This passes the unchanged final 2% slope gate. These are initial increments,
not a finite-time temperature/distribution convergence campaign. The final
six-run 95% half-width is 377.73 eV/s, so the interval spans approximately
−2.22% to +0.48% relative to the exact slope. Passing the inherited point-mean
regression does not establish statistical equivalence within a 2% interval.

## Independent defect found in the new candidate

The first candidate (`fe1543b4…edc58`) used
`log1p[u expm1(−2A)]` throughout. For uniforms extremely near one, the expression
forms a difference of nearly equal numbers. The small positive survival
probability loses relative precision before its logarithm. In simple terms,
the rare backward tail was obtained by subtracting two nearly equal totals.

An independent Decimal(80) bisection/inverse-CDF reference gives:

| s, u=1−Number.EPSILON | Independent cosine | Candidate cosine |
| --- | ---: | ---: |
| 0.062 | −0.99636484392459534 | −0.9965157839069196 |
| 0.0635 | −0.99823513640711465 | −0.9979988755514428 |

Dense quantile scans also found a stochastic-order reversal. The absolute tail
error reached 2.36e-4, although low-order quadrature moments were already good.
The implementer corrected the logarithm to the positive survival sum
`log[(1−u)+u exp(−2A)]` when u>0.5 and A>1. Small A and forward-tail cases keep
the well-conditioned log1p form. This targets the actual cancellation without
clipping angles, changing rates or relaxing tests; using the direct sum at very
small A would introduce a different near-one cancellation.

The original candidate/log/reference are preserved. Regression requires both
Decimal references within 2e-12 absolute and finite, ordered quantiles over a
subnormal-to-large-s log grid plus 10001 focused middle-domain points.

One separate initial test assumption was rejected: positive Infinity is an
intentional isotropic limiting argument when twice a finite TA variance
overflows. Demanding an exception was a test-design error, not a physics bug.
That failed log is also retained. Negative/NaN s remain rejected; zero s consumes
no random draw. No numerical acceptance budget was loosened.

## Locality and root-cause review

For ring pairs, exact opposite cylindrical impulses still change physical
angular momentum by `(ra−rb) Δpθ`. The independent test measures that torque
with the actual Nanbu wrapper. Energy and axial momentum preservation cannot
remove a finite radial lever arm. The magnetic contribution to canonical
momentum is unchanged during a velocity-only collision.

Separating radial and axial cell counts preserves the existing exact annular
volume and within-cell empirical generator. It is a valid radial-sensitivity
control: narrower Δr can reduce the demonstrated torque without needlessly
making axial cells sparse. It is not complete spatial refinement by itself.
Separate axial and particle studies and the unresolved-exposure budget remain
required. Nearest-neighbor pairing without a probability correction, artificial
angular projection and velocity rescaling would change the operator, so were
not accepted as conservation fixes.

Read-only wrapper review confirms that the new final method argument is passed
to the existing cylindrical collision call; the coordinate transforms,
pair-density normalization and impulse observer are unchanged. The legacy TA
default remains explicit for old callers. Root integration exposes the new
choice separately from locality and preserves method identity in artifacts.

## Primary-source checks

The independently reopened [Wang et al. comparison](https://www.math.ucla.edu/~caflisch/Pubs/Pubs2008/nanbuConvergenceJCP2008.pdf)
distinguishes TA timestep limitations from Nanbu cumulative scattering. The
[pinned WarpX 26.10 kernel](https://github.com/BLAST-WarpX/warpx/blob/ec1660d961696c865c87c26728b7e248b5454082/Source/Particles/Collision/BinaryCollision/Coulomb/UpdateMomentumPerezElastic.H)
documents Nanbu and includes cross-section limiting and approximate angular
branches. This review checked source equations, not a newly compiled WarpX
application. The present implementation retains its uncapped nonrelativistic
declared operator and solves the concentration relation numerically; importing
all upstream physical caps would change the model. Source reuse/license records
are owned by the implementation report.

## Execution and evidence

All execution used distinct copied safe-dev guest `safe-dev-3d2406285147d6d0`,
stage `/tmp/mass-spinner-collision-independent-v30`. No host project code,
browser workaround, home/credential/socket mounts or sandbox changes were used.
Initial dependency download used `npm ci --ignore-scripts` online. Every later
source change was preceded by guest export, explicit sync and offline reinstall.
No frozen historical campaign was edited.

Corrected-kernel gate: **17/17 tests passed, zero failures or skips**, comprising
the nine new independent tests plus the existing independent heat-rate and
axisymmetric review suites. Strict production `tsc --noEmit` passed. Tests took
2.723 s. The corrected sampler is SHA-256
`276385adc07eecbf454973feea4490d7898392ec6bc797811b398d5c46c5de6e`;
the wrapper is `0ce57aec0ab24fe410101598d130019059905ece3e4bae7f1348ba2d8886bc47`.
The strict red run on the candidate was 7/9 passes: both the dense order check
and the Decimal-tail reference failed. The same tests passed after the fix,
without changed thresholds.

An attempted simultaneous typecheck invocation hit a safe-dev host resource
error before the command started. A later sequential invocation passed; no
sandbox or runtime limit was changed. This infrastructure failure was not a
physics result.

Exact source hashes, red/green logs, independent numeric outputs and final
commands are retained in `scientific/live-collisions-v30/independent/`.
The parent owns whole-application build, broad tests and deployment verification.
