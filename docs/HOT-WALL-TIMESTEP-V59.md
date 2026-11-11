# Hot-wall timestep convergence, v59

The subsequent [joint space/time assessment](JOINT-HOT-WALL-CONVERGENCE-V60.md)
confirms the rotor result but finds that the live hot-wall defaults fail local
gas-temperature and instantaneous heat-rate targets. The v59 time contraction
at fixed space must not be interpreted as joint wall-layer qualification.

Implemented, independently audited, released and checked in the actual deployed
browser on 2026-11-09 (deployment timestamp is 2026-11-10 UTC).
The demonstrated early rotor error now passes the unchanged 3% gates. This
qualifies the tested reduced model and configurations, not a calibrated Marathon
machine or every possible slider combination.

## Problem, execution path and established cause

`fuel-centrifuge-ui.js` → emitted worker → `simulateFuelOperation` →
`advanceFuelMixtureThermal` / `advanceFuelCoupledStep` → accepted checkpoints →
`sampleFuelTransport` → plots, shared playback clock and 3D diagnostic surfaces.

The spatial gas model previously used only the global quadratic knots
`t_j = duration * (j/steps)^2`. Its default ion–neutral relaxation time is about
99 microseconds. The interval ending at the old first common observation,
244.14 microseconds, was 57.22 microseconds: too large to accurately resolve the
fast rotor mode with backward Euler. Conservation and stability alone did not
establish trajectory accuracy. Switching current late in a run was worse,
because the time grid did not restart around the new fast transient.

In simple terms, the calculation conserved the right quantities but took too
large a jump while the ions were changing speed quickly.

The old 64 common observation times were exact accepted knots in the 512,
1,024 and 2,048 runs. Interpolation therefore did **not** explain the historical
3.224% difference. That was a finite-reference difference; the denser independent
analytic control below found larger errors the sparse sampling missed.

## Fix and choice of method

Keep the existing conservative, positive backward-Euler advances and quadratic
base targets. Insert accepted substeps around startup, resumed histories and
each current event. For fixed inertia, the positive two-rotor decay rates obey

```
lambda_fast + lambda_slow = gamma/I_i + gamma/I_n + drag/I_n
tau_trace = 1 / (gamma/I_i + gamma/I_n + drag/I_n)
h <= (8 / nominal_steps) * (time_since_transient + tau_trace)
```

At each transient origin, use the accepted neutral inertia; `drag/I_n` is the
prescribed drag frequency. The trace bounds the fastest eigenrate from above,
so its reciprocal is no greater than the fast relaxation time. At 512 nominal
intervals, the initial cap is `tau_trace/64`; spacing grows with transient age
and remains bounded by the existing quadratic targets. The timescale is reset
at each explicit event or continuation, not recomputed after every substep.

Every inserted accepted state is retained for playback. Event endpoints are
captured once, with right-continuous current and unchanged conserved state.
The interface distinguishes nominal intervals from retained intervals. Legacy
non-spatial-gas grids remain unchanged, and snapshots-only continuation is tested.

This is the smallest coherent fix because it changes the integration partition,
not the equations, fluxes or heat/work identities. The existing substep
conservation identities telescope across the finer partition. Global uniform
refinement wastes work away from transients; a startup-only exponent misses late
switches; extrapolation would need new positivity and entropy guarantees. A new
integrator is unnecessary to resolve this demonstrated failure. This is a
graded mesh, **not** an embedded local-error controller.

## Negative controls and independent validation

The independent numerical reviewer derived the affine 2×2 rotor response from
configuration constants, without production rotor-response, inertia or timestep
helpers. A positive mobility of `1e-30 m²/s` freezes inventories to the asserted
tolerance while leaving hot-wall heating active. Thus thermal evolution cannot
feed back through inertia in this isolated analytic control. Zero mobility is
outside the public input domain and was not used.

| Independent exact rotor control | Original ion error | Corrected ion error | Original neutral error | Corrected neutral error |
|---|---:|---:|---:|---:|
| Startup, dense early samples | 7.689% | 1.030% | 11.174% | 0.956% |
| Late off-grid on/off/on from rest | 83.388% | 1.030% | 110.253% | 0.978% |

Errors use `abs(calculated-reference)/max(1 rad/s, abs(reference))`, avoiding
singular relative errors at rest. The original failures are preserved in
`scientific/fixes-v43/hotwall59-baseline-oracle.*`; neither the 3% threshold nor
the sampling domain was weakened to pass the candidate.

The full rotating hot-wall study fixes 64 gas cells and 16 tungsten cells,
with 500 K initial gas, 1,000 K initial liner and prescribed gas conductivity
0.1 W/(m K). It compares all runs at identical early/off-knot and historical
times: 166 for startup and 472 for switches at 0.650137, 0.750137 and 0.850137 s.
The same setup runs at 512, 1,024, 2,048, 4,096 and 8,192 nominal intervals.

| Nominal intervals | Startup ion difference | Switched ion difference | Startup neutral difference | Startup local gas-temperature difference |
|---|---:|---:|---:|---:|
| 512 | 1.2420% | 1.2338% | 0.8826% | 0.9636 K |
| 1,024 | 0.4934% | 0.4842% | 0.4150% | 0.4502 K |
| 2,048 | 0.1513% | 0.1757% | 0.1777% | 0.1933 K |
| 4,096 | 0.04714% | 0.05734% | 0.05942% | 0.06456 K |

These are differences from the **finite 8,192-interval reference**, not proven
absolute errors of the nonlinear model. Neutral speed, local temperature,
pressure and species cumulative distributions also contract at every refinement
by the unchanged factor-below-0.8 gate. Default startup retains 872 intervals;
the three-switch case retains 2,186. The corresponding VM campaign timings were
approximately 0.34 and 0.59 seconds, respectively, not browser performance claims.

The separate physics reviewer independently reconstructs ideal-mixture entropy,
analytic tungsten Cp/T and enthalpy, gas EOS, inertia, kinetic energy and every
endpoint entropy-production contribution. Across 3,058 accepted intervals in
startup and switched cases:

- Total gas/solid/coolant entropy increases at every interval; minimum increase
  is `3.83158e-7 J/K`.
- Minimum entropy-production lower-bound margin is `-1.53e-13 J/K`, within the
  propagated floating-point storage budget, rather than a physical decrease.
- Maximum independently reconstructed per-step first-law residual is
  `2.28e-10 J`.
- Species positivity, per-species inventory, angular impulse and mechanical
  energy gates pass throughout.

Independent reviews: [physics](reviews/v59-hotwall-physics.md) and
[integration](reviews/v59-hotwall-integration.md). Independent numerical tests:
`tests/hotwall-time-audit-v59.test.ts`. Additional regressions cover exact event
capture, off-knot branches, duration changes, conserved prefixes and the older
snapshots-only history shape in `tests/fuel-hotwall-continuation-v59.test.ts`.

## Exact tested snapshot and checks

All execution was inside the existing safe-dev Apple container VM. Host work
was limited to source editing, reviewed control/transfer orchestration and
evidence inspection. Reviewers inspected actual execution receipts; this does
not claim that each reviewer independently launched a second VM run.

Final command:

```
python3 scientific/fixes-v43/control.py v44-final-hotwall59 -- python3 scripts/run-final-v44.py hotwall59
```

The controller checked source before and after every command:

- 618 inputs, including two explicitly accounted historical guest baseline files.
- Input SHA-256: `5a36064518d83a3befab0e16c30224dddbddde2e5937964f90bba82f3d68bc9d`.
- 151 release files, aggregate SHA-256:
  `035b13d5c7fe998a63d346f8c9913c73920245a896c2732bf814f2e5677a4fff`.
- Entry: `assets/index-B7opLmID.js`.
- Worker: `assets/worker-wnT6To3W.js`, SHA-256
  `15b37ff9ac1b651fdb41808db5f948bc14b842523d3c05ad228f11d82232ceb2`.

All 12 final commands passed, with exact arguments retained in
`scientific/centrifuge-v44/hotwall59/final/receipt.json`:

1. `npm test`: **1,174 passed**, zero failed/skipped.
2. `npm run typecheck`.
3. `npm run build`.
4. `npm run check:site`.
5. `npm run check:assets`.
6. Emitted release-worker verification.
7. Fuel release-worker verification: 144 base, 20 operation, 4 solid thermal,
   10 mixture, 2 new hot-wall cases and 49 map cells.
8. Collision-data probe.
9. Existing v58 mixture campaign.
10. Fourier reference input emission.
11. Actual FiPy/SciPy Fourier reference: all six gates pass.
12. New dense hot-wall timestep campaign through 8,192 nominal intervals.

While iterating, the initial refined batch passed ten tests, the refinement and
continuation batch passed 19, and the independent entropy batch passed two.
All are included in the final suite. Receipts/logs are under
`scientific/fixes-v43/hotwall59-*`. Final campaign raw samples and reference
results are exported under `scientific/centrifuge-v44/hotwall59/studies`;
`manifest.json` records uncompressed SHA-256 and size for all 15 files.
Large raw JSON is gzip-compressed without changing its decoded content.

## Actual deployment and browser proof

[Live playground](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/?level=2).
Cloudflare version `59c45722-c25a-4784-a52e-8f2d24250215` is deployed at 100%.
Provider verification and isolated authenticated Wrangler deployment logs are
saved separately from browser evidence; no host credentials were copied.

The actual in-app browser loaded `index-B7opLmID.js`. Controls, plots and
diagnostic geometry were exercised through the visible UI:

- The first accepted plot sample selects shared physical time
  `1.5465687793816824e-6 s`, with ion speed `0.4087842803 m/s` and neutral speed
  `0.00006384973069 m/s`, matching the actual downloaded state.
- The metadata reports 64 radial cells, 512 nominal and 872 retained intervals.
- Cutting power there preserves all canonical fields and changes current
  right-continuously to zero. The next accepted state at about 3.093 microseconds
  slows ions to `0.4025603671 m/s` while gas accelerates to
  `0.0001267171618 m/s`.
- Temperature profile, “Show in 3D” and playback retain the same physical time.
  The actual 3D assembly and corresponding live plot render on desktop.
- Both actual UI downloads match all 39 checked physics source digests.
  A separate isolated check audits every exported accepted state for inventory,
  positivity, thermal/mechanical budgets and conserved pre-cut prefix.
- 390×844 and 320×740 responsive layouts have no horizontal document overflow.
  Plot selection/keyboard sample navigation and closing the sheet to reach
  playback controls work. The mobile plot sheet overlays the playback controls;
  it is not a claim that both can be directly operated simultaneously.
- No warning/error messages were captured in the inspected browser console.

Evidence is in `scientific/centrifuge-v44/hotwall59/browser`: DOM snapshots,
desktop/mobile screenshots, two compressed actual downloads, digest receipt,
isolated checker and its output. An initial export-check assertion incorrectly
expected unchanged current at the event; its failed draft is retained. The
corrected checker asserts unchanged canonical state **and** zero right-continuous
current. No simulator change or numerical tolerance relaxation was required.

Browser evidence is a companion to the immutable final build receipt, whose
`browserVerified:false` correctly describes the pre-browser release gate.
The browser companion records completed live verification separately.

## Remaining scope limits

This fixes the observed timestep failures; it does not remove the reduced
model's physical assumptions. D, conductivity, friction, drag and film
conductance remain prescribed. Species share a local temperature; radial
acoustics/inertia, multicomponent diffusion and local azimuthal momentum are not
solved. The fixed radial grid needs separate spatial qualification. Fast modes
excited later by feedback without an explicit intervention are not covered by
an automatic error estimator. Users should refine new extreme configurations.
The full mixture study establishes conditional convergence to a finite
reference, not experimental validation of Marathon's device.
