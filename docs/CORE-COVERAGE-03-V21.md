# Playground 03: independent core-coverage audit

Audit date: 2026-11-07. Scope remains **Section II A–D** numerical playgrounds, plus explicit Section III limitations and independent sensitivity estimates. II E–K remain an illustrated reference atlas. A mechanism mentioned in a reference is not a validated simulation.

## Evidence and execution path

Read the author-hosted original [Zweben, Gueroult & Fisch, *Plasma mass separation*, Physics of Plasmas 25, 090901 (2018)](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf): II A pp.4–5, II B pp.5–6, II C pp.6–7, II D p.7, III A–K pp.10–16. The related [Gueroult et al. rotating-plasma review](https://w3.pppl.gov/~fisch/fischpapers/2018/accepted.gueroult.ppcf18.pdf) independently distinguishes equilibrium/transport separation from single-ion confinement and identifies field realization as an engineering gate.

Source trace: `index.html` → `main.js` configuration/mode selection → `physics.ts`, `centrifuge.ts` / Gaussian closures, `geometries.ts`, or `doublewell-dynamics.ts` → `ensemble.ts`, `focused-diagnostics.js`, live SVG plots. `limitations-ui.js` separately renders `failure-catalog.js` and `failure-budgets.ts`. Those budgets do not feed separator dynamics.

The audit checks source behavior and equations. It does **not** establish deployed browser behavior, a calibrated separator, or convergence of the experimental collision model. No denied browser origin, alternate browser, indirect page fetch or local rendering was used.

## Existing numerical coverage and remaining physical boundary

| Model | Actual controls and displayed output | Main remaining boundary |
|---|---|---|
| II A gyro-orbit | Shared mass/charge; `parameter-magneticT`, `parameter-temperatureEV`; exact monoenergetic transverse circles, gyrofrequency and radius | This view has no sampled thermal/pitch distribution or collector/source acceptance. |
| II A ICR | `rf-frequency`, amplitude, handedness, tune-to-A, B, source distribution/beam; full orbits, arrival/energy distributions, RF work/injected ion and pulse destinations | Uniform prescribed RF is not calculated antenna power, dielectric coupling or a modeled biased baffle. No Coulomb resonance broadening. |
| II B curved guide | Fixed perpendicular/parallel energies, B, bend length and curvature radius; guiding-centre deflection, drift speed, ρ/R and transit gyroperiod count | No electron polarization, conductor short circuit, collision decorrelation or source slit acceptance. |
| II C equilibrium | Common Ω, Ti/Te, central or bulk composition, radial inventory cut; composition, logarithmic enrichment, densities and cumulative cylindrical inventory | Static equilibrium is not relaxation, driven discharge or extraction. Common-corotation benchmark density increases toward the wall. |
| II C Gaussian closures | Width, axis density, field, axis/wall boundary; lab φ, E, Jθ, ion/electron velocity, self-field and electron-inertia diagnostics | Density and ion rotation remain imposed. Coupled radial Ampère/force balance is stronger than imposed B but does not solve source/circuit/sheath/stability. |
| II D rotating filter | B, V, thermal/fixed source, radius, axial energy; cold analytic r(t), growth/branches/wall time plus sampled warm r(z), destination and energy statistics | Cold cutoff alone predicts neither finite-wall interception nor axial extraction. Prescribed bulk potential; no electrode penetration. |
| II D double-well landscape | Quartic amplitude/κ, fixed Pθ slice, B and mass/charge; effective radial energy and minima | An energy landscape is not a density distribution. Plot crop does not change physical domain; nonzero Pθ has an axis barrier. |
| II D double-well kinetics | Pulse or closed common-Ω benchmark, initial rotation, open/closed boundaries, collisions, cells/markers/timestep; evolved radial populations and conservation/torque/local-regime diagnostics | Finite-time spatial/particle convergence remains unestablished. Momentum-conservative velocity scattering can still produce spatial-cell numerical torque. |

## Crucial distinctions to expose beside the render

These are independent deductions from the implemented equations, not literal transcriptions of the tutorial.

1. **Charge and initialization:** `Ωc = qB/m`, so equal m/q gives equal resonance frequency and cold threshold. Equal Lorentz trajectories additionally require equal initial velocities. The same energy assigned to two masses does not give the same velocity. Do not label every equal-m/q run “indistinguishable.”
2. **Bend geometry:** with fixed energies `vd=(2E∥+E⊥)/(qBR)` and `Δy=vd L/v∥`. Equal-charge drift speed is mass-independent at fixed energies. The longer heavy-ion transit gives `Δy ∝ √m`. At fixed bend angle `L/R`, the curvature radius cancels; changing R alone while keeping L fixed changes the angle.
3. **Centrifugal/thermal competition:** for equal fixed charge and common Ti/Ω, `ln[(nB/nA)/(nB0/nA0)] = Δm Ω²r²/(2 e Ti[eV])`. This follows by subtracting the implemented ion Boltzmann exponents. It does not require treating the electron potential as zero. Unequal charges retain that potential contribution.
4. **Finite-device cutoff:** the analytic discriminant is `D=Ωc²−8qV/(ma²)`. `D>0` means bounded cold motion, not guaranteed avoidance of a finite wall. A growing mode also requires sufficient residence time to hit the wall.
5. **Collision role:** equilibration can enable a radial population response while scattering and diffusion can undo collection contrast. “Turn collisions off” is not uniformly an improvement for all mechanisms.

The added `tutorial-insights.ts` and compact native `tutorial-insights-ui.js` put each mode's equation, parameter experiment, actual observable and unsolved boundary in the current workspace. These are contextual simulator information, not ordered lessons. Mode-specific component descriptions distinguish RF launchers from DC solenoids and static inventory cuts from collectors. Materials remain explicitly unspecified/illustrative.

## Section III: coverage is not solved dynamics

| Subsection | Checked implementation | Honest status |
|---|---|---|
| A charge | Fixed positive integer charges affect actual kernels; Gaussian closures require equal charges | Interactive sensitivity; no ionization populations |
| B neutrals | `collisions.ts` elastic cold-bath scattering in rotating/ICR | Partial; no neutral collection contamination or transport |
| C molecules | Fixed artificial m/q only | Reaction chemistry, fragmentation/internal states and negative ions unresolved |
| D charge exchange/recombination | Independent exponential no-event estimate | Diagnostic; no charged/neutral product evolution |
| E droplets/dust/clusters | Reference coverage only | Unresolved bypass mass and charging/evaporation |
| F collisions | Elastic bath or experimental local Coulomb pairs; independent convergence evidence | Partial; ion-electron/inelastic channels and separator convergence open |
| G fields/rotation | Radial magnetic/current/force closure in one equilibrium branch | Partial; electrode penetration, sheath/circuit and transient fields unresolved |
| H fluctuations | Assumed-D spreading estimate; conceptual coverage | No unstable eigenmodes, turbulence spectrum or transport prediction |
| I atomic radiation | Independent optically thin constant-coefficient estimate | Diagnostic; no species-resolved cooling/energy feedback |
| J energy loss | Ion impact/neutral-bath ledger and kinetic H/Pθ boundary flux; independent sheath estimate | Diagnostic; incomplete electron/sheath/electrode/wall power balance |
| K throughput | Pulse destinations, residence and static inventory cuts | Diagnostic; no continuous calibrated source/product mass flow |

Relevant primary-paper anchors: gyroradius Eq.(1), bend scaling Eq.(2), centrifugal profiles Eq.(3), E×B Eq.(4), charge-exchange mean free path Eq.(12), collisional transport Eqs.(13–15), empirical Bohm estimate Eq.(16). Eq.(16) is not a predictive turbulence closure. Rendering all eleven issues as penalties would invent unvalidated coupling.

## Ranked small additions

**Implemented first: Li-6/7 equilibrium entry and contextual observables.** The kernel accepts every finite positive mass; shared advanced HTML inputs incorrectly began at 20 u. In plain terms the controls excluded lithium even though the solver supported it. Parent integration lowers only advanced mass inputs to 1 u and adds an explicitly equilibrium-only preset. Playground 01 retains its bounds and orbit timestep guards remain unchanged. This fixes the interface's species restriction without replacing a correct numerical method or silently altering integration fidelity.

Preset uses integer mass-number approximations 6/7 u, Z=1, Ω=30000 rad/s, Ti=1 eV, Te=5 eV and equal central number fractions, radius 0.48 m. It illustrates a wall relative ratio enhancement near 2.93; this is **not** extracted product enrichment, natural feed composition, lithium atomic-rate modeling or Marathon's device. The narrow regression evaluates actual equilibrium profiles against the analytic equal-charge exponent, tests the bend interpretation against actual reduced output, and retains orbit rejection at 0.25 T/20 ns for Li-6.

**Next: dynamic centrifugal-strength readout.** Show `χ=Δm Ω²a²/(2 e Ti)` and `exp(χ)` explicitly labeled wall-local ratio relative to axis, only for equal-charge equilibrium. The existing enrichment curve already calculates this; surfacing its dimensionless value is smaller and more truthful than adding a second solver. It lets users immediately see why isotope separation requires more rotation or lower Ti than 40/84-u separation. Use log-space if exponent becomes large; never call it per-pass separation or purity.

**Next: ICR resonance scan.** Extend the existing checked orbit study to scan RF frequency and plot RF work/ion plus destination fractions against `ωRF/ΩcA`, with fixed seeds and run-time/timestep limits. This is scientifically more useful than another artistic orbit: users can inspect finite-time selectivity and power/collection tradeoffs. Existing B scans also change gyroradii and confinement; a frequency scan isolates RF detuning more cleanly. Required regression: zero RF gives zero RF work; correct handedness peaks near Ωc; counterrotation does not show the same resonance; time refinement preserves the scan. This remains a prescribed-field response, not a wave-coupling or industrial-throughput calculation.

Do not implement a guessed efficiency curve for curved-guide polarization, field penetration, turbulence, charge-state populations or molecular chemistry. Those require additional declared physics and validation datasets, not just sliders. A future realistic hierarchy should keep these missing couplings visible while retaining a responsive basic playground.

## Validation record

Only owned source/report files were changed by this agent. Narrow checks ran inside isolated `/tmp/mass-spinner-tutorial-insights-v21` Apple safe-dev snapshot: 58 source/config/test files copied before dependency installation. `run --online -- npm ci --ignore-scripts` passed (26 packages, zero reported vulnerabilities); `run -- node --import tsx --test tests/tutorial-insights.test.ts` passed **4/4**, and `run -- npm run typecheck` passed. A final metadata correction changes the reference-atlas target from `method-guide` to `reference-atlas`; parent final snapshot covers it. Parent owns main/index integration, full build/typecheck, asset/render verification and deployment; this report does not promote those pending gates to completed evidence.
