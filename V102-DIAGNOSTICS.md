# V102: explain the project and isolate its remaining errors

Start with [Understanding Mass Spinner](docs/UNDERSTANDING-MASS-SPINNER.md).
This change adds a beginner guide and two supplemental diagnostics. Production
physics, live equations and existing qualification gates are unchanged.

## Why these additions

The documentation lacked a beginner map separating the physical device, browser
model, 3D display and research solver. One standalone guide explains their
roles without adding text to the playground or expanding the short README.

The heating assessment relied heavily on a maximum temperature. That cannot
distinguish bulk overheating from a small hot region. The retained history also
mixes cumulative electrical work with per-step heat in joules. Summing those
fields alike would miscount energy. The new reader reconstructs thermal and
kinetic energy from conserved fields, takes the final cumulative work, and sums
heat increments exactly once. This diagnoses the existing model before adding
an unjustified cooling coefficient or changing its physical energy budget.

The flow solver reconstructs pressure at faces separately from its cellwise
centrifugal source. A continuum-balanced spinning gas can therefore develop
artificial radial motion. A second complication is representation: average
density times average radius-squared differs from average density-times-radius-
squared. Hydro-only equilibrium controls separate these effects before changing
the production method. Neither control alone identifies the cause of the full
argon mismatch.

## Executed findings

The energy reader processed all five sealed V101 trajectories. Finest-grid
current-driven case, at 4 microseconds:

| Quantity | Result |
|---|---:|
| Maximum heavy-particle temperature | 617,763 K |
| Mass-weighted mean temperature | 2,654.79 K |
| Volume-weighted mean temperature | 3,773.13 K |
| Mass above the available neutral-Ar correlation's 10,000 K upper bound | 0.5978% |
| Hottest cell centroid, radius / half-domain axial coordinate | 0.161 mm / 239.758 mm |
| Electrical work / thermal gain / kinetic gain | 39.933 / 37.901 / 2.032 mJ |
| Independently reconstructed total-energy balance residual | -1.09e-13 J |

The high-temperature concern is localized near the cathode/end region. This
supports investigating the local current footprint and heat deposition; it
does not establish which physical correction is needed or validate the bulk.
The campaign uses constant viscosity: the correlation-range comparison is
context, not evidence of numerical extrapolation or a new plasma-validity gate.
Work/current/time implies about 99.83 V for the modeled terminal work. The
manifest's 18.5 V is a bulk-drop reference, not an imposed terminal boundary;
equating these quantities would require a justified voltage mapping.

The equilibrium study completed 24 cases: two meshes, three refinements, two
rotation values and two conservative-state representations. At 20,000 rad/s,
native-state radial-speed RMS after 0.1 microsecond declines with refinement:

| Mesh | n=1 | n=2 | n=4 |
|---|---:|---:|---:|
| Original | 0.32264 m/s | 0.21005 m/s | 0.12852 m/s |
| Smooth source-aligned | 0.31121 m/s | 0.20616 m/s | 0.12715 m/s |

About 89.6% of the finest native control's initial acceleration-squared residual
is in radial boundary cells. This is not a fraction of the full V101 error.
Nonrotating controls remain near roundoff (maximum radial-speed RMS 3.70e-13
m/s). Rotating drift is a measured discretization effect, not a new pass/fail
gate, an apparatus prediction or proof that this explains experimental disagreement.

## Verification and evidence

All nine new regression tests pass: five energy-reader controls and four
equilibrium controls. Review caught reader admission gaps for changed initializer
identity, stale temperature shapes, invalid species inventories and missing
accepted steps; regression cases now reject them. These checks enforce the
actual equal-mass-argon/state/history contracts rather than fabricate physics.

Tests and both reports ran in a 1G safe-dev VM, one BLAS thread, immutable
`/work/project/v102-diagnostics01`, transfer SHA256
`9c4bef38c98bf8b28a932fe0411b2052b4248382acbf8852429a3b8a484e9d5e`.
Exact commands, versions and log hashes are in `execution.json` and `versions.log`.
The input is the original V101 final04 prediction seal
`6ec20f910c149983273dfd8561b2a2f28e5d1f970ff44791af3adda998751e0a`;
its source identity is retained, not relabeled as a V102 physics run.

Independent review verified all 72 source/doc entries, current new-file hashes,
five execution-log seals, five packed input seals and the reported findings.
App checks `npm run typecheck`, `npm run build`, `npm run check:site` and
`npm run check:assets` also pass. All 330 app/asset inputs match before and after;
manifest SHA256 `47201c00b9770bd6daf5c11b3fafa39b68adcd046bb2d48c519de064aff5fc3e`.
The existing build chunk-size advisory remains. No deployment or new browser
verification was needed for these standalone research/docs additions.

The [public V102 evidence](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v102-project-foundations)
contains source snapshots, logs and both reports. Original input fields remain
in the [V101 release](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v101-bounded-flow-refinement).
V101's six spatial failures and experimental disagreement remain unresolved.
