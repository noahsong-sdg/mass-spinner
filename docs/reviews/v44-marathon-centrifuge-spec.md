# Marathon centrifuge: independent learning-specification audit

Research-only review, 2026-11-09. This document specifies a defensible reduced playground; it does not certify a deployed implementation, experimental prediction, or engineering design. No product code, project scripts, tests, builds, or VMs were run for this review.

## Evidence and existing execution path

At the initial read, `src/marathon-ui.js` connected the compact beam-target source to exposure/loading/target views. That path is not a neutral-gas centrifuge. `src/centrifuge.ts` computes an isothermal, fully ionized, quasineutral, common-rotation equilibrium, including an ambipolar potential. Its composition input is an **axis number fraction**. Neither model becomes Marathon's partially ionized neutral rotor by changing its label. The initial gap required a distinct execution path, rather than an arithmetic patch to those solvers. A subsequent source-only read of the new `fuel-centrifuge` path is recorded below; this initial observation is not a claim that the new path is absent.

Primary sources checked:

- [Marathon's current fuel-cycle page](https://www.marathonfusion.com/fusion-energy/) links lithium enrichment, blanket breeding, extraction and recycling. It marks enrichment demonstrated and lifetime work ongoing; these are company statements.
- [WO2026064411A1, full patent description](https://patents.google.com/patent/WO2026064411A1/en): §§13–19 describe ion-driven mostly neutral rotation, heating limitations and seeding; §§22–26 provide optional electrodes, materials, cooling and electron-heating embodiments; §§27–29 distinguish outlets and an integrated countercurrent cascade. These are disclosures, not a measured transfer function or as-built bill of materials.
- [WO2026136752A2, reproduced patent Description/Claims](https://eureka.patsnap.com/patent/WO2026136752A2): §§38–40 propose high-field operation and annular current localization to reduce heating; §§41–45 specify a **single outer outlet differential pump** and conductance boundaries; §46 describes a separate hot lithium sub-vessel, temperature-controlled outlets and staging. §36/claim 20 distinguish atomized hydrogen from molecular feed. §§48–56 give conditional velocity, pressure, volume and throughput estimates. Paragraph numbers here refer to the patent-text reader, not Patsnap's AI summary.
- The newer patent's original PDF was **not recovered**: Google Patents, WIPO and Espacenet attempts failed; no patentimages link was recovered. Its reproduced text has broken equation OCR. Numerical formulas below are independently derived from explicit assumptions, not trusted transcriptions of that OCR. Original-PDF verification remains open.
- [Marathon's August 2026 company-issued announcement](https://www.prnewswire.com/news-releases/marathon-fusion-demonstrates-lithium-and-hydrogen-isotope-enrichment-using-proprietary-plasma-centrifuge-technology-302861336.html) reports hydrogen/lithium enrichment and model agreement. No measured radial profiles, uncertainty table or reusable validation dataset was recovered. Do not turn that announcement into simulator validation.
- [DOE's project description](https://www.energy.gov/nepa/articles/cx-270890-marathon-fusion-inc-partial-ionization-centrifuge-enabling-differential) establishes the funded program and planned velocity/separation/duration/stability validation, not its successful completion.
- [Whyte et al., *Tritium burn efficiency in deuterium–tritium magnetic fusion*](https://doi.org/10.1088/1741-4326/acf3fb), especially equations 2, 6–8, 13–23, provides fuel/ash definitions. The publisher lists a **2024 corrigendum, Nuclear Fusion 64 099501**; its content was not recovered. Independently derive balances before displaying a quantitative power-density curve; do not copy the newer patent's damaged formula.

## Coverage required for an honest learning playground

The following are implementation acceptance requirements inferred from the sources, not claims that an implementation currently passes them.

| Learning requirement | Minimum useful interaction/output | Boundary that must remain visible |
|---|---|---|
| Mostly neutral rotor | Separate ion and neutral rotation; momentum transfer; neutral radial composition | A charged-particle orbit animation alone does not represent the separating mass |
| Drive versus heating | Current, magnetic field, current annulus; torque and resistive/mechanical heat ledger | Conductivity, coupling and drag are user-chosen closures until calibrated |
| Temperature versus enrichment | Common neutral temperature affects profiles and enrichment | A chosen fixed temperature is a thermostat assumption, not a solved wall-cooling problem |
| Shear control | Rigid interior versus a declared non-rigid profile; show shear heating consequence | Electrode geometry does not uniquely determine the flow without solving transport |
| CIV | Species-specific speed ratios and domain-warning state | A diagnostic is not a universal hard speed clamp or ionization-rate model |
| Atomic versus molecular feed | Explicit composition/species masses; atomic default and molecular comparison | Do not use atomic D/He separation to predict D2/He separation |
| Radial separation versus recovery | Profiles, local ratios, collector cut, enrichment **and** recovered amount | Wall/axis separation is not collected-product purity or a throughput measurement |
| Differential pump | One outer exhaust, upstream pressure and downstream boundary | Do not add a fictitious light-product stream to this mode |
| Isotope separator/cascade | Two balanced products per stage; aggregate rejects; stage flow changes | A serial ideal cut train is not the disclosed internally countercurrent cascade |
| Lithium operation | Li-6 and Li-7, hot internal surfaces, separate gas/surface temperature displays | No quantitative condensation/compatibility claim without vapor-pressure/material data |
| Fuel-cycle value | Burn fraction, ash removal, processing time and gas-loop inventory | Not total site inventory; blanket retention/extraction and startup stock are separate |
| 3D construction | Distinguishable drive annulus, gas volume, outlet(s), thermal surfaces and stages | Patent alternatives must be labeled illustrative, not asserted as installed materials |
| Validation | Analytic balances, limiting cases, timestep studies and provenance | Passing numerical gates does not establish empirical Marathon performance |

The newer disclosure's single-outlet pump and hot lithium variant are not interchangeable configurations. The older disclosure also mentions ionization seeding and separate electron heating; these should appear as clearly explained optional design levers. A numerical seeding/RF knob is unjustified until the required reaction, conductivity and power model exists.

Thermal-source precision: newer §46 gives an example inner sub-vessel at **700 °C or higher**, with the “centrifuge” below **300 °C**. It does not unambiguously identify the latter as gas temperature. These are embodiment examples, not a universal condensation threshold or calibrated thermal operating point.

## Bounded reduced physics that can be implemented now

All equations in this section are this review's derivations/recommended model, rather than claims of a disclosed or calibrated Marathon code. Use SI internally; convert a displayed temperature in eV to energy `kT = e × T_eV`. Distinguish gas temperature, electron temperature and surface temperature.

### 1. Neutral radial equilibrium and inventory

Assume an ideal, isothermal, monatomic gas, common rigid angular velocity Ω, sufficient collisional coupling, negligible radial/axial throughflow perturbation and a cylindrical active region of radius a and length L. For each species s:

```text
dp_s/dr = n_s m_s Ω² r
n_s(r) = n_s(0) exp[M_s (r/a)²]
M_s = m_s Ω²a²/(2kT)
α_H/L = [(n_H/n_L)_wall/(n_H/n_L)_axis]
      = exp[(m_H−m_L)Ω²a²/(2kT)]
V = πa²L
F(M) = expm1(M)/M, with F(0)=1
N_s = V n_s(0) F(M_s)
```

These equations require no electron ambipolar correction for the neutral population. They are not a kinetic prediction of how fast separation is established. Local ion composition and ion-neutral chemistry are separate unknowns.

If inputs are **axis fractions** x_s0 and axis pressure p0, then `pbar/p0 = Σ_s x_s0 F(M_s)`. If inputs instead describe the **whole neutral inventory** fractions y_s and volume-average pressure pbar, use `n_s(0)=y_s pbar/[kT F(M_s)]`. The corresponding axis fractions then follow from those densities. Do not silently interchange feed flux, axis composition and integrated inventory composition.

Numerically evaluate exponentials/log ratios stably; avoid arbitrary exponent clipping that destroys mass balance. A declared upper domain bound may be preferable to a physically misleading finite answer.

### 2. Drive, neutral spin-up and mechanical energy

An explicitly assumed uniform-in-z radial current through an annulus r_in…r_out gives, by integrating `r(j×B)` over volume:

```text
j_r(r) = I/(2πrL)
τ_J = I B (r_out²−r_in²)/2
R_eff = ln(r_out/r_in)/(2πL σ_perp)
P_Ohm = I² R_eff
```

The sign of torque follows the declared current/field directions. Neither electrode voltage nor total electrical power equals the resistive term alone: electromechanical drive also supplies torque power. A bounded two-rotor closure, using fixed mass moments of inertia J_i,J_n, is:

```text
J_i dΩ_i/dt = τ_J − K(Ω_i−Ω_n) − b_i Ω_i
J_n dΩ_n/dt = K(Ω_i−Ω_n) − b_n Ω_n
E_rot = (J_iΩ_i² + J_nΩ_n²)/2
τ_J Ω_i = dE_rot/dt
          + K(Ω_i−Ω_n)² + b_iΩ_i² + b_nΩ_n²
```

K and b must be finite/nonnegative. They represent assumed momentum coupling and boundary drag, not a collision cross-section database. The ledger gives a rigorous invariant for this chosen closure. It does not validate K, viscosity, wall torque, ionization balance or conductivity.

With **fixed chosen gas T**, report resistive heating, mechanical dissipation and required heat removal to hold that choice. Do not evolve temperature from those terms without also specifying heat capacity, ionization/dissociation energy, wall exchange, radiation, auxiliary power and flow enthalpy. Rotor moments here are fixed; if recomputed from evolving compressed profiles, include the associated angular-momentum and energy terms rather than inserting changing J into these constant-J equations.

A matched-speed high-B/lower-I comparison can reproduce the qualitative heating tradeoff only while conductivity/drag/geometry are held fixed. It is not an absolute magnetic-field performance prediction. Zero ion fraction with finite ion current is inconsistent; either disable that domain or explicitly distinguish imposed torque from a self-consistent electrical discharge.

### 3. Collector cuts and serial staging

For an ideal instantaneous inventory cut at `q=r_cut/a`, the fraction of species s inside the cut is:

```text
G_s(q) = expm1(M_s q²)/expm1(M_s), with G_s(q)|M=0 = q²
N_s,inner = N_s G_s(q)
N_s,outer = N_s [1−G_s(q)]
```

Calculate each product composition by summing its species amounts. Inner collection favors lighter material; Li-6 product enrichment therefore competes with recovered fraction. Map these fractions to an imposed feed rate only as an **ideal cut/turnover surrogate**, not a solved extraction flow. At every stage conserve each isotope, total atoms and total mass. A serial enriched-product train must accumulate every rejected stream and reduce forward throughput; `α^N` alone is not a mass-balanced cascade. Recycle/countercurrent stages require simultaneous flow balances, rather than relabeling the serial train.

### 4. One-outlet pumping and pressure

Equilibrium gives local compression `C_s = exp(M_s)`. In a limited linear-conductance surrogate, define species throughput `Q_s = C_in,s(p_up,s−p_axis,s) = C_out,s(C_s p_axis,s−p_down,s)`; Q has pressure-volume/time units, whereas C has volume/time units. Solve the common boundary balance rather than independently prescribing pressure and throughput. Negative net flux indicates reverse flow or an incompatible assumed operating point, not a physical zero to silently clamp.

This is a **chosen linear boundary law**, not general vacuum gas dynamics: near 0.1–1 torr the flow regime depends on duct size, temperature and mean free path. Geometry-to-conductance formulas must identify molecular, viscous or transitional validity; otherwise expose effective conductances as assumptions. Isothermal weak-throughflow radial equilibrium is also assumed. Pressure and gas turnover time do not establish separation residence time. `inventory/assumed residence time` is a capacity estimate, not a transport solution.

### 5. CIV and chemistry boundary

For each explicitly present neutral species use `v_CIV,s = sqrt(2 e E_ion,s/m_s)` when E_ion is tabulated in eV. A minimum species threshold is an informative conservative diagnostic for a mixture. Label the atomic data source and species definition. Do not infer dissociation, ionization fractions or conductivity from a speed ratio alone. A regime warning or withholding an extrapolated performance claim is preferable to a hard clip that appears to solve ionization physics.

Molecular feed needs molecular mass and dissociation energetics; atomic D and D2 are distinct cases. Lithium vapor availability requires wall-temperature-dependent vapor pressure and transport. Hot-surface temperature alone does not establish a quantitative condensation margin, and the gas need not share the wall temperature.

### 6. Fuel-cycle accounting

Independently define burn efficiency as `β=N_T,burn/N_T,in`, with steady-state `N_T,in=N_T,burn+N_T,exhaust`. One D–T reaction produces one helium ash nucleus. Consequently, for `q=N_He,exhaust/N_T,exhaust`, assuming ash steady state and no other helium source:

```text
β = q/(1+q), not q
N_T,exhaust = N_T,burn (1/β−1)
gas-loop unburned tritium inventory = τ_process m_T N_T,burn (1/β−1)
gross fuel-throughput inventory proxy = τ_process m_T N_T,burn/β
```

The last two quantities represent different inventories; label them separately. Neither includes blanket retention, decay, extraction losses, startup stock or storage. If using the pump to estimate q, explicitly state upstream He/T composition and downstream effective species pumping speeds: ideal equilibrium can multiply the inlet ratio by compression selectivity, but it does not determine the inlet ratio or the reactor's response. Do not assert a universal TBE-to-power relation or Li-6-enrichment-to-TBR relation. Those require a declared core/divertor model and neutron transport respectively.

## Required independent acceptance gates

1. Radial analytic checks: Ω=0 is uniform; equal masses give α=1; reversing Ω leaves separation unchanged; zero-fraction species stay absent; radial integration reproduces each prescribed inventory. Compare numerical quadrature with F(M), including small-M cancellation and maximum supported M.
2. Composition checks: axis and integrated fractions agree only where expected; collector inner+outer totals equal feed isotope amounts, including near-zero and near-unity cuts; an N-stage train's final product plus all rejects equals its inlet.
3. Dynamics checks: zero drive cannot grow total mechanical energy; zero coupling cannot spin up initially stationary neutrals; equal angular velocities have zero coupling heat; drive work minus rotational-energy change equals integrated dissipation. Show timestep convergence against an independent matrix-exponential or high-accuracy ODE reference, not a test mirroring the implementation.
4. Pressure checks: solve inlet/outlet balance for every species; zero rotation removes centrifugal compression; zero conductance removes that connection; no pressure/flux unit mismatch; identify reverse-flow states. A composition-dependent pumping ratio must not be assumed equal to a species-independent outlet conductance.
5. Domain checks: no current-carrying zero-ion population, no silently predicted atomic result for a molecular feed, no extrapolated material compatibility, no claimed thermal equilibrium from fixed T. CIV crossing must change qualification consistently on plots and 3D state.
6. Fuel accounting checks: β lies in [0,1]; q=1 gives β=1/2; zero burn has no ash source; processing inventory scales linearly with processing time; gross and unburned inventory differ by `τ m_T N_T,burn`. Include stale saved state if new mode parameters are persisted.
7. Presentation checks: controls must update the neutral density/rotation and selected thermal/flow surfaces, with clear quantity/color keys; the differential pump has only one exhaust; the Li separator has appropriate paired outlets and separate hot inner surfaces. Do not animate neutral separation as charged gyro-orbits.

## Remaining qualification work

This bounded model can teach the major disclosed design tradeoffs. It cannot establish all specifications of Marathon's proprietary device. Missing validation inputs include discharge/current/velocity/temperature profiles; ionization, dissociation and momentum-transfer coefficients; measured conductivity and viscosity; wall/accommodation/condensation data; extraction/residence-time distributions; instability and lifetime measurements; and complete as-built geometry/material specifications. Current data access does not justify claiming those are known.

The preferred implementation split is (1) neutral equilibrium, balanced cuts and source-linked geometry; (2) explicitly assumed drive/thermal ledger with converged spin-up; (3) single-outlet pressure/fuel-cycle boundaries; (4) calibrated chemistry/transport only when suitable data are obtained. This keeps every result reviewable and avoids filling missing engineering evidence with plausible-looking constants.

## Source-only re-audit of the implemented fuel-centrifuge path

Reopened `src/fuel-centrifuge.ts`, `src/fuel-centrifuge-ui.js`, `src/fuel-centrifuge-geometry.js` and its inherited `src/engineering-geometry.js` on 2026-11-09. The files are concurrently being integrated; findings refer to the read state, not a frozen tested commit. No implementation was executed or visually verified in this audit.

### Verified educational coverage

The new path now has separate neutral normalization, reciprocal ion/neutral spin-up, a mechanical energy identity, resistive input, assumed fixed-temperature cooling load, balanced ideal countercurrent routing, a one-outlet total-pressure surrogate, atomic/molecular comparisons, a bounded NIST lithium vapor-pressure fit and independently specified fuel-loop inventory. The UI explicitly qualifies equilibrium references, fixed temperature, ideal routing and the lack of a self-consistent ionization or extraction solve. Its informative boundaries are substantially stronger than relabeling the older ionized equilibrium.

The model is educational, not a calibrated device. Its own assumptions correctly withhold electron energy, ionization, velocity-profile/shear transport, flow back-reaction and lifetime predictions. Those missing solves are not reasons to invent coefficients merely to make every control dynamic.

### Remaining findings for the integrating agent

| Severity | Finding and technical cause | Smallest coherent correction / acceptance evidence |
|---|---|---|
| P1 learning coverage | `fuel-centrifuge.ts:110–124` calculates total pressure/throughput/effective speed, but no species-resolved pumping ratio. The central reason to pump helium preferentially over tritium is therefore not numerically inspectable. Independent chosen burn fraction is correctly labeled, but does not fill this gap. | Expose species axis/wall/upstream partial pressures, Q_s and effective S_s under the same declared boundary law; show helium/tritium selectivity and source/outlet composition. Keep burn fraction an independent scenario until a declared core/divertor closure is supplied. Test each species balance and the conductance ceiling. |
| P1 graphics/physics mapping | `fuel-centrifuge-geometry.js:50–64` puts the cathode near 0.055a while the torque integral assumes current starts at f a. A single metal ring spans f a…a, rather than showing two radially separated electrodes bounding that current path. Thus the visible current topology does not establish the modeled drive annulus or the disclosed wall-spaced localized-current option. | Either depict the selected current-bearing region and its two matching electrode boundaries, or clearly separate an illustrative axial-cathode variant from the annular-current model. A dedicated schematic overlay may be more accurate than pretending the metal face is a solved current distribution. Verify f changes the matching numerical and visible boundaries. |
| P2 composition semantics | UI label `Feed light-species fraction` maps to a **whole-volume inventory fraction** in the pressure/profile solve. In a rotating pump, upstream composition, whole inventory and wall outlet composition generally differ. | Name the inventory input explicitly; distinguish it from cascade feed normalization and inferred upstream composition. Test the Ω=0 limit and a rotating mixture for which all three differ. |
| P2 collection mapping | Inner product duct is fixed at 0.2a (`fuel-centrifuge-geometry.js:68`) while the cut control spans 0…a. The visible collector does not show the collection domain that generated the plot. | Add a labeled selected cut surface/ring using the accepted cut radius; present the duct as illustrative rather than a finite-radius extractor prediction. Verify endpoints do not create inverted or invalid geometry. |
| P2 architecture completeness | No identifiable feed inlet, adjustable conductance element/downstream pump or hot-liner radiative insulation is added to the conceptual shell. Users cannot inspect these crucial disclosed architectural roles. | Add identifiable, explicitly illustrative components/flow boundaries and inspection text. Do not imply a solved conductance from an arbitrarily sized tube or a quantified thermal shield. The single-outlet pump must retain one exhaust path. |
| P2 stage scaling | Geometry partitions one chosen vessel length into N stages, while the mechanical/pressure reference uses the full chosen length and volume; routing assumes identical stages. The per-stage versus full-envelope interpretation is not apparent. | State whether L is per-stage active length or total vessel length, and make volume/drive/geometry conventions consistent. A routing schematic can remain separate from an unqualified one-envelope physical scaling. |
| P2 validity cues | The UI displays slip/CIV, wall speed/CIV and a²/D, but accepted status remains the same across threshold crossings or spin-up durations much shorter than the assumed radial mixing scale. | Add contextual qualification at those crossings. Preserve the correct decision not to hard-clip CIV or claim a finite-time separation solve. Verify warning transitions without changing analytic reference values. |
| P2 inspection semantics | Inherited `insulators` are remapped to `source`, making the ceramic break's purpose appear to be supplying electrons; unrecognized support/seal/fitting components are mapped to `vessel`. | Preserve component-specific role/material text where available, rather than replacing it with a different component's purpose. Inspect actual mesh selections as well as the generic component selector. |

These are distinct from a demand for calibrated engineering fidelity. A source-faithful learning playground can cover the major public concepts with conditional models and explanatory geometry. It cannot promise full proprietary specification knowledge, measured performance or as-built materials. The final implementation acceptance still requires the integrating team's numerical gates and actual live visual/control verification.

### Final source reread and disposition

Reopened the three fuel-centrifuge files and `docs/MARATHON-CENTRIFUGE-V44.md` again after integration changes. Species pumping now exposes partial pressures, Q_s, effective speeds and heavy/light speed ratio under its declared common-S/common-C surrogate. Reference composition is no longer labeled feed composition. The drive has separate electrode boundaries at fR and R, the collection cut has a matching marker, stages explicitly remain a schematic routing overlay, contextual mixing/CIV notes are present, and electrical isolation has its own inspection role. Feed, pump, hot liner and a larger vacuum envelope are identifiable. These resolve or explicitly qualify the principal coverage findings above at source level; they do not constitute runtime evidence.

Two residual accuracy findings were sent to the integrating agent:

1. **Boundary-to-geometry mismatch:** the drawn `Finite-conductance throttle` is on the downstream outer exhaust and receives `c.conductanceM3S`; the solver and UI define that same parameter as **inlet** conductance in `p_up=p_axis+Q/C`. In simple terms, the controlling restriction is pictured on the wrong side of the centrifuge. Move the controlled restriction to the inlet, or give a downstream illustrative valve its own non-numerical role and show the inlet boundary separately. Reusing the numerical parameter on a physically different boundary would teach the wrong pressure relation.
2. **Citation correction:** the implementation summary cites older WO2026064411A1 “§§13–29 and 35–42.” The checked older Description ends at §29. Remove the nonexistent paragraph range or cite the intended newer document explicitly.

The current feature documentation otherwise preserves the important distinction between educational public-concept coverage and a predictive design model. Its numerical and UI validation descriptions must remain tied to the integrating team's eventual executed snapshot; this independent review has not run those gates.

### Bounded closure check

Reopened only the two residual items above after their fixes. Both are **resolved at source level**:

- `docs/MARATHON-CENTRIFUGE-V44.md` now cites older Description §§13–29 and assigns §§37–46 to the newer patent mirror.
- `fuel-centrifuge-geometry.js` now attaches `c.conductanceM3S` to the on-axis **Inlet conductance restrictor** at `z=-0.75R`, on the upstream feed. The separate downstream exhaust pump retains `c.pumpSpeedM3S`. The numerical inlet boundary and its identifiable geometry therefore agree.

No project code or tests were executed by this bounded check. Test/build/deployment acceptance remains with the integrating team's recorded final gates.
