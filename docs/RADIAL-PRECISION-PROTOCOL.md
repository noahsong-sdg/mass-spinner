# Radial density: discrete precision probe

Prospective diagnostic, after the retained 93-run study. Its graded r8/16/32,
z32/time256 density comparison fails 2% and contraction. The density response
is about 1e-11 of its background. No physical equations or gates change here.

Replay the three retained temperature/rotation histories through the actual
gas-mass kernel, from the identical initial normalized inventories. Compare
each accepted replay to an independently assembled 80-digit Decimal backward
Euler solve of the same SG operator, lifting the exact supplied binary64 inputs.
This separates transport arithmetic from electrical/thermal field generation.
Recorded fields are prescribed in this diagnostic; it is not a coupled rerun.

Use original temperature excursions and a separate 1000-fold amplified
excursion control, with rotation unchanged. Amplification tests weak-signal
arithmetic sensitivity; it neither fits data nor qualifies the physical point.
Retain all common-clock errors, raw mass/transfer maxima and source/input hashes.
No response floor, changed threshold or promotion follows from this probe.

Predictions, ranked before execution:

1. Lost weak inventory increments: binary64/high-precision response disagreement
   is appreciable at original amplitude and falls under amplification.
2. Unresolved electrical heating: replay arithmetic agrees closely, while the
   previously measured coupled radial discrepancy persists. Next isolate source
   projection using a common conservatively restricted fine-grid source.
3. Coupled iteration: the isolated replay is accurate but prescribed-source
   transport is converged; a subsequent coupling-tolerance probe is then needed.

Run only in offline bounded CI, preserving the unrelated frozen safe-dev run.
