# Deployed browser acceptance matrix — v25 preparation

Prepared 2026-11-08 by read-only source tracing. Target: [Mass Spinner](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/?level=2).

**Every browser observation below is NOT RUN.** The current browser action was rejected by an explicit managed-origin policy before authority to observe page content was granted. The saved local site allowance does not establish effective permission. No alternate browser, CDP, proxy, public fetch or local clone was used. This document prepares the work to perform after the supported browser surface grants authority; it does not establish deployed functionality, appearance or mobile usability.

`DELIVERY-V24.md` records Cloudflare version `9214b0ff-9ec3-4dc1-b48d-e17b7f593496`, created `2026-11-08T07:17:31.988378Z`. That is documentary baseline evidence, not a fresh provider or browser observation in this pass. No application, test, dependency or build execution was performed for this document.

## Acceptance and evidence rules

For each row record the actual deployed URL, date, browser/surface, viewport in CSS pixels, action, observed result and screenshot or other browser-supported evidence. Record PASS only after the stated observable is seen. Use FAIL for a discrepancy and BLOCKED for a denied/unavailable action. Keep NOT RUN until then. A successful source test or HTTP response cannot substitute for a rendered frame or native interaction.

Run P0 rows first: authority, each playground initial view, each actual apparatus, a control-to-output change, mobile navigation and critical error recovery. Then complete the full matrix. Restore defaults between cases and capture the initial and changed settings; otherwise results from different operating points cannot be compared. For every slider and select listed below, sweep a normal value and both endpoints, verify its displayed physical value/unit, keyboard adjustment, the correct dependent outputs, and restoration. Log transformation must show physical values, not exponents.

Use desktop 1440×900 and 1280×800; narrow portrait 390×844 and 360×800; landscape 844×390. Also check both sides of implemented 600, 740, 760, 900 and 1000 px breakpoints where the relevant panel changes layout. Responsive browser resizing establishes CSS layout only; native touch/pinch and real mobile GPU behavior require a supported touch/mobile surface and must be reported separately.

## Actual scene inventory

| Playground / entry | Actual source path | Required live scene observation | Browser status |
| --- | --- | --- | --- |
| 01 Mass Spinner | `main.js` → legacy live Three renderer → `/separator.glb` | Hardware, trajectories and field/boundary views, camera and legacy component inspector | NOT RUN |
| 02 Marathon source | `setupFusionLaboratory` + `setupApparatus('beam-target')` | Blender `/models/beam-target.glb`, actual mesh selection, catalogue-only reaction regions | NOT RUN |
| 02 Blanket disclosure | `setupBlanketExplorer` → `setupApparatus('blanket')` | Blender `/models/blanket.glb`, six cutaway layers, catalogue-only plasma region | NOT RUN |
| 03 Centrifuge | `selectMode` → `apparatus.show('centrifuge')` | `/models/centrifuge.glb` | NOT RUN |
| 03 Rotating filter | same, `rotating` | `/models/rotating.glb`; additional live assembly/orbit/field views | NOT RUN |
| 03 Gyro | same, `gyro` | `/models/gyro.glb` | NOT RUN |
| 03 ICR | same, `icr` | `/models/icr.glb`; additional live assembly/orbit/field views | NOT RUN |
| 03 Curved field | same, `curved` | `/models/curved.glb` | NOT RUN |
| 03 Double-well potential | same, `doublewell` | `/models/doublewell.glb` | NOT RUN |
| 03 Double-well dynamics | same, `doublewell-dynamics` | Shared `/models/doublewell.glb`; different controls/solver, no claim of a different hardware export | NOT RUN |
| 04 Research | `showResearch` → `createResearchLoader` → `research-ui.js` | Recorded moment plots/tensors; **no 3D apparatus is implemented** | NOT RUN |

There are seven runnable Models selector entries and nine new manifest entries across 02/03, using eight unique new GLBs. The II.E–K reference atlas and historical research figures are intentionally diagrams/recordings. They must not be represented as interactive hardware. If “a 3D model in every playground” includes 04, that remains a product requirement gap; source inspection cannot turn its recorded velocity moments into a physical machine scene.

## Shared navigation, layout and input matrix

| ID / priority | Native browser actions | Required observation / evidence | Status |
| --- | --- | --- | --- |
| G01 P0 | Open exact deployed origin through supported browser; then load `?level=1` through `4` | Authority granted; actual page content and screenshot, not a policy page. Record deployed asset/version evidence available through the supported surface | NOT RUN |
| G02 P0 | Visit all four name-only nav buttons by pointer and keyboard; Back/Forward/reload | Correct panel/URL, selected state and accessible page title; no hidden playground controls intercept focus; no duplicate introductory blocks | NOT RUN |
| G03 P0 | Repeat each initial playground at desktop and portrait widths | First useful visualization and main controls are discoverable; no overlay obscures plot/camera, body overflow, clipped values, blank panel or need to read repeated subtitles | NOT RUN |
| G04 | Open/close every native disclosure; traverse all controls using Tab/Shift+Tab | Visible focus, associated labels, usable range/select keys, retained state, no focus trap; detailed scope available on demand and real errors visible immediately | NOT RUN |
| G05 | Resize each active 3D scene and plot; portrait ↔ landscape | Canvas aspect/camera fit update, labels/legends/inspector wrap, no overlap or unbounded page width; small schematic may scroll within its own frame | NOT RUN |
| G06 | Hover/touch plot, then focus SVG and use arrows/Home/End | Nearest-sample readout changes to corresponding x/series values; selected cursor/legend remains readable; no pointer-only access or interpolated values presented as exact samples | NOT RUN |
| G07 | Switch 01→02→03→04 while calculation/model import/replay fetch is pending | Old output never replaces current panel; visible loading/errors belong to current operation; no hidden 3D viewer allocation or old component description | NOT RUN |
| G08 | Change a valid editable numeric field to empty/out-of-domain text, then valid value, where native UI permits | Domain error clear and accessible; stale result/export disabled or cleared; restoration recomputes current inputs. Do not invent invalid slider values through script injection | NOT RUN |
| G09 | Exercise exports and Copy link using granted capabilities | Correct current operating point/schema/filename, no stale run; separate actual download/clipboard result from merely clicking a button. Do not request unrelated upload/full-access permission | NOT RUN |

## Immersive workspace candidate: additional acceptance

The local v25 candidate now moves existing live nodes into `src/workspace-ui.js` floating windows and a full-window stage, styled by `src/workspace.css`. These are additional requirements for that candidate after deployment; they are not observations of the v24 deployed baseline. Existing control/plot rows still apply to the moved nodes. No numerical solver change is implied by moving their DOM mounts.

| ID / priority | Actions | Required observation / evidence | Status |
| --- | --- | --- | --- |
| W01 P0 | Enter all levels with windows closed; resize desktop/mobile | Apparatus fills available viewport behind dock/top navigation; Research fills stage with honest recorded data. No residual document shell, empty page scrolling or scene beneath a hidden ancestor | NOT RUN |
| W02 P0 | Open Controls, Plots, Target, Inspect, View and Model info where applicable | Named live nodes retained once, values/listeners/results preserved across close/reopen; controls can change plots while apparatus remains interactive. Unavailable windows do not leave an empty dock action | NOT RUN |
| W03 | Desktop open opposite-side then same-side windows; narrow viewport with two open | Opposite sides coexist without accidental overlap; same-side open replaces prior window. Mobile permits one window; responsive transition keeps a usable window and correct dock `aria-expanded` state | NOT RUN |
| W04 P0 | Mesh click on each apparatus; keyboard catalogue selection; close Inspect and click again | Correct Inspect window opens and highlights/current description agree; camera drag does not open it; controls survive being temporarily replaced by Inspect | NOT RUN |
| W05 | Dock and close buttons via keyboard; Escape inside window; Tab through it and scene | Heading receives focus on explicit dock open; close/Escape restores visible dock button; no focus goes into hidden panel or unavailable context; scene remains reachable without a modal focus trap | NOT RUN |
| W06 P0 | Marathon Beam target ↔ Future blanket while Controls/Target/Plots/Inspect open | Correct full-stage scene and matching catalogue/plots; source-only windows close and hide when unavailable; no source status or material description leaks into blanket | NOT RUN |
| W07 | Models: rotate filter→ICR→centrifuge→all reduced modes with Controls open | Native hidden contract survives layout overrides: cutoff only rotating, correct controls/results by mode, no old species/current/collection claims. Nonorbital modes must not offer an empty View window | NOT RUN |
| W08 P0 | Open scan controls, Thermal/Loading plots and all long inspector text at1280px,800px,390px and short landscape | Floating window content fits its own width; scan grid does not retain five110px minimum tracks; thermal controls/plot stack when panel is narrow; inner content scrolls, title/close stay reachable, no clipped axis/value | NOT RUN |
| W09 | Open/close lazy GLB Inspector/window and switch levels/context during load | Moving toolbar/readout away from figure does not break retry/reset/selection; visible frame loads and resizes; late load cannot replace current apparatus | NOT RUN |
| W10 | Hide all windows; show copy-link fallback/error; reduced-motion preference | Unobstructed stage, useful accessible status, share action readable by assistive technology, native reduced-motion respected; critical numerical/loader errors remain discoverable without relying on hidden document content | NOT RUN |

## Every apparatus: repeat for each scene in the inventory

| ID / priority | Actions | Required observation / evidence | Status |
| --- | --- | --- | --- |
| A01 P0 | Scroll scene into view, wait for load, capture initial and rotated frame | Actual depth/parallax and occlusion, readable metallic/roughness shading, sensible scale/framing, finite visible geometry. No static photograph as an apparatus replacement; no inverted outer shell, missing inner surface or black model | NOT RUN |
| A02 P0 | Drag orbit, zoom wheel, supported pan/touch/pinch, reset view | Camera changes smoothly with correct bounds; reset fits current model at current width; page scrolling works outside canvas. Record touch separately if unavailable | NOT RUN |
| A03 | Focus canvas; arrows and `+`/`-` | Camera rotates/zooms with visible focus; page does not consume handled keys; reset remains keyboard accessible. Check legacy 01 separately rather than assume its keys match the new viewer | NOT RUN |
| A04 P0 | Click at least one visible mesh per component ID, then choose each catalogue item via “Inspect a component” | Selected mesh highlighted and dropdown/readout agree; purpose and material shown; unspecified materials remain explicitly unspecified, not engineering assertions | NOT RUN |
| A05 | Inspect beam/plasma/collection region; click actual nearby vessel/flange | Region-only entries do not fabricate solid mesh. A flange is not mislabeled a collector. Beamline/support meshes in Marathon have their own identities; no stale selection after model change | NOT RUN |
| A06 | Drag >5 px over mesh, release outside, cancel gesture; then ordinary click | Orbit does not accidentally select; cancelled/old pointer gesture does not select on later release; ordinary click still works | NOT RUN |
| A07 | Rapidly change modes before model load completes; leave/reenter viewport | Latest selected mode wins, camera/catalogue match it, no flashes of old model or duplicate canvases. Check shared double-well asset under both solver modes | NOT RUN |
| A08 | If supported, observe a genuine asset failure then use Retry 3D; separately supported GPU context restoration | Explicit failure, Retry available, successful retry removes error and paints frame. Controls/physics remain usable. Context restoration must request an actual new frame; do not claim tested when only synthetic lifecycle tests exist | NOT RUN |

## 01 Mass Spinner

| ID / priority | Actions / actual controls | Required observation / invariant | Status |
| --- | --- | --- | --- |
| S01 P0 | Defaults; Run; then B (`field`), voltage, transverse energy and Species B mass (`play-mass-b`) separately | Current plots, cutoff, trajectories and collection update together; A=40 u, both +e. Completion label reflects 96/species and 20 ns defaults | NOT RUN |
| S02 | Separation and No electric field presets; voltage=0; zero transverse energy; equal A/B masses; Reset | Preset state/readouts agree; no fictitious finite cutoff at zero voltage; equal-mass controls remove mass discrimination within sampling uncertainty; Reset restores all four basic inputs | NOT RUN |
| S03 | Hardware / Ion trajectories / Fields & boundaries; inspect component; reset camera | Correct view pressed state; hardware opacity/fields/tracks match view; actual GPU rendering and legacy inspector remain usable | NOT RUN |
| S04 | Live update on/off; alter input during Run/refinement; rerun | Debounced current update only, no stale plots/ledger/export; Run reenabled after success/error; cancelled refinement cannot publish against changed settings | NOT RUN |
| S05 | Expand results; timestep refinement; export | Injected = wall + end + other recorded particle states; purity denominator and empty collector cases sensible; work/loss-corrected energy and impact residual visible. Refinement is convergence evidence, not experimental validation | NOT RUN |
| S06 | Copy link, open/reload link; unsupported shared input; switch away/back | Four basic settings preserved, manual copy fallback usable if clipboard unavailable; unsupported link reports default restoration. Hidden advanced source settings stay pinned | NOT RUN |

## 02 Marathon: source, loading, thermal and blanket

| ID / priority | Actions / actual controls | Required observation / invariant | Status |
| --- | --- | --- | --- |
| M01 P0 | Beam energy 20–500 keV; current 10⁻⁵–1 A; illuminated area 10⁻⁵–10⁻¹ m² | Source metrics, energy-response marker/curves, beam footprint and downstream observers update. Current scales source and heat; area changes flux/temperature/loading exposure, not steady total reaction rate at fixed column. Beam energy is laboratory D⁺ energy | NOT RUN |
| M02 P0 | Beam off/on and Tritium loaded off/on | Off source clears neutron production appropriately; no stale neutron schematic/plots; beam-off thermal cooldown possible; unloaded target does not imply zero incident beam power. Under Geant4 mode loaded column follows material column × site fraction | NOT RUN |
| M03 | In Target & electrical assumptions choose linear then Geant4-derived stopping | Linear shows imposed loss and independent T column; Geant4 shows formula-unit column and initial T site fraction. Hidden inputs do not override selected mode. Geant4 estimate is not a direct LiT measurement | NOT RUN |
| M04 | Sweep linear T column 10¹⁹–10²⁵ m⁻²; imposed loss 0–0.9; alpha deposition 0–1; accelerator efficiency .1–1 | Steady depth/energy plots and complete power ledger correspond; efficiency affects wall-plug input, not invented fusion gain; transmitted beam differs from deposited layer heat; finite-domain scan omission message remains visible | NOT RUN |
| M05 | Geant4 formula-unit column 10¹⁸–10²³ m⁻² and initial T fraction 0–1 | Initial stopping/yield and loading initial population synchronize; zero fraction/beam give finite zero-yield diagnostics, no NaN/undefined charts | NOT RUN |
| M06 P0 | Single exposure duration 0–100 s in Exposure; change while loading open | One duration drives source totals, fixed-source thermal and evolving loading. These are separate observer models; thermal/steady source are not falsely presented as loading-feedback-coupled | NOT RUN |
| M07 | Thermal heat capacity 10²–10⁶ J m⁻² K⁻¹; conductance 0–20000 W m⁻² K⁻¹; initial/coolant −20–200 °C; after shutoff 0–200 s | Temperature curve/peak/time constant update with correct °C conversion; conductance 0 displays Adiabatic; shutoff marker at exposure; h>0 cools toward coolant, h=0 has no cooling; duration0/beamoff recover correctly | NOT RUN |
| M08 | Open Thermal energy & fuel budget; vary initially hot/cold assembly and beam; export exposure | Signed heat-to-coolant, stored/deposited energy balance consistent; fuel budget explicit fusion-only estimate, not target lifetime; closing disclosure removes optional plot clutter | NOT RUN |
| M09 P0 | Open Isotope loading; replacement 0→1; solver tolerances 10⁻⁷/10⁻⁹/10⁻¹¹; set high dose using Geant4 column10¹⁹, duration100, replacement1 | T fraction/evolving neutron rate finite and nonnegative; responsive calculation and current numerical comparison. Repeat tighter tolerance before judging high-dose bias; compare actual reported values, not plot appearance | NOT RUN |
| M10 | Loading zero dose, no T, replacement0/1; open Populations & budgets; export loading | D/T/vacancy populations and cumulative channels preserve displayed atom budgets; raw/scaled residuals and tighter-reference comparison available; undefined relative zero-yield error explicitly handled; solver diagnostics match export | NOT RUN |
| M11 | Neutron geometry distance .1–3 m and sample area1–100 cm² | Sample flux curve/cursor change; global source unaffected; point-source warning at spot-radius/distance>.1; sample area is distinct from beam area. No attenuation/angular-spectrum claim | NOT RUN |
| M12 P0 | Open Blanket; complete A01–A08 on its actual 3D scene | Layer picking/material purposes and camera work inside disclosure at desktop/mobile; no blank zero-size canvas after opening | NOT RUN |
| M13 | Blanket cooldown0–500h, isomer fraction0–1, capture optical depth0–8 | 197Hg/197mHg/197Au decay fractions/marker update; τ0 utilization limit finite; capture fraction=1−exp(−τ). Separate 195Au plot retains its stated own inventory | NOT RUN |
| M14 | Change source energy/current/loading, then reopen Published OpenMC case | Frozen published TBR/yields remain frozen and labelled; future blanket concept stays distinct from compact neutron source. No slider claims to rerun OpenMC or predict gold production | NOT RUN |
| M15 | Select Marathon component in 3D dropdown/mesh and optional SVG schematic via keyboard/pointer | Component inspector sync both directions, material uncertainty retained; schematic footprint scales, but conceptual 3D geometry does not pretend to be a quantitatively solved beam envelope | NOT RUN |
| M16 | Export source and each observer; change inputs then export again | Current source settings and independent thermal/loading configs carried in correct file; error disables respective export and clears stale result without breaking other valid panels | NOT RUN |

## 03 Models: every runnable method

Common finite-orbit controls: masses1–200 u; charges1–3; seed; thermal/fixed source; axial energy2–100 eV; axial temperature0–10 eV; radius1–15 cm; particles96/256/512; timestep40/20/10/8 ns; neutral density0/10¹⁶/10¹⁷/10¹⁸ m⁻³, elastic cross section0–10⁻¹⁷ m² and neutral mass1–200 u. Sweep their normal/endpoints with the selected mode's visible controls only. Record cheap defaults first; maximum particles/duration is a separate bounded performance case, not a requirement to freeze the mobile UI.

| ID / priority | Method and controls/actions | Required observation / invariant | Status |
| --- | --- | --- | --- |
| L01 P0 | Select each of seven systems, run defaults, complete its scene acceptance | Controls, current model title, apparatus, scope, plots and export agree; previous model metrics disappear; orbit-only view tools hidden for reduced/equilibrium modes | NOT RUN |
| L02 | Centrifuge: common-corotation / prescribed-density Gaussian / coupled magnetic Gaussian closures; central/bulk composition boundary | Correct relevant controls show/hide and label changes; Gaussian width .05–1 m, log density14–20 and B .04–.5 T used only as declared. Axis/wall B boundary offered for coupled closure only | NOT RUN |
| L03 | Centrifuge rotation0–30000 rad/s; Ti/Te1–50eV; A fraction1–99%; cut.05–.95; grids400/1000/2000; Li6/Li7 preset | Radial composition/density/current/B/potential and inventory plots respond. Zero rotation/equal masses limits sensible; cut changes diagnostic inventory, not per-pass collection. Preset remains equilibrium-only | NOT RUN |
| L04 | Centrifuge radial refinement; equal/unequal charges under closures; adverse wall-field boundary if naturally reachable | Refinement compares radial quadrature; finest-grid button disabled. Invalid closure/domain clears stale output and recovers. No false regular solution is displayed when wall condition cannot be satisfied | NOT RUN |
| L05 P0 | Rotating filter: common orbit controls plus B/voltage/transverse energy; neutral collision controls and timestep study | Finite tracks, absorption counts, work/impact/neutral loss and uncertainty readouts respond; strong-field/cold cutoff shown as ideal benchmark, not exact finite-temperature separation | NOT RUN |
| L06 P0 | ICR: RF amplitude0–200V/m; frequency0–200kHz; co/counter handedness; Tune RF; common controls | Tune tracks species A charge/mass/B; RFoff has no RF work; resonant co-rotating vs detuned/counter comparisons respond. DC radial field is zero and field arrows do not invent solved antenna structure | NOT RUN |
| L07 | Gyro: B .02–.5 T; reference transverse energy .1–30 eV; beam1–2000eV; log duration10⁻⁶–10⁻²s | Gyromotion/phase diagnostics and units respond; explicitly reduced reference-energy model, no false collector recovery | NOT RUN |
| L08 | Curved: B .02–.5 T; transverse .1–30eV; beam1–2000eV; length .1–10m; curvature radius .2–10m | Curvature/grad-B deflection responds; guiding-center validity (ρ/R, transit/gyro scale) warns at unsuitable regimes; conceptual curved channel does not imply full-orbit collection calculation | NOT RUN |
| L09 | Double-well potential: B .02–.5T; voltage0–1200V; κ0–2; canonical momentum −.3–.3; inner crop0–.8; reference energy .1–30eV; radius .05–1m | Effective-potential curves/minima change physically; nonzero canonical momentum excludes axis without connecting across singularity. Inner crop changes plotted window only, not physical minima/classification | NOT RUN |
| L10 P0 | Double-well dynamics defaults; open/closed boundary; pulse/equilibrium; zero-canonical/common rotation | Equilibrium forces closed/common/zero beam and disables pulse-only fields; incompatible later boundary/rotation reverts pulse; rotation input enabled only for common rotation | NOT RUN |
| L11 | Dynamics geometry R .05–.5m, L .1–3m, B .01–.2T, voltage0–200V, κ0–2; Ti/Te1–30eV; rotation−100000–50000rad/s; beam0–100eV; source/pulse fractions .05–1 | Current orbit/population/energy/torque plots respond and visible scope remains exploratory prescribed-field kinetics; no claim that conserved particle energy proves angular momentum convergence | NOT RUN |
| L12 | Dynamics collisions on/off; fixed/adaptive/axisymmetric; density10¹⁶–10²⁰m⁻³; lnΛ2–15; target16/32/64/128/256; cells2/3/4/6/8/12; source aligned | Adaptive enables target and disables cells; source alignment only axisymmetric pulse. Collisionless control recovers; warnings for coarse/experimental settings remain visible | NOT RUN |
| L13 | Dynamics N64→128 first, dt25/50/100/200ns, duration50/100/200/500µs/1ms, seed; change mode during run | Inputs/complete label match actual run; diagnostic finiteness/budgets checked. Larger N up to2048 is bounded performance work. Cancellation must not publish old model results; convergence remains separate from physical validation | NOT RUN |
| L14 | Repeated runs4/8/16 batches; scans5/9 points with valid bounds; cancel; export | Ensemble/scan plots and uncertainty correspond to configured parameter; invalid bounds recover; cancel/input change prevents late stale publication; buttons/status usable after errors | NOT RUN |
| L15 | Compare A–D; expand each operating point; interrupt with new run/input change | Seven independent result cards or explicit per-model errors; configs inspectable, differing observables not ranked as efficiencies; superseded comparison cleared/marked and controls recover | NOT RUN |
| L16 | Open method directory, each Explore action, advantages/disadvantages, II.E–K atlas and failure laboratory | Explore selects actual mode; diagrams and tradeoffs readable on mobile; reference-only variants do not advertise solver/3D capability. Independent failure timescale controls do not silently alter trajectories | NOT RUN |

## 04 Research replay

| ID / priority | Actions | Required observation / invariant | Status |
| --- | --- | --- | --- |
| R01 P0 | Enter Research; inspect default recording, then all three cases | Cases `drift-n6-q5-a010`, `anisotropy-n6-q5-a010`, `combined-n6-q5-a010` load; source/scale and WITHHELD qualification explicit. No simulation is represented as newly running; no 3D apparatus exists | NOT RUN |
| R02 P0 | Time slider first/middle/final; keyboard arrows/Home/End; inspect all plots | Saved time/step, both 3×3 temperature tensors, mean drift, diagonal and off-diagonal temperature plots synchronize exactly; cursor follows discrete saved state | NOT RUN |
| R03 | Change case while at final time; repeatedly leave/reenter during fetch | New case resets time index to0 with matching tensor/curves; pending load deduplicates, cached success reused, stale/failure state never masquerades as current recording | NOT RUN |
| R04 | If supported without bypass, observe failed recordings request then Retry loading recordings | Explicit error; cases/time disabled and old tensors/plots cleared; Retry remains available and successful retry restores current data. Failed fetch must not be cached permanently | NOT RUN |
| R05 | Open convergence/original figures at portrait/landscape widths; inspect plot legends | Three historical figures remain legible and distinguished from current replay; species color and x/y/z line styles distinguish tensor components; no implication moment curves establish full distribution convergence | NOT RUN |

## Closeout requirements

### Independent source-audit findings and readback

These statuses concern the local immersive implementation only. All browser rows above remain NOT RUN.

| Finding | Root cause and correction read back | Source-audit status |
| --- | --- | --- |
| Rotating cutoff leaked into nonrotating modes | Floating-window `display:block!important` could outrank the early hidden rule. The final `body.immersive .sim-workspace [hidden]` rule now has stronger specificity and is last in the sheet; domain hiding wins | CORRECTION PRESENT; native rendering NOT RUN |
| Scan controls and thermal/loading layout too wide for floating panels | The old five-track scan grid required at least622px; thermal/loading desktop columns also followed page width rather than their panel. A shell-specific single-column grid override now covers `.study-controls`, `.target-exposure-body`, `.target-exposure-controls` and `.target-loading-panel .loading-controls` | CORRECTION PRESENT; computed layout NOT RUN |
| Empty View window on nonorbital Models modes | Workspace allowed View by level while `selectMode` hid its only content. `selectMode` now calls `workspace.refreshMode()` immediately after setting toolbar visibility; refresh checks that visibility, closes unavailable View and hides its dock action | CORRECTION PRESENT; regression test source inspected, execution delegated to root |
| Redundant inspector disclosure/Marathon choices | Moved legacy inspector details are opened once. The shell hides their redundant summary and Marathon's duplicate button list while retaining the accessible component dropdown, existing selection callbacks and material readout | IMPLEMENTATION PRESENT; keyboard/pointer appearance NOT RUN |

`tests/workspace-v25.test.ts` now uses JSDOM and actual producer UIs. Its source covers moved control identity, retained events, window state/focus, level/context changes, component callbacks and available→unavailable View transitions. This reviewer did not execute it and makes no pass-count claim. JSDOM cannot establish native CSS geometry, OrbitControls gestures, GPU frames, actual mobile scrolling or deployed browser behavior. No additional P1 DOM-ownership or scene-context mismatch was found by this bounded read-only trace; this is not a substitute for completing the live matrix.

Attach a completed result row for every scene and every listed control, with desktop/mobile screenshot evidence for all four playgrounds, at least one changed control/output pair per model and all component IDs exercised by keyboard plus representative pointer mesh picks. Name supported gestures actually attempted. List denied/unsupported fault-injection, clipboard, download or mobile checks separately; their absence is not PASS.

If access remains denied, report the exact denial and supported diagnostics performed. Leave this matrix NOT RUN; do not call the deployment visually verified. No application change is justified by an unseen screenshot assumption. Any subsequently observed bug requires tracing its actual execution path, a minimal root-cause fix, regression coverage and the repository's final isolated build/typecheck gate.

## Traced source references

- Entry/state/async invalidation: `src/main.js`, `src/experience-ui.js`.
- Real GLB lifecycle, camera, picking and component/material readout: `src/apparatus-ui.js`, `src/apparatus-viewer.js`, `src/component-catalog.ts`, `web-assets/renders/manifest.json`, `src/apparatus.css`.
- Source and independent observers: `src/fusion-ui.js`, `src/neutron-geometry-ui.js`, `src/target-exposure-ui.js`, `src/target-loading-ui.js`, `src/blanket-ui.js`.
- Seven model modes, generated controls/plots and dynamical controls: `src/laboratory.js`, `src/doublewell-ui.js`, `src/equilibrium-model.ts`, `src/geometries.ts`, `src/transport.ts`; static/common controls in `index.html`.
- Replay: `src/research-ui.js`, `web-assets/research-recordings.json`; layout breakpoints: `src/style.css`.
- Prior evidence boundaries: `docs/DELIVERY-V24.md`, `docs/BLENDER-MODELS-V24.md`, `docs/GRAPHICS-AUDIT-V24.md`. Prior tests/GLB validation establish neither this session's live runtime state nor native GPU appearance.
