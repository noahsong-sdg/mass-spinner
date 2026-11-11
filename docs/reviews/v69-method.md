# v69 thermal method review

## Final repository check evidence

I read the parent's exported final receipts and logs in
`studies/raw-start/thermal69-final-checks`, including the nested repository
receipts. These are parent safe-dev execution records, not commands run by this
reviewer. The two final wrapper commands exited 0. Their recorded constituent
checks were:

| Check | Observed result |
| --- | --- |
| v68 scientific unittest discovery | 9 passed |
| v67 transient scientific unittest discovery | 28 passed |
| `npm test` | 1,231 passed; zero failed, skipped, cancelled or todo |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0 |
| `npm run check:site` | Exit 0 |
| `npm run check:assets` | Exit 0 |

Together with the previously read v69 unit receipt (14 passed on the sealed
5134e976… snapshot), this accounts for 51 distinct scientific unit tests and
1,231 application tests. The parent identifies the final run with the same
frozen execution inputs; the final nested receipts record commands and exit
codes, while the earlier unit/source-seal evidence supplies the explicit
source identity. Reported scientific runtime versions are NumPy 2.4.6,
SciPy 1.17.1, FiPy 4.0.3 and Matplotlib 3.11.2.

The build still emits its bundle-size warning. The site check explicitly says
it checks parsed modules/resources, worker and deployment assets and is not a
browser runtime check. Asset checks establish GLB structure and authored
module/mesh presence. None of these checks establishes deployed GPU behavior,
visual correctness, browser interaction, mobile rendering, experimental
agreement or resolution of the explicitly retained local thermal diagnostics.

## Coupled study closeout: qualified scopes and retained failures

I independently read the exported conservation, comparison, endpoint,
acceptance and receipt reports using standard-library JSON/hash/arithmetic
only. Every file in the coupled and finest manifests matches its recorded
SHA-256 and byte count (38 and 16 files respectively). Manifest hashes are
`7309805aec23f06f6d8f6b54b2d5008562a0ce36038ef5378fa06ab1b6cbe2b6`
and `c8e02ed8e33c8a6f7932858f7f729f2aeccaf269c5b826aecf07537d9bd415bf`.
All report sources agree with the sealed 5134e976… snapshot. This is an
independent metadata/report review and scalar recomputation, not a second
execution of the scientific verifier or its raw-state reconstruction.

The eight case-ledger reports across the initial and coupled exports contain
2,140 accepted steps and 2,884,420 reconstructed checks. All eight pass, and all
72 declared corruption controls are rejected, including absent accepted solid
temperatures, incorrect density/inertia/spin/torque, invented heat, invalid
background-energy normalization, undeclared shear geometry and incomplete
trajectories. Maximum reported adjusted relative ledger defect is
`7.7710e-12` (electrical work), below the unchanged `1e-9` criterion. Minimum
total entropy change including coolant is positive, `1.2898e-12 J/K`, across
these reports. These controls exercise specific failure modes; they do not
establish exhaustive verifier coverage.

The previously failing gas response now passes the declared refined endpoint
test: the 2048→4096 prefix pair at 38.14697265625 microseconds has all 64 gas
cells resolved, and worst relative error `0.009164632423` (0.916463%) in cell 1.
I recomputed this as `0.00013592660627637088 K / 0.014831648450353896 K`, with
no denominator floor. The summary explicitly requires this endpoint gate for
the time comparison and reports `allRequiredGatesPassed=true`; receipt exit
code is 0. The coarser 1024→2048 pair retains exit code 1. This is measured
refinement convergence of the declared response, not experimental validation.

The exponential wall mesh's separate fixed startup endpoint at
15.2587890625 ns has surface difference `1.732223608996719e-8 K` and fine
causal excursion `1.198277277580928e-5 K`. Their recomputed ratio is
0.1445595%, passing the declared 2% endpoint criterion. At full duration the
wall-refinement global surface error is 0.0716094%, and global liner-profile
error is 0.0716158%, both below the 2% spatial gate. The accepted-study receipts
and summaries bind these declared global/fixed-response gates; their passing
status must not be generalized to every secondary diagnostic.

In particular, the refined time pair still has a **4.13017% local surface
relative discrepancy at 0.238418579 ns**, with raw difference `6.5221e-8 K`;
the reference signal is resolved and cannot be dismissed as roundoff. The
startup wall pair likewise retains a 2.38464% maximum local surface discrepancy,
despite its later fixed endpoint passing. Solid-cell local relative diagnostics
also remain unqualified: worst ratios exceed 100% for temperature excursions
around `1e-10 K`, with some unresolved differences above the declared floating
allowance. Those near-ULP tails are reported as unresolved, not proven accurate
or automatically harmless. No uniform all-time/all-cell thermal-relative
accuracy claim is justified. Fine-only times are explicitly unpaired rather
than interpolated into evidence.

The narrow conclusion is that the targeted limiting-reference, refined gas
endpoint and wall global/fixed-endpoint studies now pass while their identified
coarse and secondary failures remain visible. The production live backend and
live defaults were not changed by these studies, deployed behavior was not
verified here, and experimental/continuum qualification remains outside this
closeout.

## Independent sealed-source transport check

Using standard-library JSON, SHA-256 and streaming tar reads only, I checked
`studies/source-seal/index.json` and `tested-source.tar.gz`. Canonical compact
sorted-key serialization of all 744 indexed input hashes reproduces the common
source SHA-256 `5134e97644469f1e82ec9b04a397a4c60090532237544e4b1e9902d0f4fc173d`.
The archive is 87,913,840 bytes and independently hashes to
`7d5da33cd7f3d86b773ddb3e7824a286016cc2c85a3e280d2b21dc3a6d64b3b5`.

After explicitly accounting for the observed `source/` archive root, all 744
regular members match the index individually; there are no duplicates, missing
or additional members, hash mismatches, or nonregular members. Both historical
stage-only gate scripts are present. No member was extracted or executed.
This independently verifies the retained input capsule's byte identity and
coverage. It does not reproduce the guest computations or certify scientific
correctness of those inputs.

## Limiting benchmark packet review

I independently read the parent's exported raw benchmark, reference assessment
and receipts under `scientific/centrifuge-v44/thermal69/studies/initial`. Using
trusted Python standard-library JSON/hash/arithmetic only, I checked the raw
and assessment SHA-256 against the export manifest, checked the assessment's
raw-packet hash, and recomputed selected reported scalars. No production module,
NumPy or SciPy was imported or executed by this reviewer. The export manifest
SHA-256 is `4677a27b00472f8c08c8ac7d7688441b38d2edac463b466b8943571f0bde8660`.
Both packets attest common source snapshot
`5134e97644469f1e82ec9b04a397a4c60090532237544e4b1e9902d0f4fc173d`.

All 48 declared limiting cases completed, with 1,020 accepted steps. The
assessment receipt reports reference CLI exit code 0. Every exported step passed
the independently reconstructed heat-magnitude check, row/global energy and
entropy checks. Maximum row residual/tolerance was 0.02030, minimum entropy
increment was positive (`1.7833e-13 J/K`), and raw per-step energy differences
recomputed with standard-library arithmetic agreed with the report. Maximum
absolute global energy defect was `2.2437e-13 J`; these statements retain the
reported explicit floating allowances rather than treating stored energies as
exact real arithmetic.

For exponential-8, 128 wall cells and 64 timesteps, at 15.2587890625 ns and
61.03515625 ns respectively:

| Quantity | Earlier time | Later time |
| --- | ---: | ---: |
| Surface error / true surface response | 0.195289% | 0.195955% |
| Surface absolute error | 2.3260e-8 K | 4.6630e-8 K |
| Gas profile infinity error / maximum gas response | 0.016977% | 0.061606% |
| Gas profile infinity error | 7.8340e-6 K | 1.1011e-4 K |
| Estimated reference numerical resolution | 1.4745e-10 K | 5.3389e-10 K |

I recomputed both error/response ratios and the gas profile ratios from the raw
final gas temperatures and reference increments retained in the report. The
estimated resolution uses only 0.124% and 0.224% of the 1% surface-error budget,
well below the declared 10% reference-budget limit. Maximum eigen residual was
`2.3213e-15` relative; maximum eigen/exponential disagreement over all cases was
`5.1683e-10 K`. Agreement between related floating algorithms remains an
estimated resolution check, not a rigorous upper bound.

The exponential mesh's successive 16→64 timestep surface changes were 0.5846%
and 0.5866%; gas profile changes were 0.05085% and 0.18375%. Its 64→128 wall-cell
surface changes were 0.14455% and 0.10529%, passing the declared 2% spatial gate.
The quadratic mesh's wall changes still fail at 5.0166% and 2.6022%; all coarse
accuracy results remain in the report (36 individual surface/gas comparisons
exceed 1%). These are useful resolved failures, not deleted baselines.

The actual nonlinear W coefficient variations, recomputed across raw wall
temperatures, are at most `3.8258e-9` in Cp and `5.1110e-9` in conductivity.
This supports the use of the frozen-property graph as a limiting comparison
for these tiny wall excursions. It does not certify nonlinear error, larger
excursions, spatial gas resolution, or fully coupled species/electrical
feedback. The same exported receipt lists the separate coupled
`time512-1024` assessment with exit code 1. This limiting benchmark therefore
does not close the coupled refinement failure or qualify live defaults.

## Reference implementation closeout: unit evidence only

I read the parent's exported `scientific/fixes-v43/thermal69-unit-2.log` and
`thermal69-unit-2.receipt.json`. The parent executed the following command in its
safe-dev guest; this reviewer did not execute it:

```
/work/home/thermal-v53-venv/bin/python -m unittest discover -s scientific/thermal-local-v69 -p test_*.py
```

The log reports 14 tests passed. The receipt reports exit code 0, 744 source
inputs verified before and after execution, source root
`/work/home/fix-v43-source`, and snapshot SHA-256
`5134e97644469f1e82ec9b04a397a4c60090532237544e4b1e9902d0f4fc173d`.
This evidence covers reference fixtures, report serialization, failed CLI exit,
uncertainty veto and exported heat checks. It does not establish that the
48-case limiting benchmark or coupled refinement studies pass; their actual
packets remain to be reviewed.

The implementation's eigen/exponential agreement plus floating arithmetic
allowance estimates numerical resolution of the frozen-property graph. It is
not a certified bound on that graph's exact solution, and is neither a
nonlinear-model nor a continuum error bound. The prospective requirement that
this estimate use at most 10% of the 1% external response-error budget is a
numerical qualification criterion. It does not certify complete physical
accuracy. Actual tungsten property variation, independent spatial convergence,
and the separately gated coupled interior gas response remain necessary.

10 November 2026. Independent source/method review. This reviewer read the
thermal, spatial-coupling and v68 protocol/report sources and primary numerical
documentation. No project, scientific or dependency code was executed by this
reviewer; the parent alone owns safe-dev execution and synchronization. No
production executable files were edited. After the initial method review, this
reviewer authored the independent `reference.py` and `test_reference.py` files;
their execution remained exclusively with the parent in safe-dev.

## What the checked path actually does

`createFuelSpatialStepper` owns a copied setup and one reusable electrical
problem. Each accepted `advance` obtains species fluxes, projected electrical
torque/Joule power and endpoint momentum from the same source callback. The
mixture thermal solve reevaluates that callback at candidate gas temperatures.
Accepted gas/solid energies use the final temperature and species inventories.

`advanceFuelMixtureThermal` is a conservative backward-Euler endpoint balance.
It solves temperatures using a damped approximate Newton iteration, with gas
conductivity and solid properties reevaluated at the candidate temperature.
Internal thermal and species-enthalpy fluxes appear equal and opposite in
adjacent cells. The reciprocal-logarithmic-mean transported temperature, the
source/momentum fixed point and their ledgers are separate from the thermal
iteration's linearization. The local Jacobian is not generally an M-matrix;
the source comment correctly does not claim one for central enthalpy transport.

The wall has logarithmic half-cell resistances and exact annular masses. The
gas has equal-volume radial cells. Physical wall surface temperature is a
reconstruction at the common radius, not the first solid cell's temperature.
`createFuelLiner` currently accepts at most 128 cells. Enlarging that supported
domain or changing equal-volume gas geometry is separate work, not an implicit
part of a timestep wrapper.

The v68 report's observed distinctions are essential: global time and space
gates pass, but the first shared surface response differs by 4.64% in time and
5.51% in wall space; the latter occurs at about 15 ns. A gas cell's 14.8%
time-relative difference at about 38 microseconds is only 0.00217 K but is above
the stated roundoff threshold. It cannot be dismissed as floating noise or
automatically attributed to the same initial boundary singularity.

## Smallest defensible next experiment

First isolate time integration on a fixed spatial graph. Freeze positive gas
and wall heat capacities, conductivities, film conductance and species counts;
disable species transport and electrical/mechanical sources for this reference
problem only. The resulting finite-volume thermal system is

```
C dT/dt = -K T + b,
```

where C is a positive diagonal heat-capacity matrix and K is the symmetric
conductance graph Laplacian, with external cooling added to its boundary row.
For a closed gas/wall pair use b=0. This is a deliberately restricted diagnostic,
not a substitute model or evidence that nonlinear mixture coupling is correct.

The existing SciPy runtime can supply an independent, effectively exact-in-time
semidiscrete reference. At the current small graph sizes, generalized symmetric
`scipy.linalg.eigh(K,C)` uses LAPACK and gives `K v=lambda C v`. Evolve deviations
with `exp(-lambda*t)`, using the C-weighted eigenvectors. For a closed system,
remove the conserved C-weighted mean analytically before evolving the remaining
deviation. Avoid propagating the 1200 K background and mistaking near-zero
eigenvalue roundoff for real drift. The [SciPy eigh documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.eigh.html)
specifies the generalized problem, positive-definite mass matrix and LAPACK
drivers. A dense `scipy.linalg.expm` comparison at selected times supplies a
second floating reference; neither should be labeled exact without measured
residual/conservation checks.

`scipy.sparse.linalg.expm_multiply` is another established action-of-exponential
implementation, documented by [SciPy](https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.linalg.expm_multiply.html).
Its cost must be measured on this strongly graded stiff graph; it should not
be assumed cheap simply because the matrix is sparse. A small dense symmetric
factorization is a reasonable first diagnostic, not a proposed live replacement.

Compare backward-Euler results with the reference on the **same** graph at the
same fixed physical times. Then change wall space while holding the reference's
time error negligible. This distinguishes temporal error from surface spatial
reconstruction error. Do not halve time and space together and assign their
combined difference to one axis.

The output at t=0 needs explicit care. Initialized uniform-solid surface
temperature and the finite-cell algebraic reconstruction with nonzero film flux
need not be identical. Retain both. Same-graph time error compares the same
reconstruction on both sides; continuum-facing spatial checks retain the actual
initialized surface and report the algebraic offset separately. Changing the
reference baseline to erase that offset would not resolve it.

As a second external check, use the constant-coefficient planar semi-infinite
diffusion problem in the shallow-layer limit. The [NIST FiPy diffusion example](https://pages.nist.gov/fipy/en/latest/generated/examples.diffusion.mesh1D.html)
checks an error-function transient. Its fixed-temperature boundary is not our
finite-film, finite-gas boundary. It can qualify the conduction discretization
under a separately declared boundary condition; it cannot be inserted as the
analytic answer for the coupled experiment. For the actual Robin/finite-film
startup, a separate correct boundary solution or independent spatial code is
required. The familiar penetration scale `sqrt(alpha*t)` is a derived diagnostic,
not proof that any particular mesh resolves the wall trace.

## Narrow candidate after that diagnosis: real BE substeps

For a macro interval h, starting from exactly the same canonical state, compute

```
coarse = BE(state, h)
middle = BE(state, h/2)
fine   = BE(middle, h/2)
```

For smooth, fixed-grid solutions, the two-half-step error estimate for p=1 is
`fine-coarse` divided by `2^p-1`, which is simply `fine-coarse`. This is a
local estimate, not a bound on accumulated error, and its asymptotic premise
must be checked near startup. A finite spatial graph is an ODE, but its earliest
resolved time scale changes with mesh; a controller can accurately integrate
the wrong spatial approximation.

When accepted, use the two actual half steps and retain their individual states,
durations, source fields, electrical outputs and energy/entropy ledgers. The
discarded coarse trial must not advance the canonical state. A copied prior
potential is only an initial guess and must continue to pass the actual new-RHS
residual check. Exporting an aggregate of two half steps as if it were a single
backward-Euler endpoint would invalidate the current independent auditor: the
first half's flux/work was evaluated at its own endpoint. Summed external work
and heat are valid accumulated quantities, but the two numerical transitions
remain distinct.

Do **not** accept `2*fine-coarse` as a Richardson-corrected physical state.
That extrapolation can leave positive species/energy domains and does not
inherit either half-step's conservative work/entropy identity. Likewise,
Crank–Nicolson or BDF2 order/stability alone does not establish positivity,
monotonicity, nonlinear heat balance or the existing mechanical ledger. Reusing
the qualified BE kernel is the smaller coherent change; changing integrators
requires a new structure-preservation derivation and validation family.

This is method reuse rather than a claim that PETSc or CVODE is running in the
TypeScript path. [PETSc TS](https://petsc.org/main/manual/ts/) describes the
semidiscrete mass-matrix formulation and local-error-controlled step selection.
[SUNDIALS CVODE](https://sundials.readthedocs.io/en/latest/cvode/Mathematics_link.html)
uses variable-step/order BDF for stiff systems and component absolute/relative
error weights. Those expert implementations are useful independent references
and possible later backends, but replacing this coupled endpoint kernel with
one is a broader task than adding a verified substep controller.

## Error scales and acceptance gates

An absolute-temperature relative norm alone can hide a microkelvin surface
error against a 1200 K background. Conversely, forcing a relative ratio on
an unresolved 1e-10 K excursion can cause endless refinement. A controller's
explicit absolute accuracy targets are not positive denominator floors in the
external response-relative study. Keep those two roles separate.

Use a maximum over physical observable blocks, not an RMS that lets many quiet
wall cells dilute one gas-cell error. Reconstruct each trial's canonical gas
temperature using **that trial's** species counts and energy. Comparing raw gas
energy alone confounds temperature and inventory changes. Include physical
surface temperature separately from solid cell temperatures; preserve rotation
and individual species/CDF controls so a thermal controller does not neglect
the coupled state. Declare all absolute/relative controller targets before
scoring and report which block limited each accepted interval.

Proposed gates, to freeze before new numerical scoring:

1. Fixed-graph reference: finite positive C/conductances, symmetric K, expected
   K row sums, eigensystem residual and agreement of two independent reference
   evaluations. Require reference uncertainty below 10% of every claimed
   measured defect; otherwise mark that comparison unresolved.
2. Every accepted substep: unchanged independent particle, angular momentum,
   electrical charge/work, positive Joule/shear heat, canonical energy and
   conditional entropy checks. No relaxation of the existing 1e-9 identities,
   original source/endpoint fixed point or explicit floating allowances.
3. Output support: actual durations sum to each requested macro endpoint;
   checkpoints are hit exactly to the existing binary64 support criterion.
   No interpolation in strict refinement comparisons. Report rejected trials
   and fine-only accepted times separately, without treating them as compared.
4. Time refinement: retain all v67/v68 primary, physical-surface and electrical
   gates, plus the existing 1% time-relative local-response diagnostic wherever
   its reference is resolved. Retain zero/near-roundoff cases as unqualified;
   do not turn a controller's absolute target into an external automatic pass.
5. Spatial refinement: preserve the existing 2% spatial and local-response
   criteria at fixed physical checkpoints, along with all-shared-time maxima.
   Additional time substeps do not qualify a failing wall-space comparison.
6. Full coupling: rerun the actual worst gas-cell history, not only the frozen
   thermal experiment. Report raw error, causal excursion, location/time and
   source/work histories. Its 38-microsecond failure may involve changing
   transport/work as well as heat conduction; source-only and frozen-transport
   ablations diagnose causes but cannot replace the coupled acceptance run.

Until those experiments execute, the recommendation is source-derived. No
remaining v68 local failure is declared fixed, and no live/default, experimental
or Marathon device-fidelity acceptance follows from this method review.
