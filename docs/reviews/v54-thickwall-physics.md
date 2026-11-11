# Thick-wall thermal physics review — v54

Independent reviewer: `/root/thickwall_physics_v54`, 2026-11-09.

**Verdict:** no blocking physics defect found in the increment-form FiPy fix. The original nonlinear-solver failure is corrected without changing the physical equations or acceptance tolerances. Fine-grid endpoint refinements qualify the stated passive benchmark; the coarse spatial negative result remains a negative result. This is numerical verification of a reduced thermal model, not calibration of Marathon hardware.

## Evidence and execution boundary

I inspected `src/fuel-thermal.ts`, the actual patch in `scientific/thermal-v53/reference-fipy.py`, the diagnostic and refinement execution paths, and the parent-exported logs below. I wrote the independent `scientific/thermal-v54/audit-physics.py`. The parent executed all project code in the offline safe-dev guest; I ran no project code on the host or in a separate environment.

Reviewed actual outputs:

- `scientific/fixes-v43/thermal54-diagnose-a.log`
- `scientific/fixes-v43/thermal54-refinement-b.log`
- `scientific/fixes-v43/thermal54-physics-audit.log`
- `scientific/fixes-v43/thermal54-numerics-audit.log`
- `scientific/fixes-v43/thermal54-physics-audit.receipt.json` and its input manifest

The physics audit receipt records exit 0, 21.443 s, and source verification before and after execution. Its tested source snapshot hash is `7912df36dfcf581eb849cf4fbd3534420a9cc14d81a749e63bd35e54f61ddbd4`; the reference source hash in that manifest is `e9171f3177a7e0024b2f14f4e5dac57392ef0a5a49dab217f9e8a425fe955f31`.

Shared campaign packet hash: `98cf9cd8285593845d3af3e47b9bc9025bafdf5c7d2093427dba44839c882903`.
Shared FiPy result hash: `ea36aa2d3a58bdd3a7052bb6f9eb8c015a763dcc31fb66be1ac43b55096fdc48`.
Independent physics script hash: `0256b9f88789f1eaf9e3617a921112f206efd5ff7c4d85286bc100beeebd89dd`.

## Root cause and selected fix

The failing absolute-temperature solve stagnated at iteration 300 with zero temperature update, admissible material temperatures, and gas-row residual −2.68173e-10 J. The independently recorded assembled linear residual was −2.68030e-10 J in the same row. Changing only enthalpy-secant or residual evaluation did not remove the failure. Solving only the temperature increment did.

Technically, the absolute-temperature linear system loses accuracy while combining large background-temperature terms to recover much smaller energy changes in the low-capacity gas row. In simple terms, the solver was subtracting large nearly equal quantities to determine a tiny transfer. Additional identical nonlinear iterations could not recover the lost digits.

The replacement unknown is `delta = T_new - T_old`. For each nonlinear iterate, the capacity, cylindrical conductances, and cooling conductance remain unchanged. The known old-temperature fluxes move into the right-hand side, including the correctly signed `G_outer * (T_coolant - T_old,last)` term. `delta.old = 0` is set once per physical timestep. Reconstructed temperatures are tested with the original nonlinear energy residual and temperature-update gates.

This translation leaves the coefficient matrix and its condition number unchanged. It improves floating-point evaluation of the right-hand side and increment; it should not be described as changing the matrix conditioning. It is preferable to relaxing the residual gate, adding iterations, or changing the physics because the controlled experiments isolate the failure to this representation. The increment-only diagnostic passed all five original steps; its final normalized residual was 1.51627e-14.

## Independent physical checks

The new audit imports neither FiPy nor the production kernel. Decimal arithmetic at 80-digit precision independently reconstructs annular masses, exact integrated tungsten enthalpy, logarithmic half-shell resistances, every gas/wall energy row, signed coolant transfer, and integrated `Cp(T)/T` entropy. Gas heat capacity is the fixed-inventory, constant-volume monatomic closure used by this benchmark.

The audit retains the original node gate:

`abs(R_i) / (1 + max(abs(E_old,i), abs(E_new,i), abs(Q_i), 1e-9)) < 1e-11`.

For the low-inventory gas this is approximately a 1.7e-11 J budget, not a tolerance scaled by the massive wall. Passive maximum-principle bounds and the entropy inequality are checked at every accepted state. Entropy roundoff allowances are stated separately from the unchanged energy-residual gate.

Observed results across **22 cases and 2,875 accepted states**:

| Independent check | Observed result |
| --- | --- |
| Maximum normalized node residual | 1.45915e-13, below 1e-11 |
| Maximum gas-row residual | 2.44930e-13 J |
| Maximum conditional analytic gas-update error | 1.94138e-13 K |
| Minimum entropy production per accepted step | +5.43419e-9 J/K |
| Passive bounds and signed coolant ledger | Passed all states |
| Independently advanced Decimal solution, selected short cases | 35 states; maximum FiPy difference 5.24159e-13 K |
| Analytic two-reservoir backward-Euler self-check | 3e-77 K arithmetic difference |
| Isolated annular redistribution self-check | Energy, entropy, unchanged uncoupled gas passed |

A separate reviewer's absolute-temperature Decimal solver agreed on 15 selected states to 3.41061e-13 K. Agreement between high-precision absolute and increment formulations is an additional check that the physical equations were preserved.

## Refinement interpretation and remaining limits

The FiPy campaign solved all 22 cases with maximum reported normalized residual 7.51266e-14. Production comparison covered 21 cases and 286,955 temperatures, with maximum difference 4.59613e-9 K against the unchanged 5e-6 K gate. The 256-cell run is external-only because it exceeds the production grid domain.

The original spatial all-grid gate **did not pass**: the first difference ratio is 1.19673. At 1000 K, thermal diffusivity is 4.14361e-5 m²/s and the diffusion length at 5/512 s is 0.636 mm. The first two cell widths, 1.5 and 0.75 mm, underresolve that short-time layer. This physical scale supports the coarse-grid explanation; it is not itself a proof of convergence. The independent measured tail supplies the evidence: n32→64→128→256 differences are 3.53702e-5, 9.30691e-6, and 2.35192e-6 K, with ratios 0.263129 and 0.252707, consistent with second-order spatial convergence. `allPass=false` and the scoped `qualificationPass=true` correctly express these different conclusions.

The fixed-radius diagnostic uses the common interior domain and avoids extrapolation. It excludes the closest-to-surface portion of the coarse-grid boundary layer, so it cannot replace the original maximum-norm convergence gate.

The ordinary temporal ratios approach 0.5, as expected for backward Euler. Fast-gas ratios also approach 0.5, but the finest 160→320-step endpoint difference is still 0.135577 K. That family establishes temporal convergence on its fixed discrete wall. At n128 its 93.75 µm cells are much wider than the roughly 12 µm fast-time diffusion length, so it does **not** establish continuum early-time interface accuracy. Neither family certifies initial heating rates or whole-history discretization error.

The verified closure remains one gas temperature plus radial solid conduction, fixed material mass/density, prescribed film/cooling conductances, and tungsten properties in the stated solid domain. Spatial gas structure, axial/end losses, radiation, thermal expansion, phase changes, and hardware-specific boundary calibration are outside this qualification. Final repository build/typecheck and deployment verification are separate parent-owned gates and are not approved by this physics review.
