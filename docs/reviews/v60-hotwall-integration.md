# Independent hot-wall integration review, v60

## Scope and evidence

This is a source-path and data-semantics review. No project code or scientific
job was executed by this reviewer, and no live browser was operated. Numerical
qualification must use the parent-run safe-dev receipts and campaign evidence.
No production code was edited by this reviewer.

Verified path: `fuel-centrifuge-ui.js` builds operation/thermal input, sends
`fuel-centrifuge` to the emitted worker, which calls `simulateFuelOperation` with
empty transport options. That function initializes `simulateFuelTransport`, then
couples accepted species/momentum to `advanceFuelMixtureThermal`. Accepted
checkpoints feed `sampleFuelTransport`, curves, playback and diagnostic meshes.

## Verified defaults, limits and controls

- `src/worker.ts:36` passes `{}` for new and resumed operating runs.
- `src/fuel-transport.ts:208` defaults to 64 gas/species cells and 512 nominal
  time intervals. The gas mesh is equal-volume: edges `R sqrt(i/n)`.
- `src/fuel-centrifuge-ui.js:117` hardcodes 16 radial tungsten cells when the
  spatial liner option is enabled. The default liner thickness input is 1 mm.
- Gas conductivity input defaults to 0.1 W/(m K), and the film conductance is a
  total W/K quantity. Both are user-prescribed inputs.
- The spatial gas model is opt-in and marked experimental; thermal evolution
  itself is disabled by default. “Live defaults” for this campaign should mean
  the actual numerical defaults after explicitly enabling the spatial model,
  not that a fresh unconfigured page already evolves this thermal field.
- The public solver supports 2–1,024 gas cells, 1–32,768 nominal intervals and
  2–128 tungsten cells. The live UI exposes no numerical grid/time controls.
  Raising a solver option in a scientific script does not change the UI worker.
- v59 time refinement inserts and retains accepted steps around explicit
  transients; the number of retained intervals is reported separately from the
  nominal count. It is not an embedded error estimator.

The outer gas cell width is exactly `R [1-sqrt(1-1/n)]`, and its representative
point-to-wall gap is `R [1-sqrt(1-1/(2n))]`. At R=0.12 m and n=64, their leading
approximations are 0.9375 mm and 0.46875 mm. These are geometric scales, not
proof that a physical or numerical wall layer is resolved.

## Boundary treatment and plotted quantities

`src/fuel-gas-thermal.ts:73` adds a gas half-cell resistance
`1/(8 pi L kappa n)` to `solid.inner`. `solid.inner` from
`src/fuel-thermal.ts:74` already contains the prescribed film resistance
`1/gasWallWK` and the logarithmic half-cell tungsten resistance. Hence the
exchange is based on the difference between representative gas/solid cell
temperatures divided by their total series resistance. It does not impose
equal gas and solid cell temperatures or erase a finite film jump.

`src/fuel-centrifuge-ui.js:357` plots distinct gas and tungsten curves using
their representative radii. The curves are not joined across the interface,
and the description calls them accepted cell temperatures. The metric labels
“Inner liner cell” and “Outer liner cell” accurately avoid claiming surface
temperature. The common-radius plot must not be read as a resolved pointwise
wall temperature or as a prediction of optical emission.

`src/fuel-scene-tools.js:36` samples the spatial gas temperature and pressure
from the same cell selected by `floor(n (r/R)^2)`. Even a probe at r=R reports
the outer gas cell value, not an inferred gas-side wall-face temperature.
This is conservative cellwise diagnostic reconstruction, but its returned
`reconstruction` label currently says only “Cellwise constant volume density”.
If a user-facing label is touched, it should explicitly include cell-average
temperature/pressure semantics. Do not invent a separate physical wall field
unless its resistance-based reconstruction and scope are exposed.

The longitudinal diagnostic surface rebuilds to the actual accepted cell count
and uses exact equal-volume edges. It therefore preserves the numerical radial
partition when gas resolution increases. The transverse slice is 64 equal-radius
display rings sampled from accepted cell values, independent of the solver
grid. A mesh rendered with 64 rings is not evidence of 64 physical or numerical
cells; if grid resolution increases markedly, that slice can under-display a
thin layer even though the longitudinal surface and probe use the correct
accepted state.

## Continuation and default-change risks

`src/fuel-operation.ts:115` requires matching gas cell count, liner grid,
apparatus/thermal setup and conserved inventories for continuation. The
snapshots-only compatibility path preserves accepted state, but it does not
regrid it. Therefore a conditional increase of *new-run* defaults is coherent;
silently applying that increase to an older resumed run is not.

If numerical defaults change, either:

1. Preserve the accepted source run's gas/time/solid grid explicitly on resume,
   with input validation and tests for an older 64-cell history; or
2. Explicitly start a new run on the new grid, losing continuation only when the
   user chooses a new setup. Do not interpolate old state onto a new grid as a
   hidden fallback.

A minimal worker fix may pass `{cells:resume.transport.cells,
steps:resume.transport.steps}` for a validated resume while retaining a changed
new-run default. The accepted liner grid still comes from operation thermal
input and must remain unchanged. Such a policy needs an actual emitted-worker
regression, not only a direct solver test.

## Qualification recommendations and assessment

The prior v59 study fixes the radial grid, so its rotor convergence cannot
qualify the hot-wall gas boundary layer. Compare unequal gas grids by
conservatively aggregating particle counts and internal energies into common
annuli, then reconstructing temperature from U/N. Comparing a coarse cell's
representative temperature with a fine point sample tests different observables.

Useful separate observables are common-annulus gas temperature/pressure,
gas-side heat exchange and integrated exchange, total thermal energy,
species cumulative inventories, inertia and both rotor speeds. A norm scaled
only by the background 500 K can hide a tiny poorly resolved thermal signal;
also report error relative to the evolving wall-heating increment where
meaningful. Keep absolute/roundoff floors explicit near the initial state.

Joint refinement must distinguish the error remaining at fixed gas grid from
the one caused by time stepping. A diagonal sequence alone can hide cancellation.
At least two time resolutions on each gas grid, a finer-space reference and
separate solid-grid controls are appropriate. A threshold crossing is a
conditional tested result, not a universal resolution guarantee.

**Current source-path assessment:** accepted-state coupling, cell-average
plot semantics and conservative continuation are coherent. The sources alone
do not establish that the live 64/16/512 setting resolves the hot-wall layer.
Any new default or resolution claim must follow the parent-run joint study.

## Candidate and executed matrix re-audit

Inspected the actual parent-executed
`scientific/fixes-v43/hotwall60-joint-matrix.log` and matching receipt: exit 0,
624 inputs, source SHA-256
`5627e1a7001d7279e3645b84026b25f10f1d0159ba6f5775a4080b8d2a749683`,
source verified before and after execution. The campaign spans gas grids
64/128/256 and nominal intervals 512/2,048/8,192, with tungsten cells n/4.
Common physical-annulus comparison reconstructs temperatures from projected
canonical species inventories and gas energies.

Against its finite 256/64/8,192 reference, the actual live 64/16/512 case has
0.966639 K maximum local temperature difference, 5.94845% relative wall-flux
difference above the explicit 0.5 W signal floor, and 0.295934% cumulative wall
heat difference above the explicit 1e-6 J floor. Thus integrated heat passes
the 1% gate while local temperature and wall flux fail their 0.1 K / 1% gates.
The maximum local temperature and relative flux differences occur near
0.021752 s, not solely at the earliest microsecond samples. A successful rotor
gate or a small error normalized by the initial 50 W load would miss this
remaining local thermal error. The 64/16/8,192 comparison is much closer
(0.0123973 K local temperature and 0.0231965% relative flux), suggesting that
time error dominates this particular matrix. This is finite-reference evidence,
not independent continuum validation or a claim that all spatial cases pass.

The planned profile copy is scientifically appropriate:

> Accepted gas and tungsten cell-average temperatures. Early wall-layer detail
> needs joint mesh/time refinement; no axial temperature is solved.

It states the reconstruction and qualification limit without claiming a resolved
wall-face field. Keeping current numerical defaults while reporting failure of
local qualification is more defensible than silently increasing just one grid
or equating passing conservation with accuracy. Since defaults stay unchanged,
the existing continuation schema needs no migration or regridding fallback.

The other production change inspected in `src/fuel-gas-thermal.ts:95` computes
`Math.max(...values, boundary.coolantK)` once per Newton residual evaluation,
rather than once per row. The array is not mutated during the tolerance map;
the operands and order are unchanged. This removes repeated full-array scans
without changing the numerical tolerance, equations, material domain or error
handling. Existing independent thermal/convergence gates remain necessary in
the final release; no separate implementation-mirroring test is needed for the
hoist itself.

No blocking integration issue was found in these bounded candidate changes.
Final build/typecheck, actual worker checks and browser verification remain
parent-owned release requirements. This reviewer has not claimed to execute
those checks or to verify a newly deployed page.
