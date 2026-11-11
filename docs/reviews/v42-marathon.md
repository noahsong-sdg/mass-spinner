# Marathon 02 adversarial physics audit — v42

Review date: 2026-11-09. Scope: source-level trace of current Marathon source, coupled target, neutron/material and blanket paths; fresh primary-source checks. No product code, deployment, VM, raw data or environment was changed. Host access was limited to source/report reads and this report edit. The safe-dev README was read. Numerical execution is delegated to the root's existing coordinated VM; test status is recorded separately below.

## Verdict and severity boundary

**The implementation is a conditional educational calculation, not a complete or calibrated Marathon machine simulation.** Its public scope text generally says this correctly (`index.html:77`, `src/coupled-target.ts:239–248`). I found no independently reproduced P0/P1 arithmetic defect in this audit. The P1 items below are blockers to a claim of physical completeness or Marathon prediction, rather than evidence that the declared simplified equations are implemented incorrectly. Preserve this distinction when triaging.

Actual v38 improvements matter: linked density/column/thickness and a stopping-domain map are live (`src/material-realism-ui.js:18–42`, `src/main.js:435`); an external Li coating balance exists; finite-film RustBCA cases exist; a qualified fixed H1 multiple-scattering reference and a generic decay network exist. Calling all these capabilities absent would be incorrect. Their remaining limitation is the **boundary between a reference and a live constitutive closure**.

## Actual path from sliders to accepted output

1. `src/fusion-ui.js:7–18,27–36,71–93` reads energy in keV, singly charged D+ current in A, illuminated area in m², exposure in s, and either a prescribed tritium column/linear slowing or fixed Li-site column and initial T fraction. The initial mode is linear (`:24`). Target-off removes the T reaction column; it does not remove all stopping material in material mode (`:30`). Beam-off makes current zero (`:90–93`).
2. `simulateFusionBeam`, `src/fusion-reactor.ts:50–105`, integrates initial source probability. Material mode advances `dE/dN_Li=-S_LiT(E)` by RK4; linear mode imposes slowing. Within each interval, `tau=sigma_DT(0.6 E) dN_T`, `p_i=survival*(1-exp(-tau))`. It independently accumulates stopping, fusion-carried incident energy, transmitted beam, alpha and neutron powers. This is an **initial fixed-matrix reference**, not the evolving target result.
3. `src/marathon-ui.js:25–43` feeds this source into `setupCoupledTarget`; linear mode is explicitly refused by `src/coupled-target-ui.js:113–118`. Settings produce an asynchronous worker request (`:120–130`; `src/worker.ts:24–27`). Revisions and aborts prevent an old request becoming the accepted scenario. During pending work the UI identifies its retained completed snapshot (`src/coupled-target-ui.js:108–110,151–152`).
4. `src/coupled-target.ts:69–100,129–171` recomputes atomic stopping from current D/T/vacancy composition and spatial fusion hazard, applies assumed replacement, implicit diffusion/release/renewal and film/backing conduction. Adaptive first-order IMEX stepping accepts two half steps after a full-versus-half comparison (`:174–228`). Pulse boundaries and shutoff are explicit integration boundaries (`:188–195`). Cumulative particle and energy ledgers are independent state variables, not inferred from a rendered plot.
5. A selected history sample supplies `neutronRateS` and `neutronMeanEnergyMeV` (`src/coupled-target.ts:197–214`). Only these two scalars reach live first-flight material transport (`src/marathon-ui.js:34–36`). Selected time changes this source; changing the independent response/reference controls does not change target evolution.
6. `src/neutron-transport-ui.js:46–52,64–77` uses custom macroscopic coefficients or native H1 ENDF microscopic interpolation times assumed density. `src/neutron-transport.ts:48–62,76–134` integrates straight point-source rays through a finite cylinder and partitions misses, uncollided escape, first absorption and unresolved first scattering. Detection is a user conditional probability per first absorption.
7. The frozen initial-source geometry, constant-heat observer and fixed-site loading reference are explicitly nested apart from live coupling (`src/marathon-ui.js:17–23,39–43`). Finite-film RustBCA is also a recorded reference (`src/finite-film-ui.js:3–7`). H1 multiple scattering has its own fixed source/geometry controls (`src/neutron-response-ui.js:5–9,18–30`). Generic irradiation/cooldown supplies assumed parent-production rates (`src/decay-network-ui.js:4–18`). None creates a live LiT/Ra/Hg irradiation network.

## Primary sources and equation/unit checks

| Quantity or identity | Evidence checked | What is established |
|---|---|---|
| Marathon compact architecture | [Company beam description](https://www.marathonfusion.com/beam-driven-fusion/) and [current company target description](https://www.marathonfusion.com/) | Public architecture: ion source, accelerated D+, solid LiT, cooled backing; evaporation/deposition is part of target renewal. A company description is not independent performance calibration. |
| D–T fit | [ASCOT5 author-maintained Bosch–Hale source](https://raw.githubusercontent.com/ascot4fusion/ascot5/main/src/boschhale.c), backed by [Bosch–Hale paper DOI](https://doi.org/10.1088/0029-5515/32/4/I07) | `src/fusion-reactor.ts:33–39` matches the low-energy coefficients and millibarn-to-m² factor `1e-31`. Only the 0.5–550 keV CM branch is implemented; lower-domain rejection is deliberate. This check does not establish measured LiT thick-target yield. |
| CM/lab and particle power | `src/fusion-reactor.ts:94–105` and conservation derivation | With mass numbers 2,3,1,4: `Ecm=3E/5`, `En(mean)=4Q/5+14E/25`, `Ealpha(mean)=Q/5+11E/25`; sum is `Q+E`. `I/e` is D+/s; keV × `1000e` is J; `Pbeam=I E_keV 1000` W. `Q=17.6 MeV` and these mass numbers are stated approximations, not exact evaluated kinematics. |
| Atomic stopping | [Pinned upstream G4BraggModel atomic function](https://raw.githubusercontent.com/Geant4/geant4/b4a16de652ec244f7a0ecc0a5cacfee21930bf75/source/processes/electromagnetic/standard/src/G4BraggModel.cc), [Geant4 compound stopping manual](https://geant4.web.cern.ch/documentation/pipelines/master/prm_html/PhysicsReferenceManual/electromagnetic/charged_hadron_incident/hadrons.html) | Atomic adaptation and Bragg additivity are identified correctly. `eV/(10^15 atoms/cm²) = 1e-22 keV m²/atom`; summing Li plus occupied D/T gives stopping per Li host site (`src/deuteron-stopping.ts:14`, `src/target-material.ts:10–19`). It is neither a full Geant4 transport run nor measured compound stopping. |
| Neutron first interaction | [OpenMC neutron physics](https://docs.openmc.org/en/stable/methods/neutron_physics.html) | `1-exp(-Sigma_t ell)` and absorption fraction `Sigma_a/Sigma_t` are the correct nonmultiplying first-collision partition. This does not give all-collision absorption or spectrum. |
| Angle/energy/finite spot relevance | [JAERI source-characterization report](https://www.osti.gov/etdeweb/servlets/purl/303101) and [LLNL measured neutron-source work](https://www.osti.gov/servlets/purl/1814672) | Actual source characterization includes birth energy/angle, finite beam diameter, structures and scattered field. These sources concern their own devices and do not calibrate Marathon. |
| Future blanket values | [Marathon alchemy paper](https://www.marathonfusion.com/alchemy.pdf), §§4.1–4.1.1 | `src/blanket-reference.ts:2–7` correctly retains 1500 MWth, 210 mm, 85 at% Hg, 90% isotope enrichments, TBR 1.19, 2953 kg/year transport and 2909 kg/year depletion. These are paper calculations for a different assembly, not beam-source slider predictions. |
| Hg decay evaluation boundary | [ENSDF 197Hg EC evaluation](https://www.nndc.bnl.gov/ensnds/197/Au/ec_decay_64.14_h.pdf), [NUBASE2020 published table, p.138](https://www-nds.iaea.org/amdc/ame2020/NUBASE2020.pdf) | Hg→Au is electron capture. Legacy 64.14 h versus NUBASE 64.93 h is an evaluation conflict, already disclosed in `src/blanket-ui.js:53–54`. The current explorer explicitly mixes legacy half-lives with a rounded modern branch; it should not be advertised as one current evaluated dataset. The raw NUBASE text URL timed out here; the primary published table was checked instead. |

Patent search did not locate a primary Marathon LiT beam-target patent in the searched results. The located [Marathon partially ionized plasma-centrifuge patent WO2026064411A1](https://patents.google.com/patent/WO2026064411A1/en) belongs to a different subsystem; it is not evidence of a qualified LiT stopping/retention closure. No patent-derived beam-target construction claim is made here.

## Ranked findings

### P1 completeness blocker: stopping and isotope replacement do not determine finite-film retention

**Concrete trigger/evidence.** Select material mode and increase material column at fixed beam energy until an RK stage falls below 0.833333… keV. `src/deuteron-stopping.ts:69–75` rejects; `src/fusion-reactor.ts:75–81` reports an unresolved stopped tail. For admitted thinner films, non-fusing D replacement remains `j*(1-p)*replacementProbability*weight*n/N` (`src/coupled-target.ts:148–150`), uniform by default (`:127`). Recorded 100 keV LiT/W outcomes are explicitly not a live kernel (`src/finite-film-ui.js:3–7,24–29`).

**Technical cause.** CSDA mean stopping provides `dE/dN`, not a probability measure over prompt reflection, transmission, stopping/retention depth, recoil loss and subsequent residence. The scalar replacement probability is independent of energy, thickness and composition. Existing BCA outcome partitions and projectile-energy gates constrain their recorded cases; they do not close a reacting film's heat or high-dose kinetics.

**Recorded evidence strength.** `docs/FINITE-FILM-INDEPENDENT-V38.md:24–59,65–78` independently reduced 16 native cases at one incident energy (100 keV), two film thicknesses (0.1/2 µm), free film or 10 µm W, and 256/1024 ions. It reports a largest coarse/fine difference of 0.4883 percentage points against a familywise Hoeffding budget of **18.83 percentage points**. Passing this predeclared sampling-consistency gate is useful evidence and must not be restated as percent-level physical accuracy, energy-grid validation or a qualified interpolation law. This audit read that record; it did not repeat the 5.33 GB raw reduction.

**Simple cause/impact.** The model can slow an ion and let an assumed fraction exchange a site, but cannot yet predict where that ion stays. Changing replacement probability is a sensitivity study, not a measured lifetime prediction. A stopped tail cannot be made complete by dropping low-energy events.

**Smallest coherent corrective options.** For the current teaching product, retain the explicit domain boundary and state “assumed replacement” beside outputs. For predictive retention, promote only a bounded, prospective finite-film transport response family with full outcome and energy accounting into the live closure. This is preferable to fitting an arbitrary scalar to half-space histograms, or silently extending the fusion fit: it uses the physical geometry and preserves demonstrated scope. It is broader physics work and should be split from UI changes.

**Gate.** Incident = reflected + downstream transmitted + film retained + backing retained; independent projectile and assembly energy ledgers; LiT/LiD/partial occupancy; thin and thick controls; energy/thickness/composition holdouts; particle/mesh/timestep sensitivity; explicit stopping/chemical uncertainty. No experimental LiT calibration was verified in this audit.

### P1 completeness blocker: Li deposition exists as an external balance, not target regeneration feedback

**Trigger/evidence.** Change Li deposition/erosion in `src/material-realism-ui.js:44–69`: only external coating curves change. The exact balance solves `N'=p-e`, `X'=p*x_in-e*X/N` (`src/lithium-coating.ts:32–35`) and explicitly excludes beam, nuclear heat and moving interfaces (`:88–92`). Reacting solver sites, geometry and conductivity remain fixed (`src/coupled-target.ts:103–108,129–132`). Its “renewal” term exchanges H occupancy at a prescribed rate (`:156–167`), not lithium.

**Technical/simple cause.** Two models have intentionally disjoint states and no conservative moving-film map. Simply, one panel tracks building/removing a coating; the neutron-producing coating does not change with it. Marathon's evaporate/deposit/cooled-film concept cannot be validated by refreshing D/T in fixed seats.

**Impact.** No self-healing rate, regenerative operating equilibrium or endurance prediction follows. This is an honest declared scope boundary, not evidence that the external balance is mathematically wrong.

**Smallest corrective options/why preferred.** Keep both panels explicit for exploration. If regenerative performance is a requirement, couple a conservative Li and isotope areal inventory to thickness and a remapped depth mesh first; only then add tritidation/temperature closures supported by data. That split exposes mass/enthalpy budgets and is preferable to substituting `renewalRateS` for deposition or jumping to unsupported surface chemistry.

**Gate.** Zero-flux recovery of the current solver; deposition-only and erosion-only exact controls; Li/D/T and sensible/latent/binding energy balances; exhaustion boundary; conservative remapping under growing/shrinking films; convergence at fixed physical depths. No unique coefficients or proprietary geometry should be inferred from the public architecture.

### P1 for device/irradiation predictions: source footprint and angle–energy distribution are discarded before transport

**Trigger/evidence.** Hold I, energy and initial composition fixed; vary `beamAreaM2` (`src/fusion-ui.js:12`) and select the initial coupled sample. Production rate is unchanged while flux/heating changes. The live neutron handoff has no area (`src/marathon-ui.js:35`); the transport source is a monoenergetic isotropic point (`src/neutron-transport.ts:127–132`). Detector distance reaches 0.05 m (`src/neutron-transport-ui.js:38`) while beam area reaches 0.1 m² (disk radius 0.178 m).

**Technical cause.** The all-angle mean energy is not the energy distribution conditional on the detector direction. It also loses the source's emitting area. Even isotropic-CM products have a lab angle–energy correlation from CM translation. Scalar conservation and more point-source angular samples cannot recover discarded variables.

**Simple cause/impact.** A broad glowing target becomes a mathematical point before it irradiates the sample. Near-field geometric error can be large even without uncertain nuclear physics. For a uniform emitting disk radius `a`, separation `d`, a very small centered parallel receiver has plane current `R/(2*pi*a²)*(1-d/sqrt(d²+a²))`; the point-source current is `R/(4*pi*d²)`. Their ratio is `2d²/a²*(1-d/sqrt(d²+a²))`, about 0.115 for the allowed 0.1 m² beam and 0.05 m gap. This is an analytic limiting-case falsification of a universal point-source approximation, **not** a fresh finite-receiver run or a measured Marathon error. A threshold response cannot generally use `sigma(mean E)` in place of the birth-weighted `mean sigma(E,angle)`.

**Smallest corrective options/why preferred.** At minimum expose `a/d` and identify the point reference near the affected result. If spatial source realism is required, pass a normalized finite emitting disk and a two-body birth kernel derived from the slowing history; retain the existing point/isotropic case as an analytic limit. This addresses the missing state directly and is preferable to more quadrature samples or a scalar fitted efficiency.

**Gate.** Point-source limit, disk central-current limit, far-field recovery, normalization, energy/momentum and mean-energy recovery, source/sample spatial refinement, CM→lab angular comparison and evaluated differential nuclear-data comparison. Report physical-model and numerical uncertainties separately.

### P1 for completeness: all-collision response, irradiation products and blanket breeding are still separate problems

**Trigger/evidence.** Select H1 and appreciable scattering in the live neutron panel: first-scattered neutrons stop in an unresolved category (`src/neutron-transport.ts:54–62,129–132`). The new CE OpenMC response accepts only its exact 14.1 MeV, H1, density and cylinder identity (`src/neutron-response.ts:28–39,60–69`); its controls are independent (`src/neutron-response-ui.js:18–30`). Generic decay production is supplied directly in atoms/s (`src/decay-network-ui.js:13–18`). `BLANKET_PAPER_CASE` is frozen (`src/blanket-reference.ts:1–7`); optical depth is one reaction with no multiplication (`:27–31`).

**Technical/simple cause.** A first-collision partition lacks outgoing scattering histories; a fixed response family lacks reaction-specific Li/Hg/Ra rates; a generic Bateman network lacks the spectrum-dependent production input. Simply, the available pieces do not calculate the chain from the current beam to a useful isotope or replacement tritium.

**Impact.** Neither a TBR nor usable product activity, shielding thickness, dose, dpa, material lifetime or economic return follows from the live controls. Historical independent evidence already shows why first absorption is insufficient: `docs/NEUTRON-INDEPENDENT-V35.md:70–85` records mixed-case OpenMC absorption 0.035610 versus first-flight 0.02655447 per source neutron. Those are recorded checks, not a new rerun here.

**Smallest corrective options/why preferred.** Keep current explicit reference separation. To satisfy a product-yield requirement, add one bounded spectrum/material/geometry response family with reaction-resolved tallies and uncertainties, then feed those rates into one evaluated decay/extraction network. This reviewable split is preferable to extending a free-H1 surrogate to LiHg or multiplying total absorption by an arbitrary isotope yield. For a blanket, multiplication, leakage, capture and breeding require their own transport budget and cannot be obtained by scaling compact-source Q.

**Gate.** Analytic pure-absorption and Bateman limits; source normalization and all reaction budgets; spectrum/geometry/material holdouts; Monte Carlo SE separate from interpolation/model error; depletion timestep and extraction balances; out-of-family rejection; comparison to continuous-energy transport/depletion. Current reference-family qualification should not be widened without new evidence.

### P2 limitation: D-rich target outputs remain D–T only

**Trigger/evidence.** Set initial T fraction to zero while leaving D+ on. Initial non-T sites are D (`src/coupled-target.ts:132`), but the sole hazard is `state.t[i]*sigma_DT` (`:86`); DT rate is exactly zero. Both DD branches are omitted in exported metadata (`src/material-realism.ts:35–42`, `src/coupled-target.ts:235`). Main target metrics correctly say D–T (`src/coupled-target-ui.js:135`), so this is no longer the older unlabeled-total defect.

**Cause/impact in technical and simple terms.** There is no competing DD hazard/product network. A D-loaded target has a real fusion channel that this particular calculation intentionally does not count. Vanishing DT does not imply no neutrons, no tritium production or no fusion heat. The omission grows relevant as T is depleted; its size in T-rich scenarios is not established by this review. The author-maintained ASCOT source includes both DD branches and demonstrates they are distinct nuclear channels.

**Smallest corrective options/why preferred.** Preserve reaction-specific labels and surface the omitted-channel metadata at D-rich states. If total fusion is required, implement competing DT/DD probabilities with branch-specific target/projectile/product balances, not an after-the-fact DD count. This avoids silently violating conservation.

**Gate.** Pure-T recovery, pure-D nonzero DD, both branch reference cross sections, incident-event normalization, produced-T/He3/proton bookkeeping, reaction-resolved energy and time/mesh refinement. No promise of total fusion should precede that gate.

### P2 limitation: numerically conservative temperatures have no calibrated material/beam validity envelope

**Trigger/evidence.** Current permits 1 A, 500 keV and area 1e-5 m² (`src/fusion-ui.js:8–12`): incident power is 500 kW and incident power density 5e10 W/m² before any physical spot/cooling constraints. Beam current and energy are boundary inputs; RF ionization, molecular fractions, extraction/emittance, space charge, voltage breakdown and focusing are not solved. Thermal capacity/conductivity stay positive constants (`src/target-conduction.ts:1–20,35–40`). Surviving beam is absorbed at a zero-range backing-side interface (`src/coupled-target.ts:96–99,246`), not a resolved W stopping distribution. Phase changes, exported isotope enthalpy and chemical/binding heat are explicitly omitted (`:241,245`).

**Technical/simple cause.** Conservation validates a specified reduced system; no constitutive or beam-transport equation limits the operating point. Simply, the code can conserve heat at a setting that cannot sustain the assumed solid target or source. This is not a demonstrated energy-ledger defect.

**Smallest corrective options/why preferred.** Add property-domain/beam feasibility diagnostics only with dimensioned evidence; keep out-of-data regimes explicitly hypothetical. For a requested thermal prediction, first qualify finite-range energy deposition and temperature-dependent material data, then axisymmetric spot conduction. This targets the dominant missing inputs and is preferable to adding 3D coolant CFD without qualified properties. Do not invent a hard “safe temperature” or current ceiling unsupported by material/device data.

**Gate.** Physical deposition integral, analytic 1D/radial limits, fixed-position spatial/time convergence, independent conduction comparison for the added equations, validated property range/phase/enthalpy handling, separately qualified beam source and cooling boundary. None of the current conservation, FiPy or BCA checks validates Marathon performance by itself.

## Validation status

Freshly checked in this audit: actual production execution paths and exact equations/units above; current scope and reference boundaries; primary company, Bosch–Hale author-maintained implementation, pinned Geant4 source/manual, primary neutron-source characterization, OpenMC methods, paper blanket values and evaluated decay-source conflict. No browser appearance or actual apparatus was observed.

No project code was run on the host. The root completed a fresh offline audit in its existing safe-dev VM at `/work/home/audit-v41-check-source`. All 481 baseline input hashes were checked before and after each command; 479 match the canonical host inputs, and the other two are stage-only helpers `run-final-gates-v38.py` and `run-final-gates-v39.py`. The exact baseline aggregate is `4f85060ae4393b8c17ecb616b56cc1be1599162e27820c822a398b0fc7a2a6a4`. The receipt also names and hashes additional audit inputs; this is an identified copied snapshot, not a live host mount.

| Fresh check in that snapshot | Result |
|---|---|
| `npm test` | **831/831 passed**, zero failures/skips; command duration 22.903 s. This includes the requested source, stopping, coupled-target adversarial, Marathon integration, neutron-data/first-flight, blanket, material-realism and response tests. |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0 |
| `npm run check:site` | Exit 0 |
| `npm run check:assets` | Exit 0 |

Evidence checked: `scientific/audit-v42/tests.log` (fresh TAP totals), `scientific/audit-v42/receipt.json` (source root, command argv, exit codes and durations), and `scientific/audit-v42/input-receipt.json` (canonical comparison and baseline aggregate). These executions were performed by the root; this reviewer read their receipts and log. No new native Geant4, RustBCA, OpenMC or LiT experiment was run, and no new calibration follows. The ranked findings remain **source-verified limitations and analytic consequences** even though the current implementation's test set and required build/typecheck gates pass. No P0/P1 arithmetic failure is asserted without reproduction.

