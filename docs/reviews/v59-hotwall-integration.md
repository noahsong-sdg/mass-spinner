# Hot-wall time integration: independent state/UI review

This is a source-level review of the v58 execution path before the v59 fix.
No production code was changed and no project scripts were executed by this
reviewer. Scientific execution belongs to the parent's isolated safe-dev run.

## Verified execution path

`fuel-centrifuge-ui.js` submits an operating history to `worker.ts`, whose live
path invokes `simulateFuelOperation(rotor, operation, {}, resume)`. The default
64-cell/512-step setting is therefore selected in `simulateFuelTransport`, not
in the UI. Improving only study-specific options would not improve deployment.

The operation loop currently uses a global quadratic grid for spatial gas and
the legacy uniform grid otherwise. Current events split a step exactly;
`capture` after the switch supplies a right-continuous `currentA`. Each accepted
integration knot is retained in `checkpoints`; the full plotting snapshots are
decimated. Both playback and time-history curves prefer `checkpoints`.

Resume validates conserved state, retains the unchanged prefix, interpolates
canonical quantities at an off-knot branch time, then continues from there.
Derived gas temperatures and pressure are reconstructed from cell energy and
species inventories. Dense output's mechanical kinetic defect remains in the
numerical ledger rather than becoming physical heat.

## Requirements for a time-refinement fix

- Keep the legacy isothermal/lumped paths unchanged unless separately qualified.
  The v51 independent test explicitly compares isothermal operation with the
  original transport trajectory.
- Retain every accepted internal step in `checkpoints`. Invisible substeps with
  only coarse outer-grid checkpoints would leave early-time playback inaccurate
  even if the endpoint solution improved.
- Resolve sharp current changes and resume starts, not only initial startup.
  The global quadratic grid is sparse at a late intervention; extra initial
  points alone do not improve its post-switch transient.
- Preserve exact event times, right-continuous current, the initial zero-time
  event, final-duration events, and strictly increasing checkpoint times.
- Do not overwrite a retained prefix when a run is extended or an off-knot
  intervention branches it. Changing total duration changes future grid knots;
  existing canonical prefix values must remain the original accepted evidence.
- Keep `steps` semantics honest. It presently means nominal base-grid intervals
  and the UI calls it “time steps.” If accepted substeps exceed that number,
  report their count or label nominal and accepted counts separately.
- Every accepted substep must carry its own signed redistribution work, impulse,
  source/cooling increments, and backward-Euler numerical loss. Combining only
  endpoint states would miss path-dependent physical work.

The v58 regression `fuel-mixture-operation-v58.test.ts` asserts the precise
quadratic first knot. If the algorithm changes, replace that implementation
assertion with the actual requirement: strict ordering, exact endpoints/events,
retained accepted states, and demonstrated startup resolution. Do not merely
change an expected exponent.

## Targeted checks requested from the parent

1. Real live defaults compared at common early times, including times inside
   accepted intervals; separate ion and neutral relative differences and local
   temperature differences. Use the previous 3% gate unchanged and include a
   finer-reference self-convergence check.
2. Drive cut/restart at late off-knot times; event values are exact and
   continuous conserved state is unchanged across the instantaneous switch.
3. Resume from an accepted knot and a deliberately off-knot cursor; retain all
   prefix state/ledger fields and validate the restarted thermal state.
4. Duration extension; no stale last-duration grid or changed prefix.
5. Legacy thermal disabled/lumped runs, zero duration and zero drive.
6. Actual emitted worker at default options, with source identity and exported
   checkpoint count checked; integration-only tests are insufficient.

## Deployed browser check plan

The Physical time slider's keyboard increment is typically 1% of duration, so
its first increment is 10 ms for the 1 s default. That is not an adequate test
of the early ion transient.

Use the **Ion–neutral spin-up** SVG instead: its keyboard `Home` then
`ArrowRight` selects the first accepted time sample and calls the shared-clock
callback. The UI pauses, selects spin mode, and reads the actual coupled
checkpoint through `diagnosticState`; it does not use the analytic
uniform-inertia reference when transport exists. Inspect several early samples
and compare their displayed times/speeds with the downloaded deployed-run JSON.

Then select the temperature-profile plot, press **Show in 3D**, and verify the
same physical time is retained. Cut power at an early selected time and verify
the continued run, current history, angular-momentum and temperature budgets.
Repeat the narrow layout checks with the populated plots, checking keyboard
sample inspection and document overflow. Save the deployed entry/worker source
identity, actual export and screenshots. A successful provider rollout alone is
not evidence of this live behavior.

## Candidate re-audit and inspected execution evidence

Reviewed the v59 production `advanceTo` / `restartTransient` implementation.
No blocking integration or state-compatibility defect was found in this review.

The implementation keeps the quadratic base targets. Between targets it uses
the accepted neutral inertia to estimate the fast rotor relaxation scale and
adds positive, increasing-time substeps. Each interior substep is captured as
a checkpoint; the base target is captured once by the outer loop. Thus the
refined mechanics also reaches plotting, interpolation, continuation and 3D
motion. The same unmodified backward-Euler advance accumulates every accepted
substep's work, impulses, numerical loss and thermal sources.

`advanceTo(eventTime)` finishes with the prior current before `applyEvents`;
the post-switch capture retains the same canonical state with the new current.
`restartTransient` then uses that accepted inertia, including at resumed starts.
Previously consumed events are exhausted before the new loop, preserving
strictly increasing future checkpoints. The non-spatial-gas branch still
advances directly to the original target and retains legacy semantics.

The UI now distinguishes nominal intervals from checkpoint intervals. One
precision caveat is that a historical snapshots-only prefix cannot reveal the
number of original discarded steps; any count derived from checkpoints is the
number of *retained* accepted intervals rather than a recoverable total of every
past integration step.

Inspected parent-executed evidence:

- `scientific/fixes-v43/hotwall59-refinement-and-resume.receipt.json`: offline
  isolated guest execution, exit zero, 616 tested inputs, SHA-256
  `d4078a7d3218baa01d2f6f3beb52addb59f59be7dde88b467223c3688fd6a1da`,
  source verified before and after the command.
- The corresponding log records **19/19 tests passed**, including exact event
  capture, retained internal steps, off-knot power branch and duration extension,
  old snapshots-only resume, existing UI/legacy operation checks, independent
  entropy/work, hydrostatics and RK4 checks.
- The exact frozen-inventory startup/switch oracle reports maximum ion
  disagreement 1.0296%, below the unchanged 3% gate; the switched case reaches
  its limiting sample at 0.650138 s after the 0.650137 s event.
- Dense full hot-wall comparisons at 201 common times show ion differences
  0.8582% → 0.2248%, neutral differences 0.7149% → 0.2402%, and local gas
  temperature differences 0.7703 → 0.2569 K as nominal steps increase
  512 → 1,024 against the 2,048-step reference. These remain finite-reference
  differences, not absolute continuum errors.

This supplies scoped source and executed-regression support. The parent's
final required build/typecheck, complete release checks and actual deployed
browser verification remain separate gates; this reviewer has not performed
or claimed them.
