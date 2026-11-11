# Operating playground adversarial audit

Scope: v51 operating interventions, gas cutaway, thermal reservoirs, and component/comparison instruments. Five independent agents reviewed thermal physics, operating numerics, scene fidelity, ergonomics, and compatibility. Parent reproduced failures and owns isolated execution and deployment verification. Implementation tests establish the reduced model's behavior, not calibration to Marathon hardware.

## Confirmed problems and chosen corrections

### Accepted thermal states and branching

**Problem:** At the first accepted step of a stiff exchange case, playback showed 583.324 K while the identical one-step solve gave 999.945 K. A current intervention restarted from the incorrect displayed state.

**Technical cause:** Integration used 512 steps but saved roughly 100 full display snapshots. Sampling interpolated across the omitted accepted steps. The implicit solve correctly equilibrated quickly; its intermediate states were discarded before display and resume.

**Plain cause:** The recorder skipped the fast heating and then drew a slow ramp between the frames it kept.

**Fix:** Preserve lean canonical checkpoints at every accepted step and current event. Reconstruct profiles and cumulative distributions on demand. Playback, continuation, time plots, motion clocks and comparison domains use these accepted states. Sparse full snapshots remain available for existing consumers and older records.

**Why:** It corrects the common source of display and resume inconsistency without changing validated integration equations or multiplying storage by full derived profile/CDF copies. Between accepted steps, interpolation is still a first-order time approximation; it does not qualify unresolved substep transients.

### Continuation state and diagnostics

**Problem:** An endpoint-only continuation could accept negative normalized inventories or a nonfinite phase, and reset retained resolution warnings to zero.

**Technical cause:** Validation depended on taking a new integration step, and cumulative diagnostic maxima were initialized for a fresh run.

**Plain cause:** Ending immediately bypassed checks normally performed while advancing and forgot warnings from the past.

**Fix:** Validate retained canonical inventories, phases, momenta, ledgers and thermal states before continuation. Store prefix resolution maxima with accepted checkpoints. Older records without these diagnostics retain their conservative global bounds.

**Why:** The boundary is the actual continuation state, including a zero-length continuation. Prefix diagnostics describe retained history, while conservative legacy bounds avoid falsely clearing qualification warnings.

### Pulse/coast reference domain

**Problem:** The worker could veto a safe short pulse followed by coastdown using an overspeed constant-current reference.

**Technical cause:** Reference mechanics were computed before the operating history and ignored current switches.

**Plain cause:** The reference left the power on after the actual experiment switched it off.

**Fix:** Validate the schedule first, then evaluate the established linear fixed-inertia response by exact current-step superposition. Include switch boundaries and analytic interior ion-speed extrema in domain checks. Instantaneous power is right-continuous; speed is continuous. Baseline setup identity and no-event behavior are preserved.

**Why:** Reuses the existing analytic mechanics and retains physical domain guards rather than suppressing errors or introducing a second numerical reference solver.

### Thermal settings and interpretation

**Problem:** An unfinished numeric thermal draft could invalidate a bath run after thermal evolution was switched off. Fixed-temperature descriptions also contradicted an evolving thermal run; reference liner conductance could appear to control the live reservoir exchange.

**Technical cause:** Inactive thermal fields were still serialized into operation validation, and shared copy did not distinguish initial/reference quantities from the optional evolving closure.

**Plain cause:** A disabled setting still affected the calculation, and labels described two different models as if they were one.

**Fix:** Canonicalize inactive thermal settings at the UI boundary, disable their inputs, and scope descriptions and conductance controls to the relevant reference or operating model. Temperature navigation selects the actual liner or vessel.

**Why:** Enforces the real model-selection boundary without weakening active thermal validation or changing existing reference equations.

### Historical and component controls

**Problem:** Seeking into history could leave the main and component current controls showing a later intervention. Inspector power state and drive arrows could remain stale; reaching the event limit could throw from an input handler.

**Technical cause:** Inputs represented the last edit rather than the accepted cursor state, reference mode only conditionally refreshed drive glyphs, and history insertion was not handled transactionally.

**Plain cause:** Different instruments were displaying different moments of the same experiment.

**Fix:** Refresh clean controls and component power state from the accepted cursor, explicitly restore reference drive state, and reject an over-limit intervention before changing accepted history.

**Why:** One accepted physical state drives the instruments, while unfinished edits remain distinguishable from accepted output. Existing history limits remain enforced.

**Live integration follow-up:** Native verification exposed a scheduled-reference mismatch that earlier UI fixtures missed: the renderer used the final coasting speed, but instruments used initial current and omitted reference gas speed. Reference diagnostics now use the actual final scheduled sample, and fixtures carry the same schedule as the worker. Reference animation phase is not presented as transient physical time: seek and time-plot cursors are hidden, the clock is labeled as a final reference, and trajectory endpoint cards are scoped separately.

### Comparison endpoints and camera ownership

**Problem:** A 1 s / 2 s comparison could end the longer run's plotted line at 0.984375 s instead of the shared 1 s cursor. Ordinary result reloads disabled automatic portrait framing. Different geometries could produce different SI camera distances after resize despite a shared-camera label.

**Technical cause:** Curves were truncated to the preceding saved point; camera restoration marked a pristine camera as user controlled; independent geometry fit ratios altered the comparison views differently.

**Plain cause:** The plot stopped before the shared clock, and automatic layout was mistaken for a user's camera choice.

**Fix:** Include the sampled canonical state at the exact common horizon. Preserve camera ownership during automatic refreshes and synchronize comparison SI poses after resize.

**Why:** Preserves user framing while allowing untouched views to adapt to portrait. Exact common endpoints make plotted readouts agree with the shared physical cursor.

### Hidden motion and responsive navigation

**Problem:** Hidden tracers rebuilt invisible geometry on every frame. Repeated unchanged status/legend writes generated unnecessary DOM mutations. Narrow navigation could leave the active playground clipped.

**Technical cause:** Physical state updates and visible geometry writes shared an unconditional path, while navigation did not reveal the selected tab after layout changes.

**Plain cause:** The app redrew things nobody could see and could hide the selected workspace name.

**Fix:** Return current physical clocks while skipping hidden geometry updates; refresh geometry on reveal. Avoid unchanged text writes and reveal the selected tab within its own scroll container.

**Why:** Retains physics and reveal behavior while removing demonstrated redundant work. No frame-rate claim is made without performance measurements.

**Live mobile follow-up:** At 320 × 740, the default playback panel began at about 450 px while the model extended underneath it. The canvas had occupied the full scene height without accounting for this overlay. The mobile default frame now reserves the measured playback footprint; moving the panel removes that reservation. Desktop placement and the separate comparison layout retain their existing behavior.

## Physics evidence and limits

Independent tests check the two-reservoir analytic exchange and wall-cooldown solutions, a method-of-lines RK4 oracle, current-step mechanics, inventory/angular-momentum/energy conservation, and hot/cold coolant entropy production through cuts, coast and restart. Numerical mechanical loss remains separate from physical heat. Mean neutral pressure uses fixed initial inventory and evolved gas temperature.

The thermal closure remains two lumped reservoirs with assumed deposition and fixed coefficients. It does not solve electron/ion temperatures, ionization/recombination, molecular internal modes, spatial heat flow, condensation or extraction back-reaction. Passing the gates does not establish device accuracy or convergence across the entire slider domain.

## Release evidence

Final candidate: `audit52e`. All project execution ran in the parent-owned safe-dev VM, on guest copy `/work/home/fix-v43-source`. The 554-file input snapshot SHA-256 was `391aebe372c7f9aff77f3ba43dfd167ce6ac5e0d8f51b4a2251cff22cf6c0bff`; inputs were verified before and after each gate. The 151-file release SHA-256 was `4ce78b323708b809af9503b2e839d2ff30049678544a9c90ebfdd5ebd6902fa8`.

All eight final gates exited 0:

- `npm test`: 1,111 passed, 0 failed.
- `npm run typecheck`
- `npm run build`
- `npm run check:site`
- `npm run check:assets`
- `node --import tsx scientific/fixes-v43/verify-release-worker.mjs`
- `node --import tsx scripts/verify-fuel-release-v44.mjs`
- `python3 docs/reviews/v42-collision-data-probe.py`

The bundled fuel worker gate covered 144 centrifuge/transport cases, 20 operating cases and 49 map cells, including rejected domain violations. The full suite includes the independent analytic/RK4, entropy, checkpoint, legacy-data, scheduled-reference, camera, mobile and UI regressions. See `scientific/centrifuge-v44/audit52e/final/receipt.json` and its adjacent logs for exact command receipts.

Cloudflare confirms version `beba48bf-9437-466a-8bac-5b1b09bc11ea` at 100%. Native Brave verification reopened the deployed page and confirmed entry `/assets/index-BQeuCzLU.js`. The immutable build/provider receipts deliberately retain `browserVerified: false`; independent browser observations are recorded separately in `scientific/centrifuge-v44/audit52e/browser/browser-verification.json`.

Observed on the final deployment:

- Unequal 1 s / 2 s A/B runs both reach the exact common 1 s endpoint, with separate sampled readouts.
- A power cut at 0.4 s produces 0 A and power-off in the main and component instruments at 0.6 s; gas coasts at 480.6 m/s. The scheduled equilibrium reference shows its nonzero final speed (226.1 m/s), 0 A and disabled power, with a final-reference clock and no transient seek slider.
- With drive off, gas–liner conductance 1e6 W/K and cooling off, both thermal curves show 999.9 K at the first accepted 1/512 s step, pressure 20 Pa, and relative energy-budget error about 3.131e-12. Disabling thermal evolution after a blank capacity draft recovers a valid 500 K bath and disabled capacity 10 J/K.
- At 320 × 740, Home restores the default mobile panel and a fully visible reactor above it: canvas bottom 384.5 px, panel top 392.5 px; document width remains 320 px. Custom moved positions intentionally retain their placement. ArrowUp removes the default reservation; Home restores it.
- At 390 × 844, Controls, Temperature and Inspect open as single responsive sheets. The liner material disclosure identifies illustrative tungsten and the two-reservoir scope. Direct native picking of a solenoid retaining cheek selects its magnetic-field instrument.
- Desktop playback advances the physical clock, velocities and linked spin-up plot cursor to the 1 s endpoint; the 3D apparatus renders with the selected cutaway/tracer representation. The viewport override was reset afterward. No captured browser warnings or errors were reported.

Final-release captures: `comparison-endpoint.jpg`, `coastdown-instruments.jpg`, `scheduled-reference.jpg`, `thermal-first-step.jpg`, `mobile-320.jpg`, `mobile-390-controls.jpg`, `mobile-390-inspector.jpg`, and `desktop-running-plot.jpg` in that browser directory. Earlier candidate `audit52c` also received native Basic Spinner, Models and Research navigation/render/plot smoke checks; those captures are retained under its own directory and are not represented as final-release screenshots. Those shared playground implementations were unchanged between those candidates.
