# Independent spatial gas-energy integration review

## Scope and evidence

This review traces existing production execution and defines integration
requirements. It does not execute the simulator, duplicate a VM campaign,
or establish experimental calibration. Source files inspected are
`src/fuel-operation.ts`, `src/fuel-transport.ts`, `src/fuel-thermal.ts`,
`scientific/thermal-v53/reference-fipy.py`,
`scientific/thermal-v54/refinement-fipy.py`,
`scientific/gas-regime-v56/assessment.py`, and `docs/GAS-REGIME-V56.md`.
Final v57 implementation/results review is recorded separately below when
available. No production code was changed by this reviewer.

## Verified execution path

1. `simulateFuelOperation` obtains geometry, initial pressure and temperature
   from the rotor configuration. It initializes a fixed total neutral number
   `N = p0*pi*R²*L/(kB*T0)` and one neutral capacity `1.5*N*kB`.
2. Gas temperature is a single scalar. `capture` reports gas energy as
   `Cg*Tg` and mean pressure as `p0*Tg/T0`. These are appropriate identities
   for a fixed-number monatomic ideal-gas *uniform-temperature reservoir*.
3. Species arrays in `advanceFuelCoupledStep` are separately normalized
   **number probabilities**, despite the historical `lightMass` and
   `heavyMass` names. Equal-volume radial cells use `y=r²/R²`.
   Their partial numbers are `N*x*lightMass[i]` and
   `N*(1-x)*heavyMass[i]`, not equal-mass material parcels.
4. SG species fluxes use one common prescribed phenomenological radial D
   and the scalar temperature in the centrifugal exponent. They are not
   a multicomponent fluid solver: barycentric velocity, local pressure
   work, zero net diffusive mass flux and enthalpy transport are absent.
5. Rotor angular momentum is updated in the same implicit step as gas
   inertia. Slip dissipation, Ohmic input and **signed** redistribution
   work enter the lumped gas energy. Wall-drag dissipation enters the
   innermost wall cell. Numerical mechanical dissipation stays a separate
   ledger item and is never reheated into gas or wall.
6. `advanceFuelThermal` resolves only the solid: exact annular volumes,
   log-center conduction resistances, tungsten enthalpy and temperature-
   dependent conductivity. The gas-wall flux is one equal-and-opposite
   link that includes the prescribed interface resistance and innermost
   solid half-cell resistance. It does not include resolved gas transport.
7. Current events split accepted steps exactly. Continuation checks
   geometry, material grid, operation setup, species probabilities,
   momenta, ledgers and reconstructed wall enthalpy/temperature consistency.
8. The prior actual-FiPy reference intentionally represents the gas as
   **one cell** with prescribed capacity. Its solid convergence and
   production parity cannot validate a spatial gas energy equation or
   an accommodation law.

## Root cause and smallest defensible change

The limitation is a missing physical model, not a failed matrix solver.
The production state has nowhere to store gas temperature gradients,
and its mechanical transport has no local energy flux or pressure-work
closure. Adding conductivity links to copies of the existing scalar gas
capacity would silently create a new fluid model without the equations
needed to justify it.

Simply: the wall can only exchange heat with one perfectly mixed bucket.
Dividing that bucket into smaller buckets does not by itself explain how
real gas expands, moves and carries heat between them.

The smallest defensible v57 change is a **separate spatial reference**
with explicit geometry, composition, gas thermodynamic approximation,
temperature perturbation range and a traceable interface law. It should
not automatically replace the live rotating multicomponent backend.
This is preferable to a hidden per-cell-Cv substitution or empirical
retuning of `gasWallWK`: those changes could fit the existing scalar
benchmark while preserving the missing pressure-work/transport physics.

## Cp versus Cv is a model choice, not a numerical tuning knob

A frozen-density local equation `n*Cv*dT/dt = div(k*grad T)` is a useful
conduction-only mathematical benchmark. At finite gradients in a free
ideal gas it generally also creates pressure gradients. It must not be
called a quiescent free-gas solution unless momentum or a physical
constraint supporting those gradients is supplied.

A fully nonlinear closed low-Mach ideal-gas model instead requires
`n=p(t)/(kB*T)`, continuity, a global fixed-N constraint, and
`n*Cp*DT/Dt = dp/dt + div(k*grad T)`. Prescribing both fixed local density
and uniform pressure while temperature varies is inconsistent.

A useful smaller physical reference is the **linearized closed-vessel
low-Mach model** about uniform `n0,T0`. Let `theta=T-T0` and use volume
average `<>`. To first order:

```
p'(t) = n0*kB*<theta'(t)>
n0*Cp*theta' = p' + k*laplacian(theta)
n0*[Cp*I - kB*1*w^T]*theta' = conduction
```

Here `w` contains normalized cell volumes. Its uniform-temperature mode
stores energy with Cv, while zero-mean modes have Cp. Total first-order
gas energy change is `n0*Cv*V*<theta>`, so boundary heat changes the correct
closed-vessel energy. Advection of the temperature perturbation is
second order, although a first-order expansion velocity exists. The
model still requires small relative temperature perturbations, sound
crossing much faster than thermal evolution, and no appreciable rotation,
chemistry, extraction or composition gradients. A coefficient-varying
extension can be an exploratory nonlinear calculation but does not
inherit linearized physical accuracy automatically.

## Required integration gates

Before this reference can change the rotating production backend:

- Specify canonical local gas particle/energy states and units. Preserve
  species **number** normalization and absent-species endpoints.
- Choose a coherent thermodynamic/fluid closure. Carry internal energy,
  pressure work, barycentric advection and species diffusive enthalpy
  consistently. Do not infer thermal diffusion from the existing mass D.
- Couple radial energy transport to SG particle transport with matching
  face fluxes; do not delete or create cell thermal energy when inventory
  changes. Recompute inertia and angular momentum on the same accepted
  state without double counting centrifugal redistribution work.
- Define and justify spatial deposition of Ohmic/slip sources. The
  existing total losses do not determine a unique local deposition law.
- Deposit drag energy once. A tangential Maxwell wall-incidence estimate
  is not an additional heat source on top of the mechanical drag ledger.
- Exchange one interface flux equal-and-opposite between gas and solid.
  Include gas half-cell resistance, accommodation resistance, and solid
  half-cell resistance exactly once. Use actual interface area; keep
  thermal and momentum accommodation distinct.
- Guard material/property/interfacial law domains. Unknown Li or mixture
  accommodation is an unresolved parameter/data gap, not permission to
  substitute a measured He/W value as calibrated input.
- Extend checkpoints, comparison compatibility, interpolation, continuation
  and UI surface mapping for canonical gas state. Reject stale histories
  that lack required spatial energy rather than synthesizing gradients.
- Preserve the scalar public mode unless a separate, qualified new mode
  is intentionally selected. Do not label a new standalone reference as
  a deployed live-simulator upgrade.

## Required numerical and physical tests

1. **Uniform equilibrium:** equal gas/solid/bath temperature, no sources;
   zero flux, unchanged state and no artificial entropy production.
2. **Adiabatic isolation:** zero accommodation/cooling; internal exchanges
   conserve total gas-plus-solid energy. Verify gas uniform mode uses Cv.
3. **Infinite-mixing limit:** increasing gas conductivity approaches the
   correctly derived lumped Cv gas/solid model for the same interface law.
4. **Constant-property cylinder:** compare spatial profiles and heat flux,
   not only final mean temperature, against an independently assembled
   analytic eigenfunction or method-of-lines solution. Use volume-weighted
   means and conservative projection between refinement grids.
5. **Independent time and space refinement:** refine each separately and
   jointly; include early boundary-layer times and wall/gas interface
   temperatures, cumulative heat and full profiles. A tiny energy residual
   alone cannot establish accuracy.
6. **Boundary limits:** alpha=0 is insulating; alpha in (0,1] is passive;
   test unequal temperatures, sign reversal, and half-cell resistances.
   Do not evaluate alpha/(2-alpha) at an invalid domain or mistake a
   two-wall coefficient for a single-wall reference.
7. **Entropy and bounds:** for a passive closed reference, nondecreasing
   thermodynamic entropy within a stated roundoff budget and no temperature
   excursions outside initial/bath bounds. For a linearized model use its
   consistent quadratic entropy/energy rather than claiming the exact
   finite-amplitude ideal-gas entropy law.
8. **Pressure-work diagnostics:** independently verify fixed total N,
   volume-average pressure relation, total thermal energy, and the Cp/Cv
   mode split. Deliberately corrupt the storage operator and require the
   independent checker to reject it.
9. **Regime/domain:** record local/gradient Kn, acoustic/thermal timescale
   ratios, relative temperature perturbation and any reconstructed velocity
   or Mach diagnostic. Low Kn is a necessary screen, not device validation.
10. **Production regression gate:** once any production path is changed,
    test history branching, stale continuation rejection, composition
    endpoints, no-energy-double-counting and unchanged legacy scalar mode;
    then run repository build/typecheck and narrow meaningful tests in
    safe-dev on an explicitly hashed source copy.

## Current review verdict

The traced production path supports a standalone reference before live
integration. No current wall or gas-regime result establishes a physically
qualified rotating multicomponent spatial gas-energy closure. This is an
integration constraint, not a reason to withhold a clearly scoped,
independently checked reference calculation.

## v57 implementation-path review

The new `scientific/gas-energy-v57/model.py` was subsequently inspected.
It implements a nonlinear **Lagrangian** single-species low-Mach reference,
not the frozen-density alternative discussed above. Each shell retains
its particle number. Temperature and uniform pressure determine shell
volumes, and their sum is constrained to the rigid cylinder volume:

```
p = kB*sum(N_i*T_i)/V
V_i = N_i*kB*T_i/p
N_i*Cv*delta(T_i) + p_new*delta(V_i) = Q_i
```

The rank-one matrix term is coherent with this first law. In particular,
`p_new*delta(V_i) = N_i*kB*delta(T_i) - V_i_old*delta(p)`, so the solved
gas storage `N_i*Cp*delta(T_i) - V_i_old*delta(p)` is algebraically
equivalent to the independently reconstructed internal-energy-plus-work
residual. Summing shell pressure work gives zero because the outer wall
is rigid. Consequently uniform heating uses total Cv, without incorrectly
using a local-Cv spatial PDE or treating a closed gas as a Cp reservoir.

This remains a low-Mach reference: acoustic waves, radial momentum inertia,
species separation, rotation, local source calibration and axial flow are
not thereby solved. Low-Mach/admissible-Kn diagnostics and refinement are
still required. This source inspection alone is not a successful test run.

Independent `tests/test_gas_energy_v57.py` was authored without importing
model constants/property tables. Thirteen methods check physical limits,
published He units, pressure work, conservation and real input domains.
The upper-tungsten-equilibrium regression deliberately exercises an
observed source defect: a forward finite-difference heat-capacity probe
at 1900 K requests a temperature outside the stated material domain.
The parent owns isolated red/green execution and the corresponding fix;
this reviewer has not executed project code on the host or elsewhere.

## Final source and recorded-results pass

The later source pass inspected the updated nonlinear model, actual-FiPy
reference, campaign, convergence analysis, controlled-refinement diagnosis,
independent all-state auditor, rejection controls and the main v57 report.
No new blocking integration or energy-ownership defect was identified
within the standalone, pure-gas, nonrotating scope.

Evidence read directly from parent-owned safe-dev records:

- `gas57-tests-red.log` preserves the 1900 K material-domain failure.
  The source fix replaces the forward derivative probe by analytic Cp and
  enforces the same property domain in conductivity calls.
- `gas57-physics-regression-final.log` records 15 passing physical/domain
  tests, including an actual-FiPy equilibrium regression and external
  cooling/entropy check. `gas57-geometry-green.log` records three passing
  geometry/roundoff regressions. These are observed logs, not executions
  performed by this reviewer.
- `gas57-independent-5-corrected.log` records all-state checks for the main
  30-history packet; `gas57-resolved-independent.log` records the four
  additional controlled histories. The resolved 512-gas/128-wall,
  5120-step history has maximum gas-row residual 2.70e-14 J, maximum
  solid-row residual 2.03e-11 J and cumulative energy residual
  -1.37e-10 J. These are discrete-model checks, not calibration.
- `gas57-flux-refined-report.log` records separate controlled refinements:
  at fixed 512-gas/128-wall spatial mesh, 2560 to 5120 steps changes
  peak-normalized common-time interface power by 0.7982%; at fixed 5120
  steps, gas256/wall64 to gas512/wall128 changes it by 0.6041%.
  The latter refines **both** spatial meshes; it is not an isolated gas-
  mesh test. A separate wall64-to128 control at gas256 changes the same
  power diagnostic by about 1.50e-7 fraction.
- The original abrupt 800/500 K cases retain failed common-time screens
  even though endpoint-only gates pass. The report must keep that failure
  visible; neither endpoint parity nor a smooth-start result qualifies
  abrupt startup.
- The independent small-amplitude eigenmode report rejects the wrong-Cv
  spatial decay: its normalized RMS discrepancy remains about 0.067,
  while the correct-Cp discrepancy contracts to about 9.8e-5 on the
  finest tested eigenmode grid. The exported four corruption controls
  are rejected, including fictitious Cp storage energy.

Reporting boundaries confirmed in `docs/SPATIAL-GAS-ENERGY-V57.md`:

1. The new path is explicitly standalone and does not claim deployed UI,
   rotor or multicomponent integration. Production scalar gas and public
   controls remain their existing model, with its existing limitations.
2. Inventory-reference pressure is distinguished from actual initial
   pressure when the initial gas is hotter or nonuniform.
3. Unknown hot He/W or Li/W accommodation remains a sensitivity parameter.
   Near-ambient He/304SS data is not transferred to tungsten or hot Li.
4. Radius, thermal-gradient, rate and Mach screens are necessary sampled
   diagnostics. Initial temporal rates are unavailable; a stored zero at
   time zero cannot qualify a discontinuous physical startup.
5. Common-time profile diagnostics interpolate representative cell
   temperatures and extend the end-cell value to the axis/wall. This is
   a numerical reconstruction diagnostic, not exact boundary profile
   convergence. Interface surface extrapolations are checked separately.
6. The final controlled-refinement one-percent Boolean in `diagnose.py`
   gates profiles, surfaces, peak-normalized power, cumulative heat **and
   relative pressure**. This reviewer rechecked the updated source after
   the earlier diagnostic omission was corrected. The recorded relative
   pressure differences are about 4.27e-7 for joint gas/wall spatial
   refinement and 1.77e-5 for time refinement. Absolute error estimates
   should accompany the Boolean; it is an engineering screen, not a
   universal convergence theorem.

The remaining integration work is the physical coupling listed above,
not a license to silently make a no-rotation pure-gas reference drive
the live centrifugal separation plots. No security/data-compatibility
regression is introduced through persisted production state because this
assessment adds no such state. Final repository build/typecheck and
snapshot/export identity closure remain the parent's responsibility.
