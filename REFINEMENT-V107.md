# V107: resolve the radial response before changing the physics

Status: the 1 microsecond radial preflight passes its unchanged checks;
the complete nine-job refinement study remains pending.
This is research-backend qualification, not an update to the live playground.

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
No host scientific execution was used.

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
Its peak temperature was 233,957.72 K. The field/prediction packet is sealed by
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
