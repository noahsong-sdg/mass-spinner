# Accepted comparisons and operating maps

The former centrifuge interface retained one latest accepted worker result. Changing
sliders replaced that result, leaving no independently owned baseline or parameter
study. In simple terms, changing the experiment erased the thing being compared.

`pinFuelExperiment` clones and freezes the complete accepted result, its own
configuration and producing-code identity together. It does not read draft controls.
Missing historical identity remains null. Plain-array transport snapshots remain
part of this immutable ownership boundary. The small snapshot is preferable to
adding persistent run storage or another simulation-state manager for an in-memory
comparison. No cache or persistent migration is introduced.

`comparisonFrame` supplies one SI camera frame and physical time, bounded by the
shorter computed duration, and identifies geometry differences explicitly. Shared
composition colors mean fraction 0–1; density means absolute neutral number density;
speed means neutral bulk speed. The union of accepted reference ranges is shared
between cases. A zero-speed range remains [0,0], requiring a constant-color renderer.
Separately fitting each view or color range would conceal real physical differences.

`computeFuelOperatingMap` reuses the existing conditional rotor calculation. Its
bounded 2–15 point axes generate at most 225 independent configurations per request;
the UI requests 7×7 in the existing cancellable worker. A point is applied only after
a deliberate button action. Superseded replies cannot repopulate a cleared map.
Invalid numerical/input domains, valid undefined cut purities and diagnostic warnings
remain distinct, including for keyboard inspection.

Purity/recovery are equilibrium inventory cuts, input power is instantaneous at the
chosen duration, and throughput is conditional one-outlet gas load in Pa·m³/s.
These are not coupled transient extraction predictions. CIV-reference exceedance
and nominal mixing/residence comparisons do not establish physical instability
thresholds. The map is not a qualified operating envelope.

Regression sources cover snapshots/provenance, shared domains, comparison invariants,
all metrics, budgets/log axes, invalid versus undefined quantities, stale replies and
keyboard cells. This delegated agent did not run project code; parent-owned safe-dev
execution and deployed browser/GPU verification remain separate evidence gates.
