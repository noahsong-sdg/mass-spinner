# V101: performance and fixed-input spatial refinement

Research backend; the live simulator is unchanged. Experimental accuracy
remains unqualified. Numerical and performance results are separated below.

## Root causes and fixes

- **Repeated electrical heat work.** Each step traversed Python tuples for
  every resistance half-segment. In plain terms, it repeatedly unpacked fixed
  geometry. Flat numeric arrays and ordered `np.add.at` retain every signed
  Hall cross term and duplicate-cell contribution. This is smaller and more
  transparent than a new sparse scatter operator or regrouped heat formula.
- **Excess quadrature allocations.** The vector basis stores/interpolates
  identically zero cross-component arrays; constructing it over the entire
  split mesh creates a large peak. Scalar component evaluation and 1,024-element
  stress batches retain the same order-6 rule, global DOFs and cylindrical
  strains. This removes redundant work without lowering physical quadrature.
  Independent tests cover arbitrary velocity traces, variable viscosity,
  exact local heat, whole stress assembly and partial batches of 3/7 elements.
  Review caught a compatibility defect: per-batch viscosity evaluation rejected
  full-grid arrays and changed callbacks using the whole coordinate grid.
  Evaluating viscosity once on scalar quadrature and sharing exact slices
  restores the original contract and makes stress and heating consistent.
- **Sparse factor fill.** Default COLAMD ordering treats the diffusion
  matrices as general sparse systems. Their symmetric structure supports
  `MMD_AT_PLUS_A`, which reduces intermediate factor storage. It changes the
  solve ordering, not the equations. Reusing a stale factorization would be
  incorrect because mass, inertia and timestep change.
- **Grid transition error.** V100 localized part of the initial density-rate
  artifact at the prescribed 5 cm profile clamp; endwall errors remain distinct.
  V101 tests a nested C1 map aligned to that existing clamp and contacts. It
  jointly changes alignment, grading and radial count (16n to 20n), so benefits
  cannot be attributed to alignment alone. Source profiles are not smoothed or
  fitted. The MUSCL method is retained: a point-value slope correction alone
  is not a justified fix for finite-volume averages.

## Verification boundaries

The first ordering regression exposed a poorly conditioned **reference**:
arbitrary identical momentum/inertia capacities and an unscaled dense solve
gave condition numbers up to 6.1e12. Congruence scaling reduced the first
mechanical case to 2.38; its raw dense answer differed by 3.26e-7 while MMD
agreed with the scaled reference to 6.7e-16. Residuals alone concealed that
forward error. The corrected regression uses physical m/m/I and heat
capacities, an equilibrated independent dense solve, and a manufactured
known-vector RHS. The original failure is retained; tolerances are unchanged.

The frozen campaign retains 0/1/2/4 microsecond clocks, n=1/2/4 at CFL .1,
n=2 at .2/.05, all original gates and all 72 optical alternatives at each
time. The checker independently reconstructs the new Hermite mesh and rejects
stale old packets. This is still a retrospective comparison, a short transient,
and an unqualified single-heavy-temperature/frozen-ionization closure.

## Results

Three alternating fresh-worker pairs on the original 64 x 96 mesh, with
identical 152-step / 0.3 microsecond inputs and cProfile disabled:

| Median | Original | Optimized |
|---|---:|---:|
| Evolution time | 28.182 s | 19.593 s |
| Worker peak RSS | 382,756 KiB | 284,072 KiB |

That is **1.44x faster and 25.8% lower worker peak RSS** in this bounded
test. All six conserved-field components pass the unchanged 1e-10 relative
equivalence screen. This is not a host-RAM, browser-speed or full-campaign
speed claim. Smaller factors and bounded assembly address different peaks.

All **90 scientific tests pass** on immutable snapshot
`/work/project/v101-final06`, transfer SHA256
`79dfaa2ac3c3e24f5b1db481ad61409ae2890b166dc3867be99a462b34b83212`.
The added coefficient regression passes on the original implementation, fails
on the intermediate batched version, then passes after the compatibility fix.
The full five-case campaign retains its original `v101-final04` identity,
transfer SHA256 `c892cdb1f140577854ac20561125aba7bad07d5d3880b7c76f2e1c6811c692f3`.
Independent-process comparisons prove identical nominal constructor arrays,
operators and complete short-evolution state between 04 and 06. This supports
the constant-viscosity study only; it does not qualify evolving viscosity.
The zero-swirl source diagnostic's finest initial density-rate RMS falls
0.19954 to 0.04044 kg/m3/s (79.7%); pressure-equalized controls stay near
roundoff. That diagnostic does not replace evolved-field convergence gates.

All five trajectories completed on the source-aligned grid. Six spatial gates
still fail, compared with ten in V100: density-increment differences are
21.6–23.9% and radial-velocity differences 7.09–9.73%, against the unchanged
5% limit. All other existing gates pass, including the timestep comparisons.
Maximum mass/species drift is 3.29e-16; energy, angular-momentum and charge
defects are respectively 1.92e-13, 4.05e-14 and 4.46e-12. Conservation does not
qualify the unresolved spatial fields.

All 72 optical alternatives at each of four times still fail the all-point
experimental screen. Even the best worst-point discrepancy is 47.69% initially
and 47.71% at 4 microseconds. The finest run reaches 617,763 K, reinforcing
the unresolved single-temperature/ionization closure limitation. Numerical
improvement has not established apparatus accuracy or justified live adoption.
Independent review and retained compatibility failures are linked below.

## Reproduction and evidence

Run inside safe-dev with the recorded Python environment, one BLAS thread and
a 1G VM ceiling. All source inventories and exact commands are retained in
`transfer.json`, `execution.json` and per-command logs in the
[public evidence release](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v101-bounded-flow-refinement).
The [independent review](scientific/spatial-v101/INDEPENDENT-REVIEW.md) separates
source review, artifact checks and experimental limitations.

Scientific checks used `python -m unittest discover -s scientific/FOLDER -p PATTERN -v`:

| FOLDER | PATTERN | Tests |
|---|---|---:|
| spatial-v101 | test_*.py | 13 |
| mixture-axial-v75 | test_flow.py | 14 |
| meridional-v86 | test_diffusion86.py / test_electro86.py / test_optical86.py | 9 / 10 / 7 |
| meridional-v86-independent | torque86.py / test_fourier86.py | 3 / 9 |
| spatial-v100 / coupled-v99 | test_*.py | 11 / 14 |

`campaign101.py OUTPUT` runs the five trajectories; `evaluate101.py OUTPUT SOURCE_ROOT`
returns exit 1 for the six retained scientific failures. `equivalence101.py ROOT04 ROOT06 OUTPUT.json`
checks nominal identity; `benchmark101.py ORIGINAL FINAL06 NEW_OUTPUT` runs all
three timing pairs. App checks `npm run typecheck`, `npm run build`,
`npm run check:site` and `npm run check:assets` all pass. The 330 app/asset
input hashes match before and after execution; source-manifest SHA256 is
`47201c00b9770bd6daf5c11b3fafa39b68adcd046bb2d48c519de064aff5fc3e`.
The build retains its existing large-chunk advisory. These structural checks
do not establish live browser or GPU verification.

## Primary software references

[SciPy sparse ordering](https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.linalg.spsolve.html),
[scikit-fem 12.0.2 element subsets and quadrature](https://github.com/kinnala/scikit-fem/blob/12.0.2/skfem/assembly/basis/cell_basis.py),
[NumPy unbuffered repeated-index accumulation](https://numpy.org/doc/stable/reference/generated/numpy.ufunc.at.html).
