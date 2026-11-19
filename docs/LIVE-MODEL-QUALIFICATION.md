# Live centrifuge: qualification status

The main simulator is the Marathon-inspired centrifuge. Other simulators stay
under Advanced, with their shared links intact. This model is a learning tool
with stated assumptions. It is not an experimentally qualified Marathon-device
model.

The [16 November benchmark admission review](IDENTIFIABLE-BENCHMARK.md) examines
possible cases for independently supplied rotation/temperature/electrical data. The review selected no case. Its separate non-rigid reference replay keeps 4,320 failed optical
alternatives and prescribed temperature. That replay does not qualify this
live model.

## Measured benchmark

The [1979 Wijnakker neutral-argon profile](https://doi.org/10.1051/jphyscol:19797236)
gives a test of the live model's rigid-rotation assumption. The comparison keeps
all five independently extracted sightlines. The [protocol](reviews/live-benchmark-protocol.md)
gives source hashes, apparatus conditions, exclusions and the fixed 20% limit.

Rigid rotation means one neutral angular speed at a given time. The diagnostic
operator assumes optically thin emission and a centroid of the full spectral
line. Under those assumptions, Doppler speed is proportional to sightline
offset for any positive emissivity weighting. The measured profile rises, then
falls. Thus, the comparison includes every rigid speed without fitting drag,
current, temperature or rotation amplitude.

The nominal minimum possible worst-point discrepancy is 56.37%, above the fixed
20% limit. Nominal, digitization, plotted-bar and combined-range comparisons all
exclude the rigid family. This incompatibility also occurs with the declared
bar-plus-digitization sensitivity ranges. Those ranges are not confidence
intervals. The exact instrumental estimator is unknown.

This result excludes rigid profiles under the stated observation model. It does
not identify one missing physical mechanism. The previously examined data give
retrospective development evidence, not a new prediction test.

## Numerical work

A review done independently found that default isothermal operations omitted fast
mechanical substeps. The spatial gas model already used those substeps.
At 10 microseconds, the old startup error was 2.3993 m/s against a fixed
0.08663 m/s allowance. The same problem occurred after a current switch.
Every operating mode now uses the existing rotor-relaxation substeps.
Equations and physical coefficients are unchanged.

When an accepted old history continues, its recorded prefix stays unchanged.
The separate fixed-grid reference initially had an error above its unchanged 1% continuum
comparison limit: the error was 1.2436% at 1024→2048 intervals. The reference
sequence then used 1024/2048/4096 intervals. The failed coarse comparison stays
in this record; it is not experimental disagreement.

The [numerical protocol](reviews/live-numerical-protocol.md) separates exact
startup controls from 27 crossed space/time runs at three default lithium
currents. It includes checks of interactive resolution, inventory conservation,
momentum, energy, positivity, phases and common-clock quantities. Numerical qualification
does not show experimental accuracy or the relative accuracy of a tiny
enrichment gain. Machine-readable results contain canonical sampled states for
independent replay.

All 27 trajectories and 21 refinement comparisons gave results within their
limits. A Python auditor, written independently, replayed 270 common-clock
states and budget witnesses.
It rejected four deliberately corrupted artifacts. The largest
interactive/reference discrepancy was 56.66% of the fixed allowance.
Maximum inventory, angular-momentum and energy residuals were respectively
8.0e-15, 2.2e-14 and 2.5e-15.

The producer does checks of finiteness and order for complete accepted histories.
The auditor replays retained states, not the integrator. The complete 1,255-test
suite, typecheck, production build and site/asset checks gave successful results inside
safe-dev. The record keeps the initial failing tests and candidate.

Evidence: [V97 retained states, logs and release hashes](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v97-live-model-qualification).
The tested guest snapshot is
`5c501dde2ebbe45acb7223dfa84a92b427ab81c4bb7c45a3979e313789f0f58c`.
The campaign source manifest is
`d423743a3adee2fb146e007812b30a51dfdca55efe3b992087334db4f48a225f`.
This document received its result/publication paragraphs after execution.
The checked runtime sources stayed unchanged.

## Deployment and independent review

The V97 deployment used Cloudflare version
`32e2e64d-5df1-4896-a95f-1383900438c7`. Provider status then showed 100% traffic.
HTTP hashes agreed with the checked HTML, JavaScript, CSS, help page, render
manifest and centrifuge assembly model. This paragraph records that deployment;
it does not identify the current release.

The coordinator used the deployed browser to examine Advanced navigation, panel
preservation, current response and all 16 plot choices. Other checks included
benchmark inspection, component materials, cross-section/tracer controls and
shared-link restoration. Desktop and 320/390-pixel layouts had no observed page
overflow or browser-console errors. With thermal evolution disabled, thermal-only
plots correctly explained the necessary model settings.

Independent reviewers accepted the benchmark physics, bounded numerical repair
and UI presentation after corrections. They examined source and exported
execution evidence. The coordinator did the deployed browser actions.
No reviewer accepted experimental performance accuracy.

Inside safe-dev, use these commands:

```sh
npm test
npm run typecheck
npm run build
node --import tsx scripts/qualify-live-centrifuge.mjs NEW_RESULTS.json
python3 tests/audit-live-qualification.py NEW_RESULTS.json
```

## Before an experimental accuracy claim

The current live inputs differ from this argon apparatus. Timestep refinement
cannot supply prescribed transport coefficients, unknown discharge temperature/inventory
or electrode/current mapping. A spatial momentum model must include non-rigid
rotation before the complete profile can agree.

Independently justified inputs, a defined diagnostic operator and numerical
refinement are necessary for experimental qualification. An additional experimental
condition must have outputs withheld before model selection.
Closed-vessel inventory cuts do not show accuracy for extraction throughput,
target physics or the complete fusion fuel cycle.

The [non-rigid argon reference](../NONRIGID-FLOW-V98.md) independently compares
steady spatial charge/torsional-flow calculations. Its conditional angular
solution does not change live-model or experimental qualification.

The [coupled finite-contact release](../COUPLED-FLOW-V99.md) keeps meridional
momentum and thermal transport. Its results are outside the spatial or experimental
limits. It is research evidence and has not replaced the live equations.

The [V100 spatial repairs](../SPATIAL-FLOW-V100.md) correct contact/shear flux
diffusion and misplaced local viscous heating. Ten spatial comparisons and the
experimental comparison still have errors above their limits. These repairs do not qualify
use of the model in the live simulator.

The [V101 source-aligned refinement](../SPATIAL-FLOW-V101.md) reduces the failed
spatial comparisons to six. It keeps the original limits and comparison without
fitting. Density increments, radial flow and experimental accuracy stay
unqualified. The live model is unchanged.

The [public-data campaign](PUBLIC-DATA-QUALIFICATION.md) adds component checks,
an angular reference written independently and conditional sensitivities. It does not
change experimental qualification or extend the tested input range of this model.
