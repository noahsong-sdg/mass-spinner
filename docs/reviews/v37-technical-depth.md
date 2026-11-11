# Technical-depth audit: v37 review of v36

Reviewed 8 November 2026 Pacific. Read-only audit of canonical source, with current primary sources reopened online. No implementation changes, runtime tests, browser observation, or new physics qualification are claimed. The deployed browser origin remains subject to an explicit managed-policy denial; no alternate route was attempted.

## Verdict

The playground already contains much more technical depth than the appearance of its fixed apparatus suggests. Its main educational deficit is **disconnected experiments and representations**, rather than an absence of equations. Additional explanatory text would largely worsen the problem. Prioritize controlled comparisons, observable-linked visuals, and clearly separated validity/error channels.

The most consequential predictive gaps remain real: plasma field realization, changing charge identities, physical extraction, and empirical target material data. These cannot be repaired by adding sliders or polishing a mesh.

## What is actually explorable

| Area | Implemented and interactive | Present limit |
| --- | --- | --- |
| 1: rotating filter introduction | B, V, transverse source energy and B-species mass; finite-pulse trajectories, destinations and cold cutoff | Simplified pinned source, fixed hardware, no collective response. Appropriate introductory scope. |
| 3: II A | Monoenergetic gyro-orbits; prescribed circular RF full orbits; tune frequency/handedness and compare ion work/destinations | Gyro view has no thermal/source/aperture ensemble; RF amplitude is not antenna power. |
| 3: II B | Curvature/grad-B guiding-centre deflection, declared energy, bend geometry and approximation diagnostics | No polarization field or finite slit transmission. |
| 3: II C | Three radial-equilibrium closures; central versus bulk composition; local density/composition versus cylindrical inventory; Gaussian/current/magnetic diagnostics | Rotation/profile assumptions are imposed; no discharge evolution, relaxation or extraction. |
| 3: II D | Exact cold mode discriminant and finite-wall/transit references; warm orbit statistics; fixed-Pθ quartic landscapes; evolving collisional double-well populations and budgets | A landscape is not a population; orbit stability is not collection; transport qualification is withheld. |
| Section III | Fixed charge sensitivity, elastic neutral scattering, local collision-domain diagnostics; explicit independent CX/recombination/diffusion/radiation/sheath estimates | Most estimates do not feed back into trajectory, charge, energy or purity predictions. |
| 2: compact Marathon source | Source energy/current/area; D–T reaction/stopping model choices; coupled depth-dependent isotope loading, thermal conduction and histories; saved-time propagation to first-flight neutronics | Scenario material parameters, 1D uniform footprint and first interactions; no full beam optics or scattered spectra. |
| 2: future blanket | Published reference geometry/results, optical-depth and shutdown-decay illustrations | Separate paper reference, not a live TBR/transmutation optimization or compact-source blanket. |
| 4: research | Saved drift and full temperature tensors, exact state scrubbing and provenance | Recorded moment replay, no live kinetic solve or distribution-level gate exploration. |

Evidence: `src/experience-ui.js:10–40`; `src/tutorial-insights.ts:12–54`; `src/rotating-diagnostics.ts:17–39,84–108`; `src/focused-diagnostics.js:44–55`; `src/coupled-target-ui.js:124–147`; `src/marathon-ui.js:9–38`; `src/blanket-reference.ts:1–31`; `src/research-ui.js:16–45`. The tutorial's emphasis on charge/mass selection, practical collection and generic failure processes supports preserving these distinctions. [Tutorial, II–III](https://stewartzweben.com/Papers/Zweben_PMF.pdf).

## Six material gaps

### D1 — High: users cannot retain a controlled baseline across most model families

**Verified:** `src/study-ui.js:9–37` already supports independent-seed batches and one-parameter scans for rotating/ICR, with sampling intervals explicitly separated from numerical/model error. This is valuable and must be retained. It does not cover centrifuge, double-well or Marathon. `src/main.js:359–366` labels its multi-model comparison as independent operating points with differing observables. `src/coupled-target-ui.js:105–120` correctly clears stale state, but also leaves no immutable prior result for comparison.

**Cause:** results are owned by individual panels and represent a single current configuration. Simply: moving a knob replaces the experiment instead of showing what changed against a remembered reference.

**Minimum fix:** one explicit Pin action retaining the exact configuration, output, schema, seed and provenance. Overlay only commensurate observables; show a compact changed-input list. Add two-axis scans incrementally to existing workers, beginning with rotating wall recovery versus voltage/parallel energy and Marathon yield versus energy/material column. Use derived dimensionless axes as optional representations, not extra sliders.

**Why this:** extends the working solver/output contracts instead of introducing a lesson system or a new optimizer. Julia GlobalSensitivity can consume recorded design matrices for offline sensitivity studies; start with declared scenarios and Morris screening before expensive variance decomposition. Never attach probabilities to arbitrary coefficient ranges. [SciML official API](https://docs.sciml.ai/GlobalSensitivity/stable/).

**Gate:** Pin→change→restore reproduces the same deterministic result; exports preserve both inputs and versions; incompatible observables refuse an overlay; independent seeds and discretization changes remain separate comparisons. Doubling Ω at equal T must quadruple the equal-charge centrifuge enrichment exponent in its declared closure.

### D2 — High scientific extension: collection is mostly an ideal boundary, not a design variable

**Verified:** `src/tutorial-insights.ts:57–63` explicitly distinguishes schematic collectors from modeled full end-plane/wall absorbers, static cuts, or no collector at all. `src/ensemble.ts:8–18` correctly supplies sampling-only recovery intervals; those do not calibrate physical aperture acceptance. The current distinction is honest, but the user cannot explore the central purity–recovery compromise of collector placement.

**Cause:** numerical boundary destinations stand in for product streams. Simply: where an ion leaves the domain is known, while whether the drawn collector accepts it is usually unspecified.

**Minimum fix:** a geometrically explicit passive collector mask at a declared exit plane, using existing impact positions/times. A movable radial split and finite acceptance aperture can produce accepted/rejected counts, composition and recovery against the same incident denominator. Treat it as post-processing only where interception does not alter upstream fields or paths. Biased/invasive collectors require a new field/boundary solve.

**Why this:** exposes useful-output tradeoffs using validated trajectories. Continuous feed, physical weights and calibrated mass flow remain a later distinct model; do not label count fractions g/s. Tutorial III K explicitly connects transport and source/exhaust limits to usable output. [Tutorial](https://stewartzweben.com/Papers/Zweben_PMF.pdf).

**Gate:** zero/full acceptance recover zero/original counts; accepted+rejected+other destinations conserve incident counts; coarse/fine binning agrees; collector 3D location is exactly the solver/post-processing geometry. Infinite/zero enrichment edge cases are explicit rather than clamped to attractive numbers.

### D3 — High scientific extension: Section III failure controls do not demonstrate causal failure of a separator

**Verified:** `src/failure-budgets.ts:3,61–69` declares independent homogeneous estimates; `src/limitations-ui.js:51–54` renders their separate plots and explicitly states inputs do not change separator runs. Fixed charge and elastic neutral scattering are interactive, so “all Section III physics is absent” would be false.

**Cause:** the failure-budget module has no particle/field/energy state contract. Simply: a worsening loss estimate appears beside an unchanged experiment.

**Minimum fix:** couple **one** justified channel first: an explicitly prescribed charge-exchange event law with neutral product tracking and complete destination accounting. Integrate hazard over each actual trajectory, rather than substituting axial length for path. Make cross sections/rates sourced for a supported species/energy domain or label a constant-rate scenario. Keep radiation, dust and chemistry separate until corresponding closures/data exist.

**Why this:** demonstrates a concrete bypass mechanism with a testable analytic limit. A generic “realism” or turbulence multiplier would hide the missing physics. Recombination/ionization networks and radiation require species/electron-distribution data and an energy equation.

**Gate:** constant-hazard straight paths reproduce exp(−n₀σL); zero density recovers the existing model; ion+neutral nuclei are conserved; charge exchange does not make a neutral continue a charged Lorentz orbit; time/path refinement and independent-seed intervals pass unchanged predeclared gates. [Tutorial, III A/D/F](https://stewartzweben.com/Papers/Zweben_PMF.pdf).

### D4 — High predictive limitation: “imposed field” and “achievable operating point” remain different problems

**Verified:** `src/tutorial-insights.ts:27,31,44,60–63` identifies imposed rotation/potential, unmodeled source/circuit/sheaths, and field penetration. The coupled magnetic Gaussian branch does improve radial force balance/Ampère consistency; it must not be described as having no self-field physics. It still does not solve a discharge circuit or predict drive power.

**Cause:** parameterized bulk fields and equilibrium closures bypass how electrodes drive the plasma. Simply: a chosen voltage produces the desired mathematical field without establishing that the apparatus can sustain it.

**Minimum path:** first add a compact achieved-versus-prescribed field representation to the diagnostic contract, with prescribed-only mode explicitly identified. An actual reduced conductivity/current-closure model is a separate scientific stage with domain-specific coefficients and experimental/reference tests; do not invent a penetration percentage slider and advertise it as realism.

**Why this:** the crossed-field literature identifies field realization/cross-field conductivity as a central unresolved practical constraint, so a full 3D PIC rewrite would not automatically supply missing material/discharge closure. [Gueroult et al., 2019](https://w3.pppl.gov/~fisch/fischpapers/2019/Gueroult.ExB.POP19.pdf).

**Gate:** any future closure must close charge/current and electrode power, recover a published solvable limit, state sheath/conductivity assumptions and resolve spatial convergence independently of orbit-step convergence. Until then, there is no qualified electrical cost or achievable-throughput prediction.

### D5 — High exploration gap: Marathon's deepest feedback is hidden from its main 3D representation

**Verified:** target time/depth/isotope/energy plots already exist (`src/coupled-target-ui.js:124–143`), and selected state drives neutron output (`src/marathon-ui.js:30–32`). `src/apparatus-ui.js:16–50` instead loads/selects a fixed GLB and exposes no state-update API. Material rates are explicitly scenario inputs (`src/coupled-target-ui.js:65–73`). It would be incorrect to propose “add coupled loading/thermal histories” as new work.

**Cause:** apparatus and numerical state are separate presentation paths. Simply: the interesting thing happening inside the target never appears on the target model.

**Minimum fix:** target selection opens a physically scaled depth cutaway linked to the existing saved-time state. Use labeled T/D/vacancy and temperature transfer functions; also display deposition/stopping depth when the solver exports it. Pin two parameter scenarios to reveal diffusion, renewal and cooling effects. A one-dimensional solver supports a depth strip/uniform footprint, not invented lateral hotspots. Change hardware geometry only when a geometrical control is consumed by its solver.

**Why this:** uses computed data and makes the published thin LiT target/cooled backing architecture understandable without pretending to know proprietary hardware. The company source establishes the compact architecture; the alchemy paper studies a different plasma-source blanket. [Marathon architecture](https://www.marathonfusion.com/beam-driven-fusion/), [alchemy paper](https://www.marathonfusion.com/alchemy.pdf).

**Gate:** picking a depth/color returns the corresponding cell/state value and units; source-off/cooldown cannot retain a live neutron beam; 3D selection and plot time agree; displayed scalar extrema match exported arrays; scenario envelopes are never called measured uncertainty. No claim of calibrated LiT lifetime follows.

### D6 — Medium: the research view cannot reveal why good moments can coexist with bad kinetic convergence

**Verified:** `src/research-ui.js:16–45` loads a recorded-moments schema and plots means and temperature tensor components. It does not plot velocity distributions, distribution-distance refinement, physical versus discrete entropy budgets, or a matched pass/fail comparison. This is an access/presentation gap, not proof the archived studies did not compute these quantities.

**Cause:** the public recording contract contains low-order moments, while collision qualification depends on much more. Simply: two distributions can share mean/temperature and still disagree substantially.

**Minimum fix:** export selected small distribution slices/marginals and gate records from already archived studies. Provide a paired coarse/fine selector, H-budget decomposition, conserved quantities and one distribution-distance plot. No live browser kinetic backend is necessary to inspect recorded results.

**Why this:** exposes the evidence behind qualification withholding at modest transfer/runtime cost. Reconstructing a Maxwellian from moments would erase precisely the non-Maxwellian discrepancy being investigated. Full velocity arrays can remain a separately downloadable research artifact.

**Gate:** marginals integrate to saved population/moments within declared quadrature tolerance; no unrecorded interpolation is presented as solved evolution; source identities/normalization are retained; gate states reproduce the sealed study rather than recomputing relaxed thresholds. No full 3D H theorem is inferred from energy conservation.

## Five reviewable extension slices, in order

1. **Pin + compare + regime coordinates:** reuse current outputs; start with one-family comparison and two dimensionless axes. Preserve existing independent-seed scans.
2. **State-linked target/field/trajectory cutaways:** attach the same saved-state values to the 3D scene; ordinary B/voltage changes alter overlays, not arbitrary coil shapes.
3. **Collector acceptance explorer:** add one passive, explicitly modeled geometry; plot purity against recovery with incident accounting.
4. **One causal failure channel:** charge exchange with neutral products, followed only later by separately reviewed charge-state/energy/current closures. Keep D4's missing field-realization boundary visible throughout.
5. **Distribution/gate replay:** expose existing collision-study evidence with paired views; retain withheld qualification.

Each slice should meet its physics/data/UI gates before broadening. These are exploratory tools, not lessons or a larger default dashboard.

## Optional coordinate system for meaningful experiments

- Gyro/RF: ρ/a, ν/Ωc, (ωRF−Ωc)τ, Ωcτ. Compare equal energy versus equal velocity explicitly.
- Curved drift: ρ/R, ΩcL/v∥ and source width/deflection. Preserve equal spatial scale.
- Centrifuge: χs=msΩ²a²/(2kBTi), Δχ and the existing magnetic/current consistency diagnostics. Hold the same central or bulk composition boundary during comparisons.
- Rotating filter: ηs=8(ms/qs)V/(B²a²), ρ/a and τwall/τ∥. η=1 is the ideal cold mode boundary, not a universal collection threshold.
- Failure: actual-path CX optical depth, L/λmfp and supported local collision-domain estimates. Unknown/unsupported is a separate map state, not a safe green region.
- Beam target: fusion optical depth, deposited power/area, incident dose/site inventory, diffusion/loading/renewal timescale ratios, and layer-specific thermal timescales. The scalar rates remain scenario assumptions when not measured.

For uncertainty, separate seed sampling, numerical refinement, parameter scenarios and empirical/model discrepancy. Offline Morris/Sobol studies can rank a declared input distribution; they cannot create a justified input distribution or cure missing physics. [SciML documentation](https://docs.sciml.ai/GlobalSensitivity/stable/).

## Evidence boundary

This review traced the current source and read the v35 realism/release reports, but did not independently rerun their experiments or the v36 suite. The report identifies learning/coverage extensions and qualification boundaries; it does not discover a new numerically reproduced solver bug. All observations of UI behavior here are source/contract observations. Actual mobile/GPU ergonomics and the quality of a future overlay require authorized live-browser inspection.
