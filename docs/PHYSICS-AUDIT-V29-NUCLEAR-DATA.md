# V29 independent nuclear-data and source audit

Status: source/data audit complete; final executed snapshot and counts below. This is not experimental qualification, a Marathon digital twin, or a full Geant4 transport benchmark. Solver equations were independently assigned to another reviewer; this reviewer additionally checked the authorized fusion-only survivor fix.

## Findings

### P2: DT-only calculations carried unqualified neutron-production labels

Execution path: `fusion-playground.ts:21` displayed `simulateFusionBeam().neutronRateS`; `target-loading.ts:146–147` displayed its exclusively D–T reaction ledger. With zero T and entirely D-occupied sites, the loading engine returns exactly zero neutron production. That is correct **D–T** accounting, not a complete irradiated-target neutron prediction. The assumption at the end of the loading result already explicitly excludes D–D. This is an output-contract gap, not an undisclosed solver bug.

Physics: retained D admits D(d,n)³He and D(d,p)T; Li is also not exclusively a stopping medium. Primary experimental work lists exothermic neutron-producing D–Li channels and measures several channels over 0.3–2.2 MeV, overlapping the upper interactive energy range. No cross-section magnitude, source fraction, or residual dose is inferred here. [ASCOT Bosch–Hale reaction/source implementation](https://raw.githubusercontent.com/ascot4fusion/ascot5/main/src/boschhale.c), [Bikchurina et al., 2026, reactions and experimental scope](https://link.springer.com/article/10.1134/S1063780X25604286).

Practical effect: a user exploring isotope replacement can mistake vanishing D–T yield for vanishing total neutrons/heat. Minimal fix: qualify prominent metrics and curves as D–T. Contract agent reports those edits complete with its own producer/DOM checks; see `PHYSICS-AUDIT-V29-CONTRACT.md`. Adding D–D or D–Li rates is a separate, larger model requiring isotope composition, energy-dependent partial cross sections, product energies, target-depth coupling and independently checked units/data ranges. A guessed constant residual yield would be less defensible than explicit scope.

### P3: decay explorer did not identify its mixed nuclear-data basis

Original code: `blanket-reference.ts:9–12` used Hg-197 64.14 h, Au-195 186.10 d, Hg-197m 23.8 h and IT branch 0.947. The first two agree with the alchemy paper, while the isomer branch agrees with newer measurements. There was no declared dataset identity in the live explorer.

This is **not** a simple old-page/new-page contest. Official NNDC currently serves the 2005 ENSDF evaluation, literature cutoff January 2002, retaining Hg-197 64.14(5) h and the older 91.4(7)% isomer branch. NUBASE2012 explicitly identifies the 1966 64.14(5) h result as conflicting (Birge ratio 9.3), adopting Lindenberg's 2001 64.94(7) h. A 2020 direct study found 64.81(24) h and IT 94.68(9)%. NUBASE2020 evaluates 64.93(7) h, 23.82(4) h and IT 94.68(9)%; Au-195 is 186.01(6) d. DDEP was searched but no separate Hg-197 evaluation was verified. [ENSDF dataset and metadata](https://www.nndc.bnl.gov/nudat3/getdecaydataset.jsp?dsid=197hg+it+decay+%2823.8+h%29&nucleus=197HG), [NUBASE2012, p.1258](https://www-nds.iaea.org/amdc/nubase/Nubase2012-v3.pdf#page=102), [2020 direct-study author manuscript](https://www.osti.gov/servlets/purl/1607861), [NUBASE2020 evaluated table](https://www-nds.iaea.org/amdc/ame2020/nubase_4.mas20.txt).

Independent pure-ground-state batch sensitivity:

| Time | Au fraction, code | Au fraction, NUBASE2020 | Difference, percentage points | Remaining Hg relative difference |
|---:|---:|---:|---:|---:|
| 64.14 h | 50.0000% | 49.5765% | +0.42346 | −0.8398% |
| 100 h | 66.0635% | 65.6143% | +0.44916 | −1.3062% |
| 336 h | 97.3512% | 97.2316% | +0.11964 | −4.3217% |
| 500 h | 99.5499% | 99.5193% | +0.03059 | −6.3628% |

At 100 h the NUBASE ±0.07 h half-life interval maps to Au fractions 65.5748–65.6539%, smaller than the evaluation discrepancy. These are parameter-sensitivity calculations, not a fitted uncertainty model or prediction of purity/activity release. The small Au-195 difference was identified but does not justify changing the frozen paper replay.

Authorized fix: comments in `blanket-reference.ts:9–12` and one paragraph with primary links inside the existing **closed Model info** at `blanket-ui.js:53–54`. Constants, decay equations and published TBR/yield remain unchanged. In simple terms, the simulator now says which historical numbers it uses. This is the smallest coherent fix: replacing constants silently would break reference identity; new settings or default-view explanation would add unnecessary interface surface.

### P3: independent confirmation of the fusion-only survivor cancellation fix

Original `target-loading.ts`, eta=0 path, reconstructed remaining T as initial T minus cumulative fused T. At unit initial occupancy and one target-inventory dose, extremely opaque targets can have a tiny remaining T fraction while still retaining optical depth ln(2). Subtraction erased or corrupted that small survivor. Put simply, subtracting two rounded numbers near one cannot recover a tiny remainder.

The independently reviewed fix evaluates the exact survivor optical depth in log coordinates when the fused fraction exceeds half the initial T. For initial occupancy f₀, incident dose u and unit-loading optical depth τ,

`log Y = τ(f₀ − u) + log(1 − exp(−τ f₀))`, `remaining optical depth = log(1 + exp(log Y))`.

The subtraction occurs before multiplication by τ; stable softplus/expm1 branches preserve the near-crossover remainder. The existing fused and transmitted event ledgers remain unchanged. Thin/minority-loss cases keep their well-conditioned original path. This is preferable to clipping, an artificial neutron-rate floor, or numerical integration of an already analytic limit.

Independent witnesses use τ=10¹⁶ and 10²⁰, f₀=u=1, expecting remaining optical depth ln(2) and final D–T rate 0.5 times particle rate; plus floating-point neighbors around u=1 and ordinary τ=10⁻⁵, 0.1, 1, 10 cases. Both new survivor tests fail on the old kernel; final results are recorded below. These opaque values are API stress cases, not reachable physical Marathon operating points.

### P3: plot-grid endpoint arithmetic can change the requested final dose

Independent follow-up of the survivor repair exposed a second failure: `dose*i/intervals` at the last analytic sample can round away from the requested `dose`. The coupled loop constructed its last target the same way. At τ=10¹⁶, f₀=1, dose=`1−Number.EPSILON/2`, 10 intervals, requested exposure is 0.9999999999999999 s but final time was 0.9999999999999998 s. Remaining optical depth was 2.3235085336 instead of 1.3950150270; rate was 0.9020706064 instead of the exact requested-dose result. This is a one-ULP dose change amplified by an intentionally extreme optical-depth sensitivity, not failure of the new survivor equation. Ordinary thin cases agreed to machine precision.

Solver owner implemented the minimal fix: use exact `dose` for the last target/sample in both loops; leave all interior samples and physics unchanged. In simple terms, the final plot point must describe the requested experiment endpoint. Loosening rate tolerances would hide the defect; replacing the two endpoint expressions preserves the input contract. Independent strict neighbor-dose tests now pass.

## Source checks without demonstrated kernel errors

- **D–T fit and energy frame:** `dtCrossSectionM2` uses the Bosch–Hale low-energy coefficients with CM energy, millibarn-to-m² factor 10⁻³¹, and rejects outside 0.5–550 keV CM. The cold stationary target conversion 3/5 is explicitly an integer-mass approximation. No Maxwellian reactivity was substituted for a beam cross section. Checked the [official ASCOT implementation](https://raw.githubusercontent.com/ascot4fusion/ascot5/main/src/boschhale.c). The [original Bosch–Hale paper](https://doi.org/10.1088/0029-5515/32/4/I07) was requested but robots-denied; full original-paper reading is not claimed.
- **Particle/current and energy accounting:** D⁺ rate is I/e, beam power I×voltage-equivalent, nuclear power counts Q only. Independent angular two-body quadrature at 100 keV gives mean neutron 14136 keV and alpha 3564 keV under the declared integer-mass, nonrelativistic, isotropic-CM approximation. Their sum is Q+incident energy. Production separates neutron power, escaping alpha power, layer heat and transmitted beam energy. Conditional substrate heat is not net electric output.
- **Stopping:** atomic electronic coefficients, G4float rounding, low-energy continuation, all 104 mean nuclear table entries/interpolation and isotope scaling agree with pinned Geant4 v11.4.0 source. `eV/(10¹⁵ atoms/cm²)` to `keV m²/atom` is 10⁻²²; Li+T is per nominal formula unit. [Pinned Bragg source](https://raw.githubusercontent.com/Geant4/geant4/b4a16de652ec244f7a0ecc0a5cacfee21930bf75/source/processes/electromagnetic/standard/src/G4BraggModel.cc), [pinned nuclear source](https://raw.githubusercontent.com/Geant4/geant4/b4a16de652ec244f7a0ecc0a5cacfee21930bf75/source/processes/electromagnetic/standard/src/G4ICRU49NuclearStoppingModel.cc), [official physics manual](https://geant4.web.cern.ch/documentation/pipelines/master/prm_html/PhysicsReferenceManual/electromagnetic/charged_hadron_incident/hion.html). This is deliberately not the complete toolkit's material/table selection or transport.
- **Hardware identity:** the published compact architecture supports RF ionization, electrostatic D⁺ acceleration, solid LiT and a cooled substrate. The public page does not establish the simulated operating point, dimensions, all engineering materials or measured retention. The UI/component catalogue preserves that distinction. [Marathon compact architecture](https://www.marathonfusion.com/beam-driven-fusion/).
- **Blanket identity:** the alchemy work concerns a separate fusion-power-plant neutron blanket, not gold production by the compact LiT beamline. Checked representative 1500 MWth, 210 mm channel, 85 at% Hg, 90% enrichments, transport/depletion outputs, layer materials, and repeated gold removal/replacement. These are frozen references, not recomputed slider results. [Marathon alchemy paper, §§4.1–4.1.1](https://www.marathonfusion.com/alchemy.pdf#page=12).

## Declared limitations that remain important

Atomic Bragg stopping is not measured compound LiT stopping. Isotope mass numbers, no charge-state evolution, no straggling and a fixed stopping matrix during D/T/vacancy evolution remain approximations. Existing RustBCA evidence is a whole-half-space stopping calculation, **not** a finite-film retention calibration (`scientific/stopping-reference-v23/results/reference-compact.json:216`). Replacement probability is assumed. Surface renewal, diffusion, sputtering, D–D/D–Li reaction networks and thermal feedback are not solved. None was relabeled a hidden numerical bug.

Neutron rays are symbolic directions; neither differential nuclear cross sections nor transport are sampled. Independent mean-energy checks do not validate a detector flux, spectrum, damage rate, radiological dose or shielding. TBR requires transport and the fuel cycle; fuel recycling alone does not create replacement T. Hg chemistry/engineering, extraction, impurities and economic revenue cannot be inferred from normalized decay curves. These boundaries are correctly disclosed and do not become validated merely because tests pass.

## Execution and evidence

All project execution used my bounded copied Apple safe-dev guest `safe-dev-6a4f2f5285581c74`, stage `/tmp/mass-spinner-audit29-nuclear`. Only `src` (~600 KB), package/lock, tsconfig and this reviewer's tests were copied; no home, credentials or control sockets. Network was enabled only for locked dependency installation and explicit primary-source downloads. Empty guest evidence directories required `mkdir`; the initial logging/download attempt failed before tests and was rerun, not counted as a physics result.

Original snapshot: six independent source/physics witnesses passed. New provenance DOM test and survivor witnesses: red snapshot **7 passed, 2 failed** (both cancellation checks), as expected. Original and red evidence are retained in `scientific/physics-audit-v29/nuclear-data/`. `primary-source-manifest.json` records exact downloaded Geant4/ASCOT hashes. Direct NUBASE download returned 403; its table was successfully opened through the web tool. OSTI full PDF returned 502 while indexed primary excerpts were available; those access limits are preserved.

Intermediate survivor-only gate: **8 passed, 1 failed**; the failure was the newly identified endpoint arithmetic above. Final explicitly synchronized gate: **9 passed, 0 failed, 0 skipped**, 1.00049 s reported test duration. Both `npm run typecheck` and `node --check src/blanket-ui.js` passed. These bounded checks do not include the whole-application build or live GPU/browser acceptance; those remain parent integration gates.

Exact final identities:

- Loading kernel, including both fixes and contract labels: `4dd86b27ec8e14dccd540206c43532ccab590a2a859e52d2eb9014c079915de4`.
- Blanket data source: `a86576ad40687d0ca54a53859b7f5567ecedacb0f73d8bd7bacaf9591beaa467`.
- Blanket UI: `a40e291227eeb66e92192a2d459a1806484bd0bba3ec58ab53105246e8d20280`.
- Independent test: `165ebecfbdc0fc6c3bf459d84f5023151e47f0d4431da18064dbc276e828acbc`.

All copied source/lock/test identities are in `scientific/physics-audit-v29/nuclear-data/final/snapshot-sha256.json`. Final reviewed export: `/tmp/mass-spinner-audit29-nuclear-final-export`. No jobs remain active in this guest; no guest-only scientific work is unexported.

Reproduction after syncing a reviewed bounded stage:

```
safe-dev -C /tmp/mass-spinner-audit29-nuclear init
safe-dev -C /tmp/mass-spinner-audit29-nuclear run --online -- npm ci --ignore-scripts
safe-dev -C /tmp/mass-spinner-audit29-nuclear run -- ./node_modules/.bin/tsx --test tests/adversarial-nuclear-v29.test.ts
safe-dev -C /tmp/mass-spinner-audit29-nuclear run -- npm run typecheck
safe-dev -C /tmp/mass-spinner-audit29-nuclear run -- node --check src/blanket-ui.js
```

For numeric evidence, create an output directory inside the guest and supply `AUDIT29_EVIDENCE` to the test command. Existing guest source is a copy: after host edits, export valuable work and run `sync --replace-guest`, then reinstall dependencies before testing. No earlier study was edited.
