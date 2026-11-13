# Live isothermal centrifuge numerical screen

13 November 2026. Acceptance criteria frozen before the first campaign. Retained-state
replay requirements were added after the initial candidate, without changing gates.
This checks the actual operating
backend used by the playground, not experimental accuracy or a CFD reference.
No physical coefficient is fitted, and every failed comparison remains reported.

## Root cause hypothesis and regression

The live UI sends an operation even with thermal evolution disabled. Its path is
`worker.ts → simulateFuelCentrifuge → simulateFuelOperation`. That path currently
limits the mechanical startup step by the two-rotor relaxation time only when
the spatial gas option exists. At the default 512 intervals a one-second
isothermal run takes its first step much later than the fast ion relaxation.
Sampling its linearly interpolated accepted history cannot recover that transient.

Use negligible radial diffusivity to preserve the initially uniform inertia.
Then the independent exact affine 2×2 rotor solution is applicable. At common
physical clocks 10, 30, 100, 300 and 1000 microseconds compare the accepted live
operation against that solution. Require ion wall-speed error below
`0.01 m/s + 0.03 |v_exact|`; no numerical dissipation becomes physical heating.
Also test a late current switch and resumed pre-change snapshot-only history,
preserving the canonical prefix, unique right-continuous event, time order,
positive inventories and the existing 2e-8 mechanical/inventory budget gates.

The proposed intervention reuses the existing startup/resume/event relaxation
substeps in every operation mode. It does not change nominal time intervals,
the backward-Euler/SG scheme, radial cells, transport coefficients, current or
the separate uniform-inertia reference.

## Bounded coupled campaign

Use the default lithium configuration with only discharge current changed to
0.015, 0.03 or 0.06 A. Keep thermal evolution disabled, no operating events,
duration 1 s and every other input at the live default. Compute a crossed
matrix of 64/128/256 radial cells and 512/1024/2048 nominal time intervals.
These are three discrete test cases, not qualification of a continuous slider
envelope. Include 0, 10/30/100/300/1000 microseconds, 0.01, 0.1, 0.5 and 1 s.

Report joint 64×512→128×1024→256×2048 differences and isolate space/time at fixed
finest other resolution. Also compare the actual interactive 64×512 setting
directly with 256×2048; its screen is required separately from the finest-pair
screen and cannot be inferred from fine-grid convergence. At every clock retain ion/neutral wall speeds, phases,
inner light purity, light recovery and coarsened species-inventory L1 distances.
The finest and interactive-reference comparisons require differences at most:

- Speeds: `0.01 m/s + 1% × |fine speed|`.
- Phases: `0.001 rad + 1% × |fine phase|`.
- Purity/recovery: `1e-4 + 1% × |fine fraction|`.
- Species-inventory L1 distance: 0.01 for each normalized species inventory.

Near-zero absolute allowances state the numerical screen's resolution; they
are not measurement errors. Use nested grids and exact sum restriction for
inventories. Require finite states, nonnegative inventories, final time 1 s,
and existing maximum inventory/angular-momentum/energy residuals below 2e-8.
Report all failed gates, source hashes, exact inputs and both differences in
every sequence. Retain the canonical common-clock states for independent
restriction and budget reconstruction, plus accepted-history minimum-mass
and maximum-budget witness states. Check finiteness, positivity and strictly
increasing clocks over all accepted states, not only the sampled clocks.
Run-to-run differences are convergence evidence, not certified
error bounds; a converged prescribed-coefficient model can still be physically
wrong. The measured-profile benchmark remains separate and experimentally
unqualified regardless of this campaign's outcome.

## Recorded baseline regression, before the fix

The coordinating agent ran `tests/live-rotor-startup.test.ts` inside safe-dev
against the unmodified operating backend: one test passed and two failed.
At 10 microseconds the initial ion wall-speed error was 2.399308609 m/s,
against the predeclared 0.086627375 m/s allowance. Ten microseconds after
the late current switch, the error was 1.781399281 m/s against the same
allowance. Snapshot-only continuation passed. These observations motivated
reusing the existing relaxation substeps in every operation mode; no
acceptance gate or physical coefficient was changed after seeing them.
