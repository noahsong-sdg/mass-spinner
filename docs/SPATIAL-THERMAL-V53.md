# Spatial liner thermal model

The operating centrifuge now offers a radial solid tungsten liner alongside the existing lumped thermal mode. Neutral gas remains one well-mixed reservoir. The numerical and material choices are independently reviewed in [sources](reviews/v53-thermal-sources.md), [physics](reviews/v53-thermal-physics.md), and [external solver validation](reviews/v53-thermal-reference.md).

## Problem and root cause

The old liner had one prescribed heat capacity and one temperature. It could exchange heat with gas and coolant, but could not represent a thermal gradient or the time needed for heat to penetrate the wall. Technically, it was an ordinary differential equation for a single reservoir, without a spatial conduction term. Simply, it treated the entire wall as instantly mixed.

The new model solves the cylindrical solid heat equation on fixed annular finite volumes. Gas exchange heats the inner cell; outer cooling acts through the outer cell. Interior fluxes appear with equal and opposite signs. Gas and coolant film conductances are total W/K and include the solid half-cell resistance in series.

For each cell:

\[
m_j\,[h(T_j^{n+1})-h(T_j^n)]
=\Delta t\sum_k G_{jk}(T_k^{n+1}-T_j^{n+1})+Q_j.
\]

Storage uses integrated specific enthalpy, not `Cp(T)*T`. The gas remains `Ug=3NkBTg/2`. Gas temperature still feeds back into centrifugal transport and evolving neutral inertia. The accepted mechanical solve supplies slip, signed redistribution and Ohmic heat to gas, and wall drag to the inner solid cell. Numerical mechanical dissipation remains a separate ledger entry and is never added as heat.

This is the smallest coherent spatial upgrade because it resolves solid conduction with defined geometry and material data. A spatial gas model would require local momentum/pressure, heat deposition, neutral mixing and rarefied interface closures. Adding a generic gas diffusion equation would not establish those missing physics.

## Material model and domain

- Pure solid tungsten: NIST first solid Shomate heat-capacity branch, Tolias conductivity correlation; material temperatures restricted to 300–1900 K without extrapolation.
- Fixed reference density 19,250 kg/m³, mass and geometry. The heat capacity follows temperature, while material mass stays conserved. Thermal expansion and elastic work are omitted.
- Reference enthalpy is zero at 300 K; only differences affect the energy balance. Gas and coolant may be outside the solid-property interval if the solid remains admissible.
- Thickness controls modeled thermal mass and conduction distance. Assembly geometry/materials remain illustrative rather than an as-built Marathon machine; this upgrade does not claim a spatial gas or axial temperature field.

The selected NIST heat-capacity fit is an established but older data model, not the newest recommended dataset. Material-fit and apparatus/boundary uncertainty are distinct from numerical solver error. Source coefficients, units, ranges and alternatives are documented in the source review.

## Nonlinear solver, playback and continuation

Gas and solid temperatures are solved together with implicit conservative enthalpy storage and positive conductances. This avoids searching a gas-temperature bracket that could force trial solid states outside their property domain.

An independent reviewer found that ordinary source fixed-point iteration could oscillate even when a unique positive implicit solution existed. Negative source feedback is now linearized with a successive-evaluation secant, preserving a positive matrix diagonal; the unchanged physical residual and global energy budget still decide acceptance. Solving increments also preserves exact stationary states at material-domain boundaries. Only an eight-machine-epsilon allowance accommodates enthalpy multiply/divide roundoff at the upper endpoint; physical out-of-domain states reject.

Playback interpolates cell enthalpies and reconstructs temperatures. Interpolating temperature independently would violate the nonlinear energy relation and corrupt off-knot restarts. Continuation verifies the accepted grid, cell energy and derived temperatures before advancing. Old lumped histories keep their scalar representation and behavior.

## Interface

In Controls → Thermal model, enable temperature evolution and select **Radial tungsten liner**. Set modeled thickness, gas–liner conductance, cooling and coolant temperature. Solid capacity is derived from geometry and material data, so the old prescribed lumped-capacity input is hidden in this mode.

The Temperature plot shows lumped gas and inner/outer liner cell temperatures over time. Liner temperature profile shows the through-wall field at the accepted cursor. Those are cell-center values, not reconstructed boundary-surface temperatures. The inspector reports the liner temperature range. The 3D assembly is not falsely colored with an axial or spatial gas thermal field.

Three adjacent integration fixes preserve these semantics. Validation previously treated DOM `disabled` flags as the definition of an active physical input; programmatic activation could leave those flags stale and silently substitute defaults. It now validates and serializes fields from the selected thermal model, so the physical setup determines activity directly. Shared setup coordinates now include model and thickness; older enabled-thermal links explicitly restore a lumped liner rather than inheriting an open spatial workspace. Component metadata now identifies the selected model and discloses that shell thickness/shading remain illustrative. These local changes retain legacy behavior without a new migration schema or synthetic surface coloring.

## Verification

Independent tests cover material enthalpy quadrature/inversion, annular mass, stationarity, positivity, equilibrium, entropy, signed coolant transfer, nonlinear cylindrical steady conduction, stiff feedback, accepted mechanical payload, total energy, interpolation, continuation, invalid/stale state and legacy/UI compatibility.

The browser uses a compact finite-volume kernel. Actual **FiPy 4.0.3 / SciPy** independently assembles and solves the coupled reference system in the offline safe-dev VM; FiPy is not claimed to run in the browser. This retains interactive static hosting while testing the kernel against an existing scientific code. MOOSE and OpenFOAM were examined; they become more useful when thermomechanics or spatial fluid/coolant closures and geometry are specified.

The cross-code campaign includes seven cases / 80 time steps, including two default-inventory (approximately 0.00109 J/K) gas exchange cases at 0.1 and 1000 W/K. Separate nonlinear spatial refinements yield error ratios about 0.25, and timestep refinements about 0.50. The finest production gas plus all 64 wall temperatures agree with FiPy within 5.31e-11 K. This is agreement on the discretized equations, not physical temperature accuracy: the demanding benchmark still changes by 0.456 K between 128 and 256 time steps. A separate analytic annular Bessel eigenmode checks the external FiPy spatial discretization, reaching 0.00461 K error at 64 cells. These are case-specific qualification results, not global convergence across every control setting or experimental validation.

Negative evidence is retained in `scientific/fixes-v43/thermal53-final-precheck.log`: an exploratory 12 mm liner / 0.5 m vessel / low-inventory / 1000 W/K case failed FiPy's nonlinear residual gate (1.60e-10 versus 1e-11). At the v53 release its root cause was unresolved. The subsequent [v54 diagnosis](THICK-WALL-FIPY-V54.md) reproduces the failure and fixes an absolute-temperature linear-solve residual floor by solving temperature increments, retaining the same physical equations and gates. The original case and fine-grid/time refinements now qualify within the scopes documented there; the underresolved coarse-grid contraction failure remains explicit. The accepted v53 default-geometry cases still pass unchanged gates.

## Remaining physical limits

The main uncertainties remain prescribed interface/coolant conductances and deposition partition, assumed tungsten construction and thickness, well-mixed neutral gas, fixed discharge conductivity/friction/diffusivity, and unmodeled axial hot spots, radiation, phase change, thermal expansion, ionization and extraction back-reaction. Out-of-domain or nonconvergent runs report errors rather than silently clamping or substituting a different model.

## Release evidence

All nine final commands passed in the offline safe-dev VM on 566 immutable inputs, SHA256 `dc2a13e978f78ea0d3c6bad4c07506ddd08c12395c6b73ec33c336d727c93444`:

1. `npm test` — 1,135 passed, zero failed/skipped/cancelled.
2. `npm run typecheck` — passed.
3. `npm run build` — passed; existing large-chunk advisory remains.
4. `npm run check:site` — passed.
5. `npm run check:assets` — passed.
6. `node --import tsx scientific/fixes-v43/verify-release-worker.mjs` — passed.
7. `node --import tsx scripts/verify-fuel-release-v44.mjs` — passed: 144 bundled centrifuge/transport cases, 20 operation cases, four spatial cases and 49 map cells.
8. `python3 docs/reviews/v42-collision-data-probe.py` — passed existing evidence checks; collision transport qualification is unchanged.
9. `python3 scientific/thermal-v53/run-studies.py /work/home/thermal-v53-final-studies-thermal53c` — passed seven FiPy cases/80 steps and the separate convergence studies.

The final cross-code case maximum temperature difference is 2.28e-9 K; the complete finest convergence field agrees within 5.31e-11 K. Maximum production cumulative relative energy imbalance is 3.64e-12 in the refinement study. These remain discrete-model checks with the limitations above.

The 151-file release has aggregate SHA256 `6b29e6159360b202d9073a76feca155d9377c118d2ac427582bf804acdf9992a`. Cloudflare reports version `8a96eea6-4a4c-4176-afa8-431a7c51af56` at 100%; native Brave reopened the deployed `/assets/index-MQieJfUw.js` entry. [Final receipt](../scientific/centrifuge-v44/thermal53c/final/receipt.json), [study summary](../scientific/centrifuge-v44/thermal53c/studies/summary.json), and [native browser evidence](../scientific/centrifuge-v44/thermal53c/browser/browser-proof.json) are retained separately.

Live checks covered spatial selection, thickness/cooling changes, radial and temporal plots, current cut at 0.4 s and coast, shared setup restoration, accepted liner inspector values, GPU cutaway/tracers, and 390×844/320×740 layouts. Neither mobile width overflowed horizontally; the plot sheet scrolled to expose its complete graph. A 4 mm liner with both films at 1000 W/K gave inner/outer cell temperatures 938.7/928.0 K at one second; changing to 2 mm gave 877.5/872.9 K. The observed cut/coast history retained its event and reported a total-energy relative residual of 1.31e-15. No browser warnings/errors were captured. The browser viewport was restored.

The earlier suite timeout and exploratory reference failure are retained. The test worker mock now rejects synchronous solver exceptions instead of leaving unresolved promises; gate timeouts terminate their process group and retain partial diagnostics. The final passing run supersedes those attempts without deleting them.
