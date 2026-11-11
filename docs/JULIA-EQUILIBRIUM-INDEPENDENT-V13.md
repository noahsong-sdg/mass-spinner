# Independent Julia equilibrium audit, v13

This is an independent distribution-level review, not qualification of a full
separator or a 0.5 ms collision campaign. The v12 evidence remains unchanged.
The solver is FokkerPlanck.jl multispecies commit
`869e22dbbeda603caf99848c9d58052d9ec9d362`. The producer's original frozen
study/plan hashes are `428bbf97bcec148b0e18427283df8c078848c847a352f35595c4e60435e4a5a6`
and `8b0055186b477bd6c9be6c70d0cfe44c5ccc8ec183fd907eb4ecd6729745b8bd`.

## What has been verified

The independent package `scientific/julia-equilibrium-review-v13` imports no
upstream interpolation, integration, moment, or entropy routine. Python standard
library code reconstructs the actual element polynomials and integrates them
with independent tensor Gauss–Legendre quadrature and measure
`2π vperp dvperp dvparallel`. All execution is in its dedicated Apple safe-dev VM;
host operations are source inspection, editing, hashing and explicit copies.
The producer artifacts, complete manifest inventory, normalization, clock,
actual initial distributions and all Boolean Newton returns are checked.

The baseline has **81 × 41 × 2** degrees of freedom. Its first radial element
contains five reflected Gauss–Radau nodes on `[0,0.5]`, beginning at
`0.028552098057258835` and ending at `0.5`; the axis is not a node. The map is
`[1,2,3,4,5]`, followed by `[5,6,7,8,9]`. These are ordinary degree-four
Lagrange polynomials on the whole interval, with no ghost-axis value or Hermite
constraint. This follows both the actual exported maps and the pinned
[FiniteElementAssembly source](https://github.com/moment-kinetics/FiniteElementAssembly.jl/blob/5491472a575e475f19bbc46c29dd38672f371559/src/FiniteElementAssembly.jl).
An actual-first-element constant/radial-quartic fixture verifies this treatment.
Independent density, temperature and total-energy integrals agree with upstream
moments to approximately `1e-13` or better on the pilot. This checks the
reconstruction and cylindrical normalization, not physical shape accuracy.

The diagnostics-on/off instrumentation twin has bitwise-identical full PDFs at
both checkpoints and identical Newton histories, including all four successful
returns. Diagnostic potential evaluation therefore did not change the measured
subsequent trajectory in this control.

The original pilot took 42.688 s and 1,052,236 KiB RSS. Its frozen 1 GiB resource
gate **failed**, by 3,660 KiB. The original ladder did not run. A separately
prospective follow-up with parent-approved 1.5 GiB, 60 s per case and 300 s total
limits preserves that failure rather than changing its threshold retroactively.

## Demonstrated representation defect

Both initial species have strictly positive nodal values, yet their represented
polynomials are negative between nodes. At quadrature order 16 the heavy species
initial minimum is `−4.39e-7`, versus a nodal minimum `1.17e-76`; the negative
number and energy fractions are approximately `1.78e-7` and `1.72e-6`, relative
to the respective absolute integrals. After 1 μs these become approximately
`2.03e-7` and `2.03e-6`. Order 8 substantially undersamples the narrow negative
regions. Orders 24/32/48 give initial heavy negative-number fractions
`[1.570,1.658,1.594]e-7` and final fractions `[1.951,1.926,1.868]e-7`;
the corresponding negative-energy ranges are approximately
`[1.52,1.60]e-6` and `[1.88,1.96]e-6`. The sign failure is robust, while these
nonsmooth scalar integrals are not precision-converged (about 4% change for the
final heavy number fraction from order 32 to 48).

The saved witnesses contain element IDs, actual nodes and nodal coefficients,
barycentric weights, physical velocities and reconstructed evaluations. A
separate `Fraction.from_float` computation proves the negative sign exactly
for the polynomial defined by those serialized binary64 nodes/coefficients and
the chosen serialized point; this is not a proof about the continuous Maxwellian.
At `z=0`, an actual parallel-velocity node, all five heavy-species radial nodes
on `[1.5,2]` are positive, yet the polynomial is `−4.8421987e-7` at `r=1.9725`.
`initial-heavy-radial-slice/actual-nodes.csv` distinguishes real 2D nodes from
interpolated slice points, and includes both a full slice and a tail zoom.

The root cause is already present before stepping: polynomial interpolation of
positive Maxwellian samples need not stay positive. In simple terms, a smooth
curve drawn through positive points can overshoot below zero between them.
The time integrator and conservation projection cannot be the sole source of
this initial failure. The baseline additionally changes its full distribution
over 1 μs while nearly preserving its few conserved moments. At order 16 its
species L1 drifts, divided by fixed initial species density, are approximately
`7.68e-6` and `2.85e-5`.

## Causal controls

All twelve frozen cases were independently integrated at orders 8/12/16 and 24,
including every saved intermediate half/quarter-step state. All 16 advancement
returns were true. Full-array returned backward-Euler residuals independently
reproduce the producer's values. The order-24 audit cost 74.96 s wall,
74.99 s CPU and 210,936 KiB peak RSS. This is postprocessing cost, separate from
the producer's numerical solves.

| Representation | Heavy-species L1 drift at 1 μs, order 16 |
|---|---:|
| p4, 12×6 elements | 2.92e-4 |
| p4, 20×10 baseline | 2.85e-5 |
| p4, 32×16 | 3.18e-6 |
| p6, 20×10 | 8.05e-7 |

The table is a descriptive norm comparison, not an accuracy certificate or a
fixed-order convergence fit. Refining h or p substantially reduces initial
shape error, collision residual and subsequent drift. Fine/p6 initial heavy
negative-number fractions at order 48 are `7.14e-14`/`1.96e-13`, and final
fractions `1.78e-11`/`8.16e-12`. Order-32-to-48 final changes are approximately
0.08% and 1.8%, respectively. Exact serialized-polynomial signs remain negative;
refinement mitigates the defect without proving positivity.

Direct represented-field comparisons at order 24 show that final raw-operator
and tight-tolerance controls differ from baseline by species L1 norms
`[3.26e-9,1.06e-8]` and `[2.48e-11,1.68e-12]`, respectively. Both are much smaller
than the baseline shape drift. Corrections still repair conserved moments;
this evidence addresses their contribution to shape error rather than making
them unnecessary. Enlarging the domain from R4 to R5 at fixed spacing barely
changes these baseline norms, which argues against boundary truncation being
the dominant error in this specific case.

The moment-matched initializer has measured `n=[1,1]` and `T=[6,6]` to rounding,
yet retains approximately the same shape drift and develops temperature changes
`[−2.16e-8,+2.16e-8]` eV. Unequal initial projected temperatures therefore cannot
explain the measured baseline shape evolution. Smaller time steps increase the
1 μs drift toward the evolution of the nonzero semidiscrete operator; one large
implicit step was damping this error. These controls collectively support a
representation/discretization limitation. They do not isolate every contribution
of FE derivatives, Rosenbluth solves and finite-domain weak assembly.

This is consistent with the method paper's explicit caveat about high-order
polynomial positivity. Its equilibrium and log-absolute entropy diagnostics do
not provide a positivity theorem for this later multispecies branch.
[Hardman et al., CPC 314 (2025) 109675](https://scientific-publications.ukaea.uk/wp-content/uploads/1-S2-0-S0010465525001778-MAIN.PDF)

## Operator and entropy interpretation

Writing `U(g)=(I−ĝĝ)/|g|` and
`Γab=Za² Zb² e⁴ lnΛ/(8π ε0²)`, the physical unlike-ion operator is

```
Cab = Γab/ma² ∇v·[(∇v∇v Gb)∇v fa − 2(ma/mb) fa ∇v Hb],
Hb = ∫ fb(v')/|v−v'| d³v',   Gb = ∫ fb(v')|v−v'| d³v'.
```

The pinned source's mass factor and species-reference prefactors agree with
this normalization for the common velocity/density reference used here:
[weak assembly and mass factor](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L2755),
[G/H factors](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L3423).
The single supplied Coulomb logarithm is included in the external SI collision
normalization; it must not be multiplied into those factors a second time.

For positive distributions with vanishing boundary flux, put
`Aa=∇ln(fa)/ma`. Pair symmetry gives

```
−dH/dt = (1/2) Σab Γab ∬ fa fb (Aa−Ab)·U(v−v')·(Aa−Ab) d³v d³v' ≥ 0.
```

A common-temperature, common-flow Maxwellian has `Aa−Ab` parallel to `v−v'`,
which lies in the nullspace of U. Its continuous collision operator is zero.
The nodal polynomial interpolation of that Maxwellian is a different function;
it need not be a discrete equilibrium or nonnegative. Even nominally identical
temperatures have slightly different measured polynomial moments, so the
prospective moment-matched initializer is an essential control.

With `fa=(nref/cref³)(n0a/c0a³) Fa`, the independently used entropy convention is

```
H/nref = Σa n0a ∫ Fa log(Fa n0a/c0a³) 2πr dr dz.
```

For a raw discrete operator with nonzero density residual, differentiating this
expression requires the `+1` in `(log F + 1) C`; changing the logarithm's fixed
reference adds a density-production term. The package separately records
positive-part, signed-log-absolute and epsilon-log-absolute extensions. None is
physical entropy when the represented distribution is negative. Physical H is
withheld for both initial and final baseline states. Absence of sampled
negativity would still not certify positivity everywhere.

The [operator conservation projection](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L3846)
and [end-step projection](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L3942)
constrain moments; they do not establish positivity, H monotonicity or a
Maxwellian nullspace. The baseline's natural boundary condition drops the outer
weak collision-flux term; it is not a prescribed zero PDF at the finite boundary.
Rosenbluth potentials additionally use finite-domain boundary approximations.
Domain and projection controls therefore address different error sources.

The reconstructed backward-Euler residual uses the upstream actual condition
`onEnd && onC` for operator correction. Stored nonlinear success is a weighted
RMS criterion, not a requirement that every residual entry be below `atol`.
Returned postprojection residuals are recomputed independently from actual
arrays, rather than inferred from successful Newton flags.

## Appropriate remedies and unresolved attribution

The smallest justified immediate remedy is to expose represented-distribution
negativity and withhold physical-entropy acceptance, then choose h/p/domain and
solver settings using the bounded causal controls. Merely tightening Newton
tolerance cannot remove a defect already present in the initial representation.
Replacing numerical potentials with analytic Maxwellian potentials leaves a
comparable initial collision residual; analytic potentials alone cannot make
the polynomial input into an exact Maxwellian.

Clipping would alter the original distribution, conservation and collision
balance; it has not been adopted. Subtracting a sampled equilibrium residual
would define a different nonlinear operator and is not justified by these
measurements. A method designed to balance discrete Maxwellian fluxes is a
specific alternative to study, rather than an arbitrary residual subtraction.
[Taitano, Chacón and Simakov, JCP 339 (2017) 453–460](https://doi.org/10.1016/j.jcp.2017.03.032)
Methods with positivity and a discrete H theorem require structural changes to
the represented variable/operator/time integrator and a separate qualification;
their properties cannot be imported by package choice.
[Hirvijoki, Burby and Kraus (2018)](https://arxiv.org/abs/1804.08546)

## Longer-history evidence

The separate 60 s-per-case history attempt completed ten advances and retained
72 successful advances of its intended 100-step second run before the resource
watchdog stopped it. Its missing 100 μs checkpoint remained unknown. The
separately prospective, parent-authorized 180 s completion attempt preserved
that cutoff and ran a fresh 100-step case; it completed in 92.98 s with no
resource cutoff and all 100 Newton returns true. No numerical setting changed.

The independent audit checked all retained history Booleans, full checkpoint
identities and the producer's complete manifest inventory. Both fresh 10 μs
checkpoints match the frozen completed ten-step case bitwise. The retained
`previous_pdf` permits an independent backward-Euler residual check even for
sparse checkpoints: the 100 μs returned residual maximum is `3.05904463e-11`.
The dense moment integrals again agree with upstream values to about `1e-13`.
This verifies the numerical trajectory and retained evidence, not its physical
equilibrium validity.

| Horizon | Species-1 L1 drift | Species-2 L1 drift |
|---|---:|---:|
| 1 μs | 7.64e-6 | 2.85e-5 |
| 10 μs | 2.67e-5 | 1.54e-4 |
| 100 μs | 3.21e-5 | 2.47e-4 |

These are independently reconstructed order-24 FE norms divided by fixed
initial species number. They differ from the producer's nodal-weighted L1
norms. At 100 μs the heavy species' reconstructed minimum is about `−1.56e-6`,
compared with nodal minimum `−2.78e-8`; negative-number/energy fractions are
approximately `1.19e-6`/`1.16e-5`. Order 16 gives about 1.5% larger negative
fractions. Additional orders 32/48 give heavy negative-number fractions
`[1.1781,1.1647]e-6` and energy fractions `[1.1517,1.1392]e-5`; the magnitudes
remain descriptive, with approximately 1.1% final refinement change. The
order-48 heavy minimum is `−1.6245e-6`, with an exactly negative rational sign
for the serialized polynomial at that sampled point. Physical entropy remains
undefined for the represented distribution. Preserved density and total energy
do not prevent distribution-level drift away from the initial equilibrium
reference. No h/p/timestep refinement study has been run to 100 μs; the short
controls cannot qualify this longer trajectory's accuracy.

## Reproducibility status

Sixteen independent regression tests pass in the explicitly synced review VM,
including positive-nodes/negative-between-nodes, the actual first radial Radau
space, cylindrical moments, reference scaling, density terms in entropy rates,
stale source/case identity, failed Newton history, artifact mutation and exact
rational sign of a positive-node/negative-interior polynomial. All twelve cases'
full arrays have been checked at orders 8/12/16 and 24. Baseline/fine/p6 selected
negative-region integrals have also been checked at orders 32/48. Explicit
exports preserve evidence before each sync. The completed 10/100 μs checkpoint
and retained interrupted-history audits are separate; no full equilibrium or
physical-entropy qualification is claimed.

The final review package was explicitly exported to
`/tmp/mass-spinner-julia-equilibrium-independent-v13-final-20261106` and copied
back only after inspection. Recursive host/export byte comparison, excluding
Python bytecode caches, reported no differences. The 112-file source/result
inventory is `scientific/julia-equilibrium-review-v13/review-manifest.json`,
SHA256 `4a78754e647094ceb215d873c3e97a4f7a8ce587a0e7b786a335d9c1234c82da`.
Key stable results are:

- `all-cases-review.json`: order 8/12/16, SHA256
  `dbd1e29d096a5c6b3286d5c8d22bc5749aed1dcd98e9656d3ab759b61131afc1`.
- `all-cases-q24-review.json`: order 24, SHA256
  `f8db186e68dc1bab38b86a1135091631d8c08ae96d7c9e9176468e15f8bdde49`.
- `history-complete-review.json`: independent 100-step evidence review,
  SHA256 `35bb96e125d620e18b01a1685f0d42809b0e4da0db205533faff3a9af7b53e37`.

The exact executed checks were `python3 -m unittest -v test_diagnostics.py`
(16 passed); `audit.py inputs` with the frozen source/plan hashes and orders
8/12/16 then 24 (all twelve cases, sixteen successful advances);
`control_compare.py --order 24` (full-field controls);
`history_review.py --cases history10 history100 --orders 16 24` and
`--cases history_complete100 --orders 16 24`; and `witness.py` for baseline,
fine/p6 and the 100 μs endpoint at the orders described above. All scientific
commands ran offline inside `safe-dev-ce94fe8e9589147c` after explicit sync.
No production collision operator, solver dependency or v12 evidence was edited.
