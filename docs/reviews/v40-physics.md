# Physics audit of engineering surfaces

9 November 2026. Independent source review only. No application changes, project execution, new physical campaign, or browser observation in this review.

## Confirmed finding

### P2 — New 3D target ledger loses the D–T-only reaction identity

**Problem.** The 3D ledger displays `neutron rate … s⁻¹ (whole assembly)`, although its scalar is exclusively the D–T reaction rate. It does not carry the omitted D–D branches into its own Model info. This is especially misleading with a D-rich or zero-T target: a displayed generic zero-neutron rate is only a zero D–T prediction.

**Technical cause.** `src/coupled-target.ts:233–236` returns `reactionOutput: DT_ONLY_OUTPUT`. `src/material-realism.ts:35–42` explicitly requires reaction-specific metadata alongside generic neutron scalars. The new adapter at `src/surface-state.ts:232–236` copies `selected.neutronRateS` to an unqualified `neutron-rate` scalar and omits `r.reactionOutput`; the renderer at `src/surface-layer.js:136–138` formats the ID as a generic label and builds its limitations only from `snapshot.unsupported`. Neither path preserves the D–D omission. Existing target plots and metrics use D–T labels, so this is a new presentation regression rather than a missing global solver disclaimer.

**Simple cause.** The new 3D display dropped the reaction name when copying a correct number from the solver.

**Smallest recommended fix.** Preserve the D–T identity in the scalar label/ID and add the existing `DT_ONLY_OUTPUT.limitation` to the surface packet's unsupported scope. Add a regression through the actual surface layer that uses an accepted zero-T/D-rich target history sample, asserts an explicit D–T rate label, and confirms the omitted-reaction caveat remains available in that same inspector.

**Why this choice.** Reusing the solver's existing reaction metadata restores meaning without changing valid numerical behavior. Adding an unsupported D–D rate, declaring all neutrons zero, or relying on a disclaimer in another hidden panel would not fix this boundary correctly.

**Evidence level.** Root independently reproduced this through the production solver and actual surface layer in safe-dev. A D-rich, zero-T target retains D–T/D–D scope in the solver result but loses it in the displayed generic neutron-rate ledger. The combined diagnostic batch reproduced all five asserted defects, exit zero. Witness SHA256: `ab881855e09d831508d8f3d7a2c8e3e7b49df8893b2ee522149cc7bf6efd84d8`. Passing this diagnostic confirms the defect exists; it is not an acceptance pass. The witness imports resolve when copied to `audit-tests/` in the checked VM source.

## Execution paths checked

- Orbit solver → `surfaceState.orbit` → raw tracks/events, original injected denominators and prescribed E/B/potential fields. Numerical impact positions remain distinct from density or local heat flux. ICR explicitly excludes time-dependent RF from the radial field map.
- `solveEquilibrium` → corotating/Gaussian/magnetic-Gaussian closures → `surfaceState.equilibrium`. Corotating densities remain normalized; Gaussian absolute densities use the solved total density times species fraction. Rotating-frame ψ stays distinct from laboratory φ. Equal-Z requirements and bounded magnetic-pressure branch remain in the relevant solvers.
- `simulateDoublewell` → exact annular inventory normalization → `surfaceState.doublewell`. The adapter reproduces the pulse/equilibrium support used for marker weight. Radius-only exit events stay unlocalized and signed Hamiltonian is not relabeled deposited kinetic heat.
- `simulateCoupledTarget` → IMEX update → selected accepted history sample → film/backing thermal cells and film-only occupancy surfaces. Thermal centers, interface, true widths and uniform illuminated-area scope are retained.

No new arithmetic defect was established in those reviewed production paths. This is bounded source review, not a proof over every setting.

## Equations and adjacent invariants

- Coupled isotope update: the same conservative diffusion operator acts on T, D and vacancies. The vacancy release source uses the new T+D values, while the T/D sinks use the same release coefficient. Summing the three implicit equations preserves unit site packing analytically, subject to the solver's declared floating-point admission bound. Replacement and renewal ledgers match the corresponding sources and sinks.
- Interface heat forcing: for a massless face with half-cell resistances RL and RR, the left forcing is `Q RR/(RL+RR)` and right forcing `Q RL/(RL+RR)`. The implemented backing-side contact assignment matches this declared interface approximation. It remains a zero-range absorption approximation, not a backing stopping calculation.
- Product energy allocation uses the explicitly declared mass-number/isotropic-CM approximation. Nuclear Q and incident beam energy are separated in the ledger; the reduced target does not acquire a full transport interpretation from conservation alone.

## Existing scientific blockers verified in retained evidence

The actual public packet `web-assets/convergence/browser-v38.summary.json` reports:

- 66/66 eligible completed runs, including 60 collisional cases;
- 59/60 collisional cases over the unchanged 1% unresolved-exposure budget;
- 28/60 over the unchanged 0.1% raw angular-momentum budget;
- 275 numerical/sensitivity PASS and 265 UNKNOWN decisions;
- qualification `unqualified`, continuum `unknown`.

`src/observable-evidence.ts` classifies the current result from its own histories/raw momentum error, retains sampled-domain precedence and does not import archived qualification. These are existing disclosed limitations, not new v39 algorithm defects. No new convergence computation was run here; the saved public packet was checked directly and its source handling traced.

For Marathon, measured LiT stopping/chemistry, calibrated implantation/retention/release, actual engineering dimensions, 3D beam/thermal transport and D–D competing hazards remain absent or conditional. The existing material and coupled-target modules disclose these limits. The simulator is an illustrative scientific playground, not a calibrated Marathon digital twin. A complete engineering validation claim is not supported by the reviewed evidence.

## Validation limits

This reviewer ran trusted host read operations only; no project code ran on the host or in a new VM. Existing CPU scene tests and offline renders cannot establish browser GPU appearance, deployed mobile behavior, experimental calibration, or continuum collision transport. Browser-origin denial was not bypassed. No acceptance gate, model parameter, scientific artifact or application source was changed.
