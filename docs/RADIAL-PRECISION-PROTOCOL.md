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

The [first source receipt](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43846474117)
finds that common-source temperature passes the r32/64/128 and r64/128/256
triples, but common-source density still fails (7.94% / 6.91% at r64/128/256).
Extend only the common-source gas grid to 512 and 1024 cells. Keep its r256
electrical source unchanged as a piecewise-constant power density: split each
source cell's power equally among its equal-volume children. No new electrical
solve, smoothing or fitted source is introduced. Retain all original modes and
comparisons; score the two added radial triples with the same 2% gate.

## Joint refinement and auditable energy receipts

The [1024-cell receipt](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43846944142)
still fails density: the r256/512/1024 adjacent differences are 8.97% / 2.47%.
Extend only the common-source gas grid to 2048/4096. Also cross gas grids
{1024,2048,4096} with timesteps {256,512,1024}. Retain every earlier case.
This is 22 frozen-source trajectories: six native, ten common-source at 256
steps and six additional joint cases. Score every available radial triple at
each fixed timestep with the same 2% gate, and every time triple at fixed grid
with the same 1% gate. Use identical accepted clocks, not interpolated times;
report omitted finer-only clocks as unassessed. Shared scoring now handles
resolved exact equality and quiet/nonfinite inputs identically to the coupled
study, with regression coverage. Previous classifier outputs remain historical.

The gas kernel's numerical cell-count ceiling increases from 1024 to 4096 to
permit this offline reference. Equations, nonlinear tolerances, positivity,
inventory/energy checks, 1-GiB/one-CPU execution cap and browser defaults remain
unchanged. The UI radial bound remains 32. N=1e19 is total particle count, not
number density; R=.01m and L=.1m retain the original cell volume.

Schema 2 stores every accepted snapshot in per-case compressed JSONL, including
species inventory, gas and liner energy, native solved temperature, accepted
face transfers, deposited/wall heat and thermal residuals. Gzip members are
streamed per row; only common-clock profiles are loaded for each comparison.
This avoids retaining or serializing all fine histories simultaneously. The
index retains per-case hashes, refusals and timings; Linux maxRSS is recorded.
All source meshes remain finite references; successful frozen-source convergence
does not qualify the coupled rotating model, native electrical source or liner.
An independent streaming Python reader checks file/source identities, the
declared case plan, conservative power mapping and native continuity invariants.
It reports gas/liner/total stored-energy defects against actual deposited energy
without an invented acceptance floor. This is an accounting audit, not validation
of a wall constitutive law or an experimental uncertainty claim.
