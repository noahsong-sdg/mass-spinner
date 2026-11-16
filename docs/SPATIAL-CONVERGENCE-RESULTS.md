# Spatial argon convergence: current status

The density timestep failure is resolved at tested refined points. Axial grid
grading resolves the tested axial gates; tighter current solves resolve the
tested electrical timestep contraction failures. **Radial convergence still
fails.** This study concerns the optional conceptual argon experiment, not the
main two-rotor scene or a Marathon measurement.

## Measured uniform-grid results

[55 completed trajectories](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43839587719)
give 57 three-level comparisons, retaining every failure. Physical inputs are
unchanged: 1 V, 0.5 T, 1000 K, 1 µs and the original closed cell/transport.
Percentages are finite-reference differences on shared bins/clocks, **not
continuum-error bounds or measurement accuracy**. Both adjacent differences
must pass the threshold and contract.

| Refinement; other settings fixed | Observable | Coarse / fine differences | Gate |
| --- | --- | --- | --- |
| Time 64/128/256; r32/z128 | Density response | 0.5783% / 0.2817% | Pass 1% + contraction |
| Same | Interval wall power | 0.3914% / 0.1968% | Pass 1% + contraction |
| Same | Angular speed | 0.03199% / 0.01603% | Pass 1% + contraction |
| Same | Outer current | Relative 1.680e-9 / 1.735e-9 | Fails contraction |
| Axial 32/64/128; r32/time256 | Outer current | 3.140% / 1.433% | Fails 2% |
| Same | Projected Joule heat | 6.632% / 3.219% | Fails 2% |
| Same | Gas temperature response | 10.48% / 6.568% | Fails 2% |
| Radial 8/16/32; z128/time256 | Density response | 21.31% / 44.84% | Fails 2% and contraction |
| Same | Projected Joule heat | 5.380% / 2.769% | Fails 2% |

The original r16/z8 time16/32/64 density differences were 2.727% / 1.366%.
More timesteps resolve that numerical error without altering an equation or
physical coefficient. Conversely, the large electrical spatial discrepancy is
already present at initialization, before gas heating/motion. More timesteps
cannot fix an under-resolved electrode return-current map. Fine current error
alone is also insufficient: the heat and density fields have their own gates.

The liner temperature response is unresolved at this short window. A fixed
three-cell liner cannot establish solid spatial convergence. Whole-history
coarsest-bin passes do not cover finer-only times, fine radial structure or
local causal startup accuracy. All promotion flags remain false.

## Fixes and why they were chosen

- **Missing diagnostics:** snapshots discarded actual cell energies, accepted
  wall heat/work and solver defects. That made thermal/interval checks
  impossible. The recorder now retains those quantities from the same accepted
  step; it does not infer energy from a picture or introduce another solver.
  Pulse endpoints retain preceding driven work even though displayed voltage
  is right-continuous at zero after the switch.
- **False precision passes:** checking response magnitude did not establish
  that 1%/2% of that response was representable. Checking error magnitudes did
  not establish that their decrease was resolvable. In simple terms, identical
  rounded values could look converged. The classifier now checks the requested
  accuracy and contraction margin against its separately declared sensitivity
  screen. Tiny signals stay unresolved; physical gates are unchanged. Exact
  nonzero ties still fail strict contraction when no screen applies. Two new
  tests fail against the pinned original analyzer and pass after the fix.
- **Invalid interval data:** wall heat bypassed finite-value checks, allowing
  NaN assessment values to become JSON `null`. It now refuses those inputs
  before scoring, preserving a clear failure instead of a plausible report.
- **Mixed persisted evidence:** a rerun overwrote the old partial before
  exclusive final writes failed. A fresh output directory is now created
  exclusively before computation; the real CLI regression proves old partial
  and final files remain untouched. This is an atomic preservation invariant,
  rather than a retry or fallback that could combine different studies.
- **Missing historical test source:** shallow checkout omitted the pinned
  pre-fix commit used by the red/green regression. Preparation now fetches that
  exact commit before the offline run. Test/model execution remains offline.

## Follow-on probes

Only numerical inputs change in the two independently declared probes:
concentrate axial cells near the upper electrode, or tighten the existing
current solve on the same uniform mesh. Grading and tightening are not combined.
The standard uniform-coordinate arithmetic and all browser defaults are
preserved. Full designs and exclusions are in the
[prospective protocol](SPATIAL-EXPERIMENT-PROTOCOL.md).

The [three-mode study](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43842073257)
at `aa0199d` completed all 93 requested trajectories without operational
refusals: uniform 55, upper-graded 29 and tight-current 9. These include repeated
controls, not 93 independent physical predictions. There are respectively
57, 29 and 3 three-level comparisons. All share source-manifest SHA-256
`bd5e5630957c9387facd2d9a4fdcaff37fb31264cf3e7eee464c8d7883c090d3`.

| Probe; other settings fixed | Observable | Coarse / fine differences | Gate |
| --- | --- | --- | --- |
| Graded axial 32/64/128; r32/time256 | Outer current | 0.28793% / 0.073459% | Pass 2% + contraction |
| Same | Projected Joule heat | 0.39454% / 0.10187% | Pass |
| Same | Gas temperature response | 0.70530% / 0.18477% | Pass |
| Same | Density response | 1.5700% / 0.42334% | Pass |
| Tight-current time 64/128/256; uniform r32/z128, tolerance 1e-15 | Outer current | Relative 3.6734e-13 / 2.3490e-13 | Pass 1% + contraction |
| Same | Projected Joule heat | Relative 6.5911e-13 / 3.3000e-13 | Pass |
| Graded radial 8/16/32; z32/time256 | Density response | 22.393% / 38.472% | Fails 2% and contraction |
| Same | Gas temperature response | 9.4543% / 6.1846% | Fails 2% |

All 11 resolved observables pass the **one stated graded axial triple**; zero
liner response remains unresolved. This does not qualify other axial triples.
At uniform r32/z128, tighter current tolerance changes the 256-step endpoint's
maximum cell-current residual from 7.2242e-15 A (1e-11) through 5.7182e-17 A
(1e-13) to 9.0802e-19 A (1e-15). The 1e-11 and 1e-13 current/heat contraction
failures remain recorded. The 1e-15 passes do not imply those tiny differences
measure physical accuracy.

The axial improvement supports under-resolution near the mixed electrode
boundary as the cause of that discretization error. Grading places existing
cells where the current changes rapidly, without changing the electrode,
constitutive law or operator. It was chosen over an invented contact smoothing
or adjusted conductivity because those would change the physical problem.
The tolerance probe supports iterative-solve accuracy limiting the tiny time
differences: in simple terms, the electrical solve was less precise than the
change being compared. Passing through the existing solver's tolerance is the
smallest fix; an error floor would conceal the discrepancy. Neither probe
isolates every coupled solver error or changes the browser defaults.

**These are separate probes.** No combined graded/tight-current grid, radial
continuum limit, longer thermal window or slider envelope is qualified. The
radial density/heat failure remains a root-cause investigation, not a solved
bug or an experimentally validated prediction.

## Evidence and interpretation

The [code verification](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43842072969)
at `aa0199d` passed:

- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: 1,322/1,322.
- Electron-applicability `test_screen.py`: 17/17; archive export
  `test_argon_reference_export.py`: 3/3, both through unittest discovery.
- `npm run typecheck`, `npm run build`, `npm run check:site` and
  `npm run check:assets`.
- The study's targeted three-file suite: 23/23. Two representation regressions
  fail by assertion against the pinned original analyzer and pass after repair.

Study execution used one CPU and 1 GiB in an offline container. Independent
agents checked source, invariants, exact CI receipts and retained raw results.
The final documentation/archive commit does not change the tested model code.
Site checks are structural; no deployed-browser/GPU verification or deployment
is claimed for this branch.

Retained raw histories, assessments and CI identities:

- [Initial 27](../scientific/spatial-argon-20261116/initial-27.tar.gz):
  SHA-256 `70511eb9e629b240e884d69db7ea8056628f7dc4344f2978f74b81172d930832`.
  Its earlier classifier scores remain historical, not silently replaced.
- [Uniform 55](../scientific/spatial-argon-20261116/uniform-55.tar.gz):
  SHA-256 `93139947aa5251ef03c2c737f6cb3787c2c0931936a999a9826f4c424b53d153`.
- [Three probes, 93 runs](../scientific/spatial-argon-20261116/three-probes-93.tar.gz):
  SHA-256 `3293cf3b6794e3e5b7d14547e9d3e6cb8a7910e9716c63849f3efa99da853d2d`.
  All three modes' actual histories and assessments plus CI identity are
  included. Archived member bytes were checked against the downloaded receipt.

Numerical refinement cannot supply the missing charge/energy closure,
gas-wall accommodation evidence, open-flow validation or matched experimental
holdouts. The next physical comparison still requires those inputs. A passing
test suite, a conserved ledger or a refined current trace does not establish
first-order Marathon accuracy.
