# Independent physics audit of radial-shell time evolution (v16)

Status: tensor/KDE/mass/entropy/rate fixtures and weighted discrete-gradient
regression checks passed in an independent guest. These are mathematical and
small-system checks, not a replacement for the producer's finite-time studies.
This report qualifies only a homogeneous, field-free, exactly isotropic,
zero-drift two-ion collision benchmark. It does not qualify separator geometry,
rotation, anisotropic heating, drifts, losses, spatial gradients, or general 3V.

## Problem, cause, and chosen fix

The v14 execution path is `initial particles -> 3V Gaussian KDE entropy and
gradient -> unlike-mass Coulomb mobility -> implicit discrete-gradient solve ->
temperature/PDF diagnostics`. Its quadrature evaluates every marker at every
3D quadrature point on every nonlinear residual. Cartesian refinement therefore
multiplies both marker and quadrature counts cubically, while direct pair
mobility is quadratic in the already cubic marker count. The v15 initial
Cartesian product shortcut is valid for its prepared initial state; arbitrary
evolved PDFs need not remain products. Reusing it after evolution would replace
the physical distribution with a closure that has not been justified.

Simply put, the prior refinement created vastly more particles than a practical
time integrator can move. A faster initial slope does not give a faster evolving
distribution.

For these isotropic benchmarks, use angularly uniform spherical shells and
perform the angular Coulomb integral analytically. This removes redundant
angles while retaining the actual 3D Coulomb tensor on the rotationally invariant
subspace. The entropy work becomes O(N Q) in radial shell and quadrature counts;
direct symmetric mobility is O(N²). This is the narrow coherent fix for the
demonstrated benchmark. It is not the optimal representation for every plasma.

A general 3V GPU finite-element method would retain anisotropy but needs more
infrastructure and independent positivity/entropy qualification. The publicly
available PETSc Landau implementation supplies a fully implicit solver and
CUDA/Kokkos support; its authors explicitly address the quadratic kernel cost.
It remains an appropriate cross-code reference and a broader future backend.
([Adams et al., 2022](https://arxiv.org/abs/2104.10000))

The existing JuliaPlasma implementation supplies discrete-gradient and nonlinear
solver patterns, but its advertised particle implementation is 2D with B-spline
reconstruction; it is not a ready-made two-ion 3V shell solver. Retaining a pinned
generic nonlinear solver is reuse, while the shell physics remains a new
adaptation requiring these checks.
([CollisionOperators.jl](https://github.com/JuliaPlasma/CollisionOperators.jl))

## Independent tensor reduction

Let `Q(z)=(I-zzᵀ/|z|²)/|z|`, and let velocities be `v=r e`, `v'=s e'`,
with `μ=e·e'`. Direct projection gives

```
e·Q(v-v')·e   = s²(1-μ²)/(r²+s²-2rsμ)^(3/2),
e·Q(v-v')·e'  = rs(1-μ²)/(r²+s²-2rsμ)^(3/2).
```

The uniform spherical average is one half the μ integral. Integrating it yields

```
C(r,s) = (1/2)∫[-1,1] (1-μ²)/(r²+s²-2rsμ)^(3/2) dμ
       = 2/[3 max(r,s)³],   max(r,s)>0.
```

This agrees independently with Proposition 3.2, equation 3.2 of
[Gualdani and Guillen](https://arxiv.org/html/1412.0146): multiply their tensor
normalization by `8π`; a source shell of total weight w contributes
`(2/3) w s²/max(r,s)³` to the radial diffusion projection. Their Proposition 3.1
establishes preserved radial symmetry. Their separate Krieger–Strain scalar
diffusion equation is **not** the operator used here. The multispecies extension
of rotational covariance follows directly because scalar species masses and
isotropic Gaussian convolution commute with rotations; this last statement is
our derivation, rather than a claim that their single-species paper implemented
this two-ion method.

At `r=s>0`, C is finite. A shell is a continuum of directions, so almost all
pairs have nonzero relative velocity. Applying the point convention `Q(0)=0`
to the entire shell would incorrectly remove cross-species exchange. A shell's
interaction with itself has zero force because its entropy-force difference
is parallel to the relative velocity, not because the shell is a point.

At r=0, isotropy implies the entropy radial derivative is zero. Interactions
with a positive-radius shell then vanish. Two exact point masses at zero use
the original Q(0)=0 convention. The fixed-weight-shell double-origin limit is
nonuniform; no arbitrary denominator floor resolves it. The proposed benchmark
uses strictly positive initial radii and must reject any nonlinear trial or
accepted step that crosses the physical radius domain. No clipping is valid.

## KDE, entropy, masses, and invariants

For a shell at radius R, Gaussian variance ε (not standard deviation),

```
Kε(r,R) = (2πε)^(-3/2) exp[-(r²+R²)/(2ε)] sinh(rR/ε)/(rR/ε).
Fs(r) = Σ[i in species s] wi Kεs(r,ri).
H = Σs 4π∫[0,∞] r² Fs(r) log Fs(r) dr.
Gi = ∂H/∂ri,   hi=Gi/wi.
```

The shell KDE is positive for positive fixed weights and ε>0. Its number is
one, and its second moment is `R²+3ε`. At R=0 it is the ordinary centered 3D
Gaussian; analogous analytic limits apply at r=0. Stable `expm1`/small-argument
series evaluate these identities without a PDF floor.

Angularly averaging the full variational equation gives

```
dri/dτ = -Σj [wj/mi] C(ri,rj)
                  [rj² hi/mi - ri rj hj/mj].
```

For each unordered pair define `b=rj hi/mi-ri hj/mj`. Its contributions are
`dri=-wj C rj b/mi`, `drj=+wi C ri b/mj`. Consequently

```
d/dτ Σi wi mi ri²/2 = 0,
dH/dτ = -Σ[i<j] wi wj C(ri,rj) b² <= 0.
```

Species numbers remain fixed by fixed shell weights. Momentum is exactly zero
by angular symmetry; this benchmark cannot test nonzero momentum relaxation.
Smooth-PDF energy differs from marker energy by the time-independent
`(3/2)Σs ns ms εs`; conserving either conserves both.

The regularized multispecies model conserves these quantities and has a
species-independent continuum equilibrium temperature when `ms εs` is common.
([Carrillo, Hu and Van Fleet, Corollary 2.4](https://arxiv.org/html/2310.16143v1))
Here `εs=α/ms`; a 2/10 eV equal-density input has final **smooth temperature
6 eV**, with marker temperature `6-5α` eV. A finite shell system instead obeys
the stationary critical-point condition `hi/(mi ri)=constant`; neither that
condition nor conserved moments proves its reconstructed PDF is Maxwellian.
Distribution convergence must still be measured.

## Time-discrete identities and validation boundary

With midpoint radii in the pair mobility and a genuine discrete gradient
`Gbar·(r1-r0)=H(r1)-H(r0)`, the implicit update gives exact energy tangency and
`ΔH=-Δτ production` up to nonlinear residual contractions. A global Gonzalez
correction supplies this chain rule. Its entropy increment must be evaluated
stably; subtracting two nearly equal large entropies can corrupt the correction.

The entropy actually solved is a radial numerical quadrature. Its decay is not
alone proof that whole-space physical entropy decays. Independent quadrature
refinement, outer-domain checks, tail evidence and L1 distribution comparisons
must accompany the production finite-time study. The radial domain must cover
light-ion heating from 2 toward 6 eV, not just the initial narrower light PDF.

### Root-cause amendment: unequal-weight Gonzalez stiffness

The producer subsequently identified a specific stiffness mechanism in ordinary
Euclidean Gonzalez correction. If a global correction adds `c Δri` to Gi,
the physical force uses `hi=Gi/wi`, so a tiny tail weight amplifies that correction
by `1/wi`. This is numerical geometry, not a large physical tail collision rate.
Simply put, a correction intended to repair total entropy can accidentally
kick nearly empty tails extremely hard.

Use the ordinary Gonzalez construction in coordinates `yi=sqrt(wi) ri`:

```
Gbar_i = Gmid_i + wi Δri * [ΔH-Gmid·Δr]/Σj wj Δrj².
```

Transforming the gradient back from y gives this formula exactly. It preserves
the original entropy chain rule and the same symmetric PSD physical mobility.
The per-weight correction is now proportional to Δri without an inverse tail
weight. For smooth H, the correction remains O(|Δr|²), retaining second-order
consistency. This changes neither H, shell weights, the continuous ODE, nor any
physical reference. It is a justified constant-coordinate metric choice for
fixed positive weights; if weights evolve, this derivation no longer applies.

This fix is preferable to dropping tails, clipping radii, fitting rates, or
loosening nonlinear tolerances because those change the represented problem or
its acceptance criteria. It also retains the entropy chain rule that ordinary
midpoint alone does not guarantee. It cannot repair inaccurate entropy changes;
stable ΔH evaluation and independent quadrature checks remain necessary.

## Independent initial-rate control

For exact Gaussian marker distributions, define
`a=.4-α`, `b=(2-α)/2.1` in the unchanged dimensionless velocity units. Their
smoothed input temperatures are 2 and 10 eV. Gaussian convolution of log Fs
gives `h1=-r/.4`, `h2=-s/(2/2.1)`. Thus direct radial integration predicts

```
dT1/dt = (20κ/3) E[r²s² C(r,s)]
       = 40κ ab/[3(a+b)] sqrt(2/[π(a+b)]),
κ = 10858.76324776031 /s.
```

This derivation is independent of producer code. Its α→0 limit is the original
physical reference `27982.16330006834 eV/s`. Finite α is a model error, even when
quadrature and integration agree perfectly. Neither that target nor its 2%
acceptance gate is changed.

## Evidence and exact checks

Prospective plan: `scientific/evolution-math-v16/PLAN.md`. Independent Python
checker: `scientific/evolution-math-v16/check_radial.py`, no producer imports.
The dedicated guest was initialized from this directory, not the whole app.
Dependency installation is networked only in the guest; checks are offline.
The initial two-file plan snapshot was exported before replacement, and its
actual host SHA256 values matched the source files.

Offline command, executed in the dedicated safe-dev VM:

```
safe-dev -C /absolute/project/scientific/evolution-math-v16 run -- .venv/bin/python check_radial.py
```

The preceding guest-only installation used `python3 -m venv .venv`, then the
explicit online `pip install -r requirements.txt`; Python 3.11.2,
NumPy 2.4.3, SciPy 1.17.1. The original Euclidean-Gonzalez run passed in 1.61 s
and was exported before replacing guest source. The weighted amendment passed
all assertions in 0.128 s, including a 0.026 s prospective-fixture pilot.
Caching the fixed quadrature nodes explains most of that timing difference;
these tiny timings are not a claimed production speedup.

| Independent check | Maximum measured error / result |
|---|---:|
| Direct angular projection versus analytic C | 1.67e-16 relative |
| Direct angular Gaussian KDE versus shell formula | 1.09e-15 relative |
| KDE radial number / second moment | 2.65e-16 |
| Entropy radius gradient versus finite differences | 6.01e-10 relative |
| Random pair energy tangency (100 cases) | 1.63e-16 relative |
| Random pair entropy contraction versus square | 5.03e-16 relative |
| Equal-radius unlike-species exchange negative control | nonzero, passed |
| Common smooth-temperature force | 1.30e-16 maximum |
| Unequal mε equilibrium negative control | 0.0409 nonzero force |
| Direct radial continuum heating versus Gaussian expectation | 6.15e-16 relative |
| Weighted Gonzalez chain rule, weight down to 1e-20 | 1.64e-16 relative |
| Weighted Gonzalez versus sqrt(w) coordinate transform | 3.47e-18 absolute |
| Weighted four-shell evolution energy drift | 1.84e-16 relative |
| Weighted four-shell evolution entropy balance | 3.70e-14 absolute |
| Weighted four-shell implicit residual | 4.18e-13 norm |

With weight 1e-20, ordinary Gonzalez creates a per-weight tail correction
`9.146e16`; weighted Gonzalez gives `0.001875` for the same analytic entropy
increment. The tiny evolution uses a dimensionless horizon 0.02 and timestep
ladder 0.01, 0.005, 0.0025. Distances from the finest final radius vector are
`1.39346e-7` and `2.78684e-8`, consistent with second-order convergence. The
checker requires improved refinement, rather than fitting an exact order from
only three resolutions. No physical timestep campaign is inferred from it.

| α | Independent continuum light heating (eV/s) | Physical 2% gate |
|---:|---:|:---:|
| 0.25 | 14808.7374556333 | fail |
| 0.125 | 22474.4592766128 | fail |
| 0.0625 | 25429.5099865816 | fail |
| 0.025 | 27003.1076314017 | fail |
| 0.0125 | 27499.1867064148 | pass |
| 0.00625 | 27742.2736133111 | pass |
| 0 (physical limit) | 27982.1633000683 | reference |

The independent checker contains no imports from either the Julia producer or
v14/v15 modules. It computes radial rates by adaptive double quadrature split
at r=s; the analytic Gaussian result is a separate comparison. Its entropy
gradient uses the shell derivative and a different quadrature order from the
centered finite-difference entropy. Pair identities use deterministic random
positive radii, masses and weights. Production finite-time arrays, physical
entropy/L1 quadrature, dt/width convergence, and broader-model comparison remain
separate responsibilities; passing these fixtures does not waive them.

Preserved host exports (no old outputs overwritten):

- `scientific/evolution-math-plan-export-v16`: original prospective plan.
- `scientific/evolution-math-euclidean-export-v16`: original three-file source
  snapshot and numerical results; checker SHA256
  `fececec649ab8091844fa7908363cbfcc0189e95a52bf3ddc18b871beba5cd0c`;
  results SHA256
  `a2dc7e3f6ca56de8cffede905e2cc6385cc0092494938b590176824f878f31f9`.
- `scientific/evolution-math-weighted-export-v16`: final amended source and
  results. Actual host checker SHA256 matches the current source:
  `be5a649726218a707b3464ff3b156936f4e60f0a067f6af7d2d78afa5ef878b1`.
  Actual host results SHA256:
  `7664a9eefc63cfa7735e49b31b5fc06301c25978a7cf0d81c651b44c8308a8a8`.
  Amended prospective-plan SHA256:
  `20286c41856cf5dc2b7fec41d2f86d3c20783392f59d6e285ddee235ed812a41`.

Actual host hashes were checked after each export and before the next guest
replacement. Neither v14/v15 canonical evidence nor application behavior was
edited by this independent mathematics task. The parent must run the app's
required build/typecheck once its own changes are final.

## Stability follow-up: large shell contractions

The producer source audit found another concrete arithmetic failure in stable
entropy increments. Let `u=rR/ε`, `du=rΔR/ε`, `v=u+du`. The logarithmic shell
factor requires `log(1-exp(-2v))-log(1-exp(-2u))`. Its previous increment formula
multiplied `exp(-2u)` by `-expm1(-2du)`. A valid contraction `u=1000`, `v=1`
therefore evaluates `0*Inf` in floating point and produces NaN. The density and
its exact logarithmic ratio remain well-defined. Simply put, an intermediate
calculation overflows although the final physical answer is finite.

For du<0, the exact identity

```
exp(-2u)-exp(-2v) = exp(-2v)*expm1(2du)
```

gives the bounded evaluation

```
log1p(exp(-2v)*expm1(2du)/(1-exp(-2u))).
```

For du>=0, retain the original bounded product. This fixes the arithmetic at
the source without changing kernel values, the collision model, entropy, or
acceptance criteria; a density floor or rejected otherwise-valid contraction
would change the represented calculation. The .01 small-u series boundary
still has a separate cross-branch subtraction, so near-zero increments require
absolute as well as relative error reporting.

Independent prospective fixtures are in `check_logratio.py`: no producer
imports, 100-digit Decimal reference, contraction/expansion, large-u tiny
changes, and both directions across the .01 boundary. The offline command
`safe-dev -C /absolute/project/scientific/evolution-math-v16 run -- .venv/bin/python check_logratio.py`
passed all 13 fixtures. The old arithmetic reproduced NaN; the corrected
u=1000 to v=1 full logarithmic ratio is `49007.712341821105`, versus
`49007.71234182111` at 100-digit precision (1.49e-16 relative error).
The reversed expansion has the same relative error. The correction alone
agrees to floating-point precision in these cases. Large-u near-stationary
changes also match the high-precision reference.

The .01±1e-12 crossing illustrates the remaining rounding floor: computed
increment `3.5527136788e-15`, reference `4.6666242278e-15`, absolute error
`1.114e-15`, relative error 23.9%. This passes the prospectively declared
2e-13 absolute bound but **does not establish uniform relative accuracy for
near-zero increments**. It is reported separately from the large-contraction
fix and does not justify changing physical or entropy acceptance thresholds.
No additional producer physics change is proposed from this absolute floor.

The separate export `scientific/evolution-math-logratio-export-v16` preserves
the amended prospective plan, both checker sources and both result files.
Actual host hashes were checked: log-ratio checker and current source both
`2bec797792c8fd65a59bbca4191fe672d522f9f127cbccf33c13305f30ff7419`.
Log-ratio results SHA256:
`456f64a6008c6e47cd03fbaf9239d0b15435a02025bfdb16e19338735cfa67f5`.
The rerun full radial results SHA256:
`99691cdb16bfff3d3737cd098a9c2d2f38c54c5fcb973073d8d55b32cf4dd5f8`.
The preceding weighted export remains sealed and unchanged. The full radial
checker was rerun offline on this amended snapshot and again passed all
assertions; its numerical results are unchanged (elapsed timings differ).

## Independent audit of the finite-time L1 diagnostic

The reviewer replaced a global Gaussian quadrature of an absolute PDF
difference, whose sign-change cusps converge slowly, with root-split radial
integration. This changes only the diagnostic integration, not collision
physics or physical gates. The following independently derives its CDF.

For one shell, let σ=sqrt(ε), a=(x-R)/σ, b=(x+R)/σ, with Φ and φ the standard
normal CDF and density. Integrating the independently checked KDE gives

```
P(|V|<=x) = Φ(a)+Φ(b)-1 + (σ/R)[φ(b)-φ(a)],  R>0.
d/dx P   = x/(Rσ)[φ(a)-φ(b)] = 4πx² Kε(x,R).
```

The apparent 1/R singularity is removable. At R=0 the CDF is the Maxwell
speed CDF `2Φ(t)-1-2tφ(t)`, t=x/σ. More generally `|V|²/ε` is a noncentral
χ² variable with three degrees of freedom and noncentrality R²/ε, because
`V=R e+σ Z` and Z has three independent unit normal coordinates. Thus the
reviewer's small-R evaluation `chndtr(x²/variance,3,R²/variance)` is the exact
same distribution, not an approximate central-Gaussian replacement. The
meaning of df and noncentrality agrees with the
[official SciPy documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.chndtr.html).
All these expressions use variance ε and standard deviation sqrt(ε);
interchanging them would change both the CDF and tail domain.

For isotropic distributions the full 3V L1 norm is
`4π∫x²|Σk ck Fk(x)|dx`. On each interval with a constant difference sign,
its exact value is the absolute increment of the signed mixture CDF. Therefore
summing absolute signed-CDF increments between **all** sign-changing roots
and the endpoints is valid. A tangent zero does not change the sign and need
not split the integral. A missed pair of sign-changing roots can underestimate
L1, so finite scouts at 4/8/16/32 samples per σ are convergence evidence,
**not an interval certificate of root completeness**. Retaining consecutive
nonzero samples and comparing their sign bits avoids losing a bracket at an
exact sampled zero or through underflow of a product of tiny opposite signs.
It cannot detect arbitrarily narrow unsampled oscillations.

For the omitted tail choose U>=Rmax+12σ for each mixture. The triangle
inequality gives `|R e+σZ|>U => |Z|>12`, hence number tail
`<=N Q(3/2,72)` and signed-mixture L1 tail
`<=Σk |ck| Nk Q(3/2,72)`. This is an actual probability upper bound,
independent of scout resolution. The entropy-tail expression also follows:
upper/lower Gaussian mixture bounds imply
`|log F|<=C+(x+Rmax)²/(2ε)`. Since x<=Rmax+σ|Z|,
the latter term is `<=4Rmax²/ε+|Z|²`. The truncated 3D Gaussian second
moment is `3 Q(5/2,a²/2)`, where a=(U-Rmax)/σ; this reproduces the reviewer's
number-weighted entropy-tail bound. Fixed positive weights and ε>0 are
necessary for this logarithmic lower bound.

Own prospective CDF fixtures use adaptive quadrature of the already angularly
validated KDE, derivative finite differences, origin/small-R limits, and a
two-Gaussian root-split L1 comparison. They import neither producer nor reviewer
code. Offline command
`safe-dev -C /absolute/project/scientific/evolution-math-v16 run -- .venv/bin/python check_cdf.py`
passed all assertions: 84 CDF comparisons have maximum absolute error
`6.29e-14`; 70 derivative comparisons pass relative 2e-6 plus absolute 2e-9
tolerance (maximum absolute error `3.87e-9` where the density is nonzero).
Cases include R/σ=0, .0001, .0009999, .001, .0010001, 1, 10 and variances .04
and .7. The signed two-Gaussian CDF L1 is `0.7206053451463754`, versus adaptive
integration `0.7206053451463759`, a `4.45e-16` difference. Fourteen direct-tail
fixtures are consistent with the triangle bound `Q(3/2,72)=5.186850607832877e-31`
to floating-point integration precision. These tests validate selected formulas
and cases; they do not certify every possible root configuration.

Fresh preserved export: `scientific/evolution-math-cdf-export-v16`. The current
CDF checker source and actual host-export source both hash to
`c430e9b862ecf20720891a28e2b3e0674b2bb74afe9fb8bd6ca55b25c645582a`.
Actual host CDF-results SHA256:
`cbfd1192c6d9846602e5eeb31541a5a90c915c0a1509aeebce4e4857f42c5d2f`.
Amended prospective-plan SHA256:
`4d5bf5513cb3052d2b671eb7ce55aff5798dc089c7b699d89231649573087776`.
The imported independent KDE checker remains the already tested source
`be5a649726218a707b3464ff3b156936f4e60f0a067f6af7d2d78afa5ef878b1`.
Previous weighted and log-ratio exports were retained and their actual hashes
checked before replacing the guest snapshot.

## Source-only audit of the entropy-gradient tail bound

Read `scientific/evolution-review-v16/gradient_audit.py` independently; no code
was executed for this proof. For a component shell i, differentiating its
angular Gaussian representation gives
`|∂Ri Ki(x)| <= (x+Ri) Ki(x)/ε`. Write its random velocity as
`Xi=Ri e+σZ`, with U=|Z| distributed as χ3. Then x<=Rmax+σU,
so the score is bounded by `(2Rmax+σU)/ε`. Outside the integration cap
Rmax+12σ necessarily U>12. The previously verified mixture log bounds give
`|logF+1|<=A+U²`, with `A=C+1+4Rmax²/ε` and the same C as the entropy bound.
Multiplication and expectation therefore yield

```
|gradient tail_i|/wi <=
  [2Rmax(A M0+M2)+σ(A M1+M3)]/ε,
Mk = E[U^k 1(U>12)]
   = 2^(k/2) Γ((k+3)/2)/Γ(3/2) Q((k+3)/2,72).
```

Both coefficients and powers match the reviewer implementation. The result
has units inverse velocity for a per-number-weight entropy-radius gradient.
It requires fixed positive shell weights and a common Gaussian variance within
each audited species. This independently verifies the inequality and its source
implementation, not the reviewer's numerical bound value. Comparisons at three
selected states remain selected-state quadrature evidence, not a rerun of all
time steps at the higher quadrature order.

## Additional arithmetic scope boundary: large valid shell moves

The bounded log-ratio correction does not make every subsequent entropy
increment operation stable for arbitrary positive radii. The increment still
forms `delta=expm1(logratio)` before multiplication by the old density. A very
large positive log ratio overflows; a very negative ratio rounds delta to -1,
so the remainder `(1+delta)*log1p(delta)-delta` becomes `0*(-Inf)+1`.
Both produce nonfinite arithmetic despite finite old and new entropies.
Simply put, changing the location of a narrow shell by many widths causes the
old and new PDFs to occupy different regions; measuring everything relative
to the nearly zero old density creates an infinite intermediate result.

The prospectively frozen independent fixture `check_large_move.py` uses a
unit-weight shell R=8 to R=1, ε=.00078125, radial GL1024 and GL2048 on [0,12].
It recreates the producer's scalar formula from source, without importing or
executing Julia producer code. It obtains 1019/1024 and 2038/2048 nonfinite
node terms respectively. Yet endpoint entropy differences are
`4.158498409085476` and `4.1584984090854835`; common-max-log-scaled pointwise
entropy differences agree to `8.89e-16`. The q-refinement difference is below
`8e-15`, and independently integrated number remains within `7e-14` of one.
All fixture assertions passed offline in the independent guest.

This is a verified **global arithmetic stability limitation**, not evidence
that the frozen main campaign failed. In fact this contraction increases H,
so it is not itself an entropy-dissipating collision step. It is a valid-radius
trial that an unrestricted nonlinear solver could encounter; the current
positive-radius guard alone does not guarantee a finite residual everywhere.

A small follow-up could adapt the already existing v14 bounded component
density-difference calculation and separate logF1/logF0 branch. Alternatively,
for large differences, evaluate both endpoint entropy terms after common
max-log scaling; retain the component expm1 path for near-stationary changes
where subtraction loses accuracy. This fixes the actual arithmetic boundary
without changing physics, fitting rates, dropping tails, or clipping radii.
No frozen producer source was modified for this investigation, and no such
additional fix is claimed implemented here.

Exact offline check:
`safe-dev -C /absolute/project/scientific/evolution-math-v16 run -- .venv/bin/python check_large_move.py`.
Separate preserved export: `scientific/evolution-math-large-move-export-v16`.
Actual host checker/source SHA256 both
`50d9031972ca4daaed9162df5e8deb0703a9a8fbd6b478cd3b01445f986350f3`;
results SHA256
`e20aecf1137dd6aa7405b6735876ccfcd62709c7805b5a29d1ae1848db6ec48a`;
prospective-plan SHA256
`0a9b7f13266aab8462bd4ec13727f5e1536e5694dd64e1b446eae24b7bfb025d`.
Earlier CDF/log-ratio/weighted exports remain unchanged.
