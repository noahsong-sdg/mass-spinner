# Independent material-stopping/loading interaction audit — v23

Source review and actual production-handler regression, 7 November 2026.
Owned files: this report and `tests/material-ui-v23.test.ts`; no production
source was changed by this audit. Browser policy remains enforced. No alternate
browser, CDP, indirect page fetch or local-clone browser rendering was used.

## Execution path and invariants

The stopping selector in `setupFusionLaboratory` changes visible input groups
and `readConfig`. Linear mode retains independent target column and fractional
slowing. Material mode uses one fixed formula-unit column and derives the
initial T column from that column times the initial site fraction; the target
toggle can set reacting T to zero without removing the stopping matrix.
Physical readouts and `aria-valuetext` use the physical column rather than the
logarithmic slider coordinate. Returning to linear mode restores its existing
stored settings.

The source computes beam transport, then renders current profiles/readouts and
its energy scan. `main.js` forwards the result to geometry, thermal and loading
observers. Source failure clears its own outputs, disables export and forwards
`null` to all three. Loading locally clears old plots/budgets/export before
calculation and catches its own domain errors; it does not mutate source
settings or replace steady-source yield/thermal heating with evolving yield.
Each loading calculation also doubles its own intervals to display a numerical
comparison. The declared per-interval T-loss bound adds an independent warning;
a small coarse/fine difference alone cannot qualify unresolved dynamics.

The duration input remains the one existing source control, mounted through
the thermal observer's duration host. Its event updates source exposure and
all observers. There is no second loading-specific duration state.

## Adversarial scenarios

The regression exercises actual source, geometry, thermal and loading handlers
against a small source-unit DOM. This tests event/state propagation, clearing,
native control attributes and generated plot presence. It does not exercise
browser layout, native range clamping, keyboard/screen-reader speech, SVG
painting, GPU appearance or deployed code.

Four cases cover:

- Mode-specific hidden controls, physical units, formula-column × T-fraction
  coupling, unloaded target preserving material stopping, and returning to
  stored linear settings.
- A deliberately out-of-domain local replacement probability clears only
  loading; source, geometry and thermal outputs remain current. Local recovery,
  live resolution changes and the shared 25 s exposure then propagate. A
  20 keV beam through a 10²³ m⁻² material slab is inside native slider bounds
  but leaves the supported transport domain: source and all dependents must
  clear, then recover when the material column returns to 10²¹ m⁻².
- Unloaded material retains heating and valid zero-neutron loading; beam-off
  gives zero beam heat and zero yield while preserving settings for recovery.
- A moderate high-dose case warns at 400 intervals and passes the declared
  step-loss budget at 1600, while still saying refinement is needed before
  interpretation. The extreme 1 A, 10⁻⁵ m², 10¹⁹ m⁻², 100 s, 0.8-replacement
  case stays explicitly underresolved at both 200 and 1600 intervals. The
  conservative bound rounds to 100% in this extreme at both resolutions;
  displaying more intervals must not imply qualification.

The first test run exposed an incorrect test fixture assumption: a 100 keV
beam through 10²³ m⁻² exits at about 0.937 keV, above the 0.833 keV lower
laboratory-energy boundary. That source is legitimately valid. The test now
uses 20 keV and the same native-range column to exercise actual invalidation.
No production guard or model was changed to satisfy the mistaken expectation.

## Review outcome

No new source/control correctness defect was established from the reviewed
paths. The potentially stale energy-response caption was reported; final
source reread confirms it now describes linear and material scans separately.
The new loading panel visibly distinguishes its experimental well-mixed
reference from steady source yield and the thermal scenario. Its resolution
warning remains a declared numerical budget, not a physical accuracy claim.

## Exact checks and tested snapshot

The final four production-handler regressions passed **4/4** (1.04 s), and
`npm run typecheck` exited zero. Dependency installation also exited zero.
All execution used Apple guest `safe-dev-c522d7ef8ec4cc53` and the trusted,
bounded stage `/tmp/mass-spinner-material-ui-v23`, with pinned project lockfile.
Its 68-file source-map SHA256 is
`136ce883ebb8db0278c4bdc0302cfe0590f8dcfb97dded58ddb0e5122115b2da`.
The loading kernel SHA256 is
`c5b8c91d77d86cf898c72fe1156d05b49d5e3f8f7de3a40b679f8638350ee7eb`.
After testing, current host hashes still matched the snapshot for source UI,
beam kernel, energy-scan projection, stopping implementation, loading core/UI,
thermal UI, geometry UI and the new test.

Commands:

```
safe-dev -C /tmp/mass-spinner-material-ui-v23 init
safe-dev -C /tmp/mass-spinner-material-ui-v23 sync --replace-guest
safe-dev -C /tmp/mass-spinner-material-ui-v23 run --online -- npm ci --ignore-scripts
safe-dev -C /tmp/mass-spinner-material-ui-v23 run -- node --import tsx --test tests/material-ui-v23.test.ts
safe-dev -C /tmp/mass-spinner-material-ui-v23 run -- npm run typecheck
```

No guest source edits were made. Host revisions were explicitly synchronized
before each relevant rerun, with dependencies reinstalled after synchronization.
The earlier two-pass/one-fail result belonged to the incorrect 100 keV test
fixture described above, not the final snapshot. Merged build/typecheck/test
and permitted live verification remain parent release gates. This audit does
not qualify stopping physics, loading convergence or any real Marathon device.
