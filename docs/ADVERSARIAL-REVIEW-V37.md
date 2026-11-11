# Mass Spinner: adversarial review across four axes

8 November 2026, America/Los_Angeles. Six reviewers: separator science, Marathon science, scientific/graphics tooling, interface, technical depth, and a skeptical cross-reviewer. This is an audit and implementation plan, not a new implementation or qualification result.

## Verdict

The project has substantial numerical work and useful bounded models. The largest product gap is that computed state, plots, controls and apparatus are separate experiences. The largest scientific gaps are application-domain qualification and empirical material/closure support. More explanatory text, more polygons, or a language/framework migration would not address those causes by themselves.

**Anti-pattern verdict:** current visual appearance is ungraded. Source inspection supports a narrower diagnosis: a scene-first shell still contains a largely form-and-plot-driven interaction model. The dark palette, rounded windows and fonts are not independently demonstrated defects. Existing GLB/PBR rendering, picking, keyboard camera controls, plot inspection, uncertainty bands and honest evidence labels are meaningful functionality worth retaining.

| Axis | Strongest verified foundation | Most valuable improvement |
| --- | --- | --- |
| Accuracy/scientific correctness | Independent numerical studies, conservation/positivity diagnostics, native-code comparisons, explicit negative results | Qualify specific observables in a usable physical domain; distinguish scenario inputs from measured material data |
| Tools | TypeScript workers plus actual offline Julia/PETSc/WarpX/PlasmaPy/FiPy/OpenMC/RustBCA references and adapted Geant4 kernels | Reuse the existing division of labor; add capabilities only for a demonstrated observable/data gap |
| Design/ergonomics/minimalism | Immersive scene, persistent nonmodal controls, compact navigation, real component inspection | Readable responsive plots, accepted-state overlays, comparison layouts and component-owned controls/results |
| Technical depth | A–D mechanisms, multiple equilibrium closures, collisional landscapes/dynamics, coupled target histories, research records | Matched experiments, collector acceptance, causal failure channels and distribution-level evidence rather than more prose |

## Evidence and limits

- The skeptic checked all **386 canonical application inputs** against `scientific/header-v36/tested-inputs-v36.json`: no missing or changed files. The isolated stage runner is the one excluded map entry. The source audit therefore matches the checked v36 baseline.
- The retained v36 receipt records 664 passing tests plus typecheck/build/site/assets checks. **No project tests, builds, simulations or dependency installations were rerun in this audit.** New files are review documents/evidence only.
- Reviewers traced current execution paths and reopened primary publications and official documentation online. The root reviewer also inspected the current local Blender-rendered beam-target and centrifuge PNG assets; these are asset observations, not deployed-browser observations.
- No deployed page, GPU frame, mobile layout, frame timing or touch interaction was observed. The existing managed-origin denial was respected. No alternate browser route was used. Source-derived layout estimates below need an authorized real render.
- No new numerical arithmetic, sign or conservation defect was independently reproduced. This does not establish that the code contains no such defects.
- Numerical convergence, physical-domain applicability, experimental validation and interface correctness remain separate claims. This follows the application-specific approach described by [NASA's validation guidance](https://www.grc.nasa.gov/www/wind/valid/tutorial/valassess.html).

## Priority work packages

Eight consolidated work packages: five high priority and three medium priority. Scientific priorities become release blockers only for the corresponding predictive claim; they do not invalidate every bounded educational experiment.

### R1. High — stop scaling chart text into unreadability

**Problem/cause:** `src/laboratory.js:101–123` uses an 800-unit SVG width and 11/12-unit axis text; `src/style.css:88` scales SVGs to container width. The right panel is at most 560 CSS px, before padding (`src/workspace.css:31,35`). Simply, narrowing a chart shrinks its labels with it. A 500 px chart gives an approximately 6.9 px label; at 300 px, approximately 4.1 px. These are source-derived estimates, not measured deployed pixels.

**Small coherent fix:** derive plotting coordinates from the container while preserving an agreed text size, reducing ticks and wrapping legends. Preserve equal spatial aspect, discontinuity handling, confidence-band gaps, pointer/keyboard exact-value inspection and selected-time markers.

**Why chosen:** it directly addresses responsive readability. Hiding labels removes units; forcing wide windows fails mobile; replacing the plotting library is not yet justified.

**Gate:** actual 320/375/768/1440 px render and zoom checks, agreed readable label sizes, no collisions, correct equal-aspect geometry and identical inspected data. A 12–13 px product target is a design choice, not an invented WCAG minimum. See the [interface review](reviews/v37-interface.md#ui-2--responsive-chart-scaling-makes-the-numerical-typography-extremely-small).

### R2. High — connect accepted physical state to the apparatus

**Problem/cause:** `src/marathon-ui.js:10,30–33` already emits the selected coupled target state. `src/main.js:392` supplies no observer. The viewer API at `src/apparatus-viewer.js:111` has no physical-state update. Simply, the interesting target changes reach the plots but not the target mesh.

**Small coherent fix:** first wire that existing callback to a target depth cutaway showing the accepted temperature and D/T/vacancy arrays at the selected time. Connect the beam footprint and source state to the same accepted configuration. Picking a cell should reveal its actual value and units. Extend to separator density/composition and existing field/orbit representations after this one complete path works.

**Why chosen:** uses existing results and component IDs without a global-state/framework rewrite. B/current/energy controls normally change fields, trajectories and deposition while hardware stays fixed. Only solver-consumed dimensions should alter geometry. A 1D thermal model cannot justify invented lateral hotspots or a glowing casing; microscopic film thickness needs an explicitly exaggerated cutaway scale.

**Gate:** plot/scene/time/configuration agreement; exact units/coordinate transforms; displayed extrema match arrays; beam-off and cooldown states update correctly; stale/cancelled results never become current. Real GPU/mobile picking and visual inspection are required before claiming visual completion.

### R3. High — deliver the requested comparison workspace

**Problem/cause:** `src/workspace-ui.js:19,33` deliberately makes windows on the same side exclusive. Target, Plots and Model info share the right slot. Simply, opening neutron plots hides the evolving target. This is an intentional restriction that falls short of the requested tiled comparison workflow, not a newly broken event handler.

**Small coherent fix:** prototype two resizable desktop groups with tabs and a retained comparison view. Keep existing control nodes, focus behavior and the one-sheet mobile interaction. Component selection should make its own Parameters/Results reachable without duplicating controls. Layout persistence follows reliable resizing; it is not a prerequisite for the first prototype.

**Why chosen:** a bounded comparison layout may meet the need without a general desktop window manager. [Dockview](https://dockview.dev/docs/) is a concrete vanilla-TypeScript candidate if drag docking/serialization are required. Its [MIT core](https://dockview.dev/docs/overview/licence/) includes splitters, floating groups and layout persistence; pinned tabs, auto-hide and keyboard docking/spatial navigation are Enterprise. Application-level baseline comparison does not require paid pinned tabs. Compare against a small split implementation before adopting a dependency; no React migration is required.

**Gate:** target state, neutron output and relevant controls can coexist on desktop; resize preserves state and legibility; keyboard controls can operate/reset the layout; mobile retains capabilities without overlapping sheets. Initial closed panels are a discoverability hypothesis to test, not grounds to auto-open every panel.

### R4. Medium — make exploration stable, precise and reproducible

**Three distinct small fixes:**

1. `src/coupled-target-ui.js:105–111` clears the completed target before every debounced request. Separate valid-pending, invalid and accepted states. Retain a visibly pending prior snapshot with its own configuration/time, replace atomically on acceptance, and prevent stale export. Preserve current cancellation/revision guards. This is presentation state, not a numerical fallback.
2. Range-only controls, including 0.1-log10 Marathon steps, make exact paper values difficult to enter (`src/fusion-ui.js:7–18,65–75`). Make the displayed value editable on demand with units and existing domain checks; do not solve touch precision by making sliders arbitrarily fine.
3. `src/experience-ui.js:26,38–46` restricts sharing to level 1 and resets Models to centrifuge on re-entry. Preserve model context; add bounded, versioned scenario links for supported other playgrounds, with explicit Reset. Keep large raw exports separate.

**Why chosen:** these directly support play, comparison and sharing without accounts, a database or a backend service. They should be separate reviewable changes rather than an interface rewrite.

**Gates:** delayed-worker/cancellation tests; final accepted results match controls; invalid inputs remain explicit; numeric/range/unit agreement; configure→share→fresh-load round trips; stale/unsupported link cases; current v1 links keep their behavior.

### R5. High before transport predictions — qualify the actual live collision envelope

**Verified state:** the fresh v34 study records **240 passing numerical refinement decisions and passing raw angular-error gates**, alongside **failing physical-domain coverage at all five sampled levels**. It uses 16,384–32,768 markers per species; the interactive path caps at 4,096. See `docs/TRANSPORT-CONFIRMATION-INDEPENDENT-V34.md` and `src/doublewell-dynamics.ts:42–47`.

**Cause:** timestep/mesh consistency, finite-cell torque, local sampling and the unmagnetized-encounter approximation are distinct issues. Simply, repeated consistent answers do not establish that the collision approximation applies throughout a chosen experiment.

**Fix:** predeclare a useful restricted operating domain; run matched collision-off/alignment/orientation controls and joint particle/locality/time refinement under unchanged gates. Investigate the retained cold-tail encounter/screening witness independently. Expose a small status for the selected observable/configuration, with detailed evidence on demand. Do not attach the high-N result to an untested browser preview or disable valid ideal-orbit results because another claim fails.

**Why chosen:** addresses known evidence gaps. A temperature floor, torque subtraction, larger particle ceiling, relaxed tolerance or another binary-collision package cannot by itself establish the missing physics.

**Gate:** existing angular/exposure/domain gates, resolved representation bias relative to the physical collision effect, independent controls and applicability at the resolution actually displayed. A magnetized operator is a separate scientific stage if the desired domain demands it.

### R6. High for Marathon fidelity — earn the material and coating assumptions

**Verified state:** the v35 target really couples composition, stopping, reactions and temperature; the moving backing-heater defect was fixed and strict comparisons passed. Do not redo that completed work. Current remaining limits are finite-film retention, empirical LiT data, fixed-host renewal and thermal/material applicability.

**Cause:** mean stopping does not determine reflection/transmission/retained implantation. Fixed-host D/T renewal does not deposit or erode lithium. Independent column and thickness also imply a changing number density, `n = column / thickness`, while other material properties remain independent scenario inputs. These are model/interpretation limitations, not newly demonstrated arithmetic failures.

**Fix in reviewable steps:**

- Derive/display implied density and offer a density-linked material mode alongside explicit independent scenario inputs. Use sourced presets; no unsupported “realistic” clipping.
- Map the current stopping/fit domain; retain the honest stopped-tail guard. Extend actual RustBCA/transport studies to finite film-on-backing cases with complete incident/reflection/transmission/retention/energy ledgers before importing kernels into live loading.
- Add an explicit Li deposition/erosion mass/thickness balance before a moving-interface chemistry model. The [published Marathon concept](https://www.marathonfusion.com/) describes deposited/cooled lithium and in-situ target regeneration; refreshing hydrogen occupancy does not yet represent that whole process.
- Keep all totals explicitly D–T where appropriate. D–D branches become a targeted extension when exploring D-rich loading; their effect size is scenario dependent and must be measured, not assumed.

**Why chosen:** reuses the existing Geant4/RustBCA/FiPy comparisons and conservative target solver while addressing the assumptions that dominate loading/lifetime. A new integrator cannot provide missing material measurements. The coupled path is currently opt-in through Target→Use material model; making a valid material scenario easy to discover is separate from claiming calibration.

**Gate:** density/column/thickness coherence, finite-film controls/refinement, reaction-specific atom/energy budgets, explicit data domains and uncertainty, conservative Li/H/remapping balances. No calibrated target lifetime without empirical support. See the [Marathon review](reviews/v37-marathon-science.md).

### R7. Medium — deepen the experiments rather than increase the prose

**Cause:** several strong calculations are separate diagnostics or recordings, so users cannot readily compare causes, invariants and outcomes.

**Bounded additions:**

- Pin exact baseline/configuration/seed/version and compare commensurate quantities. Existing rotating/ICR batch scans should be extended, not reinvented. Static centrifuge inventory is not steady extracted flux.
- Make a passive collector aperture/radial split manipulate existing impact records; show accepted purity and recovery against the incident population. Intercepting/biased collectors need a separate field/path model. Count fractions are not g/s.
- Couple one justified neutral/charge-exchange channel with product tracking before adding a generic realism multiplier. Current Section III budgets explicitly disclose that they do not change trajectories; this is an honest depth gap.
- Expose selected recorded distribution marginals, entropy budgets and coarse/fine gates in Research. It already replays exact saved moments/tensors; do not fabricate distributions from those moments or pretend scrubbing runs a solver.

**Why chosen:** each addition exposes a discriminating experiment with a small observable contract. It avoids lessons, unexplained extra sliders and decorative plots. [PhET's research](https://phet.colorado.edu/en/research) supports exploratory interaction and minimal text; it does not imply that every advanced simulation should copy its visual style.

**Gates:** deterministic pin/restore; compatible-observable checks; zero/full aperture accounting; zero-CX and analytic path-survival limits; reaction/product ledgers; recorded marginals reproduce stored normalization/moments; exact unchanged gate identities. Each extension is a separate stage.

### R8. Medium, optional scope — extend neutron utilization and current literature coverage

**Verified state:** live neutron transport is first-flight/first-interaction, with an isotropic point source and a supplied mean energy. Actual recorded OpenMC results exist and intentionally show the difference introduced by later scattering. Absorption alone is not an isotope-production inventory. The compact source and future power-plant blanket remain separate designs.

**Fix:** use evaluated-data OpenMC reaction-resolved response cases with held-out geometry/energy/material validation for a bounded browser table. Keep first-flight and full-transport outputs distinct. Add a generic irradiation→cooldown→inventory comparison only if isotope utilization remains in scope, using reaction-specific rates and independently tested decay equations. Source spectrum/angle and finite-spot work precedes claims that require those details.

**Why chosen:** reuses a mature native transport workflow rather than introducing a second custom browser Monte Carlo engine or a paid always-running service. Official [OpenMC neutron methods](https://docs.openmc.org/en/stable/methods/neutron_physics.html) provide the relevant established capability; table interpolation still needs its own error bound.

**New research checked:** Marathon now lists September 2026 [Tb-149 precursor](https://arxiv.org/abs/2609.25554) and [Pb-212/Ac-225 generator](https://arxiv.org/abs/2609.19166) preprints. They expand the optional concept map beyond the earlier gold blanket, not the minimum completion criteria of a compact-source playground. Unmeasured reaction data and unvalidated proposals remain explicit; no clinical-output prediction is implied.

**Gate:** source-normalized channel tallies and MC uncertainty, analytic absorber/decay limits, held-out interpolation error, depletion time refinement, out-of-domain handling and clear separation of numerical from nuclear/material uncertainty.

## Tool decisions

Keep the lightweight browser engine and independently pinned native comparisons. PETSc, Julia and WarpX references have unresolved qualification limits of their own; none should silently become the definition of truth. FiPy verifies declared conduction equations, not measured LiT kinetics. PlasmaPy supplies formula/regime checks, not a full separator. Adapted atomic Geant4 checks are not a full Geant4 transport run. Actual OpenMC/RustBCA calculations have bounded reference roles.

Keep Three.js/Blender/glTF. Both modern [WebGPURenderer](https://threejs.org/manual/pages/webgpurenderer) and maintained WebGL rendering exist in the current ecosystem; moving the apparatus viewer to another backend would not repair its missing state input. Improve source-supported geometry/material provenance and state-driven scientific layers before decorative detail.

Extend the current SVG plots first. The initial claim that plots lacked exact inspection was **retracted after cross-review**: `src/laboratory.js:139–171` already provides selected-X markers, pointer values and keyboard sample inspection. Consider uPlot/partial Plotly only after one required interaction cannot be implemented cleanly or measured performance justifies it. SciML is useful for a specific stiff/time/sensitivity reference, not a blanket language-migration mandate.

## Recommended implementation sequence

1. **Readable, stable interaction:** responsive chart typography; then pending-state handling as a separate fix.
2. **One complete scientific 3D path:** existing accepted Marathon state→target cutaway→linked plot selection; obtain permitted desktop/mobile visual evidence.
3. **Comparison ergonomics:** resizable groups; component-owned parameters/results; precise input; state preservation/sharing; pinned baselines in separate small changes.
4. **Depth through experiments:** passive collector acceptance and recorded distribution/gate exploration.
5. **Parallel science work:** restricted-domain collision qualification; finite-film material references and Li-host balances; then one justified CX channel/field-closure extension.
6. **Optional expansion:** evaluated full-neutron response and irradiation/decay topics, after the core interaction and relevant physics contracts work.

The browser verification gap remains open throughout; it is a requirement for declaring graphics/ergonomics complete, not a reason to suspend permitted source, numerical or asset work.

## Independent reports and cross-review

- [Separator science](reviews/v37-separator-science.md)
- [Marathon science](reviews/v37-marathon-science.md)
- [Scientific and graphics tools](reviews/v37-tooling.md)
- [Interface and minimalism](reviews/v37-interface.md)
- [Technical depth](reviews/v37-technical-depth.md)
- [Skeptical cross-review and claim dispositions](reviews/v37-skeptic.md)

Cross-review rejected stale statements that there is no real 3D, no coupled target, no external-code execution, no exact plot inspection, or a still-open old heater defect. It also rejected unjustified hardware deformation, treating every independent scenario as invalid, removing stopped-energy guards, equating missing advanced channels with incorrect bounded equations, and grading current pixels without seeing them. These corrections are part of the audit result.
