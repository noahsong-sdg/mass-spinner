# v42 independent technical-depth audit

2026-11-09. Reviewer scope: source tracing, current primary-source research, conceptual coverage and proposed acceptance gates. **No product code, deployment, browser session, VM or project execution was changed/run by this reviewer.** This report is not runtime, GPU or experimental validation.

## Finding

The implementation already has substantially more physics than its compact opening playground suggests. Most important equations, observables and limitations of II A–D exist. Section III is honestly partitioned into modeled channels, independent estimates and missing couplings. The largest remaining depth opportunity is to make the existing calculations explain their own causal tradeoffs through linked plots and regime marks. Adding more paragraphs or a guessed engineering-efficiency model would make this worse.

There are five recommended improvements below, ranked by value for the requested emphasis. These are depth/requirements gaps, not five demonstrated arithmetic bugs. The explicit reduced scope of levels 01 and 04 is legitimate. Neither should acquire a new physics engine just to appear deeper.

## Evidence checked and reproducibility limits

Read execution paths:

- Level selection: `experience-state.ts`, `experience-ui.js` and `workspace-ui.js`.
- Separators: `physics.ts`, `experiments.ts`, `study-presentation.ts`, `focused-diagnostics.js`, `centrifuge-diagnostics.ts`, `collector-acceptance-ui.js`, `tutorial-insights.ts`, `tutorial-insights-ui.js`, `transport.ts`, `limitations-ui.js`, `failure-budgets.ts`, `failure-catalog.js`.
- Marathon: `marathon-ui.js`, `fusion-ui.js`, `fusion-reactor.ts`, `fusion-playground.ts`, `coupled-target-ui.js`, `coupled-target.ts`, `material-realism-ui.js`, `lithium-coating.ts`, `neutron-transport-ui.js`, `neutron-response-ui.js`, `blanket-ui.js`.
- Research: `research-ui.js`, `research-distribution-ui.js`, and the header/configuration of `web-assets/research-recordings.json`.
- Prior reports were orientation only; current source was reopened before crediting a capability. The local safe-dev README was read. No existing guest was synchronized or replaced.

The directory has no Git metadata (`git rev-parse HEAD` and `git status` both returned “not a git repository”), so no commit identifier is claimed. Read-only SHA-256 observations:

| File | SHA-256 |
|---|---|
| `src/experiments.ts` | `33f56a58d9ddb4f204dddfebac45f2c2f0d49252e485d7409b262008837af679` |
| `src/focused-diagnostics.js` | `531aefde49f598b823470b993180aa96cda8018996a9a4fa61c37098ba3786b3` |
| `src/limitations-ui.js` | `fb5b2fa32b474645975feef68a1a24db47c7f33d8deb16246a11bee5662dfd51` |
| `src/tutorial-insights.ts` | `4952c39d30515905d213034e0948ee4d1cabc6f64f73c14ac4097ae5f93bfa66` |
| `src/blanket-ui.js` | `a40e291227eeb66e92192a2d459a1806484bd0bba3ec58ab53105246e8d20280` |
| `src/marathon-ui.js` | `bac203d8440dac800c1481e8e467e68d878a09ffbbd084d068f24c07b101b3ca` |
| `src/coupled-target-ui.js` | `a2af0749e5563d2c7ffa1e8550e7eff229288447ca48a116805780a043138d61` |
| `src/research-ui.js` | `2741669739226026b522eb82be3c18245c97b913fb397f37abb93d1964fe9314` |

These identify inspected files, **not a tested build snapshot**. No new runtime conclusions or numerical tolerances passing in this snapshot are asserted. Host operations were source/report reads, source metadata reads and this owned report edit; project scripts, imports, installations, builds and tests were not executed.

## Coverage by level and mechanism

| Surface | Actual controllable cause → computed effect | Inspect/explanation already present | Boundary and assessment |
|---|---|---|---|
| 01 Mass Spinner | B, bulk V, perpendicular energy and mass B → sampled rotating-filter orbits, finite-pulse destinations and plots; passive collector radius/surface → accepted saved impacts | Cold-reference diagnostics and result inspection; aperture counts distinguish purity/recovery | Fixed species A, geometry, axial launch and collisionless settings are intentional. It is a simple demonstrator, not incomplete merely because advanced controls are hidden. |
| 03 II A gyro | Mass/charge/B/fixed perpendicular energy → exact transverse radius/frequency | Explicit energy-versus-temperature distinction | Monoenergetic circles have no source spread or collection. Honest reduced diagnostic. |
| 03 II A ICR | Frequency/amplitude/handedness, B and source conditions → full orbit response, RF work and destination counts | Tune-to-A and energy/work inspection | No RF-frequency study axis; antenna coupling/power and collisional resonance broadening absent. First is an affordance gap; latter are declared physical boundaries. |
| 03 II B bend | Parallel/perpendicular energies, B, length and curvature → guiding-centre displacement and scale checks | rho/R and bend gyroperiods; invalid-approximation message | Polarization and slit transmission absent and disclosed. Holding bend angle versus arc length is conceptually significant. No extra fabricated polarization penalty warranted. |
| 03 II C | Common rotation, Ti/Te, composition boundary, radial cut and three closures → profiles, local ratios, cumulative cylindrical inventories | Required-current/self-field/electron-inertia diagnostics in Gaussian branches; bulk-composition inverse | Rotation/density remain prescribed. Static inventory is distinct from extracted flow. The missing causal shortcut is a linked separation-strength and inventory-tradeoff view. |
| 03 II D rotating | B/V/source radius/thermal distribution/axial energy → finite-device warm destinations, cold wall and transit references | Cold stability branch, wall crossing and axial flight are already distinct | No self-consistent electrons/electrode penetration/turbulence. Existing one-dimensional studies do show the cold ratio threshold. A phase-space causal view would improve comprehension without changing dynamics. |
| 03 II D well/kinetics | Shaped potential/fixed canonical momentum → energy landscapes; separate kinetic initial state/cells/particles/collisions/time → populations and budgets | Canonical momentum and numerical torque/local-regime diagnostics | A potential minimum is not a population; a population is not extraction. Spatial/particle convergence remains open. Do not force the paper's species-specific rotating-frame construction onto a common-rotation collision equilibrium. |
| 02 compact source | Energy/current/spot/T column/stopping law plus pulse/thermal/kinetic assumptions → D–T source, target temperature/isotopes, energy/atom ledgers | Initial-source reference versus accepted time-resolved target; source state passes to first-flight neutron calculation | Material stopping is an atomic-additivity estimate; kinetic coefficients/retention are assumptions. External Li coating is already implemented and clearly separate from the fixed-host reacting film. No omission finding that “Li deposition is absent.” |
| 02 neutron studies | Accepted target rate/mean energy + geometry/coefficients → first-flight outcomes; separate H1 thickness/reference rate → recorded full-transport response | Later-scatter outcome explicitly unresolved live; separate evaluated-data reference and holdout/MC uncertainty | Absorption is not isotope production; mean neutron energy is not a spectrum. Generic irradiation network is separate. These separations are scientifically justified. |
| 02 future blanket | Cooldown/metastable fraction → analytic Hg/Au fractions; assumed optical depth → interception/utilization | Frozen OpenMC TBR/yield, material-order inspection, scope and decay-data conflict | This is a separate proposed power plant. Main missing paper idea is the joint TBR/gold/inventory tradeoff, not a live compact-source coupling. |
| 04 Research | Case and saved time/velocity marginal axis → exact archived moments, tensors and positive-mixture marginals | Convergence table, raw hashes, explicit withheld qualification and no-solver warning | Homogeneous field-free two-ion benchmark; not a spatial separator. Already exposes distributions/convergence. No evidence supports promoting it to live device physics. |

The source path for static takeaways is `tutorial-insights-ui.js:3–15`: the equation/meaning/boundary content is rebuilt as text, without receiving the current numerical result. This is the common reason many correct concepts are described but not *made visible in the current operating point*.

## Section III: real omissions versus honest boundaries

`failure-catalog.js` distinguishes C/D capabilities correctly. Fixed charges exercise sensitivity without predicting charge populations. Rotating/ICR elastic neutral scattering preserves charge. Local ion-ion scattering has explicit numerical limits. Molecular chemistry, dust bypass, charge-changing products, turbulent fluctuations and radiation-temperature feedback are not present in the C/D dynamics. The coupled magnetic Gaussian branch solves a radial equilibrium closure, not the discharge/electrode/current evolution. Pulse/inventory outputs do not establish continuous throughput.

The mathematical failure estimates themselves are useful. `failure-budgets.ts` has independent CX/recombination survival, prescribed-D spread, radiation energy and sheath flux. `limitations-ui.js:47–70` initializes them from their own defaults/controls and never consumes a current separator result. **This is honest independence, but a genuine missing comparison:** the user cannot directly see whether those assumed times/distances overwhelm the presently selected separation scale. A blanket list of eleven efficiency multipliers would invent unvalidated physics.

Primary caution beyond the tutorial: [Gueroult et al., LAPD end-electrode study (2024), abstract and §§1,4–5](https://w3.pppl.gov/~fisch/fischpapers/2024/Gueroult.electrodes.JPP2024.pdf) finds that bulk potential depends on electrode current and parallel resistivity, with different responses to concave-up/down profiles. Its conductivity parameter is tau=(L/a)sqrt(sigma_perp/sigma_parallel). Thus an electrode-voltage slider cannot be relabeled a demonstrated bulk-potential controller. This source supports showing an unresolved realization boundary; it does not supply a universal penetration fraction.

## Five ranked improvements

### 1. II C: a linked centrifugal-strength and inventory tradeoff plot

**Problem and technical cause.** All necessary profiles/inventories are computed (`focused-diagnostics.js:7–40`, `centrifuge-diagnostics.ts`), but a text metric joins central, bulk, inside/outside composition and recovery. Static explanatory content never receives the current values. The user has to mentally combine multiple plots to understand the dependence on rotation, temperature and cut.

**Simple cause.** The simulator can calculate “how much enrichment, and how much material survives the cut,” but makes the user assemble that answer.

**Small coherent change.** For equal fixed charge, add a live reference value and linked cut marker:

```
chi = (mB-mA) Omega^2 a^2 / (2 e Ti[eV])
ln[(nB/nA)(a)/(nB/nA)(0)] = chi
RB(c) = NB,out(c) / NB,total
xB,out(c) = NB,out(c) / [NA,out(c)+NB,out(c)]
Ns,out(c) = integral[c a,a] 2 pi r ns(r) dr
```

Plot outer-inventory B fraction against retained B inventory fraction as the cut varies; the existing cut selects the marker. Label both **static inventory**, with zero claims about extraction. Optional ratio enrichment uses the actual whole-cylinder composition as its reference. Use existing solver output/integration rather than a second closed-form density solver. A tiny chi marker plus one tradeoff plot can replace descriptive duplication.

**Why this choice.** It exposes the existing root relationship at very low computational cost and preserves closure-specific densities and bulk boundary conditions. A guessed stage efficiency or cascade would add unsupported physics. The formula above is an independent subtraction of the implemented equal-charge Boltzmann exponents. [Tutorial II C Eq.3](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf) motivates radial equilibrium; [Hole & Simpson's primary model](https://maths.anu.edu.au/files/U4348025XPUB31.pdf) is also relevant to why Gaussian/current closures should remain distinct.

**Falsifiable gates.** Omega=0 or equal masses gives chi=0 and composition independent of cut for the common-corotation/equal-charge case. Doubling Omega quadruples chi; doubling Ti halves it. For positive heavy-outward separation, moving the cut outward decreases retained B inventory while increasing its outer fraction. Inner+outer inventories recover total for every sampled cut. An empty/absent species never yields invented finite purity. Unequal charge does not display the equal-charge cancellation as valid. Changing only the cut does not rerun or alter the equilibrium profiles.

### 2. II D/01: turn the cold cutoff into a finite-device operating-window view

**Problem and technical cause.** `rotatingPresentation` already computes wall/transit/cold branches and warm sampled excursions. `study-presentation.ts` adds the cold ratio to one-dimensional destination scans. The capability is present, but these are separate outputs instead of a single linked account of why a nominally stable/growing species reaches its destination.

**Simple cause.** A line marked “cutoff” is easier to notice than the separate fact that the ion may leave the machine before reaching the wall.

**Small coherent change.** Reuse the existing scan engine and cold reference for a compact B–V diagram or a one-dimensional scan with shaded cold branch regions and a wall-time/axial-time comparison. Show the selected point and actual warm destination fractions alongside:

```
Omega_c = qB/m
beta = 8 m V/(q B^2 a^2)
discriminant = Omega_c^2 (1-beta)
tcold_wall / taxial,  taxial = L/sqrt(2 e Eparallel[eV]/m)
```

beta=1 marks cold marginal stability only. If a cold reference never hits the wall, display “no cold wall hit,” not a large finite time. Keep Level 01's four controls; make the plot optional in its existing Plots window. In Models expose source radius/axial energy so the user can falsify cutoff-only intuition without changing B or V.

**Why this choice.** It joins actual computed observables, preserving finite-source and finite-time dynamics. A classifier that paints every beta>1 point as “separated” would create the very false capability the tutorial cautions against. [Gueroult et al.'s rotating-plasma review, uniform-B discussion](https://w3.pppl.gov/~fisch/fischpapers/2018/accepted.gueroult.ppcf18.pdf) distinguishes confinement mechanisms and field-realization limits; the [original double-well paper](https://w3.pppl.gov/~fisch/fischpapers/2014/Gueroult.DoubleWell.2014.pdf) motivates keeping landscape and population views separate.

**Falsifiable gates.** At identical B/V, changing axial energy changes residence and may change wall/end destinations while beta remains identical. Include a bounded cold wall-contact case and a growing mode that exits axially first. B doubled at fixed V/m/a divides beta by four. Identical m/q gives identical beta, but equal energy across unequal masses must not be called identical trajectories. All scan results retain current finite-domain/timestep guards, seeds and intervals. Map pixels are computed or clearly missing; no interpolation across invalid run domains.

### 3. Section III: compare assumed failures to the accepted separator run

**Problem and technical cause.** The independent failure lab receives no run data (`limitations-ui.js:47–70`). Its path and residence default values are unrelated to the accepted result. Current orbits retain impact times, but only a few display paths (`physics.ts:205–268`); those chords must not be mislabeled complete ion path lengths.

**Simple cause.** Two useful rulers are shown in different windows, so the user cannot tell whether a chosen loss mechanism acts before separation finishes.

**Small coherent change.** Add an explicit “Compare with completed run” action. Copy only valid observed/reference scales with provenance; retain editable assumed rate/cross-section/D values. For finite pulses derive the empirical lifetime distribution using impact times and right-censor survivors at run duration. Compare recombination survival against those times; compare assumed sqrt(4Dt) to a declared radial/source/collector scale, not to a fabricated spatial distribution. CX requires either an explicitly assumed path or an accumulated, timestep-refined per-ion path scalar added to the integrator. Do not estimate it from z-length or decimated display paths.

```
tau_CX = n0 sigma_CX ell,  P0 = exp(-tau_CX)
P_recomb(t) = exp(-ne alpha t)
mixing ratio = sqrt(4 D t) / declared radial scale
```

These remain sensitivity overlays, never modified counts/purity. A centrifuge equilibrium supplies no relaxation time; it must continue to ask for an assumed comparison time. Annotate the missing field-realization and turbulence closures beside their relevant controls rather than creating adjustable “realism” coefficients.

**Why this choice.** It removes the missing link while respecting incomplete atomic/collective physics. The source for CX distance is [tutorial III D Eq.12](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf); the time/path and diffusion comparisons here are independently proposed diagnostics, not a validated coupled model. A full chemistry/neutral solver is a separate larger project needing reaction data and product kinematics.

**Falsifiable gates.** Zero coefficient gives unit no-event survival; doubling ell doubles CX optical depth. Two accepted runs with different residence distributions update the comparison without changing assumed atomic data. Censored ions are visibly distinct from impacts; no “mean lifetime” silently drops survivors. No current result disables data import. Editing source inputs while work is pending does not replace the accepted comparison snapshot. An inferred path must be impossible unless its declared method and convergence are present. Overlay toggling leaves baseline destination counts exactly unchanged.

### 4. II A ICR: isolate detuning with an RF-frequency response scan

**Problem and technical cause.** Manual RF controls and RF work are present, but `experiments.ts:5–27` accepts only V, B and mass B; ICR disallows V and recommends B/mass scans. Changing B simultaneously changes cyclotron frequency, orbit size and wall interception, so it does not isolate detuning.

**Simple cause.** The user can tune resonance but cannot inspect a response curve while holding the apparatus/particles fixed.

**Small coherent change.** Add bounded frequency as one study parameter in ICR only. Plot RF work per injected ion and end/wall fractions against omegaRF/Omega_c,A; mark both species' cyclotron ratios and the selected point. Keep handedness/amplitude/duration controls. Mean work alone is insufficient because resonant particles can leave early.

```
Omega_c,s = Zs e B/ms
dK/dt = qs E_RF(t) dot v
finite-residence detuning scale: |omegaRF-Omega_c,s| tres ~ 1
```

The last expression is an order-of-magnitude phase-coherence scale, not a fitted bandwidth or plasma-wave dispersion relation. [Tutorial II A, pp.4–5](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf) discusses ICR heating and the challenge of coupling at useful densities. This scan remains prescribed-field work, not antenna power efficiency.

**Why this choice.** One new scan dimension reuses the checked orbit/work engine and shows an important mechanism directly. Introducing an RF dielectric/antenna solver or increasing artistic orbit detail would not address this immediate missing cause/effect affordance.

**Falsifiable gates.** Zero RF amplitude gives zero RF work throughout; handedness reversal removes the corresponding positive-ion cyclotron resonance under matched collisionless/reference conditions. A long enough cold unbounded/reference case peaks near its known frequency with timestep refinement. Finite-wall and source-spread tests retain and explain shifted/broadened/early-exit responses rather than forcing a peak. Fixed seed batches remain paired across points; no result is displayed until the full accepted study completes.

### 5. 02 future blanket: expose the published TBR–gold–inventory tradeoff, retain compact-source independence

**Problem and technical cause.** `blanket-ui.js:11–13` displays one frozen paper case. Its interactive controls compute post-irradiation decay and idealized optical-depth utilization, not the multi-objective neutronics tradeoff. The implementation correctly says so, but this omits the main blanket-design choice rather than merely omitting an advanced solver.

**Simple cause.** The blanket can show how a batch decays, while it cannot show why adding more mercury stops helping and can reduce breeding.

**Small coherent change.** Add a recorded published-sweep explorer: thickness and Hg/Li composition select actual paper nodes, displaying TBR, gold production and initial enriched-Hg inventory, with a TBR=1 reference line and linked selected material layer. Prefer exact nodes until a documented interpolation/holdout protocol exists. A one-dimensional Fig.5 thickness sweep is a reviewable first slice; Fig.6's two-parameter surface is a later independent slice. Identify paper values versus digitization estimates; attach extraction error if figure digitization is necessary.

```
TBR = tritium nuclei born / tritium nuclei consumed
inventory utilization = produced Au mass / initial enriched-Hg mass
```

**Primary evidence.** [Rutkowski, Harter & Parisi, alchemy paper §§4.1–4.1.1, Figs.5–6](https://www.marathonfusion.com/alchemy.pdf) varies channel thickness/composition in an ARC-class 1500 MWth model. Gold saturation, breeding and inventory efficiency compete. This is distinct from the compact beam-target architecture in [Marathon's source page](https://www.marathonfusion.com/beam-driven-fusion/). [Isotope Production in Fusion Systems, II.5](https://arxiv.org/html/2512.09242v2) independently gives the idealized thickness/interception/utilization framework already represented by the optical-depth view; it cannot replace a scattering/multiplication transport sweep.

**Why this choice.** Reusing actual published response data reveals the paper's central choice without claiming a new LiHg transport solver. Scaling compact-source neutron output into the frozen blanket's TBR/yield would be a physically different problem. A universal analytic TBR formula or price optimizer would add unsupported assumptions.

**Falsifiable gates.** Exact selected nodes match archived extraction/source values within declared digitization precision. The Figure 5 family reproduces its high-thickness gold saturation and declining TBR, without imposing monotonicity on the whole domain. Values outside measured/published nodes are withheld unless interpolation is explicitly qualified. Changing compact-source current or target time leaves the published blanket response unchanged. Changing cooldown affects inventory fractions, not frozen irradiation production/TBR. Every value identifies static production versus depletion/extraction history.

## Marathon source/concept map and remaining source limits

Fresh current primary evidence supports three distinct branches, not one continuously coupled machine:

1. **Compact source:** [company architecture](https://www.marathonfusion.com/beam-driven-fusion/) is D+ onto a cooled solid LiT layer. The app covers conditional D–T slowing/yield/thermal/isotope evolution. [Company homepage](https://www.marathonfusion.com/) adds deposition/regeneration and neutron irradiation/transmutation uses. Existing fixed-film renewal, external coating and first-flight/reference neutronics are partial illustrations; no empirical regeneration/lifetime or medical yield was verified.
2. **Fusion fuel cycle:** [current company fuel-cycle page](https://www.marathonfusion.com/fusion-energy/) explicitly links plasma-centrifuge lithium enrichment to blanket breeding and fuel recycling. [Marathon's WO2026064411A1 patent, paragraphs 13–29](https://patents.google.com/patent/WO2026064411A1/en) proposes partial ionization, ion-to-neutral momentum transfer, heating control, outlets and stages. The app's Li-6/7 equilibrium preset is a conceptual bridge, not that device: it does not evolve a mostly neutral rotating gas, current-drive/viscous heating or staged mass flows. Patent disclosure is a proposed implementation, not independent demonstration. Treat this as a reference-level scope choice; do not relabel the fully ionized benchmark “Marathon centrifuge.”
3. **Future blanket:** published fast-neutron Hg multiplication/transmutation and Li breeding belong to a proposed power plant; the source code deliberately accepts no compact-source state in `setupBlanketExplorer`.

Marathon's [August 27, 2026 company-issued enrichment announcement](https://www.prnewswire.com/news-releases/marathon-fusion-demonstrates-lithium-and-hydrogen-isotope-enrichment-using-proprietary-plasma-centrifuge-technology-302861336.html) reports hydrogen/lithium enrichment and model agreement. No measured profiles, uncertainties or independent validation dataset were recovered in this pass; those claims must not become app validation. A second patent, WO2026136752A1, was found in indexed ownership/title records, but its full Google Patents page was inaccessible in repeated web calls. No full-text conclusions are drawn from it.

The [company radiopharmaceutical page](https://www.marathonfusion.com/radiopharma/) lists 2025–26 primary preprints, including the Gd/Tb and Pb/Ac pathways. Their existence is verified; their transport, activation or clinical-output claims were not independently reproduced here. They do not establish a requirement to put every pathway into this playground.

## Review disposition

Prioritize 1–3 for the user's II C/D and Section III focus; 4 and 5 are bounded follow-ons. Each is separable into a single-purpose change. No recommendation requires speculative physical fallback behavior or replacing the existing plotting stack. Retain the recorded-research qualification boundary, static-inventory wording, distinction between imposed bulk fields and electrodes, external-versus-coupled material balances, first-flight-versus-full transport, and compact-source-versus-future-blanket separation.

No correctness/security/data-compatibility defect was established by this depth-only review. Required tests/build/typecheck for any implementation remain the integrating agent's final gate inside its preserved safe-dev workflow. This report has no passing-test claim.
