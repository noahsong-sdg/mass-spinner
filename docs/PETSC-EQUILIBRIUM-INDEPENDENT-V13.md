# Independent PETSc equilibrium, positivity, and entropy audit — v13

The independent five-case audit is complete: 195 checkpoints and390 species
fields pass provenance, normalization, native-value, moment, and original-H3
reconstruction checks. All42 mesh16 fields are certified nonnegative; their
defined H still increases beyond the frozen budget. Mesh refinement also fails
the distribution-increment budget. These are demonstrated numerical limitations,
not a qualified device simulation or established continuum convergence.

## Scope and evidence boundary

The reviewer owns `scientific/petsc-equilibrium-review-v13` and this report. Neither
the producer operator nor frozen v12 artifacts are edited. Scientific execution is
inside a dedicated offline safe-dev VM, copied from
`/tmp/mass-spinner-petsc-equilibrium-review-v13`; guest ID
`safe-dev-39e69cf47bfdb94e`. Host activity is reading, editing, copying, checksumming.
The plan is `scientific/petsc-equilibrium-review-v13/PLAN.md`, initially frozen SHA
`a5275355abd44cc7098ef47940c4a7f0f7d2305197a278c78f50e2c82a750095`.
Before dynamics the only amendment adds the bounded 4096-box/cell work cap to its
already specified depth-8 Bernstein check. Both caps return UNKNOWN, never PASS.

## Root causes and what each experiment can establish

The original monitor in `scientific/petsc/twoion.c` calls
`DMPlexComputeIntegralFEM` after setting its objective to `Entropy`; that objective
returns `2πr F log F` for `F>0`, and zero otherwise. It therefore computes a
positive-part diagnostic using the FE quadrature, not a guaranteed full physical
entropy. For Q2 in the v12 cases the tensor rule has only three points per
coordinate. Those points integrate the polynomial number, momentum, and quadratic
energy moments exactly on the affine cells. `F log F` is not polynomial, so the
same statement does not apply to entropy. The monitor's nodal/quadrature sign tests
do not constrain the polynomial between those locations.

In plain terms: the old checks inspected a few places inside each cell and could
miss a small dip between them. Its energy calculation can be accurate while the
entropy calculation still needs more integration points. The smallest diagnostic
fix is to reconstruct the same field and refine its entropy quadrature, while
checking the whole polynomial for sign. This leaves collision dynamics intact and
tests the claimed failure directly; changing the collision rate or clipping the
field would conceal it.

Initialization calls `DMProjectFunction(..., Maxwellian, ..., INSERT_ALL_VALUES)`
after the exact-SI setup. That inserts the Maxwellian into the FE function space;
the resulting Q2 function is piecewise polynomial, whereas the continuum Maxwellian
is exponential. It is therefore not automatically an equilibrium of the discrete
collision operator. This explains a mechanism for PDF drift, but does **not** by
itself explain increasing true H: a positive non-Maxwellian continuum distribution
should still obey the H-theorem. Diagnostic error, spatial discretization, and
time integration must be separated. The [PETSc API description](https://petsc.org/release/manualpages/DM/DMProjectFunction/)
confirms the projection-into-function-space contract; it does not promise an
entropy-minimizing or equilibrium-preserving initialization.

A finite velocity domain is not, by itself, an explanation for equilibrium drift.
For common T and common drift, each mass-normalized Maxwellian gradient is
proportional to `-(v-U)/T`. Their difference is parallel to `v-v'`, which the Landau
tensor annihilates pointwise. Restricting the integration region preserves that
pointwise cancellation. Finite-domain boundary conditions, interpolation, and
discrete quadrature can change the numerical result; those mechanisms need
specific evidence rather than a generic truncation assertion.

The accepted continuum-FEM path has no built-in guarantee of monotonic entropy.
This is a documented method limitation, not a diagnosis inferred only from our
failed budget: the PETSc authors explicitly distinguish conserving FEM from a
particle method with entropy production in their [2023 paper](https://arxiv.org/html/2306.12606v1).

## Prospective producer plan and gates

Reviewed before dynamics: Q2, common 5/5 eV, 12×24, R6, dt=5 microseconds, 0.5 ms,
every-step exported fields. Four 0.1 ms sensitivities use meshes 8 and 16 at dt=5
microseconds, and mesh12 at dt=10 and 2.5 microseconds. Collision quadrature stays
unchanged; nonlinear diagnostics use orders3/8/16/32 on the identical coefficients.
Two short mesh12/16 pilots precede the full runs to check cost and resident memory.

Existing budgets remain: relative number/energy 1e-8, sampled negative fraction
1e-10, relative adjacent-H increase1e-8. New prospective descriptive acceptance
budgets: per-particle positive H change1e-8 with integration resolution2e-10;
L1 drift from each actual initial field1e-3; increment-refinement L1 at0.1ms2e-4;
L1 quadrature resolution1e-6. I requested both maximum adjacent increase and total
positive excursion of H so accumulating many small increases cannot pass silently.
These budgets are choices for this study, not established physical tolerances.
An unresolved positivity certificate makes a full-H claim UNKNOWN. A negative
witness makes it undefined for that reconstructed field.

Cross-mesh refinement must compare increments `F_h(t)-F_h(0)` on a common physical
velocity integration grid. Directly comparing finals alone mixes initialization
projection error with subsequent numerical evolution. Mesh or operator quadrature
changes cannot be called isolated temporal controls.

## Independent diagnostics

The frozen plan gives the common normalization `F=v0^3 f/n0`, `u=v/v0`, and physical
three-dimensional cylindrical measure `dV=2πu_perp du_perp du_parallel`. Species
L1 drift divides by its actual initial `N=∫F dV`, L2 by the initial squared norm.
Quadratic polynomial moments and squared PDF differences use exact-degree Gauss3;
absolute differences, negative parts, and positive-part H use independent
Gauss8/16/32. Full H is reported only if the exported polynomial is certified
nonnegative, including the limit `0 log0=0`.

`bernstein.py` uses exact rational arithmetic over the actual binary64 closure and
tabulated nodal-basis values, then a tensor Lagrange-to-Bernstein transformation.
Every polynomial value lies in the convex hull of its Bernstein coefficients.
Nonnegative coefficients certify nonnegativity; inconclusive coefficients trigger
dyadic de Casteljau subdivision. A negative dyadic point is an exact witness,
recorded with numerator/denominator. Depth8 or4096 examined boxes/cell stops with
UNRESOLVED. This certifies the exported nodal reconstruction, not an unexported
idealization of PETSc's floating-point basis evaluations. Native vector roundtrip,
tabulation reconstruction agreement, and checksums remain separate checks.

## Fix candidates, with tradeoffs

Increasing diagnostic quadrature and replacing sampled sign tests with a whole-
polynomial certificate are small, justified fixes to measurement. They provide no
promise of curing the evolution. Timestep, mesh, and nonlinear-tolerance controls
can establish whether the observed error shrinks; a failure that persists under
them can motivate a method change rather than an arbitrary correction term.

Q1 is not a free positivity fix: its nonnegative shape functions imply positivity
only when every nodal coefficient stays nonnegative, and it cannot represent the
quadratic kinetic-energy test function exactly. It could sacrifice the conservation
property we already verified. A Q1 experiment needs explicit energy-conservation
and nodal-evolution tests and would be a method comparison, not an accepted repair.

The stronger research direction is an entropy-variable representation `f=exp(g)`
with quadratic `g`, together with a compatible conservative discrete-gradient time
integrator. Hirvijoki, Burby, and Kraus derive positivity, conservation, equilibrium,
and entropy properties for this formulation in their [2018 paper](https://arxiv.org/html/1804.08546).
Its finite-dimensional equations use a state-dependent weighted mass matrix and
collision bracket; simply exponentiating the current output is not that method.
The paper develops the single-species case, so our exact unequal-mass two-species
normalization and conservation identities would need their own implementation and
validation. This is a reviewable new solver path, rather than a small change to
the current PETSc FEM operator.

## Executed independent diagnostic pilot

Before accepted v13 cases, the reviewer tested the accepted v12 100-microsecond
84u raw field, input SHA256
`429937346232d78d522cf4853e8acc801dcdd5a0ec1ba10a0380042aaa924c9c`.
The exact-rational check finds negative witnesses in cells22 and274 and certifies
the remaining286 cells nonnegative; zero cells remain unresolved. At dyadic
reference coordinates `(0.5,-0.5)` in cell22 the polynomial is
`-1.2520098096234245e-16`; the opposite tail in cell274 has the matching negative
sign. These witnesses are stronger evidence than the original sampling alone.
Their exact rational numerators/denominators are retained in
`scientific/petsc-equilibrium-review-v13/results/v12-tail-audit.json`.

On this same unchanged field, independent positive-part-H Gauss16→32 difference
is `5.746125783356117e-13` per actual snapshot particle. Negative number fractions
are approximately `6.88093e-17` and `4.99114e-17` respectively. They are tiny and
quadrature-sensitive, but the exact witnesses settle the sign question regardless
of that small integral. Full physical H is undefined for this sign-changing
reconstruction. This pilot uses the current snapshot number for its standalone
same-field comparison; every evolution audit uses the fixed actual initial number.

The tested pilot snapshot completed11 reviewer regressions in0.044s, including
positive nodes/Gauss3 with a negative interior, a positive monotone exponential
tail whose Q2 interpolant becomes negative, subdivision-required positivity,
bounded UNKNOWN, zero-limit entropy, basis permutation, exact polynomial moments,
Gauss accuracy, density scaling, and malformed/truncated/nonfinite native vectors.
The exported pilot preserves its own exact source/input/output manifest. A later
raw-manifest membership regression is a separately identified reviewer change.

## Accepted v13 pilots: measured outcomes

The current durable evidence is `scientific/petsc-equilibrium-review-v13/results/`:
`pilot12-audit.json`, `pilot16-audit.json`, `pilots-summary.json`, and the exact
source/input/output `review-manifest.json`. The final pilot snapshot passed17
regressions in0.062s, including stale persisted data, complete dense endpoint-pair
selection, a union-mesh increment comparison, and a60-digit Decimal reference for
small stable entropy increments. All execution was in the dedicated reviewer VM.

Both pilots retain three times0,5,10 microseconds and two actual species fields
at each time. Their raw manifests, runtime-source copies, initial setup/scales,
all four pair coefficients, native vectors, native/closure scalar-value membership,
unchanged affine geometry, and independently reconstructed moments/H3 all pass.
Native value membership does not establish global topology ordering; physical
closure reconstruction and actual exporter VecLoad roundtrip are separate evidence.

| Independent observation | mesh12 pilot | mesh16 pilot |
|---|---:|---:|
| Initial nonnegative certificate | all576 species-cells | all1024 species-cells |
| Negative cells at5 microseconds (40u,84u) | 8,6 | 0,0 |
| Negative cells at10 microseconds (40u,84u) | 10,10 | 0,0 |
| Unresolved cells across all states | 0 | 0 |
| H32 first increase / fixed total initial N | 7.18187685e-7 (positive-part proxy) | 7.91474406e-8 (defined H) |
| H32 second increase / fixed total initial N | 3.72933127e-7 (positive-part proxy) | 2.66763643e-8 (defined H) |
| Maximum independently checked L1 drift | 3.36546061e-4 | 1.05839977e-4 |
| Maximum negative energy / initial energy | 1.13639952e-14 | 0 |

For mesh16, all six serialized polynomials are certified nonnegative everywhere.
At **each** endpoint0,5,10 microseconds, the independent total-species H32−H16
difference is4.440798732355332e-15 per fixed total initial particle. Each adjacent
pair therefore has an observed16→32 discrepancy triangle bound8.881597464710664e-15.
This is an empirical quadrature sensitivity bound, not an analytic integration
error theorem. It is far below the2e-10 integration-resolution gate and the two
positive increments above1e-8. This is a numerical defined-H monotonicity failure
for the exported field/domain and these time steps, without a negativity confound.

Independent degree-exact number changes are0.0 for each species at every pilot16
endpoint. With `c=log(n0/v0^3)=16.29519447128317`, the measured reference correction
`c sum_s deltaN_s/sum_s N_s(0)` is0.0. Thus these increments are not created by a
changing denominator or the reference constant. Energy residuals are at most
1.16e-14 for mesh12 and3.89e-15 for mesh16.

For mesh12, cells that are ever negative or unresolved contribute
**−1.98591205e-11** per initial particle to the first H32-positive-part increment;
the remaining cells contribute **+7.18207544e-7**. The tiny negative tails therefore
do not drive this measured positive-part increase. They still make the full H
undefined for its evolved signed fields. The original relative H3 convention is
reproduced; its failure is retained rather than replaced by a new normalization.

## Entropy-increase attribution and the followup

Diagnostic underintegration alone is excluded for the measured rise: it persists
and grows on identical coefficients under independent Gauss16/32 integration.
Projection nonstationarity is a mechanism for distribution drift, but is not a
sufficient explanation for increasing true H. Galerkin/operator quadrature and
nonlinear solve errors are not separated by the original fixed-operator ladder.

There is also a useful constraint on temporal attribution. For an exactly solved
backward-Euler step of an H-dissipative semidiscrete ODE, convexity implies
`H(f1)-H(f0) <= gradH(f1).(f1-f0) = dt gradH(f1).C_h(f1) <= 0`.
Here `C_h=M^-1 R` includes the constant FE mass matrix. The pinned
[PETSc source](https://github.com/petsc/petsc/blob/v3.26.1/src/ts/utils/dmplexlandau/plexland.c)
constructs a state-independent mass matrix and a residual of the form
`J(X)X + M X_t`. Generic backward-Euler truncation alone therefore cannot explain
the positive-endpoint H rise if the semidiscrete evolution dissipates that same H
and the nonlinear equation is accurately solved. A compatible entropy structure
or a quantified numerical-solve explanation is required.

A separate followup was reviewed before its dynamics, as recorded in
`scientific/petsc-equilibrium-review-v13/FOLLOWUP-REVIEW.md`: exact mesh16 initial
bytes, single steps1,0.1,0.01 microseconds, unchanged operator/tolerances, recorded
SNES norms, and stable coefficient-difference/log1p entropy increments. It tests
persistent finite-step slope; it does not prove a semidiscrete limit or supply a
rigorous residual-to-H error bound. No clipping or rate adjustment is applied.

The initial dense-selector implementation covered only the current state of the
largest H3 rise; that could omit its predecessor or a distinct worst H32 pair.
The fix selects both endpoints of the worst H3 pair and the producer-reported
worst H32 pair, plus cumulative maxima, with the producer analysis SHA retained
as selection evidence. A regression uses distinct noninitial peaks. This small
diagnostic fix makes the reported increments independently reviewable without
claiming independent H32 coverage at every unsampled state. Both actual pilots
already had all three endpoints selected in the initial implementation.

## Completed five-case independent audit

The accepted main outputs are `results/CASE-audit.json` and
`results/main-summary.json` in the reviewer package. All195 saved checkpoints
and390 species fields were independently reconstructed, including all-state exact
polynomial sign certification and original Gauss3 diagnostics. The baseline setup
and101 decoded checkpoint records are numerically identical to frozen v12's
common-temperature case. This reviewer uses decoded numeric equality; the producer
separately checks IEEE encoding. No positivity certificate remains unresolved.

| Case | Checkpoints / fields | Negative witness cell occurrences | Maximum selected L1 drift | Maximum selected negative number fraction |
|---|---:|---:|---:|---:|
| baseline12,0.5ms | 101 /202 | 58 | 6.55851e-4 | 2.62702e-16 |
| mesh8,0.1ms | 21 /42 | 2368 | 2.60314e-3 | 3.88192e-6 |
| mesh16,0.1ms | 21 /42 | 0 | 1.50253e-4 | 0 |
| dt10us,0.1ms | 11 /22 | 20 | 4.81224e-4 | 1.48538e-16 |
| dt2.5us,0.1ms | 41 /82 | 148 | 4.84230e-4 | 8.80422e-17 |

Occurrences count a cell again at a different state; they are not unique cells.
Nonlinear L1, negative integrals, and refined H in this table are selected-state
independent Gauss32 checks, not a claim of independent Gauss32 at every time. The
selection includes both endpoints of the largest original-H3 and producer-H32
adjacent rises. All-state sign and original-H3 checks have broader coverage.
Mesh8 exceeds both drift1e-3 and negative-number1e-10 budgets; its negative-energy
fraction reaches3.71692e-5. Its largest selected H16→32 discrepancy3.49085e-7
also fails the2e-10 resolution gate. Tiny negative tails in the mesh12 cases
remain mathematical sign failures even when their integrals satisfy the chosen
diagnostic budget. All42 mesh16 fields are globally nonnegative within the exact
serialized-polynomial scope; that positive case isolates the H failure from tails.

Independent100-microsecond comparisons integrate evolution increments on the
union of the actual cell boundaries, dividing by the fixed baseline initial
species number. The eight raw outputs are `results/comparison-CASE-sS.json`.

| Comparison to baseline12/dt5us | Increment L1,40u | Increment L1,84u | Maximum16→32 discrepancy |
|---|---:|---:|---:|
| mesh8 | 2.41011e-3 | 2.04854e-3 | 1.48275e-6 |
| mesh16 | 4.21714e-4 | 3.88979e-4 | 4.46437e-8 |
| dt10us | 3.29386e-6 | 3.86417e-6 | 9.82142e-11 |
| dt2.5us | 1.64423e-6 | 1.97406e-6 | 9.81752e-11 |

The12→16 mesh comparison has resolved quadrature under the1e-6 budget but exceeds
the2e-4 distribution-refinement budget for both species. The8→12 heavy-species
quadrature discrepancy itself exceeds1e-6, so that coarse comparison is unresolved
under the frozen resolution gate. Timestep increments are much smaller and pass
these descriptive budgets. This separates improving temporal agreement from an
accepted spatially converged equilibrium distribution.

## Accepted small-step and stricter-solve controls

The three separately frozen one-step cases and matched stricter1us solve pass the
independent raw-manifest/source/build/config/native checks, including the four
exact pilot16 initial JSON/vector hashes. All16 endpoint species-field occurrences
are certified nonnegative, so these stable increments are defined H for the
serialized polynomials. `entropy_increment.py` evaluates the nodal coefficient
difference before constructing the polynomial difference, then uses `log1p` and
`math.fsum`; this avoids subtracting two order-one H totals to measure a tiny rise.
A60-digit Decimal regression checks the small-increment formula independently.

| Single step | Independent stable H32 increase / fixed initial N | Increase / dt,per second | Stable16→32 discrepancy / initial N |
|---|---:|---:|---:|
| 1us | 3.42448006895018e-8 | 0.0342448006895 | 1.03627e-19 |
| 0.1us | 4.00789340214944e-9 | 0.0400789340215 | 1.35605e-20 |
| 0.01us | 3.76507065561447e-10 | 0.0376507065561 | 1.37061e-21 |

All slopes remain positive. The last two differ by about6.06%, within the
prospective10% descriptive slope budget. The direct-large-total subtraction
changes these total increments by at most1.90e-16 per initial particle. Together
with the producer's independent summation results, these checks place the smallest
3.77e-10 signal well above the frozen20×sensitivity/floor requirement. They support
persistence at finite small dt; three steps are not a proof of a semidiscrete limit.

Default1us stops with `CONVERGED_SNORM_RELATIVE`, final function norm
5.211836138044e-14. The separately frozen control uses stol0,rtol1e-13,atol1e-14,
maxit50. It reaches `CONVERGED_FNORM_ABS` at iteration6 with function norm
2.109330059441e-15, below its1e-14 function target. Its independently reconstructed
H32 increase remains3.42447997235108e-8 per initial particle. The change from the
matched default is−9.659909889e-16, and maximum final species L1 difference is
2.677647160e-15, passing the frozen1e-12 entropy-change and1e-8 field-change controls.
Step-norm termination therefore does not dominate this matched case's positive H
rise. Function residuals are reported as measured algebraic norms; no rigorous
residual-to-H bound or complete operator-quadrature attribution is claimed.

The accepted independent files are `results/slope{1,0.1,0.01}us-audit.json` and
`results/solver1us-tight-audit.json`. Final reviewer regressions pass17 tests in
0.059s (`results/followup-self-test.txt`). The package contains822 non-test Python
lines and173 test lines. This audit changes diagnostics only; all original physical
driver, cached wrapper, collision object, and PETSc library identities remain pinned.

## Closeout and recommended next implementation

`results/review-manifest.json` records the final reviewer source, frozen input
snapshot, and accepted outputs; earlier pilot/main/comparison/followup manifests
retain their execution-stage provenance. Reproduction commands and sealed-input
staging rules are in the package README. The final offline manifest pass copies
already accepted evidence into its snapshot and hashes it; it does not rerun or
alter dynamics. No JavaScript build or application typecheck is applicable to this
standalone Python-standard-library audit package; the exact17 reviewer tests and
actual-data audits above are its checks.

The smallest useful implemented changes are the corrected diagnostics: whole-cell
sign certification, resolved nonlinear quadrature, fixed-initial-number metrics,
stable small entropy increments, and complete adjacent endpoint coverage. They
measure failures without altering conservation or collision rates. The next solver
change should be a separately reviewed structure-preserving path with explicit
unequal-mass two-species equilibrium/conservation/positivity/H tests. Q1, clipping,
or a tighter nonlinear tolerance alone is not supported as the cure by these data.
The current continuum-FEM method remains useful for independently checked moments,
but is not accepted as an equilibrium/entropy-qualified PDF reference here.
