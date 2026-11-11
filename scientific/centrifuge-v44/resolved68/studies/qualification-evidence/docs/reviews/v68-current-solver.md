# v68 independent current-solver review

10 November 2026. Independent source tracing and primary-method review. No
project code, tests, dependencies or VM commands executed by this reviewer.
The parent owns all profiling, safe-dev synchronization and execution. The
sections below distinguish the prospective design, inspected implementation,
and parent-run receipts. Full physical-equivalence acceptance remains pending.

## Problem and execution path

The v67 actual FiPy/production study showed that four axial cells underpredict
Joule heating by about 30–31% and terminal current by 26–28% versus 64 cells.
The sampled 32-to-64 comparison passed its unchanged electrical gates. This is
a spatial-resolution defect, not a charge/work conservation failure. A faster
solver is useful because it enables adequately resolved evolution; reducing
the axial grid merely to regain speed would retain the demonstrated defect.

Read `src/fuel-current.ts` and `src/fuel-spatial-operation.ts`. Every thermal
residual evaluates a spin/species fixed point. Each spin iteration calls
`solveFuelCurrent`, which validates geometry, allocates cell centers and link
objects, computes exact-log resistances and torque coefficients, assembles the
same diagonal/matrix, and starts Jacobi-PCG from zero. The accepted thermal
endpoint calls the source again. Grid/conductivities/electrodes are fixed
during these repeated calls; only the common Omega and thus motional emf/RHS
change. In plain terms, each iteration rebuilds the same wiring before
changing the generator speed.

Technical dependencies are separable:

- Matrix A: physical grid, positive conductivities and electrode MASK.
- RHS: A's fixed electrode contributions and linear motional-emf dependence
  on Omega. Voltage values and B do not change A, but change forcing/work.
- Face outputs: solved potential, current emf, original resistance and exact
  torque coefficients; Joule heat remains nonlinear/quadratic in current.

The connected positive-conductance graph has at least one electrode, so
`x^T A x = sum_internal g*(xa-xb)^2 + sum_electrode g*xa^2 > 0`
for nonzero x. This is the SPD property needed by CG, not an assumption about
the sign of electrode or mechanical power. The zero-area symmetry axis
remains absent from current links; no axis electrode or artificial leakage
is introduced.

## Smallest justified implementation order

First profile actual resolved workloads and split setup, RHS, linear solve,
face-ledger reconstruction and complete coupled-step time. Count electrical
solves, iterations and nonlinear source calls. Include setup amortization,
not only a warm inner kernel. A compiled operator alone cannot promise a
material speedup if almost all time is already spent in PCG.

The smallest reusable boundary is an explicitly constructed electrical
problem accepting Omega arrays. Copy/freeze its own geometry, conductivities,
field and electrode arrays once, precompute links/diagonal/fixed RHS, and
reuse them. Retain the existing one-shot `solveFuelCurrent` wrapper and all
physical output fields. Have the experimental spatial operation own one
prepared problem for its explicit setup/trajectory; even one prepared object
per outer step removes repeated setup inside the nested nonlinear callbacks.

This is preferable to a global/WeakMap identity cache: TypeScript readonly
arrays can still be mutated by another owner, and geometry/voltage/conductivity
sliders must not silently use stale coefficients. A compiled problem is an
explicit snapshot. Rebuild it when any frozen input changes; no implicit
object-identity cache, JSON hashing on every source call, cross-run mutable
solver state or broad new solver framework is needed.

Do not change the finite-volume equation, prescribed conductivities, q-center
torque/emf adjoint, voltage gauge, physical heat definition, timestep schedule
or accepted tolerances as part of the performance patch. Keep a fully
reconstructed original-operator residual and physical face ledgers after each
solve. Avoid a warm-start cache initially: it adds call-order/mutable-output
questions that are unnecessary if compiled setup plus a fixed preconditioner
meets the measured target.

## Method tradeoffs if Krylov iteration dominates

| Option | Benefit | Cost / reason to defer |
| --- | --- | --- |
| Reused links and Jacobi-PCG | Smallest behavioral change; removes repeated setup | Does not improve matrix conditioning or iteration count |
| Reused IC(0)-PCG | Sparse setup and triangular applications; fixed approximation improves the solve without changing A | Must establish positive finite pivots and symmetry; benefit depends on anisotropy/order and measured iterations |
| Reused exact band Cholesky | Deterministic repeated direct solves and robust original-matrix residual check | More fill/storage and implementation; natural half-bandwidth is nr; setup O(N*k^2), solves O(N*k) |
| Exact common-Omega response | Valid affine linear potential response for this fixed problem | nr+1 setup solves, O(N*nr) basis storage/application, and a restricted subspace; heat must still be reconstructed from current |

For N=64*64 and natural k=64, band storage is roughly N*(k+1) doubles,
about 2.13 MB before the original operator/output buffers. This is an estimate
from storage dimensions, not a measured browser allocation. A permuted band
may reduce bandwidth when one grid dimension is shorter, but that is another
indexing change requiring evidence. Do not take on custom band factorization
solely because it might be faster.

IC(0) is the narrower next candidate when profiling shows repeated PCG cost.
Use the original symmetric conductance graph and a positive-pivot check; a
failed factorization must be surfaced rather than silently changing matrix A.
No empirically tuned conductivity, diagonal regularization of the physical
problem or weaker charge/work gate is justified. If factor shifts are ever
introduced as a preconditioner-only device, distinguish them explicitly from
the original A and keep the original residual authoritative.

The common-Omega response follows directly from `A*phi = b0 + F*Omega`:
`phi = phi0 + X*Omega`, with `A*X=F`. It is an exact discrete linear reduction
up to solve/roundoff error for the frozen matrix and forcing. It cannot be
reused after conductivity, electrode geometry/voltage, field or assumed
Omega subspace changes without rebuilding the appropriate coefficients.
Joule power cannot be linearly superposed from basis heating because it is
quadratic in current. This option requires a measured amortization argument
before its extra setup/storage is warranted.

## Primary expert-tool evidence checked

[PETSc's successive-system guide](https://petsc.org/release/manual/ksp/)
explicitly describes reusing setup for the same matrix with changing RHS,
and distinguishes that case from changed matrix values. This supports the
reuse boundary; it does not imply PETSc is running in the TypeScript path.
[PETSc CG documentation](https://petsc.org/release/manualpages/KSP/KSPCG/)
requires a symmetric definite matrix and preconditioner.
[PETSc ICC documentation](https://petsc.org/release/manualpages/PC/PCICC/)
identifies incomplete Cholesky and fill/order choices; it also documents a
shifted implementation, so a tiny local IC(0) must not be represented as the
entire PETSc algorithm. [LAPACK DPBTRF](https://netlib.org/lapack/explore-html/dc/d58/group__pbtrf_gafd2c3ba375ecee6dba1fba62696993e0.html)
documents exact SPD band Cholesky, band storage and failure for nonpositive
leading minors. These are method references, not performance benchmarks for
this particular simulator.

## Required correctness and performance gates

Before modifying the solve, retain actual baseline outputs and profiles.
Compare every potential, signed electrode current, per-cell torque/heat,
global Joule/mechanical/electrode power and original-operator charge residual
for the same physical cases. Numerical iteration counts may change; the
equations and physical outputs must agree to their already qualified solver
tolerances, not merely to the looser 2% mesh-refinement target.

Required cases include the original 16 FiPy continuum cases, v67's 20 physical
axial cases, high/low conductivity and anisotropy contrasts, rigid and
nonuniform Omega, sign reversal, finite shifted gauge, a regular axis and
electrode patches. Keep independent 1e-9 charge/work/projection identities and
actual FiPy 1% potential/2% work gates. Include stale-input regressions: mutate
the caller's original grid, conductivity, field and electrode arrays after
preparation; the prepared snapshot must retain its documented problem, while
constructing a new problem must reflect the new input. Reject wrong-size or
nonfinite Omega, and ensure mutation of returned output arrays does not alter
later solves. Repeated/reordered solves must preserve the same physics.

For IC(0), inspect the exact assembled lower factors/application, their
positive finite diagonals and the unchanged true-residual check. For an exact
direct factor or response, still reconstruct full cell charge and power from
the original links; a factor residual alone cannot reveal wrong torque/emf
weights. Preserve all failure gates, not only an outer total-energy balance.

Report cold setup, amortized per-solve and complete resolved coupled-trajectory
timings against the same source snapshot and physical mesh. Keep parent-run
VM receipts/hashes. After performance qualification, actually evolve the
resolved axial mesh and repeat whole-history time/radial/liner/axial checks;
the sampled frozen-current pass does not prove resolved coupled evolution.
No live/default promotion follows from a speedup alone.

## Candidate review status

At the prospective review, profiling and a parent implementation were pending
inspection. Subsequent source/receipt reviews are recorded below. No resolved
coupled-convergence pass follows from the performance patch alone.

## Baseline receipt and IC(0) eligibility

Subsequently inspected actual `resolved68-profile-before.log`, its receipt,
and `scientific/resolved-v68/profile.ts`. The safe-dev run uses snapshot
`77bb1ea54616d673b96760d4291b2cc878fe9631dffe6088bf3100e6383ff589`,
728 inputs, exit 0, source verification before/after. Its frozen n32 initial
state gives the following three-call mean one-shot electrical times:

| Axial cells | PCG iterations | Mean electrical call |
| ---: | ---: | ---: |
| 4 | 128 | 4.185 ms |
| 16 | 225 | 14.097 ms |
| 32 | 227 | 23.953 ms |
| 64 | 245 | 18.392 ms |

A real n32/nz32 coupled step of 10 microseconds takes 2.456 s with nine thermal
iterations and 227 PCG iterations in the returned current solve. The source
selects the completed retained graded case `r32-z4-g128-t256-q`; the electrical
timing changes nz while keeping the initial radial spin and material inputs.
These timings include fresh one-shot setup and are not a separate setup/solve
breakdown. Nonmonotone nz32/nz64 timing and only three repeats caution against
inferring asymptotic scaling or a precise speedup before a matched rerun.
The high repeated iteration counts support testing a reused preconditioner.

The parent's proposed narrow candidate is immutable `createFuelCurrentSolver`
plus IC(0), reused by an explicit copied spatial stepper. IC(0) is eligible
for this particular matrix, rather than for every possible SPD discretization:

- Internal off-diagonal entries are minus positive conductance.
- Diagonal is the sum of incident conductances, including physical electrodes.
- The rectangular cell graph is connected; at least one finite-area electrode
  contributes strict grounding, and other rows are weakly diagonally dominant.
- Thus A is a nonsingular symmetric M-matrix. Arbitrarily signed Omega or
  electrode powers alter RHS, not this classification.

The natural-order five-point graph retains only radial-left and axial-down
entries in the lower factor. It has no triangles, so adjacent retained lower
rows have no common earlier retained neighbor. With row-boundary checks,

```
l_left = A[i,i-1] / d[i-1]       (only when radial index >0)
l_down = A[i,i-nr] / d[i-nr]     (only when axial index >0)
d[i] = sqrt(A[i,i] - l_left^2 - l_down^2)
```

is exactly natural-order IC(0), not a full Cholesky factor or a modified
physical operator. Apply both forward L and backward L-transpose solves.
A forward sweep alone is not a symmetric PCG preconditioner. Finite positive
pivots remain runtime invariants despite exact-arithmetic eligibility. Preserve
explicit failure rather than substitute a shifted physical matrix or hidden
fallback. A zero RHS must return the centered zero potential without 0/0 CG
updates; the voltage reference and original true-residual test remain unchanged.

The distinction from arbitrary SPD IC breakdown is consistent with the
original symmetric-M-matrix work of [Meijerink and van der Vorst](https://doi.org/10.1090/S0025-5718-1977-0438681-4)
and [Netlib Templates section3.4.1](https://netlib.org/templates/templates.html).
The latter was checked directly: it distinguishes arbitrary SPD breakdown
from M-matrix existence and recommends amortizing factors across Newton/time
steps. The original AMS paper link was bibliographically identified; its
full text could not be fetched through the web tool and is not claimed read.
The recurrence and graph checks above are independently derived from this
source's exact sparsity, not inferred from merely naming a preconditioner.
Candidate source inspection and executed physical-equivalence gates remain
required before acceptance.

## Implemented compiled operator and IC(0) review

Inspected the parent implementation in `src/fuel-current.ts` and
`src/fuel-spatial-operation.ts`. `createFuelCurrentSolver` takes an explicit
`structuredClone` of all setup arrays and scalar inputs, validates them once,
and retains the original resistance/torque graph plus its IC(0) factors. Its
only changing physical input is the common-grid Omega array. Each solve
reassembles the motional emf and RHS, applies the original graph in CG, checks
the original true residual, and reconstructs all face currents, cell heat,
cell torque and global work from the original links. Both triangular factor
applications are present. Zero radial-lower entries at row starts prevent
spurious links across rows, including the backward sweep. No factor shift,
conductivity tuning or altered physical operator was found.

`createFuelSpatialStepper` owns a copied setup and lazily prepares one such
current problem for a trajectory. The original public one-shot functions
remain available. Source callbacks within a step use the same problem;
separate prepared steppers own separate state. Checked adjacent geometry
outputs: momentum-grid construction copies its input arrays, and liner output
copies its radii/energy arrays. No returned geometry alias into the private
setup was found. Changing a slider/setup must construct a new explicit
stepper; these factories intentionally do not auto-detect caller mutation.

The parent-run `resolved68-profile-after` receipt records snapshot
`5bd87f6bcd3811f6aae2d0c55e6c2e77d4f618c61c1b0a52edafc888af76e2a3`,
728 inputs, exit 0 and before/after source verification. Cold one-shot PCG
iteration counts at nz=4/16/32/64 fell from 128/225/227/245 to 10/26/44/67.
The matched n32/nz32 coupled 10-microsecond step took 0.77685 s versus the
baseline 2.45614 s, with the same nine thermal iterations. This is a measured
3.16-times improvement for one complete step, not a browser-performance
guarantee or a full-trajectory benchmark. The ten existing current, axis,
spatial-coupling and graded-wall tests passed in the inspected parent log.

## Warm-start regression, root cause and narrow correction

The parent next retained a private copy of the last successful centered
potential as an initial guess. This is justified by the observed repeated
nearby RHS solves; it does not reuse an old RHS, residual, current or heating.
The first implementation always chose the previous guess for nonzero
forcing. Our requested abrupt-forcing-scale regression reproduced a failure:
after Omega=1e10, Omega=1e-10 threw the original true-residual failure while
a fresh solve succeeded. The `resolved68-warm-scale-before` receipt records
snapshot `e81a9385deffc5ffb97797420b7f76e00bc529927f15b8d04a9da4aefa3e9201`,
729 inputs, exit 1, with three of four tests passing and this case failing.

Technically, subtracting a huge old solution through a small CG correction
loses accuracy when the new forcing has a radically smaller scale. In plain
terms, starting very far from the answer can be worse than starting at zero;
an approximate recurrence residual can look converged before the final true
residual does. The authoritative check correctly rejected that answer.

The correction computes the original-operator residual of the old guess,
`r_old = b_new - A*x_old`, and uses it only if `norm(r_old) < norm(b_new)`.
Otherwise it starts from zero, whose residual is exactly `b_new`. This picks
the better of two explicit initial guesses before any Krylov iteration. It
uses no empirical threshold, failed-solver retry, weaker physical gate or
altered equation. Zero RHS therefore has the exact centered zero solution.
The original true-residual gate remains unchanged. This is narrower than
adding restart/retry machinery or removing warm starts from all nearby solves.

Static review confirms that only a successfully solved, finite-ledger
potential is copied into private state; invalid Omega or a failed solve
does not update it. Both the initial guess and returned arrays are separate
copies. The added mutation regression overwrites returned relative/absolute
potential and torque arrays before a later solve. Thus callers cannot poison
the next initial guess through an output alias. Call order can affect
iterations and roundoff, so equivalence tests must compare physical outputs
at their natural scales rather than require identical iteration counts.

The inspected `resolved68-warm-scale-after` receipt records snapshot
`bfdfbf7e9e4d0488698480f1feb08f02f659167baa22ccdc0c0ba21d270511e3`,
729 inputs, exit 0, source verified before/after, and all 14 targeted tests
passing. One evidence detail needs care: the abrupt-scale test at this
snapshot retains the annulus's 1-V outer electrode, despite its title saying
"grounded". It proves recovery from huge motional forcing to finite imposed
forcing; a separate all-zero-electrode, tiny-total-RHS variant was requested
to cover the strict small-scale boundary. This does not invalidate the
reproduced failure or its initial-guess fix.

The earlier `resolved68-profile-warm` snapshot is
`4ddda6cb5898da3ad9a4c616cb28f75dfa79f417c3cbf21c031d576f2693de06`.
It records 0.50184 s and five final current iterations for the same complete
step, but precedes the abrupt-scale correction and is not final performance
evidence for the corrected source. No full FiPy equivalence, resolved
evolution, live-default or deployment acceptance is inferred from these
targeted test receipts. Those final gates remain required.

## Corrected final snapshot and inspected gate receipts

Subsequently inspected `resolved68-target-final.log` and its receipt: snapshot
`69e77ffca10deda322b4879b809d4b4a6501046c518c9079998762f6390b2d2b`,
735 inputs, source verified before/after, exit 0, all 13 targeted tests pass.
The abrupt-scale regression now loops both 0-V and 1-V imposed boundaries
and scales the potential comparison by the actual fresh solution. Thus the
strict tiny-total-RHS case requested above is covered. The count is 13
rather than 14 because this final command omits the separately checked
graded-wall test file; no test removal from that file is implied.

Verified host critical file hashes against all three final target,
optimization and profile input manifests:

| File | SHA256 |
| --- | --- |
| `src/fuel-current.ts` | `35331f744f601425db921c671be238a6531cbf02788498ae931511e9bec3eb1d` |
| `src/fuel-spatial-operation.ts` | `94a194aa597a477eb3e722f52412e31fe45e02a8a1eca01508093c19c54abdf6` |
| `tests/fuel-current-reuse-v68.test.ts` | `24bedac8b6fc8d52b580cd19758b1c8523a657f5c97e9fa235a20acd983379a9` |

`resolved68-profile-final` uses snapshot
`b86ae3d5c2e5f2f9c2a2abb967adc8261dfd11423880be4caa7585d9c8aedd37`,
734 inputs, exit 0 and verified source. The corrected complete coupled step
takes 0.494605083 s versus 2.456141335 s, about 4.97 times faster, with nine
thermal iterations and five final current iterations. Cold one-shot counts
remain 10/26/44/67; the improved coupled count comes from repeated nearby
RHS solves. This remains a matched single-step measurement.

Inspected the actual parent-run `resolved68-optimization-gates` receipt and
log, plus its `validate_optimization.py` implementation. It uses the final
735-input snapshot above and exits 0. The log reports 29 old/new physical
equivalence gates at 1e-9, the unchanged 652 electrical gates, and successful
before/after independent single-step coupled reconstructions. Each coupled
audit runs the nine deliberate corruptions and raises if any is missed.
The electrical campaign reexecutes the new production code on the same 20
physical inputs and compares with the retained actual FiPy results. FiPy
itself is **not rerun** in this optimization check; the report declares that
explicitly. Reusing unchanged, hash-linked independent reference results is
appropriate for a production-solver performance patch and must not be
reported as 20 new FiPy executions.

There is no remaining static blocker in the compiled operator, IC(0), copied
trajectory ownership or corrected initial-guess selection. Full resolved
coupled history, new mesh/time convergence, build/typecheck and deployed/default
behavior are separate acceptance work, not established by these receipts.

## Independently checked raw optimization evidence

Read the exported files under
`scientific/centrifuge-v44/resolved68/studies/solver-1`. Using only trusted
Python standard-library JSON, SHA256 and arithmetic, independently verified
all nine manifest files (8,083,041 bytes), all four reported source hashes,
all five raw-input/output hashes, the 20 ordered physical case IDs and their
common exact input hash. The manifest SHA256 is
`84432b2837b3f8b0390685281dfa6bc1e1b2facbf363bfe0fd10f3bf88e7b157`.
Both before/final profile source hashes match their execution receipts, and
their original physical input packet hashes match each other. The actual
production output hash is
`9ee381fde0957cf184dd4306ca5d7d4d78d8f2e31214deb0a8c7281ee130d7f5`.
No scientific module was imported or executed for this review.

Recomputed old/new physical differences from raw profile arrays, including
signed electrode currents that were not an explicit field in the 29-gate
report. All are comfortably below its 1e-9 natural-scale tolerance:

| Axial cells | Torque L1 relative difference | Cell heat L1 relative difference | Signed boundary-current L1 relative difference |
| ---: | ---: | ---: | ---: |
| 4 | 4.49e-13 | 6.96e-14 | 5.25e-13 |
| 16 | 1.80e-11 | 5.51e-12 | 1.30e-11 |
| 32 | 9.97e-12 | 4.04e-12 | 1.23e-11 |
| 64 | 8.49e-12 | 2.45e-12 | 9.88e-12 |

The maximum of all 29 equivalence gates is 1.80021e-11. The largest coupled
state-array difference is 2.97e-16; liner energy is identical in this step.
Each independent coupled audit performs 823 checks and rejects all nine
corruptions. Its largest roundoff-adjusted relative identity error changes
from 7.72e-15 to 1.98e-12, still below the unchanged 1e-9 identity gate. Thus
the changed electrical iteration history is not being hidden by unchanged
neutral energy or a looser physical check.

Inspected all 652 static electrical gate entries, all passed. Across the 20
cases, the largest identity ratio is 1.65668e-11. The retained FiPy comparison
has maximum collocated potential error 0.103176%, combined-scale power error
0.200876%, radial torque-profile L1 error 0.253769% and heat-profile L1 error
0.404886%. Finest 32-to-64 axial differences remain at most 0.367556% for
combined-scale powers, 0.632140% for torque-profile L1 and 0.947028% for
heat-profile L1. These retain the previous coarse-grid evidence; they do not
qualify nz=4 or establish continuum truth outside the sampled states.

**Scoped acceptance:** the optimized fixed-conductivity electrical solve is
independently supported as preserving the qualified original discrete
physics, including the corrected large-to-small-forcing initial guess, while
making the matched coupled step about 4.97 times faster. No new discharge,
ionization, sheath, Hall-current, experiment or live-browser qualification
has been demonstrated by this optimization. Acceptance of a fully evolved
resolved transient remains the separate campaign's responsibility.

## Evolving electrical time-refinement review

Independently inspected the new `studies/time-1/resolved68-time-refinement`
export, including `electrical.json`, its explicit config, summary and retained
`combined.json.gz`. All seven exported file hashes and sizes match their
manifest (SHA256
`c8f621553dc7a8a952a319af2ba03018812bd6127539d150b11638f5ae5c9b55`).
The decompressed combined prediction hashes to
`cf1b6e3adc453b2301a58fdd79a8c0db73b52f3c1c495d82609fe023e1f01d4e`,
matching the summary and history config. The source snapshot is
`4d28113802de70f2624f3d5146f5e8f22508103e6ae8f255575d2ea62d935631`
(736 inputs). It matches actual time-case, anchor-case and refinement
execution receipts. Their electrical, spatial, campaign and analyzer file
hashes also match the inspected source. Config, summary and electrical
report agree on the two original one-case packet hashes; those original
uncompressed one-case files are not separately present in this export, so
their raw bytes were not independently rehashed here. The combined prediction
does retain every case/state used by this review with an exact byte hash.

Both physical cases have 64 radial gas cells, 64 electrical axial cells,
128 graded wall cells and the same 1-ms physical problem. They retain complete
128/256 accepted-step trajectories, plus the initial electrical states: 386
states total. Verified exact quadratic time knots and all 129 shared indices
`i -> 2*i`, comprising initial time and 128 accepted endpoints. The remaining
128 fine-only accepted endpoints receive identity checks but no interpolated
refinement comparison. In particular the first shared nonzero time,
61.03515625 ns, is included; early states were not dropped from the score.

Counted all 5,790 per-state electrical identity gates and all 1,161 shared-time
refinement gates. Every entry is finite and passes its declared limit.
Independently recomputed every shared error numerator and ratio from the
reported reconstructed-state arrays and recomputed the natural history
scales over both complete histories:

| Scale | Value |
| --- | ---: |
| `max(|Pe| + Q + |Pm|)` | 6.137289604 mW |
| `max(sum(abs(radial projected torque)))` | 36.52201704 nN m |
| `max(total Joule heat)` | 3.050831080 mW |
| `max(sum(abs(electrode-face currents)))` | 3.562744439 mA |

These are electrical-specific quantities; neutral spin energy or background
thermal energy does not appear in the denominators. Largest per-state charge
ratio is 1.03840e-11 (net boundary charge), largest cell charge ratio is
3.54528e-13 and largest electrical-work ratio is 1.48538e-12, all below 1e-9.
Checked every accepted raw production state against the independently
reported radial projection: maximum torque discrepancy is about 6.20e-15
and heat discrepancy 1.53e-15 on their respective natural scales. The
exported electrical source Omega differs from the accepted momentum endpoint
by at most 1.99515e-11 relative, satisfying the actual 2e-11 fixed-point
criterion. Thus the electrical histories use the coupled endpoint forcing,
not a retained initial or stale rotation field.

| Time-refinement electrical output | Worst error on declared history scale |
| --- | ---: |
| Signed electrode power | 0.000163542% |
| Joule power | 0.0266399% |
| Lorentz mechanical power | 0.0268035% |
| Projected radial torque L1 | 0.0531013% |
| Projected radial Joule heat L1 | 0.0535909% |
| Outer/upper terminal current | 0.0281722% |
| Axis/lower terminal current | Exactly zero in both cases |

The largest nonzero differences occur at 1 ms. To challenge whether the
history-maximum scale masks weak late signals, additionally normalized each
instantaneous error by the corresponding maximum signal at that same time
in the two histories. These additional diagnostics remain below 1%: maximum
power error 0.0896595%, torque-profile L1 0.100483%, heat-profile L1 0.180009%
and terminal current 0.0550004%. Even the maximum per-radial-cell instantaneous
relative discrepancy is only 0.110419% for projected torque and 0.241158%
for projected heat. These checks supplement, rather than replace or change,
the prospectively frozen history gates. There is no evidence here that a
small mechanical response or a large background denominator hides an
electrical time-resolution failure.

The fine-case electrical response is substantial: total Joule heat falls
from 3.050831 to 0.906638 mW, outer current from 1.781372 to 0.907992 mA,
and radial absolute torque from 36.522017 to 19.281156 nN m over the
trajectory. Electrode power remains negative because this configuration
brakes the rotating gas and returns part of its mechanical work to the
prescribed electrodes; the positive Joule heat and signed work ledger were
checked separately.

**Scoped finding:** no electrical timepair acceptance blocker was found for
this complete 1-ms prescribed-conductivity case at 64x64 electrical resolution.
This is one 128-to-256 temporal comparison; it neither determines asymptotic
order from three resolutions nor qualifies radial/axial/wall convergence,
experimental accuracy, self-consistent plasma conductivity or deployed live
defaults. Those findings remain separate. Review used trusted standard-library
data parsing, hashing and arithmetic only; no project scientific code ran on
the host.

## Evolving spatial electrical refinement and fresh FiPy review

Inspected `studies/spatial-1`. Independently verified all 53 exported files,
309,342,161 bytes, against manifest
`f5c755242b19cb5ed0e6c548a59e006404d30e0b2dc0dcd7c37bfe34560755d0`.
Each radial/axial/liner combined gzip also matches its declared decompressed
SHA256. Config, summary and electrical reports bind the same physical packet
identities and common 736-input source snapshot `4d281138...d935631`.
The current/spatial solver source remains the already reviewed corrected
implementation; hashes of the actual generator, production runner, FiPy
reference and independent analyzer match the containing safe-dev receipt's
input manifest. No new executable changes are being inferred from the
assessment source hash.

Each spatial pair contains two complete 256-step cases, 514 initial-plus-
accepted electrical states, 7,710 per-state identity gates and 2,313 shared
refinement gates over all 257 initial/accepted times. All identity and
refinement entries are finite and pass their unchanged 1e-9/2% gates. Across
the three pairs, the largest identity ratio is 1.57603e-11. The independent
data review recomputed all 6,939 shared error numerators, verified each
same-time index pairing, and recomputed the full-history electrical scales.
These scales are the same 6.13729-mW power, 36.5220-nN-m torque, 3.05083-mW
Joule heat and 3.56274-mA current scales used in the timepair, with no neutral
or wall-background denominator.

| Spatial refinement, otherwise fixed fine anchor | Combined-scale powers | Radial torque L1 | Radial Joule heat L1 | Physical terminal current |
| --- | ---: | ---: | ---: | ---: |
| Radial gas/electrical cells 32 -> 64 | 0.0467710% | 0.0585261% | 0.101051% | 0.00388494% |
| Electrical axial cells 32 -> 64 | 0.336810% | 0.632140% | 0.891123% | 0.288300% |
| Wall cells 64 -> 128 | 9.25e-10% | 1.83e-9% | 1.85e-9% | 9.79e-10% |

For radial refinement, extensive fine torque/heat were independently summed
into each pair of equal-volume coarse shells before comparison. Axial and
liner pairs use the same radial cells. Raw exported state dimensions,
conductivity arrays and the upper-electrode edge at half the q-domain were
checked. For every accepted state in each combined prediction, source Omega
matches the endpoint within the actual 2e-11 fixed-point criterion (maximum
1.99991e-11); independently summed production cell torque/heat agree with
the reported radial reconstructions within 6.24e-15 and 1.55e-15 relative.
These checks include all three coarse cases and the common anchor, not only
final plots or total neutral spin.

As an extra denominator-sensitivity challenge, instantaneous electrical
scales give maximum heat-profile differences of 0.171059% (radial),
0.947529% (axial), and 6.14e-9% (liner). Corresponding instantaneous torque
differences are 0.0810392%, 0.632140% and 3.47e-9%. All remain below the
declared 2% spatial target. The very small wall-pair electrical difference
shows insensitivity of these electrical outputs in this short case; it does
not by itself establish thermal surface resolution. That evidence requires
the separate wall/physical-surface checks.

The fresh actual continuum/reference run is separate from the earlier
optimization check's retained-reference comparison. Read all four new
`resolved68-remaining/continuum-{0,1,2,3}.receipt.json` files: fixture generator,
production solve, actual `reference_fipy.py` execution and independent
analysis each exit 0 under the containing verified safe-dev snapshot. The
actual FiPy run reports FiPy 4.0.3, NumPy 2.4.6 and SciPy 1.17.1. Its 16
ordered case IDs span coaxial, motional, partial-end-electrode and regular-
axis partial-electrode families, each at radial counts 12/24/48/96. Verified
all three raw file hashes and their common exact input binding:

- Inputs: `920cfab92fbbf630eb862ea4d2a626799e1500722ba610b32f8130369d700a4e`.
- Production: `5104b4ecc68c041c667ff3c007f79907bbae8c934524bac08ea023cfe9b2c645`.
- Fresh FiPy: `401fe1f9b042c842c4785892ffd667ed2b6f145ee8e4e24adfb6dd7711b672aa`.

All 362 original numerical gates pass; the largest 1e-9 identity-gate ratio
is 1.31049e-10. Across all coarse and fine cases, maximum collocated potential
disagreement is 0.139969% and maximum combined-scale power disagreement is
0.332962%. At the finest 96-cell resolution, maximum potential disagreement
is 0.00549017% and power disagreement 0.00540736%. The production analytic
coaxial/motional law errors at the finest grid are at most 1.08e-13, while
FiPy's independently discretized analytic error is 0.000978367%; this is
consistent with discretization error rather than a changed physical law.

**Scoped finding:** electrical time and all three spatial comparisons now
pass for this fully evolved 1-ms prescribed common-fluid example, with
fresh independent FiPy support for the electrical operator's four reference
families. This addresses the demonstrated coarse-axial electrical defect
without relaxing charge/work gates. It does not establish three-level
asymptotic convergence, self-consistent discharge/sheath conductivity,
parameter-wide qualification, experimental calibration, or live browser
behavior. All independent checks here were standard-library data review;
the parent alone executed scientific code in safe-dev.

## Final source and application gate scope

Checked the final-seal manifest hash
`f481e1fca315455f98842bc55de9885505f0302471f8eeef595710daf837dd23`
and its preserved electrical/spatial source files, which have the same
`35331f...` and `94a194...` hashes approved above. Another independent reviewer
owns the complete five-original-packet seal verification; that review is
not being duplicated or implicitly claimed here.

Read the actual final application-check receipt (736-input `4d281138...`
snapshot, exit 0, source verified before/after), per-command receipts and
exported logs. `npm test` passes 1,231/1,231 tests, the existing v67 scientific
unittest discovery passes 28/28, and typecheck, build, site and asset commands
all exit 0. The build retains a large-chunk warning; the site checker explicitly
says it is not a browser runtime check. These checks support source/build
integrity and preserved application behavior, not GPU/mobile verification or
promotion of the research transient as an interactive backend. The completed
electrical numerical scope is the fixed-conductivity operator, its independent
reference families and this declared 1-ms evolved time/spatial refinement
campaign. Experimental and public-device validation remain open.
