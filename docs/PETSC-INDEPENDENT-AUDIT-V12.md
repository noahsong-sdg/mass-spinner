# Independent PETSc two-ion physics audit

7 November 2026 UTC. This reviewer did not implement the PETSc adaptation.
Review covers the pinned source, independently derived normalization, adapter and
all eight independently checked solver artifacts, including fine-mesh, timestep,
domain and stationarity cases. These checks do not validate a separator or
establish cross-code distribution equivalence. Full acceptance remains UNKNOWN.

- **Executed independently:** all eight raw cases, 759 checkpoints and 1518
  species records pass source/config/log identity and dimensional/moment audits
  in a separate offline safe-dev VM.
- **Saved regression evidence inspected:** 16 tests passed in 5.729 s, including
  actual cached collision coefficients and unchanged upstream no-SI behavior.
- **Moment sensitivity:** the fine mesh, timestep and domain comparisons meet
  the prospective 0.05 eV budget at all three primary times; coarse mesh4 does not.
- **Separate physical-quality failures:** common-temperature sampled H increases
  by 8.85539e-8 against a 1e-8 budget; R8 samples negative-number fraction
  7.99445e-10 against a 1e-10 diagnostic budget. Both must remain visible.
- **Raw-field check completed:** eight integrity-verified FE fields independently
  reproduce the moments. Extra point sampling finds a tiny negative 84u tail at
  100 microseconds despite positive original quadrature/node samples. Exact FE
  positivity is disproved there; full physical H, cross-code distribution
  equivalence and rotating-separator validity remain unestablished.

Auditor sources and machine-readable main results are preserved in
[`scientific/petsc-review-v12`](../scientific/petsc-review-v12/README.md), with
input/output hashes, accepted field auditor/output and exact offline reproduction
commands.

## Problem, cause and adaptation boundary

The shipped setup reserves species zero for electrons, converts other masses in
proton-mass units, and derives scales before static collision data are cached.
Changing a mass afterward leaves inconsistent derived coefficients. In plain
terms, relabeling an already initialized electron does not turn it into an ion.

The reviewed design inserts an opt-in all-species SI initialization before those
dependent operations. The original branch remains unchanged without the option.
This is preferable to a dummy electron or post-setup mutation because it preserves
the established collision kernel while changing the actual problem definition.
The new driver must also replace ex1's anisotropic initialization and its
electron-specific NRL comparator. [Pinned setup](https://github.com/petsc/petsc/blob/v3.26.1/src/ts/utils/dmplexlandau/plexland.c),
[pinned example](https://github.com/petsc/petsc/blob/v3.26.1/src/ts/utils/dmplexlandau/tutorials/ex1.c).

## Independent operator and normalization derivation

Let f_s(v) have integral n_s, and define

```
Gamma_ab = q_a^2 q_b^2 lnLambda_ab / (8 pi epsilon0^2)
U(g) = (I - g g^T/|g|^2) / |g|
C_ab = Gamma_ab/m_a div_v integral U(v-v') [f_b/m_a grad_v f_a
                                          - f_a/m_b grad_v' f_b] dv'
```

This agrees with the physical operator in the PETSc method paper. Its mathematical
symmetry yields number conservation per species and total momentum/energy
conservation, but a discretization still requires numerical checks.
[Method, equation 1](https://arxiv.org/html/2209.03228v4#S2.E1).

Use F_s(v_hat)=v0^3 f_s(v0 v_hat)/n0, v_hat=v/v0 and tau=t/t0.
The dimensionless diffusion and friction multipliers respectively must be

```
D_ab = Gamma_ab t0 n0 / (m_a^2 v0^3)
K_ab = Gamma_ab t0 n0 / (m_a m_b v0^3)
integral F_b d^3v_hat = n_b/n0
```

In the inspected assembly, these arise from alpha_a beta_b lnLambda times the
test-species or field-species inverse mass. Species density remains in the
distribution integral. It must not be multiplied into the coefficient again.
The kernel's residual sign differs from the physical right-hand side; changing
that sign in the adapter would be an error. Axisymmetric moments require the
three-dimensional velocity measure 2 pi v_perp dv_perp dv_parallel.
[Tensor source](https://github.com/petsc/petsc/blob/v3.26.1/src/ts/utils/dmplexlandau/land_tensors.h).

For +e, 40u/84u, n0=5e17/m3, lnLambda=12, T40=2 eV:

| Quantity | Independent value |
| --- | --- |
| m40 | 6.6421562664e-26 kg |
| m84 | 1.394852815944e-25 kg |
| e | 1.602176634e-19 C |
| epsilon0 | 8.8541878128e-12 F/m |
| Gamma | 4.013151005517349e-54 in SI |
| Reduced mass | 4.49952521272258e-26 kg |
| v0=sqrt(2e/m40) | 2196.4213183796646 m/s |
| t0=m40^2 v0^3/(Gamma n0) | 2.3297516212599038e-5 s |

For this normalization, ordered rows/columns are 40u,84u:

```
D = [[1,                 1],
     [0.2267573696145125,0.2267573696145125]]
K = [[1,                 0.4761904761904762],
     [0.4761904761904762,0.2267573696145125]]
```

These are operator multipliers, not standalone relaxation frequencies. Physical
time is tau*t0. Using a normalized timestep as seconds creates an error of about
42923 in this case. Exact eV input requires k*T_kelvin=e*T_eV, consistently with
the chosen constants; changing just the displayed unit is insufficient.

### Initial Maxwellian energy exchange: an independent acceptance target

For zero-drift isotropic Maxwellians let S=T_a/m_a+T_b/m_b, with T in joules.
The conditional Gaussian velocity variance at fixed relative velocity is
(T_a/m_a)(T_b/m_b)/S. Because U annihilates relative velocity and Tr(U)=2/|g|,
the energy weak form reduces to a Gaussian mean of 1/|g|, which equals
sqrt(2/pi)/sqrt(S). Therefore

```
dT_a/dt = (4/3) sqrt(2/pi) Gamma_ab n_b (T_b-T_a)
           / [m_a m_b (T_a/m_a+T_b/m_b)^(3/2)]
```

For the declared 2/10 eV equal-density case the initial slopes are
**+27982.1633001 eV/s** for 40u and **-27982.1633001 eV/s** for 84u. The
temperature-difference coefficient is 3497.77041251/s. The formula is exact at
the initial Maxwellians; evolving distributions need not remain Maxwellian, so
integrating this two-temperature closure is not an exact finite-time reference.

The common-temperature, common-drift Maxwellian is stationary in the continuum
operator. The nominal unequal-temperature case tends toward 6 eV for equal
densities and zero bulk drift, if the full system equilibrates without loss.
A finite particle realization or finite-element projection has its own actual
initial inventories and energy; its corresponding equilibrium must be computed
from those measured values rather than forced to exactly 6 eV.

### Velocity-domain sensitivity

The cold species heats, widening its velocity distribution. A cylinder bounded
at five times its initial 2 eV component width reaches only 2.887 component widths
at 6 eV. Independent analytic Gaussian truncation gives:

| Cylinder radius / initial 40u sigma | Radius / final 6 eV sigma | Captured Maxwellian mass | Conditional T / true T |
| --- | --- | --- | --- |
| 5 | 2.88675 | 0.98066408 | 0.94430571 |
| 7 | 4.04145 | 0.99966293 | 0.99814830 |
| 9 | 5.19615 | 0.99999843 | 0.99998577 |

These are illustrative infinite-Maxwellian integrals truncated to
0<=v_perp<=R and -R<=v_parallel<=R, not measured PETSc errors. A finite-domain
conservative solution can differ from the simple truncated Maxwellian, but
conservation does not remove the need for a domain study. Increase domain while
controlling mesh spacing, and report actual SI extents and initial projected
moments. Improving one source of error while coarsening the other confounds the
diagnosis.

### Relation to the production particle operator

For reduced mass mu, the TA small-angle variance is
Var(delta)=Gamma_ab*n*dt/(mu^2 |g|^3). Species a receives the velocity share mu/m_a.
Consequently its infinitesimal transverse covariance and mean increment are

```
Cov(dv_a) = 2 Gamma_ab n dt/(m_a^2 |g|) (I-g_hat g_hat^T)
E[dv_a]   = -2 Gamma_ab n dt/(m_a mu |g|^3) g
```

The reduced mass cancels from diffusion and appears in the sum of test/field
friction contributions, matching the uncapped Landau generator. This is an
algebraic matching check, not a finite-step or finite-particle convergence proof.

## Entropy and positivity are separate gates

The continuum H functional is sum integral f_s ln(f_s/f_star) d^3v and must not
increase under the closed Landau operator, for positive distributions and fixed
reference factors. PETSc's authors explicitly explain that moment-conserving
continuum finite elements do not guarantee monotonic entropy. The package name
and excellent energy residuals are insufficient evidence for this gate.
[PETSc authors' discussion](https://arxiv.org/html/2306.12606v1#S1).

The reviewed draft exports a positive-part entropy diagnostic and flags whether
negative values were sampled. This is honest only if that diagnostic is never
presented as full physical entropy when negativity exists. Nodal minima alone
do not certify high-order finite-element positivity; quadrature minima and
negative integrated mass help quantify violations but remain sampled evidence.
No clipping, density renormalization or entropy repair should occur silently.

## Scope of independent execution

A separate one-file Python standard-library calculation ran offline in Apple
safe-dev guest `safe-dev-78a8095f96a5ee6c`, from copied directory
`/tmp/mass-spinner-petsc-independent-v12`. Command:

```
safe-dev -C /tmp/mass-spinner-petsc-independent-v12 run -- python3 audit_normalization.py
```

Exit 0; seven independent normalization/equilibrium sanity assertions passed.
The source was explicitly synced and rerun after adding the finite-cylinder
calculation; final script SHA256 is
`867b88793371251a479c73c3c5f3f7538be208bac9bc739d13b9daf8d1af7879`.
The output supplies the numbers above. No host scientific execution or package
installation was used. This first calculation checks the derivation; the separate
compiled-artifact and raw-field checks below address initialized/evolved values.

## Draft implementation review and remaining evidence

The initial `twoion_setup.h`, `patch_setup.py`, `twoion.c` and `build_twoion.sh`
were read independently. Correct design choices observed: source-hash-checked
insertion before dependent setup, isotropic initialization, physical-time
conversion, density-weighted moments, positive-part entropy labeling and no
collision-kernel changes. The implementer received the required partial-option,
fixed-positive-log, normalization-grid, species/grid-layout and finite-time
domain checks. The completed source and actual cached coefficient probe have
since been reviewed, and all prospective dynamics cases and the saved 16-test
regression evidence are independently inspected below.

## Independent pilot artifact audit

The exported pilot at `/tmp/petsc-twoion-pilot-v12/results/twoion-v12` was read
independently, then its `slope.json` and `mesh4.json` were copied into this
reviewer's separate VM and checked offline with `audit_artifacts.py`. The script
recalculates reference scales and pair multipliers from SI inputs, tests physical
velocity extents, converts directional temperatures to total temperature, checks
the temperature/energy/bulk-flow identity and momentum-density identity, confirms
constant species inventories and enforces honest sampled-entropy flags. Exit 0.

The six source hashes in these artifacts match the reviewed host files exactly:
`twoion.c`, `twoion_setup.h`, `patch_setup.py`, `run_twoion.py`, the prospective
plan and dependency lock. The initialized masses, charges, temperatures, Coulomb
logarithms, v0/t0 and SI velocity extents agree with the independent calculation.
The reported pair matrix is recalculated from initialized context values; it is
not a direct read of the cached CPU alpha/beta/inverse-mass arrays. Its agreement,
the setup-before-cache source trace and initial-rate test are mutually consistent,
but do not mislabel it as an independently extracted cache diagnostic.

**Follow-on cache check:** the separate `probe_cached.c` now directly reads the
CPU SData alpha, beta, inverse-mass and lambda arrays used by assembly. Independent
source/output review of `results/twoion-v12/cached-coefficients.log` confirms all
four diffusion/friction pairs match the matrices above. This closes the earlier
cache-evidence qualification without changing the running physical driver. The
probe intentionally does not integrate time; unused solve/time options in its
log are expected and are not ignored physical-species inputs.

Observed pilot results:

- **Initial-rate case:** 12x24 cells, R=6 initial component widths, one 10 ns step.
  dT40/dt=+27969.0746615 eV/s; dT84/dt=-27969.0746636 eV/s, approximately
  **0.0468% below** the independent Maxwellian target. Maximum initial density
  error is 6.763e-5, initial temperature error 0.001748 eV and artificial initial
  directional-temperature difference 0.002621 eV. These pass the frozen
  projection/rate budgets. No negative nodes/quadrature values were sampled in
  these two checkpoints. Total-energy residual is 1.11e-16.
- **Coarse full-duration case:** 4x8 cells, R=6, 5 microsecond steps to 0.5 ms.
  Initial temperatures are 1.96565/9.82826 eV, not nominal 2/10 eV. Initial density
  error is 0.8597%, initial maximum temperature error 0.17174 eV and directional
  difference 0.28408 eV. The frozen initial-state budgets fail. Negative integrated
  number fraction reaches **1.7588%**; full entropy is unqualified. Energy still
  conserves to 1.23e-12. This is a clear example of conservation passing while
  representation quality fails; it is not an accepted physical reference.
- **Intermediate full-duration case:** 8x16 cells, otherwise the same problem.
  Initial temperatures are 1.99821374/9.99106868 eV. The maximum temperature error
  is 0.00893132 eV and directional difference 0.0133958 eV, both above the frozen
  0.005 eV limits. Final temperatures are 5.38091648/6.60836594 eV, with energy
  residual 7.49e-13. There are 109 species/checkpoint records with sampled negative
  values. At initialization coefficients are positive while quadrature samples
  are negative: direct evidence that nodal positivity does not imply positivity
  between nodes. This is also an unaccepted reference. The hot-species final
  temperature changes by 0.16200 eV from mesh4, but coarse initial-projection
  differences confound attribution solely to subsequent dynamics.

After explicitly copying `mesh8.json` and syncing the separate offline VM, the
independent algebraic audit was rerun over 204 time checkpoints (408 species
records) across these three cases. Exit 0: initialized normalization/extents,
directional/total temperature, energy/bulk-flow and momentum identities, constant
inventories and sampled entropy labels agree. These are algebraic checks on
exported moments, not a second reconstruction of the FE quadrature integrals.

## Completed prospective dynamics audit

All eight frozen cases were subsequently copied into the reviewer's separate
offline VM, together with their eight original logs and six source/plan/lock
files. An explicitly synced 34-file, 4.1 MiB snapshot was checked with
`audit_artifacts.py`, SHA256
`57918077cfd44916d83b87847cd31994f01bbe1e070b9ac874de95dedb8e07ae`.
Exit 0. The independent check covers 759 time checkpoints, 1518 species records,
every artifact's six frozen source digests, exact prospective configurations,
raw-log/JSON identity, dimensional scales, all four ordered collision pairs,
velocity extents, moment identities, inventories and honest entropy flags.
It does not import the implementation's parser or assessment module.

| Case | Final T40 / T84, eV | Largest sampled negative-number fraction |
| --- | --- | --- |
| mesh4, R6, dt5 microseconds | 5.34754491 / 6.44636978 | 0.0175879 |
| mesh8, R6, dt5 microseconds | 5.38091648 / 6.60836594 | 2.85812e-6 |
| mesh12, R6, dt5 microseconds | 5.38295622 / 6.61494653 | 0 |
| mesh12, R6, dt10 microseconds | 5.37496945 / 6.62293329 | 0 |
| mesh12, R6, dt2.5 microseconds | 5.38695964 / 6.61094311 | 0 |
| mesh16, R8, dt5 microseconds | 5.38483266 / 6.61307260 | 7.99445e-10 |
| common 5 eV, mesh12, R6 | 4.99845532 / 4.99979697 | 0 |

Every full-duration case reaches 0.5 ms. Across all cases, the largest relative
total-energy residual is 1.23e-12. The common-temperature control's largest
individual temperature drift from its actual projected initial state is
0.000673568 eV; its largest absolute directional anisotropy is 0.00131023 eV.
The R6 fine dynamics' maximum absolute anisotropy is about 0.00586417 eV and is
reported without inventing a new acceptance threshold after seeing the data.

Independent refinement differences were recomputed at all three prospective
times, 0.1, 0.25 and 0.5 ms, for both species:

| Comparison | Largest absolute temperature difference, eV | Frozen 0.05 eV moment budget |
| --- | --- | --- |
| mesh4 versus mesh8 | 0.196345 | FAIL |
| mesh8 versus mesh12 | 0.00794897 | PASS |
| dt10 versus dt5 microseconds | 0.0185911 | PASS |
| dt5 versus dt2.5 microseconds | 0.00951453 | PASS |
| R6 mesh12 versus R8 mesh16, matched spacing | 0.00187644 | PASS |

These are successful declared **moment-sensitivity checks**, not a proof of the
continuum distribution limit. The coarse grids fail initial-state/positivity
quality. The larger domain samples negative mass above its 1e-10 diagnostic
budget, so its full H functional is not qualified. Fine R6 runs sample no
negative values, but that is not a global positivity certificate. The accepted
budget is deliberately kept separate from global positivity, entropy and future
cross-code distribution acceptance; UNKNOWN remains appropriate.

One additional gate **fails**: independently recomputing the common-temperature
control's raw sampled-H history gives maximum relative step increase
8.855393033345266e-8, above the frozen 1e-8 entropy budget. No negative values are
sampled in that case, so this is a monotonicity diagnostic failure rather than an
undefined-entropy label. R6 unequal-temperature runs have sampled step increase
zero. The common-temperature moment drift passes its 0.05 eV budget; that does
not rescue the separate H check. The finite-element method does not promise an
H theorem, as the cited method discussion explains. No post-hoc entropy repair
or relaxed threshold was introduced.

The projected finite-element initial state has finite-grid errors and need not
be an exact Maxwellian even when initialized from the Maxwellian function.
Stationarity/rate comparisons must retain measured initial moments and refine
that representation. No repair or clipped distribution was applied.

This deterministic driver starts from a projected analytic Maxwellian. The
particle campaigns start from finite sampled velocity arrays, matched exactly
between their stochastic codes. Those are different initial representations;
matching the nominal 2/10 eV labels does not make their full initial distributions
identical. A PETSc-versus-particle comparison must retain both projection error
and sampling uncertainty, or define a separately audited common smooth initial
distribution. It must not pool a deterministic nominal curve as another particle
seed or interpret a single-seed offset as an operator defect.

The PETSc temperature objective is centered, while the particle campaign's
primary quantity is raw second moment. For this axisymmetric FE state,
`Traw=Tcentered+m*u_z^2/(3e)`; a particle realization instead needs its full
three-component bulk speed in that correction. These observable definitions
must also be matched before comparing curves.

All cases here are homogeneous, unforced, axisymmetric and initially isotropic
with zero relative bulk drift. Relative-drift friction and deliberately
anisotropic relaxation need their own controls. Even an accepted homogeneous
case would not validate radial/azimuthal transport, collector boundaries,
electrons or self-consistent fields in the rotating separator.

The compiled setup path now rejects missing/partial SI triples, nonfinite
physical times, nonpositive fixed logarithm/reference density, unsupported
normalization grids, shifted/forced cases and unsupported species/grid layouts.
These are physical contract checks, not attempts to hide integration failures.
All frozen domain/mesh/timestep cases and saved final regressions are now checked.

The final 12-test two-ion regression source was also inspected: it covers the real compiled
driver's invalid-input rejection, stale source/JSON, initial slope, actual cached
coefficients, negative-entropy handling, scheduler output/RSS failure modes and
five-step no-SI-option compatibility against the upstream binary. The latter
compares selected physical diagnostics, not timing/banner byte identity. Runtime
exit/count evidence was then inspected in `results/twoion-v12/test-output.log`:
**16 tests passed in 5.729 s**, comprising those 12 and four legacy diagnostic
parser tests. This includes the actual cached coefficient probe and unchanged
upstream five-step comparison. These checks were executed by the implementer in
the pinned safe-dev environment; this reviewer inspected source and saved output
and separately executed the independent artifact audit above.

The main eight-case artifacts contain moment/minimum/entropy diagnostics. The
separate accepted fine replay now adds native vectors and explicit per-cell
coefficients/basis/geometry, allowing independent reconstruction and integration
from raw FE data. This closes the previous reliance on printed moments for that
fine case. It does not compare velocity PDFs/CDFs with particle codes or establish
full cross-code distribution agreement.

### Separate raw-field export review

A separate export-only driver was reviewed without modifying the frozen
physical integration. Its Q2 closure-to-nodal bridge avoids assuming PETSc's
closure ordering, and its independent tensor-polynomial integration uses the
correct 2 pi r measure and dimensional moment factors. Native vector reload
checks coefficient roundtrip; explicit per-cell basis/geometry/closure export
permits independent reconstruction of the FE field. Neither operation alone is
a full distribution-equivalence test. Dense quadrature is necessary to assess
the nonlinear negative-part and entropy integrals near sign changes.

Independent source review identified a concrete optimized-build crash cause:
`PetscScalar *closure` and its input size were uninitialized before
`DMPlexVecGetClosure`. The API treats a non-NULL pointer as caller-owned storage;
it allocates a borrowed array only when `*values=NULL`. Stack garbage therefore
became a destination buffer. Initializing the pointer to NULL and size to zero
per cell is the direct fix, rather than changing the collision model or guessing
at DM reload behavior. Sanitized execution alone did not expose this issue.
The optimized reproduction was fixed; short-run original/export-off/export-on
checkpoint identities and the accepted full replay provide the regression
evidence. The final full replay's decoded setup and all 101 checkpoint records
equal the frozen main mesh12 data in this reviewer's independent comparison.
[Pinned API contract](https://petsc.org/release/manualpages/DMPlex/DMPlexVecGetClosure/).

The first full-field host export failed the independent integrity gate: both
0.25 ms JSON files were filled with NUL bytes despite ordinary file sizes. The
separate VM parser rejected them immediately. Six readable files or surviving
native vectors do not make that eight-field bundle acceptable. The cause of the
artifact corruption has not been established; it must not be attributed to a
physical instability or an unproven disk-pressure theory. A fresh identical
solver replay with a pre-exit durable manifest and post-export byte-hash and
field-reconstruction checks subsequently passed. The rejected first attempt is
retained separately. The eight main moment cases above have their own
independently verified JSON/log evidence and are unaffected.

The reviewer then staged the accepted bundle in a 60-file, 4.2 MiB copy in the
separate offline VM and ran `audit_fe_exact.py fields/fine`, exit 0. Its accepted
source SHA256 is
`0251791a769ca74ffc9103253e006439098a56b67ec9acca8d6711d62ae9f0ef`.
The auditor independently verifies all 30 producer-manifest sizes/digests,
requires exactly eight fields, checks setup and all 101 decoded numeric
checkpoints against main mesh12, verifies affine geometry at all nine reference
nodes and integrates the reconstructed Q2 polynomial with a fixed 3x3 Gauss
rule. That rule is exact for this affine-Q2 number/momentum/energy polynomial.
All dimensional density/energy ratios agree within 2e-11, temperatures within
2e-10 eV and momentum differences within 1e-12 of its positive physical scale.
The actual largest momentum-scale difference is 9.31e-17. Producer-side byte/SHA
and IEEE754 identity checks are separate from this reviewer's Python numeric
equality check. The persisted field log also has the same SHA256 as the main log.

Two independent analytic fixtures (five assertions) pass: constant-field
cylindrical moments, and a Q2 polynomial that is positive at every interpolation
node and Gauss3 point but negative between them. Additional descriptive 33x33
uniform sampling per cell then finds the same kind of issue in real solver data:

| Quantity | Independently reconstructed observation |
| --- | --- |
| Time/species | 100 microseconds, 84u (species index1) |
| Cell/reference point | cell274, (0.4375, 0.4375) |
| Normalized (v_perp,v_parallel) | (8.269695162030862, 8.269695162030862) |
| F at that point | -1.3716742802843133e-16 |
| Largest coefficient magnitude in that cell | 3.753671212574764e-13 |
| Original Gauss3 minimum for that field | +7.207029142698871e-17 |

The negative value is about 3.65e-4 of the cell coefficient scale, far above a
relative-roundoff explanation. It disproves exact positivity of the represented
fine FE field even though original quadrature/nodal checks pass. The producer's
dense16 integrated negative-number estimate is only 6.88e-17, below the declared
magnitude budget; small magnitude does not make full physical H mathematically
defined for a sign-changing field. The other seven fields have no negatives on
this reviewer's two sampled grids, which is not a positivity proof. No new
sampling-based acceptance threshold or field repair was introduced.

Durable evidence: `scientific/petsc-review-v12/results/field-audit.json`, SHA256
`ef2481f43108cba4423d6cc288e02fc8a886412829cd0bf3ba0f611fdae27ce0`,
and its self-test result and 62-file source/input/output manifest. The initial
prepared auditor digest and later sampling version are retained in the README;
the accepted source above is the actual executed version.

WarpX's capped cross-section and finite-step angle law must be distinguished from
the uncapped Landau target. Refining timestep alone cannot remove a model-level
cross-section cap. Attribution of actual observed differences requires the
separate controlled experiments, not source inspection alone.
[WarpX pinned momentum update](https://github.com/BLAST-WarpX/warpx/blob/26.10/Source/Particles/Collision/BinaryCollision/Coulomb/UpdateMomentumPerezElastic.H).

The evidence therefore separates three different questions. The original example
setup genuinely could not define the desired two-ion problem without adaptation;
the reviewed initialization fixes that implementation issue. Coarse FE projection
and negative distributions are observed numerical failures even after setup is
correct. Finally, the cap and finite-angle laws define physical/numerical operators
that differ from uncapped infinitesimal Landau. A disagreement between two of
these outputs cannot yet identify which contribution dominates. The matching
initial Maxwellian rate is strong evidence for the adapter's physical time and
prefactors, while remaining insufficient evidence for its full evolved shape.
