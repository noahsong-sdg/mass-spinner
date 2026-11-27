# Live history plotting

## Observed problem and cause

On the deployed guide, Replay spin-up exposed two full 946-point curves at
t = 0.04896675 s, despite a one-second run. The history adapter supplied the
whole accepted trajectory to `renderPlots`; animation called `setCursor` but
updated no paths. Spin-up readouts also used endpoint velocities. Simply put,
playback moved a marker across an already finished result.

## Change

Chronological plots can opt into `revealUntil`. Their paths, uncertainty bounds,
endpoint markers and hover values include only history through the shared clock.
The in-between endpoint is linearly interpolated, using the same piecewise-linear
segments as the original scalar plot. Missing values remain gaps and repeated
event times retain both sides of the jump. These scalar plot interpolants do not
replace the model sampler or integrate new physical states.

Playback updates data layers inside the existing SVG, leaving its focus, axes,
legend and resize observer intact. Rewind retracts the history. The axis ranges
remain fixed using the accepted run's extent so their changing scale cannot
create an apparent change in acceleration. Deliberate graph or timeline seeking
can inspect later accepted states; hover alone cannot reveal them. Static plots
retain their original DOM structure and behavior. Both pinned runs share the
same reveal time.

Spin-up speed and slip readouts, and the thermal-work readouts, now show the
current sample in transient modes instead of an endpoint. Numerical budget-error
readouts remain explicitly labeled run-level maximum errors.

The physics worker still computes the accepted trajectory before playback.
Streaming the integrator is a distinct architectural change. Reusing its accepted
samples preserves convergence behavior independently of rendering frame rate;
this change makes plotting progressive rather than changing numerical integration.

## Verification

The first complete run (44195525385, source 91ff84e) passed 1,452 of
1,453 tests. Its existing keyboard endpoint test exposed a real coupling:
`onSelect` depended on the 3D callback to advance the revealed plot. The test
uses an unavailable motion renderer, so End changed the shared time but left
the visible curve at zero. Explicit keyboard and pointer selections now move
the plot's own reveal cursor before notifying the shared clock. The progressive
plot regression also tests a callback that only records time, without advancing
the controller itself. No existing assertion was weakened.

The preceding focused integration group passed. A superseded run was canceled
after inspection found that the first implementation wrapped static SVG paths
in groups; static plots now retain their exact previous DOM structure.

Execution is confined to the repository's isolated offline 1 GiB CI container.
Local safe-dev initialization was unavailable because the host memory-pressure
gate refused initialization; repository and dependency code were not run on the
host. Final CI [44197980745](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44197980745)
passed at producing revision `401eeb3d4690c731ac8d5d79b1a7fa80cfb46ebc`:

- `npm run typecheck`: passed application and contract checks.
- Six focused Node test groups: 30, 52, 16, 47, 24, and 29 tests passed.
- `python3 -m unittest discover -s scientific/electron-applicability -p test_screen.py -v`: 17 passed.
- `python3 -m unittest discover -s tests -p test_argon_reference_export.py -v`: 3 passed.
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: 1,453 passed; none failed, skipped, or canceled.
- `npm run build`, `npm run check:site`, `npm run check:assets`: passed.
- `git diff --check`: passed.

Build emitted its existing large-chunk advisory; this is not a new performance
qualification. CI's asset checks are structural; deployed runtime evidence is
recorded separately below.


## Review boundaries

- Correctness: only time-history topics opt into progressive revelation. Spatial
  profiles, equilibrium scans, and ordinary plots keep their previous semantics.
- Compatibility: the public plot controller retains `setCursor`; the new option
  is additive. No stored scenario, export schema, or worker request changes.
- Accessibility: SVG identity and focus survive each animation frame. Playback
  readouts stay silent; deliberate keyboard inspection announces selected values.
- Physics: existing accepted trajectory values, uncertainty data, repeated event
  times, and missing values are retained. The renderer does not change the solver.
- Scope: drawing is progressive; worker integration remains computed ahead of
  playback. This avoids making numerical results depend on GPU frame rate.


## Deployed browser verification

Published the verified CI artifact, not a host-built checkout, to
<https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/>.
Cloudflare version: `f7be88a5-5578-44ba-85e6-8f9a3b481765`.
The live document loaded `/assets/main-C7LrQZ2m.js`; guide source links point to
`401eeb3d4690c731ac8d5d79b1a7fa80cfb46ebc`. Twenty-one older hashed assets
were retained for open sessions, without replacing current document resources.

Direct native browser checks on the deployed site:

- Guide Replay spin-up, then Pause: t = 0.03537925 s, 390 points per curve.
  Play and Pause again: t = 0.0924835 s, 465 points per curve. The accepted
  endpoint has 946 points. No future line segments were displayed.
- At the second pause, both readout times were 0.09248 s; ion/gas speeds
  were 252.3/225.7 m/s, agreeing with the displayed current clock state.
- Guide Show angular momentum retained that clock and revealed 465 points
  on all four curves. Total momentum and net external impulse read
  8.30e-6 kg m²/s at that selected time.
- Rewind returned to t = 0 with exactly one point per curve and zero values.
- Plot End reached t = 1 with 946 points per curve; Home returned to zero.
  SVG focus remained intact in both cases. Resumed momentum playback then
  reached t = 0.05834175 with 427 points on each curve.
- Physical-time Home followed by ArrowRight selected 0.01 s. Spin-up,
  work, temperature-bath, separation, momentum, and inertia histories all
  exposed exactly that time while switching topics. Composition had no
  chronological reveal attribute and remained a spatial profile.
- At 390 × 844, document scroll width was 390 px; the plot was 320 px wide
  and retained its 0.01 s endpoint. Reset the viewport override afterward.
- No captured console errors. The 3D apparatus remained visible. This is
  verification of the changed history/playback path, not a fresh claim of
  experimental qualification or an audit of every playground.

Screenshots saved locally:
`/private/tmp/mass-spinner-live-spinup.jpg`,
`/private/tmp/mass-spinner-live-momentum.jpg`, and
`/private/tmp/mass-spinner-live-history-mobile.jpg`.

Opening the tutorial files in Cursor was attempted through the native app
interface but was blocked by the locked Mac. The editable website guide is
`docs/UNDERSTANDING-MASS-SPINNER-02.md`; the introductory guide is
`docs/UNDERSTANDING-MASS-SPINNER.md`. Diagrams and styling are authored in
`scripts/guide-diagrams.mjs` and `web-assets/guide.css`.
