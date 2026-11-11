# Separator science review — v37

Read-only review of the current v36 separator, equilibrium and research-replay execution paths. No physical trajectory, project test, build, dependency installation or GPU/browser verification was performed in this review. Existing numerical study results below are verified report/artifact contents, not newly reproduced simulations. Application test counts are not used as physical validation.

## Verdict

The app implements useful prescribed-field orbit and bounded-equilibrium experiments and explicitly withholds transport qualification. The important remaining work is physical closure and observable-specific qualification. I did not establish a new wrong sign, dimensional error or broken conservation implementation in the inspected current paths. Describing the entire collision solver as broken would contradict the v34 evidence.

The latest v34 report records 30 fresh Philox runs, 240 passing numerical-refinement decisions and passing sampled raw angular budgets; all five sampled model-domain coverage gates fail. The preserved results, failure classification and limitations must remain visible. A correct solution to simplified equations is not a demonstrated separator performance prediction.

Online primary-source cross-checks: [2018 tutorial, author-hosted full text](https://stewartzweben.com/Papers/Zweben_PMF.pdf); [2017 rotating-separation review, full text](https://arxiv.org/html/1707.00511v1); [double-well mass filter, original publication record](https://collaborate.princeton.edu/en/publications/the-double-well-mass-filter/); [Nanbu angular-law paper](https://doi.org/10.1103/PhysRevE.55.4642); [current WarpX collision documentation](https://warpx.readthedocs.io/en/latest/theory/multiphysics/collisions.html). These establish equations, mechanisms and benchmark candidates, not calibration of our apparatus.

## 1. High: qualify a usable collisional operating domain before promising transport accuracy

**Verified evidence.** `docs/TRANSPORT-QUALIFICATION-V34.md:8–16` preserves the numerical/physical distinction and missing alignment/orientation and continuum-bias requirements. Lines 106–119 show that research studies use 16,384–32,768 markers per species and cover one physical configuration. `src/doublewell-dynamics.ts:42–47` limits the interactive path to 4,096. `src/doublewell-regime.ts:14–42,78–106` diagnoses electron-screened encounter magnetization from local sampled moments; sparse cells are unresolved. `src/axisymmetric-collisions.ts:76–80` correctly acknowledges finite-radius pair torque; it does not project the error away.

**Root cause, technical.** Finite spatial pairing, local moment uncertainty, and the unmagnetized encounter approximation are different error mechanisms. Small changes between two resolutions do not bound the remaining continuum bias. A well-resolved high-marker case does not certify a low-marker live preview or the entire slider domain. Nanbu's established cumulative angular law improves finite-step scattering, but does not remove these spatial and physical assumptions. [Primary angular-law reference](https://doi.org/10.1103/PhysRevE.55.4642).

**Plain meaning.** We can show consistent numerical results while some modeled particles encounter conditions the collision approximation has not earned the right to describe.

**Recommended split.** First make alignment/orientation and matched collision-off controls executable under the unchanged gates. Then predeclare joint particle/radial/axial/time studies around a restricted useful parameter region and resolve the cold-tail screening/encounter issue against independent kinetic cases. Use a compact per-observable status: prescribed orbit, preview, converged within a declared domain, or extrapolation. Do not disable valid collisionless orbit outputs because a different collisional transport claim fails.

**Why this option.** Restricting and qualifying a useful domain is more defensible than raising browser limits, replacing the solver wholesale, imposing a temperature floor, subtracting torque, or loosening thresholds. A magnetized operator is a separately reviewable scientific change if the intended region requires one.

**Acceptance gates.** Existing raw angular and exposure gates; independent paired controls; resolved joint refinement with a justified bias bound below the claimed collision effect; supported physical regime or a defensible observable-error bound for excluded tails. Match the actual live configuration and resolution before attaching a qualified status. The current archive does not pass this complete contract.

## 2. High: couple one justified neutral/charge-changing process into the experiment

**Verified evidence.** `src/collisions.ts:3–6,26–36` implements an imposed cold bath with constant isotropic elastic cross section; it creates no charge-changing products. `src/failure-catalog.js:11–28` explicitly marks neutral/CX limitations. `src/limitations-ui.js:47–54,58–63` calculates separate failure estimates and clearly says they do not alter separator runs. This is an honest interaction/technical-depth gap, not an incorrect hidden coupling or a discovered arithmetic bug.

**Root cause, technical.** No shared evolving charge/neutral population exists in the selected orbit experiment. Elastic momentum exchange preserves ion identity; a charge-changing event can change confinement and collector contamination. The tutorial's Sections III A–D describe why mass-to-charge ambiguity and neutral products matter. [Tutorial](https://stewartzweben.com/Papers/Zweben_PMF.pdf).

**Plain meaning.** Changing the charge-exchange estimate can warn that separation will fail without making any displayed ion become neutral or reach a different outlet.

**Recommended split.** Select a declared atomic feed and one supported channel first, with energy-dependent rate data, thermal neutral velocities, product tracking and neutral acceptance at collectors. Benchmark it against an established MCC implementation. WarpX explicitly supports thermal background sampling, energy-dependent process selection, charge exchange and elastic events; its same-species CX model is not automatically a model for arbitrary cross-species chemistry. [WarpX documentation](https://warpx.readthedocs.io/en/latest/theory/multiphysics/collisions.html).

**Why this option.** A small validated channel adds causal physics without implying a universal chemistry model or recoding all MCC machinery. Keep the present elastic toy closure as an explicitly selected baseline.

**Acceptance gates.** Zero-rate reproduction; analytic survival probability for a prescribed path; charge, element and energy/momentum ledgers; kinetic product distributions; matched independent MCC runs; low/high-energy table boundaries and uncertainty documented. Do not attach empirical labels to assumed cross sections.

## 3. High: distinguish desired bulk fields from a realizable electrode/discharge state

**Verified evidence.** `src/physics.ts:3–6,64–72` prescribes quadratic DC potential and uniform circular RF. `src/magnetic-centrifuge.ts:32–35,64–66,82–99` solves a stronger radial magnetic/current closure and rejects an impossible magnetic boundary, while density/rotation remain imposed and electron inertia remains omitted. `src/failure-catalog.js:41–58` correctly identifies sheath/current and fluctuations as unsolved.

**Root cause, technical.** Electrode voltage, current closure and bulk potential are not interchangeable inputs. The radial equilibrium branch is not an evolving electron/ion discharge. The literature explicitly identifies realizing the required internal fields as a practical condition for rotating separation. [Rotating-separation review](https://arxiv.org/abs/1707.00511).

**Plain meaning.** A slider can impose an excellent separating field even if the proposed electrodes and plasma could not maintain it.

**Recommended split.** Preserve ideal prescribed-field mode. Add a calibrated bulk-profile mode with declared electrical boundaries, then a reduced electron/current/sheath closure for a specific geometry. Introduce measured profile or established-code comparisons before claiming self-consistent apparatus behavior. A turbulence/diffusion sensitivity overlay can be educational if labeled imposed; it cannot be presented as instability prediction.

**Why this option.** A bounded device-specific closure addresses the missing causal relation. Immediately adding full 3D PIC/turbulence would introduce substantial cost and additional validation problems without supplying missing boundaries or data.

**Acceptance gates.** Recover the prescribed limit; current continuity; radial/axial force and electrical-power ledgers; sheath boundary limits; measured/independent bulk-profile agreement; convergence and independent stability assessment appropriate to the chosen closure. A tiny Ampère/algebra residual alone is insufficient.

## 4. High for engineering claims: build a feed-to-product and power contract

**Verified evidence.** `src/centrifuge.ts:40–43` predicts no relaxation time/throughput. `src/centrifuge-diagnostics.ts:11–12,63–79` correctly computes static inventory cuts. `src/physics.ts:198–219,254–262` injects equal finite marker counts and collects at whole ideal surfaces. `src/doublewell-dynamics.ts:240–243,327` uses a finite initial pulse and absorbing outlets. `src/failure-catalog.js:59–70` explicitly withholds complete power and throughput. The current disclaimers are correct.

**Root cause, technical.** Inventory, finite-pulse incidence and steady product flux are different observables. Marker counts require physical feed weights and collector acceptance; field/RF work is not total wall-plug energy. Vacuum-arc centrifugation includes source/flow physics beyond a static radial profile. [Tutorial Sections II C and III J–K](https://stewartzweben.com/Papers/Zweben_PMF.pdf).

**Plain meaning.** “Most heavy ions ended outside” does not tell us grams per hour, actual product purity, or electricity per kilogram.

**Recommended split.** Add a declared pulse mass or continuous feed, species weights/composition, collector apertures/acceptance and residence-time distribution. Plot the same well-defined purity–recovery–throughput tradeoff for cases with a valid extraction model. Add ionization/heating/electrode and loss terms incrementally with explicit boundaries and efficiencies.

**Why this option.** A common observable contract makes mechanisms comparable before adding more mechanisms or photorealistic detail. Applying a nominal density multiplier to counts would manufacture unvalidated throughput.

**Acceptance gates.** Feed = product + remaining inventory + declared loss, by element/charge/energy; steady mass balance for continuous injection; pulse-mass scaling and zero-aperture limits; collector perturbation and resolution studies; independent data before actual device efficiency/cost claims.

## 5. Medium: show the current evidence beside the current observable, preserve historical records

**Verified evidence.** `src/main.js:32–33,392` loads `web-assets/convergence/display.json`; its contents identify modelVersion9/source `7a92e949…`, 48 runs and failure. `index.html:44` explicitly labels it a historical Cartesian baseline, and `src/convergence-evidence.js:5–15` says sliders do not rerun it. The newest v34 numerical successes and domain failures are a distinct study; the older label is honest. `src/limitations-ui.js:24–33` already attaches current assumptions/regime status to the plot output.

**Root cause.** Scientific history and current-result metadata are separate but not unified in an observable-centric evidence view. Users have to infer which proof applies to a selected mechanism, resolution and physical state.

**Plain meaning.** A historical failure table can be mistaken for today's verdict, or today's successful calculation for a qualified performance result.

**Recommended split.** Make a tiny current-result status with selected closure, resolution, physical-domain state and numerical evidence identity; expose detailed studies on demand. Add current v34 evidence as a new keyed record, retaining v9 and the original failures. A model/configuration hash must determine applicability; no global green badge.

**Why this option.** It improves scientific comprehension while respecting minimalism, and avoids either flooding the canvas with audit prose or deleting negative results.

**Acceptance gates.** Tests for stale/other-closure/other-resolution evidence, absent coverage, known failures and replay-only data; no current sliders inherit an archived pass. Keep v4 research playback labeled recorded and separate from separator/Marathon qualification (`src/research-ui.js:16–29`; `index.html:83–84`).

## 6. Medium: add distribution/flow diagnostics before interpreting apparent temperature change as heating

**Verified evidence.** `src/doublewell-dynamics.ts:215–225` fits one species-wide rigid angular speed and subtracts it plus mean axial drift before computing a scalar residual kinetic energy. `src/doublewell-dynamics.ts:259–261` correctly labels this “Survivor residual kinetic temperature.” The local regime analysis subtracts cell/species flow separately (`src/doublewell-regime.ts:81–89`). These are different quantities; surviving populations also change as particles escape.

**Root cause, technical.** A global rigid-flow fit leaves differential rotation, non-rigid mean flow, anisotropy and selection effects inside the residual. A changing survivor scalar is not a unique measure of collisional thermalization.

**Plain meaning.** A plot can look hotter because flow shears or cold particles leave, even without the corresponding local heat input.

**Recommended split.** Keep the existing honest residual. Add cell-resolved mean flow, local temperature tensor, shear energy, per-species distributions and escape-conditioned moments through selectable diagnostics. Distinguish these from the homogeneous 3V research replay. This develops the actual double-well phase-space physics instead of adding decorative plots.

**Why this option.** Local moment/distribution decomposition is a targeted diagnostic addition. Relabeling the existing scalar as thermodynamic temperature or adding a smoothing floor would obscure physical distinctions.

**Acceptance gates.** Analytic rigid rotation and known sheared-flow distributions; zero thermal spread limit; anisotropic tensor rotation; decomposition of total kinetic energy; collision-off escaping-pulse control; joint sampling/cell convergence. Do not substitute sparse local estimates for resolved distributions.

## Things to retain

- Explicit prescribed-field and bounded-equilibrium boundaries, ideal cold-cutoff labeling, fixed-charge restrictions and impossible magnetic-boundary rejection.
- Raw angular momentum including exit flux, separate accumulated collision torque, and absence of torque subtraction/projection as a claimed physical repair.
- Established Nanbu/TA options, keyed Philox provenance and immutable negative studies.
- Static inventory versus recovery distinction and real saved research steps with qualification withheld.
- Existing independent failure estimates as useful quick sensitivities; the requested improvement is causal coupling for selected channels, not removal of honest diagnostics.

## Review limits and decision

No app changes are proposed for immediate automatic merge from this review. I recommend qualifying a restricted collisional domain and adding selected charge-changing/field/source couplings in separately reviewable stages. There is no basis here to declare complete physical fidelity across the sliders, certify device performance, or disqualify every useful ideal orbit/equilibrium result. No browser/GPU/mobile observation was possible or attempted through alternate blocked-origin access.
