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
Recovered snapshot T/Ω are not the native thermal-solve/source-Ω values, so this
does not exclude transfer-feedback or coupled acceptance errors. Retained
history bytes are pinned separately from the original producing source hash.

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

## Frozen electrical-source probe, declared after precision receipt

[The first precision receipt](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43845961851)
finds less than 0.05% mass-response error at original amplitude, versus the
22–38% coupled radial discrepancy. Thus inventory arithmetic is not its main
cause. Face-transfer errors up to 3.14% remain a separate limitation.

Next solve the original zero-rotation electrical problem once on each radial
grid {8,16,32,64,128,256}, with upper-graded z128 and tolerance 1e-15. Keep all
physical geometry, contact, conductivity and voltage inputs unchanged. This
supplies each native grid's frozen Joule source. Separately restrict the single
r256 source by exact cell-power summation onto those same gas grids. The common
source is a finite reference, not an exact or validated continuum solution.

Evolve the existing coupled species/thermal kernels for 256 steps over 1 µs
using each native source, then each common restricted source. Prescribe Ω=0
throughout this diagnostic; no momentum solve, centrifugal work or current
feedback is claimed. Keep the original common-gas heating, gas-wall boundary,
temperature-dependent conductivity, tungsten liner and transport inputs.

Compare density and temperature excursions at identical clocks and conserved
coarse bins for every consecutive radial doubling triple, with the unchanged
strict 2% plus contraction gates and declared representation screen. Preserve
every native source without rescaling its total power. If common-source errors
fall while native-source errors persist, source discretization is implicated;
if both fail similarly, gas resolution/transport remains limiting. No new live
default, physical fit or promotion follows from either outcome.
