# General 3V collision evolution: source and implementation-choice review

7 November 2026 UTC. This independent review covers source reuse, method choice
and qualification boundaries. No numerical solver, dependency installation,
author executable or scientific calculation was executed for this source review.
One trusted standard-library metadata/source downloader ran online in its own
safe-dev VM; downloaded author code was read but never imported or executed.
Host work is trusted source reading/editing and actual-byte SHA256 inspection;
primary literature and upstream documentation were reopened through web tools.
Actual numerical acceptance belongs to the separate mathematics and finite-time
reviewers. Existing closed v14/v16 packages remain unchanged.

## Traced bottleneck and choice

The v14 path is `advance → discrete_gradient → entropy / entropy_increment →
mobility`, repeated inside every Newton–Krylov residual. Its global Cartesian
entropy integration costs O(N q³), where N is the actual 3V marker count and q
is the one-axis integration order. Pair mobility separately costs O(N²).
In simple terms, every implicit trial evaluates the full integration box against
every marker. The v16 exact angular reduction removes this cost only for a
rotationally invariant distribution; it cannot describe relative drift or
anisotropic pressure. Reusing that closure would remove the requested physics.

A coherent next change is particle-centered Gaussian cubature of the same
type-I smooth-mixture entropy. Let each species have positive fixed weights,
fixed variance ε, and Gaussian cubature offsets ξa/weights ωa:

    F(x) = Σj wj Kε(x − vj)
    Hd(v) = Σi,a wi ωa log F(vi + √ε ξa).

This approximates ∫F logF over full velocity space using O(N²p) direct work,
where p is the number of 3V cubature nodes per marker. It evolves arbitrary
point velocities in three dimensions. It does not impose radial symmetry,
coordinate independence, a Maxwellian closure or a fitted pressure relaxation
law. It removes the separate global-box quadrature, but not the 3V marker
resolution requirement or O(N²) interactions. A measured cost pilot is required;
there is no established same-accuracy speedup ratio yet.

## The finite-rule derivative is a real method boundary

The following derivative is this review's algebra for the proposed finite
functional, not a claim that an upstream code already implements this adapter.
For one species define

    zij = vi + √ε ξa − vj
    ρij = wj Kε(zij) / F(vi + √ε ξa)
    tij = wi ωa ρij zij / ε.

Scatter `Gj += tij; Gi -= tij` for every i,j,a. This differentiates both the
moving quadrature location and every mixture center. Their sum is translation
invariant; the i=j terms cancel. Dropping the center term because a related
full-space integral vanishes would differentiate a different finite functional.
Momentum/energy tests alone would not expose that error, because the collision
metric has its own null spaces regardless of the entropy-gradient accuracy.

For a step with Δvi, the kernel log increment uses Δzij = Δvi−Δvj:

    ΔlogK = −[zij·Δzij + |Δzij|²/2] / ε.

The outer wiωa are fixed, so ΔHd is their weighted sum of stable mixture-log
increments. An Eulerian `F logF` increment formula is not the formula for these
moving expectation nodes. Endpoint subtraction loses nearly stationary changes;
forming enormous component growth factors before weighting can overflow. Both
failure patterns already have preserved v16 regressions.

The unlike-mass Coulomb pair metric and a compatible weighted Gonzalez gradient
can give exact discrete conservation identities and nonincreasing Hd when the
implicit root is adequately solved. That statement concerns the actual finite
functional only. Independent physical H integration and full-PDF refinement must
still pass; a positive cubature rule is not a physical-H accuracy certificate.

## Physical boundaries and required controls

- Keep `m_s ε_s` common across species, and export both marker and smooth
  kinetic energies. [Carrillo–Hu–Van Fleet, Corollary 2.4](https://arxiv.org/html/2310.16143v1)
  establishes the common-temperature condition for the regularized continuum
  equilibrium. It does not make a finite mixture an exact Maxwellian or prove
  that a finite-ε collision rate is unregularized Coulomb physics.
- A common Galilean boost should leave the relative-coordinate entropy and
  collision accelerations unchanged. For different species drifts, total bulk
  kinetic energy can become thermal energy; internal energy alone is not the
  conserved quantity. Audit center-of-mass velocity and the full pressure tensor,
  including off-diagonal entries, independently of scalar temperature.
- A Cartesian Gaussian rule has only its finite node-set symmetries. Rotating
  markers and offsets together checks algebraic covariance, whereas rotating
  the physical state under fixed laboratory offsets checks orientation error.
  Both are useful and must not be conflated. Rotation sensitivity requires its
  own quadrature refinement.
- The Coulomb metric is `(I−zzᵀ/|z|²)/|z|`. Coincident point-marker handling must
  be declared, and near-coincident pairs must be tested. Setting Q(0)=0 is a
  finite-particle convention, not a derived physical collision cutoff. No
  unreported softening, minimum separation, velocity clipping or rate fitting.
- Full 3V entropy and L1 distribution gates cannot be replaced by matching
  marginal plots, temperatures or low-order moments. Narrowing ε at fixed N can
  worsen the PDF even if rates appear accurate. Particle spacing, width,
  cubature order and timestep require separately identifiable studies; missing
  or underresolved controls remain unknown and resolved coarse failures remain.

## Reuse and alternatives checked

| Route | Primary source checked | Decision for this increment |
| --- | --- | --- |
| Existing generic Julia JFNK | Pinned source and MIT license below | Reuse unchanged; it solves roots and supplies no collision-physics validation. |
| Type-I multispecies Gaussian particles | [Published multispecies construction](https://arxiv.org/html/2310.16143v1) | Closest physical starting point; moving finite cubature and weighted discrete gradient are explicitly new adapter choices. |
| Published discrete-gradient particle examples | [Hu–Van Fleet paper](https://arxiv.org/abs/2407.00533), [author MATLAB repository](https://github.com/sqvanfleet/aggdiff_landau_particle_method_discg) | Useful algorithm/reference examples. A redistribution license and a pinned ready full3V unlike-ion implementation were not established; no bodies imported. |
| Local Gaussian entropy cubature | [Hirvijoki, EPS 2021](https://info.fusion.ciemat.es/OCS/eps2021pap/pdf/P1.1080.pdf) | Prior 2V implementation uses local 6×6 GH at each marker and GPU Numba. Code is offered upon request; no license/source import established. Local GH itself is prior art; our unlike-ion finite-rule adapter still needs qualification. |
| O(N) stochastic spherical Brownian pairs | [Du et al.](https://arxiv.org/html/2501.00263v1), [MIT author source](https://github.com/fishwithsheep/SBM/tree/4fdd41ffcab14be87d6206a1ae6c339878b0a33a) | Useful licensed starting point for a separate high-N stochastic reference. Equal-mass updates, singular-pair skipping and sampler qualification prevent using the shipped example as an unmodified unlike-ion Coulomb oracle; details below. |
| PETSc metriplectic/discrete gradient | [Finn et al. 2026](https://arxiv.org/html/2602.13068v1), [TSDISCGRAD](https://petsc.org/release/manualpages/TS/TSDISCGRAD/) | Relevant mature nonlinear infrastructure, not a demonstrated drop-in drifted/anisotropic unequal-ion reference; source/benchmark limitations below. |
| Tree acceleration | [Carrillo–Hu–Wang–Wu, Appendix B](https://arxiv.org/html/1910.03080v2) | Addresses Gaussian, derivative and tensor sums, rather than pairs alone. A future acceleration must preserve the variational adjoint and PSD/invariant identities or explicitly requalify their errors. |
| PETSc LANDAU | [Official API](https://petsc.org/release/manualpages/LANDAU/), [actual 2V/3V example](https://petsc.org/release/src/ts/utils/dmplexlandau/tutorials/ex2.c.html) | Strong independent finite-element comparison. Prior project PDF/positivity/entropy failures are not resolved by calling it an established solver. No additional PETSc run occurred here. |
| NUFFT | [Official FINUFFT interface/license](https://finufft.readthedocs.io/en/latest/) | A transform primitive with CPU/GPU and Julia support, not a drop-in positive Coulomb integrator. Periodic truncation, adjoints and approximate metric conservation require separate work. |

The original particle paper's 3V Coulomb example uses large particle sets and
tree acceleration; its discussion reports remaining long-time resolution error.
Its Maxwell-molecule exact BKW tests do not supply an exact Coulomb drift or
anisotropy solution. A code that reproduces BKW is a useful control, not a
replacement for the physical Coulomb rates and finite-time convergence requested
here. Licensed full3V software does exist. The bounded search did not establish
a ready replacement meeting all of this increment's unequal-ion, physical-rate,
positive-PDF and deterministic discrete-entropy gates. That is a qualification
finding, not a claim that no such software exists.

## Additional author-code qualification

[Du et al., Proposition 2.2](https://arxiv.org/html/2501.00263v1) concerns entropy
of the normalized joint N-particle probability law. Their Section 5 KDE entropy
is an approximate diagnostic under approximately independent sampling. Neither
statement guarantees monotone KDE H along every finite stochastic realization.
The exact-in-time statement concerns paired finite-particle dynamics, not an
exact Landau-PDE solution at finite N and pairing interval. A stochastic reference
needs seeded ensembles, confidence intervals and joint N/timestep convergence;
it cannot silently inherit the deterministic pathwise entropy acceptance gate.

The actual MIT author repository is pinned to commit
`4fdd41ffcab14be87d6206a1ae6c339878b0a33a`. Source inspection found:

- [3V Coulomb example](https://raw.githubusercontent.com/fishwithsheep/SBM/4fdd41ffcab14be87d6206a1ae6c339878b0a33a/src/SBM_3d_Coulomb.py),
  lines 173–188, skips pairs with relative speed ≤0.25 to avoid overflow.
  This changes the Coulomb dynamics and requires removal plus numerical repair
  and a cutoff-convergence control before scientific reference use. Its equal
  and opposite velocity increments also assume equal masses/weights.
- [Shared sampler](https://raw.githubusercontent.com/fishwithsheep/SBM/4fdd41ffcab14be87d6206a1ae6c339878b0a33a/src/function.py),
  lines 179–185, samples the auxiliary count with a rounded normal draw. Its
  equivalence to the exact spherical Brownian sampling law is not established
  by this code. Lines 189–190 divide by the Householder-vector norm, which is
  zero for input at the reference pole. Both require qualification/regressions.
- Diagnostics reconstruct on a finite Cartesian grid and truncate Gaussian
  contributions by a distance threshold. Their plotting output is not our
  independently resolved full-space entropy or PDF gate.

The appropriate next use is a separately reviewed, mass-weighted pair adaptation
with a robust qualified sampler and ensemble diagnostics. This would be useful
for high-N drift/pressure comparisons, but is broader than a drop-in backend
swap. No author code was installed or executed in this review.

[Finn et al.](https://arxiv.org/html/2602.13068v1) demonstrates an equal-mass
electron/positron relaxation example and explicitly leaves two-species
isotropization and Spitzer resistivity to future work. It reports nonlinear
convergence loss and near-equilibrium entropy fluctuations in sparse-particle
runs. It does not settle our unlike-ion anisotropy convergence question. The
paper's referenced example path exists in released
[PETSc v3.26.1 source](https://raw.githubusercontent.com/petsc/petsc/v3.26.1/src/ts/tutorials/hamiltonian/ex2.c),
but the inspected file has no `collision` or `entropy` text and its help describes
Vlasov–Poisson Landau damping/two-stream cases. Thus that released path alone is
not evidence that the paper's full collisional implementation is available.

## Future entropy interval proposal: Cartesian common-temperature controls

This is a source-only mathematical proposal, not implemented or used to replace
the frozen main audit. For one species write p=F/N. If the actual initial centers
form a Cartesian product with one common isotropic kernel variance, the product
of the initial normalized marginals is a Gaussian mixture q0 with product latent
weights r. For arbitrary evolved centers and unchanged positive weights w,

    0 ≤ I(p_t) = KL(p_t || q0) − Σ_j KL(p_tj || p0j)
      ≤ KL(w/N || r) + Σ_i (w_i/N)|v_i(t)−v_i(0)|²/(2ε).

The upper inequality follows from the log-sum inequality applied to matching
Gaussian components. Exact-rational χ² bounds the discrete KL, including every
Cartesian cell. Consequently full joint H lies between the sum of the three
unnormalized marginal entropies minus 2N log N and that quantity plus N times
the bound. This retains arbitrary correlations as an interval; it does not
assume the evolved distribution factorizes. A future fast path could omit joint
cubature only when this interval plus marginal/tail/numerical error fits the
original per-number entropy-integration budget, 2e-10, not just the 1e-8 H-change
budget. Entropy differences require both endpoint intervals. Actual Cartesian
membership, normalized weights, displacement enclosures and unchanged kernel
variance must be checked; initially restrict to identity-basis common/boost
controls. General rotations need additional covariance/map allowances.

The separate closed common-cost probe evaluated the existing physical-entropy
function at 50 µs: q5/q9 took 43.90 s and estimated per-number sensitivity
3.73e-13. Its proposed displacement bound at 500 µs is approximately 3.36e-8,
above the unchanged 2e-10 integration budget. The inequality remains valid, but
this candidate does not justify skipping that cubature or changing current
gates. No shortcut was adopted.

## Exact reused source identity

### Concrete fast-summation follow-up

After the actual 3V shape/rate failures, a targeted search found existing
libraries addressing the demonstrated large-N cost. These are candidates for a
separate benchmarked increment, not additional dependencies in the v17 backend.

- [Flatiron FGT](https://github.com/flatironinstitute/fgt/tree/8fb3a884203a4aceed7c3bb3d1889c1fcf285c64)
  implements discrete Gaussian transforms for 2D/3D source and target points,
  including potential/gradient interfaces and OpenMP. Its
  [method paper](https://arxiv.org/abs/2305.07165) is Greengard–Jiang–Rachh–Wang,
  SIAM Review 2024. Pinned commit is
  `8fb3a884203a4aceed7c3bb3d1889c1fcf285c64`; actual GPL-3.0 license SHA256
  `3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986`.
  This is GPL-3.0, not permissive MIT. No linking or redistribution integration
  has been performed. Its README kernel is exp(−r²/δ), requiring δ=2ε plus our
  Gaussian normalization, and consistent coordinate/gradient rescaling.
- [FMM3D](https://github.com/flatironinstitute/FMM3D/tree/cad293ae9b8ae1218dd8319d459ffcc5f1412875)
  provides Laplace and Stokes transforms, including direct controls. Pinned
  commit `cad293ae9b8ae1218dd8319d459ffcc5f1412875`; actual Apache-2.0 license
  SHA256 `80ca999e0a3de255930a5bf17771bdcadf0e0ac2835b93ddc418a639f0d5ea4c`.
  [Documented conventions](https://fmm3d.readthedocs.io/en/latest/python.html)
  are L=1/(4πr), S=(I/r+zzᵀ/r³)/(8π), giving Q=8π(LI−S). This is an algebraic
  decomposition, not a proved structure-preserving accelerated collision metric.
  [Its numerical convention](https://fmm3d.readthedocs.io/en/latest/math.html)
  drops source/target separations at or below boxSide·2⁻⁵²; matching our exact
  coincidence convention and resolving nearby pairs requires explicit work.

Prioritize the Gaussian entropy forward/adjoint sums while keeping direct
pair mobility exact. O(N²p) entropy is the larger target and this avoids
introducing approximate metric symmetry/null-space/PSD errors immediately.
The forward density/gradient and reverse source-gradient operations must match
the moving-node derivative and preserve the actual finite entropy chain rule.
Requested transform tolerance does not automatically bound relative density or
log-score error in tails: use owner-component lower bounds and qualified direct
near/tail handling, then test against the existing direct implementation.
Do not substitute a density floor. First require cost crossover measurements,
same-state density/gradient/increment refinement, positive density, finite-H
derivative checks, independent physical-rate controls and unchanged conservation
gates. No speedup, practical large-N limit or physical convergence is established
by this source finding alone.

The trusted text-only probe `scientific/general3d-tools-v17/inspect_fastsum.py`
ran online in the same separate review VM after a 197-file, 9.0 MiB explicit
source sync. No author routine was executed, compiled or installed. Actual
source/license bytes and manifest were exported to
`/tmp/general3d-tools-v17-fastsum-source-export/fastsum-inspection/`.

Only the generic solver is reused unchanged from
`JuliaPlasma/CollisionOperators.jl` commit
`9874021c9edf030fdaa1f62e28c450d63acc361c`:

- [Pinned solver](https://raw.githubusercontent.com/JuliaPlasma/CollisionOperators.jl/9874021c9edf030fdaa1f62e28c450d63acc361c/newton_krylov.jl):
  SHA256 `71b5530488703f29d113ec57acc778a9910f0d4df01582484043934a2cbec347`.
- [Pinned MIT license](https://raw.githubusercontent.com/JuliaPlasma/CollisionOperators.jl/9874021c9edf030fdaa1f62e28c450d63acc361c/LICENSE.md):
  SHA256 `3c178022e838d0a8e26874fe5c49902f2a06c772b41ae2a96c131a60e47184e3`.

Actual local vendor bytes were hashed in this review and match those identities.
The source describes a generic matrix-free Newton–Krylov residual solver; this
does not establish the new entropy quadrature, Gaussian initialization, pair
normalization or scientific accuracy. No new dependency was installed here.

The separate public-source probe is
`scientific/general3d-tools-v17/inspect_upstream.py`. It downloaded bounded text
files only using Python's standard library. Exact command:

    safe-dev -C <root>/scientific/general3d-tools-v17 run --online -- python3 inspect_upstream.py

The guest was initialized after this one-file source snapshot; no subsequent
host edits preceded the run. Exported bytes and the complete manifest are in
`scientific/general3d-tools-v17-source-review/upstream-inspection/`.
No `.npy` data or author executable was run. Actual exported SHA256 checks:

- SBM MIT license: `6cef898c93500c973f880c8a084bd3ed565a736e1c5f7fcd00f3926b430489bb`.
- `src/SBM_3d_Coulomb.py`: `db8b141d13f4604eda3c4a7cea55a820c2146513ce5a35b41d3cfe4d677287bf`.
- `src/function.py`: `3a7a1565e578fab6954d6776c1a1539741c2a4ea6aa192d27f60b9e0d66ebb1b`.

## Implementation source pass

Read the initial new `core.jl`, `initialization.jl` and `test_core.jl` directly.
The full moving-center/node derivative, fixed-outer-weight entropy increment,
unlike-mass pair factors and weighted Gonzalez contraction are consistent with
the proposed finite functional on this read. Initial smooth pressure correctly
adds the Gaussian variance; the marker covariance subtracts it. Tests distinguish
joint node/state rotation covariance from fixed-laboratory-rule sensitivity.
This is an algebra/source finding, not a numerical test result. A near-coincident
pair stress sweep and quantified fixed-rule orientation refinement were sent to
the implementing agent as required additional controls.

Source snapshot inspected (these may differ from the final validated snapshot):

- `core.jl`: `d529e6a9427ec05c656eb96c8f191bb6d0ef47bbb334d5a22b9db4313952ea16`.
- `initialization.jl`: `7698256c9b5f7417181e8f1222e8a8ed8b5c8532b6b96baae0ae4119c5f3b6d9`.
- `test_core.jl`: `54b00b8c347639569206b0bbb2f11c54db0600ddea22a8d1d335ef2f43557b56`.

## Review status

The recommendations above preceded the implementation campaign. Final source,
actual closed evidence and reporting review is now in
[the independent review summary](GENERAL3D-REVIEW-SUMMARY-V17.md). This reviewer
checked all 250 producer, 298 PDF/symmetry and 1322 final independent-audit
members in its own offline safe-dev guest, plus complete planned membership,
case identities and reported comparison arithmetic. The final producer core is
`76b575768e85a946267ff866ff2c027b8886e1a49d14bf0adb40d4c2382bafaf`;
initialization is
`6366d59e95c52fc68c4eeadd6fbbcd3fa421d4802158fc5cad2ad085368fd0bf`.
The earlier source snapshots remain labeled above rather than being relabeled
as the final implementation. All 17 histories complete, but physical-rate,
full-PDF and fixed-lab rotation failures remain. Two physical-H engineering
budget passes permit small positive H estimates; 15 case H decisions are
unresolved. General3V physical production qualification is withheld.
