# v43 controls and closed-reference correction

## Evidence and root causes

Source inspection traced the Exposure controls through `target-exposure-ui.js` → `precise-controls.js` → the original range `input` handler → `simulateTargetExposure`. Capacity stores `log10(Cₐ)` in the range, while its readout displays physical Cₐ. The precise enhancer defaults undeclared ranges to linear. Exposure omitted the existing `data-range-scale` and `data-unit` declarations, so the editor presented the exponent as physical capacity. In simple terms, an internal dial position appeared as the measured quantity.

Adjacent inspection established the cause of the v42 offsets: Exposure identified Celsius fields with `key.endsWith('K')`. The capacity and cooling-conductance names also end in K, as part of their denominator units. Capacity's physical readout therefore lost 273.15 (10000 → 9726.85, formatted 9727); cooling's model reader gained 273.15 (5000 → 5273.15), giving 10000/5273.15 ≈ 1.896 seconds. Simply, a unit suffix confused heat capacity/conductance with absolute temperature. This source derivation matches the recorded v42 readout and time constant; current runtime verification remains the test gate below.

The closed-reference path was also traced: `setupFusionLaboratory.update` notifies `setupMarathonModels`, which immediately updates Exposure and Loading before the coupled-target update. Both reference adapters calculated and redrew on each notification, although their enclosing References disclosure was closed. Loading additionally performed its selected-tolerance and tighter-tolerance pair while its own Isotope loading disclosure was closed. Hiding the old models did not stop their work.

## Correction and choice

Exposure declares its existing logarithmic/linear scale and displayed units at range construction. The shared editor therefore validates physical capacity against 100…1,000,000 J m⁻² K⁻¹ and converts the accepted number back to the stored exponent. Only the explicit `coolantK` and `initialK` fields receive Celsius/Kelvin conversion. This corrects capacity's readout and cooling's numerical input while keeping actual temperatures in displayed Celsius. It reuses the established domain contract; guessing from captions/suffixes, duplicating editors, or modifying thermal equations would address the wrong boundary.

Marathon explicitly initializes Exposure and Loading inactive and activates them from the existing References disclosure. Loading additionally requires its own disclosure to be open. Source/control notifications replace the stored current source, invalidate the cached result and mark it dirty. Closed references do not solve or redraw. Opening a dirty reference calculates the newest source/current controls once; clean reopenings reuse its result. Export checks dirtiness and computes the current result before serializing. Source invalidation disables export immediately, and reopening clears any retained display. All computations remain synchronous, so there are no outstanding promises or completion races.

Standalone adapters retain their earlier eager defaults. The visibility opt-in belongs to Marathon's actual drawer ownership rather than a general observer/scheduler. Optional numerical-function injection supports exact production call-count regressions; the defaults remain the same original solvers and tolerances.

The energy sensitivity scan remains synchronous. `fusionPlaygroundData` returns source profiles, immediate metrics, the scan and excluded-energy status together, and fusion update renders/uses those outputs as one transaction. Deferring that scan needs a separate reviewable split of those data/presentation responsibilities, including failure/status/export semantics. No cache, dependency guess, tolerance relaxation or worker rewrite was added. No browser latency improvement is claimed from eliminating these reference calls.

## Regression and verification handoff

`tests/reference-controls-v43.test.ts` exercises the actual nested Marathon precise editor: default 10000; off-grid physical 5000; raw exponent and physical readout; exported capacity/time constant; bounds rejection; reset; neighboring linear cooling and Celsius entry. It also runs real solvers behind call counters and verifies zero closed-reference solves, exactly one newest Exposure solve or one Loading tolerance pair on demand, no closed redraw, clean reopen reuse, changed-while-closed controls/source, current export, invalid source clearing and recovery. The full Marathon wiring test checks both disclosure boundaries.

Narrow requested guest command:

```sh
npx tsx --test tests/reference-controls-v43.test.ts tests/precise-controls.test.ts tests/fusion-accessibility-v22.test.ts tests/dynamic-minimal-v24.test.ts tests/material-ui-v23.test.ts tests/marathon-integration-v35.test.ts tests/integration-review-v38.test.ts tests/workspace-v25.test.ts
```

This author performed trusted source reads and file edits only. Root coordinates the existing isolated guest snapshot and execution; exact tested snapshot hashes and results must be appended from that receipt before claiming verification. No VM creation, replacement, deletion, dependency installation or host project execution was performed here. Build/typecheck and browser verification remain root-owned final gates.
