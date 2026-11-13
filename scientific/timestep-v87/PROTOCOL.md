# Active-CFL temporal refinement

Prospective protocol, 12 November 2026. V86 predictions and all failed gates
remain unchanged. No measured current or velocity is read or fitted.

The V86 maximum-step refinement did not refine the acoustic-limited steps:
654/654/655 steps, with the first two schedules identical. Repeat exactly one
frozen case (`linear-finite-te1`, anode 0.07 m, 64x96 cells, cap 1e-7 s) at
acoustic CFL 0.2, 0.1 and 0.05. Retain V86 initialization, operators, physical
inputs, Lie ordering, and reporting times 0/1/2/4 microseconds. The 0.2 result
must reproduce the complete frozen V86 field/history packet byte for byte.

Record every acoustic candidate, remaining reporting interval, accepted step
and pre-step time separately from the unchanged state packet. Require each
halving to increase step count >1.5x and decrease maximum accepted dt; at least
95% of non-report-truncated steps must be acoustically limited. Independently
recompute acoustic candidates at saved states; intermediate candidates remain
producer evidence because intermediate states are not saved.

Independently reconstruct primitives and inventories. Keep the V86 mass/species
1e-10, total-energy 1e-8 and normalized-charge 1e-9 bounds. Compare rho, T,
Omega, ur, uz, and rho/T increments at every reporting time using exact
cylindrical integration over interpolation panels. Orders 2/3/4 must agree
within 1e-10 relative raw-integral spread. Require finest relative RMS change
<2% and contraction against the preceding pair. Preserve exact-zero treatment
and all failures; no fitted floor or time selection.

Producer source seals cover the driver, this protocol, and the actual imported
physical sources/data, explicitly enumerated in study87.py. The frozen V86
prediction is sealed separately. Audit, tests and report sources have separate
execution receipts: a scorer-only change does not invalidate a physical run.
Record numpy/scipy/scikit-fem versions. No external CFD benchmark is implied.

A passing temporal slice cannot qualify the spatially unresolved conditional
flow, the missing electron/ionization/wall physics, or the experimental match.
`fullModelNumericallyQualified` and `experimentalQualification` remain false.
