# Mass Spinner adversarial audit — v42

9 November 2026. Nine independent reviewers covered scientific correctness, scientific tooling, design/ergonomics/minimalism, technical depth, geometry, deployed interaction and reproducibility. Root triaged overlap and ran isolated reproductions. This is an audit of the unchanged v41 product, not a new release or a physical qualification.

## Verdict

The apparatus-first playground is a defensible exploratory tool. It is **not a qualified collision-transport predictor or a calibrated Marathon device model**. The strongest immediate improvements are fixing result/control/provenance contracts and mobile access, then closing specific physical-model gaps. No framework or language rewrite is justified by this evidence.

This pass identified **13 distinct product findings** below: one P1 numerical-control defect and twelve P2 correctness, provenance, interaction or resource-lifetime defects. Separately, an existing P1 artifact-retention risk needs closure before more large material campaigns. Physical scope limitations and unexecuted candidates are deliberately not counted as product bugs. No P0 or new core separator-force/nuclear-coefficient arithmetic defect was established in this bounded review; that is not proof of general correctness.

The fresh suite passed **831/831 tests**, typecheck, build, site checks and asset checks. Additional probes reproduced three gaps in reporting/admission despite those passes. Software checks do not certify physical fidelity.

## Evidence and scope

- Source baseline aggregate: `4f85060ae4393b8c17ecb616b56cc1be1599162e27820c822a398b0fc7a2a6a4`. All 481 original guest inputs remained unchanged throughout execution; 479 canonical host inputs matched. Two stage-only historical gate runners are absent from the host and are explicitly listed in the receipt.
- Existing offline safe-dev volume `safe-dev-d53fa8311a7066e4`; exact tested source `/work/home/audit-v41-check-source`. No new VM volume, production edit or deployment was made. Additional probes and saved collision records were separately transferred with file hashes. The old guest release was preserved before build.
- Current host release: 148 files, aggregate `89d7cb3d6c289900641f678318d5c5f3d5f6ccdcd335aae15e1955e66f60ee0d`. The earlier v41 provider receipt identifies version `893305a3-d0d2-4485-b82c-c0c4bcfa41c4`; provider status was not freshly queried in this audit.
- The ordinary authorized extension-backed Brave browser worked. The deployed [site](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/) was checked at 1440×900 and 390×844, with a restored 739×778 viewport. All four playgrounds were opened, and selected 3D, controls, plots, inspector, stale-result and keyboard paths were exercised. No console warning/error was captured. This does not mean every model/reference/control was exhaustively tested.
- No physical mobile device, screen reader, 200% zoom, forced GPU failure or exhaustive hidden-reference/Future-blanket walkthrough was performed. No immutable deployed build hash was exposed in the inspected UI. No alternate browser or policy bypass was used.
- Native Julia/PETSc/RustBCA/OpenMC studies were read, not rerun. Collision raw-data reduction below is fresh, but its trajectories are retained v38 outputs. We did not acquire new experimental calibration.

Executable receipts and raw logs: [audit evidence](../scientific/audit-v42/receipt.json), [transfer/source receipt](../scientific/audit-v42/input-receipt.json). Browser matrix and 15 screenshots: [live review](reviews/v42-liveux.md), [screenshots](reviews/v42-evidence/).

## Prioritized product findings

### 1. P1 — Exact thermal-capacity entry edits the exponent, not the physical capacity

**Evidence:** deployed Marathon → Target → References → Exposure. The output showed 9727 J m⁻² K⁻¹, but its precise editor opened as 4. Applying 5 produced 99730 J m⁻² K⁻¹ and changed the thermal time constant from 1.896 to 18.96 s. This is the retained Exposure reference, not the live coupled-target solver. Slight deviations from powers of ten have not been diagnosed.

**Technical cause:** `src/target-exposure-ui.js:15–28` builds a log10 range without the scale/unit metadata consumed by `src/precise-controls.js:8–16,26–35`. The generic editor defaults to linear. **Plain cause:** an internal dial position is presented as a measured quantity.

**Smallest fix and rationale:** declare the existing logarithmic scale and physical units at range construction. Reuse the established precise-control contract instead of guessing a scale from visible text or changing thermal equations. **Gate:** physical off-grid entry such as 5000 round-trips with correct units/bounds/reset; adjacent linear and temperature controls retain their semantics. [Detailed source/live evidence](reviews/v42-liveux.md).

### 2. P2 — Finest radial refinement compares a grid with itself

**Evidence:** `src/main.js:384–388` caps doubled bins at 2000. An admitted 2000-bin state is therefore compared to another 2000-bin state and reports zero change. A fresh nonuniform corotating witness reproduced identical grids and zero inventory delta; zero is not an accuracy estimate.

**Technical/plain cause:** a solver-size cap is also used to construct the reference; the supposed finer calculation is exactly the same calculation. **Smallest fix and rationale:** require strictly more bins for a refinement comparison and report unavailable at the cap. Do not raise domain/work limits merely to preserve a reassuring zero. **Gate:** 2000 bins yields no refinement estimate; smaller admitted grids compare distinct resolutions. [Review](reviews/v42-separator.md), [probe log](../scientific/audit-v42/numerical-witness.log).

### 3. P2 — General convergence CLI drops requested research mode

**Evidence:** `scripts/run-convergence.ts:58` omits the fourth `executeSeed` argument. Fresh real-CLI runs of identical one-step N=8/two-seed plans both executed interactively; the research-declared plan then failed its complete-batch gate. Existing v33/v34 transport runners forward mode correctly, so their archived results are not invalidated by this bug.

**Technical/plain cause:** `src/convergence.ts:101–102` defaults omission to interactive, while its result admission correctly checks plan/run agreement. The command accepts the instruction and forgets to deliver it. **Smallest fix and rationale:** forward `selected.executionMode`; keep omission interactive and keep strict result admission. Relabeling results or relaxing the checker would conceal the executed boundary. **Gate:** real subprocess research and omitted-mode controls record the correct mode with no artificial batch failure; the tiny fixture remains scientifically UNKNOWN. [Review](reviews/v42-repro.md), [log](../scientific/audit-v42/cli-witness.log).

### 4. P2 — Coverage gate accepts negative, missing and NaN exposure values

**Evidence:** `src/convergence.ts:224–227` checks null and an upper budget, but not finite fraction validity. Fresh synthetic admission witnesses passed the local coverage gate for −0.5, undefined and NaN. Overall qualification remained UNKNOWN because other gates were missing; no false overall PASS or malformed current raw study is alleged.

**Technical/plain cause:** JavaScript comparisons with NaN/undefined are false, and a negative fraction lies below the upper budget. The checker assumes a valid number before checking its size. **Smallest fix and rationale:** admit only finite numeric fractions in [0,1]; missing/stale diagnostics must not qualify. The adjacent raw error norm must be finite/nonnegative and sampled outside count a nonnegative safe integer; source inspection found the same unchecked-domain pattern there, while the executed witness isolates exposure. These enforce actual domain invariants rather than speculative guards. **Gate:** negative, nonfinite, missing and pre-diagnostic records fail closed; valid boundaries retain defined semantics; include invalid adjacent counts/norms. [Review](reviews/v42-collisions.md), [witness](../scientific/audit-v42/collision-witness.log).

### 5. P2 — Downloaded live runs lack immutable producing-code identity

**Evidence:** `src/main.js:305–307,416–419` exports inputs/results plus constant `modelVersion:10`. The same tag exists in an older v21 implementation predating the current random initialization, so it does not identify a unique solver.

**Technical/plain cause:** offline source-map hashing is absent from the live export path; a saved answer does not identify its calculator version. **Smallest fix and rationale:** generate an authoritative identity from the actual bundled solver/build and locked dependencies, bind it to the accepted result and export it. A timestamp or manual version bump is less reliable. Preserve old downloads as unidentified legacy artifacts rather than inventing provenance. **Gate:** different producing source changes identity; accepted-result/export identities agree; stale export stays disabled; legacy imports remain explicitly unknown. [Review](reviews/v42-repro.md).

### 6. P2 — Clicked engineering-part metadata is missing from visible Inspect

**Evidence:** clicking the accepted Marathon extraction electrode shows the generic vacuum acceleration-gap description. The specific extraction-electrode/assumed-copper record exists in a clipped figure readout. `engineering-geometry.js:53–56,105–109` supplies the details; `apparatus-ui.js:19–27` writes them; `workspace-ui.js:115` moves only the separate generic inspector into the visible panel.

**Technical/plain cause:** two readout owners receive different detail levels; the visible window owns the broader one. **Smallest fix and rationale:** route clicked part name/material basis/geometry basis through the existing visible inspector. Retain assumed versus publicly unspecified materials. Another panel, duplicated selection state, or treating copper-looking rendering as verified alloy would worsen the contract. **Gate:** actual click/callback/relocation flow for electrode, winding, fitting and film/backing, plus keyboard/dropdown selection. [Geometry review](reviews/v42-geometry.md), [live evidence](reviews/v42-evidence/marathon-picked-part-metadata.jpg).

### 7. P2 — Mobile Research clips the second species tensor

**Evidence:** at 390×844 the tensor host is 308 px wide with 530 px scroll width, but the page itself remains 390 px wide; ordinary page scrolling cannot recover the second tensor/disclosure. `src/style.css:72` retains two auto-minimum columns.

**Technical/plain cause:** intrinsic monospaced widths keep desktop tracks wider than their container; two number blocks never stack. **Smallest fix and rationale:** mobile single-column layout, zero-minimum tracks/children and local scrolling for true tabular content. Keep the useful desktop comparison. **Gate:** complete tensors/disclosures at 320/390 px and 200% zoom, without global overflow. [Source review](reviews/v42-ui-source.md), [screenshot](reviews/v42-evidence/research-mobile-overflow.jpg).

### 8. P2 — Dock obscures the surface disclosure and controls

**Evidence:** at 390×844 and 739×778, timestamp, Species 2 and Model info occupy the same lower band as the higher-z-index dock. `apparatus.css:2,7` and `workspace.css:25` anchor independent overlays in that band.

**Technical/plain cause:** neither layout owner reserves the other's footprint; the toolbar wins their overlap. **Smallest fix and rationale:** reserve the dock band and bound disclosure height with scrolling. Raising the disclosure's z-index merely hides the dock instead. **Gate:** closed/expanded disclosure and sheets with all dock button counts at narrow/short sizes; every control visible and reachable. [Live review](reviews/v42-liveux.md), [screenshot](reviews/v42-evidence/spinner-mobile-surface-overlap.jpg).

### 9. P2 — Internal mechanism chooser is unnamed and context disappears when closed

**Evidence:** Models → select ICR → close Controls leaves only the generic Models playground identity. The native `#system` popup has no accessible name. `workspace-ui.js:103–106` relocates the chooser into Controls and `workspace.css:70` hides its label.

**Technical/plain cause:** model identity and settings visibility share a container; closing settings hides what is being simulated. **Smallest fix and rationale:** explicit accessible name and compact persistent selected-mechanism context, potentially relocating the single chooser. Avoid duplicate selectors/state. **Gate:** selected mechanism remains identifiable with Controls closed on mobile/desktop; keyboard/AX naming and switching work once per change. The earlier header request is ambiguous: the 01–04 playground tabs already sit beside the brand. This finding does not claim those tabs are missing. [Live review](reviews/v42-liveux.md), [source adjudication](reviews/v42-ui-source.md).

### 10. P2 — Accepted geometry retains a static-reference fidelity caption

**Evidence:** after accepting numerical surfaces, Concept model still says “Hardware only; layer thickness exaggerated.” `apparatus-ui.js:45–48` binds the GLB caption, but `apparatus-viewer.js:64–66` replaces the reference with true-scale runtime geometry without updating it.

**Technical/plain cause:** representation state and its provenance have separate lifecycles; the caption describes the hidden picture. **Smallest fix and rationale:** let active representation/result state drive the existing disclosure while keeping illustrative-fitting/material caveats. Neither extra caveat panels nor calling every geometry exaggerated is accurate. **Gate:** reference → ready → hardware-only → pending transitions carry correct scale and numerical-surface status. [Review](reviews/v42-geometry.md), [screenshot](reviews/v42-evidence/marathon-fidelity-caption.jpg).

### 11. P2 — Numerical acceptance rolls the familiar machine view

**Evidence:** the same Beam target changes from horizontal reference to vertically projected accepted geometry. `surface-layer.js:63–64` rotates local z to world x; `apparatus-viewer.js:77` transforms the sightline but retains world-Y camera up. This is not wrong playground dispatch.

**Technical/plain cause:** hardware and sightline rotate without a consistent camera frame; accepting a result rolls the picture. **Smallest fix and rationale:** define consistent direction/up for reference/runtime geometry, preserving the cutaway. Account for OrbitControls caching its up transform at construction. Replacing correct beamline geometry or distorting film scale would not fix camera orientation. **Gate:** projected axial orientation before/after acceptance, cutaway/microscope visibility, reset and orbit at desktop/mobile sizes. [Derivation and live observations](reviews/v42-geometry.md).

### 12. P2 — Scene resize invalidates fitting without a camera-fit policy

**Evidence:** after wide reset and resize to portrait, the same accepted assembly is approximately 563 px tall; narrow Reset makes it about 283 px. A horizontal reference clips when multiple panels narrow the stage. No clipping is claimed for the observed vertical accepted case. `apparatus-viewer.js:68–82` changes aspect on resize but recomputes fit distance only on Reset.

**Technical/plain cause:** fit depends on horizontal/vertical field of view, but shrinking the window preserves the old distance. **Smallest fix and rationale:** adjust fit for allocated aspect while preserving orbit/target and an explicit intentional-zoom policy. Full reset on every resize would discard user inspection. **Gate:** reference/runtime wide → panel-narrow → portrait bounds before manual Reset; preserve camera continuity on ordinary result/time refresh. [Review](reviews/v42-geometry.md), [before](reviews/v42-evidence/marathon-fit-narrow-before-reset.jpg), [after](reviews/v42-evidence/marathon-fit-narrow-after-reset.jpg).

### 13. P2 — Unused legacy renderer initializes on the apparatus-first path

**Evidence:** unconditional `main.js:441` → `initScene()` creates WebGPURenderer, PMREM, loads `/separator.glb`, compiles and renders before checking legacy-canvas visibility. The apparatus has its own lazy viewer. Resource requests/lifetime follow from source; actual VRAM, GPU context count and frame-time cost were not measured.

**Technical/plain cause:** renderer lifetime is global, while use is view-specific; a second 3D display is prepared even when hidden. **Smallest fix and rationale:** lazy once-only initialization when a legacy view actually needs it; consider dynamic imports after measuring savings. This fits existing ownership without removing supported views or forcing a backend. **Gate:** no legacy factory/loader calls on unused paths, one initialization on first use, correct latest state and retry/rapid-switch handling; then deployed resource/performance observation. [Tooling review](reviews/v42-tooling.md).

## Physical qualification remains open

### Collision transport: software invariants are insufficient

Root freshly reduced all 66 retained complete raw cases: 60 collisional and 6 collision-off. Exposure and angular-momentum recomputation exactly matched saved diagnostics. **59/60 collisional cases exceed the 0.01 unresolved-exposure budget; 28/60 exceed the 0.001 raw angular-momentum budget.** None were sampled as outside the supported domain, which does not qualify unsampled conditions. The comparison ledger is 275 PASS, 0 FAIL, 265 UNKNOWN; UNKNOWN is not convergence.

The six paired collision-on/off End-A changes average −0.010498 with standard error 0.001131 and 95% half-width 0.002908. This difference is not a qualified prediction while the transport gates remain unresolved. Conservation of energy alone cannot certify torque or spatial transport. [Fresh reduction](../scientific/audit-v42/collision-data.log), [independent review](reviews/v42-collisions.md).

The separately retained offline full-3V v17 study passes conservation/positivity checks but retains distribution/rate/rotation failures and 15/17 physical-H cases UNKNOWN. It is not the live device solver. Do not substitute its conservation success for physical-PDF convergence or hide failures by changing tolerances.

**Next scientific gate:** isolate matched collision exposure, angular-momentum transfer and orientation/refinement behavior under the existing protocol. Preserve raw pre-correction residuals, paired seeds and acceptance thresholds. Choose the existing method/adaptation based on those observations; this audit has not established a new root cause that warrants a speculative collision rewrite.

### Marathon: a conditional scenario model, not a complete reactor prediction

The coupled time solver, stopping/DT source calculation, SI film/backing geometry and qualified narrow native references are substantive. This pass found no new reproduced P0/P1 arithmetic error in those equations. Nevertheless, four coupled closures are missing before lifetime/whole-device/isotope-yield claims:

1. **Finite-film stopping and retention:** mean CSDA stopping is not an energy/thickness/composition-dependent reflection/implantation/transmission kernel. Existing RustBCA evidence covers 100 keV, two thicknesses, assumed LiT/W inputs and limited sampling. A 0.4883 percentage-point consistency difference with an 18.83 percentage-point familywise sampling budget does not establish percent-level physical accuracy. Extend a bounded qualified family and couple it only with defensible material data.
2. **Evolving Li supply:** the external lithium-deposition balance is not a live evolving lithium-site inventory. Hydrogen replacement is not lithium regeneration. Couple Li deposition/erosion/site inventory before claiming renewable-film lifetime; audit atom/energy balances and timestep/mesh/retention uncertainty together.
3. **Finite neutron birth source:** the handoff carries rate/mean energy rather than full birth position/angle/energy distributions. Point-source approximations can fail near an extended source. Qualify one finite-source family before extrapolating near-field receiver/shielding response; refining the wrong point-source quadrature does not fix that approximation.
4. **Reaction and inventory response:** live first-flight transport ends at first scatter; the qualified H1 family is narrow; generic irradiation/decay takes user production rates; the future blanket is a recorded separate design. There is no qualified automatic beam → reaction-resolved useful isotope/TBR/inventory pipeline. Build one bounded source/material/reaction chain using evaluated data and pinned normalization, then independent controls and holdouts.

DD omissions, assumed material coefficients and unsupported stopping tails are already disclosed and must stay explicit. Pure D producing zero DT is not a claim of zero total fusion. A compact neutron source, Marathon's proposed power/alchemy blanket, and its mostly-neutral centrifuge patent are distinct concepts. Do not merge their evidence into an asserted built reactor. [Marathon review and primary citations](reviews/v42-marathon.md), [depth review](reviews/v42-depth.md).

## Assessment across the requested axes

| Axis | What is supported | Highest-value next work |
| --- | --- | --- |
| Scientific correctness | Actual accepted solver state drives SI engineering surfaces; retained native comparisons and explicit unsupported domains exist. No new core force/coefficient defect demonstrated. | Fix false/invalid convergence reporting; keep transport unqualified; close bounded retention/Li/source/reaction contracts before predictive claims. |
| Scientific tools | TS workers support immediate interaction; Julia/PETSc/WarpX/FiPy/RustBCA/OpenMC/NJOY are real offline references, not labels for the browser solver. Three/Blender/glTF are appropriate graphics tools. | Reuse existing native solvers for qualified response families. A Julia service, React/R3F rewrite or WebGPU compute alone supplies neither missing data nor convergence. Fix renderer ownership first. |
| Design/ergonomics/minimalism | Restrained dark apparatus-first workspace, columns/sheets, useful focus/splitters, exact energy entry and explicit stale-result state worked in checked paths. | Repair wrong-domain entry, mobile lost data, dock overlap, visible component detail and selected-mechanism context. No generic aesthetic rewrite or more explanatory page text is warranted. |
| Technical depth | II.A–II.D, Section III diagnostics and separate compact-source/future-blanket references cover substantial concepts with declared approximations. | Expose causal relationships through plots/inspection rather than lessons: centrifugal strength/enrichment versus inventory/recovery; cold cutoff versus finite wall/transit time; survival/mixing over accepted time/path scales; isolated ICR detuning scan; exact published blanket sweeps. |

Primary sources and tool capability links are collected in each review. In particular, [the separator tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf), [Marathon's source architecture](https://www.marathonfusion.com/beam-driven-fusion/), [Alchemy paper](https://www.marathonfusion.com/alchemy.pdf), and [centrifuge patent](https://patents.google.com/patent/WO2026064411A1/en) support separate design scopes. Company descriptions and patents do not independently validate performance.

## Operational risk, lower priorities and unresolved candidates

- **P1 artifact retention, separate from product bugs:** the recorded 5,330,275,010 raw bytes/16 material cases remain assigned to `safe-dev-91df66bcebf94022`; previous cleanup intentionally preserved it. A complete independently verified raw export is not recorded. This audit did not reopen that guest, so current raw availability is not freshly verified and no loss is alleged. Export in bounded chunks to adequate durable storage, verify original digests and an independent restore/reduction, then release ownership. A created archive or summary hash is not sufficient. Do not delete/sync-replace this volume meanwhile. [Exact risk and closure gate](reviews/v42-tooling.md).
- **Lower-priority efficiency:** collapsed references still solve/redraw during every source edit. Fresh Node CPU timings were small at tested defaults: energy scan about 0.91 ms warm, loading pair about 0.36–3.18 ms. Browser DOM/GPU/mobile/worst-case latency was not measured. Defer closed references only with correct dirty-snapshot/export semantics; do not claim demonstrated perceptible lag or loosen physics tolerances.
- **P3 accessibility:** the immersive reparenting removes the main landmark/visible h1. Restore useful semantics without introducing redundant visible headings. [Source review](reviews/v42-ui-source.md).
- **Unexecuted picking candidate:** impact dots render without depth testing but picking chooses the nearest solid/overlay hit. A visibly superimposed rear dot may select hardware instead. Source policies conflict, but no ray/live witness established current-run frequency. Reproduce the explicit behind-solid/4-pixel-threshold case before treating it as a confirmed interaction defect. [Candidate and gate](reviews/v42-geometry.md).
- The old stale-tab “3D unavailable” state did not recur after ordinary reload. This pass cannot attribute its historical cause to a specific chunk/cache/GPU failure. Error observability can improve without inventing a diagnosis.
- No security or persisted-data migration defect was established in the reviewed paths. This was not a comprehensive security audit. The export-provenance change needs explicit legacy handling; the diagnostic gate needs pre-diagnostic/stale-record coverage.

## Reviewable implementation order

1. **Controls:** exact physical heat-capacity metadata and regression, including adjacent fields. Small independent fix.
2. **Scientific reporting:** strict finer-grid rule, research-mode forwarding and finite diagnostic admission. Keep separate regression cases and existing thresholds; do not reinterpret retained studies.
3. **Reproducibility:** producing-build identity on accepted results/exports, with explicit legacy unknown state.
4. **Mobile and context:** tensor reflow, dock exclusion, accessible mechanism identity and one visible selected-part inspector. Split by ownership if the change exceeds a reviewable scope; avoid adding text-heavy panels.
5. **3D lifecycle:** representation-owned caption, consistent camera frame, aspect-aware fit that respects user zoom, lazy legacy renderer. Reproduce picking separately before changing its policy. Reopen the same live browser matrix after gates pass.
6. **Scientific work:** preserve raw material artifacts first; then separately qualify collision transport and one bounded Marathon retention/Li/source/reaction slice. Do not bundle speculative scientific expansion into UI fixes.

Each production fix needs its corrected-behavior regression, adjacent invariants, a fresh safe-dev source sync/identity and final required gates. Keep PRs single-purpose and below the user's 700 non-test-line limit. This report applies no production fix and requests no new deployment.

## Exact checks run

All following commands ran in the existing offline safe-dev guest against the source snapshot above, with exit code 0:

| Command | Result |
| --- | --- |
| `npm test` | 831 passed, 0 failed/skipped/cancelled; 22.90 s |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; chunk-size warning only |
| `npm run check:site` | Passed |
| `npm run check:assets` | Passed |
| `python3 docs/reviews/v42-cli-probe.py` | Reproduced dropped research mode |
| `node --import tsx docs/reviews/v42-collision-probe.ts` | Reproduced invalid local coverage admission |
| `python3 docs/reviews/v42-collision-data-probe.py` | Independently reconstructed retained 66-case diagnostics |
| `node --import tsx docs/reviews/v42-numerical-probe.ts` | Reproduced identical-grid comparison; bounded CPU timings |

The witness probes exit successfully **because the defect assertions hold**. They are not passing regressions for repaired behavior. Build: Vite 8.3.6, main JS 1,325.94 kB / 385.15 kB gzip, apparatus chunk 378.60 / 94.71 kB gzip, worker 99.17 kB. These are build sizes, not actual transfer/VRAM/responsiveness measurements.

## Independent review index

1. [Separator physics](reviews/v42-separator.md)
2. [Marathon physics and data](reviews/v42-marathon.md)
3. [Collision gates and retained studies](reviews/v42-collisions.md)
4. [Tooling and architecture](reviews/v42-tooling.md)
5. [Geometry and scientific visual integrity](reviews/v42-geometry.md)
6. [Deployed desktop/mobile interaction](reviews/v42-liveux.md)
7. [Technical depth and primary literature](reviews/v42-depth.md)
8. [Reproducibility and evidence chain](reviews/v42-repro.md)
9. [Interface source/accessibility](reviews/v42-ui-source.md)
