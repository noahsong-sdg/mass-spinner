# Marathon scientific review, v37

Reviewer: independent Marathon-domain agent. Review date: 8 November 2026 Pacific. Scope: current v36 source and v35 qualification records, compact beam–target playground and separate future blanket reference. This is an adversarial read-only audit; no production code, numerical gates or deployment changed. No new numerical experiment was run. Browser/GPU appearance was not observed because the managed origin-policy boundary remains applicable.

## Verdict and evidence boundary

The current implementation is a defensible **conditional educational scenario**, with substantially more real coupling and verification than the early simulator. It is not a calibrated Marathon machine prediction. I found no newly reproduced arithmetic defect in this review. The eight findings below are verified implementation gaps or missing scientific affordances; their effect size outside existing benchmarks is an inference requiring the stated gates.

Current source really feeds source settings into a shared evolving D/T/vacancy and temperature state, then propagates the selected-time source into neutron first-flight accounting. The material feedback, conservative interface heating, cancelled stale requests, isotope/energy ledgers and explicit reference/live separation should be preserved. The latest independent reports record controlled convergence recovery, FiPy comparisons, actual RustBCA/OpenMC runs and exact H-1 ENDF interpolation. Reading these records is evidence of recorded checks, not a fresh rerun or experimental validation.

That coupled path is **opt-in**, not the initial default. [Source setup](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/fusion-ui.js:24) selects linear slowing initially. [Target setup](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/coupled-target-ui.js:108) refuses to run coupling until material stopping is selected; the explicit Target → Use material model action switches the source through [the actual handler](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/marathon-ui.js:26). Consequently, a first-time visitor may see the initial source reference but no coupled evolution. Preserve the distinction, while offering a prominently accessible valid material scenario; do not silently reinterpret linear slowing as material transport. This is a scientific discoverability issue, not evidence the solver is absent.

The primary architecture is also correctly separated: Marathon publicly describes a compact RF-source/accelerated-D+/LiT/cooled-substrate neutron source, while its gold/transmutation power-plant blanket is a different proposal. Neither a small beam-target gain nor the blanket's published TBR should be silently applied to the other system. [Marathon architecture](https://www.marathonfusion.com/beam-driven-fusion/), [current company architecture](https://www.marathonfusion.com/), [alchemy paper](https://www.marathonfusion.com/alchemy.pdf).

## 1. High: finish the finite-film stopping/retention problem before interpreting high-dose loading physically

**Verified:** [material domain](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/deuteron-stopping.ts:68), [fixed-slab integration](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/fusion-reactor.ts:70), and [coupled replacement](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/coupled-target.ts:125). Stopping rejects energies below 0.833333… keV; a slab that stops the beam cannot be completed. Live D replacement is a user probability distributed by normalized weights, uniformly by default. Recorded RustBCA profiles remain homogeneous half-space references; they do not supply finite-film retention.

**Cause:** Mean dE/dN and a conditional replacement operator do not determine reflection, straggling, transmission into the substrate or a retained-depth kernel. Simply, the model can slow the beam but cannot yet determine where stopped deuterons actually stay. Geant4 adaptation agreement is a unit/arithmetic check, and Bragg additivity itself omits a measured LiT compound correction. [Geant4 low-energy compounds discussion](https://geant4.web.cern.ch/documentation/dev/prm_html/PhysicsReferenceManual/electromagnetic/charged_hadron_incident/hion.html).

**Fix/tradeoff:** Generate finite LiT/LiD/substrate thickness–energy–composition transport benchmarks using the existing RustBCA workflow, with an independently configured full Geant4 comparison where applicable. Integrate bounded, provenance-bearing retention/deposition kernels only in the qualified region. Keep the assumed-probability mode for exploration. A direct fit to the old half-space histogram would be cheaper but cannot resolve film transmission. Do not extrapolate the nuclear fit or manufacture a zero-energy tail merely to remove errors. RustBCA itself warns that defaults and example material parameters require checking. [Upstream code and warning](https://raw.githubusercontent.com/lcpp-org/RustBCA/main/README.md).

**Gate:** Prospective incident/reflected/transmitted/retained and energy accounting; thin-film and thick-film controls; joint film mesh/particle sampling/step studies; declared cross-code model differences; separate compound-data uncertainty. Confidence: high gap, unknown predictive error size. Teaching priority: high because thickness and dose are core knobs.

## 2. High for Marathon fidelity: renewal exchanges hydrogen; it does not regenerate the lithium coating

**Verified:** [fixed-host state and renewal](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/coupled-target.ts:145), especially lines 155–166 and 237–243. The Li-site inventory and film thickness stay fixed. Renewal imports D/T occupancy and exports existing hydrogen; it is not Li deposition, erosion or changing surface chemistry.

**Cause:** The state contains hydrogen-site populations, not evolving Li mass or interfaces. Simply, the knob refreshes the contents of fixed seats; it does not rebuild the coating. Marathon's current public description specifically includes evaporated lithium deposited and cooled to form the regenerable target layer. [Primary target description](https://www.marathonfusion.com/).

**Fix/tradeoff:** First expose a dimensioned external Li deposition/erosion inventory and its mass/thickness balance, explicitly decoupled from unknown tritidation kinetics. Only then add a qualified moving-film or conservative remapping model. Keep fixed-host renewal as a named approximation. Renaming it “self-healing” or increasing its rate cannot supply the missing mass balance; a full surface-chemistry/atomistic solver would be premature without data.

**Gate:** Closed Li and H isotope budgets including exported material, zero-deposition/zero-erosion limits, thickness-motion convergence, remapping conservation, and deposition/renewal cooling/enthalpy accounting. No calibrated lifetime until material kinetics are measured. Confidence: high; this is a central design-identity gap rather than a new numerical bug.

## 3. Medium, becoming high in D-rich states: there is no D–D branch

**Verified:** [reaction hazard](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/coupled-target.ts:81) uses only target T times the D–T cross section. Initial non-T sites are D (line 131), and replacement adds D (lines 149–158). Outputs are correctly called D–T production in curves, but generic “Neutrons” metrics can be mistaken for total emission.

**Cause:** A D–T-only reaction network persists while the composition can approach LiD. Simply, the target can become deuterium-rich, but the simulator gives those deuterons no fusion channel. D–D produces both n+He-3 and p+T branches. Their omission does not prove a large error in T-rich operation; it invalidates interpreting vanishing D–T yield as zero total neutron production in a D-loaded target. The existing primary [ASCOT5 Bosch–Hale implementation](https://raw.githubusercontent.com/ascot4fusion/ascot5/main/src/boschhale.c) includes both D–D branches and their domains.

**Fix/tradeoff:** Initially label all relevant totals explicitly D–T and show a D-rich omitted-channel indicator. Then implement competing DT/DD hazards with reaction-specific products and product-retention assumptions. Adding a standalone DD count after the current depletion step would fail to conserve target species or incident projectiles.

**Gate:** Pure-T DT recovery, pure-D nonzero DD, both DD branch cross-section reference checks, competing-event normalization, reaction-specific nuclei/charge/energy budgets, and mixed-state time refinement. Confidence: high omission; quantitative importance is scenario dependent.

## 4. Medium: thickness and material column can describe unrelated material densities

**Verified:** [source column control](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/fusion-ui.js:7) allows 1e18–1e23 fixed Li/T units per m²; [thermal thickness](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/coupled-target-ui.js:55) allows 1e-8–1e-4 m. Stopping integrates the column while heat capacity and diffusion use the separate thickness ([solver](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/coupled-target.ts:112)). No implied Li-site density is displayed or linked.

**Cause:** Two useful independent scenario inputs also define n_Li=N_Li/L_film. Their permitted combination spans 1e22–1e31 m⁻³. Simply, dragging thickness can change thermal behavior without changing the amount of target material, implicitly changing its density enormously. This is mathematically allowed, not automatically an invalid hypothetical material, but easy to misread as varying the thickness of the same LiT coating.

**Fix/tradeoff:** Display derived site density and provide linked “fixed material density” versus explicitly independent “scenario” modes. Use sourced presets only where available. Derive column from density×thickness in the material mode; retain free inputs for sensitivity. Hard-coded “realistic” clipping without a dataset would conceal the assumption.

**Gate:** Unit checks, linked-mode invariance, unchanged independent-mode behavior, zero/partial occupancy tests, and export of the implied density plus preset provenance. Confidence: high source evidence; physical admissibility of a particular density needs data. This is a low-cost scientific-ergonomics improvement.

## 5. Medium: a source mean energy and isotropic point cannot teach source-angle/spectrum tradeoffs

**Verified:** [source product energy](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/fusion-reactor.ts:94) uses mass-number/isotropic-CM mean energies. [Selected-time handoff](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/marathon-ui.js:30) passes only rate and mean energy. [Neutron transport](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/neutron-transport.ts:72) assumes an isotropic monoenergetic point.

**Cause:** Averaging over birth depth/angle erases the energy–angle correlation before transport. Simply, every neutron is represented by one average energy emitted from one point. This is a reasonable introductory reference, but finite beam spots, detector angles and threshold reaction responses require the joint distribution. Angle-dependent source characterization is a real issue, not a need for decorative neutron streaks. [Primary neutron-generator characterization paper](https://www.sciencedirect.com/science/article/pii/S0168900222003151).

**Fix/tradeoff:** Add a finite emitting spot and two-body CM→lab birth kernel tied to the slowing history; then compare isotropic-CM and evaluated differential nuclear data. Keep the point/isotropic case as an analytic limit. Increasing point-source angular quadrature cannot recover a spectrum discarded upstream.

**Gate:** Exact angular normalization, mean-energy recovery, energy/momentum conservation, point/zero-spread limits, finite-spot/angle refinement and an evaluated/source-code comparison. Confidence: high gap; importance for current sample geometries is unmeasured.

## 6. High for irradiation claims: first collision is not the spectrum or reaction inventory

**Verified:** [first-flight scope](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/neutron-transport.ts:127) explicitly leaves scattering unresolved, excludes multiplication, and computes detection by an assumed probability per first absorption. [UI material adapter](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/neutron-transport-ui.js:40) offers assumed coefficients or H-1, not a Li/Hg/Ra activation network. The [independent OpenMC report](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/docs/NEUTRON-INDEPENDENT-V35.md:70) records mixed-case all-collision absorption 0.035610 versus first absorption 0.02655447. This is correctly retained as omitted physics, not a failed numerical-equivalence claim.

**Cause:** A first-collision partition cannot compute subsequent neutron histories or reaction-specific daughter production. Simply, “scattered, unresolved” contains neutrons that may still make the desired isotope later. Generic absorption also combines reaction channels that have different products. [OpenMC neutron physics](https://docs.openmc.org/en/stable/methods/neutron_physics.html), [Marathon isotope production paper Eq.2](https://arxiv.org/pdf/2511.02814).

**Fix/tradeoff:** Extend the already-running OpenMC workflow with continuous-energy materials, reaction-resolved tallies and one constrained irradiation/decay chain. Prefer offline qualified response tables/surrogates for the interactive browser; do not require live Monte Carlo on every slider. Use explicit fixed-source normalization and then depletion, such as [OpenMC CE/CM with source_rates and CRAM](https://docs.openmc.org/en/stable/pythonapi/generated/openmc.deplete.CECMIntegrator.html). A generic “detector efficiency” cannot substitute for reaction rates or chemical extraction.

**Gate:** Preserve pure-absorption analytic limit; source-normalized reaction tallies with MC errors; energy/group and depletion timestep convergence; analytic Bateman controls; product extraction and feedstock depletion budgets; out-of-table rejection. Confidence: high. Full shielding, dose and clinical predictions remain outside playground qualification.

## 7. Medium: thermal numerics are verified, but the material-validity envelope is not represented

**Verified:** [constant-property conduction](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/target-conduction.ts:16) is 1D with an insulated front and Robin-cooled back. [Energy placement](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/coupled-target.ts:95) deposits surviving energy at a zero-range backing-side interface. Inputs permit beam current up to 1 A and illuminated area down to 1e-5 m² ([controls](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/fusion-ui.js:7)); no phase/constitutive boundary is calculated. Isotope-carried enthalpy is explicitly omitted (coupled solver line 242).

**Cause:** Conservation and FiPy agreement concern the declared fixed-property equations. They do not establish local peak temperature, moving surfaces, phase changes or coolant adequacy. Simply, a mathematically consistent temperature can continue into a region where the assumed solid material model no longer applies. The v35 interface correction solves a real mesh-placement bias; it is not a measured backing range.

**Fix/tradeoff:** First expose dimensionless/constitutive validity diagnostics and a clearly delimited material-property dataset. Then introduce measured temperature-dependent properties and axisymmetric beam-spot conduction, with a finite-range backing source when qualified. Report energy carried by exported/renewed species before calling an open-system balance complete. Going straight to 3D CFD is expensive and adds unsupported coefficients before the dominant material/source uncertainties are bounded.

**Gate:** Analytic radial/depth limits, deposited-power integral, mesh/time convergence at fixed physical probes, comparison to independent FiPy/another solver for the new equations, property-domain rejection/flagging, and explicit phase/enthalpy assumptions. Confidence: high missing physics, unmeasured practical error.

## 8. Medium technical-depth gap: the current research map omits the newest isotope-generator pathways

**Verified:** [blanket coverage text](/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/src/blanket-ui.js:52) references the 2025/2026 isotope-economics paper and an older Ra→Ac route. It has analytic Hg cooldown and an optical-depth toy; it does not simulate irradiation-driven isotope inventories or a long-lived generator supply chain. [Marathon's current research page](https://www.marathonfusion.com/radiopharma/) additionally lists September 2026 papers:

- [Gd-150 feedstock → Tb-149 two-stage production](https://arxiv.org/abs/2609.25554): centralized long-lived precursor production and separate proton-cyclotron conversion. The paper explicitly says the key Gd-150(p,2n)Tb-149g cross section awaits measurement; its predictions cannot become a verified operating preset.
- [Pb-212 and Ac-225 generator parents](https://arxiv.org/abs/2609.19166): neutron/photon pathways to long-lived parents, with subsequent daughter production and repeated separation.

**Cause:** The selected “core work” is frozen around beam production and gold decay; adding citations alone does not make the newer conceptual distinctions interactive. Simply, immediate neutron count, useful daughter activity, feedstock inventory and a reusable generator are different outputs.

**Fix/tradeoff:** Add **one** isotope-workflow mode using a minimal irradiation–cooldown–separation/ingrowth network, linked to the qualified spectrum response in finding 6. Show atoms, activity, specific activity and separated yield with independently adjustable extraction assumptions. Keep economic scalings and uncertain nuclear channels visibly conditional. This adds more understanding than a large gallery of unvalidated isotope presets. Do not turn the compact LiT source into the alchemy paper's GW-scale plasma blanket by rescaling a single gain number.

**Gate:** Independent Bateman/matrix-exponential checks, branch/atom balances, no-irradiation and no-extraction limits, evaluated decay identities, reaction-data provenance/uncertainty and a benchmark against an existing depletion implementation. For the new Tb route, model-data status must remain predicted/unmeasured until supported. Confidence: high coverage gap; commercial and clinical outcomes are not validated by the preprints.

## Recommended implementation order

1. Low-cost scientific ergonomics: linked density/column/thickness, visible applicability/assumption state, explicit DT-only labels and response comparisons. Preserve the minimal main scene; place technical details in inspectable panels.
2. Qualified finite-film stopping/retention and resolved backing deposition, while retaining the tested current closure as a comparison.
3. Actual coating mass/thickness regeneration, then isotope/enthalpy feedback; do not fit a regeneration rate solely to improve apparent performance.
4. Birth spectrum/geometry and continuous-energy reaction response; then one irradiation/decay/extraction workflow representing the company's current isotope concepts.
5. D–D branch and axisymmetric/temperature-dependent thermal refinements when their omission metrics justify them. Order 4/5 can reverse for a deliberately D-rich or thermal-stress study.

No new method should erase existing negative records, turn a synthetic code comparison into material validation, or replace numerical convergence with conservation alone. The present browser-sized solver can remain the interactive engine while external codes provide bounded references and response data.
