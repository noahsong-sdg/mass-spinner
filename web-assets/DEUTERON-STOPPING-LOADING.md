# Deuteron stopping and evolving target loading

## What changed in 02

Under **Target & electrical assumptions**, select either the original imposed linear slowing law or the new **Geant4-derived Li/T estimate**. The latter evolves deuteron energy through a fixed formula-unit areal column and uses an independent initial tritium site fraction. A fixed 1:1 Li/hydrogen-isotope stopping matrix remains present when tritium loading falls: reducing T does not make the target disappear.

The expandable **Isotope loading** panel evolves a well-mixed T/D/vacancy population. Its replacement probability is an explicitly assumed scenario input, initially zero. The steady source, neutron geometry and constant-forcing thermal observer above remain initial/frozen references. The loading panel reports its own evolving neutron rate and integrated counts; they must not be substituted into the constant-heat model without changing that model's forcing contract.

## Stopping implementation and provenance

This product includes software developed by Members of the Geant4 Collaboration (http://cern.ch/geant4). See [Geant4 license](./GEANT4-LICENSE.txt).

The small browser implementation adapts the elemental ICRU49 electronic fits and mean nuclear stopping table from **Geant4 v11.4.0**, commit `b4a16de652ec244f7a0ecc0a5cacfee21930bf75`. It is **not a full Geant4 transport run or a measured LiT stopping table**.

- Electronic stopping uses the upstream H and Li fits at equivalent projectile energy per mass, including the low-energy continuation. Contributions are added for one Li and one hydrogen-isotope atom (Bragg atomic additivity).
- Nuclear stopping adds the upstream reduced-energy ICRU49 mean contributions for those two atoms. Nuclear stopping fluctuations are disabled.
- Mass numbers D=2, Li=7, T=3 u are declared approximations. Compound bonding corrections, isotope-dependent evolving nuclear stopping, crystal orientation, charge-state evolution, angular scattering and energy/range straggling are absent.
- Stopping cross section S is in **keV m² per nominal Li/T formula unit**. A source column N in formula units/m² obeys `dE/dN = −S(E)`. It is not a geometric thickness unless a separately supported density is supplied.

The depth integrator uses RK4 for energy through each material interval. Fusion hazard uses a midpoint cross section with exponential attenuation. The within-interval reaction position and continuous beam energy deposition are integrated consistently with linear interval energy, preserving the existing energy ledger. Combined yield quadrature remains second order even though the standalone energy integrator is fourth order on smooth segments. Refinement is required near fit/table transitions.

The internal stopping domain is 0.833333…–500 keV laboratory energy; the lower bound matches the existing 0.5 keV centre-of-mass Bosch–Hale fit. If any interval leaves that domain the **entire source result is rejected**. Fully stopped ions and their sub-cutoff fusion tail are not silently assigned zero yield. The energy scan explicitly excludes and reports unsupported incident energies; it does not extrapolate that tail. A finite accepted slab is not a complete thick-target calculation.

## Conservative loading reference

Let S be fixed hydrogen-site column, T, D and V its tritium, deuterium and vacancy columns, with `T + D + V = S`. Initially `T = initial loading × S`, `D = S − T`, `V = 0`. This assumes unfilled tritium sites are occupied by D, not empty space.

Let j be incident deuteron flux, κ the frozen fully-T-loaded optical depth divided by S, and η the assumed replacement probability for non-fusing incident D:

```
p(T) = 1 − exp(−κ T)
F = j p(T)
H = η j [1 − p(T)]
dT/dt = −F − H T/S
dD/dt = H (T + V)/S
dV/dt = F − H V/S
```

Fusion consumes one incoming D and one target T and creates a hydrogen-site vacancy. Replacement arrivals sample random sites: replacing T releases T, replacing D releases D, filling V releases no isotope. Outgoing T, outgoing D, unretained beam D, retained replacement arrivals and fusion are counted separately. Replacement arrivals are not identical to net retained D. Lithium and reaction-product escape are outside this hydrogen-site ledger.

The solver advances fusion and exchange **simultaneously** with adaptive Dormand–Prince 5(4), using incident dose `u = jt/S`. Write `f₀ = T(0)/S`, `τ = κS`, `T/S = f₀ exp(−h−q)`, `D/S = 1 − f₀ exp(−q)`, and `V/S = f₀ exp(−q)[1−exp(−h)]`. The nonnegative log-depletion variables obey `dh/du = τ[1−exp(−x)]/x`, `dq/du = η exp(−x)`, where `x = τf₀ exp(−h−q)` and the first ratio has limit one at zero. This transformation preserves population positivity and site capacity without clipping populations or projecting reaction ledgers.

Four independently integrated, scaled reaction channels count fusion, outgoing T, non-fusing incident D and outgoing D. Channel scaling resolves the small fusion transient even when total dose is enormous. The embedded error estimate controls adaptive steps; nonfinite or negative log/ledger trials are rejected. Analytic fusion-only, exchange-only and source-off limits remain exact branches. Plot intervals request samples; they no longer select a fixed reaction/exchange timestep. Adaptive endpoints are also retained so the plot does not omit the initial transient at high dose.

The ledger checks fixed sites, target tritium, retained/released deuterium and the incident projectile budget, with raw numerical residuals retained. The panel compares the selected tolerance against a tenfold tighter solve and reports final-population and neutron-total changes under **Populations & budgets**. Local error estimates, endpoint agreement and conservation are not global accuracy certificates or validation of the physical exchange assumption. Independent SciPy Radau/DOP853 references and tolerance/output-grid studies check the same simultaneous equations.

## Existing scientific tools and data boundary

| Tool | Role | Status here |
|---|---|---|
| [Geant4](https://geant4.web.cern.ch/documentation/pipelines/master/prm_html/PhysicsReferenceManual/electromagnetic/charged_hadron_incident/hion.html) | Electronic/nuclear stopping and full particle transport | Selected mean stopping formulas adapted with pinned source/license; no full toolkit run |
| [RustBCA](https://github.com/lcpp-org/RustBCA) | Prompt implantation, reflection, recoil/energy-transfer studies | Separate pinned offline BCA reference; its modeled mixture is not measured LiT |
| [FESTIM 2](https://festim.readthedocs.io/en/v2.0/theory.html) | Multispecies diffusion, trapping and surface reactions | Recommended next continuum backend once material coefficients and implantation profiles exist; not executed by this browser |
| [TMAP8](https://tmap8.inl.gov/) | Independent mass/thermal transport and fuel-cycle comparison | Recommended independent comparator, not installed or claimed validated here |
| [SDTrimSP](https://www.max-planck-innovation.de/technologieangebote/technologieangebot/a-monte-carlo-code-for-calculating-collision-phenomena-in-randomized-targets.html) | Dynamic composition and erosion BCA | Relevant licensed reference; not bundled |

The reviewed sources did not establish a validated keV deuteron/solid-LiT stopping plus retention/diffusion/surface-exchange coefficient set. IAEA's bulk stopping-data download was inaccessible in this review; this is incomplete coverage, not proof that LiT data do not exist. NIST proton stopping cannot be relabeled as measured deuteron/LiT data. Metal-tritide exchange measurements and low-eV LiH/LiD simulations cannot calibrate a keV LiT target without a validated transfer model.

## What remains unresolved

No resolved implantation depth profile, temperature-dependent D/T diffusion, chemical exchange law, permeation, sputtering, regeneration, D–D reactions, target lifetime or commercial Marathon yield is predicted. The reference fixes the stopping matrix even as D/T/vacancies evolve. Positivity, conservation, agreement with extracted code and numerical convergence establish implementation consistency; they do not establish experimental accuracy.

The next validation sequence is measured stopping/range comparison → implantation/retention profile → material-specific diffusion/surface parameters → coupled heat/loading/stopping → measured neutron-yield evolution. Keep each uncertainty separate rather than fitting several unknown mechanisms to one yield curve.


## Actual offline RustBCA study

A pinned upstream RustBCA build (commit `51bee889956147e3287491d0c68957967235a33c`) ran six seeded 256-ion cases, a one-versus-four-thread replay and its ten upstream tests. The [compact results and complete assumptions](./RUSTBCA-REFERENCE-V23.json) are downloadable.

For its **assumed semi-infinite amorphous atomic mixture**, with Li and T each at 5×10²⁸ atoms/m³, the INTERPOLATED stopping mode gives these sampled mean projected endpoint depths:

| Incident D energy | Modeled mean projected depth |
|---|---:|
| 20 keV | 0.5645 µm |
| 100 keV | 1.6744 µm |
| 500 keV | 8.7267 µm |

They are projected stochastic ranges, not straight-track CSDA lengths or measured LiT ranges. The physical isotope masses in the BCA setup also differ slightly from the browser's mass-number approximation. Incident kinetic-transfer residuals are below 6×10⁻¹⁴ relative, but recoil cascades, binding/chemistry and heat are not resolved. All 256 modeled projectiles implant in this half-space setup; **this is not finite-film retention and cannot calibrate the replacement-probability slider**. Zero sampled reflections still allows about 1.16% reflection at a one-sided 95% binomial bound within that model.

The low-energy stopping mode at 100 and 500 keV is deliberately outside its intended incident regime. Its large disagreement is retained as a negative control, not used as an uncertainty band. Neither agreement nor disagreement between these model calculations establishes which stopping law is experimentally accurate for LiT.

## Historical high-dose bias

An independent high-dose control (initial T fraction .65, unit-loading optical depth 10⁻⁶, replacement probability .8, incident dose 1000/site) exposed the old split-time bias. The simultaneous ODE gives 8.124991×10⁻⁷ fused nuclei/site; the old event split gave 1.879338×10⁻⁶ at 400 intervals and 8.643380×10⁻⁷ at 6400, still 6.38% high, despite closed atom ledgers. The coupled solver replaces that ordering error and is checked against independent simultaneous references. This is a numerical correction within an assumed well-mixed model, not a measured LiT or Marathon performance validation.
