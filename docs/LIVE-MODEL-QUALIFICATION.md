# Live centrifuge: qualification status

The primary playground is the Marathon-inspired centrifuge. Other simulators
remain under Advanced, with their shared links preserved. This is a conditional
learning model, **not an experimentally qualified Marathon device model**.

## Measured benchmark

The [1979 Wijnakker neutral-argon profile](https://doi.org/10.1051/jphyscol:19797236)
tests the live model's rigid-rotation assumption. All five independently extracted
sightlines are retained. Source hashes, apparatus conditions, exclusions and the
fixed 20% screen are in the [protocol](reviews/live-benchmark-protocol.md).

The live model has one neutral angular speed at a given time. Under the stated
optically thin full-line-centroid operator it predicts Doppler speed proportional
to sightline offset, irrespective of positive emissivity weighting. The measured
profile rises and then falls. The benchmark tests **every possible rigid speed**,
without fitting drag, current, temperature or a rotation amplitude.
The nominal minimum possible worst-point discrepancy is **56.37%**, above the
frozen 20% screen. Nominal, digitization, plotted-bar and combined-range screens
all exclude the rigid family.

The incompatibility persists with the declared bar-plus-digitization sensitivity
ranges. These are ranges, not confidence intervals. The exact instrumental
estimator remains unknown. This rejects the rigid profile family under that
observation model; it does not identify a unique missing physical mechanism.
The data were previously examined and are retrospective development evidence.

## Numerical work

An independent review found that default isothermal operations skipped the fast
mechanical substeps used by the spatial gas model. At 10 microseconds the old
startup error was 2.3993 m/s, versus a frozen 0.08663 m/s allowance. The same
problem occurred after a current switch. Every operating mode now reuses the
existing rotor-relaxation substeps. Equations and physical coefficients are
unchanged; accepted old histories keep their recorded prefix when resumed.

The separate fixed-grid reference initially missed its unchanged 1% continuum
comparison gate by 1.2436% at 1024→2048 intervals. Its reference sequence was
extended to 1024/2048/4096 intervals; the failed coarser comparison is retained
here rather than treated as experimental disagreement.

The [numerical protocol](reviews/live-numerical-protocol.md) separates exact
startup controls from a 27-run crossed space/time campaign at three default
lithium currents. It checks the interactive resolution, conserved inventories,
momentum, energy, positivity, phases and common-clock observables. A passed
numerical screen does not establish experimental accuracy or relative accuracy
of a very small enrichment gain. Machine-readable results retain canonical
sampled states for an independent replay.

The final campaign passed all 27 trajectories and 21 refinement comparisons.
The independent Python auditor replayed 270 common-clock states and budget
witnesses and rejected four deliberately corrupted artifacts. Its strongest
interactive/reference discrepancy consumed 56.66% of the frozen allowance.
Maximum inventory, angular-momentum and energy residuals were respectively
8.0e-15, 2.2e-14 and 2.5e-15. Full accepted-history finiteness/order checks remain
producer assertions; the auditor replays retained states, not the integrator.
The complete 1,255-test suite, typecheck, production build and site/asset checks
passed inside safe-dev. The initial failing tests and candidate remain retained.

Evidence: [V97 retained states, logs and release hashes](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v97-live-model-qualification).
The tested guest snapshot is
`5c501dde2ebbe45acb7223dfa84a92b427ab81c4bb7c45a3979e313789f0f58c`;
the campaign source manifest is
`d423743a3adee2fb146e007812b30a51dfdca55efe3b992087334db4f48a225f`.
This status document's result/publication paragraphs were added after execution;
the checked runtime sources are unchanged.

## Deployment and independent review

Cloudflare version `32e2e64d-5df1-4896-a95f-1383900438c7` serves the checked build.
Provider status confirms 100% traffic. HTTP hashes matched the checked HTML,
JavaScript, CSS, help page, render manifest and centrifuge assembly model.
The coordinator exercised Advanced navigation, panel preservation, current
response, all 16 plot choices, benchmark inspection, component materials,
cross-section/tracer controls and shared-link restoration in the deployed
browser. Desktop and 320/390-pixel layouts were inspected; no page overflow or
browser-console errors were observed. Thermal-only profile choices correctly
explain their required model settings when thermal evolution is disabled.

Independent reviewers approved the structural benchmark physics, bounded
numerical repair and UI presentation after corrections. They reviewed source
and exported execution evidence; deployed browser actions were performed by
the coordinator. None approved experimental performance fidelity.

Reproduce inside safe-dev:

```sh
npm test
npm run typecheck
npm run build
node --import tsx scripts/qualify-live-centrifuge.mjs NEW_RESULTS.json
python3 tests/audit-live-qualification.py NEW_RESULTS.json
```

## Before an experimental accuracy claim

The current live inputs do not match this argon apparatus. Prescribed transport
coefficients, unknown discharged temperature/inventory and electrode/current
mapping cannot be recovered by timestep refinement. A spatial momentum model
must also support non-rigid rotation before this complete profile can match.
Require independently justified inputs, a defined diagnostic operator, numerical
refinement and an additional experimental condition whose outputs are withheld
before model selection. Closed-vessel inventory cuts do not validate extraction
throughput, target physics or the complete fusion fuel cycle.
