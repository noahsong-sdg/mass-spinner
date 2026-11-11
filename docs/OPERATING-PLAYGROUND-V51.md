# Stateful centrifuge playground

Implemented 2026-11-09. This extends the existing reduced rotating-gas model; it does not establish a calibrated Marathon machine.

## 1. Operate one experiment over time

**Problem.** Current changes previously requested a replacement trajectory from rest while retaining the old display time. Cutting current therefore displayed a different experiment rather than coastdown.

**Technical cause.** `fuel-centrifuge-ui.js → worker.ts → simulateFuelTransport` passed configuration alone. The existing coupled stepper already evolved species inventories and both angular momenta, but the UI had no intervention history or continuation state.

**Simple explanation.** A knob asked what would have happened from the beginning; it could not change what happened next.

**Fix.** `fuel-operation.ts` schedules current steps, lands integration steps on events, and resumes from the accepted state at the cursor. Inventories, angular momenta, phases and accumulated energy/impulse ledgers survive. A past edit branches there and removes later interventions. Rewind retains history; New run explicitly starts from rest. Setup changes start a new experiment. A current edit at the endpoint extends the horizon, up to the existing 60-second run limit.

**Why this choice.** It reuses the existing conservative coupled solver and worker, rather than creating a second mechanics implementation or replaying from rest on a changed timestep grid. Immutable setup and history-prefix checks prevent joining incompatible experiments. Only discharge current is an intervention: changing B would also require induced-field and coil-energy accounting.

Obsolete worker replies cannot replace a newer accepted history. Existing setup links remain compatible; setup links do not encode intervention histories. JSON exports retain the accepted result and operating history.

## 2. Read the accepted physical state

**Problem.** Dense averaged tracer rings obscured small changes in the gas, and a horizontal default camera used little phone height.

**Technical cause.** Fast rotation intentionally used azimuthally averaged rings. Those rings were visually dense, and the initial camera had one composition for all aspect ratios.

**Simple explanation.** The machine was detailed, but its changing contents were difficult to see.

**Fix.** A default longitudinal diagnostic section uses the accepted equal-volume species cells, with an independently movable radial section. The axial extension is explicitly uniform because the model is radial. Enrichment uses a fixed, labeled ±0.01 light-fraction color range. Exact probes and plots remain unclipped. Density integrates to the original inventory even when temperature changes. Tracers remain optional.

Live verification of the first build showed that ±0.1 produced an almost gray default lithium case. The default estimated enrichment is only a few thousandths of number fraction. The final ±0.01 key makes that signal readable without changing it or rescaling each frame; zero change remains gray. The layer is a numerical diagnostic, not predicted optical emission.

The portrait camera fits projected SI geometry and uses an oblique view. Automatic aspect-ratio recomposition applies only before the user takes ownership of the camera. Explicit orbit/focus/zoom survives resizing. A regression found and fixed a target-subtraction ordering error that otherwise changed relative zoom on resize round trips.

**Why this choice.** It exposes computed state without invented flows, arbitrary independent rotation speeds, extra particle counts, or automatic color normalization that would hide comparison magnitudes.

## 3. Couple gas and liner temperature

**Problem.** The existing model held gas temperature fixed while reporting mechanical heat and cooling requirements. Temperature could not compete dynamically with centrifugal separation.

**Technical cause.** Temperature was an input to transport rather than an evolved energy reservoir.

**Simple explanation.** The simulator could estimate heating, but the gas could not warm up.

**Fix.** An optional atomic-gas thermal model evolves neutral-gas and liner temperatures simultaneously with mechanics and radial transport. The implicit endpoint solve accounts for signed inertia redistribution work, slip, resistive heating, drag and prescribed cooling. Inventory is fixed; mean pressure follows `p = p0 T/T0`.

With `Cg = 3 N kB / 2`, the discrete ledgers are:

```
ΔK  = Wdrive − Qslip − Qdrag − Wredistribution − Dnumerical
ΔUg = Qslip + Wredistribution + Wohmic − Qgas→wall
ΔUw = Qdrag + Qgas→wall − Qcooling
Δ(K + Ug + Uw) = Wdrive + Wohmic − Qcooling − Dnumerical
```

Redistribution work can be negative during inward relaxation. Numerical mechanical loss is separately reported and never deposited as heat. Gas/liner exchange and coolant exchange use algebraically stable forms at high conductance. Positive-temperature and total-energy checks reject invalid results.

**Why this choice.** A coupled implicit solve handles stiff exchange without a decorative temperature proxy or a split heating update that changes particle inventory. It preserves the existing isothermal mode and can be checked against analytic exchange/cooldown limits and a separately written direct-flux RK4 system.

**Limits.** This is a neutral-only, monatomic, two-reservoir closure. Ohmic/slip deposition into the gas is assumed. Ion/electron energy, ionization, internal molecular modes, and temperature-dependent conductivity, friction and diffusivity are not solved. Molecular D₂ cannot enable this closure. Liner heat capacity and conductances are prescribed, uncalibrated inputs. Initial/reference lithium vapor and pumping outputs remain identified as references; they are not an evolving flowing-gas or deposition solution.

## 4. Compact component instruments and comparisons

**Problem.** Construction prose preceded useful controls, and two nearly identical assemblies made small A/B differences difficult to judge.

**Technical cause.** Generic and centrifuge inspectors rendered all provenance inline. Comparisons rendered two complete scenes without a compact numerical difference.

**Simple explanation.** Finding a knob took too much reading, and spotting small changes required guessing.

**Fix.** Component controls, one accepted-state response and Plot response appear before collapsed Materials & model details. The existing comparison tools show B−A inner-purity difference in percentage points and neutral wall-speed difference at the shared physical time. Purity differences are withheld for incompatible species/cuts, and stale pending results do not acquire a valid difference.

**Why this choice.** It improves existing rails and comparisons without introducing more persistent windows, extra model state or duplicate controls.

## Verification and scope

All project execution occurs in the offline safe-dev working copy `/work/home/fix-v43-source`, owned by the existing `/private/tmp/mass-spinner-marathon-v35-final` VM. Reviewed transfers verify every source digest before and after commands. Deployment transfers only the checked release to the separate existing deployment VM; credentials remain there.

The independent physics agent wrote and reviewed 15 tests, including:

- Direct-face-flux RK4 equilibrium/transport/rotor/thermal comparison, with converged RK4 reference and production timestep refinement. Combined errors at 64/128/256 steps were approximately 0.01468 / 0.007569 / 0.003844, consistent with the production method's first-order convergence.
- Analytic wall cooldown and isolated two-reservoir exchange; fixed-current compatibility; impulse timing and exact fixed-inertia superposition.
- First-law accounting at stored and interpolated times; signed redistribution during power-up/coastdown; maximum-UI-conductance stability; strong-cooling approach to isothermal transport.
- Exact accepted-cursor continuation, immutable setup and baseline current, semantic event-prefix equivalence, molecular exclusion, and future-event nonrelativistic speed protection.
- Shared rotation-clock sampling limits based on the accepted trajectory, including current events.

Other regressions cover actual UI interventions, branching, horizon extension, stale replies, invalid thermal edits, legacy/new share links, actual worker messages, conservative gas-field reconstruction, fixed color scales, component response/details, comparison differences, and portrait-camera ownership.

Conservation and numerical agreement qualify the implemented reduced equations in the tested cases. They do not prove arbitrary slider settings are resolved or validate constitutive assumptions against a device. Closed-wall inventory cuts are not extraction streams. Independent-species diffusion is not a complete multicomponent flowing-mixture closure.

Release receipts, exact command logs and deployment evidence are retained in `scientific/centrifuge-v44/operate51c/`. Live browser observations and captures are recorded below after final publication.

## Final checked release

Source manifest: 545 inputs, SHA256 `94694a8a13301280829265a02f6c54ec71b421c67a0b0e6ae44e1d6eef382d36`.

Release: 151 files, manifest SHA256 `4e9480504e1ea63ac61154e525401e856e945bf0ce35a17ac9f56e5651940a8a`.

| Exact check in safe-dev | Result |
| --- | --- |
| `npm test` | 1,068 passed; no failures or skips |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run check:site` | Passed |
| `npm run check:assets` | Passed |
| `node --import tsx scientific/fixes-v43/verify-release-worker.mjs` | Passed |
| `node --import tsx scripts/verify-fuel-release-v44.mjs` | Passed: 144 centrifuge/transport cases, 20 operation cases, 49 map cells, invalid domain/protocol rejected, source digests verified |
| `python3 docs/reviews/v42-collision-data-probe.py` | Passed; retained collision evidence integrity only, not a new collision-transport qualification |

Cloudflare confirms version `365dfff3-d255-46c0-9f5e-a3b94304b7f4` serves 100% of traffic. Native Brave reopened the site and read `/assets/index-gcC32vv7.js`, matching the checked release. The immutable pre-browser build/provider receipts correctly retain `browserVerified: false`; the separate browser record supplies the later observational evidence.

## Live browser observations

Used the supported native Brave connection, with actual GPU output, on the deployed site. No browser-policy bypass or alternate headless browser was used.

- Default longitudinal field and explicit fixed ±0.01 color key render. Selecting number density changes the displayed layer; no hardware occlusion defect was found.
- Cutting current at 0.4 s preserves neutral wall speed around 699.6 m/s. At 0.8 s, it coasts to 329.9 m/s. Restoring power preserves that state and records the next event.
- Enabling thermal evolution starts a new experiment. At 1 s, the default 1 W/K liner cooling case gives gas temperature 953.2 K. Changing cooling to 0.1 W/K gives 995.4 K and mean pressure 19.91 Pa. The plot and timeline readouts agree.
- A pinned continuously driven run compared with a cut-power branch at matched time 0.9 s shows B−A inner light fraction −0.122 percentage points and neutral wall speed −668 m/s. Shared cameras and fixed enrichment scales remain synchronized.
- Clicking a rendered copper solenoid turn opens its field control and collapsed Materials & model details. Clicking the gas diagnostic opens the current radial profile. Selecting Annular current drive exposes the exact current control, power action and accepted speed/current response before construction details.
- The 390×844 viewport uses the portrait composition. At 320×740, the Controls sheet is 300 pixels wide inside a 320-pixel document, with no horizontal document overflow. Temporary viewport overrides were reset.
- The shared compact inspector was also checked in Intro and Models. This was a targeted adjacent-path check, not an exhaustive retest of every older model or mechanism.
- Final captured browser warning/error log is empty. This is an observed log result, not a guarantee of error-free operation on every device.

Browser evidence: `scientific/centrifuge-v44/operate51c/browser/verification.json`, with desktop enrichment, coastdown, thermal, component, A/B and mobile JPEG captures alongside it.
