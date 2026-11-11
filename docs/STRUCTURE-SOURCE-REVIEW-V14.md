# Existing collision implementations: source qualification, v14

7 November 2026 UTC. This is an independent source-selection review, not a
solver-result or convergence certificate. Actual upstream repositories were
cloned and inspected in an isolated Apple safe-dev VM. No collision evolution,
MATLAB/Julia execution, compilation or upstream numerical test ran in this
review. The adapter and independent physics studies have separate evidence.

## Selection and its limits

Reuse the MIT-licensed Gonzalez discrete-gradient and pair-metric construction
in [CollisionOperators.jl at 9874021](https://github.com/JuliaPlasma/CollisionOperators.jl/tree/9874021c9edf030fdaa1f62e28c450d63acc361c),
with explicit attribution and license retention. Its existing code is 2V and
single-population. The full-3V, unequal-mass two-ion extension and replacement
positive Gaussian entropy functional are **new adapter work**, not features
already demonstrated by that upstream commit.

This selection uses existing scientific implementation where it actually
applies. It does not establish that this is an industry-standard collision
solver or that a complete upstream plasma package has been qualified. An
upstream-source fixture and adapter tests must distinguish reused algebra from
new species normalization, geometry, entropy and solver behavior.

## Actual pinned repositories

Pins below are actual `git rev-parse HEAD` / `git show` observations from the
clones, not inferred from moving repository front pages.

| Implementation | Commit and recorded commit date | Actual inspected scope | Selection implication |
|---|---|---|---|
| JuliaPlasma/CollisionOperators.jl | `9874021c9edf030fdaa1f62e28c450d63acc361c`, 2026-11-03 | CPU 2V, one population, spline projection and Gonzalez correction; MIT | Reuse the licensed structural core; extend and qualify explicitly |
| zontafil/MultiSpeciesLandau | `79378e9bcd3c33733380a12d63081855005611c8`, 2022-12-07 | `Particle2d`, `Matrix2d`; inspected CPU equation-of-motion and entropy-gradient functions are commented-out stubs | Cannot use the inspected CPU path as a working full-3V reference |
| sqvanfleet/particle_method_multi_species_Landau | `536c6bc4c6a12d26a16a43be30505231da10df54`, 2024-11-27 | MATLAB 2V multispecies Coulomb and 2V implicit-midpoint BKW | Valuable mass/weight/formula comparison, not a ready full-3V discrete-gradient backend |
| sqvanfleet/aggdiff_landau_particle_method_discg | `a7b02c6014a4f642edd952cf03650cdb85677235`, 2024-11-25 | MATLAB 2V single-species Landau; 1D aggregation/diffusion examples | Valuable temporal-gradient comparison; species and geometry still require adaptation |

The Van Fleet author profile directly links the
[multispecies repository](https://github.com/sqvanfleet/particle_method_multi_species_Landau).
The [Hu–Van Fleet–Wan publication](https://epubs.siam.org/doi/full/10.1137/24M1674054)
explicitly identifies the [discrete-gradient repository](https://github.com/sqvanfleet/aggdiff_landau_particle_method_discg)
as its reproducibility code. Neither scientific authorship nor public access
by itself establishes a redistribution license. A case-insensitive filename
search for `license`/`copying` across the three C++/MATLAB clones returned no
files; their complete tracked trees likewise expose no such file. This records
the inspected evidence, rather than a legal conclusion about all possible rights.
No unlicensed source is vendored into the application by this review.

## Reused Julia execution path

The pinned [solver.jl](https://github.com/JuliaPlasma/CollisionOperators.jl/blob/9874021c9edf030fdaa1f62e28c450d63acc361c/solver.jl)
traces `picard_map!` → `landau_geff!` → `compute_entropy_gradient!` and then
the selected collision kernel. It forms a midpoint entropy gradient and adds a
rank-one Gonzalez term so its scalar product with the velocity increment equals
the measured entropy difference. The sign/weight conversion to its collision
gradient must be preserved consistently. This identity is independent of the
choice of differentiable entropy functional; the physical meaning of that
functional is a separate requirement.

Important adapter boundaries are demonstrated in source:

- The loops explicitly operate on two velocity components. Three components
  require a real dimensional extension, not a relabeling of 2V output.
- The existing projected spline can be negative. Its entropy extension cannot
  be imported as a physical-H guarantee for the new positive representation.
- The correction vanishes below an absolute squared-displacement threshold of
  `1e-30`; near-equilibrium behavior and the discrete chain-rule residual need
  explicit tests. An exact zero increment is a genuine domain boundary; a
  copied arbitrary floor is not automatically a two-ion physical invariant.
- The inspected source has no unequal-species mass, charge or Coulomb-prefactor
  configuration. Those are new algebra and must be audited independently.

The [MIT license](https://github.com/JuliaPlasma/CollisionOperators.jl/blob/9874021c9edf030fdaa1f62e28c450d63acc361c/LICENSE.md)
identifies copyright 2026 Michael Kraus. `Project.toml` records version
`1.0.0-DEV`, Julia compatibility 1.12 and Mantis 0.6. These are source requirements,
not proof the complete dependency graph or upstream application ran in this review.

The pinned [CPU pair kernel](https://github.com/JuliaPlasma/CollisionOperators.jl/blob/9874021c9edf030fdaa1f62e28c450d63acc361c/functions.jl)
implements the transverse Coulomb tensor, skips pairs with squared separation
below `1e-24`, and suppresses interactions involving particles at/outside its
configured 2V box. These are actual upstream numerical boundaries, not automatic
physical requirements of a full-3V two-ion model. Source fixtures should retain
their behavior; the adapter must document and test any changes, including
coincident particles, near-zero separation and box-edge behavior.

## What the author implementations add to the comparison

The pinned Van Fleet Coulomb example uses two species, positive fixed weights,
species-dependent Gaussian smoothing and the mass-scaled pair-gradient difference.
Its inspected `psi_2d.m` makes epsilon the Gaussian **variance**. The Coulomb
example advances velocities explicitly; the separate BKW helper evaluates the
entropy gradient at the midpoint, rather than imposing an exact finite-step
entropy chain rule. These paths are therefore not interchangeable with a fully
discrete entropy-preserving construction.

The separate single-species discrete-gradient Coulomb implementation evaluates
entropy gradients along the old-to-new segment using four-point Gauss quadrature,
and the Landau tensor at the midpoint. Its iterative driver can retain a step
after exhausting fixed-point iterations. Reusing its general construction still
requires explicit nonlinear convergence and temporal-quadrature diagnostics;
finite quadrature alone is not an exact entropy-identity certificate.

The [multispecies regularization analysis](https://arxiv.org/html/2310.16143v1)
requires compatible smoothing across unequal masses to recover a common physical
equilibrium temperature. A monotone regularized H, positive blobs and conserved
marker energy do not alone establish convergence to the unsmoothed Landau
equation. The adapter must retain regularization refinements and the original
physical-H/distribution gates, rather than replacing them with its own easier
regularized functional.

## Source evidence and isolation

Actual staging root: `/tmp/mass-spinner-structure-source-v14`; safe-dev guest
`safe-dev-958bb6252986573a`. It was initialized from a one-file, 0.0 MiB copied
snapshot. Online access was used only for four explicit public upstream clones;
subsequent source inspection and evidence assembly ran offline. No host directory,
credential, socket or signing key was mounted.

Selected read-only source evidence, complete tracked trees, pins and SHA256 sums
were exported to `/tmp/mass-spinner-structure-source-v14-export/evidence`.
The host command `shasum -a 256 --quiet -c SHA256SUMS` passed for all 15 listed
records. Complete clones remain in the same guest volume under
`/work/home/structure-source-cache-v14`, outside the copied project; no guest
source reset was performed. Source bodies remain local inspection evidence and
are not included in published application assets.

Key observed hashes:

```
CollisionOperators solver.jl     1fbc2845d3d9d9e4802b255d5302d8f5b26bd859558154ff7f4204f5d546c7f7
CollisionOperators functions.jl  93169e8a82312820d615772f013c5180f9ea180bb428f96c500df03a05ffbee7
CollisionOperators LICENSE.md   3c178022e838d0a8e26874fe5c49902f2a06c772b41ae2a96c131a60e47184e3
Zonta CPU kernel                15a4b3c70ce9bd21209efdd9cc4791d3d380a65182d7d3d3bdc60bb12c534e7f
Van Fleet multispecies example  d16a96837fb86a31c2ff5bcaf8ccdfe7860ddfa06a4ac59ccf3dae08ddecf1b0
Van Fleet midpoint RHS          63b2d26ee6db53fc6063b0b71014de23a7e36cbe8bc7aac5ec53d441fd994acb
Van Fleet discrete-gradient RHS e91ba8321fc44226b8fdeed118dc36a2f524ead62b2cdee6ed0cee2dd8108694
```

No ready, qualified full-3V unlike-ion replacement was established by this
bounded source search. The chosen reuse route reduces unnecessary reimplementation
while preserving the obligation to validate every new physical adapter boundary.

## Postimplementation source/reuse audit

The inspected runtime is `scientific/structure-preserving-v14/run.jl` →
`StructureLandau.make_model/initial_state` → `advance` → the vendored generic
`newton_krylov!`, whose residual calls the new `discrete_gradient`, Gaussian
entropy/increment and unlike-mass `mobility`. It exports the actual velocities,
fixed weights, species, masses, variances, quadrature, invariants and solve status.
The full upstream spline/Mantis application is **not imported or qualified**.

Actual byte reuse is narrower than the initial selection description: the
unchanged generic JFNK file is vendored, while the transverse pair projection and
Gonzalez construction are adapted into new dimensional/species code in `core.jl`.
The new positive Gaussian type-I entropy replaces the original spline entropy.
These are explicitly new method boundaries, not an unchanged upstream solver.

I independently compared canonical vendor hashes with the actual pinned clone
retained in my separate safe-dev VM:

```
newton_krylov.jl  71b5530488703f29d113ec57acc778a9910f0d4df01582484043934a2cbec347
LICENSE.md       3c178022e838d0a8e26874fe5c49902f2a06c772b41ae2a96c131a60e47184e3
```

Both match exactly; the upstream commit in that clone remains `9874021...`.
The MIT copyright/permission notice is retained. No unlicensed alternative body
is needed in the runtime. This establishes source identity, not correctness of
the new residual or physical convergence.

At the earlier q32 audit snapshot `core.jl` hashes to
`f9bd22a542cd4189e14113b6e1173e207adc6154aa8e7b56bcdd21fea1e9b265`,
`run.jl` to
`8c9ac2f6ef54414f8fb43f28823f89edf92ba91820ddc19b9e4ea45f133c59fc`.
The model uses full Cartesian three-component velocities, normalized masses
1/2.1, positive GH weights and variance alpha/mass. SI scales reconstruct
40/84 u, density5e17 per species and the Coulomb prefactor. The scalar entropy
and its derivative use the same fixed quadrature, including the +1 derivative
term; the coefficient-difference entropy increment is separate from subtracting
two large totals. Momentum/energy residual work and the entropy chain-rule work
are exported rather than inferred from solver status alone.

Labels distinguish `markerTemperatureEV` and `smoothTemperatureEV`. Initialization
targets smooth5eV and gives marker3.75eV when alpha=.25; the fixed smoothing
offset is not hidden by snapshot renormalization. The metadata identifies the
discrete functional as fixed-Cartesian-GL positive Gaussian-mixture type-I H,
states the Q(0)=0 convention and declares that particles are not clipped at the
entropy-quadrature box. Finite quadrature dissipation still does not establish
independently refined full-domain H or the zero-smoothing physical limit.

The audited adapter removes the upstream nonzero-distance and Gonzalez
displacement floors; exact coincidence/zero displacement remain explicit
boundaries. Independent mathematical and actual-data tests are required for those
changes. The current `test_core.jl` additionally checks GH parity, positive
weights, weight sum and second/fourth moments. Its hash
`c36f08b7ab4af77ffd0e513b73dd28d659fbb11c9ddf71de78de75474e9c3028`
differs from the earlier 34-assertion snapshot. The old passing count must not
be attributed to this expanded test source. Fresh execution evidence in
`/tmp/mass-spinner-structure-v14-pilot-q32-accepted-export/logs/core-tests.txt`
reports **46/46** passing: 3 unchanged JFNK, 22 GH, 13 entropy/chain rule and
8 unlike-mass metric/boundary assertions. The companion execution record reports
exit0, 3.24836471s, peakRSS350760960 bytes and no watchdog failure. Exported
`core.jl`, `run.jl` and `test_core.jl` exactly match the current hashes above.

The CLI time loop is now inside `main(args)`, so evolving velocity assignments
are local to the function. This is the appropriate small fix for Julia top-level
loop soft-scope behavior; marking state global would widen shared mutable scope.
`test_cli.py` invokes the real entrypoint, requires both initial and evolved
states and a converged solve, retries the same output name to test stale-data
rejection, and rejects the invalid variance boundary. At this source-only pass,
the exported actual CLI regression log at
`/tmp/mass-spinner-structure-v14-pilot-accepted-export/logs/entrypoint-tests.txt`
reports those three cases PASS. Its companion execution record reports exit0,
17.4145248s and no watchdog failure. This accepts the CLI regression evidence;
the current expanded core tests are covered by the separate fresh log above.

No demonstrated coefficient, sign, licensing or source-identity defect was found
in this bounded inspection. The final source now directly records normalized
mass/variance units, charges +1/+1, Coulomb logarithm12 and
`F=v0^3*f/n0` in the entropy label. This resolves the source-level metadata gap
identified in the initial audit. The accepted earlier CLI export predates this
metadata-only edit. The actual q32 pilot exports the current four runtime-source
hashes and these unit fields, and its execution record reports exit0. This binds
the current metadata to an executed pilot, not the full convergence campaign.
Its campaign-plan hash is null, appropriate only for this exploratory pilot;
the frozen campaign still must bind its case plan and runtime identity. No
physical PASS follows from this source review.

## Final frozen-source review

The final frozen `campaign-plan.json` hashes to
`0f6a2fe6b9aa381d09c5e2279da502ccf3e0596dc7881a9a5b33adb205043073`.
All six pinned runtime/runner/license files in that plan match the canonical
files inspected in this final read-only review:

```
core.jl                  e13928023f6b3e376f92ae74502994307b6e0f19de5f15475cfc23771a18e005
run.jl                   ba5807f8454caa6d9c9f674428a7b71f158ad33a7abc3d97e5c1241502857f3a
bounded.py               f4554d3c477ce621283080376d0e14956e0c332b79c1f7997622f212401b63c7
campaign.py              ba7f8f42a9d4901b3ed70e8ddcc8b31d071937379ae3a87275039f44d70c0f4c
vendor/newton_krylov.jl   71b5530488703f29d113ec57acc778a9910f0d4df01582484043934a2cbec347
vendor/LICENSE.md        3c178022e838d0a8e26874fe5c49902f2a06c772b41ae2a96c131a60e47184e3
```

The unchanged vendor remains the **303-line generic JFNK**, with the same
independently pinned MIT notice. The new runtime is **255 lines in `core.jl`
and 68 in `run.jl`**, excluding the separate Python runner/resource code.
The full-3V unequal-mass pair algebra, Gaussian functional, stable entropy
increment, diagnostics and dimensional normalization remain new adapter work.
The final README accurately describes this split; no full-upstream-package or
unmodified 3V-multispecies qualification claim was found. Relative to q32,
the only `core.jl` change streams matrix rows into JSON instead of materializing
an array of copied rows. The final scientific algebra is unchanged by that edit.

Accepted evidence inspected directly:

- `/tmp/mass-spinner-structure-v14-pilot-q48-accepted-export/logs/final-core.txt`:
  **46/46** actual assertions PASS, with final core/test hashes matching the
  exported and canonical source. This replaces neither the historical failed
  stress test nor its root-cause record.
- The same export's `logs/final-guards.txt`: **8/8** actual runner/watchdog
  tests PASS. Its `campaign.py` and `bounded.py` exactly match the frozen plan.
  The four plan tests cover changed-plan, draft, stale-source and stale-case
  rejection; the four resource tests cover child failure, descendant memory,
  stale logs and wall timeout. They do not exercise successful case sealing.
- `/tmp/mass-spinner-structure-v14-identifier-cli-export/logs/entrypoint-tests.txt`
  and its execution JSON: actual final-core/final-run CLI regression PASS,
  exit0, 14.690366132s, peak process-group RSS540565504 bytes, no watchdog
  failure. The inspected test exercises the real time loop, lossless gzip and
  content SHA, both new- and old-format stale directories, invalid variance and
  path-traversal rejection. Its older `campaign.py` is not used as evidence for
  final-runner coverage; final q48 guard evidence supplies that instead.
- The q48 two-step pilot execution JSON reports exit0, 13.135079339s and
  peak process-group RSS512888832 bytes, below the120s/1GiB pilot caps. Its
  compressed metadata contains the final four Julia/vendor source identities,
  Julia1.13.3, full3V, n4/q48 and two actual1µs steps. Host read/hash validation
  of all17 entries in `pilot-q48-sha256.txt` passes. Decompressed metadata SHA
  `6ae66f1f17a90595a47e090402949f7f17333eaa78b444e40492602072388abc`
  independently matches `metadata-content.sha256`.

The q48 pilot retains a null campaign-plan field: it is an exploratory runtime
and resource test, not execution of the subsequently frozen scientific plan.
Earlier q12/q32/CLI artifacts retain their own source identities and scopes.
Final campaign execution must separately verify this plan SHA, exact source
copies, metadata identity, case configuration, actual history and exact raw
manifest membership. At this pre-campaign snapshot, successful sealing/fsync
coverage was conditional on an actual accepted sealed campaign case; the
rejection tests and pilot were not substitutes for that evidence. The following
closeout resolves that condition. No numerical rerun was performed by this reviewer.

## Sealed-campaign provenance closeout

The actual final export is
`/tmp/mass-spinner-structure-v14-campaign-final-export`.
Its `final-transfer.sha256` hashes to
`dad29a5f1ef659333689713302db18c49db42adebfb0cdd8e496116b6f466a43`;
my independent host read/hash check of all146 listed records passes. The status
record hashes to
`4d38422e5fb1b4177d0b31ee8c0444702b6c7fce0e00f282631c448d055f21a6`
and reports8 executed /7 complete /5 unrun, with the baseline resource-failed
after445µs. This agrees with the frozen plan identity and final integrated report.

I inspected successful `dt10us` and `operator-q64` cases directly. For both:

- The raw-manifest check passes for every listed file, and a separate sorted
  membership comparison finds no missing or extra case file other than the
  manifest itself.
- All six sealed source copies and the sealed plan copy match the exact final
  hashes recorded above, including unchanged JFNK and MIT license.
- Decompressed metadata independently matches its saved content checksum and
  binds the actual plan SHA, final source SHA values and declared case settings.
- `run.json` records exit0, complete history and no integrity failures;
  `process.json` records exit0 and no watchdog failure. `dt10us` takes
  118.488325848s /456278016B peak RSS; `operator-q64` takes
  386.758179970s /474996736B peak RSS, each within its frozen cap.
- The actual histories have precisely steps0–10 and0–20, respectively, ending
  at100µs; every saved evolved state's solve is converged.

This resolves the successful campaign sealing-path evidence gap. The exact
executed runner source includes the file/manifest/directory fsync calls; the
accepted artifacts demonstrate successful normal completion and sealing, not
a simulated power-loss durability test. Exploratory pilots retain their null
plan fields and are not relabeled as campaign cases.

The integrated `STRUCTURE-CONVERGENCE-V14.md` was rechecked after its stale
opening and q48-table wording were corrected. It now distinguishes the closed
bounded campaign from pending short-control diagnostics, records all four rate
FAIL results, retains the incomplete500µs horizon and five unrun refinements,
and limits positive/conserved/entropy observations to actual reviewed states.
No remaining source-reuse or provenance overclaim was found in this scope.
Artifact integrity and successful sealing do not qualify the collision physics.
