# Adversarial triage review — v37

Review scope: challenge overclaims and improvement proposals across scientific correctness, tools, interface and technical depth. No production code changed. No project code or tests executed. Trusted host hashing verified all 386 canonical application inputs against `scientific/header-v36/tested-inputs-v36.json`; the isolated-stage runner was excluded because it is not a canonical application file. Zero missing or mismatched inputs. Thus this review concerns the exact tested v36 source baseline. The v36 test receipt is retained evidence, not a newly rerun test.

No deployed page or GPU/mobile render was observed. The managed browser-origin denial is an access boundary, not an invitation to use another route. Source evidence supports behavior and architecture findings; aesthetic judgments about current pixels remain conditional.

## Triage guardrails

### 1. Separate a converged equation from a qualified physical prediction

**Verified:** `docs/TRANSPORT-QUALIFICATION-V34.md:8–16` records 240 passing numerical refinement decisions and passing sampled angular budgets alongside five failing model-domain gates. Lines 117–119 state that the study's particle counts exceed the interactive ceiling. `docs/MARATHON-V35-RELEASE.md:43–48` records passing strict numerical comparisons for declared scenario equations and explicitly excludes experimental error bars.

**Technical cause of a possible overclaim:** discretization error, stochastic sampling error, closure error and uncertain material inputs are different error sources. Refining a discretization cannot identify all of them. **Plain meaning:** repeatedly getting the same answer does not establish that it predicts the machine.

**Accept:** retain separate current-run numerical resolution, domain-validity and empirical-calibration states, tied to the current quantity of interest. **Reject:** either “664 tests validates the physics” or “all collisions are broken.” The remedy is an observable-specific evidence display and validation plan, not changing languages or silently relaxing gates. Acceptance requires no attribution of offline high-particle convergence to an untested lower-particle browser setting.

The distinction follows NASA's [verification assessment](https://www.grc.nasa.gov/www/wind/valid/tutorial/verassess.html) and [validation assessment](https://www.grc.nasa.gov/www/wind/valid/tutorial/valassess.html): code/calculate checks and experimentally supported application validity answer different questions.

### 2. Do not reopen an already localized and corrected high-dose failure as a current defect

**Verified:** `docs/MARATHON-V35-RELEASE.md:30–48` identifies mesh-dependent placement of residual beam heating at a backing-cell center, the fixed interface-source correction, independent localization controls, and the passing corrected comparisons. The original failures remain retained. Lines 9–20 show that evolving D/T/vacancy composition, temperature-dependent recalculation, film/backing/contact transport, first-interaction neutron geometry and actual external recorded references already exist.

**Technical/plain cause of a bad recommendation:** stale audit snapshots omit later execution-path fixes; the review would be asking to implement work that is already present. **Accept:** new counterexamples against the exact v36 source, with the relevant observable, configuration and gate. **Reject:** generic proposals to “couple temperature and loading,” “add backing conduction,” or “run a real external solver” as though none exists. Existing numerical work remains useful even while LiT empirical stopping/retention and other material processes are unqualified (release report lines 107–113).

### 3. Fixed hardware can be physically correct; disconnected state visualization is the real gap

**Verified:** `src/apparatus-viewer.js:12–17,59–80,83–115` implements an actual PBR GLB viewer, picking/highlighting, camera control, reset and resource disposal. The public API at line 111 has no physical-state update. `src/marathon-ui.js:10,30–33` already offers an `onState` callback, while `src/main.js:392` uses its no-op default. The apparatus has no state-overlay link despite a usable state emission point.

**Technical cause:** the solver observer is not wired to a viewer state API. **Plain meaning:** the calculations change, but the displayed apparatus does not show those changes.

**Accept:** wire the existing callback to physically located and scaled temperature/loading/source overlays with clear units and snapshots. Keep the hardware fixed for field, current and beam-energy changes. Parameterize geometry only for geometry parameters actually used by the solver. **Reject:** deformation for every slider, more polygons as a fidelity claim, or a new rendering/framework/CAD stack without an observable requirement. These can make the picture busier while adding no scientific content. Acceptance requires an exact shared coordinate transform and tests that rendered overlay data use the selected current state, with actual GPU/mobile inspection before a visual-quality claim.

### 4. “No 3D” and “the sliders do nothing” are stale blanket claims

**Verified:** the GLB viewer above is real interactive 3D. `src/main.js:87,116–144` wires current configuration into fields and numerical trajectory visualization. `src/marathon-ui.js:30–38` propagates selected coupled state to neutron source inputs and source controls into target calculations.

Field direction need not change when only the magnitude of a uniform axial B changes; `src/main.js:128–136` normalizes glyphs and explicitly displays their reference scales. **Accept:** consistently visible quantitative legends and state-linked overlays. **Reject:** requiring a different visual shape for a parameter that does not change that shape in the declared physical model. A change must express a real computed quantity rather than fabricated motion.

### 5. Independent budgets and recordings need clearer semantics, not fake coupling

**Verified:** `src/limitations-ui.js:48–54` recomputes independent failure budgets and explicitly states that they do not change separator trajectories. `src/research-ui.js:16–28` replays exact saved moments and explicitly states that scrubbing runs no solver. `src/convergence-evidence.js:5–8` labels frozen evidence as separate from live sliders.

**Technical cause of the remaining opportunity:** these are different data/interaction modes presented inside one workspace. **Plain meaning:** a user may reasonably expect every slider to control the current machine even where a panel is showing an estimate or a recording.

**Accept:** compact live/reference/recording state indicators, a selectable marker on a regime map and carefully scoped one-process coupling where equations/data justify it. **Reject:** claiming the existing disclosure is absent, disguising recorded data as a live solve, or adding a decorative reactor to velocity-distribution recordings. Acceptance requires that every control communicates which output it owns, while exports retain that ownership.

### 6. Tool upgrades must close a measured gap

**Verified:** the application separates live numerical workers, actual GLB rendering and recorded external references; see the paths above and `docs/MARATHON-V35-RELEASE.md:16–26`. Actual OpenMC reference results remain separate from the live first-interaction model, as explicitly stated in `src/neutron-transport-ui.js:23–28`. Julia research replay also remains explicit (`src/research-ui.js:28`).

**Technical/plain cause of a bad recommendation:** language/library prestige gets substituted for a claim about the equation, observable or numerical method that is missing. **Accept:** a tool decision specifies the missing quantity, retained equations, data/validation plan, runtime/hosting budget and comparison against the current solver. A new established implementation is worthwhile when it supplies capabilities and evidence we need. **Reject:** wholesale Julia/React/PIC/CFD rewrites merely to be “SOTA”; automatic promotion of a reference code installation to calibrated operating-machine prediction. Existing work should be reused and bounded rather than discarded without a demonstrated failure.

### 7. Minimalism should remove duplication, not evidence or controls

**Verified:** `src/workspace-ui.js:17–33` retains nonmodal panels, focus restoration and same-side/mobile exclusivity. Lines 39–68 separate level/context content. `docs/HEADER-V36.md:7–13` and the current source show that mixed-case typography and inline header tabs are already implemented. Component materials already distinguish illustrative finishes from public specifications (`src/component-catalog.ts:2–23`).

**Accept:** one useful output per visible plotting space, linked selection, concise legends, contextual controls and a stable desktop comparison layout. **Reject:** counting a warm dark theme, rounded panel or a particular font as a verified functional defect; removing provenance because it adds words; restoring tutorial prose; or repeating the just-fixed capitalization/header issue as still open. Aesthetic recommendations need a specific user task and an observed or testable interaction cost. Actual pixel contrast, touch ergonomics and frame performance remain to be measured in a permitted browser.

## Review priority

1. Establish allowed deployed-browser observation before declaring the interface visually clean or correct.
2. Connect existing state emissions to quantitative, physically located visual overlays and linked plots.
3. Expose current-run evidence/validity compactly; preserve empirical limits and historical failures.
4. Choose the next scientific process by the most important displayed output and its uncertainty, with a bounded implementation and external comparison.
5. Add external infrastructure or major tool migrations only when the preceding observable-driven requirement demands them.

## Peer cross-challenge and disposition

Read the five peer reports in `docs/reviews/v37-{separator-science,marathon-science,tooling,interface,technical-depth}.md` and checked the disputed execution paths directly.

| Peer claim/proposal | Disposition after challenge |
| --- | --- |
| Plot curves are only pictures and lack exact-value inspection | **Rejected and corrected by tooling reviewer.** `src/laboratory.js:143–171` already has per-series pointer readout and Arrow/Home/End sample inspection; lines 139–141 render the selected-X line/dots. Keep responsive typography, cross-view free-cursor linking and pinned-baseline gaps. The amended T6 now recommends extending existing SVG first. |
| 800-unit SVG labels shrink to roughly 4–7 CSS px in common windows | **Accepted as source-derived scale arithmetic, not an observed screenshot.** `src/laboratory.js:101–123`, `.live-plots svg{width:100%}` and the workspace width/padding establish the mechanism. Actual container bounds/zoom behavior still need a permitted browser. No invented universal WCAG minimum-font violation is asserted. |
| Target disappears during slider dragging | **Accepted narrowly.** `src/coupled-target-ui.js:105–111` deletes the last result/plots and emits null before the debounce. Keep the last accepted view with its revision and a pending/stale indicator; disable stale exports and retain abort/revision protection. Invalid source/model states still need explicit clearing. A stale preview is presentation state, not a substitute physical result. |
| All windows initially closed is a bug | **Downgraded to a testable discoverability hypothesis.** `src/workspace-ui.js:30,75` deliberately uses a scene-first default. A single contextual cue/readout may help; opening every panel would contradict the user's minimalism. |
| Target and neutron Plots cannot coexist | **Accepted as an explicit feature gap against the user's tiled-window goal, not an accidental exception.** Same-side exclusivity is the deliberate rule (`workspace-ui.js:17–20,33`). A shared scientific comparison view or one pinned plot is a smaller first implementation than a full draggable desktop manager. Preserve mobile one-sheet behavior. |
| Sharing only playground 1 and resetting Models on re-entry | **Accepted P2.** `experience-ui.js:26,38–46` explicitly implements these restrictions. They limit reproducibility/continuity; they do not prove corrupted simulation data. Preserve legacy URLs and add explicit Reset rather than silently changing all persisted-state assumptions. |
| Independent column/thickness means the solver is physically invalid | **Rejected in that absolute form; accepted as scientific-ergonomics/consistency gap.** The knobs define a scenario density `n=N/L`; an arbitrary hypothetical density is mathematically permitted. Current ranges imply `1e22–1e31 m⁻³` (`fusion-ui.js:16`, `coupled-target-ui.js:58`). Show the implied density and provide an explicitly density-linked material mode. Do not hard-code clipping or claim measured LiT density without a dataset. Material-mode heat capacity/transport consistency requires its own data. |
| Stopped-beam tails are rejected, therefore remove the stopping guard | **Rejected.** `coupled-target.ts:82–84` and the atomic stopping domain correctly fail rather than extrapolate below available support. The real extension is event-resolved finite-film transport/retention with a complete particle/energy ledger. A domain map or bounded UI scenario is a nearer fix; uniform replacement must stay an assumed operator rather than becoming falsely labeled BCA retention. |
| D-rich target requires DD physics immediately | **Conditional.** DD is absent while D loading can grow. Generic “Neutrons” metrics (`coupled-target-ui.js:127`) should first become DT-specific or show omitted-channel status; the curve already says D–T. The omission does not invalidate DT-specific yield in a T-rich scenario. Competing DD branches are high priority for explicitly D-rich/late-dose neutron predictions and lower priority for the introductory DT playground. Their quantitative effect is not established by this read-only audit. |
| Isotropic mean-energy point source/first-collision accounting is wrong | **Rejected as a blanket defect.** These are declared bounded introductory models. **Accepted** as inadequate for angle/spectrum-sensitive irradiation, shielding, breeding or useful daughter inventories. Extend the existing OpenMC reference response only for a chosen observable; do not block basic source/geometry exploration on a full transport/depletion stack. |
| Newer radiopharma pathways must be added to complete the simulator | **Deferred as an optional thematic extension.** The new sources can inform a later irradiation/decay/extraction playground. They do not outrank working state-linked graphics, readable plots, a qualified material model, or the requested core separator experiments. Scope expansion must not turn every new company paper into an urgent feature requirement. |
| Pin matched physical comparisons and expose saved distribution/gate data | **Accepted.** These add real depth with existing solvers/archives and little default prose. Keep model/closure identity, matched invariants, exact saved times, numerical-versus-empirical uncertainty and qualification-withheld status. Do not synthesize Maxwellians from moments as though the saved non-Maxwellian distributions were shown. |

## Practical ordering for a shareable personal playground

1. **Usable current data:** responsive chart typography and stable, explicitly pending results. Verify the complete path in an approved deployed-browser/device environment; source/DOM checks cannot close that gate.
2. **One convincing scientific interaction:** connect the existing Marathon `onState` to a target cutaway, with exact depth/time/color values and physically honest magnification; permit target and neutron results to be compared. A corresponding separator orbit/field view already exists and should be retained.
3. **Reproducible experiments:** exact numeric entry, preserve chosen model, versioned links for supported scenarios, and one pin/change/restore comparison. Add compact DT-only and implied-density/validity state at the same time.
4. **Depth from existing evidence:** invariant-matched comparisons, passive collector acceptance where post-processing is physically valid, and selected archived distribution/entropy/gate replay. Each has a bounded acceptance contract and needs no new paragraph-heavy lessons.
5. **Separate scientific workstreams:** qualify browser-resolution collisions and one causal CX process for separators; finite-film stopping/retention then Li coating mass/energy evolution for Marathon. Advance DD, birth spectra, full neutron reaction response or activation networks when the selected quantity of interest requires them. These should not be bundled into a cosmetic release or a new universal backend.

This is a cross-reviewed improvement plan, not approval of a new implementation or a claim of fresh physical/visual validation.
