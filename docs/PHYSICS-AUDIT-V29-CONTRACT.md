# V29 scientific interpretation and interface contract audit

2026-11-08. Independent scope: trace scientific quantities from actual inputs through producers to displayed metrics/curves in all four playgrounds. This is not an independent numerical qualification of every solver, a material calibration, or live browser/GPU verification. Other V29 agents own numerical physics.

## Demonstrated issue and correction

**P2: the primary Marathon neutron outputs described a D–T-only calculation as generic neutron production.**

Path: `fusion-ui.js:update` → `simulateFusionBeam` → `fusionPlaygroundData` → primary readouts/energy-response plots; and `setupTargetLoading.update` → `simulateTargetLoading` → loading curves and integrated budget. The source equation is `rate = current/e × D–T reaction probability`. Loading integrates consumption of target T only; it explicitly excludes D–D reactions. With zero initial T and all sites occupied by D, the loading calculation gives zero modeled neutron rate and total, even at positive incident deuteron flux. That is a valid limit of this model, not a prediction of zero neutron production from every physical reaction channel.

Technical cause: display labels dropped the nuclear-channel qualifier that the source and loading equations require. In plain terms, a result about one reaction looked like a result about all reactions.

The minimal correction labels source production, neutron/J, exposure total, loading rate/total curves, and loading budget/tolerance comparison as **D–T neutrons**. Values, units, physics equations, result keys, export schema, and parameter ranges are unchanged. Adding uncalibrated D–D or D–Li calculations would not repair this communication bug and would introduce unsupported physics. The narrower label correction is therefore the appropriate fix.

Verified red first: four actual-producer/DOM regressions failed on the old generic labels (`red.tap`). After the correction, all four pass and the adjacent loading/UI suite passes, 21/21 total (`green.tap`). The source-control test also checks `Pbeam = I EkeV × 1000` and `RDT = I pDT/e`, beam-off, target-off, invalid-source clearing and valid recovery. The DOM uses actual production HTML, not a handwritten page approximation. Synthetic DOM tests do not establish rendered appearance.

Old → new label mapping:

| Producer / surface | Old | New |
|---|---|---|
| `fusion-playground.ts` primary metric | Neutron production | D–T neutron production |
| Same, energy-response axis | Produced neutrons per accelerator joule | D–T neutrons per accelerator joule |
| `fusion-ui.js` detailed exposure total | Produced neutrons over exposure | D–T neutrons over exposure |
| `target-loading.ts` rate curve | Evolving neutron production | Evolving D–T neutron production |
| Same, total curve | Integrated produced neutrons | Integrated D–T neutrons |
| Same, rate/total axes | Produced neutrons [with/without s⁻¹] | D–T neutrons [with/without s⁻¹] |
| `target-loading-ui.js` budget / tolerance | Integrated neutrons / neutron-total change | Integrated D–T neutrons / D–T neutron-total change |

## Trace and retained limitations

### 01: Mass Spinner

`experience-ui.js:fixedPlay/enter` pins the thermal source, masses/charges, particle count, dt, zero neutral density and seed; field, voltage, temperature and B mass remain editable. `main.js:config` supplies SI values to the orbit worker; `worker.ts` dispatches `simulate`. `main.js:drawResults` uses the returned result and species identities. The collector readouts are A-at-end and B-at-wall; they do not silently assume A is lighter when B mass is moved below 40 u. The ideal cutoff is explicitly cold/infinite-device physics and not the measured finite-device collection fraction.

`main.js:invalidate` aborts pending work, increments revision, clears old results/plots/exports and resets validity. The result completion path checks current identity before publication. Level 03 exposes pointwise Wilson intervals explicitly as sampling uncertainty excluding timestep/model errors. Level 01 intentionally keeps the advanced interval panel out of its minimal surface. Source tracing found no demonstrated units, species-identity or stale-publication bug in this path; no native browser worker was run in this audit.

### 02: Marathon

Primary source, energy scan, thermal observer, loading reference and future blanket are separate computations. The scan recomputes the selected model and includes the actual energy point; Geant4-derived stopping rejects/omits out-of-fit energies rather than pretending the fit applies globally. Energy labels are laboratory D+ energy. Positive accelerator efficiency changes wall-plug accounting; it is not a fusion-gain calibration.

The thermal observer is explicitly frozen-source and constant-heat: `target-exposure.ts` uses the initial beam heat/rate and never takes the evolving loading history as input. Its notes disclose this; the module rejects consumption exceeding available T. The new loading solver does not make thermal damage, isotope retention, target stopping, or a coupled LiT lifetime prediction. Non-fusing replacement probability remains an assumed input. These are material next-stage realism gaps, **not undisclosed bugs corrected by changing a label**.

The future blanket is a separate conditional power-plant reference. It is not neutron multiplication from the compact beam-target source. The primary company material supports treating those as separate architectures. This audit found no path where a blanket amplification is multiplied into compact-source output.

### 03: Models / failure modes

The worker has separate orbit, centrifuge, geometry, transport and double-well-dynamics branches. The mechanism directory distinguishes full orbits, equilibrium closures, reduced diagnostics and unsolved directory entries. `methods.ts` does not advertise every tutorial mechanism as a calibrated standalone machine. `studyConfigurations` rejects a DC-voltage scan in ICR. Model comparison preserves each model's configuration and displays its own validity statement; unlike observables are not converted into a common efficiency ranking.

Centrifuge profiles/radial cuts are static inventories. No relaxation rate, extraction flux or arc-power prediction is claimed. The coupled magnetic closure returns its actual field/generalized potential; existing workbench regression checks that adapter path.

For the collisional double well, the current labels already distinguish raw from torque-subtracted angular momentum:

- `doublewell-dynamics.ts:243–244` plots raw `Pθ including exit flux` separately from `Accumulated collision-cell torque`.
- Metrics at 264–279 include `Max sampled raw Pθ balance residual including exits` and `Pθ residual after measured cell torque` as separate quantities.
- `limitations-ui.js:26` displays the actual **raw** residual and says “Corrected torque bookkeeping does not repair paths.”
- `doublewell-ui.js:52` says spatial/particle convergence is unestablished; `methods.ts` asks users to inspect energy, raw canonical momentum, torque and resolution.

Thus a small torque-subtracted residual or pair-energy error is not currently labeled as proof of physical convergence. The kinetic agent's numerical disagreement remains a real solver-resolution issue; it is not repaired by bookkeeping. This audit has not independently rerun that agent's 200 µs or high-angular-variance witness.

The Section III catalog has eleven entries with explicit partial/omitted/diagnostic statuses. Failure-budget controls run independent rate/budget estimates; their status explicitly says they do not change separator trajectories. In particular, molecules, charge exchange/recombination, particulate material, fluctuations and radiation are not silently simulated by these sliders. Existing actual-control tests verify changed diagnostics without claiming changed orbits.

### 04: Research replay

`research-ui.js` loads a schema-tagged offline recording packet and scrubs exact saved moments; it does not interpolate moments or launch a solver. The displayed status explicitly says qualification **WITHHELD** and no solver runs while scrubbing. The convergence panel identifies source hash, whole runs, seeds, frozen failed gate and withheld intervals. Its label says changing sliders does not rerun the matrix. Existing workbench checks confirm that the displayed failed evidence matches its compact source summary and keeps missing confidence intervals withheld. Historical research packets were read, not modified.

## Sources and inference boundary

Checked the primary [Zweben, Gueroult & Fisch tutorial, 2018](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf), [Marathon's beam-driven-fusion description](https://www.marathonfusion.com/beam-driven-fusion/), and [Marathon's alchemy/blanket paper](https://www.marathonfusion.com/alchemy.pdf). The tutorial distinguishes mechanisms and the plasma-production/transport limitations that prevent ideal trajectories from establishing practical separation performance. The company source describes accelerated deuterons and a solid LiT target; the blanket paper concerns a separate neutron-driven transmutation concept. None of these sources calibrates the current playground's retention probability or validates its finite-dose target model. The relevance of omitted channels in the deuterated limit is a scope inference; this patch makes no quantitative claim about those channels' rates.

## Execution evidence and exact snapshot

Owned bounded stage: `/tmp/mass-spinner-physics-contract-v29`; own guest `safe-dev-7ab59b3093081d41`. Copied source, selected tests and two compact evidence JSON files only, ~1 MiB. No host mounts or browser requests. Dependency install online only via `npm ci --ignore-scripts`; all tests/typecheck offline. Red work exported before replacing guest source; green work exported to `/tmp/mass-spinner-physics-contract-v29-green-export` and reviewed artifacts copied back.

Commands executed in that guest:

```
npm ci --ignore-scripts
./node_modules/.bin/tsx --test tests/adversarial-contract-v29.test.ts
# red: 0 passed, 4 failed, expected old-label failures
# explicit sync --replace-guest, then npm ci --ignore-scripts --offline
./node_modules/.bin/tsx --test tests/adversarial-contract-v29.test.ts tests/workbenches-ui.test.ts tests/target-loading.test.ts
# green: 21 passed, 0 failed
./node_modules/.bin/tsc --noEmit
# exit 0
```

Exact tested sources and selected inputs: `scientific/physics-audit-v29/contract/tested-source.sha256`. Parent owns final integrated full-suite/build verification; this bounded stage does not contain all build assets. Subsequent concurrent numerical edits must be checked against this manifest and requalified at the integrated gate. No deployed UI, mobile layout, GPU, Blender model or browser appearance is claimed verified here.

Changed production SHA-256, red → green:

| File | Red | Green |
|---|---|---|
| fusion-playground.ts | 29d8e6e1e0a01e8c0738191771da19829fcabab3e0b9cfd323ef95d64bc53c6f | f3b4ceff8f5339c11b1fa43a52b11c16b571a1966dcd3cfd313cf45d751af918 |
| fusion-ui.js | 2cca718113f476c44f6de63f533874186b2c84084a6236bea01d28d025173e9b | 6119dac78e1c7fdf80eb6ceb3b23fa1353af76c654a7af194b8420e8e9c89636 |
| target-loading.ts | 32c3947489786c9013091602ce25636442133a2251c8694ab41b81133e30bf62 | c09306d02bc152755a9e86a9c464b2dcc8d34450156a4afb5f8646e77cb4fcd1 |
| target-loading-ui.js | 940d98737b50b0abf739ea979d286a726d85075b93e81f0a563131ce76f80a6c | a4a5af08df00bc2d6241ddc129abf2acd743f15e40dcc40d15c9053d54b7e68d |
