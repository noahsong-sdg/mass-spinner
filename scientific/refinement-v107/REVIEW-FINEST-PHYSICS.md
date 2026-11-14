# Independent finest-preflight physics review

Accepted as evidence for the declared **320 × 96, 0/1 µs resource preflight
and bounded axial comparison**. This is not approval of the whole model.
Full numerical qualification remains **PENDING**; all nine full-clock jobs
are unrun. No physical inputs, equations, or gates changed in this review.

## Evidence and provenance

Independently inspected the actual retained finest producer packet, conserved
field archive, accepted-step history, invocation, case log, replay driver,
component audit and stable audit under `retained/finest-evidence-20261113`.
Trusted file utilities independently reproduce these SHA-256 hashes:

- Predictions: `f84e8380ef3d8ccbb6e1d695fb2d165ef8cdb4557cc445f42b2e3aecce363a85`.
- Compressed fields: `bf4785d0dbbd77efa842e4c8f97472a885b07928e17c42cd0597a1739cffdcaf`.
- Decompressed fields: `55b2aac21aa7eaaeb89195a4c99a9cf1e8debea2709e0bdccdc30600fa0cdb4a`.
- Stable audit: `f98a4b0d9bb41de3363412706db63693af97cf0c38c1732402afc6c4d00f66b5`.
- Replay driver: `73b969bde196e9caa929e6e167318a78093b2d98b7dd1cac97d9bc86bc86d70a`.

The four frozen V107 source hashes match the earlier preflights. Stable norm
and replay-entry hashes are separately attributed; the producer fields were
not rewritten. The replay reports **59,170 gates, zero failures, PENDING**,
both full-pass flags false, and nine missing full-clock jobs. The six original
V106 physical spatial failures remain unsuperseded. Exit zero alone would
not establish this: the driver permits a completed failing audit, so the
actual failure array and gate decisions were checked.

## State, clocks and conserved balances

Both snapshots contain six conserved fields on 96 × 320 cells. All 2,997
accepted steps are positive and ordered; their inspected sum is 1 µs.
Clock-closure discrepancy is at most 1.06e-22 s; acoustic-CFL overshoot above
0.1 is at most 1.39e-17. Accepted timesteps span 0.02837–1.57521 ns.

Independent JSON sums give mass and species relative drift about -3.29e-16.
Total energy increases by 0.00989740770271652 J against electrical input
0.009897407702716694 J: a -1.73e-16 J balance discrepancy. Angular momentum
changes by approximately 1.82114e-11 kg m²/s after external and wall impulses
of 2.33480030e-8 and -2.33297916e-8 kg m²/s nearly cancel. The independent
angular balance discrepancy is 8.33e-20 kg m²/s. Summation-order roundoff
explains small differences from the retained NumPy receipts.

Saved per-step maxima are 1.07e-15 relative energy defect, 8.77e-15 angular
defect, and 3.56e-12 charge residual. Density and temperature remain positive;
maximum recorded total Mach number is 0.74915. These checks establish the
specified discrete balances, not completeness of the physical closure.

## Fine axial result

At fixed 320 radial cells, changing 48 → 96 axial cells gives at 1 µs:

| Metric | Relative discrepancy |
|---|---:|
| Density | 0.006444% |
| Density increment | 3.020112% |
| Temperature | 0.453206% |
| Temperature increment | 0.630975% |
| Angular speed | 0.303059% |
| Radial velocity | 0.999464% |
| Axial velocity | 1.406756% |

All seven pass the unchanged 5% limit. The velocity reference is the finer
combined meridional RMS, 53.1643 m/s; absolute radial/axial differences are
0.53136/0.74789 m/s. Across the combined replay, the largest panel-order
spread is 2.01e-14, below the unchanged 1e-10 check. Initial density and
temperature retain tiny nonzero roundoff-scale differences under the stable
metric; they are not clipped to zero.

This is a two-level axial comparison, not axial contraction or a bound on
continuum error. Its similarity to the 160-cell radial axial pair is useful
reproducibility evidence, not a third axial level. Mesh-specific initial
steady torsion is retained: initial angular speed itself differs by about
0.3213% in the fine axial comparison. Thus this is not an identical-q0
operator-isolation experiment.

## Limits and next qualification boundary

The finest run took 3,869.50 s with 1,221,720 KiB peak RSS, below its explicitly
declared 2 GiB budget. The replay took 57.60 s and 329,292 KiB. Resource
feasibility at 1 µs does not establish the full 4 µs workload's cost.

Peak temperature rises from 5,946.57 to 234,263.28 K, while the minimum remains
1,799.90 K. Strongly localized heating can satisfy global energy balance.
It still leaves fixed conductivity, viscosity, electrical transport and
omitted evolving ionization/electron-energy effects conditional at that
hotspot. Conservation and convergence alone cannot validate those closures.

All nine declared 0/1/2/4 µs jobs remain necessary for full radial, axial,
joint and temporal checks. The declared temporal sequence is on 160 × 48;
it cannot independently certify finest-grid source/splitting accuracy.
Nothing here establishes measured argon rotation, optical agreement,
lithium separation, Marathon apparatus accuracy or live-playground accuracy.
The actual audit correctly leaves experimental and live qualification false.

This review used static source inspection and trusted JSON/hash arithmetic
only. Scientific execution and measured resource use come from the retained
root-operated safe-dev evidence; no scientific code was rerun by this reviewer.
