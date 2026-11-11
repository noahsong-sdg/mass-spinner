# V29 independent audit: plasma regimes and Section III failure modes

Reviewed 2026-11-08. Production source was read only. This pass found **no new demonstrated production correctness bug** in the assigned regime/diagnostic paths. It does not qualify the complete simulator, the collision solver, or a physical machine. Other V29 agents own those independent checks.

## Evidence and execution boundary

Traced `doublewell-ui.js → validateDoublewell → simulateDoublewell → inspectDoublewellRegime → regimeHistory/regimeSummary → limitations-ui.js`; also traced `failure-catalog.js`, `failure-budgets.ts`, `centrifuge-diagnostics.ts`, `experimental-validation.ts` and `landau-reference.ts` and their relevant tests. Read the tutorial's mechanism and limitation discussion and independently reconstructed screening, coupling, gyro-orbit and Poisson scales.

The bounded copy `/tmp/mass-spinner-regimes-v29` contained only project source, package/lock/typecheck configuration, and four selected test files. `safe-dev` copied this into its own VM volume; installation ran online with `npm ci --ignore-scripts`, all calculations/tests/typechecking offline. No host project code, browser-policy workaround, old campaign rerun, home mount or credentials were used. After test edits the copy was explicitly synced and dependencies reinstalled; guest evidence was exported before replacement. The tested source files are identified by `scientific/physics-audit-v29/regimes/snapshot.sha256`.

Commands in that copied VM:

```text
npx tsx --test tests/adversarial-regimes-v29.test.ts tests/doublewell-regime.test.ts tests/failure-budgets.test.ts tests/failure-catalog.test.ts
npx tsc --noEmit
```

Final result: **13/13 tests passed; typecheck passed**. The three new adversarial tests include 81 density/electron-temperature/B combinations, an API-only dilute-pulse witness, and independent failure-budget limits. A prior failed test falsified my preliminary UI witness; both logs are retained. Full repository build and browser verification are outside this subtask and are not claimed here.

## Verified diagnostic behavior

The screening diagnostic uses electron Debye length, total-ion Wigner–Seitz spacing and pair RMS relative speeds including inter-species drift. Independent SI reconstruction agrees at all 81 sampled combinations: `ni={1e16,1e18,1e20} m−3`, `Te={1,5,30} eV`, `B={.01,.06,.2} T`, with two equal-density singly charged ions at 5 eV. These points pass these particular screened-encounter criteria; the grid is not a whole-machine validation.

The implementation removes each species' bulk velocity before computing unbiased thermal spread. A present species with fewer than four representatives makes the entire occupied cell unresolved; it does not borrow the reference temperature. The initial analytic density-peak bound can fail even when a mean-density estimate passes. Empty cells, zero thermal spread and nonfinite products are not converted into optimistic finite values. Existing targeted tests passed those boundaries.

For the default double-well inputs:

| Independent scale | Value | Interpretation |
|---|---:|---|
| Electron Debye length | 16.623 µm | λDe/a = 8.31e−5 |
| Electrons per Debye sphere | 19,239.8 | Many-particle screening proxy |
| Maximum ion coupling Γ | 4.642e−4 | Small thermal coupling proxy |
| Estimated minimum ln Λ | 12.062 | Supplied operator ln Λ remains the explicit input 10 |
| Maximum Ωion λDe / g | 3.292e−4 | Representative binary encounter is unmagnetized |
| Thermal gyroradius / device radius, 40u / 84u | .1697 / .2459 | Not a strongly small-orbit approximation |
| Gyroperiods over configured run, 40u / 84u | 4.607 / 2.194 | Modest number of gyrations |

The last two observations do **not** invalidate the double-well integrator: it advances full Lorentz orbits rather than a guiding-centre drift law. They would matter if the same settings were interpreted using a guiding-centre approximation. Encounter magnetization is also different from Ω/ν, electron magnetization, equilibrium accessibility and plasma stability. No one of these establishes the others.

The Coulomb-log definition is a conventional representative estimate, not a precise log for every velocity pair. The prescribed log, finite sampling, unremoved velocity shear within a cell, low-relative-speed tails and spatial/particle convergence remain separate assumptions. Electron-only Debye screening is documented; this audit does not replace it with an unjustified universal ion-screening correction. The PlasmaPy official derivation provides the standard impact-parameter comparison and notes the poor accuracy of a small classical logarithm: [Coulomb logarithm](https://docs.plasmapy.org/en/latest/api/plasmapy.formulary.collisions.coulomb.Coulomb_logarithm.html).

## Field-realizability adversary and rejected finding

For the prescribed potential `φ=V[(r/a)^4−κ(r/a)^2]`, cylindrical differentiation gives

```text
∇²φ = 16 V r²/a⁴ − 4κ V/a²
ρ = −ε0 ∇²φ = e(Σ Zi ni − ne)
ne,required(0) = Σ Zi ni − 4 ε0 κ V/(e a²).
```

This is a necessary instantaneous charge requirement if the occupied plasma has only the declared ion species and electrons as volume charge; satisfying it is not sufficient for electron force balance, field penetration, a realizable circuit or stability. The sign follows Poisson's equation, independently documented in [Fitzpatrick, Debye shielding](https://farside.ph.utexas.edu/teaching/plasma/Plasmahtml/node7.html). The finite-difference Cartesian Laplacian of the public `quarticPotential` independently matches the derived axis value.

An API-only case `a=.05 m, V=200 V, κ=2, ni=1e13 m−3, B=.01 T, Ti=5 eV, Te=1 eV, dt=25 ns` passes input validation and the reference screened-encounter criteria (Γ=1.000e−5, lnΛ=17.014, encounter magnetization=.007759), but requires `ne(0)=−2.5369e13 m−3`. A four-step collision-on simulation runs; its overall sampled regime is correctly **unresolved**, not globally validated. Its prescribed-field orbits are still mathematically defined.

**Rejected UI bug:** the actual density slider minimum is `1e16 m−3`. At the smallest UI radius and largest UI V/κ, the axis depletion is only `3.5369e13 m−3`, at most .354% of that minimum density; it never makes the axis electron requirement negative across those UI bounds. My preliminary arithmetic overestimated this depletion by 1000×. The failed first test caught that error before it was promoted to an actionable finding. The preserved `rejected-ui-witness-tests.log` is the counterevidence.

Classification: the API witness illustrates the already disclosed absence of self-consistent electron/field closure. It is **not** a demonstrated UI blocker or a new numerical bug, and does not justify an unsolicited production guard. If a future machine-validity mode is introduced, the right fix is a separate, explicitly scoped Poisson/electron/circuit feasibility gate; silently changing the imposed potential or clipping the electron density would hide the missing physics.

## Section III coverage and practical risk priorities

The tutorial identifies coupled charge-state, neutral/molecular, dust, collision, field, fluctuation, radiation, energy-loss and throughput problems. Its field discussion emphasizes the discharge, conductivity and boundary conditions; its fluctuation discussion treats enhanced mixing as an open transport issue. The current A–K catalog reflects these concerns and consistently marks coupled physics as partial, diagnostic or omitted. [Zweben, Gueroult and Fisch (2018), Sections III A–K](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf).

The following priorities are **future physical-model/validation requirements**, not bugs fixed by this audit:

1. **Field and electron closure.** A requested electrode voltage does not establish a sustainable bulk potential. Keep prescribed-field results labelled and require explicit density/current/sheath/circuit assumptions before claiming an apparatus prediction. Small λDe/a is not a proof that a desired driven radial potential is either achieved or impossible.
2. **Collective fluctuations and turbulent mixing.** No instability eigenmode or fluctuating field is solved. For scale only, the tutorial's empirical Bohm benchmark at default Te/B gives D=5 m²/s. If that value were assumed isotropic and constant, the unbounded 2D RMS over .2 ms would be .06325 m, or 79% of the .08 m source radius. This is a potentially material sensitivity, not a turbulence prediction or an efficiency loss to multiply into collector counts. The independent diffusion budget states this distinction correctly.
3. **Charge-changing, molecular and neutral transport.** Fixed charges plus elastic or Coulomb scattering cannot predict changing charge populations or neutral contamination. Energy-dependent element/charge-specific data and explicit product kinematics/energy ledgers are prerequisites; simply assigning a loss probability does not close the system.
4. **Collision relaxation and source/collector convergence.** Screening proxies do not establish resolved local distributions, correct confinement times, a common rotating equilibrium or converged extraction. The default kinetic grid is already labelled coarse and exploratory. Existing conservative residuals and coarse-cell torque diagnostics are not replacements for joint spatial/particle/timestep/seed convergence.
5. **Electron heating, radiation, wall loss and continuous throughput.** Constant temperatures, finite pulse counts and equilibrium inventories cannot determine a sustainable flow rate or plant power balance. Cross-section/radiation data, source drive, wall boundary areas/acceptance and energy accounting must be justified together.

## Independent budget and provenance checks

`failureBudgets` correctly implements homogeneous optical depths and no-event probabilities, unbounded 2D diffusion RMS, optically thin radiation and supplied sheath heat transmission. All are explicitly independent of separator trajectories. The default CX optical depth is .06, no-event probability exp(−.06), and the default prescribed diffusion RMS is .02828 m. A high-loss test (`n0=1e21 m−3`, cooling coefficient `1e−27 W·m³`) yields a near-zero CX no-event probability and >10 keV radiated energy per initial ion, while still explicitly saying this is **not** an evolved plasma temperature or a coupled trajectory loss. This is the correct interpretation of a sensitivity budget outside its fixed-temperature energy closure, not a reason to clip it.

`centrifugeDiagnostics` integrates number inventory with cylindrical `2r dr` weighting and treats radial cuts as hypothetical inventories rather than recovered streams. The audit found no missing Jacobian in that path.

`validateExperiment` blocks synthetic evidence, missing numerical convergence, identity/settings/unit/coordinate mismatch, extrapolation, calibration leakage and unresolved numerical bounds. Its descriptive consistency score does not claim a p-value or model-scope validation. Evidence authenticity and uncertainty independence still require external review; SHA-shaped metadata and caller-provided convergence assertions do not independently certify a campaign. These limitations are stated in its interpretation contract.

`landau-reference.ts` remains an isotropic, homogeneous, finite-speed candidate with lagged coefficients; it explicitly reports `finiteTimeReferenceAccepted:false` and warns that total energy is not exactly conserved. This pass did not rerun or promote it to an accepted general 3D separator reference.

## Recommended disposition

Retain the scoped limitations and fail-closed unresolved statuses. Do not add a new physical model or alter public equations on the strength of the rejected UI hypothesis. The next credible improvements are independent convergence/benchmark evidence and separately reviewable field, atomic and energy closures. Passing the tests in this report validates the specified diagnostic formulas and honesty boundaries only.
