# Resolved electrical evolution, v68

This stage qualifies an experimental spatial backend. It does not replace the
deployed playground or establish calibrated Marathon performance. The physical
model still prescribes diagonal conductivity and neutral transport, extrudes a
common angular speed into the axial electrical grid, and omits discharge,
electron-energy, ionization, chemistry and radial hydrodynamic closure.

## Solver fixes and their scope

The prior evolving path rebuilt the same electrical conductance graph and
preconditioner for each source evaluation inside a nonlinear thermal step. It
also started every linear solve from zero. The measured 32-radial/32-axial-cell,
10-microsecond coupled step took 2.456141335 seconds. A cold electrical solve
needed 227 Krylov iterations. In simple terms, the code repeatedly rebuilt and
resolved the same fixed problem while only its rotation forcing changed.

`createFuelCurrentSolver` now owns a copied fixed setup and reuses its original
conductance graph and an IC(0) preconditioner. `createFuelSpatialStepper` owns
that problem for a trajectory. Each new rotation still assembles its actual
forcing, solves the original equation, checks its original true residual, and
reconstructs face currents, Lorentz torque, Joule heat and electrical work.
The one-shot public entry points remain available. A changed setup requires a
new explicit factory, preventing a caller's mutated slider arrays from silently
changing or invalidating a cached operator.

The five-point conductance matrix is a grounded symmetric M-matrix. Its retained
lower radial/axial neighbors give a small IC(0) factor with positive-pivot checks;
both triangular sweeps are applied. This improves conditioning without changing
the physical operator. It is narrower than implementing a new exact band solver
or precomputing an entire rotation-response basis. Those alternatives add setup,
storage and another implementation to qualify without a demonstrated need here.
The reuse boundary follows the successive-system practice described in the
[PETSc KSP manual](https://petsc.org/main/manual/ksp/). PETSc itself is not the
runtime of this TypeScript path; actual FiPy results supply external comparisons.

Review reproduced a separate warm-start bug: a huge previous rotation followed
by a tiny one failed the authoritative true-residual check. Starting from a huge
old potential caused cancellation while correcting toward the much smaller new
solution. In simple terms, the old answer was a worse starting point than zero.
The solver now compares the actual new residual of the prior potential with the
zero guess's residual, choosing the smaller before iteration. It adds no failed
solve retry, conductivity adjustment or relaxed tolerance. The original failing
run is retained, and regressions cover both grounded and finite-voltage circuits.
Returned-array mutation, original-setup mutation, signed/nonuniform rotation,
zero forcing and successive accepted steps are covered too.

The corrected matched complete step takes 0.494605083 seconds, about 4.97 times
faster for this one case. It still takes nine thermal iterations; the returned
electrical solve takes five iterations. This is neither a full-trajectory
benchmark nor a browser rendering measurement. All 29 before/after physical
equivalence gates pass at their declared 1e-9 natural scales. All 652 unchanged
static electrical gates pass against 20 retained actual FiPy cases. FiPy was
**not rerun** in this stage; the production solver was rerun against its retained,
hash-bound outputs. Both old/new single-step independent coupled audits pass,
including their nine deliberately corrupted-data controls.

## Evolving refinement protocol

The prospective [protocol](../scientific/resolved-v68/PROTOCOL.md) fixes the same
1-ms physical problem used in v67. A fine anchor has 64 radial gas cells,
64 axial electrical cells, 128 graded solid cells and 256 quadratic time steps.
Four comparisons separately halve one resolution while keeping the other three
at the anchor. This isolates radial, axial, wall and time errors in a jointly
fine setting. It is a two-level sensitivity matrix, not a formal asymptotic
order estimate or a complete parameter-space validation.

The unchanged v67 primary history and physical-surface gates are retained.
Additional independent electrical histories reconstruct initial and every
accepted current state from exported potentials. They test charge/work identities
and reported outputs, then compare projected radial torque, Joule heat, powers
and physical-side terminal currents at shared times. Projected arrays have their
own natural L1 scales: a large opposing axial torque must not conceal a bad
radial total. Nine adversarial audit regressions pass, including cancellation,
tiny spin with large electrical error, stale hashes, moved inputs and incomplete
trajectories. Fine-only times receive identity checks, not interpolated refinement
claims. The independent coupled auditor separately checks the source/accepted
angular-speed fixed point and every accepted species, momentum, thermal,
energy and conditional-entropy transition.

Early local-relative errors remain separate from global history gates. Fixed
physical checkpoints supplement the moving first quadratic knot; they do not
replace failing startup diagnostics. Exact combined prediction bytes are kept
as rehydratable gzip files, while original one-case packet hashes bind every
pair assessment. Partial runs preserve accepted NDJSON records.

## Execution status

The 128-step time case and 256-step fine anchor both complete without a solver
failure on the same 736-entry snapshot,
`4d28113802de70f2624f3d5146f5e8f22508103e6ae8f255575d2ea62d935631`.
The first case takes 303.79 seconds; the anchor takes 557.75 seconds. The
independent 128-step audit passes 174,976 checks and rejects all nine corruptions.
Its maximum raw global energy residual is 3.52422e-12 J; every conditional total
entropy increment is positive. Source completion and identities are distinct
from the refinement tests below.

The time pair passes all seven primary history gates, both physical-surface
gates, and all nine electrical-history refinement observables. Initial and all
384 accepted electrical states also pass independently reconstructed identities.
There are 128 shared accepted times; 128 fine-only times receive identities but
no interpolated refinement comparison.

Both reviewers checked the exact gzip prediction digest, the trusted source
receipts and reported scales. There are 5,790 electrical identity gates and
1,161 shared-time electrical gates in this pair; all pass. Maximum identity
discrepancy is 1.0384e-11. A separate reviewer recomputed instantaneous and
per-radial-cell electrical differences to challenge history-scale masking:
the largest per-cell heat difference is 0.2412%, still below 1%. These extra
checks supplement the frozen gates rather than changing their definitions.

| Time-refinement observable | Error on declared natural scale |
| --- | ---: |
| Angular speed / initial peak | 0.03313% |
| Gas temperature / heating excursion | 0.1968% |
| Wall cell temperature / heating excursion | 0.2027% |
| Physical wall surface / surface excursion | 0.1997% |
| Cumulative gas-wall heat | 0.09085% |
| Projected electrical torque L1 | 0.05310% |
| Projected Joule heat L1 | 0.05359% |
| Each active terminal current | 0.02818% |

The local qualification remains incomplete. At the first shared 61.0 ns time,
surface error is 1.0444e-6 K on a 2.2515e-5 K causal excursion: 4.6388%.
At fixed times 0.977/3.906/15.625 microseconds, local surface differences are
1.917/1.038/0.5701%, respectively. This is reported alongside, not instead of,
the earliest failure. A local gas cell at 38.15 microseconds has 0.002171 K
difference on a 0.014653 K causal excursion (14.82%). That is a resolved small
signal, not a roundoff-only comparison. Global accuracy cannot qualify it.
The solid-cell local diagnostic is also unqualified: some reference changes
are around 1e-10 K, with unresolved and just-above-roundoff comparisons. A
769.7% local ratio there corresponds to only 5.43e-10 K; it is not a measured
macroscopic wall-temperature error. All raw diagnostics remain retained.

All three spatial pairs also pass. Across the four axes, all 28 primary history,
eight surface and 36 electrical observable maxima meet their frozen limits.
All 8,100 shared-time electrical entries pass; all 1,157 distinct initial/accepted
electrical states are covered by the independent reconstruction. Repeated anchor
states remain explicitly repeated in pair reports rather than counted as new
trajectories.

| Refinement axis | Angular speed / initial peak | Gas T / heating | Surface / heating | Largest electrical observable error |
| --- | ---: | ---: | ---: | ---: |
| Time 128→256 | 0.03313% | 0.1968% | 0.1997% | 0.05359% |
| Gas radial 32→64 | 0.3942% | 0.01716% | 0.01694% | 0.1011% |
| Electrical axial 32→64 | 0.00004214% | 0.00005880% | 0.00002270% | 0.8911% |
| Graded wall 64→128 | <0.0001% | <0.0001% | 0.05719% | <0.0001% |

Electrical observables must be checked directly: the axial rotation difference
is only 0.00004214%, while projected Joule heat differs by 0.8911% and torque
by 0.6321%. The small mechanical response alone would conceal that distinction.
The new projected-output audit corrects another normalization gap: opposing
axial torques can make a cellwise absolute-torque sum large while their radial
sum is small. In plain terms, two large opposing forces could hide an error in
the small push the gas actually receives. An explicit projected L1 check uses
that physical radial sum's own scale. This is the narrow correction because
the error was in validation, not in the already qualified force equation.
The reproducing axial-cancellation regression covers this failure.

All five cases complete their requested 1,152 accepted steps. Independent coupled
audits pass 1,402,752 checks and reject 45 first-transition corruptions (nine per
case); each complete trajectory is separately audited. Maximum unadjusted global
energy residual/dynamic scale is 2.2751e-10, below 1e-9 before storage allowances.
Minimum conditional total entropy increment is 3.3020e-10 J/K. The largest
source/accepted angular-speed defect remains within the original 2e-11 criterion.

Spatial refinement does not remove the local startup qualification limit.
The wall-axis surface comparison differs by 5.5121% at the first shared 15.26 ns
time: 5.9777e-7 K on a 1.0845e-5 K excursion. Radial gas refinement has a 2.2651%
local difference at 0.3815 microseconds (0.003024 K on 0.13349 K). Finer quadratic
time grids move their first point toward the initial boundary incompatibility;
a better whole-history norm does not establish uniform accuracy at that moving
point. Fixed-time checkpoints, raw differences and near-roundoff cases remain
reported without changing any gate. This matrix provides two-level sensitivity,
not an asymptotic error estimate or proof of convergence over arbitrary settings.

## Separation-signal diagnostic

The absolute species-CDF gate protects inventory accuracy but could exceed the
entire developed isotope-separation signal. In simple terms, a small absolute
population error can still be large compared with a very weak separation.
We therefore also report `D(q,t)=CDF_heavy−CDF_light`, restricting fine species
inventories conservatively before subtraction. `E` is the maximum shared-time
difference; `S` is the largest absolute D over both complete native histories.
`E/S` uses exact zero handling without a positive signal floor. This supplements
the individual species gates, which still detect common-mode errors cancelling
in D. It is an additional diagnostic, not a retrospectively added pass criterion
or a substitute for local enrichment, purity or collector-yield verification.

The peak integrated separation signal is about 7.5953e-4. Its relative comparison
errors are 0.2608% for time, 0.08677% for radial, 0.00005548% for axial and
4.23e-9% for wall refinement. Raw E/S, signed worst-point D, final profiles,
packet hashes and fine-only coverage are retained in
`resolved68-separation-diagnostic.json`; its exact executed command is retained
in the corresponding control receipt.

## External reference and final checks

The original 16 continuum/electrode fixtures were also rerun against an actual
fresh FiPy execution: all 362 unchanged gates pass. The fixture producer,
production run, FiPy run and comparison each have an exit-zero receipt and
hash-bound inputs/outputs. Versions are FiPy 4.0.3, NumPy 2.4.6 and SciPy 1.17.1.
Finest cross-code potential and combined-scale power errors are at most
0.005491% and 0.005408%, respectively. This is separate from the 20 retained
FiPy cases used in the earlier 652-gate optimization comparison.

All scientific execution occurred offline in the parent's safe-dev VM, from an
explicitly synchronized copy. The complete 736-entry source manifest was verified
before and after every controller run. The same snapshot named above covers the
five evolving cases, every assessment, final checks and the packet seal. Two
historical stage-only runners are explicitly recorded as absent from the host
checkout; their exact guest copies are included in the seal.

- `node_modules/.bin/tsx --test tests/fuel-current-reuse-v68.test.ts tests/fuel-current-v66.test.ts tests/fuel-current-axis-v66.test.ts tests/fuel-spatial-operation-v66.test.ts`: 13/13 pass.
- `python -m unittest discover -s scientific/resolved-v68 -p 'test_*.py'`: 9/9 pass.
- `python -m unittest discover -s scientific/transient-v67 -p 'test_*.py'`: 28/28 pass.
- `npm test`: 1,231/1,231 pass, no skips.
- `npm run typecheck`, `npm run build`, `npm run check:site`, `npm run check:assets`: pass. Build retains the existing large-chunk warning.

The `scientific/resolved-v68/campaign.ts` runner takes the frozen specification
file, a new output directory and an explicit JSON list of case IDs. The
`assess.py` modes are `case`, `time`, `radial`, `axial` and `liner`; the original
per-case/pair command arguments and exact snapshot are preserved in
`scientific/fixes-v43/resolved68-*.receipt.json`, with logs and full input hashes.
The final gate uses the unchanged `scientific/transient-v67/final.py` runner;
the nine new Python regressions were run separately on that same source snapshot.

Raw evidence is retained under `scientific/centrifuge-v44/resolved68/studies/`:
`solver-1` contains optimization witnesses, `time-1` and `spatial-1` contain
paired predictions/audits, and `final-seal` contains all five untouched original
one-case packet byte streams as gzip, 187 relevant source copies, the complete
tested-input manifest and final test logs. Each gzip is independently checked
against the original uncompressed packet digest. Every original root
`specificationSHA256` matches the retained frozen specification
`5bab5fa3fd41e4963fc28a0faa938ff271c7e2081167423177d8f0ee3ebde293`.
The final export manifest is
`f481e1fca315455f98842bc55de9885505f0302471f8eeef595710daf837dd23`.

For portable replay, retain original configs unchanged, decompress the original
packet bytes into a new directory, and create a separately named/hashed replay
config changing only their paths. Packet and source digests must stay unchanged.
Exact combined prediction bytes are additionally retained for the frozen v67
analyzers. A complete manifest does not mean every historical binary asset has
been duplicated into this physics-source seal.

Earlier v67 failures and experimental profile/pressure discrepancies remain
retained. The numerics support this prescribed-closure 1-ms problem at the stated
global norms; they do not establish first-order Marathon device accuracy.
Further device claims require matched operating points, boundary/conductivity
uncertainties and experimental agreement. Local early thermal refinement remains
separate unfinished work. No live-default promotion, deployment or fresh
browser/GPU/mobile verification was performed in this stage.

Independent reviews: [current solver](reviews/v68-current-solver.md) and
[coupled qualification](reviews/v68-coupled-qualification.md).
