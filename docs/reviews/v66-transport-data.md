# v66 neutral transport data assessment

Checked 2026-11-10. This is a source and implementation assessment, not an executed transport-code validation.

## Decision

Use the explicit **neutral Ar–Ar collision-integral table in Mutation++ v1.0.5** for the historical argon comparison, with first-order dilute monatomic Chapman–Enskog viscosity and conductivity. Its tabulation spans 300–20,000 K and therefore covers 8,000–13,000 K without extrapolating its numerical domain. Call the result **neutral-component transport**, not total plasma transport. Keep the existing neutral Li power-law fit only over its published 100–3,000 K range.

This is preferable to assigning a room-temperature Sutherland curve or extending Cantera's GRI Ar model beyond its declared thermodynamic range. It uses an inspectable expert-code database and its existing normalization and interpolation. This choice does not establish that neutrals dominate the experiment, or that first-order Chapman–Enskog is accurate in every simulated cell.

## Exact Ar source and normalization

- [Mutation++ v1.0.5 collision database](https://raw.githubusercontent.com/mutationpp/Mutationpp/v1.0.5/data/transport/collisions.xml), the Ar–Ar pair, explicitly supplies Q11 and Q22. The reference identifier is `Wright2005`, with `accuracy="5"`. The final downloaded raw file places this pair at lines768–777; the web reader's rendered index719–727 recorded in JSON metadata is not a raw-file line index.
- [CollisionIntegral.cpp](https://raw.githubusercontent.com/mutationpp/Mutationpp/v1.0.5/src/transport/CollisionIntegral.cpp), lines 83–104 and 663–730, parses `multpi`, estimated accuracy, and table interpolation. The default is linear interpolation in T and clipping beyond the endpoints.
- [CollisionIntegral.h](https://raw.githubusercontent.com/mutationpp/Mutationpp/v1.0.5/src/transport/CollisionIntegral.h), lines 93–98, converts areas to m² and applies the multiplier. Its accuracy accessor explicitly returns an estimated percentage; **5% is not a one-sigma experimental confidence interval**.
- [CollisionDB.cpp](https://raw.githubusercontent.com/mutationpp/Mutationpp/v1.0.5/src/transport/CollisionDB.cpp), lines 94–97 and 198–200, gives the pure-species viscosity prefactor and Q22 denominator.
- [ThermalConductivityChapmannEnskog.cpp](https://raw.githubusercontent.com/mutationpp/Mutationpp/v1.0.5/src/transport/ThermalConductivityChapmannEnskog.cpp) reduces to the monatomic relation below for a single neutral species. Source headers specify LGPL-3.0-or-later; [COPYING.LESSER](https://raw.githubusercontent.com/mutationpp/Mutationpp/v1.0.5/COPYING.LESSER) and COPYING are supplied by the project.

The accompanying JSON transcribes the source table and provenance. For tabulated value q22(T), in the source's Å² convention **before** its `multpi="yes"` conversion:

```
Q22_SI(T) = π × 10⁻²⁰ × q22(T)             [m²]
μ_n(T)   = (5/16) √(π m k_B T) / Q22_SI(T) [Pa s]
κ_n(T)   = 15 k_B μ_n(T) / (4m)           [W/(m K)]
```

Omitting the π factor overpredicts both coefficients by π. A useful normalization check is μ_Ar(300 K) ≈ 2.27×10⁻⁵ Pa s for m=39.948 u. This is a calculated sanity target, not an independently executed benchmark here.

Use linear interpolation of **q22 versus T**, followed by the formulas, to match this pinned database. Interpolating μ itself is a different algorithm. Reject or visibly mark values outside 300–20,000 K; do not inherit silent clipping as evidence of validity. Nonpositive/nonfinite temperatures are outside the domain. The table's 5% annotation belongs to the collision integral; model-form, interpolation, composition, ionization, and wall-boundary errors are separate.

## What the 2026 centrifuge study actually uses

[Hood-McFadden, Kotla and Underwood, arXiv:2607.28208](https://arxiv.org/pdf/2607.28208), Eqs. 8–9, uses a neutral Lennard–Jones Chapman–Enskog model and κ=15k_Bμ/(4m), citing Neufeld et al. for reduced collision-integral fits. This is a UT Austin centrifuge study, not a Marathon technical paper. The searchable manuscript does not provide the Ar LJ parameters required for an exact independent reproduction.

Using Mutation++ is therefore a defensible alternative constitutive model, **not exact reproduction of that paper's material law**. Report sensitivity to this choice separately from grid convergence and experimental agreement.

## Lithium units and limits

[Bouledroua, J. Plasma Fusion Res. SERIES 7 (2006), 217–219](https://www.jspf.or.jp/JPFRS/PDF/Vol7/jpfr2006_07-217.pdf), abstract and §4, states T=100–3,000 K with viscosity in micropoise and conductivity in 10⁻³ W/(m K). Thus:

```
μ_Li(T) = 3.14×10⁻⁸ T^0.863 Pa s
κ_Li(T) = 1.398×10⁻⁴ T^0.863 W/(m K)
```

The paper calculates dilute ground-state neutral monatomic Li transport from spectroscopic potentials and quantum scattering. Its reported 5.4% difference from another theoretical calculation is not a universal error bar. The fit is not an isotope-resolved Li+/Li mixture law, a guarantee of a stable 100 K Li vapor, or a plasma conductivity. A literal micropoise-to-Pa s conversion is essential: 1 micropoise = 10⁻⁷ Pa s. No extrapolation above 3,000 K is justified by this source.

## Independent references and next validation gates

1. [Sharipov and Benites (2019), low-density ab-initio Ar transport](https://www.sciencedirect.com/science/article/abs/pii/S0378381219302651) covers 20–10,000 K. The [author's institutional publication list](https://fisica.ufpr.br/sharipov/public.html), item 31, links [supplement 1](https://ars.els-cdn.com/content/image/1-s2.0-S0378381219302651-mmc1.xlsx), [supplement 2](https://ars.els-cdn.com/content/image/1-s2.0-S0378381219302651-mmc2.xlsx), and a calculator. Download and parse the tables in the isolated scientific environment, compare pure-Ar μ and κ at their native temperatures, and report discrepancies. These XLSX contents have **not** been inspected or executed in this assessment. This high-quality reference ends at 10,000 K and cannot validate 13,000 K by extrapolation.
2. Independently run the pinned Mutation++ pure-Ar model at all native knots and midpoints to catch normalization/interpolation mistakes. Agreement verifies implementation against the source code; it is not an independent experiment.
3. Run a constitutive sensitivity study over experimental conditions and a 5% collision-integral perturbation. Keep the source accuracy annotation distinct from experimental and closure uncertainty.
4. Assess neutral fraction and electron/ion heat flux before interpreting these coefficients as bulk-plasma values. Local continuum/Knudsen and Maxwellian assumptions must also hold. A coefficient table valid in temperature is not proof that a continuum transport equation applies at the simulated density or wall gradient.

## Why not the other packages as a direct substitution?

| Option | Evidence checked | Appropriate use |
|---|---|---|
| Mutation++ | Explicit Ar–Ar table, transport prefactor, unit parser, interpolation and pure-neutral thermal formula | Best immediate neutral Ar source; later partially ionized multi-species reference with a defined composition/state and vetted collision pairs |
| Cantera v3.1.0 GRI Ar | [Pinned gri30.yaml](https://raw.githubusercontent.com/Cantera/cantera/v3.1.0/data/gri30.yaml): LJ well depth136.5 K, diameter3.33 Å; NASA7 range300–5000 K | Useful lower-temperature cross-code check; computational output above5000 K does not establish high-temperature accuracy |
| MOOSE gas utilities | [Official implementation](https://mooseframework.inl.gov/docs/doxygen/modules/namespaceGasTransportUtils.html) documents Neufeld Ω22 over reduced temperature0.3–100 | Formula reproduction if LJ parameters are independently specified; reduced fit range does not validate the potential at all physical temperatures |
| PlasmaPy Braginskii | [Official module documentation](https://docs.plasmapy.org/en/latest/_modules/plasmapy/formulary/braginskii.html) assumes fully ionized ions/electrons and neglects neutral atoms | Separate charged-species checks in its collisional regime; cannot replace neutral Ar/Li transport in a weakly ionized centrifuge |
| PPFM / HCP | [Vagnoni, Murphy and Ghedini (2026)](https://www.mdpi.com/1099-4300/28/7/830), open cross-code plasma-property study | Promising LTE Ar-plasma comparison. Does not replace a two-temperature non-LTE closure without demonstrating the regime. No dataset was imported here. |

## Verification status

Initial source-only assessment verified the exact Mutation++ v1.0.5 table, π/Å² normalization, pure-species viscosity and conductivity formulas, interpolation semantics, and the Li fit's printed units/domain. Subsequent parent-run numerical results and exported checksums are reviewed below. This source-review agent did not execute scientific code or install packages.

## Implementation re-review

Read `src/fuel-neutral-transport.ts`, `src/fuel-spatial-operation.ts`, `src/fuel-spatial-coupling.ts`, `src/fuel-gas-thermal.ts`, `src/fuel-operation.ts`, and `tests/fuel-spatial-operation-v66.test.ts` after implementation. Also read `scientific/fixes-v43/current66-electrical-qualified.log` and its receipt: the parent-run study exited0, reported16 electrical cases/362 numerical gates passed, and reported the transport oracle passed. The receipt identifies source SHA256 `5771e1bd3e1208a590e15988036632fad75792c74b2e90fe940f7348b6efe53c` with source verification before and after execution. Detailed transport output was still in the guest at this review; this agent did not independently execute or rehash the receipt inputs.

The callback replaces the constant gas conductivity at every residual evaluation; it does not add a second conduction term. Endpoint temperature also sets viscosity in the coupled momentum source. Current Joule heating, physical shear heat and signed centrifugal redistribution work enter the gas once. Mechanical backward-Euler/upwind losses remain external numerical ledgers. The new spatial path sets `dragEnergyJ=0`; it does not add the legacy wall-drag heat on top of solved shear. These inspected paths show no new heat double counting.

Remaining boundaries and acceptance gaps:

- **Nonlinear trial domains:** the thermal line search bounds positive gas temperature and the solid range, but the material callback has narrower gas domains. A trial outside the Ar/Li fit range throws before backtracking. This is a numerical robustness concern for a valid root near a property endpoint, not evidence of a wrong accepted heat balance. Add endpoint/near-endpoint nonlinear regression cases before claiming robust handling there; do not silently clamp a physical final state.
- **Isotopic composition:** Ar transport uses39.948u regardless of supplied `speciesMassKg`; the Li fit is not isotope resolved. Common-potential first-order scaling gives μ proportional to square-root mass and κ inversely proportional to square-root mass, so replacing Li7 by Li6 alone changes these by roughly7%; this is a sensitivity inference, not an independently validated isotope-mixture law. The approximation should be explicit. The supplied material must match the modeled species; this generic setup currently accepts arbitrary positive masses even when they contradict its material label.
- **Mixture/plasma regime:** no source table supplies the missing ion-neutral mixture, electron conduction, composition or chemistry closure. A temperature inside the table is insufficient to qualify a hot plasma. Fixed electrical conductivity remains a separate prescribed closure.
- **Live integration:** `fuel-operation.ts` retains its earlier prescribed-conductivity path. The v66 callback is in the new experimental `fuel-spatial-operation.ts` path; source/table verification cannot be presented as proof that deployed controls now run this backend.
- **Solver qualification:** the callback conductivity derivative is omitted from the approximate Newton matrix, while the full residual uses updated conductivity. This is an inexact Newton/Picard iteration, not a change to the converged equation. Nonlinear residual convergence and joint mesh/time refinement still decide numerical acceptance.

## Final accepted evidence

Reopened the exported artifacts under `scientific/centrifuge-v44/current66/studies/final-accepted/` and the final execution receipt. The accepted run contains711 inputs and identifies source snapshot SHA256 `ad08c16e86729d6b94190e349de1c4117bf37844dca74540c32767569f1b517c`; the receipt reports exit0 and unchanged source before/after execution. The acceptance manifest records the source-JSON hash below.

Used the read-only host `shasum -a 256` utility to hash the actual exported files. All three match `current66-final-volume/electrical/transport-validation.json`:

| Input | Actual SHA256 |
|---|---|
| Downloaded `current66-data/collisions.xml` | `25e0ac6affa33361e9652d3fd3f43760f40f1a500c0a4993b1ace82c5ce501c2` |
| `scientific/current-v66/transport-data.json` | `27be9f221b3cd10dcfa8f5aee643096a97e0c93ccea82d89e340aec1e9df30cc` |
| Exported `electrical/transport.json` | `0b245f8e9cb3d2652d6d1f3b8c44f42eac3e360a285b1238f5246d525aa701b8` |

The raw XML inspected locally contains the same temperature/Q11/Q22 values, Å² units, explicit π multiplier, reference and estimated accuracy. The independent Python oracle reports29 passing property comparisons: Ar area/μ/κ at300,500,1750,8000,10000,12867,20000K and Li μ/κ at100,500,1500,3000K. Maximum relative discrepancy is `1.1102230246251565e-16`, below its prospective `2e-12` implementation tolerance. This supersedes the earlier statement that detailed transport output remained only in the guest.

Also inspected `coupled-audit.json` and `coupled-convergence.json`. All12 requested Li-mixture trajectories completed, totaling448 accepted steps. The independent reconstruction checks sourced endpoint viscosity, conductive/enthalpy face heat, physical shear heat, local energy and angular momentum, canonical inertia, electrical work, and numerical-loss separation. All cases pass; nine reported tamper/partial-trajectory negative controls reject. Endpoint-viscosity relative discrepancies are at most approximately `2.76e-16`; conductive/enthalpy-flux discrepancies are at most approximately `6.39e-16`. These agreement levels establish faithful implementation of the supplied constitutive law and discrete equations, not comparable precision of the physical model.

The new volume-coordinate shear scheme is declared and independently audited. The final radial32→64-cell comparison reports gas-temperature difference0.01583K (0.01698% of its heating scale), angular-speed difference0.00813% of initial peak, and species-CDF error `4.69e-6`. At64 cells,32→64 timesteps gives0.5773K temperature difference (0.6193% of heating scale),0.09773% angular-speed difference, and species-CDF error `3.28e-5`. All six declared time/radial acceptance gates pass. Axial and liner grids were **not** jointly refined, and the full coupled study is a Li-mixture case near1000–1200K over1ms; it is not a coupled8000–13000K Ar-plasma qualification.

The exported full test log reports1226 passed/0 failed. Numerical gates and hashing were rerun by the parent in safe-dev; this agent inspected their exported results without executing project code. The earlier property-endpoint trial-domain concern, isotope-mixture approximation, missing plasma/electron closure, pending independent ab-initio Ar data comparison, and unchanged live backend remain limitations. The final artifacts explicitly retain `experimentalValidation=false` and `liveBackendChanged=false`.
