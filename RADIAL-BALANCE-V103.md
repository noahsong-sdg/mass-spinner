# V103: preserve centrifugal force balance

The research flow operator now uses a local equilibrium reconstruction for
radial density and pressure, with the same equilibrium profile in its source
term. The interactive browser model is unchanged.

## Problem and cause

An isothermal gas in rigid rotation satisfies `dp/dr = rho * Omega^2 * r`.
The V102 finest smooth-grid native-equilibrium control instead developed
0.127150 m/s radial-speed RMS after 0.1 microsecond. Its initial radial
acceleration RMS was 1.72038e6 m/s², with 89.64% of the volume-integrated
acceleration squared in the two radial boundary-cell layers. Those fractions
describe this control, not the complete apparatus calculation.

`campaign103 -> campaign101.case -> campaign99.evolve -> Flow.rate` reaches
the same shared flow operator used by the research campaign. Previously,
`_face_states` reconstructed limited primitive profiles while `rate` integrated
a separate cell-constant centrifugal source. Reflecting boundaries flattened
the pressure reconstruction even when centrifugal balance required a gradient.
In simple terms, the two opposing forces were being calculated from different
pictures of the gas. Their numerical difference pushed a balanced gas sideways.

## Fix and scope

Each cell constructs an isothermal rigid-rotation reference using its own
`c² = p_bar/rho_bar` and angular speed. Its density profile is proportional to
`exp[Omega² r²/(2 c²)]`, normalized to the actual cylindrical cell average.
`expm1` retains the zero-spin limit. Neighboring cell averages are compared
with this local reference; the existing limiter reconstructs the departures.
Density and pressure remain strictly positive by limiting a departure only
when it would cross zero. No physical floor is imposed.

For that reference, the geometric and centrifugal radial source together are
`2*pi*dz * [r*p_eq]_(lo)^(hi)`. Subtracting its own equilibrium edge pressures
from each cell's numerical momentum flux makes those terms consistent,
including at reflecting walls. The explicit old centrifugal term is removed
to avoid counting the force twice. Total energy receives no extra centrifugal
source: stored angular kinetic energy is already part of conserved energy.

This adapts the established local-equilibrium/perturbation approach of
[Käppeli and Mishra](https://doi.org/10.1051/0004-6361/201527815) and its
[curvilinear finite-volume formulation](https://arxiv.org/abs/2006.05960).
It retains the existing HLLC flux, axial reconstruction, SSPRK2 stepping and
shared mass/angular/energy/species fluxes. A locally isothermal reference is a
reconstruction device; it does not impose a globally isothermal or rigid flow.
General states retain truncation error and must converge under refinement.

This focused change addresses a demonstrated imbalance. Refining indefinitely
would only reduce it, and subtracting a measured-profile residual or freezing
radial motion would suppress genuine dynamics. Neither is used.

## Controls and interpretation

Eleven new independent tests use cylindrical Gaussian averages, mixed/equal
masses, both rotation signs, two graded meshes, finite-time stationarity,
real pressure perturbations, non-rigid rotation, nonisothermal quadratic
pressure, closed-wall fluxes and two-dimensional conservative transport.
The old method fails the equilibrium regressions; the candidate passes them.

Two historical fixtures needed a physically consistent meaning: an exact
stationary rotor now includes its balancing pressure gradient, and an exact
radial Riemann contact has zero centrifugal forcing. A direct HLLC test retains
discontinuous radial angular-momentum advection coverage. An extreme-source
test still requires rejection; the local reconstruction can now reject an
unrepresentable equilibrium before negative thermal energy is reached.

A supplemental pressure-bump test exposed a coarse-grid limiter effect:
relative force errors on the smooth mesh were 2.282%, 6.672%, 2.099%, 0.495%
at n=1/2/4/8 for the negative perturbation; the positive perturbation behaved
similarly. Removing only the perturbation-slope limiter gave 1.928%, 0.701%,
0.213%, 0.056%. A uniform-mesh limited control also contracted at every level.
The production limiter is retained. All four graded results are retained;
the new regression checks the resolved n=2/4/8 contraction and requires the
finest error to beat every coarser result. No existing campaign gate changes.

## Verification and remaining work

All 102 regression tests passed in a one-BLAS-thread, 1G safe-dev VM. The exact
76-file snapshot is `/work/project/v103-candidate02`, transfer SHA256
`0b324d3c4aa737dfd81f308a5c8f9a6c91dff6f5467e9dcd0e3908a8526d3882`.
Flow SHA256 is `dcaf66d1d8506853b1b45468d7908adce967f88813a0b0a7426ad58be683a3f7`.

Four historical V100/V101 review and note documents in that snapshot predate
later host closeout notes. Executable, test and protocol inputs match; the
retained snapshot is the executed copy.

The full five-case campaign retains all physical inputs, the smooth V101
mesh, reporting at 0/1/2/4 microseconds, n=1/2/4 at CFL .1 and n=2 at .2/.05.
The independent auditor retains its 5% spatial, 2% timestep, contraction,
positivity and conservation gates. Optical predictions are sealed before
scoring all frozen diagnostic alternatives. The data remain retrospective,
the current is prescribed, and four microseconds is not a steady discharge.

The 24 equilibrium controls completed. On the finest smooth grid, native
radial-speed RMS falls from 0.127150 to 3.69054e-13 m/s at 0.1 microsecond;
relative density drift is 9.62e-16. Exact conservative-moment projections are
a different state under the native inertia map: their radial-speed RMS is
0.01196, 0.003077, 0.0007747 m/s at n=1/2/4. They converge but are not declared
exact stationary native states.

The full five-case study completed with six failures, all spatial:

| Time | Density-increment difference, before → after | Radial-flow difference, before → after |
|---|---:|---:|
| 1 µs | 21.56% → 20.98% | 7.09% → 7.31% |
| 2 µs | 23.15% → 22.47% | 9.30% → 9.43% |
| 4 µs | 23.94% → 23.61% | 9.73% → 9.74% |

Density increments remove each run's own initial density. The radial component
uses total meridional-flow RMS as its reference. These finite-grid differences
are not absolute continuum-error estimates.

All six remain above the unchanged 5% limit; every spatial comparison
contracts, and all timestep, ledger and diagnostic-quadrature gates pass.
Maximum relative defects are 3.30e-16 mass/species, 1.93e-13 energy,
4.14e-14 angular momentum and 4.70e-12 charge. The fix resolves the identified
native-equilibrium artifact; it does not resolve the coupled spatial failures.
No diagnostic alternative passes the experimental 20% all-point screen at
any clock; the best worst-point discrepancy remains approximately 47.7%.

The finest case still has a 617,683 K local maximum, 2,654.76 K mass-weighted
mean and 0.5988% of mass above the neutral-Ar correlation's 10,000 K reference
limit. This unchanged localized thermal concern remains conditional physics;
the range comparison is not a newly introduced qualification gate.

`npm run typecheck`, `npm run build`, `npm run check:site` and
`npm run check:assets` pass. All 330 app/asset inputs match before and after;
manifest SHA256 `47201c00b9770bd6daf5c11b3fafa39b68adcd046bb2d48c519de064aff5fc3e`.
The existing chunk-size advisory remains. No live equations or deployment
changed, and no browser/GPU verification is claimed.

Exact test commands and log hashes are retained in `execution.json`; the
five-case producer/evaluator commands are in `study-execution.json`. Evaluation
exits 1 because qualification fails, with all raw fields and failures retained.
The prediction seal is
`0c9bf385c0730dc2c0bfb371f20e3daa16c22f50e15a63d5379fa0b44a9adbc5`.
The supplemental plot and energy reader ran in `/work/project/v103-analysis02`;
its input/source hashes and versions are in `analysis.json`. An initial
postprocessing attempt used system Python for package metadata and failed;
the successful rerun uses the scientific venv. That attempt remains retained.

[Public source snapshots, raw fields, logs and comparison figure](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v103-radial-balance)
support these bounded findings. The figure shows hydro-only controls, not
apparatus performance. Equilibrium preservation alone does not establish
coupled spatial or experimental accuracy.

The intended finish line is a numerically qualified model, a matched measured
operating condition with a defensible diagnostic/uncertainty assessment, and a
fast playground representation qualified against that reference. Its stated
operating envelope matters more than adding further unqualified mechanisms.
