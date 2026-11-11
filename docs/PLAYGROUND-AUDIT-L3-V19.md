# Level 3 separator playground audit — v19

7 November 2026. Independent read-only application audit. This report does not claim a browser session, GPU rendering check, experimental validation, or a rerun of the historical convergence matrices.

## Findings

### P2 — A displayed orbit operating point has no usable timestep option

**Evidence:** `index.html:21–25` offers B up to 0.25 T, mass down to 20 u, charge up to +3e and only 40/20/10 ns orbit timesteps. `src/main.js:28–38` passes these values directly to `simulate`; `src/physics.ts:160–205` requires `dt × max(ωc, electric rate, RF rate) ≤ 0.03` and at most 100000 steps. In the isolated guest, the otherwise ordinary configuration A=20 u, Z=3, B=0.25 T failed validation for **all three** offered timesteps, with “Timestep must resolve gyrofrequency, RF frequency and electric acceleration.”

**Root cause:** The selectable physical domain and selectable resolution domain were bounded separately. At this point ωc≈3.6182×10⁶ rad/s, so 10 ns is already too coarse. In ordinary terms, the fields can bend an allowed ion faster than the finest available setting can follow.

**Smallest coherent correction:** Cover the declared operating-point domain with an additional sufficiently fine timestep, or state and enforce a narrower operating-point domain. An independent **8 ns** validation probe passes the existing invariant and the unchanged 0.6 ms horizon requires 75000 steps, within the existing budget. Do not weaken the gyro-resolution guard. A 5 ns option alone would exceed the 100000-step budget at the existing horizon.

**Why this choice:** It preserves the demonstrated physical and computational boundaries while making the existing controls mutually usable. A hidden automatic change of physical duration would change the experiment and is unnecessary for the demonstrated case. Add an endpoint regression through the actual control adapter if corrected.

### P2 — Comparison cards hide the independent operating points and qualification boundaries

**Evidence:** `src/main.js:314–329` runs `coreModes` through `config(selected)` and prints result metrics/counts. It does not attach the settings snapshot, per-model assumptions, or the kinetic `modelValidity` status. The centrifuge card alone explicitly adds “Equilibrium, not collection efficiency.” The surrounding text correctly says observables differ and does not rank engineering performance.

**Root cause:** The dispatch is model-specific, but the presentation discards the model-specific inputs. The four B controls are independent: orbit `field`; reduced `parameter-magneticT`; centrifuge `gaussian-field`; kinetic `dw-magneticT`. Changing the visible orbit B therefore leaves several compared models at hidden B values. The hidden kinetic method/resolution also affect its output. The production calculation is behaving as configured; the comparison is missing enough information to interpret it.

**Smallest coherent correction:** Preserve the independent models, but identify each card's actual operating point and short scope/qualification status. Include the actual collision method/resolution and exploratory/unqualified status for kinetic results. Make that settings snapshot available in an export or inspectable details block. Do not silently force incompatible models onto a common configuration or introduce an efficiency ranking.

**Why this choice:** This repairs provenance at the point of comparison while preserving public solver behavior and the valid distinction among equilibrium inventory, kinetic outlet counts and RF heating. This is an observability gap, not evidence that different model observables should numerically agree.

### P2 — Curved-drift plots remain unqualified when the approximation grossly fails

**Evidence:** `src/geometries.ts:48–55` always computes guiding-centre drift and emits rho/R and gyroperiod diagnostics after only basic input validation. The assumptions do correctly require rho≪R and many gyroperiods. However, `src/limitations-ui.js:24–29` returns generic prescribed-field text for this model, rather than a setting-dependent approximation status. A permitted control combination A=200 u, B=0.02 T, transverse energy=30 eV, axial energy=2000 eV, R=0.2 m, L=0.1 m gives **rho/R=2.788046** and **0.0034957 gyroperiods** for A. B is likewise outside the approximation (1.806861 and 0.0053940). Production returns an ordinary drift curve.

**Root cause:** The code reports the approximation diagnostics but does not connect them to prominent scope feedback. A gyration larger than the bend and a flight much shorter than a gyration do not satisfy the averaging used in the displayed equation. Finite output is not a valid drift prediction at that point.

**Smallest coherent correction:** Mark gross violations as outside the guiding-centre approximation at the current settings. If extrapolated curves remain useful for exploration, label them accordingly. The explicit rho/R≥1 or fewer-than-one-period cases already violate necessary stated conditions; flagging those does not require inventing a universal quantitative accuracy threshold. Intermediate cases must not be advertised as validated merely because they escape this gross check.

**Why this choice:** It uses actual model-domain information without adding a speculative scattering or self-field correction. A full-orbit curved-field replacement is a larger scientific task, not a local UI patch.

## Execution-path coverage

The seven `coreModes` in `src/laboratory.js` are exactly II A–D workbenches; II E–K remains reference material. The selector and directory route into `selectMode` → appropriate control adapter → `calculate` → `requestSimulation` → typed browser worker. Obsolete requests terminate their workers and settle rejected promises. There is no dispatch to the offline Julia/PETSc/general-3V solver in this path.

| Workbench | Production computation and observable | Important verified boundary |
|---|---|---|
| Gyro-orbits, II A | `geometry('gyro')`: analytic monoenergetic x/y gyro-orbits, rho, axial flight | Fixed energy, not a thermal population; no collection or purity; plotted time capped explicitly |
| ICR, II A | `simulate`: full test-particle Boris orbits with uniform circular prescribed RF; absorber counts, RF work, impact/transit curves | Zero DC potential; no antenna/plasma dielectric/heating-power closure; not calibrated ICR extraction |
| Curved drift, II B | `geometry('curved')`: curvature + grad-B guiding-centre deflection | Mass-independent drift speed at fixed energies; mass-dependent transit speed; electrons, self-generated E and slit acceptance omitted; setting-dependent scope gap above |
| Centrifuge, II C | `solveEquilibrium`: common-corotation or imposed/coupled magnetic Gaussian closure; local fractions, cylindrical inventories, potential/current/B diagnostics | Static prescribed rotation; Gaussian equal-charge domain enforced; bulk inversion reruns at chosen radial grid; no per-pass recovery |
| Uniform rotating filter, II D | `simulate`: full prescribed quadratic E/uniform B orbits; first absorber counts; cold analytic reference and sampled warm paths | Finite-device collection is separated from infinite cold cutoff; optional cold-neutral elastic scattering, no Coulomb or electron/field closure |
| Double-well landscape, II D | `geometry('doublewell')`: exact single-particle radial Hamiltonian at a fixed canonical momentum | No population, residence-time or purity inference; nonzero-P axis exclusion explicitly labeled view cropping |
| Double-well dynamics, II D | `simulateDoublewell`: equal-weight finite pulse or closed common-Ω benchmark, quartic orbits, local binary Coulomb scattering | Open convergence gates; measured raw cell torque; correlated descriptive outlet counts; no calibrated purity, continuous-feed or electron/discharge solution |

Control-specific tests exercise SI/log density conversion, independent configuration snapshots, source radius ratios, equilibrium initializer constraints, inactive controls, actual worker dispatch, bulk inversion, coupled magnetic boundaries and invalid-setting clearing. Source-driven tests are not browser interaction or rendering tests.

## Physics boundaries retained correctly

The local tutorial extract `assets/tutorial.txt:268–470` describes gyro/ICR, curved drift with opposing electron response, the centrifuge and uniform-field rotation/double-well mechanisms. The production modules implement bounded parts of those mechanisms, not full devices. Curved drift omits precisely the self-generated electric field discussed in II B. II C does not solve a vacuum-arc source, spin-up, axial transport or extracted flowing products. II D does not obtain the bulk field from biased electrodes and an electron/circuit response. These are disclosed limitations rather than newly discovered missing numerical terms.

`equilibriumPresentation` and `centrifugeDiagnostics` distinguish central composition, whole-cylinder composition, local fractions and a hypothetical radial inventory cut. The integration uses cylindrical measure, and the UI explicitly says inventory is not extraction/recovery. No evidence of a present purity-versus-inventory calculation bug was found.

For dynamics, `modelValidity` names the actual cell method, local-regime status, unresolved snapshots and **raw** canonical-momentum residual. It explicitly states that corrected torque bookkeeping does not repair trajectories. The result assumptions distinguish finite pulse from a reservoir, survivor statistics from unconditional distributions, equal-weight binary scattering from a self-consistent plasma, and annular-frame invariants from Cartesian point-pair invariants.

The historical **v10** report remains scientifically limiting: spatial seed confirmation still includes a failing c8 raw-Pθ diagnostic; B outlet/profile/temperature comparisons and substantial unresolved local exposure remain open. The finest timestep diagnostics and some comparisons passing do not pass the whole matrix. Pair energy/momentum conservation and a short-time SI heating-rate check do not establish finite-time transport convergence. The UI retains the failed historical Cartesian table and links the detailed v10 evidence; it does not claim those failures were repaired by the later offline solver work.

Section III has 11 explicit coverage entries. Charge states, neutrals, collisions and field/rotation issues are partial; molecules, charge-changing reactions, grains, fluctuations and radiation remain uncoupled; energy/throughput are diagnostics. The independent failure-budget sliders state that they do **not** change separator trajectories. That separation is honest. This playground cannot currently explore all Section III failures as coupled separator dynamics.

## Verification and snapshot

Application source was copied to **`/tmp/mass-spinner-l3-audit-v19`**, 48.5 MiB, and imported into distinct guest **`safe-dev-abc8bb87bf68a4c7`**. No shared parent's guest or application code was changed. Dependency installation alone used online mode; all tests and probes used offline mode. Initial tests were run before adding the previously omitted `vite.config.mjs` to the audit copy for the final build; physics/UI source bytes are unchanged between those snapshots.

Final bounded-copy manifest: `/tmp/mass-spinner-l3-audit-v19/audit-source-v19.json`, SHA-256 `8d5b1d9b582ea839b630c8d77160d951aa97aa8ec78c1bf809acd052dd461c40`.

Commands executed through `/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-l3-audit-v19 run -- …`:

- `node --import tsx --test tests/ui-contract.test.ts tests/workbenches-ui.test.ts tests/doublewell-ui.test.ts tests/equilibrium-controls.test.ts tests/equilibrium-model.test.ts tests/experience.test.ts tests/focused-diagnostics.test.ts tests/worker.test.ts tests/worker-client.test.ts tests/axisymmetric-integration.test.ts tests/external-orbit-reference.test.ts` — **46 passed, 0 failed**.
- `node --import tsx --test tests/physics.test.ts tests/geometries.test.ts tests/centrifuge.test.ts tests/gaussian-centrifuge.test.ts tests/magnetic-centrifuge.test.ts tests/coulomb-independent.test.ts tests/doublewell-orbits.test.ts tests/doublewell-dynamics.test.ts tests/axisymmetric-collisions.test.ts tests/review-workbenches.test.ts tests/review-stage56.test.ts` — **80 passed, 0 failed**.
- `npm run typecheck` — **passed**.
- `npm run build` — **passed** on the final bounded copy including `vite.config.mjs`; 49 modules transformed and the physics worker emitted. Vite reported the existing >500 kB application-chunk warning. This is a build result, not deployed or browser verification.
- Inline production-validation probes reproduced the three failed offered orbit timesteps, the passing 8 ns alternative, and the curved-drift domain violation above.

Audited source hashes: `src/main.js` `4e0c1c8b36938c977ccbea1ab6e5c05427c2a7469356e949a48692c36aa30b31`; `src/physics.ts` `ae14e254b428efbf9be7a8fa3117ae13a8e7d12b3ca923a920ba098fe79a8d88`; `src/geometries.ts` `f769f55ca9f858a938ecb58b8a3d5d7759e3a7ccdeea21e9b1a216933bb55cbc`; `index.html` `c072dc538d6db56fac692d984d694f2bfd2ed2e5aa47458bc3d0e1a01283425e`.

Browser origin access remains denied by managed policy. No workaround was used; native browser events, deployed controls, layout and GPU appearance remain **unverified in this audit**. Parent is changing the visual playground in parallel, so subsequent source revisions require their own final checks. No P0/P1 implementation defect was established by the checked paths; this does not qualify the unresolved collisional transport physics.
