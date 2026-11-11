# Independent Landau heating-rate derivation, v15

7 November 2026 UTC. This audit owns `scientific/structure-rate-math-v15`.
It imports no producer scientific implementation. All scientific calculations
below ran offline in that package's separate Apple safe-dev VM,
`safe-dev-9fb255b553213076`; host operations were reading, editing, explicit
copying and SHA-256 verification. The immutable v14 sources/results were not edited.

## Finding: shape error and operator error are distinct

The unregularized physical Landau operator applied to the **actual serialized
initial Gaussian-mixture PDF** gives the following light-ion temperature rates.
The Maxwellian reference remains 27982.16330006834 eV/s.

| Frozen v14 case | Actual GMM physical rate, eV/s | Difference from Maxwellian | Recorded 10 ns marker rate, eV/s |
| --- | ---: | ---: | ---: |
| n4, alpha .25 | 30791.889915654 | +10.0411% | 16900.180652413 |
| n6, alpha .25 | 28608.756179857 | +2.23926% | 16585.578469797 |
| n4, alpha .125 | 33307.174100492 | +19.0300% | 24480.569232410 |
| n4, alpha .0625 | 39966.089624473 | +42.8270% | 17306.153775754 |

The last column uses subtraction of recorded temperatures, so its final digits
differ from the more cancellation-resistant velocity-increment reconstruction.
Both are distinct from an instantaneous derivative.

Verified: shrinking width at fixed n4 makes the represented PDF's *physical*
heating substantially faster than the Maxwellian reference, while these marker
rates remain substantially slower. Accurate initial temperature does not fix the
full distribution. The actual-GMM calculation excludes initial shape error as a
sufficient explanation of the marker-rate shortfall. It does **not** independently
separate marker regularization, gradient quadrature, discrete pair sampling and
timestep error. The producer's separately refined initial-gradient reference and
same-operator timestep ladder are needed for that decomposition.

The problem was that a Maxwellian moment-rate comparison combined two different
errors: the finite marker mixture need not be Maxwellian, and its evolution uses
a regularized entropy gradient evaluated on marker centers. In plain terms, we
were changing both the starting distribution and the collision dynamics while
checking a single target. The fix is an independent exact Gaussian-mixture moment
reference. It preserves the physical coefficient and initialization; fitting a
collision multiplier or replacing the original target would hide these errors.

## Controlled baseline error ledger

The new timestep study's initial masses, weights, species, widths and full velocity
arrays are bit-identical to the frozen v14 baseline. Expanding the full-space
Gauss–Hermite pilot gives exactly the same centers and weights (maximum deltas zero).
Using pinned raw arrays and exact rational arithmetic on serialized binary64 values
for the moment calculations gives this controlled sequence:

| Reference | Light rate, eV/s | Increment, eV/s |
| --- | ---: | ---: |
| Physical Maxwellian | 27982.16330006834 | — |
| Physical actual GMM | 30791.889915653926 | +2809.726615585587 input shape |
| Full-space regularized marker | 16900.642127488256 | −13891.24778816567 aggregate regularization and marker sampling |
| Same marker operator, finite entropy quadrature q48 | 16899.590778706424 | −1.0513487818316207 entropy-gradient quadrature |
| Actual implicit 10 ns endpoint | 16900.18065242916 | +0.589873722736229 finite timestep |

The four increments sum to the observed total error with zero binary64 summation
residual. This controlled baseline does not identify a missing Coulomb prefactor.
It identifies a large change in the modeled/discretized collision operator, with
small quadrature and timestep corrections in this case. Do not reuse this pure
four-part decomposition for old cases lacking their same-operator initial derivative.
Raw evidence and identity checks are in `results/baseline-bias-decomposition.json`.

## Joint-refinement physical cross-check

The prospective nine-case audit uses the producer's exported raw axes:
n64/128/256/512 at alpha .00625, plus n512 at the other five widths. All 96 copied
raw campaign records were hashed inside this independent VM against the externally
pinned producer export. No producer code was imported. Selected physical GMM rates
agree with the Maxwellian target within 4.3e-13 relative; Simpson 512→1024 changes
are at most 6.2e-13 of the target. These are binary64 numerical agreement figures,
not interval-certified bounds.

The finite-width continuum prediction follows by Gaussian conditioning, without
fitting. With marker variances `a=.4-alpha`, `b=(2-alpha)/2.1`, `S=a+b`, the smoothed
entropy force is `-5 va/2 + 5 vb/10`. Its averaged work is
`2ab/S * sqrt(2/(pi S)) * 5(1/10-1/2)`; multiply by `-10kappa/3`:

| alpha | Independent finite-width continuum, eV/s | n512 marker rate, eV/s | Marker error vs physical target |
| --- | ---: | ---: | ---: |
| .25 | 14808.737455633269 | 14808.736741883551 | −47.07794% |
| .125 | 22474.459276612797 | 22474.418925303195 | −19.68305% |
| .0625 | 25429.509986581586 | 25429.509656442322 | −9.12243% |
| .025 | 27003.10763140166 | 27003.104609044025 | −3.49887% |
| .0125 | 27499.186706414817 | 27499.185102951047 | −1.72602% |
| .00625 | 27742.273613311074 | 27742.275594166567 | −0.85729% |

At n512 the largest marker-minus-continuum discrepancy is 1.45e-6 of the physical
target, below the unchanged 2e-4 diagnostic budget. Within that budget, finite
width explains the remaining fine-grid initial-rate bias. At n64, alpha .00625,
the marker rate is instead 32124.689758599157 eV/s, +14.8042% above the physical
target, while the actual GMM's physical rate is near the target. This negative
control demonstrates the need for particle refinement. A close physical heating
moment alone does not establish a close PDF; the n128 narrow case's shape
diagnostic remains separately underresolved.

Initial-rate passes do not qualify evolved huge-N simulations, long-time entropy,
distribution convergence or a separator device. Raw physical ladders and bias
comparisons are in `results/tensor-physical-rates.json` and
`results/main-bias-decomposition.json`.

## Exact Gaussian-component pair calculation

Use the frozen normalization: masses `ma,mb` in units of 40u, velocities in
`sqrt(5 eV/(40u))`, number weights in units of 5e17 m^-3, and

```
kappa = [e^4 lnLambda/(8 pi eps0^2)] n0 / (m0^2 v0^3).
```

For one component from each species, write independent random velocities

```
va ~ N(A,a I), vb ~ N(B,b I)
d=A-B, S=a+b, g=va-vb ~ N(d,S I)
C=A-(a/S)d, V=ab/S
va=C+(a/S)g+eta, vb=C-(b/S)g+eta, eta~N(0,V I), eta independent of g.
```

For the unregularized Landau operator, bilinearity in the two PDFs permits
summing component-pair collision moments. It is valid to use each component's
Gaussian score within this bilinear decomposition; it is **not** a claim that the
score of a mixture equals an unweighted sum of component scores.

With `Q(g)=(I-gg'/|g|^2)/|g|`, define

```
K=(1/ma+1/mb)/S, D=1/(mb*b)-1/(ma*a)
score_a/ma-score_b/mb = -K*g + K*d + D*eta.
```

Since `Q(g)g=0`, conditional Gaussian averaging gives

```
W_a = E[(va-u_a) dot Q(g)(score_a/ma-score_b/mb)]
    = K (C-u_a) dot d * lambda_parallel(|d|,S) + 2 D V L(|d|,S)

E[Q(g)(score_a/ma-score_b/mb)] = K lambda_parallel(|d|,S) d.
```

Here `u_a` is the bulk mean of the **whole** species mixture, not the individual
component mean. Consequently drifting components and nonzero species flows are
handled without confusing bulk-energy loss with thermal exchange.

Let `r=|d|`, `x=r/sqrt(2S)`. The Gaussian Rosenbluth potentials yield

```
L = erf(x)/r
lambda_parallel = (2S/r^3)[erf(x)-(2x/sqrt(pi))*exp(-x^2)]
L(0,S)=sqrt(2/(pi S))
lambda_parallel(0,S)=(2/3)sqrt(2/(pi S)).
```

The implementation uses convergent power series near zero rather than subtracting
two nearly equal values. An independent positive-integral evaluation checks both:

```
L = sqrt(2/(pi S)) integral_0^1 exp(-x^2 y^2) dy
lambda_parallel = 2 sqrt(2/(pi S)) integral_0^1 y^2 exp(-x^2 y^2) dy.
```

The physical temperature rate is

```
dTa/dt [eV/s] = -10*kappa/(3 Na) sum_i,j wi*wj*W_a(i,j).
```

The factor 10 is twice the 5 eV normalization energy. Momentum transfer is
`-kappa sum wi wj K lambda_parallel d`, with the opposite transfer to species b.
For drifting mixtures, thermal energy alone need not be conserved: the ledger is
`0.3(Na*dTa/dt+Nb*dTb/dt)+(ua-ub) dot dPa/dt = 0` in normalized-energy units.

For a single zero-drift Gaussian per species the formula reduces to

```
dTa/dt = (4/3)sqrt(2/pi)*kappa/(ma*mb*S^(3/2)) * (Tb-Ta),
```

which reproduces the unchanged 2/10 eV target. Common temperature and common flow
give equilibrium. In the v14 initialization `ma*a=mb*b=alpha`, so `D=0` in exact
arithmetic; the implementation preserves actual serialized binary64 variances.

**Coincident component centers are not coincident point particles.** At `d=0`,
Gaussian velocities still have a continuous spread and can exchange heat when
`D!=0`. Applying the marker convention `Q(0)=0` to this Gaussian pair would be a
physical bug. The zero-drift unequal-temperature regression protects this case.

## Compressed tensor physical rate

For identical Cartesian-product 1D mixtures, let raw 1D nodes be `(wi,Ai)` and
`(wj,Bj)`. Actual 3D species number is `(sum wi)^3`; do not renormalize. For each
`y` in `[0,1]`, define

```
t=y^2/(2S), d_ij=Ai-Bj, C_ij=Ai-(a/S)d_ij
Z(y)=sum wi*wj exp(-t*d_ij^2)
B_a(y)=sum wi*wj (C_ij-u_a)*d_ij exp(-t*d_ij^2).
```

Then exact full-space Gaussian-mixture physical work reduces to

```
W_a=sqrt(2/(pi S)) integral_0^1 [6K y^2 B_a(y) Z(y)^2 + 2 D V Z(y)^3]dy.
```

This costs `O(n^2 q)` rather than explicit `O(n^6)` component pairs. A drifting,
unequal-mass, unequal-width, nonunit-density 2^3 tensor regression agrees with the
independent explicit Gaussian-pair sum within 2e-12 relative after Simpson
1024/2048 refinement. This is an initial-rate reference, not an evolved tensor
closure. Campaign inputs and the bounded-integral order still need refinement.

For the exported **pilot** lattice n64, alpha .00625, the actual-GMM physical
rate is 27982.163300080163 eV/s. Simpson 256/512/1024 yields
27982.16330003776 / 27982.16330007767 / 27982.163300080163; the finest change is
8.91e-14 of the target. The producer's regularized-marker initial rate is
32124.689758792 eV/s. Thus its approximately 14.8% excess cannot be assigned to
the actual distribution's physical heating moment. Agreement of that one physical
moment still does not establish a small full-PDF difference. This pilot is separate
from the prospectively frozen main campaign.

## Entropy-gradient and marker-pair audit

For a tensor initial mixture, `F(v)=f(vx)f(vy)f(vz)` up to a constant number factor.
Integration by parts on full velocity space gives the coordinate entropy gradient
`gi/wi = integral psi_i(v) grad log F(v) dv`. Its coordinates are independent 1D
Gaussian expectations. This identity differentiates the full-space entropy;
merely differentiating a moving finite quadrature while ignoring node derivatives
would be a different, generally incorrect operation. Generic evolved 3V states
do not retain the initial tensor factorization.

The producer's Laplace marker-work expansion has three same-axis and six cross-axis
terms. Its explicit subtraction of the all-three-coordinates-coincident contribution
is necessary to retain exact discrete `Q(0)=0`. Individual 1D zero differences are
not sufficient to discard a 3D pair. No finite relative-speed cutoff is justified.
Quadrature convergence of entropy or number does not prove convergence of its
gradient. Score integration and pair integration must be refined separately.

For symmetric centers bounded by `A`, variance `epsilon`, and integration domain
`[-A-8sqrt(epsilon), A+8sqrt(epsilon)]`, a conservative component-score tail bound is

```
|omitted integral psi_i score(F)| <= (2A/epsilon)erfc(8/sqrt(2))
                                  +2exp(-32)/sqrt(2pi epsilon).
```

This follows from `|score(F)(x)| <= (|x|+A)/epsilon` and Gaussian tail moments.
It bounds truncation only; it does not replace score-quadrature refinement.

Shrinking epsilon at fixed finite particle count can isolate blobs and drive
their smoothed entropy gradients toward zero even though physical Gaussian-pair
exchange remains. Taking epsilon to zero before resolving particle spacing is
therefore not the same numerical limit as jointly refining particles and width.
This is a mechanism supported by the derived operators, not a blanket convergence
theorem for the Coulomb particle method.

## Verification and provenance

`safe-dev -C scientific/structure-rate-math-v15 run -- .venv/bin/python -m unittest -v`
passed **12 tests** on the copied snapshot: Maxwellian target; equal-temperature
equilibrium; coincident-center heat; analytic kernels versus independent positive
Simpson 4096/8192 integrals; drifting unequal-mixture momentum/total-energy ledger;
density and coefficient scaling; Galilean invariance; physical domain boundaries;
tensor versus explicit pair sum; NumPy vectorization versus independent stdlib
tensor calculation; stale/duplicate/partial/unconverged histories;
pinned-manifest mutation and ambiguous metadata rejection; independent fixed-width
continuum controls including the zero-width limit. A full-3V coordinate-length
guard enforces the formula's actual dimensional boundary.

`... run -- python3 audit_inputs.py` independently checked four externally pinned
v14 raw manifests, each member and decompressed metadata hash before calculating
the rates above. Bounded runs used `python3 bounded.py tests-final
.venv/bin/python -m unittest -v` and `python3 bounded.py v14-actual
.venv/bin/python audit_inputs.py`. Actual raw-audit elapsed time was 0.754 s with
maximum RSS 330380 KiB. The selected physical tensor ladders completed in one
9.990 s invocation, maximum RSS 49260 KiB. Final test timings are retained in
`results/tests-final.process.json`. All enforce 120 s and a stricter 1 GiB
address-space cap.
Result SHA-256, verified after guest export on the host:
`70ef5cccf20f013d32d8a754edd1ea0159c8aa0ebe3842a286e1359a32a88335`.
Valuable guest outputs were exported and their host hashes checked before every
replacement sync.
The initial stdlib calculation required no installation. The later large-tensor
reference installed pinned NumPy 2.3.4 in the guest through explicit online
dependency commands; all numerical calculations and tests ran offline. Its vectorization
changes the evaluation cost, not the independently derived physical model.
The pilot tensor result SHA-256 is
`9c5e78c4f8d39e1e4582d92a9429ae72985ef2a4cadd7d10143bc34e1d115afc`.
The final scientific figure uses pinned Matplotlib 3.10.7; transitive versions
are recorded in `results/dependency-freeze.txt`. SVG and PNG were generated inside
the same VM from the hash-pinned 30-row summary and inspected visually after export.
They are retained as `results/heating-rate-convergence.{svg,png}`. The figure marks
unresolved shape integration separately and displays numerical L1 estimates below
1e-12 at an explicitly labeled floor. Plotting changes no numerical gate.

The formulas above are our conditional-Gaussian derivation. Primary background:
[Pfefferle, Hirvijoki and Lingam (2017), exact collisional moments](https://arxiv.org/html/1701.08037)
establish Gaussian Rosenbluth-potential generation of exact Landau moments and
their conservation properties without restrictions on flow, temperature or mass
ratio. [Hardman et al. (2025), Appendix B](https://ora.ox.ac.uk/objects/uuid%3Adac47659-ac31-458c-92e4-0a8a1e146b9b/files/rnp193b95w)
states drifting-Maxwellian Rosenbluth potentials matching `L` and the expected
radius whose Hessian supplies `lambda_parallel`. The full PDF was inspected in
the earlier retrieval; a later re-fetch returned HTTP 403. Neither paper is being
claimed to publish this project's particular finite-GMM numerical results.
