# Laurelin pulse model

This teaching model shows Laurelin’s public field-reversed configuration (FRC) sequence: form, merge, compress, hold and recover energy.
An FRC is a magnetized plasma with a reversed axial field inside the plasma.
The model does not give company CAD or a validated operating point.
It does not include a magnetohydrodynamic (MHD) calculation or electrical breakeven.

## State and equations

Compression can increase temperature, but energy losses can remove that increase.
The model tracks plasma volume and thermal energy to show this competition.

Two fully ionized deuterium plasmoids have a combined fixed deuteron inventory `N=n₀V₀`.
Ions and electrons share one temperature: `U=3NkT`, `p=2nkT`.
The reference merged volume is an ellipsoid, `V₀=4πr₀²(L/2)/3`.
Public dimensions are unavailable; the selected dimensions and all construction materials are illustrative.

The form / merge / compress / hold / recover fractions are `.12/.20/.24/.20/.24`.
The form phase starts with an existing thermal inventory; the model does not calculate formation dynamics.
Each plasmoid moves at the selected speed `v` in the center-of-mass frame, so the relative collision speed is `2v`.
Merging supplies `Emerge=NmDv²/2` uniformly during the merge interval.
All merge energy becomes thermal energy, which ions and electrons share.

During compression and expansion, volume changes exponentially at fixed axial length.
The specified geometry is `r/r₀=√(V/V₀)`; it is not an FRC scaling law.
Compression ratio means volume ratio, not radius or field ratio.
The energy equation is

`dU/dt = −(2/3) U d(ln V)/dt − U/τE + Pmerge`.

Compression does work on the plasma; expansion does work on its surroundings.
Their `p dV` terms have opposite signs.
Confinement losses remove energy through the `−U/τE` term.
The specified confinement time includes unresolved transport and radiation losses; the model does not calculate these separately.
Each constant-coefficient segment uses an analytic solution, including the exact integral of `U` for work and loss.

The displayed field `√(2μ₀p)` gives the external magnetic-pressure equivalent at `β=1` only.
The model does not calculate coil current, magnetic-flux conservation and equilibrium geometry together.

## D–D diagnostic

Temperature alone does not give the fusion yield.
The reaction rate also depends on density, volume and the time at each temperature.
For each D–D branch, the model uses `R = nD² V ⟨σv⟩/2`.
The factor `1/2` prevents double counting of identical reactant pairs.

Bosch–Hale table VII gives the two Maxwellian reactivities for 0.2–100 keV.
The model converts cm³/s to m³/s and uses midpoint quadrature along the analytic thermal path.
Both endpoints and the midpoint must stay within the fit limits.
Temperature changes monotonically in each constant-coefficient segment, so the endpoints bound its temperature.
If any segment leaves the fit limits, the full-pulse yield is unavailable; missing contributions do not become zero.

The neutron branch assigns 2.45 MeV to its neutron and 0.82 MeV to ³He.
The proton/triton branch has approximately 4.03 MeV of charged energy.
Fusion energy is a diagnostic only.
The model does not calculate fuel depletion, product inventory, charged-product heating, secondary D–T / D–³He burn or neutron transport.

A flag marks inferred fuel consumption above 1% or charged fusion energy above 10% of input energy.
These conservative internal limits identify cases where fusion could change the prescribed pulse.
They are not experimentally validated accuracy limits.
A low-burn label does not qualify the FRC transport model.

## Electrical ledger

Energy recovery matters because each pulse must replace its driver input and auxiliary losses.
The model uses

`Edriver=(U₀+Emerge+Wcompression)/ηdriver`.

`Ereturn=ηrecovery Wexpansion`; `Eaux=Paux/f`; `Enonfusion=Ereturn−Edriver−Eaux`.

Only expansion work contributes to electrical recovery; the model does not calculate fusion electricity.
The next pulse starts without the residual thermal energy from the previous pulse.
Coil energy, ionization, switch dynamics, shielding and other hardware loads have no separate calculations.
You specify the efficiencies.
This balance shows the effects of energy recovery and pulse rate, but it is not a complete plant balance.

The exact thermal balance is `U₀+Emerge+Wcompression=Wexpansion+Eloss+Uend`.
Tests examine this balance, confinement decay, ideal compression scaling, branch units, the no-compression limit, inventory/volume scaling and yield refinement.
These tests do not establish experimental agreement.

## Scene

The hardware has a symmetric formation–merge–compression layout.
Copper windings, stainless vacuum hardware, ceramic supports and capacitor banks are illustrative material choices.
The cutaway has an open mesh sector.
Plasma radius and length use the same normalized drawing units, which keep the input ellipsoid’s physical aspect ratio.
Chamber and coil clearances remain illustrative.

Closed field curves use contours of `ψ ∝ r²(1−r²/a²−z²/b²)`.
This analytic reversed-field topology has a magnetic null ring; the curves are not calculated fields or ion orbits.
The timeline uses the same pulse state as the plots to change plasma position, radius and thermal appearance.
A different model is necessary for reconnection, stability and particle kinetics.

## Sources checked

- [Laurelin technology](https://www.laurelin.dev/technology) and [public whitepaper](https://www.laurelin.dev/notes/whitepaper), accessed 2026-11-14. These describe the proposed architecture and distinguish demonstrated component mechanisms from the unverified integrated cycle. The source review found no calibrated device point.
- [Bosch & Hale (1992), equations 12–14 and table VII](https://doi.org/10.1088/0029-5515/32/4/I07). The formula and coefficients agree with the reviewed [PlasmaPy implementation](https://docs.plasmapy.org/en/latest/_modules/plasmapy/formulary/fusion.html) and [coefficient file](https://raw.githubusercontent.com/PlasmaPy/PlasmaPy/main/src/plasmapy/utils/data/rxty_pade_polynomial_coefficients.json). The browser uses the published formula without a Python runtime.
- [Slough, Votroubek & Pihl (2011)](https://doi.org/10.1088/0029-5515/51/5/053008). Laurelin cites this experimental merging/compression work. The publisher full text was inaccessible during the source review; its result does not calibrate this simulator.
- [Spencer, Tuszewski & Linford (1983)](https://doi.org/10.1063/1.864334). FRC compression couples equilibrium geometry and field. This simulator’s specified fixed-length ideal-gas scaling is different from that equilibrium model.
- [Steinhauer (2011)](https://doi.org/10.1063/1.3613680) and [Barr & Moir (1976)](https://www.osti.gov/servlets/purl/7341986). These reviews support future equilibrium, confinement and converter work. They do not validate this implementation.

The next extension must include a sourced FRC equilibrium/compression model and a separately verified zero-dimensional species/energy burn calculation.
A pulsed-power circuit and measured recovery conditions must follow.
Public operating data and uncertainty estimates are also necessary for an integrated Laurelin prediction.
