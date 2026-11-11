# Tooling audit — v37

8 November 2026, America/Los_Angeles. Read-only audit of the v36 application and retained reference reports. No production code, dependency, solver, or deployment was changed. No project code or tests were executed for this review. Source inspection and official online documentation establish the findings below; retained numerical results were read, not independently rerun. Browser/GPU/mobile observation remains unavailable under the existing managed-origin denial. No alternate browser route was attempted.

## Verdict

The project already uses a credible modern division of labor: lightweight TypeScript workers for interaction and native scientific codes as independent offline references. Its principal weaknesses are physical qualification, material data, scientific interaction, and the connection between numerical state and geometry. A wholesale Julia, React, WebGPU-compute, or commercial multiphysics rewrite would not repair those weaknesses by itself.

“SOTA” must mean the most defensible method for a specified observable, not the newest package. For a free personal playground, browser speed, transparent model boundaries, reproducibility and inspectable results matter alongside solver sophistication. Existing external-code results do not make the live browser equations equivalent to those codes.

## Six decisions

### T1 — Keep browser workers; strengthen the native reference boundary rather than rewrite the live application

**Priority:** P1 scientific architecture. **Confidence:** high about current execution; medium about optimal future architecture.

**Verified:** `src/worker.ts:1–27` imports and dispatches the actual custom TypeScript orbit, equilibrium, geometry, transport, double-well and coupled-target solvers. `src/worker-client.ts:1–20` isolates cancellable computations and terminates superseded workers. The browser dependency list is Three.js plus build/test tools (`package.json:13–20`), not PETSc/Julia/OpenMC. The Julia research stack already reuses a pinned generic Newton–Krylov implementation, while its physical extensions still require qualification (`docs/GENERAL3D-TOOLS-V17.md:99–110`). FiPy comparison was actual independent assembly/solve, not an installation smoke test (`docs/TARGET-CONDUCTION-V35.md:114–135`).

**Problem and cause:** native scientific tools are used for independent checks but not as the live engine. This is a defensible browser architecture, yet “we use Julia/PETSc” can obscure which equations actually produced a displayed result. In simple terms, having a strong reference calculator does not mean every slider is running that calculator.

**Decision:** **keep** the current cancellable-worker front end. Introduce one narrow, versioned result contract for each observable, carrying equation/model version, units, numerical settings, data identity, domain status and reference identity. This is a domain/provenance boundary, not a generic plugin framework. For the next independent target-kinetics check, **evaluate** SciML stiff ODE/DAE integration and sensitivity analysis on the same finite-volume state, including pulses and conservation constraints. Do not claim a generic integrator preserves positivity, entropy or collision invariants automatically. [SciML DAE documentation](https://docs.sciml.ai/DiffEqDocs/stable/tutorials/dae_example/), [SciMLSensitivity](https://docs.sciml.ai/SciMLSensitivity/stable/).

**Why over alternatives:** a complete browser-to-native service adds deployment cost, latency and operational state; a complete port doubles correctness work before it improves physics. SciML is valuable for native stiffness, event and sensitivity studies; it is not evidence that the existing TypeScript arithmetic is inaccurate. **Defer** Gridap/MOOSE until a specific two/three-dimensional PDE or coupled fluid question demands them. MOOSE's heat module offers conduction, radiation and fluid-domain coupling, but those capabilities need material/boundary data and a defined geometry to be useful. [MOOSE Heat Transfer](https://mooseframework.inl.gov/modules/heat_transfer/index.html).

**Acceptance gate:** a cold/pulse/cooldown native comparison must use identical equations, discontinuity times, material inputs and initial state, with separate time and mesh refinement and unchanged conservation/positivity budgets. Every exported plotted curve must identify whether it is live, recorded or interpolated. Do not merge a backend swap on language preference alone.

### T2 — Keep PETSc and WarpX as complementary references; do not mistake either for a repair of invalid collision assumptions

**Priority:** P0 before predictive transport claims. **Confidence:** high.

**Verified:** fresh v34 transport studies pass their sampled numerical refinement gates while all five sampled model-domain gates fail; orientation/alignment work and a continuum-bias bound remain missing (`docs/TRANSPORT-QUALIFICATION-V34.md:8–16`). The same report explicitly warns that the study covers one configuration and larger particle counts than the interactive preview (`:106–119`). The adapted PETSc two-ion operator actually ran; setup was carefully modified before cached normalization, while positivity and entropy qualification remained incomplete (`docs/PETSC-TWOION-V12.md:12–43,128–143`).

**Problem and cause:** a robust integrator can converge to a collision model outside its physical applicability. The current uncertainty is partly the assumed weakly coupled, local binary-collision description and partly unresolved finite-representation error. In simple terms, making the wrong approximation run faster or with smaller steps does not make it the right physics.

**Decision:** **keep PETSc LANDAU** for independent velocity-distribution/rate comparisons; **keep WarpX** for particle collision and eventual self-consistent field benchmarks. PETSc provides finite-element Landau residual/Jacobian time stepping with adaptive velocity meshes; WarpX provides distinct kinetic/background collision models. Neither is an automatically correct full separator model. [PETSc LANDAU](https://petsc.org/release/manualpages/LANDAU/), [PETSc 2.5V/3V example](https://petsc.org/release/src/ts/tests/ex30.c.html), [WarpX collision theory](https://warpx.readthedocs.io/en/latest/theory/multiphysics/collisions.html), [WarpX input model options](https://warpx.readthedocs.io/en/latest/usage/parameters.html).

**Why over alternatives:** PETSc versus WarpX is not a winner-takes-all choice: discretizations expose different errors. Replacing the live method with another binary-collision package will not remove shared model-domain assumptions. PlasmaPy remains useful for units, regimes and didactic Boris references; its own simulation documentation explicitly describes didactic implementations under development, so it should not be promoted to a complete production separator engine. [PlasmaPy simulation scope](https://docs.plasmapy.org/en/stable/simulation/index.html).

**Acceptance gate:** predeclare a physically admissible benchmark envelope; match species, distributions, Coulomb-log convention, source/collector geometry and dimensionality; independently refine timestep, representation and collision locality. Compare full distributions, relaxation rates, angular budgets and actual transport observables. Treat model-domain failures and unrun orientation tests as unresolved even if moments and conservation agree. Qualify browser-resolution cases separately from offline high-N results.

### T3 — Keep the Geant4/RustBCA work; spend the next material effort on finite-film data and uncertainty

**Priority:** P0 for target lifetime/loading predictions; P1 for a scenario playground. **Confidence:** high about limitation; medium about attainable data.

**Verified:** `src/target-material.ts:6–19` uses additive Li/D/T atomic stopping with explicit unmeasured compound/temperature limitations. `src/coupled-target.ts:6–27` labels coefficients as scenario inputs and initializes several unmeasured transport rates to zero. Actual extracted Geant4 function-body checks are adaptation tests, not a full Geant4 transport calculation or experimental validation (`docs/MARATHON-MATERIAL-V35.md:36–50`). RustBCA provided actual prompt half-space references; its retained protocol and licensing boundary are documented (`:68–84`).

**Problem and cause:** mean stopping, prompt implantation, finite-film retention, trapping/release and evolving surface chemistry are different physical questions. Present references do not identify the empirical LiT coefficients that dominate extended loading histories. In simple terms, the code can integrate an assumed target accurately while the assumed material is still uncertain.

**Decision:** **keep** the pinned adapted Geant4 atomic kernels, actual RustBCA reference and FiPy thermal oracle. **Extend** prompt reference studies to finite LiT-on-backing geometry, with incident-normalized reflection, retention, transmission and sputtering ledgers, where the existing code supports and the material assumptions justify them. Seek measured D/LiT or nearest defensible compound datasets, retain uncertainty/provenance, and visibly distinguish a measured input from a scenario input. Geant4 itself explains why low-energy compound stopping can depart from atomic Bragg additivity. [Geant4 low-energy compound stopping](https://geant4.web.cern.ch/documentation/pipelines/master/prm_html/PhysicsReferenceManual/electromagnetic/charged_hadron_incident/hadrons.html), [RustBCA author repository](https://github.com/lcpp-org/RustBCA), [IAEA experimental stopping database](https://www-nds.iaea.org/stopping/).

**Why over alternatives:** SRIM/TRIM is a possible licensed comparator, not a substitute for measured LiT trapping/retention. A full Geant4 run can test transport assumptions but cannot create missing empirical coefficients. RustBCA is GPL and currently stays offline; do not paste its implementation into the browser without a deliberate license decision. Agreement between different stopping models is a sensitivity comparison, not a calibration.

**Acceptance gate:** energy/angle/composition/thickness holdouts, a complete per-incident particle ledger, and finite-film convergence must precede any use of a BCA profile as live retention data. Material predictions need independent experimental comparisons or explicit scenario/uncertainty status. Historical smoke mismatches and unavailable IAEA downloads must stay visible; the public IAEA page being reachable during this review does not establish that D/LiT data were obtained.

### T4 — Use OpenMC for full transport; retain the live first-flight explorer as a deliberately bounded view

**Priority:** P1 for neutron utilization, shielding and blanket depth. **Confidence:** high.

**Verified:** actual OpenMC 0.16.0 synthetic calculations exist, with 500,000 histories each. In the mixed case, all-collision absorption is 0.0356100/source versus browser first absorption 0.0265544736/source; the difference is intentionally not treated as equivalence failure (`docs/NEUTRON-TRANSPORT-V35.md:74–107`). The model is honestly bounded. Current external evidence is therefore stronger than merely “OpenMC installed,” yet not a validated complete material/blanket model.

**Problem and cause:** one-flight attenuation excludes the energy/direction redistribution and extra reactions after scattering. Those omissions can dominate utilization/blanket questions. In simple terms, a neutron that scatters can still react later; first-flight accounting deliberately stops following it.

**Decision:** **keep OpenMC** as the full-transport engine and generate a small, evaluated-data response set for clearly bounded source energy, geometry and material composition. For instant browser exploration, **evaluate** interpolating tabulated tallies with explicit domain and uncertainty, rather than writing another unvalidated Monte Carlo engine in TypeScript. Keep live first-flight and full-transport/reference outputs separate. [OpenMC neutron physics methods](https://docs.openmc.org/en/stable/methods/neutron_physics.html).

**Why over alternatives:** native full transport is mature and inspectable; a new browser Monte Carlo kernel adds cross-section, secondary-kinematics and tally-validation work. A paid on-demand native service is unnecessary for a free sharing project until users need configurations outside a small validated grid. Geant4 is a relevant transport alternative if charged-particle/detector coupling becomes the primary question, not a required replacement for OpenMC neutronics.

**Acceptance gate:** pin evaluated data and geometry; include at least absorber, scatterer, mixed, threshold and resonant cases; compare first-flight limits and all-event tallies independently; quantify Monte Carlo uncertainty and interpolation holdout error separately; reject/expose out-of-grid states. Avoid claiming activation, dose, damage or breeding from absorption alone.

### T5 — Keep Three.js and Blender; add parameter/geometry/state ownership before increasing visual detail

**Priority:** P1 product/scientific comprehension. **Confidence:** high about source gap; no visual render verdict.

**Verified:** the apparatus renderer loads a selected GLB and exposes load/select/reset/resize/dispose, with no numerical-state update method (`src/apparatus-viewer.js:68–77,111–115`). Its real PBR viewer uses `WebGLRenderer` (`:11–17`), while the main spinner uses `WebGPURenderer` (`src/main.js:34,151`). Procedural Blender geometry uses box/cylinder/ring primitives and illustrative material definitions (`blender/build_playgrounds.py:1–5,40–67,79–85`). Existing component IDs and picking are useful reusable foundations (`src/apparatus-viewer.js:6–8,83–96`).

**Problem and cause:** render geometry has a separate, mostly fixed source of truth from simulation parameters and results. The strongest perceived simplicity is therefore a missing scientific interaction path, not merely old graphics technology. In simple terms, the sliders change numbers while the hardware keeps showing the same object.

**Decision:** **keep Three.js/Blender/glTF**, and implement one demonstrable binding first: the target cutaway shows the actual solved temperature and isotope-depth profile at the selected time, with proper depth magnification and units. Then define a small parameterized geometry/semantic manifest for dimensions, transforms, physical versus illustrative materials and stable component IDs. **Evaluate CadQuery** for dimensioned engineering assemblies if sourced dimensions are available; use Blender for presentation meshes/materials. CadQuery can export assemblies to glTF, so adopting it does not require replacing the browser renderer. [CadQuery glTF assembly export](https://cadquery.readthedocs.io/en/latest/importexport.html).

**Why over alternatives:** switching to React Three Fiber or adding postprocessing does not connect geometry to physics. Three's official guidance supports WebGPU as its next-generation renderer while retaining WebGL for applications needing that path; forced uniform migration is unnecessary without a measured feature/performance need. [Three.js renderer guidance](https://threejs.org/manual/pages/webgpurenderer). CAD cannot justify dimensions/alloys absent from the source literature. Keep those marked illustrative rather than visually asserting an exact Marathon machine.

**Acceptance gate:** known uniform/ramp profiles map to known colors and physical positions; time scrub, unit scaling, geometry changes and selected component all address the same state revision. Plot and 3D values agree at sampled cells. Cutaway/exaggeration and field/particle visualization scales must be explicit on demand. Check actual GPU/device performance and component picking; asset integrity alone cannot pass this gate.

### T6 — Keep simple SVG where sufficient; benchmark one scientific plotting tool and establish a real browser release gate

**Priority:** P1 ergonomics/verification; P2 library change. **Confidence:** high about current plotting/test scope; medium about best chart library.

**Verified:** `src/laboratory.js:97–174` already implements grouped SVG plots with axes and units, equal spatial aspect, finite contiguous uncertainty bands (`:126–131`), a supplied selected-X marker and dots (`:139–141`), per-series pointer inspection/readouts, and Arrow/Home/End keyboard sample inspection (`:143–171`). This is meaningful existing scientific interaction, not a static-picture-only implementation. `src/coupled-target-ui.js:27–36,134–139` already exposes time scrubbing and selectable plots/depth scope. Missing from the inspected plotting path are pinned comparison baselines, brush/zoom, and an event contract synchronizing free pointer/keyboard inspection across different plots and the scene. Current v36 verification is 664 unit/DOM tests plus build/site/assets; it explicitly lacks observed GPU, mobile touch and deployed browser inspection (`docs/HEADER-V36.md:21–34`). No plotting/browser automation package is declared in `package.json:13–20`.

**Problem and cause:** existing sample readout, uncertainty bands and selected-time markers provide a good foundation. The remaining comparative gap is preserving a baseline while changing parameters and synchronizing free inspection between charts and the scene. Separately, DOM correctness cannot expose GPU/viewport problems. In simple terms, values can already be inspected, but comparing two experiments and following one selected point through different views remains incomplete; release tests do not yet see what a person sees.

**Decision:** **keep** the existing SVG sample readout, keyboard interaction, uncertainty bands and selected-time markers. First prototype a pinned baseline plus synchronized chart/scene inspection in one target view using the current implementation. Benchmark uPlot only if linked interaction requirements or measured responsiveness justify a library; choose a partial Plotly build instead only if required heatmaps/contours justify it. Do not add both or replace every diagram. Preserve the current scientific interaction and accessibility features during any prototype. [uPlot official repository](https://github.com/leeoniya/uPlot), [Plotly scientific chart documentation](https://plotly.com/javascript/).

**Why over alternatives:** uPlot offers a compact Canvas approach with numeric/log axes and synchronized cursors; Plotly offers broader scientific types and export but increases integration/bundle/GPU-context considerations. The application's current trace counts do not establish a rendering performance problem. Interaction requirements, rather than a desire for a recognizable package name, should decide adoption.

**Acceptance gate:** compare one chart against the current SVG on a target mobile device: first-load cost, scrub latency, memory, exact underlying values, exported data, keyboard/touch readout and visual density. Keep a textual/table route for exact data. For release verification, prepare an approved environment with actual Chromium/WebKit/mobile emulation and a physical-device check; Playwright documents viewport/touch emulation and trace/screenshot tooling, but it is a future authorized test infrastructure option, **not a workaround for the current managed-origin denial**. [Playwright emulation](https://playwright.dev/docs/emulation). Require model load/pick/orbit, slider-to-worker-to-plot-to-scene updates, stale-result cancellation, window layout, screenshot and console evidence at desktop and mobile sizes before claiming visual completion.

## Recommended order

1. Give every result a compact live/reference/scenario/domain identity and keep qualification separate from test counts.
2. Deliver one complete solver → plot → 3D target-state interaction and the approved browser/device evidence for it.
3. Close collision model-domain/orientation coverage and qualify the actual browser-resolution envelope.
4. Extend finite-film material references and uncertainty before target-life claims.
5. Expand OpenMC evaluated-data transport into bounded response cases if neutron utilization/blanket remains a core playground goal.
6. Add native SciML or broader CAD/multiphysics components only when a specific comparison or geometry/PDE need is demonstrated.

No tool alone turns the current scenario explorer into a calibrated Marathon design simulator. Conversely, the project does not need a complete commercial reactor twin to become an excellent scientific playground: honest bounded models, meaningful state-driven graphics, inspectable plots and verified interaction are the nearer target.
