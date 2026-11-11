# Gas motion in the Marathon centrifuge

Scope: the conditional, two-rotor Marathon centrifuge. This is a visualization of accepted simulator results, not a calibrated Marathon device or a new particle-transport solver.

## Execution path and root cause

The controls dispatch a `fuel-centrifuge` request. The worker returns `simulateFuelCentrifuge` results and producing-code identity. The UI rejects obsolete replies, then loads `buildFuelCentrifugeGeometry` in the apparatus viewer. Previously this geometry contained a static radial composition slice, and the viewer rendered only on interaction or state changes. The returned ion and neutral angular velocities never drove a time-dependent gas layer. Simply: the physics calculated spin, but the display did not show it.

The accepted geometry now owns a gas-motion adapter. The viewer has an explicitly enabled animation callback; ordinary reference models retain event-driven rendering. Pending, failed, inactive, hidden-tab, reload and disposal paths stop or freeze the clock. Camera interaction and hardware picking retain their existing behavior. Gas tracers cannot intercept component picks; their meaning is available under Inspect → Gas motion.

## Representation and physical boundaries

| View | Positions | Rotation | Flow |
| --- | --- | --- | --- |
| Equilibrium | Neutral species sampled from the accepted final-speed equilibrium; ions uniform | Accepted final ion/neutral rates, held fixed | Boundary throughput packets |
| Spin-up | Both populations uniform, matching the lumped rotor inertias | Exact solution from rest at the displayed physical time | Hidden: no time-dependent pumping field is solved |
| Flow · rotation averaged | Same equilibrium radii; each moving tracer averaged over azimuth | Rates remain reported; fast angular phase is not displayed as aliased dots | Same physical throughput, at a slower-motion scale appropriate for pumping |

Stationary gas remains discrete and stationary in Flow view. Equilibrium does not assert that the selected spin-up duration suffices to reach radial equilibrium. The existing `a²/D` and residence-time diagnostics remain relevant. Uniform mechanical inertias do not change when the separate equilibrium reference is displayed.

No interpolated outward migration, axial chamber velocity, gyromotion, thermal orbit, resolved ionization front, cascade transit or inner-product outlet rate is invented. Moving dots are bulk tracers. Ion markers are rings, enlarged and oversampled relative to neutral dots. Species are cyan/light and amber/heavy. Each tracer carries its represented inventory in scene metadata; finite species counts are stratified, with at least one tracer for each nonzero population. Marker count is not an ionization measurement.

## Equations and checks

The existing reciprocal two-rotor equations are unchanged:

`I_i dΩ_i/dt = τ − Γ(Ω_i − Ω_n)`

`I_n dΩ_n/dt = Γ(Ω_i − Ω_n) − D Ω_n`

The new phase function integrates the same analytic eigenmodes: `θ(t) = ∫₀ᵗ Ω(s) ds`. It uses a small-argument series to avoid cancellation during initial spin-up. `Ω(t_end) × t` would rotate accelerating gas incorrectly. An independent RK4 integration of velocities and phases checks the analytic result. Derivative, zero-torque, uncoupled, ballistic, signed-torque and stiff-start cases cover adjacent limits.

For neutrals, `y = r²/a²`, `β_s = m_s Ω_n² a²/(2kT)` and `CDF_s(y) = (exp(β_s y) − 1)/(exp(β_s) − 1)`. Inverse-transform sampling uses stable small-β and large-β expressions. It is checked against the solver CDF through β = 10⁶ and against the accepted species inventory cuts to finite-tracer quadrature accuracy. Bulk rotation never changes sampled radii. Ions use uniform volume sampling because no ion equilibrium profile is supplied by this model.

Pumping already provides `Q_s = S p_wall,s`. Each of 12 packets per species per boundary represents `N_neutral (Q_s/Q_total)/12` particles. With `f = Q_total/(kT N_neutral)`, their crossing rate gives exactly `12 f × packet weight = Q_s/(kT)`. Feed and outer exhaust have matching throughput. Packet paths follow the illustrative external plumbing; path speed is not a predicted fluid speed. The internal chamber has no animated axial flow. At fixed chamber pressure, changing inlet conductance changes required upstream pressure rather than falsely changing the prescribed downstream gas load.

One physical clock drives both species and both charge classes. Initial Equilibrium/Spin-up timing targets at most 1.8 rad per screen second; Flow timing targets a quarter turnover per screen second, with azimuthal averaging rather than undersampled rotation. Each view retains its initial scale across ordinary slider changes, so increasing drive or pump speed produces a visible rate change. Extreme changes retime the shared clock to limit angular speed to 14.4 rad/screen s or throughput to half a turnover/screen s. The actual physical time and scale are always shown; rendering at arbitrarily low frame rates is not qualified. An additional regression checks that doubling pump speed preserves the scale while extreme changes respect the sampling budget. Pause, restart and spin-up scrubbing change the display only. Reduced-motion preference disables autoplay and also pauses an already running view if the preference changes. Hidden tabs discard hidden elapsed time on resume.

The first playback draft recomputed its normalization after every accepted result. Technically, the inverse dependence of clock scale on the maximum rate canceled the visual speed increase. Simply, faster gas was being shown in stronger slow motion. Retaining a preferred scale fixes ordinary comparisons; bounding only extreme rates keeps the rendering usable. This is preferable to independently accelerating ions, neutrals or flow, which would distort their physical rate ratios.

## Why this implementation

This connects the existing accepted physics to a single additional scene layer and an opt-in viewer clock. It avoids changing the collision backend, inventing radial transport coefficients, or adding an unvalidated CFD/kinetic solver merely to produce attractive motion. Bulk movement is a group rotation; small point buffers carry gas and boundary packets. Rotation-averaged rings are generated only if Flow view is requested. Existing apparatus geometry, physical units, controls, plots and exported worker provenance remain intact.

The initial GPU verification exposed a depth mismatch: a custom point shader wrote ordinary depth while the apparatus renderer uses logarithmic depth. In simple terms, the two layers disagreed about which objects were in front, hiding gas behind the vessel even through the open cutaway. Native `PointsMaterial` with two shared procedural sprites fixes this at the rendering path itself, including logarithmic depth, pixel ratio and color handling. This is preferable to disabling gas depth testing, which would show gas through opaque hardware, or maintaining a parallel custom depth shader. A regression asserts the native material, proper depth settings and distinct charge-class sprites; actual GPU visibility is checked separately on the deployed site.

Rendering uses Three.js [Points](https://threejs.org/docs/#Points) and buffer geometry; playback follows the browser's [reduced-motion preference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).

## Verification record

All execution is in the existing offline Apple safe-dev copy at `/work/home/fix-v43-source`. The reviewed host controller transfers and checks file hashes before and after execution. Earlier studies and releases are preserved. Final source receipt, commands, release checksums and deployed-browser observations are recorded under `scientific/centrifuge-v44/motion46e/` after the final gate. The preceding `motion46d/` GPU observations are preserved separately; the final build repeats verification after fixing clock normalization.

Earlier focused checks: 41/41 motion/geometry/UI/viewer cases; 18/18 legacy-viewer/phase cases; 26/26 motion/flow/UI cases. The first broad pass exposed six older viewer fixture documents without DOM event-listener methods. The fixtures were updated to represent the required document interface; production behavior was not weakened with a fallback. A subsequent full pass before adding Flow view passed 927 tests and all build/release checks.

This work does not repair or requalify outstanding live-collision transport studies. Existing collision-data gates recompute saved evidence; passing that recomputation is not a new transport-convergence result.

## Final observed result

Tested source manifest SHA-256: `32b36abe94c44b4d4a39f3636611ef476bc1b1d548439d44e8a9de5b4f2963a0` (509 inputs; 507 host-present and two preserved guest-only historical runners). Host-present hashes were verified again after testing. Release aggregate SHA-256: `ec725d5491077302acfb3537aa793f2d10289a13bd611e4ed2aa6377f7e15d44`.

| Final command | Result |
| --- | --- |
| `npm test` | 931 passed; zero failed/skipped |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run check:site` | Passed |
| `npm run check:assets` | Passed |
| `node --import tsx scientific/fixes-v43/verify-release-worker.mjs` | Passed |
| `node --import tsx scripts/verify-fuel-release-v44.mjs` | Passed, 144 actual bundled centrifuge cases; invalid protocol/domain rejected |
| `python3 docs/reviews/v42-collision-data-probe.py` | Passed saved-data reconstruction; existing unresolved transport evidence remains |

Cloudflare reports version `5d692638-0f29-4cf6-9675-7182199dc8c3` at 100%. Live Browser Use observed the corresponding `index-C5fkuPlL.js` entry. The build receipt records browser verification as false because it predates this separate GPU check; it is preserved unchanged.

Live observations on the final build, with screenshots and DOM readouts saved in `motion46e/browser/`:

- Visible particles rotate inside the cutaway with hardware occlusion. Two unchanged-camera captures record advancing motion. Pause holds the clock exactly.
- Spin-up scrubber gives zero ion/neutral speeds at 0 s and matches the computed endpoint at 1 s.
- Current 0.03 → 0.06 A changes ion/gas wall speeds from 1195/1168 to 2390/2337 m/s while retaining 180.7 μs per screen second. The spin-up plot endpoint agrees.
- Current zero stops both populations. Pumping remains pressure driven. With zero current, pump speed 0.02 → 0.04 m³/s changes Q from 0.2 → 0.4 Pa m³/s and turnover from 1.81 → 0.9048 s, retaining 452.4 ms per screen second.
- Inspect → Gas motion exposes charge/species legend, marker weighting, equilibrium/transport limits and schematic throughput meaning.
- At 390×844 and 320×740, playback controls remain inside the viewport with no horizontal document overflow. Actual orbit, zoom, spin-up scrubbing and plot keyboard inspection work. On narrow screens plots occupy a foreground window; close it to return to unobscured playback.
- Switching to Beam target hides the gas controls; switching back restores the rotating centrifuge. No console warnings/errors were recorded. The temporary viewport override was reset.

These are functional/GPU checks, not an FPS benchmark, a new radial-transport convergence study, or experimental qualification of Marathon hardware.
