# V107: resolve the radial response before changing the physics

Status: five of nine full-clock trajectories have completed. The full radial
audit has one genuine failure: the 4 µs density-increment discrepancy is
5.595688%, above the unchanged 5% limit. Radial velocity passes at every clock;
the three-level timestep study still passes. A separate
initial-clock diagnostic records two strict-contraction failures at roundoff
scale; full qualification remains incomplete. Earlier bounded
1 microsecond radial and axial checks pass with corrected comparison arithmetic.
This is research-backend qualification, not an update to the live playground.

The subsequent [saved-state ring diagnosis](RING-DIAGNOSIS-V107.md) traces the
late feature's radial/axial mass fluxes without changing the solver. Its
independent reviews support unresolved evolving gradients; the density gate
still fails and no unique faulty operator has been established.

## Question and cause

V106 corrected a reproduced heat-discretization artifact, but retained six
density/radial-flow spatial failures. At fixed 48 axial cells, doubling radial
cells from 80 to 160 reduced the 1 microsecond density-increment discrepancy
from 20.270583% to 7.451522%, and radial-velocity discrepancy from 6.948714%
to 2.103733%. Density still exceeded the unchanged 5% gate.

The evidence establishes radial sensitivity, not a unique remaining flux bug.
Each mesh also recomputes its initial steady torsion; discretization of that
initializer and subsequent dynamics both enter the comparison. In simple
terms, smaller cells substantially improve agreement, but the initial state
is also being represented more accurately. One cannot assign all improvement
to a single operator.

The smallest justified next step is another radial doubling, separate axial
and timestep checks, then joint refinement across every original reporting
clock. Changing transport coefficients, smoothing initial data, moving mesh
cuts or adding density diffusion would change the question before resolving
it. No producing equation changes in V107.

## Fixed study

The [protocol](scientific/refinement-v107/PROTOCOL.md) was frozen before new
trajectory output. All nine full jobs report 0/1/2/4 microseconds:

- Radial sequence: refinement 4/8/16 at axial refinement 2, CFL 0.1.
- Time sequence: radial 8, axial 2, CFL 0.2/0.1/0.05.
- Axial sequence: radial 8, axial 1/2/4, CFL 0.1.
- Joint sequence: radial/axial 4/1, 8/2, 16/4, CFL 0.1.
- Supplemental fine axial pair: radial 16, axial 2/4.

The overlapping jobs are counted once. Radial refinement 16 means 320 cells;
axial refinement 2 means 48 cells. The V101 mesh mapping, cuts, physical
inputs, 100 ns cap, current condition, reconstruction, source balance,
stationary walls and FiPy heat solver remain unchanged. Full initial conserved
states and every accepted timestep are retained.

The short 0/1 microsecond preflights establish resource feasibility and allow
bounded comparisons. They cannot pass the full matrix. All geometries have
a declared 1 GiB budget except 320 by 96, declared 2 GiB before execution.
An unchanged-physics 320 by 48 one-cycle probe reached 631,048 KiB; doubling
axial cells plausibly exceeds 1 GiB. Resource planning changes no physics gate.

## Checker change and checks

The old checker hard-coded one five-case grid schedule. Reusing it for the
new directional schedules required explicit jobs, clocks and comparison
groups. Its formulas, 5% spatial/2% temporal limits, contraction, exact-panel
quadrature, clock, positivity and conservation checks remain fixed. Missing
comparison groups explicitly fail; they cannot create an empty pass.

This small layout hook keeps one implementation of the established metrics.
A separate rewritten checker would risk accidental disagreement in norms or
thresholds. The V107 adapter admits actual geometry, seals, physical inputs,
preflight lineage and the complete nine-job inventory independently.

Inside the offline 1 GiB safe-dev VM:

- `python -m unittest discover -s scientific/refinement-v107 -p test_audit107.py -v`:
  **10/10 passed**. Includes stale data/source/geometry/clock mutations, a real
  conserved-state failure, missing preflights, resource profiles, layout
  equivalence and a genuine FiPy state/receipt equality check.
- Original V106 saved-state audit replay: **exact nested equality except the
  checker file hash**, preserving all six failures. This is an actual data
  replay, separate from synthetic unit fixtures.
- Logging at its 256th-step branch: **bitwise identical state and every
  receipt field** against the unwrapped heat method.

The tested 107-input transfer manifest is
`31d24d7550a869e830e561c5276270b8daedeb8b948da30c54107cb801997cef`.
All solver and test execution was inside safe-dev. Reviewers used trusted
host artifact reads, hashing and arithmetic; they did not rerun the PDE.

## First measured result

At fixed 48 axial cells and 1 microsecond, all five fields and two increment
metrics pass the existing radial refinement, contraction and quadrature gates.
The saved states also pass the original clock, primitive, torque, positivity
and conservation checks. The independent auditor reports no failed gates
within this bounded preflight, **PENDING** overall and no full-matrix pass.

| Radial cell comparison | Density increment | Radial velocity |
|---|---:|---:|
| 40 to 80, V106 | 20.270583% | 6.948714% |
| 80 to 160, V106 | 7.451522% | 2.103733% |
| 160 to 320, V107 | **2.381344%** | **0.486684%** |

The unchanged spatial limit is 5%. Density uses the finer **increment** norm;
radial velocity uses the finer **combined meridional velocity** norm. These
are discrete-solution differences, not experimental errors or proven
continuum-error bounds. Temperature-increment discrepancy is 0.317654%,
angular-speed discrepancy 0.093374%, and axial-velocity discrepancy 0.131063%.

The 320 by 48 trajectory used 2,839 steps, 1,114.87 s and 660,612 KiB peak RSS.
Its peak temperature was 233,957.72 K. The prediction packet is sealed by
`4991334e3b566f49e56db3b6ed058f9878fb6f4480dcd778c43369c7ef0a952d`;
the independent audit by
`907f8bf06ca38f183ed2edcfea345723821910b4be1d522446ef755a296438b3`.
The original six full-matrix failures remain unchanged and separately retained.

The preflight audit records 31,122 gates with zero failures. Its
`missingFullJobs` metadata lists six entries because it subtracts three
short-run radial records. **All nine full-clock jobs remain pending**; those
short records are not completed full jobs. The phase/full-pass logic correctly
keeps qualification pending. This reporting caveat is preserved explicitly;
the sealed historical artifact is not rewritten.

Independent [metric/evidence review](scientific/refinement-v107/REVIEW-PREFLIGHT.md)
and [physical-state review](scientific/refinement-v107/REVIEW-RESULT-PHYSICS.md)
checked the actual archives and receipts. All 226 exported scientific payload
hashes and six application-check payload hashes were verified after transport.
`npm run typecheck`, `npm run build`, `npm run check:site` and
`npm run check:assets` all passed in the separate offline 1 GiB application VM,
against the unchanged 330-input app snapshot
`47201c00b9770bd6daf5c11b3fafa39b68adcd046bb2d48c519de064aff5fc3e`.
This is not browser or deployment verification.

## Axial follow-up: physical differences pass, checker fails near zero

The separate 160 by 96 preflight completed in 810.28 s, with 1,661 steps and
657,884 KiB peak RSS. At 1 microsecond, doubling axial rows from 48 to 96
gives density-increment discrepancy **3.009840%**, radial velocity **0.994207%**
and axial velocity **1.405413%**. All seven physical comparison metrics are
below the unchanged 5% pair limit. This pair alone establishes no axial order
or contraction rate; the planned three-level study is still required.

The combined raw audit nevertheless records **FAIL: 2 of 41,138 gates fail**.
Both failures are initial-clock quadrature checks on error integrals near
roundoff: density about 3e-42, temperature about 6.7e-28. The relative order
2/3 spreads are 2.747682% and 0.258447%, exceeding 1e-10. Other state,
conservation and refinement checks pass; full qualification remains PENDING.

The checker separately rounds two almost equal interpolated profiles, then
subtracts them. That cancellation is as large as the actual initial density
and temperature differences, so the resulting sampled roundoff no longer
behaves like the exact bilinear difference polynomial. Raw initial axial
spreads are at most 1.08e-19 kg/m3 and 3.64e-12 K. This explanation does not
apply to initial angular speed: its mesh dependence is real. No errors are
clipped, no threshold changed, and the failed audit is retained. A separate
high-precision difference-polynomial diagnostic confirms the cancellation.

Prediction seal:
`9c071da189b7390b846d9925c2aa5d6ace484ba7ed37d66e9ee1d16152c971b6`.
Combined raw audit seal:
`19b36780162a19d8d7e52f4f8fd6902fc61ea0644797dfd6807384613495c845`.
See the independent [axial review](scientific/refinement-v107/REVIEW-AXIAL.md).

## Corrected checker and independent validation

The [stable norm](scientific/refinement-v107/METHOD-NORMS.md) subtracts exact
rational Q1 interpolants on their common knot grid, then evaluates the small
difference with the existing SciPy interpolation and Gaussian quadrature.
This preserves the observable, boundary padding, increment/reference norms and
every threshold. It fixes the arithmetic for all five fields without tiny-error
clipping, special initial-clock rules, or an adaptive tolerance.

The separate 40/60-digit Decimal mass-matrix and Gaussian witnesses agree on
nonzero initial norms: density 1.6910590268e-43 and temperature 3.2718964386e-28.
Their precision refinements agree around 2e-25. The stable binary64 panel
calculation agrees with that independent reference within about 5e-15 relative.
The combined corrected audit records **41,138 gates, zero failures, PENDING**.
All gate identities/limits and every non-norm gate match the raw failed audit;
the original full-clock study still has precisely its six genuine failures.

The explicit [replay entry point](scientific/refinement-v107/stable_audit107.py)
writes `stable-audit.json`, sealing the norm implementation separately from the
unchanged producer. The component `audit.json` is intermediate. Its derived
full-job list correctly requires all nine jobs; the old short-record key list
is retained separately. An optional prior-audit link preserves earlier failures
only after verifying it describes the same sealed case packets.

The norm controls pass 7/7, and the independent Decimal controls pass 5/5.
Legacy-plus-preflight replay took 43.54 s and 396,132 KiB peak RSS in a 1 GiB
offline VM, on the 111-input snapshot
`8a1e19b531b89709df3fa145144cf367c4cc79d01bc78a6032cb2ab0292b1362`.
The corrected audit seal is
`1c9cc7034257079b264015bdaf0c70b5022d27bf164f3bd9e8b4436feeba4793`.
Independent [implementation/evidence review](scientific/refinement-v107/REVIEW-STABLE.md)
and [physics review](scientific/refinement-v107/REVIEW-STABLE-PHYSICS.md) inspected
the actual data, numerical references and provenance. These are scoped reviews
of the retained-field calculation, not independent reproductions of the PDE.

The reusable entry point passed 4/4 lifecycle/reporting controls and reproduced
all 41,138 prior corrected gate values exactly on the actual saved fields. This
replay took 27.19 s and 308,296 KiB peak RSS. Its 113-input source snapshot is
`993dc1e78b42aefa79c8261f6b335115ad4476ed06a5f8304a0a214e6a4e6836`;
the canonical `stable-audit.json` seal is
`c7981440c34f49fafd3b3a33847822de2e4843f30335327b0cacbb8807e3a0a9`.
The 26 targeted controls (10 admission, 5 Decimal, 7 norm, 4 entry) and the
four application checks above all passed in the recorded isolated snapshots.
The additional test commands, using `/work/home/v90-venv/bin/python`, were:

```sh
python -m unittest discover -s scientific/refinement-v107 -p test_precision107.py -v
python -m unittest discover -s scientific/refinement-v107 -p test_stable107.py -v
python -m unittest discover -s scientific/refinement-v107 -p test_stable_entry107.py -v
```

Both unsuccessful verification attempts are retained. The first Decimal unit
test requested more relative digits than its working precision could retain
after cancellation; the corrected test budgets precision explicitly, without
changing the scientific 1e-10 gate. The first entry replay passed its four
controls but its outer comparison driver compared integer dictionary keys with
JSON string keys. Canonicalizing the driver's comparison fixed that mismatch;
the entry and norm source snapshots were unchanged between attempts.

## Finest resource preflight

All three declared 0/1 microsecond resource preflights are now complete.
The 320 by 96 case took 2,997 steps, 3,869.50 s and 1,221,720 KiB peak RSS,
within its predeclared 2 GiB limit. Peak temperature was 234,263.28 K.
Its prediction seal is
`f84e8380ef3d8ccbb6e1d695fb2d165ef8cdb4557cc445f42b2e3aecce363a85`;
the producing 107-input snapshot above is unchanged.

At fixed 320 radial cells, doubling axial rows from 48 to 96 gives, at
1 microsecond:

| Observable | Relative discrepancy |
|---|---:|
| Density increment | **3.020112%** |
| Radial velocity | **0.999464%** |
| Axial velocity | **1.406756%** |
| Temperature increment | 0.630975% |
| Angular speed | 0.303059% |

All seven comparison metrics pass the unchanged 5% pair gate. The combined
radial/axial preflight replay contains 59,170 gates with zero failures,
**PENDING** status and no full-matrix pass. These are predominantly step and
state checks, not 59,170 independent validations of experimental accuracy.
It took 57.60 s and 329,292 KiB peak RSS in the offline 1 GiB VM, on the
unchanged 113-input checker snapshot. The final audit seal is
`f98a4b0d9bb41de3363412706db63693af97cf0c38c1732402afc6c4d00f66b5`.
Its exact driver is separately sealed in the execution receipt and summary.
The [metrics/provenance review](scientific/refinement-v107/REVIEW-FINEST-METRICS.md)
and [physics review](scientific/refinement-v107/REVIEW-FINEST-PHYSICS.md) inspect
these actual artifacts; all 257 exported payload hashes were verified.

This adds a second two-level axial check, not joint contraction or timestep
qualification. At that preflight checkpoint, all nine full-clock jobs were unrun.

## Full-clock follow-up: three trajectories and an initial-clock blocker

Three fresh trajectories now retain all 0/1/2/4 microsecond snapshots:

| Geometry and CFL | Accepted steps | Runtime | Peak RSS |
|---|---:|---:|---:|
| 80 × 48, 0.1 | 5,541 | 430.66 s | 256,848 KiB |
| 160 × 48, 0.2 | 4,968 | 909.47 s | 399,612 KiB |
| 160 × 48, 0.1 | 9,937 | 1,863.31 s | 405,496 KiB |

All used the unchanged 107-input producer, offline 1 GiB VM and frozen inputs.
The [independent physical-state review](scientific/refinement-v107/REVIEW-FULL-PARTIAL-PHYSICS.md)
checks their actual clocks, positive states and conserved ledgers. Completing
these trajectories is not a three-level finite-time convergence result. Six
full jobs, including CFL 0.05, remain unrun at this checkpoint.

Before the expensive remaining spatial runs, a supplemental diagnostic calls
the unchanged initializer at 160 × 24 and compares its initial state against
the saved 160 × 48 full trajectory and 160 × 96 preflight. It performs no time
evolution. The original seven metrics, 5% spatial limit, strict contraction
predicate and 1e-10 panel-quadrature limit are retained:

| Initial observable | 24 → 48 axial rows | 48 → 96 axial rows | Contraction |
|---|---:|---:|---|
| Density | 3.1657282913e-17 | 3.2017901568e-17 | **FAIL** |
| Temperature | 1.1685076934e-16 | 1.1776439379e-16 | **FAIL** |
| Angular speed | 1.333934% | 0.321075% | PASS |

There are **40 passing and 2 failing diagnostic checks**. All 28 panel checks
pass; this differs from the earlier corrected interpolant cancellation bug.
The stable norm faithfully measures the tiny saved-state differences.

The cause is extensive-to-primitive roundoff. The prescribed initial density
and temperature depend only on radius, but storing mass as density times cell
volume and recovering it by division loses last bits differently across axial
cells. Temperature also subtracts swirl kinetic energy from total energy.
Independent arithmetic reproduces both effects from saved conserved fields.
In simple terms, these failures measure rounding in the initial encoding,
before heat or flow evolves. Initial rotation has genuine two-dimensional
electrode/endwall dependence and must not be forced uniform.

No equation or gate was changed to make these failures pass. With this same
initializer, environment and retained initial clock, extending trajectories
cannot remove this specific obstacle to the frozen full-matrix PASS. This is
an execution-path inference backed by the diagnostic, not an executed complete
matrix audit. The remaining finite-time density/flow convergence is unscored.
The next useful computation is the final CFL 0.05 trajectory and declared
three-level timestep audit before additional expensive spatial work.

The [metric author review](scientific/refinement-v107/REVIEW-FULL-PARTIAL-METRICS.md)
discloses its authorship; a separate [independent review](scientific/refinement-v107/REVIEW-Q0-INDEPENDENT.md)
checks source/geometry consistency, packet seals and the contraction arithmetic.
All 277 exported payload hashes were verified (82,474,219 bytes). The diagnostic
JSON seal is `7bd41151c8d843acd238af9c64f92652c0b6696612409d0ff11fa967e93e773d`;
its [exact driver](scientific/refinement-v107/q0_diagnostic107.py) and
[transport controller](scientific/refinement-v107/run_q0_diagnostic107.py) are retained.
The diagnostic executed in 6.83 s; exit zero means successful execution, while
its two scientific checks explicitly fail. No experimental or live-playground
qualification follows.

## Complete timestep triple

The fresh 160 × 48, CFL 0.05 trajectory reached 0/1/2/4 microseconds with
19,874 accepted steps, 3,630.75 s runtime and 415,416 KiB peak RSS. Its
prediction seal is `258db38c8b84584101ff26124eeb0a194d0842b119ebcfaecbcd2cc4961fab36`.
It used the same producer and original initializer, not checkpoint continuation.

The frozen stable auditor admitted all four completed full trajectories and
scored the complete CFL 0.2/0.1/0.05 triple. All **28 field/time comparisons**
pass the original 2% timestep limit and contraction rule, with panel checks
unchanged. Representative middle-to-fine discrepancies are:

| Time | Density increment | Radial velocity | Temperature increment |
|---|---:|---:|---:|
| 1 microsecond | 0.082646% | 0.040431% | 0.014397% |
| 2 microseconds | 0.033985% | 0.016865% | 0.012008% |
| 4 microseconds | 0.014614% | 0.007790% | 0.003287% |

The largest fine timestep discrepancy is 0.082646%, in the 1 microsecond
density increment. The audit records **242,154 checks, zero failures**, and
`caseAdmissionPass: true`. Most checks are repeated step/state/ledger checks,
not independent physics validations. Analysis took 18.55 s and 437,132 KiB
peak RSS in the offline, explicitly selected 2 GiB VM.
The audit seal is `8d85807cb41344ff98b88b791d13a79e9e316694684bd217def84938bd8eb669`.

Its overall status and qualification remain **PENDING**, with
`fullDeclaredMatrixPass: false`. The five absent full jobs are r4-z1,
r8-z1, r8-z4, r16-z2 and r16-z4, all at CFL 0.1. Their spatial comparisons
have not been scored. The separate two-failure axial initial-clock diagnostic
and the historical six V106 failures remain retained; the successful temporal
subset supersedes neither. At that checkpoint, remaining spatial runs were paused:
extending these trajectories cannot remove the initial-clock obstacle under
the frozen rules. No physics or threshold was changed to turn it into a pass.

All **288** exported scientific payload hashes were verified (183,189,157
bytes), together with all six final application-check artifacts. The application
source still matches the unchanged 330-input snapshot above. Final commands
`npm run typecheck`, `npm run build`, `npm run check:site` and
`npm run check:assets` all passed in its offline 1 GiB VM. This is not a
deployment or live-model verification.

The [timestep metric review](scientific/refinement-v107/REVIEW-TIMESTEP-METRICS.md)
rechecks the actual predicates and reports its authorship limitations. The
[independent physics review](scientific/refinement-v107/REVIEW-TIMESTEP-PHYSICS.md)
checks the new trajectory and physical interpretation. Large artifact reads
were serialized to limit host memory. The exact audit controller is retained
as [run_timestep_audit107.py](scientific/refinement-v107/run_timestep_audit107.py).
Raw scientific/application evidence, source, drivers and SHA256 sums are in the
[research prerelease](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v107-timestep-study).

## Full radial trajectory

The initial-clock [roundoff disposition](scientific/refinement-v107/ROUNDING-DISPOSITION.md)
retains the two failed predicates while separating them from finite-time
spatial evidence. It changes no norm, threshold, equation or saved state.
The finest radial trajectory therefore proceeded under the frozen protocol.

The new 320 × 48, CFL 0.1 case reached every declared clock through 4 µs in
**18,757 steps**, **7,450.81 s** and **695,216 KiB** peak worker RSS, within
its original 1 GiB budget. Peak temperature was **618,203.01 K**. Its sealed
prediction is `786b52edf45d1436665bab421b8131f60b932accdb240ad475b9acbbfb8e9a61`.
The producing source transfer remains unchanged. This completed trajectory
permits the radial triple to be scored at all four reporting clocks.
Four full jobs remain absent: r4-z1,
r8-z1, r8-z4 and r16-z4, all at CFL 0.1.

The unchanged saved-field audit admits all five cases, scores both radial and
timestep layouts, and reports **354,880 checks with one failure**. Most are
repeated step/ledger checks, not independent validations. All contraction and
panel-quadrature predicates pass. Its verdict is **FAIL**, qualification is
**PENDING**, and `fullDeclaredMatrixPass` remains false. Analysis took 49.88 s
and 567,544 KiB peak RSS in the offline 1 GiB VM. The audit seal is
`f63ed0efb04ad2a632ffddc4b2074755d5424b5d2d5490ad6f00ea9a3661cbd5`.

| Time | Density increment, 80 → 160 | Density increment, 160 → 320 | Radial velocity, 160 → 320 |
|---|---:|---:|---:|
| 1 µs | 7.451522% | 2.381344% | 0.486684% |
| 2 µs | 9.795787% | 3.166139% | 0.977785% |
| 4 µs | 13.444051% | **5.595688% — FAIL** | 1.815158% |

The 4 µs density response contracts but still misses the declared limit. Its
total-density discrepancy is 0.127543%; that smaller number does not replace
the increment gate. The fixed-grid timestep comparisons retain their earlier
values; their largest fine change is 0.082646%. This does not independently
qualify time accuracy on 320 × 48 cells. The six historical V106 failures and
the two separate axial initial-clock failures remain preserved.

A read-only localization reuses the frozen exact-Q1 difference and order-2
Gaussian weights. It reproduces both 4 µs density-increment error integrals
exactly in the recorded binary64 calculation; summing panel contributions
differs by at most 9.15e-16 relative. The largest fine-pair contributions lie
around r = 16–19 mm and z = 225–237 mm. These are interpolation-panel bounds,
not original cell boundaries. Concentration identifies a region for diagnosis;
it does not establish a flux, heat-source or boundary-condition defect.

Next, evaluate the original instantaneous radial/axial mass fluxes and
pressure/velocity gradients across the ring on saved states. Electrical and
diffusion sources alter momentum and energy; mass evolves through Euler face fluxes. Accumulated
operator attribution requires a separately sealed instrumented run. The
mesh-dependent initial torsion also needs to remain explicit. Neither simply
adding density diffusion nor another blind doubling is a demonstrated fix.

The independent [physical-state review](scientific/refinement-v107/REVIEW-RADIAL-PHYSICS.md)
reconstructs saved primitives and exposure budgets from conserved states. The
[metric/provenance review](scientific/refinement-v107/REVIEW-RADIAL-METRICS.md)
checks all predicates, seals and unchanged earlier comparisons, with its
implementation authorship disclosed. Neither reviewer reran the PDE.

## Reference-domain exposure

The independent [closure review](scientific/refinement-v107/REVIEW-CLOSURE-SCOPE.md)
distinguishes the constant transport law from the cited neutral-Ar property
reference's 84–10,000 K range. The new read-only diagnostic reconstructs the
saved conserved-to-primitive identities exactly and changes no fields or gates.
All four analytic/seal/stale-state controls pass inside the offline 1 GiB VM,
including nonzero meridional motion and negative angular momentum.

At 4 µs, the 320 × 48 case's cells above 10,000 K contain:

| Discrete budget | Fraction |
|---|---:|
| Volume | 1.925834% |
| Mass | 0.588017% |
| Heavy-fluid thermal energy | 5.462114% |
| Rotational inertia | 0.045093% |
| Absolute angular momentum | 0.262850% |
| Swirl kinetic energy | 0.947876% |

No saved cells are below 84 K; initial cells are below 10,000 K. The final
temperature maximum lies in the axis-adjacent cell at z = 239.059–240 mm.
The 160 × 48, CFL 0.05 comparison gives 0.573153% exposed mass and 5.405682%
thermal energy. These are descriptive exposures, not another convergence gate.

Neither the remaining mass inside the reference interval nor a small hot mass
fraction validates the constant coefficients or plasma closure. Stored thermal
energy is not cumulative Joule deposition, and localized current/shear regions
can influence global flow. No observable-error bound or constitutive
sensitivity solve has been established. The two diagnostic reads took
0.19/0.25 s and 119,568/154,464 KiB peak RSS. Their output seals are
`5269bbbc13d70cca64db1460c5f220a28bb2d8709605706ee1ca69ebe32912ec`
and `e885bc8b2d6754d31a10ce66ae8135e668f4681d080b13bc37a232e5da5fc8ca`.

The diagnostic addresses an interpretation gap: a temperature maximum says
nothing about how much material or energy is exposed. In ordinary terms,
one very hot cell and a hot bulk gas are different situations. It computes
weighted budgets directly from sealed conserved states, rather than changing
coefficients or treating the reference interval as a plasma-validity switch.
This is the smallest justified addition; it does not fix the density failure.

## Latest checks and reproduction

The closure diagnostic and regression controls were transferred byte-for-byte
into `/work/project/v107-closure01`. The offline 1 GiB VM ran
`/work/home/v90-venv/bin/python -m unittest discover -s /work/project/v107-closure01 -p test_closure_exposure107.py -v`:
**4/4 passed**. Source/test SHA256 values are
`59909c543e53e6c141a087b6793e4c91581b6d711d1cafd6a836b30afd4b3a67`
and `62f778c42e8a6ac011e971e68f044bec7c8e57e815cc2c45ef7f9f7b567b5453`.
Actual controllers, commands, logs, environment records and execution receipts
are retained, including the separate full-case and five-case audit invocations.
Process exit 0 does not override the scientific audit's **FAIL** verdict.

All **314 scientific payload hashes** (331,536,547 bytes) and six application
check payloads were verified after export. Independent metric review repeated
all 314 science hashes. The unchanged 330-input application snapshot above
again passed `npm run typecheck`, `npm run build`, `npm run check:site` and
`npm run check:assets` in its separate offline 1 GiB VM. A fresh host manifest
comparison found zero changed application inputs. No browser verification or
deployment was performed in this study.

The [radial-study prerelease](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v107-radial-study)
contains the new source/evidence, application checks, controllers and checksums.
It also requires frozen inputs from the earlier
[V106 release](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v106-density-flow-refinement):
`source-heat-evidence.tar.gz` supplies `v106-candidate02/results/` and
`v106-cross01/results/`; `radial-refinement-evidence.tar.gz` supplies
`v106-radial01/results/`. Preserve those directory names under `/work/project`
in an isolated environment, verify each release's `SHA256SUMS`, and use the
recorded guest dependency environment. The new archive alone is not a
self-contained rerun environment; the controllers record the original paths.

## Interpretation limits

A complete passing V107 matrix would establish agreement under these declared
refinements for this short, prescribed-current, closed transient. Its temporal
sequence would check radial 8/axial 2 independently; it would not establish
finest-grid time accuracy. An acoustic stability bound cannot establish
implicit-source or operator-splitting accuracy.

The original six failures remain preserved as historical results. Neither
self-convergence nor conserved ledgers establish experimental accuracy.
The hot prescribed neutral/transport closure remains physically conditional;
this study does not validate a Marathon apparatus, a steady argon experiment,
or the deployed playground.
