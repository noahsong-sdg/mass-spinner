# Full project audit · 17 November 2026

## Verdict

**The learning simulator and conditional equilibrium calculator are useful, but four P2 defects should be corrected before calling the interface finished.** One additional P3 loading-cost issue is measured. No P0/P1 finding or new scientific arithmetic blocker was confirmed in the inspected paths. This is a bounded audit, not proof that every parameter combination or archived research solver is correct.

Five independent reviewers covered centrifuge physics, numerical evidence/claims, state handling, reliability/security/performance and Advanced-model physics. The coordinator traced the findings and exercised the deployed interface. No application code or acceptance gates were changed during this audit.

**Design anti-pattern verdict: pass for the purpose-specific simulator layout.** The 3D stage, docked controls and plots serve actual simulation tasks, rather than a generic marketing/card layout. Mobile panels preserve core functionality and measured bottom navigation targets are at least 44 px high. This is a qualitative design judgment, not an automated accessibility certification. Long scrollable panels and translucent backgrounds merit continued usability observation; no new contrast violation was measured, so neither is counted as a defect.

## Confirmed findings, ordered by impact

### F1 · P2 · Invalid thermal edits leave the old answer looking current

- **Location:** `src/fuel-centrifuge-ui.js:124,127,130`; normal invalidation at `289–303`; export at `433–449`.
- **Reproduction:** Enable thermal evolution and accept a run. Clear **Coolant temperature (K)**. The field is empty, but plots remain accepted and Export remains enabled. The successfully downloaded result still contains `result.transport.operation.thermal.coolantK = 500`. No prior-input/stale notice appears.
- **Technical cause:** Numeric listeners call `changed()` only when the input is nonempty and valid. Invalid edits therefore skip revision increment, pending scope, cancellation and export disabling. Export checks accepted-result/revision ownership, not the validity of the edited controls.
- **Plain explanation:** The invalid edit is ignored without telling the user that the answer belongs to the previous inputs.
- **Impact/category:** Scientific interpretation and input accessibility: visible controls and exported results can disagree without explanation.
- **Recommended correction:** Invalidate on every enabled numeric edit; keep prior results only with explicit stale labeling, and disable result-dependent actions until valid inputs are accepted. Do not send invalid inputs to the solver. This reuses existing accepted/pending ownership instead of adding a second state store or coercing missing inputs.
- **Regression:** Edit an already-enabled accepted field to empty/out-of-range using its real input event, with no manual `ui.run()` call. Existing `tests/fuel-operation-ui-v51.test.ts:59–65` manually invokes run and therefore misses this event-path failure. Cover conductivity and liner thickness as well as the four lumped thermal inputs.
- **Evidence:** Native deployed reproduction and independent JSON inspection. `/tmp/mass-spinner-full-audit-invalid-thermal.jpg`; `/tmp/mass-spinner-audit-stale-thermal-export.json`.
- **Suggested follow-up:** `/harden` for this specific state transition.

### F2 · P2 · The shared experiment loses current interventions

- **Location:** `src/scenario-state.js:1,11–21`; `src/experience-ui.js:102–107`; operating history in `src/fuel-centrifuge-ui.js:175–176,289–297`.
- **Reproduction:** Run initially at 0.03 A, seek to 1 s, then cut power. The accepted run extends to 2 s and exports initial current 0.03 A plus `events:[{timeS:1,currentA:0}]`. Copy link records scalar current 0 and duration 2. Opening that link produces a zero-current run from the beginning, with final neutral speed 0 m/s.
- **Technical cause:** Scenario capture serializes current control coordinates, whereas initial drive and interventions live in separate accepted operation/history state. Those fields are absent from the version-2 scenario schema.
- **Plain explanation:** The link remembers the last slider positions, not how the experiment reached them.
- **Impact/category:** Reproducibility and requirements. The success message says “Copied current settings,” but the textbox is named **Shareable experiment link** and there is no warning about lost history. Equilibrium calculator inputs and centrifuge playback mode/time are also omitted; these are additional limits of the same setup-only contract.
- **Recommended correction:** If sharing an experiment is the intended contract, introduce a versioned initial-drive/event payload, validate it through the existing operation rules, and retain legacy scalar links as constant-drive setups. If setup-only sharing is intentional, label that limitation explicitly and offer the existing reproducible result export. Silently guessing an initial current is not acceptable.
- **Regression:** Perform a real intervention, share/restore through production scenario handling, and compare initial drive, events and common-clock outputs. Include a legacy scalar link and malformed event history.
- **Evidence:** Native copied-link → new-tab reproduction; `/tmp/mass-spinner-full-audit-history-export.json`; `/tmp/mass-spinner-full-audit-shared-history.jpg`.
- **Suggested follow-up:** `/harden` for the versioned experiment contract, or `/clarify` if intentionally limiting links to setup.

### F3 · P2 · One failed 3D download poisons all subsequent retries

- **Location:** `src/fuel-assembly.js:7`; callers `src/fuel-centrifuge-ui.js:63–66,335,381,453`.
- **Technical cause:** `template ??= loader.loadAsync(...).then(...)` caches the promise even when it rejects. New run and reactivation reach the same cached rejection rather than issuing another model fetch.
- **Plain explanation:** A failed download is remembered as the permanent answer until page reload.
- **Impact/category:** Reliability: transient network failure can leave the main 3D experience unavailable even after connectivity returns. Numerical controls can still operate.
- **Recommended correction:** Clear the cached promise on rejection, preserving successful/in-flight deduplication and the original surfaced error. This addresses the failed cache directly without substituting inaccurate fallback geometry or retrying forever.
- **Regression:** First asset request rejects; a subsequent explicit attempt succeeds; simultaneous requests share one load; successful templates remain cached.
- **Evidence:** Source-confirmed execution path. Network-failure injection was not performed in the deployed browser; do not present this as an observed production incident.
- **Suggested follow-up:** `/harden` for failed-load lifecycle.

### F4 · P2 · Published implementation links point at older source

- **Location:** `scripts/understanding-page.mjs:7`; `docs/UNDERSTANDING-MASS-SPINNER-02.md:394–397`; `web-assets/how-it-works.html:72`.
- **Technical cause:** Published source URLs resolve against GitHub `main`, while the deployed runtime comes from `codex/linked-physics-guide`. The linked `main/src/fuel-operation.ts` has blob `74e937e…`; audited source has blob `36da3b7…` and contains coupling changes absent from that linked implementation.
- **Plain explanation:** “Live equations” sends the reader to an older version of the equations implemented in the playground.
- **Impact/category:** Documentation accuracy and reproducibility. Runtime numerical results are not invalidated, but following the guide does not reliably reveal their producing implementation.
- **Recommended correction:** Generate implementation links pinned to the producing release commit and check the emitted URLs in a regression. Reconciling the entire long-lived branch with `main` is a separate, broader review; a moving branch name alone would still not identify an exact release.
- **Regression:** Build the guide/help pages with a known release identity and assert that implementation links use that revision. Keep citations to independent literature distinct from implementation links.
- **Evidence:** Public guide DOM URLs, repository renderer source and independent GitHub API/blob comparison.
- **Suggested follow-up:** A focused provenance fix; `/verify` its emitted links and release identity.

### F5 · P3 · Default startup eagerly includes legacy rendering code

- **Location:** Static `three/webgpu` import in `src/main.js:51`, plus eagerly initialized Advanced interfaces.
- **Evidence:** Fresh CI build: main JS 1,219.77 kB minified / 375.90 kB gzip; OrbitControls chunk 283.57 / 73.16 kB; three.module chunk 352.61 / 84.35 kB. The default centrifuge uses a separate WebGL apparatus viewer, yet the legacy renderer implementation is part of the initial module path.
- **Technical/plain cause:** Allocation is lazy, but the renderer code is still imported eagerly. The browser downloads/parses code for models the user has not opened.
- **Impact/category:** Performance, especially cold mobile startup. Download/parse payload is measured; startup latency, frame time and RAM impact were not profiled. The roughly 90 MB release archive is not the initial page download.
- **Recommended correction:** Move the legacy scene implementation behind its actual view activation, retaining current resource-allocation guards. Compare the initial module graph and cold-start behavior before/after. Avoid adding a new graphics stack merely to reduce eager loading.
- **Regression:** Default centrifuge startup does not request the legacy renderer chunk; Advanced selection still loads it and succeeds.
- **Suggested follow-up:** `/optimize` focused on that import boundary.

## Scientific findings and boundaries

The source/analytic reviewers found no new sign, dimensional, force-balance, species-counting or energy-ledger defect in the inspected centrifuge path. They checked annular drive torque and Ohmic power, reciprocal collision torque, evolving neutral inertia, redistribution work, separation/thermal flux coupling, cylindrical equilibrium normalization and inventory cuts. A scalar neutral angular speed, prescribed diffusivity/conductivity/collision/drag inputs and thermal deposition closures remain assumptions, not experimentally established apparatus properties.

Advanced source review covered prescribed-field charged filters/Boris stepping, quartic double-well dynamics and ring-collision limits; beam stopping, reaction attenuation, target loading and heat/isotope ledgers; blanket decay and fixed OpenMC reference scope; and Laurelin's zero-dimensional pulse/work/D–D yield calculations. No new arithmetic blocker was confirmed. This does not independently reproduce every upstream coefficient or qualify continuous browser parameter domains.

Important limits remain correctly disclosed:

- The lithium state is prescribed all-gas; gas-phase survival, chemistry, ionization and discharge sustainment are not predicted.
- The live radial mixture transport is an overdamped closure, not resolved multicomponent fluid momentum. Conservation alone does not establish the closure's physical accuracy.
- Historical live-model numerical screens cover selected nodes/settings, not every slider combination. The standalone equilibrium screen is separate and conditional on isothermal rigid rotation.
- Closed-inventory purity/recovery does not predict extraction throughput. Cascade, pumping and fuel-loop references do not become simultaneous outputs of the closed vessel.
- Experimental qualification remains false. Previously examined argon data retain failed optical/electrical comparisons, diagnostic/input identifiability gaps and inherited calibration disclosures.
- LiT stopping/retention remains conditional; blanket TBR is a frozen reference; Laurelin does not solve coupled depletion, fusion heating, magnetic equilibrium or plant electricity.

The team rejected an apparent 3D/time-series mismatch as a defect: time-series plots deliberately identify themselves as **Evolving trajectory**, independently of the final reference gas view. It also rejected `/qualification` without `.html` as a broken link: the deployed clean URL works. An optional Laurelin “Peak” label over only supported reactivity samples deserves clarification if that UI is edited, but the overall unsupported-yield warning already appears; it is not counted as a confirmed physics blocker.

## Deployed interface coverage

The coordinator used the native in-app browser, without headless/CDP automation or policy bypass, on the existing Cloudflare site:

- **Centrifuge:** accepted thermal run and invalid-input/export failure; piecewise current intervention and copied-link restoration; composition plots; component selection/material disclosure; scene/view controls; independent equilibrium invalid-temperature rejection, empty/full-cut semantics, sampled state and JSON export.
- **Beam target:** 3D concept geometry loaded; controls and initial-source/energy-response plots loaded; turning the beam off changed neutron production, incident power and assembly heat to zero while per-projectile reference curves remained defined.
- **Future blanket:** page, controls and decay plots loaded; advancing cooldown to 500 h changed the displayed Hg/Au fractions. This pass did not separately confirm the final rendered geometry after its loading state.
- **Introductory charged separator:** 3D and plots loaded and the default integration completed; the zero-electric-field preset displayed infinite cold cutoff. Completion of that preset's integration was not separately checked before switching views.
- **Model lab:** common-corotation equilibrium, ICR, gyro-orbit, drift-orbit, static double well and collisional double well completed representative runs. These are smoke tests, not numerical convergence studies of every mode.
- **Research replay:** saved Julia plots loaded with **qualification WITHHELD** and a statement that scrubbing runs no solver.
- **Laurelin:** 3D, pulse plots and energy readouts loaded; seeking the endpoint updated time/phase/temperature. Scope identifies low-burn yield and unsolved fusion electricity.
- **Mobile:** 320×740 and 390×844 layouts had no document horizontal overflow in the inspected centrifuge states. Header actions, guide, one-sheet navigation, component inspector and calculator remained usable. Bottom navigation button heights were 44 px. Temporary viewport overrides were reset.

No browser console errors were recorded in the main audit tab across these checks. Guide source links were inspected; this pass did not re-exercise every action of all seven guide steps or every individual slider. Keyboard range controls and chart endpoints were exercised. No full WCAG contrast audit, screen-reader session, network-fault injection, memory/GPU profiling or comprehensive dependency-vulnerability scan was performed.

The deployed equilibrium export's eight producing-file hashes and aggregate SHA-256 match the audited working tree: `ccdceb92c065d355ae139168774e5f481d2dd2d3ed6f43736cf32fd24b1f6a30`. Runtime `b7894bc` and audited HEAD `8cab091` differ only by the preceding audit report.

## Fresh verification

[Verify run 44007738768, attempt 2](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44007738768/attempts/2) passed at exact `8cab091a3458a050142049f9227238d18e51b53d`. The evidence reviewer independently inspected the final logs.

- `node --import tsx --test --test-concurrency=1 tests/fuel-equilibrium.test.ts tests/fuel-equilibrium-ui.test.ts`: 16 passed, including the 8,640-case Decimal reference screen and additional SI/edge regressions.
- Guide/integration, experimental/reference and spatial/worker subsets in `.github/workflows/verify.yml`: 41, 24 and 29 passed respectively.
- `python3 -m unittest discover -s scientific/electron-applicability -p test_screen.py -v`: 17 passed.
- `python3 -m unittest discover -s tests -p test_argon_reference_export.py -v`: 3 passed.
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: 1,423 passed; zero failed/skipped.
- `npm run typecheck`, `npm run build`, `npm run check:site`, `npm run check:assets`: passed. `git diff --check`: passed.

Execution used the existing offline non-root Docker CI workflow with one CPU, 1 GiB and dropped capabilities. No repository application/scientific code ran on the host. Host standard-library work only inspected JSON and hashed files. This audit reran application/numerical regressions, not every archived OpenFOAM/FiPy/PETSc/Julia research campaign. No test or scientific acceptance gate was relaxed.

Local evidence: `/tmp/mass-spinner-full-audit-ci-20261117.log`, `/tmp/full-audit-evidence-8cab091-attempt2.log`, `/tmp/mass-spinner-full-audit-equilibrium-export.json`, `/tmp/mass-spinner-full-audit-desktop.jpg`, `/tmp/mass-spinner-full-audit-mobile-320.jpg`, plus F1/F2 artifacts above.

## Recommended order

1. Correct F1's stale-input/export behavior and F2's experiment-sharing contract, each with an end-to-end regression.
2. Repair F3's failed asset cache and F4's release-pinned implementation links.
3. Address F5 only with a measured import-boundary/cold-start comparison.

These are finite completion tasks for the existing product. The audit found no reason to reopen a broad discharge-physics expansion merely to fix them. Experimental performance remains a separate unmet claim, not a prerequisite for using the clearly scoped learning playground and conditional equilibrium calculator.
